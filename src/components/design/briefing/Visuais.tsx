"use client";
import { useRef, useState, type CSSProperties } from "react";
import { hexToHsl, hslToHex, readableOn } from "@/lib/design";
import { TYPE_GROUPS } from "@/lib/brand-knowledge";
import { ARCHETYPES } from "@/lib/brand-strategy";
import { LETRAS, LETRA_EIXOS, QUADRANTES, REGRAS, TRACOS, arqMix, arqPos, paletaDe, type Paleta } from "@/lib/briefing-cliente";

/* Perguntas visuais do briefing público: quadro de arquétipos, roda de cores e tipos de letra.
   Tema claro editorial, feitas para arrastar com o dedo. */

const ink = "#151515", fog = "#8a847a";
const chip = (on: boolean) => `px-3.5 py-2 rounded-full border text-[14px] transition-colors ${on ? "bg-[#151515] border-[#151515] text-[#f4f2ee]" : "border-[#d0cabf] text-[#3a3733] hover:border-[#151515]"}`;

/** arrastar dentro de uma caixa: devolve x, y em 0..1 */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const at = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); onMove(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); };
  const props = {
    ref,
    onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); at(e); },
    onPointerMove: (e: React.PointerEvent) => { if (e.buttons || e.pointerType === "touch") at(e); },
    style: { touchAction: "none" } as CSSProperties,
  };
  return props;
}

