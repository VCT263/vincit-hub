"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays, brl, commercialDates, daysBetween, fmtDay, MONTHS, monthEnd, PHASE_COLOR, PROFILE_FIELDS, quarterMonths, quarterOf, todayBR } from "@/lib/ecommerce";

/** Painel visual do trimestre: nota do método, linha do tempo das ações e metas por mês. */
export default function QuarterBoard({ ctx }: { ctx: any }) {
  const today = todayBR();
  const { year, quarter } = quarterOf(today);
  const months = quarterMonths(year, quarter);
  const qEnd = monthEnd(months[2]);
  const [d, setD] = useState<{ ms: any[]; acts: any[]; q: any; launch: any } | null>(null);

  useEffect(() => {
    const s = createClient();
    Promise.all([
      s.from("ec_months").select("*").eq("store_id", ctx.storeId).in("month", months),
      s.from("ec_actions").select("*").eq("store_id", ctx.storeId).gte("date", months[0]).lte("date", qEnd).neq("status", "cancelada").order("date"),
      s.from("ec_quarters").select("*").eq("store_id", ctx.storeId).eq("year", year).eq("quarter", quarter).maybeSingle(),
      s.from("ec_launch").select("launch_date").eq("store_id", ctx.storeId).maybeSingle(),
    ]).then(([a, b, c, e]) => setD({ ms: a.data || [], acts: b.data || [], q: c.data, launch: e.data }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.storeId]);
  if (!d) return null;

  const row = (m: string) => d.ms.find((x) => x.month === m) || {};
  const per = (m: string) => d.acts.filter((a) => a.date.slice(0, 7) === m.slice(0, 7));
  const p = ctx.store?.profile || {};
  const profileFilled = PROFILE_FIELDS.filter(([k]) => p[k]).length + (p.ticket ? 1 : 0) + (p.conversao ? 1 : 0);
  const closed = months.filter((m) => monthEnd(m) < today);
  const checks: [boolean, string, string][] = [
    [months.every((m) => row(m).goal), "Meta dos 3 meses", "/ecommerce/plano"],
    [months.every((m) => row(m).goal_min && row(m).goal_super), "Meta mínima e super meta", "/ecommerce/plano"],
    [months.every((m) => row(m).buy_cap), "Teto de compra dos 3 meses", "/ecommerce/plano"],
    [d.q?.stock_ok != null, "Estoque conferido contra a meta", "/ecommerce/plano"],
    [!!d.q?.pro_labore, "Pró-labore definido", "/ecommerce/plano"],
    [(d.q?.priorities || []).filter(Boolean).length >= 3, "3 prioridades do trimestre", "/ecommerce/plano"],
    [months.every((m) => per(m).length >= 2), "2 ações por mês", "/ecommerce/acoes"],
    [d.acts.length > 0 && d.acts.every((a) => a.goal), "Toda ação com meta", "/ecommerce/acoes"],
    [d.acts.length > 0 && d.acts.every((a) => a.do_what && a.because && a.audience), "Toda ação com a frase completa", "/ecommerce/acoes"],
    [d.acts.length > 0 && d.acts.every((a) => a.warmup_date && daysBetween(a.warmup_date, a.date) >= 5), "Aquecimento de 5 dias ou mais", "/ecommerce/acoes"],
    [profileFilled >= 6, "Perfil da loja preenchido", "/ecommerce"],
    [closed.every((m) => row(m).result), "Vendido lançado nos meses fechados", "/ecommerce/plano"],
  ];
  const score = Math.round((checks.filter((c) => c[0]).length / checks.length) * 100);
  const missing = checks.filter((c) => !c[0]);

  const span = daysBetween(months[0], qEnd) + 1;
  const pos = (x: string) => Math.max(0, Math.min(100, (daysBetween(months[0], x) / span) * 100));
  const taken = new Set(d.acts.map((a) => a.title.toLowerCase()));
  const sugg = commercialDates(year).filter((x) => x.date >= months[0] && x.date <= qEnd && !taken.has(x.title.toLowerCase()));
  const lanes: any[][] = [];
  d.acts.forEach((a) => {
    const s = a.warmup_date || addDays(a.date, -5);
    const lane = lanes.find((l) => l.every((b) => (b.end_date || b.date) < s || (b.warmup_date || addDays(b.date, -5)) > (a.end_date || a.date)));
    if (lane) lane.push(a); else lanes.push([a]);
  });
  const R = 34, C = 2 * Math.PI * R;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 mb-4">
      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Nota do método · {quarter}º tri</p>
        <div className="flex items-center gap-4 mt-3">
          <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0" aria-label={`${score}%`}>
            <circle cx="42" cy="42" r={R} fill="none" stroke="var(--color-line)" strokeWidth="8" />
            <circle cx="42" cy="42" r={R} fill="none" stroke="var(--color-mint)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 42 42)" />
            <text x="42" y="47" textAnchor="middle" className="font-display" fontWeight="800" fontSize="18" fill="currentColor">{score}</text>
          </svg>
          <p className="text-xs text-fog">{score === 100 ? "Plano completo. Agora é executar." : `${missing.length} ${missing.length === 1 ? "ponto falta" : "pontos faltam"} para o plano seguir o método.`}</p>
        </div>
        {missing.length > 0 && (
          <ul className="mt-3 space-y-1">{missing.slice(0, 5).map(([, l, href]) => <li key={l}><Link href={href} className="text-xs text-fog hover:text-paper flex gap-1.5"><span className="text-danger">○</span>{l}</Link></li>)}</ul>
        )}
      </section>

      <section className="card p-5 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Linha do tempo do trimestre</p>
          <div className="flex gap-3 text-[10px] text-fog"><span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{ background: PHASE_COLOR.Antes }} />aquecimento</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-mint" />ação</span></div>
        </div>
        <div className="relative">
          <div className="grid grid-cols-3 text-[11px] text-fog mb-1">{months.map((m) => <span key={m}>{MONTHS[Number(m.slice(5, 7)) - 1]}</span>)}</div>
          <div className="relative rounded-lg bg-panel2/50 border border-line" style={{ height: Math.max(1, lanes.length) * 30 + 34 }}>
            {[1, 2].map((i) => <span key={i} className="absolute top-0 bottom-0 w-px bg-line" style={{ left: `${pos(months[i])}%` }} />)}
            {today >= months[0] && today <= qEnd && <span className="absolute top-0 bottom-0 w-0.5 bg-danger/70 z-10" style={{ left: `${pos(today)}%` }} title="hoje" />}
            {d.launch?.launch_date && d.launch.launch_date >= months[0] && d.launch.launch_date <= qEnd && <span className="absolute -top-1 text-[10px] text-mint z-10" style={{ left: `${pos(d.launch.launch_date)}%` }} title="estreia da loja online">★</span>}
            {lanes.map((lane, li) => lane.map((a) => {
              const s = a.warmup_date || addDays(a.date, -5), e = a.end_date || a.date;
              return (
                <Link key={a.id} href={`/ecommerce/acoes/campanha?id=${a.id}`} className="absolute flex items-center group" style={{ top: 8 + li * 30, left: `${pos(s)}%`, width: `${Math.max(2, pos(e) - pos(s) + 100 / span)}%` }} title={`${a.title} · ${fmtDay(a.date)}`}>
                  <span className="h-1.5 rounded-full w-full" style={{ background: PHASE_COLOR.Antes, opacity: 0.7 }} />
                  <span className="absolute w-3 h-3 rounded-full bg-mint ring-2 ring-[var(--color-panel)]" style={{ left: `calc(${(daysBetween(s, a.date) / Math.max(1, daysBetween(s, e) + 1)) * 100}% - 4px)` }} />
                  <span className="absolute top-3 left-0 text-[10px] whitespace-nowrap text-fog group-hover:text-paper">{a.title}</span>
                </Link>
              );
            }))}
            <div className="absolute left-0 right-0 bottom-1">
              {sugg.map((x) => <Link key={x.title} href={`/ecommerce/acoes?nova=${x.date}&t=${encodeURIComponent(x.title)}&k=${x.kind}`} className="absolute -translate-x-1/2 text-[9px] text-fog/70 hover:text-paper whitespace-nowrap" style={{ left: `${pos(x.date)}%` }} title={`${x.title}: adicionar`}>◇</Link>)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {months.map((m) => {
            const r = row(m), top = Number(r.goal_super || r.goal || 0), sold = Number(r.result) || 0;
            const at = (v: any) => (top ? Math.min(100, (Number(v) / top) * 100) : 0);
            return (
              <div key={m}>
                <div className="flex justify-between text-[11px]"><span className="text-fog">{MONTHS[Number(m.slice(5, 7)) - 1].slice(0, 3)} · {per(m).length} {per(m).length === 1 ? "ação" : "ações"}</span><span className="tabular-nums">{r.goal ? brl(r.goal) : "sem meta"}</span></div>
                <div className="relative h-2 rounded-full bg-line mt-1 overflow-hidden">
                  {sold > 0 && <div className="h-full bg-mint" style={{ width: `${at(sold)}%` }} />}
                  {r.goal_min && <span className="absolute top-0 h-full w-0.5 bg-paper/50" style={{ left: `${at(r.goal_min)}%` }} title="mínima" />}
                  {r.goal && r.goal_super && <span className="absolute top-0 h-full w-0.5 bg-paper" style={{ left: `${at(r.goal)}%` }} title="meta" />}
                </div>
                <p className="text-[10px] text-fog mt-0.5 tabular-nums">{sold ? `vendido ${brl(sold)}` : monthEnd(m) < today ? "lance o vendido" : "em andamento"}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
