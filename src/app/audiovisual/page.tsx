import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";

const EDIT = ["edicao", "revisao", "aprovacao"];
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");

export default async function Overview() {
  const s = await createClient();
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const [{ data: ideas }, { data: statuses }, { count: media }, { data: cfg }, { data: clients }] = await Promise.all([
    s.from("content_ideas").select("id,title,body,record_date,status_id,client_id,revisions,approval,format").is("archived_at", null).limit(500),
    s.from("content_statuses").select("id,name,stage,color"),
    s.from("av_media").select("id", { count: "exact", head: true }).eq("missing", false),
    s.from("av_settings").select("drive_folder_name,last_sync_at").maybeSingle(),
    s.from("ag_clients").select("id,name"),
  ]);
  const st = new Map((statuses || []).map((x: any) => [x.id, x]));
  const cl = new Map((clients || []).map((x: any) => [x.id, x.name]));
  const all = (ideas || []).map((i: any) => ({ ...i, st: st.get(i.status_id) as any }));
  const rec = all.filter((i) => i.record_date && i.record_date >= today).sort((a, b) => a.record_date.localeCompare(b.record_date)).slice(0, 6);
  const edit = all.filter((i) => EDIT.includes(i.st?.stage)).slice(0, 6);
  const scripts = all.filter((i) => i.body && ["roteiro", "producao"].includes(i.st?.stage)).length;
  const waiting = all.filter((i) => i.st?.stage === "aprovacao").length;

  const kpis: [string, string | number, string][] = [
    ["Gravações marcadas", rec.length, "a partir de hoje"],
    ["Roteiros prontos", scripts, "para o teleprompter"],
    ["Na edição", edit.length, `${waiting} aguardando o cliente`],
    ["Banco de mídia", media ?? 0, cfg?.drive_folder_name ? `pasta ${cfg.drive_folder_name}` : "Drive não conectado"],
  ];

  return (
    <>
      <PageHead kicker="AUDIOVISUAL" title="Visão geral" desc="O que grava, o que está na edição e o acervo da produtora. Roteiros e datas vêm do Quadro de produção do Creator.">
        <Link href="/audiovisual/midia" className="btn btn-ghost"><I.folder className="w-4 h-4" />Banco de mídia</Link>
        <Link href="/audiovisual/teleprompter" className="btn btn-mint"><I.prompter className="w-4 h-4" />Abrir teleprompter</Link>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map(([k, v, h], i) => (
          <div key={k} className="card p-5 rise" style={{ animationDelay: `${i * 0.04}s` }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">{k}</p>
            <p className="font-display text-3xl font-extrabold mt-2 tabular-nums">{v}</p>
            <p className="text-xs text-fog mt-1 truncate">{h}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Próximas gravações</p>
            <Link href="/creator/producao" className="text-xs text-fog hover:text-paper">Quadro de produção →</Link>
          </div>
          {rec.length === 0 && <p className="text-sm text-fog py-6 text-center">Nenhuma gravação marcada. Defina a data de gravação no cartão do conteúdo.</p>}
          <div className="divide-y divide-line">
            {rec.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <span className="font-mono text-[11px] text-fog w-20 shrink-0 uppercase">{fmtDay(i.record_date)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{i.title}</p>
                  <p className="text-xs text-fog truncate">{[cl.get(i.client_id), i.format, i.st?.name].filter(Boolean).join(" · ")}</p>
                </div>
                {i.body ? (
                  <Link href={`/audiovisual/teleprompter?c=${i.id}`} className="chip chip-mint shrink-0 hover:opacity-80">roteiro pronto</Link>
                ) : <span className="chip shrink-0" style={{ color: "var(--color-amber, #f5c84c)" }}>sem roteiro</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Ilha de edição</p>
            <span className="text-[11px] text-fog">Revisão de cortes chega na Fase 3</span>
          </div>
          {edit.length === 0 && <p className="text-sm text-fog py-6 text-center">Nada em edição agora.</p>}
          <div className="divide-y divide-line">
            {edit.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i.st?.color || "var(--color-fog)" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{i.title}</p>
                  <p className="text-xs text-fog truncate">{[cl.get(i.client_id), `revisão ${i.revisions || 0} de 3`].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="chip shrink-0">{i.st?.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Link href="/audiovisual/teleprompter" className="card p-5 hover:border-mint transition-colors flex gap-4 items-start">
          <span className="w-10 h-10 rounded-xl bg-panel2 grid place-items-center text-mint shrink-0"><I.prompter className="w-5 h-5" /></span>
          <div><p className="font-display font-bold">Teleprompter</p><p className="text-sm text-fog mt-1">Funciona no celular, rola pela sua voz, espelha para o vidro do prompter e pode ser controlado de outro aparelho.</p></div>
        </Link>
        <Link href="/audiovisual/midia" className="card p-5 hover:border-mint transition-colors flex gap-4 items-start">
          <span className="w-10 h-10 rounded-xl bg-panel2 grid place-items-center text-mint shrink-0"><I.folder className="w-5 h-5" /></span>
          <div><p className="font-display font-bold">Banco de mídia</p><p className="text-sm text-fog mt-1">Efeitos, trilhas, inserções, LUTs e modelos direto da sua pasta do Google Drive, com etiquetas, cliente e licença.</p></div>
        </Link>
      </div>
    </>
  );
}
