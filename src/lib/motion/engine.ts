/**
 * Motor de motion graphics do Audiovisual (27/11).
 * Um motion é uma lista de cenas (vinheta, título, número, lista, citação, CTA, encerramento, transição…)
 * desenhadas em canvas por uma função pura do tempo: drawMotion(ctx, spec, t, W, H).
 * A mesma função serve a prévia, a exportação (MP4 ou WebM transparente) e o Editor, que desenha o
 * motion por cima do vídeo ou o insere como clipe. As cores e letras vêm do kit de estilo ou da marca do Design.
 * Sem custo: tudo roda no navegador.
 */
import { ehEstiloSom, type EstiloSom } from "@/lib/editor/som";

export type MotionFormat = "9:16" | "16:9" | "1:1";
export const MOTION_SIZES: Record<MotionFormat, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080] };
export const MOTION_FORMAT_LABEL: Record<MotionFormat, string> = { "9:16": "Vertical 9:16", "16:9": "Horizontal 16:9", "1:1": "Quadrado 1:1" };

export type CenaTipo = "vinheta" | "titulo" | "palavras" | "numero" | "lista" | "citacao" | "grafico" | "lower_third" | "cta" | "encerramento" | "transicao" | "editorial";
export const CENA_TIPOS: CenaTipo[] = ["vinheta", "titulo", "palavras", "numero", "lista", "citacao", "grafico", "lower_third", "cta", "encerramento", "transicao", "editorial"];
export const CENA_LABEL: Record<CenaTipo, string> = {
  vinheta: "Vinheta (logo ou nome)", titulo: "Título", palavras: "Palavra por palavra", numero: "Número que conta", lista: "Lista que marca",
  citacao: "Citação", grafico: "Gráfico de barras", lower_third: "Nome na tela (lower third)", cta: "Chamada (CTA)", encerramento: "Encerramento", transicao: "Transição",
  editorial: "Página editorial (papel, serifa e foto em cartão)",
};
/** o que cada campo quer dizer em cada cena (a tela mostra só os campos usados) */
export const CENA_CAMPOS: Record<CenaTipo, { texto?: string; sub?: string; itens?: string; valor?: boolean }> = {
  vinheta: { texto: "Nome (aparece quando não há logo)", sub: "Linha de baixo" },
  titulo: { texto: "Título", sub: "Chamada pequena em cima" },
  palavras: { texto: "Frase (uma palavra por vez; *palavra* fica na cor de destaque)" },
  numero: { texto: "O que o número mede", valor: true },
  lista: { texto: "Título da lista", itens: "Um item por linha" },
  citacao: { texto: "Frase", sub: "Quem disse" },
  grafico: { texto: "Título", itens: "Uma barra por linha: Nome: valor" },
  lower_third: { texto: "Nome", sub: "Função ou contexto" },
  cta: { texto: "Chamada", sub: "Botão (ex.: Salve este post)" },
  encerramento: { texto: "Frase final", sub: "@perfil ou site" },
  transicao: {},
  editorial: { texto: "Título serifado (*palavra* fica na cor de destaque; uma palavra curta vira letra gigante)", sub: "Chamada pequena em cima (ex.: ESSA DECISÃO AJUDOU A)" },
};

export type Fundo = "solido" | "gradiente" | "imagem" | "transparente";
export const FUNDO_LABEL: Record<Fundo, string> = { solido: "Cor sólida", gradiente: "Degradê", imagem: "Imagem", transparente: "Transparente (por cima do vídeo)" };
export type Transicao = "corte" | "cortina" | "fade" | "zoom" | "deslize";
export const TRANSICAO_LABEL: Record<Transicao, string> = { corte: "Corte seco", cortina: "Cortina na cor", fade: "Fade", zoom: "Zoom", deslize: "Deslize" };
export type Ritmo = "calmo" | "normal" | "rapido";

export type Cena = { id: string; tipo: CenaTipo; dur: number; texto?: string; sub?: string; itens?: string[]; valor?: number; prefixo?: string; sufixo?: string; fundo?: Fundo;
  /** foto da cena (URL ou data URL): na página editorial entra num cartão na cor de destaque */
  imagem?: string };
export type MotionSpec = {
  formato: MotionFormat;
  cores: { fundo: string; texto: string; destaque: string; apoio: string };
  fontes: { titulo: string; texto: string };
  fundo: Fundo;
  transicao: Transicao;
  ritmo: Ritmo;
  /** grafismo de fundo: linhas finas que andam devagar */
  grafismo?: boolean;
  grao?: boolean;
  /** imagem de fundo (URL ou data URL): foto, quadro do vídeo do Editor */
  imagem?: string;
  /** logo (URL, data URL de SVG ou PNG) para vinheta e encerramento */
  logo?: string;
  handle?: string;
  /** estilo de som (public/sons): o MP4 sai com os efeitos do estilo; vazio = mudo */
  som?: EstiloSom;
  cenas: Cena[];
};

