"use client";
import { download, lockupSvg, monoSvg, patternSvg, svgParts, type Pattern } from "@/lib/design";
import { I } from "@/components/icons";
import { SvgView } from "../ui";
import type { StepProps } from "./types";

export default function PatternStep({ d, set }: StepProps) {
  const pal: Record<string, string> = Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex]));
  const p: Pattern = { source: d.monogram ? "monograma" : "simbolo", scale: 120, gap: 60, rotate: 0, offset: true, opacity: 1, bg: pal["Primária"] || "#18F2B2", fg: pal["Escuro"] || "#000", ...(d.pattern || {}) };
  const P = (patch: Partial<Pattern>) => set({ pattern: { ...p, ...patch } });
  const svg = patternSvg(d, p);
  const sym = d.symbol_id || d.logo_id ? lockupSvg("simbolo", d) : d.monogram ? lockupSvg("monograma", d) : "";
  const big = sym ? (() => { const sp = svgParts(monoSvg(sym, p.fg)); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${p.bg}"/><svg x="280" y="-240" width="1400" height="1400" viewBox="${sp.vb}" opacity="${Math.min(1, p.opacity)}">${sp.inner}</svg></svg>`; })() : "";
  const colors = Object.values(pal);
  const presets: [string, Partial<Pattern>][] = [["Grade", { scale: 120, gap: 60, rotate: 0, offset: false }], ["Tijolo", { scale: 110, gap: 50, rotate: 0, offset: true }], ["Denso", { scale: 70, gap: 14, rotate: 0, offset: true }], ["Diagonal", { scale: 90, gap: 70, rotate: 45, offset: true }], ["Sutil", { scale: 60, gap: 90, opacity: .25, offset: true }]];

  return (
    <div className="space-y-5">
      <section className="card p-5 rise grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden aspect-square border border-line"><SvgView svg={svg} className="w-full h-full" /></div>
          {big ? <div className="rounded-xl overflow-hidden aspect-square border border-line"><SvgView svg={big} className="w-full h-full" /></div> : <div className="rounded-xl border border-dashed border-line grid place-items-center text-xs text-fog p-4 text-center">Escolha um símbolo para gerar o supergráfico</div>}
          <p className="text-[11px] text-fog">Padrão</p><p className="text-[11px] text-fog">Supergráfico (símbolo ampliado e recortado)</p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">{presets.map(([l, v]) => <button key={l} onClick={() => P(v)} className="chip !px-2.5 !py-1 hover:text-paper">{l}</button>)}</div>
          {d.monogram && <div className="flex gap-1.5">{(["simbolo", "monograma"] as const).map((k) => <button key={k} onClick={() => P({ source: k })} className={`chip !px-2.5 !py-1 ${p.source === k ? "chip-mint" : ""}`}>{k === "simbolo" ? "Símbolo" : "Monograma"}</button>)}</div>}
          {([["scale", "Tamanho", 30, 400], ["gap", "Espaço", 0, 300], ["rotate", "Rotação", 0, 180]] as const).map(([k, l, a, z]) => (
            <div key={k}><label className="label">{l}: {p[k]}</label><input type="range" min={a} max={z} value={p[k]} onChange={(e) => P({ [k]: +e.target.value } as any)} className="w-full accent-[var(--color-mint)]" /></div>
          ))}
          <div><label className="label">Opacidade: {Math.round(p.opacity * 100)}%</label><input type="range" min={5} max={100} value={p.opacity * 100} onChange={(e) => P({ opacity: +e.target.value / 100 })} className="w-full accent-[var(--color-mint)]" /></div>
          <button onClick={() => P({ offset: !p.offset })} className={`chip !px-3 !py-1.5 ${p.offset ? "chip-mint" : ""}`}>Linhas alternadas</button>
          {(["bg", "fg"] as const).map((k) => (
            <div key={k}><label className="label">{k === "bg" ? "Fundo" : "Forma"}</label><div className="flex gap-1.5">{colors.map((c) => <button key={c} onClick={() => P({ [k]: c } as any)} className={`w-6 h-6 rounded-md border ${p[k] === c ? "ring-2 ring-mint border-paper" : "border-line"}`} style={{ background: c }} aria-label={c} />)}</div></div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `${d.brief?.nome || "marca"}-padrao.svg`)} className="btn btn-ghost btn-sm flex-1"><I.download className="w-3.5 h-3.5" />Padrão SVG</button>
            {big && <button onClick={() => download(URL.createObjectURL(new Blob([big], { type: "image/svg+xml" })), `${d.brief?.nome || "marca"}-supergrafico.svg`)} className="btn btn-ghost btn-sm flex-1"><I.download className="w-3.5 h-3.5" />Supergráfico</button>}
          </div>
        </div>
      </section>
    </div>
  );
}
