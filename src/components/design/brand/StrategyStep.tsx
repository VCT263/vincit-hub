"use client";
import { useEffect, useRef, useState } from "react";
import { ARCHETYPES, ARCH_GROUPS, ARCH_ROLES, MAP_AXES, NICHES, archetypeMix, type Archetype } from "@/lib/brand-strategy";
import { behanceSearch, loadFonts, uid } from "@/lib/design";
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
  const mix = archetypeMix(s);
  useEffect(() => { loadFonts(mix.flatMap((m) => m.a.fontes)); }, [mix.map((m) => m.a.k).join()]); // eslint-disable-line
  const toggle = (k: string) => {
    const i = arch.indexOf(k);
    if (i >= 0) { const p = [...(s.pesos || [50, 30, 20])]; p.splice(i, 1); up({ arquetipos: arch.filter((x) => x !== k), pesos: p }); return; }
    if (arch.length >= 3) return;
    const p = [...(s.pesos || [50, 30, 20]).slice(0, arch.length), [50, 30, 20][arch.length]];
    up({ arquetipos: [...arch, k], pesos: p });
  };
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

      <section className="card p-5 rise space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">02 · Expressão arquetípica</p><p className="text-xs text-fog">Escolha até 3, na ordem: predominante, secundário e apoio</p></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {ARCH_GROUPS.map((g) => (
            <div key={g.k}>
              <p className="text-[11px] text-fog mb-1.5"><b className="text-paper">{g.l}</b> · {g.d}</p>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
                {ARCHETYPES.filter((a) => a.grupo === g.k).map((a) => { const i = arch.indexOf(a.k); return (
                  <button key={a.k} onClick={() => toggle(a.k)} className={`w-full rounded-xl border p-3 text-left ${i >= 0 ? "border-mint bg-mint/10" : "border-line hover:border-fog"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-1"><p className="font-semibold text-sm">{a.l}</p>{i >= 0 && <span className="chip chip-mint !text-[10px]">{ARCH_ROLES[i].toLowerCase()} · {mix[i]?.pct}%</span>}</div>
                    <p className="text-xs text-fog mt-0.5">{a.d}</p>
                  </button>
                ); })}
              </div>
            </div>
          ))}
        </div>

        {mix.length > 0 && (
          <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
            <div className="space-y-4">
              <ArchWheel mix={mix} />
              <div className="space-y-3">
                {mix.map((m, i) => (
                  <div key={m.a.k}>
                    <div className="flex items-center justify-between text-xs"><span><span className="text-fog">{m.role}</span> · <b>{m.a.l}</b></span><span className="font-mono">{m.pct}%</span></div>
                    <input type="range" min={5} max={80} value={m.pct} onChange={(e) => { const p = mix.map((x) => x.pct); p[i] = +e.target.value; up({ pesos: p }); }} className="w-full accent-[var(--color-mint)]" />
                  </div>
                ))}
                {mix.reduce((t, m) => t + m.pct, 0) !== 100 && <p className="text-[11px] text-fog">Soma {mix.reduce((t, m) => t + m.pct, 0)}%. O ideal é fechar em 100%.</p>}
              </div>
              {mix.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {([["ativ_verbal", "Puxa o verbal"], ["ativ_visual", "Puxa o visual"]] as const).map(([k, l]) => (
                    <div key={k}><label className="label">{l}</label><select value={s[k] || mix[0].a.k} onChange={(e) => up({ [k]: e.target.value })} className="input !py-1.5 text-xs">{mix.map((m) => <option key={m.a.k} value={m.a.k}>{m.a.l}</option>)}</select></div>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-xs border-collapse min-w-[560px]">
                <thead><tr><th className="text-left font-mono text-[10px] uppercase tracking-widest text-fog font-normal pb-2 w-28">Aspecto</th>{mix.map((m) => <th key={m.a.k} className="text-left pb-2 pr-3"><span className="font-display text-base">{m.a.l}</span> <span className="text-fog font-normal">{m.pct}%</span></th>)}</tr></thead>
                <tbody>
                  {ROWS.map(([l, f]) => (
                    <tr key={l} className="border-t border-line align-top">
                      <td className="py-2.5 pr-3 text-fog">{l}</td>
                      {mix.map((m) => <td key={m.a.k} className="py-2.5 pr-3">{f(m.a)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="card p-5 rise">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">03 · Mapa de posicionamento</p>
          <div className="flex flex-wrap gap-2 items-center text-xs text-fog min-w-0">
            Eixos
            {[0, 1].map((i) => <select key={i} value={ax[i]} onChange={(e) => { const n: [string, string] = [...ax] as any; n[i] = e.target.value; up({ eixos: n }); }} className="input !w-auto max-w-full !py-1 text-xs">{MAP_AXES.map(([k, a, z]) => <option key={k} value={k}>{a} ↔ {z}</option>)}</select>)}
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

const ROWS: [string, (a: Archetype) => React.ReactNode][] = [
  ["Narrativa", (a) => a.narrativa],
  ["Verbal", (a) => <>{a.verbal}<div className="flex flex-wrap gap-1 mt-1.5">{a.palavras.map((p) => <span key={p} className="chip !text-[10px]">{p}</span>)}</div></>],
  ["Nunca diz", (a) => <span className="text-fog">{a.nunca}</span>],
  ["Forma", (a) => a.forma],
  ["Cor", (a) => <><div className="flex gap-1 mb-1">{a.cores.map((c) => <span key={c} className="w-6 h-6 rounded-md border border-line" style={{ background: c }} title={c} />)}</div><span className="text-fog">{a.visual}</span></>],
  ["Tipografia", (a) => <div className="space-y-0.5">{a.fontes.map((f) => <p key={f} className="text-base leading-tight" style={{ fontFamily: `"${f}"` }}>{f}</p>)}</div>],
  ["Fotografia", (a) => a.foto],
  ["Atração", (a) => a.atracao],
  ["Referências", (a) => <><span className="text-fog">{a.marcas}</span><a href={behanceSearch(a.busca)} target="_blank" rel="noreferrer" className="block text-mint mt-1">Behance: {a.busca} ↗</a></>],
];

/** roda dos 12 arquétipos com a hierarquia marcada */
function ArchWheel({ mix }: { mix: { a: Archetype; pct: number }[] }) {
  const R = 100, r0 = 38, n = ARCHETYPES.length;
  const seg = (i: number) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a: number, rr: number) => `${(110 + rr * Math.cos(a)).toFixed(2)} ${(110 + rr * Math.sin(a)).toFixed(2)}`;
    return `M${p(a0, r0)} L${p(a0, R)} A${R} ${R} 0 0 1 ${p(a1, R)} L${p(a1, r0)} A${r0} ${r0} 0 0 0 ${p(a0, r0)}Z`;
  };
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[260px] mx-auto">
      {ARCHETYPES.map((a, i) => { const m = mix.find((x) => x.a.k === a.k); const mid = ((i + .5) / n) * Math.PI * 2 - Math.PI / 2; return (
        <g key={a.k}>
          <path d={seg(i)} fill={m ? "var(--color-mint)" : "transparent"} fillOpacity={m ? .25 + m.pct / 100 : 0} stroke="var(--color-line)" strokeWidth="1" />
          <text x={110 + 70 * Math.cos(mid)} y={110 + 70 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill={m ? "var(--color-paper)" : "var(--color-fog)"} fontWeight={m ? 700 : 400}>{a.l.split(" ")[0]}</text>
        </g>
      ); })}
      <circle cx="110" cy="110" r={r0 - 2} fill="var(--color-panel2, #1c1c1f)" />
      <text x="110" y="106" textAnchor="middle" fontSize="8" fill="var(--color-fog)">ARQUÉTIPOS</text>
      <text x="110" y="118" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--color-mint)">{mix[0]?.a.l || ""}</text>
    </svg>
  );
}
