/**
 * Brainstorm: quadros brancos infinitos do Creator.
 * Aqui ficam só dados puros (modelos e cores) para não carregar o Excalidraw no servidor.
 * Os modelos são "esqueletos" no formato do convertToExcalidrawElements, centrados em (0,0).
 */

export const BUCKET = "brainstorm";

/** cores de post-it (paleta do Excalidraw, ficam boas no tema claro e no escuro) */
export const STICKY = [
  { name: "Amarelo", bg: "#ffec99" },
  { name: "Verde", bg: "#b2f2bb" },
  { name: "Azul", bg: "#a5d8ff" },
  { name: "Rosa", bg: "#fcc2d7" },
  { name: "Laranja", bg: "#ffd8a8" },
  { name: "Lilás", bg: "#d0bfff" },
];

/** cores dos cartões na lista de quadros */
export const BOARD_COLORS = ["#6eefb6", "#ffec99", "#a5d8ff", "#fcc2d7", "#ffd8a8", "#d0bfff"];

export const FONT = 6; // Nunito: limpa, combina com a interface
const INK = "#1e1e1e";

export type Template = { key: string; name: string; desc: string; inspired: string; build: (cx: number, cy: number) => any[] };

let seq = 0;
export const uid = (p = "b") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const box = (id: string, x: number, y: number, w: number, h: number, text: string, bg = "transparent", o: any = {}) => ({
  type: o.type || "rectangle", id, x, y, width: w, height: h,
  backgroundColor: bg, fillStyle: "solid", strokeColor: o.stroke || INK, strokeWidth: o.strokeWidth || 1, roughness: 0,
  roundness: { type: 3 }, strokeStyle: o.strokeStyle || "solid",
  label: text ? { text, fontSize: o.fontSize || 20, fontFamily: FONT, strokeColor: INK, textAlign: o.align || "center", verticalAlign: o.valign || "middle" } : undefined,
});
const text = (x: number, y: number, t: string, size = 20, o: any = {}) => ({ type: "text", x, y, text: t, fontSize: size, fontFamily: FONT, strokeColor: o.color || INK, textAlign: o.align || "left" });
type Geo = { x: number; y: number; width: number; height: number };
/** ponto na borda da caixa, na direção (dx, dy) a partir do centro */
const edge = (g: Geo, dx: number, dy: number, gap = 6) => {
  const hw = g.width / 2 + gap, hh = g.height / 2 + gap;
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return [g.x + g.width / 2 + dx * t, g.y + g.height / 2 + dy * t];
};
/** seta ligando duas caixas, com a geometria já calculada (o conversor só faz a ligação) */
export function arrowBetween(a: Geo & { id: string }, b: Geo & { id: string }, o: any = {}) {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2), dy = b.y + b.height / 2 - (a.y + a.height / 2);
  const [x1, y1] = edge(a, dx, dy), [x2, y2] = edge(b, -dx, -dy);
  return { type: "arrow", x: x1, y: y1, width: x2 - x1, height: y2 - y1, points: [[0, 0], [x2 - x1, y2 - y1]], strokeColor: o.stroke || INK, strokeWidth: 1, roughness: 0, start: { id: a.id }, end: { id: b.id }, endArrowhead: "arrow" };
}
const arrow = (a: any, b: any) => arrowBetween(a, b);

export function sticky(cx: number, cy: number, label = "", bg = STICKY[0].bg, id = uid("s")) {
  return box(id, cx - 100, cy - 100, 200, 200, label, bg, { stroke: "transparent", fontSize: 20, valign: "top", align: "left" });
}

