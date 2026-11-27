"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CANVA_BRAND_KIT, download, loadImg, primaryLogo, svgUrl, svgWithFonts, type Logo, type Swatch } from "@/lib/design";
import { FORMATS, Presenter, ScaledSlide, useDeck, type Format } from "./Presentation";
import LogoMotion from "./LogoMotion";
import { I } from "@/components/icons";
import type { StepProps } from "./types";

/* processo de entrega (Design Academy): escopo, apresentação e aprovação, entrega dos arquivos */
const ENTREGAVEIS = ["Logo principal (SVG e PNG)", "Versões e assinaturas", "Monograma e favicon", "Paleta com HEX, RGB e CMYK", "Fontes e onde baixar", "Grafismo", "Apresentação em PDF", "Logo animado (vídeo)"];

const fontsOf = (svg: string) => Array.from(new Set(Array.from(svg.matchAll(/font-family="([^"]+)"/g)).map((m) => m[1].split(",")[0].replace(/['"]/g, "").trim())));

export default function ManualStep({ d, id, set }: StepProps) {
  const router = useRouter();
  const b = d.brief || {};
  const pal: Swatch[] = d.palette || [];
  const t = d.type || { title: "Bricolage Grotesque", body: "Inter", tw: 800 };
  const logos: Logo[] = d.logos || [];
  const sys = primaryLogo(d);
  const pick = logos.find((l) => l.id === (d.symbol_id || d.logo_id)) || logos[0];
  const logo: Logo | undefined = sys ? { id: "sistema", name: "Assinatura", svg: sys, source: "construtor" } as Logo : pick;
  const name = b.nome || "Marca";
  const [msg, setMsg] = useState("");
  const [format, setFormat] = useState<Format>((d.deck_format as Format) in FORMATS ? d.deck_format : "16:9");
  const { x, slides } = useDeck(d, format);
  const [show, setShow] = useState<number | null>(null);
  const ent = d.entrega || {};
  const setEnt = (patch: any) => set({ entrega: { ...ent, ...patch } });
  useEffect(() => {
    // cada slide vira uma página do PDF no tamanho do formato escolhido
    const st = document.createElement("style");
    st.textContent = `@media print { @page { size: ${x.W}px ${x.H}px; margin: 0; } .deck-wrap { height: auto !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; break-after: page; } .deck-scale { transform: none !important; } .deck-slide { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .deck-list { gap: 0 !important; } }`;
    document.head.appendChild(st); return () => st.remove();
  }, [x.W, x.H]);

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

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap gap-2 items-center print:hidden">
        <div className="flex gap-1.5 mr-2">{(Object.keys(FORMATS) as Format[]).map((k) => <button key={k} onClick={() => { setFormat(k); set({ deck_format: k }); }} className={`chip !px-3 !py-1.5 ${format === k ? "chip-mint" : ""}`} title={FORMATS[k].l}>{k}</button>)}</div>
        <button onClick={() => setShow(0)} className="btn btn-mint btn-sm"><I.play className="w-3.5 h-3.5" />Apresentar</button>
        <button onClick={() => window.print()} className="btn btn-ghost btn-sm"><I.download className="w-3.5 h-3.5" />Salvar PDF</button>
        {logo && <button onClick={() => logoFile("svg")} className="btn btn-ghost btn-sm">Logo SVG</button>}
        {logo && <button onClick={() => logoFile("png")} className="btn btn-ghost btn-sm">Logo PNG</button>}
        <button onClick={copyKit} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar cores e fontes</button>
        <a href={CANVA_BRAND_KIT} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Kit de Marca no Canva ↗</a>
        <button onClick={carrossel} className="btn btn-ghost btn-sm ml-auto"><I.cards className="w-3.5 h-3.5" />Criar carrossel com a marca</button>
        {msg && <p className="w-full text-xs text-fog">{msg}</p>}
        <p className="w-full text-[11px] text-fog">{slides.length} slides em {FORMATS[format].l}. No PDF, escolha "Salvar como PDF" e ative "Gráficos de fundo"; o tamanho da página já vem certo. Clique num slide para apresentar a partir dele.</p>
      </div>

      <LogoMotion d={d} name={name} />

      <div className="card p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="font-semibold text-sm mr-auto">Aprovação e entrega</p>
          {ent.aprovado
            ? <span className="chip chip-mint">Aprovada pelo cliente em {new Date(ent.aprovado).toLocaleDateString("pt-BR")}</span>
            : <button onClick={() => setEnt({ aprovado: new Date().toISOString() })} className="btn btn-ghost btn-sm">Marcar como aprovada pelo cliente</button>}
          {ent.aprovado && <button onClick={() => setEnt({ aprovado: null })} className="text-xs text-fog underline">desfazer</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">{ENTREGAVEIS.map((e) => (
          <label key={e} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={!!ent.itens?.[e]} onChange={(ev) => setEnt({ itens: { ...(ent.itens || {}), [e]: ev.target.checked } })} />{e}</label>
        ))}</div>
        <p className="text-[11px] text-fog mt-2">{Object.values(ent.itens || {}).filter(Boolean).length} de {ENTREGAVEIS.length} entregues. Apresente, colete o ok do cliente e só então envie os arquivos.</p>
      </div>

      <div className="deck-list space-y-6">
        {slides.map((s, i) => <div key={s.key} onClick={() => setShow(i)} className="cursor-zoom-in"><ScaledSlide x={x} s={s} n={i + 1} total={slides.length} /></div>)}
      </div>
      {show !== null && <Presenter x={x} slides={slides} start={show} onClose={() => setShow(null)} />}
    </div>
  );
}
