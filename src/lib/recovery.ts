/**
 * Recuperador de arquivos corrompidos — roda inteiro no navegador do assinante.
 *
 * Vídeo Sony (.RSV / MP4 sem índice, XAVC S H.264 + LPCM):
 *   um único passe lê o arquivo quebrado em blocos, copia cada bloco para o arquivo novo
 *   (ftyp + mdat) e ao mesmo tempo mapeia quadros e blocos de áudio. No fim grava o índice
 *   (moov) usando SPS/PPS, fps e áudio tirados do clipe de referência.
 * WAV: reescreve o cabeçalho RIFF/RF64 e copia o áudio.
 *
 * Nada sai do computador: a fonte é um File e o destino é um arquivo escolhido pelo usuário.
 */

export type Source = { size: number; read: (off: number, len: number) => Promise<Uint8Array> };
export type Sink = { write: (b: Uint8Array) => Promise<void> };
export type Progress = (p: { done: number; total: number; frames?: number; phase: string }) => void;

export type RefParams = {
  timescale: number; delta: number; sps: Uint8Array; pps: Uint8Array[];
  audio: { fourcc: string; ch: number; bits: number; rate: number } | null;
  l2fn: number; pocType: number; l2poc: number; nref: number; profile: number;
  refW: number; refH: number; rest: string; spsHeader: number;
};

export type Frame = { off: number; size: number; key: boolean; lsb: number; ref: boolean; idr: boolean };
export type VideoIndex = { frames: Frame[]; audio: [number, number][]; firstMbs: number[]; tail: number; gapsSemMeta: number };

const AUD = [0, 0, 0, 2, 9];
const KLV = [0x06, 0x0e, 0x2b, 0x34];
const CH = 16 << 20;

