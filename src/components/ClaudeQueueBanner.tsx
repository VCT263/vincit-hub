"use client";
import { useEffect, useState } from "react";
import { AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { openClaudePopup, popupOpen } from "@/lib/claudePopup";

type Item = AIQueueEvent & { at: number };

/** Aviso enxuto: o que foi pedido ao Claude e há quanto tempo está sendo respondido */
export default function ClaudeQueueBanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<AIQueueEvent>).detail;
      setItems((xs) => {
        const rest = xs.filter((x) => x.id !== d.id);
        return d.state === "waiting" ? [...rest, { ...d, at: Date.now() }] : rest;
      });
      if (d.state === "waiting") { setDone(null); setTimeout(() => setOpen(popupOpen()), 600); }
      if (d.state === "done") { setDone(d.label); setTimeout(() => setDone((x) => (x === d.label ? null : x)), 4000); }
    };
    window.addEventListener(AI_QUEUE_EVENT, on);
    return () => window.removeEventListener(AI_QUEUE_EVENT, on);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => { tick((n) => n + 1); setOpen(popupOpen()); }, 1000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length && !done) return null;
  const cur = items[0];
  const secs = cur ? Math.round((Date.now() - cur.at) / 1000) : 0;
  const elapsed = secs < 60 ? `${secs} s` : `${Math.floor(secs / 60)} min`;

  return (
    <div role="status" aria-live="polite" className="print:hidden fixed z-50 bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-4 right-4 left-4 sm:left-auto sm:w-[320px] card px-4 py-3 shadow-2xl border border-mint/40">
      {cur ? (
        <>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse shrink-0" aria-hidden />
            <p className="text-sm font-semibold truncate flex-1 min-w-0">{cur.label}</p>
            <span className="text-xs text-fog tabular-nums shrink-0">{elapsed}</span>
          </div>
          <p className="text-xs text-fog mt-1 ml-5">
            {open ? "No Claude: envie a mensagem que já vem escrita" : "Esperando o Claude"}
            {items.length > 1 ? ` · mais ${items.length - 1} na fila` : ""}
          </p>
          <div className="mt-2 ml-5 h-1 rounded bg-white/10 overflow-hidden" aria-hidden>
            <div className="h-full w-1/3 bg-mint rounded animate-pulse" />
          </div>
          {!open && (
            <button type="button" onClick={() => setOpen(openClaudePopup())} className="btn btn-mint btn-sm mt-3 ml-5">Abrir Claude</button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-mint shrink-0" aria-hidden />
          <p className="text-sm truncate"><span className="font-semibold">Pronto:</span> {done}</p>
        </div>
      )}
    </div>
  );
}
