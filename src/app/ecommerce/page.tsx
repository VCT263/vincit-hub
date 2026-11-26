"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import StoreGate, { StorePicker } from "@/components/ec/StoreGate";
import { brl, commercialDates, fmtDay, KINDS, MONTHS, quarterOf, todayBR, weeksOf } from "@/lib/ecommerce";

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
    await createClient().from("ec_members").delete().eq("store_id", ctx.storeId).eq("user_id", uid); load();
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
                <Link key={a.id} href={`/ecommerce/acoes?a=${a.id}`} className="flex items-center gap-3 py-3 hover:bg-panel2/40 -mx-2 px-2 rounded-lg">
                  <span className="font-mono text-[11px] text-fog w-12 shrink-0">{fmtDay(a.date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.title}</p>
                    <p className="text-xs text-fog truncate">{[KINDS[a.kind], a.goal ? `meta ${brl(a.goal)}` : null, a.campaign ? "campanha pronta" : null].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="chip shrink-0 tabular-nums">{done}/{all.length}</span>
                </Link>
              );
            })}
          </div>
          {upcoming.length > 0 && (
            <div className="border-t border-line mt-3 pt-3">
              <p className="text-xs text-fog mb-2">Datas que vêm aí e ainda não estão no calendário</p>
              <div className="flex flex-wrap gap-2">
                {upcoming.map((d) => <Link key={d.date + d.title} href={`/ecommerce/acoes?nova=${d.date}&t=${encodeURIComponent(d.title)}&k=${d.kind}`} className="chip hover:text-paper">{fmtDay(d.date)} · {d.title} +</Link>)}
              </div>
            </div>
          )}
        </section>

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
    </>
  );
}
