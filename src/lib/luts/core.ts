/* Motor das LUTs do Audiovisual.
 * Tudo é calculado aqui, no navegador: a conversão de cada log (curvas e gamuts publicados pelos fabricantes),
 * os estilos e as aproximações das LUTs de cada marca. O mesmo cálculo gera a prévia da Biblioteca de LUTs e a cor
 * aplicada no Editor do HUB. O HUB não hospeda nem gera arquivo .cube: a LUT original é baixada no site de quem fez. */

export type RGB = [number, number, number];
type M3 = number[]; // 3x3, linha a linha

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const mul = (m: M3, c: RGB): RGB => [m[0] * c[0] + m[1] * c[1] + m[2] * c[2], m[3] * c[0] + m[4] * c[1] + m[5] * c[2], m[6] * c[0] + m[7] * c[1] + m[8] * c[2]];
const mm = (a: M3, b: M3): M3 => {
  const r: M3 = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
  return r;
};
function inv(m: M3): M3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/* ---------- gamuts (primárias xy, branco D65) ---------- */
type Prim = [number, number, number, number, number, number];
const D65: [number, number] = [0.3127, 0.329];
function rgbToXyz(p: Prim): M3 {
  const xyz = (x: number, y: number): RGB => [x / y, 1, (1 - x - y) / y];
  const r = xyz(p[0], p[1]), g = xyz(p[2], p[3]), b = xyz(p[4], p[5]);
  const P: M3 = [r[0], g[0], b[0], r[1], g[1], b[1], r[2], g[2], b[2]];
  const w = xyz(D65[0], D65[1]);
  const S = mul(inv(P), w);
  return [P[0] * S[0], P[1] * S[1], P[2] * S[2], P[3] * S[0], P[4] * S[1], P[5] * S[2], P[6] * S[0], P[7] * S[1], P[8] * S[2]];
}
const GAMUTS: Record<string, Prim> = {
  rec709: [0.64, 0.33, 0.3, 0.6, 0.15, 0.06],
  rec2020: [0.708, 0.292, 0.17, 0.797, 0.131, 0.046],
  sgamut3cine: [0.766, 0.275, 0.225, 0.8, 0.089, -0.087],
  vgamut: [0.73, 0.28, 0.165, 0.84, 0.1, -0.03],
  cinemagamut: [0.74, 0.27, 0.17, 1.14, 0.08, -0.1],
  bmdwg5: [0.7177215, 0.3171181, 0.228041, 0.861569, 0.1005841, -0.0820452],
  dgamut: [0.71, 0.31, 0.21, 0.88, 0.09, -0.08],
};
const XYZ_TO_709 = inv(rgbToXyz(GAMUTS.rec709));
const toRec709 = (g: string): M3 => mm(XYZ_TO_709, rgbToXyz(GAMUTS[g]));
const fromRec709 = (g: string): M3 => inv(toRec709(g));