export const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
const easeInOut = (v: number) => { v = clamp(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const back = (v: number) => { v = clamp(v); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2); };
const lerp = (a: number, b: number, v: number) => a + (b - a) * v;

export const DEFAULT_SPEC: MotionSpec = {
  formato: "9:16",
  cores: { fundo: "#0C0C0D", texto: "#FFFFFF", destaque: "#7CF5C8", apoio: "#2A2A2E" },
  fontes: { titulo: "Anton", texto: "Inter" },
  fundo: "gradiente", transicao: "cortina", ritmo: "normal", grafismo: true,
  cenas: [],
};

/* ───────────── modelos prontos ───────────── */
type Modelo = { id: string; nome: string; desc: string; fundo?: Fundo; transicao?: Transicao; cenas: Omit<Cena, "id">[] };
export const MODELOS: Modelo[] = [
  { id: "abertura", nome: "Vinheta de abertura", desc: "Logo ou nome da marca entrando, para o começo dos vídeos.", cenas: [{ tipo: "vinheta", dur: 2.6, texto: "VINCIT", sub: "audiovisual" }] },
  { id: "encerramento", nome: "Encerramento", desc: "Chamada e marca no fim do vídeo.", cenas: [{ tipo: "cta", dur: 2.6, texto: "Gostou? Manda para quem precisa ver", sub: "Salve este post" }, { tipo: "encerramento", dur: 2.2, texto: "Até o próximo", sub: "@vincit" }] },
  { id: "lower", nome: "Nome na tela", desc: "Nome e função por cima da fala, fundo transparente.", fundo: "transparente", cenas: [{ tipo: "lower_third", dur: 4, texto: "Vinícius Gontijo", sub: "Diretor · VINCIT" }] },
  { id: "numero", nome: "Número de impacto", desc: "Um número que conta até o valor, com o que ele mede.", cenas: [{ tipo: "numero", dur: 3, valor: 87, sufixo: "%", texto: "das clientes voltam a comprar" }] },
  { id: "lista", nome: "Lista", desc: "Itens que entram e são marcados.", cenas: [{ tipo: "lista", dur: 4.2, texto: "3 jeitos de usar", itens: ["Com tênis", "Com bota", "Com sandália"] }] },
  { id: "citacao", nome: "Citação", desc: "Frase com aspas, para depoimento ou ideia forte.", cenas: [{ tipo: "citacao", dur: 4, texto: "A roupa certa muda a postura antes de mudar o espelho.", sub: "Isys" }] },
  { id: "grafico", nome: "Gráfico", desc: "Barras que crescem, para comparar números.", cenas: [{ tipo: "grafico", dur: 4, texto: "Vendas por semana", itens: ["Sem 1: 32", "Sem 2: 45", "Sem 3: 61", "Sem 4: 80"] }] },
  { id: "transicao", nome: "Transição", desc: "Faixas na cor da marca para passar de um trecho a outro.", fundo: "transparente", transicao: "corte", cenas: [{ tipo: "transicao", dur: 0.9 }] },
  { id: "editorial", nome: "Páginas editoriais", desc: "Papel claro, título serifado e foto em cartão, para vídeo explicativo e história da peça.", fundo: "solido", transicao: "corte", cenas: [
    { tipo: "editorial", dur: 2.8, sub: "Essa decisão ajudou a", texto: "*Revolucionar* o jeans" },
    { tipo: "editorial", dur: 2.4, texto: "Ag", sub: "tipografia" },
    { tipo: "editorial", dur: 3, sub: "O tecido", texto: "Algodão com *elastano* que não laceia" },
  ] },
  { id: "peca", nome: "Peça de conteúdo", desc: "Reel ou post animado: gancho, ideia, número, lista e chamada.", cenas: [
    { tipo: "titulo", dur: 2.6, texto: "Como escolher o jeans certo", sub: "Guia rápido" },
    { tipo: "palavras", dur: 2.8, texto: "Comece pelo *caimento* não pelo tamanho" },
    { tipo: "numero", dur: 2.8, valor: 3, texto: "medidas que você precisa saber" },
    { tipo: "lista", dur: 3.8, texto: "Anote", itens: ["Cintura", "Quadril", "Comprimento"] },
    { tipo: "cta", dur: 2.6, texto: "Salve para a próxima compra", sub: "Salvar" },
  ] },
];

export function specDoModelo(id: string, base: Partial<MotionSpec> = {}): MotionSpec {
  const m = MODELOS.find((x) => x.id === id) || MODELOS[0];
  return normalizeSpec({ ...DEFAULT_SPEC, ...base, fundo: m.fundo || base.fundo || DEFAULT_SPEC.fundo, transicao: m.transicao || base.transicao || DEFAULT_SPEC.transicao, cenas: m.cenas.map((c) => ({ ...c, id: uid() })) });
}

export const novaCena = (tipo: CenaTipo): Cena => {
  const ex = MODELOS.flatMap((m) => m.cenas).find((c) => c.tipo === tipo);
  return { id: uid(), ...(ex ? JSON.parse(JSON.stringify(ex)) : { tipo, dur: 2.5, texto: "Texto" }) };
};

/* ───────────── validação (JSON do Claude, banco) ───────────── */
const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: any, d: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : d);
const pick = <T extends string>(v: any, all: readonly T[], d: T): T => (all.includes(v) ? v : d);
export function normalizeSpec(x: any): MotionSpec {
  const d = DEFAULT_SPEC;
  const c = x?.cores || {};
  const cenas: Cena[] = (Array.isArray(x?.cenas) ? x.cenas : []).slice(0, 24).map((k: any) => ({
    id: typeof k?.id === "string" ? k.id : uid(),
    tipo: pick(k?.tipo, CENA_TIPOS, "titulo"),
    dur: clamp(Number(k?.dur) || 2.5, 0.4, 20),
    texto: k?.texto != null ? String(k.texto).slice(0, 300) : undefined,
    sub: k?.sub != null ? String(k.sub).slice(0, 160) : undefined,
    itens: Array.isArray(k?.itens) ? k.itens.slice(0, 8).map((i: any) => String(i).slice(0, 80)) : undefined,
    valor: k?.valor != null && !isNaN(+k.valor) ? +k.valor : undefined,
    prefixo: k?.prefixo ? String(k.prefixo).slice(0, 6) : undefined,
    sufixo: k?.sufixo ? String(k.sufixo).slice(0, 8) : undefined,
    fundo: k?.fundo ? pick(k.fundo, ["solido", "gradiente", "imagem", "transparente"] as const, d.fundo) : undefined,
    imagem: typeof k?.imagem === "string" && k.imagem ? k.imagem : undefined,
  }));
  return {
    formato: pick(x?.formato, ["9:16", "16:9", "1:1"] as const, d.formato),
    cores: { fundo: hex(c.fundo, d.cores.fundo), texto: hex(c.texto, d.cores.texto), destaque: hex(c.destaque, d.cores.destaque), apoio: hex(c.apoio, mix(hex(c.fundo, d.cores.fundo), hex(c.texto, d.cores.texto), 0.14)) },
    fontes: { titulo: String(x?.fontes?.titulo || d.fontes.titulo), texto: String(x?.fontes?.texto || d.fontes.texto) },
    fundo: pick(x?.fundo, ["solido", "gradiente", "imagem", "transparente"] as const, d.fundo),
    transicao: pick(x?.transicao, ["corte", "cortina", "fade", "zoom", "deslize"] as const, d.transicao),
    ritmo: pick(x?.ritmo, ["calmo", "normal", "rapido"] as const, "normal"),
    grafismo: x?.grafismo !== false,
    grao: !!x?.grao,
    imagem: typeof x?.imagem === "string" ? x.imagem : undefined,
    logo: typeof x?.logo === "string" ? x.logo : undefined,
    handle: x?.handle ? String(x.handle).slice(0, 40) : undefined,
    som: ehEstiloSom(x?.som) ? x.som : undefined,
    cenas,
  };
}

