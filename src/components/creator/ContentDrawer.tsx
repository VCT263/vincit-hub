"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { FORMAT_LIST, MAX_REVISIONS, blockers, isLate } from "@/lib/content";
import { estimate, parseScript } from "@/lib/prompter";
import ScriptSheet from "@/components/creator/ScriptSheet";

type Props = { item: any; statuses: any[]; accounts: any[]; clients: any[]; pillars: string[]; assignees: string[]; onClose: () => void; onSaved: () => void };

const APPROVAL: Record<string, { l: string; c: string }> = {
  pendente: { l: "Aguardando o cliente", c: "#f5c84c" },
  aprovado: { l: "Aprovado", c: "#6eefb6" },
  ajuste: { l: "Ajuste pedido", c: "#ff6b6b" },
  dispensada: { l: "Etapa pulada", c: "#8a8f94" },
};

/** painel lateral de um conteúdo: campos de cada etapa, aprovação, revisões, link do post e histórico */
export default function ContentDrawer({ item, statuses, accounts, clients, pillars, assignees, onClose, onSaved }: Props) {
  const [f, setF] = useState<any>(item);
  const [events, setEvents] = useState<any[]>([]);
  const [err, setErr] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const s = () => createClient();
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const stageOf = (id: string) => statuses.find((x) => x.id === id)?.stage;
  const statusFor = (stage: string) => statuses.find((x) => x.stage === stage)?.id;
  const hasApproval = statuses.some((x) => x.stage === "aprovacao");

  useEffect(() => { setF(item); setErr([]); }, [item]);
  useEffect(() => {
    if (!item?.id) return;
    s().from("content_events").select("*").eq("idea_id", item.id).order("created_at", { ascending: false }).limit(30).then(({ data }) => setEvents(data || []));
  }, [item?.id]);

  const fields = ["title", "body", "format", "planned_for", "account_id", "client_id", "assignee", "pillar", "hook", "record_date", "final_url", "caption", "post_url", "status_id"];
  async function save(extra: any = {}, close = true) {
    const next = { ...f, ...extra };
    if (next.status_id !== item.status_id) {
      const b = blockers({ ...next, status_id: item.status_id }, statuses, next.status_id);
      if (b.length) { setErr(b); return false; }
    }
    setBusy(true);
    // post publicado fora do HUB: identifica o post na conta conectada para puxar as métricas
    if ((next.post_url || "") !== (item.post_url || "")) {
      extra = { ...extra, ig_media_id: null };
      const r = !next.post_url ? null : await fetch("/api/meta/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: next.post_url, account_id: next.account_id || undefined }) }).catch(() => null);
      const j = r?.ok ? await r.json().catch(() => null) : null;
      if (j?.post?.ig_media_id) extra = { ...extra, ig_media_id: j.post.ig_media_id };
    }
    const all = { ...next, ...extra };
    const row: any = {}; for (const k of [...fields, ...Object.keys(extra)]) row[k] = all[k] === "" ? null : all[k];
    const { error } = await s().from("content_ideas").update(row).eq("id", item.id);
    setBusy(false);
    if (error) { setErr([error.message]); return false; }
    setErr([]); onSaved(); if (close) onClose(); else setF(next);
    return true;
  }

  async function approve() {
    const cur = statuses.find((x) => x.id === f.status_id);
    const nextSt = cur?.stage === "aprovacao" ? statuses.find((x) => x.position > cur.position) : null;
    await save({ approval: "aprovado", approved_at: new Date().toISOString(), status_id: nextSt?.id || f.status_id }, false);
    await s().from("content_events").insert({ idea_id: item.id, kind: "cliente", text: "Aprovação marcada manualmente" + (note.trim() ? `: ${note.trim()}` : ""), author: "Você" });
    setNote(""); reloadEvents();
  }
  async function adjust() {
    const rev = (f.revisions || 0) + 1;
    await save({ approval: "ajuste", revisions: rev, approval_note: note.trim() || null, status_id: statusFor("edicao") || f.status_id }, false);
    await s().from("content_events").insert({ idea_id: item.id, kind: "revisao", text: `Ajuste ${rev}` + (note.trim() ? `: ${note.trim()}` : ""), author: "Você" });
    setNote(""); reloadEvents();
  }
  async function skip() {
    const cur = statuses.find((x) => x.id === f.status_id);
    const nextSt = cur?.stage === "aprovacao" ? statuses.find((x) => x.position > cur.position) : null;
    await save({ approval: "dispensada", status_id: nextSt?.id || f.status_id }, false);
  }
  async function shareLink() {
    let token = f.approval_token;
    // novo pedido de aprovação depois de um ajuste: o cliente responde de novo pelo mesmo link
    const patch: any = { approval: "pendente" };
    if (!token) { token = crypto.randomUUID(); patch.approval_token = token; }
    await s().from("content_ideas").update(patch).eq("id", item.id);
    setF((x: any) => ({ ...x, ...patch }));
    await navigator.clipboard?.writeText(`${location.origin}/r/conteudo/${token}`).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2500); onSaved();
  }
  async function archive() {
    await s().from("content_ideas").update({ archived_at: f.archived_at ? null : new Date().toISOString() }).eq("id", item.id);
    onSaved(); onClose();
  }
  function reloadEvents() { s().from("content_events").select("*").eq("idea_id", item.id).order("created_at", { ascending: false }).limit(30).then(({ data }) => setEvents(data || [])); }

  const st = stageOf(f.status_id);
  const order = (k: string) => statuses.find((x) => x.stage === k)?.position ?? 99;
  const curPos = statuses.find((x) => x.id === f.status_id)?.position ?? 0;
  const reached = (k: string) => curPos >= order(k) - 1; // mostra os campos da etapa atual e da próxima
  const over = (f.revisions || 0) > MAX_REVISIONS;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-panel border-l border-line p-5 md:p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 gap-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            <select className="input !py-1 !w-auto text-sm" value={f.status_id || ""} onChange={(e) => set("status_id", e.target.value)}>
              {statuses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            {isLate(item, statuses) && <span className="chip" style={{ color: "#ff6b6b" }}>Atrasado</span>}
            {f.archived_at && <span className="chip">Arquivado</span>}
          </div>
          <button className="text-fog text-sm hover:text-paper" onClick={onClose}>Fechar</button>
        </div>

        {err.length > 0 && <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"><p className="font-semibold text-danger">Para avançar, preencha:</p><p className="text-fog mt-1">{err.join(", ")}.</p></div>}
        {f.publish_error && <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"><p className="font-semibold text-danger">A publicação falhou</p><p className="text-fog mt-1">{f.publish_error}</p></div>}

        <label className="label">Título</label>
        <input className="input mb-4" value={f.title || ""} onChange={(e) => set("title", e.target.value)} />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="label">Perfil</label><select className="input" value={f.account_id || ""} onChange={(e) => set("account_id", e.target.value)}><option value="">–</option>{accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}</select></div>
          <div><label className="label">Cliente</label><select className="input" value={f.client_id || ""} onChange={(e) => set("client_id", e.target.value)}><option value="">Conteúdo próprio</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select></div>
          <div className="col-span-2"><label className="label">Responsável</label><input className="input" list="cd-assignees" value={f.assignee || ""} onChange={(e) => set("assignee", e.target.value)} placeholder="Nome de quem cuida (sem login)" /><datalist id="cd-assignees">{assignees.map((x) => <option key={x} value={x} />)}</datalist></div>
        </div>

        <Section title="Pauta">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Publicação</label><input type="date" className="input" value={f.planned_for || ""} onChange={(e) => set("planned_for", e.target.value)} /></div>
            <div><label className="label">Formato</label><select className="input" value={f.format || ""} onChange={(e) => set("format", e.target.value)}><option value="">–</option>{FORMAT_LIST.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div><label className="label">Pilar</label><input className="input" list="cd-pillars" value={f.pillar || ""} onChange={(e) => set("pillar", e.target.value)} /><datalist id="cd-pillars">{pillars.map((x) => <option key={x} value={x} />)}</datalist></div>
          </div>
        </Section>

        <Section title="Roteiro">
          <button onClick={() => setSheet(true)} className="group w-full text-left rounded-2xl border border-line hover:border-mint bg-panel2 p-3 flex gap-4 items-stretch transition-colors">
            {/* miniatura da folha */}
            <div className="w-[74px] shrink-0 aspect-[210/297] rounded-[3px] bg-[#fafaf7] p-2 flex flex-col gap-1 shadow-lg group-hover:-rotate-2 transition-transform">
              <span className="h-[3px] w-8 bg-[#141416] rounded" />
              <span className="h-[2px] w-12 bg-[#c9c9c3] rounded" />
              <span className="h-px w-full bg-[#141416] my-1" />
              {[0, 1, 2, 3, 4].map((i) => <span key={i} className="flex gap-1"><span className="h-[2px] w-5 bg-[#c9c9c3] rounded" /><span className="h-[2px] flex-1 bg-[#dcdcd6] rounded" /></span>)}
              <span className="mt-auto h-[3px] w-3 rounded bg-mint" />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <p className="font-display font-extrabold text-lg leading-tight">Roteiro técnico</p>
              <p className="text-xs text-fog mt-1 leading-relaxed">{f.hook ? `“${f.hook}”` : f.body ? "Pauta, falas, tabela de direção técnica e set numa folha A4." : "Ainda sem roteiro. Abra a folha para escrever."}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mt-2">{f.body ? `${parseScript(f.body).words.length} palavras · ~${estimate(parseScript(f.body).words.length)}` : "folha em branco"}</p>
              <span className="btn btn-mint btn-sm mt-3 pointer-events-none">Abrir folha</span>
            </div>
          </button>
          <Link href={`/creator/laboratorio?tab=criar${f.card ? `&carta=${f.card}` : ""}${f.format ? `&format=${encodeURIComponent(f.format)}` : ""}`} className="btn btn-ghost btn-sm mt-3"><I.flask className="w-4 h-4" />Desenvolver no Laboratório</Link>
        </Section>

        {reached("producao") && (
          <Section title="Produção e edição">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Data de gravação</label><input type="date" className="input" value={f.record_date || ""} onChange={(e) => set("record_date", e.target.value)} /></div>
              <div><label className="label">Link da versão final</label><input className="input" value={f.final_url || ""} onChange={(e) => set("final_url", e.target.value)} placeholder="Drive, Frame.io, Vimeo…" /></div>
            </div>
            <p className="text-xs text-fog mt-2">A edição pode ser feita em qualquer ferramenta. Cole aqui o link do material pronto.</p>
          </Section>
        )}

        {reached("revisao") && (
          <Section title="Legenda final">
            <textarea className="input min-h-[110px]" value={f.caption || ""} onChange={(e) => set("caption", e.target.value)} placeholder="Primeira linha até 125 caracteres, até 5 hashtags" />
            {f.caption && <p className={`text-[11px] mt-1 ${(f.caption.split("\n")[0] || "").length > 125 ? "text-danger" : "text-fog"}`}>Primeira linha: {(f.caption.split("\n")[0] || "").length}/125 · {(f.caption.match(/#\w+/g) || []).length}/5 hashtags</p>}
          </Section>
        )}

        {hasApproval && reached("aprovacao") && (
          <Section title="Aprovação do cliente (opcional)">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {f.approval ? <span className="chip" style={{ color: APPROVAL[f.approval]?.c }}>{APPROVAL[f.approval]?.l}</span> : <span className="chip">Não enviada</span>}
              <span className="chip" style={over ? { color: "#ff6b6b" } : undefined}>Revisões {f.revisions || 0}/{MAX_REVISIONS}</span>
            </div>
            {over && <p className="text-sm text-danger mb-3">Este conteúdo passou do limite de {MAX_REVISIONS} revisões combinado.</p>}
            {f.approval === "ajuste" && f.approval_note && <p className="text-sm bg-panel2 rounded-lg p-3 mb-3"><span className="text-fog">Pedido do cliente: </span>{f.approval_note}</p>}
            <input className="input mb-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (opcional; obrigatória no ajuste)" />
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={approve} className="btn btn-mint btn-sm">Marcar aprovado</button>
              <button disabled={busy || !note.trim()} onClick={adjust} className="btn btn-ghost btn-sm">Pedir ajuste</button>
              <button disabled={busy} onClick={shareLink} className="btn btn-ghost btn-sm"><I.link className="w-4 h-4" />{copied ? "Link copiado" : "Copiar link para o cliente"}</button>
              {f.approval !== "aprovado" && <button disabled={busy} onClick={skip} className="btn btn-ghost btn-sm">Pular aprovação</button>}
            </div>
            <p className="text-xs text-fog mt-2">Pedir ajuste volta o conteúdo para Edição e soma uma revisão. O cliente abre o link sem login.</p>
          </Section>
        )}

        {reached("publicado") && (
          <Section title="Publicação">
            <label className="label">Link do post</label>
            <input className="input" value={f.post_url || ""} onChange={(e) => set("post_url", e.target.value)} placeholder="https://www.instagram.com/p/…" />
            <p className="text-xs text-fog mt-2">Publicou fora do HUB? Cole o link do post. Para publicar pelo HUB, agende em Automações.</p>
            <Link href="/creator/automacoes?tab=agendar" className="btn btn-ghost btn-sm mt-3">Agendar publicação</Link>
          </Section>
        )}

        {events.length > 0 && (
          <details className="mt-5">
            <summary className="text-sm text-fog cursor-pointer">Histórico ({events.length})</summary>
            <ul className="mt-2 space-y-1.5">{events.map((e) => (
              <li key={e.id} className="text-xs flex gap-2"><span className="text-fog shrink-0 w-24">{new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <span>{e.kind === "status" ? (e.from_status ? `${e.from_status} → ${e.to_status}` : `Criado em ${e.to_status}`) : `${e.author ? e.author + ": " : ""}${e.text}`}</span></li>
            ))}</ul>
          </details>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-line">
          <button onClick={archive} className="btn btn-ghost">{f.archived_at ? "Restaurar" : "Arquivar"}</button>
          <button disabled={busy} onClick={() => save()} className="btn btn-mint">Salvar</button>
        </div>
      </div>
      {sheet && item?.id && (
        <ScriptSheet
          item={{ ...f, id: item.id }}
          accountName={accounts.find((a) => a.id === f.account_id)?.username}
          clientName={(() => { const c = clients.find((c) => c.id === f.client_id); return c ? c.company || c.name : null; })()}
          statusName={statuses.find((x) => x.id === f.status_id)?.name}
          onPatch={(p) => { setF((x: any) => ({ ...x, ...p })); onSaved(); }}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="border-t border-line pt-4 mt-4"><p className="font-mono text-[11px] text-mint tracking-widest uppercase mb-3">{title}</p>{children}</div>);
}