// ---------------- bits ----------------
export function unesc(b: Uint8Array) {
  const o: number[] = []; let z = 0;
  for (const x of b) { if (z >= 2 && x === 3) { z = 0; continue; } o.push(x); z = x === 0 ? z + 1 : 0; }
  return Uint8Array.from(o);
}
function esc(raw: Uint8Array) {
  const o: number[] = []; let z = 0;
  for (const x of raw) { if (z >= 2 && x <= 3) { o.push(3); z = 0; } o.push(x); z = x === 0 ? z + 1 : 0; }
  return Uint8Array.from(o);
}
class BR {
  bits: string; i = 0;
  constructor(b: Uint8Array) { this.bits = Array.from(b, (x) => x.toString(2).padStart(8, "0")).join(""); }
  u(n: number) { const v = n ? parseInt(this.bits.slice(this.i, this.i + n) || "0", 2) : 0; this.i += n; return v; }
  ue() { let z = 0; while (this.bits[this.i] === "0" && z < 32) { z++; this.i++; } this.i++; return (2 ** z) - 1 + this.u(z); }
}
const u32 = (b: Uint8Array, p: number) => ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3];
const u16 = (b: Uint8Array, p: number) => (b[p] << 8) + b[p + 1];
const str4 = (b: Uint8Array, p: number) => String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
function indexOf(h: Uint8Array, n: number[], from = 0, to = h.length) {
  const L = n.length, f = n[0];
  for (let i = from; i <= to - L; i++) {
    if (h[i] !== f) continue;
    let ok = true; for (let k = 1; k < L; k++) if (h[i + k] !== n[k]) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}

// ---------------- referência ----------------
type Box = { type: string; start: number; end: number }; // start = início do conteúdo
function* boxes(d: Uint8Array, start: number, end: number): Generator<Box> {
  let p = start;
  while (p + 8 <= end) {
    let sz = u32(d, p); const t = str4(d, p + 4); let h = 8;
    if (sz === 1) { sz = u32(d, p + 8) * 2 ** 32 + u32(d, p + 12); h = 16; }
    if (sz === 0) sz = end - p;
    if (sz < 8) return;
    yield { type: t, start: p + h, end: p + sz };
    p += sz;
  }
}
function findBox(d: Uint8Array, path: string[], start = 0, end = d.length): Box | null {
  for (const b of boxes(d, start, end)) if (b.type === path[0]) return path.length === 1 ? b : findBox(d, path.slice(1), b.start, b.end);
  return null;
}
function* allBoxes(d: Uint8Array, type: string, start: number, end: number) { for (const b of boxes(d, start, end)) if (b.type === type) yield b; }

/** Lê só o moov do clipe de referência (ele pode estar no fim de um arquivo grande). */
export async function readReference(src: Source): Promise<RefParams> {
  let p = 0, moov: Uint8Array | null = null;
  while (p + 8 <= src.size) {
    const h = await src.read(p, 16);
    let sz = u32(h, 0); const t = str4(h, 4);
    if (sz === 1) sz = u32(h, 8) * 2 ** 32 + u32(h, 12);
    if (sz === 0) sz = src.size - p;
    if (sz < 8) break;
    if (t === "moov") { moov = await src.read(p, sz); break; }
    p += sz;
  }
  if (!moov) throw new Error("O clipe de referência não tem índice (moov). Use um arquivo que abre normalmente.");
  const d = moov; const root = findBox(d, ["moov"])!;
  let video: any = null, audio: RefParams["audio"] = null;
  for (const tk of allBoxes(d, "trak", root.start, root.end)) {
    const hd = findBox(d, ["mdia", "hdlr"], tk.start, tk.end); if (!hd) continue;
    const kind = str4(d, hd.start + 8);
    const md = findBox(d, ["mdia", "mdhd"], tk.start, tk.end)!; const ts = u32(d, md.start + 12);
    const stbl = findBox(d, ["mdia", "minf", "stbl"], tk.start, tk.end)!;
    if (kind === "vide") {
      const st = findBox(d, ["stts"], stbl.start, stbl.end)!; const delta = u32(d, st.start + 12);
      const i = indexOf(d, [0x61, 0x76, 0x63, 0x43], stbl.start, stbl.end); // avcC
      if (i < 0) throw new Error("O clipe de referência não é H.264 (XAVC S). H.265 ainda não é suportado.");
      const L = u32(d, i - 4); const c = d.subarray(i + 4, i - 4 + L);
      let q = 6; const sps: Uint8Array[] = [], pps: Uint8Array[] = [];
      for (let k = 0; k < (c[5] & 0x1f); k++) { const l = u16(c, q); sps.push(c.slice(q + 2, q + 2 + l)); q += 2 + l; }
      const n = c[q]; q++;
      for (let k = 0; k < n; k++) { const l = u16(c, q); pps.push(c.slice(q + 2, q + 2 + l)); q += 2 + l; }
      video = { timescale: ts, delta, sps: sps[0], pps };
    } else if (kind === "soun") {
      const sd = findBox(d, ["stsd"], stbl.start, stbl.end)!; const e = sd.start + 8;
      audio = { fourcc: str4(d, e + 4), ch: u16(d, e + 24), bits: u16(d, e + 26), rate: u32(d, e + 32) >>> 16 };
    }
  }
  if (!video) throw new Error("Não achei a trilha de vídeo no clipe de referência.");
  const b = new BR(unesc(video.sps).subarray(1));
  const profile = b.u(8); b.u(8); b.u(8); b.ue();
  if ([100, 110, 122, 244].includes(profile)) { b.ue(); b.ue(); b.ue(); b.u(1); if (b.u(1)) throw new Error("Referência com matriz no SPS: formato ainda não suportado."); }
  const l2fn = b.ue() + 4; const pocType = b.ue(); const l2poc = pocType === 0 ? b.ue() + 4 : 0;
  const nref = b.ue(); b.u(1); const w = (b.ue() + 1) * 16; const hmu = b.ue() + 1; const fmo = b.u(1);
  if (!fmo) throw new Error("Vídeo entrelaçado ainda não é suportado.");
  b.u(1); let cb = 0;
  if (b.u(1)) { b.ue(); b.ue(); b.ue(); cb = b.ue(); }
  if (pocType !== 0) throw new Error("Esta câmera usa um modo de ordem de quadros ainda não suportado.");
  return { ...video, audio, l2fn, pocType, l2poc, nref, profile, refW: w, refH: hmu * 16 - cb * 2, rest: b.bits.slice(b.i), spsHeader: video.sps[0] };
}

/** SPS da referência adaptado para outra resolução (mesmos parâmetros de compressão). */
export function spsFor(r: RefParams, W: number, H: number): Uint8Array {
  if (W === r.refW && H === r.refH) return r.sps;
  const mbw = Math.ceil(W / 16), mbh = Math.ceil(H / 16), cb = (mbh * 16 - H) / 2;
  let s = "";
  const U = (n: number, v: number) => { if (n) s += v.toString(2).padStart(n, "0"); };
  const UE = (v: number) => { v += 1; const n = v.toString(2).length; U(n - 1, 0); U(n, v); };
  U(8, r.profile); U(8, 0); U(8, W * H > 2_100_000 ? 51 : 42); UE(0);
  if ([100, 110, 122, 244].includes(r.profile)) { UE(1); UE(0); UE(0); U(1, 0); U(1, 0); }
  UE(r.l2fn - 4); UE(0); UE(r.l2poc - 4); UE(r.nref); U(1, 0); UE(mbw - 1); UE(mbh - 1); U(1, 1); U(1, 1);
  if (cb) { U(1, 1); UE(0); UE(0); UE(0); UE(cb); } else U(1, 0);
  s += r.rest.replace(/0+$/, "").slice(0, -1) + "1";
  while (s.length % 8) s += "0";
  const raw = new Uint8Array(1 + s.length / 8); raw[0] = r.spsHeader;
  for (let k = 0; k < s.length; k += 8) raw[1 + k / 8] = parseInt(s.slice(k, k + 8), 2);
  return esc(raw);
}

export const RESOLUTIONS: [number, number, string][] = [
  [3840, 2160, "4K UHD (3840×2160)"], [1920, 1080, "Full HD (1920×1080)"], [1280, 720, "HD (1280×720)"], [4096, 2160, "DCI 4K (4096×2160)"],
];
/** Deduz a resolução pelas posições das fatias do primeiro quadro-chave. */
export function guessResolution(firstMbs: number[], ref?: RefParams): [number, number] | null {
  if (!firstMbs.length) return ref ? [ref.refW, ref.refH] : null;
  const fits = (w: number, h: number) => { const mw = Math.ceil(w / 16), tot = mw * Math.ceil(h / 16); return firstMbs.every((m) => m % mw === 0 && m < tot); };
  if (ref && fits(ref.refW, ref.refH) && Math.max(...firstMbs) > 0) {
    const mw = Math.ceil(ref.refW / 16), tot = mw * Math.ceil(ref.refH / 16);
    if (Math.max(...firstMbs) > tot * 0.6) return [ref.refW, ref.refH];
  }
  for (const [w, h] of RESOLUTIONS) {
    const mw = Math.ceil(w / 16), tot = mw * Math.ceil(h / 16);
    if (fits(w, h) && Math.max(...firstMbs) > tot * 0.6) return [w, h];
  }
  return null;
}

// ---------------- leitura em fluxo + cópia ----------------
class Flow {
  buf = new Uint8Array(0); start = 0; loaded = 0;
  constructor(public src: Source, public sink: Sink | null, public onChunk?: (loaded: number) => void) {}
  /** garante bytes [abs, abs+n) no buffer; descarta o que vem antes de keep */
  async ensure(abs: number, n: number, keep = abs) {
    const want = Math.min(abs + n, this.src.size);
    if (keep > this.start) { const drop = Math.min(keep, this.loaded) - this.start; this.buf = this.buf.slice(drop); this.start += drop; }
    while (this.loaded < want) {
      const len = Math.min(CH, this.src.size - this.loaded);
      const chunk = await this.src.read(this.loaded, len);
      if (this.sink) await this.sink.write(chunk);
      const nb = new Uint8Array(this.buf.length + chunk.length); nb.set(this.buf); nb.set(chunk, this.buf.length);
      this.buf = nb; this.loaded += chunk.length; this.onChunk?.(this.loaded);
      if (!chunk.length) break;
    }
    return this.loaded >= want;
  }
  at(abs: number) { return this.buf[abs - this.start]; }
  sub(abs: number, n: number) { return this.buf.subarray(abs - this.start, abs - this.start + n); }
  async drain() { await this.ensure(this.src.size, 0, this.loaded); }
  /** procura o próximo AUD a partir de abs, mantendo keep no buffer */
  async findAud(abs: number, keep: number) {
    let p = abs;
    for (;;) {
      await this.ensure(p, 5, Math.min(keep, p));
      const i = indexOf(this.buf, AUD, p - this.start);
      if (i >= 0) return i + this.start;
      if (this.loaded >= this.src.size) return -1;
      p = Math.max(p, this.loaded - 4);
      if (p - keep > 8 << 20) keep = p; // lacuna enorme: não guarda tudo
      await this.ensure(p, CH, Math.min(keep, p));
    }
  }
}

const FTYP = Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0, 0, 2, 0, 0x71, 0x74, 0x20, 0x20]);
const HDR = FTYP.length + 16;
function mdatHeader(size: number) {
  const b = new Uint8Array(16); const v = new DataView(b.buffer);
  v.setUint32(0, 1); b.set([0x6d, 0x64, 0x61, 0x74], 4); const t = size + 16;
  v.setUint32(8, Math.floor(t / 2 ** 32)); v.setUint32(12, t >>> 0); return b;
}

