"use client";
import { useEffect, useMemo, useState } from "react";
import { loadFonts } from "@/lib/design";
import { FONT_CATS, FONT_LIB, fontDef, fontsOfCat, type FontCat } from "@/lib/fonts";
import { TYPE_GROUPS, TYPE_GUIDE, TYPE_AXES, TASTE_AXES, TASTE_WEIGHTS, tasteText } from "@/lib/brand-knowledge";
import type { StepProps } from "./types";
import LinkGosto from "./LinkGosto";

/** Pré-projeto: o mostruário para descobrir o gosto do cliente antes de desenhar.
    Cada letra tem código (T01, T02…) para o cliente responder pelo WhatsApp. */
export default function TasteStep({ d, set, id }: StepProps) {
  const g = d.gosto || {};
  const name = d.brief?.nome || "Sua marca";
  const up = (patch: any) => set({ gosto: { ...g, ...patch } });
  const [cat, setCat] = useState<FontCat | "todas">("todas");
  const codes = useMemo(() => Object.fromEntries(FONT_LIB.map((x, i) => [x.f, `T${String(i + 1).padStart(2, "0")}`])), []);
  const shown = cat === "todas" ? FONT_LIB : fontsOfCat(cat);
  useEffect(() => { loadFonts([...TYPE_GUIDE.map((c) => c.ex), ...TASTE_WEIGHTS]); }, []);
  useEffect(() => { loadFonts(shown.map((x) => x.f)); }, [cat]); // eslint-disable-line
  const mark = (f: string, v: 1 | -1) => { const cur = { ...(g.fontes || {}) }; if (cur[f] === v) delete cur[f]; else cur[f] = v; up({ fontes: cur }); };
  const fav = FONT_LIB.filter((x) => g.fontes?.[x.f] === 1);
  const nao = FONT_LIB.filter((x) => g.fontes?.[x.f] === -1);
  const catCount = FONT_CATS.map((c) => ({ c, n: fav.filter((x) => x.cat === c.k).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const resumo = tasteText(g);

  return (
    <div className="space-y-5">
      <section className="card p-5 rise">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Como usar</p>
        <p className="text-sm mt-2 max-w-3xl">Este é o mostruário do pré-projeto. Mostre ao cliente na reunião, mande o código das letras pelo WhatsApp ou crie o link abaixo para ele marcar sozinho. Marque o que ele gostou e o que não quer: o resultado aparece no resumo abaixo e acompanha as próximas etapas, inclusive a Tipografia e os pedidos ao Claude.</p>
      </section>

      <LinkGosto id={id} d={d} set={set} />

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">01 · Os tipos de letra</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {TYPE_GROUPS.map((gr) => { const ex = TYPE_GUIDE.find((c) => c.grupo === gr.k)!; return (
            <div key={gr.k} className="rounded-xl border border-line overflow-hidden">
              <div className="bg-[#f4f1ea] text-[#161616] h-28 flex items-center justify-center"><span className="text-7xl leading-none" style={{ fontFamily: `"${ex.ex}"`, fontWeight: ex.w || 400 }}>Ag</span></div>
              <div className="p-3"><p className="font-semibold text-sm">{gr.l}</p><p className="text-xs text-fog mt-1">{gr.d}</p></div>
            </div>
          ); })}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
          {TYPE_GUIDE.map((c) => (
            <button key={c.k} onClick={() => setCat(c.cat)} className={`text-left rounded-xl border p-3 ${cat === c.cat ? "border-mint" : "border-line hover:border-fog"}`}>
              <p className="text-2xl truncate" style={{ fontFamily: `"${c.ex}"`, fontWeight: c.w || 400 }}>{name}</p>
              <p className="text-sm font-semibold mt-1">{c.l}</p>
              <p className="text-xs text-fog">Passa: {c.sente}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">02 · Mostruário de letras · {FONT_LIB.length} opções grátis para uso comercial</p>
          <p className="text-xs text-fog">{fav.length} gostou · {nao.length} não quer</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setCat("todas")} className={`chip !px-3 !py-1 ${cat === "todas" ? "chip-mint" : "hover:text-paper"}`}>Todas</button>
          {FONT_CATS.map((c) => <button key={c.k} onClick={() => setCat(c.k)} className={`chip !px-3 !py-1 ${cat === c.k ? "chip-mint" : "hover:text-paper"}`}>{c.l}</button>)}
        </div>
        {cat !== "todas" && <p className="text-xs text-fog mb-3">{FONT_CATS.find((c) => c.k === cat)?.d}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {shown.map((x) => { const v = g.fontes?.[x.f]; const w = x.w.includes(400) ? 400 : x.w[0]; return (
            <div key={x.f} className={`rounded-xl border overflow-hidden ${v === 1 ? "border-mint" : v === -1 ? "border-line opacity-50" : "border-line"}`}>
              <div className="bg-[#f4f1ea] text-[#161616] px-3 pt-3 pb-2">
                <div className="flex justify-between text-[10px] opacity-60"><span className="font-semibold">{codes[x.f]}</span><span>{x.f}</span></div>
                <p className="text-3xl truncate leading-tight mt-2" style={{ fontFamily: `"${x.f}"`, fontWeight: w }}>{name}</p>
                <p className="text-xs uppercase tracking-[.3em] truncate mt-1 text-[#8F3A22]" style={{ fontFamily: `"${x.f}"`, fontWeight: w }}>{name}</p>
              </div>
              <div className="flex gap-1.5 p-2">
                <button onClick={() => mark(x.f, 1)} className={`chip flex-1 justify-center !py-1 ${v === 1 ? "chip-mint" : ""}`}>Gosto</button>
                <button onClick={() => mark(x.f, -1)} className={`chip flex-1 justify-center !py-1 ${v === -1 ? "!border-red-400 !text-red-300" : ""}`}>Não quero</button>
              </div>
            </div>
          ); })}
        </div>
      </section>

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">03 · A mesma letra, do fino ao forte</p>
        <div className="space-y-2">
          {TASTE_WEIGHTS.map((f) => (
            <div key={f} className="grid grid-cols-[120px_1fr] gap-3 items-center">
              <p className="text-xs text-fog">{f}</p>
              <div className="flex gap-2 overflow-x-auto">{(fontDef(f)?.w || [400]).map((w) => (
                <div key={w} className="rounded-lg bg-[#f4f1ea] text-[#161616] px-3 py-2 shrink-0"><p className="text-[10px] opacity-60">{w}</p><p className="text-2xl" style={{ fontFamily: `"${f}"`, fontWeight: w }}>{name.split(" ")[0]}</p></div>
              ))}</div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-4">{TYPE_AXES.map((a) => <div key={a.l} className="rounded-xl bg-panel2 p-3"><p className="text-sm font-semibold">{a.l}</p><p className="text-xs text-fog mt-1">{a.d}</p></div>)}</div>
      </section>

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">04 · Mapa do gosto · um lado em cada linha</p>
        <div className="space-y-2">
          {TASTE_AXES.map((a) => (
            <div key={a.k} className="grid md:grid-cols-[140px_1fr] gap-2 items-center">
              <p className="text-sm">{a.l}</p>
              <div className="grid grid-cols-3 gap-1.5">{a.o.map((o, i) => { const on = g.eixos?.[a.k] === i; return (
                <button key={o} onClick={() => { const e = { ...(g.eixos || {}) }; if (on) delete e[a.k]; else e[a.k] = i; up({ eixos: e }); }} className={`chip justify-center !py-1.5 ${on ? "chip-mint" : "hover:text-paper"}`}>{o}</button>
              ); })}</div>
            </div>
          ))}
        </div>
        <label className="label mt-4">O que o cliente disse (palavras dele)</label>
        <textarea value={g.notas || ""} onChange={(e) => up({ notas: e.target.value })} rows={3} className="input resize-y" placeholder="Ex.: gostou das letras finas e altas, achou as manuscritas exageradas, quer algo que amadureça com ela." />
      </section>

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Resumo do gosto</p>
        {resumo ? <p className="text-sm whitespace-pre-line">{resumo}</p> : <p className="text-sm text-fog">Marque letras e o mapa do gosto para montar o resumo.</p>}
        {catCount.length > 0 && <p className="text-xs text-fog mt-3">Estilos que mais apareceram: {catCount.map((x) => `${x.c.l} (${x.n})`).join(", ")}.</p>}
      </section>
    </div>
  );
}
