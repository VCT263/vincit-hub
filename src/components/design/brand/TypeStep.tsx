"use client";
import { useEffect, useState } from "react";
import { PAIRS, loadFonts, type Pair } from "@/lib/design";
import { FONT_CATS, fontDef, fontsOfCat, type FontCat } from "@/lib/fonts";
import { archetypeMix } from "@/lib/brand-strategy";
import { VOICES, systemsFor, TYPE_GROUPS, TYPE_GUIDE, TYPE_AXES, type TypeSystem } from "@/lib/brand-knowledge";
import { SCALES } from "@/lib/brand-strategy";
import { FontSelect } from "../ui";
import type { StepProps } from "./types";

/** sugestão simples pela personalidade do briefing */
function suggest(ax: any = {}): string[] {
  const v = (k: string) => ax[k] ?? 50; const out: string[] = [];
  if (v("classica") < 35) out.push("classica", "elegante");
  if (v("classica") > 65) out.push("direta", "tech", "minimal");
  if (v("acessivel") > 65) out.push("elegante", "editorial");
  if (v("discreta") > 65) out.push("forte", "arrojada", "condensada");
  if (v("seria") > 65) out.push("geometrica", "manuscrita");
  if (v("racional") > 65) out.push("humana", "editorial");
  if (v("simples") < 35) out.push("minimal");
  return Array.from(new Set(out)).slice(0, 3);
}

