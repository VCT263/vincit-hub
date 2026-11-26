/**
 * Editor enxuto do Audiovisual: modelo da timeline e desenho dos quadros (prévia e exportação usam o mesmo código).
 * Tudo roda no navegador de quem edita; nada vai para servidor.
 */

export type Word = { s: number; e: number; t: string }; // tempo no arquivo de origem (segundos)
export type Media = { id: string; name: string; file: File; url: string; duration: number; width: number; height: number; words?: Word[] };
export type Segment = { id: string; mediaId: string; in: number; out: number };
export type Title = { id: string; start: number; end: number; text: string; kind: "gancho" | "cta" | "lower_third" };
export type Zoom = { id: string; start: number; end: number; scale: number };
/** camera: 0 desligada, 1 suave, 2 média, 3 forte (sem valor, vale o do kit) */
export type Project = { segments: Segment[]; titles: Title[]; zooms: Zoom[]; captionsOn: boolean; edits: Record<string, string>; camera?: number };

export type Kit = {
  cores?: { destaque?: string; texto?: string; fundo?: string };
  fontes?: { titulo?: string; legenda?: string };
  legenda?: { estilo?: string; palavras_por_tela?: number; caixa_alta?: boolean; altura?: number };
  regras?: { corte_max_s?: number; silencio_ms?: number; trilha_db?: number };
  camera?: { intensidade?: number };
  mogrts?: Record<string, string>;
};

export const W = 1080;
export const H = 1920;

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_KIT: Kit = {
  cores: { destaque: "#F5C84C", texto: "#FFFFFF", fundo: "#0C0C0D" },
  fontes: { titulo: "Anton", legenda: "Inter Black" },
  legenda: { estilo: "impacto", palavras_por_tela: 3, caixa_alta: true, altura: 0.64 },
  regras: { corte_max_s: 4, silencio_ms: 350, trilha_db: -18 },
  camera: { intensidade: 2 },
};

export function mergeKit(k?: Kit | null): Kit {
  const d = DEFAULT_KIT;
  return {
    cores: { ...d.cores, ...(k?.cores || {}) },
    fontes: { ...d.fontes, ...(k?.fontes || {}) },
    legenda: { ...d.legenda, ...(k?.legenda || {}) },
    regras: { ...d.regras, ...(k?.regras || {}) },
    camera: { ...d.camera, ...(k?.camera || {}) },
    mogrts: k?.mogrts,
  };
}

/** fontes do Google que o editor carrega; o kit pode citar qualquer uma delas */
export const FONTS = ["Anton", "Inter", "Archivo Black", "Instrument Serif", "Bebas Neue", "Montserrat", "Poppins", "Bricolage Grotesque", "JetBrains Mono"];
export const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&family=Inter:wght@500;700;800;900&family=JetBrains+Mono:wght@500&family=Montserrat:wght@700;900&family=Poppins:wght@700;900&display=block";

/** "Inter Black" → { family: "Inter", weight: 900 } */
export function parseFont(name?: string) {
  const n = (name || "Inter").trim();
  const m = n.match(/^(.*?)\s+(Black|ExtraBold|Bold|SemiBold|Medium|Regular|Italic)$/i);
  const map: Record<string, number> = { black: 900, extrabold: 800, bold: 700, semibold: 600, medium: 500, regular: 400, italic: 400 };
  return m ? { family: m[1], weight: map[m[2].toLowerCase()], italic: /italic/i.test(m[2]) } : { family: n, weight: /anton|bebas|archivo black|instrument/i.test(n) ? 400 : 800, italic: false };
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
    const k = Math.min(1, (t - z.start) / 0.12, (z.end - t) / 0.12);
    punch = 1 + (z.scale / 100 - 1) * Math.max(0, k);
    break;
  }
  return punch * cameraAt(cam, t);
}

/** desenha a imagem cobrindo 9:16, com zoom no centro */
export function drawCover(ctx: Ctx, src: CanvasImageSource, sw: number, sh: number, zoom = 1, already916 = false) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (!sw || !sh) return;
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

