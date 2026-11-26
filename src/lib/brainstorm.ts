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

export const CATEGORIES = ["Ideias", "Estratégia", "Campanhas"] as const;
export type Template = { key: string; cat: (typeof CATEGORIES)[number]; name: string; desc: string; inspired: string; build: (cx: number, cy: number) => any[] };

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


const GRAY = "#495057";
const card = (x: number, y: number, t: string, bg = STICKY[0].bg, w = 240, h = 72) =>
  box(uid("i"), x, y, w, h, t, bg, { stroke: "transparent", fontSize: 16, valign: "top", align: "left" });

type Stage = { name: string; sub?: string; color: string; items: string[] };
/** etapas em sequência, ligadas por setas, com os passos de cada etapa em cartões embaixo */
function flow(cx: number, cy: number, title: string, stages: Stage[], o: { w?: number; gap?: number; sub?: string } = {}) {
  const w = o.w || 260, gap = o.gap || 70, total = stages.length * w + (stages.length - 1) * gap;
  const maxItems = Math.max(...stages.map((s) => s.items.length));
  const top = cy - (130 + maxItems * 86) / 2;
  const out: any[] = [text(cx - total / 2, top - 110, title, 34)];
  if (o.sub) out.push(text(cx - total / 2, top - 62, o.sub, 17, { color: GRAY }));
  let prev: any = null;
  stages.forEach((st, i) => {
    const x = cx - total / 2 + i * (w + gap);
    const head = box(uid("e"), x, top, w, 96, `${i + 1}. ${st.name}${st.sub ? `\n${st.sub}` : ""}`, st.color, { fontSize: 17, strokeWidth: 2 });
    out.push(head);
    if (prev) out.push(arrow(prev, head));
    st.items.forEach((it, j) => out.push(card(x + 10, top + 120 + j * 86, it, "#fff9db", w - 20, 72)));
    prev = head;
  });
  return out;
}

type Cell = { name: string; hint: string; color: string; items?: string[] };
/** grade de blocos (briefing, SWOT, persona…) com título, dica e cartões para preencher */
function grid(cx: number, cy: number, title: string, cells: Cell[], cols: number, o: { cw?: number; ch?: number; sub?: string } = {}) {
  const cw = o.cw || 380, ch = o.ch || 260, g = 20, rows = Math.ceil(cells.length / cols);
  const W = cols * cw + (cols - 1) * g, H = rows * ch + (rows - 1) * g;
  const x0 = cx - W / 2, y0 = cy - H / 2;
  const out: any[] = [text(x0, y0 - 100, title, 34)];
  if (o.sub) out.push(text(x0, y0 - 52, o.sub, 17, { color: GRAY }));
  cells.forEach((c, i) => {
    const x = x0 + (i % cols) * (cw + g), y = y0 + Math.floor(i / cols) * (ch + g);
    out.push(box(uid("g"), x, y, cw, ch, "", c.color + "40", { stroke: c.color, strokeWidth: 2 }));
    out.push(text(x + 18, y + 14, c.name, 22));
    out.push(text(x + 18, y + 46, c.hint, 15, { color: GRAY }));
    (c.items || ["Escreva aqui…"]).forEach((it, j) => out.push(card(x + 18, y + 84 + j * 82, it, "#fff9db", cw - 36, 70)));
  });
  return out;
}

const C = { verde: "#b2f2bb", azul: "#a5d8ff", amarelo: "#ffec99", rosa: "#fcc2d7", laranja: "#ffd8a8", lilas: "#d0bfff", agua: "#c3fae8", vermelho: "#ffc9c9" };

