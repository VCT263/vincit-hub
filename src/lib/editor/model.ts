/**
 * Editor enxuto do Audiovisual: modelo da timeline e desenho dos quadros (prévia e exportação usam o mesmo código).
 * Tudo roda no navegador de quem edita; nada vai para servidor.
 */

import { drawMotion as drawMotionSpec, motionDuration, type MotionSpec } from "@/lib/motion/engine";
export type Word = { s: number; e: number; t: string }; // tempo no arquivo de origem (segundos)
export type Media = { id: string; name: string; file: File; url: string; duration: number; width: number; height: number; words?: Word[]; image?: boolean; broll?: boolean };
export type Segment = { id: string; mediaId: string; in: number; out: number };
export type TitleKind = "gancho" | "cta" | "lower_third" | "episodio" | "capitulo" | "palavra" | "frase" | "letreiro" | "data" | "lista" | "rec" | "vazado" | "riscado"
  | "numero" | "grafico" | "checklist" | "seta" | "relogio" | "progresso";
/** lettering: textos de destaque que entram e saem em momentos da fala */
export const LETTERING_KINDS: TitleKind[] = ["gancho", "palavra", "vazado", "riscado", "frase", "letreiro", "lower_third", "cta", "episodio", "capitulo", "data", "lista", "rec"];
/** motion: animações desenhadas no próprio HUB, nas cores do kit (alternativa à imagem de inserção) */
export const MOTION_KINDS: TitleKind[] = ["numero", "grafico", "checklist", "seta", "relogio", "progresso"];
export const TITLE_KINDS: TitleKind[] = [...LETTERING_KINDS, ...MOTION_KINDS];
export const TITLE_LABEL: Record<TitleKind, string> = {
  gancho: "Gancho", cta: "CTA", lower_third: "Nome na tela", episodio: "Abertura do episódio", capitulo: "Capítulo (roda)", palavra: "Palavra-chave",
  frase: "Frase de impacto", letreiro: "Letreiro espaçado", data: "Data e lugar", lista: "Tela de explicação", rec: "Câmera REC", vazado: "Texto vazado (no espaço vazio)", riscado: "Riscado e corrigido",
  numero: "Número subindo", grafico: "Gráfico crescendo", checklist: "Checklist", seta: "Seta desenhada", relogio: "Relógio", progresso: "Barra de progresso",
};
/** o que cada texto/motion espera em "sub" */
export const TITLE_SUB_HINT: Partial<Record<TitleKind, string>> = {
  episodio: "Linha de baixo (ex.: EP. 03 · 2026)", capitulo: "Linha pequena (opcional)", lower_third: "Cargo ou @perfil", palavra: "Linha pequena",
  frase: "Palavras na cor de destaque (ex.: conforto)", data: "Segunda linha (ex.: domingo · Floripa)", lista: "Itens separados por | (ex.: dormir | treinar | escrever)", rec: "Canto de baixo (ex.: 4K UHD)",
  vazado: "Segunda linha, em itálico (ex.: no CapCut)", riscado: "A palavra certa, que entra embaixo (ex.: estratégia)", numero: "Legenda do número (ex.: das vendas)", grafico: "Legenda (ex.: faturamento em 3 meses)",
  checklist: "Itens separados por |", seta: "Para onde aponta: esquerda, direita, cima ou baixo", relogio: "Legenda (ex.: por dia)", progresso: "Legenda (ex.: da meta)",
};
/** sub = linha pequena de cima (ex.: "EP. 03 · Nome da série" ou "Capítulo 2") */
export type Title = { id: string; start: number; end: number; text: string; kind: TitleKind; sub?: string };
/** tipo: punch (entra rápido), push (aproxima devagar), pull (afasta devagar), tremida (impacto), chicote (passa rápido para o lado) */
export type Zoom = { id: string; start: number; end: number; scale: number; tipo?: string };
export const CAMERA_MOVES: [string, string, string][] = [
  ["punch", "Punch-in", "Aproxima rápido e segura. Para frases fortes."],
  ["push", "Aproximação lenta", "Vai chegando perto devagar. Para histórias e momentos sérios."],
  ["pull", "Afastamento lento", "Abre o quadro devagar. Para conclusões e respiros."],
  ["tremida", "Tremida de impacto", "Treme por meio segundo. Para números e revelações."],
  ["chicote", "Chicote", "Passa rápido para o lado com desfoque. Para viradas de assunto."],
];
/** camera: 0 desligada, 1 suave, 2 média, 3 forte (sem valor, vale o do kit) */
export type Project = { segments: Segment[]; titles: Title[]; zooms: Zoom[]; captionsOn: boolean; edits: Record<string, string>; camera?: number; format?: Format;
  overlays?: Overlay[];
  /** punch alternado nos cortes (jump cut): trechos pares abertos, ímpares fechados nesta escala (%) */
  jumpPunch?: number;
  /** entra do preto no começo e some no preto no fim */
  fade?: boolean;
  /** cor do vídeo (natural, quente, frio, contraste, filme, pb) */
  look?: string;
  /** transição nos cortes entre trechos */
  transicao?: string;
  /** grão de filme mesmo sem o look filme */
  grao?: boolean;
  /** número do estilo do catálogo aplicado (ex.: "03") */
  estilo?: string;
  /** motion graphics por cima do vídeo (vinheta, nome na tela, número, transição), feitos em /audiovisual/motion */
  motions?: MotionClip[];
};
/** motion por cima: transparente deixa o vídeo aparecer onde o motion não desenha; senão cobre a tela */
export type MotionClip = { id: string; start: number; spec: MotionSpec; nome: string; motionId?: string; transparente?: boolean };
export const motionEnd = (m: MotionClip) => m.start + motionDuration(m.spec);
export const activeMotions = (p: Project, t: number) => (p.motions || []).filter((m) => t >= m.start && t < motionEnd(m));
/** B-roll por cima da fala: o vídeo/imagem cobre a tela (cheia) ou entra num cartão do lado; o som continua o da fala */
export type OverlayMode = "cheia" | "esquerda" | "direita" | "polaroid" | "circulo" | "metade" | "pagina";
export const OVERLAY_MODES: [OverlayMode, string][] = [["cheia", "Tela cheia"], ["esquerda", "Cartão à esquerda"], ["direita", "Cartão à direita"], ["polaroid", "Polaroid inclinada"], ["circulo", "Círculo"], ["metade", "Metade de cima"], ["pagina", "Página branca (foto em cartão, fundo claro)"]];
export type Overlay = { id: string; mediaId: string; start: number; end: number; in: number; mode: OverlayMode };

export type Kit = {
  cores?: { destaque?: string; texto?: string; fundo?: string };
  fontes?: { titulo?: string; legenda?: string };
  /** animacao: como cada tela de legenda entra; posicao: fixa ou muda a cada frase */
  legenda?: { estilo?: string; palavras_por_tela?: number; caixa_alta?: boolean; altura?: number; altura_h?: number; animacao?: string; posicao?: string };
  regras?: { corte_max_s?: number; silencio_ms?: number; trilha_db?: number };
  /** movimentos: quais movimentos o Editor pode sugerir */
  camera?: { intensidade?: number; movimentos?: string[] };
  /** camadas que o Editor sugere a partir da fala: quais tipos e com que frequência (pouco, medio, muito) */
  lettering?: { tipos?: string[]; frequencia?: string };
  insercao?: { modo?: string; frequencia?: string };
  motion?: { tipos?: string[]; frequencia?: string };
  /** estilo padrão do cliente no catálogo numerado */
  estilo?: string;
  mogrts?: Record<string, string>;
};

