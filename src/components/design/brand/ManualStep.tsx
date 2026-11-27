"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AXES, CANVA_BRAND_KIT, cmyk, download, hexToRgb, loadFonts, loadImg, monoSvg, readableOn, svgUrl, svgWithFonts, type Logo, type Swatch } from "@/lib/design";
import { I } from "@/components/icons";
import { SvgView } from "../ui";
import type { StepProps } from "./types";

const fontsOf = (svg: string) => Array.from(new Set(Array.from(svg.matchAll(/font-family="([^"]+)"/g)).map((m) => m[1].split(",")[0].replace(/['"]/g, "").trim())));

export default function ManualStep({ d, id }: StepProps) {
  const router = useRouter();
  const b = d.brief || {};
  const pal: Swatch[] = d.palette || [];
  const C: Record<string, string> = { Primária: "#2d6a4f", Apoio: "#52796f", Destaque: "#e9c46a", Escuro: "#141414", Claro: "#f4f4f2", ...Object.fromEntries(pal.map((s) => [s.role, s.hex])) };
  const t = d.type || { title: "Bricolage Grotesque", body: "Inter", tw: 800 };
  const logos: Logo[] = d.logos || [];
  const logo = logos.find((l) => l.id === d.logo_id) || logos[0];
  const name = b.nome || "Marca";
  const [msg, setMsg] = useState("");
  useEffect(() => { loadFonts([t.title, t.body]); }, [t.title, t.body]);

  const L = ({ v, h, color }: { v?: "mono" | "inv"; h: string; color?: string }) => !logo ? <p style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw, color: color || C["Escuro"] }} className="text-4xl">{name}</p>
    : logo.svg ? <SvgView svg={v === "inv" ? monoSvg(logo.svg, "#ffffff") : v === "mono" ? monoSvg(logo.svg, color || "#141414") : logo.svg} className={h} />
    : <img src={logo.img} alt="" className={`${h} object-contain`} style={v === "inv" ? { filter: "brightness(0) invert(1)" } : v === "mono" ? { filter: "brightness(0)" } : {}} />;

  async function logoFile(kind: "svg" | "png") {
    if (!logo) return;
    if (logo.img) { download(logo.img, `${name}-logo.${logo.img.startsWith("data:image/png") ? "png" : "jpg"}`); return; }
    setMsg("Preparando o arquivo…");
    const full = await svgWithFonts(logo.svg!, fontsOf(logo.svg!));
    if (kind === "svg") { download(URL.createObjectURL(new Blob([full], { type: "image/svg+xml" })), `${name}-logo.svg`); setMsg(""); return; }
    const img = await loadImg(svgUrl(full)); const w = 2000, h = Math.round((img.height / img.width) * 2000) || 1000;
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    download(c.toDataURL("image/png"), `${name}-logo.png`); setMsg("");
  }
  async function copyKit() {
    const txt = `${name}\nCores:\n${pal.map((s) => `${s.role}: ${s.hex.toUpperCase()}`).join("\n")}\nFontes: título ${t.title}, texto ${t.body}`;
    await navigator.clipboard.writeText(txt); setMsg("Cores e fontes copiadas. No Canva: Kit de Marca > adicionar cores e fontes.");
  }
  async function carrossel() {
    const { data } = await createClient().from("design_projects").insert({ kind: "carrossel", title: `Carrossel · ${name}`, brand_id: id, step: "edicao" }).select("id").single();
    if (data) router.push(`/design/pecas/${data.id}`);
  }

  const page = "manual-page bg-white text-[#141414] rounded-2xl overflow-hidden relative aspect-[297/210] w-full";
  const H = ({ n, children }: { n: string; children: React.ReactNode }) => (
    <div className="flex items-baseline gap-3 mb-6"><span className="font-mono text-xs" style={{ color: C["Primária"] }}>{n}</span><h2 className="text-3xl" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>{children}</h2></div>
  );
  const Pad = ({ children, bg }: { children: React.ReactNode; bg?: string }) => <div className={page} style={{ background: bg }}><div className="absolute inset-0 p-[5%] flex flex-col">{children}</div><span className="absolute bottom-[3%] right-[4%] font-mono text-[10px] opacity-50">{name} · Manual de marca</span></div>;

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap gap-2 items-center print:hidden">
        <button onClick={() => window.print()} className="btn btn-mint btn-sm"><I.download className="w-3.5 h-3.5" />Salvar PDF</button>
        {logo && <button onClick={() => logoFile("svg")} className="btn btn-ghost btn-sm">Logo SVG</button>}
        {logo && <button onClick={() => logoFile("png")} className="btn btn-ghost btn-sm">Logo PNG</button>}
        <button onClick={copyKit} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar cores e fontes</button>
        <a href={CANVA_BRAND_KIT} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Kit de Marca no Canva ↗</a>
        <button onClick={carrossel} className="btn btn-ghost btn-sm ml-auto"><I.cards className="w-3.5 h-3.5" />Criar carrossel com a marca</button>
        {msg && <p className="w-full text-xs text-fog">{msg}</p>}
        <p className="w-full text-[11px] text-fog">No PDF, escolha "Salvar como PDF", paisagem e ative "Gráficos de fundo".</p>
      </div>

      <div className="space-y-5 print:space-y-0">
        {/* 01 capa */}
        <Pad bg={C["Claro"]}>
          <div className="flex-1 grid place-items-center"><L h="h-40 w-[70%]" /></div>
          <div className="flex justify-between items-end">
            <div><p className="font-mono text-[11px] tracking-[.2em] uppercase opacity-60">Manual de marca</p><p className="text-xl mt-1" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>{name}</p></div>
            <p className="font-mono text-[11px] opacity-60">v1 · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          </div>
        </Pad>

        {/* 02 essência */}
        <Pad>
          <H n="01">Essência</H>
          <div className="grid grid-cols-2 gap-[5%] flex-1 text-sm" style={{ fontFamily: `"${t.body}"` }}>
            <div className="space-y-4">
              {b.oque && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">O que fazemos</p><p className="mt-1 leading-relaxed">{b.oque}</p></div>}
              {b.proposito && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Por que existimos</p><p className="mt-1 leading-relaxed">{b.proposito}</p></div>}
              {b.publico && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Para quem</p><p className="mt-1 leading-relaxed">{b.publico}</p></div>}
              {!!b.valores?.length && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Valores</p><p className="mt-1">{b.valores.join(" · ")}</p></div>}
            </div>
            <div>
              {!!b.palavras?.length && <div className="flex flex-wrap gap-2 mb-5">{b.palavras.map((p: string) => <span key={p} className="px-3 py-1 rounded-full text-sm" style={{ background: C["Primária"], color: readableOn(C["Primária"]) }}>{p}</span>)}</div>}
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-2">Personalidade</p>
              <div className="space-y-2">
                {AXES.map(([k, a, z]) => { const v = b.eixos?.[k] ?? 50; return (
                  <div key={k} className="flex items-center gap-2 text-xs"><span className="w-20 text-right opacity-70">{a}</span><div className="flex-1 h-1.5 rounded-full bg-black/10 relative"><span className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ left: `calc(${v}% - 6px)`, background: C["Primária"] }} /></div><span className="w-20 opacity-70">{z}</span></div>
                ); })}
              </div>
            </div>
          </div>
        </Pad>

        {/* 03 logo */}
        <Pad>
          <H n="02">Logo</H>
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div className="col-span-2 rounded-xl grid place-items-center relative" style={{ background: C["Claro"] }}>
              <div className="relative p-[6%] border border-dashed" style={{ borderColor: C["Primária"] }}><L h="h-24 w-72" /><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px]" style={{ color: C["Primária"] }}>área de proteção = x</span></div>
            </div>
            <div className="grid grid-rows-3 gap-3">
              <div className="rounded-xl grid place-items-center p-3" style={{ background: C["Escuro"] }}><L v="inv" h="h-12 w-40" /></div>
              <div className="rounded-xl grid place-items-center p-3" style={{ background: C["Primária"] }}><L v="mono" color={readableOn(C["Primária"])} h="h-12 w-40" /></div>
              <div className="rounded-xl grid place-items-center p-3 border border-black/10"><L v="mono" h="h-12 w-40" /></div>
            </div>
          </div>
          <p className="text-xs mt-4 opacity-70" style={{ fontFamily: `"${t.body}"` }}>Use a versão colorida sobre fundos claros, a branca sobre fundos escuros e a de uma cor em carimbo, bordado e gravação. Tamanho mínimo: 24 px de altura na tela e 10 mm no impresso. A área de proteção ao redor é a altura da letra inicial.</p>
        </Pad>

        {/* 04 cores */}
        <Pad>
          <H n="03">Cores</H>
          <div className="grid grid-cols-5 gap-3 flex-1">
            {(pal.length ? pal : Object.entries(C).map(([role, hex]) => ({ role, hex }))).map((s) => { const [r, g, bb] = hexToRgb(s.hex); return (
              <div key={s.role + s.hex} className="rounded-xl overflow-hidden flex flex-col border border-black/10">
                <div className="flex-1 p-3" style={{ background: s.hex, color: readableOn(s.hex) }}><p className="font-mono text-[10px] uppercase tracking-widest opacity-80">{s.role}</p></div>
                <div className="p-3 font-mono text-[10px] leading-relaxed"><p className="font-bold text-xs">{s.hex.toUpperCase()}</p><p>RGB {r} {g} {bb}</p><p>CMYK {cmyk(s.hex).join(" ")}</p></div>
              </div>
            ); })}
          </div>
          <div className="flex h-3 rounded-full overflow-hidden mt-4"><span style={{ width: "60%", background: C["Claro"] }} className="border border-black/10" /><span style={{ width: "30%", background: C["Primária"] }} /><span style={{ width: "10%", background: C["Destaque"] }} /></div>
          <p className="text-xs mt-2 opacity-70">Proporção: 60% neutros, 30% primária e apoio, 10% destaque. CMYK é aproximado; confirme com a gráfica.</p>
        </Pad>

        {/* 05 tipografia */}
        <Pad>
          <H n="04">Tipografia</H>
          <div className="grid grid-cols-2 gap-[5%] flex-1">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Títulos · {t.title} {t.tw}</p>
              <p className="text-7xl leading-none mt-2" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>Aa</p>
              <p className="text-lg mt-3 break-all" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
            </div>
            <div style={{ fontFamily: `"${t.body}"` }}>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Texto · {t.body}</p>
              <p className="text-3xl mt-2" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>Título de seção</p>
              <p className="text-lg font-semibold mt-2">Subtítulo em {t.body} 600</p>
              <p className="text-sm leading-relaxed mt-2 opacity-80">Texto corrido em {t.body} 400, entre 14 e 16 px na tela. Use no máximo duas famílias. Títulos curtos, frases diretas e alinhamento à esquerda.</p>
            </div>
          </div>
        </Pad>

        {/* 06 aplicações */}
        <Pad bg={C["Claro"]}>
          <H n="05">Aplicações</H>
          <div className="grid grid-cols-4 gap-4 flex-1 items-center">
            <div className="aspect-[4/5] rounded-xl p-4 flex flex-col justify-end" style={{ background: C["Primária"], color: readableOn(C["Primária"]) }}>
              <p className="font-mono text-[9px] tracking-widest">NOVIDADE</p><p className="text-xl leading-tight mt-1" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>{b.slogan || "Chegou a coleção nova"}</p>
            </div>
            <div className="grid place-items-center gap-2"><div className="w-28 h-28 rounded-full grid place-items-center p-4" style={{ background: C["Escuro"] }}><L v="inv" h="h-10 w-20" /></div><p className="text-[10px] opacity-60">foto de perfil</p></div>
            <div className="aspect-[85/55] rounded-lg shadow-lg bg-white p-4 flex flex-col justify-between"><L h="h-8 w-28" /><div className="text-[9px]" style={{ fontFamily: `"${t.body}"` }}><p className="font-semibold">Nome Sobrenome</p><p className="opacity-60">contato@{name.toLowerCase().replace(/\s+/g, "")}.com.br</p></div></div>
            <div className="aspect-[3/4] rounded-b-xl relative pt-6" style={{ background: C["Apoio"] }}><span className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-8 border-4 rounded-t-full border-b-0" style={{ borderColor: C["Escuro"] }} /><div className="h-full grid place-items-center p-4"><L v="inv" h="h-10 w-28" /></div></div>
          </div>
        </Pad>

        {/* 07 não fazer */}
        <Pad>
          <H n="06">Não fazer</H>
          <div className="grid grid-cols-4 gap-4 flex-1">
            {[["Distorcer", { transform: "scaleX(1.5)" }], ["Girar", { transform: "rotate(-18deg)" }], ["Trocar as cores", { filter: "hue-rotate(140deg)" }], ["Fundo sem contraste", { opacity: .25 }]].map(([l, st]) => (
              <div key={l as string} className="flex flex-col">
                <div className="flex-1 rounded-xl grid place-items-center p-4 relative overflow-hidden" style={{ background: C["Claro"] }}>
                  <div style={st as any}><L h="h-12 w-32" /></div>
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#e03131] text-white grid place-items-center text-sm">×</span>
                </div>
                <p className="text-xs mt-2">{l as string}</p>
              </div>
            ))}
          </div>
        </Pad>
      </div>
    </div>
  );
}
