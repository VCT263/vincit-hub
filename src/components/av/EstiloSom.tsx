"use client";
import { useEffect, useRef, useState } from "react";
import { I } from "@/components/icons";
import { ESTILOS_SOM, ESTILO_SOM_IDS, previaSom, type EstiloSom } from "@/lib/editor/som";

/** Escolha do estilo de som, com prévia de 5 s para ouvir antes de decidir. */
export function EstiloSomSelect({ value, onChange, vazio = "Sem som", compacto = false }: { value?: string; onChange: (v: EstiloSom | undefined) => void; vazio?: string; compacto?: boolean }) {
  const [tocando, setTocando] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { audio.current?.pause(); }, []);
  const ouvir = (e: EstiloSom) => {
    audio.current?.pause();
    if (tocando === e) { setTocando(null); return; }
    const a = new Audio(previaSom(e));
    a.onended = () => setTocando(null);
    a.play().catch(() => setTocando(null));
    audio.current = a; setTocando(e);
  };
  const atual = ESTILO_SOM_IDS.includes(value as EstiloSom) ? (value as EstiloSom) : undefined;
  return (
    <div>
      <div className="flex gap-1.5">
        <select className={`input ${compacto ? "!py-1.5 text-sm" : ""} flex-1 min-w-0`} value={atual || ""} onChange={(e) => onChange((e.target.value || undefined) as EstiloSom | undefined)}>
          <option value="">{vazio}</option>
          {ESTILO_SOM_IDS.map((k) => <option key={k} value={k}>{ESTILOS_SOM[k].nome}</option>)}
        </select>
        {atual && (
          <button type="button" onClick={() => ouvir(atual)} className="w-9 shrink-0 grid place-items-center rounded-lg border border-line hover:border-mint" aria-label={tocando === atual ? "Parar a prévia" : "Ouvir a prévia"} title="Ouvir 5 s deste estilo">
            {tocando === atual ? <I.pause className="w-4 h-4" /> : <I.play className="w-4 h-4" />}
          </button>
        )}
      </div>
      {atual && <p className="text-[11px] text-fog mt-1">{ESTILOS_SOM[atual].quando}</p>}
    </div>
  );
}
