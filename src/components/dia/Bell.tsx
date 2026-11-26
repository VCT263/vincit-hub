"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Central from "@/components/avisos/Central";
import { ativo, meta } from "@/components/avisos/meta";

/** Sino de avisos na barra do topo: contador e a central de avisos em painel. */
export default function Bell() {
  const [n, setN] = useState<{ total: number; urgente: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("notifications").select("id,kind,title,source_type,created_at,read_at,snoozed_until").is("read_at", null).limit(100);
    if (error) return setN(null);
    const l = (data || []).filter((x: any) => ativo(x));
    setN({ total: l.length, urgente: l.some((x: any) => meta(x).tom === "danger") });
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("vh:avisos", load);
    window.addEventListener("focus", load);
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { clearInterval(t); window.removeEventListener("vh:avisos", load); window.removeEventListener("focus", load); document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [load]);
  if (n === null) return null;

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`btn btn-ghost btn-sm relative ${open ? "border-mint text-mint" : ""}`} aria-expanded={open} aria-label={`Avisos${n.total ? `, ${n.total} não lidos` : ""}`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {n.total > 0 && <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center ${n.urgente ? "bg-danger text-white" : "bg-mint text-[var(--color-on-mint,#06140e)]"}`}>{n.total > 9 ? "9+" : n.total}</span>}
      </button>
      {open && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-[4.25rem] sm:top-auto sm:right-0 sm:mt-2 sm:w-[420px] card shadow-2xl z-40 overflow-hidden">
          <Central modo="pop" aoNavegar={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
