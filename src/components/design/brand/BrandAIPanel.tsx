"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brandPrompt, brandVideoKit } from "@/lib/brandPrompt";
import { download } from "@/lib/design";
import { I } from "@/components/icons";
import { useAI } from "@/lib/useAI";
import { briefText } from "@/lib/design";
import { strategyText } from "@/lib/brand-strategy";

/* Direcionamento da marca para a IA: o texto pronto, o perfil do Instagram que usa a marca
   (os pedidos de IA e o conector do Claude levam o texto junto) e o kit de edição de vídeo da marca. */
export default function BrandAIPanel({ d, set }: { d: any; set: (patch: any) => void }) {
  const prompt = useMemo(() => brandPrompt(d), [d]);
  const [perfis, setPerfis] = useState<{ id: string; username: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const name = d.brief?.nome || "marca";
  const { run, busy } = useAI();
  async function verbal() {
    setMsg("Pedido enviado ao Claude. A expressão verbal entra no manual quando ele responder.");
    const r: any = await run("brand_verbal", { nome: d.brief?.nome || "", brief: briefText(d.brief) + (d.brief?.manifesto ? `\nManifesto: ${d.brief.manifesto}` : ""), estrategia: strategyText(d), arquetipos: d.strategy?.arquetipos || [] });
    if (r && (r.posicionamento || r.tom)) { set({ verbal: { ...(d.verbal || {}), ...r }, ...(d.verbal ? { _verbal_antes: d.verbal } : {}) }); setMsg("Expressão verbal nova no manual: posicionamento, valores, tom, vocabulário, canais e reescritas."); }
    else setMsg("O Claude não devolveu a expressão verbal. Tente de novo.");
  }
  useEffect(() => { createClient().from("ig_accounts").select("id, username").order("created_at").then(({ data }) => setPerfis((data as any) || [])); }, []);

  async function copy() { await navigator.clipboard.writeText(prompt); setMsg("Direcionamento copiado. Cole no começo da conversa com qualquer IA."); }
  async function kit() {
    const s = createClient();
    const row = { name: `Marca · ${name}`, account_id: d.perfil_id || null, data: brandVideoKit(d), updated_at: new Date().toISOString() };
    const q = d.kit_id ? s.from("av_style_kits").update(row).eq("id", d.kit_id) : s.from("av_style_kits").insert(row);
    const { data, error } = await q.select("id").maybeSingle();
    if (error || !data) { setMsg(error?.message || "Não deu para salvar o kit."); return; }
    if (!d.kit_id) set({ kit_id: data.id });
    setMsg(`Kit de edição "Marca · ${name}" ${d.kit_id ? "atualizado" : "criado"}. Ele aparece no Editor e no Premiere do Audiovisual.`);
  }

  const perfil = perfis.find((p) => p.id === d.perfil_id);
  return (
    <div className="card p-4 space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-sm mr-auto">Direcionamento para IA</p>
        <button onClick={copy} className="btn btn-mint btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar</button>
        <button onClick={() => download(URL.createObjectURL(new Blob([prompt], { type: "text/markdown" })), `${name}-direcionamento-ia.md`)} className="btn btn-ghost btn-sm"><I.download className="w-3.5 h-3.5" />Baixar .md</button>
        <button onClick={verbal} disabled={busy} className="btn btn-ghost btn-sm">{busy ? "Escrevendo…" : d.verbal ? "Reescrever expressão verbal" : "Escrever expressão verbal"}</button>
        <button onClick={kit} className="btn btn-ghost btn-sm">{d.kit_id ? "Atualizar" : "Criar"} kit de edição de vídeo</button>
      </div>
      <p className="text-xs text-fog">Voz, frases, o que nunca dizer, paleta com proporção, letras, grafismos e regras de post e de vídeo, montados a partir desta marca. Vai junto dos pedidos de IA do perfil ligado (posts, calendário, roteiros, campanhas) e aparece para o Claude no conector.</p>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-fog text-xs">Perfil do Instagram desta marca</span>
        <select value={d.perfil_id || ""} onChange={(e) => set({ perfil_id: e.target.value || null })} className="input !py-1 text-sm w-60">
          <option value="">Nenhum</option>
          {perfis.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
        </select>
        {perfil && <span className="text-[11px] text-mint">A IA de @{perfil.username} já usa este direcionamento.</span>}
      </label>
      <button onClick={() => setOpen(!open)} className="text-xs text-fog underline">{open ? "Esconder o texto" : "Ver o texto"} ({prompt.length.toLocaleString("pt-BR")} caracteres)</button>
      {open && <pre className="text-[11px] leading-relaxed whitespace-pre-wrap bg-black/30 rounded-lg p-3 max-h-96 overflow-auto font-mono">{prompt}</pre>}
      {msg && <p className="text-xs text-mint">{msg}</p>}
    </div>
  );
}
