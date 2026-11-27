"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAI } from "@/lib/useAI";
import { ALL_FONTS, SYMBOLS, briefText, buildLogo, loadFonts, monoSvg, monogramSvg, sanitizeSvg, shrink, uid, type Builder, type Logo, type Monogram } from "@/lib/design";
import { strategyText } from "@/lib/brand-strategy";
import { I } from "@/components/icons";
import { SvgView, FontSelect } from "../ui";
import type { StepProps } from "./types";

const SYM_L: Record<string, string> = { nenhum: "Sem símbolo", circulo: "Círculo", quadrado: "Quadrado", losango: "Losango", arco: "Arco", folha: "Folha", barra: "Barras" };

export default function SymbolStep({ d, set }: StepProps) {
  const logos: Logo[] = d.logos || [];
  const b = d.brief || {};
  const pal: Record<string, string> = Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex]));
  const [tab, setTab] = useState<"claude" | "construtor" | "monograma" | "arquivo">(logos.length ? "construtor" : "claude");
  const { run, busy, error } = useAI();
  const [bl, setBl] = useState<Builder>(() => ({ text: b.nome || "Marca", sub: b.slogan || "", font: d.type?.title || "Bricolage Grotesque", weight: 800, spacing: 0, upper: false, symbol: "circulo", layout: "lado", color: pal["Escuro"] || "#111111", accent: pal["Primária"] || "#6eefb6" }));
  const fileRef = useRef<HTMLInputElement>(null);
  const chosen = logos.find((l) => l.id === (d.symbol_id || d.logo_id)) || logos.find((l) => l.fav) || logos[0];
  const preview = useMemo(() => buildLogo(bl), [bl]);
  useEffect(() => { loadFonts([bl.font]); }, [bl.font]);

  const save = (next: Logo[], extra: any = {}) => set({ logos: next, ...extra });
  const add = (l: Logo) => save([l, ...logos], logos.length ? {} : { logo_id: l.id, symbol_id: l.id });
  const choose = (id: string) => set({ logo_id: id, symbol_id: id });
  const mono: Monogram = d.monogram || { letters: (b.nome || "AB").replace(/[^A-Za-zÀ-ú]/g, "").slice(0, 2).toUpperCase(), font: d.type?.title || "Playfair Display", weight: 700, shape: "circulo", overlap: 12, fg: pal["Claro"] || "#ffffff", bg: pal["Primária"] || "#111111", stack: false };
  const M = (patch: Partial<Monogram>) => set({ monogram: { ...mono, ...patch } });
  useEffect(() => { loadFonts([mono.font]); }, [mono.font]);

  async function askClaude() {
    const r: any = await run("brand_concepts", {
      brief: briefText(b), estrategia: strategyText(d), nome: b.nome || "", fonts: ALL_FONTS,
      refs: (d.refs || []).filter((x: any) => x.note).map((x: any) => `${x.tipo === "evitar" ? "Evitar" : "Inspira"}: ${x.note}`).slice(0, 15),
    });
    if (!r?.conceitos) return;
    const novos: Logo[] = r.conceitos.map((c: any) => ({ id: uid(), name: c.nome || "Conceito", note: c.ideia, svg: sanitizeSvg(c.svg || ""), source: "claude" as const })).filter((l: Logo) => l.svg);
    save([...novos, ...logos], { concepts: r.conceitos.map((c: any) => ({ nome: c.nome, paleta: c.paleta, fontes: c.fontes })), ...(logos.length ? {} : { logo_id: novos[0]?.id, symbol_id: novos[0]?.id }) });
  }

  async function upload(f: File) {
    if (f.type === "image/svg+xml" || f.name.endsWith(".svg")) {
      const svg = sanitizeSvg(await f.text()); if (svg) add({ id: uid(), name: f.name.replace(/\.svg$/i, ""), svg, source: "upload" });
    } else if (f.type.startsWith("image/")) add({ id: uid(), name: f.name.replace(/\.\w+$/, ""), img: await shrink(f, 1200, .92), source: "upload" });
  }

  const B = (k: keyof Builder, v: any) => setBl((x) => ({ ...x, [k]: v }));
  const swatches = Array.from(new Set([...Object.values(pal), "#111111", "#ffffff", "#6eefb6", "#1f3a5f", "#c8553d", "#2d6a4f", "#e9c46a", "#7b2cbf"]));

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-panel border border-line rounded-xl p-1 w-fit">
        {([["claude", "Ideias do Claude"], ["construtor", "Construtor"], ["monograma", "Monograma"], ["arquivo", "Enviar arquivo"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-[9px] text-sm font-semibold ${tab === k ? "bg-mint text-[var(--color-on-mint,#06140e)]" : "text-fog hover:text-paper"}`}>{l}</button>
        ))}
      </div>

      {tab === "claude" && (
        <section className="card p-5 rise flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1">
            <p className="font-display font-bold text-lg">Explorações a partir do território</p>
            <p className="text-sm text-fog mt-1">O Claude lê a estratégia, o território escolhido e as notas do moodboard e desenha símbolos em caminhos diferentes (abstrato, figurativo, monograma, selo), explicando a ideia de cada um. Roda pela sua assinatura: a resposta chega aqui quando o Claude responder a fila.</p>{!d.territory_id && <p className="text-xs text-fog mt-2">Dica: escolha um território antes, na etapa Conceito, para os símbolos terem intenção.</p>}
            {!b.nome && <p className="text-xs text-danger mt-2">Preencha ao menos o nome da marca no briefing.</p>}
            {error && <p className="text-xs text-danger mt-2">{error}</p>}
          </div>
          <button onClick={askClaude} disabled={busy || !b.nome} className="btn btn-mint shrink-0"><I.spark className="w-4 h-4" />{busy ? "Esperando o Claude…" : "Pedir símbolos"}</button>
        </section>
      )}

      {tab === "construtor" && (
        <section className="card p-5 rise grid lg:grid-cols-[1fr_340px] gap-5">
          <div className="rounded-xl grid place-items-center p-8 min-h-64" style={{ background: pal["Claro"] || "#f4f4f2" }}>
            <SvgView svg={preview} className="w-full h-48" fonts={[bl.font]} />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><label className="label">Nome</label><input value={bl.text} onChange={(e) => B("text", e.target.value)} className="input" /></div>
              <div className="col-span-2"><label className="label">Linha de apoio (opcional)</label><input value={bl.sub} onChange={(e) => B("sub", e.target.value)} className="input" placeholder="Ex.: moda feminina" /></div>
              <div className="col-span-2"><label className="label">Fonte</label>
                <FontSelect value={bl.font} onChange={(f) => B("font", f)} /></div>
              <div><label className="label">Peso</label><select value={bl.weight} onChange={(e) => B("weight", +e.target.value)} className="input">{[400, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
              <div><label className="label">Espaçamento</label><input type="range" min={-5} max={40} value={bl.spacing} onChange={(e) => B("spacing", +e.target.value)} className="w-full accent-[var(--color-mint)] mt-3" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => B("upper", !bl.upper)} className={`chip !px-3 !py-1.5 ${bl.upper ? "chip-mint" : ""}`}>CAIXA ALTA</button>
              <button onClick={() => B("layout", bl.layout === "lado" ? "cima" : "lado")} className="chip !px-3 !py-1.5">{bl.layout === "lado" ? "Símbolo ao lado" : "Símbolo em cima"}</button>
            </div>
            <div><label className="label">Símbolo</label>
              <div className="flex flex-wrap gap-1.5">{SYMBOLS.map((s) => <button key={s} onClick={() => B("symbol", s)} className={`chip !px-2.5 !py-1 ${bl.symbol === s ? "chip-mint" : ""}`}>{SYM_L[s]}</button>)}</div></div>
            {(["color", "accent"] as const).map((k) => (
              <div key={k}><label className="label">{k === "color" ? "Cor do nome" : "Cor do símbolo"}</label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {swatches.map((c) => <button key={c} onClick={() => B(k, c)} className={`w-6 h-6 rounded-md border ${bl[k] === c ? "border-paper ring-2 ring-mint" : "border-line"}`} style={{ background: c }} aria-label={c} />)}
                  <input type="color" value={bl[k]} onChange={(e) => B(k, e.target.value)} className="w-7 h-7 bg-transparent" />
                </div></div>
            ))}
            <button onClick={() => add({ id: uid(), name: `${bl.text} · ${SYM_L[bl.symbol]}`, svg: preview, source: "construtor" })} className="btn btn-mint w-full"><I.plus className="w-4 h-4" />Guardar como opção</button>
          </div>
        </section>
      )}

      {tab === "monograma" && (
        <section className="card p-5 rise grid lg:grid-cols-[1fr_340px] gap-5">
          <div className="grid grid-cols-3 gap-3">
            {[[mono.fg, mono.bg, pal["Claro"] || "#f4f4f2"], [pal["Claro"] || "#fff", pal["Escuro"] || "#111", pal["Escuro"] || "#111"], [pal["Escuro"] || "#111", pal["Destaque"] || mono.bg, "#ffffff"]].map(([fg, bg, back], i) => (
              <div key={i} className={`rounded-xl grid place-items-center p-6 ${i === 0 ? "col-span-3 min-h-56" : "aspect-square"}`} style={{ background: back }}>
                <SvgView svg={monogramSvg(mono, fg, bg)} className={i === 0 ? "w-48 h-48" : "w-full h-full"} fonts={[mono.font]} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Letras</label><input value={mono.letters} maxLength={3} onChange={(e) => M({ letters: e.target.value })} className="input" /></div>
              <div><label className="label">Peso</label><select value={mono.weight} onChange={(e) => M({ weight: +e.target.value })} className="input">{[400, 600, 700, 800].map((w) => <option key={w}>{w}</option>)}</select></div>
              <div className="col-span-2"><label className="label">Fonte</label><FontSelect value={mono.font} onChange={(f) => M({ font: f })} /></div>
            </div>
            <div><label className="label">Encaixe entre as letras</label><input type="range" min={-10} max={45} value={mono.overlap} onChange={(e) => M({ overlap: +e.target.value })} className="w-full accent-[var(--color-mint)]" /></div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => M({ stack: !mono.stack })} className={`chip !px-2.5 !py-1 ${mono.stack ? "chip-mint" : ""}`}>Empilhado</button>
              {(["nenhum", "circulo", "quadrado", "arco", "losango", "selo"] as const).map((x) => <button key={x} onClick={() => M({ shape: x })} className={`chip !px-2.5 !py-1 ${mono.shape === x ? "chip-mint" : ""}`}>{x === "nenhum" ? "Sem forma" : x === "circulo" ? "Círculo" : x === "quadrado" ? "Quadrado" : x === "arco" ? "Arco" : x === "losango" ? "Losango" : "Selo"}</button>)}
            </div>
            {(["fg", "bg"] as const).map((k) => (
              <div key={k}><label className="label">{k === "fg" ? "Cor das letras" : "Cor da forma"}</label>
                <div className="flex flex-wrap gap-1.5 items-center">{swatches.map((c) => <button key={c} onClick={() => M({ [k]: c } as any)} className={`w-6 h-6 rounded-md border ${mono[k] === c ? "border-paper ring-2 ring-mint" : "border-line"}`} style={{ background: c }} aria-label={c} />)}</div></div>
            ))}
            <button onClick={() => add({ id: uid(), name: `Monograma ${mono.letters}`, svg: monogramSvg(mono), source: "construtor" })} className="btn btn-ghost w-full">Guardar também como opção de símbolo</button>
            <p className="text-[11px] text-fog">O monograma fica salvo sozinho e vira a versão reduzida, o favicon e o grafismo.</p>
          </div>
        </section>
      )}

      {tab === "arquivo" && (
        <section onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          className="card border-dashed p-8 text-center cursor-pointer hover:border-mint rise">
          <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <I.plus className="w-6 h-6 mx-auto text-mint" />
          <p className="font-semibold mt-2">Envie um rascunho (SVG, PNG ou JPG)</p>
          <p className="text-xs text-fog mt-1">Feito no Canva, Illustrator, Figma ou à mão e fotografado. SVG mantém a qualidade em qualquer tamanho.</p>
        </section>
      )}

      {logos.length > 0 && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog pt-2">Opções · {logos.length} <span className="normal-case tracking-normal">(a estrela marca o símbolo escolhido)</span></p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {logos.map((l) => (
              <div key={l.id} className={`card overflow-hidden ${chosen?.id === l.id ? "!border-mint" : ""}`}>
                <div className="h-40 grid place-items-center p-5" style={{ background: pal["Claro"] || "#f4f4f2" }}>
                  {l.svg ? <SvgView svg={l.svg} className="w-full h-full" /> : <img src={l.img} alt="" className="max-h-full max-w-full" />}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <input value={l.name} onChange={(e) => save(logos.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)))} className="flex-1 bg-transparent font-semibold text-sm outline-none min-w-0" />
                    <button onClick={() => choose(l.id)} className={chosen?.id === l.id ? "text-mint" : "text-fog hover:text-paper"} aria-label="Escolher esta">{chosen?.id === l.id ? "★" : "☆"}</button>
                    <button onClick={() => save(logos.filter((x) => x.id !== l.id))} className="text-fog hover:text-danger" aria-label="Tirar"><I.trash className="w-3.5 h-3.5" /></button>
                  </div>
                  {l.note && <p className="text-xs text-fog mt-1 line-clamp-3">{l.note}</p>}
                  <p className="font-mono text-[10px] text-fog/70 mt-1.5 uppercase">{l.source === "claude" ? "Claude" : l.source === "upload" ? "Arquivo" : "Construtor"}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {chosen && (
        <section className="card p-5 rise">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Teste da escolhida · {chosen.name}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[["Fundo claro", pal["Claro"] || "#f4f4f2", false], ["Fundo escuro", pal["Escuro"] || "#111111", true], ["Cor primária", pal["Primária"] || "#6eefb6", true], ["Uma cor só", "#ffffff", false]].map(([l, bg, inv], i) => (
              <div key={l as string}>
                <div className="h-28 rounded-xl grid place-items-center p-4 border border-line" style={{ background: bg as string }}>
                  {chosen.svg ? <SvgView svg={i === 3 ? monoSvg(chosen.svg, "#111111") : inv ? monoSvg(chosen.svg, "#ffffff") : chosen.svg} className="w-full h-full" />
                    : <img src={chosen.img} alt="" className="max-h-full" style={inv ? { filter: "brightness(0) invert(1)" } : i === 3 ? { filter: "grayscale(1) contrast(2)" } : {}} />}
                </div>
                <p className="text-[11px] text-fog mt-1.5">{l as string}</p>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-6 mt-4 bg-[#f4f4f2] rounded-xl p-4 w-fit">
            {[96, 48, 24].map((h) => <div key={h} style={{ height: h, width: h * 2.4 }}>{chosen.svg ? <SvgView svg={chosen.svg} className="w-full h-full" /> : <img src={chosen.img} alt="" className="h-full" />}</div>)}
            <span className="text-[11px] text-neutral-500">ainda lê pequena?</span>
          </div>
        </section>
      )}
    </div>
  );
}
