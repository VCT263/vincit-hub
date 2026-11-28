import Link from "next/link";
import { brl, brlShort } from "@/lib/agency";
import { ALOC_INFO, saude } from "@/lib/gestao";

/** Saúde do negócio: os 4 números que decidem, com o alvo ao lado (Visão geral do Gestor). */
export default function SaudeNegocio({ s, saldo }: { s: ReturnType<typeof saude>; saldo: number }) {
  const { r, aloc, pct } = s;
  const caixaCor = s.mesesCaixa === null ? "" : s.mesesCaixa < 1 ? "text-danger" : s.mesesCaixa < 3 ? "text-[#f5c84c]" : "text-mint";
  return (
    <section className="mb-5 space-y-3 rise">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-fog">Receita em 12 meses</p>
          <p className="font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums">{brlShort(r.receita)}</p>
          <p className="text-[11px] text-fog mt-1">média de {brlShort(s.media)} por mês{s.mrr ? ` · contratos ${brlShort(s.mrr)}/mês` : ""}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-fog">Maior cliente</p>
          <p className={`font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums ${s.maior && s.maior.pct >= 50 ? "text-danger" : ""}`}>{s.maior ? `${Math.round(s.maior.pct)}%` : "–"}</p>
          <p className="text-[11px] text-fog mt-1 truncate">{s.maior ? `da receita vem de ${s.maior.nome}` : "sem recebimentos"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-fog">Ficou na empresa</p>
          <p className={`font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums ${pct(r.saida.lucro) < aloc.lucro ? "text-danger" : "text-mint"}`}>{Math.round(pct(r.saida.lucro))}%</p>
          <p className="text-[11px] text-fog mt-1">alvo {aloc.lucro}% · {brlShort(r.saida.lucro)} em 12 meses</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-fog">Meses de caixa</p>
          <p className={`font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums ${caixaCor}`}>{s.mesesCaixa === null ? "–" : s.mesesCaixa.toFixed(1)}</p>
          <p className="text-[11px] text-fog mt-1">saldo {brlShort(saldo)} ÷ custo de {brlShort(s.custoMes)}/mês · alvo 3</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-3">
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-3"><p className="font-display font-bold">Para onde foi o dinheiro · 12 meses</p><Link href="/agency/financeiro?tab=fechamento" className="text-xs text-fog hover:text-mint">Fechamento →</Link></div>
          <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-panel2">{ALOC_INFO.map((a) => <div key={a.k} style={{ width: `${Math.max(0, pct(r.saida[a.k]))}%`, background: a.c }} title={a.l} />)}</div>
          <ul className="space-y-2">{ALOC_INFO.map((a) => { const real = pct(r.saida[a.k]); const alvo = aloc[a.k]; const ruim = a.k === "lucro" || a.k === "impostos" ? real < alvo - 2 : real > alvo + 5; return (
            <li key={a.k} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.c }} />
              <span className="flex-1 truncate">{a.l}</span>
              <span className={`font-mono text-xs ${ruim ? "text-danger" : "text-paper"}`}>{Math.round(real)}%</span>
              <span className="font-mono text-[11px] text-fog w-14 text-right">alvo {alvo}%</span>
              <span className="font-mono text-[11px] text-fog w-16 text-right hidden sm:block">{brlShort(r.saida[a.k])}</span>
            </li>
          ); })}</ul>
        </div>
        <div className="card p-5 lg:col-span-2">
          <p className="font-display font-bold mb-3">O que fazer</p>
          {!s.alertas.length ? <p className="text-sm text-fog">Tudo dentro do alvo. Mantenha o fechamento todo mês.</p> : (
            <ul className="space-y-2">{s.alertas.map((a, i) => (
              <li key={i} className={`text-sm rounded-lg px-3 py-2 border ${a.nivel === "alto" ? "border-danger/40 bg-danger/5" : "border-line bg-panel2"}`}>{a.t}</li>
            ))}</ul>
          )}
          {!!s.faltaNota.length && <Link href="/agency/financeiro?tab=notas" className="text-xs text-fog hover:text-mint inline-block mt-3">Ver recebimentos sem nota ({brl(s.faltaNota.reduce((a, t) => a + Number(t.amount), 0))}) →</Link>}
        </div>
      </div>
    </section>
  );
}