/** legenda da tela atual no estilo do kit */
export function drawCaption(ctx: Ctx, screen: ReturnType<typeof captionScreens>[number] | undefined, t: number, kit: Kit) {
  if (!screen) return;
  const st = kit.legenda?.estilo || "impacto";
  const hi = kit.cores?.destaque || "#F5C84C";
  const fg = kit.cores?.texto || "#FFFFFF";
  const upper = !!kit.legenda?.caixa_alta && st !== "editorial";
  const y0 = H * (kit.legenda?.altura || 0.64);
  const size = st === "editorial" ? 92 : st === "documental" ? 54 : st === "caixa" ? 70 : 84;
  const fontName = st === "editorial" ? "Instrument Serif" : kit.fontes?.legenda;
  ctx.font = css(fontName, size, st === "editorial");
  ctx.textBaseline = "middle";
  const words = screen.words.map((w) => (upper ? w.t.toUpperCase() : w.t));
  const lines = wrapLines(ctx, words, W * 0.84);
  const lh = size * 1.18;
  let idx = 0;
  lines.forEach((line, li) => {
    const y = y0 + (li - (lines.length - 1) / 2) * lh;
    const widths = line.map((w) => ctx.measureText(w).width);
    const space = ctx.measureText(" ").width;
    const total = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1);
    let x = (W - total) / 2;
    line.forEach((w, wi) => {
      const word = screen.words[idx++];
      const active = t >= word.start && t < word.end + 0.05;
      const said = t >= word.start;
      const hot = active || (said && isHot(word.t));
      const ww = widths[wi];
      ctx.save();
      if (st === "impacto") {
        const pop = active ? 1 + 0.12 * Math.max(0, 1 - (t - word.start) / 0.12) : 1;
        ctx.translate(x + ww / 2, y); ctx.scale(pop, pop); ctx.translate(-(x + ww / 2), -y);
        ctx.lineJoin = "round"; ctx.lineWidth = size * 0.16; ctx.strokeStyle = "#000";
        ctx.strokeText(w, x, y);
        ctx.fillStyle = hot ? hi : fg; ctx.globalAlpha = said ? 1 : 0.55;
        ctx.fillText(w, x, y);
      } else if (st === "caixa") {
        if (active) { ctx.fillStyle = hi; roundRect(ctx, x - 12, y - size * 0.62, ww + 24, size * 1.24, 14); ctx.fill(); }
        ctx.fillStyle = active ? "#0c0c0d" : fg; ctx.shadowColor = active ? "transparent" : "rgba(0,0,0,.7)"; ctx.shadowBlur = 16;
        ctx.fillText(w, x, y);
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

export function drawTitle(ctx: Ctx, tt: Title, t: number, kit: Kit) {
  const fg = kit.cores?.texto || "#fff";
  const hi = kit.cores?.destaque || "#F5C84C";
  const k = tt.start < 0.05 ? 1 : Math.min(1, (t - tt.start) / 0.25); // o gancho do começo já entra pronto (vira a capa)
  ctx.save();
  ctx.globalAlpha = Math.max(0, k);
  if (tt.kind === "lower_third") {
    ctx.font = css(kit.fontes?.legenda, 46);
    const w = ctx.measureText(tt.text).width + 60;
    const x = 70 - (1 - k) * 60, y = H * 0.8;
    ctx.fillStyle = kit.cores?.fundo || "#0c0c0d"; ctx.globalAlpha = 0.85 * k;
    roundRect(ctx, x, y, w, 96, 16); ctx.fill();
    ctx.globalAlpha = k; ctx.fillStyle = hi; ctx.fillRect(x, y, 10, 96);
    ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(tt.text, x + 34, y + 48);
  } else {
    const size = tt.kind === "gancho" ? 104 : 88;
    ctx.font = css(kit.fontes?.titulo, size);
    ctx.textBaseline = "middle";
    const words = tt.text.toUpperCase().split(/\s+/);
    const lines = wrapLines(ctx, words, W * 0.86);
    const yBase = tt.kind === "gancho" ? H * 0.17 : H * 0.42;
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

/** tudo que vai por cima do vídeo no tempo t */
export function drawOverlays(ctx: Ctx, p: Project, screens: ReturnType<typeof captionScreens>, t: number, kit: Kit) {
  for (const tt of p.titles) if (t >= tt.start && t < tt.end) drawTitle(ctx, tt, t, kit);
  if (p.captionsOn) drawCaption(ctx, screens.find((s) => t >= s.start && t < s.end), t, kit);
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