/** formato da saída: vertical (Reels/Shorts) ou horizontal (YouTube) */
export type Format = "9:16" | "16:9";
export let W = 1080;
export let H = 1920;
/** escala das letras: o horizontal usa letras menores que o vertical */
export let U = 1;
export const isWide = () => W > H;
export function setFormat(f: Format = "9:16") {
  if (f === "16:9") { W = 1920; H = 1080; U = 0.72; } else { W = 1080; H = 1920; U = 1; }
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_KIT: Kit = {
  cores: { destaque: "#F5C84C", texto: "#FFFFFF", fundo: "#0C0C0D" },
  fontes: { titulo: "Anton", legenda: "Inter Black" },
  legenda: { estilo: "impacto", palavras_por_tela: 3, caixa_alta: true, altura: 0.64 },
  regras: { corte_max_s: 4, silencio_ms: 350, trilha_db: -18 },
  camera: { intensidade: 2, movimentos: ["punch", "push", "tremida"] },
  lettering: { tipos: ["gancho", "palavra", "vazado", "riscado", "frase", "cta"], frequencia: "medio" },
  insercao: { modo: "cheia", frequencia: "medio" },
  motion: { tipos: ["numero", "grafico", "checklist", "relogio", "progresso"], frequencia: "medio" },
};

export function mergeKit(k?: Kit | null): Kit {
  const d = DEFAULT_KIT;
  return {
    cores: { ...d.cores, ...(k?.cores || {}) },
    fontes: { ...d.fontes, ...(k?.fontes || {}) },
    legenda: { ...d.legenda, ...(k?.legenda || {}) },
    regras: { ...d.regras, ...(k?.regras || {}) },
    camera: { ...d.camera, ...(k?.camera || {}) },
    lettering: { ...d.lettering, ...(k?.lettering || {}) },
    insercao: { ...d.insercao, ...(k?.insercao || {}) },
    motion: { ...d.motion, ...(k?.motion || {}) },
    estilo: k?.estilo,
    mogrts: k?.mogrts,
  };
}

/** fontes do Google que o editor carrega; o kit pode citar qualquer uma delas */
export const FONTS = ["Anton", "Inter", "Archivo Black", "Instrument Serif", "Bebas Neue", "Montserrat", "Poppins", "Bricolage Grotesque", "Playfair Display", "Bodoni Moda", "Cinzel", "JetBrains Mono"];
export const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Bodoni+Moda:ital,wght@0,700;0,900;1,700&family=Cinzel:wght@700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Instrument+Serif:ital@0;1&family=Inter:wght@500;700;800;900&family=JetBrains+Mono:wght@500&family=Montserrat:wght@700;900&family=Poppins:wght@700;900&display=block";

/** "Inter Black" → { family: "Inter", weight: 900 } */
export function parseFont(name?: string) {
  const n = (name || "Inter").trim();
  const m = n.match(/^(.*?)\s+(Black|ExtraBold|Bold|SemiBold|Medium|Regular|Italic)$/i);
  const map: Record<string, number> = { black: 900, extrabold: 800, bold: 700, semibold: 600, medium: 500, regular: 400, italic: 400 };
  return m ? { family: m[1], weight: map[m[2].toLowerCase()], italic: /italic/i.test(m[2]) } : { family: n, weight: /anton|bebas|archivo black|instrument/i.test(n) ? 400 : /cinzel|playfair/i.test(n) ? 700 : 800, italic: false };
}
const css = (name: string | undefined, px: number, forceItalic = false) => {
  const f = parseFont(name);
  return `${f.italic || forceItalic ? "italic " : ""}${f.weight} ${px}px "${f.family}", system-ui, sans-serif`;
};

/* ---------- timeline ---------- */

export const segLen = (s: Segment) => Math.max(0, s.out - s.in);
export const totalDuration = (p: Project) => p.segments.reduce((a, s) => a + segLen(s), 0);

/** onde cada trecho começa na saída */
export function layout(p: Project) {
  let t = 0;
  return p.segments.map((s) => { const start = t; t += segLen(s); return { seg: s, start, end: t }; });
}

/** tempo da saída → trecho e tempo no arquivo */
export function locate(p: Project, t: number) {
  const L = layout(p);
  for (const l of L) if (t >= l.start && t < l.end) return { ...l, src: l.seg.in + (t - l.start) };
  const last = L[L.length - 1];
  return last ? { ...last, src: last.seg.out } : null;
}

/** palavras na saída (só as que caem dentro dos trechos usados), com as correções de texto aplicadas */
export function outputWords(p: Project, media: Media[]) {
  const byId = new Map(media.map((m) => [m.id, m]));
  const out: { start: number; end: number; t: string; key: string }[] = [];
  for (const l of layout(p)) {
    const m = byId.get(l.seg.mediaId);
    (m?.words || []).forEach((w, i) => {
      const mid = (w.s + w.e) / 2;
      if (mid < l.seg.in || mid > l.seg.out) return;
      const key = `${m!.id}:${i}`;
      const t = p.edits[key] ?? w.t;
      if (!t.trim()) return;
      out.push({ start: l.start + Math.max(0, w.s - l.seg.in), end: l.start + Math.min(segLen(l.seg), w.e - l.seg.in), t: t.trim(), key });
    });
  }
  return out;
}

/** agrupa as palavras em telas de legenda (N palavras, quebra em pausa ou pontuação) */
export function captionScreens(words: ReturnType<typeof outputWords>, per: number) {
  const screens: { start: number; end: number; words: typeof words }[] = [];
  let cur: typeof words = [];
  const flush = () => { if (cur.length) screens.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur }); cur = []; };
  words.forEach((w, i) => {
    const gap = i ? w.start - words[i - 1].end : 0;
    if (cur.length >= per || gap > 0.6) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.t)) flush();
  });
  flush();
  // a tela fica até a próxima começar (sem piscar entre palavras)
  screens.forEach((s, i) => { const next = screens[i + 1]; if (next && next.start - s.end < 0.5) s.end = next.start; });
  return screens;
}

/** palavras que valem destaque: números, palavras longas e as que o kit/roteiro pedem */
export function isHot(t: string) {
  const w = t.toLowerCase().replace(/[^\p{L}\p{N}%$]/gu, "");
  if (/\d/.test(w) || /[%$]/.test(w)) return true;
  return w.length >= 8;
}

/** divide os trechos para tirar silêncios maiores que minGap (usa a transcrição de cada arquivo) */
export function removeSilences(p: Project, media: Media[], minGap: number, pad = 0.12): Segment[] {
  const byId = new Map(media.map((m) => [m.id, m]));
  const out: Segment[] = [];
  for (const s of p.segments) {
    const words = (byId.get(s.mediaId)?.words || []).filter((w) => w.e > s.in && w.s < s.out);
    if (!words.length) { out.push(s); continue; }
    let a = Math.max(s.in, words[0].s - pad);
    for (let i = 1; i < words.length; i++) {
      if (words[i].s - words[i - 1].e > minGap) {
        out.push({ id: uid(), mediaId: s.mediaId, in: a, out: Math.min(s.out, words[i - 1].e + pad) });
        a = Math.max(s.in, words[i].s - pad);
      }
    }
    out.push({ id: uid(), mediaId: s.mediaId, in: a, out: Math.min(s.out, words[words.length - 1].e + pad) });
  }
  return out.filter((s) => segLen(s) > 0.15);
}

/* ---------- desenho ---------- */

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/* ---------- câmera que acompanha a fala ---------- */

export const CAMERA_LEVELS = ["Desligada", "Suave", "Média", "Forte"];
const AMP = [0, 0.035, 0.065, 0.1];

export type CamMove = { start: number; end: number; from: number; to: number };
export type Camera = { moves: CamMove[]; hits: { t: number; a: number }[] };
export const NO_CAMERA: Camera = { moves: [], hits: [] };

export const cameraLevel = (p: Project, kit: Kit) => Math.max(0, Math.min(3, Math.round(p.camera ?? kit.camera?.intensidade ?? 0)));

/**
 * Lê a fala e monta o movimento: cada frase é um empurrão lento para dentro (zoom in) ou um recuo (zoom out),
 * alternando como um operador de câmera; frases com ! ou ? entram mais fundo; palavras fortes dão um soco curto;
 * pausa longa devolve o quadro ao normal.
 */
export function speechCamera(words: ReturnType<typeof outputWords>, level: number): Camera {
  const A = AMP[level] || 0;
  if (!A || !words.length) return NO_CAMERA;
  const phrases: { start: number; end: number; strong: boolean }[] = [];
  let cur: typeof words = [];
  const flush = () => { if (cur.length) phrases.push({ start: cur[0].start, end: cur[cur.length - 1].end, strong: /[!?]$/.test(cur[cur.length - 1].t) }); cur = []; };
  words.forEach((w, i) => {
    if (cur.length && (w.start - words[i - 1].end > 0.45 || w.end - cur[0].start > 4.5)) flush();
    cur.push(w);
    if (/[.!?;]$/.test(w.t)) flush();
  });
  flush();

  const moves: CamMove[] = [];
  let z = 1, prevEnd = -10;
  for (const ph of phrases) {
    if (ph.start - prevEnd > 0.9) z = 1; // pausa longa: volta ao quadro aberto
    const from = z;
    let to: number;
    if (ph.strong) to = Math.min(1 + A * 2.2, z + A * 1.5); // pergunta/exclamação: entra mais
    else if (z > 1 + A * 0.6) to = 1 + A * 0.1; // já está perto: recua (zoom out)
    else to = z + A; // aberto: empurra (zoom in)
    if (ph.end - ph.start < 0.5) to = from + (to - from) * 0.5; // frase curta mexe pouco
    moves.push({ start: ph.start, end: ph.end, from, to });
    z = to; prevEnd = ph.end;
  }

  const hits: Camera["hits"] = [];
  let last = -10;
  for (const w of words) {
    const strong = /[!]$/.test(w.t) || isHot(w.t);
    if (strong && w.start - last > 1.4) { hits.push({ t: w.start, a: A * 0.55 }); last = w.start; }
  }
  return { moves, hits };
}

const ease = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

export function cameraAt(cam: Camera, t: number) {
  const M = cam.moves;
  if (!M.length) return 1;
  let v: number;
  if (t <= M[0].start) v = M[0].from;
  else if (t >= M[M.length - 1].end) v = M[M.length - 1].to;
  else {
    v = 1;
    for (let i = 0; i < M.length; i++) {
      const m = M[i];
      if (t >= m.start && t <= m.end) { v = m.from + (m.to - m.from) * ease((t - m.start) / Math.max(0.01, m.end - m.start)); break; }
      const n = M[i + 1];
      if (n && t > m.end && t < n.start) { v = m.to + (n.from - m.to) * ease((t - m.end) / (n.start - m.end)); break; }
    }
  }
  for (const h of cam.hits) {
    const d = t - h.t;
    if (d < -0.3 || d > 1.2) continue;
    v += h.a * Math.exp(-((d / (d < 0 ? 0.07 : 0.32)) ** 2)); // sobe rápido, assenta devagar
  }
  return v;
}

/** fator de zoom no tempo t: os zooms manuais (punch-in) vezes a câmera da fala */
export function zoomAt(p: Project, t: number, cam: Camera = NO_CAMERA) {
  let punch = 1;
  for (const z of p.zooms) {
    if (t < z.start || t > z.end) continue;
    const amt = z.scale / 100 - 1;
    const len = Math.max(0.1, z.end - z.start);
    if (z.tipo === "push") punch = 1 + amt * ease((t - z.start) / len);
    else if (z.tipo === "pull") punch = 1 + amt * (1 - ease((t - z.start) / len));
    else if (z.tipo === "tremida" || z.tipo === "chicote") punch = 1 + amt * 0.5 * Math.max(0, 1 - (t - z.start) / 0.5);
    else punch = 1 + amt * Math.max(0, Math.min(1, (t - z.start) / 0.12, (z.end - t) / 0.12));
    break;
  }
  let jump = 1;
  if (p.jumpPunch && p.jumpPunch > 100) {
    const L = layout(p);
    const i = L.findIndex((l) => t >= l.start && t < l.end);
    if (i % 2 === 1) jump = p.jumpPunch / 100;
  }
  return punch * jump * transitionZoom(p, t) * cameraAt(cam, t);
}

