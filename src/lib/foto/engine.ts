/* Motor do editor de fotos do Audiovisual (28/11). Tudo roda no navegador (canvas), sem custo.
   A edição final = correção automática (lida da própria foto) + estilo × intensidade + ajustes finos.
   A parte de cor é uma função pura de (r,g,b), então o mesmo look sai como LUT .cube para o
   Lightroom, o Premiere e a biblioteca de LUTs do Audiovisual. */

export type Ajustes = {
  exposicao: number;   // -100..100 (±1 ponto de luz)
  contraste: number;   // -100..100
  realces: number;     // -100..100
  sombras: number;     // -100..100
  brancos: number;     // -100..100
  pretos: number;      // -100..100
  temperatura: number; // -100..100 (azul ↔ amarelo)
  matiz: number;       // -100..100 (verde ↔ magenta)
  saturacao: number;   // -100..100
  vibracao: number;    // -100..100
  desbotar: number;    // 0..100 (preto lavado, cara de filme)
  tomSombras: number;  // matiz 0..360 das sombras (tom dividido)
  forcaSombras: number;// 0..100
  tomRealces: number;  // matiz 0..360 dos realces
  forcaRealces: number;// 0..100
  pb: number;          // 0..100 (preto e branco)
  vermelhos: number;   // -100..100 (só os vermelhos e laranjas)
  nitidez: number;     // 0..100
  vinheta: number;     // -100..100 (negativo escurece as bordas)
  granulado: number;   // 0..100
};

export const ZERO: Ajustes = {
  exposicao: 0, contraste: 0, realces: 0, sombras: 0, brancos: 0, pretos: 0, temperatura: 0, matiz: 0, saturacao: 0, vibracao: 0,
  desbotar: 0, tomSombras: 0, forcaSombras: 0, tomRealces: 0, forcaRealces: 0, pb: 0, vermelhos: 0, nitidez: 0, vinheta: 0, granulado: 0,
};

/** controles mostrados na tela, em grupos (os de matiz 0..360 ficam fora: aparecem junto da força do tom) */
export const CONTROLES: { grupo: string; itens: { k: keyof Ajustes; nome: string; min: number; max: number }[] }[] = [
  { grupo: "Luz", itens: [
    { k: "exposicao", nome: "Luz", min: -100, max: 100 },
    { k: "contraste", nome: "Contraste", min: -100, max: 100 },
    { k: "realces", nome: "Realces", min: -100, max: 100 },
    { k: "sombras", nome: "Sombras", min: -100, max: 100 },
    { k: "brancos", nome: "Brancos", min: -100, max: 100 },
    { k: "pretos", nome: "Pretos", min: -100, max: 100 },
  ] },
  { grupo: "Cor", itens: [
    { k: "temperatura", nome: "Temperatura", min: -100, max: 100 },
    { k: "matiz", nome: "Verde ↔ magenta", min: -100, max: 100 },
    { k: "saturacao", nome: "Saturação", min: -100, max: 100 },
    { k: "vibracao", nome: "Vibração", min: -100, max: 100 },
    { k: "vermelhos", nome: "Vermelhos", min: -100, max: 100 },
    { k: "pb", nome: "Preto e branco", min: 0, max: 100 },
  ] },
  { grupo: "Efeitos", itens: [
    { k: "desbotar", nome: "Desbotar", min: 0, max: 100 },
    { k: "nitidez", nome: "Nitidez", min: 0, max: 100 },
    { k: "vinheta", nome: "Vinheta", min: -100, max: 100 },
    { k: "granulado", nome: "Granulado", min: 0, max: 100 },
    { k: "forcaSombras", nome: "Tom nas sombras", min: 0, max: 100 },
    { k: "forcaRealces", nome: "Tom nos realces", min: 0, max: 100 },
  ] },
];

export type Estilo = { id: string; nome: string; desc: string; ajustes: Partial<Ajustes>; mexeCor?: boolean };