/** Passe único: copia o arquivo quebrado para o destino e monta o mapa de quadros e áudio. */
export async function scanAndCopy(src: Source, sink: Sink, l2fn: number, l2poc: number, onProgress?: Progress, signal?: AbortSignal): Promise<VideoIndex> {
  const out = new Uint8Array(HDR); out.set(FTYP); out.set(mdatHeader(src.size), FTYP.length);
  await sink.write(out);
  const fl = new Flow(src, sink);
  const frames: Frame[] = []; const audio: [number, number][] = []; const firstMbs: number[] = [];
  let idrAu: Frame | null = null, gapsSemMeta = 0, tail = 0, last = 0;
  await fl.ensure(0, 64 << 20);
  let p = await fl.findAud(0, 0);
  if (p < 0) throw new Error("Não encontrei vídeo H.264 dentro do arquivo. Ele pode ser H.265 ou de outra câmera.");
  let cur: Frame | null = null;
  while (p >= 0 && p < src.size - 8) {
    if (signal?.aborted) throw new Error("Cancelado.");
    await fl.ensure(p, 5 + 48);
    const L = u32(fl.buf, p - fl.start); const t = fl.at(p + 4); const typ = t & 0x1f;
    const valid = L > 0 && L < 8_000_000 && !(t & 0x80) && [1, 5, 6, 9].includes(typ) && p + 4 + L <= src.size;
    if (valid) {
      if (typ === 9) { cur = { off: p, size: 0, key: false, lsb: -1, ref: false, idr: false }; frames.push(cur); }
      if (cur) {
        cur.size = p + 4 + L - cur.off;
        if (typ === 1 || typ === 5) {
          const b = new BR(unesc(fl.sub(p + 5, 48)));
          const fm = b.ue(); b.ue(); b.ue(); b.u(l2fn); if (typ === 5) b.ue();
          const lsb = b.u(l2poc);
          if (cur.lsb < 0) { cur.lsb = lsb; cur.ref = ((t >> 5) & 3) > 0; cur.idr = typ === 5; cur.key = typ === 5; }
          if (typ === 5 && !idrAu) idrAu = cur;
          if (typ === 5 && idrAu === cur) firstMbs.push(fm);
        }
      }
      p += 4 + L;
    } else {
      // lacuna: áudio PCM seguido dos metadados rtmd (KLV) até o próximo quadro
      await fl.ensure(p, 4 << 20);
      const head = fl.sub(p, Math.min(4 << 20, fl.loaded - p));
      const k = indexOf(head, KLV);
      const found = await fl.findAud(p, p);
      const end = found >= 0 ? found : src.size;
      let alen = k >= 28 && p + k < end ? k - 28 : end - p;
      if (k < 0 || p + k >= end) gapsSemMeta++;
      if (found < 0) {
        const mx = Math.max(0, ...audio.map((a) => a[1]));
        if (mx) alen = Math.min(alen, Math.floor(mx * 1.1));
        tail = src.size - p;
      }
      alen -= alen % 4;
      if (alen > 0 && alen < 64 << 20) audio.push([p, alen]);
      cur = null;
      if (found < 0) break;
      p = found;
    }
    if (fl.loaded - last > 64 << 20) { last = fl.loaded; onProgress?.({ done: fl.loaded, total: src.size, frames: frames.length, phase: "copiando" }); }
  }
  await fl.drain();
  onProgress?.({ done: src.size, total: src.size, frames: frames.length, phase: "copiando" });
  return { frames: frames.filter((f) => f.lsb >= 0), audio, firstMbs, tail, gapsSemMeta };
}

