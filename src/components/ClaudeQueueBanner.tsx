"use client";
import { useEffect, useState } from "react";
import { AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { CLAUDE_PANEL_URL } from "@/components/ClaudeSettings";

const PHRASE = "Responda os pedidos de IA do VINCIT HUB";

/** Aviso flutuante: pedidos de IA que foram para o Claude e estão esperando resposta nesta tela */
export default function ClaudeQueueBanner() {
  const [items, setItems] = useState<AIQueueEvent[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<AIQueueEvent>).detail;
      setItems((xs) => {
        const rest = xs.filter((x) => x.id !== d.id);
        return d.state === "waiting" ? [...rest, d] : rest;
      });
    };
    window.addEventListener(AI_QUEUE_EVENT, on);
    return () => window.removeEventListener(AI_QUEUE_EVENT, on);
  }, []);

  if (!items.length) return null;
  async function copy() { try { await navigator.clipboard.writeText(PHRASE); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }

  return (
    <div role="status" aria-live="polite" className="print:hidden fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] card p-4 shadow-2xl border border-mint/40 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 w-2 h-2 rounded-full bg-mint animate-pulse shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-sm">{items.length === 1 ? "Pedido enviado ao Claude" : `${items.length} pedidos enviados ao Claude`}</p>
          <p className="text-xs text-fog mt-0.5 truncate">{items.map((i) => i.label).join(" · ")}</p>
        </div>
      </div>
      <p className="text-xs text-fog leading-relaxed">A IA roda na sua assinatura do Claude. Abra o painel do HUB no Claude e clique em <span className="text-paper">Responder</span>, ou peça no chat: <span className="text-paper">“{PHRASE}”</span>. Deixe esta página aberta: o resultado aparece aqui sozinho.</p>
      <div className="flex flex-wrap gap-2">
        <a href={CLAUDE_PANEL_URL || "https://claude.ai"} target="_blank" rel="noreferrer" className="btn btn-mint btn-sm">Abrir painel no Claude</a>
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm">{copied ? "Frase copiada" : "Copiar frase para o chat"}</button>
      </div>
    </div>
  );
}
