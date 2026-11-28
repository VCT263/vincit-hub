"use client";
import { useState } from "react";
import { brl, brlShort } from "@/lib/agency";
import { ALOC_INFO, alocDe, eReceita, grupoCliente, resumo } from "@/lib/gestao";
import { todayBR } from "@/components/finance/useFinance";

type Per = "mes" | "tri" | "ano";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const ym = (y: number, m: number) => { const d = new Date(y, m, 15); return d.toISOString().slice(0, 7); };

/** intervalo [de, ate] (AAAA-MM) do período que contém ref, e o anterior do mesmo tamanho */
function intervalo(per: Per, y: number, m: number) {
  if (per === "mes") return { de: ym(y, m), ate: ym(y, m), ant: [ym(y, m - 1), ym(y, m - 1)], nome: `${MESES[m]}/${y}` };
  if (per === "tri") { const q = Math.floor(m / 3); return { de: ym(y, q * 3), ate: ym(y, q * 3 + 2), ant: [ym(y, q * 3 - 3), ym(y, q * 3 - 1)], nome: `${q + 1}º tri/${y}` }; }
  return { de: ym(y, 0), ate: ym(y, 11), ant: [ym(y - 1, 0), ym(y - 1, 11)], nome: String(y) };
}

/** Painel do Financeiro: mês, trimestre ou ano, com comparação ao período anterior e índices de gestão. */
export default function Painel({ fin, saldo }: { fin: any; saldo: number }) {
  const hoje = todayBR();
  const [per, setPer] = useState<Per>("tri");
  const [ref, setRef] = useState({ y: Number(hoje.slice(0, 4)), m: Number(hoje.slice(5, 7)) - 1 });
  const passo = per === "mes" ? 1 : per === "tri" ? 3 : 12;
  const mover = (k: number) => { const d = new Date(ref.y, ref.m + k * passo, 15); setRef({ y: d.getFullYear(), m: d.getMonth() }); };

  const iv = intervalo(per, ref.y, ref.m);
  const r = resumo(fin.tx, iv.de, iv.ate);
  const a = resumo(fin.tx, iv.ant[0], iv.ant[1]);
  const aloc = alocDe(fin.settings?.alocacao);
  const meses = (() => { const out: string[] = []; let [y, m] = iv.de.split("-").map(Number); m -= 1; while (ym(y, m) <= iv.ate) { out.push(ym(y, m)); m++; } return out; })();
  const nMeses = meses.length;
  // série mês a mês do ano do período (no mês: os 12 meses até ele)
  const serie = (per === "ano" ? meses : Array.from({ length: 12 }, (_, i) => ym(ref.y, ref.m - 11 + i))).map((mm) => ({ m: mm, ...resumo(fin.tx, mm, mm) }));
  const sMax = Math.max(1, ...serie.flatMap((s) => [s.receita, s.gasto]));

  // índices
  const recorrente = fin.tx.filter((t: any) => !t.transfer_id && t.paid && t.kind === "entrada" && t.due_date?.slice(0, 7) >= iv.de && t.due_date?.slice(0, 7) <= iv.ate && /mensalidade|contrato|recorrente/i.test(t.category || "")).reduce((x: number, t: any) => x + Number(t.amount), 0);
  const recebimentos = fin.tx.filter((t: any) => !t.transfer_id && t.paid && t.kind === "entrada" && eReceita(t.category) && t.due_date?.slice(0, 7) >= iv.de && t.due_date?.slice(0, 7) <= iv.ate).length;
  const grupos: Record<string, number> = {}; r.clientes.forEach((c) => { const g = grupoCliente(c.nome); grupos[g] = (grupos[g] || 0) + c.v; });
  const gs = Object.values(grupos).sort((x, y) => y - x);
  const top1 = r.receita ? ((gs[0] || 0) / r.receita) * 100 : 0;
  const top3 = r.receita ? (gs.slice(0, 3).reduce((x, v) => x + v, 0) / r.receita) * 100 : 0;
  const custoMes = r.gasto / nMeses;
  const p = (v: number) => (r.receita ? (v / r.receita) * 100 : 0);
  const varr = (x: number, y: number) => (y ? ((x - y) / Math.abs(y)) * 100 : null);
  const crescimento = varr(r.receita, a.receita);

  const indices: { l: string; v: string; ref: string; ok: boolean | null; d: string }[] = [
    { l: "Margem (ficou na empresa)", v: `${Math.round(p(r.saida.lucro))}%`, ref: `alvo ${aloc.lucro}% ou mais`, ok: r.receita ? p(r.saida.lucro) >= aloc.lucro : null, d: "Quanto do que entrou não saiu. É a reserva e o lucro do sócio." },
    { l: "Pró-labore sobre a receita", v: `${Math.round(p(r.saida.prolabore))}%`, ref: `alvo até ${aloc.prolabore}%`, ok: r.receita ? p(r.saida.prolabore) <= aloc.prolabore + 2 : null, d: "Seu salário. Acima do alvo, a empresa não junta caixa." },
    { l: "Impostos sobre a receita", v: `${Math.round(p(r.saida.impostos))}%`, ref: `separar ${aloc.impostos}%`, ok: r.receita ? p(r.saida.impostos) <= aloc.impostos : null, d: "Carga paga no período (DAS). Separe sempre o alvo." },
    { l: "Operação sobre a receita", v: `${Math.round(p(r.saida.operacao))}%`, ref: `alvo até ${aloc.operacao}%`, ok: r.receita ? p(r.saida.operacao) <= aloc.operacao + 2 : null, d: "Equipe, contabilidade, transporte, software." },
    { l: "Maior cliente (grupo)", v: `${Math.round(top1)}%`, ref: "até 30% é saudável", ok: r.receita ? top1 <= 30 : null, d: "Peso do maior cliente. Acima de 50% é risco alto." },
    { l: "3 maiores clientes", v: `${Math.round(top3)}%`, ref: "até 60%", ok: r.receita ? top3 <= 60 : null, d: "Concentração da carteira." },
    { l: "Receita recorrente", v: `${Math.round(p(recorrente))}%`, ref: "50% ou mais", ok: r.receita ? p(recorrente) >= 50 : null, d: "Mensalidades e contratos. Dá previsibilidade." },
    { l: "Meses de caixa", v: custoMes > 0 ? (saldo / custoMes).toFixed(1) : "–", ref: "3 ou mais", ok: custoMes > 0 ? saldo / custoMes >= 3 : null, d: "Saldo de hoje ÷ custo médio por mês do período." },
    { l: "Ticket médio", v: recebimentos ? brlShort(r.receita / recebimentos) : "–", ref: `${recebimentos} recebimento(s)`, ok: null, d: "Valor médio de cada recebimento de cliente." },
    { l: "Crescimento da receita", v: crescimento === null ? "–" : `${crescimento > 0 ? "+" : ""}${Math.round(crescimento)}%`, ref: "vs período anterior", ok: crescimento === null ? null : crescimento >= 0, d: "Comparado ao período anterior do mesmo tamanho." },
  ];

  const Kpi = ({ l, v, ant, inv }: { l: string; v: number; ant: number; inv?: boolean }) => { const d = varr(v, ant); const bom = d === null ? null : inv ? d <= 0 : d >= 0; return (
    <div className="card p-4"><p className="text-xs text-fog">{l}</p><p className="font-display text-2xl font-bold mt-1 tabular-nums">{brl(v)}</p>
      <p className="valor text-[11px] mt-1"><span className={bom === null ? "text-fog" : bom ? "text-mint" : "text-danger"}>{d === null ? "–" : `${d > 0 ? "▲" : "▼"} ${Math.abs(Math.round(d))}%`}</span><span className="text-fog"> vs {brlShort(ant)}</span></p></div>
  ); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-panel2 rounded-lg p-1">{([["mes", "Mês"], ["tri", "Trimestre"], ["ano", "Ano"]] as const).map(([k, l]) => <button key={k} onClick={() => setPer(k)} className={`px-3 py-1.5 rounded-md text-sm ${per === k ? "bg-mint text-ink" : "text-fog"}`}>{l}</button>)}</div>
        <div className="flex items-center gap-2"><button onClick={() => mover(-1)} className="btn btn-ghost btn-sm">‹</button><p className="font-display font-bold w-28 text-center capitalize">{iv.nome}</p><button onClick={() => mover(1)} className="btn btn-ghost btn-sm">›</button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi l="Receita" v={r.receita} ant={a.receita} />
        <Kpi l="Saídas" v={r.gasto} ant={a.gasto} inv />
        <Kpi l="Ficou na empresa" v={r.saida.lucro} ant={a.saida.lucro} />
        <Kpi l="Média de receita por mês" v={r.receita / nMeses} ant={a.receita / nMeses} />
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><p className="font-display font-bold">{per === "ano" ? `Mês a mês de ${ref.y}` : "Últimos 12 meses"}</p>
          <div className="flex gap-3 text-[11px] text-fog"><span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-mint inline-block" />Receita</span>{ALOC_INFO.filter((x) => x.k !== "lucro").map((x) => <span key={x.k} className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm inline-block" style={{ background: x.c }} />{x.l}</span>)}</div></div>
        <div className="flex items-end gap-1.5 sm:gap-3 h-48">{serie.map((s) => { const dentro = s.m >= iv.de && s.m <= iv.ate; return (
          <div key={s.m} className={`flex-1 flex flex-col items-center gap-1 ${dentro ? "" : "opacity-40"}`}>
            <div className="flex items-end gap-0.5 h-40 w-full justify-center">
              <div title={`Receita ${brl(s.receita)}`} className="w-1/2 max-w-4 rounded-t bg-mint" style={{ height: `${(s.receita / sMax) * 100}%` }} />
              <div className="w-1/2 max-w-4 flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${(s.gasto / sMax) * 100}%` }}>{ALOC_INFO.filter((x) => x.k !== "lucro").map((x) => <div key={x.k} title={`${x.l} ${brl(s.saida[x.k])}`} style={{ height: `${s.gasto ? (Math.max(0, s.saida[x.k]) / s.gasto) * 100 : 0}%`, background: x.c }} />)}</div>
            </div>
            <p className="text-[10px] text-fog capitalize">{MESES[Number(s.m.slice(5)) - 1]}</p>
            <p className={`text-[9px] font-mono hidden sm:block ${s.saida.lucro < 0 ? "text-danger" : "text-fog"}`}>{s.receita || s.gasto ? brlShort(s.saida.lucro) : ""}</p>
          </div>
        ); })}</div>
      </section>

      <section className="card p-5">
        <p className="font-display font-bold">Índices de gestão · {iv.nome}</p>
        <p className="text-xs text-fog mb-4">Verde está dentro do alvo; vermelho pede ação. Os alvos de divisão vêm do Fechamento do mês.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">{indices.map((x) => (
          <div key={x.l} className="bg-panel2 rounded-xl p-4" title={x.d}>
            <p className="text-[11px] text-fog leading-tight min-h-7">{x.l}</p>
            <p className={`font-display text-2xl font-bold mt-1 tabular-nums ${x.ok === null ? "" : x.ok ? "text-mint" : "text-danger"}`}>{x.v}</p>
            <p className="text-[10px] text-fog mt-1">{x.ref}</p>
          </div>
        ))}</div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <p className="font-display font-bold mb-3">Receita por cliente</p>
          {!r.clientes.length ? <p className="text-sm text-fog">Sem recebimentos no período.</p> : <ul className="space-y-2">{r.clientes.slice(0, 8).map((c) => (
            <li key={c.id}><div className="flex justify-between text-sm mb-1"><span className="truncate">{c.nome}</span><span className="font-mono text-xs">{brlShort(c.v)} · {Math.round(p(c.v))}%</span></div><div className="h-1.5 bg-panel2 rounded-full"><div className="h-full bg-mint rounded-full" style={{ width: `${p(c.v)}%` }} /></div></li>
          ))}</ul>}
        </section>
        <section className="card p-5">
          <p className="font-display font-bold mb-3">Para onde foi o dinheiro</p>
          {!r.receita && !r.gasto ? <p className="text-sm text-fog">Sem movimento no período.</p> : <ul className="space-y-3">{ALOC_INFO.map((x) => (
            <li key={x.k}><div className="flex justify-between text-sm mb-1"><span>{x.l}</span><span className="font-mono text-xs">{brlShort(r.saida[x.k])} · {Math.round(p(r.saida[x.k]))}% <span className="text-fog">(alvo {aloc[x.k]}%)</span></span></div>
              <div className="h-2 bg-panel2 rounded-full relative overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, p(r.saida[x.k])))}%`, background: x.c }} /><div className="absolute top-0 bottom-0 w-0.5 bg-paper/70" style={{ left: `${aloc[x.k]}%` }} /></div></li>
          ))}</ul>}
        </section>
      </div>
    </div>
  );
}
