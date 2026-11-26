"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import StoreGate, { StorePicker } from "@/components/ec/StoreGate";
import ActionDrawer from "@/components/ec/ActionDrawer";
import { brl, commercialDates, fmtDay, KINDS, MONTHS, PHASES, quarterMonths, quarterOf, STATUS, todayBR, toItems, type EcAction } from "@/lib/ecommerce";

export default function Acoes() {
  return <StoreGate>{(ctx) => <Calendar ctx={ctx} />}</StoreGate>;
}

function Calendar({ ctx }: { ctx: any }) {
  const today = todayBR();
  const [yq, setYq] = useState(quarterOf(today));
  const months = quarterMonths(yq.year, yq.quarter);
  const [acts, setActs] = useState<EcAction[]>([]);
  const [goals, setGoals] = useState<Record<string, any>>({});
  const [open, setOpen] = useState<EcAction | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data }, { data: ms }] = await Promise.all([
      s.from("ec_actions").select("*").eq("store_id", ctx.storeId).gte("date", months[0]).lte("date", months[2].slice(0, 8) + "31").order("date"),
      s.from("ec_months").select("month,goal").eq("store_id", ctx.storeId).in("month", months),
    ]);
    setActs((data as EcAction[]) || []);
    setGoals(Object.fromEntries((ms || []).map((x: any) => [x.month, x.goal])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.storeId, yq.year, yq.quarter]);
  useEffect(() => { load(); }, [load]);

  async function create(date: string, title = "Nova ação", kind = "acao") {
    setErr(null);
    const warm = new Date(date + "T12:00:00"); warm.setDate(warm.getDate() - 5);
    const { data, error } = await createClient().from("ec_actions").insert({
      store_id: ctx.storeId, title, kind, date, warmup_date: warm.toISOString().slice(0, 10),
      before_items: toItems(PHASES.before), during_items: toItems(PHASES.during), after_items: toItems(PHASES.after),
    }).select().single();
    if (error) return setErr(error.message);
    const q = quarterOf(date); if (q.year !== yq.year || q.quarter !== yq.quarter) setYq(q);
    setOpen(data as EcAction); load();
  }

  // abre a ação vinda da visão geral (?a=) ou cria a partir de uma data sugerida (?nova=)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const a = p.get("a"), nova = p.get("nova");
    if (a) createClient().from("ec_actions").select("*").eq("id", a).maybeSingle().then(({ data }) => { if (data) { setYq(quarterOf(data.date)); setOpen(data as EcAction); } });
    if (nova) create(nova, p.get("t") || "Nova ação", p.get("k") || "acao");
    if (a || nova) history.replaceState(null, "", "/ecommerce/acoes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shift = (d: number) => { let q = yq.quarter + d, y = yq.year; if (q < 1) { q = 4; y--; } if (q > 4) { q = 1; y++; } setYq({ year: y, quarter: q }); };
  const sugg = commercialDates(yq.year).filter((d) => d.date >= months[0] && d.date <= months[2].slice(0, 8) + "31");
  const has = (title: string) => acts.some((a) => a.title.toLowerCase() === title.toLowerCase());

  return (
    <>
      <PageHead kicker="E-COMMERCE · 02 VENDAS" title="Ações e campanhas" desc="Duas datas por mês, cada uma com objetivo e meta. Antes (aquecimento, com pelo menos 5 dias), durante e depois. Chame primeiro quem já conhece a loja.">
        <StorePicker ctx={ctx} />
        <div className="flex items-center gap-1 card !rounded-xl p-1">
          <button onClick={() => shift(-1)} className="btn btn-ghost btn-sm" aria-label="Trimestre anterior"><I.back className="w-4 h-4" /></button>
          <span className="text-sm font-semibold px-2 tabular-nums">{yq.quarter}º tri {yq.year}</span>
          <button onClick={() => shift(1)} className="btn btn-ghost btn-sm" aria-label="Próximo trimestre"><I.arrow className="w-4 h-4" /></button>
        </div>
        <button onClick={() => create(today >= months[0] && today <= months[2].slice(0, 8) + "31" ? today : months[0])} className="btn btn-mint"><I.plus className="w-4 h-4" />Nova ação</button>
      </PageHead>
      {err && <p className="card p-4 text-sm text-danger mb-4">{err}</p>}

      <div className="grid lg:grid-cols-3 gap-4">
        {months.map((m) => {
          const list = acts.filter((a) => a.date.slice(0, 7) === m.slice(0, 7));
          const planned = list.filter((a) => a.status !== "cancelada").reduce((s, a) => s + (Number(a.goal) || 0), 0);
          const ms = sugg.filter((d) => d.date.slice(0, 7) === m.slice(0, 7) && !has(d.title));
          return (
            <section key={m} className="card p-5 flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <p className="font-display font-bold text-lg">{MONTHS[Number(m.slice(5, 7)) - 1]}</p>
                <p className="text-xs text-fog tabular-nums">{list.length} {list.length === 1 ? "ação" : "ações"}{goals[m] ? ` · ${brl(planned)} de ${brl(goals[m])}` : ""}</p>
              </div>
              {list.length < 2 && <p className="text-[11px] text-fog">O método pede 2 datas no mês.</p>}
              {list.map((a) => {
                const all = [...a.before_items, ...a.during_items, ...a.after_items];
                const done = all.filter((x) => x.done).length;
                return (
                  <button key={a.id} onClick={() => setOpen(a)} className={`text-left rounded-xl border border-line bg-panel2/50 p-3 hover:border-mint transition-colors ${a.status === "cancelada" ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-mint">{fmtDay(a.date)}</span>
                      <span className="chip text-[10px]">{KINDS[a.kind]}</span>
                      {a.status !== "planejada" && <span className="chip text-[10px]">{STATUS[a.status]}</span>}
                    </div>
                    <p className="font-semibold mt-1.5">{a.title}</p>
                    <p className="text-xs text-fog mt-0.5">{[a.goal ? `meta ${brl(a.goal)}` : null, a.warmup_date ? `aquece em ${fmtDay(a.warmup_date)}` : null, a.campaign ? "campanha pronta" : null].filter(Boolean).join(" · ") || "sem meta"}</p>
                    <div className="h-1 rounded-full bg-line mt-2 overflow-hidden"><div className="h-full bg-mint" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></div>
                  </button>
                );
              })}
              {ms.length > 0 && (
                <div className="mt-auto pt-2 border-t border-line">
                  <p className="text-[11px] text-fog mb-1.5">Datas do mês</p>
                  <div className="flex flex-col gap-1.5">
                    {ms.map((d) => (
                      <button key={d.title} onClick={() => create(d.date, d.title, d.kind)} title={d.tip} className="flex items-center gap-2 text-left text-xs text-fog hover:text-paper">
                        <I.plus className="w-3.5 h-3.5 shrink-0" /><span className="font-mono">{fmtDay(d.date)}</span><span className="truncate">{d.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {open && <ActionDrawer action={open} store={ctx.store} onClose={() => setOpen(null)} onChange={(a) => { setOpen(a); setActs((xs) => xs.map((x) => (x.id === a.id ? a : x))); }} onDelete={() => { setOpen(null); load(); }} />}
    </>
  );
}
