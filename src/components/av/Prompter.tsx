"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { matchVoice, parseScript, remoteChannel, savePrefs, type PrompterPrefs } from "@/lib/prompter";

type Props = {
  title: string;
  text: string;
  contentId?: string | null;
  prefs: PrompterPrefs;
  setPrefs: (p: PrompterPrefs) => void;
  onClose: () => void;
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Tela do teleprompter: ocupa a tela inteira, pensada primeiro para o celular */
export default function Prompter({ title, text, contentId, prefs, setPrefs, onClose }: Props) {
  const { blocks, words } = useMemo(() => parseScript(text), [text]);
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [ui, setUi] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0); // palavra atual (modo voz)
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [takes, setTakes] = useState<{ n: number; rating: string; seconds: number }[]>([]);

  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const target = useRef<number | null>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const state = useRef({ playing: false, prefs, elapsed: 0, cur: 0 });
  state.current.playing = playing; state.current.prefs = prefs; state.current.cur = cur;
  const chan = useRef<any>(null);
  const hideT = useRef<any>(null);

  // tamanho de fonte: 0 = automático (menor no celular)
  const [vw, setVw] = useState(1024);
  useEffect(() => { const f = () => setVw(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const font = prefs.font || (vw < 640 ? 30 : vw < 1100 ? 40 : 52);
  const upd = useCallback((p: Partial<PrompterPrefs>) => { const n = { ...state.current.prefs, ...p }; setPrefs(n); savePrefs(n); }, [setPrefs]);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 1600); };
  const lineY = () => (box.current?.clientHeight || 600) * 0.33;
  const maxPos = () => Math.max(0, (inner.current?.scrollHeight || 0) - (box.current?.clientHeight || 600) * 0.7 - lineY() - font * 0.5);

  // laço de rolagem
  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const s = state.current;
      if (s.playing) {
        s.elapsed += dt;
        if (s.prefs.voice) { /* a voz define o alvo */ }
        else pos.current += s.prefs.speed * font * 0.15 * dt;
      }
      if (target.current != null) {
        const d = target.current - pos.current;
        pos.current += d * Math.min(1, dt * 6);
        if (Math.abs(d) < 0.5) target.current = null;
      }
      const mx = maxPos();
      if (pos.current > mx) { pos.current = mx; if (s.playing && !s.prefs.voice) setPlaying(false); }
      if (pos.current < 0) pos.current = 0;
      if (inner.current) inner.current.style.transform = `translateY(${-pos.current}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const iv = setInterval(() => { setElapsed(state.current.elapsed); const mx = maxPos(); setProgress(mx ? pos.current / mx : 0); }, 250);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); };
  }, [font]); // eslint-disable-line

  // tela sempre acesa e tela cheia enquanto o teleprompter está aberto
  useEffect(() => {
    let lock: any = null;
    const ask = async () => { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch {} };
    ask();
    const vis = () => document.visibilityState === "visible" && ask();
    document.addEventListener("visibilitychange", vis);
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("visibilitychange", vis);
      try { lock?.release(); } catch {}
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
      document.body.style.overflow = "";
    };
  }, []);

  // esconde os controles enquanto roda
  const poke = useCallback(() => {
    setUi(true);
    clearTimeout(hideT.current);
    hideT.current = setTimeout(() => state.current.playing && setUi(false), 2500);
  }, []);
  useEffect(() => { if (playing) poke(); else { setUi(true); clearTimeout(hideT.current); } }, [playing, poke]);

  const play = useCallback(() => {
    if (state.current.playing) { setPlaying(false); return; }
    if (count != null) return;
    if (state.current.prefs.countdown && pos.current < 5) {
      let n = 3; setCount(n);
      const iv = setInterval(() => { n--; if (n <= 0) { clearInterval(iv); setCount(null); setPlaying(true); } else setCount(n); }, 1000);
    } else setPlaying(true);
  }, [count]);

  const jump = useCallback((lines: number) => { target.current = Math.max(0, (target.current ?? pos.current) + lines * font * 1.45); }, [font]);
  const restart = useCallback(() => { setPlaying(false); pos.current = 0; target.current = null; state.current.elapsed = 0; setElapsed(0); setCur(0); }, []);
  const speed = useCallback((d: number) => upd({ speed: Math.max(1, Math.min(15, +(state.current.prefs.speed + d).toFixed(1))) }), [upd]);

  // takes: carregam do banco quando o roteiro é do Quadro de produção
  useEffect(() => {
    if (!contentId) return;
    createClient().from("av_takes").select("n,rating,seconds").eq("content_id", contentId).order("n").then(({ data }) => setTakes((data as any) || []));
  }, [contentId]);
  const take = useCallback(async (rating: "bom" | "ruim") => {
    const n = (takes[takes.length - 1]?.n || 0) + 1;
    const seconds = Math.round(state.current.elapsed);
    setTakes((t) => [...t, { n, rating, seconds }]);
    flash(rating === "bom" ? `★ Take ${n} marcado como bom` : `Take ${n} marcado como ruim`);
    if (contentId) await createClient().from("av_takes").insert({ content_id: contentId, n, rating, seconds });
    restart();
  }, [takes, contentId, restart]);

  // rolagem pela voz (Chrome/Edge/Android; no Safari pode não funcionar)
  useEffect(() => {
    if (!prefs.voice) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceErr("Seu navegador não reconhece voz. Use o Chrome ou deixe a rolagem por velocidade."); upd({ voice: false }); return; }
    setVoiceErr(null);
    const r = new SR();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
    let alive = true;
    r.onresult = (e: any) => {
      if (!state.current.playing) return;
      let txt = "";
      for (let k = Math.max(0, e.results.length - 2); k < e.results.length; k++) txt += " " + e.results[k][0].transcript;
      const at = matchVoice(words, txt.trim().split(/\s+/), state.current.cur);
      if (at != null && at >= state.current.cur - 2) {
        setCur(at);
        const el = spans.current[Math.min(at, words.length - 1)];
        if (el) target.current = Math.max(0, el.offsetTop - lineY());
      }
    };
    r.onerror = (e: any) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { setVoiceErr("Permita o microfone para rolar pela voz."); alive = false; upd({ voice: false }); } };
    r.onend = () => { if (alive) try { r.start(); } catch {} };
    try { r.start(); } catch {}
    return () => { alive = false; try { r.stop(); } catch {} };
  }, [prefs.voice, words, font]); // eslint-disable-line

  // controle remoto pelo celular (mesma conta)
  const cmdRef = useRef<(a: any) => void>(() => {});
  cmdRef.current = (p: any) => {
    switch (p?.a) {
      case "toggle": play(); break;
      case "faster": speed(0.5); break;
      case "slower": speed(-0.5); break;
      case "back": jump(-3); break;
      case "fwd": jump(3); break;
      case "restart": restart(); break;
      case "take": take(p.rating === "ruim" ? "ruim" : "bom"); break;
      case "voice": upd({ voice: !state.current.prefs.voice }); break;
    }
  };
  useEffect(() => {
    const s = createClient();
    let ch: any;
    s.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      ch = s.channel(remoteChannel(data.user.id), { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "cmd" }, ({ payload }: any) => cmdRef.current(payload)).subscribe();
      chan.current = ch;
    });
    return () => { if (ch) s.removeChannel(ch); };
  }, []);
  // envia o estado para o controle
  useEffect(() => {
    const iv = setInterval(() => {
      if (!chan.current) return;
      const ly = pos.current + lineY();
      let i = spans.current.findIndex((el) => el && el.offsetTop + font > ly);
      if (i < 0) i = 0;
      const line = words.length ? spans.current.slice(i, i + 12).map((el) => el?.textContent).filter(Boolean).join(" ") : "";
      chan.current.send({ type: "broadcast", event: "state", payload: { title, playing: state.current.playing, speed: state.current.prefs.speed, voice: state.current.prefs.voice, progress: maxPos() ? pos.current / maxPos() : 0, elapsed: state.current.elapsed, line, takes: takes.length } });
    }, 700);
    return () => clearInterval(iv);
  }, [title, words, font, takes.length]); // eslint-disable-line

  // teclado
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === " ") { e.preventDefault(); play(); }
      else if (k === "arrowup") { e.preventDefault(); speed(0.5); }
      else if (k === "arrowdown") { e.preventDefault(); speed(-0.5); }
      else if (k === "arrowleft") jump(-3);
      else if (k === "arrowright") jump(3);
      else if (k === "b") take("bom");
      else if (k === "r") take("ruim");
      else if (k === "m") upd({ mirror: !state.current.prefs.mirror });
      else if (k === "escape") onClose();
      poke();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [play, speed, jump, take, upd, onClose, poke]);

  // toque: arrastar rola na mão, tocar pausa/continua
  const drag = useRef<{ y: number; p: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = { y: e.clientY, p: pos.current, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 6) d.moved = true;
    if (d.moved) { target.current = null; pos.current = d.p - dy; }
  };
  const onUp = () => { const d = drag.current; drag.current = null; if (d && !d.moved) { if (ui || !playing) play(); else poke(); } };
  const onWheel = (e: React.WheelEvent) => { target.current = null; pos.current += e.deltaY * 0.6; poke(); };

  const hi = prefs.voice ? cur : -1;

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white select-none" style={{ height: "100dvh" }}>
      {/* texto */}
      <div ref={box} className="absolute inset-0 overflow-hidden touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)} onWheel={onWheel}>
        <div style={{ transform: prefs.mirror ? "scaleX(-1)" : undefined, height: "100%" }}>
          <div ref={inner} className="will-change-transform mx-auto px-6 md:px-16" style={{ maxWidth: 1100, paddingTop: "33dvh", paddingBottom: "70dvh", fontSize: font, lineHeight: 1.45, fontWeight: 600, textAlign: prefs.align, letterSpacing: "-0.01em" }}>
            {blocks.map((b, bi) => (
              <p key={bi} style={{ marginBottom: font * 0.95 }}>
                {b.label && !prefs.hideCues && <span className="block font-mono uppercase tracking-widest" style={{ fontSize: Math.max(11, font * 0.32), lineHeight: 1, color: "var(--color-mint)", marginTop: -font * 0.5, height: font * 0.5 }}>{b.label}</span>}
                {b.toks.map((t, ti) => {
                  if (t.cue) return prefs.hideCues ? null : <span key={ti} style={{ color: "#8a8f94", fontSize: "0.7em" }}>{t.t} </span>;
                  const said = t.i != null && hi >= 0 && t.i < hi;
                  return (
                    <span key={ti} ref={t.i != null ? (el) => { spans.current[t.i!] = el; } : undefined} style={{ color: said ? "#5d6166" : t.i === hi ? "var(--color-mint)" : undefined }}>{t.t} </span>
                  );
                })}
              </p>
            ))}
            {!blocks.length && <p className="text-center" style={{ color: "#8a8f94" }}>Este conteúdo ainda não tem roteiro.</p>}
          </div>
        </div>
      </div>

      {/* faixa de leitura */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black via-black/70 to-transparent" style={{ height: "24dvh" }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent" style={{ height: "30dvh" }} />
      <div className="pointer-events-none absolute left-0 right-0" style={{ top: "33dvh", height: font * 1.45 }}>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: "16px solid var(--color-mint)" }} />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderRight: "16px solid var(--color-mint)" }} />
      </div>

      {/* contagem */}
      {count != null && <div className="absolute inset-0 grid place-items-center pointer-events-none"><span className="font-display font-extrabold text-mint" style={{ fontSize: 160 }}>{count}</span></div>}
      {toast && <div className="absolute left-1/2 -translate-x-1/2 bottom-40 bg-panel border border-line rounded-xl px-4 py-2 text-sm">{toast}</div>}

      {/* barra de cima */}
      <div className={`absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 transition-opacity ${ui ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button onClick={onClose} className="btn btn-ghost btn-sm bg-black/60">Fechar</button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="font-mono text-[11px] text-fog">{playing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger mr-1.5 align-middle" />}{fmt(elapsed)} · {Math.round(progress * 100)}%{prefs.voice ? " · seguindo a voz" : ""}</p>
        </div>
        <span className="font-mono text-[11px] text-fog w-14 text-right">{takes.length ? `take ${takes.length + 1}` : "take 1"}</span>
      </div>

      {/* controles */}
      <div className={`absolute inset-x-0 bottom-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-opacity ${ui ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {voiceErr && <p className="text-center text-xs text-danger mb-2">{voiceErr}</p>}
        <div className="mx-auto max-w-2xl bg-panel/95 border border-line rounded-2xl p-3 backdrop-blur">
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => jump(-3)} className="w-11 h-11 rounded-full border border-line grid place-items-center text-sm" aria-label="Voltar">↺</button>
            <button onClick={() => speed(-0.5)} className="w-11 h-11 rounded-full border border-line grid place-items-center text-lg" aria-label="Mais lento" disabled={prefs.voice}>−</button>
            <button onClick={play} className="w-16 h-16 rounded-full bg-mint text-[var(--color-on-mint,#06140e)] grid place-items-center" aria-label={playing ? "Pausar" : "Começar"}>
              {playing ? <I.pause className="w-6 h-6" /> : <I.play className="w-6 h-6 ml-0.5" />}
            </button>
            <button onClick={() => speed(0.5)} className="w-11 h-11 rounded-full border border-line grid place-items-center text-lg" aria-label="Mais rápido" disabled={prefs.voice}>+</button>
            <button onClick={restart} className="w-11 h-11 rounded-full border border-line grid place-items-center text-xs" aria-label="Do começo">⏮</button>
          </div>
          <p className="text-center font-mono text-[11px] text-fog mt-2">{prefs.voice ? "rolando pela voz" : `velocidade ${prefs.speed.toFixed(1)}`} · letra {font}px</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            <button onClick={() => upd({ font: Math.max(18, font - 4) })} className="chip px-3 py-1.5">A−</button>
            <button onClick={() => upd({ font: Math.min(120, font + 4) })} className="chip px-3 py-1.5">A+</button>
            <button onClick={() => upd({ voice: !prefs.voice })} className={`chip px-3 py-1.5 ${prefs.voice ? "chip-mint" : ""}`}><I.mic className="w-3.5 h-3.5" />Voz</button>
            <button onClick={() => upd({ mirror: !prefs.mirror })} className={`chip px-3 py-1.5 ${prefs.mirror ? "chip-mint" : ""}`}>Espelhar</button>
            <button onClick={() => upd({ hideCues: !prefs.hideCues })} className={`chip px-3 py-1.5 ${prefs.hideCues ? "chip-mint" : ""}`}>Sem marcações</button>
            <button onClick={() => take("ruim")} className="chip px-3 py-1.5" style={{ color: "var(--color-danger)" }}>Take ruim</button>
            <button onClick={() => take("bom")} className="chip chip-mint px-3 py-1.5">★ Take bom</button>
          </div>
          <p className="hidden md:block text-center text-[11px] text-fog mt-2">Espaço pausa · ↑↓ velocidade · ←→ volta ou avança · B take bom · R take ruim · M espelha · Esc fecha</p>
        </div>
      </div>
    </div>
  );
}
