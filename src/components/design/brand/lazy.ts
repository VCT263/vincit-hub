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

/** celular: tela pequena ou toque sem mouse. Lá os mockups são desenhados em meia resolução */
const forced = () => { try { return localStorage.getItem("hub-leve") === "1"; } catch { return false; } };
const isLite = () => typeof window !== "undefined" && (forced() || Math.min(window.screen.width, window.screen.height) < 820 || window.matchMedia("(pointer: coarse)").matches);
export function useLite() {
  // já certo no primeiro desenho quando o componente nasce no navegador (os mockups só nascem lá)
  const [lite, setLite] = useState(isLite);
  useEffect(() => { setLite(isLite()); }, []);
  return lite;
}

/* fotos dos mockups reduzidas no próprio aparelho, uma por vez (cada foto de 1600 px ocupa ~8 MB
   decodificada; um mockup chega a ter 11). Guarda o resultado para não refazer ao rolar de volta. */
const shrunk = new Map<string, Promise<string>>();
let chain: Promise<unknown> = Promise.resolve();
function shrink(url: string, maxW: number) {
  const key = `${maxW}|${url}`;
  let p = shrunk.get(key);
  if (!p) {
    p = new Promise<string>((done) => {
      chain = chain.then(async () => {
        try {
          const blob = await fetch(url, { mode: "cors" }).then((r) => r.blob());
          const bmp = await createImageBitmap(blob);
          const w = Math.min(maxW, bmp.width), h = Math.round((bmp.height * w) / bmp.width);
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          c.getContext("2d")!.drawImage(bmp, 0, 0, w, h); bmp.close();
          const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
          c.width = c.height = 0;
          done(out ? URL.createObjectURL(out) : url);
        } catch { done(url); }
      });
    });
    shrunk.set(key, p);
  }
  return p;
}
export function useSmall(url: string, maxW: number | 0) {
  const [src, setSrc] = useState<string | null>(maxW ? null : url);
  useEffect(() => {
    if (!maxW) { setSrc(url); return; }
    let on = true; setSrc(null);
    shrink(url, maxW).then((u) => on && setSrc(u));
    return () => { on = false; };
  }, [url, maxW]);
  return src;
}