/** catálogo base. Os nomes seguem os looks do Audiovisual para casar com a biblioteca de LUTs. */
export const ESTILOS: Estilo[] = [
  { id: "natural", nome: "Natural", desc: "Só a correção: branco neutro, luz e contraste no lugar.", ajustes: {} },
  { id: "catalogo", nome: "Catálogo limpo", desc: "Cor fiel da peça, fundo claro e neutro. Para loja e e-commerce.", ajustes: { exposicao: 10, contraste: 8, realces: -20, sombras: 15, temperatura: -4, vibracao: 8, nitidez: 25 } },
  { id: "editorial", nome: "Editorial quente", desc: "Tom de revista: quente, suave, cores contidas.", ajustes: { exposicao: 4, contraste: -10, realces: -25, sombras: 12, temperatura: 18, matiz: 4, saturacao: -14, vibracao: 10, desbotar: 12, tomRealces: 38, forcaRealces: 18, tomSombras: 25, forcaSombras: 10 } },
  { id: "filme", nome: "Filme 35mm", desc: "Pretos lavados, sombras frias, realces quentes e grão.", ajustes: { contraste: 10, realces: -15, saturacao: -20, vibracao: 6, temperatura: 8, desbotar: 22, tomSombras: 190, forcaSombras: 28, tomRealces: 35, forcaRealces: 26, granulado: 22, vinheta: -15 }, mexeCor: true },
  { id: "natal", nome: "Natal", desc: "Dourado e quente, vermelhos ricos, bordas suaves.", ajustes: { contraste: 14, realces: -12, temperatura: 14, matiz: 3, saturacao: 6, vibracao: 14, vermelhos: 22, tomRealces: 42, forcaRealces: 24, vinheta: -30 }, mexeCor: true },
  { id: "frio", nome: "Frio moderno", desc: "Azulado e limpo, contraste firme. Tecnologia, verão, arquitetura.", ajustes: { contraste: 16, realces: -18, sombras: 6, temperatura: -22, matiz: -2, saturacao: -6, vibracao: 12, tomSombras: 210, forcaSombras: 18, nitidez: 20 }, mexeCor: true },
  { id: "vivo", nome: "Vivo", desc: "Cores fortes e contraste alto para chamar atenção no feed.", ajustes: { contraste: 22, sombras: 10, saturacao: 14, vibracao: 28, nitidez: 25 } },
  { id: "pb", nome: "P&B editorial", desc: "Preto e branco com contraste e um pouco de grão.", ajustes: { pb: 100, contraste: 22, realces: -10, sombras: 6, desbotar: 6, granulado: 14, vinheta: -18 } },
];

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const c255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** soma correção + estilo × intensidade + ajustes finos */
export function combinar(auto: Partial<Ajustes> | null, estilo: Partial<Ajustes> | null, intensidade: number, finos: Partial<Ajustes>): Ajustes {
  const out: Ajustes = { ...ZERO };
  const t = intensidade / 100;
  for (const k of Object.keys(ZERO) as (keyof Ajustes)[]) {
    if (k === "tomSombras" || k === "tomRealces") { out[k] = finos[k] ?? estilo?.[k] ?? 0; continue; }
    out[k] = (auto?.[k] ?? 0) + (estilo?.[k] ?? 0) * t + (finos[k] ?? 0);
  }
  return out;
}

export type Analise = { mediaR: number; mediaG: number; mediaB: number; mediana: number; p1: number; p99: number; desvio: number; saturacaoMedia: number; luzMedia: number };

/** lê a foto: cor média dos meios-tons, níveis e contraste */
export function analisar(d: Uint8ClampedArray): Analise {
  let r = 0, g = 0, b = 0, n = 0, sat = 0, tot = 0, s1 = 0, s2 = 0;
  const hist = new Uint32Array(256);
  const passo = Math.max(4, Math.floor(d.length / 4 / 60000) * 4);
  for (let i = 0; i < d.length; i += passo) {
    const R = d[i], G = d[i + 1], B = d[i + 2];
    const L = R * 0.299 + G * 0.587 + B * 0.114;
    hist[L | 0]++; tot++; s1 += L; s2 += L * L;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    sat += mx ? (mx - mn) / mx : 0;
    if (L > 40 && L < 225 && mx - mn < 90) { r += R; g += G; b += B; n++; }
  }
  const pct = (p: number) => { let c = 0; for (let k = 0; k < 256; k++) { c += hist[k]; if (c >= tot * p) return k; } return 255; };
  const media = s1 / tot;
  return { mediaR: n ? r / n : 128, mediaG: n ? g / n : 128, mediaB: n ? b / n : 128, mediana: pct(0.5), p1: pct(0.01), p99: pct(0.99), desvio: Math.sqrt(Math.max(0, s2 / tot - media * media)), saturacaoMedia: sat / tot, luzMedia: media };
}

/** correção automática, já nos mesmos controles que a pessoa mexe */
export function autoCorrecao(a: Analise): Partial<Ajustes> {
  const m = (a.mediaR + a.mediaG + a.mediaB) / 3;
  const gr = m / a.mediaR, gb = m / a.mediaB, gg = m / a.mediaG;
  // corrige ~60% do desvio: tirar todo o tom da luz deixa a foto fria e sem clima
  const temperatura = clamp((((gr - 1) - (gb - 1)) / 2 / 0.004) * 0.6, -35, 35);
  const matiz = clamp((-((gg - 1) - ((gr - 1) + (gb - 1)) / 2) / 0.004) * 0.5, -20, 20);
  const exposicao = clamp(Math.log2(118 / Math.max(20, a.mediana)) * 40, -35, 35);
  const pretos = -clamp((a.p1 - 3) / 0.6, 0, 25);
  const brancos = clamp((250 - a.p99) / 0.6, 0, 25);
  const r = (v: number) => Math.round(v);
  return { temperatura: r(temperatura), matiz: r(matiz), exposicao: r(exposicao), pretos: r(pretos), brancos: r(brancos) };
}

