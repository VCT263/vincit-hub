/**
 * Recuperador genérico de MP4/MOV sem índice (moov), H.264 ou H.265.
 * Serve para Sony XAVC HS, Canon, Panasonic, DJI, iPhone, GoPro e outras câmeras que gravam
 * os quadros com o tamanho na frente de cada NAL (formato do MP4).
 *
 * Como funciona, em um único passe:
 *   1. copia o arquivo quebrado inteiro para o arquivo novo (ftyp + mdat);
 *   2. anda de NAL em NAL, juntando os NALs em quadros (access units);
 *   3. o que não é vídeo (lacunas) vira áudio PCM, usando o padrão de intercalação aprendido do clipe de referência;
 *   4. no fim grava o índice (moov) copiando as descrições de vídeo e áudio do clipe de referência.
 * Áudio AAC não dá para recortar sem decodificar: nesse caso o vídeo volta sem som.
 */
import { BR, Flow, KLV, W, allBoxes, box, boxes, fbox, findBox, indexOf, str4, u16, u32, unesc, MATRIX, type Progress, type Sink, type Source } from "./recovery";

type Codec = "avc" | "hevc";
type AvcSps = { l2fn: number; pocType: number; l2poc: number; frameMbsOnly: boolean; sepColour: boolean; mbs: number; pps: number[] };
type HevcSps = { l2poc: number; sepColour: boolean; ctbs: number; addrBits: number };
type HevcPps = { depSlices: boolean; outputFlag: boolean; extraBits: number };

export type GenRef = {
  codec: Codec; nalLen: number; brandQt: boolean; ftyp: Uint8Array; xavc: boolean;
  vStsd: Uint8Array; vTimescale: number; vDelta: number; w: number; h: number;
  avc?: AvcSps; hevc?: { sps: HevcSps; pps: Record<number, HevcPps> };
  audio: null | { stsd: Uint8Array; timescale: number; delta: number; s0: number; bps: number; fourcc: string; ch: number; rate: number; pcm: boolean; min: number; max: number };
  audioTracks: number; metaBefore: number; metaAfter: number;
  /** tamanhos de lacuna (áudio/metadado) mais comuns entre blocos de vídeo na referência */
  gaps: number[];
  label: string;
};
export type GenFrame = { off: number; size: number; key: boolean; poc: number; seg: number };
export type GenIndex = { frames: GenFrame[]; audio: [number, number][]; tail: number; start: number; dropped: number };

const PCM = ["lpcm", "sowt", "twos", "in24", "in32", "fl32", "fl64", "raw ", "ipcm", "NONE"];

// ---------------- bits ----------------
function sev(b: BR) { const k = b.ue(); return k % 2 ? (k + 1) / 2 : -k / 2; }
function skipScaling(b: BR, n: number) { let last = 8, next = 8; for (let j = 0; j < n; j++) { if (next) { next = (last + sev(b) + 256) % 256; } last = next || last; } }

function parseAvcSps(nal: Uint8Array): AvcSps {
  const b = new BR(unesc(nal).subarray(1, 200));
  const profile = b.u(8); b.u(16); b.ue();
  let sepColour = false;
  if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].includes(profile)) {
    const cf = b.ue(); if (cf === 3) sepColour = !!b.u(1);
    b.ue(); b.ue(); b.u(1);
    if (b.u(1)) for (let i = 0; i < (cf !== 3 ? 8 : 12); i++) if (b.u(1)) skipScaling(b, i < 6 ? 16 : 64);
  }
  const l2fn = b.ue() + 4; const pocType = b.ue(); let l2poc = 0;
  if (pocType === 0) l2poc = b.ue() + 4;
  else if (pocType === 1) { b.u(1); sev(b); sev(b); const n = b.ue(); for (let i = 0; i < n; i++) sev(b); }
  b.ue(); b.u(1);
  const wmb = b.ue() + 1, hmu = b.ue() + 1; const frameMbsOnly = !!b.u(1);
  return { l2fn, pocType, l2poc, frameMbsOnly, sepColour, mbs: wmb * hmu * (frameMbsOnly ? 1 : 2), pps: [] };
}

