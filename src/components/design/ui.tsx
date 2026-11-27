"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FONT_CATS, FONT_LIB } from "@/lib/fonts";
import { STEPS, sanitizeSvg, loadFonts, stepOf, primaryLogo } from "@/lib/design";

/** mostra um SVG limpo (inline, para usar as fontes carregadas na página) */
export function SvgView({ svg, className, fonts }: { svg: string; className?: string; fonts?: string[] }) {
  const [clean, setClean] = useState("");
  useEffect(() => { setClean(sanitizeSvg(svg).replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" width="100%" height="100%" ')); }, [svg]);
  const fam = useMemo(() => fonts || Array.from(new Set(Array.from(svg.matchAll(/font-family="([^"]+)"/g)).map((m) => m[1].split(",")[0].replace(/['"]/g, "").trim()))), [svg, fonts]);
  useEffect(() => { loadFonts(fam); }, [fam]);
  // o SVG fica absoluto para não empurrar a altura do contêiner (assinaturas verticais estouravam a caixa)
  return <div className={`relative ${className || ""}`}><div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: clean }} /></div>;
}

/** campo de etiquetas: digite e aperte Enter */
export function Chips({ value, onChange, ph }: { value: string[]; onChange: (v: string[]) => void; ph?: string }) {
  const [t, setT] = useState("");
  const add = () => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(""); };
  return (
    <div className="input flex flex-wrap gap-1.5 items-center !py-2">
      {value.map((v) => (
        <span key={v} className="chip chip-mint">{v}<button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="opacity-70 hover:opacity-100" aria-label={`Tirar ${v}`}>×</button></span>
      ))}
      <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} placeholder={value.length ? "" : ph} className="flex-1 min-w-24 bg-transparent outline-none text-sm" />
    </div>
  );
}

export function BrandCard({ b }: { b: { id: string; title: string; step: string; data: any } }) {
  const d = b.data || {};
  const logo = (d.logos || []).find((l: any) => l.id === d.logo_id) || (d.logos || [])[0];
  const pal: string[] = (d.palette || []).map((s: any) => s.hex);
  const idx = STEPS.findIndex((s) => s.k === stepOf(b.step));
  const bg = pal[4] || "#1c1c1f";
  const main = d.logotype || d.symbol_id ? primaryLogo(d) : "";
  return (
    <Link href={`/design/marcas/${b.id}`} className="block rounded-xl border border-line overflow-hidden hover:border-mint transition-colors">
      <div className="h-28 grid place-items-center p-4" style={{ background: bg }}>
        {main ? <SvgView svg={main} className="h-20 w-full" /> : logo?.svg ? <SvgView svg={logo.svg} className="h-20 w-full" /> : logo?.img ? <img src={logo.img} alt="" className="max-h-20 max-w-full" /> : <span className="font-display font-extrabold text-2xl" style={{ color: pal[0] || "var(--color-fog)" }}>{d.brief?.nome || b.title}</span>}
      </div>
      <div className="flex h-2">{pal.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
      <div className="p-3">
        <p className="font-semibold text-sm truncate">{d.brief?.nome || b.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex gap-0.5 flex-1">{STEPS.map((s, i) => <span key={s.k} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-mint" : "bg-line"}`} />)}</div>
          <span className="text-[11px] text-fog">{STEPS[Math.max(0, idx)]?.l}</span>
        </div>
      </div>
    </Link>
  );
}

/** seletor de fonte agrupado por estilo (Google Fonts e Fontshare) */
export function FontSelect({ value, onChange, className = "input" }: { value?: string; onChange: (f: string) => void; className?: string }) {
  const known = FONT_LIB.some((x) => x.f === value);
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="" disabled>Escolha</option>
      {value && !known && <option value={value}>{value}</option>}
      {FONT_CATS.map((c) => (
        <optgroup key={c.k} label={c.l}>
          {FONT_LIB.filter((x) => x.cat === c.k).map((x) => <option key={x.f} value={x.f}>{x.f}{x.src === "fontshare" ? " · Fontshare" : ""}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
