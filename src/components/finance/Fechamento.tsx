"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl, brlShort } from "@/lib/agency";
import { ALOC_INFO, alocDe, resumo, semNota, type Aloc, type Nota } from "@/lib/gestao";

/** Fechamento do mês do negócio: o que entrou, como dividir (Profit First), o que foi feito e o que falta. */
export default function Fechamento({ fin, month, saldo, notas }: { fin: any; month: string; saldo: number; notas: Nota[] }) {
  const [aloc, setAloc] = useState<Aloc>(alocDe(fin.settings?.alocacao));
  const [editando, setEditando] = useState(false);
  const [salvo, setSalvo] = useState("");
  useEffect(() => { setAloc(alocDe(fin.settings?.alocacao)); }, [fin.settings]);

  const r = resumo(fin.tx, month, month);
  const soma = aloc.lucro + aloc.prolabore + aloc.impostos + aloc.operacao;
  const notasMes = notas.filter((x) => x.issued_at?.startsWith(month) && (x.status || "emitida") === "emitida");
  const faltam = semNota(fin.tx, notas, month + "-01").filter((t) => t.due_date.startsWith(month));
  const custoMes = r.gasto;
  const mesesCaixa = custoMes > 0 ? saldo / custoMes : null;

  async function salvar() {
    const s = createClient(); const { data: { user } } = await s.auth.getUser();
    const { error } = await s.from("ag_settings").upsert({ owner_id: user!.id, alocacao: aloc, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
    setSalvo(error ? error.message : "Divisão salva."); if (!error) { setEditando(false); fin.reload(); }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4"><p className="text-xs text-fog">Entrou no mês</p><p className="font-display text-2xl font-bold mt-1 text-mint tabular-nums">{brl(r.receita)}</p><p className="text-[11px] text-fog mt-1">{r.clientes.length} cliente(s)</p></div>
        <div className="card p-4"><p className="text-xs text-fog">Saiu no mês</p><p className="font-display text-2xl font-bold mt-1 text-danger tabular-nums">{brl(r.gasto)}</p><p className="text-[11px] text-fog mt-1">pró-labore, impostos e operação</p></div>
        <div className="card p-4"><p className="text-xs text-fog">Ficou na empresa</p><p className={`font-display text-2xl font-bold mt-1 tabular-nums ${r.saida.lucro < 0 ? "text-danger" : ""}`}>{brl(r.saida.lucro)}</p><p className="text-[11px] text-fog mt-1">{r.receita ? `${Math.round((r.saida.lucro / r.receita) * 100)}% do que entrou` : "–"}</p></div>
        <div className="card p-4"><p className="text-xs text-fog">Meses de caixa</p><p className={`font-display text-2xl font-bold mt-1 tabular-nums ${mesesCaixa !== null && mesesCaixa < 3 ? "text-danger" : ""}`}>{mesesCaixa === null ? "–" : mesesCaixa.toFixed(1)}</p><p className="text-[11px] text-fog mt-1">saldo hoje {brlShort(saldo)}</p></div>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <p className="font-display font-bold">Divisão do que entrou</p>
          <button onClick={() => setEditando(!editando)} className="text-xs text-fog hover:text-mint">{editando ? "Fechar" : "Ajustar percentuais"}</button>
        </div>
        <p className="text-xs text-fog mb-4">Método Profit First: a cada recebimento, separe primeiro lucro, pró-labore e impostos; a operação vive com o resto.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ALOC_INFO.map((a) => { const alvo = (r.receita * aloc[a.k]) / 100; const real = r.saida[a.k]; const dif = real - alvo; const bom = a.k === "lucro" || a.k === "impostos" ? dif >= -1 : dif <= 1; return (
            <div key={a.k} className="bg-panel2 rounded-xl p-4" style={{ borderTop: `3px solid ${a.c}` }}>
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">{a.l}</p>
                {editando ? <span className="flex items-center gap-1"><input type="number" min={0} max={100} className="input !py-0.5 !w-16 text-xs" value={aloc[a.k]} onChange={(e) => setAloc({ ...aloc, [a.k]: Number(e.target.value) || 0 })} />%</span> : <span className="chip">{aloc[a.k]}%</span>}</div>
              <p className="text-[11px] text-fog mt-1 min-h-8">{a.d}</p>
              <p className="text-[11px] text-fog mt-3">Separar</p><p className="font-mono">{brl(alvo)}</p>
              <p className="text-[11px] text-fog mt-2">{a.k === "lucro" ? "Sobrou de fato" : "Foi de fato"}</p><p className={`font-mono ${bom ? "text-mint" : "text-danger"}`}>{brl(real)}</p>
            </div>
          ); })}
        </div>
        {editando && <div className="flex items-center justify-end gap-3 mt-4"><span className={`text-xs ${soma === 100 ? "text-fog" : "text-danger"}`}>Soma {soma}%</span><button disabled={soma !== 100} onClick={salvar} className="btn btn-mint btn-sm">Salvar divisão</button></div>}
        {salvo && <p className="text-xs text-fog mt-2 text-right">{salvo}</p>}
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <p className="font-display font-bold mb-3">Quem pagou</p>
          {!r.clientes.length ? <p className="text-sm text-fog">Nenhum recebimento no mês.</p> : <ul className="space-y-2">{r.clientes.map((c) => (
            <li key={c.id}><div className="flex justify-between text-sm mb-1"><span className="truncate">{c.nome}</span><span className="font-mono text-xs">{brl(c.v)} · {Math.round((c.v / (r.receita || 1)) * 100)}%</span></div><div className="h-1.5 bg-panel2 rounded-full"><div className="h-full bg-mint rounded-full" style={{ width: `${(c.v / (r.receita || 1)) * 100}%` }} /></div></li>
          ))}</ul>}
        </section>
        <section className="card p-5">
          <p className="font-display font-bold mb-3">Notas fiscais do mês</p>
          <p className="text-sm">{notasMes.length} emitida(s) · {brl(notasMes.reduce((a, x) => a + Number(x.amount), 0))}</p>
          {!faltam.length ? <p className="text-sm text-fog mt-2">Todo recebimento de cliente tem nota.</p> : (
            <><p className="text-sm text-danger mt-2">{faltam.length} recebimento(s) sem nota</p>
              <ul className="mt-2 space-y-1">{faltam.map((t: any) => <li key={t.id} className="flex justify-between text-xs bg-panel2 rounded-lg px-3 py-2"><span className="truncate">{t.ag_clients?.name || t.description}</span><span className="font-mono">{brl(Number(t.amount))}</span></li>)}</ul></>
          )}
        </section>
      </div>

      <section className="card p-5">
        <p className="font-display font-bold mb-3">Checklist do fechamento</p>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            ["Todo recebimento tem nota fiscal", !faltam.length],
            ["Pró-labore pago em valor fixo", r.saida.prolabore > 0 && r.saida.prolabore <= (r.receita * aloc.prolabore) / 100 + 1],
            ["Impostos separados", r.saida.impostos >= (r.receita * aloc.impostos) / 100 - 1],
            ["Sobrou lucro na empresa", r.saida.lucro >= (r.receita * aloc.lucro) / 100 - 1],
            ["Caixa cobre 3 meses", mesesCaixa !== null && mesesCaixa >= 3],
            ["Nenhum cliente acima de 50% da receita", !r.clientes[0] || r.clientes[0].v / (r.receita || 1) < 0.5],
          ].map(([t, ok]) => <li key={t as string} className="flex items-center gap-2 bg-panel2 rounded-lg px-3 py-2"><span className={ok ? "text-mint" : "text-danger"}>{ok ? "✓" : "✗"}</span>{t}</li>)}
        </ul>
        <p className="text-[11px] text-fog mt-3">O relatório do mês para cada cliente é feito no Claude pelo chat e gravado no HUB.</p>
      </section>
    </div>
  );
}
