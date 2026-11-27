"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { STATUS, briefingUrl, whatsLink, type Briefing } from "@/components/design/briefing/acoes";

const FILTROS = [["ativos", "Ativos"], ["respondido", "Respondidos"], ["aberto", "Aguardando"], ["projeto", "Viraram projeto"], ["arquivado", "Arquivados"]] as const;

export default function Briefings() {
  const router = useRouter();
  const [rows, setRows] = useState<Briefing[] | null>(null);
  const [f, setF] = useState<(typeof FILTROS)[number][0]>("ativos");
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ client_name: "", title: "", intro: "", client_id: "" });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.from("design_briefings").select("id,token,title,client_name,client_id,status,respondent,answered_at,brand_id,created_at,updated_at,marca:answers->>marca_nome").order("updated_at", { ascending: false }).then(({ data }) => setRows((data as any) || []));
    sb.from("ag_clients").select("id,name").order("name").then(({ data }) => setClients((data as any) || []));
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const nome = form.client_name.trim();
    const { data } = await createClient().from("design_briefings").insert({
      client_name: nome || null, title: form.title.trim() || nome || "Novo briefing", intro: form.intro.trim() || null, client_id: form.client_id || null,
    }).select("id").single();
    if (data) router.push(`/design/briefings/${data.id}`); else setBusy(false);
  }
  async function copiar(b: Briefing) { await navigator.clipboard.writeText(briefingUrl(b.token)); setCopied(b.id); setTimeout(() => setCopied(""), 1800); }

  const shown = (rows || []).filter((r) => (f === "ativos" ? r.status !== "arquivado" : r.status === f));
  const n = (s: Briefing["status"]) => (rows || []).filter((r) => r.status === s).length;

  return (
    <>
      <PageHead kicker="Design · 01 Marca" title="Briefings" desc="Crie um link, mande para o cliente e ele responde do celular, sem login. A resposta chega na Criação de marca e vira projeto com um toque.">
        <button onClick={() => setNovo((v) => !v)} className="btn btn-mint"><I.plus className="w-4 h-4" />Novo briefing</button>
      </PageHead>

      {novo && (
        <form onSubmit={criar} className="card p-5 mb-6 rise grid md:grid-cols-2 gap-4">
          <div><label className="label">Nome do cliente</label><input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Ex.: Alanis Gomes" className="input" autoFocus /></div>
          <div><label className="label">Nome do briefing (só você vê)</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Marca AG Skin" className="input" /></div>
          {clients.length > 0 && (
            <div><label className="label">Ligar a um cliente do Gestor (opcional)</label>
              <select value={form.client_id} onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); setForm({ ...form, client_id: e.target.value, client_name: form.client_name || c?.name || "" }); }} className="input">
                <option value="">Nenhum</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2"><label className="label">Mensagem de abertura (opcional)</label><textarea value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} rows={3} className="input" placeholder="Se deixar em branco, entra um texto padrão explicando que não existe resposta certa e que leva uns 15 minutos." /></div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setNovo(false)} className="btn btn-ghost">Cancelar</button>
            <button disabled={busy} className="btn btn-mint">{busy ? "Criando…" : "Criar e pegar o link"}</button>
          </div>
        </form>
      )}

      {!!rows?.length && (
        <div className="flex gap-2 overflow-x-auto scroll-thin pb-1 mb-4">
          {FILTROS.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={`chip !px-3 !py-1.5 shrink-0 ${f === k ? "chip-mint" : ""}`}>{l}{k !== "ativos" && ` · ${n(k as any)}`}</button>)}
        </div>
      )}

      {rows === null ? <div className="card h-40 animate-pulse" /> : !rows.length ? (
        <div className="card p-10 text-center rise">
          <p className="font-display text-xl font-bold">Nenhum briefing ainda</p>
          <p className="text-fog text-sm mt-2 max-w-md mx-auto">O cliente responde em 8 etapas curtas: o negócio, quem compra, personalidade, estilos, cores, referências com fotos e, principalmente, o que ele não quer de jeito nenhum.</p>
          <button onClick={() => setNovo(true)} className="btn btn-mint mt-5"><I.plus className="w-4 h-4" />Criar o primeiro briefing</button>
        </div>
      ) : !shown.length ? <p className="text-fog text-sm card p-6">Nada nesse filtro.</p> : (
        <div className="card divide-y divide-line">
          {shown.map((b) => (
            <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link href={`/design/briefings/${b.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate group-hover:text-mint">{(b as any).marca || b.title}</p>
                  <span className={`chip ${STATUS[b.status].c}`}>{STATUS[b.status].l}</span>
                </div>
                <p className="text-xs text-fog mt-1">
                  {b.client_name || "Sem cliente"} · {b.answered_at ? `respondido em ${new Date(b.answered_at).toLocaleDateString("pt-BR")} por ${b.respondent || "cliente"}` : `criado em ${new Date(b.created_at).toLocaleDateString("pt-BR")}`}
                </p>
              </Link>
              <div className="flex gap-2 shrink-0">
                {b.status === "aberto" && <>
                  <button onClick={() => copiar(b)} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />{copied === b.id ? "Copiado" : "Copiar link"}</button>
                  <a href={whatsLink(b)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">WhatsApp ↗</a>
                </>}
                {b.status === "respondido" && <Link href={`/design/briefings/${b.id}`} className="btn btn-mint btn-sm">Analisar<I.arrow className="w-3.5 h-3.5" /></Link>}
                {b.status === "projeto" && b.brand_id && <Link href={`/design/marcas/${b.brand_id}`} className="btn btn-ghost btn-sm">Abrir projeto<I.arrow className="w-3.5 h-3.5" /></Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