export const TEMPLATES: Template[] = [
  {
    key: "mapa", cat: "Ideias", name: "Mapa mental", desc: "Um tema no centro e os ramos em volta. Selecione um ramo e crie ideias ligadas a ele.", inspired: "Whimsical, MindMeister",
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
    key: "matriz", cat: "Ideias", name: "Matriz impacto × esforço", desc: "Jogue as ideias nos quatro quadrantes e veja o que fazer primeiro.", inspired: "Miro, FigJam",
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
    key: "roteiro", cat: "Ideias", name: "Roteiro de vídeo", desc: "Do gancho ao CTA, com um post-it de anotação embaixo de cada parte.", inspired: "Milanote",
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
    key: "campanha", cat: "Campanhas", name: "Campanha em 3 tempos", desc: "Antes, durante e depois de um lançamento ou campanha, em colunas.", inspired: "Milanote, Miro",
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
  /* ───────── Estratégia ───────── */
  {
    key: "estrategia", cat: "Estratégia", name: "Estratégia de perfil", desc: "Diagnóstico → Estratégia → Implementação, com os passos de cada etapa prontos para preencher.", inspired: "Método Vinci Society",
    build: (cx, cy) => flow(cx, cy, "Estratégia de perfil", [
      { name: "Diagnóstico", sub: "onde o perfil está hoje", color: C.azul, items: ["Números atuais: seguidores, alcance, engajamento", "Bio, destaques e primeira impressão", "Quem é o público e o que ele quer", "Concorrentes e referências do nicho", "Pontos fortes e pontos fracos"] },
      { name: "Estratégia", sub: "para onde vamos", color: C.verde, items: ["Posicionamento em uma frase", "3 a 5 pilares de conteúdo", "Formatos e frequência de postagem", "Tom de voz e estilo visual", "Metas para 30, 60 e 90 dias"] },
      { name: "Implementação", sub: "como fazer acontecer", color: C.laranja, items: ["Calendário da semana", "Roteiro, gravação e edição", "Publicação e respostas no dia", "Stories diários e relacionamento", "Rotina de produção em lote"] },
      { name: "Análise", sub: "medir e ajustar", color: C.lilas, items: ["O que deu mais alcance e salvamentos", "O que trouxe seguidores e mensagens", "O que parar, manter e testar", "Ajustes para o próximo ciclo"] },
    ], { w: 300, sub: "Do retrato atual ao plano em execução. Edite os cartões, apague o que não serve e ligue novas ideias." }),
  },
  {
    key: "pilares", cat: "Estratégia", name: "Pilares de conteúdo", desc: "A marca no centro e quatro pilares com ideias de pauta em volta.", inspired: "Whimsical, Miro",
    build: (cx, cy) => {
      const c = uid("c");
      const centro = box(c, cx - 150, cy - 60, 300, 120, "Sua marca\n(posicionamento)", C.verde, { type: "ellipse", fontSize: 22, strokeWidth: 2 });
      const out: any[] = [text(cx - 620, cy - 470, "Pilares de conteúdo", 34), text(cx - 620, cy - 422, "Cada pilar responde a um objetivo. Distribua as pautas da semana entre eles.", 17, { color: GRAY }), centro];
      const pil = [
        { n: "Educar", d: "ensinar algo útil", c: C.azul, dx: -1, dy: -1, ideias: ["Tutorial passo a passo", "Erros comuns do nicho"] },
        { n: "Inspirar", d: "mostrar o possível", c: C.amarelo, dx: 1, dy: -1, ideias: ["Antes e depois", "História de cliente"] },
        { n: "Conectar", d: "gerar identificação", c: C.rosa, dx: -1, dy: 1, ideias: ["Bastidores da rotina", "Opinião sobre o mercado"] },
        { n: "Vender", d: "levar à ação", c: C.laranja, dx: 1, dy: 1, ideias: ["Oferta com prova social", "Perguntas frequentes"] },
      ];
      pil.forEach((p) => {
        const x = cx + p.dx * 420 - 120, y = cy + p.dy * 200 - 45;
        const pb = box(uid("p"), x, y, 240, 90, `${p.n}\n${p.d}`, p.c, { fontSize: 18, strokeWidth: 2 });
        out.push(pb, arrow(centro, pb));
        p.ideias.forEach((t, j) => out.push(card(x + p.dx * 270 + (p.dx < 0 ? -10 : 10), y - 40 + j * 86 + p.dy * 40, t, "#fff9db", 230, 72)));
      });
      return out;
    },
  },
  {
    key: "persona", cat: "Estratégia", name: "Persona e público", desc: "Quem é a pessoa que você quer alcançar: dores, desejos, objeções e onde ela está.", inspired: "Miro",
    build: (cx, cy) => grid(cx, cy, "Persona e público", [
      { name: "Quem é", hint: "idade, profissão, rotina, momento de vida", color: C.azul },
      { name: "Dores", hint: "o que incomoda, trava ou dá medo", color: C.vermelho },
      { name: "Desejos", hint: "o que quer conquistar ou sentir", color: C.verde },
      { name: "Objeções", hint: "por que ainda não compra ou não segue", color: C.laranja },
      { name: "Onde está", hint: "perfis que segue, hashtags, lugares", color: C.lilas },
      { name: "Como fala", hint: "palavras e expressões que ela usa", color: C.amarelo },
    ], 3, { sub: "Preencha com o que você ouve em comentários, mensagens e conversas com clientes." }),
  },
  {
    key: "funil", cat: "Estratégia", name: "Funil de conteúdo", desc: "Topo, meio e fundo: conteúdos para alcançar, criar relação e converter.", inspired: "Miro",
    build: (cx, cy) => {
      const etapas = [
        { n: "Topo · Alcance", d: "atrair quem ainda não conhece", c: C.azul, w: 900, ideias: ["Reels de tendência do nicho", "Dica rápida e compartilhável", "Polêmica ou mito"] },
        { n: "Meio · Relação", d: "criar confiança e autoridade", c: C.verde, w: 720, ideias: ["Carrossel aprofundado", "Bastidores e processo", "Caso de cliente"] },
        { n: "Fundo · Conversão", d: "levar à compra ou contato", c: C.laranja, w: 540, ideias: ["Oferta clara com CTA", "Depoimentos", "Respostas às objeções"] },
      ];
      const out: any[] = [text(cx - 450, cy - 420, "Funil de conteúdo", 34), text(cx - 450, cy - 372, "Equilibre a semana: muito topo atrai, pouco fundo não vende.", 17, { color: GRAY })];
      etapas.forEach((e, i) => {
        const y = cy - 300 + i * 220;
        out.push(box(uid("f"), cx - e.w / 2, y, e.w, 200, "", e.c + "40", { stroke: e.c, strokeWidth: 2 }));
        out.push(text(cx - e.w / 2 + 20, y + 14, e.n, 22), text(cx - e.w / 2 + 20, y + 46, e.d, 15, { color: GRAY }));
        const cw = (e.w - 40 - 2 * 12) / 3;
        e.ideias.forEach((t, j) => out.push(card(cx - e.w / 2 + 20 + j * (cw + 12), y + 90, t, "#fff9db", cw, 90)));
      });
      return out;
    },
  },
  {
    key: "metas", cat: "Estratégia", name: "Metas 30 · 60 · 90 dias", desc: "O que conquistar em cada fase, com métrica e ações para chegar lá.", inspired: "Planejamento OKR",
    build: (cx, cy) => grid(cx, cy, "Metas 30 · 60 · 90 dias", [
      { name: "30 dias · Base", hint: "arrumar a casa e criar ritmo", color: C.azul, items: ["Meta:", "Métrica:", "Ações:"] },
      { name: "60 dias · Tração", hint: "dobrar o que funcionou", color: C.verde, items: ["Meta:", "Métrica:", "Ações:"] },
      { name: "90 dias · Escala", hint: "crescer e converter", color: C.laranja, items: ["Meta:", "Métrica:", "Ações:"] },
    ], 3, { ch: 360, sub: "Uma meta clara por fase. Métrica é o número que mostra se deu certo." }),
  },
  {
    key: "swot", cat: "Estratégia", name: "Análise SWOT", desc: "Forças, fraquezas, oportunidades e ameaças do perfil ou da marca.", inspired: "FigJam",
    build: (cx, cy) => grid(cx, cy, "Análise SWOT", [
      { name: "Forças", hint: "o que você faz melhor que os outros", color: C.verde },
      { name: "Fraquezas", hint: "o que ainda falta ou atrapalha", color: C.vermelho },
      { name: "Oportunidades", hint: "tendências e espaços no mercado", color: C.azul },
      { name: "Ameaças", hint: "concorrentes, algoritmo, mudanças", color: C.laranja },
    ], 2, { cw: 460, ch: 300 }),
  },
  /* ───────── Campanhas ───────── */
  {
    key: "lancamento", cat: "Campanhas", name: "Lançamento em 5 fases", desc: "Planejamento, aquecimento, abertura, encerramento e pós, com as tarefas de cada fase.", inspired: "Fórmula de lançamento, Milanote",
    build: (cx, cy) => flow(cx, cy, "Lançamento em 5 fases", [
      { name: "Planejamento", sub: "2 a 4 semanas antes", color: C.lilas, items: ["Oferta, preço e bônus", "Público e promessa principal", "Meta de vendas e orçamento", "Calendário e responsáveis"] },
      { name: "Aquecimento", sub: "7 a 14 dias antes", color: C.azul, items: ["Conteúdos de valor sobre o problema", "Bastidores da preparação", "Lista de espera ou grupo VIP", "Caixinha de perguntas nos stories"] },
      { name: "Abertura", sub: "dia do lançamento", color: C.verde, items: ["Post e stories de abertura", "Live ou vídeo de apresentação", "Envio para a lista de espera", "Prova social e depoimentos"] },
      { name: "Encerramento", sub: "últimos dias", color: C.laranja, items: ["Contagem regressiva", "Respostas às objeções", "Último bônus ou condição", "Última chamada"] },
      { name: "Pós", sub: "depois do fechamento", color: C.rosa, items: ["Boas-vindas a quem comprou", "Resultados e números", "Depoimentos e aprendizados", "O que repetir no próximo"] },
    ], { w: 270, sub: "Edite as datas e as tarefas de cada fase, e ligue novas ideias onde precisar." }),
  },
  {
    key: "data", cat: "Campanhas", name: "Campanha de data especial", desc: "Black Friday, Natal, Dia das Mães: oferta, mensagem e cronograma de D-14 até D+1.", inspired: "Miro",
    build: (cx, cy) => flow(cx, cy, "Campanha de data especial", [
      { name: "D-14", sub: "definir", color: C.lilas, items: ["Objetivo e meta", "Oferta e condição", "Mensagem principal"] },
      { name: "D-7", sub: "aquecer", color: C.azul, items: ["Teaser no feed", "Enquete nos stories", "Lista VIP"] },
      { name: "D-1", sub: "antecipar", color: C.amarelo, items: ["Revelar a oferta", "Lembrete para a lista", "Anúncio no ar"] },
      { name: "Dia D", sub: "vender", color: C.verde, items: ["Post de abertura", "Stories o dia todo", "Responder direct rápido"] },
      { name: "D+1", sub: "fechar", color: C.rosa, items: ["Última chance", "Agradecimento", "Números da campanha"] },
    ], { w: 240, gap: 60, sub: "Troque o nome da data no título e ajuste os dias." }),
  },
  {
    key: "briefing", cat: "Campanhas", name: "Briefing de campanha", desc: "Tudo que a equipe precisa saber antes de criar: objetivo, público, mensagem, peças e métricas.", inspired: "Milanote",
    build: (cx, cy) => grid(cx, cy, "Briefing de campanha", [
      { name: "Objetivo", hint: "o que a campanha precisa gerar", color: C.verde },
      { name: "Público", hint: "para quem é, e em que momento está", color: C.azul },
      { name: "Mensagem-chave", hint: "a frase que a pessoa tem que lembrar", color: C.amarelo },
      { name: "Oferta", hint: "produto, preço, condição, bônus", color: C.laranja },
      { name: "Peças e formatos", hint: "reels, carrossel, stories, anúncio", color: C.lilas },
      { name: "Prazo e orçamento", hint: "datas de entrega e verba", color: C.rosa },
      { name: "Referências", hint: "cole imagens e links aqui", color: C.agua },
      { name: "Métricas de sucesso", hint: "como saber se funcionou", color: C.vermelho },
    ], 4, { cw: 340, ch: 240 }),
  },
  {
    key: "calendario", cat: "Campanhas", name: "Calendário de 4 semanas", desc: "Tema de cada semana com o que sai no feed, nos reels e nos stories.", inspired: "Planejador do HUB",
    build: (cx, cy) => grid(cx, cy, "Calendário de 4 semanas", [
      { name: "Semana 1 · Tema", hint: "o assunto que abre a campanha", color: C.azul, items: ["Feed:", "Reels:", "Stories:"] },
      { name: "Semana 2 · Tema", hint: "aprofundar e gerar desejo", color: C.verde, items: ["Feed:", "Reels:", "Stories:"] },
      { name: "Semana 3 · Tema", hint: "prova e oferta", color: C.amarelo, items: ["Feed:", "Reels:", "Stories:"] },
      { name: "Semana 4 · Tema", hint: "fechamento e resultados", color: C.laranja, items: ["Feed:", "Reels:", "Stories:"] },
    ], 4, { cw: 320, ch: 360, sub: "Quando fechar, selecione os cartões e use Virar conteúdo para mandar ao Quadro de produção." }),
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