export const TEMPLATES: Template[] = [
  {
    key: "mapa", name: "Mapa mental", desc: "Um tema no centro e os ramos em volta. Selecione um ramo e crie ideias ligadas a ele.", inspired: "Whimsical, MindMeister",
    build: (cx, cy) => {
      const c = uid("c");
      const out: any[] = [box(c, cx - 140, cy - 60, 280, 120, "Tema central", "#b2f2bb", { type: "ellipse", fontSize: 26, strokeWidth: 2 })];
      const ramos = ["Público", "Problema que resolve", "Ideias de conteúdo", "Formatos", "Referências", "Próximos passos"];
      const cores = ["#a5d8ff", "#ffec99", "#fcc2d7", "#ffd8a8", "#d0bfff", "#c3fae8"];
      ramos.forEach((r, i) => {
        const ang = (Math.PI * 2 * i) / ramos.length - Math.PI / 2 + Math.PI / ramos.length;
        const x = cx + Math.cos(ang) * 420, y = cy + Math.sin(ang) * 260;
        const id = uid("r");
        const rb = box(id, x - 110, y - 40, 220, 80, r, cores[i]);
        out.push(rb, arrow(out[0], rb));
      });
      return out;
    },
  },
  {
    key: "matriz", name: "Matriz impacto × esforço", desc: "Jogue as ideias nos quatro quadrantes e veja o que fazer primeiro.", inspired: "Miro, FigJam",
    build: (cx, cy) => {
      const w = 460, h = 320, g = 16;
      const q = [
        ["Fazer agora", "alto impacto, pouco esforço", "#b2f2bb", -1, -1],
        ["Planejar", "alto impacto, muito esforço", "#a5d8ff", 1, -1],
        ["Encaixar quando der", "pouco impacto, pouco esforço", "#ffec99", -1, 1],
        ["Deixar de lado", "pouco impacto, muito esforço", "#ffc9c9", 1, 1],
      ] as const;
      const out: any[] = [text(cx - w - g, cy - h - g - 70, "Matriz impacto × esforço", 32)];
      q.forEach(([t, d, bg, sx, sy]) => {
        const x = sx < 0 ? cx - w - g / 2 : cx + g / 2, y = sy < 0 ? cy - h - g / 2 : cy + g / 2;
        out.push(box(uid("q"), x, y, w, h, "", bg + "66", { stroke: bg, strokeWidth: 2 }));
        out.push(text(x + 20, y + 16, t, 24));
        out.push(text(x + 20, y + 50, d, 16, { color: "#495057" }));
      });
      out.push(text(cx - w - g - 120, cy - 12, "Impacto ↑", 18, { color: "#495057" }));
      out.push(text(cx - 40, cy + h + g + 14, "Esforço →", 18, { color: "#495057" }));
      return out;
    },
  },
  {
    key: "roteiro", name: "Roteiro de vídeo", desc: "Do gancho ao CTA, com um post-it de anotação embaixo de cada parte.", inspired: "Milanote",
    build: (cx, cy) => {
      const partes = [["Gancho", "primeiros 3 segundos"], ["Contexto", "por que importa"], ["Desenvolvimento", "o conteúdo em si"], ["Virada", "a surpresa ou prova"], ["CTA", "o que a pessoa faz agora"]];
      const w = 220, gap = 90, total = partes.length * w + (partes.length - 1) * gap;
      const out: any[] = [text(cx - total / 2, cy - 200, "Roteiro de vídeo", 32)];
      let prev: any = null;
      partes.forEach(([t, d], i) => {
        const x = cx - total / 2 + i * (w + gap), id = uid("p");
        const pb = box(id, x, cy - 110, w, 90, `${t}\n${d}`, i === 0 ? "#b2f2bb" : i === partes.length - 1 ? "#ffd8a8" : "#a5d8ff", { fontSize: 18 });
        out.push(pb);
        if (prev) out.push(arrow(prev, pb));
        out.push(sticky(x + w / 2, cy + 110, "Escreva aqui…", STICKY[0].bg));
        prev = pb;
      });
      return out;
    },
  },
  {
    key: "campanha", name: "Planejamento de campanha", desc: "Antes, durante e depois de um lançamento ou campanha, em colunas.", inspired: "Milanote, Miro",
    build: (cx, cy) => {
      const cols = [["Antes", "aquecimento, bastidores, lista de espera", "#a5d8ff"], ["Durante", "abertura, prova social, urgência", "#b2f2bb"], ["Depois", "resultado, depoimentos, próximo passo", "#ffd8a8"]];
      const w = 360, h = 620, gap = 40, total = cols.length * w + (cols.length - 1) * gap;
      const out: any[] = [text(cx - total / 2, cy - h / 2 - 70, "Planejamento de campanha", 32)];
      cols.forEach(([t, d, bg], i) => {
        const x = cx - total / 2 + i * (w + gap), y = cy - h / 2;
        out.push(box(uid("k"), x, y, w, h, "", bg + "40", { stroke: bg, strokeWidth: 2 }));
        out.push(text(x + 20, y + 18, t, 26));
        out.push(text(x + 20, y + 56, d, 15, { color: "#495057" }));
        out.push(sticky(x + w / 2, y + 220, "Ideia 1", STICKY[0].bg));
        out.push(sticky(x + w / 2, y + 450, "Ideia 2", STICKY[3].bg));
      });
      return out;
    },
  },
];

export const templateByKey = (k?: string | null) => TEMPLATES.find((t) => t.key === k);

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `há ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
