"use client";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/* Desenha só o que está perto da tela. O manual e as aplicações têm dezenas de mockups
   fotográficos (cada um com várias camadas de luz em 1600 px); montar todos de uma vez
   estoura a memória do Safari no iPhone ("Um problema ocorreu repetidamente").
   O PDF não depende disso: na impressão os slides são montados à parte (PrintDeck). */

let printing = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export function setPrintAll(v: boolean) { if (printing !== v) { printing = v; emit(); } }
const subscribe = (f: () => void) => {
  subs.add(f);
  const on = () => setPrintAll(true), off = () => setPrintAll(false);
  if (subs.size === 1) { window.addEventListener("beforeprint", on); window.addEventListener("afterprint", off); }
  return () => { subs.delete(f); if (!subs.size) { window.removeEventListener("beforeprint", on); window.removeEventListener("afterprint", off); } };
};
export const usePrintAll = () => useSyncExternalStore(subscribe, () => printing, () => false);

/** monta o PDF inteiro: liga tudo, espera as imagens carregarem e abre a impressão */
export async function printAll() {
  setPrintAll(true);
  await new Promise((r) => setTimeout(r, 400));
  await document.fonts?.ready;
  const imgs = Array.from(document.images).filter((i) => !i.complete);
  await Promise.race([Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 8000))]);
  window.print();
  setTimeout(() => setPrintAll(false), 1000);
}

/** true enquanto o elemento está a até ~1 tela de distância da área visível */
export function useNear(ref: RefObject<HTMLElement | null>, margin = "100% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el); return () => io.disconnect();
  }, [ref, margin]);
  return near;
}
