"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CANVA_BRAND_KIT, download, loadImg, primaryLogo, svgUrl, svgWithFonts, type Logo, type Swatch } from "@/lib/design";
import { FORMATS, Presenter, PrintDeck, STYLES, ScaledSlide, styleFor, useDeck, type DeckStyle, type Format } from "./Presentation";
import LogoMotion from "./LogoMotion";
import { useMockups } from "./MockupView";
import { I } from "@/components/icons";
import type { StepProps } from "./types";
import LinkApresentacao from "../briefing/LinkApresentacao";
import BrandAIPanel from "./BrandAIPanel";
import { printAll } from "./lazy";
import { VideoControls } from "./Motion";

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
  const mockups = useMockups();
  const { x, slides } = useDeck(d, format, mockups || []);
  const [show, setShow] = useState<number | null>(null);
  const ent = d.entrega || {};
  const setEnt = (patch: any) => set({ entrega: { ...ent, ...patch } });
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
      {/* primeira seção: agrupada pelo que a pessoa quer fazer (apresentar, vídeo, arquivos, usar) */}
      <div className="card p-4 sm:p-5 print:hidden">
        <div className="grid gap-5 md:grid-cols-2">
          <section className="space-y-3">
            <Eyebrow>Apresentação</Eyebrow>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShow(0)} className="btn btn-mint btn-sm"><I.play className="w-3.5 h-3.5" />Apresentar</button>
              <button onClick={printAll} className="btn btn-ghost btn-sm"><I.download className="w-3.5 h-3.5" />Salvar PDF</button>
            </div>
            <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-2 gap-y-2">
              <span className="text-[11px] text-fog">Formato</span>
              <div className="flex flex-wrap gap-1.5">{(Object.keys(FORMATS) as Format[]).map((k) => <button key={k} onClick={() => { setFormat(k); set({ deck_format: k }); }} className={`chip !px-3 !py-1 ${format === k ? "chip-mint" : ""}`} title={FORMATS[k].l}>{k}</button>)}</div>
              <span className="text-[11px] text-fog">Estilo</span>
              <div className="flex flex-wrap gap-1.5">{(Object.keys(STYLES) as DeckStyle[]).map((k) => <button key={k} onClick={() => set({ deck_style: k })} className={`chip !px-3 !py-1 ${styleFor(d) === k ? "chip-mint" : ""}`} title={STYLES[k].d}>{STYLES[k].l}</button>)}</div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">{slides.length} slides · {STYLES[styleFor(d)].l}{d.deck_style ? "" : " (pelo nicho)"}: {STYLES[styleFor(d)].d}</p>
            <details className="text-[11px] text-fog">
              <summary className="cursor-pointer select-none hover:text-paper">Como salvar o PDF</summary>
              <p className="mt-1 leading-relaxed">Na janela de impressão, escolha &quot;Salvar como PDF&quot; e ative &quot;Gráficos de fundo&quot;; o tamanho da página já vem certo. Para apresentar a partir de um slide, toque nele na lista abaixo.</p>
            </details>
          </section>

          <section className="space-y-3 md:border-l md:border-line md:pl-5 border-t border-line pt-4 md:border-t-0 md:pt-0">
            <Eyebrow>Vídeo da marca</Eyebrow>
            <div className="flex flex-wrap items-center gap-2"><VideoControls x={x} slides={slides} name={name} d={d} /></div>
            <p className="text-[11px] text-fog leading-relaxed">A mesma apresentação em movimento, com a vinheta de abertura. Curto para redes, completo para o cliente.</p>
          </section>

          <section className="space-y-3 border-t border-line pt-4">
            <Eyebrow>Arquivos da marca</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {logo && <button onClick={() => logoFile("svg")} className="btn btn-ghost btn-sm"><I.download className="w-3.5 h-3.5" />Logo SVG</button>}
              {logo && <button onClick={() => logoFile("png")} className="btn btn-ghost btn-sm"><I.download className="w-3.5 h-3.5" />Logo PNG</button>}
              <button onClick={copyKit} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar cores e fontes</button>
            </div>
            {msg && <p className="text-xs text-fog">{msg}</p>}
          </section>

          <section className="space-y-3 border-t border-line pt-4 md:border-l md:pl-5">
            <Eyebrow>Usar a marca</Eyebrow>
            <div className="flex flex-wrap gap-2">
              <button onClick={carrossel} className="btn btn-ghost btn-sm"><I.cards className="w-3.5 h-3.5" />Criar carrossel com a marca</button>
              <a href={CANVA_BRAND_KIT} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Kit de Marca no Canva ↗</a>
            </div>
          </section>
        </div>
      </div>

      <LinkApresentacao id={id} d={d} set={set} />

      <BrandAIPanel d={d} set={set} />

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
      <PrintDeck x={x} slides={slides} />
      {show !== null && <Presenter x={x} slides={slides} start={show} onClose={() => setShow(null)} />}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-fog">{children}</p>;
}
