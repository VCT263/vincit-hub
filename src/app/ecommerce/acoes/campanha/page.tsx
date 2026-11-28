"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import CopyButton from "@/components/CopyButton";
import { I } from "@/components/icons";
import StoreGate from "@/components/ec/StoreGate";
import ActionDrawer from "@/components/ec/ActionDrawer";
import MotionsDaCampanha from "@/components/ec/MotionsDaCampanha";
import { TIPOS_MODA, TIPO_KEYS, mixDe, type TipoModa } from "@/lib/mixModa";
import { addDays, brl, daysBetween, fmtDay, goalMath, KINDS, PHASE_COLOR, STATUS, todayBR, type EcAction, type Item } from "@/lib/ecommerce";

/** Estúdio da campanha: a ação inteira dia a dia (conteúdo, WhatsApp, tarefas), a conta da meta e cada peça pronta para postar. */
export default function Campanha() {
  return <StoreGate>{(ctx) => <Studio ctx={ctx} />}</StoreGate>;
}

type Piece = { id: string; data: string; fase: string; canal: string; formato: string; titulo: string; gancho?: string; roteiro?: string; legenda?: string; cta?: string; status?: string; sent_at?: string; tipo?: TipoModa; fora_do_padrao?: boolean };
const CANAIS = ["Instagram", "WhatsApp", "E-mail", "Loja", "TikTok"];
const FORMATOS = ["Reels", "Carrossel", "Stories", "Foto", "Live", "Mensagem", "Evento"];
const PSTATUS: Record<string, string> = { ideia: "Ideia", aprovado: "Aprovado", publicado: "Publicado" };
const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const rid = () => Math.random().toString(36).slice(2, 10);
const isISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

