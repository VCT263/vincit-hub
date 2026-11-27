/** Seção Design: criação de marca (briefing → referências → logo → cores → tipografia → manual) e peças (carrossel e estático). */

export type Kind = "marca" | "carrossel" | "peca";
export type Step = "briefing" | "referencias" | "logo" | "cores" | "tipografia" | "manual";

export const STEPS: { k: Step; l: string; d: string; dica: string }[] = [
  { k: "briefing", l: "Briefing", d: "Quem é a marca, para quem fala e como quer ser vista.", dica: "Um bom briefing responde: o que vende, para quem, contra quem, e que sensação a marca deixa. Sem isso, a logo vira gosto pessoal." },
  { k: "referencias", l: "Referências", d: "Moodboard com o que inspira e o que evitar.", dica: "Os melhores cases do Behance começam pela pesquisa: concorrentes, referências fora do nicho e um moodboard que mostra a direção antes de desenhar." },
  { k: "logo", l: "Logo", d: "Protótipos de símbolo e logotipo, lado a lado.", dica: "Explore largo antes de refinar: 3 ou mais caminhos diferentes (tipográfico, símbolo, monograma). Teste em tamanho pequeno e em uma cor só." },
  { k: "cores", l: "Cores", d: "Paleta com papéis: primária, apoio, destaque e fundos.", dica: "Defina papéis, não só cores bonitas. Uma primária forte, uma de apoio, um destaque e dois neutros resolvem quase tudo. Confira o contraste do texto." },
  { k: "tipografia", l: "Tipografia", d: "Fonte de título e de texto que combinam.", dica: "Duas famílias bastam: uma com personalidade para títulos e uma neutra para leitura. Todas aqui são do Google Fonts, grátis para uso comercial." },
  { k: "manual", l: "Manual", d: "Tudo junto num manual pronto para PDF e Canva.", dica: "O manual mostra o uso certo e o errado: versões da logo, área de proteção, cores com códigos, hierarquia de texto e aplicações reais." },
];

/* ───────────── Briefing de marca ───────────── */
export type BF = { k: string; l: string; type?: "text" | "textarea" | "chips" | "multi"; options?: string[]; ph?: string };
export const BRIEF: { k: string; l: string; fields: BF[] }[] = [
  { k: "essencia", l: "Essência", fields: [
    { k: "nome", l: "Nome da marca", ph: "Ex.: ISYS" },
    { k: "slogan", l: "Assinatura ou slogan (se tiver)", ph: "Ex.: moda que acompanha você" },
    { k: "oque", l: "O que a marca faz ou vende", type: "textarea", ph: "Ex.: loja de moda feminina com atendimento próximo e peças selecionadas." },
    { k: "proposito", l: "Por que ela existe (além de vender)", type: "textarea", ph: "Ex.: fazer a cliente se sentir bem vestida sem complicação." },
    { k: "valores", l: "Valores", type: "chips", ph: "Digite e aperte Enter" },
  ] },
  { k: "publico", l: "Público e mercado", fields: [
    { k: "publico", l: "Para quem é", type: "textarea", ph: "Ex.: mulheres de 25 a 45 anos, classe B, que compram pelo Instagram e na loja." },
    { k: "concorrentes", l: "Concorrentes", type: "chips", ph: "Nome ou @perfil" },
    { k: "diferencial", l: "Diferencial", type: "textarea", ph: "O que só ela tem ou faz." },
  ] },
  { k: "visual", l: "Direção visual", fields: [
    { k: "palavras", l: "3 a 5 palavras que a marca precisa transmitir", type: "chips", ph: "Ex.: leve, confiante, feminina" },
    { k: "estilo", l: "Tipo de logo que imagina", type: "multi", options: ["Só o nome (logotipo)", "Símbolo + nome", "Monograma (iniciais)", "Emblema / selo", "Mascote", "Aberto a sugestões"] },
    { k: "cores_gosta", l: "Cores que gosta ou já usa", type: "chips", ph: "Ex.: verde-oliva, off-white" },
    { k: "cores_evita", l: "Cores e elementos a evitar", type: "chips", ph: "Ex.: vermelho, clip-art, gradiente" },
    { k: "aplicacoes", l: "Onde a marca vai aparecer", type: "multi", options: ["Instagram", "Site / loja online", "Embalagem / sacola", "Etiqueta", "Fachada", "Cartão de visita", "Uniforme", "Vídeo"] },
  ] },
];

