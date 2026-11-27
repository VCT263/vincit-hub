"use client";
import { useEffect } from "react";
import { loadFonts, lockupSvg, patternSvg, primaryLogo, readableOn, svgUrl, type Pattern } from "@/lib/design";
import { SvgView } from "../ui";

/** a marca aplicada: peças desenhadas com o próprio sistema (logo, cores, fontes e grafismo) */
export default function Mockups({ d, compact }: { d: any; compact?: boolean }) {
  const C: Record<string, string> = { Primária: "#2d6a4f", Apoio: "#52796f", Destaque: "#e9c46a", Escuro: "#141414", Claro: "#f4f4f2", ...Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex])) };
  const t = d.type || { title: "Bricolage Grotesque", body: "Inter", tw: 800 };
  useEffect(() => { loadFonts([t.title, t.body]); }, [t.title, t.body]);
  const name = d.brief?.nome || "Marca";
  const logo = primaryLogo(d), logoW = primaryLogo(d, "#ffffff"), logoOnP = primaryLogo(d, readableOn(C["Primária"]));
  const small = d.monogram ? lockupSvg("monograma", d) : lockupSvg(d.symbol_id || d.logo_id ? "simbolo" : "logotipo", d);
  const smallW = d.monogram ? lockupSvg("monograma", d, "#ffffff") : lockupSvg(d.symbol_id || d.logo_id ? "simbolo" : "logotipo", d, "#ffffff");
  const p: Pattern = { source: d.monogram ? "monograma" : "simbolo", scale: 120, gap: 60, rotate: 0, offset: true, opacity: 1, bg: C["Primária"], fg: C["Escuro"], ...(d.pattern || {}) };
  const pat = svgUrl(patternSvg(d, p, 600, 600));
  const T = (s: React.CSSProperties = {}) => ({ fontFamily: `"${t.title}"`, fontWeight: t.tw, ...s });
  const B = (s: React.CSSProperties = {}) => ({ fontFamily: `"${t.body}"`, ...s });
  const slogan = d.brief?.slogan || (d.brief?.fala || [])[0] || "Uma frase da marca";
  const Logo = ({ svg, className }: { svg: string; className: string }) => (svg ? <SvgView svg={svg} className={className} /> : <span style={T()} className="text-2xl">{name}</span>);
  const cell = "rounded-2xl overflow-hidden relative";

  return (
    <div className={`grid ${compact ? "grid-cols-4 grid-rows-2 h-full [&>*]:!aspect-auto" : "grid-cols-2 md:grid-cols-4"} gap-3`}>
      {/* post */}
      <div className={`${cell} aspect-[4/5] p-5 flex flex-col justify-between`} style={{ background: C["Primária"], color: readableOn(C["Primária"]) }}>
        <Logo svg={logoOnP} className="h-6 w-28" />
        <div><p style={B({ fontSize: 9, letterSpacing: ".2em" })}>NOVIDADE</p><p style={T({ fontSize: 26, lineHeight: 1.02 })} className="mt-1">{slogan}</p></div>
      </div>
      {/* stories com padrão */}
      <div className={`${cell} aspect-[9/16] p-5 flex flex-col justify-end`} style={{ backgroundImage: `url("${pat}")`, backgroundSize: "cover" }}>
        <div className="rounded-xl p-3" style={{ background: C["Claro"], color: C["Escuro"] }}><p style={T({ fontSize: 16 })}>{name}</p><p style={B({ fontSize: 10 })} className="opacity-70">arraste para cima</p></div>
      </div>
      {/* perfil */}
      <div className={`${cell} aspect-[4/5] p-5 flex flex-col items-center justify-center gap-3 bg-white`}>
        <div className="w-24 h-24 rounded-full grid place-items-center p-5" style={{ background: C["Escuro"] }}><Logo svg={smallW} className="w-full h-full" /></div>
        <p style={B({ fontSize: 12, fontWeight: 600, color: "#111" })}>@{name.toLowerCase().replace(/\s+/g, "")}</p>
        <div className="flex gap-1.5">{[C["Primária"], C["Apoio"], C["Destaque"]].map((c) => <span key={c} className="w-9 h-9 rounded-full border-2 border-white shadow" style={{ background: c }} />)}</div>
        <p style={B({ fontSize: 9, color: "#777" })}>destaques</p>
      </div>
      {/* cartão */}
      <div className={`${cell} aspect-[4/5] p-4 flex flex-col justify-center gap-3`} style={{ background: C["Apoio"] }}>
        <div className="aspect-[85/55] rounded-md shadow-xl bg-white p-3 flex flex-col justify-between -rotate-3"><Logo svg={logo} className="h-5 w-24" /><div style={B({ fontSize: 7, color: "#333" })}><p className="font-semibold">Nome Sobrenome</p><p>contato@{name.toLowerCase().replace(/\s+/g, "")}.com.br</p></div></div>
        <div className="aspect-[85/55] rounded-md shadow-xl rotate-2" style={{ backgroundImage: `url("${pat}")`, backgroundSize: "cover" }} />
      </div>
      {/* sacola */}
      <div className={`${cell} aspect-[4/5] grid place-items-center`} style={{ background: C["Claro"] }}>
        <div className="relative w-[62%] aspect-[3/4] mt-6">
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 w-[40%] h-9 border-[5px] border-b-0 rounded-t-full" style={{ borderColor: C["Escuro"] }} />
          <div className="absolute inset-0 shadow-xl grid place-items-center p-4" style={{ background: C["Primária"] }}><Logo svg={logoOnP} className="w-full h-10" /></div>
        </div>
      </div>
      {/* etiqueta */}
      <div className={`${cell} aspect-[4/5] grid place-items-center bg-[#e9e6df]`}>
        <div className="w-[46%] aspect-[1/2] rounded-md shadow-xl relative flex flex-col items-center justify-between py-5 px-3" style={{ background: C["Escuro"] }}>
          <span className="absolute top-2 w-2.5 h-2.5 rounded-full bg-[#e9e6df]" />
          <div className="w-full h-12 mt-4"><Logo svg={smallW} className="w-full h-full" /></div>
          <p style={B({ fontSize: 8, color: "#fff", letterSpacing: ".15em" })}>{name.toUpperCase()}</p>
        </div>
      </div>
      {/* fachada */}
      <div className={`${cell} aspect-[4/5] flex flex-col`} style={{ background: "#cfcac1" }}>
        <div className="h-[30%] grid place-items-center px-5" style={{ background: C["Escuro"] }}><Logo svg={logoW} className="w-full h-9" /></div>
        <div className="flex-1 grid grid-cols-3 gap-1 p-3"><span className="bg-[#8fa3ad]/60 col-span-2" /><span className="bg-[#5d4b3c]" /></div>
      </div>
      {/* embalagem */}
      <div className={`${cell} aspect-[4/5] grid place-items-center`} style={{ background: C["Apoio"] }}>
        <div className="w-[64%] aspect-square shadow-2xl relative overflow-hidden" style={{ background: C["Claro"] }}>
          <div className="absolute inset-x-0 top-0 h-[38%]" style={{ backgroundImage: `url("${pat}")`, backgroundSize: "cover" }} />
          <div className="absolute inset-x-0 bottom-0 h-[62%] grid place-items-center p-4"><Logo svg={logo} className="w-full h-8" /></div>
        </div>
      </div>
    </div>
  );
}
