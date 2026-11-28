"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { brl } from "@/lib/agency";
import { useFinance, todayBR } from "@/components/finance/useFinance";
import { alocDe, mesesAtras, resumo } from "@/lib/gestao";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesesDo = (y: number, q: number) => [0, 1, 2].map((i) => `${y}-${String((q - 1) * 3 + i + 1).padStart(2, "0")}`);
type Meta = { min?: number; meta?: number; super?: number };

/** Metas do trimestre da empresa: faturamento mínimo, meta e super meta por mês, com o realizado vindo do Financeiro. */
export default function Metas() {
  const fin = useFinance();
  const hoje = todayBR();
  const [yq, setYq] = useState({ year: Number(hoje.slice(0, 4)), quarter: Math.floor((Number(hoje.slice(5, 7)) - 1) / 3) + 1 });
  const meses = mesesDo(yq.year, yq.quarter);
  const [g, setG] = useState<any>({ months: {}, priorities: ["", "", ""] });
  const [salvo, setSalvo] = useState("");

  const load = useCallback(async () => {
    const { data } = await createClient().from("ag_goals").select("*").eq("year", yq.year).eq("quarter", yq.quarter).maybeSingle();
    const pr = data?.priorities || [];
    setG({ ...(data || {}), months: data?.months || {}, priorities: [pr[0] || "", pr[1] || "", pr[2] || ""] });
    setSalvo("");
  }, [yq.year, yq.quarter]);
  useEffect(() => { load(); }, [load]);

  const mover = (k: number) => { let q = yq.quarter + k, y = yq.year; if (q < 1) { q = 4; y--; } if (q > 4) { q = 1; y++; } setYq({ year: y, quarter: q }); };
  const setMes = (m: string, campo: keyof Meta, v: string) => setG({ ...g, months: { ...g.months, [m]: { ...(g.months[m] || {}), [campo]: v === "" ? undefined : Number(v) } } });

  // sugestão: mínimo = custo médio dos últimos 6 meses; meta = custo que ainda deixa o lucro do alvo; super = meta + 20%
  const aloc = alocDe(fin.settings?.alocacao);
  const ref = hoje.slice(0, 7);
  const r6 = resumo(fin.tx, mesesAtras(ref, 6), mesesAtras(ref, 1));
  const custoMedio = r6.gasto / 6;
  function sugerir() {
    const min = Math.round(custoMedio / 100) * 100;
    const meta = Math.round(custoMedio / Math.max(0.5, 1 - aloc.lucro / 100) / 100) * 100;
    const sup = Math.round((meta * 1.2) / 100) * 100;
    const months = { ...g.months };
    meses.forEach((m) => (months[m] = { min, meta, super: sup }));
    setG({ ...g, months });
  }

  async function salvar() {
    const s = createClient(); const { data: { user } } = await s.auth.getUser();
    const row = { owner_id: user!.id, year: yq.year, quarter: yq.quarter, months: g.months, priorities: g.priorities.filter((p: string) => p.trim()), first_step: g.first_step || null, pro_labore: g.pro_labore || null, pro_labore_day: g.pro_labore_day || null, closing: g.closing || null, updated_at: new Date().toISOString() };
    const { error } = await s.from("ag_goals").upsert(row, { onConflict: "owner_id,year,quarter" });
    setSalvo(error ? error.message : "Metas salvas.");
  }

  const linhas = meses.map((m) => { const r = resumo(fin.tx, m, m); const mt: Meta = g.months[m] || {}; return { m, real: r.receita, lucro: r.saida.lucro, prolabore: r.saida.prolabore, mt }; });
  const tot = linhas.reduce((a, l) => ({ real: a.real + l.real, min: a.min + (l.mt.min || 0), meta: a.meta + (l.mt.meta || 0), sup: a.sup + (l.mt.super || 0) }), { real: 0, min: 0, meta: 0, sup: 0 });
  const nivel = (v: number, mt: Meta) => (mt.super && v >= mt.super ? ["Super meta", "text-mint"] : mt.meta && v >= mt.meta ? ["Meta batida", "text-mint"] : mt.min && v >= mt.min ? ["Mínimo coberto", "text-[#f5c84c]"] : mt.min ? ["Abaixo do mínimo", "text-danger"] : ["Sem meta", "text-fog"]);
  const pctBar = (v: number, max: number) => `${Math.min(100, max ? (v / max) * 100 : 0)}%`;
  const num = (v: any) => (v === undefined || v === null ? "" : String(v));

  return (
    <>
      <PageHead kicker="GESTOR · 01 COMERCIAL" title="Metas do trimestre" desc="Faturamento mínimo, meta e super meta de cada mês, as 3 prioridades do trimestre e o pró-labore fixo. O realizado vem do Financeiro.">
        <button onClick={salvar} className="btn btn-mint">Salvar metas</button>
      </PageHead>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1"><button onClick={() => mover(-1)} className="btn btn-ghost btn-sm">‹</button><p className="font-display font-bold w-36 text-center">{yq.quarter}º trimestre {yq.year}</p><button onClick={() => mover(1)} className="btn btn-ghost btn-sm">›</button></div>
        <button onClick={sugerir} className="btn btn-ghost btn-sm" title="Mínimo cobre o custo médio dos últimos 6 meses; meta deixa o lucro do alvo na empresa; super meta é 20% acima">Sugerir pelo custo</button>
        <span className="text-xs text-fog">custo médio dos últimos 6 meses: <span className="valor font-mono">{brl(custoMedio)}</span></span>
        {salvo && <span className="text-xs text-fog ml-auto">{salvo}</span>}
      </div>

      <section className="card p-5 mb-5">
        <div className="flex flex-wrap justify-between gap-2 mb-3"><p className="font-display font-bold">Trimestre</p><p className={`text-sm ${nivel(tot.real, { min: tot.min, meta: tot.meta, super: tot.sup })[1]}`}>{nivel(tot.real, { min: tot.min || undefined, meta: tot.meta || undefined, super: tot.sup || undefined })[0]}</p></div>
        <div className="h-3 bg-panel2 rounded-full relative overflow-hidden"><div className="h-full bg-mint rounded-full" style={{ width: pctBar(tot.real, tot.sup || tot.meta || tot.real) }} /></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
          <div><p className="text-[11px] text-fog">Faturado</p><p className="valor font-mono">{brl(tot.real)}</p></div>
          <div><p className="text-[11px] text-fog">Mínimo</p><p className="valor font-mono">{brl(tot.min)}</p></div>
          <div><p className="text-[11px] text-fog">Meta</p><p className="valor font-mono">{brl(tot.meta)}</p></div>
          <div><p className="text-[11px] text-fog">Super meta</p><p className="valor font-mono">{brl(tot.sup)}</p></div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        {linhas.map((l) => { const [txt, cor] = nivel(l.real, l.mt); const fut = l.m > ref; return (
          <section key={l.m} className="card p-5">
            <div className="flex justify-between items-center mb-3"><p className="font-display font-bold capitalize">{MESES[Number(l.m.slice(5)) - 1]}</p><span className={`text-xs ${fut ? "text-fog" : cor}`}>{fut ? "ainda não começou" : txt}</span></div>
            {([["min", "Mínimo (paga as contas)"], ["meta", "Meta"], ["super", "Super meta"]] as const).map(([k, rot]) => (
              <label key={k} className="flex items-center justify-between gap-2 text-sm mb-2"><span className="text-fog text-xs">{rot}</span><input type="number" min={0} step={100} className="input valor !py-1 !w-32 text-right font-mono text-sm" value={num(l.mt[k])} onChange={(e) => setMes(l.m, k, e.target.value)} /></label>
            ))}
            <div className="border-t border-line mt-3 pt-3">
              <div className="flex justify-between text-sm"><span className="text-fog text-xs">Faturado</span><span className="valor font-mono">{brl(l.real)}</span></div>
              <div className="h-1.5 bg-panel2 rounded-full mt-2"><div className="h-full bg-mint rounded-full" style={{ width: pctBar(l.real, l.mt.super || l.mt.meta || l.real) }} /></div>
              <div className="flex justify-between text-xs mt-2"><span className="text-fog">Ficou na empresa</span><span className={`valor font-mono ${l.lucro < 0 ? "text-danger" : ""}`}>{brl(l.lucro)}</span></div>
              {!!l.mt.meta && !fut && l.real < l.mt.meta && <p className="text-[11px] text-fog mt-2">Faltam <span className="valor font-mono">{brl(l.mt.meta - l.real)}</span> para a meta.</p>}
            </div>
          </section>
        ); })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <p className="font-display font-bold mb-1">3 prioridades do trimestre</p>
          <p className="text-xs text-fog mb-3">O que mais move o faturamento ou o lucro nestes 3 meses. Se tudo é prioridade, nada é.</p>
          {g.priorities.map((p: string, i: number) => <input key={i} className="input mb-2" placeholder={["Ex.: fechar 2 contratos mensais novos", "Ex.: subir o preço do pacote de reels", "Ex.: tirar a dependência do maior cliente"][i]} value={p} onChange={(e) => { const pr = [...g.priorities]; pr[i] = e.target.value; setG({ ...g, priorities: pr }); }} />)}
          <p className="text-xs text-fog mt-3 mb-1">Primeiro passo (esta semana)</p>
          <input className="input" value={g.first_step || ""} onChange={(e) => setG({ ...g, first_step: e.target.value })} />
        </section>
        <section className="card p-5">
          <p className="font-display font-bold mb-1">Pró-labore fixo</p>
          <p className="text-xs text-fog mb-3">Um valor fixo, no mesmo dia todo mês. O resto do lucro fica na empresa até o fim do trimestre.</p>
          <div className="flex gap-3">
            <label className="flex-1 text-xs text-fog">Valor<input type="number" min={0} className="input valor mt-1 font-mono" value={num(g.pro_labore)} onChange={(e) => setG({ ...g, pro_labore: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            <label className="w-24 text-xs text-fog">Dia<input type="number" min={1} max={31} className="input mt-1" value={num(g.pro_labore_day)} onChange={(e) => setG({ ...g, pro_labore_day: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          </div>
          {!!g.pro_labore && <p className="text-xs text-fog mt-3">Pago no trimestre: <span className="valor font-mono">{brl(linhas.reduce((a, l) => a + l.prolabore, 0))}</span> de <span className="valor font-mono">{brl(g.pro_labore * 3)}</span> previstos.</p>}
          <p className="text-xs text-fog mt-4 mb-1">Fechamento do trimestre (o que aprendemos)</p>
          <textarea rows={3} className="input" value={g.closing || ""} onChange={(e) => setG({ ...g, closing: e.target.value })} />
        </section>
      </div>
    </>
  );
}
