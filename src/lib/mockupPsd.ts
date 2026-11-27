/* Importador de mockups PSD (mockups-design.com e similares), 100% no navegador e sem custo.
   Lê o PSD, acha as áreas de design (objetos inteligentes) e recompõe as camadas com os modos de mesclagem
   duas vezes: com a área preta (K) e com a área branca (W). A diferença L = W − K é o "mapa de luz" da área:
   ali estão o papel, a textura, as sombras e os reflexos. Na tela, qualquer arte D entra como K + D·L
   (CSS: L em multiply sobre a arte, somado com plus-lighter sobre K), igual ao Photoshop para os modos usuais.
   readPsd e unzip vêm de fora (ag-psd e fflate carregados sob demanda), para não pesar o app. */

export type Quad = [number, number, number, number, number, number, number, number];
export type MockupSlot = { name: string; quad: Quad; w: number; h: number };
export type MockupResult = { width: number; height: number; base: Uint8ClampedArray; lights: Uint8ClampedArray[]; thumb: Uint8ClampedArray; slots: MockupSlot[]; log: string[] };

type Buf = { w: number; h: number; c: Float32Array }; // RGBA pré-multiplicado, 0..1
type Px = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

const SLOT_RE = /design|logo|front|back|artwork|art\b|label|screen|your|place|insert|here|edit|print|smart|cover|card|frente|verso|arte/i;

const SKIP_RE = /delete this layer|delete me|instru|read ?me|guide|apague/i;
const newBuf = (w: number, h: number): Buf => ({ w, h, c: new Float32Array(w * h * 4) });

/* blend separável (W3C compositing): b = fundo, s = camada, 0..1 */
function blendFn(mode: string): ((b: number, s: number) => number) | null {
  switch (mode) {
    case "multiply": return (b, s) => b * s;
    case "screen": return (b, s) => b + s - b * s;
    case "overlay": return (b, s) => (b <= .5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s));
    case "hard light": return (b, s) => (s <= .5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s));
    case "soft light": return (b, s) => (s <= .5 ? b - (1 - 2 * s) * b * (1 - b) : b + (2 * s - 1) * ((b <= .25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b));
    case "darken": return Math.min;
    case "lighten": return Math.max;
    case "color dodge": return (b, s) => (b === 0 ? 0 : s >= 1 ? 1 : Math.min(1, b / (1 - s)));
    case "color burn": return (b, s) => (b >= 1 ? 1 : s <= 0 ? 0 : 1 - Math.min(1, (1 - b) / s));
    case "linear dodge": return (b, s) => Math.min(1, b + s);
    case "linear burn": return (b, s) => Math.max(0, b + s - 1);
    case "difference": return (b, s) => Math.abs(b - s);
    case "exclusion": return (b, s) => b + s - 2 * b * s;
    default: return null; // normal e os não separáveis caem em normal
  }
}

/* compõe src sobre dst. atop = mantém o alfa do dst (camadas em máscara de corte) */
function composite(dst: Buf, src: Buf, mode: string, opacity: number, atop = false) {
  const f = blendFn(mode); const d = dst.c, s = src.c;
  for (let i = 0; i < d.length; i += 4) {
    const as = s[i + 3] * opacity; if (as <= 0) continue;
    const ab = d[i + 3];
    for (let k = 0; k < 3; k++) {
      const cs = s[i + k] / (s[i + 3] || 1), cb = ab > 0 ? d[i + k] / ab : 0;
      const mixed = f ? (1 - ab) * cs + ab * f(cb, cs) : cs;
      if (atop) d[i + k] = ab * (as * mixed + (1 - as) * cb);
      else d[i + k] = as * mixed + d[i + k] * (1 - as);
    }
    if (!atop) d[i + 3] = as + ab * (1 - as);
  }
}