/* ───────── arquétipos ───────── */
export function Arquetipo({ value, onChange }: { value?: { x: number; y: number }; onChange: (v: { x: number; y: number }) => void }) {
  const drag = useDrag((x, y) => onChange({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }));
  const mix = arqMix(value);
  const top = mix[0]?.a;
  const [ver, setVer] = useState<string | null>(null);
  const vendo = ARCHETYPES.find((a) => a.k === ver);
  const tons = ["#ece6dc", "#e6e0d3", "#e9e3d9", "#e3ddd0"];
  return (
    <div className="space-y-4">
      <div {...drag} className="relative w-full aspect-square max-w-[460px] mx-auto rounded-2xl overflow-hidden border border-[#d0cabf] cursor-crosshair select-none">
        {QUADRANTES.map((q, i) => (
          <div key={q.k} className="absolute w-1/2 h-1/2 p-3" style={{ left: `${q.x * 50}%`, top: `${q.y * 50}%`, background: tons[i] }}>
            <p className={`text-[11px] tracking-[.16em] uppercase text-[#6f685e] ${q.x ? "text-right" : ""} ${q.y ? "absolute bottom-3 left-3 right-3" : ""}`}>{q.l}<span className="block normal-case tracking-normal text-[11px] text-[#9a9388]">{q.d}</span></p>
          </div>
        ))}
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#cfc8bc]" /><div className="absolute inset-y-0 left-1/2 w-px bg-[#cfc8bc]" />
        <div className="absolute rounded-full border border-dashed border-[#c7c0b3]" style={{ left: "17%", top: "19%", width: "66%", height: "62%" }} />
        {ARCHETYPES.map((a) => {
          const p = arqPos(a.k); const m = mix.find((x) => x.a.k === a.k);
          return <span key={a.k} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none transition-all" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, fontSize: m ? 13 + m.pct / 10 : 12, fontWeight: m ? 600 : 400, color: m ? ink : "#9a9388", fontFamily: m ? '"Bodoni Moda", Georgia, serif' : undefined }}>{a.l}</span>;
        })}
        {value ? (
          <span className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}>
            <span className="block w-9 h-9 rounded-full bg-[#151515] ring-4 ring-white/80 shadow-lg grid place-items-center text-[#f4f2ee] text-[10px] tracking-widest">VOCÊ</span>
          </span>
        ) : <span className="absolute inset-0 grid place-items-center pointer-events-none"><span className="bg-[#151515] text-[#f4f2ee] text-[13px] rounded-full px-4 py-2">Toque e arraste</span></span>}
      </div>
      {top ? (
        <div className="bg-white/70 border border-[#d9d4cb] rounded-2xl p-4 md:p-5">
          <p className="text-[11px] tracking-[.18em] uppercase" style={{ color: fog }}>A sua marca hoje parece</p>
          <p className="text-[32px] leading-tight mt-1" style={{ fontFamily: '"Bodoni Moda", Georgia, serif' }}>{top.l}</p>
          <p className="text-[15px] text-[#4a463f] mt-1">{top.d} Atrai {top.atracao.charAt(0).toLowerCase() + top.atracao.slice(1)}</p>
          <Tracos k={top.k} />
          <p className="text-[13px] mt-3" style={{ color: fog }}>Marcas assim: {top.marcas}</p>
          <div className="mt-4 space-y-3">
            {mix.map((m, i) => (
              <div key={m.a.k}>
                <div className="flex justify-between text-[13px]"><span>{m.a.l}</span><span className="tabular-nums">{m.pct}%</span></div>
                <div className="h-1.5 rounded-full bg-[#e2ddd4] overflow-hidden"><div className="h-full bg-[#151515] transition-all" style={{ width: `${m.pct}%` }} /></div>
                {i > 0 && TRACOS[m.a.k] ? <p className="text-[12px] mt-1" style={{ color: fog }}>Traz um pouco de: {TRACOS[m.a.k].jeito.slice(0, 3).join(", ")}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-[13px]" style={{ color: fog }}>Não precisa acertar: é um ponto de partida para a conversa.</p>}
      <div className="pt-1">
        <p className="text-[14px] text-[#3a3733]">Na dúvida, conheça cada personalidade e veja com qual você se identifica:</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {ARCHETYPES.map((a) => <button key={a.k} type="button" onClick={() => setVer(ver === a.k ? null : a.k)} className={chip(ver === a.k)}>{a.l}</button>)}
        </div>
        {vendo ? (
          <div className="mt-3 bg-white/70 border border-[#d9d4cb] rounded-2xl p-4">
            <p className="text-[22px] leading-tight" style={{ fontFamily: '"Bodoni Moda", Georgia, serif' }}>{vendo.l}</p>
            <p className="text-[14px] text-[#4a463f] mt-1">{vendo.d}</p>
            <Tracos k={vendo.k} />
            <button type="button" onClick={() => { const p = arqPos(vendo.k); onChange({ x: .5 + (p.x - .5) * .8, y: .5 + (p.y - .5) * .8 }); setVer(null); }} className="mt-4 w-full bg-[#151515] text-[#f4f2ee] rounded-full px-4 py-3 text-[15px]">Sou assim, levar o VOCÊ para cá</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** como é a personalidade: jeito de ser, sinais de que é você e um exemplo de fala */
function Tracos({ k }: { k: string }) {
  const t = TRACOS[k];
  if (!t) return null;
  return (
    <div className="mt-4 pt-4 border-t border-[#e2ddd4]">
      <p className="text-[11px] tracking-[.18em] uppercase" style={{ color: fog }}>Jeito de ser</p>
      <div className="flex flex-wrap gap-1.5 mt-2">{t.jeito.map((j) => <span key={j} className="px-3 py-1 rounded-full bg-[#ece6dc] text-[13px] text-[#3a3733]">{j}</span>)}</div>
      <p className="text-[11px] tracking-[.18em] uppercase mt-4" style={{ color: fog }}>É você se a sua marca</p>
      <ul className="mt-1.5 space-y-1">{t.seVe.map((x) => <li key={x} className="text-[14px] text-[#3a3733] pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-[#9a9388]">{x}</li>)}</ul>
      <p className="text-[17px] mt-3 italic" style={{ fontFamily: '"Bodoni Moda", Georgia, serif' }}>{t.fala}</p>
    </div>
  );
}

/* ───────── roda de cores ───────── */
export function Roda({ value, onChange }: { value: Paleta[]; onChange: (v: Paleta[]) => void }) {
  const [h, setH] = useState(28), [s, setS] = useState(45), [l, setL] = useState(62);
  const [regra, setRegra] = useState("analoga");
  const base = hslToHex(h, s, l);
  const pal = paletaDe(base, regra);
  const drag = useDrag((x, y) => {
    const dx = x - .5, dy = y - .5; const r = Math.min(.5, Math.hypot(dx, dy));
    setH(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360); setS(Math.round((r / .5) * 100));
  });
  const pos = (hh: number, ss: number) => { const a = (hh * Math.PI) / 180, r = (Math.min(100, ss) / 100) * 50; return { left: `${50 + r * Math.sin(a)}%`, top: `${50 - r * Math.cos(a)}%` }; };
  const shade = l < 50 ? `rgba(0,0,0,${(50 - l) / 60})` : `rgba(255,255,255,${(l - 50) / 60})`;
  const salvar = () => { if (value.length >= 3) return; onChange([...value, { base, regra, cores: pal.map((x) => x.hex) }]); };
  const surpresa = () => { setH(Math.random() * 360); setS(30 + Math.random() * 60); setL(35 + Math.random() * 35); setRegra(REGRAS[Math.floor(Math.random() * REGRAS.length)].k); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{REGRAS.map((r) => <button key={r.k} type="button" onClick={() => setRegra(r.k)} className={chip(regra === r.k)}>{r.l}</button>)}</div>
      <p className="text-[13px]" style={{ color: fog }}>{REGRAS.find((r) => r.k === regra)?.d}</p>
      <div className="grid sm:grid-cols-[1fr_1fr] gap-5 items-center">
        <div {...drag} className="relative w-full max-w-[300px] mx-auto aspect-square rounded-full cursor-crosshair select-none shadow-inner"
          style={{ ...drag.style, background: "conic-gradient(hsl(0 90% 55%), hsl(60 90% 55%), hsl(120 90% 45%), hsl(180 90% 45%), hsl(240 90% 60%), hsl(300 90% 55%), hsl(360 90% 55%))" }}>
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #fff 0%, rgba(255,255,255,.85) 18%, rgba(255,255,255,0) 72%)" }} />
          <div className="absolute inset-0 rounded-full" style={{ background: shade }} />
          {pal.slice(1, 3).map((x) => { const [hh, ss] = hexToHsl(x.hex); return <span key={x.role} className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow pointer-events-none" style={{ ...pos(hh, ss), background: x.hex }} />; })}
          <span className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-lg pointer-events-none" style={{ ...pos(h, s), background: base }} />
        </div>
        <div className="space-y-4">
          <div className="flex h-24 rounded-2xl overflow-hidden border border-black/10">
            {pal.map((x) => <div key={x.role} className="flex-1 flex items-end p-1.5" style={{ background: x.hex, color: readableOn(x.hex) }}><span className="text-[10px] opacity-80 uppercase">{x.hex.slice(1)}</span></div>)}
          </div>
          <div>
            <div className="flex justify-between text-[13px] mb-1" style={{ color: fog }}><span>Mais escura</span><span>Mais clara</span></div>
            <input type="range" min={15} max={88} value={l} onChange={(e) => setL(+e.target.value)} className="w-full h-8 accent-[#151515]" aria-label="Claridade" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={salvar} disabled={value.length >= 3} className="flex-1 bg-[#151515] text-[#f4f2ee] rounded-full px-4 py-3 text-[15px] disabled:opacity-40">{value.length >= 3 ? "3 paletas salvas" : "Salvar esta paleta"}</button>
            <button type="button" onClick={surpresa} className="px-4 py-3 rounded-full border border-[#cfc9be] text-[15px]">Surpreenda</button>
          </div>
        </div>
      </div>
      {!!value.length && (
        <div className="space-y-2">
          <p className="text-[12px] tracking-[.16em] uppercase" style={{ color: fog }}>Suas paletas</p>
          {value.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-1 h-10 rounded-xl overflow-hidden border border-black/10">{p.cores.map((c, j) => <span key={j} className="flex-1" style={{ background: c }} />)}</div>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="w-9 h-9 rounded-full border border-[#cfc9be] text-[18px] leading-none" aria-label="Tirar paleta">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── tipos de letra ───────── */
export function Letras({ value, onChange, nome }: { value: string[]; onChange: (v: string[]) => void; nome?: string }) {
  const n = (nome || "").trim() || "Sua marca";
  const tog = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="space-y-6">
      {TYPE_GROUPS.map((g) => (
        <div key={g.k}>
          <p className="text-[16px] font-medium">{g.l}</p>
          <p className="text-[13.5px] leading-relaxed mt-0.5" style={{ color: "#6f685e" }}>{g.d}</p>
          <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
            {LETRAS.filter((c) => c.grupo === g.k).map((c) => { const on = value.includes(c.k); return (
              <button key={c.k} type="button" onClick={() => tog(c.k)} aria-pressed={on} className={`text-left rounded-2xl border-2 bg-white/70 p-4 transition-all ${on ? "border-[#151515]" : "border-transparent"}`}>
                <span className="flex items-start justify-between gap-2">
                  <span className="block text-[30px] leading-[1.05] break-words" style={{ fontFamily: `"${c.ex}"`, fontWeight: c.w || 400, fontStyle: c.it ? "italic" : "normal", color: ink }}>{n}</span>
                  {on && <span className="shrink-0 w-6 h-6 rounded-full bg-[#151515] text-white grid place-items-center text-[13px]">✓</span>}
                </span>
                <span className="block text-[14px] font-medium mt-3">{c.l}</span>
                <span className="block text-[13px] mt-0.5" style={{ color: "#6f685e" }}>Passa: {c.sente.charAt(0).toLowerCase() + c.sente.slice(1)}</span>
                <span className="block text-[12.5px] mt-1" style={{ color: fog }}>{c.oque}</span>
              </button>
            ); })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LetraEixos({ value, onChange, nome }: { value: Record<string, number>; onChange: (v: Record<string, number>) => void; nome?: string }) {
  const n = ((nome || "").trim() || "Marca").split(" ")[0];
  const txt = (t: string) => (t === "MARCA" ? n.toUpperCase() : t === "marca" ? n.toLowerCase() : n);
  const st = (o: any): CSSProperties => ({ fontFamily: `"${o.f}"`, fontWeight: o.w || 400, fontStyle: o.it ? "italic" : "normal", letterSpacing: o.ls || "normal", color: ink });
  return (
    <div className="space-y-4">
      {LETRA_EIXOS.map((e) => { const v = value[e.k] ?? 50; return (
        <div key={e.k} className="bg-white/70 border border-[#d9d4cb] rounded-2xl p-4">
          <p className="text-[15px] font-medium">{e.l}</p>
          <p className="text-[13px] mt-0.5" style={{ color: "#6f685e" }}>{e.d}</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {([["a", e.aL, 10], ["z", e.zL, 90]] as const).map(([side, lab, val]) => { const on = side === "a" ? v < 40 : v > 60; const o = e[side]; return (
              <button key={side} type="button" onClick={() => onChange({ ...value, [e.k]: val })} className={`rounded-xl border-2 py-3 px-2 text-center transition-all ${on ? "border-[#151515] bg-white" : "border-transparent bg-[#efebe4]"}`}>
                <span className="block text-[26px] leading-tight truncate" style={st(o)}>{txt(o.t)}</span>
                <span className="block text-[12px] mt-1" style={{ color: fog }}>{lab}</span>
              </button>
            ); })}
          </div>
          <input type="range" min={0} max={100} value={v} onChange={(ev) => onChange({ ...value, [e.k]: +ev.target.value })} className="w-full h-8 mt-1 accent-[#151515]" aria-label={e.l} />
        </div>
      ); })}
      <p className="text-[12.5px]" style={{ color: fog }}>Dica: a marca costuma usar duas letras, uma com personalidade para o nome e títulos e uma simples para os textos.</p>
    </div>
  );
}