/** cores e letras do kit de estilo do Editor (mesmo formato de av_style_kits.data) */
export function coresDoKit(kit: any): Pick<MotionSpec, "cores" | "fontes" | "som"> {
  const fundo = hex(kit?.cores?.fundo, DEFAULT_SPEC.cores.fundo), texto = hex(kit?.cores?.texto, DEFAULT_SPEC.cores.texto);
  return {
    ...(ehEstiloSom(kit?.regras?.som_estilo) ? { som: kit.regras.som_estilo } : {}),
    cores: { fundo, texto, destaque: hex(kit?.cores?.destaque, DEFAULT_SPEC.cores.destaque), apoio: mix(fundo, texto, 0.14) },
    fontes: { titulo: kit?.fontes?.titulo || DEFAULT_SPEC.fontes.titulo, texto: (kit?.fontes?.legenda || DEFAULT_SPEC.fontes.texto).replace(/\s+(Black|ExtraBold|Bold)$/i, "") },
  };
}

export const motionDuration = (s: MotionSpec) => s.cenas.reduce((a, c) => a + c.dur, 0);

/* ───────────── cores ───────────── */
function rgb(h: string) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a: string, b: string, v: number) {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((c, i) => Math.round(lerp(c, y[i], v)).toString(16).padStart(2, "0")).join("");
}
const alpha = (h: string, a: number) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
const lum = (h: string) => { const [r, g, b] = rgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** texto legível em cima de uma cor */
const on = (bg: string, a: string, b: string) => (Math.abs(lum(bg) - lum(a)) > Math.abs(lum(bg) - lum(b)) ? a : b);

/* ───────────── imagens (cache compartilhado entre prévia, exportação e Editor) ───────────── */
type Img = HTMLImageElement | ImageBitmap;
const cache = new Map<string, Img | "loading" | "erro">();
const listeners = new Set<() => void>();
/** a prévia se inscreve para redesenhar quando uma imagem termina de carregar */
export const onImageLoad = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
function load(url: string): Promise<Img | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => { cache.set(url, im); listeners.forEach((f) => f()); res(im); };
    im.onerror = () => { cache.set(url, "erro"); res(null); };
    im.src = url;
  });
}
function img(url?: string): Img | null {
  if (!url) return null;
  const c = cache.get(url);
  if (c && c !== "loading" && c !== "erro") return c;
  if (!c) { cache.set(url, "loading"); load(url); }
  return null;
}
/** espera as imagens do motion (antes de exportar) */
export async function preloadMotion(s: MotionSpec) {
  await Promise.all([s.imagem, s.logo, ...s.cenas.map((c) => c.imagem)].filter(Boolean).map((u) => { const c = cache.get(u!); return c && c !== "loading" ? null : load(u!); }));
}
const iw = (i: Img) => ("naturalWidth" in i ? i.naturalWidth : i.width);
const ih = (i: Img) => ("naturalHeight" in i ? i.naturalHeight : i.height);