/* reduz pixels do documento para a grade de saída (média por área) */
function sample(px: Px, left: number, top: number, s: number, W: number, H: number, gray = false): Buf {
  const out = newBuf(W, H); const acc = new Float32Array(W * H); const o = out.c; const d = px.data;
  for (let y = 0; y < px.height; y++) {
    const oy = Math.floor((top + y) * s); if (oy < 0 || oy >= H) continue;
    for (let x = 0; x < px.width; x++) {
      const ox = Math.floor((left + x) * s); if (ox < 0 || ox >= W) continue;
      const i = (y * px.width + x) * 4, j = oy * W + ox;
      if (gray) { o[j * 4] += d[i] / 255; }
      else { const a = d[i + 3] / 255; o[j * 4] += d[i] / 255 * a; o[j * 4 + 1] += d[i + 1] / 255 * a; o[j * 4 + 2] += d[i + 2] / 255 * a; o[j * 4 + 3] += a; }
      acc[j]++;
    }
  }
  for (let j = 0; j < W * H; j++) if (acc[j] > 1) for (let k = 0; k < 4; k++) o[j * 4 + k] /= acc[j];
  if (gray) return { ...out, c: out.c.map((v, i) => (i % 4 === 0 ? v : 0)) };
  return out;
}

/* cobertura de um quadrilátero na grade (supersample 3×3) */
function quadCoverage(q: number[], W: number, H: number): Float32Array {
  const cov = new Float32Array(W * H);
  const P = [[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]];
  const inside = (x: number, y: number) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    let n = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (inside(x + (a + .5) / 3, y + (b + .5) / 3)) n++;
    cov[y * W + x] = n / 9;
  }
  return cov;
}

type Ctx = { tick?: (n: string) => void; s: number; W: number; H: number; get: (l: any) => Px | undefined; mask: (l: any) => Px | undefined; slots: any[]; color: (slot: any) => number | null };

function applyMask(buf: Buf, layer: any, ctx: Ctx) {
  const m = layer.mask; if (!m || m.disabled) return;
  const px = ctx.mask(layer); const def = (m.defaultColor ?? 255) / 255;
  const { W, H, s } = ctx; const sum = new Float32Array(W * H), cnt = new Float32Array(W * H);
  if (px) for (let y = 0; y < px.height; y++) {
    const oy = Math.floor(((m.top || 0) + y) * s); if (oy < 0 || oy >= H) continue;
    for (let x = 0; x < px.width; x++) { const ox = Math.floor(((m.left || 0) + x) * s); if (ox < 0 || ox >= W) continue; const j = oy * W + ox; sum[j] += px.data[(y * px.width + x) * 4] / 255; cnt[j]++; }
  }
  for (let j = 0; j < W * H; j++) {
    const v = cnt[j] ? sum[j] / cnt[j] : def;
    if (v === 1) continue;
    for (let k = 0; k < 4; k++) buf.c[j * 4 + k] *= v;
  }
}

function layerBuf(layer: any, ctx: Ctx): Buf | null {
  const { W, H, s } = ctx;
  const slot = ctx.slots.find((x) => x.layer === layer);
  if (slot) {
    const v = ctx.color(slot); const cov = quadCoverage(slot.quad.map((n: number) => n * s), W, H); const b = newBuf(W, H);
    for (let j = 0; j < W * H; j++) { const a = cov[j]; b.c[j * 4] = b.c[j * 4 + 1] = b.c[j * 4 + 2] = (v ?? 0) * a; b.c[j * 4 + 3] = a; }
    return b;
  }
  if (layer.vectorFill?.type === "color" && layer.vectorFill.color) {
    const c = layer.vectorFill.color; const b = newBuf(W, H);
    for (let j = 0; j < W * H; j++) { b.c[j * 4] = (c.r ?? 0) / 255; b.c[j * 4 + 1] = (c.g ?? 0) / 255; b.c[j * 4 + 2] = (c.b ?? 0) / 255; b.c[j * 4 + 3] = 1; }
    return b;
  }
  const px = ctx.get(layer); if (!px || !px.width) return null;
  return sample(px, layer.left || 0, layer.top || 0, s, W, H);
}

async function renderList(children: any[], ctx: Ctx): Promise<Buf> {
  const out = newBuf(ctx.W, ctx.H);
  for (let i = 0; i < children.length; i++) {
    const l = children[i];
    if (l.clipping) continue; // tratado junto da base
    const clipped: any[] = []; for (let j = i + 1; j < children.length && children[j].clipping; j++) clipped.push(children[j]);
    if (l.hidden || SKIP_RE.test(l.name || "")) continue;
    await new Promise((r) => setTimeout(r, 0)); ctx.tick?.(l.name);
    let b: Buf | null = l.children ? await renderList(l.children, ctx) : layerBuf(l, ctx);
    if (!b) continue;
    applyMask(b, l, ctx);
    for (const c of clipped) {
      if (c.hidden) continue;
      const cb = c.children ? await renderList(c.children, ctx) : layerBuf(c, ctx); if (!cb) continue;
      applyMask(cb, c, ctx);
      composite(b, cb, c.blendMode || "normal", (c.opacity ?? 1) * (c.fillOpacity ?? 1), true);
    }
    const mode = l.blendMode === "pass through" ? "normal" : l.blendMode || "normal";
    composite(out, b, mode, (l.opacity ?? 1) * (l.children ? 1 : l.fillOpacity ?? 1));
  }
  return out;
}

