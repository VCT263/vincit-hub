"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { FORMAT_LIST, MAX_REVISIONS, blockers, isLate } from "@/lib/content";
import { estimate, parseScript } from "@/lib/prompter";
import ScriptSheet from "@/components/creator/ScriptSheet";
import { apagarComLixeira } from "@/lib/lixeira";

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
  // excluir: só para card arquivado, em 2 etapas (abrir o aviso e confirmar com a senha); vai para a lixeira
  const [del, setDel] = useState<0 | 1>(0);
  const [delErr, setDelErr] = useState<string | null>(null);
  async function destroy() {
    setDelErr(null);
    const ok = await apagarComLixeira({ tabela: "content_ideas", filtro: { id: item.id }, oque: `o conteúdo "${f.title || "sem título"}"`, rotulo: `Conteúdo: ${f.title || "sem título"}`, link: "/creator/producao" });
    if (!ok) { setDelErr("Não foi excluído."); return; }
    onSaved(); onClose();
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

        {/* jornada do card: onde está e qual o próximo passo (visual, 27/11) */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto scroll-thin pb-1">
          {statuses.map((x, i) => {
            const done = (x.position ?? 0) < curPos, now = x.id === f.status_id;
            return (
              <button key={x.id} type="button" onClick={() => set("status_id", x.id)} title={x.name} className="flex items-center gap-1 shrink-0">
                {i > 0 && <span className="w-3 h-px" style={{ background: done || now ? x.color : "var(--color-line)" }} />}
                <span className={`rounded-full text-[10px] font-semibold px-2 py-0.5 border ${now ? "" : "opacity-70"}`} style={now ? { background: x.color + "26", borderColor: x.color, color: x.color } : done ? { borderColor: x.color + "66", color: x.color } : { borderColor: "var(--color-line)", color: "var(--color-fog)" }}>{done ? "✓ " : ""}{x.name}</span>
              </button>
            );
          })}
        </div>

        <input className="w-full bg-transparent font-display font-extrabold text-2xl leading-tight outline-none border-b border-transparent focus:border-line mb-3" value={f.title || ""} onChange={(e) => set("title", e.target.value)} aria-label="Título" />
        <div className="flex flex-wrap gap-1.5 mb-4">
          {f.format && <span className="chip">{f.format}</span>}
          {f.planned_for && <span className="chip"><I.calendar className="w-3 h-3" />{new Date(f.planned_for + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
          {f.account_id && <span className="chip">@{accounts.find((a) => a.id === f.account_id)?.username}</span>}
          {f.pillar && <span className="chip">{f.pillar}</span>}
        </div>

        <NextStep stage={st} f={f} itemId={item.id} onSheet={() => setSheet(true)} onShare={shareLink} copied={copied}
          next={statuses.find((x) => (x.position ?? 0) > curPos)} onAdvance={(id) => save({ status_id: id }, false)} busy={busy} />

        <details className="mb-2 group">
          <summary className="cursor-pointer text-xs text-fog hover:text-mint w-fit mb-3">Perfil, cliente e responsável</summary>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="label">Perfil</label><select className="input" value={f.account_id || ""} onChange={(e) => set("account_id", e.target.value)}><option value="">–</option>{accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}</select></div>
          <div><label className="label">Cliente</label><select className="input" value={f.client_id || ""} onChange={(e) => set("client_id", e.target.value)}><option value="">Conteúdo próprio</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select></div>
          <div className="col-span-2"><label className="label">Responsável</label><input className="input" list="cd-assignees" value={f.assignee || ""} onChange={(e) => set("assignee", e.target.value)} placeholder="Nome de quem cuida (sem login)" /><datalist id="cd-assignees">{assignees.map((x) => <option key={x} value={x} />)}</datalist></div>
        </div>
        </details>

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

        {del === 1 && (
          <div className="mt-6 rounded-xl border border-danger/50 bg-danger/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-danger">Excluir “{f.title || "sem título"}”?</p>
            <p className="text-xs text-fog">O card, o roteiro, a decupagem e o histórico vão juntos para a Lixeira (Minha conta). Ficam lá 15 dias e dá para recuperar tudo.</p>
            {delErr && <p className="text-xs text-danger">{delErr}</p>}
            <div className="flex justify-between">
              <button type="button" onClick={() => { setDel(0); setDelErr(null); }} className="btn btn-ghost btn-sm">Cancelar</button>
              <button type="button" onClick={destroy} className="btn btn-sm bg-danger text-ink disabled:opacity-40">Mandar para a lixeira</button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-line">
          <div className="flex gap-2">
            <button onClick={archive} className="btn btn-ghost">{f.archived_at ? "Restaurar" : "Arquivar"}</button>
            {f.archived_at && item?.id && del === 0 && <button type="button" onClick={() => setDel(1)} className="btn btn-ghost text-danger">Excluir</button>}
          </div>
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

/** o próximo passo da etapa atual, em um cartão com um botão principal */
function NextStep({ stage, f, itemId, onSheet, onShare, copied, next, onAdvance, busy }: { stage?: string; f: any; itemId: string; onSheet: () => void; onShare: () => void; copied: boolean; next?: any; onAdvance: (id: string) => void; busy: boolean }) {
  const map: Record<string, { t: string; d: string; a?: React.ReactNode }> = {
    ideia: { t: "Escrever o roteiro", d: "Gancho, falas e direção técnica na folha A4.", a: <button type="button" onClick={onSheet} className="btn btn-mint btn-sm"><I.pen className="w-4 h-4" />Abrir roteiro</button> },
    roteiro: { t: "Fechar o roteiro e marcar a gravação", d: "Confira a folha e defina a data de gravação abaixo.", a: <button type="button" onClick={onSheet} className="btn btn-mint btn-sm"><I.pen className="w-4 h-4" />Abrir roteiro</button> },
    producao: { t: "Gravar", d: "Teleprompter no celular e a ordem do dia para a equipe.", a: <><Link href={`/audiovisual/teleprompter?c=${itemId}`} className="btn btn-mint btn-sm"><I.prompter className="w-4 h-4" />Teleprompter</Link><Link href={`/audiovisual/ordem-do-dia?c=${itemId}`} className="btn btn-ghost btn-sm"><I.calendar className="w-4 h-4" />Ordem do dia</Link></> },
    edicao: { t: "Editar", d: "Edite no Editor do HUB e cole o link da versão final.", a: <Link href="/audiovisual/editor" className="btn btn-mint btn-sm"><I.video className="w-4 h-4" />Abrir Editor</Link> },
    revisao: { t: "Revisar e escrever a legenda", d: "Primeira linha até 125 caracteres, até 5 hashtags." },
    aprovacao: { t: "Enviar para o cliente aprovar", d: "O cliente abre o link sem login.", a: <button type="button" onClick={onShare} className="btn btn-mint btn-sm"><I.link className="w-4 h-4" />{copied ? "Link copiado" : "Copiar link"}</button> },
    agendado: { t: "Publicar", d: "Depois de postar, cole o link do post para puxar as métricas." },
    publicado: { t: "Acompanhar os resultados", d: "A análise de 7 dias usa o link do post.", a: f.post_url ? <a href={f.post_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Ver post ↗</a> : null },
  };
  const m = map[stage || "ideia"];
  if (!m) return null;
  return (
    <div className="rounded-2xl border border-mint-dim bg-mint/[.05] p-4 mb-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mint">Próximo passo</p>
      <p className="font-display font-bold text-lg mt-1">{m.t}</p>
      <p className="text-xs text-fog mt-0.5">{m.d}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {m.a}
        {next && <button type="button" disabled={busy} onClick={() => onAdvance(next.id)} className="btn btn-ghost btn-sm ml-auto">Mover para {next.name} →</button>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="border-t border-line pt-4 mt-4"><p className="font-mono text-[11px] text-mint tracking-widest uppercase mb-3">{title}</p>{children}</div>);
}