function parseHevcSps(nal: Uint8Array): HevcSps {
  const b = new BR(unesc(nal).subarray(2, 260));
  b.u(4); const msl = b.u(3); b.u(1);
  b.u(88); b.u(8);
  const pp: number[] = [], lp: number[] = [];
  for (let i = 0; i < msl; i++) { pp.push(b.u(1)); lp.push(b.u(1)); }
  if (msl > 0) for (let i = msl; i < 8; i++) b.u(2);
  for (let i = 0; i < msl; i++) { if (pp[i]) b.u(88); if (lp[i]) b.u(8); }
  b.ue(); const cf = b.ue(); let sepColour = false; if (cf === 3) sepColour = !!b.u(1);
  const w = b.ue(), h = b.ue();
  if (b.u(1)) { b.ue(); b.ue(); b.ue(); b.ue(); }
  b.ue(); b.ue(); const l2poc = b.ue() + 4;
  const subInfo = b.u(1);
  for (let i = subInfo ? 0 : msl; i <= msl; i++) { b.ue(); b.ue(); b.ue(); }
  const minCb = b.ue() + 3; const ctb = minCb + b.ue();
  const ctbs = Math.ceil(w / 2 ** ctb) * Math.ceil(h / 2 ** ctb);
  return { l2poc, sepColour, ctbs, addrBits: Math.ceil(Math.log2(ctbs)) };
}
function parseHevcPps(nal: Uint8Array): [number, HevcPps] {
  const b = new BR(unesc(nal).subarray(2, 40));
  const id = b.ue(); b.ue();
  return [id, { depSlices: !!b.u(1), outputFlag: !!b.u(1), extraBits: b.u(3) }];
}

// ---------------- referência ----------------
type Chunk = { off: number; size: number; trak: number };
function chunksOf(d: Uint8Array, stbl: { start: number; end: number }, trak: number): { chunks: Chunk[]; sizes: number[]; s0: number; count: number } {
  const co = findBox(d, ["stco"], stbl.start, stbl.end), c6 = findBox(d, ["co64"], stbl.start, stbl.end);
  const offs: number[] = [];
  if (co) { const n = u32(d, co.start + 4); for (let i = 0; i < n; i++) offs.push(u32(d, co.start + 8 + i * 4)); }
  else if (c6) { const n = u32(d, c6.start + 4); for (let i = 0; i < n; i++) offs.push(u32(d, c6.start + 8 + i * 8) * 2 ** 32 + u32(d, c6.start + 12 + i * 8)); }
  const sz = findBox(d, ["stsz"], stbl.start, stbl.end)!; const s0 = u32(d, sz.start + 4), count = u32(d, sz.start + 8);
  const sizes: number[] = []; if (!s0) for (let i = 0; i < count; i++) sizes.push(u32(d, sz.start + 12 + i * 4));
  const sc = findBox(d, ["stsc"], stbl.start, stbl.end)!; const ns = u32(d, sc.start + 4);
  const rows: [number, number][] = []; for (let i = 0; i < ns; i++) rows.push([u32(d, sc.start + 8 + i * 12), u32(d, sc.start + 12 + i * 12)]);
  const chunks: Chunk[] = []; let si = 0;
  for (let c = 0; c < offs.length; c++) {
    let per = 0; for (const [first, n] of rows) if (c + 1 >= first) per = n;
    let size = 0; for (let k = 0; k < per && si < count; k++, si++) size += s0 || sizes[si];
    chunks.push({ off: offs[c], size, trak });
  }
  return { chunks, sizes, s0, count };
}
const mode = (a: number[]) => { const m = new Map<number, number>(); a.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); let best = 0, bn = -1; m.forEach((n, x) => { if (n > bn) { bn = n; best = x; } }); return [best, bn / Math.max(1, a.length)] as const; };

