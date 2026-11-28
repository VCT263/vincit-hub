"use client";
import { aiFetch } from "@/lib/aiFetch";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAccounts, fmt } from "@/lib/useAccounts";
import { AXES, axisLabel } from "@/lib/diagnostico";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { apagarComLixeira } from "@/lib/lixeira";

const STEPS = [
  { n: "1", t: "Diagnóstico", d: "Onde o perfil está hoje", href: "" },
  { n: "2", t: "Estratégia", d: "O que fazer em 30/60/90 dias", href: "/creator/estrategia" },
  { n: "3", t: "Implementação", d: "Quais conteúdos e quando", href: "/creator/pauta" },
];

function Score({ v }: { v: number | null }) {
  if (v == null) return <span className="text-xs text-fog font-mono">sem informação</span>;
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="h-2 flex-1 bg-panel2 rounded-full overflow-hidden"><div className="h-full bg-mint" style={{ width: `${v * 10}%` }} /></div>
      <span className="font-mono text-sm text-mint">{v}</span>
    </div>
  );
}

export default function Diagnostico() {
  const { accounts } = useAccounts();
  const [accId, setAccId] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [cur, setCur] = useState<any>(null);
  const [noTable, setNoTable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [queued, setQueued] = useState<{ id: string; since: string } | null>(null);
  const acc = accounts.find((a) => a.id === accId);

  useEffect(() => { if (!accId && accounts[0]) setAccId(new URLSearchParams(location.search).get("perfil") || accounts[0].id); }, [accounts, accId]);
  const load = useCallback(async () => {
    if (!accId) return;
    const { data, error } = await createClient().from("profile_diagnoses").select("*").eq("account_id", accId).order("created_at", { ascending: false });
    setNoTable(!!error);
    setList(data || []); setCur((data || [])[0] || null); setSel([]); setMsg(null);
  }, [accId]);
  useEffect(() => { load(); }, [load]);

  // Pedido já feito e ainda não entregue (a pessoa saiu da tela ou clicou de novo): retoma em vez de criar outro.
  useEffect(() => {
    if (!accId) return;
    setQueued(null);
    (async () => {
      const since = new Date(Date.now() - 2 * 864e5).toISOString();
      const { data } = await createClient().from("ai_requests").select("id,status,created_at").eq("endpoint", "diagnostico").eq("account_id", accId)
        .in("status", ["pending", "done"]).is("delivered_at", null).gte("created_at", since).order("created_at", { ascending: false }).limit(1);
      const q = data?.[0];
      if (q) { setQueued({ id: q.id, since: q.created_at }); run(q.id); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accId]);

  async function run(resume?: string) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await aiFetch("/api/ai/diagnostico", resume ? { account_id: accId, _ai_request: resume } : { account_id: accId });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro");
      const row = { id: j.id, created_at: j.created_at, result: j.result, inputs: j.inputs, account_id: accId };
      if (j.saved) await load(); else { setList([row, ...list]); setNoTable(true); setCur(row); setSel([]); }
    } catch (e: any) { setErr(e.message); }
    setQueued(null); setBusy(false);
  }

  async function toPauta() {
    const recs = (cur.result.eixos || []).flatMap((e: any) => (e.recomendacoes || []).map((x: any) => ({ ...x, axis: e.key }))).filter((x: any) => sel.includes(x.id));
    if (!recs.length) return;
    const rows = recs.map((x: any) => ({
      account_id: accId, kind: "diagnostico", title: x.titulo.slice(0, 120), format: x.formato || null, pillar: x.pilar || null, hook: x.gancho || null,
      body: `**Eixo:** ${axisLabel(x.axis)}\n\n**Por quê:** ${x.porque || ""}\n\n**Gancho:** ${x.gancho || ""}\n\n_Raio-X de ${new Date(cur.created_at).toLocaleDateString("pt-BR")}_`,
    }));
    const sb = createClient();
    const { error } = await sb.from("content_ideas").insert(rows.map((r: any, i: number) => ({ ...r, axis: recs[i].axis, diagnosis_id: cur.id || null })));
    if (error) { const { error: e2 } = await sb.from("content_ideas").insert(rows); if (e2) { setMsg(`Não consegui salvar: ${e2.message}`); return; } }
    setMsg(`${rows.length} ideia(s) no Quadro, na coluna Ideia.`); setSel([]);
  }
  async function del() { if (!cur?.id) return; if (!(await apagarComLixeira({ tabela: "profile_diagnoses", filtro: { id: cur.id }, oque: "esta versão do diagnóstico", rotulo: `Diagnóstico v${cur.version || ""}`.trim(), link: "/creator/diagnostico" }))) return; load(); }

  const r = cur?.result || {};
  const inp = cur?.inputs || {};
  const prev = cur ? list[list.findIndex((x) => x === cur || (x.id && x.id === cur.id)) + 1] : null;
  const prevNota = (k: string) => prev?.result?.eixos?.find((e: any) => e.key === k)?.nota ?? null;
  const scored = (r.eixos || []).filter((e: any) => e.nota != null);
  const media = scored.length ? Math.round((scored.reduce((a: number, e: any) => a + e.nota, 0) / scored.length) * 10) / 10 : null;

  return (
    <>
      {accId && <Link href={`/creator/desempenho/${accId}?aba=plano`} className="inline-flex items-center gap-2 text-sm text-fog hover:text-paper mb-3"><I.back className="w-4 h-4" />Perfis & marca{acc ? ` · @${acc.username}` : ""}</Link>}
      <PageHead kicker="CREATOR · PERFIS & MARCA · PLANO" title="Raio-X e estratégia" desc="Diagnóstico estratégico do perfil, do mercado e do nicho em 5 eixos de crescimento. Usa só dados reais: métricas, briefing, referências e pesquisa de mercado." />

      <div className="grid md:grid-cols-3 gap-2 mb-5">
        {STEPS.map((s, i) => {
          const body = (<><p className="font-mono text-[11px] text-mint">ETAPA {s.n}</p><p className="font-display font-bold">{s.t}</p><p className="text-xs text-fog">{s.d}</p></>);
          return s.href ? <Link key={s.n} href={s.href} className="card p-4 hover:border-mint-dim">{body}</Link> : <div key={s.n} className={`card p-4 ${i === 0 ? "border-mint-dim bg-mint/[.04]" : ""}`}>{body}</div>;
        })}
      </div>

      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
        <select className="input !w-auto" value={accId} onChange={(e) => setAccId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}</select>
        {acc && <span className="text-xs text-fog">{fmt(acc.followers_count)} seguidores</span>}
        {list.length > 1 && <select className="input !w-auto ml-auto" value={list.indexOf(cur)} onChange={(e) => { setCur(list[Number(e.target.value)]); setSel([]); }}>{list.map((x, i) => <option key={x.id || i} value={i}>{new Date(x.created_at).toLocaleDateString("pt-BR")}</option>)}</select>}
        <button onClick={() => run()} disabled={busy || !acc} className={`btn btn-sm btn-mint ${list.length > 1 ? "" : "ml-auto"}`}><I.spark className="w-4 h-4" />{busy ? "Aguardando o Claude…" : cur ? "Refazer diagnóstico" : "Fazer diagnóstico"}</button>
      </div>
      {!accounts.length && <p className="text-fog text-sm text-center py-10">Cadastre um perfil em <Link href="/creator/perfis" className="text-mint underline">Perfis & briefing</Link> para fazer o diagnóstico.</p>}
      {busy && <section className="card p-5 mb-5 border-mint-dim">
        <p className="label text-mint mb-3">Raio-X na fila do Claude{queued ? ` desde ${new Date(queued.since).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <div className="bg-panel2 rounded-lg p-3"><p className="font-mono text-[11px] text-mint">1 · ENVIADO</p><p>O HUB juntou métricas, briefing e referências e mandou o pedido.</p></div>
          <div className="rounded-lg p-3 border border-mint/40"><p className="font-mono text-[11px] text-mint">2 · VOCÊ</p><p>Abra o Claude e peça: <b>“responda os pedidos do HUB”</b>. Leva de 2 a 5 minutos, com pesquisa de mercado.</p></div>
          <div className="bg-panel2 rounded-lg p-3"><p className="font-mono text-[11px] text-fog">3 · PRONTO</p><p className="text-fog">O resultado aparece aqui sozinho. Pode sair desta tela: ao voltar, ele é retomado.</p></div>
        </div>
      </section>}
      {err && <div className="card px-4 py-3 mb-5 text-sm text-danger border-danger/40">{err}</div>}
      {noTable && cur && <div className="card px-4 py-3 mb-5 text-sm text-fog">O histórico de versões ainda está sendo preparado no banco: este diagnóstico aparece agora, mas não fica salvo para comparar depois.</div>}

      {cur && (
        <div className="space-y-5">
          <section className="card p-5 md:p-6">
            <div className="grid md:grid-cols-[180px_1fr] gap-6 items-center">
              <div className="text-center md:border-r md:border-line md:pr-6">
                <p className="text-xs text-fog">Nota média</p>
                <p className="font-display text-6xl font-extrabold text-mint leading-none my-1">{media ?? "–"}</p>
                <p className="text-[11px] text-fog">{scored.length} de 5 eixos avaliados</p>
                <div className="flex justify-center gap-1.5 mt-3 text-[10px] font-mono text-fog flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-panel2">{inp.posts?.n ?? 0} posts</span>
                  <span className="px-1.5 py-0.5 rounded bg-panel2">briefing {inp.briefing_pct ?? 0}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-panel2">{(inp.referencias?.perfis ?? 0) + (inp.referencias?.biblioteca ?? 0)} refs</span>
                </div>
              </div>
              <div className="space-y-2">
                {AXES.map((a) => {
                  const e = (r.eixos || []).find((x: any) => x.key === a.key) || {};
                  const v = e.nota ?? null;
                  const tone = v == null ? "bg-panel2" : v >= 7 ? "bg-mint" : v >= 5 ? "bg-amber-400" : "bg-danger";
                  return (
                    <a key={a.key} href={`#eixo-${a.key}`} className="flex items-center gap-3 group">
                      <span className="w-36 shrink-0 text-sm truncate group-hover:text-mint">{a.label}</span>
                      <span className="h-3 flex-1 bg-panel2 rounded-full overflow-hidden"><span className={`block h-full ${tone}`} style={{ width: `${(v ?? 0) * 10}%` }} /></span>
                      <span className="w-10 text-right font-mono text-sm">{v ?? "–"}</span>
                    </a>
                  );
                })}
              </div>
            </div>
            {r.resumo && <details className="mt-5 bg-panel2 rounded-lg p-3 text-sm">
              <summary className="cursor-pointer"><b>{String(r.resumo).split(/(?<=[.!?])\s/)[0]}</b> <span className="text-mint text-xs">ler resumo completo</span></summary>
              <p className="leading-relaxed mt-2 text-fog">{r.resumo}</p>
            </details>}
            {cur.id && <button onClick={del} className="text-[11px] text-fog hover:text-danger mt-3">Excluir versão</button>}
          </section>

          {!!r.prioridades?.length && <section>
            <p className="label text-mint mb-2">Prioridades</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {r.prioridades.map((p: string, i: number) => (
                <div key={i} className="card p-4 flex gap-3 items-start">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-mint text-ink font-display font-extrabold grid place-items-center">{i + 1}</span>
                  <p className="text-sm">{p}</p>
                </div>
              ))}
            </div>
          </section>}

          <div className="grid lg:grid-cols-2 gap-4">
            {AXES.map((a) => {
              const e = (r.eixos || []).find((x: any) => x.key === a.key) || {};
              const pn = prevNota(a.key);
              return (
                <section key={a.key} id={`eixo-${a.key}`} className="card p-5 scroll-mt-20">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div><p className="font-display font-bold">{a.label}</p><p className="text-xs text-fog">{a.q}</p></div>
                    <div className="text-right"><Score v={e.nota ?? null} />{pn != null && e.nota != null && e.nota !== pn && <p className={`text-[11px] font-mono mt-1 ${e.nota > pn ? "text-mint" : "text-danger"}`}>{e.nota > pn ? "+" : ""}{Math.round((e.nota - pn) * 10) / 10} desde a versão anterior</p>}</div>
                  </div>
                  {e.nota == null ? (
                    <p className="text-sm text-fog">Falta {a.needs} para avaliar este eixo. <Link href={a.fix[1]} className="text-mint underline">{a.fix[0]}</Link></p>
                  ) : (
                    <>
                      {e.evidencia && <p className="text-sm border-l-2 border-mint pl-3 text-fog">{e.evidencia}</p>}
                      <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
                        {!!e.pontos_fortes?.length && <div className="rounded-lg border border-mint/30 bg-mint/5 p-3"><p className="text-[11px] text-mint mb-1.5 font-semibold">✓ Pontos fortes</p><ul className="space-y-1">{e.pontos_fortes.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>}
                        {!!e.lacunas?.length && <div className="rounded-lg border border-danger/30 bg-danger/5 p-3"><p className="text-[11px] text-danger mb-1.5 font-semibold">! Lacunas</p><ul className="space-y-1">{e.lacunas.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>}
                      </div>
                      {!!e.recomendacoes?.length && <div className="mt-4"><p className="text-[11px] text-fog mb-1">Recomendações de conteúdo</p><ul className="space-y-1.5">{e.recomendacoes.map((x: any) => (
                        <li key={x.id}><label className="flex items-start gap-2 text-sm cursor-pointer bg-panel2 rounded-lg p-2.5">
                          <input type="checkbox" className="accent-[var(--color-mint)] mt-1" checked={sel.includes(x.id)} onChange={() => setSel(sel.includes(x.id) ? sel.filter((s) => s !== x.id) : [...sel, x.id])} />
                          <span><b>{x.titulo}</b> <span className="text-fog text-xs">· {x.formato}{x.pilar ? ` · ${x.pilar}` : ""}</span>{x.gancho && <span className="block text-xs mt-0.5">“{x.gancho}”</span>}{x.porque && <span className="block text-xs text-fog mt-0.5">{x.porque}</span>}</span>
                        </label></li>
                      ))}</ul></div>}
                    </>
                  )}
                </section>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {r.nicho && <section className="card p-5"><p className="label text-mint mb-3">Nicho</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {r.nicho.posicionamento_atual && <div className="bg-panel2 rounded-lg p-3"><p className="text-[11px] text-fog mb-1">Hoje</p><p className="text-sm">{r.nicho.posicionamento_atual}</p></div>}
                {r.nicho.lacuna && <div className="rounded-lg p-3 border border-mint/40"><p className="text-[11px] text-mint mb-1">Espaço livre</p><p className="text-sm">{r.nicho.lacuna}</p></div>}
              </div>
              {!!r.nicho.oportunidades?.length && <div className="flex flex-wrap gap-1.5 mt-3">{r.nicho.oportunidades.map((x: string, i: number) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-panel2">{x}</span>)}</div>}
            </section>}
            <section className="card p-5"><p className="label text-mint">Mercado</p>
              {r.mercado ? <>
                <p className="text-sm text-fog">{r.mercado.resumo}</p>
                {!!r.mercado.sinais?.length && <div className="grid gap-2 mt-3">{r.mercado.sinais.map((s: any, i: number) => <a key={i} href={s.fonte} target="_blank" rel="noopener noreferrer" className="flex gap-2 items-start bg-panel2 rounded-lg p-2.5 text-sm hover:border-mint border border-transparent"><span className="text-mint">↗</span><span>{s.texto}</span></a>)}</div>}
              </> : <p className="text-sm text-fog">Sem informação: informe o nicho no <Link href="/creator/perfis?tab=briefing" className="text-mint underline">briefing</Link> para a pesquisa de mercado.</p>}
            </section>
          </div>

          {r.evolucao && <section className="card p-5"><p className="label text-mint">Evolução desde a versão anterior</p><p className="text-sm">{r.evolucao}</p></section>}

          <div className="card p-5 flex flex-wrap items-center gap-3 border-mint-dim sticky bottom-4">
            <p className="flex-1 min-w-[220px] text-sm">{msg || (sel.length ? `${sel.length} recomendação(ões) selecionada(s).` : "Selecione recomendações para virar ideias no Quadro, ou siga para a estratégia.")}</p>
            <button onClick={toPauta} disabled={!sel.length} className="btn btn-ghost btn-sm"><I.board className="w-4 h-4" />Enviar ao Quadro</button>
            <Link href={`/creator/estrategia?perfil=${accId}&novo=1`} className="btn btn-mint btn-sm"><I.trend className="w-4 h-4" />Montar estratégia</Link>
          </div>
        </div>
      )}
      {acc && !cur && !busy && <p className="text-fog text-sm text-center py-10">Nenhum diagnóstico deste perfil ainda.</p>}
    </>
  );
}