/* ───────────── texto ───────────── */
export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
function fontCss(name: string, px: number, italic = false) {
  const n = (name || "Inter").trim();
  const m = n.match(/^(.*?)\s+(Black|ExtraBold|Bold|SemiBold|Medium|Regular|Italic)$/i);
  const map: Record<string, number> = { black: 900, extrabold: 800, bold: 700, semibold: 600, medium: 500, regular: 400, italic: 400 };
  const family = m ? m[1] : n;
  const weight = m ? map[m[2].toLowerCase()] : /anton|bebas|archivo black|instrument/i.test(n) ? 400 : /cinzel|playfair|bodoni/i.test(n) ? 700 : 800;
  return `${italic || /italic/i.test(m?.[2] || "") ? "italic " : ""}${weight} ${Math.round(px)}px "${family}", system-ui, sans-serif`;
}
const serifOf = (s: MotionSpec) => (/serif|playfair|bodoni|cinzel/i.test(s.fontes.titulo) ? s.fontes.titulo : "Instrument Serif");
function wrap(ctx: Ctx, text: string, maxW: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const tryL = cur ? cur + " " + w : w;
    if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** maior tamanho de letra em que o texto cabe em maxW × maxH (até maxLines linhas) */
function fit(ctx: Ctx, text: string, font: string, maxW: number, maxH: number, start: number, lh = 1.02, italic = false) {
  let px = start;
  for (let i = 0; i < 40; i++) {
    ctx.font = fontCss(font, px, italic);
    const lines = wrap(ctx, text, maxW);
    const wide = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if (lines.length * px * lh <= maxH && wide <= maxW) return { px, lines };
    px *= 0.92;
  }
  ctx.font = fontCss(font, px, italic);
  return { px, lines: wrap(ctx, text, maxW) };
}
const strip = (t: string) => t.replace(/\*/g, "");

/* ───────────── desenho ───────────── */
type Box = { W: number; H: number; u: number; wide: boolean; sq: boolean; pad: number };
type Opts = { transparente?: boolean };

/** fundo da cena */
function drawBg(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, T: number, b: Box, opts: Opts) {
  const fundo = c.fundo || s.fundo;
  if (fundo === "transparente" || (opts.transparente && fundo !== "imagem")) return false;
  const { W, H } = b;
  if (fundo === "imagem" && s.imagem) {
    const im = img(s.imagem);
    ctx.fillStyle = s.cores.fundo; ctx.fillRect(0, 0, W, H);
    if (im) {
      const z = 1.04 + 0.06 * (T / 20);
      const sc = Math.max(W / iw(im), H / ih(im)) * z;
      const w = iw(im) * sc, h = ih(im) * sc;
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, alpha(s.cores.fundo, 0.35)); g.addColorStop(1, alpha(s.cores.fundo, 0.78));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (fundo === "gradiente") {
    const a = T * 0.15;
    const g = ctx.createLinearGradient(W / 2 - Math.cos(a) * W, H / 2 - Math.sin(a) * H, W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * H);
    g.addColorStop(0, s.cores.fundo); g.addColorStop(0.55, mix(s.cores.fundo, s.cores.apoio, 0.9)); g.addColorStop(1, mix(s.cores.fundo, s.cores.destaque, 0.22));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else { ctx.fillStyle = s.cores.fundo; ctx.fillRect(0, 0, W, H); }
  if (s.grafismo) {
    // linhas finas em diagonal que andam devagar (dão vida ao fundo sem disputar com o texto)
    ctx.save(); ctx.strokeStyle = alpha(s.cores.texto, 0.06); ctx.lineWidth = Math.max(1, 2 * b.u);
    const gap = 120 * b.u, off = (T * 18 * b.u) % gap;
    for (let x = -H; x < W + H; x += gap) { ctx.beginPath(); ctx.moveTo(x + off, 0); ctx.lineTo(x + off - H * 0.5, H); ctx.stroke(); }
    ctx.restore();
  }
  return true;
}

function grain(ctx: Ctx, b: Box, T: number) {
  ctx.save(); ctx.globalAlpha = 0.06;
  let seed = Math.floor(T * 24) * 9301 + 49297;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = rnd() > 0.5 ? "#fff" : "#000"; ctx.fillRect(rnd() * b.W, rnd() * b.H, 2 * b.u, 2 * b.u); }
  ctx.restore();
}

/** linha de texto que sobe de dentro de uma máscara (revelação clássica de título) */
function riseLine(ctx: Ctx, text: string, x: number, y: number, px: number, v: number, align: CanvasTextAlign = "center") {
  const e = easeOut(v);
  if (e <= 0) return;
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  const w = ctx.measureText(text).width;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.beginPath(); ctx.rect(x0 - px, y - px * 1.05, w + px * 2, px * 1.35); ctx.clip();
  ctx.fillText(text, x, y + (1 - e) * px * 1.1);
  ctx.restore();
}

function drawLogo(ctx: Ctx, s: MotionSpec, cx: number, cy: number, maxW: number, maxH: number, v: number, shine: number) {
  const im = img(s.logo);
  if (!im) return false;
  const ar = iw(im) / ih(im);
  let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
  const sc = 0.92 + 0.08 * back(v);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(sc, sc);
  // revelação: cortina da esquerda para a direita
  ctx.beginPath(); ctx.rect(-w / 2 - 4, -h / 2 - 4, (w + 8) * easeInOut(v), h + 8); ctx.clip();
  ctx.globalAlpha = clamp(v * 2);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  if (shine > 0 && shine < 1) {
    // brilho que passa uma vez por cima (só onde há logo: source-atop)
    ctx.globalCompositeOperation = "source-atop";
    const bx = -w / 2 + (shine * 1.6 - 0.3) * w;
    const g = ctx.createLinearGradient(bx - w * 0.15, 0, bx + w * 0.15, 0);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
  return true;
}

function cenaVinheta(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u } = b, cx = W / 2, cy = H / 2;
  // anel que abre na cor de destaque
  const r = easeOut(lt / (0.9 * k)) * Math.max(W, H) * 0.75;
  ctx.save(); ctx.strokeStyle = alpha(s.cores.destaque, clamp(1 - lt / (1.1 * k)) * 0.9); ctx.lineWidth = 6 * u;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  // duas barras que cruzam
  const bar = easeInOut((lt - 0.1 * k) / (0.7 * k));
  ctx.fillStyle = s.cores.destaque;
  const bw = W * 0.5 * bar;
  if (bar < 1) { ctx.fillRect(cx - bw, cy - 3 * u, bw * 2, 6 * u); }
  const logoV = (lt - 0.45 * k) / (0.9 * k);
  const has = drawLogo(ctx, s, cx, cy - (c.sub ? 40 * u : 0), W * (b.wide ? 0.42 : 0.66), H * (b.wide ? 0.4 : 0.26), logoV, (lt - 1.3 * k) / (0.9 * k));
  if (!has) {
    const name = strip(c.texto || "MARCA");
    const { px } = fit(ctx, name, s.fontes.titulo, W - b.pad * 2, H * 0.3, (b.wide ? 220 : 200) * u);
    ctx.font = fontCss(s.fontes.titulo, px);
    ctx.fillStyle = s.cores.texto; ctx.textAlign = "center";
    // letras entram com espaçamento que fecha
    const v = easeOut(logoV);
    const track = (1 - v) * 0.5 * px;
    const chars = [...name];
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, x) => a + x, 0) + track * (chars.length - 1);
    let x = cx - total / 2;
    ctx.save(); ctx.globalAlpha = clamp(logoV * 1.6); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    chars.forEach((ch, i) => { const d = clamp((logoV - i * 0.04) * 1.4); ctx.globalAlpha = d; ctx.fillText(ch, x, cy + (1 - easeOut(d)) * 30 * u - (c.sub ? 40 * u : 0)); x += widths[i] + track; });
    ctx.restore();
  }
  if (c.sub) {
    const v = clamp((lt - 1.1 * k) / (0.6 * k));
    ctx.save(); ctx.globalAlpha = v; ctx.fillStyle = s.cores.destaque; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = fontCss(s.fontes.texto + " Bold", 38 * u);
    const txt = c.sub.toUpperCase().split("").join(String.fromCharCode(8202));
    ctx.fillText(txt, cx, cy + (has ? H * (b.wide ? 0.22 : 0.15) : 110 * u) + (1 - v) * 16 * u);
    ctx.restore();
  }
}

function cenaTitulo(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b;
  const text = strip(c.texto || "");
  const { px, lines } = fit(ctx, text.toUpperCase(), s.fontes.titulo, W - pad * 2, H * (b.wide ? 0.5 : 0.42), (b.wide ? 170 : 150) * u, 1.02);
  const lh = px * 1.02;
  const blockH = lines.length * lh;
  const top = H / 2 - blockH / 2 + px * 0.82;
  if (c.sub) {
    const v = clamp(lt / (0.4 * k));
    ctx.save(); ctx.globalAlpha = v; ctx.fillStyle = s.cores.destaque; ctx.textAlign = "center";
    ctx.font = fontCss(s.fontes.texto + " Bold", 36 * u);
    ctx.fillText(c.sub.toUpperCase(), W / 2, top - px - 30 * u);
    ctx.restore();
  }
  ctx.font = fontCss(s.fontes.titulo, px); ctx.fillStyle = s.cores.texto;
  lines.forEach((l, i) => riseLine(ctx, l, W / 2, top + i * lh, px, (lt - 0.12 * k - i * 0.1 * k) / (0.55 * k)));
  const bar = easeInOut((lt - (0.3 + lines.length * 0.1) * k) / (0.5 * k));
  ctx.fillStyle = s.cores.destaque;
  const bw = Math.min(W - pad * 2, 360 * u) * bar;
  ctx.fillRect(W / 2 - bw / 2, top + (lines.length - 1) * lh + px * 0.32, bw, 10 * u);
}

