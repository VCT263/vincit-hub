"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

type Kit = { id: string; name: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  aguardando_plano: { label: "Esperando o Claude", cls: "text-amber-300 border-amber-300/40" },
  plano_pronto: { label: "Plano pronto", cls: "text-mint border-mint/40" },
  aplicado: { label: "Aplicado no Premiere", cls: "text-fog" },
  cancelado: { label: "Descartado", cls: "text-fog opacity-60" },
};

const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function Premiere() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: se }, { data: k }] = await Promise.all([
      s.from("av_edit_sessions").select("id,sequence_name,project_name,status,request,plan,plan_note,created_at,content_id,duration_sec").order("created_at", { ascending: false }).limit(20),
      s.from("av_style_kits").select("id,name").order("updated_at", { ascending: false }),
    ]);
    setSessions(se || []);
    setKits((k as Kit[]) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = (p: any) => ["cortes", "legendas", "titulos", "zooms", "insercoes", "marcadores"].map((k) => [k, (p?.[k] || []).length]).filter(([, n]) => n);

  return (
    <>
      <PageHead kicker="AUDIOVISUAL · PÓS-PRODUÇÃO" title="Premiere com o Claude"
        desc="O painel VINCIT HUB no Premiere manda a sequência (clipes e transcrição) para o Claude. O Claude devolve o plano de edição no estilo do kit do cliente e você aplica com um clique, revisando tudo no Premiere." />

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="card p-5 lg:col-span-1">
          <p className="font-display text-lg font-extrabold">Como usar</p>
          <ol className="text-sm text-fog mt-3 space-y-3 list-decimal pl-4">
            <li>Baixe o plugin e dê dois cliques no arquivo. O Creative Cloud instala. Precisa do Premiere Pro 25.6 ou mais novo.
              <a href="/downloads/vincit-hub-premiere.ccx" className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-mint text-ink"><I.arrow className="w-4 h-4" />Baixar plugin (.ccx)</a>
            </li>
            <li>No Premiere: Janela › Extensões › <b className="text-paper">VINCIT HUB</b>. Entre com seu e-mail e senha do HUB.</li>
            <li>Abra a sequência, escolha o conteúdo e o kit e clique em <b className="text-paper">Transcrever clipes</b> e depois em <b className="text-paper">Enviar ao Claude</b>.</li>
            <li>No Claude (com o conector VINCIT HUB), peça: <i className="text-paper">&quot;faça o plano da edição do Premiere&quot;</i>.</li>
            <li>O plano aparece no painel em segundos. Escolha o que aplicar. Cmd+Z desfaz tudo de uma vez.</li>
          </ol>
          <p className="text-xs text-fog mt-4">O que já entra direto: marcadores, legendas e títulos com os MOGRTs do kit, zoom por keyframe e B-roll que já está no projeto. Os cortes entram como marcadores para você conferir e cortar.</p>
        </section>

        <section className="card p-5 lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-extrabold">Edições enviadas</p>
            <button onClick={load} className="chip"><I.refresh className="w-3.5 h-3.5" />Atualizar</button>
          </div>
          {!sessions ? <p className="text-sm text-fog mt-4">Carregando…</p> : !sessions.length ? (
            <p className="text-sm text-fog mt-4">Nenhuma sequência enviada ainda. Elas aparecem aqui quando você clica em Enviar ao Claude no Premiere.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {sessions.map((s) => {
                const st = STATUS[s.status] || STATUS.aguardando_plano;
                return (
                  <li key={s.id} className="py-3 flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{s.sequence_name || "Sequência"} <span className="text-fog font-normal">· {s.project_name}</span></p>
                      {s.request && <p className="text-sm text-fog mt-0.5">“{s.request}”</p>}
                      {s.plan?.resumo && <p className="text-sm mt-1">{s.plan.resumo}</p>}
                      {s.plan && <div className="flex flex-wrap gap-1.5 mt-2">{counts(s.plan).map(([k, n]) => <span key={k as string} className="chip">{n} {k}</span>)}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`chip ${st.cls}`}>{st.label}</span>
                      <p className="text-xs text-fog mt-1 font-mono">{fmtDate(s.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5 mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-display text-lg font-extrabold">Kits de estilo</p>
          <p className="text-sm text-fog">{kits.length ? `${kits.length} kit(s): ${kits.map((k) => k.name).join(", ")}.` : "Nenhum kit ainda."} Cores, fontes, legenda, câmera e MOGRTs de cada cliente ficam na página do kit.</p>
        </div>
        <Link href="/audiovisual/kit" className="chip"><I.pen className="w-3.5 h-3.5" />Abrir kits de estilo</Link>
      </section>
    </>
  );
}

