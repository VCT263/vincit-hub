"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { docDaPrevia, type Comentario, type Tela } from "@/lib/paginas";

/**
 * Prévia interativa de uma tela, como protótipo: celular (390) ou notebook (1280, encolhido para caber).
 * O HTML roda num iframe sandbox só com scripts, sem acesso ao HUB, aos cookies nem ao login.
 */
export default function Previa({ tela, modo, comments, comentar, onTela, onClique, onPin, rolarPara, altura = 760 }: {
  tela: Tela | null; modo: "phone" | "desk"; comments: Comentario[]; comentar: boolean;
  onTela: (slug: string) => void; onClique?: (x: number, y: number) => void; onPin?: (id: string) => void; rolarPara?: number | null; altura?: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [pronto, setPronto] = useState(0);
  const doc = useMemo(() => (tela ? docDaPrevia(tela.html) : ""), [tela]);
  const cbs = useRef({ onTela, onClique, onPin });
  cbs.current = { onTela, onClique, onPin };

  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function on(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow) return;
      const d = e.data || {};
      if (!d.hubPagina) return;
      if (d.pronto) setPronto((n) => n + 1);
      if (d.tela) cbs.current.onTela(String(d.tela));
      if (d.clique) cbs.current.onClique?.(Number(d.clique.x), Number(d.clique.y));
      if (d.pin) cbs.current.onPin?.(String(d.pin));
      if (d.externo && /^https?:\/\//i.test(d.externo)) window.open(d.externo, "_blank", "noopener");
    }
    addEventListener("message", on);
    return () => removeEventListener("message", on);
  }, []);

  // pinos e modo comentário entram na tela depois que ela carrega
  useEffect(() => {
    const win = ref.current?.contentWindow; if (!win) return;
    let i = 0;
    const pins = comments.map((c) => ({ id: c.id, x: c.x, y: c.y, t: c.texto, l: c.de === "claude" ? "C" : String(++i), c: c.de === "claude" ? "#c9b6ff" : c.de === "equipe" ? "#f2c46d" : undefined }));
    win.postMessage({ pins, cm: comentar }, "*");
  }, [comments, comentar, pronto]);

  useEffect(() => { if (rolarPara != null) ref.current?.contentWindow?.postMessage({ rolar: rolarPara }, "*"); }, [rolarPara]);

  const desk = modo === "desk";
  const escala = desk ? Math.min(1, (w - 2) / 1280) : 1;
  const alturaDesk = Math.round(Math.min(altura, 820) / escala);

  return (
    <div ref={box} className="w-full flex justify-center">
      {!tela ? (
        <div className="grid place-items-center text-fog text-sm border border-dashed border-line rounded-2xl w-full" style={{ height: 420 }}>Nenhuma tela ainda.</div>
      ) : desk ? (
        <div className="rounded-xl overflow-hidden bg-black shadow-2xl" style={{ width: 1280 * escala + 2, padding: 1 }}>
          <div className="h-6 bg-[#1a1a1a] flex items-center px-3 gap-1.5"><span className="w-2 h-2 rounded-full bg-[#444]" /><span className="w-2 h-2 rounded-full bg-[#444]" /><span className="w-2 h-2 rounded-full bg-[#444]" /></div>
          <div style={{ width: 1280 * escala, height: alturaDesk * escala, overflow: "hidden" }}>
            <iframe ref={ref} title={`Prévia: ${tela.nome}`} sandbox="allow-scripts" srcDoc={doc}
              style={{ width: 1280, height: alturaDesk, border: 0, transform: `scale(${escala})`, transformOrigin: "0 0", background: "#fff" }} />
          </div>
        </div>
      ) : (
        <div className="bg-black rounded-[44px] p-3 shadow-2xl" style={{ width: Math.min(414, w), boxShadow: "0 0 0 1px #333, 0 30px 80px -30px #000" }}>
          <iframe ref={ref} title={`Prévia: ${tela.nome}`} sandbox="allow-scripts" srcDoc={doc} className="block w-full rounded-[32px] bg-white" style={{ height: altura, border: 0 }} />
        </div>
      )}
    </div>
  );
}
