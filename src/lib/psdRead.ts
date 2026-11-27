/* Leitor de PSD/PSB mínimo, sem dependências, para o importador de mockups.
   Lê só o necessário: camadas (pixels, máscara, modo, opacidade, corte, grupos), cor sólida e
   objetos inteligentes (cantos e tamanho). Pixels são decodificados sob demanda (RAW e RLE na hora,
   ZIP antes, de forma assíncrona, com o DecompressionStream do navegador). */

export type PsdLayer = {
  name: string; hidden: boolean; opacity: number; fillOpacity: number; blendMode: string; clipping: boolean;
  top: number; left: number; bottom: number; right: number;
  children?: PsdLayer[];
  mask?: { top: number; left: number; bottom: number; right: number; defaultColor: number; disabled: boolean };
  vectorFill?: { type: "color"; color: { r: number; g: number; b: number } };
  placedLayer?: { transform: number[]; nonAffineTransform?: number[]; width?: number; height?: number };
  _ch: { id: number; off: number; len: number; data?: Uint8Array }[];
};
export type Psd = { width: number; height: number; depth: number; children: PsdLayer[]; buf: Uint8Array; psb: boolean };
export type Pixels = { width: number; height: number; data: Uint8ClampedArray };

const BLEND: Record<string, string> = {
  "pass": "pass through", "norm": "normal", "diss": "normal", "dark": "darken", "mul ": "multiply", "idiv": "color burn", "lbrn": "linear burn", "dkCl": "darken",
  "lite": "lighten", "scrn": "screen", "div ": "color dodge", "lddg": "linear dodge", "lgCl": "lighten", "over": "overlay", "sLit": "soft light", "hLit": "hard light",
  "vLit": "hard light", "lLit": "hard light", "pLit": "hard light", "hMix": "hard light", "diff": "difference", "smud": "exclusion", "fsub": "difference", "fdiv": "color burn",
  "hue ": "hue", "sat ": "saturation", "colr": "color", "lum ": "luminosity",
};
const LONG_KEYS = new Set(["LMsk", "Lr16", "Lr32", "Layr", "Mt16", "Mt32", "Mtrn", "Alph", "FMsk", "lnk2", "FEid", "FXid", "PxSD", "cinf"]);

class R {
  p = 0; v: DataView;
  constructor(public b: Uint8Array, p = 0) { this.v = new DataView(b.buffer, b.byteOffset, b.byteLength); this.p = p; }
  u8() { return this.b[this.p++]; }
  u16() { const x = this.v.getUint16(this.p); this.p += 2; return x; }
  i16() { const x = this.v.getInt16(this.p); this.p += 2; return x; }
  u32() { const x = this.v.getUint32(this.p); this.p += 4; return x; }
  i32() { const x = this.v.getInt32(this.p); this.p += 4; return x; }
  f64() { const x = this.v.getFloat64(this.p); this.p += 8; return x; }
  u64() { const hi = this.u32(), lo = this.u32(); return hi * 4294967296 + lo; }
  str(n: number) { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(this.b[this.p + i]); this.p += n; return s; }
  uni() { const n = this.u32(); let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(this.u16()); return s.replace(/\0+$/, ""); }
  id() { const n = this.u32(); return this.str(n || 4); }
  skip(n: number) { this.p += n; }
}

/* descritor do Photoshop (usado no SoLd e na cor sólida) */
function desc(r: R): any {
  r.uni(); r.id(); const n = r.u32(); const o: any = {};
  for (let i = 0; i < n; i++) { const k = r.id(); o[k.trim()] = item(r, r.str(4)); }
  return o;
}
function item(r: R, t: string): any {
  switch (t) {
    case "Objc": case "GlbO": return desc(r);
    case "VlLs": { const n = r.u32(); const a = []; for (let i = 0; i < n; i++) a.push(item(r, r.str(4))); return a; }
    case "doub": return r.f64();
    case "UntF": r.str(4); return r.f64();
    case "UnFl": { r.str(4); const n = r.u32(); const a = []; for (let i = 0; i < n; i++) a.push(r.f64()); return a; }
    case "TEXT": return r.uni();
    case "enum": r.id(); return r.id();
    case "long": return r.i32();
    case "comp": return r.u64();
    case "bool": return !!r.u8();
    case "type": case "GlbC": r.uni(); return r.id();
    case "alis": case "tdta": case "Pth ": { const n = r.u32(); r.p += n; return null; }
    case "ObAr": { r.u32(); r.uni(); r.id(); const n = r.u32(); const o: any = {}; for (let i = 0; i < n; i++) { const k = r.id(); o[k.trim()] = item(r, r.str(4)); } return o; }
    case "obj ": { const n = r.u32(); for (let i = 0; i < n; i++) { const t2 = r.str(4); if (t2 === "prop") { r.uni(); r.id(); r.id(); } else if (t2 === "Clss") { r.uni(); r.id(); } else if (t2 === "Enmr") { r.uni(); r.id(); r.id(); r.id(); } else if (t2 === "rele") { r.uni(); r.id(); r.u32(); } else if (t2 === "Idnt" || t2 === "indx") r.u32(); else if (t2 === "name") { r.uni(); r.id(); r.uni(); } else throw new Error("ref " + t2); } return null; }
    default: throw new Error("tipo de descritor " + t);
  }
}