export async function readGenericReference(src: Source): Promise<GenRef> {
  let p = 0, moov: Uint8Array | null = null, ftyp: Uint8Array | null = null;
  while (p + 8 <= src.size) {
    const h = await src.read(p, 16);
    let sz = u32(h, 0); const t = str4(h, 4);
    if (sz === 1) sz = u32(h, 8) * 2 ** 32 + u32(h, 12);
    if (sz === 0) sz = src.size - p;
    if (sz < 8) break;
    if (t === "ftyp" && sz < 1024) ftyp = await src.read(p, sz);
    if (t === "moov") { moov = await src.read(p, sz); break; }
    p += sz;
  }
  if (!moov) throw new Error("O clipe de referência não tem índice (moov). Use um arquivo que abre normalmente.");
  const d = moov; const root = findBox(d, ["moov"])!;
  const brands = ftyp ? Array.from({ length: (ftyp.length - 8) / 4 }, (_, i) => str4(ftyp!, 8 + i * 4)) : [];
  const brandQt = brands[0] === "qt  ";
  let v: any = null; let a: GenRef["audio"] = null; let audioTracks = 0;
  const all: Chunk[] = []; let tn = 0;
  for (const tk of allBoxes(d, "trak", root.start, root.end)) {
    tn++;
    const hd = findBox(d, ["mdia", "hdlr"], tk.start, tk.end); if (!hd) continue;
    const kind = str4(d, hd.start + 8);
    const md = findBox(d, ["mdia", "mdhd"], tk.start, tk.end)!; const ver = d[md.start];
    const ts = u32(d, md.start + (ver === 1 ? 20 : 12));
    const stbl = findBox(d, ["mdia", "minf", "stbl"], tk.start, tk.end); if (!stbl) continue;
    const sd = findBox(d, ["stsd"], stbl.start, stbl.end)!; const stsd = d.slice(sd.start - 8, sd.end);
    const entry = sd.start + 8; const fourcc = str4(d, entry + 4);
    const st = findBox(d, ["stts"], stbl.start, stbl.end)!; const nst = u32(d, st.start + 4);
    const deltas: number[] = []; for (let i = 0; i < nst; i++) for (let k = 0; k < Math.min(u32(d, st.start + 8 + i * 8), 50); k++) deltas.push(u32(d, st.start + 12 + i * 8));
    const ch = chunksOf(d, stbl, tn);
    if (kind === "vide" && !v) {
      let codec: Codec | null = null, nalLen = 4, cfgAt = -1;
      const ai = indexOf(d, [0x61, 0x76, 0x63, 0x43], sd.start, sd.end), hi = indexOf(d, [0x68, 0x76, 0x63, 0x43], sd.start, sd.end);
      if (hi >= 0) { codec = "hevc"; cfgAt = hi + 4; nalLen = (d[cfgAt + 21] & 3) + 1; }
      else if (ai >= 0) { codec = "avc"; cfgAt = ai + 4; nalLen = (d[cfgAt + 4] & 3) + 1; }
      if (!codec) throw new Error(`O vídeo de referência usa ${fourcc.trim()}, que ainda não é suportado. Funciona com H.264 e H.265.`);
      const tkhd = findBox(d, ["tkhd"], tk.start, tk.end)!; const tv = d[tkhd.start];
      const wpos = tkhd.start + (tv === 1 ? 88 : 76);
      v = { codec, nalLen, vStsd: stsd, vTimescale: ts, vDelta: mode(deltas)[0] || 1, w: u32(d, wpos) / 65536, h: u32(d, wpos + 4) / 65536, cfgAt, trak: tn };
      if (codec === "avc") {
        const c = d.subarray(cfgAt); let q = 6; const nsps = c[5] & 0x1f;
        if (!nsps) throw new Error("O clipe de referência não traz o SPS do vídeo.");
        v.avc = parseAvcSps(c.subarray(q + 2, q + 2 + u16(c, q)));
        for (let k = 0; k < nsps; k++) q += 2 + u16(c, q);
        const npps = c[q++] || 0;
        for (let k = 0; k < npps; k++) { const l = u16(c, q); try { v.avc.pps.push(new BR(unesc(c.subarray(q + 3, q + 2 + Math.min(l, 8)))).ue()); } catch { /* ignora */ } q += 2 + l; }
      } else {
        const c = d.subarray(cfgAt); let q = 23; const arrays = c[22]; let sps: HevcSps | null = null; const pps: Record<number, HevcPps> = {};
        for (let i = 0; i < arrays; i++) {
          const type = c[q] & 0x3f; const n = u16(c, q + 1); q += 3;
          for (let k = 0; k < n; k++) { const l = u16(c, q); const nal = c.subarray(q + 2, q + 2 + l); if (type === 33 && !sps) sps = parseHevcSps(nal); if (type === 34) { const [id, x] = parseHevcPps(nal); pps[id] = x; } q += 2 + l; }
        }
        if (!sps) throw new Error("O clipe de referência não traz o SPS do vídeo.");
        v.hevc = { sps, pps };
      }
      all.push(...ch.chunks);
    } else if (kind === "soun") {
      audioTracks++;
      if (!a) {
        const sver = u16(d, entry + 16); const chn = u16(d, entry + 24); const rate = u32(d, entry + 32) >>> 16;
        const total = ch.chunks.reduce((x, c) => x + c.size, 0);
        const bps = ch.count ? total / ch.count : 0;
        const pcm = !!ch.s0 && PCM.includes(fourcc) && Number.isInteger(bps) && bps > 0;
        const sizes = ch.chunks.map((c) => c.size).filter(Boolean);
        a = { stsd, timescale: ts, delta: mode(deltas)[0] || 1, s0: ch.s0, bps, fourcc, ch: chn, rate: sver === 2 ? Math.round(new DataView(d.buffer, d.byteOffset + entry + 40, 8).getFloat64(0)) : rate, pcm, min: Math.min(...sizes), max: Math.max(...sizes) };
        all.push(...ch.chunks.map((c) => ({ ...c, trak: -tn })));
      } else all.push(...ch.chunks.map((c) => ({ ...c, trak: 1000 + tn })));
    } else all.push(...ch.chunks.map((c) => ({ ...c, trak: 1000 + tn })));
  }
  if (!v) throw new Error("Não achei a trilha de vídeo no clipe de referência.");
  // padrão das lacunas entre blocos de vídeo: quanto de metadado vem antes e depois do áudio
  all.sort((x, y) => x.off - y.off);
  const before: number[] = [], after: number[] = [];
  let i = 0;
  while (i < all.length) {
    if (all[i].trak === v.trak) { i++; continue; }
    let j = i; while (j < all.length && all[j].trak !== v.trak) j++;
    const g = all.slice(i, j); const ai = g.findIndex((c) => c.trak < 0);
    if (ai >= 0) { let last = ai; g.forEach((c, k) => { if (c.trak < 0) last = k; }); before.push(g.slice(0, ai).reduce((x, c) => x + c.size, 0)); after.push(g.slice(last + 1).reduce((x, c) => x + c.size, 0)); }
    i = j;
  }
  const [mb, fb] = mode(before), [ma, fa] = mode(after);
  const vch = all.filter((c) => c.trak === v!.trak); const gl: number[] = [];
  for (let k = 0; k + 1 < vch.length; k++) { const g = vch[k + 1].off - vch[k].off - vch[k].size; if (g > 0) gl.push(g); }
  const gc = new Map<number, number>(); gl.forEach((g) => gc.set(g, (gc.get(g) || 0) + 1));
  const gaps = [...gc].filter(([, n]) => n >= Math.max(2, vch.length * 0.1)).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([g]) => g);
  const xavc = brands.some((b) => b.startsWith("XAVC"));
  const label = `${v.codec === "hevc" ? "H.265" : "H.264"}${xavc ? " · Sony XAVC" : ""}`;
  return { ...v, brandQt, ftyp: ftyp || Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0, 0, 2, 0, 0x71, 0x74, 0x20, 0x20]), xavc, audio: a, audioTracks, metaBefore: fb > 0.8 ? mb : 0, metaAfter: fa > 0.8 ? ma : 0, gaps, label };
}

