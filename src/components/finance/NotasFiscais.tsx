"use client";
import { brl, dt } from "@/lib/agency";
import { semNota, type Nota } from "@/lib/gestao";

/** Notas fiscais emitidas (importadas do Asaas, arquivos no Drive) e recebimentos que ainda não têm nota. */
export default function NotasFiscais({ fin, notas }: { fin: any; notas: Nota[] }) {
  const emitidas = notas.filter((x) => (x.status || "emitida") === "emitida").sort((a, b) => b.issued_at.localeCompare(a.issued_at));
  const anoAtras = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const faltam = semNota(fin.tx, notas, anoAtras).sort((a: any, b: any) => b.due_date.localeCompare(a.due_date));
  const anos = Array.from(new Set(emitidas.map((x) => x.issued_at.slice(0, 4))));
  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <section className="card p-5 lg:col-span-3">
        <div className="flex items-baseline justify-between mb-1"><p className="font-display font-bold">Notas emitidas</p><p className="text-xs text-fog">{emitidas.length} · {brl(emitidas.reduce((a, x) => a + Number(x.amount), 0))}</p></div>
        <p className="text-xs text-fog mb-4">Emitidas no Asaas. O PDF e o XML de cada uma ficam no Drive, em Financeiro › Notas fiscais.</p>
        {!emitidas.length ? <p className="text-sm text-fog">Nenhuma nota ainda.</p> : anos.map((y) => (
          <div key={y} className="mb-4">
            <p className="text-[11px] uppercase tracking-wide text-fog mb-1">{y} · {brl(emitidas.filter((x) => x.issued_at.startsWith(y)).reduce((a, x) => a + Number(x.amount), 0))}</p>
            <ul className="divide-y divide-line/60">{emitidas.filter((x) => x.issued_at.startsWith(y)).map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono text-xs text-fog w-10">nº {x.number ?? "–"}</span>
                <span className="flex-1 truncate">{x.client_name || "–"}</span>
                <span className="text-[11px] text-fog w-20 hidden sm:block">{dt(x.issued_at)}</span>
                <span className="font-mono text-xs w-24 text-right">{brl(Number(x.amount))}</span>
                <span className="flex gap-1 w-20 justify-end">
                  {x.pdf_url && <a href={x.pdf_url} target="_blank" rel="noreferrer" className="chip hover:text-mint">PDF</a>}
                  {x.xml_url && <a href={x.xml_url} target="_blank" rel="noreferrer" className="chip hover:text-mint">XML</a>}
                </span>
              </li>
            ))}</ul>
          </div>
        ))}
      </section>
      <section className="card p-5 lg:col-span-2">
        <p className="font-display font-bold mb-1">Recebidos sem nota</p>
        <p className="text-xs text-fog mb-4">Últimos 12 meses. Compara cliente, valor (até R$ 1) e data (até 45 dias).</p>
        {!faltam.length ? <p className="text-sm text-mint">Todo recebimento tem nota.</p> : (
          <>
            <p className="text-sm text-danger mb-2">{faltam.length} recebimento(s) · {brl(faltam.reduce((a: number, t: any) => a + Number(t.amount), 0))}</p>
            <ul className="space-y-1.5">{faltam.map((t: any) => (
              <li key={t.id} className="flex items-center gap-2 text-sm bg-panel2 rounded-lg px-3 py-2"><span className="text-[11px] text-fog w-16">{dt(t.due_date)}</span><span className="flex-1 truncate">{t.ag_clients?.name || t.description}</span><span className="font-mono text-xs">{brl(Number(t.amount))}</span></li>
            ))}</ul>
            <p className="text-[11px] text-fog mt-3">Emita no Asaas (Notas fiscais › Adicionar nota avulsa) e peça ao Claude para trazer de volta.</p>
          </>
        )}
      </section>
    </div>
  );
}