/** look de uma foto de referência: compara a referência (já corrigida) com a foto e devolve o estilo que leva uma à outra */
export function estiloDaReferencia(ref: Analise, foto: Analise): Partial<Ajustes> {
  const quente = (x: Analise) => ((x.mediaR - x.mediaB) / Math.max(1, (x.mediaR + x.mediaG + x.mediaB) / 3)) * 100;
  const verde = (x: Analise) => ((x.mediaG - (x.mediaR + x.mediaB) / 2) / Math.max(1, (x.mediaR + x.mediaG + x.mediaB) / 3)) * 100;
  const r = (v: number) => Math.round(v);
  return {
    temperatura: r(clamp((quente(ref) - quente(foto)) * 1.6, -60, 60)),
    matiz: r(clamp(-(verde(ref) - verde(foto)) * 1.6, -40, 40)),
    exposicao: r(clamp(Math.log2(Math.max(20, ref.mediana) / Math.max(20, foto.mediana)) * 55, -50, 50)),
    contraste: r(clamp((ref.desvio / Math.max(10, foto.desvio) - 1) * 90, -50, 50)),
    saturacao: r(clamp((ref.saturacaoMedia / Math.max(0.03, foto.saturacaoMedia) - 1) * 80, -80, 50)),
    desbotar: r(clamp((ref.p1 - foto.p1) * 2.2, 0, 50)),
    pb: ref.saturacaoMedia < 0.04 ? 100 : 0,
  };
}

function hueRgb(h: number): [number, number, number] {
  const f = (n: number) => { const k = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0) - 0.5, f(8) - 0.5, f(4) - 0.5];
}

/** a parte de cor como função de (r,g,b) 0..255. Mesma função gera a prévia, a exportação e o .cube */
export function preparaCor(a: Ajustes) {
  const ganhoR = 1 + a.temperatura * 0.004 + a.matiz * 0.0015;
  const ganhoG = 1 - a.matiz * 0.004;
  const ganhoB = 1 - a.temperatura * 0.004 + a.matiz * 0.0015;
  const exp = Math.pow(2, a.exposicao / 100);
  const lo = -a.pretos * 0.45, hi = 255 - a.brancos * 0.45;
  const esc = 255 / Math.max(40, hi - lo);
  const con = a.contraste / 100;
  const sat = a.saturacao / 100, vib = a.vibracao / 100, ver = a.vermelhos / 100;
  const pb = a.pb / 100, fade = a.desbotar * 0.35;
  const ts = hueRgb(a.tomSombras), tr = hueRgb(a.tomRealces);
  const fs = a.forcaSombras * 0.5, fr = a.forcaRealces * 0.5;
  const sh = a.sombras / 100, hl = a.realces / 100;
  return (R: number, G: number, B: number): [number, number, number] => {
    let r = (R * ganhoR - lo) * esc * exp, g = (G * ganhoG - lo) * esc * exp, b = (B * ganhoB - lo) * esc * exp;
    // realces e sombras: mexe na luz e mantém a cor
    let L = r * 0.299 + g * 0.587 + b * 0.114;
    const l = clamp(L / 255, 0, 1);
    const L2 = L + 255 * 0.35 * (sh * (1 - l) * (1 - l) * l * 4 + hl * l * l * (1 - l) * 4);
    if (L > 0.5) { const k = L2 / L; r *= k; g *= k; b *= k; } else { r += L2 - L; g += L2 - L; b += L2 - L; }
    // contraste em curva S suave
    if (con) {
      const s = (v: number) => { const x = clamp(v / 255, 0, 1); const y = con > 0 ? x + con * 0.9 * (x - 0.5) * (1 - Math.abs(2 * x - 1)) * 1.6 + con * 0.15 * (x - 0.5) : 0.5 + (x - 0.5) * (1 + con * 0.6); return y * 255; };
      r = s(r); g = s(g); b = s(b);
    }
    L = r * 0.299 + g * 0.587 + b * 0.114;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const cs = clamp((mx - mn) / 255, 0, 1);
    let k = 1 + sat + vib * (1 - cs) * (1 - cs);
    if (ver && r > g * 1.15 && r > b * 1.15) k *= 1 + ver * clamp((r - Math.max(g, b)) / 80, 0, 1);
    k = Math.max(0, k) * (1 - pb);
    r = L + (r - L) * k; g = L + (g - L) * k; b = L + (b - L) * k;
    // tom dividido
    if (fs || fr) {
      const ll = clamp(L / 255, 0, 1), ws = (1 - ll) * (1 - ll), wr = ll * ll;
      r += ts[0] * fs * ws + tr[0] * fr * wr; g += ts[1] * fs * ws + tr[1] * fr * wr; b += ts[2] * fs * ws + tr[2] * fr * wr;
    }
    if (fade) { const f = 1 - fade / 255; r = fade + r * f; g = fade + g * f; b = fade + b * f; }
    return [c255(r), c255(g), c255(b)];
  };
}