/** eixos de personalidade (0 = esquerda, 100 = direita) */
export const AXES: [string, string, string][] = [
  ["classica", "Clássica", "Moderna"],
  ["seria", "Séria", "Divertida"],
  ["acessivel", "Acessível", "Premium"],
  ["discreta", "Discreta", "Ousada"],
  ["simples", "Minimalista", "Detalhada"],
  ["racional", "Racional", "Emocional"],
];

export function briefText(b: any = {}) {
  const lines: string[] = [];
  for (const sec of BRIEF) for (const f of sec.fields) {
    const v = b[f.k];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    lines.push(`- ${f.l}: ${Array.isArray(v) ? v.join(", ") : v}`);
  }
  const ax = b.eixos || {};
  const pers = AXES.filter(([k]) => ax[k] != null).map(([k, a, z]) => { const v = ax[k]; return v < 40 ? a : v > 60 ? z : `entre ${a.toLowerCase()} e ${z.toLowerCase()}`; });
  if (pers.length) lines.push(`- Personalidade: ${pers.join(", ")}`);
  return lines.join("\n");
}

/* ───────────── Cores ───────────── */
export type Swatch = { hex: string; role: string; name?: string; locked?: boolean };
export const ROLES = ["Primária", "Apoio", "Destaque", "Escuro", "Claro"];

export const hexToRgb = (h: string) => { const x = h.replace("#", ""); const n = parseInt(x.length === 3 ? x.split("").map((c) => c + c).join("") : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgbToHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export function hexToHsl(h: string): [number, number, number] {
  let [r, g, b] = hexToRgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
  return [hh, s * 100, l * 100];
}
export function hslToHex(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
function lum(h: string) { const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
export const readableOn = (bg: string) => (contrast(bg, "#ffffff") >= contrast(bg, "#111111") ? "#ffffff" : "#111111");
export function cmyk(h: string) { const [r, g, b] = hexToRgb(h).map((v) => v / 255); const k = 1 - Math.max(r, g, b); if (k >= 1) return [0, 0, 0, 100]; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100)); }

export const HARMONIES = [
  { k: "analoga", l: "Análoga", d: "vizinhas no círculo, calma e coesa" },
  { k: "complementar", l: "Complementar", d: "opostas, contraste e energia" },
  { k: "triade", l: "Tríade", d: "três pontos, viva e equilibrada" },
  { k: "mono", l: "Monocromática", d: "um tom só, elegante e sóbria" },
];

/** gera uma paleta com papéis a partir da cor base; mantém as travadas */
export function harmony(base: string, kind: string, prev: Swatch[] = [], jitter = 0): Swatch[] {
  const [h, s0, l0] = hexToHsl(base);
  const s = Math.max(35, Math.min(85, s0)), j = (n: number) => n + (Math.random() - .5) * jitter;
  const off = kind === "analoga" ? [30, -30] : kind === "complementar" ? [180, 160] : kind === "triade" ? [120, 240] : [0, 0];
  const apoio = kind === "mono" ? hslToHex(h, s * .6, Math.min(80, l0 + 22)) : hslToHex(j(h + off[0]), j(s * .8), j(Math.max(35, Math.min(60, l0))));
  const dest = kind === "mono" ? hslToHex(h, Math.min(95, s + 15), Math.max(30, l0 - 15)) : hslToHex(j(h + off[1]), j(Math.min(95, s + 10)), j(55));
  const next: Swatch[] = [
    { role: "Primária", hex: base },
    { role: "Apoio", hex: apoio },
    { role: "Destaque", hex: dest },
    { role: "Escuro", hex: hslToHex(h, Math.min(25, s * .3), j(10)) },
    { role: "Claro", hex: hslToHex(h, Math.min(30, s * .35), j(96)) },
  ];
  return next.map((sw, i) => (prev[i]?.locked ? prev[i] : sw));
}

export const randomBase = () => hslToHex(Math.random() * 360, 45 + Math.random() * 40, 38 + Math.random() * 22);

/** cores dominantes de uma imagem (k-means simples) */
export async function extractColors(src: string, k = 5): Promise<string[]> {
  const img = await loadImg(src);
  const c = document.createElement("canvas"); const w = 80, hh = Math.max(1, Math.round((img.height / img.width) * 80));
  c.width = w; c.height = hh; const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, w, hh);
  const d = ctx.getImageData(0, 0, w, hh).data; const px: number[][] = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  let cs = Array.from({ length: k }, (_, i) => px[Math.floor((i + .5) * px.length / k)] || [0, 0, 0]);
  for (let it = 0; it < 8; it++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    for (const p of px) { let bi = 0, bd = 1e9; cs.forEach((c2, ci) => { const dd = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2; if (dd < bd) { bd = dd; bi = ci; } }); const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
    cs = sum.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cs[i]));
  }
  return cs.map((c2) => rgbToHex(c2[0], c2[1], c2[2]));
}

