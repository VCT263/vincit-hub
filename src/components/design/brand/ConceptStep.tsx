"use client";
import { useState } from "react";
import { useAI } from "@/lib/useAI";
import { ROLES, behanceSearch, briefText, uid } from "@/lib/design";
import { strategyText } from "@/lib/brand-strategy";
import { I } from "@/components/icons";
import type { StepProps } from "./types";

type T = { id: string; nome: string; ideia: string; metafora?: string; palavras?: string[]; forma?: string; cor?: string; tipo?: string; busca?: string[]; paleta?: string[] };
const EMPTY: Omit<T, "id"> = { nome: "", ideia: "", metafora: "", palavras: [], forma: "", cor: "", tipo: "", busca: [], paleta: [] };

export default function ConceptStep({ d, set }: StepProps) {
  const ts: T[] = d.territories || [];
  const { run, busy, error } = useAI();
  const [edit, setEdit] = useState<T | null>(null);

  async function ask() {
    const r: any = await run("brand_territories", { nome: d.brief?.nome || "", brief: briefText(d.brief), estrategia: strategyText(d) });
    if (!r?.territorios) return;
    set({ territories: [...r.territorios.map((t: any) => ({ ...EMPTY, ...t, id: uid() })), ...ts] });
  }
  const save = (t: T) => { set({ territories: ts.some((x) => x.id === t.id) ? ts.map((x) => (x.id === t.id ? t : x)) : [t, ...ts] }); setEdit(null); };

  return (
    <div className="space-y-5">
      <section className="card p-5 rise flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1">
          <p className="font-display font-bold text-lg">Três territórios a partir da estratégia</p>
          <p className="text-sm text-fog mt-1">O Claude lê o nicho, o arquétipo, a posição no mapa e a plataforma e propõe três ideias criativas bem diferentes, cada uma com metáfora, direção de forma, cor e tipografia, e buscas prontas no Behance. Você escolhe uma ou escreve a sua.</p>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEdit({ ...EMPTY, id: uid() })} className="btn btn-ghost">Escrever o meu</button>
          <button onClick={ask} disabled={busy || !d.brief?.nome} className="btn btn-mint"><I.spark className="w-4 h-4" />{busy ? "Esperando o Claude…" : "Pedir territórios"}</button>
        </div>
      </section>

      {!ts.length && <p className="text-sm text-fog text-center py-6">Nenhum território ainda. Um território é a ideia que vira forma: por exemplo, "costura invisível" para uma marca de moda que cuida dos detalhes.</p>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ts.map((t) => { const on = d.territory_id === t.id; return (
          <div key={t.id} className={`card overflow-hidden flex flex-col ${on ? "!border-mint" : ""}`}>
            {!!t.paleta?.length && <div className="flex h-14">{t.paleta.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>}
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2"><p className="font-display font-bold text-lg leading-tight">{t.nome || "Sem nome"}</p>{on && <span className="chip chip-mint shrink-0">escolhido</span>}</div>
              <p className="text-sm">{t.ideia}</p>
              {t.metafora && <p className="text-xs text-fog italic">Metáfora: {t.metafora}</p>}
              {!!t.palavras?.length && <div className="flex flex-wrap gap-1">{t.palavras.map((p) => <span key={p} className="chip">{p}</span>)}</div>}
              <dl className="text-xs space-y-1 mt-1">
                {t.forma && <div><dt className="inline text-fog">Forma: </dt><dd className="inline">{t.forma}</dd></div>}
                {t.cor && <div><dt className="inline text-fog">Cor: </dt><dd className="inline">{t.cor}</dd></div>}
                {t.tipo && <div><dt className="inline text-fog">Tipografia: </dt><dd className="inline">{t.tipo}</dd></div>}
              </dl>
              {!!t.busca?.length && <div className="flex flex-wrap gap-1 mt-1">{t.busca.map((q) => <a key={q} href={behanceSearch(q)} target="_blank" rel="noreferrer" className="chip hover:text-paper">{q} ↗</a>)}</div>}
              <div className="flex gap-2 mt-auto pt-3">
                <button onClick={() => set({ territory_id: on ? null : t.id })} className={`btn btn-sm flex-1 ${on ? "btn-ghost" : "btn-mint"}`}>{on ? "Desmarcar" : "Escolher"}</button>
                {!!t.paleta?.length && <button onClick={() => set({ palette: t.paleta!.slice(0, 5).map((hex, i) => ({ hex, role: ROLES[i] })) })} className="btn btn-ghost btn-sm" title="Usar a paleta deste território">Usar cores</button>}
                <button onClick={() => setEdit(t)} className="btn btn-ghost btn-sm !px-2" aria-label="Editar"><I.pen className="w-3.5 h-3.5" /></button>
                <button onClick={() => set({ territories: ts.filter((x) => x.id !== t.id) })} className="btn btn-ghost btn-sm !px-2 hover:!text-danger" aria-label="Apagar"><I.trash className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ); })}
      </div>

      {edit && (
        <section className="card p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Território</p>
          <div className="grid md:grid-cols-2 gap-3">
            {([["nome", "Nome do território"], ["metafora", "Metáfora"], ["forma", "Direção de forma"], ["cor", "Direção de cor"], ["tipo", "Direção tipográfica"]] as const).map(([k, l]) => (
              <div key={k}><label className="label">{l}</label><input value={(edit as any)[k] || ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} className="input" /></div>
            ))}
            <div><label className="label">Palavras visuais (separe por vírgula)</label><input value={(edit.palavras || []).join(", ")} onChange={(e) => setEdit({ ...edit, palavras: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="input" /></div>
            <div className="md:col-span-2"><label className="label">A ideia</label><textarea value={edit.ideia} onChange={(e) => setEdit({ ...edit, ideia: e.target.value })} rows={2} className="input" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button onClick={() => setEdit(null)} className="btn btn-ghost btn-sm">Cancelar</button><button onClick={() => save(edit)} className="btn btn-mint btn-sm">Salvar</button></div>
        </section>
      )}
    </div>
  );
}