/** deslocamento da câmera (tremida e chicote) no tempo t */
export function shakeAt(p: Project, t: number) {
  for (const z of p.zooms) {
    if (t < z.start || t > z.end) continue;
    const e = t - z.start;
    if (z.tipo === "tremida" && e < 0.5) { const a = 26 * U * (1 - e / 0.5); return { x: Math.sin(e * 90) * a, y: Math.cos(e * 70) * a * 0.7, blur: 0 }; }
    if (z.tipo === "chicote" && e < 0.35) { const k = Math.sin((e / 0.35) * Math.PI); return { x: k * W * 0.08, y: 0, blur: Math.round(k * 22) }; }
  }
  return { x: 0, y: 0, blur: 0 };
}

/** desenha a imagem cobrindo o quadro, com zoom no centro; take vertical em saída horizontal entra inteiro sobre um fundo desfocado */
export function drawCover(ctx: Ctx, src: CanvasImageSource, sw: number, sh: number, zoom = 1, already916 = false, fx?: { x: number; y: number; blur: number }) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (!sw || !sh) return;
  if (fx && (fx.x || fx.y || fx.blur)) {
    ctx.save(); ctx.translate(fx.x, fx.y); if (fx.blur) ctx.filter = `blur(${fx.blur}px)`;
    drawCover(ctx, src, sw, sh, zoom * (fx.x || fx.y ? 1.06 : 1), already916);
    ctx.restore();
    return;
  }
  if (isWide() && sw / sh < 1) {
    const cs = Math.max(W / sw, H / sh) * 1.08;
    ctx.save();
    ctx.filter = "blur(36px) brightness(.55)";
    ctx.drawImage(src, (W - sw * cs) / 2, (H - sh * cs) / 2, sw * cs, sh * cs);
    ctx.restore();
    const s = (H / sh) * zoom;
    ctx.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
    return;
  }
  let s = already916 ? W / sw : Math.max(W / sw, H / sh);
  s *= zoom;
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function wrapLines(ctx: Ctx, words: string[], max: number) {
  const lines: string[][] = [[]];
  for (const w of words) {
    const line = lines[lines.length - 1];
    const test = [...line, w].join(" ");
    if (line.length && ctx.measureText(test).width > max) lines.push([w]); else line.push(w);
  }
  return lines;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** estilos de legenda disponíveis (o catálogo numerado combina estes com cortes, câmera, transição e cor) */
export const CAPTION_STYLES: [string, string][] = [
  ["mix", "Mix tipográfico (bold condensada + itálica em destaque, muda de lugar a cada frase)"],
  ["palavra", "Uma palavra por vez (pequena, no centro, estilo talking head)"],
  ["bold", "Bold (branca pesada com sombra, palavra-chave colorida)"],
  ["hormozi", "Hormozi (caixa alta, contorno, palavra dita em destaque e números em verde)"],
  ["impacto", "Impacto (caixa alta, contorno, palavra dita em destaque)"],
  ["karaoke", "Karaokê (a cor varre a palavra enquanto ela é dita)"],
  ["caixa", "Caixa colorida atrás da palavra"],
  ["bloco", "Blocos tortos (cada palavra num bloco, estilo colagem)"],
  ["serifa", "Sans + serifa itálica (palavras fortes em itálico)"],
  ["minimal", "Minimal (minúsculas, pequena, sem contorno)"],
  ["neon", "Neon (brilho na cor de destaque)"],
  ["editorial", "Editorial (serifada, discreta)"],
  ["documental", "Documental (faixa simples embaixo)"],
  ["classico", "Clássico (branca sobre faixa translúcida)"],
  ["maquina", "Máquina de escrever (letra a letra, monoespaçada)"],
  ["revelar", "Revelar (a frase inteira aparece apagada e acende conforme é dita)"],
  ["brilho", "Brilho (branca grande com brilho suave, uma ideia por tela)"],
];
export const CAPTION_ANIMS: [string, string][] = [["pop", "Pop (cresce e assenta)"], ["sobe", "Sobe (entra de baixo)"], ["desfoque", "Desfoque (entra nítida)"], ["flash", "Flash (cada palavra pisca numa caixa branca ao entrar)"], ["nenhuma", "Sem animação"]];

/** legenda da tela atual no estilo do kit */
export function drawCaption(ctx: Ctx, screen: ReturnType<typeof captionScreens>[number] | undefined, t: number, kit: Kit) {
  if (!screen) return;
  const st = kit.legenda?.estilo || "impacto";
  if (st === "palavra") {
    // só a palavra que está sendo dita (ou a última dita)
    const said = screen.words.filter((w) => t >= w.start);
    const cur = said[said.length - 1] || screen.words[0];
    screen = { ...screen, words: [cur] };
  } else if (st === "brilho") {
    // brilho: só o que já foi dito, sempre centralizado
    const said = screen.words.filter((w) => t >= w.start);
    screen = { ...screen, words: said.length ? said : screen.words.slice(0, 1) };
  }
  const idx = Math.round(screen.start * 7) % 3;
  const anim = kit.legenda?.animacao || "pop";
  const e = Math.max(0, Math.min(1, (t - screen.start) / 0.18));
  ctx.save();
  if (anim !== "nenhuma" && e < 1) {
    const cy = H * (kit.legenda?.altura || 0.64);
    if (anim === "pop") { const sc = 0.82 + 0.18 * (1 - Math.pow(1 - e, 3)) + 0.04 * Math.sin(e * Math.PI); ctx.translate(W / 2, cy); ctx.scale(sc, sc); ctx.translate(-W / 2, -cy); }
    else if (anim === "sobe") { ctx.translate(0, (1 - e) * 60 * U); ctx.globalAlpha = e; }
    else if (anim === "desfoque") { ctx.filter = `blur(${Math.round((1 - e) * 14)}px)`; ctx.globalAlpha = 0.3 + 0.7 * e; }
  }
  if (st === "mix") { drawMixCaption(ctx, screen, t, kit, idx); ctx.restore(); return; }
  if (st === "maquina") { drawTypewriter(ctx, screen, t, kit); ctx.restore(); return; }
  drawCaptionInner(ctx, screen, t, kit, st, idx);
  ctx.restore();
}

function drawCaptionInner(ctx: Ctx, screen: ReturnType<typeof captionScreens>[number], t: number, kit: Kit, st: string, idx: number) {
  const hi = kit.cores?.destaque || "#F5C84C";
  const fg = kit.cores?.texto || "#FFFFFF";
  const bg = kit.cores?.fundo || "#0c0c0d";
  const upper = (!!kit.legenda?.caixa_alta && !["editorial", "minimal", "serifa", "palavra", "revelar", "brilho"].includes(st)) || st === "hormozi";
  let y0 = H * (isWide() ? kit.legenda?.altura_h || 0.84 : kit.legenda?.altura || 0.64);
  if (kit.legenda?.posicao === "variavel" && !isWide()) y0 = H * [0.62, 0.42, 0.72][idx];
  if (st === "palavra") y0 = H * (isWide() ? 0.5 : 0.5);
  const base = ({ editorial: 92, documental: 54, caixa: 70, minimal: 52, serifa: 74, bloco: 72, neon: 80, karaoke: 84, palavra: 58, bold: 82, hormozi: 86, classico: 56, revelar: 76, brilho: 104 } as Record<string, number>)[st] ?? 84;
  const size = U * base;
  const fontOf = (raw: string) => {
    if (st === "editorial") return css("Instrument Serif", size, true);
    if (st === "minimal" || st === "classico") return css((kit.fontes?.legenda || "Inter").replace(/\s+(Black|ExtraBold|Bold)$/i, "") + " Medium", size);
    if (st === "palavra" || st === "revelar") return css((kit.fontes?.legenda || "Inter").replace(/\s+(Black|ExtraBold|Bold)$/i, "") + " Bold", size);
    if (st === "serifa" && isHot(raw)) return css("Instrument Serif", size * 1.25, true);
    return css(kit.fontes?.legenda, size);
  };
  ctx.textBaseline = "middle";
  const items = screen.words.map((w) => {
    const txt = st === "minimal" ? w.t.toLowerCase() : upper ? w.t.toUpperCase() : w.t;
    ctx.font = fontOf(w.t);
    return { w, txt, font: ctx.font, width: ctx.measureText(txt).width };
  });
  ctx.font = css(kit.fontes?.legenda, size);
  const space = ctx.measureText(" ").width * (st === "bloco" ? 1.6 : 1);
  const maxW = isWide() ? W * 0.62 : W * 0.84;
  const lines: (typeof items)[] = [[]];
  let lw = 0;
  for (const it of items) {
    const cur = lines[lines.length - 1];
    if (cur.length && lw + space + it.width > maxW) { lines.push([it]); lw = it.width; } else { cur.push(it); lw += (cur.length > 1 ? space : 0) + it.width; }
  }
  const lh = size * (st === "bloco" ? 1.45 : 1.18);
  lines.forEach((line, li) => {
    const y = y0 + (li - (lines.length - 1) / 2) * lh;
    const total = line.reduce((a, b) => a + b.width, 0) + space * (line.length - 1);
    let x = (W - total) / 2;
    line.forEach((it, wi) => {
      const word = it.w, w = it.txt, ww = it.width;
      const active = t >= word.start && t < word.end + 0.05;
      const said = t >= word.start;
      const hot = active || (said && isHot(word.t));
      ctx.save();
      ctx.font = it.font;
      if (kit.legenda?.animacao === "flash" && said && t - word.start < 0.09) {
        // flash: nos primeiros quadros a palavra aparece invertida numa caixa branca
        ctx.fillStyle = "#fff"; ctx.fillRect(x - 10, y - size * 0.62, ww + 20, size * 1.24);
        ctx.fillStyle = "#0c0c0d"; ctx.fillText(w, x, y);
      } else if (st === "revelar") {
        ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 18;
        ctx.fillStyle = said && isHot(word.t) ? hi : fg; ctx.globalAlpha = said ? 1 : 0.32;
        ctx.fillText(w, x, y);
      } else if (st === "brilho") {
        if (!said) { ctx.restore(); x += ww + space; return; }
        ctx.shadowColor = "rgba(255,255,255,.9)"; ctx.shadowBlur = active ? 46 : 30;
        ctx.fillStyle = "#fff"; ctx.fillText(w, x, y);
        ctx.shadowBlur = 10; ctx.fillText(w, x, y);
      } else if (st === "impacto") {
        const pop = active ? 1 + 0.12 * Math.max(0, 1 - (t - word.start) / 0.12) : 1;
        ctx.translate(x + ww / 2, y); ctx.scale(pop, pop); ctx.translate(-(x + ww / 2), -y);
        ctx.lineJoin = "round"; ctx.lineWidth = size * 0.16; ctx.strokeStyle = "#000";
        ctx.strokeText(w, x, y);
        ctx.fillStyle = hot ? hi : fg; ctx.globalAlpha = said ? 1 : 0.55;
        ctx.fillText(w, x, y);
      } else if (st === "karaoke") {
        ctx.lineJoin = "round"; ctx.lineWidth = size * 0.16; ctx.strokeStyle = "#000";
        ctx.strokeText(w, x, y);
        ctx.fillStyle = fg; ctx.fillText(w, x, y);
        const f = word.end > word.start ? Math.max(0, Math.min(1, (t - word.start) / (word.end - word.start))) : said ? 1 : 0;
        if (f > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - size, (ww + 8) * f, size * 2); ctx.clip(); ctx.fillStyle = hi; ctx.fillText(w, x, y); ctx.restore(); }
      } else if (st === "caixa") {
        if (active) { ctx.fillStyle = hi; roundRect(ctx, x - 12, y - size * 0.62, ww + 24, size * 1.24, 14); ctx.fill(); }
        ctx.fillStyle = active ? "#0c0c0d" : fg; ctx.shadowColor = active ? "transparent" : "rgba(0,0,0,.7)"; ctx.shadowBlur = 16;
        ctx.fillText(w, x, y);
      } else if (st === "bloco") {
        if (!said) { ctx.restore(); x += ww + space; return; }
        const rot = ((wi + li) % 2 ? 1 : -1) * 0.04;
        const pop = active ? 1 + 0.1 * Math.max(0, 1 - (t - word.start) / 0.12) : 1;
        ctx.translate(x + ww / 2, y); ctx.rotate(rot); ctx.scale(pop, pop); ctx.translate(-(x + ww / 2), -y);
        ctx.fillStyle = hot ? hi : fg; ctx.fillRect(x - 16, y - size * 0.62, ww + 32, size * 1.24);
        ctx.fillStyle = bg; ctx.fillText(w, x, y + size * 0.04);
      } else if (st === "serifa") {
        ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 20;
        ctx.fillStyle = isHot(word.t) ? hi : fg; ctx.globalAlpha = said ? 1 : 0.45;
        ctx.fillText(w, x, y);
      } else if (st === "minimal") {
        ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 14;
        ctx.fillStyle = fg; ctx.globalAlpha = said ? 1 : 0.4;
        ctx.fillText(w, x, y);
      } else if (st === "palavra") {
        ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 18;
        ctx.fillStyle = isHot(word.t) ? hi : fg; ctx.fillText(w, x, y);
      } else if (st === "bold") {
        ctx.shadowColor = "rgba(0,0,0,.75)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
        ctx.fillStyle = isHot(word.t) && said ? hi : fg; ctx.globalAlpha = said ? 1 : 0.6;
        ctx.fillText(w, x, y);
      } else if (st === "hormozi") {
        const pop = active ? 1 + 0.1 * Math.max(0, 1 - (t - word.start) / 0.12) : 1;
        ctx.translate(x + ww / 2, y); ctx.scale(pop, pop); ctx.translate(-(x + ww / 2), -y);
        ctx.lineJoin = "round"; ctx.lineWidth = size * 0.18; ctx.strokeStyle = "#000"; ctx.strokeText(w, x, y);
        ctx.fillStyle = /\d/.test(word.t) ? "#3DDC84" : active ? hi : fg;
        ctx.fillText(w, x, y);
      } else if (st === "classico") {
        ctx.fillStyle = "rgba(0,0,0,.6)"; roundRect(ctx, x - 10, y - size * 0.66, ww + 20, size * 1.32, 8); ctx.fill();
        ctx.fillStyle = fg; ctx.fillText(w, x, y);
      } else if (st === "neon") {
        ctx.globalAlpha = said ? 1 : 0.35;
        ctx.shadowColor = hi; ctx.shadowBlur = active ? 40 : 22;
        ctx.fillStyle = active ? "#fff" : hi; ctx.fillText(w, x, y);
        ctx.shadowBlur = 8; ctx.fillText(w, x, y);
      } else if (st === "editorial") {
        ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 24;
        ctx.fillStyle = hot ? hi : fg; ctx.globalAlpha = said ? 1 : 0.5;
        ctx.fillText(w, x, y);
      } else {
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x - 8, y - size * 0.6, ww + 16 + (wi < line.length - 1 ? space : 0), size * 1.2);
        ctx.fillStyle = fg; ctx.fillText(w, x, y);
      }
      ctx.restore();
      x += ww + space;
    });
  });
}