// ---------------- NAL ----------------
type Nal = { len: number; type: number; vcl: boolean; first: boolean; auStart: boolean; key: boolean; ref: boolean; tid0: boolean; ok: boolean };
function nalInfo(codec: Codec, b0: number, b1: number, b2: number): Nal | null {
  if (b0 & 0x80) return null;
  if (codec === "avc") {
    const t = b0 & 31, ri = (b0 >> 5) & 3;
    if (t < 1 || t > 12) return null;
    if (t === 5 && !ri) return null;
    if ([6, 9, 10, 11, 12].includes(t) && ri) return null;
    const vcl = t === 1 || t === 5;
    return { len: 0, type: t, vcl, first: vcl && !!(b1 & 0x80), auStart: [6, 7, 8, 9, 13].includes(t), key: t === 5, ref: ri > 0, tid0: true, ok: true };
  }
  const t = (b0 >> 1) & 63, layer = ((b0 & 1) << 5) | (b1 >> 3), tp1 = b1 & 7;
  if (layer !== 0 || tp1 === 0) return null;
  if (!((t <= 9) || (t >= 16 && t <= 21) || (t >= 32 && t <= 40))) return null;
  if (t >= 16 && t <= 21 && tp1 !== 1) return null;
  if ((t === 32 || t === 33 || t === 34 || t === 35) && tp1 !== 1) return null;
  const vcl = t <= 31;
  // referência para o POC: TemporalId 0 e não RASL/RADL/sub-camada sem referência
  const tid0 = tp1 === 1 && !(t >= 6 && t <= 9) && !(t <= 14 && t % 2 === 0 && t < 16);
  return { len: 0, type: t, vcl, first: vcl && !!(b2 & 0x80), auStart: [32, 33, 34, 35, 39].includes(t), key: t >= 16 && t <= 21, ref: true, tid0, ok: true };
}

const MAXNAL = 24 << 20;

