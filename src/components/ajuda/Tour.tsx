"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FLUXO, TOUR, TOUR_KEY } from "@/lib/ajuda";

/* telas sem login (links públicos) e de entrada: o tour não abre nelas */
const FORA = ["/login", "/aguardando", "/oauth", "/privacidade", "/auth", "/p/", "/r/", "/b/", "/m/", "/c/", "/g/", "/audiovisual/teleprompter/controle"];

/** pede o tour de novo (botão em Minha conta) */
export function refazerTour() {
  try { localStorage.removeItem(TOUR_KEY); } catch {}
  window.location.href = "/?tour=1";
}

function visivel(sel: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${sel}"]`));
  return all.find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) || null;
}

/** Tour em pop-ups no primeiro login. Fica marcado no usuário (vale em todos os aparelhos). */
export default function Tour() {
  const path = usePathname();
  const router = useRouter();
  const [ativo, setAtivo] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [w, setW] = useState(1024);

  useEffect(() => {
    if (FORA.some((f) => path.startsWith(f))) return;
    const pediu = new URLSearchParams(window.location.search).get("tour") === "1";
    if (pediu) {
      window.history.replaceState(null, "", window.location.pathname);
      setI(0); setAtivo(true); return;
    }
    try { if (localStorage.getItem(TOUR_KEY)) return; } catch {}
    createClient().auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      if (u.user_metadata?.tour_done) { try { localStorage.setItem(TOUR_KEY, "1"); } catch {} return; }
      setI(0); setAtivo(true);
    });
  }, [path]);

  // sem acesso a um hub, o passo dele sai do tour (só quando a barra de hubs está na tela)
  const temBarra = ativo && typeof document !== "undefined" && !!document.querySelector('[data-tour^="hub-"]');
  const lista = TOUR.filter((p) => !temBarra || !p.alvo?.startsWith("hub-") || !!document.querySelector(`[data-tour="${p.alvo}"]`));
  const passo = lista[Math.min(i, lista.length - 1)];
  const medir = useCallback(() => {
    setW(window.innerWidth);
    const el = ativo && passo?.alvo ? visivel(passo.alvo) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [ativo, passo]);

  useLayoutEffect(() => {
    if (!ativo) return;
    const el = passo?.alvo ? visivel(passo.alvo) : null;
    el?.scrollIntoView({ block: "nearest", inline: "center" });
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => { window.removeEventListener("resize", medir); window.removeEventListener("scroll", medir, true); };
  }, [ativo, passo, medir]);

  useEffect(() => {
    if (!ativo) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, lista.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  function fechar(destino?: string) {
    setAtivo(false);
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    createClient().auth.updateUser({ data: { tour_done: new Date().toISOString() } }).catch(() => {});
    if (destino) router.push(destino);
  }

  if (!ativo || !passo) return null;
  const celular = w < 640;
  const pad = 6;
  // posição do cartão: no celular sempre embaixo; no computador, abaixo do destaque (ou no centro)
  let estilo: React.CSSProperties | undefined;
  if (!celular && rect) {
    const cw = 360;
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - cw / 2, w - cw - 16));
    estilo = { top: rect.bottom + pad + 12, left, width: cw };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={passo.titulo}>
      {rect ? (
        <div className="absolute rounded-xl ring-2 ring-mint transition-all duration-300 pointer-events-none"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,.68)" }} />
      ) : <div className="absolute inset-0 bg-black/70" />}

      <div style={estilo}
        className={`absolute bg-panel border border-line shadow-2xl p-5 ${celular ? "inset-x-0 bottom-0 rounded-t-2xl pb-7" : rect ? "rounded-2xl" : "rounded-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-32px)]"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-mint tracking-widest">{i + 1} / {lista.length}</p>
          <button type="button" onClick={() => fechar()} className="text-xs text-fog hover:text-paper">Pular tour</button>
        </div>
        <p className="font-display font-extrabold text-xl mt-2">{passo.titulo}</p>
        <p className="text-sm text-fog mt-1.5">{passo.texto}</p>
        {passo.fluxo && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {FLUXO.map((f, k) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="chip text-[11px] px-2 py-1">{f}</span>
                {k < FLUXO.length - 1 && <span className="text-fog text-xs">›</span>}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-1 mt-4">
          {lista.map((_, k) => <span key={k} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-mint" : "bg-line"}`} />)}
        </div>
        <div className="flex items-center gap-2 mt-4">
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="btn btn-ghost btn-sm">Voltar</button>}
          <span className="flex-1" />
          {passo.fim ? (
            <>
              <button type="button" onClick={() => fechar()} className="btn btn-ghost btn-sm">Concluir</button>
              <button type="button" onClick={() => fechar("/conta/configurar")} className="btn btn-mint btn-sm">Abrir o guia</button>
            </>
          ) : (
            <button type="button" onClick={() => setI(i + 1)} className="btn btn-mint btn-sm">{i === 0 ? "Começar" : "Próximo"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
