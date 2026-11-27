"use client";
import Link from "next/link";
import Ajuda from "@/components/ajuda/Ajuda";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { I } from "@/components/icons";
import { LIXEIRA_DIAS, prazoTexto } from "@/lib/lixeira";

/* Lixeira do HUB inteiro: tudo que foi excluído nos últimos 15 dias, de qualquer área, com Recuperar.
   Junta a lixeira geral (lixeira_lotes) com as listas que usam deleted_at/archived_at (briefings, marcas e peças). */
type Item = { key: string; titulo: string; sub: string; at: string; link?: string | null; recuperar: () => Promise<string | null> };

const NOMES: Record<string, string> = {
  ag_tasks: "tarefas", ag_projects: "projetos", ag_events: "eventos", ag_bookings: "reservas", ag_lists: "listas", ag_spaces: "espaços",
  ag_space_statuses: "etapas", ag_tags: "etiquetas", ag_transactions: "lançamentos", fin_charges: "cobranças", fin_categories: "categorias",
  status_history: "linhas de histórico", ag_project_events: "linhas de histórico", content_ideas: "conteúdos", content_events: "linhas de histórico",
  av_shots: "planos", av_takes: "takes", ig_posts: "posts", ig_account_daily: "dias de métricas", automations: "automações", automation_logs: "registros",
  dm_flows: "fluxos", dm_flow_logs: "registros", dm_contacts: "contatos", scheduled_posts: "publicações", growth_plans: "estratégias",
  profile_diagnoses: "diagnósticos", ref_profiles: "perfis de referência", references_lib: "referências", ag_clients: "clientes", ag_deals: "negócios",
  ag_proposals: "propostas", ag_services: "serviços", ag_price_items: "itens de preço", ag_equipment: "equipamentos", ag_team: "pessoas",
  av_style_kits: "kits", av_shoots: "ordens do dia", brainstorm_boards: "quadros", ec_actions: "ações", ec_members: "acessos", plans: "planos", invites: "convites",
};
const resumoTexto = (r: Record<string, number>) => Object.entries(r || {}).map(([t, n]) => `${n} ${NOMES[t] || t}`).join(", ");

export default function LixeiraPage() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean; link?: string | null } | null>(null);

  async function load() {
    const s = createClient();
    const [lotes, briefings, design] = await Promise.all([
      s.from("lixeira_lotes").select("id,rotulo,link,resumo,apagado_em").order("apagado_em", { ascending: false }),
      s.from("design_briefings").select("id,title,client_name,deleted_at").not("deleted_at", "is", null),
      s.from("design_projects").select("id,kind,title,data,archived_at").not("archived_at", "is", null),
    ]);
    const out: Item[] = [
      ...(lotes.data || []).map((l: any) => ({
        key: "l" + l.id, titulo: l.rotulo, sub: resumoTexto(l.resumo), at: l.apagado_em, link: l.link,
        recuperar: async () => { const { error } = await s.rpc("lixeira_restaurar", { p_lote: l.id }); return error ? error.message : null; },
      })),
      ...(briefings.data || []).map((b: any) => ({
        key: "b" + b.id, titulo: `Briefing: ${b.title || b.client_name || "sem título"}`, sub: "Design", at: b.deleted_at, link: `/design/briefings/${b.id}`,
        recuperar: async () => { const { error } = await s.from("design_briefings").update({ deleted_at: null }).eq("id", b.id); return error?.message || null; },
      })),
      ...(design.data || []).map((d: any) => ({
        key: "d" + d.id, titulo: `${d.kind === "marca" ? "Marca" : d.kind === "carrossel" ? "Carrossel" : "Peça"}: ${d.data?.brief?.nome || d.title}`, sub: "Design", at: d.archived_at,
        link: d.kind === "marca" ? `/design/marcas/${d.id}` : `/design/pecas/${d.id}`,
        recuperar: async () => { const { error } = await s.from("design_projects").update({ archived_at: null }).eq("id", d.id); return error?.message || null; },
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    setItens(out);
  }
  useEffect(() => { load(); }, []);

  async function recuperar(x: Item) {
    setBusy(x.key); setMsg(null);
    const err = await x.recuperar();
    setBusy("");
    if (err) return setMsg({ t: "Não deu para recuperar: " + err.replace(/^.*?ERROR:\s*/, "") });
    setMsg({ t: `${x.titulo} voltou para o lugar.`, ok: true, link: x.link });
    load();
  }

  return (
    <main className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between px-5 md:px-10 py-5 border-b border-line">
        <Link href="/"><Logo className="h-6" /></Link>
        <Link href="/conta" className="btn btn-ghost btn-sm"><I.back className="w-3.5 h-3.5" />Minha conta</Link>
      </header>
      <div className="max-w-xl mx-auto px-4 sm:px-5 py-8 space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Lixeira <Ajuda tela className="relative -top-1 ml-1" /></h1>
          <p className="text-sm text-fog mt-1">Tudo o que você exclui no HUB fica aqui por {LIXEIRA_DIAS} dias. Recuperar devolve o item como estava, com o que saiu junto (por exemplo, as tarefas de um projeto). Depois do prazo, é apagado de vez sozinho.</p>
        </div>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>
            {msg.t} {msg.ok && msg.link && <Link href={msg.link} className="underline">Abrir</Link>}
          </p>
        )}
        {itens === null ? (
          <div className="card h-40 animate-pulse" />
        ) : !itens.length ? (
          <div className="card p-8 text-center">
            <I.trash className="w-6 h-6 mx-auto text-fog" />
            <p className="font-display font-bold mt-3">A lixeira está vazia</p>
            <p className="text-sm text-fog mt-1">Quando você excluir algo, ele aparece aqui.</p>
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {itens.map((x) => (
              <div key={x.key} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{x.titulo}</p>
                  <p className="text-[11px] text-fog">{x.sub ? `${x.sub} · ` : ""}{prazoTexto(x.at)}</p>
                </div>
                <button onClick={() => recuperar(x)} disabled={!!busy} className="btn btn-ghost !py-1.5 text-sm shrink-0"><I.refresh className="w-4 h-4" />{busy === x.key ? "Recuperando…" : "Recuperar"}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
