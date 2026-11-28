import { FONT_LIB, fontCssUrl, fontDef } from "./fonts";
/** Seção Design: criação de marca (briefing → referências → logo → cores → tipografia → manual) e peças (carrossel e estático). */

export type Kind = "marca" | "carrossel" | "peca";
export type Step = "estrategia" | "briefing" | "preprojeto" | "conceito" | "referencias" | "simbolo" | "logotipo" | "construcao" | "cores" | "tipografia" | "grafismos" | "aplicacoes" | "manual";

export const PHASES = ["Estratégia", "Conceito", "Construção", "Sistema", "Entrega"];
export const STEPS: { k: Step; l: string; fase: string; d: string; dica: string }[] = [
  { k: "estrategia", fase: "Estratégia", l: "Nicho e posição", d: "Em que mercado a marca joga, que arquétipo ela veste e onde fica no mapa contra os concorrentes.", dica: "Os melhores cases do Behance começam pelo sentido, não pela logo: pesquisa de público, mapa de concorrentes e o código visual do nicho, para decidir o que seguir e o que quebrar." },
  { k: "briefing", fase: "Estratégia", l: "Plataforma", d: "Propósito, missão, pilares, personalidade e identidade verbal.", dica: "Cada elemento (nome, fonte, composição, texto) precisa carregar o mesmo significado. A plataforma é o filtro de todas as decisões de forma." },
  { k: "preprojeto", fase: "Estratégia", l: "Pré-projeto", d: "O mostruário do gosto: tipos de letra, letras por estilo, pesos e o mapa do que o cliente gosta e não gosta.", dica: "Como um arquiteto com amostras de piso e tinta: antes de desenhar, mostre muitas opções e deixe o cliente apontar. Cada amostra tem código, e o resultado guia território, logotipo e tipografia." },
  { k: "conceito", fase: "Conceito", l: "Território criativo", d: "A grande ideia: uma metáfora que vira forma, cor e tipografia.", dica: "Explore 3 territórios bem diferentes antes de desenhar. O escolhido guia símbolo, cores e fontes, e é o que dá intenção ao design." },
  { k: "referencias", fase: "Conceito", l: "Referências", d: "Moodboard do território: o que inspira e o que evitar.", dica: "Junte marcas do nicho e de fora dele. Anote o porquê de cada uma: é a nota que ensina o Claude e o seu olho." },
  { k: "simbolo", fase: "Construção", l: "Símbolo e monograma", d: "Exploração do símbolo e das iniciais, com vários caminhos lado a lado.", dica: "Desenhe largo: símbolo abstrato, figurativo, monograma, selo. Funciona pequeno? Funciona em uma cor? Tem uma ideia por trás?" },
  { k: "logotipo", fase: "Construção", l: "Logotipo e assinaturas", d: "O nome desenhado (peso, espaço, ajuste entre letras) e as versões horizontal, vertical e reduzida.", dica: "Ajuste o espaço entre pares de letras a olho (kerning óptico). Depois combine símbolo e nome em assinaturas para cada uso." },
  { k: "construcao", fase: "Construção", l: "Construção técnica", d: "Grade, proporções, área de proteção, redução mínima e favicon.", dica: "A grade mostra que a forma tem lógica; a área de proteção e o tamanho mínimo garantem que a marca sobrevive no uso real." },
  { k: "cores", fase: "Sistema", l: "Cores", d: "Paleta com papéis: primária, apoio, destaque e fundos.", dica: "Defina papéis, não só cores bonitas. Confira o contraste do texto e a proporção de uso." },
  { k: "tipografia", fase: "Sistema", l: "Tipografia", d: "Famílias de título e texto e a escala de tamanhos.", dica: "Duas famílias e uma escala modular resolvem post, site e embalagem com coerência." },
  { k: "grafismos", fase: "Sistema", l: "Grafismos", d: "Padrões e supergráficos derivados do símbolo.", dica: "Grafismo bom nasce da própria marca: o símbolo ampliado, repetido ou recortado vira textura de sacola, fundo de post e embalagem." },
  { k: "aplicacoes", fase: "Sistema", l: "Aplicações", d: "A marca no mundo: post, stories, cartão, sacola, etiqueta, fachada, embalagem.", dica: "É nas aplicações que se vê se o sistema funciona. Ajuste o que quebrar e volte às etapas anteriores." },
  { k: "manual", fase: "Entrega", l: "Apresentação", d: "A marca apresentada como um estúdio apresenta: capítulos, arquétipos, construção e aplicações, em 16:9, 3:2 ou 4:3.", dica: "Apresente em tela cheia na reunião e mande o PDF depois. Cada capítulo abre com um divisor; o cliente entende o porquê antes de ver a forma." },
];
/** etapas antigas (v1) → novas */
export const stepOf = (k?: string): Step => (k === "logo" ? "simbolo" : (STEPS.some((s) => s.k === k) ? k : "estrategia") as Step);

