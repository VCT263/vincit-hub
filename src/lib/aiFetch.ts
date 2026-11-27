"use client";
import { claudeRequestStarted, claudeRequestFinished, markDirectAI } from "@/lib/claudePopup";

/**
 * POST para uma rota de IA do HUB que entende a fila do Claude.
 * Resposta 202 = o pedido foi para o Claude da pessoa (conector VINCIT HUB). Repete a cada 8 s
 * com `_ai_request` até o Claude responder; aí a rota devolve o resultado normal desta tela.
 */
export type AIQueueEvent = { id: string; label: string; state: "waiting" | "done" | "error" | "gave_up" };
export const AI_QUEUE_EVENT = "hub-ai-queue";

const emit = (d: AIQueueEvent) => { try { window.dispatchEvent(new CustomEvent(AI_QUEUE_EVENT, { detail: d })); } catch {} };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function aiFetch(url: string, body: any, opts: { maxWaitMs?: number } = {}): Promise<Response> {
  const post = (b: any) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
  claudeRequestStarted(); // abre o pop-up do Claude ainda dentro do clique
  let queued = false;
  try {
    return await run();
  } finally { claudeRequestFinished(queued); }

  async function run(): Promise<Response> {
  let r = await post(body);
  if (r.status !== 202) { if (r.ok) markDirectAI(true); return r; }
  const first = await r.clone().json().catch(() => ({}));
  const id: string = first.request_id, label: string = first.label || "Pedido de IA";
  if (!id) return r;
  queued = true; markDirectAI(false);
  emit({ id, label, state: "waiting" });
  const until = Date.now() + (opts.maxWaitMs ?? 45 * 60 * 1000);
  while (Date.now() < until) {
    await sleep(document.hidden ? 15000 : 8000);
    try { r = await post({ ...body, _ai_request: id }); } catch { continue; }
    if (r.status === 202) continue;
    emit({ id, label, state: r.ok ? "done" : "error" });
    return r;
  }
  emit({ id, label, state: "gave_up" });
  return new Response(JSON.stringify({ error: "O Claude ainda não respondeu. O pedido continua na fila: responda no painel do HUB no Claude e tente de novo." }), { status: 504, headers: { "content-type": "application/json" } });
}
}
