/** Seção E-commerce: calendário comercial de moda e contas do plano de 90 dias. */

export type EcAction = {
  id: string; store_id: string; title: string; kind: string; date: string; end_date?: string | null; warmup_date?: string | null;
  goal?: number | null; goal_max?: number | null; do_what?: string | null; because?: string | null; offering?: string | null; audience?: string | null; aiming?: string | null;
  before_items: Item[]; during_items: Item[]; after_items: Item[];
  vm_date?: string | null; vm_window?: string | null; vm_have?: string | null; vm_need?: string | null;
  campaign?: any; status: string; result?: number | null; notes?: string | null;
};
export type Item = { t: string; done?: boolean; due?: string | null };

export const KINDS: Record<string, string> = { acao: "Ação", data: "Data comemorativa", lancamento: "Lançamento", evento: "Evento", liquidacao: "Liquidação", live: "Live" };
export const STATUS: Record<string, string> = { planejada: "Planejada", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada" };

export const brl = (v?: number | null) => (v == null || isNaN(Number(v)) ? "–" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
export const num = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
export const fmtDay = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "–");
export const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const quarterOf = (d: string) => ({ year: Number(d.slice(0, 4)), quarter: Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1 });
/** primeiro dia dos 3 meses do trimestre (AAAA-MM-01) */
export const quarterMonths = (year: number, quarter: number) => [0, 1, 2].map((i) => `${year}-${String((quarter - 1) * 3 + i + 1).padStart(2, "0")}-01`);
export const monthEnd = (m: string) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0); return iso(d); };

/** semanas (segunda a domingo) que tocam o mês, com os dias de cada uma dentro do mês */
export function weeksOf(m: string) {
  const start = new Date(m + "T12:00:00"), end = new Date(monthEnd(m) + "T12:00:00");
  const out: { from: string; to: string; days: number }[] = [];
  let cur = new Date(start);
  while (cur <= end) {
    const wd = (cur.getDay() + 6) % 7; // 0 = segunda
    const last = new Date(cur); last.setDate(cur.getDate() + (6 - wd));
    const to = last > end ? end : last;
    out.push({ from: iso(cur), to: iso(to), days: Math.round((to.getTime() - cur.getTime()) / 864e5) + 1 });
    cur = new Date(to); cur.setDate(to.getDate() + 1);
  }
  return out;
}

/** Domingo de Páscoa (algoritmo de Meeus) */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day, 12);
}
const nthWeekday = (y: number, mo: number, wd: number, n: number) => { const d = new Date(y, mo, 1, 12); d.setDate(1 + ((wd - d.getDay() + 7) % 7) + (n - 1) * 7); return d; };
const lastWeekday = (y: number, mo: number, wd: number) => { const d = new Date(y, mo + 1, 0, 12); d.setDate(d.getDate() - ((d.getDay() - wd + 7) % 7)); return d; };
const add = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export type CommercialDate = { date: string; title: string; kind: string; tip: string };

