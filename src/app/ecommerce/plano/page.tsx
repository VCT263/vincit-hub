"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import StoreGate, { StorePicker } from "@/components/ec/StoreGate";
import { brl, fmtDay, MONTHS, num, quarterMonths, quarterOf, todayBR, weeksOf } from "@/lib/ecommerce";

export default function Plano() {
  return <StoreGate>{(ctx) => <Plan ctx={ctx} />}</StoreGate>;
}

const MONTH_FIELDS = ["goal_min", "goal", "goal_super", "team_goal", "extra_label", "extra_goal", "buy_cap", "buy_until", "buy_notes", "launch", "result"] as const;

function Plan({ ctx }: { ctx: any }) {
  const now = quarterOf(todayBR());
  const [yq, setYq] = useState(now);
  const months = quarterMonths(yq.year, yq.quarter);
  const [rows, setRows] = useState<Record<string, any>>({});
  const [q, setQ] = useState<any>({ priorities: ["", "", ""] });
  const [acts, setActs] = useState<any[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: ms }, { data: qq }, { data: ac }] = await Promise.all([
      s.from("ec_months").select("*").eq("store_id", ctx.storeId).in("month", months),
      s.from("ec_quarters").select("*").eq("store_id", ctx.storeId).eq("year", yq.year).eq("quarter", yq.quarter).maybeSingle(),
      s.from("ec_actions").select("id,title,date,goal,kind,status,result").eq("store_id", ctx.storeId).gte("date", months[0]).lte("date", months[2].slice(0, 8) + "31").neq("status", "cancelada").order("date"),
    ]);
    const map: Record<string, any> = {};
    months.forEach((m) => (map[m] = (ms || []).find((x: any) => x.month === m) || { month: m }));
    setRows(map);
    const pr = qq?.priorities || [];
    setQ({ ...(qq || {}), priorities: [pr[0] || "", pr[1] || "", pr[2] || ""] });
    setActs(ac || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.storeId, yq.year, yq.quarter]);
  useEffect(() => { load(); }, [load]);

  const flash = () => { setSaved("Salvo"); setTimeout(() => setSaved(null), 1500); };
  async function saveMonth(m: string, patch: any) {
    const row = { ...rows[m], ...patch };
    setRows((r) => ({ ...r, [m]: row }));
    const clean: any = { store_id: ctx.storeId, month: m, updated_at: new Date().toISOString() };
    MONTH_FIELDS.forEach((k) => { const v = row[k]; clean[k] = ["team_goal", "extra_label", "buy_notes", "launch", "buy_until"].includes(k) ? v || null : num(v); });
    const { error } = await createClient().from("ec_months").upsert(clean, { onConflict: "store_id,month" });
    if (!error) flash(); else setSaved(error.message);
  }
  async function saveQuarter(patch: any) {
    const next = { ...q, ...patch }; setQ(next);
    const { error } = await createClient().from("ec_quarters").upsert({
      store_id: ctx.storeId, year: yq.year, quarter: yq.quarter, updated_at: new Date().toISOString(),
      stock_value: num(next.stock_value), stock_ok: next.stock_ok ?? null, stock_plan: next.stock_plan || null,
      pro_labore: num(next.pro_labore), pro_labore_day: num(next.pro_labore_day), priorities: (next.priorities || []).filter((x: string) => x?.trim()),
      first_step: next.first_step || null, closing: next.closing || null,
    }, { onConflict: "store_id,year,quarter" });
    if (!error) flash(); else setSaved(error.message);
  }

  const shift = (d: number) => { let qq = yq.quarter + d, y = yq.year; if (qq < 1) { qq = 4; y--; } if (qq > 4) { qq = 1; y++; } setYq({ year: y, quarter: qq }); };
  const sum = (k: string) => months.reduce((a, m) => a + (Number(rows[m]?.[k]) || 0), 0);
  const totGoal = sum("goal");
  const stockRatio = q.stock_value && totGoal ? Number(q.stock_value) / totGoal : null;
  const label = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];

  const Money = ({ m, k, ph }: { m: string; k: string; ph?: string }) => (
    <input inputMode="decimal" className="input !py-1.5 tabular-nums" placeholder={ph || "R$"} defaultValue={rows[m]?.[k] ?? ""} key={`${m}-${k}-${rows[m]?.id || "n"}`}
      onBlur={(e) => String(rows[m]?.[k] ?? "") !== e.target.value && saveMonth(m, { [k]: e.target.value })} />
  );
  const Text = ({ m, k, ph, type }: { m: string; k: string; ph?: string; type?: string }) => (
    <input type={type || "text"} className="input !py-1.5" placeholder={ph} defaultValue={rows[m]?.[k] ?? ""} key={`${m}-${k}-${rows[m]?.id || "n"}`}
      onBlur={(e) => String(rows[m]?.[k] ?? "") !== e.target.value && saveMonth(m, { [k]: e.target.value })} />
  );

  return (
    <>
      <PageHead kicker="E-COMMERCE · 01 METAS" title="Plano do trimestre" desc="Meta mínima paga as contas e o pró-labore; meta é mínima mais lucro; super meta vale prêmio. Uma forma de começar: venda do mesmo mês do ano passado mais 20%, e ajustar.">
        <StorePicker ctx={ctx} />
        <div className="flex items-center gap-1 card !rounded-xl p-1">
          <button onClick={() => shift(-1)} className="btn btn-ghost btn-sm" aria-label="Trimestre anterior"><I.back className="w-4 h-4" /></button>
          <span className="text-sm font-semibold px-2 tabular-nums">{yq.quarter}º tri {yq.year}</span>
          <button onClick={() => shift(1)} className="btn btn-ghost btn-sm" aria-label="Próximo trimestre"><I.arrow className="w-4 h-4" /></button>
        </div>
      </PageHead>
      {saved && <p className="fixed bottom-4 right-4 z-40 chip chip-mint bg-panel">{saved}</p>}

      <section className="card p-5 overflow-x-auto mb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Metas do trimestre</p>
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-left text-fog text-xs">
            <th className="pb-2 pr-3 font-normal">Mês</th><th className="pb-2 pr-3 font-normal">Meta mínima</th><th className="pb-2 pr-3 font-normal">Meta</th><th className="pb-2 pr-3 font-normal">Super meta</th><th className="pb-2 font-normal">Vendido (fechamento)</th>
          </tr></thead>
          <tbody>
            {months.map((m) => (
              <tr key={m} className="border-t border-line">
                <td className="py-2 pr-3 font-display font-bold">{label(m)}</td>
                <td className="py-2 pr-3">{Money({ m, k: "goal_min" })}</td>
                <td className="py-2 pr-3">{Money({ m, k: "goal" })}</td>
                <td className="py-2 pr-3">{Money({ m, k: "goal_super" })}</td>
                <td className="py-2">{Money({ m, k: "result", ph: "total do mês" })}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-semibold tabular-nums">
              <td className="py-2 pr-3">Total</td><td className="py-2 pr-3">{brl(sum("goal_min"))}</td><td className="py-2 pr-3">{brl(totGoal)}</td><td className="py-2 pr-3">{brl(sum("goal_super"))}</td>
              <td className="py-2">{sum("result") ? <>{brl(sum("result"))} <span className="text-fog font-normal text-xs">({totGoal ? Math.round((sum("result") / totGoal) * 100) : 0}% da meta)</span></> : "–"}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-fog mt-3">O vendido entra uma vez por mês, no fechamento, com o total do sistema da loja. O acompanhamento diário continua lá.</p>
      </section>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {months.map((m) => {
          const r = rows[m] || {};
          const weeks = weeksOf(m); const days = weeks.reduce((a, w) => a + w.days, 0);
          return (
            <section key={m} className="card p-5 space-y-3">
              <p className="font-display font-bold text-lg">{label(m)}</p>
              <div>
                <p className="label">Meta por semana</p>
                {r.goal ? (
                  <div className="space-y-1">{weeks.map((w) => (
                    <div key={w.from} className="flex justify-between text-xs tabular-nums"><span className="text-fog">{fmtDay(w.from)} a {fmtDay(w.to)}</span><span>{brl((Number(r.goal) / days) * w.days)}</span></div>
                  ))}<p className="text-[11px] text-fog pt-1">Por dia: {brl(Number(r.goal) / days)} (dias corridos)</p></div>
                ) : <p className="text-xs text-fog">Defina a meta do mês.</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2"><label className="label">Meta extra (ex.: Black, coleção)</label>{Text({ m, k: "extra_label", ph: "Nome" })}</div>
                <div className="col-span-2">{Money({ m, k: "extra_goal", ph: "R$ da meta extra" })}</div>
                <div className="col-span-2"><label className="label">Meta individual da equipe (opcional)</label>{Text({ m, k: "team_goal", ph: "Ex.: R$ 15 mil por vendedora" })}</div>
              </div>
              <div className="border-t border-line pt-3 grid grid-cols-2 gap-2">
                <p className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-fog">Compra</p>
                <div><label className="label">Teto de compra</label>{Money({ m, k: "buy_cap" })}</div>
                <div><label className="label">Receber até</label>{Text({ m, k: "buy_until", type: "date" })}</div>
                <div className="col-span-2"><label className="label">O que vou comprar</label>{Text({ m, k: "buy_notes", ph: "Coleção, oportunidade, reposição…" })}</div>
                <div className="col-span-2"><label className="label">Lançamento do mês</label>{Text({ m, k: "launch", ph: "Ex.: alto verão" })}</div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <section className="card p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Conferência contra o estoque</p>
          <div><label className="label">Estoque atual a preço de venda (do sistema da loja)</label>
            <input inputMode="decimal" className="input" defaultValue={q.stock_value ?? ""} key={`sv-${yq.year}-${yq.quarter}-${q.id || "n"}`} onBlur={(e) => saveQuarter({ stock_value: e.target.value })} placeholder="R$" /></div>
          {stockRatio != null && <p className="text-xs text-fog">O estoque cobre {stockRatio.toFixed(1).replace(".", ",")}× a meta do trimestre ({brl(totGoal)}).</p>}
          <div className="flex items-center gap-4 text-sm">
            <span>Meu estoque comporta a meta?</span>
            {[["Sim", true], ["Não", false]].map(([l, v]) => (
              <label key={String(l)} className="flex items-center gap-1.5 cursor-pointer"><input type="radio" className="accent-[var(--color-mint)]" checked={q.stock_ok === v} onChange={() => saveQuarter({ stock_ok: v, stock_plan: v ? null : q.stock_plan })} />{l as string}</label>
            ))}
          </div>
          {q.stock_ok === false && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-fog">Se não:</span>
              {[["compro oportunidade", "oportunidade"], ["baixo a meta", "baixar_meta"]].map(([l, v]) => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer"><input type="radio" className="accent-[var(--color-mint)]" checked={q.stock_plan === v} onChange={() => saveQuarter({ stock_plan: v })} />{l}</label>
              ))}
            </div>
          )}
          <div className="border-t border-line pt-3 grid grid-cols-[1fr_120px] gap-2">
            <div><label className="label">Pró-labore</label><input inputMode="decimal" className="input" defaultValue={q.pro_labore ?? ""} key={`pl-${yq.year}-${yq.quarter}-${q.id || "n"}`} onBlur={(e) => saveQuarter({ pro_labore: e.target.value })} placeholder="R$" /></div>
            <div><label className="label">Todo dia</label><input inputMode="numeric" className="input" defaultValue={q.pro_labore_day ?? ""} key={`pd-${yq.year}-${yq.quarter}-${q.id || "n"}`} onBlur={(e) => saveQuarter({ pro_labore_day: e.target.value })} placeholder="5" /></div>
          </div>
        </section>

        <section className="card p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Prioridades</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3"><span className="font-display text-2xl text-fog w-5">{i + 1}</span>
              <input className="input" defaultValue={q.priorities?.[i] || ""} key={`p${i}-${yq.year}-${yq.quarter}-${q.id || "n"}`} placeholder="Prioridade do trimestre"
                onBlur={(e) => { const p = [...(q.priorities || ["", "", ""])]; p[i] = e.target.value; saveQuarter({ priorities: p }); }} /></div>
          ))}
          <div><label className="label">A primeira coisa que eu faço amanhã</label>
            <input className="input" defaultValue={q.first_step || ""} key={`fs-${yq.year}-${yq.quarter}-${q.id || "n"}`} onBlur={(e) => saveQuarter({ first_step: e.target.value })} /></div>
        </section>
      </div>

      <section className="card p-5 overflow-x-auto mb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Meu plano em uma olhada</p>
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-fog text-xs"><th className="pb-2 pr-3 font-normal"></th>{months.map((m) => <th key={m} className="pb-2 pr-3 font-normal uppercase tracking-widest text-[10px]">{label(m)}</th>)}</tr></thead>
          <tbody>
            <tr className="border-t border-line"><td className="py-2 pr-3 font-display font-bold">Meta</td>{months.map((m) => <td key={m} className="py-2 pr-3 tabular-nums">{brl(rows[m]?.goal)}</td>)}</tr>
            <tr className="border-t border-line"><td className="py-2 pr-3 font-display font-bold">Teto de compra</td>{months.map((m) => <td key={m} className="py-2 pr-3 tabular-nums">{brl(rows[m]?.buy_cap)}</td>)}</tr>
            <tr className="border-t border-line"><td className="py-2 pr-3 font-display font-bold">Ação principal</td>{months.map((m) => {
              const a = acts.filter((x) => x.date.slice(0, 7) === m.slice(0, 7)).sort((x, y) => (Number(y.goal) || 0) - (Number(x.goal) || 0))[0];
              return <td key={m} className="py-2 pr-3">{a ? `${a.title} (${fmtDay(a.date)})` : <span className="text-fog">–</span>}</td>;
            })}</tr>
            <tr className="border-t border-line"><td className="py-2 pr-3 font-display font-bold">Lançamento</td>{months.map((m) => <td key={m} className="py-2 pr-3">{rows[m]?.launch || <span className="text-fog">–</span>}</td>)}</tr>
          </tbody>
        </table>
      </section>

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Fechamento do trimestre</p>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {months.map((m) => {
            const r = rows[m] || {}, sold = Number(r.result) || 0;
            const tier = !r.result ? null : r.goal_super && sold >= Number(r.goal_super) ? ["Super meta", "text-mint"] : r.goal && sold >= Number(r.goal) ? ["Meta batida", "text-mint"] : r.goal_min && sold >= Number(r.goal_min) ? ["Só a mínima", "text-paper"] : ["Abaixo da mínima", "text-danger"];
            return (
              <div key={m} className="rounded-xl border border-line p-3">
                <p className="text-xs text-fog">{label(m)}</p>
                <p className="font-display font-bold text-lg tabular-nums">{r.result ? brl(r.result) : "–"}</p>
                <p className={`text-xs ${tier ? tier[1] : "text-fog"}`}>{tier ? `${tier[0]}${r.goal ? ` · ${Math.round((sold / Number(r.goal)) * 100)}% da meta` : ""}` : "lance o vendido acima"}</p>
              </div>
            );
          })}
        </div>
        {acts.filter((a: any) => a.goal).length > 0 && (
          <div className="mb-4 divide-y divide-line text-sm">
            {acts.filter((a: any) => a.goal).map((a: any) => (
              <div key={a.id} className="py-1.5 flex justify-between gap-3"><span className="truncate">{a.title}</span><span className="tabular-nums text-fog shrink-0">{a.result ? `${brl(a.result)} de ${brl(a.goal)} (${Math.round((Number(a.result) / Number(a.goal)) * 100)}%)` : `meta ${brl(a.goal)} · sem resultado`}</span></div>
            ))}
          </div>
        )}
        <label className="label">O que funcionou, o que mudar e o que fica para o próximo trimestre</label>
        <textarea className="input !min-h-[110px]" defaultValue={q.closing || ""} key={`closing-${yq.year}-${yq.quarter}`} onBlur={(e) => e.target.value !== (q.closing || "") && saveQuarter({ closing: e.target.value })} placeholder="Quer um texto pronto? Peça o fechamento ao Claude no chat do projeto, sem custo." />
      </section>
    </>
  );
}
