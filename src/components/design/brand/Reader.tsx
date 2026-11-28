"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Frame, type Ctx, type SlideDef } from "./Presentation";
import { useLite, useNear } from "./lazy";

/* Leitor do manual no link do cliente, no jeito de um leitor de PDF: uma página, duas lado a lado
   ou grade de miniaturas; zoom; ir direto para uma página. Celular primeiro: barra fixa no alto,
   botões grandes, e as páginas continuam sendo montadas só perto da tela (memória do iPhone). */

export type ReaderMode = "uma" | "duas" | "grade";
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const KEY = "hub-leitor";

function load(): { mode: ReaderMode; z: number; cols: number } | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v === "object" ? v : null; } catch { return null; }
}
function save(v: { mode: ReaderMode; z: number; cols: number }) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sem armazenamento: tudo bem */ } }

/** uma página do leitor: escala o slide para a largura que recebeu */
function Page({ x, s, n, total, margin, onOpen, current, label }: { x: Ctx; s: SlideDef; n: number; total: number; margin: string; onOpen?: () => void; current?: boolean; label?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const [k, setK] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => setK(el.clientWidth / x.W);
    const ro = new ResizeObserver(fit); ro.observe(el); fit();
    return () => ro.disconnect();
  }, [x.W]);
  const near = useNear(ref, margin);
  return (
    <div className="min-w-0">
      <div ref={ref} onClick={onOpen} className={`w-full relative overflow-hidden rounded-md bg-panel2 shadow-xl ${onOpen ? "cursor-pointer" : ""} ${current ? "ring-2 ring-mint" : ""}`} style={{ height: k ? x.H * k : undefined, aspectRatio: k ? undefined : `${x.W} / ${x.H}` }}>
        {near && k > 0 && <div style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: x.W, height: x.H, pointerEvents: "none" }}>
          <Frame x={x} s={s} n={n} total={total}>{s.body(x)}</Frame>
        </div>}
      </div>
      {label && <p className={`text-center font-mono text-[11px] mt-1.5 ${current ? "text-mint" : "text-fog"}`}>{n}</p>}
    </div>
  );
}

const I = {
  uma: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="14" height="10" rx="1.5" /></svg>,
  duas: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1.5" y="6" width="8" height="8" rx="1.2" /><rect x="10.5" y="6" width="8" height="8" rx="1.2" /></svg>,
  grade: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="2.5" width="6" height="6" rx="1" /><rect x="11.5" y="2.5" width="6" height="6" rx="1" /><rect x="2.5" y="11.5" width="6" height="6" rx="1" /><rect x="11.5" y="11.5" width="6" height="6" rx="1" /></svg>,
  cheia: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /></svg>,
};

function Btn({ on, title, onClick, disabled, children, wide }: { on?: boolean; title: string; onClick: () => void; disabled?: boolean; children: ReactNode; wide?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={on} onClick={onClick} disabled={disabled}
      className={`h-9 ${wide ? "px-2.5" : "w-[30px] sm:w-9"} grid place-items-center rounded-lg text-sm font-semibold transition disabled:opacity-35 ${on ? "bg-mint text-[#06140e]" : "text-paper hover:bg-white/10 active:bg-white/15"}`}>
      {children}
    </button>
  );
}