/** mix tipográfico: palavras comuns em bold condensada, as fortes em serifa itálica na cor de destaque, empilhadas; o bloco muda de lugar a cada frase */
function drawMixCaption(ctx: Ctx, screen: ReturnType<typeof captionScreens>[number], t: number, kit: Kit, idx: number) {
  const hi = kit.cores?.destaque || "#F5C84C", fg = kit.cores?.texto || "#fff";
  const said = screen.words.filter((w) => t >= w.start - 0.02);
  if (!said.length) return;
  const wide = isWide();
  const size = wide ? 80 : 128;
  const hotIdx = screen.words.findIndex((w) => isHot(w.t));
  const accent = hotIdx >= 0 ? hotIdx : screen.words.length - 1;
  // linhas: até o destaque numa linha, o destaque (itálico) noutra, o resto noutra
  const parts: { txt: string; italic: boolean; w: (typeof said)[number][] }[] = [];
  const before = screen.words.slice(0, accent), acc = screen.words[accent], after = screen.words.slice(accent + 1);
  if (before.length) parts.push({ txt: before.map((w) => w.t).join(" "), italic: false, w: before });
  parts.push({ txt: acc.t, italic: true, w: [acc] });
  if (after.length) parts.push({ txt: after.map((w) => w.t).join(" "), italic: false, w: after });
  const cx = wide ? [W * 0.28, W * 0.72, W * 0.5][idx] : W / 2;
  const cy = wide ? H * 0.72 : H * [0.66, 0.3, 0.5][idx];
  const lh = size * 0.98;
  ctx.textBaseline = "middle";
  parts.forEach((pt, i) => {
    if (!pt.w.some((w) => t >= w.start - 0.02)) return;
    const txt = pt.italic ? pt.txt.toLowerCase().replace(/[.,!?]+$/, "") : pt.txt.toUpperCase();
    ctx.font = pt.italic ? css("Instrument Serif", size * 1.15, true) : css(kit.fontes?.titulo || "Anton", size * 0.86);
    const tw = ctx.measureText(txt).width;
    const sc = Math.min(1, (W * (wide ? 0.4 : 0.86)) / tw);
    const y = cy + (i - (parts.length - 1) / 2) * lh;
    const k = Math.min(1, (t - pt.w[0].start) / 0.16);
    ctx.save();
    ctx.globalAlpha *= Math.max(0, k);
    ctx.translate(cx, y + (1 - k) * 18); ctx.scale(sc, sc);
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 24;
    ctx.fillStyle = pt.italic ? hi : fg;
    ctx.fillText(txt, -tw / 2, 0);
    ctx.restore();
  });
}

/** máquina de escrever: as letras aparecem uma a uma, com cursor */
function drawTypewriter(ctx: Ctx, screen: ReturnType<typeof captionScreens>[number], t: number, kit: Kit) {
  const fg = kit.cores?.texto || "#fff", hi = kit.cores?.destaque || "#F5C84C";
  const full = screen.words.map((w) => w.t).join(" ").toLowerCase();
  const dur = Math.max(0.2, (screen.words[screen.words.length - 1].end - screen.start) * 0.85);
  const n = Math.round(full.length * Math.min(1, (t - screen.start) / dur));
  const size = 58 * U;
  ctx.font = css("JetBrains Mono", size);
  ctx.textBaseline = "middle";
  const lines = wrapLines(ctx, full.slice(0, n).split(" "), W * 0.8);
  const y0 = H * (isWide() ? 0.84 : kit.legenda?.altura || 0.64);
  lines.forEach((ln, i) => {
    const tx = ln.join(" ");
    const tw = ctx.measureText(tx).width;
    const x = (W - ctx.measureText(full.slice(0, Math.min(full.length, 34))).width) / 2;
    const y = y0 + (i - (lines.length - 1) / 2) * size * 1.3;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x - 14, y - size * 0.7, tw + 28 + (i === lines.length - 1 ? size * 0.7 : 0), size * 1.4);
    ctx.fillStyle = fg; ctx.fillText(tx, x, y);
    if (i === lines.length - 1 && Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = hi; ctx.fillRect(x + tw + 6, y - size * 0.5, size * 0.5, size); }
  });
}