/* ---------- curvas log: código (0-1) → luz da cena (0,18 = cinza médio) ---------- */
type Curve = { decode: (y: number) => number; encode: (x: number) => number };
const log10 = Math.log10;
const CURVES: Record<string, Curve> = {
  slog3: {
    decode: (y) => (y >= 171.2102946929 / 1023 ? Math.pow(10, (y * 1023 - 420) / 261.5) * 0.19 - 0.01 : ((y * 1023 - 95) * 0.01125) / (171.2102946929 - 95)),
    encode: (x) => (x >= 0.01125 ? (420 + log10((x + 0.01) / 0.19) * 261.5) / 1023 : ((x * (171.2102946929 - 95)) / 0.01125 + 95) / 1023),
  },
  vlog: {
    decode: (y) => (y < 0.181 ? (y - 0.125) / 5.6 : Math.pow(10, (y - 0.598206) / 0.241514) - 0.00873),
    encode: (x) => (x < 0.01 ? 5.6 * x + 0.125 : 0.241514 * log10(x + 0.00873) + 0.598206),
  },
  clog3: {
    // fórmula da Canon (v1.2) sobre o código em faixa cheia; o arquivo vem em faixa legal
    decode: (v) => {
      const y = (v * 1023 - 64) / 876;
      const x = y < 0.097465473 ? -(Math.pow(10, (0.12783901 - y) / 0.36726845) - 1) / 14.98325 : y <= 0.15277891 ? (y - 0.12512219) / 1.9754798 : (Math.pow(10, (y - 0.12240537) / 0.36726845) - 1) / 14.98325;
      return x * 0.9;
    },
    encode: (s) => {
      const x = s / 0.9;
      const y = x < -0.014 ? -0.36726845 * log10(1 - 14.98325 * x) + 0.12783901 : x <= 0.014 ? 1.9754798 * x + 0.12512219 : 0.36726845 * log10(14.98325 * x + 1) + 0.12240537;
      return (y * 876 + 64) / 1023;
    },
  },
  applelog: {
    decode: (p) => (p >= 47.28711236 * Math.pow(0.01 + 0.05641088, 2) ? Math.pow(2, (p - 0.69336945) / 0.08550479) - 0.00964052 : p > 0 ? Math.sqrt(p / 47.28711236) - 0.05641088 : -0.05641088),
    encode: (x) => (x >= 0.01 ? 0.08550479 * Math.log2(x + 0.00964052) + 0.69336945 : x > -0.05641088 ? 47.28711236 * Math.pow(x + 0.05641088, 2) : 0),
  },
  bmdfilm5: {
    decode: (y) => (y < 8.283605932402494 * 0.005 + 0.09246575342465753 ? (y - 0.09246575342465753) / 8.283605932402494 : Math.exp((y - 0.5300133392291939) / 0.08692876065491224) - 0.005494072432257808),
    encode: (x) => (x < 0.005 ? 8.283605932402494 * x + 0.09246575342465753 : 0.08692876065491224 * Math.log(x + 0.005494072432257808) + 0.5300133392291939),
  },
  flog2: {
    decode: (y) => (y >= 0.100686685370811 ? (Math.pow(10, (y - 0.384316) / 0.245281) - 0.064829) / 5.555556 : (y - 0.092864) / 8.799461),
    encode: (x) => (x >= 0.000889 ? 0.245281 * log10(5.555556 * x + 0.064829) + 0.384316 : 8.799461 * x + 0.092864),
  },
  flog: {
    decode: (y) => (y >= 0.100537775223865 ? (Math.pow(10, (y - 0.790453) / 0.344676) - 0.009468) / 0.555556 : (y - 0.092864) / 8.735631),
    encode: (x) => (x >= 0.00089 ? 0.344676 * log10(0.555556 * x + 0.009468) + 0.790453 : 8.735631 * x + 0.092864),
  },
  nlog: {
    decode: (y) => (y < 452 / 1023 ? Math.pow(Math.max(0, y) / (650 / 1023), 3) - 0.0075 : Math.exp((y - 619 / 1023) / (150 / 1023))),
    encode: (x) => (x < 0.328 ? (650 / 1023) * Math.cbrt(x + 0.0075) : (150 / 1023) * Math.log(x) + 619 / 1023),
  },
  dlog: {
    decode: (y) => (y <= 0.14 ? (y - 0.0929) / 6.025 : (Math.pow(10, 3.89616 * y - 2.27752) - 0.0108) / 0.9892),
    encode: (x) => (x <= 0.0078 ? 6.025 * x + 0.0929 : (log10(x * 0.9892 + 0.0108) + 2.27752) / 3.89616),
  },
};

