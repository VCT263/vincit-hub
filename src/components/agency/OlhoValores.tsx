"use client";
import { useEffect, useState } from "react";

/** Olho do Gestor: esconde os valores em dinheiro (borra números) para abrir o HUB perto de outras pessoas.
 *  Lembra a escolha neste aparelho. O CSS está em globals.css (html.ocultar-valores). */
export default function OlhoValores() {
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    let v = false;
    try { v = localStorage.getItem("gestor:ocultar") === "1"; } catch {}
    setOculto(v); document.documentElement.classList.toggle("ocultar-valores", v);
    return () => document.documentElement.classList.remove("ocultar-valores");
  }, []);
  function trocar() {
    const v = !oculto; setOculto(v);
    document.documentElement.classList.toggle("ocultar-valores", v);
    try { localStorage.setItem("gestor:ocultar", v ? "1" : "0"); } catch {}
  }
  return (
    <button onClick={trocar} title={oculto ? "Mostrar valores" : "Ocultar valores"} aria-label={oculto ? "Mostrar valores" : "Ocultar valores"} aria-pressed={oculto}
      className="fixed z-30 right-3 bottom-20 lg:bottom-6 lg:right-6 w-11 h-11 rounded-full bg-panel border border-line grid place-items-center text-fog hover:text-mint hover:border-mint shadow-lg">
      {oculto ? (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}