/* ───────────── Tipografia (Google Fonts, licença OFL: grátis para uso comercial) ───────────── */
export type Pair = { k: string; l: string; d: string; title: string; body: string; tw?: number };
export const PAIRS: Pair[] = [
  { k: "direta", l: "Moderna e direta", d: "grotesca com personalidade + leitura limpa", title: "Bricolage Grotesque", body: "Inter", tw: 800 },
  { k: "elegante", l: "Elegante", d: "serifa de alto contraste para moda e premium", title: "Playfair Display", body: "Source Sans 3", tw: 700 },
  { k: "editorial", l: "Editorial", d: "revista, sofisticada e calorosa", title: "DM Serif Display", body: "DM Sans", tw: 400 },
  { k: "tech", l: "Tecnológica", d: "geométrica, precisa, startup", title: "Space Grotesk", body: "IBM Plex Sans", tw: 700 },
  { k: "humana", l: "Humana", d: "serifa suave e próxima", title: "Fraunces", body: "Work Sans", tw: 700 },
  { k: "forte", l: "Forte", d: "peso e impacto para varejo e esporte", title: "Archivo Black", body: "Archivo", tw: 400 },
  { k: "classica", l: "Clássica", d: "tradição, advocacia, joalheria", title: "Cormorant Garamond", body: "Lato", tw: 700 },
  { k: "geometrica", l: "Geométrica", d: "amigável e redonda", title: "Poppins", body: "DM Sans", tw: 700 },
  { k: "arrojada", l: "Arrojada", d: "criativa, agência, cultura", title: "Syne", body: "Manrope", tw: 800 },
  { k: "minimal", l: "Minimal", d: "silenciosa, deixa o produto falar", title: "Outfit", body: "Inter", tw: 600 },
  { k: "manuscrita", l: "Feita à mão", d: "artesanal, doce, confeitaria", title: "Caveat", body: "Nunito", tw: 700 },
  { k: "condensada", l: "Condensada", d: "pôster, moda urbana, eventos", title: "Bebas Neue", body: "Barlow", tw: 400 },
];
export const ALL_FONTS = Array.from(new Set(PAIRS.flatMap((p) => [p.title, p.body])));