export function readPsd(buf: Uint8Array): Psd {
  const r = new R(buf);
  if (r.str(4) !== "8BPS") throw new Error("Não é um arquivo PSD");
  const ver = r.u16(); const psb = ver === 2; r.p += 6;
  r.u16(); const height = r.u32(), width = r.u32(), depth = r.u16(), mode = r.u16();
  if (mode !== 3) throw new Error("O PSD precisa estar em RGB");
  r.skip(r.u32()); r.skip(r.u32());
  const len = () => (psb ? r.u64() : r.u32());
  const lmLen = len(); const lmEnd = r.p + lmLen;
  const liLen = len(); const liEnd = r.p + liLen;
  const flat: (PsdLayer & { _sect?: number })[] = [];
  if (liLen > 0) {
    let count = Math.abs(r.i16());
    for (let i = 0; i < count; i++) {
      const top = r.i32(), left = r.i32(), bottom = r.i32(), right = r.i32();
      const nch = r.u16(); const chs: { id: number; len: number }[] = [];
      for (let c = 0; c < nch; c++) chs.push({ id: r.i16(), len: psb ? r.u64() : r.u32() });
      r.str(4); const key = r.str(4); const opacity = r.u8() / 255; const clipping = r.u8() === 1; const flags = r.u8(); r.u8();
      const exLen = r.u32(); const exEnd = r.p + exLen;
      const L: PsdLayer & { _sect?: number } = { name: "", hidden: !!(flags & 2), opacity, fillOpacity: 1, blendMode: BLEND[key] || "normal", clipping, top, left, bottom, right, _ch: chs.map((c) => ({ id: c.id, off: 0, len: c.len })) };
      const mLen = r.u32(); const mEnd = r.p + mLen;
      if (mLen >= 18) { const mt = r.i32(), ml = r.i32(), mb = r.i32(), mr = r.i32(); const dc = r.u8(); const mf = r.u8(); L.mask = { top: mt, left: ml, bottom: mb, right: mr, defaultColor: dc, disabled: !!(mf & 2) }; }
      r.p = mEnd;
      r.skip(r.u32());
      const nl = r.u8(); L.name = r.str(nl); r.p += (4 - ((nl + 1) % 4)) % 4;
      while (r.p + 12 <= exEnd) {
        const sig = r.str(4); if (sig !== "8BIM" && sig !== "8B64") break;
        const k = r.str(4); const l = psb && LONG_KEYS.has(k) ? r.u64() : r.u32(); const end = r.p + l;
        try {
          if (k === "luni") L.name = r.uni();
          else if (k === "lsct" || k === "lsdk") { L._sect = r.u32(); if (l >= 12) { r.str(4); L.blendMode = BLEND[r.str(4)] || L.blendMode; } }
          else if (k === "iOpa") L.fillOpacity = r.u8() / 255;
          else if (k === "SoCo") { r.u32(); const d = desc(r); const c = d["Clr"] || {}; L.vectorFill = { type: "color", color: { r: c["Rd"] ?? 0, g: c["Grn"] ?? 0, b: c["Bl"] ?? 0 } }; }
          else if (k === "PlLd") { r.str(4); r.u32(); const n = r.u8(); r.p += n; r.p += 16; const t = []; for (let j = 0; j < 8; j++) t.push(r.f64()); L.placedLayer = { ...(L.placedLayer || {}), transform: L.placedLayer?.transform || t }; }
          else if (k === "SoLd" || k === "SoLE") {
            r.str(4); r.u32(); r.u32(); const d = desc(r);
            const t = Array.isArray(d["Trnf"]) ? d["Trnf"] : undefined; const na = Array.isArray(d["nonAffineTransform"]) ? d["nonAffineTransform"] : undefined;
            const sz = d["Sz"] || {};
            L.placedLayer = { transform: t || L.placedLayer?.transform || [], nonAffineTransform: na, width: sz["Wdth"], height: sz["Hght"] };
          }
        } catch { /* bloco que não entendemos: segue para o próximo */ }
        r.p = end;
      }
      r.p = exEnd;
      flat.push(L);
    }
    // dados dos canais, na mesma ordem
    for (const L of flat) for (const c of L._ch) { c.off = r.p; r.p += c.len; }
  }
  r.p = Math.max(r.p, liEnd);
  void lmEnd;
  // árvore: registros vão de baixo para cima; seção 3 abre um grupo, 1 ou 2 fecha (e carrega os dados do grupo)
  const root: PsdLayer[] = []; const stack: PsdLayer[][] = [root];
  for (const L of flat) {
    if (L._sect === 3) { stack.push([]); continue; }
    if (L._sect === 1 || L._sect === 2) { const kids = stack.length > 1 ? stack.pop()! : []; L.children = kids; stack[stack.length - 1].push(L); continue; }
    stack[stack.length - 1].push(L);
  }
  return { width, height, depth, children: root, buf, psb };
}