/* ───────────── Briefing de marca ───────────── */
import { MANIFESTO_FIELDS } from "./manifesto";
export type BF = { k: string; l: string; type?: "text" | "textarea" | "chips" | "multi"; options?: string[]; ph?: string };
export const BRIEF: { k: string; l: string; fields: BF[] }[] = [
  { k: "essencia", l: "Essência", fields: [
    { k: "nome", l: "Nome da marca", ph: "Ex.: ISYS" },
    { k: "slogan", l: "Assinatura ou slogan (se tiver)", ph: "Ex.: moda que acompanha você" },
    { k: "oque", l: "O que a marca faz ou vende", type: "textarea", ph: "Ex.: loja de moda feminina com atendimento próximo e peças selecionadas." },
    { k: "proposito", l: "Por que ela existe (além de vender)", type: "textarea", ph: "Ex.: fazer a cliente se sentir bem vestida sem complicação." },
    { k: "valores", l: "Valores", type: "chips", ph: "Digite e aperte Enter" },
  ] },
  { k: "plataforma", l: "Plataforma", fields: [
    { k: "missao", l: "Missão (o que faz, para quem e como)", type: "textarea", ph: "Ex.: vestir mulheres reais com peças escolhidas a dedo e atendimento de amiga." },
    { k: "pilares", l: "3 pilares ou diferenciais que sustentam a marca", type: "chips", ph: "Ex.: curadoria, proximidade, leveza" },
    { k: "persona", l: "Retrato psicográfico do cliente (comportamento e valores)", type: "textarea", ph: "Ex.: decide sozinha, valoriza qualidade e não segue tendência às cegas." },
  ] },
  { k: "publico", l: "Público e mercado", fields: [
    { k: "publico", l: "Para quem é", type: "textarea", ph: "Ex.: mulheres de 25 a 45 anos, classe B, que compram pelo Instagram e na loja." },
    { k: "concorrentes", l: "Concorrentes", type: "chips", ph: "Nome ou @perfil" },
    { k: "diferencial", l: "Diferencial", type: "textarea", ph: "O que só ela tem ou faz." },
  ] },
  { k: "manifesto", l: "Manifesto e voz", fields: [
    ...MANIFESTO_FIELDS.filter((f) => ["frase_mae", "manifesto", "problema", "framework", "arquetipo", "territorio", "nao_e", "matriz_tom", "proibido", "regras_ouro", "estrutura", "fechamento", "ritmo", "indicadores", "visao"].includes(f.k)),
  ] },
  { k: "visual", l: "Direção visual", fields: [
    { k: "palavras", l: "3 a 5 palavras que a marca precisa transmitir", type: "chips", ph: "Ex.: leve, confiante, feminina" },
    { k: "estilo", l: "Tipo de logo que imagina", type: "multi", options: ["Só o nome (logotipo)", "Símbolo + nome", "Monograma (iniciais)", "Emblema / selo", "Mascote", "Aberto a sugestões"] },
    { k: "cores_gosta", l: "Cores que gosta ou já usa", type: "chips", ph: "Ex.: verde-oliva, off-white" },
    { k: "cores_evita", l: "Cores e elementos a evitar", type: "chips", ph: "Ex.: vermelho, clip-art, gradiente" },
    { k: "regras_visuais", l: "Regras visuais", type: "chips", ph: "Ex.: máximo 4 linhas por arte, 1 destaque de cor" },
    { k: "proporcao", l: "Proporção das cores", ph: "Ex.: preto 70%, branco 25%, verde 5% (só destaque)" },
    { k: "aplicacoes", l: "Onde a marca vai aparecer", type: "multi", options: ["Instagram", "Site / loja online", "Embalagem / sacola", "Etiqueta", "Fachada", "Cartão de visita", "Uniforme", "Vídeo"] },
  ] },
  { k: "verbal", l: "Identidade verbal", fields: [
    { k: "fala", l: "Como a marca fala (exemplos de frases)", type: "chips", ph: "Ex.: Escolhida para você." },
    { k: "nunca", l: "O que a marca nunca diz", type: "chips", ph: "Ex.: Imperdível!!! / Promoção relâmpago" },
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
export const ALL_FONTS = Array.from(new Set([...FONT_LIB.map((x) => x.f), ...PAIRS.flatMap((p) => [p.title, p.body])]));

const loaded = new Map<string, Promise<void>>();
/** carrega famílias do Google Fonts na página (para mostrar e para desenhar no canvas) */
export function loadFonts(families: string[]) {
  if (typeof document === "undefined") return Promise.resolve();
  const fams = families.filter(Boolean);
  const need = fams.filter((f) => !loaded.has(f));
  for (const f of need) {
    // um link por família: se uma falhar, as outras carregam
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = fontCssUrl(f);
    const css = new Promise<void>((r) => { l.onload = () => r(); l.onerror = () => r(); setTimeout(r, 8000); });
    document.head.appendChild(l);
    const ws = fontDef(f)?.w || [400, 700];
    const styles = fontDef(f)?.it ? ["", "italic "] : [""];
    loaded.set(f, css.then(() => Promise.all(ws.flatMap((w) => styles.map((st) => document.fonts.load(`${st}${w} 40px "${f}"`))))).then(() => {}, () => {}));
  }
  return Promise.all(fams.map((f) => loaded.get(f))).then(() => {});
}

/** embute as fontes usadas no SVG (para baixar ou desenhar em imagem sem depender do computador) */
export async function svgWithFonts(svg: string, families: string[]) {
  let css = "";
  for (const f of families.filter(Boolean)) {
    try {
      const r = await fetch(fontCssUrl(f));
      const text = await r.text();
      const blocks = text.split("@font-face").slice(1).filter((b) => b.includes("U+0000-00FF") || !b.includes("unicode-range"));
      for (const b of blocks) {
        const raw = b.match(/url\(['"]?((?:https:)?\/\/[^)'"]+\.woff2)['"]?\)/)?.[1] || b.match(/url\((https:[^)]+)\)/)?.[1]; const url = raw?.startsWith("//") ? `https:${raw}` : raw; const w = b.match(/font-weight:\s*(\d+)/)?.[1] || "400";
        if (!url) continue;
        const buf = await (await fetch(url)).arrayBuffer();
        let bin = ""; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const fst = b.match(/font-style:\s*(\w+)/)?.[1] || "normal";
        css += `@font-face{font-family:'${f}';font-weight:${w};font-style:${fst};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
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
  doc.querySelectorAll("script,foreignObject,iframe,use[href^='http'],a,animate,set").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
      if (n.startsWith("on") || ((n === "href" || n === "xlink:href") && !v.startsWith("#") && !v.startsWith("data:image/")) || v.startsWith("javascript:")) el.removeAttribute(a.name);
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
  // cores muito claras viram vazado de verdade (máscara), o resto vira a cor única
  const tone = (v: string, dark: string, light: string) => { const h = v.trim(); if (!/^#[0-9a-f]{3,6}$/i.test(h)) return dark; return lum(h) > .75 ? light : dark; };
  const swap = (src: string, dark: string, light: string) => src.replace(/(fill|stroke)="(?!none)([^"]*)"/g, (_m, a, v) => `${a}="${tone(v, dark, light)}"`).replace(/(fill|stroke):\s*(?!none)([^;"]+)/g, (_m, a, v) => `${a}:${tone(v, dark, light)}`);
  if (/<image\b/.test(svg) || !/^\s*<svg/.test(svg)) return swap(svg, color, "transparent");
  const open = svg.match(/^\s*<svg[^>]*>/)![0];
  const vb = (open.match(/viewBox="([^"]+)"/)?.[1] || "0 0 100 100").split(/[\s,]+/).map(Number);
  const all = svg.replace(/^\s*<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  // elementos com data-keep (ex.: a sarda ruiva da Alanis Gomes) mantêm a cor própria em qualquer versão
  const KEEP = /<(?:circle|ellipse|rect|path|polygon)\b[^>]*\bdata-keep\b[^>]*\/>/g;
  const kept = all.match(KEEP) || [];
  const inner = all.replace(KEEP, "");
  let hsh = 5381; for (const ch of svg + color) hsh = ((hsh * 33) ^ ch.charCodeAt(0)) >>> 0;
  const id = `m${hsh.toString(36)}`;
  return `${open}<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}"><g fill="#fff">${swap(inner, "#fff", "#000")}</g></mask></defs><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${color}" mask="url(#${id})"/>${kept.join("")}</svg>`;
};

export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/* ───────────── Peças: carrossel e estático ───────────── */
export const SIZES = [
  { k: "4x5", l: "Feed 4:5", w: 1080, h: 1350 },
  { k: "1x1", l: "Quadrado 1:1", w: 1080, h: 1080 },
  { k: "9x16", l: "Stories 9:16", w: 1080, h: 1920 },
];
export type Slide = { id: string; layout: "capa" | "texto" | "lista" | "citacao" | "cta"; kicker?: string; title: string; body?: string; img?: string; bg: "primaria" | "escuro" | "claro" | "imagem" | "destaque"; grafismo?: boolean };
export type Kit = { colors: Record<string, string>; title: string; body: string; tw: number; logo?: string; logoSvg?: string; name?: string; pattern?: { d: any; p: Pattern } };

export const DEFAULT_KIT: Kit = { colors: { Primária: "#6eefb6", Apoio: "#3d525a", Destaque: "#f5c84c", Escuro: "#0c0c0d", Claro: "#f1f1f1" }, title: "Bricolage Grotesque", body: "Inter", tw: 800, name: "VINCIT" };

export function kitFrom(brand: any): Kit {
  const d = brand?.data || {};
  const colors = { ...DEFAULT_KIT.colors };
  for (const s of (d.palette || []) as Swatch[]) colors[s.role] = s.hex;
  const pair = d.type || {};
  const fav = ((d.logos || []) as Logo[]).find((l) => l.id === d.logo_id) || ((d.logos || []) as Logo[]).find((l) => l.fav);
  // logotipo da v2 (vetor desenhado) vale mais que o logo antigo da v1; nas peças ele ganha a cor do texto
  const lt = d.logotype?.svg as string | undefined;
  return { colors, title: pair.title || DEFAULT_KIT.title, body: pair.body || DEFAULT_KIT.body, tw: pair.tw || 800, logo: lt ? svgUrl(lt) : fav?.svg ? svgUrl(fav.svg) : fav?.img, logoSvg: lt || fav?.svg, name: d.brief?.nome || brand?.title,
    // grafismo da etapa Grafismos (ex.: losango do i da ISYS): vai nas peças como textura
    pattern: d.pattern ? { d, p: { source: d.monogram ? "monograma" : "simbolo", scale: 120, gap: 60, rotate: 0, offset: true, opacity: 1, bg: "#000", fg: "#000", ...d.pattern } } : undefined };
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
  // grafismo da marca: ligado por padrão na capa e na chamada final, desligável por página
  if (kit.pattern && s.bg !== "imagem" && (s.grafismo ?? (s.layout === "capa" || s.layout === "cta"))) {
    try {
      const sc = W / 1080;
      const svg = patternSvg(kit.pattern.d, { ...kit.pattern.p, bg: "none", fg, scale: kit.pattern.p.scale * sc, gap: kit.pattern.p.gap * sc }, W, H);
      const pi = await loadImg(svgUrl(svg));
      ctx.globalAlpha = .13; ctx.drawImage(pi, 0, 0, W, H); ctx.globalAlpha = 1;
    } catch {}
  }
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
    try { const lg = await loadImg(kit.logoSvg ? svgUrl(monoSvg(kit.logoSvg, fg)) : kit.logo); const lh = W * .045, lw = Math.min(W * .3, (lg.width / lg.height) * lh); ctx.drawImage(lg, P, fy - lh, lw, lh); } catch {}
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

/* ───────────── Construção: logotipo, monograma e assinaturas ───────────── */
export type Logotype = { text: string; font: string; weight: number; tracking: number; upper: boolean; kern: number[]; color: string; sub?: string; subFont?: string; lower?: boolean; italic?: boolean; form?: "linha" | "empilhado" | "selo"; vary?: number; lead?: number; svg?: string };
export type Monogram = { letters: string; font: string; weight: number; shape: "nenhum" | "circulo" | "quadrado" | "arco" | "losango" | "selo"; overlap: number; fg: string; bg: string; stack: boolean };

let _cv: HTMLCanvasElement | null = null;
/** mede um texto com a fonte já carregada (em px) */
export function measure(text: string, font: string, weight: number, size: number, italic = false) {
  if (typeof document === "undefined") return text.length * size * .6;
  _cv = _cv || document.createElement("canvas");
  const ctx = _cv.getContext("2d")!; ctx.font = `${italic ? "italic " : ""}${weight} ${size}px "${font}"`;
  return ctx.measureText(text).width;
}

/** logotipo desenhado letra a letra: tracking, kerning por par, itálico, caixa, empilhado ou em selo,
    e "gesto" (pequenas variações de ângulo e altura, para não parecer digitado) */
export function logotypeSvg(lt: Logotype, color?: string) {
  const fs = 100; const fill = color || lt.color;
  // logotipo desenhado (vetor de fonte própria, ex.: Crasey): vale o desenho, não a fonte
  if (lt.svg) { const p = svgParts(lt.svg); const s = color ? monoSvg(lt.svg, color) : lt.svg; return { svg: s, w: p.w, h: p.h, cap: p.h }; }
  const t = lt.upper ? lt.text.toUpperCase() : lt.lower ? lt.text.toLowerCase() : lt.text;
  const it = lt.italic ? ' font-style="italic"' : "";
  const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  const vary = (lt.vary || 0) / 100;
  let gi = 0; // índice global de letra (o kerning segue a ordem do texto inteiro)
  const line = (str: string, y: number) => {
    const chars = Array.from(str); let x = 0; const parts: string[] = [];
    chars.forEach((c, i) => {
      const k = gi++;
      const dy = vary ? rnd(k) * vary * fs * .06 : 0, rot = vary ? rnd(k + 99) * vary * 7 : 0;
      const cw = measure(c, lt.font, lt.weight, fs, lt.italic);
      parts.push(`<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}"${rot ? ` transform="rotate(${rot.toFixed(2)} ${(x + cw / 2).toFixed(1)} ${(y - fs * .35).toFixed(1)})"` : ""} font-family="${lt.font}" font-weight="${lt.weight}"${it} font-size="${fs}" fill="${fill}">${esc(c)}</text>`);
      x += cw + (lt.tracking * fs) / 1000 + (i < chars.length - 1 ? ((lt.kern[k] || 0) * fs) / 1000 : 0);
    });
    return { parts, w: Math.max(10, x - (lt.tracking * fs) / 1000) };
  };
  const stacked = lt.form === "empilhado" || lt.form === "selo";
  const words = stacked ? t.split(/\s+/).filter(Boolean) : [t];
  const lh = fs * ((lt.lead ?? 86) / 100);
  const lines = words.map((wd, i) => line(wd, fs * .78 + i * lh));
  const W = Math.max(...lines.map((l) => l.w));
  const center = lt.form === "selo";
  let body = lines.map((l, i) => (center ? `<g transform="translate(${((W - l.w) / 2).toFixed(1)} 0)">${l.parts.join("")}</g>` : i === 0 ? l.parts.join("") : `<g>${l.parts.join("")}</g>`)).join("");
  const w = W; let h = fs + (lines.length - 1) * lh, ox = 0, oy = 0;
  if (lt.sub) {
    // descritor: centralizado na linha e no selo, alinhado à esquerda no empilhado
    const sf = fs * .2, left = lt.form === "empilhado";
    body += `<text x="${left ? 0 : (W / 2).toFixed(1)}" y="${(h + sf * 1.2).toFixed(1)}" text-anchor="${left ? "start" : "middle"}" font-family="${lt.subFont || lt.font}" font-weight="500" font-size="${sf}" letter-spacing="${sf * .3}" fill="${fill}">${esc(lt.sub.toUpperCase())}</text>`;
    h += sf * 1.6;
  }
  if (lt.form === "selo") {
    const rx = W / 2 + fs * .55, ry = h / 2 + fs * .5, sw = fs * .07;
    ox = rx - W / 2 + sw; oy = ry - h / 2 + sw;
    const cw = 2 * (rx + sw), ch = 2 * (ry + sw);
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw.toFixed(1)} ${ch.toFixed(1)}"><ellipse cx="${(cw / 2).toFixed(1)}" cy="${(ch / 2).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${fill}" stroke-width="${sw.toFixed(1)}"/><g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)})">${body}</g></svg>`, w: cw, h: ch, cap: fs * .78 };
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}">${body}</svg>`, w, h, cap: fs * .78 };
}

/** monograma: iniciais com sobreposição, empilhadas ou dentro de uma forma */
export function monogramSvg(m: Monogram, fgOverride?: string, bgOverride?: string) {
  const S = 200, fg = fgOverride || m.fg, bg = bgOverride || m.bg;
  const L = Array.from((m.letters || "AB").slice(0, 3));
  const fs = m.stack ? S * .42 : S * (L.length > 2 ? .38 : .5);
  const ws = L.map((c) => measure(c, m.font, m.weight, fs));
  const ov = (m.overlap / 100) * fs;
  let text = "";
  if (m.stack) {
    L.forEach((c, i) => { text += `<text x="${S / 2}" y="${S / 2 + (i - (L.length - 1) / 2) * (fs * .82 - ov * .4) + fs * .32}" text-anchor="middle" font-family="${m.font}" font-weight="${m.weight}" font-size="${fs}" fill="${fg}">${esc(c)}</text>`; });
  } else {
    const tot = ws.reduce((a, b) => a + b, 0) - ov * (L.length - 1); let x = S / 2 - tot / 2;
    L.forEach((c, i) => { text += `<text x="${x.toFixed(1)}" y="${S / 2 + fs * .34}" font-family="${m.font}" font-weight="${m.weight}" font-size="${fs}" fill="${fg}" ${i % 2 ? 'opacity=".85"' : ""}>${esc(c)}</text>`; x += ws[i] - ov; });
  }
  const sh = m.shape === "circulo" ? `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 4}" fill="${bg}"/>`
    : m.shape === "quadrado" ? `<rect x="4" y="4" width="${S - 8}" height="${S - 8}" rx="${S * .18}" fill="${bg}"/>`
    : m.shape === "arco" ? `<path d="M4 ${S - 4} V${S / 2} A${S / 2 - 4} ${S / 2 - 4} 0 0 1 ${S - 4} ${S / 2} V${S - 4} Z" fill="${bg}"/>`
    : m.shape === "losango" ? `<rect x="${S * .17}" y="${S * .17}" width="${S * .66}" height="${S * .66}" fill="${bg}" transform="rotate(45 ${S / 2} ${S / 2})"/>`
    : m.shape === "selo" ? `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 6}" fill="none" stroke="${fg}" stroke-width="4"/><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 16}" fill="none" stroke="${fg}" stroke-width="1.5"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">${sh}${text}</svg>`;
}

/** separa viewBox e conteúdo de um SVG para encaixar dentro de outro */
export function svgParts(svg: string) {
  const vb = svg.match(/viewBox="([^"]+)"/)?.[1] || "0 0 100 100";
  const [, , w, h] = vb.split(/[\s,]+/).map(Number);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return { vb, w: w || 100, h: h || 100, inner };
}
export const logoAsSvg = (l?: Logo) => (!l ? "" : l.svg || (l.img ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><image href="${l.img}" x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMid meet"/></svg>` : ""));

export type LockupKind = "horizontal" | "vertical" | "logotipo" | "simbolo" | "monograma";
export const LOCKUPS: { k: LockupKind; l: string; d: string }[] = [
  { k: "horizontal", l: "Horizontal", d: "assinatura principal: site, cartão, fachada" },
  { k: "vertical", l: "Vertical", d: "espaços quadrados e altos: post, embalagem" },
  { k: "logotipo", l: "Só o nome", d: "quando o símbolo já apareceu ou falta espaço na altura" },
  { k: "simbolo", l: "Só o símbolo", d: "avatar, selo, detalhe de produto" },
  { k: "monograma", l: "Monograma", d: "favicon, etiqueta, bordado, carimbo" },
];

/** monta uma assinatura a partir do símbolo, do logotipo e do monograma */
export function lockupSvg(kind: LockupKind, d: any, mono?: string) {
  const lt: Logotype | undefined = d.logotype;
  const sym = logoAsSvg((d.logos || []).find((l: Logo) => l.id === (d.symbol_id || d.logo_id)));
  const symS = sym ? (mono ? monoSvg(sym, mono) : sym) : "";
  const L = lt?.text ? logotypeSvg(lt, mono) : null;
  const nest = (s: string, x: number, y: number, w: number, h: number) => { const p = svgParts(s); return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${p.vb}" preserveAspectRatio="xMidYMid meet">${p.inner}</svg>`; };
  if (kind === "monograma" && d.monogram) return monogramSvg(d.monogram, mono, mono ? "transparent" : undefined).replace(/fill="transparent"/g, 'fill="none"');
  if (kind === "simbolo" || !L) return symS || (L ? L.svg : "");
  if (kind === "logotipo" || !symS) return L.svg;
  const sp = svgParts(symS); const ar = sp.w / sp.h;
  if (kind === "horizontal") {
    const sh = L.h * 1.15, sw = sh * ar, gap = Math.max(L.h * .3, sh * .55); // respiro maior: nome espaçado não pode encostar no símbolo
    const W = sw + gap + L.w, H = sh;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}">${nest(symS, 0, 0, sw, sh)}${nest(L.svg, sw + gap, (H - L.h) / 2, L.w, L.h)}</svg>`;
  }
  // nome longo e espaçado: o símbolo acompanha a largura do nome (mín. 30%) para não ficar miúdo em cima dele
  const sw = Math.max(L.h * 1.4 * ar, L.w * .3), sh = sw / ar, gap = Math.max(L.h * .35, sh * .2);
  const W = Math.max(sw, L.w), H = sh + gap + L.h;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}">${nest(symS, (W - sw) / 2, 0, sw, sh)}${nest(L.svg, (W - L.w) / 2, sh + gap, L.w, L.h)}</svg>`;
}

/** a assinatura principal escolhida (ou a melhor disponível) */
export function primaryLogo(d: any, mono?: string) {
  const k: LockupKind = d.principal || (d.logotype?.text && (d.symbol_id || d.logo_id) ? "horizontal" : d.logotype?.text ? "logotipo" : "simbolo");
  return lockupSvg(k, d, mono);
}

/* ───────────── Grafismos ───────────── */
/** svg: elemento próprio do grafismo (ex.: o losango do i da ISYS), no lugar do símbolo inteiro */
export type Pattern = { source: "simbolo" | "monograma"; svg?: string; nome?: string; scale: number; gap: number; rotate: number; offset: boolean; opacity: number; bg: string; fg: string };
export function patternSvg(d: any, p: Pattern, W = 1080, H = 1080) {
  const src = p.svg ? monoSvg(p.svg, p.fg) : p.source === "monograma" && d.monogram ? monogramSvg(d.monogram, p.fg, "transparent").replace(/fill="transparent"/g, 'fill="none"') : monoSvg(logoAsSvg((d.logos || []).find((l: Logo) => l.id === (d.symbol_id || d.logo_id))) || monogramSvg(d.monogram || { letters: "A", font: "Inter", weight: 800, shape: "nenhum", overlap: 0, fg: p.fg, bg: "none", stack: false }), p.fg);
  const sp = svgParts(src); const ar = sp.w / sp.h;
  const h = p.scale, w = h * ar, cw = w + p.gap, ch = h + p.gap;
  let out = "";
  for (let r = -1, y = -ch; y < H + ch; r++, y += ch) for (let x = -cw + (p.offset && r % 2 ? cw / 2 : 0); x < W + cw; x += cw)
    out += `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="${sp.vb}" overflow="visible"><g transform="rotate(${p.rotate} ${sp.w / 2} ${sp.h / 2})">${sp.inner}</g></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${p.bg}"/><g opacity="${p.opacity}">${out}</g></svg>`;
}