export function Reader({ x, slides, onPresent, active = true }: { x: Ctx; slides: SlideDef[]; onPresent: (i: number) => void; active?: boolean }) {
  const lite = useLite();
  const total = slides.length;
  const [mode, setMode] = useState<ReaderMode>("uma");
  const [z, setZ] = useState(2); // índice em ZOOMS (100%)
  const [cols, setCols] = useState(0); // 0 = automático (2 no celular, 4 no computador)
  const [cur, setCur] = useState(0);
  const [typed, setTyped] = useState<string | null>(null);
  const pages = useRef<(HTMLDivElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const curRef = useRef(0); curRef.current = cur;
  const ready = useRef(false);
  const sec = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false); // a barra só aparece enquanto as páginas estão na tela
  useEffect(() => {
    const el = sec.current; if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  const lock = useRef(0); // enquanto a rolagem pedida anda, a página atual não muda

  useEffect(() => {
    const v = load();
    if (v) { if (["uma", "duas", "grade"].includes(v.mode)) setMode(v.mode); if (v.z >= 0 && v.z < ZOOMS.length) setZ(v.z); if (v.cols >= 0 && v.cols <= 8) setCols(v.cols); }
    ready.current = true;
  }, []);
  useEffect(() => { if (ready.current) save({ mode, z, cols }); }, [mode, z, cols]);

  const [autoCols, setAutoCols] = useState(2);
  useEffect(() => {
    const f = () => setAutoCols(window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4);
    f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f);
  }, []);
  const nCols = cols || autoCols;
  const zoom = mode === "grade" ? 1 : ZOOMS[z];

  /** leva a página i para logo abaixo da barra */
  const goTo = useCallback((i: number, smooth = true) => {
    const t = Math.max(0, Math.min(total - 1, i));
    const el = pages.current[t]; if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 12;
    lock.current = Date.now() + (smooth ? 900 : 150);
    window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    setCur(t);
  }, [total]);

  // página atual = a primeira que ainda aparece abaixo da barra
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      if (Date.now() < lock.current) return;
      raf = requestAnimationFrame(() => {
        const line = 40;
        let best = 0;
        for (let i = 0; i < pages.current.length; i++) {
          const el = pages.current[i]; if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.bottom > line) { best = i; break; }
          best = i;
        }
        // na grade e nas duas páginas, a linha inteira conta como uma: se a página escolhida
        // (ou a de antes) está na mesma linha, ela continua sendo a atual
        const c = pages.current[curRef.current], b = pages.current[best];
        if (c && b && c !== b && Math.abs(c.getBoundingClientRect().top - b.getBoundingClientRect().top) < 4) return;
        setCur(best);
      });
    };
    window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on); on();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [mode, total]);

  // ao trocar modo ou zoom, mantém a mesma página na tela
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const i = curRef.current;
    requestAnimationFrame(() => goTo(i, false));
  }, [mode, z, cols, goTo]);

  const step = mode === "duas" ? 2 : mode === "grade" ? nCols : 1;
  const prev = () => goTo(mode === "uma" ? cur - 1 : Math.floor(cur / step) * step - step);
  const next = () => goTo(mode === "uma" ? cur + 1 : Math.floor(cur / step) * step + step);
  const zoomIn = () => { if (mode === "grade") setCols(Math.max(1, nCols - 1)); else setZ((v) => Math.min(ZOOMS.length - 1, v + 1)); };
  const zoomOut = () => { if (mode === "grade") setCols(Math.min(8, nCols + 1)); else setZ((v) => Math.max(0, v - 1)); };
  const fit = () => { if (mode === "grade") setCols(0); else setZ(2); };

  // teclado (computador): setas passam página, + e − dão zoom
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0") fit();
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const margin = lite ? (mode === "grade" ? "15% 0px" : "40% 0px") : (mode === "grade" ? "50% 0px" : "100% 0px");
  const setRef = (i: number) => (el: HTMLDivElement | null) => { pages.current[i] = el; };
  pages.current.length = total;

  const rows: number[][] = [];
  if (mode === "duas") for (let i = 0; i < total; i += 2) rows.push(i + 1 < total ? [i, i + 1] : [i]);

  const zoomLabel = mode === "grade" ? `${nCols} por linha` : `${Math.round(zoom * 100)}%`;
  const jump = () => { const n = parseInt(typed || "", 10); setTyped(null); if (n >= 1 && n <= total) goTo(n - 1); };

  return (
    <section ref={sec} className="reader print:hidden pb-28">
      {/* barra fixa embaixo, ao alcance do polegar no celular */}
      {/* solta das bordas: os cantos arredondados do celular não cortam os botões */}
      <div ref={bar} className={`fixed z-30 left-1/2 w-[calc(100%-20px)] sm:w-[calc(100%-32px)] max-w-3xl rounded-2xl bg-ink/90 backdrop-blur border border-line shadow-2xl transition-[transform,opacity] duration-200 ${shown ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)", transform: `translateX(-50%) translateY(${shown ? "0" : "calc(100% + 30px)"})` }}>
        <div className="px-1 sm:px-3 py-1 sm:py-1.5 flex flex-wrap items-center justify-between gap-x-1 sm:gap-x-2 gap-y-1">
          <div className="flex items-center sm:gap-0.5 rounded-xl bg-panel p-0.5" role="group" aria-label="Como ver as páginas">
            <Btn on={mode === "uma"} title="Uma página" onClick={() => setMode("uma")}>{I.uma}</Btn>
            <Btn on={mode === "duas"} title="Duas páginas lado a lado" onClick={() => setMode("duas")}>{I.duas}</Btn>
            <Btn on={mode === "grade"} title="Todas em miniatura" onClick={() => setMode("grade")}>{I.grade}</Btn>
          </div>
          <div className="flex items-center sm:gap-0.5 rounded-xl bg-panel p-0.5" role="group" aria-label="Zoom">
            <Btn title={mode === "grade" ? "Miniaturas menores" : "Diminuir zoom"} onClick={zoomOut} disabled={mode === "grade" ? nCols >= 8 : z === 0}>−</Btn>
            <button type="button" onClick={fit} title="Ajustar à tela" className="h-9 min-w-[38px] sm:min-w-[64px] px-0.5 sm:px-1 rounded-lg font-mono text-[11px] sm:text-[12px] text-fog hover:text-paper hover:bg-white/10">{zoomLabel}</button>
            <Btn title={mode === "grade" ? "Miniaturas maiores" : "Aumentar zoom"} onClick={zoomIn} disabled={mode === "grade" ? nCols <= 1 : z === ZOOMS.length - 1}>+</Btn>
          </div>
          <div className="flex items-center sm:gap-0.5 rounded-xl bg-panel p-0.5" role="group" aria-label="Páginas">
            <Btn title="Página anterior" onClick={prev} disabled={cur <= 0}>‹</Btn>
            <span className="flex items-center font-mono text-[12px] text-fog px-0.5">
              <input inputMode="numeric" aria-label="Ir para a página" value={typed ?? String(cur + 1)}
                onFocus={(e) => { setTyped(String(cur + 1)); requestAnimationFrame(() => e.target.select()); }}
                onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, 3))}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setTyped(null); (e.target as HTMLInputElement).blur(); } }}
                onBlur={jump}
                className="w-7 sm:w-9 h-8 text-center rounded-md bg-panel2 text-paper text-[13px] outline-none focus:ring-1 focus:ring-mint" />
              <span className="pl-0.5 sm:pl-1 pr-0.5">/{total}</span>
            </span>
            <Btn title="Próxima página" onClick={next} disabled={cur >= total - 1}>›</Btn>
          </div>
          <span className="hidden sm:block"><Btn title="Tela cheia" onClick={() => onPresent(cur)}>{I.cheia}</Btn></span>
        </div>
      </div>

      {/* com zoom acima de 100%, as páginas ficam mais largas que a tela e arrastam para o lado */}
      <div ref={scroller} className="overflow-x-auto overscroll-x-contain">
        <div className="mx-auto px-3 md:px-8 py-6 md:py-8" style={{ width: `calc(min(100%, 72rem) * ${zoom})` }}>
          {mode === "uma" && <div className="space-y-4 md:space-y-6">
            {slides.map((s, i) => <div key={s.key} ref={setRef(i)}><Page x={x} s={s} n={i + 1} total={total} margin={margin} onOpen={zoom <= 1 ? () => onPresent(i) : undefined} /></div>)}
          </div>}
          {mode === "duas" && <div className="space-y-3 md:space-y-6">
            {rows.map((r) => <div key={r[0]} className="grid grid-cols-2 gap-2 md:gap-4 items-start">
              {r.map((i) => <div key={slides[i].key} ref={setRef(i)}><Page x={x} s={slides[i]} n={i + 1} total={total} margin={margin} label onOpen={zoom <= 1 ? () => onPresent(i) : undefined} /></div>)}
            </div>)}
          </div>}
          {mode === "grade" && <div className="grid gap-x-2 gap-y-3 md:gap-x-4 md:gap-y-5" style={{ gridTemplateColumns: `repeat(${nCols}, minmax(0, 1fr))` }}>
            {slides.map((s, i) => <div key={s.key} ref={setRef(i)}><Page x={x} s={s} n={i + 1} total={total} margin={margin} label current={i === cur}
              onOpen={() => { setCur(i); curRef.current = i; setMode("uma"); }} /></div>)}
          </div>}
        </div>
      </div>
    </section>
  );
}
