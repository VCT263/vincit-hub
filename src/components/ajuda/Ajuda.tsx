"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AJUDA, ajudaDaTela, type Dica } from "@/lib/ajuda";

/**
 * Ícone "?" pequeno que abre uma explicação curta.
 * - `id`: dica de AJUDA (partes da tela)
 * - `tela`: dica da página aberta (pela rota)
 * - `dica`: texto direto
 * No celular abre como folha de baixo; no computador, ao lado do ícone.
 */
export default function Ajuda({ id, tela, dica, className = "" }: { id?: string; tela?: boolean; dica?: Dica; className?: string }) {
  const path = usePathname();
  const d = dica || (id ? AJUDA[id] : null) || (tela ? ajudaDaTela(path) : null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      if (window.innerWidth < 640) return setPos(null); // celular: folha de baixo
      const w = 300;
      const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 12));
      const below = r.bottom + 8;
      setPos({ top: below + 220 > window.innerHeight && r.top > 240 ? r.top - 8 : below, left });
    };
    place();
    const close = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!d) return null;
  const up = pos && btn.current && pos.top < btn.current.getBoundingClientRect().top;

  return (
    <>
      <button ref={btn} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        aria-label={`Ajuda: ${d.titulo}`} aria-expanded={open}
        className={`print:hidden inline-grid place-items-center w-[18px] h-[18px] rounded-full border border-line text-[11px] font-bold leading-none text-fog hover:text-mint hover:border-mint transition-colors align-middle shrink-0 ${open ? "text-mint border-mint" : ""} ${className}`}>
        ?
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="sm:hidden fixed inset-0 z-[90] bg-black/50" onClick={() => setOpen(false)} />
          <div ref={box} role="dialog" aria-label={d.titulo}
            style={pos ? { top: pos.top, left: pos.left, transform: up ? "translateY(-100%)" : undefined } : undefined}
            className="fixed z-[91] bottom-0 inset-x-0 sm:bottom-auto sm:inset-x-auto sm:w-[300px] bg-panel border border-line sm:rounded-2xl rounded-t-2xl p-4 pb-6 sm:pb-4 shadow-2xl text-left font-sans normal-case tracking-normal">
            <div className="flex items-start gap-2">
              <p className="font-display font-bold text-[15px] text-paper flex-1">{d.titulo}</p>
              <button type="button" onClick={() => setOpen(false)} className="text-fog hover:text-paper text-lg leading-none -mt-0.5" aria-label="Fechar">×</button>
            </div>
            <p className="text-sm text-fog mt-1.5 font-normal">{d.texto}</p>
            {d.passos && (
              <ol className="mt-2.5 space-y-1.5 text-[13px] text-paper/90 font-normal">
                {d.passos.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="w-[18px] h-[18px] shrink-0 rounded-full bg-mint/15 text-mint text-[10px] font-bold grid place-items-center mt-px">{i + 1}</span><span>{p}</span></li>
                ))}
              </ol>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