/* ---------- look (cor), grão e transições entre cortes ---------- */

export const LOOKS: [string, string][] = [["natural", "Natural"], ["quente", "Quente"], ["frio", "Frio"], ["contraste", "Contraste alto"], ["filme", "Filme (grão e vinheta)"], ["pb", "Preto e branco"]];
export const TRANSITIONS: [string, string][] = [["corte", "Corte seco"], ["zoom", "Zoom de impacto"], ["flash", "Flash branco"], ["preto", "Mergulho no preto"], ["blur", "Desfoque"], ["glitch", "Glitch"]];
const LOOK_FILTER: Record<string, string> = {
  quente: "sepia(.18) saturate(1.15) brightness(1.03)", frio: "saturate(.9) hue-rotate(-8deg) brightness(1.02) contrast(1.05)",
  contraste: "contrast(1.22) saturate(1.2)", filme: "contrast(1.08) saturate(.82) sepia(.12)", pb: "grayscale(1) contrast(1.15)",
};
let grain: OffscreenCanvas | HTMLCanvasElement | null = null;
function grainTile() {
  if (grain) return grain;
  const c: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement("canvas"), { width: 256, height: 256 });
  const g = c.getContext("2d") as Ctx;
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return (grain = c);
}
export function drawLook(ctx: Ctx, p: Project, t: number) {
  const look = p.look || "natural";
  if (look !== "natural" && LOOK_FILTER[look]) { ctx.save(); ctx.filter = LOOK_FILTER[look]; ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, W, H); ctx.restore(); }
  if (look === "filme" || look === "pb" || p.grao) {
    ctx.save();
    ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = "overlay";
    const tile = grainTile(); const ox = Math.floor((t * 977) % 256), oy = Math.floor((t * 613) % 256);
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(tile as CanvasImageSource, x, y);
    ctx.restore();
  }
  if (look === "filme" || look === "pb") {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
/** distância (s) até o corte mais próximo entre trechos; o primeiro e o último não contam */
export function nearestCut(p: Project, t: number) {
  let best = Infinity, at = 0;
  const L = layout(p);
  for (let i = 1; i < L.length; i++) { const d = t - L[i].start; if (Math.abs(d) < Math.abs(best)) { best = d; at = L[i].start; } }
  return { d: best, at };
}
export function drawTransition(ctx: Ctx, p: Project, t: number) {
  const tr = p.transicao || "corte";
  if (tr === "corte" || tr === "zoom") return;
  const { d } = nearestCut(p, t);
  const R = tr === "preto" ? 0.3 : 0.2;
  if (Math.abs(d) > R) return;
  const k = 1 - Math.abs(d) / R; // 1 no corte, 0 nas pontas
  ctx.save();
  if (tr === "flash") { ctx.globalAlpha = Math.pow(k, 1.5) * 0.9; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }
  else if (tr === "preto") { ctx.globalAlpha = Math.min(1, k * 1.3); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
  else if (tr === "blur") { ctx.filter = `blur(${Math.round(k * 24)}px)`; ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, W, H); }
  else if (tr === "glitch") {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const y = Math.floor(((Math.sin(i * 91.7 + Math.floor(t * 30) * 12.9) + 1) / 2) * H);
      const h = Math.floor(H * (0.02 + 0.05 * ((i * 37) % 5) / 5));
      const dx = Math.round((Math.sin(i * 13.1 + t * 50) * 60) * k);
      ctx.drawImage(ctx.canvas as CanvasImageSource, 0, y, W, h, dx, y, W, h);
    }
    ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.35 * k;
    ctx.drawImage(ctx.canvas as CanvasImageSource, 12 * k, 0, W, H);
  }
  ctx.restore();
}
/** zoom de impacto: o quadro entra fechado e abre logo depois do corte */
export function transitionZoom(p: Project, t: number) {
  if (p.transicao !== "zoom") return 1;
  const { d } = nearestCut(p, t);
  if (d < 0 || d > 0.3) return 1;
  const k = 1 - d / 0.3;
  return 1 + 0.18 * k * k;
}