function cenaPalavras(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, _k: number, b: Box) {
  const { W, H, u, pad } = b;
  const words = (c.texto || "").split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const per = c.dur / words.length;
  const i = Math.min(words.length - 1, Math.floor(lt / per));
  const local = (lt - i * per) / Math.min(per, 0.5);
  const raw = words[i];
  const hot = /^\*.*\*$/.test(raw) || /^\*/.test(raw);
  const w = strip(raw).toUpperCase();
  const { px } = fit(ctx, w, s.fontes.titulo, W - pad * 2, H * 0.36, (b.wide ? 300 : 260) * u);
  const sc = 0.7 + 0.3 * back(local);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(sc, sc);
  if (hot) {
    ctx.font = fontCss(s.fontes.titulo, px);
    const tw = ctx.measureText(w).width;
    ctx.fillStyle = s.cores.destaque;
    ctx.fillRect(-tw / 2 - 30 * u, -px * 0.62, tw + 60 * u, px * 1.2);
  }
  ctx.font = fontCss(s.fontes.titulo, px); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = hot ? on(s.cores.destaque, s.cores.fundo, "#ffffff") : s.cores.texto;
  ctx.fillText(w, 0, px * 0.04);
  ctx.restore();
  // contagem de palavras em pontinhos
  ctx.fillStyle = alpha(s.cores.texto, 0.35);
  const dot = 10 * u, gap = 26 * u, x0 = W / 2 - ((words.length - 1) * gap) / 2;
  words.forEach((_, j) => { ctx.fillStyle = j === i ? s.cores.destaque : alpha(s.cores.texto, 0.3); ctx.beginPath(); ctx.arc(x0 + j * gap, H * 0.78, dot / 2, 0, Math.PI * 2); ctx.fill(); });
}

function cenaNumero(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b, cx = W / 2, cy = H / 2 - (b.wide ? 40 : 80) * u;
  const target = c.valor ?? 100;
  const v = easeOut(lt / (1.4 * k));
  const dec = Math.abs(target) < 10 && target % 1 !== 0 ? 1 : 0;
  const val = (target * v).toFixed(dec).replace(".", ",");
  const R = Math.min(W, H) * (b.wide ? 0.3 : 0.34);
  ctx.save(); ctx.lineWidth = 16 * u; ctx.lineCap = "round";
  ctx.strokeStyle = alpha(s.cores.texto, 0.12); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = s.cores.destaque; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v * (c.sufixo === "%" ? clamp(target / 100) : 1)); ctx.stroke();
  ctx.restore();
  const str = `${c.prefixo || ""}${val}${c.sufixo || ""}`;
  const { px } = fit(ctx, str, s.fontes.titulo, R * 1.6, R * 0.9, 260 * u);
  ctx.font = fontCss(s.fontes.titulo, px); ctx.fillStyle = s.cores.texto; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(str, cx, cy + px * 0.04);
  if (c.texto) {
    const a = clamp((lt - 0.6 * k) / (0.5 * k));
    ctx.save(); ctx.globalAlpha = a;
    const f = fit(ctx, c.texto, s.fontes.texto + " Bold", W - pad * 2, H * 0.16, 56 * u, 1.2);
    ctx.font = fontCss(s.fontes.texto + " Bold", f.px); ctx.fillStyle = s.cores.texto; ctx.textAlign = "center"; ctx.textBaseline = "top";
    f.lines.forEach((l, i) => ctx.fillText(l, cx, cy + R + 60 * u + i * f.px * 1.2 + (1 - a) * 20 * u));
    ctx.restore();
  }
}

function cenaLista(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b;
  const itens = (c.itens || []).filter(Boolean);
  const titleF = fit(ctx, (c.texto || "").toUpperCase(), s.fontes.titulo, W - pad * 2, H * 0.18, (b.wide ? 120 : 110) * u);
  const rowH = Math.min((b.wide ? 120 : 140) * u, (H * 0.55) / Math.max(1, itens.length));
  const blockH = titleF.lines.length * titleF.px + 50 * u + itens.length * rowH;
  let y = H / 2 - blockH / 2 + titleF.px * 0.85;
  const left = b.wide ? W * 0.28 : pad;
  ctx.font = fontCss(s.fontes.titulo, titleF.px); ctx.fillStyle = s.cores.texto;
  titleF.lines.forEach((l, i) => riseLine(ctx, l, left, y + i * titleF.px, titleF.px, lt / (0.5 * k), "left"));
  y += (titleF.lines.length - 1) * titleF.px + 60 * u;
  const fs = rowH * 0.42;
  itens.forEach((it, i) => {
    const t0 = 0.45 * k + i * 0.38 * k;
    const v = clamp((lt - t0) / (0.4 * k));
    const chk = clamp((lt - t0 - 0.3 * k) / (0.3 * k));
    const ry = y + i * rowH;
    ctx.save(); ctx.globalAlpha = v; ctx.translate((1 - easeOut(v)) * -60 * u, 0);
    const bx = left, bs = fs * 1.15;
    ctx.lineWidth = 5 * u; ctx.strokeStyle = s.cores.destaque; ctx.fillStyle = s.cores.destaque;
    ctx.beginPath(); ctx.roundRect(bx, ry, bs, bs, 10 * u); chk > 0 ? ctx.fill() : ctx.stroke();
    if (chk > 0) {
      ctx.strokeStyle = on(s.cores.destaque, s.cores.fundo, "#ffffff"); ctx.lineWidth = 7 * u; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(bx + bs * 0.24, ry + bs * 0.52);
      const p1 = [bx + bs * 0.43, ry + bs * 0.72], p2 = [bx + bs * 0.78, ry + bs * 0.3];
      if (chk < 0.5) ctx.lineTo(lerp(bx + bs * 0.24, p1[0], chk * 2), lerp(ry + bs * 0.52, p1[1], chk * 2));
      else { ctx.lineTo(p1[0], p1[1]); ctx.lineTo(lerp(p1[0], p2[0], (chk - 0.5) * 2), lerp(p1[1], p2[1], (chk - 0.5) * 2)); }
      ctx.stroke();
    }
    ctx.font = fontCss(s.fontes.texto + " Bold", fs); ctx.fillStyle = s.cores.texto; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillText(it, bx + bs + 28 * u, ry + bs / 2);
    ctx.restore();
  });
}

