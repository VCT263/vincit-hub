"use client";
import { useEffect, useState } from "react";
import { HARMONIES, ROLES, cmyk, contrast, harmony, hexToRgb, randomBase, readableOn, type Swatch } from "@/lib/design";
import { I } from "@/components/icons";
import type { StepProps } from "./types";

export default function ColorStep({ d, set }: StepProps) {
  const pal: Swatch[] = d.palette?.length ? d.palette : harmony("#2d6a4f", "analoga");
  const [kind, setKind] = useState(d.harmony || "analoga");
  const save = (p: Swatch[], k = kind) => set({ palette: p, harmony: k });
  useEffect(() => { if (!d.palette?.length) save(pal); }, []); // eslint-disable-line

  const regen = (k = kind, base?: string) => {
    const b = base || (pal[0].locked ? pal[0].hex : randomBase());
    save(harmony(b, k, pal, 14), k);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target as HTMLElement).closest("input,textarea,select,button")) { e.preventDefault(); regen(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });
  const up = (i: number, patch: Partial<Swatch>) => save(pal.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const mood = Array.from(new Set((d.refs || []).filter((r: any) => r.tipo === "gosto").flatMap((r: any) => r.colors || []))).slice(0, 15) as string[];
  const concepts = (d.concepts || []).filter((c: any) => c.paleta?.length);
  const C = Object.fromEntries(pal.map((s) => [s.role, s.hex]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center">
        {HARMONIES.map((h) => (
          <button key={h.k} onClick={() => { setKind(h.k); regen(h.k, pal[0].hex); }} className={`chip !px-3 !py-1.5 ${kind === h.k ? "chip-mint" : "hover:text-paper"}`} title={h.d}>{h.l}</button>
        ))}
        <button onClick={() => regen()} className="btn btn-mint btn-sm ml-auto"><I.refresh className="w-3.5 h-3.5" />Gerar outra <span className="hidden md:inline font-mono opacity-70">(espaço)</span></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 rise">
        {pal.map((s, i) => {
          const on = readableOn(s.hex); const [r, g, b] = hexToRgb(s.hex);
          return (
            <div key={i} className="rounded-2xl overflow-hidden border border-line">
              <label className="block h-36 md:h-52 p-3 relative cursor-pointer" style={{ background: s.hex, color: on }}>
                <input type="color" value={s.hex} onChange={(e) => up(i, { hex: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={`Cor ${s.role}`} />
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">{s.role}</span>
                <span className="absolute bottom-3 left-3 font-display font-bold text-lg">{s.hex.toUpperCase()}</span>
              </label>
              <div className="bg-panel p-2.5 flex items-center gap-2">
                <select value={s.role} onChange={(e) => up(i, { role: e.target.value })} className="bg-transparent text-xs text-fog outline-none flex-1 min-w-0">{ROLES.map((x) => <option key={x}>{x}</option>)}</select>
                <button onClick={() => up(i, { locked: !s.locked })} className={s.locked ? "text-mint" : "text-fog hover:text-paper"} aria-label={s.locked ? "Destravar" : "Travar"} title={s.locked ? "Travada: não muda ao gerar" : "Travar esta cor"}><I.lock className="w-3.5 h-3.5" /></button>
              </div>
              <p className="bg-panel px-2.5 pb-2 font-mono text-[10px] text-fog">RGB {r} {g} {b} · CMYK {cmyk(s.hex).join(" ")}</p>
            </div>
          );
        })}
      </div>

      {(mood.length > 0 || concepts.length > 0) && (
        <section className="card p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Começar de</p>
          {mood.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap"><span className="text-xs text-fog w-32">Moodboard (clique)</span>
              <div className="flex gap-1">{mood.map((c) => <button key={c} onClick={() => regen(kind, c)} className="w-7 h-7 rounded-md border border-line hover:scale-110 transition-transform" style={{ background: c }} title={`Usar ${c} como primária`} />)}</div></div>
          )}
          {concepts.map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-3 flex-wrap"><span className="text-xs text-fog w-32 truncate">Claude · {c.nome}</span>
              <button onClick={() => save(c.paleta.slice(0, 5).map((hex: string, j: number) => ({ hex, role: ROLES[j] || "Apoio" })))} className="flex rounded-md overflow-hidden border border-line hover:border-mint">{c.paleta.slice(0, 5).map((h: string) => <span key={h} className="w-7 h-7" style={{ background: h }} />)}</button></div>
          ))}
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Contraste do texto</p>
          <div className="space-y-2">
            {[["Escuro", "Claro"], ["Claro", "Primária"], ["Escuro", "Primária"], ["Claro", "Escuro"], ["Escuro", "Destaque"]].map(([fg, bg]) => {
              const r = contrast(C[fg] || "#000", C[bg] || "#fff");
              const ok = r >= 4.5 ? "bom para texto" : r >= 3 ? "só para título grande" : "evite";
              return (
                <div key={fg + bg} className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg text-sm font-semibold w-40 truncate" style={{ background: C[bg], color: C[fg] }}>{fg} sobre {bg.toLowerCase()}</span>
                  <span className="font-mono text-xs w-12">{r.toFixed(1)}</span>
                  <span className={`text-xs ${r >= 4.5 ? "text-mint" : r >= 3 ? "text-fog" : "text-danger"}`}>{ok}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Prévia em uso</p>
          <div className="rounded-xl p-5" style={{ background: C["Claro"], color: C["Escuro"] }}>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: C["Primária"] }}>NOVIDADE</p>
            <p className="font-display font-extrabold text-2xl mt-1">{d.brief?.nome || "Sua marca"}</p>
            <p className="text-sm opacity-80 mt-1">{d.brief?.slogan || "Uma frase curta sobre o que a marca entrega."}</p>
            <div className="flex gap-2 mt-4">
              <span className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: C["Primária"], color: readableOn(C["Primária"] || "#000") }}>Comprar</span>
              <span className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: C["Destaque"], color: readableOn(C["Destaque"] || "#000") }}>Ver mais</span>
            </div>
          </div>
          <p className="text-[11px] text-fog mt-2">Regra prática: 60% neutro, 30% primária e apoio, 10% destaque.</p>
        </div>
      </section>
    </div>
  );
}