/** passe único: copia o arquivo e monta o mapa de quadros e de áudio */
export async function scanGeneric(src: Source, sink: Sink, r: GenRef, withAudio: boolean, onProgress?: Progress, signal?: AbortSignal): Promise<GenIndex & { header: number }> {
  const N = r.nalLen;
  const head = new Uint8Array(r.ftyp.length + 16); head.set(r.ftyp);
  const mv = new DataView(head.buffer, r.ftyp.length); mv.setUint32(0, 1); head.set([0x6d, 0x64, 0x61, 0x74], r.ftyp.length + 4);
  const total = src.size + 16; mv.setUint32(8, Math.floor(total / 2 ** 32)); mv.setUint32(12, total >>> 0);
  await sink.write(head);
  const HDR = head.length;
  const fl = new Flow(src, sink);
  const lenAt = (abs: number) => { let L = 0; for (let k = 0; k < N; k++) L = L * 256 + fl.at(abs + k); return L; };

  // onde começam os dados: dentro do mdat, se houver cabeçalho
  let start = 0;
  { const h = await src.read(0, Math.min(src.size, 1 << 20)); let q = 0;
    while (q + 8 <= h.length) { let sz = u32(h, q); const t = str4(h, q + 4); if (!/^[a-z ]{4}$/i.test(t)) break; let hs = 8; if (sz === 1) { sz = u32(h, q + 8) * 2 ** 32 + u32(h, q + 12); hs = 16; } if (t === "mdat") { start = q + hs; break; } if (sz < 8) break; q += sz; } }

  const avc = r.avc, hev = r.hevc;
  /** cabeçalho de fatia coerente com o SPS/PPS da referência? (filtra lixo que parece NAL) */
  const sliceOk = (x: Nal, hb: Uint8Array): boolean => {
    try {
      if (avc) {
        const b = new BR(unesc(hb.subarray(0, 16)).subarray(1));
        const m = b.ue(), st = b.ue(), pps = b.ue();
        if (m >= avc.mbs || st > 9) return false;
        if (x.type === 5 && st % 5 !== 2 && st % 5 !== 4) return false;
        return avc.pps.length ? avc.pps.includes(pps) : pps < 256;
      }
      if (hev) {
        const irap = x.type >= 16 && x.type <= 23;
        const b = new BR(unesc(hb.subarray(0, 24)).subarray(2)); const first = b.u(1); if (irap) b.u(1);
        const pps = hev.pps[b.ue()]; if (!pps) return false;
        if (!first) { const dep = pps.depSlices ? b.u(1) : 0; if (b.u(hev.sps.addrBits) >= hev.sps.ctbs) return false; if (dep) return true; }
        b.u(pps.extraBits); const st = b.ue();
        return st <= 2 && (!irap || st === 2);
      }
    } catch { return false; }
    return true;
  };
  /** NAL válido em abs? (lê o cabeçalho; não olha o seguinte) */
  const nalAt = async (abs: number, keep: number): Promise<Nal | null> => {
    if (abs + N + 3 > src.size) return null;
    await fl.ensure(abs, N + 3, keep);
    const L = lenAt(abs);
    if (L < 2 || L > MAXNAL || abs + N + L > src.size) return null;
    const x = nalInfo(r.codec, fl.at(abs + N), fl.at(abs + N + 1), fl.at(abs + N + 2));
    if (x) x.len = L;
    return x;
  };
  /** começo de quadro confiável: NAL de início + o NAL seguinte também válido */
  const frameStartAt = async (abs: number, keep: number, strict = false) => {
    const a = await nalAt(abs, keep);
    if (!a || !(a.auStart || a.first)) return false;
    if (a.vcl) { await fl.ensure(abs, N + 40, keep); if (!sliceOk(a, fl.sub(abs + N, Math.min(a.len, 40)))) return false; }
    const nx = abs + N + a.len;
    if (nx + N + 3 > src.size) return true;
    const b = await nalAt(nx, keep);
    if (b) return true;
    return !strict && a.vcl && a.len >= 256;
  };
  const findStart = async (from: number, to = src.size, keep = from, strict = false): Promise<number> => {
    let i = from;
    while (i + N + 3 <= to) {
      if (signal?.aborted) throw new Error("Cancelado.");
      await fl.ensure(i, 1 << 20, Math.min(keep, i));
      const lim = Math.min(fl.loaded - N - 3, src.size - N - 3, to - N - 3);
      for (; i <= lim; i++) {
        if (N === 4 && fl.at(i) !== 0) continue;
        const L = lenAt(i); if (L < 2 || L > MAXNAL) continue;
        if (!nalInfo(r.codec, fl.at(i + N), fl.at(i + N + 1), fl.at(i + N + 2))) continue;
        if (await frameStartAt(i, Math.min(keep, i), strict)) return i;
        await fl.ensure(i, 1 << 20, Math.min(keep, i));
      }
      if (fl.loaded >= src.size) break;
    }
    return -1;
  };

  // POC
  let seg = 0, prevMsb = 0, prevLsb = 0, lastAddr = -1;
  const pocOf = (x: Nal, hb: Uint8Array): number | null => {
    try {
      if (avc) {
        const b = new BR(unesc(hb).subarray(1));
        b.ue(); b.ue(); b.ue(); if (avc.sepColour) b.u(2); b.u(avc.l2fn);
        if (!avc.frameMbsOnly && b.u(1)) b.u(1);
        if (x.type === 5) b.ue();
        if (x.type === 5) { seg++; prevMsb = 0; prevLsb = 0; }
        if (avc.pocType !== 0) return null;
        const lsb = b.u(avc.l2poc), M = 2 ** avc.l2poc;
        let msb = prevMsb;
        if (lsb < prevLsb && prevLsb - lsb >= M / 2) msb = prevMsb + M; else if (lsb > prevLsb && lsb - prevLsb > M / 2) msb = prevMsb - M;
        if (x.ref) { prevMsb = msb; prevLsb = lsb; }
        return msb + lsb;
      }
      if (hev) {
        const b = new BR(unesc(hb).subarray(2));
        b.u(1); if (x.type >= 16 && x.type <= 23) b.u(1);
        const pps = hev.pps[b.ue()] || Object.values(hev.pps)[0] || { depSlices: false, outputFlag: false, extraBits: 0 };
        b.u(pps.extraBits); b.ue(); if (pps.outputFlag) b.u(1); if (hev.sps.sepColour) b.u(2);
        const idr = x.type === 19 || x.type === 20;
        if (idr || x.type === 16 || x.type === 17 || x.type === 18) { if (idr || x.type !== 21) { /* BLA/IDR zera */ } }
        if (idr || (x.type >= 16 && x.type <= 18)) { seg++; prevMsb = 0; prevLsb = 0; if (idr) return 0; }
        const lsb = b.u(hev.sps.l2poc), M = 2 ** hev.sps.l2poc;
        let msb = prevMsb;
        if (x.type >= 16 && x.type <= 18) msb = 0;
        else if (lsb < prevLsb && prevLsb - lsb >= M / 2) msb = prevMsb + M; else if (lsb > prevLsb && lsb - prevLsb > M / 2) msb = prevMsb - M;
        if (x.tid0) { prevMsb = msb; prevLsb = lsb; }
        return msb + lsb;
      }
    } catch { /* cabeçalho estranho: fica na ordem de decodificação */ }
    return null;
  };
  /** fatia seguinte do mesmo quadro? (endereço tem que crescer) */
  const contSlice = (x: Nal, hb: Uint8Array): boolean => {
    try {
      if (avc) { const b = new BR(unesc(hb.subarray(0, 12)).subarray(1)); const m = b.ue(); if (m <= lastAddr || m >= avc.mbs) return false; lastAddr = m; return true; }
      if (hev) {
        const b = new BR(unesc(hb.subarray(0, 16)).subarray(2)); b.u(1); if (x.type >= 16 && x.type <= 23) b.u(1);
        const pps = hev.pps[b.ue()]; if (!pps) return false;
        if (pps.depSlices) b.u(1);
        const m = b.u(hev.sps.addrBits); if (m <= lastAddr || m >= hev.sps.ctbs) return false; lastAddr = m; return true;
      }
    } catch { return false; }
    return true;
  };

  const frames: (GenFrame & { vcl: boolean })[] = []; const audio: [number, number][] = [];
  let cur: (GenFrame & { vcl: boolean }) | null = null; let tail = 0; let last = 0; let dropped = 0;
  const a = withAudio && r.audio?.pcm ? r.audio : null;
  const takeGap = async (g0: number, g1: number) => {
    if (!a || g1 <= g0) return;
    let s = g0 + r.metaBefore, e = g1 - r.metaAfter;
    if (!r.metaBefore && !r.metaAfter && r.xavc) {
      const h = await src.read(g0, Math.min(g1 - g0, 1 << 20)); const k = indexOf(h, KLV);
      if (k >= 28) e = g0 + k - 28;
    }
    let len = e - s; len -= len % a.bps;
    if (len <= 0 || len > Math.max(a.max * 3, 8 << 20)) return;
    if (a.min && len < a.min * 0.3) return;
    audio.push([s, len]);
  };

  await fl.ensure(start, 64 << 20, start);
  let p = await findStart(start);
  if (p < 0) throw new Error(`Não encontrei vídeo ${r.codec === "hevc" ? "H.265" : "H.264"} dentro do arquivo. Confira se o clipe de referência é da mesma câmera e do mesmo formato.`);
  while (p >= 0 && p < src.size) {
    if (signal?.aborted) throw new Error("Cancelado.");
    const x = await nalAt(p, p);
    let accept = false, newFrame = false;
    // depois de um quadro: uma lacuna do tamanho de sempre seguida de um começo de quadro é áudio, não vídeo
    if (cur && cur.vcl && r.gaps.length) {
      let G = 0;
      for (const g of r.gaps) if (p + g + N + 3 <= src.size && (await frameStartAt(p + g, p))) { G = g; break; }
      if (G) { await takeGap(p, p + G); cur = null; p += G; continue; }
    }
    if (x) {
      await fl.ensure(p, N + Math.min(x.len, 64), p);
      const hb = fl.sub(p + N, Math.min(x.len, 64));
      if (!cur || (cur.vcl && (x.auStart || x.first))) { newFrame = true; accept = x.auStart || x.first; if (cur && !accept) accept = false; }
      else if (x.vcl && !x.first) accept = cur.vcl ? contSlice(x, hb) : false;
      else if (!x.vcl) accept = !x.auStart || !cur.vcl;
      else accept = true; // primeira fatia depois de AUD/SPS/SEI
      if (accept && x.vcl && !sliceOk(x, hb)) accept = false;
      if (accept) {
        // o NAL seguinte também tem que ser válido; se não for, ou é o fim do quadro antes do áudio
        // ou é lixo do áudio que pareceu NAL. Um NAL de verdade não tem um começo de quadro dentro dele.
        const end = p + N + x.len;
        const solid = end + N + 3 > src.size || !!(await nalAt(end, p));
        if (!solid && !x.vcl && !(r.codec === "hevc" && x.type === 40)) accept = false;
        else if ((newFrame || !solid) && (await findStart(p + N + 3, end, p, true)) >= 0) accept = false;
        await fl.ensure(p, N, p);
      }
      if (accept) {
        if (newFrame) { cur = { off: p, size: 0, key: false, poc: NaN, seg, vcl: false }; frames.push(cur); lastAddr = -1; }
        if (x.vcl && x.first) { cur!.key = x.key; const poc = pocOf(x, hb); cur!.poc = poc === null ? NaN : poc; cur!.seg = seg; lastAddr = 0; }
        cur!.vcl = cur!.vcl || x.vcl;
        cur!.size = p + N + x.len - cur!.off;
        p += N + x.len;
      }
    }
    if (!accept) {
      const q = await findStart(p + 1);
      if (q < 0) { tail = src.size - p; await takeGap(p, Math.min(src.size, p + (a ? Math.floor(a.max * 1.1) : 0))); break; }
      await takeGap(p, q);
      cur = null; p = q;
    }
    if (fl.loaded - last > 64 << 20) { last = fl.loaded; onProgress?.({ done: fl.loaded, total: src.size, frames: frames.length, phase: "copiando" }); }
  }
  await fl.drain();
  onProgress?.({ done: src.size, total: src.size, frames: frames.length, phase: "copiando" });
  // o último quadro pode ter sido cortado no meio
  let out = frames.filter((f) => f.size > 0 && f.vcl);
  if (out.length > 1 && tail) { out = out.slice(0, -1); dropped++; }
  // quadros antes do primeiro quadro-chave não decodificam
  const k0 = out.findIndex((f) => f.key);
  if (k0 > 0) { dropped += k0; out = out.slice(k0); }
  // áudio de antes do primeiro quadro que sobrou sai também, para não dessincronizar
  const a0 = out.length ? out[0].off - (a ? a.max * 1.5 : 0) : 0;
  const aud = audio.filter(([o]) => o >= a0);
  return { frames: out, audio: aud, tail, start, dropped, header: HDR };
}