export function drawTitle(ctx: Ctx, tt: Title, t: number, kit: Kit, all: Title[] = []) {
  const fg = kit.cores?.texto || "#fff";
  const hi = kit.cores?.destaque || "#F5C84C";
  const bg = kit.cores?.fundo || "#0c0c0d";
  const k = tt.start < 0.05 ? 1 : Math.min(1, (t - tt.start) / 0.25); // o que abre o vídeo já entra pronto (vira a capa)
  const out = Math.min(1, (tt.end - t) / 0.2);
  const wide = isWide();
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(k, out));
  ctx.textBaseline = "middle";
  if (tt.kind === "lower_third") {
    ctx.font = css(kit.fontes?.legenda, 46 * U);
    const subH = tt.sub ? 34 * U : 0;
    const w = Math.max(ctx.measureText(tt.text).width, tt.sub ? ctx.measureText(tt.sub).width * 0.7 : 0) + 60 * U;
    const bh = 96 * U + subH;
    const x = (wide ? 110 : 70) - (1 - k) * 60, y = H * (wide ? 0.68 : 0.8);
    ctx.fillStyle = bg; ctx.globalAlpha *= 0.85;
    roundRect(ctx, x, y, w, bh, 16 * U); ctx.fill();
    ctx.globalAlpha = Math.max(0, Math.min(k, out)); ctx.fillStyle = hi; ctx.fillRect(x, y, 10 * U, bh);
    ctx.fillStyle = fg; ctx.fillText(tt.text, x + 34 * U, y + 48 * U);
    if (tt.sub) { ctx.font = css(kit.fontes?.legenda?.replace(/\s+(Black|ExtraBold|Bold)$/i, "") + " Medium", 30 * U); ctx.fillStyle = hi; ctx.fillText(tt.sub, x + 34 * U, y + 48 * U + subH + 4 * U); }
  } else if (tt.kind === "episodio") {
    // abertura da série: o próprio quadro desfocado por trás, título grande e a linha do episódio/ano na cor de destaque
    ctx.save(); ctx.globalAlpha = 1; ctx.filter = `blur(${Math.round(18 * Math.min(k, out))}px)`;
    ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(0, 0, W, H);
    const size = wide ? 120 : 112;
    ctx.font = css(kit.fontes?.titulo, size);
    const lines = wrapLines(ctx, tt.text.toUpperCase().split(/\s+/), W * (wide ? 0.66 : 0.86));
    const lh = size * 1.08;
    const subSize = size * 0.85;
    const block = lines.length * lh + (tt.sub ? subSize * 1.1 : 0);
    const y0 = H / 2 - block / 2 + lh / 2 + (1 - k) * 30;
    ctx.lineJoin = "round"; ctx.lineWidth = size * 0.1; ctx.strokeStyle = "rgba(0,0,0,.85)";
    lines.forEach((line, i) => { const tx = line.join(" "); const x = (W - ctx.measureText(tx).width) / 2; ctx.strokeText(tx, x, y0 + i * lh); ctx.fillStyle = fg; ctx.fillText(tx, x, y0 + i * lh); });
    if (tt.sub) {
      ctx.font = css(kit.fontes?.titulo, subSize);
      const sub = tt.sub.toUpperCase(); const x = (W - ctx.measureText(sub).width) / 2, y = y0 + lines.length * lh + subSize * 0.15;
      ctx.lineWidth = subSize * 0.1; ctx.strokeText(sub, x, y); ctx.fillStyle = hi; ctx.fillText(sub, x, y);
    }
  } else if (tt.kind === "capitulo") {
    // roda de capítulos: números empilhados à esquerda, o atual em destaque e uma linha até o nome
    const caps = all.filter((x) => x.kind === "capitulo").sort((x, y) => x.start - y.start);
    const n = Math.max(1, caps.findIndex((x) => x.id === tt.id) + 1);
    const total = Math.max(caps.length, 12); // como um relógio: depois do último volta ao 01
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, W, H);
    const x0 = wide ? 150 : 90, yc = H * (wide ? 0.42 : 0.38), step = wide ? 100 : 110;
    const roll = (1 - k) * step; // a roda gira até o número atual
    for (let d = -3; d <= 3; d++) {
      const num = ((n - 1 + d) % total + total) % total + 1;
      const y = yc + d * step + roll;
      const a = d === 0 ? 1 : Math.max(0, 0.55 - Math.abs(d) * 0.12);
      ctx.globalAlpha = a * Math.max(0, Math.min(k, out));
      ctx.font = css("JetBrains Mono", d === 0 ? 64 : 44);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(num).padStart(2, "0"), x0 + Math.abs(d) * (wide ? 14 : 10), y);
    }
    ctx.globalAlpha = Math.max(0, Math.min(k, out));
    const lx = x0 + 110, lw = (wide ? W * 0.32 : W * 0.3) * k;
    ctx.fillStyle = hi; ctx.fillRect(lx, yc - 2, lw, 5);
    ctx.font = css(kit.fontes?.legenda?.replace(/\s+(Black|ExtraBold|Bold)$/i, "") || "Inter", wide ? 64 : 58);
    ctx.fillStyle = fg; ctx.fillText(tt.text, lx + lw + 24, yc);
    if (tt.sub) { ctx.font = css("JetBrains Mono", 28); ctx.fillStyle = hi; ctx.fillText(tt.sub.toUpperCase(), lx + lw + 26, yc + (wide ? 56 : 52)); }
  } else if (tt.kind === "frase") {
    // frase de impacto: o quadro escurece e a frase ocupa o centro
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, W, H);
    const size = wide ? 112 : 104;
    ctx.font = css(kit.fontes?.titulo, size);
    const lines = wrapLines(ctx, tt.text.toUpperCase().split(/\s+/), W * (wide ? 0.62 : 0.84));
    const lh = size * 1.1;
    const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
    const sc = 0.94 + 0.06 * k;
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    lines.forEach((line, i) => {
      const words = line;
      const total = ctx.measureText(words.join(" ")).width;
      let x = (W - total) / 2;
      words.forEach((w) => { ctx.fillStyle = tt.sub && tt.sub.toUpperCase().split(/\s+/).includes(w.replace(/[^\p{L}\p{N}]/gu, "")) ? hi : fg; ctx.fillText(w, x, y0 + i * lh); x += ctx.measureText(w + " ").width; });
    });
  } else if (tt.kind === "letreiro") {
    // letreiro: palavra gigante com as letras espaçadas por pontos (M.A.L.Í.C.I.A), no alto do quadro
    const word = tt.text.toUpperCase().replace(/\s+/g, "").split("").join(".");
    let size = wide ? 170 : 150;
    ctx.font = css(kit.fontes?.legenda || "Inter Black", size);
    const maxW = W * 0.92;
    const w0 = ctx.measureText(word).width;
    if (w0 > maxW) { size *= maxW / w0; ctx.font = css(kit.fontes?.legenda || "Inter Black", size); }
    const tw = ctx.measureText(word).width;
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 30;
    ctx.fillStyle = fg; ctx.fillText(word, (W - tw) / 2, H * (wide ? 0.13 : 0.12) + (1 - k) * -30);
  } else if (tt.kind === "data") {
    // data e lugar do vlog: duas linhas pequenas e limpas no centro
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 18;
    ctx.font = css("Inter Medium", wide ? 56 : 54);
    const tw = ctx.measureText(tt.text).width;
    ctx.fillStyle = "#fff"; ctx.fillText(tt.text, (W - tw) / 2, H * 0.24);
    if (tt.sub) { ctx.font = css("Inter Medium", wide ? 40 : 40); const sw = ctx.measureText(tt.sub).width; ctx.globalAlpha *= 0.85; ctx.fillText(tt.sub, (W - sw) / 2, H * 0.24 + (wide ? 62 : 60)); }
  } else if (tt.kind === "lista") {
    // tela de explicação: fundo escuro, título e itens com seta escrita à mão
    ctx.fillStyle = bg; ctx.globalAlpha = Math.max(0, Math.min(k, out)); ctx.fillRect(0, 0, W, H);
    const items = (tt.sub || "").split(/\s*[|;\n]\s*/).filter(Boolean);
    const tsize = wide ? 86 : 80;
    ctx.font = css(kit.fontes?.titulo, tsize);
    const tl = wrapLines(ctx, tt.text.split(/\s+/), W * 0.8);
    const top = H * (wide ? 0.2 : 0.22);
    tl.forEach((line, i) => { const tx = line.join(" "); ctx.fillStyle = hi; ctx.fillText(tx, (W - ctx.measureText(tx).width) / 2, top + i * tsize * 1.1); });
    const isize = wide ? 58 : 54;
    const y1 = top + tl.length * tsize * 1.1 + isize;
    const xL = wide ? W * 0.3 : W * 0.14;
    items.forEach((it, i) => {
      const show = Math.min(1, Math.max(0, (t - tt.start - 0.35 - i * 0.45) / 0.3));
      if (show <= 0) return;
      ctx.globalAlpha = show * Math.max(0, out);
      const y = y1 + i * isize * 1.6;
      ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(xL, y + 6); ctx.quadraticCurveTo(xL + 60, y - 14, xL + 120 * show, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xL + 120 * show - 18, y - 16); ctx.lineTo(xL + 120 * show, y); ctx.lineTo(xL + 120 * show - 20, y + 14); ctx.stroke();
      ctx.font = css("Instrument Serif", isize); ctx.fillStyle = fg; ctx.fillText(it, xL + 150, y);
    });
  } else if (tt.kind === "rec") {
    // câmera REC: preto e branco, cantoneiras, ponto vermelho piscando e timecode
    ctx.save(); ctx.globalAlpha = 1; ctx.filter = "grayscale(1) contrast(1.1)"; ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, W, H); ctx.restore();
    const m = wide ? 70 : 60, L = wide ? 110 : 90;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
    const corners: [number, number, number, number][] = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]];
    corners.forEach(([x, y, dx, dy]) => { ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke(); });
    ctx.font = css("JetBrains Mono", 40); ctx.fillStyle = "#fff";
    if (Math.floor((t - tt.start) * 2) % 2 === 0) { ctx.fillStyle = "#e5242b"; ctx.beginPath(); ctx.arc(m + 50, m + 60, 16, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.fillText(tt.text || "REC", m + 80, m + 62);
    const el = Math.max(0, t - tt.start);
    const tc = `00:${String(Math.floor(el / 60)).padStart(2, "0")}:${String(Math.floor(el % 60)).padStart(2, "0")}:${String(Math.floor((el % 1) * 30)).padStart(2, "0")}`;
    ctx.font = css("JetBrains Mono", 30); const tcw = ctx.measureText(tc).width;
    ctx.fillText(tc, (W - tcw) / 2, H - m - 40);
    ctx.fillText(tt.sub || "4K UHD", m + 30, H - m - 40);
  } else if (tt.kind === "vazado") {
    // texto vazado: grande, meio transparente, no espaço vazio ao lado de quem fala; 1ª linha bold, 2ª em itálico
    const big = (wide ? 190 : 210) * (tt.text.length > 9 ? 9 / tt.text.length : 1);
    const left = Math.round(tt.start * 3) % 2 === 0;
    const x0 = wide ? (left ? W * 0.06 : W * 0.52) : W * 0.07;
    const y0 = wide ? H * 0.36 : H * 0.2;
    const blur = Math.round((1 - k) * 16);
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = 0.82 * Math.max(0, Math.min(k, out));
    ctx.font = css(kit.fontes?.titulo, big);
    ctx.fillStyle = fg; ctx.fillText(tt.text.toLowerCase(), x0, y0 + (1 - k) * 40);
    if (tt.sub) { ctx.font = css("Instrument Serif", big * 0.78, true); ctx.fillStyle = hi; ctx.fillText(tt.sub.toLowerCase(), x0 + big * 0.35, y0 + big * 0.86 + (1 - k) * 60); }
  } else if (tt.kind === "riscado") {
    // riscado e corrigido: a palavra "errada" aparece, um traço a corta e a certa entra embaixo
    const size = wide ? 110 : 120;
    const cx = wide ? W * 0.74 : W / 2, cy = wide ? H * 0.4 : H * 0.24;
    ctx.globalAlpha = Math.max(0, Math.min(k, out));
    ctx.font = css((kit.fontes?.legenda || "Inter").replace(/\s+(Black|ExtraBold|Bold)$/i, "") + " Medium", size);
    const a = tt.text.toLowerCase(), aw = ctx.measureText(a).width;
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 20;
    ctx.fillStyle = fg; ctx.fillText(a, cx - aw / 2, cy);
    const el = t - tt.start;
    const f = Math.max(0, Math.min(1, (el - 0.35) / 0.25));
    if (f > 0) { ctx.shadowColor = "transparent"; ctx.strokeStyle = "#e5242b"; ctx.lineWidth = size * 0.08; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx - aw / 2 - 10, cy + size * 0.04); ctx.lineTo(cx - aw / 2 - 10 + (aw + 20) * f, cy - size * 0.04); ctx.stroke(); }
    const g = Math.max(0, Math.min(1, (el - 0.65) / 0.2));
    if (tt.sub && g > 0) {
      ctx.globalAlpha = Math.max(0, Math.min(g, out)); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 20;
      ctx.font = css(kit.fontes?.legenda, size * 1.05); const b = tt.sub.toLowerCase(), bw = ctx.measureText(b).width;
      ctx.fillStyle = fg; ctx.fillText(b, cx - bw / 2, cy + size * 1.05 + (1 - g) * 30);
    }
  } else if (MOTION_KINDS.includes(tt.kind)) {
    drawMotion(ctx, tt, t, kit, Math.max(0, Math.min(k, out)));
  } else if (tt.kind === "palavra") {
    // palavra-chave que aparece do lado de quem fala (horizontal) ou no alto (vertical)
    const size = wide ? 120 : 120;
    ctx.font = css(kit.fontes?.titulo, size);
    const txt = tt.text.toUpperCase();
    const tw = ctx.measureText(txt).width;
    const pop = 1 + 0.15 * Math.max(0, 1 - (t - tt.start) / 0.15);
    const cx = wide ? W * 0.76 : W / 2, cy = wide ? H * 0.42 : H * 0.24;
    ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.rotate(-0.03); ctx.translate(-cx, -cy);
    ctx.fillStyle = hi; roundRect(ctx, cx - tw / 2 - 36, cy - size * 0.62, tw + 72, size * 1.24, 20); ctx.fill();
    ctx.fillStyle = bg; ctx.fillText(txt, cx - tw / 2, cy + 4);
    if (tt.sub) { ctx.font = css(kit.fontes?.legenda, 40); const sw = ctx.measureText(tt.sub).width; ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = "#000"; ctx.strokeText(tt.sub, cx - sw / 2, cy + size * 0.95); ctx.fillStyle = fg; ctx.fillText(tt.sub, cx - sw / 2, cy + size * 0.95); }
  } else {
    const size = (tt.kind === "gancho" ? 104 : 88) * (wide ? 0.9 : 1);
    ctx.font = css(kit.fontes?.titulo, size);
    const words = tt.text.toUpperCase().split(/\s+/);
    const lines = wrapLines(ctx, words, W * (wide ? 0.7 : 0.86));
    const yBase = tt.kind === "gancho" ? H * (wide ? 0.16 : 0.17) : H * (wide ? 0.4 : 0.42);
    const lh = size * 1.08;
    ctx.translate(0, (1 - k) * 40);
    lines.forEach((line, i) => {
      const text = line.join(" ");
      const tw = ctx.measureText(text).width;
      const x = (W - tw) / 2, y = yBase + i * lh;
      if (tt.kind === "cta") { ctx.fillStyle = hi; roundRect(ctx, x - 30, y - size * 0.62, tw + 60, size * 1.24, 18); ctx.fill(); ctx.fillStyle = "#0c0c0d"; }
      else { ctx.lineJoin = "round"; ctx.lineWidth = size * 0.14; ctx.strokeStyle = "#000"; ctx.strokeText(text, x, y); ctx.fillStyle = i === lines.length - 1 ? hi : fg; }
      ctx.fillText(text, x, y);
    });
  }
  ctx.restore();
}

