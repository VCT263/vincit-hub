"use client";
import { CLAUDE_QUEUE_URL } from "@/lib/painelApp";

/**
 * Janela pop-up com uma conversa nova no Claude de quem está logado, já com o pedido
 * "responda os pedidos do HUB". O Claude responde pelo conector VINCIT HUB e o resultado volta
 * para a tela do site.
 * Abre no clique do botão de IA (senão o navegador bloqueia) e fecha quando a fila esvazia.
 */
const NAME = "vincit-claude";
const PREF = "hub_claude_popup";
let win: Window | null = null;
let pending = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

export function popupEnabled() {
  try { return localStorage.getItem(PREF) !== "0"; } catch { return true; }
}
export function setPopupEnabled(on: boolean) {
  try { localStorage.setItem(PREF, on ? "1" : "0"); } catch {}
}
/** a rota respondeu direto (API própria ligada): não precisa de pop-up */
export function markDirectAI(direct: boolean) {
  try { direct ? localStorage.setItem("hub_ai_direct", "1") : localStorage.removeItem("hub_ai_direct"); } catch {}
}
const isDirect = () => { try { return localStorage.getItem("hub_ai_direct") === "1"; } catch { return false; } };
export function popupOpen() { return !!win && !win.closed; }

/** chame de forma síncrona dentro do clique; devolve false se o navegador bloqueou */
export function openClaudePopup(): boolean {
  if (typeof window === "undefined") return false;
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  if (popupOpen()) return true;
  const w = 440, h = Math.min(820, (window.screen?.availHeight || 900) - 80);
  const left = Math.max(0, (window.screen?.availWidth || 1400) - w - 24);
  win = window.open(CLAUDE_QUEUE_URL, NAME, `popup=yes,width=${w},height=${h},left=${left},top=40`);
  return !!win;
}

/** um pedido de IA começou (antes da resposta da rota) */
export function claudeRequestStarted() {
  pending++;
  if (popupEnabled() && !isDirect()) openClaudePopup();
}

/** o pedido terminou; queued = foi mesmo para a fila do Claude */
export function claudeRequestFinished(queued: boolean) {
  pending = Math.max(0, pending - 1);
  if (pending > 0) return;
  if (closeTimer) clearTimeout(closeTimer);
  // se não foi para a fila (erro, limite, API própria), fecha já; se foi, dá um tempo para o painel terminar
  closeTimer = setTimeout(() => { try { win?.close(); } catch {} win = null; }, queued ? 5000 : 0);
}
