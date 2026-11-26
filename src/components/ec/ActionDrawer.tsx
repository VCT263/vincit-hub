"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/agency/Modal";
import { I } from "@/components/icons";
import { useAI } from "@/lib/useAI";
import { syncTask } from "@/lib/gsync";
import { brl, fmtDay, KINDS, num, STATUS, type EcAction, type Item } from "@/lib/ecommerce";

const PH: [keyof EcAction, string, string][] = [
  ["before_items", "Antes", "aquecimento"],
  ["during_items", "Durante", ""],
  ["after_items", "Depois", "pós-venda"],
];
const addDays = (d: string, n: number) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

/** Ação do calendário: frase do método, meta, antes/durante/depois, vitrine e campanha com IA. */
export default function ActionDrawer({ action, store, onClose, onChange, onDelete }: { action: EcAction; store: any; onClose: () => void; onChange: (a: EcAction) => void; onDelete: () => void }) {
  const [a, setA] = useState<EcAction>(action);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ai = useAI();

  async function patch(values: Partial<EcAction>) {
    const next = { ...a, ...values } as EcAction;
    setA(next); onChange(next);
    const { error } = await createClient().from("ec_actions").update({ ...values, updated_at: new Date().toISOString() }).eq("id", a.id);
    if (error) setMsg(error.message);
  }
  const field = (k: keyof EcAction, v: string, kind: "text" | "money" | "date" = "text") => {
    const val = kind === "money" ? num(v) : v || null;
    if ((a[k] ?? null) !== val) patch({ [k]: val } as any);
  };

  const items = (k: keyof EcAction) => (a[k] as Item[]) || [];
  const setItems = (k: keyof EcAction, xs: Item[]) => patch({ [k]: xs } as any);

  async function campaign() {
    const r = await ai.run<any>("ecommerce_campaign", {
      store: store.name, action: { ...a, campaign: undefined },
      kind: KINDS[a.kind], today: new Date().toISOString().slice(0, 10),
    });
    if (r) patch({ campaign: { ...r, generated_at: new Date().toISOString() } });
  }

  async function sendToBoard() {
    const posts = a.campaign?.pauta || [];
    if (!posts.length) return;
    setBusy(true); setMsg(null);
    const { error } = await createClient().from("content_ideas").insert(posts.map((p: any) => ({
      kind: "plano", status: "backlog", title: `${store.name} · ${p.titulo || a.title}`.slice(0, 120), format: p.formato || null, planned_for: p.data || a.date, hook: p.gancho || null, pillar: a.title,
      body: `**Ação:** ${a.title} (${fmtDay(a.date)})\n**Fase:** ${p.fase || "-"} · **Canal:** ${p.canal || "Instagram"}\n\n**Gancho:** ${p.gancho || "-"}\n\n**Estrutura:**\n${p.roteiro || "-"}\n\n**CTA:** ${p.cta || "-"}`,
    })));
    setBusy(false);
    if (error) return setMsg(error.message);
    await patch({ campaign: { ...a.campaign, sent_at: new Date().toISOString() } });
    setMsg(`${posts.length} conteúdos enviados ao Quadro de produção do Creator (na sua conta).`);
  }

  async function makeTasks() {
    setBusy(true); setMsg(null);
    const s = createClient();
    const [{ data: spaces }, { data: sts }] = await Promise.all([s.from("ag_spaces").select("*").order("position"), s.from("ag_space_statuses").select("*").order("position")]);
    const sp = (spaces || []).find((x: any) => !["projetos", "rotina", "conteudo"].includes(x.kind) && x.name !== "Projetos" && x.name !== "Rotina") || (spaces || [])[0];
    const st = (sts || []).find((x: any) => x.space_id === sp?.id);
    const due: Record<string, string> = { before_items: a.warmup_date || addDays(a.date, -5), during_items: a.date, after_items: addDays(a.end_date || a.date, 2) };
    const rows = PH.flatMap(([k, label]) => items(k).filter((x) => !x.done).map((x) => ({
      title: `${store.name} · ${a.title}: ${x.t}`.slice(0, 200), due_date: x.due || due[k as string], description: `Fase: ${label}. Ação do calendário do E-commerce.`,
      space_id: sp?.id || null, status_id: st?.id || null, priority: null,
    })));
    const { data, error } = rows.length ? await s.from("ag_tasks").insert(rows).select("id") : { data: [], error: null };
    setBusy(false);
    if (error) return setMsg(error.message);
    (data || []).forEach((t: any) => syncTask(t.id));
    setMsg(`${rows.length} tarefas criadas em Seu dia${sp ? `, no espaço ${sp.name}` : ""}.`);
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    await createClient().from("ec_actions").delete().eq("id", a.id);
    onDelete();
  }
  const [confirmDelete, setConfirmDelete] = useState(false);

  const c = a.campaign;
  return (
    <Modal open title={a.title} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2"><label className="label">Nome da ação</label><input className="input" defaultValue={a.title} onBlur={(e) => e.target.value.trim() && field("title", e.target.value.trim())} /></div>
          <div><label className="label">Tipo</label><select className="input" value={a.kind} onChange={(e) => patch({ kind: e.target.value })}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="label">Situação</label><select className="input" value={a.status} onChange={(e) => patch({ status: e.target.value })}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="label">Aquecimento começa</label><input type="date" className="input" defaultValue={a.warmup_date || ""} onBlur={(e) => field("warmup_date", e.target.value, "date")} /></div>
          <div><label className="label">Data</label><input type="date" className="input" defaultValue={a.date} onBlur={(e) => e.target.value && field("date", e.target.value, "date")} /></div>
          <div><label className="label">Até (opcional)</label><input type="date" className="input" defaultValue={a.end_date || ""} onBlur={(e) => field("end_date", e.target.value, "date")} /></div>
          <div><label className="label">Meta R$ (mín. / máx.)</label><div className="flex gap-1"><input inputMode="decimal" className="input !px-2" defaultValue={a.goal ?? ""} onBlur={(e) => field("goal", e.target.value, "money")} /><input inputMode="decimal" className="input !px-2" defaultValue={a.goal_max ?? ""} onBlur={(e) => field("goal_max", e.target.value, "money")} /></div></div>
        </div>

        <div className="rounded-xl border border-line p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mint mb-3">A frase da ação</p>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {([["do_what", "Vou fazer", "Ex.: um evento de pré-venda do alto verão"], ["because", "porque", "Ex.: preciso girar a coleção antes de janeiro"], ["offering", "oferecendo", "Ex.: brinde acima de R$ 500"], ["audience", "para", "Ex.: as 50 melhores clientes"], ["aiming", "mirando", "Ex.: R$ 30 mil em 3 dias"]] as [keyof EcAction, string, string][]).map(([k, l, ph]) => (
              <div key={k} className={k === "aiming" ? "md:col-span-2" : ""}><label className="label">{l}</label><input className="input" defaultValue={(a[k] as string) || ""} placeholder={ph} onBlur={(e) => field(k, e.target.value)} /></div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {PH.map(([k, label, sub]) => {
            const xs = items(k);
            return (
              <div key={k} className="rounded-xl border border-line p-3">
                <p className="text-xs font-bold tracking-wide uppercase">{label} {sub && <span className="text-fog font-normal normal-case">{sub}</span>}</p>
                <div className="mt-2 space-y-1.5">
                  {xs.map((x, i) => (
                    <div key={i} className="group flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1 accent-[var(--color-mint)]" checked={!!x.done} onChange={() => setItems(k, xs.map((y, j) => (j === i ? { ...y, done: !y.done } : y)))} />
                      <span className={`flex-1 ${x.done ? "line-through text-fog" : ""}`}>{x.t}</span>
                      <button onClick={() => setItems(k, xs.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-fog hover:text-danger" aria-label="Remover"><I.trash className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const t = (draft[k as string] || "").trim(); if (!t) return; setItems(k, [...xs, { t, done: false }]); setDraft({ ...draft, [k]: "" }); }} className="mt-2">
                  <input className="input !py-1.5 text-sm" placeholder="+ item" value={draft[k as string] || ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </form>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-line p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Vitrine e atendimento</p>
          <div className="grid md:grid-cols-[140px_1fr] gap-3">
            <div><label className="label">Vitrine muda em</label><input type="date" className="input" defaultValue={a.vm_date || ""} onBlur={(e) => field("vm_date", e.target.value, "date")} /></div>
            <div><label className="label">O que vai nela</label><input className="input" defaultValue={a.vm_window || ""} onBlur={(e) => field("vm_window", e.target.value)} /></div>
            <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
              <div><label className="label">Já tenho de VM</label><input className="input" defaultValue={a.vm_have || ""} onBlur={(e) => field("vm_have", e.target.value)} /></div>
              <div><label className="label">Vou precisar</label><input className="input" defaultValue={a.vm_need || ""} onBlur={(e) => field("vm_need", e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-mint">Campanha e conteúdo</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={campaign} disabled={ai.busy} className="btn btn-ghost btn-sm"><I.spark className="w-4 h-4" />{ai.busy ? "Criando…" : c ? "Refazer com IA" : "Criar campanha com IA"}</button>
              {c?.pauta?.length > 0 && <button onClick={sendToBoard} disabled={busy} className="btn btn-mint btn-sm"><I.board className="w-4 h-4" />{c.sent_at ? "Enviar de novo ao Quadro" : "Enviar pauta ao Quadro"}</button>}
            </div>
          </div>
          {ai.error && <p className="text-sm text-danger mb-2">{ai.error}</p>}
          {!c && <p className="text-sm text-fog">Preencha a frase da ação e a meta. A IA monta o conceito, as mensagens de cada fase, a pauta de Instagram com data e o roteiro de WhatsApp para as clientes VIP e inativas.</p>}
          {c && (
            <div className="space-y-4 text-sm">
              {c.conceito && <div><p className="font-display font-bold text-lg">{c.conceito}</p>{c.mensagem && <p className="text-fog mt-1">{c.mensagem}</p>}</div>}
              {c.fases?.length > 0 && (
                <div className="grid md:grid-cols-3 gap-2">{c.fases.map((f: any, i: number) => (
                  <div key={i} className="rounded-lg bg-panel2 p-3"><p className="text-xs font-bold uppercase">{f.fase}</p><p className="text-[11px] text-fog">{f.periodo}</p><p className="mt-1">{f.objetivo}</p></div>
                ))}</div>
              )}
              {c.pauta?.length > 0 && (
                <div>
                  <p className="text-xs text-fog mb-1.5">Pauta ({c.pauta.length}){c.sent_at ? ` · enviada ao Quadro em ${new Date(c.sent_at).toLocaleDateString("pt-BR")}` : ""}</p>
                  <div className="divide-y divide-line">{c.pauta.map((p: any, i: number) => (
                    <div key={i} className="py-2 flex gap-3">
                      <span className="font-mono text-[11px] text-fog w-12 shrink-0">{fmtDay(p.data)}</span>
                      <div className="min-w-0"><p className="font-semibold">{p.titulo}</p><p className="text-xs text-fog">{[p.fase, p.canal, p.formato].filter(Boolean).join(" · ")}</p>{p.gancho && <p className="text-xs mt-0.5">“{p.gancho}”</p>}</div>
                    </div>
                  ))}</div>
                </div>
              )}
              {c.whatsapp?.length > 0 && (
                <div><p className="text-xs text-fog mb-1.5">WhatsApp</p>{c.whatsapp.map((w: any, i: number) => (
                  <div key={i} className="rounded-lg bg-panel2 p-3 mb-2"><p className="text-[11px] text-fog uppercase">{w.para} · {w.quando}</p><p className="mt-1 whitespace-pre-wrap">{w.mensagem}</p></div>
                ))}</div>
              )}
              {c.vitrine && <p><span className="text-fog">Vitrine:</span> {c.vitrine}</p>}
              {c.cuidados?.length > 0 && <ul className="list-disc pl-5 text-fog">{c.cuidados.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-[180px_1fr] gap-3">
          <div><label className="label">Resultado (R$)</label><input inputMode="decimal" className="input" defaultValue={a.result ?? ""} onBlur={(e) => field("result", e.target.value, "money")} />{a.result && a.goal ? <p className="text-[11px] text-fog mt-1">{Math.round((Number(a.result) / Number(a.goal)) * 100)}% da meta de {brl(a.goal)}</p> : null}</div>
          <div><label className="label">O que repetir e o que mudar</label><textarea className="input !min-h-[70px]" defaultValue={a.notes || ""} onBlur={(e) => field("notes", e.target.value)} /></div>
        </div>

        {msg && <p className="text-sm text-mint">{msg}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <button onClick={makeTasks} disabled={busy} className="btn btn-ghost btn-sm"><I.calendar className="w-4 h-4" />Criar tarefas em Seu dia</button>
          <button onClick={remove} className="btn btn-ghost btn-sm text-fog hover:text-danger"><I.trash className="w-4 h-4" />{confirmDelete ? "Clique de novo para apagar" : "Apagar ação"}</button>
        </div>
      </div>
    </Modal>
  );
}