/** perfis de log que o HUB converte sozinho para Rec.709 */
export type LogProfile = { id: string; curve: string; gamut: string };
export const LOG_PROFILES: Record<string, LogProfile> = {
  bmdfilm5: { id: "bmdfilm5", curve: "bmdfilm5", gamut: "bmdwg5" },
  slog3: { id: "slog3", curve: "slog3", gamut: "sgamut3cine" },
  clog3: { id: "clog3", curve: "clog3", gamut: "cinemagamut" },
  vlog: { id: "vlog", curve: "vlog", gamut: "vgamut" },
  applelog: { id: "applelog", curve: "applelog", gamut: "rec2020" },
  flog2: { id: "flog2", curve: "flog2", gamut: "rec2020" },
  flog: { id: "flog", curve: "flog", gamut: "rec2020" },
  nlog: { id: "nlog", curve: "nlog", gamut: "rec2020" },
  dlog: { id: "dlog", curve: "dlog", gamut: "dgamut" },
};

/* ---------- tom fílmico: luz da cena → tela Rec.709 ---------- */
const aces = (x: number) => { x = Math.max(0, x); return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14); };
const acesInv = (y: number) => {
  y = clamp(y, 0, 0.985);
  const a = 2.51 - 2.43 * y, b = 0.03 - 0.59 * y, c = -0.14 * y;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
};
const GRAY_OUT = 0.44; // cinza médio da cena vira 44% na tela
const EXPO = (() => { const target = Math.pow(GRAY_OUT, 2.4); let lo = 0, hi = 10; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (aces(0.18 * m) < target) lo = m; else hi = m; } return (lo + hi) / 2; })();
const toDisplay = (x: number) => Math.pow(clamp(aces(x * EXPO)), 1 / 2.4);
const fromDisplay = (d: number) => acesInv(Math.pow(clamp(d), 2.4)) / EXPO;
/** cores fora do Rec.709 voltam para dentro perdendo saturação, sem virar mancha */
function gamutClip(c: RGB): RGB {
  const mn = Math.min(c[0], c[1], c[2]);
  if (mn >= 0) return c;
  const y = Math.max(luma(c), 1e-4);
  const t = Math.min(1, -mn / (y - mn));
  return [lerp(c[0], y, t), lerp(c[1], y, t), lerp(c[2], y, t)];
}

const matCache: Record<string, M3> = {};
/** código log da câmera → Rec.709 na tela */
export function convertLog(c: RGB, profile: string): RGB {
  const p = LOG_PROFILES[profile];
  if (!p) return c;
  const cv = CURVES[p.curve];
  const m = (matCache["to" + p.gamut] ||= toRec709(p.gamut));
  const lin = gamutClip(mul(m, [cv.decode(c[0]), cv.decode(c[1]), cv.decode(c[2])]));
  return [toDisplay(lin[0]), toDisplay(lin[1]), toDisplay(lin[2])];
}
/** caminho inverso, só para a prévia: uma foto comum vira um quadro "lavado" como sairia da câmera em log */
export function toLog(c: RGB, profile: string): RGB {
  const p = LOG_PROFILES[profile];
  if (!p) return c;
  const cv = CURVES[p.curve];
  const m = (matCache["from" + p.gamut] ||= fromRec709(p.gamut));
  const lin = mul(m, [fromDisplay(c[0]), fromDisplay(c[1]), fromDisplay(c[2])]);
  return [clamp(cv.encode(lin[0])), clamp(cv.encode(lin[1])), clamp(cv.encode(lin[2]))];
}

