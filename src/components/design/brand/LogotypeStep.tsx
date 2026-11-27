"use client";
import { useEffect, useMemo, useState } from "react";
import { ALL_FONTS, LOCKUPS, loadFonts, lockupSvg, logotypeSvg, type Logotype } from "@/lib/design";
import { SvgView } from "../ui";
import type { StepProps } from "./types";

export default function LogotypeStep({ d, set, go }: StepProps) {
  const pal: Record<string, string> = Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex]));
  const lt: Logotype = { text: d.brief?.nome || "Marca", font: d.type?.title || "Playfair Display", weight: 700, tracking: 20, upper: true, kern: [], color: pal["Escuro"] || "#141414", sub: "", ...(d.logotype || {}) };
  const L = (patch: Partial<Logotype>) => set({ logotype: { ...lt, ...patch } });
  const [ready, setReady] = useState(0);
  useEffect(() => { loadFonts([lt.font]).then(() => setReady((x) => x + 1)); }, [lt.font]);
  const chars = Array.from(lt.upper ? lt.text.toUpperCase() : lt.text);
  const svg = useMemo(() => logotypeSvg(lt).svg, [JSON.stringify(lt), ready]); // eslint-disable-line
  const [pair, setPair] = useState(0);
  const dd = { ...d, logotype: lt };
  const hasSym = !!(d.symbol_id || d.logo_id);

  return (
    <div className="space-y-5">
      <section className="card p-5 rise grid lg:grid-cols-[1fr_320px] gap-5">
        <div>
          <div className="relative rounded-xl p-8 md:p-12 grid place-items-center min-h-56" style={{ background: pal["Claro"] || "#f4f4f2" }}>
            <div className="absolute inset-x-8 top-1/2 h-px bg-[#e03131]/30" />
            <SvgView svg={svg} className="w-full h-32" fonts={[lt.font]} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mt-4 mb-2">Ajuste entre pares (kerning óptico)</p>
          <div className="flex flex-wrap gap-1.5">
            {chars.slice(0, -1).map((c, i) => (
              <button key={i} onClick={() => setPair(i)} className={`chip !px-2.5 !py-1 font-mono ${pair === i ? "chip-mint" : ""}`}>{c}{chars[i + 1]}{lt.kern[i] ? ` ${lt.kern[i] > 0 ? "+" : ""}${lt.kern[i]}` : ""}</button>
            ))}
          </div>
          {chars.length > 1 && (
            <div className="flex items-center gap-3 mt-3">
              <span className="font-mono text-sm w-12">{chars[pair]}{chars[pair + 1]}</span>
              <input type="range" min={-150} max={150} value={lt.kern[pair] || 0} onChange={(e) => { const k = [...lt.kern]; k[pair] = +e.target.value; L({ kern: k }); }} className="flex-1 accent-[var(--color-mint)]" />
              <button onClick={() => L({ kern: [] })} className="btn btn-ghost btn-sm">Zerar</button>
            </div>
          )}
          <p className="text-[11px] text-fog mt-2">Olhe o espaço branco entre as letras, não a distância entre elas: pares como AV, LT e TA costumam precisar aproximar.</p>
        </div>
        <div className="space-y-3">
          <div><label className="label">Nome</label><input value={lt.text} onChange={(e) => L({ text: e.target.value, kern: [] })} className="input" /></div>
          <div><label className="label">Fonte</label><select value={lt.font} onChange={(e) => L({ font: e.target.value })} className="input">{ALL_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Peso</label><select value={lt.weight} onChange={(e) => L({ weight: +e.target.value })} className="input">{[400, 600, 700, 800].map((w) => <option key={w}>{w}</option>)}</select></div>
            <div><label className="label">Caixa</label><select value={lt.upper ? "a" : "b"} onChange={(e) => L({ upper: e.target.value === "a", kern: [] })} className="input"><option value="a">ALTA</option><option value="b">Como digitado</option></select></div>
          </div>
          <div><label className="label">Espaçamento geral (tracking): {lt.tracking}</label><input type="range" min={-60} max={400} value={lt.tracking} onChange={(e) => L({ tracking: +e.target.value })} className="w-full accent-[var(--color-mint)]" /></div>
          <div><label className="label">Descritor abaixo (opcional)</label><input value={lt.sub || ""} onChange={(e) => L({ sub: e.target.value })} className="input" placeholder="Ex.: DESIGN MOBILIÁRIO" /></div>
          <div><label className="label">Cor</label><div className="flex gap-1.5">{Object.values(pal).map((c) => <button key={c} onClick={() => L({ color: c })} className={`w-6 h-6 rounded-md border ${lt.color === c ? "ring-2 ring-mint border-paper" : "border-line"}`} style={{ background: c }} aria-label={c} />)}</div></div>
          {!d.logotype && <button onClick={() => L({})} className="btn btn-mint w-full">Salvar este logotipo</button>}
        </div>
      </section>

      <section className="rise">
        <div className="flex items-baseline justify-between mb-3"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Assinaturas · a estrela marca a principal</p>{!hasSym && <button onClick={() => go("simbolo")} className="text-xs text-mint">Escolher um símbolo →</button>}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOCKUPS.filter((k) => k.k !== "monograma" || d.monogram).filter((k) => hasSym || (k.k !== "horizontal" && k.k !== "vertical" && k.k !== "simbolo")).map((k) => {
            const on = (d.principal || "horizontal") === k.k;
            return (
              <div key={k.k} className={`card overflow-hidden ${on ? "!border-mint" : ""}`}>
                <div className="grid grid-cols-2">
                  <div className="h-36 grid place-items-center p-5" style={{ background: pal["Claro"] || "#f4f4f2" }}><SvgView svg={lockupSvg(k.k, dd)} className="w-full h-full" /></div>
                  <div className="h-36 grid place-items-center p-5" style={{ background: pal["Escuro"] || "#111" }}><SvgView svg={lockupSvg(k.k, dd, "#ffffff")} className="w-full h-full" /></div>
                </div>
                <div className="p-3 flex items-center gap-2">
                  <div className="flex-1"><p className="font-semibold text-sm">{k.l}</p><p className="text-xs text-fog">{k.d}</p></div>
                  <button onClick={() => set({ logotype: lt, principal: k.k })} className={on ? "text-mint text-lg" : "text-fog hover:text-paper text-lg"} aria-label="Principal">{on ? "★" : "☆"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