// ---------------- índice (moov) ----------------
class W {
  parts: number[] = [];
  u8(v: number) { this.parts.push(v & 255); return this; }
  u16(v: number) { this.parts.push((v >> 8) & 255, v & 255); return this; }
  u32(v: number) { v = v >>> 0; this.parts.push(v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255); return this; }
  i16(v: number) { return this.u16(v < 0 ? v + 65536 : v); }
  u64(v: number) { return this.u32(Math.floor(v / 2 ** 32)).u32(v % 2 ** 32); }
  bytes(b: ArrayLike<number>) { for (let i = 0; i < b.length; i++) this.parts.push(b[i]); return this; }
  str(s: string) { for (const c of s) this.parts.push(c.charCodeAt(0)); return this; }
  zeros(n: number) { for (let i = 0; i < n; i++) this.parts.push(0); return this; }
  get() { return Uint8Array.from(this.parts); }
}
function box(type: string, ...parts: Uint8Array[]) {
  const len = 8 + parts.reduce((a, b) => a + b.length, 0);
  const o = new Uint8Array(len); new DataView(o.buffer).setUint32(0, len);
  for (let i = 0; i < 4; i++) o[4 + i] = type.charCodeAt(i);
  let q = 8; for (const p of parts) { o.set(p, q); q += p.length; } return o;
}
const fbox = (type: string, v: number, fl: number, ...parts: Uint8Array[]) => box(type, new W().u32((v << 24) | fl).get(), ...parts);
const MATRIX = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000];