export default function TypeStep({ d, set }: StepProps) {
  const t = d.type || {};
  const name = d.brief?.nome || "Sua marca";
  const [sample, setSample] = useState(d.brief?.slogan || "Feita para quem sabe o que quer");
  const sug = suggest(d.brief?.eixos);
  const fromClaude: Pair[] = (d.concepts || []).filter((c: any) => c.fontes?.titulo).map((c: any, i: number) => ({ k: `claude${i}`, l: `Claude · ${c.nome}`, d: "sugerida com o conceito de logo", title: c.fontes.titulo, body: c.fontes.texto || "Inter", tw: 700 }));
  const pairs = [...fromClaude, ...PAIRS.filter((p) => sug.includes(p.k)), ...PAIRS.filter((p) => !sug.includes(p.k))];
  useEffect(() => { loadFonts(PAIRS.flatMap((p) => [p.title, p.body])); }, []);
  const mix = archetypeMix(d.strategy);
  const [cat, setCat] = useState<FontCat>((fontDef(mix[0]?.a.fontes[0] || "")?.cat) || "grotesca");
  const [guide, setGuide] = useState(true);
  useEffect(() => { loadFonts(TYPE_GUIDE.map((c) => c.ex)); }, []);
  useEffect(() => { loadFonts([...fontsOfCat(cat).map((x) => x.f), ...mix.flatMap((m) => m.a.fontes)]); }, [cat, mix.length]); // eslint-disable-line
  const ranked = systemsFor(mix.map((m) => m.a.k), d.strategy?.nicho);
  useEffect(() => { loadFonts(ranked.flatMap(({ s }) => [s.estrutura, s.editorial, s.gesto || ""]).filter(Boolean)); }, []); // eslint-disable-line
  const applySys = (y: TypeSystem) => set({ type: { ...t, k: y.k, title: y.editorial, body: y.estrutura, accent: y.gesto || "", ti: !!y.editorialItalic, tw: y.edWeight || ((fontDef(y.editorial)?.w || [400]).filter((w) => w <= 700).slice(-1)[0] || 400) } });
  const useAs = (f: string, k: "title" | "body") => set({ type: { ...t, title: t.title || "Inter", body: t.body || "Inter", [k]: f, ...(k === "title" ? { tw: (fontDef(f)?.w || [700]).includes(t.tw || 700) ? t.tw || 700 : (fontDef(f)?.w || [400]).slice(-1)[0] } : {}) } });
  useEffect(() => { loadFonts([t.title, t.body].filter(Boolean)); }, [t.title, t.body]);
  const pick = (p: Pair) => set({ type: { ...t, title: p.title, body: p.body, tw: p.tw || 700, k: p.k } });
  const ratio = t.scale || 1.25, base = t.base || 16;
  const levels = [["Display", 5], ["H1", 4], ["H2", 3], ["H3", 2], ["Destaque", 1], ["Texto", 0], ["Legenda", -1]] as const;

  return (
    <div className="space-y-5">
      <section className="card p-5 rise grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="rounded-xl bg-[#f4f4f2] text-[#141414] p-6 md:p-8 min-h-56">
          {t.title ? (
            <>
              <p className="text-[11px] tracking-[.2em] uppercase opacity-60" style={{ fontFamily: t.body }}>Título · {t.title}</p>
              <p className="text-5xl md:text-6xl leading-[1.02] mt-2 break-words" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw || 700, fontStyle: t.ti ? "italic" : "normal" }}>{name}</p>
              <p className="text-2xl mt-3" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw || 700, fontStyle: t.ti ? "italic" : "normal" }}>{sample}</p>
              <p className="text-[11px] tracking-[.2em] uppercase opacity-60 mt-6" style={{ fontFamily: t.body }}>Texto · {t.body}</p>
              <p className="text-base leading-relaxed mt-1 max-w-xl" style={{ fontFamily: `"${t.body}"` }}>Este é o texto corrido da marca: legendas, site, etiquetas e descrições de produto. Precisa ser fácil de ler em tamanho pequeno, no celular e impresso.</p>
            </>
          ) : <p className="text-sm text-neutral-500">Escolha um par abaixo para ver a marca escrita com ele.</p>}
        </div>
        <div className="space-y-3">
          <div><label className="label">Frase de teste</label><input value={sample} onChange={(e) => setSample(e.target.value)} className="input" /></div>
          <div><label className="label">Fonte de título</label><FontSelect value={t.title} onChange={(f) => set({ type: { ...t, title: f, body: t.body || "Inter" } })} /></div>
          <div><label className="label">Peso do título</label><select value={t.tw || 700} onChange={(e) => set({ type: { ...t, tw: +e.target.value } })} className="input">{[400, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
          <div><label className="label">Fonte de texto</label><FontSelect value={t.body} onChange={(f) => set({ type: { ...t, body: f, title: t.title || "Bricolage Grotesque" } })} /></div>
          <p className="text-[11px] text-fog">Google Fonts (OFL) e Fontshare (ITF): grátis para uso comercial.</p>
        </div>
      </section>

      <section className="card p-5 grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="rounded-xl bg-[#f4f4f2] text-[#141414] p-6 space-y-1 overflow-hidden">
          {levels.map(([l, n]) => { const px = Math.round(base * ratio ** n); const title = n > 0; return (
            <div key={l} className="flex items-baseline gap-4">
              <span className="font-mono text-[10px] text-neutral-500 w-20 shrink-0">{l} · {px}px</span>
              <span className="truncate" style={{ fontFamily: `"${title ? t.title || "Inter" : t.body || "Inter"}"`, fontWeight: title ? t.tw || 700 : 400, fontSize: Math.min(px, 72), lineHeight: title ? 1.05 : 1.5 }}>{title ? name : "Texto corrido da marca"}</span>
            </div>
          ); })}
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Escala modular</p>
          <div className="space-y-1.5">{SCALES.map((sc) => <button key={sc.k} onClick={() => set({ type: { ...t, scale: sc.k } })} className={`w-full text-left chip !rounded-lg !px-3 !py-2 ${ratio === sc.k ? "chip-mint" : ""}`}>{sc.l}</button>)}</div>
          <div><label className="label">Tamanho do texto: {base}px</label><input type="range" min={12} max={20} value={base} onChange={(e) => set({ type: { ...t, base: +e.target.value } })} className="w-full accent-[var(--color-mint)]" /></div>
          <p className="text-[11px] text-fog">Cada nível é o anterior multiplicado pela razão. Com uma escala só, post, site e embalagem ficam coerentes sem decidir tamanho por tamanho.</p>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Sistemas de estúdio · três vozes</p><p className="text-xs text-fog">{VOICES.map((v) => v.l).join(" · ")}</p></div>
        <p className="text-xs text-fog mb-4 max-w-3xl">Como nos cases do Behance: cada fonte tem um papel. {VOICES.map((v) => `${v.l}: ${v.d.split(". ")[1] || v.d}`).join(" ")}</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ranked.map(({ s: y, n }, i) => { const on = t.k === y.k; return (
            <button key={y.k} onClick={() => applySys(y)} className={`text-left rounded-xl overflow-hidden border transition-colors ${on ? "border-mint" : "border-line hover:border-fog"}`}>
              <div className="bg-[#f4f1ea] text-[#161616] px-4 pt-3 pb-2 relative overflow-hidden h-40">
                <div className="flex justify-between text-[8px] uppercase tracking-[.2em] opacity-60" style={{ fontFamily: `"${y.estrutura}"` }}><span>{y.estrutura}</span><span>{y.editorial}</span>{y.gesto && <span>{y.gesto}</span>}</div>
                <p className="absolute left-3 -bottom-3 text-[64px] leading-none whitespace-nowrap" style={{ fontFamily: `"${y.editorial}"`, fontStyle: y.editorialItalic ? "italic" : "normal", fontWeight: y.edWeight || 400 }}>{name}</p>
                {y.gesto && <p className="absolute right-4 top-7 text-3xl -rotate-6" style={{ fontFamily: `"${y.gesto}"`, color: "#c2410c" }}>{name.toLowerCase()}</p>}
                <p className="absolute left-4 top-8 text-[11px] max-w-[55%] leading-snug" style={{ fontFamily: `"${y.estrutura}"` }}>{d.brief?.slogan || "Texto de apoio, legenda e informação."}</p>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm">{y.l}</p>{on ? <span className="chip chip-mint !text-[10px]">em uso</span> : n > 0 && i < 3 ? <span className="chip !text-[10px]">sugerido</span> : null}</div>
                <p className="text-xs text-fog mt-1">{y.ideia}</p>
                <p className="text-[10px] text-fog/70 mt-1.5">Referência: {y.ref}</p>
              </div>
            </button>
          ); })}
        </div>
        {t.accent !== undefined && (
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
            <span className="text-fog">Voz de gesto (assinatura, uma palavra por peça):</span>
            <FontSelect value={t.accent || ""} onChange={(f) => set({ type: { ...t, accent: f } })} className="input !w-auto !py-1.5 text-xs" />
            {fontDef(t.title)?.it && <button onClick={() => set({ type: { ...t, ti: !t.ti } })} className={`chip !px-3 !py-1 italic ${t.ti ? "chip-mint" : ""}`}>Títulos em itálico</button>}
          </div>
        )}
      </section>

      {mix.length > 0 && (
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Pelos arquétipos</p>
          <div className="grid md:grid-cols-3 gap-3">
            {mix.map((m) => (
              <div key={m.a.k} className="rounded-xl bg-panel2 p-4">
                <p className="text-xs text-fog">{m.role} · <b className="text-paper">{m.a.l}</b> {m.pct}%</p>
                <div className="mt-2 space-y-2">{m.a.fontes.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="flex-1 text-xl truncate" style={{ fontFamily: `"${f}"` }}>{f}</span>
                    <button onClick={() => useAs(f, "title")} className={`chip !px-2 !py-0.5 ${t.title === f ? "chip-mint" : ""}`}>Título</button>
                    <button onClick={() => useAs(f, "body")} className={`chip !px-2 !py-0.5 ${t.body === f ? "chip-mint" : ""}`}>Texto</button>
                  </div>
                ))}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Guia · tipos de letra</p><button onClick={() => setGuide(!guide)} className="chip !px-3 !py-1">{guide ? "Recolher" : "Abrir guia"}</button></div>
        <p className="text-xs text-fog max-w-3xl">Antes de escolher a fonte, descubra com o cliente o tipo de letra que combina com ele. Toque num tipo para ver as fontes dele no acervo.</p>
        {guide && (
          <div className="mt-4 space-y-5">
            {TYPE_GROUPS.map((g) => (
              <div key={g.k}>
                <p className="text-sm font-semibold">{g.l}</p>
                <p className="text-xs text-fog mb-2 max-w-3xl">{g.d}</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {TYPE_GUIDE.filter((c) => c.grupo === g.k).map((c) => (
                    <button key={c.k} onClick={() => setCat(c.cat)} className={`text-left rounded-xl border p-3 transition-colors ${cat === c.cat ? "border-mint" : "border-line hover:border-fog"}`}>
                      <div className="rounded-lg bg-[#f4f1ea] text-[#161616] px-3 py-2 overflow-hidden"><p className="text-3xl truncate leading-tight" style={{ fontFamily: `"${c.ex}"`, fontWeight: c.w || 400 }}>{name}</p><p className="text-[10px] opacity-60 mt-0.5">{c.ex}</p></div>
                      <p className="font-semibold text-sm mt-2">{c.l}</p>
                      <p className="text-xs text-fog mt-1">{c.oque}</p>
                      <p className="text-xs mt-1.5"><span className="text-fog">Passa:</span> {c.sente}</p>
                      <p className="text-xs mt-0.5"><span className="text-fog">Use em:</span> {c.usar}</p>
                      <p className="text-xs mt-0.5"><span className="text-fog">Evite:</span> {c.evitar}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-sm font-semibold">Dentro do mesmo tipo, o que muda</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-2">{TYPE_AXES.map((a) => <div key={a.l} className="rounded-xl bg-panel2 p-3"><p className="text-sm font-semibold">{a.l}</p><p className="text-xs text-fog mt-1">{a.d}</p></div>)}</div>
            </div>
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Acervo · Google Fonts e Fontshare, grátis para uso comercial</p><p className="text-xs text-fog">{FONT_CATS.find((c) => c.k === cat)?.d}</p></div>
        <div className="flex flex-wrap gap-1.5 mb-4">{FONT_CATS.map((c) => <button key={c.k} onClick={() => setCat(c.k)} className={`chip !px-3 !py-1 ${cat === c.k ? "chip-mint" : "hover:text-paper"}`}>{c.l}</button>)}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {fontsOfCat(cat).map((x) => (
            <div key={x.f} className={`rounded-xl border p-3 ${t.title === x.f || t.body === x.f ? "border-mint" : "border-line"}`}>
              <p className="text-3xl truncate leading-tight" style={{ fontFamily: `"${x.f}"`, fontWeight: x.w.includes(700) ? 700 : x.w[0] }}>{name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex-1 text-[11px] text-fog truncate">{x.f}{x.src === "fontshare" ? " · Fontshare" : ""}</span>
                <button onClick={() => useAs(x.f, "title")} className={`chip !px-2 !py-0.5 ${t.title === x.f ? "chip-mint" : ""}`}>Título</button>
                <button onClick={() => useAs(x.f, "body")} className={`chip !px-2 !py-0.5 ${t.body === x.f ? "chip-mint" : ""}`}>Texto</button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fog mt-3">As do Fontshare não vêm no Canva: baixe em fontshare.com e envie no Kit de Marca. As do Google já estão lá.</p>
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pairs.map((p) => {
          const on = t.title === p.title && t.body === p.body;
          return (
            <button key={p.k} onClick={() => pick(p)} className={`card p-4 text-left hover:border-mint transition-colors ${on ? "!border-mint" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fog truncate">{p.l}</p>
                {(sug.includes(p.k) || p.k.startsWith("claude")) && <span className="chip chip-mint shrink-0">sugerida</span>}
              </div>
              <p className="text-3xl mt-2 truncate" style={{ fontFamily: `"${p.title}"`, fontWeight: p.tw || 700 }}>{name}</p>
              <p className="text-sm text-fog mt-1 line-clamp-2" style={{ fontFamily: `"${p.body}"` }}>{p.d}. {p.title} + {p.body}.</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
