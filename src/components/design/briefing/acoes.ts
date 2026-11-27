import { createClient } from "@/lib/supabase/client";
import { ETAPAS, toBrief } from "@/lib/briefing-cliente";

export type Briefing = { id: string; token: string; title: string; client_name?: string; client_id?: string; intro?: string; status: "aberto" | "respondido" | "projeto" | "arquivado"; answers: any; respondent?: string; answered_at?: string; notes?: string; brand_id?: string; versoes?: Versao[]; created_at: string; updated_at: string };
export type Versao = { at: string; por: "cliente" | "equipe"; nome?: string; motivo?: string; answers: any };

export const briefingUrl = (token: string) => `${typeof window !== "undefined" ? window.location.origin : "https://vincit-hub.vercel.app"}/b/${token}`;
export const brandUrl = (token: string) => `${typeof window !== "undefined" ? window.location.origin : "https://vincit-hub.vercel.app"}/m/${token}`;

export const STATUS: Record<Briefing["status"], { l: string; c: string }> = {
  aberto: { l: "Aguardando o cliente", c: "text-fog border-line" },
  respondido: { l: "Respondido", c: "text-mint border-mint-dim bg-mint/[.07]" },
  projeto: { l: "Virou projeto", c: "text-paper border-line bg-panel2" },
  arquivado: { l: "Arquivado", c: "text-fog border-line" },
};

export const whatsLink = (b: Pick<Briefing, "token" | "client_name">) =>
  `https://wa.me/?text=${encodeURIComponent(`Oi${b.client_name ? `, ${b.client_name.split(" ")[0]}` : ""}! Para começar a sua marca, preparei um briefing rápido. Responda com calma, do seu jeito: ${briefingUrl(b.token)}`)}`;

/** guarda a versão atual no histórico (mais nova primeiro, até 6) */
export const comVersao = (b: Briefing, motivo: string, por: Versao["por"] = "equipe"): Versao[] =>
  (b.answers && Object.keys(b.answers).length ? [{ at: b.answers._editado_em || b.answered_at || b.updated_at, por, nome: b.respondent, motivo, answers: b.answers }, ...(b.versoes || [])] : b.versoes || []).slice(0, 6);

/** perguntas cujas respostas mudaram entre duas versões */
export const mudancas = (de: any = {}, para: any = {}) =>
  ETAPAS.flatMap((e) => e.qs).filter((q) => JSON.stringify(de[q.k] ?? null) !== JSON.stringify(para[q.k] ?? null));

/** briefing respondido → projeto de marca na Criação de marca, já com briefing e referências preenchidos */
export async function criarProjeto(b: Briefing): Promise<string | null> {
  const sb = createClient();
  const { brief, refs, strategy, palette } = toBrief(b.answers);
  const nome = brief.nome || b.client_name || b.title;
  const a = b.answers || {};
  const data = { brief, refs, ...(strategy ? { strategy } : {}), ...(palette ? { palette } : {}), cliente: { briefing_id: b.id, respondent: b.respondent, answered_at: b.answered_at, notas: b.notes || "", paletas: a.paletas || [], letras: a.letras || [], letra_eixos: a.letra_eixos || {} } };
  const { data: row, error } = await sb.from("design_projects").insert({ kind: "marca", title: nome, client_id: b.client_id || null, briefing_id: b.id, step: "estrategia", data }).select("id").single();
  if (error || !row) return null;
  await sb.from("design_briefings").update({ status: "projeto", brand_id: row.id }).eq("id", b.id);
  return row.id;
}
