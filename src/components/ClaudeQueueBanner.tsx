"use client";
import { useEffect, useState } from "react";
import { AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { openClaudePopup, popupEnabled, popupOpen, setPopupEnabled } from "@/lib/claudePopup";

const PHRASE = "Responda os pedidos de IA do VINCIT HUB";

/** Aviso flutuante: pedidos de IA que foram para o Claude e estão esperando resposta nesta tela */
export default function ClaudeQueueBanner() {
  const [items, setItems] = useState<AIQueueEvent[]>([]);
  const [copied, setCopied] = useState(false);
  const [auto, setAuto] = useState(true);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => { setAuto(popupEnabled()); }, []);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<AIQueueEvent>).detail;
      setItems((xs) => {
        const rest = xs.filter((x) => x.id !== d.id);
        return d.state === "waiting" ? [...rest, d] : rest;
      });
      if (d.state === "waiting") setBlocked(popupEnabled() && !popupOpen());
    };
    window.addEventListener(AI_QUEUE_EVENT, on);
    return () => window.removeEventListener(AI_QUEUE_EVENT, on);
  }, []);

  if (!items.length) return null;
  async function copy() { try { await navigator.clipboard.writeText(PHRASE); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }

  return (
    <div role="status" aria-live="polite" className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] card p-4 shadow-2xl border border-mint/40 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 w-2 h-2 rounded-full bg-mint animate-pulse shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-sm">{items.length === 1 ? "Pedido enviado ao Claude" : `${items.length} pedidos enviados ao Claude`}</p>
          <p className="text-xs text-fog mt-0.5 truncate">{items.map((i) => i.label).join(" · ")}</p>
        </div>
      </div>
      <p className="text-xs text-fog leading-relaxed">
        {blocked
          ? <>O navegador bloqueou o pop-up do Claude. Clique em <span className="text-paper">Abrir Claude aqui</span> (ou permita pop-ups deste site) e ele responde sozinho.</>
          : <>A IA roda na sua assinatura do Claude, numa janelinha por cima do site. Ela responde sozinha e fecha quando termina: continue aqui, o resultado aparece nesta tela.</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { if (openClaudePopup()) setBlocked(false); }} className="btn btn-mint btn-sm">Abrir Claude aqui</button>
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm">{copied ? "Frase copiada" : "Copiar frase para o chat"}</button>
      </div>
      <label className="flex items-center gap-2 text-xs text-fog">
        <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); setPopupEnabled(e.target.checked); }} />
        Abrir o Claude sozinho quando eu usar um botão de IA
      </label>
    </div>
  );
}
