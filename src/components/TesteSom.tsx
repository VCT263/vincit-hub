"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Teste de som antes da entrevista: toca a voz da entrevistadora e mede o microfone
 * (barra de volume). Tudo no navegador, sem custo. Funciona no celular.
 */
export default function TesteSom({ voz }: { voz: boolean }) {
  const [alto, setAlto] = useState<"" | "tocando" | "ok" | "sem">("");
  const [mic, setMic] = useState<"" | "ouvindo" | "ok" | "baixo" | "negado" | "sem">("");
  const [nivel, setNivel] = useState(0);
  const parar = useRef<() => void>(() => {});
  useEffect(() => () => parar.current(), []);

  function testarVoz() {
    if (typeof speechSynthesis === "undefined") { setAlto("sem"); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Teste de som. Se você me ouviu, está tudo certo.");
      u.lang = "pt-BR";
      const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("pt"));
      if (v) u.voice = v;
      u.onstart = () => setAlto("tocando");
      u.onend = () => setAlto("ok");
      u.onerror = () => setAlto("sem");
      setAlto("tocando");
      speechSynthesis.speak(u);
    } catch { setAlto("sem"); }
  }

  async function testarMic() {
    parar.current();
    if (!navigator.mediaDevices?.getUserMedia) { setMic("sem"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let max = 0, raf = 0;
      const fim = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {}); };
      parar.current = fim;
      setMic("ouvindo"); setNivel(0);
      const t0 = performance.now();
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let s = 0; for (const b of buf) { const x = (b - 128) / 128; s += x * x; }
        const n = Math.min(1, Math.sqrt(s / buf.length) * 4);
        max = Math.max(max, n); setNivel(n);
        if (performance.now() - t0 < 5000) raf = requestAnimationFrame(loop);
        else { fim(); setNivel(0); setMic(max > 0.12 ? "ok" : "baixo"); }
      };
      loop();
    } catch (e: any) { setMic(e?.name === "NotAllowedError" ? "negado" : "sem"); }
  }

  const ok = alto === "ok" && mic === "ok";
  return (
    <div className="w-full max-w-md rounded-xl border border-line p-4 text-left space-y-3">
      <p className="font-semibold text-sm">Teste de som {ok && <span className="text-mint">· tudo certo</span>}</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={testarVoz} disabled={!voz || alto === "tocando"} className="btn btn-ghost btn-sm shrink-0">Ouvir a voz</button>
        <p className="text-xs text-fog">
          {!voz ? "A voz está desligada (botão no topo)." : alto === "tocando" ? "Tocando… aumente o volume se não ouvir." : alto === "ok" ? "Voz funcionando." : alto === "sem" ? "Este navegador não tem voz. As perguntas aparecem escritas." : "Confere se o alto-falante está ligado."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={testarMic} disabled={mic === "ouvindo"} className="btn btn-ghost btn-sm shrink-0">Testar microfone</button>
        <div className="flex-1 min-w-0">
          {mic === "ouvindo" && <div className="h-2 bg-panel2 rounded-full overflow-hidden" aria-label="Volume do microfone"><div className="h-full bg-mint transition-[width] duration-75" style={{ width: `${Math.round(nivel * 100)}%` }} /></div>}
          <p className="text-xs text-fog mt-1">
            {mic === "ouvindo" ? "Fale alguma coisa por 5 segundos…" : mic === "ok" ? "Microfone captando bem." : mic === "baixo" ? "Captou pouco som. Chegue mais perto ou confira o microfone escolhido." : mic === "negado" ? "O microfone foi bloqueado. Libere nas permissões do navegador (cadeado ao lado do endereço)." : mic === "sem" ? "Não achei microfone. Dá para responder digitando." : "Mede se o microfone está captando sua voz."}
          </p>
        </div>
      </div>
    </div>
  );
}