function Studio({ ctx }: { ctx: any }) {
  const [a, setA] = useState<EcAction | null>(null);
  const [missing, setMissing] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayBR();

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return setMissing(true);
    createClient().from("ec_actions").select("*").eq("id", id).maybeSingle().then(({ data }) => (data ? setA(data as EcAction) : setMissing(true)));
  }, []);

  const c = a?.campaign || {};
  // peças com id estável (campanhas antigas vêm sem id)
  const pieces: Piece[] = useMemo(() => (c.pauta || []).map((p: any, i: number) => ({ id: p.id || `p${i}`, status: p.status || "ideia", ...p, data: isISO(p.data) ? p.data : a?.date })), [c.pauta, a?.date]);

  if (missing) return <p className="card p-5 text-sm text-fog">Ação não encontrada. <Link href="/ecommerce/acoes" className="text-mint">Voltar ao calendário</Link></p>;
  if (!a) return <p className="text-sm text-fog">Carregando…</p>;

  async function patchAction(values: Partial<EcAction>) {
    const next = { ...a!, ...values } as EcAction;
    setA(next);
    const { error } = await createClient().from("ec_actions").update({ ...values, updated_at: new Date().toISOString() }).eq("id", a!.id);
    if (error) setMsg(error.message);
  }
  const saveCampaign = (patch: any) => patchAction({ campaign: { ...c, ...patch } });
  const savePieces = (xs: Piece[]) => saveCampaign({ pauta: xs });
  const updPiece = (id: string, v: Partial<Piece>) => savePieces(pieces.map((p) => (p.id === id ? { ...p, ...v } : p)));

  function addPiece(date: string) {
    const fase = date < a!.date ? "Antes" : date > (a!.end_date || a!.date) ? "Depois" : "Durante";
    const p: Piece = { id: rid(), data: date, fase, canal: "Instagram", formato: "Stories", titulo: "Novo conteúdo", status: "ideia" };
    savePieces([...pieces, p]); setEdit(p.id);
  }

  async function sendToBoard(list: Piece[]) {
    const posts = list.filter((p) => p.canal === "Instagram" || p.canal === "TikTok");
    if (!posts.length) return setMsg("Nenhum conteúdo de Instagram ou TikTok para enviar.");
    setBusy(true); setMsg(null);
    const sb = createClient();
    // liga ao perfil de Instagram da loja no Creator, quando existir um com o nome da loja
    const key = ctx.store.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const { data: profs } = await sb.from("ig_accounts").select("id,username,name");
    const prof = (profs || []).find((x: any) => [x.username, x.name].some((n) => n && n.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key)));
    const { error } = await sb.from("content_ideas").insert(posts.map((p) => ({
      account_id: prof?.id || null, caption: p.legenda || null, ec_action_id: a!.id,
      kind: "plano", status: "backlog", title: `${ctx.store.name} · ${p.titulo}`.slice(0, 120), format: p.formato || null, planned_for: p.data, hook: p.gancho || null, pillar: (p.tipo && TIPOS_MODA[p.tipo]?.label) || a!.title,
      body: `**Ação:** ${a!.title} (${fmtDay(a!.date)})\n**Fase:** ${p.fase} · **Canal:** ${p.canal}${p.tipo && TIPOS_MODA[p.tipo] ? ` · **Tipo:** ${TIPOS_MODA[p.tipo].label}` : ""}${p.fora_do_padrao ? " · **Fora do padrão**" : ""}\n\n**Gancho:** ${p.gancho || "-"}\n\n**Roteiro:**\n${p.roteiro || "-"}\n\n**Legenda:**\n${p.legenda || "-"}\n\n**CTA:** ${p.cta || "-"}`,
    })));
    setBusy(false);
    if (error) return setMsg(error.message);
    const ids = new Set(posts.map((p) => p.id)), now = new Date().toISOString();
    await savePieces(pieces.map((p) => (ids.has(p.id) ? { ...p, sent_at: now } : p)));
    setMsg(`${posts.length} ${posts.length === 1 ? "conteúdo enviado" : "conteúdos enviados"} ao Quadro de produção do Creator.`);
  }

  // linha do tempo: do aquecimento até 3 dias depois
  const start = a.warmup_date || addDays(a.date, -5);
  const endAction = a.end_date || a.date;
  const end = addDays(endAction, 3);
  const days = Array.from({ length: Math.max(1, daysBetween(start, end) + 1) }, (_, i) => addDays(start, i));
  const phaseOf = (d: string) => (d < a.date ? "Antes" : d > endAction ? "Depois" : "Durante");
  const checklist: [keyof EcAction, string][] = [["before_items", "Antes"], ["during_items", "Durante"], ["after_items", "Depois"]];
  const dueOf: Record<string, string> = { before_items: start, during_items: a.date, after_items: addDays(endAction, 2) };
  const tasksOn = (d: string) => checklist.flatMap(([k]) => ((a[k] as Item[]) || []).map((x, i) => ({ ...x, k, i })).filter((x) => (x.due || dueOf[k as string]) === d));
  const waOn = (d: string) => (c.whatsapp || []).filter((w: any) => isISO(w.quando) && w.quando === d);
  const waLoose = (c.whatsapp || []).filter((w: any) => !isISO(w.quando));

  async function toggleTask(k: keyof EcAction, i: number) {
    const xs = ((a![k] as Item[]) || []).map((y, j) => (j === i ? { ...y, done: !y.done } : y));
    patchAction({ [k]: xs } as any);
  }

  // números
  const p = ctx.store?.profile || {};
  const actionDays = daysBetween(a.date, endAction) + 1;
  const math = goalMath(a.goal, p.ticket, p.conversao, actionDays);
  const allTasks = checklist.flatMap(([k]) => (a[k] as Item[]) || []);
  const tasksDone = allTasks.filter((x) => x.done).length;
  const approved = pieces.filter((x) => x.status !== "ideia").length;
  const toWarm = daysBetween(today, start), toDay = daysBetween(today, a.date);
  const when = a.status === "concluida" ? "Concluída" : toWarm > 0 ? `Aquecimento em ${toWarm} ${toWarm === 1 ? "dia" : "dias"}` : toDay > 0 ? `Aquecendo · faltam ${toDay} ${toDay === 1 ? "dia" : "dias"}` : today <= endAction ? "Acontecendo agora" : "Pós-venda";

  return (
    <>
      <PageHead kicker={`E-COMMERCE · CAMPANHA · ${KINDS[a.kind]?.toUpperCase()}`} title={a.title} desc={c.mensagem || [a.do_what && `Vou fazer ${a.do_what}`, a.because && `porque ${a.because}`, a.offering && `oferecendo ${a.offering}`, a.audience && `para ${a.audience}`, a.aiming && `mirando ${a.aiming}`].filter(Boolean).join(", ") || "Preencha a frase da ação em Editar ação."}>
        <Link href="/ecommerce/acoes" className="btn btn-ghost"><I.back className="w-4 h-4" />Calendário</Link>
        <button onClick={() => setDrawer(true)} className="btn btn-ghost"><I.pen className="w-4 h-4" />Editar ação</button>
        <button onClick={() => sendToBoard(pieces.filter((x) => x.status === "aprovado" && !x.sent_at))} disabled={busy} className="btn btn-mint"><I.board className="w-4 h-4" />Enviar aprovados ao Quadro</button>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi k="Quando" v={when} h={`${fmtDay(start)} → ${fmtDay(a.date)}${a.end_date ? ` a ${fmtDay(a.end_date)}` : ""} · ${STATUS[a.status]}`} />
        <Kpi k="Meta" v={brl(a.goal)} h={a.result ? `vendido ${brl(a.result)} (${a.goal ? Math.round((Number(a.result) / Number(a.goal)) * 100) : "–"}%)` : a.goal_max ? `máxima ${brl(a.goal_max)}` : "defina em Editar ação"} />
        <Kpi k="A conta da meta" v={math ? `${math.vendas} vendas` : "–"} h={math ? (math.atend ? `${math.atend} atendimentos · ${math.atendDia}/dia` : `${math.vendasDia} por dia · informe a conversão`) : "precisa da meta e do ticket médio (perfil da loja)"} />
        <Kpi k="Preparação" v={`${tasksDone}/${allTasks.length}`} h={`tarefas · ${approved}/${pieces.length} conteúdos aprovados`} bar={allTasks.length ? tasksDone / allTasks.length : 0} />
      </div>

      {msg && <p className="card p-3 text-sm text-mint mb-4">{msg}</p>}

      <div className="grid xl:grid-cols-[1fr_360px] gap-4 items-start">
        <section className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-line">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Dia a dia</p>
            <div className="flex gap-3 text-[11px] text-fog">{Object.entries(PHASE_COLOR).map(([k, col]) => <span key={k} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: col }} />{k}</span>)}</div>
          </div>
          <div className="divide-y divide-line">
            {days.map((d) => {
              const ph = phaseOf(d), dp = pieces.filter((x) => x.data === d), dw = waOn(d), dt = tasksOn(d);
              const isToday = d === today, wd = new Date(d + "T12:00:00").getDay();
              return (
                <div key={d} className={`flex gap-3 px-5 py-3 ${isToday ? "bg-panel2/60" : ""}`}>
                  <div className="w-14 shrink-0 flex gap-2">
                    <span className="w-1 rounded-full" style={{ background: PHASE_COLOR[ph] }} />
                    <div><p className={`font-mono text-xs ${d === a.date ? "text-mint font-bold" : ""}`}>{fmtDay(d)}</p><p className="text-[10px] text-fog">{isToday ? "hoje" : WEEK[wd]}</p></div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {d === start && <p className="text-[11px] text-fog">Começa o aquecimento</p>}
                    {d === a.date && <p className="text-[11px] text-mint font-semibold">Dia da ação</p>}
                    {dp.map((x) => <PieceRow key={x.id} x={x} open={edit === x.id} onToggle={() => setEdit(edit === x.id ? null : x.id)} onChange={(v) => updPiece(x.id, v)} onDelete={() => { savePieces(pieces.filter((y) => y.id !== x.id)); setEdit(null); }} onSend={() => sendToBoard([x])} days={days} />)}
                    {dw.map((w: any, i: number) => <WaRow key={i} w={w} />)}
                    {dt.map((t) => (
                      <label key={`${String(t.k)}${t.i}`} className="flex items-start gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="mt-1 accent-[var(--color-mint)]" checked={!!t.done} onChange={() => toggleTask(t.k, t.i)} />
                        <span className={t.done ? "line-through text-fog" : ""}>{t.t}</span>
                      </label>
                    ))}
                    <button onClick={() => addPiece(d)} className="text-[11px] text-fog hover:text-paper flex items-center gap-1"><I.plus className="w-3 h-3" />conteúdo</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <MixCard pieces={pieces.filter((x) => x.canal === "Instagram" || x.canal === "TikTok")} />
          <MotionsDaCampanha actionId={a.id} pasta={`${a.title} ${ctx.store?.name || ""}`.trim()} />
          <section className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-mint mb-2">Conceito</p>
            {c.conceito ? <p className="font-display font-bold text-xl">{c.conceito}</p> : <p className="text-sm text-fog">Sem conceito ainda. Peça a campanha ao Claude no chat do projeto (sem custo) ou crie as peças à mão no dia a dia.</p>}
            {c.fases?.length > 0 && (
              <div className="mt-3 space-y-2">{c.fases.map((f: any, i: number) => (
                <div key={i} className="text-sm border-l-2 pl-3" style={{ borderColor: PHASE_COLOR[f.fase] || "var(--color-line)" }}><p className="text-xs font-bold uppercase">{f.fase} <span className="font-normal text-fog normal-case">{f.periodo}</span></p><p className="text-fog">{f.objetivo}</p></div>
              ))}</div>
            )}
          </section>

          {c.oferta && (
            <section className="card p-5 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Oferta</p>
              {c.oferta.mecanica && <p>{c.oferta.mecanica}</p>}
              {c.oferta.faixas?.length > 0 && <div className="mt-2 divide-y divide-line">{c.oferta.faixas.map((f: any, i: number) => <div key={i} className="py-1.5 flex justify-between gap-3"><span className="text-fog">acima de {brl(f.acima)}</span><span className="text-right">{f.brinde}</span></div>)}</div>}
            </section>
          )}

          {(c.whatsapp?.length > 0) && (
            <section className="card p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">WhatsApp ({c.whatsapp.length})</p>
              <div className="space-y-2">{(waLoose.length ? waLoose : c.whatsapp).map((w: any, i: number) => <WaRow key={i} w={w} />)}</div>
              {waLoose.length > 0 && waLoose.length < c.whatsapp.length && <p className="text-[11px] text-fog mt-2">As mensagens com data aparecem no dia a dia.</p>}
            </section>
          )}

          {c.equipe && (
            <section className="card p-5 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Briefing da equipe</p>
              {c.equipe.briefing && <p>{c.equipe.briefing}</p>}
              {c.equipe.objecoes?.length > 0 && <div className="mt-3 space-y-2">{c.equipe.objecoes.map((o: any, i: number) => <div key={i}><p className="font-semibold">“{o.objecao}”</p><p className="text-fog">{o.resposta}</p></div>)}</div>}
            </section>
          )}

          {(c.vitrine || a.vm_window) && (
            <section className="card p-5 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Vitrine{a.vm_date ? ` · muda em ${fmtDay(a.vm_date)}` : ""}</p>
              <p>{a.vm_window || c.vitrine}</p>
              {a.vm_need && <p className="text-fog mt-1">Precisa: {a.vm_need}</p>}
            </section>
          )}

          {c.cuidados?.length > 0 && (
            <section className="card p-5 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Cuidados</p>
              <ul className="list-disc pl-5 text-fog space-y-1">{c.cuidados.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>

      {drawer && <ActionDrawer action={a} store={ctx.store} onClose={() => setDrawer(false)} onChange={(x) => setA(x)} onDelete={() => { location.href = "/ecommerce/acoes"; }} />}
    </>
  );
}

function Kpi({ k, v, h, bar }: { k: string; v: string; h: string; bar?: number }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fog">{k}</p>
      <p className="font-display text-xl md:text-2xl font-extrabold mt-2 tabular-nums">{v}</p>
      <p className="text-xs text-fog mt-1">{h}</p>
      {bar != null && <div className="h-1 rounded-full bg-line mt-2 overflow-hidden"><div className="h-full bg-mint" style={{ width: `${bar * 100}%` }} /></div>}
    </div>
  );
}

function WaRow({ w }: { w: any }) {
  return (
    <div className="rounded-lg bg-panel2 p-3 text-sm">
      <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-fog uppercase">WhatsApp · {w.para}{!isISO(w.quando) && w.quando ? ` · ${w.quando}` : ""}</p><CopyButton text={w.mensagem} /></div>
      <p className="mt-1 whitespace-pre-wrap">{w.mensagem}</p>
    </div>
  );
}

function PieceRow({ x, open, onToggle, onChange, onDelete, onSend, days }: { x: Piece; open: boolean; onToggle: () => void; onChange: (v: Partial<Piece>) => void; onDelete: () => void; onSend: () => void; days: string[] }) {
  const blur = (k: keyof Piece) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { if ((x[k] || "") !== e.target.value) onChange({ [k]: e.target.value } as any); };
  const full = [x.gancho, x.roteiro, x.legenda, x.cta].filter(Boolean).join("\n\n");
  return (
    <div className={`rounded-lg border ${open ? "border-mint" : "border-line"} bg-panel2/40`}>
      <button onClick={onToggle} className="w-full text-left px-3 py-2 flex items-center gap-2">
        <span className="chip text-[10px] shrink-0">{x.canal} · {x.formato}</span>
        {x.tipo && TIPOS_MODA[x.tipo] && <span className="text-[10px] shrink-0 flex items-center gap-1 text-fog"><span className="w-1.5 h-1.5 rounded-full" style={{ background: TIPOS_MODA[x.tipo].cor }} />{TIPOS_MODA[x.tipo].label}</span>}
        {x.fora_do_padrao && <span className="text-[10px] shrink-0 text-mint">fora do padrão</span>}
        <span className="font-semibold text-sm truncate flex-1">{x.titulo}</span>
        <span className={`text-[10px] shrink-0 ${x.status === "ideia" ? "text-fog" : "text-mint"}`}>{x.sent_at ? "no Quadro" : PSTATUS[x.status || "ideia"]}</span>
      </button>
      {!open && x.gancho && <p className="px-3 pb-2 -mt-1 text-xs text-fog truncate">“{x.gancho}”</p>}
      {open && (
        <div className="px-3 pb-3 space-y-2 text-sm">
          <input className="input" defaultValue={x.titulo} onBlur={blur("titulo")} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <select className="input" value={x.canal} onChange={(e) => onChange({ canal: e.target.value })}>{CANAIS.map((v) => <option key={v}>{v}</option>)}</select>
            <select className="input" value={x.formato} onChange={(e) => onChange({ formato: e.target.value })}>{FORMATOS.map((v) => <option key={v}>{v}</option>)}</select>
            <select className="input" value={x.data} onChange={(e) => onChange({ data: e.target.value })}>{days.map((d) => <option key={d} value={d}>{fmtDay(d)}</option>)}</select>
            <select className="input" value={x.status} onChange={(e) => onChange({ status: e.target.value })}>{Object.entries(PSTATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <div className="grid md:grid-cols-[1fr_auto] gap-2 items-center">
            <select className="input" value={x.tipo || ""} onChange={(e) => onChange({ tipo: (e.target.value || undefined) as TipoModa | undefined })}>
              <option value="">Tipo de conteúdo…</option>
              {TIPO_KEYS.map((k) => <option key={k} value={k}>{TIPOS_MODA[k].label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-fog cursor-pointer"><input type="checkbox" className="accent-[var(--color-mint)]" checked={!!x.fora_do_padrao} onChange={(e) => onChange({ fora_do_padrao: e.target.checked })} />Fora do padrão</label>
          </div>
          {x.tipo && TIPOS_MODA[x.tipo] && <p className="text-[11px] text-fog -mt-1">{TIPOS_MODA[x.tipo].dica}</p>}
          <div><label className="label">Gancho (primeira frase)</label><input className="input" defaultValue={x.gancho || ""} onBlur={blur("gancho")} /></div>
          <div><label className="label">Roteiro / cenas</label><textarea className="input !min-h-[90px]" defaultValue={x.roteiro || ""} onBlur={blur("roteiro")} /></div>
          <div><label className="label">Legenda pronta</label><textarea className="input !min-h-[90px]" defaultValue={x.legenda || ""} onBlur={blur("legenda")} /></div>
          <div><label className="label">CTA</label><input className="input" defaultValue={x.cta || ""} onBlur={blur("cta")} /></div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-2">
              {full && <CopyButton text={full} label="Copiar tudo" />}
              {(x.canal === "Instagram" || x.canal === "TikTok") && <button onClick={onSend} className="btn btn-ghost btn-sm"><I.board className="w-3.5 h-3.5" />{x.sent_at ? "Enviar de novo" : "Enviar ao Quadro"}</button>}
            </div>
            <button onClick={onDelete} className="btn btn-ghost btn-sm text-fog hover:text-danger"><I.trash className="w-3.5 h-3.5" />Remover</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mix de moda: fundadora, estilo de vida, educativo e editorial, mais a peça fora do padrão da semana */
function MixCard({ pieces }: { pieces: Piece[] }) {
  if (!pieces.length) return null;
  const m = mixDe(pieces);
  return (
    <section className="card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Mix de conteúdo ({m.n})</p>
      <div className="flex h-2 rounded-full overflow-hidden bg-line mb-3">
        {TIPO_KEYS.map((k) => m.conta[k] > 0 && <span key={k} style={{ width: `${(m.conta[k] / m.n) * 100}%`, background: TIPOS_MODA[k].cor }} />)}
      </div>
      <div className="space-y-1.5 text-sm">
        {TIPO_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TIPOS_MODA[k].cor }} />
            <span className="flex-1">{TIPOS_MODA[k].label}</span>
            <span className="font-mono text-xs tabular-nums">{m.conta[k]}</span>
          </div>
        ))}
        {m.semTipo > 0 && <div className="flex items-center gap-2 text-fog"><span className="w-2 h-2 rounded-full shrink-0 bg-line" /><span className="flex-1">Sem tipo</span><span className="font-mono text-xs tabular-nums">{m.semTipo}</span></div>}
      </div>
      <p className="text-[11px] text-fog mt-3">
        {m.faltando.length ? `Falta ${m.faltando.map((k) => TIPOS_MODA[k].label.toLowerCase()).join(" e ")}. ` : ""}
        {m.fora ? `${m.fora} ${m.fora === 1 ? "peça fora" : "peças fora"} do padrão.` : "Marque uma peça por semana como fora do padrão (formato, cor ou edição diferente)."}
      </p>
    </section>
  );
}