/* ---------- ferramentas de cor (na tela, 0-1) ---------- */
const sat = (c: RGB, s: number): RGB => { const y = luma(c); return [y + (c[0] - y) * s, y + (c[1] - y) * s, y + (c[2] - y) * s]; };
/** curva em S em torno do pivô; k > 0 dá contraste */
const sCurve = (x: number, k: number, pivot = 0.45) => {
  x = clamp(x);
  return x < pivot ? pivot * Math.pow(x / pivot, 1 + k) : 1 - (1 - pivot) * Math.pow((1 - x) / (1 - pivot), 1 + k);
};
const contrast = (c: RGB, k: number, pivot = 0.45): RGB => [sCurve(c[0], k, pivot), sCurve(c[1], k, pivot), sCurve(c[2], k, pivot)];
/** levanta os pretos (fade) e baixa os brancos */
const levels = (c: RGB, black: number, white = 1): RGB => c.map((v) => black + clamp(v) * (white - black)) as RGB;
/** tinge sombras e altas luzes separadamente (split toning) */
function split(c: RGB, sh: RGB, shAmt: number, hi: RGB, hiAmt: number): RGB {
  const y = clamp(luma(c));
  const ws = Math.pow(1 - y, 2) * shAmt, wh = Math.pow(y, 2) * hiAmt;
  return [c[0] + (sh[0] - 0.5) * ws + (hi[0] - 0.5) * wh, c[1] + (sh[1] - 0.5) * ws + (hi[1] - 0.5) * wh, c[2] + (sh[2] - 0.5) * ws + (hi[2] - 0.5) * wh];
}
const gain = (c: RGB, r: number, g: number, b: number): RGB => [c[0] * r, c[1] * g, c[2] * b];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const bw = (c: RGB, w: RGB): RGB => { const y = c[0] * w[0] + c[1] * w[1] + c[2] * w[2]; return [y, y, y]; };
/** puxa os tons parecidos com uma cor (pele, verde) na direção de outra */
function hsv(c: RGB): RGB {
  const [r, g, b] = c.map((v) => clamp(v)) as RGB; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-6) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx];
}
function fromHsv(h: number, s: number, v: number): RGB {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}
function hueShift(c: RGB, center: number, width: number, shift: number, satMul = 1): RGB {
  const [h, s, v] = hsv(c);
  let d = Math.abs(h - center); d = Math.min(d, 360 - d);
  if (d > width) return c;
  const w = Math.pow(Math.cos((d / width) * Math.PI / 2), 2);
  return fromHsv((h + shift * w + 360) % 360, clamp(s * lerp(1, satMul, w)), v);
}
/** saturação que poupa o que já está saturado (vibrance) */
const vibrance = (c: RGB, k: number): RGB => { const [, s] = hsv(c); return sat(c, 1 + k * (1 - s)); };

