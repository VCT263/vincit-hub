import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";

const n = (v: any) => (v == null ? "–" : Intl.NumberFormat("pt-BR", { notation: v >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v));

export default async function Overview() {
  const s = await createClient();
  const [{ data: accounts }, { data: posts }, { data: board }, { data: ideas }, { count: refs }, { count: refProfiles }] = await Promise.all([
    s.from("ig_accounts").select("*").order("created_at"),
    s.from("ig_posts").select("account_id,like_count,comments_count,reach,saved,shares,plays,posted_at,caption,permalink,media_type,thumbnail_url").order("posted_at", { ascending: false }).limit(200),
    s.from("content_ideas").select("id,title,format,planned_for,status_id").is("archived_at", null).order("planned_for", { ascending: true, nullsFirst: false }),
    s.from("content_ideas").select("id,title,status,format,kind,planned_for").order("created_at", { ascending: false }).limit(6),
    s.from("references_lib").select("id", { count: "exact", head: true }),
    s.from("ref_profiles").select("id", { count: "exact", head: true }),
  ]);
  const { data: sts } = await s.from("content_statuses").select("id,stage,name,color");
  const stageOf = (id: string | null) => (sts || []).find((x) => x.id === id)?.stage || "ideia";
  const colorOf = (id: string | null) => (sts || []).find((x) => x.id === id)?.color || "#8a8f94";
  const lanes = [
    { t: "Escrever", d: "ideia e roteiro", Icon: I.pen, stages: ["ideia", "roteiro"] },
    { t: "Gravar", d: "pronto para o set", Icon: I.camera, stages: ["producao"] },
    { t: "Editar e publicar", d: "edição até agendado", Icon: I.video, stages: ["edicao", "revisao", "aprovacao", "agendado"] },
  ].map((l) => ({ ...l, items: (board || []).filter((c) => l.stages.includes(stageOf(c.status_id))) }));

  const totalFollowers = (accounts || []).reduce((a, x) => a + (x.followers_count || 0), 0);
  const eng = (p: any) => (p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0) + (p.shares || 0);
  const top = [...(posts || [])].sort((a, b) => eng(b) - eng(a)).slice(0, 4);
  // o que importa no fluxo: quanto conteúdo está no Quadro e quanto já tem data
  const onBoard = (board || []).length;
  const dated = (board || []).filter((x) => x.planned_for).length;

  const kpis = [
    ["Perfis", n(accounts?.length || 0)],
    ["Seguidores somados", n(totalFollowers)],
    ["Conteúdos no Quadro", n(onBoard)],
    ["Com data marcada", n(dated)],
  ];

  const flow = [
    { t: "Base", Icon: I.user, links: [["Perfis & briefing", "/creator/perfis"]] },
    { t: "Análise", Icon: I.chart, links: [["Desempenho", "/creator/desempenho"], ["Referências", "/creator/referencias"], ["Raio-X", "/creator/diagnostico"]] },
    { t: "Criação", Icon: I.flask, links: [["Brainstorm", "/creator/brainstorm"], ["Laboratório", "/creator/laboratorio"]] },
    { t: "Produção", Icon: I.board, links: [["Quadro", "/creator/producao"], ["Calendário", "/creator/pauta"]] },
  ];

  return (
    <>
      <PageHead kicker="CREATOR" title="Visão geral" desc="O que está em cada etapa e o próximo passo de cada conteúdo." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {kpis.map(([k, v], i) => (
          <div key={k} className="card p-5 rise" style={{ animationDelay: `${i * 0.04}s` }}>
            <p className="text-xs text-fog">{k}</p>
            <p className="font-display text-3xl font-bold mt-2 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {!accounts?.length && (
        <div className="card p-6 mb-8 border-mint-dim bg-mint/[.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-lg">Comece conectando um perfil</p>
            <p className="text-fog text-sm mt-1">Conecte pela Meta para métricas e automações reais, ou cadastre manualmente para já usar a IA.</p>
          </div>
          <Link href="/creator/perfis" className="btn btn-mint">Adicionar perfil <I.arrow className="w-4 h-4" /></Link>
        </div>
      )}

      {/* o que fazer agora: o Quadro dividido pelo próximo passo (visual, 27/11) */}
      <div className="flex items-end justify-between mb-3"><h2 className="font-display font-bold text-xl">O que fazer agora</h2><Link href="/creator/producao" className="text-xs text-fog hover:text-mint">Abrir Quadro →</Link></div>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {lanes.map((l) => (
          <section key={l.t} className="card p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-9 h-9 rounded-xl bg-mint/10 text-mint grid place-items-center"><l.Icon className="w-[18px] h-[18px]" /></span>
              <div className="min-w-0 flex-1"><p className="font-display font-bold leading-none">{l.t}</p><p className="text-[11px] text-fog mt-1">{l.d}</p></div>
              <span className="font-display text-2xl font-bold tabular-nums">{l.items.length}</span>
            </div>
            {!l.items.length ? <p className="text-xs text-fog bg-panel2 rounded-lg px-3 py-3 text-center">Nada aqui agora.</p> : (
              <ul className="space-y-1.5">
                {l.items.slice(0, 4).map((c) => (
                  <li key={c.id}><Link href={`/creator/producao?c=${c.id}`} className="flex items-center gap-2 bg-panel2 hover:bg-panel2/70 rounded-lg px-2.5 py-2">
                    <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: colorOf(c.status_id) }} />
                    <span className="min-w-0 flex-1"><span className="block text-sm truncate">{c.title}</span><span className="block text-[10px] text-fog">{[c.format, c.planned_for && new Date(c.planned_for + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })].filter(Boolean).join(" · ")}</span></span>
                  </Link></li>
                ))}
                {l.items.length > 4 && <li className="text-[11px] text-fog px-1">+{l.items.length - 4} no Quadro</li>}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-10">
        {flow.map((f) => (
          <div key={f.t} className="rounded-xl border border-line p-3">
            <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-fog mb-2"><f.Icon className="w-4 h-4 text-mint" />{f.t}</p>
            <div className="flex flex-wrap gap-1">{f.links.map(([l, h]) => <Link key={h} href={h} className="chip hover:text-mint">{l}</Link>)}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Posts com mais engajamento</h2>
            <Link href="/creator/desempenho" className="text-xs text-fog hover:text-mint">Ver desempenho</Link>
          </div>
          {!top.length ? <p className="text-fog text-sm py-8 text-center">Sincronize um perfil conectado para ver os posts aqui.</p> : (
            <ul className="divide-y divide-line">
              {top.map((p, i) => (
                <li key={i} className="py-3 flex gap-3 items-center">
                  <span className="font-mono text-xs text-fog w-4">{i + 1}</span>
                  {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-11 h-11 rounded-md object-cover bg-panel2" /> : <div className="w-11 h-11 rounded-md bg-panel2" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{p.caption || "(sem legenda)"}</p>
                    <p className="text-xs text-fog mt-0.5">{p.media_type} · {p.posted_at?.slice(0, 10)}</p>
                  </div>
                  <span className="font-mono text-sm text-mint">{n(eng(p))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Quadro de produção</h2>
            <Link href="/creator/producao" className="text-xs text-fog hover:text-mint">Abrir Quadro</Link>
          </div>
          {!ideas?.length ? <p className="text-fog text-sm py-8 text-center">Ideias salvas de tendências, referências e copy aparecem aqui.</p> : (
            <ul className="space-y-2">
              {ideas.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 bg-panel2 rounded-lg px-3 py-2.5">
                  <p className="text-sm truncate">{it.title}</p>
                  <span className="chip shrink-0">{it.status}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-fog mt-4">{(refs || 0) + (refProfiles || 0)} referências estudadas</p>
        </section>
      </div>
    </>
  );
}
