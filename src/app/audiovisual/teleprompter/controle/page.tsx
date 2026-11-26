"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { remoteChannel } from "@/lib/prompter";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Controle remoto do teleprompter: abre no celular logado na mesma conta */
export default function Controle() {
  const [st, setSt] = useState<any>(null);
  const [ok, setOk] = useState(false);
  const [seen, setSeen] = useState(0);
  const ch = useRef<any>(null);

  useEffect(() => {
    const s = createClient();
    let c: any;
    s.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      c = s.channel(remoteChannel(data.user.id), { config: { broadcast: { self: false } } });
      c.on("broadcast", { event: "state" }, ({ payload }: any) => { setSt(payload); setSeen(Date.now()); })
        .subscribe((status: string) => setOk(status === "SUBSCRIBED"));
      ch.current = c;
    });
    return () => { if (c) s.removeChannel(c); };
  }, []);
  const [, force] = useState(0);
  useEffect(() => { const iv = setInterval(() => force((x) => x + 1), 1000); return () => clearInterval(iv); }, []);
  const live = st && Date.now() - seen < 3000;

  const send = (a: string, extra: any = {}) => {
    try { navigator.vibrate?.(15); } catch {}
    ch.current?.send({ type: "broadcast", event: "cmd", payload: { a, ...extra } });
  };

  return (
    <div className="max-w-md mx-auto">
      <Link href="/audiovisual/teleprompter" className="text-xs text-fog flex items-center gap-1 mb-4"><I.back className="w-3.5 h-3.5" />Teleprompter</Link>
      <p className="font-mono text-[11px] text-mint tracking-widest uppercase">Controle remoto</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1 truncate">{live ? st.title : "Teleprompter"}</h1>
      <p className="text-sm text-fog mt-1">
        {!ok ? "Conectando…" : live ? <><span className="inline-block w-2 h-2 rounded-full bg-mint mr-1.5" />Conectado · {fmt(st.elapsed)} · {Math.round(st.progress * 100)}%</> : "Abra um roteiro no teleprompter do outro aparelho, com a mesma conta."}
      </p>

      <div className="mt-5 rounded-2xl bg-black border border-line p-5 min-h-[150px] text-lg font-semibold leading-relaxed text-center">
        {live ? st.line || "…" : <span className="text-fog text-sm font-normal">O texto que está na linha de leitura aparece aqui.</span>}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button onClick={() => send("back")} className="w-16 h-16 rounded-full border border-line grid place-items-center text-xl active:bg-panel2" aria-label="Voltar">↺</button>
        <button onClick={() => send("toggle")} disabled={!live} className="w-24 h-24 rounded-full bg-mint text-[var(--color-on-mint,#06140e)] grid place-items-center active:scale-95 transition-transform disabled:opacity-40" aria-label="Pausar ou continuar">
          {live && st.playing ? <I.pause className="w-9 h-9" /> : <I.play className="w-9 h-9 ml-1" />}
        </button>
        <button onClick={() => send("fwd")} className="w-16 h-16 rounded-full border border-line grid place-items-center text-xl active:bg-panel2" aria-label="Avançar">↻</button>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-fog mt-7">{live && st.voice ? "Rolando pela voz" : `Velocidade · ${live ? st.speed.toFixed(1) : "–"}`}</p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={() => send("slower")} className="btn btn-ghost py-4">− mais lento</button>
        <button onClick={() => send("faster")} className="btn btn-ghost py-4">+ mais rápido</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={() => send("take", { rating: "ruim" })} className="btn btn-ghost py-4" style={{ color: "var(--color-danger)" }}>Take ruim</button>
        <button onClick={() => send("take", { rating: "bom" })} className="btn btn-mint py-4">★ Take bom</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={() => send("restart")} className="btn btn-ghost">Do começo</button>
        <button onClick={() => send("voice")} className="btn btn-ghost"><I.mic className="w-4 h-4" />{live && st.voice ? "Desligar voz" : "Seguir a voz"}</button>
      </div>
      <p className="text-xs text-fog mt-5 text-center">Marcar um take volta o texto para o começo e conta o próximo take.</p>
    </div>
  );
}
