import { addDays, todayBR } from "@/components/dia/shared";

export type Nota = { id: string; kind: string; title: string; body?: string | null; href?: string | null; source_type?: string | null; source_id?: string | null; created_at: string; read_at?: string | null; snoozed_until?: string | null };
export type Tom = "danger" | "warn" | "mint" | "muted";
export type Cat = "tarefas" | "agenda" | "conteudo" | "gestor" | "rotina" | "outros";

export const CATS: { key: Cat; label: string }[] = [
  { key: "tarefas", label: "Tarefas" },
  { key: "agenda", label: "Agenda" },
  { key: "conteudo", label: "Conteúdo" },
  { key: "gestor", label: "Gestor" },
  { key: "rotina", label: "Rotina" },
  { key: "outros", label: "Outros" },
];

const KIND: Record<string, { label: string; cat: Cat; tom: Tom; prefixo?: string }> = {
  tarefa_atrasada: { label: "Tarefa atrasada", cat: "tarefas", tom: "danger", prefixo: "Atrasada: " },
  tarefa_hoje: { label: "Para hoje", cat: "tarefas", tom: "mint", prefixo: "Para hoje: " },
  lembrete: { label: "Lembrete", cat: "tarefas", tom: "warn", prefixo: "Lembrete: " },
  evento_em_breve: { label: "Em 1 hora", cat: "agenda", tom: "mint", prefixo: "Em 1 h: " },
  conteudo_atrasado: { label: "Conteúdo atrasado", cat: "conteudo", tom: "danger", prefixo: "Conteúdo atrasado: " },
  revisoes_excedidas: { label: "Revisões demais", cat: "gestor", tom: "warn" },
  cobranca_vencida: { label: "Recebimento vencido", cat: "gestor", tom: "danger", prefixo: "Recebimento vencido: " },
  proposta_sem_resposta: { label: "Proposta sem resposta", cat: "gestor", tom: "warn", prefixo: "Proposta sem resposta: " },
  rotina: { label: "Rotina", cat: "rotina", tom: "muted" },
};

/** rótulo, categoria, tom e título sem o prefixo repetido ("Atrasada: …") */
export function meta(n: Nota) {
  const k = KIND[n.kind] || { label: "Aviso", cat: "outros" as Cat, tom: "muted" as Tom };
  const cat: Cat = n.kind === "revisoes_excedidas" && n.source_type === "content" ? "conteudo" : k.cat;
  const titulo = k.prefixo && n.title.startsWith(k.prefixo) ? n.title.slice(k.prefixo.length) : n.title;
  return { ...k, cat, titulo };
}

export const ativo = (n: Nota, agora = Date.now()) => !n.read_at && (!n.snoozed_until || Date.parse(n.snoozed_until) <= agora);
export const adiado = (n: Nota, agora = Date.now()) => !n.read_at && !!n.snoozed_until && Date.parse(n.snoozed_until) > agora;

export const ha = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4));
  return m < 1 ? "agora" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
};

const diaBR = (iso: string) => new Date(Date.parse(iso) - 3 * 3600e3).toISOString().slice(0, 10);

/** Hoje, Ontem, Esta semana, Anteriores */
export function grupos(lista: Nota[]) {
  const hoje = todayBR(), ontem = addDays(hoje, -1), semana = addDays(hoje, -6);
  const out: { titulo: string; itens: Nota[] }[] = [
    { titulo: "Hoje", itens: [] }, { titulo: "Ontem", itens: [] }, { titulo: "Esta semana", itens: [] }, { titulo: "Anteriores", itens: [] },
  ];
  for (const n of lista) {
    const d = diaBR(n.created_at);
    out[d >= hoje ? 0 : d === ontem ? 1 : d >= semana ? 2 : 3].itens.push(n);
  }
  return out.filter((g) => g.itens.length);
}

/** horários para adiar (Brasília) */
export function opcoesAdiar() {
  const hoje = todayBR();
  const seg = (() => { const w = new Date(hoje + "T12:00:00Z").getUTCDay(); return addDays(hoje, ((8 - w) % 7) || 7); })();
  return [
    { label: "1 hora", ate: new Date(Date.now() + 3600e3).toISOString() },
    { label: "Amanhã 8h", ate: new Date(`${addDays(hoje, 1)}T08:00:00-03:00`).toISOString() },
    { label: "Segunda 8h", ate: new Date(`${seg}T08:00:00-03:00`).toISOString() },
  ];
}

export const TOM_CLS: Record<Tom, string> = {
  danger: "bg-danger/12 text-danger",
  warn: "bg-[#f5c84c]/12 text-[#f5c84c]",
  mint: "bg-mint/12 text-mint",
  muted: "bg-panel2 text-fog",
};
