"use client";
import { useEffect, useState } from "react";
import { ALL_FONTS, PAIRS, loadFonts, type Pair } from "@/lib/design";
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
  useEffect(() => { loadFonts(ALL_FONTS); }, []);
  useEffect(() => { loadFonts([t.title, t.body].filter(Boolean)); }, [t.title, t.body]);
  const pick = (p: Pair) => set({ type: { title: p.title, body: p.body, tw: p.tw || 700, k: p.k } });

  return (
    <div className="space-y-5">
      <section className="card p-5 rise grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="rounded-xl bg-[#f4f4f2] text-[#141414] p-6 md:p-8 min-h-56">
          {t.title ? (
            <>
              <p className="text-[11px] tracking-[.2em] uppercase opacity-60" style={{ fontFamily: t.body }}>Título · {t.title}</p>
              <p className="text-5xl md:text-6xl leading-[1.02] mt-2 break-words" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw || 700 }}>{name}</p>
              <p className="text-2xl mt-3" style={{ fontFamily: `"${t.title}"`, fontWeight: t.tw || 700 }}>{sample}</p>
              <p className="text-[11px] tracking-[.2em] uppercase opacity-60 mt-6" style={{ fontFamily: t.body }}>Texto · {t.body}</p>
              <p className="text-base leading-relaxed mt-1 max-w-xl" style={{ fontFamily: `"${t.body}"` }}>Este é o texto corrido da marca: legendas, site, etiquetas e descrições de produto. Precisa ser fácil de ler em tamanho pequeno, no celular e impresso.</p>
            </>
          ) : <p className="text-sm text-neutral-500">Escolha um par abaixo para ver a marca escrita com ele.</p>}
        </div>
        <div className="space-y-3">
          <div><label className="label">Frase de teste</label><input value={sample} onChange={(e) => setSample(e.target.value)} className="input" /></div>
          <div><label className="label">Fonte de título</label><select value={t.title || ""} onChange={(e) => set({ type: { ...t, title: e.target.value, body: t.body || "Inter" } })} className="input"><option value="" disabled>Escolha</option>{ALL_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
          <div><label className="label">Peso do título</label><select value={t.tw || 700} onChange={(e) => set({ type: { ...t, tw: +e.target.value } })} className="input">{[400, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
          <div><label className="label">Fonte de texto</label><select value={t.body || ""} onChange={(e) => set({ type: { ...t, body: e.target.value, title: t.title || "Bricolage Grotesque" } })} className="input"><option value="" disabled>Escolha</option>{ALL_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
          <p className="text-[11px] text-fog">Todas são do Google Fonts (licença OFL): grátis para uso comercial e já existem no Canva.</p>
        </div>
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
