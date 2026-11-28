"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import StoreGate, { StorePicker } from "@/components/ec/StoreGate";
import QuarterBoard from "@/components/ec/QuarterBoard";
import { brl, commercialDates, daysBetween, fmtDay, KINDS, MONTHS, num, PROFILE_FIELDS, quarterOf, todayBR, weeksOf } from "@/lib/ecommerce";
import { apagarComLixeira } from "@/lib/lixeira";

export default function Ecommerce() {
  return <StoreGate>{(ctx) => <Overview ctx={ctx} />}</StoreGate>;
}

function Overview({ ctx }: { ctx: any }) {
  const today = todayBR();
  const month = today.slice(0, 8) + "01";
  const { year, quarter } = quarterOf(today);
  const [m, setM] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = createClient();
    const in60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
    const [{ data: mm }, { data: ac }, { data: mb }] = await Promise.all([
      s.from("ec_months").select("*").eq("store_id", ctx.storeId).eq("month", month).maybeSingle(),
      s.from("ec_actions").select("*").eq("store_id", ctx.storeId).gte("date", today.slice(0, 8) + "01").lte("date", in60).neq("status", "cancelada").order("date"),
      s.rpc("ec_member_list", { p_store: ctx.storeId }),
    ]);
    setM(mm); setActions(ac || []); setMembers(mb || []);
  }, [ctx.storeId, month, today]);
  useEffect(() => { load(); }, [load]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const { data, error } = await createClient().rpc("ec_add_member", { p_store: ctx.storeId, p_email: email });
    if (error) return setMsg(error.message);
    setMsg(`${(data as any)?.name || email} agora vê esta loja. Libere a seção E-commerce para essa conta em Admin.`); setEmail(""); load();
  }
  async function removeMember(uid: string) {
    if (await apagarComLixeira({ tabela: "ec_members", filtro: { store_id: ctx.storeId, user_id: uid }, oque: "o acesso desta pessoa à loja", rotulo: "Acesso à loja removido", link: "/ecommerce" })) load();
  }

  const weeks = weeksOf(month);
  const wk = weeks.find((w) => today >= w.from && today <= w.to);
  const daysInMonth = weeks.reduce((a, w) => a + w.days, 0);
  const weekGoal = m?.goal && wk ? (Number(m.goal) / daysInMonth) * wk.days : null;
  const taken = new Set(actions.map((a) => a.title.toLowerCase()));
  const upcoming = [...commercialDates(year), ...commercialDates(year + 1)].filter((d) => d.date >= today && !taken.has(d.title.toLowerCase())).slice(0, 4);

  const kpis: [string, string, string][] = [
    [`Meta de ${MONTHS[Number(month.slice(5, 7)) - 1].toLowerCase()}`, brl(m?.goal), m ? `mínima ${brl(m.goal_min)} · super ${brl(m.goal_super)}` : "ainda sem meta"],
    ["Meta desta semana", brl(weekGoal), wk ? `${fmtDay(wk.from)} a ${fmtDay(wk.to)}` : "–"],
    ["Teto de compra", brl(m?.buy_cap), m?.buy_until ? `receber até ${fmtDay(m.buy_until)}` : "do mês"],
    ["Ações em 60 dias", String(actions.length), actions[0] ? `próxima: ${actions[0].title}` : "nenhuma planejada"],
  ];

  return (
    <>
      <PageHead kicker="E-COMMERCE" title="Visão geral" desc={`Plano de 90 dias da loja: metas, ações e campanhas. Vendas, caixa e estoque continuam no sistema da loja. Trimestre ${quarter} de ${year}.`}>
        <StorePicker ctx={ctx} />
        <Link href="/ecommerce/plano" className="btn btn-ghost"><I.target className="w-4 h-4" />Plano do trimestre</Link>
        <Link href="/ecommerce/acoes" className="btn btn-mint"><I.calendar className="w-4 h-4" />Ações e campanhas</Link>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map(([k, v, h], i) => (
          <div key={k} className="card p-5 rise" style={{ animationDelay: `${i * 0.04}s` }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">{k}</p>
            <p className="font-display text-2xl md:text-3xl font-extrabold mt-2 tabular-nums">{v}</p>
            <p className="text-xs text-fog mt-1 truncate">{h}</p>
          </div>
        ))}
      </div>

      <QuarterBoard ctx={ctx} />

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Próximas ações</p>
            <Link href="/ecommerce/acoes" className="text-xs text-fog hover:text-paper">Calendário →</Link>
          </div>
          {actions.length === 0 && <p className="text-sm text-fog py-6 text-center">Nenhuma ação planejada. O método pede duas datas por mês, cada uma com objetivo.</p>}
          <div className="divide-y divide-line">
            {actions.map((a) => {
              const all = [...(a.before_items || []), ...(a.during_items || []), ...(a.after_items || [])];
              const done = all.filter((x: any) => x.done).length;
              return (
                <Link key={a.id} href={`/ecommerce/acoes/campanha?id=${a.id}`} className="flex items-center gap-3 py-3 hover:bg-panel2/40 -mx-2 px-2 rounded-lg">
                  <span className="font-mono text-[11px] text-fog w-12 shrink-0">{fmtDay(a.date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.title}</p>
                    <p className="text-xs text-fog truncate">{[KINDS[a.kind], a.goal ? `meta ${brl(a.goal)}` : null, a.campaign?.pauta?.length ? `${a.campaign.pauta.length} conteúdos` : null].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="text-[11px] text-fog shrink-0 tabular-nums">{(() => { const n = daysBetween(today, a.date); return n > 0 ? `em ${n}d` : n === 0 ? "hoje" : ""; })()}</span>
                  <span className="chip shrink-0 tabular-nums">{done}/{all.length}</span>
                </Link>
              );
            })}
          </div>
          {upcoming.length > 0 && (
            <div className="border-t border-line mt-3 pt-3">
              <p className="text-xs text-fog mb-2">Datas que vêm aí e ainda não estão no calendário</p>
              <div className="flex flex-wrap gap-2">
                {upcoming.map((d) => <Link key={d.date + d.title} href={`/ecommerce/acoes?nova=${d.date}&t=${encodeURIComponent(d.title)}&k=${d.kind}`} className="chip hover:text-paper">{fmtDay(d.date)} · {d.title} <span className="text-fog">· {daysBetween(today, d.date) === 0 ? "hoje" : `em ${daysBetween(today, d.date)}d`}</span> +</Link>)}
              </div>
            </div>
          )}
        </section>

        <div className="space-y-4">
        <MonthMeetingCard ctx={ctx} month={month.slice(0, 7)} />
        <StoreProfileCard ctx={ctx} />
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Quem vê esta loja</p>
          <div className="space-y-2">
            {members.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-full bg-panel2 grid place-items-center text-xs font-bold shrink-0">{(u.name || u.email || "?").slice(0, 1).toUpperCase()}</span>
                <div className="flex-1 min-w-0"><p className="truncate">{u.name || u.email}</p><p className="text-xs text-fog truncate">{u.is_owner ? "dono" : u.email}</p></div>
                {ctx.isOwner && !u.is_owner && <button onClick={() => removeMember(u.user_id)} className="text-fog hover:text-danger" aria-label="Remover"><I.trash className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
          {ctx.isOwner && (
            <form onSubmit={addMember} className="mt-4 border-t border-line pt-4">
              <label className="label">Adicionar pela conta do HUB (e-mail)</label>
              <div className="flex gap-2"><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@loja.com" /><button className="btn btn-ghost">Adicionar</button></div>
              {msg && <p className="text-xs text-fog mt-2">{msg}</p>}
              <p className="text-[11px] text-fog mt-2">A pessoa precisa ter conta no HUB e a seção E-commerce liberada em Admin.</p>
            </form>
          )}
        </section>
        </div>
      </div>
    </>
  );
}

/** Perfil estratégico: quem é a cliente, estilo, voz e números de atendimento. Alimenta as campanhas. */
function StoreProfileCard({ ctx }: { ctx: any }) {
  const p = ctx.store?.profile || {};
  const filled = PROFILE_FIELDS.filter(([k]) => p[k]).length + (p.ticket ? 1 : 0) + (p.conversao ? 1 : 0);
  const total = PROFILE_FIELDS.length + 2;
  const [open, setOpen] = useState(filled < 3);
  const [msg, setMsg] = useState<string | null>(null);
  const [perfis, setPerfis] = useState<{ id: string; username: string }[]>([]);
  useEffect(() => { createClient().from("ig_accounts").select("id,username").order("created_at").then(({ data }) => setPerfis((data as any) || [])); }, []);
  async function ligarPerfil(id: string) {
    const { error } = await createClient().from("ec_stores").update({ account_id: id || null }).eq("id", ctx.storeId);
    if (error) return setMsg(error.message);
    setMsg(null); ctx.reload?.();
  }
  const perfil = perfis.find((x) => x.id === ctx.store?.account_id);
  async function save(k: string, v: any) {
    if ((p[k] ?? null) === (v ?? null)) return;
    const next = { ...p, [k]: v };
    const { error } = await createClient().from("ec_stores").update({ profile: next }).eq("id", ctx.storeId);
    if (error) return setMsg(error.message);
    setMsg(null); ctx.reload?.();
  }
  return (
    <section className="card p-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 text-left">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-mint">Perfil da loja</p>
          <p className="text-xs text-fog mt-1">{filled}/{total} preenchidos · as campanhas usam este perfil</p>
        </div>
        <div className="w-16 h-1.5 rounded-full bg-line overflow-hidden shrink-0"><div className="h-full bg-mint" style={{ width: `${(filled / total) * 100}%` }} /></div>
      </button>
      {/* a loja sabe qual é o perfil do Instagram (28/11): campanhas mandam os cards para ele e a ficha do perfil mostra a loja */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <label className="label !mb-0">Perfil do Instagram</label>
        <select className="input !w-auto !py-1.5 text-sm" value={ctx.store?.account_id || ""} disabled={!ctx.isOwner} onChange={(e) => ligarPerfil(e.target.value)}>
          <option value="">Nenhum</option>
          {perfis.map((x) => <option key={x.id} value={x.id}>@{x.username}</option>)}
        </select>
        {perfil && <Link href={`/creator/desempenho/${perfil.id}`} className="text-xs text-mint underline">Briefing, voz e marca em Perfis & marca</Link>}
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          {PROFILE_FIELDS.map(([k, l, ph]) => (
            <div key={k}><label className="label">{l}</label><textarea rows={2} className="input !min-h-0 text-sm" defaultValue={p[k] || ""} placeholder={ph} disabled={!ctx.isOwner} onBlur={(e) => save(k, e.target.value.trim() || null)} /></div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Ticket médio (R$)</label><input inputMode="decimal" className="input" defaultValue={p.ticket ?? ""} disabled={!ctx.isOwner} onBlur={(e) => save("ticket", num(e.target.value))} /></div>
            <div><label className="label">Conversão do atendimento (%)</label><input inputMode="decimal" className="input" defaultValue={p.conversao ?? ""} placeholder="Ex.: 30" disabled={!ctx.isOwner} onBlur={(e) => save("conversao", num(e.target.value))} /></div>
          </div>
          <p className="text-[11px] text-fog">Ticket médio e conversão saem do sistema da loja; com eles o HUB calcula quantas vendas e atendimentos cada ação precisa.{!ctx.isOwner ? " Só o dono edita." : ""}</p>
          {msg && <p className="text-xs text-danger">{msg}</p>}
        </div>
      )}
    </section>
  );
}

const MEETING: [string, string, string][] = [
  ["ofertas", "Ofertas e promoções do mês", "O que a loja quer vender, desconto, brinde, kit…"],
  ["datas", "Datas e acontecimentos", "Datas comerciais, eventos, viagem, fechamento de coleção…"],
  ["lancamentos", "Lançamentos e reposições", "Peças novas, restoque, cor nova…"],
  ["metas", "O que a loja quer do mês", "Vender X, girar estoque, ganhar cliente nova…"],
  ["retorno", "Retorno do mês passado", "O que a cliente achou dos conteúdos e das ações."],
];

/** Ritual do mês: uma conversa curta com a loja que vira as ações e a pauta do mês. Fica no perfil da loja, por mês. */
function MonthMeetingCard({ ctx, month }: { ctx: any; month: string }) {
  const p = ctx.store?.profile || {};
  const r = p.reunioes?.[month] || {};
  const filled = MEETING.filter(([k]) => r[k]).length;
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save(patch: Record<string, any>) {
    const cur = ctx.store?.profile || {};
    const next = { ...cur, reunioes: { ...(cur.reunioes || {}), [month]: { ...(cur.reunioes?.[month] || {}), ...patch } } };
    const { error } = await createClient().from("ec_stores").update({ profile: next }).eq("id", ctx.storeId);
    if (error) return setMsg(error.message);
    setMsg(null); ctx.reload?.();
  }
  const label = MONTHS[Number(month.slice(5, 7)) - 1];
  return (
    <section className="card p-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 text-left">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-mint">Reunião de {label.toLowerCase()}</p>
          <p className="text-xs text-fog mt-1">{r.feita ? `feita em ${fmtDay(r.feita)}` : "ainda não feita"} · {filled}/{MEETING.length} respostas</p>
        </div>
        <span className={`chip shrink-0 ${r.feita ? "text-mint" : ""}`}>{r.feita ? "feita" : "a fazer"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] text-fog">Uma conversa curta com a loja no começo do mês. As respostas viram as ações e a pauta do mês: peça ao Claude no chat para montar a partir daqui.</p>
          {MEETING.map(([k, l, ph]) => (
            <div key={k}><label className="label">{l}</label><textarea rows={2} className="input !min-h-0 text-sm" defaultValue={r[k] || ""} placeholder={ph} disabled={!ctx.isOwner} onBlur={(e) => { const v = e.target.value.trim() || null; if ((r[k] ?? null) !== v) save({ [k]: v }); }} /></div>
          ))}
          {ctx.isOwner && <button onClick={() => save({ feita: r.feita ? null : todayBR() })} className={`btn btn-sm ${r.feita ? "btn-ghost" : "btn-mint"}`}>{r.feita ? "Desmarcar como feita" : "Marcar reunião como feita"}</button>}
          {msg && <p className="text-xs text-danger">{msg}</p>}
        </div>
      )}
    </section>
  );
}
