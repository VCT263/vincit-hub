"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AXES, BRIEF } from "@/lib/design";
import { Chips } from "../ui";
import type { StepProps } from "./types";

export default function BriefStep({ d, set }: StepProps) {
  const b = d.brief || {};
  const ax = b.eixos || {};
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { createClient().from("ag_clients").select("id,name").order("name").then(({ data }) => setClients((data as any) || [])); }, []);
  const up = (k: string, v: any) => set({ brief: { ...b, [k]: v } });
  const filled = BRIEF.flatMap((s) => s.fields).filter((f) => { const v = b[f.k]; return Array.isArray(v) ? v.length : !!v; }).length;
  const total = BRIEF.flatMap((s) => s.fields).length;

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
      <div className="space-y-5">
        {BRIEF.map((sec, si) => (
          <section key={sec.k} className="card p-5 rise" style={{ animationDelay: `${si * .04}s` }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-4">0{si + 1} · {sec.l}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {sec.fields.map((f) => (
                <div key={f.k} className={f.type === "textarea" || f.type === "multi" || f.type === "chips" ? "md:col-span-2" : ""}>
                  <label className="label">{f.l}</label>
                  {f.type === "textarea" ? <textarea value={b[f.k] || ""} onChange={(e) => up(f.k, e.target.value)} placeholder={f.ph} rows={2} className="input resize-y" />
                    : f.type === "chips" ? <Chips value={b[f.k] || []} onChange={(v) => up(f.k, v)} ph={f.ph} />
                    : f.type === "multi" ? (
                      <div className="flex flex-wrap gap-2">
                        {f.options!.map((o) => { const on = (b[f.k] || []).includes(o); return (
                          <button key={o} type="button" onClick={() => up(f.k, on ? b[f.k].filter((x: string) => x !== o) : [...(b[f.k] || []), o])} className={`chip !text-xs !px-3 !py-1.5 ${on ? "chip-mint" : "hover:text-paper"}`}>{o}</button>
                        ); })}
                      </div>
                    ) : <input value={b[f.k] || ""} onChange={(e) => up(f.k, e.target.value)} placeholder={f.ph} className="input" />}
                </div>
              ))}
              {sec.k === "essencia" && clients.length > 0 && (
                <div>
                  <label className="label">Cliente (opcional)</label>
                  <select value={d.client_id || ""} onChange={(e) => set({ client_id: e.target.value || null })} className="input">
                    <option value="">Sem cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <aside className="card p-5 lg:sticky lg:top-24 rise">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Personalidade</p>
        <p className="text-xs text-fog mt-1 mb-4">Arraste para onde a marca está. Isso guia o Claude e as sugestões de cor e fonte.</p>
        <div className="space-y-4">
          {AXES.map(([k, a, z]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1"><span className={(ax[k] ?? 50) < 40 ? "text-paper font-semibold" : "text-fog"}>{a}</span><span className={(ax[k] ?? 50) > 60 ? "text-paper font-semibold" : "text-fog"}>{z}</span></div>
              <input type="range" min={0} max={100} value={ax[k] ?? 50} onChange={(e) => up("eixos", { ...ax, [k]: +e.target.value })} className="w-full accent-[var(--color-mint)]" aria-label={`${a} ou ${z}`} />
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-line">
          <div className="flex justify-between text-xs text-fog mb-1.5"><span>Briefing preenchido</span><span>{filled} de {total}</span></div>
          <div className="h-1.5 bg-line rounded-full overflow-hidden"><div className="h-full bg-mint transition-all" style={{ width: `${(filled / total) * 100}%` }} /></div>
          <p className="text-[11px] text-fog mt-2">Nome, o que faz, público e as palavras-chave já bastam para começar.</p>
        </div>
      </aside>
    </div>
  );
}