/** aplica a edição inteira num ImageData (no lugar). manterCor guarda a cor das peças saturadas da foto original. */
export function aplicar(img: ImageData, a: Ajustes, opts: { manterCor?: boolean; semente?: number } = {}) {
  const { width: W, height: H, data: d } = img;
  const cor = preparaCor(a);
  const cx = W / 2, cy = H / 2, md = Math.hypot(cx, cy);
  const vin = a.vinheta / 100, gr = a.granulado * 0.35;
  let seed = opts.semente ?? 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const R = d[i], G = d[i + 1], B = d[i + 2];
      let [r, g, b] = cor(R, G, B);
      if (opts.manterCor && a.pb < 50) {
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        const s0 = mx ? (mx - mn) / mx : 0;
        const w = clamp((s0 - 0.22) / 0.25, 0, 1);
        if (w > 0) {
          const L0 = R * 0.299 + G * 0.587 + B * 0.114 || 1, L1 = r * 0.299 + g * 0.587 + b * 0.114;
          const k = L1 / L0;
          r = r * (1 - w) + R * k * w; g = g * (1 - w) + G * k * w; b = b * (1 - w) + B * k * w;
        }
      }
      if (vin) { const dd = Math.hypot(x - cx, y - cy) / md; const f = 1 + vin * 0.8 * Math.pow(dd, 2.4); r *= f; g *= f; b *= f; }
      if (gr) { const n = (rnd() - 0.5) * gr; r += n; g += n; b += n; }
      d[i] = c255(r); d[i + 1] = c255(g); d[i + 2] = c255(b);
    }
  }
  if (a.nitidez > 0) nitidez(img, a.nitidez / 100);
}

function nitidez(img: ImageData, q: number) {
  const { width: W, height: H, data: d } = img;
  const src = new Uint8ClampedArray(d);
  const k = q * 0.9;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) {
      const v = src[i + c], viz = (src[i - 4 + c] + src[i + 4 + c] + src[i - W * 4 + c] + src[i + W * 4 + c]) / 4;
      d[i + c] = c255(v + (v - viz) * k);
    }
  }
}

/** LUT .cube (33³) da parte de cor, para Lightroom, Photoshop, Premiere e a biblioteca de LUTs */
export function gerarCube(a: Ajustes, titulo: string, n = 33) {
  const cor = preparaCor({ ...a, vinheta: 0, granulado: 0, nitidez: 0 });
  const linhas = [`TITLE "${titulo.replace(/"/g, "'")}"`, "# VINCIT HUB · editor de fotos", `LUT_3D_SIZE ${n}`, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0"];
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    const [R, G, B] = cor((r / (n - 1)) * 255, (g / (n - 1)) * 255, (b / (n - 1)) * 255);
    linhas.push(`${(R / 255).toFixed(5)} ${(G / 255).toFixed(5)} ${(B / 255).toFixed(5)}`);
  }
  return linhas.join("\n") + "\n";
}

/** desenha a imagem numa tela de até `max` px no lado maior e devolve o ImageData original */
export function lerImagem(img: HTMLImageElement | ImageBitmap, max: number) {
  const w0 = "naturalWidth" in img ? img.naturalWidth : img.width, h0 = "naturalHeight" in img ? img.naturalHeight : img.height;
  const s = Math.min(1, max / Math.max(w0, h0));
  const W = Math.max(1, Math.round(w0 * s)), H = Math.max(1, Math.round(h0 * s));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img as any, 0, 0, W, H);
  return x.getImageData(0, 0, W, H);
}

/** limpa o que veio do Claude: só números nos campos conhecidos, dentro da faixa */
export function limparAjustes(x: any): Partial<Ajustes> {
  const out: Partial<Ajustes> = {};
  if (!x || typeof x !== "object") return out;
  for (const k of Object.keys(ZERO) as (keyof Ajustes)[]) {
    const v = Number(x[k]);
    if (!Number.isFinite(v)) continue;
    out[k] = k === "tomSombras" || k === "tomRealces" ? clamp(Math.round(v), 0, 360) : clamp(Math.round(v), -100, 100);
  }
  return out;
}