async function inflate(b: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const out = await new Response(new Blob([b as BlobPart]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(out);
}

/* descompacta antes os canais em ZIP das camadas que vão ser usadas */
export async function prepareLayer(psd: Psd, L: PsdLayer) {
  for (const c of L._ch) {
    if (c.data || c.len < 2) continue;
    const comp = (psd.buf[c.off] << 8) | psd.buf[c.off + 1];
    if (comp === 2 || comp === 3) c.data = await inflate(psd.buf.subarray(c.off + 2, c.off + c.len));
  }
}

function channel(psd: Psd, c: PsdLayer["_ch"][number], w: number, h: number): Uint8Array | null {
  if (w <= 0 || h <= 0 || c.len < 2) return null;
  const bpc = psd.depth / 8; const b = psd.buf; const comp = (b[c.off] << 8) | b[c.off + 1];
  const out = new Uint8Array(w * h);
  if (comp === 0) { for (let i = 0; i < w * h; i++) out[i] = b[c.off + 2 + i * bpc]; return out; }
  if (comp === 1) {
    const cnt = psd.psb ? 4 : 2; let p = c.off + 2 + h * cnt; const row = new Uint8Array(w * bpc);
    for (let y = 0; y < h; y++) {
      let n = 0;
      while (n < w * bpc) { const hdr = b[p++]; if (hdr < 128) { for (let k = 0; k <= hdr; k++) row[n++] = b[p++]; } else if (hdr > 128) { const v = b[p++]; for (let k = 0; k < 257 - hdr; k++) row[n++] = v; } }
      for (let x = 0; x < w; x++) out[y * w + x] = row[x * bpc];
    }
    return out;
  }
  const d = c.data; if (!d) return null;
  if (comp === 2) { for (let i = 0; i < w * h; i++) out[i] = d[i * bpc]; return out; }
  // 3: ZIP com predição (delta por linha)
  if (bpc === 1) { for (let y = 0; y < h; y++) { let v = 0; for (let x = 0; x < w; x++) { v = (v + d[y * w + x]) & 255; out[y * w + x] = v; } } return out; }
  if (bpc === 2) { for (let y = 0; y < h; y++) { let v = 0; for (let x = 0; x < w; x++) { const i = (y * w + x) * 2; v = (v + ((d[i] << 8) | d[i + 1])) & 65535; out[y * w + x] = v >> 8; } } return out; }
  return null;
}

export function layerPixels(psd: Psd, L: PsdLayer): Pixels | undefined {
  const w = L.right - L.left, h = L.bottom - L.top; if (w <= 0 || h <= 0) return;
  const data = new Uint8ClampedArray(w * h * 4); let hasA = false;
  for (const c of L._ch) {
    if (c.id < -1 || c.id > 2) continue;
    const ch = channel(psd, c, w, h); if (!ch) continue;
    const k = c.id === -1 ? 3 : c.id; if (k === 3) hasA = true;
    for (let i = 0; i < w * h; i++) data[i * 4 + k] = ch[i];
  }
  if (!hasA) for (let i = 0; i < w * h; i++) data[i * 4 + 3] = 255;
  return { width: w, height: h, data };
}

export function maskPixels(psd: Psd, L: PsdLayer): Pixels | undefined {
  const m = L.mask; if (!m) return; const w = m.right - m.left, h = m.bottom - m.top;
  const c = L._ch.find((x) => x.id === -2); if (!c) return;
  const ch = channel(psd, c, w, h); if (!ch) return;
  const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) data[i * 4] = ch[i];
  return { width: w, height: h, data };
}

/* .zip do site → maior .psd/.psb dentro dele */
export async function psdFromZip(zip: Uint8Array): Promise<{ name: string; data: Uint8Array }> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let e = zip.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("Zip inválido");
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const files: { name: string; method: number; csize: number; local: number; size: number }[] = [];
  for (let i = 0; i < n; i++) {
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nl));
    files.push({ name, method, csize, local, size }); p += 46 + nl + xl + cl;
  }
  const f = files.filter((x) => /\.ps[db]$/i.test(x.name) && !/__MACOSX/.test(x.name)).sort((a, b) => b.size - a.size)[0];
  if (!f) throw new Error("Não achei .psd dentro do zip");
  const lp = f.local; const start = lp + 30 + v.getUint16(lp + 26, true) + v.getUint16(lp + 28, true);
  const raw = zip.subarray(start, start + f.csize);
  if (f.method === 0) return { name: f.name, data: raw };
  const ds = new DecompressionStream("deflate-raw");
  const out = await new Response(new Blob([raw as BlobPart]).stream().pipeThrough(ds)).arrayBuffer();
  return { name: f.name, data: new Uint8Array(out) };
}