/** Datas comerciais do varejo de moda no Brasil. Aproximadas onde dependem da loja (lançamentos e liquidações). */
export function commercialDates(year: number): CommercialDate[] {
  const p = easter(year);
  const list: [Date, string, string, string][] = [
    [new Date(year, 0, 2, 12), "Liquidação de verão", "liquidacao", "Só depois do Natal: nada de antecipar a liquidação."],
    [add(p, -47), "Carnaval", "data", "Looks e acessórios de festa; aquecimento uma semana antes."],
    [new Date(year, 1, 20, 12), "Volta às aulas e rotina", "data", "Peças básicas e de trabalho, kits."],
    [new Date(year, 2, 8, 12), "Dia da Mulher", "data", "Experiência e presente, evite desconto puro."],
    [new Date(year, 2, 15, 12), "Dia do Consumidor", "data", "A Black do primeiro semestre: oportunidade em peças selecionadas."],
    [new Date(year, 2, 20, 12), "Lançamento outono-inverno", "lancamento", "Coleção nova a preço cheio, VIP primeiro."],
    [add(p, 0), "Páscoa", "data", "Presente por faixa de compra."],
    [nthWeekday(year, 4, 0, 2), "Dia das Mães", "data", "Maior data do semestre: PDF de presentes, embalagem, pós-venda."],
    [new Date(year, 5, 12, 12), "Dia dos Namorados", "data", "Kits e presente para ele e para ela."],
    [new Date(year, 6, 1, 12), "Liquidação de inverno", "liquidacao", "Gire o parado há mais de 60 dias."],
    [nthWeekday(year, 7, 0, 2), "Dia dos Pais", "data", "Presente com a marca da loja."],
    [new Date(year, 7, 20, 12), "Lançamento primavera-verão", "lancamento", "Coleção nova, cartela de cores na vitrine."],
    [new Date(year, 8, 15, 12), "Dia do Cliente", "data", "Evento para as melhores clientes."],
    [new Date(year, 9, 1, 12), "Dia do Vendedor", "data", "Desafio com a equipe."],
    [new Date(year, 9, 12, 12), "Dia das Crianças", "data", "Ação de presente ou parceria."],
    [new Date(year, 9, 15, 12), "Outubro Rosa", "data", "Causa com propósito, sem desconto."],
    [new Date(year, 10, 19, 12), "Dia do Empreendedorismo Feminino", "data", "Conteúdo de bastidor e história da loja."],
    [lastWeekday(year, 10, 5), "Black Friday", "data", "Só oportunidade, nunca coleção; desconto 'até' em peças selecionadas; VIP antes."],
    [new Date(year, 11, 8, 12), "Dia da Família", "data", "Ação de presente para a família."],
    [new Date(year, 11, 21, 12), "Lançamento alto verão", "lancamento", "Perto de 21/12, com verba que sobrou."],
    [new Date(year, 11, 25, 12), "Natal", "data", "Presente por faixa de compra (até 10%), PDF de presentes por semana, live semanal, embalagem pronta."],
  ];
  return list.map(([d, title, kind, tip]) => ({ date: iso(d), title, kind, tip })).sort((a, b) => a.date.localeCompare(b.date));
}

/** fases padrão de uma ação (antes, durante, depois), do checklist da ação do método */
export const PHASES = {
  before: ["Definir peças e oferta", "Montar a vitrine e o VM", "Avisar primeiro as clientes VIP e as inativas", "Aquecimento no Instagram e no WhatsApp", "Treinar a equipe e combinar a meta"],
  during: ["Conteúdo diário (stories e post)", "Acompanhar a meta do dia com a equipe", "Atendimento pelo WhatsApp com responsável"],
  after: ["Agradecimento e pós-venda", "Conferir o resultado contra a meta", "Anotar o que repetir e o que mudar"],
};
export const toItems = (xs: string[]): Item[] => xs.map((t) => ({ t, done: false }));

/** Perfil estratégico da loja: a IA usa em todas as campanhas. */
export const PROFILE_FIELDS: [string, string, string][] = [
  ["publico", "Cliente ideal", "Ex.: mulheres de 28 a 45 anos, trabalham fora, compram para ocasiões e trabalho"],
  ["estilo", "Estilo e posicionamento", "Ex.: moda feminina casual chic, curadoria, peças versáteis"],
  ["preco", "Faixa de preço", "Ex.: vestidos de R$ 189 a R$ 399"],
  ["voz", "Tom de voz", "Ex.: próxima, elegante, sem gírias, chama a cliente pelo nome"],
  ["diferenciais", "Diferenciais", "Ex.: atendimento personalizado, malinha em casa, provador com consultoria"],
  ["canais", "Canais e alcance", "Ex.: loja física no centro, Instagram @isys, lista de WhatsApp com 600 clientes"],
];
export type StoreProfile = Record<string, any> & { ticket?: number | null; conversao?: number | null };
export function profileText(p?: StoreProfile | null) {
  if (!p) return "";
  const lines = PROFILE_FIELDS.filter(([k]) => p[k]).map(([k, l]) => `${l}: ${p[k]}`);
  if (p.ticket) lines.push(`Ticket médio: R$ ${p.ticket}`);
  if (p.conversao) lines.push(`Conversão do atendimento: ${p.conversao}%`);
  return lines.join("\n");
}

/** A conta da meta: quantas vendas e atendimentos a ação precisa. */
export function goalMath(goal?: number | null, ticket?: number | null, conversao?: number | null, days = 1) {
  if (!goal || !ticket) return null;
  const vendas = Math.ceil(goal / ticket);
  const atend = conversao ? Math.ceil(vendas / (conversao / 100)) : null;
  return { vendas, atend, vendasDia: Math.ceil(vendas / Math.max(1, days)), atendDia: atend ? Math.ceil(atend / Math.max(1, days)) : null };
}
export const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 864e5);
export const addDays = (d: string, n: number) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return iso(x); };
export const PHASE_COLOR: Record<string, string> = { Antes: "#7aa7ff", Durante: "var(--color-mint)", Depois: "#c084fc" };