export function buildMoov(ix: VideoIndex, r: RefParams, W0: number, H0: number) {
  const fr = ix.frames;
  // ordem de exibição pelo POC (tipo 0), por GOP
  const disp: [number, number, number][] = []; let gop = -1, pm = 0, pl = 0; const M = 2 ** r.l2poc;
  fr.forEach((f, i) => {
    if (f.idr) { gop++; pm = 0; pl = 0; }
    let msb = pm;
    if (f.lsb < pl && pl - f.lsb >= M / 2) msb = pm + M; else if (f.lsb > pl && f.lsb - pl > M / 2) msb = pm - M;
    if (f.ref) { pm = msb; pl = f.lsb; }
    disp.push([gop, msb + f.lsb, i]);
  });
  const order = [...disp].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const di = new Array(fr.length); order.forEach((d, k) => (di[d[2]] = k));
  const off = fr.map((_, i) => di[i] - i); const shift = -Math.min(0, ...off);
  const D = r.delta, VTS = r.timescale, N = fr.length, MTS = 1000;
  const SPS = spsFor(r, W0, H0);
  const avcC = box("avcC", new W().u8(1).u8(SPS[1]).u8(SPS[2]).u8(SPS[3]).u8(0xff).u8(0xe1).u16(SPS.length).bytes(SPS)
    .u8(r.pps.length).bytes(r.pps.flatMap((p) => [...new W().u16(p.length).get(), ...p])).bytes([0xfd, 0xf8, 0xf8, 0]).get());
  const avc1 = box("avc1", new W().zeros(6).u16(1).zeros(16).u16(W0).u16(H0).u32(0x480000).u32(0x480000).u32(0).u16(1)
    .u8(4).str("H264").zeros(27).u16(24).i16(-1).get(), avcC);
  const co64 = (o: number[]) => { const w = new W().u32(o.length); o.forEach((x) => w.u64(x + HDR)); return fbox("co64", 0, 0, w.get()); };
  const chunks: [number, number, number][] = [];
  for (const f of fr) { const c = chunks[chunks.length - 1]; if (c && c[0] + c[1] === f.off) { c[1] += f.size; c[2]++; } else chunks.push([f.off, f.size, 1]); }
  const stsc: [number, number][] = []; chunks.forEach((c, i) => { if (!stsc.length || stsc[stsc.length - 1][1] !== c[2]) stsc.push([i + 1, c[2]]); });
  const ctts: [number, number][] = []; for (const o of off) { const v = (o + shift) * D; const l = ctts[ctts.length - 1]; if (l && l[1] === v) l[0]++; else ctts.push([1, v]); }
  const tbl = (rows: number[][]) => { const w = new W().u32(rows.length); rows.forEach((r) => r.forEach((x) => w.u32(x))); return w.get(); };
  const keys = fr.map((f, i) => (f.key ? i + 1 : 0)).filter(Boolean);
  const stszV = new W().u32(0).u32(N); fr.forEach((f) => stszV.u32(f.size));
  const vstbl = box("stbl", fbox("stsd", 0, 0, new W().u32(1).get(), avc1), fbox("stts", 0, 0, tbl([[N, D]])),
    fbox("ctts", 0, 0, tbl(ctts)), fbox("stss", 0, 0, tbl(keys.map((k) => [k]))),
    fbox("stsc", 0, 0, tbl(stsc.map(([a, b]) => [a, b, 1]))), fbox("stsz", 0, 0, stszV.get()), co64(chunks.map((c) => c[0])));
  const vdur = N * D, mvdur = Math.round((vdur * MTS) / VTS);
  const tkhd = (id: number, dur: number, w: number, h: number, vol: number) => {
    const x = new W().u32(0).u32(0).u32(id).u32(0).u32(dur).zeros(8).u16(0).u16(0).u16(vol).u16(0); MATRIX.forEach((m) => x.u32(m)); x.u32(w * 65536).u32(h * 65536);
    return fbox("tkhd", 0, 7, x.get());
  };
  const mdhd = (ts: number, dur: number) => fbox("mdhd", 0, 0, new W().u32(0).u32(0).u32(ts).u32(dur).u16(0x55c4).u16(0).get());
  const hdlr = (t: string, n: string) => fbox("hdlr", 0, 0, new W().str("mhlr").str(t).str("appl").zeros(8).u8(n.length).str(n).get());
  const dinf = () => box("dinf", fbox("dref", 0, 0, new W().u32(1).get(), fbox("alis", 0, 1)));
  const elst = box("edts", fbox("elst", 0, 0, new W().u32(1).u32(mvdur).u32(shift * D).u16(1).u16(0).get()));
  const traks = [box("trak", tkhd(1, mvdur, W0, H0, 0), elst, box("mdia", mdhd(VTS, vdur), hdlr("vide", "Video"),
    box("minf", fbox("vmhd", 0, 1, new Uint8Array(8)), hdlr("alis", "Data"), dinf(), vstbl)))];
  let adur = 0;
  const a = r.audio;
  if (a && ix.audio.length) {
    const ba = (a.ch * a.bits) / 8;
    const sizes = ix.audio.map(([, s]) => s - (s % ba)); const nas = sizes.reduce((x, s) => x + s / ba, 0);
    const astsc: [number, number][] = []; sizes.forEach((s, i) => { if (!astsc.length || astsc[astsc.length - 1][1] !== s / ba) astsc.push([i + 1, s / ba]); });
    const snd = box(a.fourcc, new W().zeros(6).u16(1).u16(0).u16(0).u32(0).u16(a.ch).u16(a.bits).u16(0).u16(0).u32(a.rate * 65536).get());
    const astbl = box("stbl", fbox("stsd", 0, 0, new W().u32(1).get(), snd), fbox("stts", 0, 0, tbl([[nas, 1]])),
      fbox("stsc", 0, 0, tbl(astsc.map(([x, y]) => [x, y, 1]))), fbox("stsz", 0, 0, new W().u32(ba).u32(nas).get()), co64(ix.audio.map((x) => x[0])));
    adur = Math.round((nas * MTS) / a.rate);
    traks.push(box("trak", tkhd(2, adur, 0, 0, 0x100), box("mdia", mdhd(a.rate, nas), hdlr("soun", "Sound"),
      box("minf", fbox("smhd", 0, 0, new Uint8Array(4)), hdlr("alis", "Data"), dinf(), astbl))));
  }
  const mv = new W().u32(0).u32(0).u32(MTS).u32(Math.max(mvdur, adur)).u32(0x10000).u16(0x100).zeros(10); MATRIX.forEach((m) => mv.u32(m)); mv.zeros(24).u32(traks.length + 1);
  return { moov: box("moov", fbox("mvhd", 0, 0, mv.get()), ...traks), seconds: vdur / VTS, audioSeconds: adur / 1000 };
}