// ---------------- índice ----------------
export function buildGenericMoov(ix: GenIndex & { header: number }, r: GenRef) {
  const fr = ix.frames, N = fr.length, D = r.vDelta, VTS = r.vTimescale, MTS = 1000, HDR = ix.header;
  // ordem de exibição: por segmento (zera no IDR) e pelo POC; sem POC, fica a ordem de decodificação
  const hasPoc = fr.every((f) => !Number.isNaN(f.poc));
  let off: number[] = new Array(N).fill(0);
  if (hasPoc) {
    const order = fr.map((f, i) => [f.seg, f.poc, i] as const).sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    const di = new Array(N); order.forEach((d, k) => (di[d[2]] = k));
    off = fr.map((_, i) => di[i] - i);
  }
  const shift = -Math.min(0, ...off);
  const tbl = (rows: number[][]) => { const w = new W().u32(rows.length); rows.forEach((x) => x.forEach((y) => w.u32(y))); return w.get(); };
  const co64 = (o: number[]) => { const w = new W().u32(o.length); o.forEach((x) => w.u64(x + HDR)); return fbox("co64", 0, 0, w.get()); };
  const chunks: [number, number, number][] = [];
  for (const f of fr) { const c = chunks[chunks.length - 1]; if (c && c[0] + c[1] === f.off) { c[1] += f.size; c[2]++; } else chunks.push([f.off, f.size, 1]); }
  const stsc: [number, number][] = []; chunks.forEach((c, i) => { if (!stsc.length || stsc[stsc.length - 1][1] !== c[2]) stsc.push([i + 1, c[2]]); });
  const ctts: [number, number][] = []; for (const o of off) { const v = (o + shift) * D; const l = ctts[ctts.length - 1]; if (l && l[1] === v) l[0]++; else ctts.push([1, v]); }
  const keys = fr.map((f, i) => (f.key ? i + 1 : 0)).filter(Boolean);
  const stszV = new W().u32(0).u32(N); fr.forEach((f) => stszV.u32(f.size));
  const vparts = [r.vStsd, fbox("stts", 0, 0, tbl([[N, D]]))];
  if (shift || off.some(Boolean)) vparts.push(fbox("ctts", 0, 0, tbl(ctts)));
  if (keys.length && keys.length < N) vparts.push(fbox("stss", 0, 0, tbl(keys.map((k) => [k]))));
  vparts.push(fbox("stsc", 0, 0, tbl(stsc.map(([x, y]) => [x, y, 1]))), fbox("stsz", 0, 0, stszV.get()), co64(chunks.map((c) => c[0])));
  const vstbl = box("stbl", ...vparts);
  const vdur = N * D, mvdur = Math.round((vdur * MTS) / VTS);
  const tkhd = (id: number, dur: number, w: number, h: number, vol: number) => {
    const x = new W().u32(0).u32(0).u32(id).u32(0).u32(dur).zeros(8).u16(0).u16(0).u16(vol).u16(0); MATRIX.forEach((m) => x.u32(m)); x.u32(w * 65536).u32(h * 65536);
    return fbox("tkhd", 0, 7, x.get());
  };
  const mdhd = (ts: number, dur: number) => fbox("mdhd", 0, 0, new W().u32(0).u32(0).u32(ts).u32(dur).u16(0x55c4).u16(0).get());
  const qt = r.brandQt;
  const hdlr = (t: string, n: string) => qt
    ? fbox("hdlr", 0, 0, new W().str("mhlr").str(t).str("appl").zeros(8).u8(n.length).str(n).get())
    : fbox("hdlr", 0, 0, new W().u32(0).str(t).zeros(12).str(n).u8(0).get());
  const dhdlr = () => (qt ? [fbox("hdlr", 0, 0, new W().str("dhlr").str("alis").str("appl").zeros(8).u8(4).str("Data").get())] : []);
  const dinf = () => box("dinf", fbox("dref", 0, 0, new W().u32(1).get(), qt ? fbox("alis", 0, 1) : fbox("url ", 0, 1)));
  const elst = box("edts", fbox("elst", 0, 0, new W().u32(1).u32(mvdur).u32(shift * D).u16(1).u16(0).get()));
  const traks = [box("trak", tkhd(1, mvdur, r.w, r.h, 0), elst, box("mdia", mdhd(VTS, vdur), hdlr("vide", "Video"),
    box("minf", fbox("vmhd", 0, 1, new Uint8Array(8)), ...dhdlr(), dinf(), vstbl)))];
  let adur = 0;
  const a = r.audio;
  if (a && a.pcm && ix.audio.length) {
    const ns = ix.audio.map(([, s]) => Math.floor(s / a.bps)); const nas = ns.reduce((x, y) => x + y, 0);
    const astsc: [number, number][] = []; ns.forEach((n, i) => { if (!astsc.length || astsc[astsc.length - 1][1] !== n) astsc.push([i + 1, n]); });
    const astbl = box("stbl", a.stsd, fbox("stts", 0, 0, tbl([[nas, a.delta]])),
      fbox("stsc", 0, 0, tbl(astsc.map(([x, y]) => [x, y, 1]))), fbox("stsz", 0, 0, new W().u32(a.s0).u32(nas).get()), co64(ix.audio.map((x) => x[0])));
    const units = nas * a.delta;
    adur = Math.round((units * MTS) / a.timescale);
    traks.push(box("trak", tkhd(2, adur, 0, 0, 0x100), box("mdia", mdhd(a.timescale, units), hdlr("soun", "Sound"),
      box("minf", fbox("smhd", 0, 0, new Uint8Array(4)), ...dhdlr(), dinf(), astbl))));
  }
  const mv = new W().u32(0).u32(0).u32(MTS).u32(Math.max(mvdur, adur)).u32(0x10000).u16(0x100).zeros(10); MATRIX.forEach((m) => mv.u32(m)); mv.zeros(24).u32(traks.length + 1);
  return { moov: box("moov", fbox("mvhd", 0, 0, mv.get()), ...traks), seconds: vdur / VTS, audioSeconds: adur / 1000, reordered: hasPoc };
}

/** o arquivo quebrado parece um MP4/MOV (tem caixas no começo) ou um fluxo com tamanho na frente dos NALs? */
export async function looksLikeContainer(src: Source) {
  const h = await src.read(0, Math.min(src.size, 64));
  return ["ftyp", "mdat", "wide", "free", "skip", "moov", "uuid"].includes(str4(h, 4));
}
export { boxes };