/** motion: fundo do próprio quadro desfocado e escurecido, e a animação no centro nas cores do kit */
function drawMotion(ctx: Ctx, tt: Title, t: number, kit: Kit, a: number) {
  const fg = kit.cores?.texto || "#fff", hi = kit.cores?.destaque || "#F5C84C";
  const wide = isWide();
  const e = Math.max(0, t - tt.start);
  const len = Math.max(0.6, tt.end - tt.start);
  const p = ease(Math.min(1, e / Math.min(1.4, len * 0.6))); // progresso da animação
  ctx.save(); ctx.globalAlpha = a; ctx.filter = "blur(26px) brightness(.45)"; ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, W, H); ctx.restore();
  ctx.globalAlpha = a;
  const cx = W / 2, cy = H * (wide ? 0.46 : 0.44);
  const label = (txt: string | undefined, y: number, size = 52) => {
    if (!txt) return;
    ctx.font = css(kit.fontes?.legenda?.replace(/\s+(Black|ExtraBold|Bold)$/i, "") + " Bold", size * U * (wide ? 1.1 : 1));
    const w = ctx.measureText(txt).width; ctx.fillStyle = fg; ctx.fillText(txt, cx - w / 2, y);
  };
  ctx.textBaseline = "middle";
  if (tt.kind === "numero") {
    // número subindo até o valor (mantém R$, %, x, k)
    const m = tt.text.match(/^(\D*?)([\d.,]+)(.*)$/);
    const pre = m?.[1] || "", raw = m?.[2] || "0", suf = m?.[3] || "";
    const val = parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
    const dec = raw.includes(",") ? (raw.split(",")[1] || "").length : 0;
    const cur = (val * p).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const size = (wide ? 230 : 250) * (1 + 0.06 * Math.max(0, 1 - Math.abs(p - 1) * 8));
    ctx.font = css(kit.fontes?.titulo, size);
    const txt = pre + cur + suf; const w = ctx.measureText(txt).width;
    ctx.shadowColor = hi; ctx.shadowBlur = 40 * p; ctx.fillStyle = hi; ctx.fillText(txt, cx - w / 2, cy);
    ctx.shadowBlur = 0;
    label(tt.sub, cy + size * 0.72);
  } else if (tt.kind === "grafico") {
    const vals = [0.32, 0.48, 0.62, 1];
    const bw = (wide ? 120 : 130) * U * (wide ? 1.4 : 1), gap = bw * 0.45, hmax = H * (wide ? 0.42 : 0.28);
    const x0 = cx - (vals.length * bw + (vals.length - 1) * gap) / 2, yb = cy + hmax / 2;
    vals.forEach((v, i) => {
      const pi = ease(Math.min(1, Math.max(0, (e - i * 0.18) / 0.6)));
      const h = hmax * v * pi;
      ctx.fillStyle = i === vals.length - 1 ? hi : "rgba(255,255,255,.35)";
      roundRect(ctx, x0 + i * (bw + gap), yb - h, bw, h, 14); ctx.fill();
    });
    // seta subindo
    const pa = ease(Math.min(1, Math.max(0, (e - 0.6) / 0.6)));
    if (pa > 0) {
      ctx.strokeStyle = fg; ctx.lineWidth = 10 * U; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const ax = x0 - bw * 0.2, ay = yb - hmax * 0.25, bx = x0 + vals.length * (bw + gap) - gap + bw * 0.1, by = yb - hmax * 1.05;
      const ex = ax + (bx - ax) * pa, ey = ay + (by - ay) * pa;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      const ang = Math.atan2(by - ay, bx - ax), hl = 40 * U;
      ctx.beginPath(); ctx.moveTo(ex - hl * Math.cos(ang - 0.5), ey - hl * Math.sin(ang - 0.5)); ctx.lineTo(ex, ey); ctx.lineTo(ex - hl * Math.cos(ang + 0.5), ey - hl * Math.sin(ang + 0.5)); ctx.stroke();
    }
    ctx.font = css(kit.fontes?.titulo, 96 * U * (wide ? 1.2 : 1)); const tw = ctx.measureText(tt.text).width; ctx.fillStyle = fg; ctx.fillText(tt.text, cx - tw / 2, yb - hmax - 110 * U);
    label(tt.sub, yb + 80 * U, 44);
  } else if (tt.kind === "checklist") {
    const items = (tt.sub || tt.text).split(/\s*[|;\n]\s*/).filter(Boolean).slice(0, 5);
    const size = 62 * U * (wide ? 1.2 : 1), step = size * 1.9;
    const x0 = wide ? W * 0.34 : W * 0.14, y0 = cy - ((items.length - 1) * step) / 2 + (tt.sub ? size * 0.6 : 0);
    if (tt.sub) { ctx.font = css(kit.fontes?.titulo, size * 1.2); ctx.fillStyle = hi; ctx.fillText(tt.text, x0, y0 - step * 1.1); }
    items.forEach((it, i) => {
      const pi = Math.min(1, Math.max(0, (e - 0.2 - i * 0.45) / 0.3));
      if (pi <= 0) return;
      const y = y0 + i * step, bx = x0, s = size * 1.05;
      ctx.globalAlpha = a * pi;
      ctx.strokeStyle = fg; ctx.lineWidth = 6 * U; roundRect(ctx, bx, y - s / 2, s, s, 12); ctx.stroke();
      const pc = Math.min(1, Math.max(0, (e - 0.35 - i * 0.45) / 0.25));
      if (pc > 0) {
        ctx.strokeStyle = hi; ctx.lineWidth = 10 * U; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(bx + s * 0.2, y); ctx.lineTo(bx + s * 0.42, y + s * 0.22 * Math.min(1, pc * 2));
        if (pc > 0.5) ctx.lineTo(bx + s * 0.42 + s * 0.42 * (pc - 0.5) * 2, y + s * 0.22 - s * 0.5 * (pc - 0.5) * 2);
        ctx.stroke();
      }
      ctx.font = css(kit.fontes?.legenda, size); ctx.fillStyle = fg; ctx.fillText(it, bx + s * 1.5, y);
    });
  } else if (tt.kind === "seta") {
    const dir = (tt.sub || "baixo").toLowerCase();
    const size = 90 * U * (wide ? 1.2 : 1);
    ctx.font = css("Instrument Serif", size, true);
    const tw = ctx.measureText(tt.text).width;
    ctx.fillStyle = hi; ctx.fillText(tt.text, cx - tw / 2, cy - size);
    const L = (wide ? 260 : 300) * U * p;
    const dx = dir.startsWith("esq") ? -1 : dir.startsWith("dir") ? 1 : 0, dy = dir.startsWith("cim") ? -1 : dx ? 0.35 : 1;
    const sx = cx, sy = cy - size * 0.2;
    const ex = sx + dx * L, ey = sy + dy * L * (dx ? 1 : 1);
    ctx.strokeStyle = fg; ctx.lineWidth = 12 * U; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + dx * L * 0.2 + 60 * U, sy + dy * L * 0.5, ex, ey); ctx.stroke();
    if (p > 0.9) { const ang = Math.atan2(ey - sy, ex - sx); const hl = 46 * U; ctx.beginPath(); ctx.moveTo(ex - hl * Math.cos(ang - 0.55), ey - hl * Math.sin(ang - 0.55)); ctx.lineTo(ex, ey); ctx.lineTo(ex - hl * Math.cos(ang + 0.55), ey - hl * Math.sin(ang + 0.55)); ctx.stroke(); }
  } else if (tt.kind === "relogio") {
    const r = (wide ? 170 : 190) * U * (wide ? 1.3 : 1);
    ctx.strokeStyle = fg; ctx.lineWidth = 12 * U; ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = hi; ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.3); ctx.arc(cx, cy - r * 0.3, r * 0.9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p * 0.75); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = a;
    const ang = -Math.PI / 2 + e * Math.PI * 2.2;
    ctx.strokeStyle = hi; ctx.lineWidth = 12 * U; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.3); ctx.lineTo(cx + Math.cos(ang) * r * 0.75, cy - r * 0.3 + Math.sin(ang) * r * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.3); ctx.lineTo(cx + Math.cos(ang / 12) * r * 0.45, cy - r * 0.3 + Math.sin(ang / 12) * r * 0.45); ctx.stroke();
    ctx.font = css(kit.fontes?.titulo, 120 * U * (wide ? 1.2 : 1)); const tw = ctx.measureText(tt.text).width; ctx.fillStyle = fg; ctx.fillText(tt.text, cx - tw / 2, cy + r * 0.7 + 110 * U);
    label(tt.sub, cy + r * 0.7 + 210 * U, 44);
  } else if (tt.kind === "progresso") {
    const val = Math.max(0, Math.min(100, parseFloat(tt.text.replace(",", ".")) || 0));
    const bw = W * (wide ? 0.5 : 0.76), bh = 54 * U * (wide ? 1.2 : 1), x0 = cx - bw / 2;
    ctx.fillStyle = "rgba(255,255,255,.18)"; roundRect(ctx, x0, cy - bh / 2, bw, bh, bh / 2); ctx.fill();
    const fw = Math.max(bh, bw * (val / 100) * p);
    ctx.fillStyle = hi; roundRect(ctx, x0, cy - bh / 2, fw, bh, bh / 2); ctx.fill();
    ctx.font = css(kit.fontes?.titulo, 150 * U * (wide ? 1.2 : 1)); const txt = `${Math.round(val * p)}%`; const tw = ctx.measureText(txt).width;
    ctx.fillStyle = fg; ctx.fillText(txt, cx - tw / 2, cy - bh - 90 * U);
    label(tt.sub, cy + bh + 60 * U, 46);
  }
}

