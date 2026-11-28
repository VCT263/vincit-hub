"use client";
import { useState } from "react";
import { I } from "@/components/icons";
import { LIXEIRA_DIAS, prazoTexto } from "@/lib/lixeira";

/* Seção "Lixeira" para qualquer lista do HUB: mostra o que foi excluído, quanto tempo falta e o botão Recuperar. */
export type ItemLixeira = { id: string; titulo: string; sub?: string; at: string; antes?: React.ReactNode };

export default function Lixeira({ itens, onRecuperar, nome = "Itens", inicial = false }: { itens: ItemLixeira[]; onRecuperar: (id: string) => void | Promise<void>; nome?: string; inicial?: boolean }) {
  const [aberta, setAberta] = useState(inicial);
  if (!itens.length) return null;
  return (
    <section className="mt-10">
      <button onClick={() => setAberta((v) => !v)} className="font-mono text-[11px] text-fog tracking-widest uppercase hover:text-white flex items-center gap-2">
        <I.trash className="w-3.5 h-3.5" />Lixeira · {itens.length} {aberta ? "▴" : "▾"}
      </button>
      {aberta && (
        <div className="mt-3 card divide-y divide-line">
          <p className="px-4 py-2.5 text-xs text-fog">{nome} excluídos ficam aqui por {LIXEIRA_DIAS} dias e depois são apagados de vez.</p>
          {itens.map((x) => (
            <div key={x.id} className="px-4 py-3 flex items-center gap-3">
              {x.antes}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{x.titulo}</p>
                <p className="text-[11px] text-fog">{x.sub ? `${x.sub} · ` : ""}{prazoTexto(x.at)}</p>
              </div>
              <button onClick={() => onRecuperar(x.id)} className="btn btn-ghost !py-1.5 text-sm"><I.refresh className="w-4 h-4" />Recuperar</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