// ---------------- WAV ----------------
export type WavInfo = { ch: number; rate: number; bits: number; seconds: number; start: number; bytes: number; rf64: boolean };
function findFmt(b: Uint8Array) { const i = indexOf(b, [0x66, 0x6d, 0x74, 0x20]); return i < 0 ? null : b.slice(i + 8, i + 8 + (u32le(b, i + 4))); }
const u32le = (b: Uint8Array, p: number) => b[p] + (b[p + 1] << 8) + (b[p + 2] << 16) + ((b[p + 3] << 24) >>> 0);

export async function repairWav(src: Source, sink: Sink, ref: Source | null, manual: { rate: number; ch: number; bits: number } | null, onProgress?: Progress): Promise<WavInfo> {
  const head = await src.read(0, Math.min(1 << 20, src.size));
  let fmt = findFmt(head);
  if (!fmt && ref) fmt = findFmt(await ref.read(0, Math.min(1 << 20, ref.size)));
  if (!fmt) {
    if (!manual) throw new Error("O cabeçalho sumiu. Escolha um WAV bom do mesmo gravador ou informe taxa, canais e bits.");
    const ba = (manual.ch * manual.bits) / 8;
    const w = new W(); const le32 = (v: number) => w.bytes([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);
    w.bytes([1, 0, manual.ch, 0]); le32(manual.rate); le32(manual.rate * ba); w.bytes([ba, 0, manual.bits, 0]); fmt = w.get();
  }
  const ch = fmt[2] + (fmt[3] << 8), rate = u32le(fmt, 4), brate = u32le(fmt, 8), ba = fmt[12] + (fmt[13] << 8), bits = fmt[14] + (fmt[15] << 8);
  const di = indexOf(head, [0x64, 0x61, 0x74, 0x61]);
  const fi = indexOf(head, [0x66, 0x6d, 0x74, 0x20]);
  const start = di >= 0 ? di + 8 : fi >= 0 ? fi + 8 + fmt.length : 0;
  let n = src.size - start; n -= n % ba;
  const fmtc = new Uint8Array(8 + fmt.length + (fmt.length % 2)); fmtc.set([0x66, 0x6d, 0x74, 0x20]); new DataView(fmtc.buffer).setUint32(4, fmt.length, true); fmtc.set(fmt, 8);
  const rf64 = n + fmtc.length + 12 >= 0xffffffff;
  const h = new Uint8Array(rf64 ? 12 + 36 + fmtc.length + 8 : 12 + fmtc.length + 8); const v = new DataView(h.buffer);
  const tag = (p: number, s: string) => { for (let i = 0; i < 4; i++) h[p + i] = s.charCodeAt(i); };
  if (!rf64) {
    tag(0, "RIFF"); v.setUint32(4, 4 + fmtc.length + 8 + n, true); tag(8, "WAVE"); h.set(fmtc, 12);
    tag(12 + fmtc.length, "data"); v.setUint32(16 + fmtc.length, n, true);
  } else {
    const total = 4 + 36 + fmtc.length + 8 + n; const set64 = (p: number, x: number) => { v.setUint32(p, x % 2 ** 32, true); v.setUint32(p + 4, Math.floor(x / 2 ** 32), true); };
    tag(0, "RF64"); v.setUint32(4, 0xffffffff, true); tag(8, "WAVE"); tag(12, "ds64"); v.setUint32(16, 28, true);
    set64(20, total); set64(28, n); set64(36, 0); v.setUint32(44, 0, true);
    h.set(fmtc, 48); tag(48 + fmtc.length, "data"); v.setUint32(52 + fmtc.length, 0xffffffff, true);
  }
  await sink.write(h);
  let p = start; const end = start + n;
  while (p < end) {
    const len = Math.min(CH, end - p); await sink.write(await src.read(p, len)); p += len;
    onProgress?.({ done: p - start, total: n, phase: "copiando" });
  }
  return { ch, rate, bits, seconds: n / brate, start, bytes: n, rf64 };
}

/** Diz o que é o arquivo olhando os primeiros bytes. */
export async function sniff(src: Source): Promise<"wav" | "video" | "desconhecido"> {
  const b = await src.read(0, Math.min(src.size, 8 << 20));
  const t = str4(b, 0);
  if (t === "RIFF" || t === "RF64" || indexOf(b, [0x66, 0x6d, 0x74, 0x20], 0, 4096) >= 0) return "wav";
  if (indexOf(b, AUD) >= 0) return "video";
  return "desconhecido";
}

/** Fonte a partir de um File do navegador. */
export const fileSource = (f: Blob): Source => ({ size: f.size, read: async (off, len) => new Uint8Array(await f.slice(off, off + len).arrayBuffer()) });
