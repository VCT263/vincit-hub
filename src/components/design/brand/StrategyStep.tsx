"use client";
import { useRef, useState } from "react";
import { ARCHETYPES, MAP_AXES, NICHES } from "@/lib/brand-strategy";
import { behanceSearch, uid } from "@/lib/design";
import { I } from "@/components/icons";
import type { StepProps } from "./types";

type Dot = { id: string; name: string; x: number; y: number; me?: boolean };

export default function StrategyStep({ d, set }: StepProps) {
  const s = d.strategy || {};
  const up = (patch: any) => set({ strategy: { ...s, ...patch } });
  const niche = NICHES.find((n) => n.k === s.nicho);
  const arch: string[] = s.arquetipos || [];
  const ax: [string, string] = s.eixos || ["preco", "tom"];
  const A = (k: string) => MAP_AXES.find((x) => x[0] === k)!;
  const name = d.brief?.nome || "Sua marca";
  const dots: Dot[] = s.mapa?.length ? s.mapa : [{ id: "me", name, x: 70, y: 30, me: true }, ...((d.brief?.concorrentes || []) as string[]).slice(0, 6).map((c, i) => ({ id: `c${i}`, name: c, x: 20 + i * 12, y: 60 - (i % 3) * 15 }))];
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [novo, setNovo] = useState("");

  const move = (e: React.PointerEvent) => {
    if (!drag || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - r.left) / r.width) * 100)), y = Math.max(3, Math.min(97, ((e.clientY - r.top) / r.height) * 100));
    up({ mapa: dots.map((p) => (p.id === drag ? { ...p, x, y } : p)) });
  };

  return (
    <div className="space-y-5">
      <section className="card p-5 rise">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">01 · Nicho</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {NICHES.map((n) => (
            <button key={n.k} onClick={() => up({ nicho: n.k })} className={`rounded-xl border p-3 text-left transition-colors ${s.nicho === n.k ? "border-mint bg-mint/10" : "border-line hover:border-fog"}`}>
              <div className="flex gap-0.5 mb-2">{n.cores.map((c) => <span key={c} className="h-2 flex-1 rounded-full" style={{ background: c }} />)}</div>
              <p className="text-sm font-semibold leading-tight">{n.l}</p>
            </button>
          ))}
        </div>
        {niche && (
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-panel2 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">O código do nicho</p><p className="text-sm mt-2">{niche.codigos}</p><p className="text-xs text-fog mt-2">Fontes: {niche.fontes}</p><p className="text-xs text-fog mt-1">Formas: {niche.formas}</p></div>
            <div className="rounded-xl bg-panel2 p-4 border border-mint/30"><p className="font-mono text-[10px] uppercase tracking-widest text-mint">Onde se diferenciar</p><p className="text-sm mt-2">{niche.quebrar}</p></div>
            <div className="rounded-xl bg-panel2 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-danger">Clichês para evitar</p><p className="text-sm mt-2">{niche.evitar}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">{niche.busca.map((q) => <a key={q} href={behanceSearch(q)} target="_blank" rel="noreferrer" className="chip hover:text-paper">Behance: {q} ↗</a>)}</div></div>
          </div>
        )}
        <label className="flex items-center gap-2 mt-4 text-sm text-fog">
          Decisão:
          {(["seguir", "quebrar"] as const).map((k) => <button key={k} onClick={() => up({ codigo: k })} className={`chip !px-3 !py-1 ${s.codigo === k ? "chip-mint" : ""}`}>{k === "seguir" ? "Seguir o código (reconhecível)" : "Quebrar o código (memorável)"}</button>)}
        </label>
      </section>

      <section className="card p-5 rise">
        <div className="flex items-baseline justify-between gap-3 mb-3"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">02 · Arquétipo</p><p className="text-xs text-fog">Escolha 1 principal e até 1 de apoio</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {ARCHETYPES.map((a) => { const i = arch.indexOf(a.k); return (
            <button key={a.k} onClick={() => up({ arquetipos: i >= 0 ? arch.filter((x) => x !== a.k) : [...arch, a.k].slice(-2) })} className={`rounded-xl border p-3 text-left ${i >= 0 ? "border-mint bg-mint/10" : "border-line hover:border-fog"}`}>
              <div className="flex items-center justify-between"><p className="font-semibold text-sm">{a.l}</p>{i >= 0 && <span className="chip chip-mint !text-[10px]">{i === 0 ? "principal" : "apoio"}</span>}</div>
              <p className="text-xs text-fog mt-1">{a.d}</p>
              <p className="text-[11px] text-fog/70 mt-1.5 italic">{a.visual}</p>
            </button>
          ); })}
        </div>
      </section>

      <section className="card p-5 rise">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">03 · Mapa de posicionamento</p>
          <div className="flex gap-2 items-center text-xs text-fog">
            Eixos
            {[0, 1].map((i) => <select key={i} value={ax[i]} onChange={(e) => { const n: [string, string] = [...ax] as any; n[i] = e.target.value; up({ eixos: n }); }} className="input !w-auto !py-1 text-xs">{MAP_AXES.map(([k, a, z]) => <option key={k} value={k}>{a} ↔ {z}</option>)}</select>)}
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_240px] gap-4">
          <div ref={box} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} className="relative aspect-[16/10] rounded-xl bg-panel2 border border-line select-none touch-none overflow-hidden">
            <span className="absolute left-1/2 top-0 bottom-0 w-px bg-line" /><span className="absolute top-1/2 left-0 right-0 h-px bg-line" />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-fog uppercase">{A(ax[0])[1]}</span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-fog uppercase">{A(ax[0])[2]}</span>
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-fog uppercase">{A(ax[1])[2]}</span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-fog uppercase">{A(ax[1])[1]}</span>
            {dots.map((p) => (
              <button key={p.id} onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setDrag(p.id); }} style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 cursor-grab active:cursor-grabbing ${p.me ? "z-10" : ""}`}>
                <span className={`rounded-full ${p.me ? "w-4 h-4 bg-mint ring-4 ring-mint/25" : "w-3 h-3 bg-fog"}`} />
                <span className={`text-xs whitespace-nowrap ${p.me ? "font-bold text-mint" : "text-fog"}`}>{p.me ? name : p.name}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-fog">Arraste os pontos. Espaço vazio no mapa é oportunidade.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (!novo.trim()) return; up({ mapa: [...dots, { id: uid(), name: novo.trim(), x: 50, y: 50 }] }); setNovo(""); }} className="flex gap-2">
              <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Concorrente" className="input !py-1.5 text-sm" /><button className="btn btn-ghost btn-sm"><I.plus className="w-3.5 h-3.5" /></button>
            </form>
            <div className="space-y-1">{dots.filter((p) => !p.me).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-fog" /><span className="flex-1 truncate">{p.name}</span><button onClick={() => up({ mapa: dots.filter((x) => x.id !== p.id) })} className="text-fog hover:text-danger">×</button></div>
            ))}</div>
            <label className="label !mt-3">O espaço que a marca ocupa</label>
            <textarea value={s.posicao || ""} onChange={(e) => up({ posicao: e.target.value })} rows={3} className="input text-sm" placeholder="Ex.: a única loja premium da cidade com atendimento de amiga." />
          </div>
        </div>
      </section>
    </div>
  );
}