function cenaCitacao(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b;
  const serif = serifOf(s);
  const qv = back(lt / (0.5 * k));
  ctx.save(); ctx.fillStyle = s.cores.destaque; ctx.font = fontCss(serif, 360 * u); ctx.textAlign = b.wide ? "left" : "center"; ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = clamp(lt / (0.3 * k));
  ctx.translate(b.wide ? pad : W / 2, H * (b.wide ? 0.42 : 0.36)); ctx.scale(qv, qv); ctx.fillText("“", 0, 0);
  ctx.restore();
  const words = (c.texto || "").split(/\s+/).filter(Boolean);
  const f = fit(ctx, c.texto || "", serif, W - pad * 2 - (b.wide ? 260 * u : 0), H * 0.42, (b.wide ? 96 : 92) * u, 1.15, true);
  ctx.font = fontCss(serif, f.px, true); ctx.fillStyle = s.cores.texto; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  const x0 = b.wide ? pad + 240 * u : pad;
  let y = H / 2 - (f.lines.length * f.px * 1.15) / 2 + f.px * (b.wide ? 0.85 : 1.6);
  let wi = 0;
  const per = (c.dur * 0.55) / Math.max(1, words.length);
  for (const line of f.lines) {
    let x = b.wide ? x0 : W / 2 - ctx.measureText(line).width / 2;
    for (const w of line.split(" ")) {
      const a = clamp((lt - 0.35 * k - wi * per) / (0.35 * k));
      ctx.globalAlpha = 0.15 + 0.85 * a;
      ctx.fillText(w, x, y);
      x += ctx.measureText(w + " ").width; wi++;
    }
    y += f.px * 1.15;
  }
  ctx.globalAlpha = 1;
  if (c.sub) {
    const a = clamp((lt - c.dur * 0.6) / (0.4 * k));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = s.cores.destaque; ctx.font = fontCss(s.fontes.texto + " Bold", 40 * u); ctx.textAlign = b.wide ? "left" : "center";
    ctx.fillText("— " + c.sub, b.wide ? x0 : W / 2, y + 30 * u); ctx.restore();
  }
}

function cenaGrafico(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b;
  const rows = (c.itens || []).map((l) => { const m = l.match(/^(.*?)[:=]\s*([\d.,]+)\s*$/); return m ? { n: m[1].trim(), v: parseFloat(m[2].replace(",", ".")) } : null; }).filter(Boolean) as { n: string; v: number }[];
  const tf = fit(ctx, (c.texto || "").toUpperCase(), s.fontes.titulo, W - pad * 2, H * 0.14, 100 * u);
  ctx.font = fontCss(s.fontes.titulo, tf.px); ctx.fillStyle = s.cores.texto;
  const top = H * (b.wide ? 0.16 : 0.2);
  tf.lines.forEach((l, i) => riseLine(ctx, l, pad, top + i * tf.px, tf.px, lt / (0.5 * k), "left"));
  if (!rows.length) return;
  const max = Math.max(...rows.map((r) => r.v), 1);
  const areaTop = top + tf.lines.length * tf.px + 60 * u, areaBot = H * (b.wide ? 0.86 : 0.8);
  const gw = (W - pad * 2) / rows.length;
  const bw = gw * 0.62;
  rows.forEach((r, i) => {
    const v = easeOut((lt - 0.4 * k - i * 0.15 * k) / (0.9 * k));
    const h = (areaBot - areaTop - 80 * u) * (r.v / max) * v;
    const x = pad + i * gw + (gw - bw) / 2;
    ctx.fillStyle = i === rows.length - 1 ? s.cores.destaque : alpha(s.cores.texto, 0.85);
    ctx.beginPath(); ctx.roundRect(x, areaBot - h, bw, h, [12 * u, 12 * u, 0, 0]); ctx.fill();
    ctx.font = fontCss(s.fontes.texto + " Bold", Math.min(44 * u, bw * 0.3)); ctx.textAlign = "center"; ctx.fillStyle = s.cores.texto;
    ctx.globalAlpha = v; ctx.fillText(String(Math.round(r.v * v)), x + bw / 2, areaBot - h - 18 * u); ctx.globalAlpha = 1;
    ctx.fillStyle = alpha(s.cores.texto, 0.7); ctx.font = fontCss(s.fontes.texto + " Bold", Math.min(34 * u, bw * 0.24));
    ctx.fillText(r.n, x + bw / 2, areaBot + 46 * u);
  });
}

function cenaLower(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u } = b;
  const outV = clamp((c.dur - lt) / (0.45 * k));
  const inV = easeOut(lt / (0.6 * k));
  const v = Math.min(inV, easeOut(outV));
  const x = b.wide ? 120 * u : 70 * u, y = b.wide ? H * 0.78 : H * 0.7;
  const nameF = (b.wide ? 64 : 62) * u, subF = (b.wide ? 34 : 34) * u;
  ctx.font = fontCss(s.fontes.titulo, nameF); const nw = ctx.measureText(c.texto || "").width;
  ctx.font = fontCss(s.fontes.texto + " Bold", subF); const sw = ctx.measureText(c.sub || "").width;
  const boxW = Math.max(nw, sw) + 70 * u;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y - nameF * 1.4, (boxW + 20 * u) * v, nameF * 1.4 + subF * 2.4); ctx.clip();
  ctx.fillStyle = s.cores.destaque; ctx.fillRect(x, y - nameF * 1.3, 12 * u, nameF * 1.3 + subF * 2.1);
  ctx.fillStyle = alpha(s.cores.fundo, 0.88); ctx.fillRect(x + 12 * u, y - nameF * 1.3, boxW, nameF * 1.3);
  ctx.fillStyle = s.cores.texto; ctx.font = fontCss(s.fontes.titulo, nameF); ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(c.texto || "", x + 40 * u, y - nameF * 0.62);
  if (c.sub) {
    const sv = clamp((lt - 0.3 * k) / (0.4 * k));
    ctx.globalAlpha = sv;
    ctx.fillStyle = s.cores.destaque; ctx.fillRect(x + 12 * u, y, sw + 60 * u, subF * 1.7);
    ctx.fillStyle = on(s.cores.destaque, s.cores.fundo, "#ffffff"); ctx.font = fontCss(s.fontes.texto + " Bold", subF);
    ctx.fillText(c.sub, x + 40 * u, y + subF * 0.86);
  }
  ctx.restore();
}

