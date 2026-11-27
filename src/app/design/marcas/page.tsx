"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { BrandCard } from "@/components/design/ui";
import Solicitacoes from "@/components/design/briefing/Solicitacoes";

export default function Marcas() {
  const router = useRouter();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [trash, setTrash] = useState<any[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [undo, setUndo] = useState<any | null>(null);
  useEffect(() => {
    createClient().from("design_projects").select("id,title,step,data,updated_at,archived_at").eq("kind", "marca").order("updated_at", { ascending: false })
      .then(({ data }) => { setRows((data || []).filter((r) => !r.archived_at)); setTrash((data || []).filter((r) => r.archived_at)); });
  }, []);
  async function excluir(b: any) {
    const at = new Date().toISOString();
    const { error } = await createClient().from("design_projects").update({ archived_at: at }).eq("id", b.id);
    if (error) return;
    setRows((r) => (r || []).filter((x) => x.id !== b.id));
    setTrash((t) => [{ ...b, archived_at: at }, ...t]);
    setUndo(b);
  }
  async function recuperar(b: any) {
    const { error } = await createClient().from("design_projects").update({ archived_at: null }).eq("id", b.id);
    if (error) return;
    setTrash((t) => t.filter((x) => x.id !== b.id));
    setRows((r) => [{ ...b, archived_at: null }, ...(r || [])]);
    setUndo(null);
  }
  const diasRestantes = (at: string) => Math.max(0, Math.ceil(15 - (Date.now() - new Date(at).getTime()) / 864e5));
  async function novo() {
    setBusy(true);
    const { data } = await createClient().from("design_projects").insert({ kind: "marca", title: "Nova marca" }).select("id").single();
    if (data) router.push(`/design/marcas/${data.id}`); else setBusy(false);
  }
  const shown = (rows || []).filter((r) => !q || (r.data?.brief?.nome || r.title).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead kicker="Design · 01 Marca" title="Criação de marca" desc="Cada marca passa por briefing, referências, logo, cores, tipografia e manual. Tudo salva sozinho e você pode voltar a qualquer etapa.">
        <button onClick={novo} disabled={busy} className="btn btn-mint"><I.plus className="w-4 h-4" />{busy ? "Criando…" : "Nova marca"}</button>
      </PageHead>
      <Solicitacoes />
      {!!rows?.length && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca" className="input max-w-64 mb-4 !py-1.5 text-sm" />}
      {rows === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="card h-48 animate-pulse" />)}</div>
      ) : !rows.length ? (
        <div className="card p-10 text-center rise">
          <p className="font-display text-xl font-bold">Nenhuma marca ainda</p>
          <p className="text-fog text-sm mt-2 max-w-md mx-auto">Comece pelo briefing. Com ele preenchido, o Claude propõe caminhos de logo, paleta e fontes, e você escolhe e ajusta.</p>
          <button onClick={novo} disabled={busy} className="btn btn-mint mt-5"><I.plus className="w-4 h-4" />Criar a primeira marca</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{shown.map((b) => (
          <div key={b.id} className="relative group">
            <BrandCard b={b} />
            <button onClick={() => excluir(b)} title="Excluir marca" aria-label="Excluir marca" className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-ink/80 text-fog hover:text-danger grid place-items-center sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"><I.trash className="w-4 h-4" /></button>
          </div>
        ))}</div>
      )}
      {undo && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 card px-4 py-3 flex items-center gap-3 text-sm shadow-xl">
          <span><b>{undo.data?.brief?.nome || undo.title}</b> foi para a lixeira. Some sozinha em 15 dias.</span>
          <button onClick={() => recuperar(undo)} className="btn btn-ghost !py-1 text-mint">Desfazer</button>
          <button onClick={() => setUndo(null)} className="text-fog hover:text-white" aria-label="Fechar">×</button>
        </div>
      )}
      {!!trash.length && (
        <div className="mt-10">
          <button onClick={() => setShowTrash((v) => !v)} className="font-mono text-[11px] text-fog tracking-widest uppercase hover:text-white flex items-center gap-2">
            <I.trash className="w-3.5 h-3.5" />Lixeira · {trash.length} {showTrash ? "▴" : "▾"}
          </button>
          {showTrash && (
            <div className="mt-3 card divide-y divide-line">
              <p className="px-4 py-2.5 text-xs text-fog">Marcas excluídas ficam aqui por 15 dias e depois são apagadas de vez.</p>
              {trash.map((b) => {
                const n = diasRestantes(b.archived_at);
                return (
                  <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex h-6 w-16 rounded overflow-hidden shrink-0">{(b.data?.palette || []).map((s: any) => <span key={s.hex} className="flex-1" style={{ background: s.hex }} />)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.data?.brief?.nome || b.title}</p>
                      <p className="text-[11px] text-fog">{n === 0 ? "Será apagada hoje" : `Apagada em ${n} ${n === 1 ? "dia" : "dias"}`}</p>
                    </div>
                    <button onClick={() => recuperar(b)} className="btn btn-ghost !py-1.5 text-sm"><I.refresh className="w-4 h-4" />Recuperar</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
