"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AXES, CANVA_BRAND_KIT, LOCKUPS, cmyk, download, hexToRgb, loadFonts, loadImg, lockupSvg, monoSvg, patternSvg, primaryLogo, readableOn, svgParts, svgUrl, svgWithFonts, type Logo, type Pattern, type Swatch } from "@/lib/design";
import { ARCHETYPES, MAP_AXES, NICHES, SCALES } from "@/lib/brand-strategy";
import Mockups from "./Mockups";
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
  const sys = primaryLogo(d);
  const pick = logos.find((l) => l.id === (d.symbol_id || d.logo_id)) || logos[0];
  const logo: Logo | undefined = sys ? { id: "sistema", name: "Assinatura", svg: sys, source: "construtor" } as Logo : pick;
  const st = d.strategy || {};
  const niche = NICHES.find((n) => n.k === st.nicho);
  const arcs = ARCHETYPES.filter((a) => (st.arquetipos || []).includes(a.k));
  const terr = (d.territories || []).find((x: any) => x.id === d.territory_id);
  const ax: [string, string] = st.eixos || ["preco", "tom"];
  const A = (k: string) => MAP_AXES.find((m) => m[0] === k) || MAP_AXES[0];
  const cons = d.construcao || { x: 25, min_px: 24, min_mm: 10 };
  const locks = LOCKUPS.filter((k) => (k.k === "monograma" ? !!d.monogram : k.k === "logotipo" ? !!d.logotype : k.k === "simbolo" ? !!(d.symbol_id || d.logo_id) : !!d.logotype && !!(d.symbol_id || d.logo_id)));
  const pat: Pattern = { source: d.monogram ? "monograma" : "simbolo", scale: 120, gap: 60, rotate: 0, offset: true, opacity: 1, bg: C["Primária"], fg: C["Escuro"], ...(d.pattern || {}) };
  const hasPat = !!(d.symbol_id || d.logo_id || d.monogram);
  const ratio = t.scale || 1.25, base = t.base || 16;
  const arr = (v: any): string[] => (Array.isArray(v) ? v : v ? [v] : []);
  let pn = 0; const nx = () => String(++pn).padStart(2, "0");
  const Svg = ({ svg, h }: { svg: string; h: string }) => <SvgView svg={svg} className={h} />;
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
          <H n={nx()}>Essência</H>
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

        {/* manifesto e voz (documento mestre, mesmo do briefing do Creator) */}
        {(b.frase_mae || b.manifesto || b.arquetipo || b.matriz_tom) && (
          <Pad bg={C["Escuro"]}>
            <div className="flex items-baseline gap-3 mb-5"><span className="font-mono text-xs" style={{ color: C["Primária"] }}>{nx()}</span><h2 className="text-3xl" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw, color: C["Claro"] }}>Manifesto e voz</h2></div>
            <div className="grid grid-cols-5 gap-[4%] flex-1 min-h-0 text-[12px]" style={{ fontFamily: `"${t.body}"`, color: C["Claro"] }}>
              <div className="col-span-3 min-h-0 overflow-hidden">
                {b.frase_mae && <p className="text-xl leading-snug mb-4" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw, color: C["Primária"] }}>{b.frase_mae}</p>}
                {b.manifesto && <p className="whitespace-pre-line leading-snug opacity-80 text-[11px] columns-2 gap-6">{b.manifesto}</p>}
              </div>
              <div className="col-span-2 space-y-3 min-h-0 overflow-hidden">
                {b.arquetipo && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Arquétipo</p><p className="mt-1">{b.arquetipo}</p></div>}
                {b.territorio && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Território</p><p className="mt-1">{b.territorio}</p></div>}
                {b.matriz_tom && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Tom de voz</p><p className="mt-1 whitespace-pre-line">{b.matriz_tom}</p></div>}
                {!!arr(b.nao_e).length && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">A marca não é</p><p className="mt-1">{arr(b.nao_e).join(" · ")}</p></div>}
                {!!arr(b.regras_ouro).length && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Regras de ouro</p><p className="mt-1">{arr(b.regras_ouro).join(" · ")}</p></div>}
              </div>
            </div>
          </Pad>
        )}

        {/* estratégia */}
        {(niche || arcs.length || terr || st.posicao) && (
          <Pad>
            <H n={nx()}>Estratégia</H>
            <div className="grid grid-cols-[1fr_1.1fr] gap-[5%] flex-1 text-sm" style={{ fontFamily: `"${t.body}"` }}>
              <div className="space-y-4">
                {niche && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Nicho</p><p className="mt-1 font-semibold">{niche.l}</p><p className="mt-1 text-xs opacity-75 leading-relaxed">{st.codigo === "quebrar" ? `Quebramos o código: ${niche.quebrar}` : `Seguimos o código com mais qualidade: ${niche.codigos}`}</p></div>}
                {!!arcs.length && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Arquétipo</p><p className="mt-1 font-semibold">{arcs.map((a) => a.l).join(" + ")}</p><p className="text-xs opacity-75">{arcs.map((a) => a.d).join(" ")}</p></div>}
                {terr && <div className="rounded-xl p-4" style={{ background: C["Primária"], color: readableOn(C["Primária"]) }}><p className="font-mono text-[10px] uppercase tracking-widest opacity-70">Território criativo</p><p className="text-xl mt-1" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>{terr.nome}</p><p className="text-xs mt-1 leading-relaxed opacity-90">{terr.ideia}</p></div>}
              </div>
              <div className="flex flex-col">
                <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-2">Posição no mapa</p>
                <div className="relative flex-1 rounded-xl border border-black/10" style={{ background: C["Claro"] }}>
                  <span className="absolute left-1/2 inset-y-0 w-px bg-black/10" /><span className="absolute top-1/2 inset-x-0 h-px bg-black/10" />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase opacity-50">{A(ax[0])[1]}</span><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase opacity-50">{A(ax[0])[2]}</span>
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase opacity-50">{A(ax[1])[2]}</span><span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase opacity-50">{A(ax[1])[1]}</span>
                  {(st.mapa || []).map((p: any) => <span key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] whitespace-nowrap" style={{ left: `${p.x}%`, top: `${p.y}%`, fontWeight: p.me ? 700 : 400 }}><span className="rounded-full" style={{ width: p.me ? 12 : 8, height: p.me ? 12 : 8, background: p.me ? C["Primária"] : "#999" }} />{p.me ? name : p.name}</span>)}
                </div>
                {st.posicao && <p className="text-xs mt-2 leading-relaxed">{st.posicao}</p>}
              </div>
            </div>
          </Pad>
        )}

        {/* 03 logo */}
        <Pad>
          <H n={nx()}>Logo</H>
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
          <p className="text-xs mt-4 opacity-70" style={{ fontFamily: `"${t.body}"` }}>Use a versão colorida sobre fundos claros, a branca sobre fundos escuros e a de uma cor em carimbo, bordado e gravação. Tamanho mínimo: {cons.min_px} px de altura na tela e {cons.min_mm} mm no impresso. A área de proteção ao redor é a unidade x ({cons.x}% da altura da assinatura).</p>
        </Pad>

        {/* assinaturas */}
        {locks.length > 1 && (
          <Pad>
            <H n={nx()}>Assinaturas</H>
            <div className={`grid gap-3 flex-1 ${locks.length > 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {locks.map((k, i) => (
                <div key={k.k} className="flex flex-col">
                  <div className="flex-1 rounded-xl grid place-items-center p-[8%]" style={{ background: i % 2 ? C["Escuro"] : C["Claro"] }}><Svg svg={lockupSvg(k.k, d, i % 2 ? "#ffffff" : undefined)} h="w-full h-full max-h-24" /></div>
                  <p className="text-[11px] mt-1.5"><b>{k.l}{(d.principal || "horizontal") === k.k ? " · principal" : ""}</b> <span className="opacity-60">{k.d}</span></p>
                </div>
              ))}
            </div>
          </Pad>
        )}

        {/* construção */}
        {sys && (() => { const sp = svgParts(sys); const x = (Math.min(sp.w, sp.h) * cons.x) / 100; const M = x * 1.3; const u = x / 2; const g: string[] = [];
          for (let gx = -M; gx <= sp.w + M; gx += u) g.push(`<line x1="${gx}" y1="${-M}" x2="${gx}" y2="${sp.h + M}" stroke="${C["Primária"]}" stroke-opacity=".25" stroke-width="${sp.w / 900}"/>`);
          for (let gy = -M; gy <= sp.h + M; gy += u) g.push(`<line x1="${-M}" y1="${gy}" x2="${sp.w + M}" y2="${gy}" stroke="${C["Primária"]}" stroke-opacity=".25" stroke-width="${sp.w / 900}"/>`);
          const ov = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-M} ${-M} ${sp.w + 2 * M} ${sp.h + 2 * M}">${g.join("")}<svg x="0" y="0" width="${sp.w}" height="${sp.h}" viewBox="${sp.vb}">${sp.inner}</svg><rect x="${-x}" y="${-x}" width="${sp.w + 2 * x}" height="${sp.h + 2 * x}" fill="none" stroke="#e03131" stroke-dasharray="${x / 4} ${x / 6}" stroke-width="${sp.w / 500}"/></svg>`;
          return (
            <Pad>
              <H n={nx()}>Construção</H>
              <div className="grid grid-cols-[1.6fr_1fr] gap-[4%] flex-1">
                <div className="rounded-xl grid place-items-center p-4" style={{ background: C["Claro"] }}><Svg svg={ov} h="w-full h-full" /></div>
                <div className="flex flex-col justify-between text-xs" style={{ fontFamily: `"${t.body}"` }}>
                  <div className="space-y-3">
                    <p><b>Grade modular.</b> Módulo de meia unidade x. Toda forma e espaço da assinatura se alinha a ela.</p>
                    <p><b>Área de proteção (x).</b> {cons.x}% da altura. Nenhum texto ou imagem entra na linha vermelha.</p>
                    <p><b>Redução mínima.</b> {cons.min_px} px na tela e {cons.min_mm} mm no impresso. Abaixo disso, use o {d.monogram ? "monograma" : "símbolo"}.</p>
                  </div>
                  <div className="flex items-end gap-4">{[48, 32, cons.min_px].map((h, i) => <div key={i} className="text-center"><div style={{ height: h, width: (h * sp.w) / sp.h }}><Svg svg={sys} h="w-full h-full" /></div><p className="text-[9px] opacity-60 mt-1">{h}px</p></div>)}</div>
                </div>
              </div>
            </Pad>
          ); })()}

        {/* 04 cores */}
        <Pad>
          <H n={nx()}>Cores</H>
          <div className="grid grid-cols-5 gap-3 flex-1">
            {(pal.length ? pal : Object.entries(C).map(([role, hex]) => ({ role, hex }))).map((s) => { const [r, g, bb] = hexToRgb(s.hex); return (
              <div key={s.role + s.hex} className="rounded-xl overflow-hidden flex flex-col border border-black/10">
                <div className="flex-1 p-3" style={{ background: s.hex, color: readableOn(s.hex) }}><p className="font-mono text-[10px] uppercase tracking-widest opacity-80">{s.role}</p></div>
                <div className="p-3 font-mono text-[10px] leading-relaxed"><p className="font-bold text-xs">{s.hex.toUpperCase()}</p><p>RGB {r} {g} {bb}</p><p>CMYK {cmyk(s.hex).join(" ")}</p></div>
              </div>
            ); })}
          </div>
          <div className="flex h-3 rounded-full overflow-hidden mt-4"><span style={{ width: "60%", background: C["Claro"] }} className="border border-black/10" /><span style={{ width: "30%", background: C["Primária"] }} /><span style={{ width: "10%", background: C["Destaque"] }} /></div>
          <p className="text-xs mt-2 opacity-70">Proporção: {b.proporcao || "60% neutros, 30% primária e apoio, 10% destaque"}. {!!arr(b.regras_visuais).length && <>Regras: {arr(b.regras_visuais).join(" · ")}. </>}CMYK é aproximado; confirme com a gráfica.</p>
        </Pad>

        {/* 05 tipografia */}
        <Pad>
          <H n={nx()}>Tipografia</H>
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
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mt-5">Escala · {SCALES.find((x) => x.k === ratio)?.l.split(":")[0] || ratio}</p>
              <p className="font-mono text-[11px] mt-1">{[5, 4, 3, 2, 1, 0, -1].map((n) => Math.round(base * ratio ** n)).join(" · ")} px</p>
            </div>
          </div>
        </Pad>

        {/* grafismos */}
        {hasPat && (
          <Pad>
            <H n={nx()}>Grafismos</H>
            <div className="grid grid-cols-[1.4fr_1fr] gap-4 flex-1">
              <div className="rounded-xl overflow-hidden"><Svg svg={patternSvg(d, pat, 1200, 800)} h="w-full h-full" /></div>
              <div className="flex flex-col gap-3">
                <div className="flex-1 rounded-xl overflow-hidden"><Svg svg={patternSvg(d, { ...pat, bg: C["Claro"], fg: C["Primária"], opacity: .35 }, 600, 400)} h="w-full h-full" /></div>
                <p className="text-xs opacity-70" style={{ fontFamily: `"${t.body}"` }}>O padrão nasce do {pat.source === "monograma" ? "monograma" : "símbolo"}. Use cheio em embalagens e fundos de destaque, e na versão sutil atrás de texto.</p>
              </div>
            </div>
          </Pad>
        )}

        {/* aplicações */}
        <Pad bg={C["Claro"]}>
          <H n={nx()}>Aplicações</H>
          <div className="flex-1 overflow-hidden"><Mockups d={d} compact /></div>
        </Pad>

        {/* verbal */}
        {(arr(b.fala).length || arr(b.nunca).length || b.missao || arr(b.pilares).length) && (
          <Pad>
            <H n={nx()}>Identidade verbal</H>
            <div className="grid grid-cols-2 gap-[5%] flex-1 text-sm" style={{ fontFamily: `"${t.body}"` }}>
              <div className="space-y-4">
                {b.missao && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Missão</p><p className="text-xl mt-1 leading-snug" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw }}>{b.missao}</p></div>}
                {!!arr(b.pilares).length && <div><p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Pilares</p><div className="flex gap-2 mt-2">{arr(b.pilares).map((p, i) => <div key={p} className="flex-1 rounded-lg p-3 border border-black/10"><p className="font-mono text-[10px]" style={{ color: C["Primária"] }}>0{i + 1}</p><p className="font-semibold mt-1">{p}</p></div>)}</div></div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: C["Claro"] }}><p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C["Primária"] }}>A marca fala</p><ul className="mt-2 space-y-2">{arr(b.fala).map((f) => <li key={f}>“{f}”</li>)}</ul></div>
                <div className="rounded-xl p-4 border border-black/10"><p className="font-mono text-[10px] uppercase tracking-widest text-[#e03131]">A marca nunca diz</p><ul className="mt-2 space-y-2 line-through opacity-70">{arr(b.nunca).map((f) => <li key={f}>{f}</li>)}</ul></div>
              </div>
            </div>
          </Pad>
        )}

        {/* 07 não fazer */}
        <Pad>
          <H n={nx()}>Não fazer</H>
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