function cenaCta(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b;
  const f = fit(ctx, (c.texto || "").toUpperCase(), s.fontes.titulo, W - pad * 2, H * 0.34, (b.wide ? 140 : 130) * u);
  const top = H / 2 - (f.lines.length * f.px) / 2 - 40 * u + f.px * 0.8;
  ctx.font = fontCss(s.fontes.titulo, f.px); ctx.fillStyle = s.cores.texto;
  f.lines.forEach((l, i) => riseLine(ctx, l, W / 2, top + i * f.px, f.px, (lt - i * 0.1 * k) / (0.5 * k)));
  if (c.sub) {
    const v = back((lt - (0.4 + f.lines.length * 0.1) * k) / (0.5 * k));
    const pulse = 1 + 0.035 * Math.sin(Math.max(0, lt - 1 * k) * 6);
    ctx.font = fontCss(s.fontes.texto + " Bold", 46 * u);
    const bw = ctx.measureText(c.sub).width + 120 * u, bh = 104 * u;
    const by = top + (f.lines.length - 1) * f.px + 90 * u;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(v * pulse, v * pulse);
    ctx.fillStyle = s.cores.destaque; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = on(s.cores.destaque, s.cores.fundo, "#ffffff"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(c.sub, 0, 2 * u);
    ctx.restore();
  }
  if (s.handle) { ctx.save(); ctx.globalAlpha = clamp((lt - 0.8 * k) / (0.4 * k)) * 0.8; ctx.fillStyle = s.cores.texto; ctx.font = fontCss(s.fontes.texto + " Bold", 36 * u); ctx.textAlign = "center"; ctx.fillText(s.handle, W / 2, H - b.pad * 1.4); ctx.restore(); }
}

function cenaEncerramento(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad } = b, cx = W / 2, cy = H / 2;
  const has = drawLogo(ctx, s, cx, cy - 30 * u, W * (b.wide ? 0.32 : 0.5), H * (b.wide ? 0.3 : 0.18), lt / (0.8 * k), (lt - 0.8 * k) / (0.8 * k));
  if (c.texto) {
    const v = clamp((lt - (has ? 0.5 : 0) * k) / (0.5 * k));
    const f = fit(ctx, c.texto, has ? s.fontes.texto + " Bold" : s.fontes.titulo, W - pad * 2, H * 0.2, (has ? 52 : 120) * u);
    ctx.save(); ctx.globalAlpha = v; ctx.fillStyle = s.cores.texto; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = fontCss(has ? s.fontes.texto + " Bold" : s.fontes.titulo, f.px);
    const y0 = has ? cy - H * (b.wide ? 0.25 : 0.17) : cy - (f.lines.length - 1) * f.px * 0.5 - 30 * u;
    f.lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * f.px + (1 - v) * 20 * u));
    ctx.restore();
  }
  const handle = c.sub || s.handle;
  if (handle) {
    const v = clamp((lt - 0.7 * k) / (0.5 * k));
    ctx.save(); ctx.globalAlpha = v; ctx.fillStyle = s.cores.destaque; ctx.font = fontCss(s.fontes.texto + " Bold", 44 * u); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(handle, cx, cy + (has ? H * (b.wide ? 0.22 : 0.14) : 90 * u));
    ctx.restore();
  }
  // escurece no fim
  const f = clamp((lt - (c.dur - 0.45)) / 0.45);
  if (f > 0) { ctx.save(); ctx.globalAlpha = f; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

/** faixas na cor da marca que cruzam a tela (fica bem por cima de um corte) */
function cenaTransicao(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, _k: number, b: Box) {
  const { W, H } = b;
  const v = lt / c.dur;
  const cores = [s.cores.destaque, s.cores.texto, s.cores.fundo];
  const D = Math.hypot(W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.35);
  cores.forEach((cor, i) => {
    const a = easeInOut((v - i * 0.08) / 0.55), z = easeInOut((v - 0.4 - i * 0.08) / 0.55);
    const x1 = lerp(-D, D, z) - D / 2, x2 = lerp(-D, D, a) + D / 2;
    if (x2 <= x1) return;
    ctx.fillStyle = cor;
    ctx.fillRect(Math.max(-D, x1 - D / 2), -D, Math.min(D * 2, x2 - x1), D * 2);
  });
  ctx.restore();
}


/* página editorial (27/11, referência do Vinícius): papel claro, chamada pequena, título serifado com a palavra
   forte em itálico na cor de destaque e foto num cartão colorido que sobe. Sempre cobre a tela. */
const PAPEL = "#F3EFE6", TINTA = "#16140F";
function cenaEditorial(ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) {
  const { W, H, u, pad, wide } = b;
  const serif = serifOf(s);
  const acc = lum(s.cores.destaque) > 0.55 ? mix(s.cores.destaque, TINTA, 0.45) : s.cores.destaque;
  // papel com uma vinheta leve e grão fixo
  ctx.save();
  ctx.fillStyle = PAPEL; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,45,20,.10)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // aproximação lenta da página inteira
  const z = 1 + 0.035 * clamp(lt / Math.max(1, c.dur));
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const raw = (c.texto || "").trim();
  const plain = strip(raw);
  const foto = img(c.imagem);
  // uma palavra curta (até 3 letras) vira letra gigante, como um verbete de tipografia
  if (plain && plain.length <= 3 && !/\s/.test(plain) && !c.imagem) {
    const v = back(lt / (0.6 * k));
    ctx.fillStyle = TINTA; ctx.font = fontCss(serif, (wide ? 520 : 600) * u); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.save(); ctx.globalAlpha = clamp(lt / (0.3 * k)); ctx.translate(W / 2, H * 0.55); ctx.scale(v, v); ctx.fillText(plain, 0, 0); ctx.restore();
    if (c.sub) {
      const a = clamp((lt - 0.5 * k) / (0.4 * k));
      ctx.globalAlpha = a; ctx.fillStyle = acc; ctx.font = fontCss(serif, 84 * u, true);
      ctx.fillText(c.sub, W / 2, H * 0.55 + (wide ? 190 : 220) * u + (1 - a) * 20 * u);
    }
    ctx.restore();
    return;
  }
  const hasFoto = !!c.imagem;
  // área do texto: em cima no vertical; à esquerda no horizontal quando há foto
  const tx = pad, tw = wide && hasFoto ? W * 0.48 - pad : W - pad * 2;
  let y = wide ? H * 0.24 : hasFoto ? H * 0.1 : H * 0.34;
  if (c.sub) {
    const a = clamp(lt / (0.35 * k));
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = fontCss(s.fontes.texto + " Bold", (wide ? 30 : 36) * u); ctx.fillStyle = TINTA; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const kick = c.sub.toUpperCase().split("").join(String.fromCharCode(8202));
    ctx.fillText(kick, tx, y);
    ctx.fillStyle = acc; ctx.fillRect(tx, y + 18 * u, Math.min(tw, 180 * u) * easeOut(lt / (0.6 * k)), 5 * u);
    ctx.restore();
    y += 70 * u;
  }
  if (raw) {
    // palavras com *marcação* ficam em itálico na cor de destaque
    const toks: { w: string; hot: boolean }[] = [];
    let inHot = false;
    for (const t of raw.split(/\s+/).filter(Boolean)) {
      const open = t.startsWith("*"), close = t.endsWith("*") && (t.length > 1 || !open);
      if (open) inHot = true;
      toks.push({ w: t.replace(/\*/g, ""), hot: inHot });
      if (close) inHot = false;
    }
    const maxH = hasFoto && !wide ? H * 0.24 : H * 0.42;
    const f = fit(ctx, plain, serif, tw * 0.94, maxH, (wide ? 170 : 200) * u, 1.04); // folga para o itálico
    const px = f.px, lh = px * 1.04;
    // reparte os tokens pelas linhas do fit
    let ti = 0;
    f.lines.forEach((line, li) => {
      const n = line.split(" ").length;
      const lineToks = toks.slice(ti, ti + n); ti += n;
      const ly = y + px * 0.85 + li * lh;
      const e = easeOut((lt - 0.15 * k - li * 0.12 * k) / (0.5 * k));
      if (e <= 0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(tx - px, ly - px * 1.05, tw + px * 2, px * 1.4); ctx.clip();
      let x = tx;
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      for (const tk of lineToks) {
        ctx.font = fontCss(serif, px, tk.hot); ctx.fillStyle = tk.hot ? acc : TINTA;
        ctx.fillText(tk.w, x, ly + (1 - e) * px * 1.1);
        x += ctx.measureText(tk.w + " ").width;
      }
      ctx.restore();
    });
    y += px * 0.85 + (f.lines.length - 1) * lh;
  }
  if (hasFoto) {
    const v = clamp((lt - 0.35 * k) / (0.7 * k));
    const e = back(v);
    const cw = wide ? W * 0.36 : W * 0.78, ch = wide ? H * 0.68 : H * 0.5;
    const cx = wide ? W * 0.72 : W / 2, cy = wide ? H * 0.52 : Math.min(H - ch / 2 - 90 * u, Math.max(y + 90 * u + ch / 2, H * 0.6));
    ctx.save();
    ctx.globalAlpha = clamp(v * 2);
    ctx.translate(cx, cy + (1 - e) * H * 0.3); ctx.rotate((-2.5 + 2.5 * (1 - e)) * Math.PI / 180);
    ctx.shadowColor = "rgba(40,30,10,.25)"; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 18 * u;
    ctx.fillStyle = s.cores.destaque; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.shadowColor = "transparent";
    if (foto) {
      const m = 28 * u, fw = cw - m * 2, fh = ch - m * 2;
      const sc = Math.max(fw / iw(foto), fh / ih(foto)) * (1.06 - 0.06 * clamp(lt / Math.max(1, c.dur)));
      const w = iw(foto) * sc, h = ih(foto) * sc;
      ctx.beginPath(); ctx.rect(-fw / 2, -fh / 2, fw, fh); ctx.clip();
      ctx.drawImage(foto, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }
  ctx.restore();
}

const DRAW: Record<CenaTipo, (ctx: Ctx, s: MotionSpec, c: Cena, lt: number, k: number, b: Box) => void> = {
  vinheta: cenaVinheta, titulo: cenaTitulo, palavras: cenaPalavras, numero: cenaNumero, lista: cenaLista, citacao: cenaCitacao,
  grafico: cenaGrafico, lower_third: cenaLower, cta: cenaCta, encerramento: cenaEncerramento, transicao: cenaTransicao, editorial: cenaEditorial,
};
/** cenas que já têm entrada e saída próprias (não levam a transição do motion) */
const SELF = new Set<CenaTipo>(["lower_third", "transicao", "encerramento"]);

export function cenaAt(s: MotionSpec, t: number) {
  let acc = 0;
  for (let i = 0; i < s.cenas.length; i++) {
    const c = s.cenas[i];
    if (t < acc + c.dur || i === s.cenas.length - 1) return { c, i, lt: Math.min(c.dur, Math.max(0, t - acc)), start: acc };
    acc += c.dur;
  }
  return null;
}

/**
 * Desenha o motion no tempo t (segundos desde o começo do motion) num quadro W × H.
 * opts.transparente: não pinta o fundo (para entrar por cima do vídeo no Editor).
 */
export function drawMotion(ctx: Ctx, s: MotionSpec, t: number, W: number, H: number, opts: Opts = {}) {
  const at = cenaAt(s, t);
  if (!at) return;
  const { c, i, lt } = at;
  const u = Math.min(W, H) / 1080;
  const b: Box = { W, H, u, wide: W > H * 1.2, sq: Math.abs(W - H) < 10, pad: (W > H ? 140 : 90) * u };
  const k = s.ritmo === "calmo" ? 1.35 : s.ritmo === "rapido" ? 0.72 : 1;
  ctx.save();
  const painted = drawBg(ctx, s, c, t, t, b, opts);
  // transição de entrada/saída da cena (não vale nas cenas que já se animam sozinhas)
  const tin = 0.35 * k, tout = 0.3 * k;
  const self = SELF.has(c.tipo);
  const isLast = i === s.cenas.length - 1;
  let a = 1, sc = 1, dx = 0;
  if (!self) {
    const pin = i === 0 ? 1 : clamp(lt / tin), pout = isLast ? 1 : clamp((c.dur - lt) / tout);
    if (s.transicao === "fade") a = Math.min(pin, pout);
    if (s.transicao === "zoom") { sc = lerp(1.12, 1, easeOut(pin)) * lerp(0.92, 1, easeOut(pout)); a = Math.min(clamp(pin * 1.5), clamp(pout * 1.5)); }
    if (s.transicao === "deslize") { dx = (1 - easeOut(pin)) * W * 0.25 - (1 - easeOut(pout)) * W * 0.25; a = Math.min(clamp(pin * 1.4), clamp(pout * 1.4)); }
    // a saída da última cena: some devagar
    if (isLast && c.tipo !== "encerramento") a = Math.min(a, clamp((c.dur - lt) / (0.35 * k) + 0.0001));
  }
  ctx.globalAlpha = a;
  if (sc !== 1 || dx) { ctx.translate(W / 2 + dx, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2); }
  DRAW[c.tipo](ctx, s, c, lt, k, b);
  ctx.restore();
  // cortina: painel na cor de destaque cobre o corte entre duas cenas
  if (s.transicao === "cortina" && !self) {
    const half = 0.28 * k;
    let p = -1;
    if (!isLast && lt > c.dur - half) p = (lt - (c.dur - half)) / half * 0.5;
    else if (i > 0 && lt < half && !SELF.has(s.cenas[i - 1].tipo)) p = 0.5 + (lt / half) * 0.5;
    if (p >= 0) {
      const x1 = p < 0.5 ? 0 : easeInOut((p - 0.5) * 2) * W, x2 = p < 0.5 ? easeInOut(p * 2) * W : W;
      ctx.save(); ctx.fillStyle = s.cores.destaque; ctx.fillRect(x1, 0, x2 - x1, H); ctx.restore();
    }
  }
  if (s.grao && painted) grain(ctx, b, t);
}