/* corners do objeto inteligente na ordem TL, TR, BR, BL */
const cornersOf = (l: any): Quad | null => { const t = l.placedLayer?.nonAffineTransform || l.placedLayer?.transform; return t && t.length === 8 ? (t.slice() as Quad) : null; };

function walk(list: any[], fn: (l: any) => void) { for (const l of list || []) { fn(l); if (l.children) walk(l.children, fn); } }

export async function processPsd(psd: any, opts: { maxW?: number; get: (l: any) => Px | undefined; mask: (l: any) => Px | undefined; pick?: string[]; tick?: (n: string) => void }): Promise<MockupResult> {
  const log: string[] = [];
  const placed: any[] = []; walk(psd.children, (l) => { if (l.placedLayer && !l.children) placed.push(l); });
  let cand = placed.filter((l) => !l.hidden && cornersOf(l));
  if (opts.pick?.length) cand = cand.filter((l) => opts.pick!.some((p) => (l.name || "").toLowerCase().includes(p.toLowerCase())));
  else {
    const byName = cand.filter((l) => SLOT_RE.test(l.name || ""));
    const area = (l: any) => { const q = cornersOf(l)!; return Math.abs((q[2] - q[0]) * (q[7] - q[1])); };
    cand = (byName.length ? byName : cand).filter((l) => area(l) < psd.width * psd.height * .92);
  }
  log.push(`objetos inteligentes: ${placed.map((l) => l.name).join(" | ")}`, `áreas de design: ${cand.map((l) => l.name).join(" | ")}`);
  const s = Math.min(1, (opts.maxW || 2000) / psd.width); const W = Math.round(psd.width * s), H = Math.round(psd.height * s);
  const slots = cand.map((layer) => ({ layer, quad: cornersOf(layer)!, name: layer.name || "Design", w: layer.placedLayer.width || 1000, h: layer.placedLayer.height || 1000 }));
  const render = async (white: any | null) => {
    const buf = await renderList(psd.children, { s, W, H, get: opts.get, mask: opts.mask, slots, tick: opts.tick, color: (x) => (x === white ? 1 : 0) });
    const rgb = new Float32Array(W * H * 3);
    for (let j = 0; j < W * H; j++) { const a = buf.c[j * 4 + 3]; for (let k = 0; k < 3; k++) rgb[j * 3 + k] = buf.c[j * 4 + k] + (1 - a); } // fundo branco
    return rgb;
  };
  const K = await render(null);
  const toRGBA = (f: (j: number, k: number) => number) => { const o = new Uint8ClampedArray(W * H * 4); for (let j = 0; j < W * H; j++) { for (let k = 0; k < 3; k++) o[j * 4 + k] = f(j, k) * 255 + .5; o[j * 4 + 3] = 255; } return o; };
  const Ls: Float32Array[] = []; for (const sl of slots) { const Wt = await render(sl); Ls.push(Wt.map((v, i) => Math.max(0, v - K[i]))); }
  const thumb = toRGBA((j, k) => Math.min(1, K[j * 3 + k] + .94 * Ls.reduce((a, L) => a + L[j * 3 + k], 0)));
  return {
    width: W, height: H, base: toRGBA((j, k) => K[j * 3 + k]), lights: Ls.map((L) => toRGBA((j, k) => L[j * 3 + k])), thumb, log,
    slots: slots.map((x) => ({ name: x.name, w: x.w, h: x.h, quad: x.quad.map((n: number) => +(n * s).toFixed(2)) as Quad })),
  };
}

/* matrix3d que leva o retângulo (0,0,w,h) para o quadrilátero (TL, TR, BR, BL) */
export function quadMatrix(w: number, h: number, q: number[]) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  // mapa do quadrado unitário → quad; compõe com a escala 1/w, 1/h
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(10)).join(",")})`;
}