const loaded = new Map<string, Promise<void>>();
/** carrega famílias do Google Fonts na página (para mostrar e para desenhar no canvas) */
export function loadFonts(families: string[]) {
  if (typeof document === "undefined") return Promise.resolve();
  const fams = families.filter(Boolean);
  const need = fams.filter((f) => !loaded.has(f));
  if (need.length) {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?${need.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700;800`).join("&")}&display=swap`;
    const css = new Promise<void>((r) => { l.onload = () => r(); l.onerror = () => r(); setTimeout(r, 8000); });
    document.head.appendChild(l);
    for (const f of need) loaded.set(f, css.then(() => Promise.all(["400", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px "${f}"`)))).then(() => {}, () => {}));
  }
  return Promise.all(fams.map((f) => loaded.get(f))).then(() => {});
}

/** embute as fontes usadas no SVG (para baixar ou desenhar em imagem sem depender do computador) */
export async function svgWithFonts(svg: string, families: string[]) {
  let css = "";
  for (const f of families.filter(Boolean)) {
    try {
      const r = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700;800&display=swap`);
      const text = await r.text();
      const blocks = text.split("@font-face").slice(1).filter((b) => b.includes("U+0000-00FF") || !b.includes("unicode-range"));
      for (const b of blocks) {
        const url = b.match(/url\((https:[^)]+)\)/)?.[1]; const w = b.match(/font-weight:\s*(\d+)/)?.[1] || "400";
        if (!url) continue;
        const buf = await (await fetch(url)).arrayBuffer();
        let bin = ""; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        css += `@font-face{font-family:'${f}';font-weight:${w};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
      }
    } catch {}
  }
  if (!css) return svg;
  return svg.replace(/<svg([^>]*)>/, `<svg$1><defs><style>${css}</style></defs>`);
}

/* ───────────── Logo ───────────── */
export type Logo = { id: string; name: string; svg?: string; img?: string; note?: string; fav?: boolean; source?: "claude" | "construtor" | "upload" };

/** limpa SVG vindo do Claude ou de arquivo: sem scripts, eventos, foreignObject nem links externos */
export function sanitizeSvg(raw: string) {
  if (typeof window === "undefined") return "";
  const m = raw.match(/<svg[\s\S]*<\/svg>/i); if (!m) return "";
  const doc = new DOMParser().parseFromString(m[0], "image/svg+xml");
  const svg = doc.documentElement; if (svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return "";
  doc.querySelectorAll("script,foreignObject,iframe,image,use[href^='http'],a,animate,set").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
      if (n.startsWith("on") || ((n === "href" || n === "xlink:href") && !v.startsWith("#")) || v.startsWith("javascript:")) el.removeAttribute(a.name);
    }
  });
  if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(svg);
}

export const SYMBOLS = ["nenhum", "circulo", "quadrado", "losango", "arco", "folha", "barra"] as const;
export type Builder = { text: string; sub?: string; font: string; weight: number; spacing: number; upper: boolean; symbol: (typeof SYMBOLS)[number]; initial?: string; layout: "lado" | "cima"; color: string; accent: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
/** construtor rápido: logotipo + símbolo geométrico em SVG */
export function buildLogo(b: Builder) {
  const t = b.upper ? b.text.toUpperCase() : b.text;
  const ini = esc((b.initial || b.text.trim()[0] || "A").toUpperCase());
  const S = 120; const sym = (x: number, y: number) => {
    const c = b.accent, on = readableOn(c);
    const letter = `<text x="${x + S / 2}" y="${y + S / 2}" dy=".35em" text-anchor="middle" font-family="${b.font}" font-weight="${b.weight}" font-size="${S * .52}" fill="${on}">${ini}</text>`;
    switch (b.symbol) {
      case "circulo": return `<circle cx="${x + S / 2}" cy="${y + S / 2}" r="${S / 2}" fill="${c}"/>${letter}`;
      case "quadrado": return `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${S * .22}" fill="${c}"/>${letter}`;
      case "losango": return `<rect x="${x + S * .15}" y="${y + S * .15}" width="${S * .7}" height="${S * .7}" fill="${c}" transform="rotate(45 ${x + S / 2} ${y + S / 2})"/>${letter.replace(`font-size="${S * .52}"`, `font-size="${S * .4}"`)}`;
      case "arco": return `<path d="M${x} ${y + S} A${S / 2} ${S / 2} 0 0 1 ${x + S} ${y + S} Z" fill="${c}"/><circle cx="${x + S / 2}" cy="${y + S * .32}" r="${S * .18}" fill="${b.color}"/>`;
      case "folha": return `<path d="M${x + S / 2} ${y} C${x + S} ${y + S * .3} ${x + S} ${y + S * .7} ${x + S / 2} ${y + S} C${x} ${y + S * .7} ${x} ${y + S * .3} ${x + S / 2} ${y} Z" fill="${c}"/><path d="M${x + S / 2} ${y + S * .15} V${y + S * .9}" stroke="${on}" stroke-width="${S * .05}"/>`;
      case "barra": return `<rect x="${x}" y="${y}" width="${S * .28}" height="${S}" rx="${S * .06}" fill="${c}"/><rect x="${x + S * .38}" y="${y + S * .3}" width="${S * .28}" height="${S * .7}" rx="${S * .06}" fill="${c}" opacity=".7"/><rect x="${x + S * .76}" y="${y + S * .55}" width="${S * .24}" height="${S * .45}" rx="${S * .06}" fill="${c}" opacity=".45"/>`;
      default: return "";
    }
  };
  const hasSym = b.symbol !== "nenhum";
  const fs = 96, sub = b.sub ? esc(b.upper ? b.sub.toUpperCase() : b.sub) : "";
  const tw = Math.max(Math.max(1, t.length) * fs * .62 + Math.max(0, t.length - 1) * b.spacing * fs / 100, sub.length * (30 * .55 + 6));
  if (b.layout === "cima" && hasSym) {
    const W = Math.max(tw, S) + 80, H = S + fs + (sub ? 60 : 0) + 90;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${sym(W / 2 - S / 2, 30)}<text x="${W / 2}" y="${S + 30 + fs * .95}" text-anchor="middle" font-family="${b.font}" font-weight="${b.weight}" font-size="${fs}" letter-spacing="${b.spacing * fs / 100}" fill="${b.color}">${esc(t)}</text>${sub ? `<text x="${W / 2}" y="${S + 30 + fs + 52}" text-anchor="middle" font-family="${b.font}" font-weight="400" font-size="32" letter-spacing="6" fill="${b.color}" opacity=".7">${sub}</text>` : ""}</svg>`;
  }
  const x0 = hasSym ? S + 40 : 20, W = x0 + tw + 40, H = Math.max(S, fs + (sub ? 50 : 0)) + 40;
  const cy = H / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${hasSym ? sym(20, cy - S / 2) : ""}<text x="${x0}" y="${cy + (sub ? -6 : fs * .34)}" font-family="${b.font}" font-weight="${b.weight}" font-size="${fs}" letter-spacing="${b.spacing * fs / 100}" fill="${b.color}">${esc(t)}</text>${sub ? `<text x="${x0 + 4}" y="${cy + 44}" font-family="${b.font}" font-weight="400" font-size="30" letter-spacing="6" fill="${b.color}" opacity=".7">${sub}</text>` : ""}</svg>`;
}

/** troca as cores de um SVG por uma só (versão monocromática) */
export const monoSvg = (svg: string, color: string) => {
  // cores muito claras viram vazado (deixam o fundo aparecer); o resto vira a cor única
  const pick = (v: string) => { const h = v.trim(); if (!/^#[0-9a-f]{3,6}$/i.test(h)) return color; return lum(h) > .75 ? "transparent" : color; };
  return svg.replace(/(fill|stroke)="(?!none)([^"]*)"/g, (_m, a, v) => `${a}="${pick(v)}"`).replace(/(fill|stroke):\s*(?!none)([^;"]+)/g, (_m, a, v) => `${a}:${pick(v)}`);
};

export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/* ───────────── Peças: carrossel e estático ───────────── */
export const SIZES = [
  { k: "4x5", l: "Feed 4:5", w: 1080, h: 1350 },
  { k: "1x1", l: "Quadrado 1:1", w: 1080, h: 1080 },
  { k: "9x16", l: "Stories 9:16", w: 1080, h: 1920 },
];
export type Slide = { id: string; layout: "capa" | "texto" | "lista" | "citacao" | "cta"; kicker?: string; title: string; body?: string; img?: string; bg: "primaria" | "escuro" | "claro" | "imagem" | "destaque" };
export type Kit = { colors: Record<string, string>; title: string; body: string; tw: number; logo?: string; name?: string };

export const DEFAULT_KIT: Kit = { colors: { Primária: "#6eefb6", Apoio: "#3d525a", Destaque: "#f5c84c", Escuro: "#0c0c0d", Claro: "#f1f1f1" }, title: "Bricolage Grotesque", body: "Inter", tw: 800, name: "VINCIT" };

export function kitFrom(brand: any): Kit {
  const d = brand?.data || {};
  const colors = { ...DEFAULT_KIT.colors };
  for (const s of (d.palette || []) as Swatch[]) colors[s.role] = s.hex;
  const pair = d.type || {};
  const fav = ((d.logos || []) as Logo[]).find((l) => l.id === d.logo_id) || ((d.logos || []) as Logo[]).find((l) => l.fav);
  return { colors, title: pair.title || DEFAULT_KIT.title, body: pair.body || DEFAULT_KIT.body, tw: pair.tw || 800, logo: fav?.svg ? svgUrl(fav.svg) : fav?.img, name: d.brief?.nome || brand?.title };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const CAROUSEL_TEMPLATES: { k: string; l: string; d: string; slides: Omit<Slide, "id">[] }[] = [
  { k: "dicas", l: "Lista de dicas", d: "Capa, 5 dicas e chamada final", slides: [
    { layout: "capa", kicker: "GUIA RÁPIDO", title: "5 jeitos de {{tema}}", bg: "primaria" },
    ...[1, 2, 3, 4, 5].map((n) => ({ layout: "texto" as const, kicker: `0${n}`, title: `Dica ${n}`, body: "Explique em uma ou duas frases.", bg: "claro" as const })),
    { layout: "cta", title: "Salve para lembrar depois", body: "Siga para mais", bg: "escuro" },
  ] },
  { k: "antes", l: "Antes e depois", d: "Problema, virada e resultado", slides: [
    { layout: "capa", kicker: "ANTES × DEPOIS", title: "O que mudou quando {{fizemos isso}}", bg: "escuro" },
    { layout: "texto", kicker: "ANTES", title: "O problema", body: "Como era.", bg: "claro" },
    { layout: "texto", kicker: "A VIRADA", title: "O que fizemos", body: "A decisão que mudou tudo.", bg: "primaria" },
    { layout: "texto", kicker: "DEPOIS", title: "O resultado", body: "Como ficou, sem inventar números.", bg: "claro" },
    { layout: "cta", title: "Quer o mesmo?", body: "Chame no direct", bg: "escuro" },
  ] },
  { k: "produto", l: "Vitrine de produto", d: "Peças com foto, para e-commerce", slides: [
    { layout: "capa", kicker: "NOVIDADE", title: "Chegou a coleção {{nome}}", bg: "imagem" },
    { layout: "texto", kicker: "PEÇA 01", title: "{{nome da peça}}", body: "Tecido, caimento e com o que combina.", bg: "imagem" },
    { layout: "texto", kicker: "PEÇA 02", title: "{{nome da peça}}", body: "Tecido, caimento e com o que combina.", bg: "imagem" },
    { layout: "cta", title: "Garanta a sua", body: "Link na bio ou no WhatsApp", bg: "primaria" },
  ] },
  { k: "mito", l: "Mito ou verdade", d: "Quebra de crença, ótimo para salvar", slides: [
    { layout: "capa", kicker: "MITO OU VERDADE?", title: "{{crença comum do público}}", bg: "destaque" },
    { layout: "citacao", title: "“O que todo mundo diz.”", body: "A crença", bg: "escuro" },
    { layout: "texto", kicker: "NA VERDADE", title: "O que acontece de fato", body: "Explique com clareza.", bg: "claro" },
    { layout: "lista", kicker: "O QUE FAZER", title: "Na prática", body: "Primeiro passo\nSegundo passo\nTerceiro passo", bg: "claro" },
    { layout: "cta", title: "Comente MITO se você acreditava", bg: "primaria" },
  ] },
];

export const STATIC_TEMPLATES: { k: string; l: string; d: string; size: string; slide: Omit<Slide, "id"> }[] = [
  { k: "anuncio", l: "Anúncio", d: "Oferta ou lançamento", size: "4x5", slide: { layout: "capa", kicker: "SÓ ESTA SEMANA", title: "{{oferta}}", body: "Condição e prazo", bg: "primaria" } },
  { k: "frase", l: "Frase", d: "Citação ou opinião", size: "1x1", slide: { layout: "citacao", title: "“{{frase forte}}”", body: "Autor", bg: "escuro" } },
  { k: "aviso", l: "Aviso / Stories", d: "Horário, evento, comunicado", size: "9x16", slide: { layout: "texto", kicker: "AVISO", title: "{{o que mudou}}", body: "Detalhes em uma frase", bg: "claro" } },
  { k: "produto", l: "Produto com foto", d: "Foto de fundo + nome e preço", size: "4x5", slide: { layout: "capa", kicker: "NOVO", title: "{{produto}}", body: "{{preço ou chamada}}", bg: "imagem" } },
];

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/); let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}

export function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/** desenha uma página da peça no canvas (prévia e exportação usam o mesmo desenho) */
export async function drawSlide(cv: HTMLCanvasElement, s: Slide, kit: Kit, size: { w: number; h: number }, n: number, total: number) {
  cv.width = size.w; cv.height = size.h;
  const ctx = cv.getContext("2d")!; const W = size.w, H = size.h, P = W * .08;
  const C = kit.colors;
  const bg = s.bg === "primaria" ? C["Primária"] : s.bg === "escuro" ? C["Escuro"] : s.bg === "destaque" ? C["Destaque"] : s.bg === "claro" ? C["Claro"] : C["Escuro"];
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  let fg = readableOn(bg);
  if (s.bg === "imagem" && s.img) {
    try {
      const img = await loadImg(s.img); const r = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r);
      const g = ctx.createLinearGradient(0, H * .35, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.78)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      fg = "#ffffff";
    } catch {}
  }
  const accent = s.bg === "primaria" || s.bg === "destaque" ? fg : C["Primária"] === bg ? C["Destaque"] : C["Primária"];
  ctx.textBaseline = "alphabetic";
  const maxW = W - P * 2;
  const tSize = s.layout === "capa" ? W * .1 : s.layout === "citacao" ? W * .075 : W * .078;
  ctx.font = `${kit.tw} ${tSize}px "${kit.title}"`;
  const tLines = wrap(ctx, s.title || "", maxW);
  ctx.font = `400 ${W * .038}px "${kit.body}"`;
  const items = s.layout === "lista" ? (s.body || "").split("\n").filter(Boolean) : [];
  const bLines = s.layout === "lista" ? [] : wrap(ctx, s.body || "", maxW);
  const kH = s.kicker ? W * .05 : 0, tH = tLines.length * tSize * 1.08, bH = s.layout === "lista" ? items.length * W * .075 : bLines.length * W * .052;
  const block = kH + tH + (bH ? W * .035 + bH : 0);
  let y = s.layout === "capa" || s.bg === "imagem" ? H - P - block - W * .06 : s.layout === "cta" || s.layout === "citacao" ? (H - block) / 2 : P + W * .12;
  if (s.kicker) { ctx.fillStyle = accent; ctx.font = `700 ${W * .032}px "${kit.body}"`; ctx.fillText(s.kicker.toUpperCase(), P, y + W * .03); y += kH; }
  ctx.fillStyle = fg; ctx.font = `${kit.tw} ${tSize}px "${kit.title}"`;
  for (const l of tLines) { y += tSize; ctx.fillText(l, P, y); y += tSize * .08; }
  if (bH) {
    y += W * .035;
    if (s.layout === "lista") {
      ctx.font = `600 ${W * .04}px "${kit.body}"`;
      items.forEach((it, i) => { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(P + W * .015, y + W * .035, W * .012, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fg; ctx.fillText(it, P + W * .05, y + W * .048); y += W * .075; void i; });
    } else {
      ctx.globalAlpha = .82; ctx.fillStyle = fg; ctx.font = `400 ${W * .038}px "${kit.body}"`;
      for (const l of bLines) { y += W * .052; ctx.fillText(l, P, y); }
      ctx.globalAlpha = 1;
    }
  }
  // rodapé: logo ou nome + paginação
  const fy = H - P * .6;
  if (kit.logo) {
    try { const lg = await loadImg(kit.logo); const lh = W * .045, lw = Math.min(W * .3, (lg.width / lg.height) * lh); ctx.drawImage(lg, P, fy - lh, lw, lh); } catch {}
  } else if (kit.name) { ctx.fillStyle = fg; ctx.globalAlpha = .7; ctx.font = `700 ${W * .026}px "${kit.title}"`; ctx.fillText(kit.name, P, fy); ctx.globalAlpha = 1; }
  if (total > 1) { ctx.fillStyle = fg; ctx.globalAlpha = .6; ctx.font = `600 ${W * .026}px "${kit.body}"`; const t = `${n}/${total}`; ctx.fillText(t, W - P - ctx.measureText(t).width, fy); ctx.globalAlpha = 1; }
  if (s.layout === "capa" && total > 1) { ctx.fillStyle = accent; ctx.font = `700 ${W * .028}px "${kit.body}"`; const t = "arraste →"; ctx.fillText(t, W - P - ctx.measureText(t).width, P + W * .02); }
}

/* ───────────── Canva e Behance ───────────── */
/** abre um design novo no Canva já no tamanho certo (a pessoa precisa estar logada no Canva) */
export const canvaNew = (w: number, h: number) => `https://www.canva.com/design?create&width=${w}&height=${h}&units=px`;
export const CANVA_BRAND_KIT = "https://www.canva.com/brand";
export const behanceSearch = (q: string) => `https://www.behance.net/search/projects?search=${encodeURIComponent(q)}&field=branding`;
export const REF_SITES = [
  { l: "Behance", u: (q: string) => behanceSearch(`branding ${q}`) },
  { l: "Pinterest", u: (q: string) => `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(`identidade visual ${q}`)}` },
  { l: "Dribbble", u: (q: string) => `https://dribbble.com/search/${encodeURIComponent(`${q} logo`)}` },
  { l: "Logopond", u: (q: string) => `https://logopond.com/gallery/list/?gallery=featured&filter=${encodeURIComponent(q)}` },
];

/** reduz uma imagem enviada para guardar no projeto */
export async function shrink(file: File, max = 1080, q = .85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url); const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", q);
  } finally { URL.revokeObjectURL(url); }
}

export const download = (href: string, name: string) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

export const timeAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora"; if (m < 60) return `há ${m} min`; const h = Math.round(m / 60); if (h < 24) return `há ${h} h`; const d = Math.round(h / 24); return d < 30 ? `há ${d} d` : new Date(iso).toLocaleDateString("pt-BR");
};