/** B-roll por cima: tela cheia ou cartão lateral arredondado com sombra (estilo print do Strava ao lado) */
export function drawInsert(ctx: Ctx, ov: Overlay, src: CanvasImageSource, sw: number, sh: number, t: number) {
  if (!sw || !sh) return;
  const k = Math.min(1, (t - ov.start) / 0.25, (ov.end - t) / 0.25);
  ctx.save();
  if (ov.mode === "pagina") {
    // página branca: fundo claro cobre a fala e a foto entra num cartão arredondado, levemente girado
    const wide = isWide(), e = Math.max(0, Math.min(1, k));
    ctx.globalAlpha = Math.min(1, e * 1.6);
    ctx.fillStyle = "#f6f5f2"; ctx.fillRect(0, 0, W, H);
    const cw = wide ? W * 0.46 : W * 0.78, ch = cw * (wide ? 0.62 : 0.8), cx = W / 2, cy = H * (wide ? 0.54 : 0.52);
    const pop = 0.86 + 0.14 * (1 - Math.pow(1 - e, 3));
    ctx.translate(cx, cy + (1 - e) * 40); ctx.rotate((Math.round(ov.start * 5) % 2 ? 1 : -1) * 0.025); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.shadowColor = "rgba(0,0,0,.22)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 36); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowColor = "transparent";
    roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 36); ctx.clip();
    const s = Math.max(cw / sw, ch / sh); ctx.drawImage(src, cx - (sw * s) / 2, cy - (sh * s) / 2, sw * s, sh * s);
    ctx.restore();
    return;
  }
  if (ov.mode === "polaroid" || ov.mode === "circulo" || ov.mode === "metade") {
    const wide = isWide();
    const pop = 0.7 + 0.3 * (1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3)) + 0.05 * Math.sin(Math.min(1, k) * Math.PI);
    ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.5));
    if (ov.mode === "metade") {
      const h2 = H / 2, s = Math.max(W / sw, h2 / sh);
      ctx.translate(0, -(1 - Math.max(0, k)) * h2 * 0.3);
      ctx.beginPath(); ctx.rect(0, 0, W, h2); ctx.clip();
      ctx.drawImage(src, (W - sw * s) / 2, (h2 - sh * s) / 2, sw * s, sh * s);
      ctx.restore(); ctx.save(); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(0, H / 2 - 3, W, 6);
    } else if (ov.mode === "circulo") {
      const r = (wide ? H * 0.3 : W * 0.3), cx = wide ? W * 0.75 : W / 2, cy = wide ? H / 2 : H * 0.3;
      ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40;
      ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowColor = "transparent";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      const s = Math.max((2 * r) / sw, (2 * r) / sh); ctx.drawImage(src, cx - (sw * s) / 2, cy - (sh * s) / 2, sw * s, sh * s);
    } else {
      const pw = wide ? H * 0.62 : W * 0.66, ph = pw * 1.12, cx = wide ? W * 0.74 : W / 2, cy = wide ? H / 2 : H * 0.32;
      const rot = (Math.round(ov.start * 5) % 2 ? 1 : -1) * 0.06;
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 14;
      ctx.fillStyle = "#f7f5f0"; ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph); ctx.shadowColor = "transparent";
      const m = pw * 0.06, iw = pw - 2 * m, ih = ph - m - pw * 0.22;
      ctx.beginPath(); ctx.rect(cx - pw / 2 + m, cy - ph / 2 + m, iw, ih); ctx.clip();
      const s = Math.max(iw / sw, ih / sh); ctx.drawImage(src, cx - pw / 2 + m + (iw - sw * s) / 2, cy - ph / 2 + m + (ih - sh * s) / 2, sw * s, sh * s);
    }
    ctx.restore();
    return;
  }
  if (ov.mode === "cheia") {
    ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.5));
    const s = Math.max(W / sw, H / sh) * (1 + 0.04 * Math.min(1, (t - ov.start) / Math.max(1, ov.end - ov.start))); // leve aproximação durante o B-roll
    ctx.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
  } else {
    const wide = isWide();
    const ch = H * (wide ? 0.84 : 0.42);
    let cw = (sw / sh) * ch;
    if (cw > W * (wide ? 0.42 : 0.86)) cw = W * (wide ? 0.42 : 0.86);
    const s = Math.max(cw / sw, ch / sh);
    const m = wide ? 48 : 60;
    const slide = (1 - Math.max(0, k)) * 80;
    const x = ov.mode === "esquerda" ? m - slide : W - cw - m + slide;
    const y = wide ? (H - ch) / 2 : H * 0.1;
    ctx.globalAlpha = Math.max(0, k);
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 12;
    roundRect(ctx, x, y, cw, ch, 32); ctx.fillStyle = "#000"; ctx.fill();
    ctx.shadowColor = "transparent";
    roundRect(ctx, x, y, cw, ch, 32); ctx.clip();
    ctx.drawImage(src, x + (cw - sw * s) / 2, y + (ch - sh * s) / 2, sw * s, sh * s);
  }
  ctx.restore();
}

export const activeOverlays = (p: Project, t: number) => (p.overlays || []).filter((o) => t >= o.start && t < o.end);

/** escurece no começo e no fim quando o projeto pede fade */
export function drawFade(ctx: Ctx, p: Project, t: number) {
  if (!p.fade) return;
  const total = totalDuration(p);
  const a = Math.max(t < 0.5 ? 1 - t / 0.5 : 0, t > total - 0.9 ? (t - (total - 0.9)) / 0.9 : 0);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/** tudo que vai por cima do vídeo no tempo t */
export function drawOverlays(ctx: Ctx, p: Project, screens: ReturnType<typeof captionScreens>, t: number, kit: Kit) {
  drawLook(ctx, p, t);
  drawTransition(ctx, p, t);
  // REC e frase mexem no quadro inteiro: vão antes dos outros textos
  const on = p.titles.filter((tt) => t >= tt.start && t < tt.end).sort((a, b) => (a.kind === "rec" ? -1 : 0) - (b.kind === "rec" ? -1 : 0));
  for (const tt of on) drawTitle(ctx, tt, t, kit, p.titles);
  // telas cheias (motion, frase, explicação, abertura) tiram a legenda da frente
  const full = on.some((tt) => MOTION_KINDS.includes(tt.kind) || ["frase", "lista", "episodio", "capitulo"].includes(tt.kind));
  // na página branca a legenda fica escura para continuar legível
  const pagina = (p.overlays || []).some((o) => o.mode === "pagina" && t >= o.start && t < o.end);
  const kitLeg = pagina ? { ...kit, cores: { ...kit.cores, texto: "#141414" } } : kit;
  const mo = activeMotions(p, t);
  // motion que cobre a tela também tira a legenda
  if (p.captionsOn && !full && !mo.some((m) => !m.transparente)) drawCaption(ctx, screens.find((s) => t >= s.start && t < s.end), t, kitLeg);
  for (const m of mo) drawMotionSpec(ctx, m.spec, t - m.start, W, H, { transparente: m.transparente });
  drawFade(ctx, p, t);
}

export const fmt = (s: number) => {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};

/** tira da timeline os trechos [inicio, fim] (tempo da saída) que o plano do Claude mandou cortar */
export function applyCuts(p: Project, cuts: { inicio: number; fim: number }[]): Segment[] {
  const ranges = cuts.filter((c) => c.fim > c.inicio).sort((a, b) => a.inicio - b.inicio);
  const out: Segment[] = [];
  for (const l of layout(p)) {
    let pieces: [number, number][] = [[l.start, l.end]];
    for (const r of ranges) {
      pieces = pieces.flatMap(([a, b]) => (r.fim <= a || r.inicio >= b ? [[a, b]] : [[a, Math.max(a, r.inicio)], [Math.min(b, r.fim), b]].filter(([x, y]) => y - x > 0.08)) as [number, number][]);
    }
    for (const [a, b] of pieces) out.push({ id: uid(), mediaId: l.seg.mediaId, in: l.seg.in + (a - l.start), out: l.seg.in + (b - l.start) });
  }
  return out;
}