/* ---------- filtros CSS do Editor, em matriz (mesmas fórmulas do navegador) ---------- */
const cssSepia = (a: number): M3 => { const i = 1 - a; return [0.393 + 0.607 * i, 0.769 - 0.769 * i, 0.189 - 0.189 * i, 0.349 - 0.349 * i, 0.686 + 0.314 * i, 0.168 - 0.168 * i, 0.272 - 0.272 * i, 0.534 - 0.534 * i, 0.131 + 0.869 * i]; };
const cssSat = (s: number): M3 => [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
const cssHue = (deg: number): M3 => {
  const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  return [0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928, 0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.14, 0.072 - cs * 0.072 - sn * 0.283, 0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072];
};
const cl = (c: RGB): RGB => [clamp(c[0]), clamp(c[1]), clamp(c[2])];
const cssBright = (c: RGB, b: number) => cl([c[0] * b, c[1] * b, c[2] * b]);
const cssContrast = (c: RGB, k: number) => cl(c.map((v) => (v - 0.5) * k + 0.5) as RGB);
const cssM = (c: RGB, m: M3) => cl(mul(m, c));

/* ---------- estilos ---------- */
export type LookFn = (c: RGB) => RGB;
export const LOOK_FNS: Record<string, LookFn> = {
  // looks do Editor (iguais aos filtros que o Editor já usa)
  "editor-quente": (c) => cssBright(cssM(cssM(c, cssSepia(0.18)), cssSat(1.15)), 1.03),
  "editor-frio": (c) => cssContrast(cssBright(cssM(cssM(c, cssSat(0.9)), cssHue(-8)), 1.02), 1.05),
  "editor-contraste": (c) => cssM(cssContrast(c, 1.22), cssSat(1.2)),
  "editor-filme": (c) => cssM(cssM(cssContrast(c, 1.08), cssSat(0.82)), cssSepia(0.12)),
  "editor-pb": (c) => cssContrast(cssM(c, cssSat(0)), 1.15),
  // estilos VINCIT
  "teal-laranja": (c) => {
    c = hueShift(c, 30, 40, -4, 1.12); // pele mais laranja
    c = hueShift(c, 200, 70, -10, 1.1); // céu e sombras para o teal
    c = split(c, [0.36, 0.56, 0.62], 0.55, [0.66, 0.52, 0.4], 0.35);
    return sat(contrast(c, 0.28), 1.05);
  },
  "kodak-quente": (c) => {
    c = hueShift(c, 110, 50, -14, 0.85); // verdes puxam para o amarelo
    c = gain(c, 1.04, 1.0, 0.93);
    c = split(c, [0.5, 0.46, 0.42], 0.25, [0.62, 0.54, 0.44], 0.25);
    c = contrast(c, 0.16);
    return levels(sat(c, 0.95), 0.035, 0.975);
  },
  "fuji-verde": (c) => {
    c = hueShift(c, 110, 60, 14, 0.9); // verdes vão para o ciano
    c = hueShift(c, 25, 30, 3, 0.92);
    c = split(c, [0.42, 0.55, 0.52], 0.4, [0.55, 0.5, 0.48], 0.15);
    c = contrast(c, 0.14);
    return levels(sat(c, 0.86), 0.03, 0.985);
  },
  "bleach": (c) => { const g = bw(c, [0.3, 0.59, 0.11]); return contrast(mix(c, g, 0.55), 0.45); },
  "noir": (c) => contrast(bw(c, [0.5, 0.4, 0.1]), 0.7, 0.42),
  "pb-suave": (c) => levels(contrast(bw(c, [0.3, 0.55, 0.15]), 0.1), 0.06, 0.95),
  "matte": (c) => levels(sat(contrast(c, 0.1), 0.82), 0.09, 0.93),
  "dourado": (c) => {
    c = gain(c, 1.07, 1.01, 0.86);
    c = split(c, [0.52, 0.46, 0.44], 0.2, [0.7, 0.56, 0.34], 0.4);
    return sat(contrast(c, 0.12), 1.08);
  },
  "noite-azul": (c) => {
    c = gain(c, 0.86, 0.94, 1.1);
    c = split(c, [0.38, 0.46, 0.64], 0.6, [0.5, 0.52, 0.56], 0.2);
    return sat(contrast(levels(c, 0.01, 0.9), 0.22), 0.8);
  },
  "pastel": (c) => {
    c = levels(c, 0.1, 1);
    c = split(c, [0.55, 0.5, 0.52], 0.3, [0.55, 0.5, 0.5], 0.2);
    return sat(contrast(c, -0.12, 0.5), 0.78);
  },
  "vintage-70": (c) => {
    c = split(c, [0.5, 0.54, 0.4], 0.45, [0.66, 0.56, 0.42], 0.35);
    c = cssM(c, cssSepia(0.15));
    return levels(sat(contrast(c, 0.08), 0.85), 0.07, 0.93);
  },
  "comercial": (c) => vibrance(contrast(c, 0.1), 0.25),
  "natal": (c) => {
    c = hueShift(c, 0, 28, 0, 1.2); // vermelhos mais vivos
    c = hueShift(c, 120, 60, 8, 0.85);
    c = split(c, [0.44, 0.47, 0.5], 0.25, [0.68, 0.56, 0.38], 0.35);
    return sat(contrast(c, 0.22), 1.04);
  },
  "thriller": (c) => {
    c = split(c, [0.4, 0.56, 0.56], 0.55, [0.5, 0.56, 0.58], 0.3);
    c = hueShift(c, 30, 35, 6, 0.8);
    return sat(contrast(c, 0.3), 0.75);
  },
  // aproximações das LUTs de marca (prévia; o arquivo original é baixado no site de cada uma)
  "bmd-extended": (c) => levels(contrast(c, -0.14, 0.45), 0.02, 0.97),
  "canon-709": (c) => { c = hueShift(c, 15, 30, -4, 1.06); return sat(contrast(c, 0.12), 1.08); },
  "sony-s709": (c) => { c = gain(c, 1.015, 1, 0.985); return levels(sat(contrast(c, -0.04), 0.96), 0.015, 0.985); },
  "sony-709-800": (c) => sat(contrast(c, 0.22), 1.1),
  "sony-warm": (c) => { c = gain(c, 1.05, 1.0, 0.9); c = split(c, [0.52, 0.48, 0.45], 0.2, [0.62, 0.55, 0.42], 0.25); return sat(contrast(c, 0.08), 1.02); },
  "sony-cool": (c) => { c = gain(c, 0.94, 0.99, 1.06); c = split(c, [0.44, 0.5, 0.58], 0.3, [0.5, 0.52, 0.55], 0.15); return sat(contrast(c, 0.1), 0.95); },
  "sony-vintage": (c) => { c = split(c, [0.5, 0.52, 0.42], 0.35, [0.62, 0.56, 0.44], 0.3); return levels(sat(contrast(c, 0.05), 0.8), 0.06, 0.95); },
  "sony-teal": (c) => { c = hueShift(c, 30, 40, -3, 1.08); c = split(c, [0.38, 0.55, 0.6], 0.45, [0.64, 0.53, 0.42], 0.28); return contrast(c, 0.18); },
  "kodak-2383": (c) => {
    c = hueShift(c, 120, 60, 18, 0.85);
    c = split(c, [0.4, 0.53, 0.55], 0.45, [0.62, 0.54, 0.44], 0.3);
    return levels(sat(contrast(c, 0.38, 0.42), 0.92), 0.01, 0.96);
  },
  "kodak-portra": (c) => {
    c = hueShift(c, 25, 35, -3, 1.05);
    c = hueShift(c, 110, 60, -10, 0.75);
    c = gain(c, 1.03, 1.0, 0.95);
    return levels(sat(contrast(c, -0.06), 0.9), 0.04, 0.98);
  },
  "kodak-ektar": (c) => { c = hueShift(c, 0, 30, 0, 1.25); c = hueShift(c, 220, 50, -6, 1.15); return sat(contrast(c, 0.25), 1.18); },
  "kodak-gold": (c) => { c = gain(c, 1.05, 1.02, 0.86); c = split(c, [0.5, 0.48, 0.42], 0.2, [0.64, 0.57, 0.4], 0.3); return levels(sat(contrast(c, 0.1), 1.04), 0.04, 0.97); },
  "kodak-vision3": (c) => { c = gain(c, 1.02, 1, 0.97); return levels(sat(contrast(c, -0.1), 0.92), 0.05, 0.96); },
  "fuji-eterna": (c) => {
    c = hueShift(c, 110, 60, 12, 0.85);
    c = split(c, [0.42, 0.52, 0.56], 0.35, [0.53, 0.51, 0.49], 0.1);
    return levels(sat(contrast(c, -0.08), 0.78), 0.03, 0.97);
  },
  "fuji-3513": (c) => { c = hueShift(c, 110, 60, 14, 0.9); c = split(c, [0.42, 0.54, 0.52], 0.35, [0.56, 0.53, 0.48], 0.15); return sat(contrast(c, 0.32, 0.42), 0.95); },
  "fuji-velvia": (c) => { c = hueShift(c, 110, 60, 6, 1.25); c = hueShift(c, 220, 50, 0, 1.2); return sat(contrast(c, 0.3), 1.3); },
  "fuji-chrome": (c) => {
    c = hueShift(c, 0, 35, 6, 0.75);
    c = hueShift(c, 210, 50, -8, 0.85);
    c = split(c, [0.44, 0.5, 0.52], 0.25, [0.53, 0.51, 0.48], 0.1);
    return sat(contrast(c, 0.3, 0.42), 0.72);
  },
};

/* ---------- montar a LUT ---------- */
export type LutSpec = { log?: string; look?: string };
export const specKey = (s: LutSpec) => `${s.log || "-"}|${s.look || "-"}`;
export function colorAt(c: RGB, s: LutSpec): RGB {
  let o = s.log ? convertLog(c, s.log) : c;
  const f = s.look ? LOOK_FNS[s.look] : null;
  if (f) o = f(o);
  return [clamp(o[0]), clamp(o[1]), clamp(o[2])];
}
const lutCache = new Map<string, Float32Array>();
/** tabela N×N×N (vermelho varia mais rápido, como no .cube) */
export function buildLut(s: LutSpec, n = 33): Float32Array {
  const key = specKey(s) + n;
  const hit = lutCache.get(key);
  if (hit) return hit;
  const t = new Float32Array(n * n * n * 3);
  let i = 0;
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    const o = colorAt([r / (n - 1), g / (n - 1), b / (n - 1)], s);
    t[i++] = o[0]; t[i++] = o[1]; t[i++] = o[2];
  }
  lutCache.set(key, t);
  return t;
}
/** lê um .cube 3D qualquer (para testar uma LUT baixada de fora na prévia) */
export function parseCube(text: string): { n: number; data: Float32Array } | null {
  let n = 0; const vals: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    if (/^LUT_3D_SIZE/i.test(l)) { n = parseInt(l.split(/\s+/)[1]); continue; }
    if (/^[A-Z_]/i.test(l)) continue;
    const p = l.split(/\s+/).map(Number);
    if (p.length >= 3 && p.every((x) => !isNaN(x))) vals.push(p[0], p[1], p[2]);
  }
  if (!n || vals.length < n * n * n * 3) return null;
  return { n, data: Float32Array.from(vals.slice(0, n * n * n * 3)) };
}
/** aplica uma tabela num ImageData (trilinear), no próprio lugar */
export function applyTable(img: ImageData, t: Float32Array, n: number) {
  const d = img.data, s = n - 1, n2 = n * n;
  for (let i = 0; i < d.length; i += 4) {
    const r = (d[i] / 255) * s, g = (d[i + 1] / 255) * s, b = (d[i + 2] / 255) * s;
    const r0 = Math.min(r | 0, s - 1), g0 = Math.min(g | 0, s - 1), b0 = Math.min(b | 0, s - 1);
    const fr = r - r0, fg = g - g0, fb = b - b0;
    for (let ch = 0; ch < 3; ch++) {
      const at = (rr: number, gg: number, bb: number) => t[(bb * n2 + gg * n + rr) * 3 + ch];
      const c00 = lerp(at(r0, g0, b0), at(r0 + 1, g0, b0), fr), c10 = lerp(at(r0, g0 + 1, b0), at(r0 + 1, g0 + 1, b0), fr);
      const c01 = lerp(at(r0, g0, b0 + 1), at(r0 + 1, g0, b0 + 1), fr), c11 = lerp(at(r0, g0 + 1, b0 + 1), at(r0 + 1, g0 + 1, b0 + 1), fr);
      d[i + ch] = clamp(lerp(lerp(c00, c10, fg), lerp(c01, c11, fg), fb)) * 255 + 0.5;
    }
  }
}
/** a prévia simula o quadro em log a partir de uma foto comum (tabela 33 do caminho inverso) */
export function buildToLog(profile: string, n = 33): Float32Array {
  const key = "inv" + profile + n;
  const hit = lutCache.get(key);
  if (hit) return hit;
  const t = new Float32Array(n * n * n * 3);
  let i = 0;
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    const o = toLog([r / (n - 1), g / (n - 1), b / (n - 1)], profile);
    t[i++] = o[0]; t[i++] = o[1]; t[i++] = o[2];
  }
  lutCache.set(key, t);
  return t;
}
