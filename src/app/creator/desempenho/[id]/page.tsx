"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/useAccounts";
import { useAI } from "@/lib/useAI";
import Markdown from "@/components/Markdown";
import { I } from "@/components/icons";
import { pct, taxas } from "@/lib/mixModa";
import { AreaChart, Spark, SignalColumns, HBar, LILAS, num } from "@/components/creator/Graficos";

const FORMATOS: Record<string, string> = { REELS: "Reels", CAROUSEL_ALBUM: "Carrossel", IMAGE: "Foto", VIDEO: "Vídeo" };
const formato = (t?: string) => FORMATOS[t || ""] || t || "Outro";

/** métricas da conta, na ordem do Business Suite (Insights > Resultados) */
const METRICAS = [
  { k: "views", label: "Visualizações", hint: "vezes que seu conteúdo apareceu" },
  { k: "reach", label: "Alcance", hint: "contas diferentes que viram" },
  { k: "total_interactions", label: "Interações", hint: "curtidas, comentários, salvos e compart." },
  { k: "profile_views", label: "Visitas ao perfil", hint: "pessoas que abriram o perfil" },
  { k: "follows", label: "Novos seguidores", hint: "seguidores ganhos no período" },
  { k: "profile_links_taps", label: "Cliques no link", hint: "toques no link da bio" },
] as const;
type MK = (typeof METRICAS)[number]["k"];

export default function Perfil() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [acc, setAcc] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [diag, setDiag] = useState("");
  const [edit, setEdit] = useState(false);
  const [sort, setSort] = useState<"recent" | "sinal">("recent");
  const [voiceEdit, setVoiceEdit] = useState(false);
  const [samples, setSamples] = useState("");
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<MK>("views");
  const [ins, setIns] = useState<any>(null);
  const [insErr, setInsErr] = useState<string | null>(null);
  const [insLoading, setInsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const ai = useAI();

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: a }, { data: p }, { data: all }] = await Promise.all([
      s.from("ig_accounts").select("*").eq("id", id).single(),
      s.from("ig_posts").select("*").eq("account_id", id).order("posted_at", { ascending: false }),
      s.from("ig_accounts").select("id,username,profile_picture_url,connected").order("created_at"),
    ]);
    setAcc(a); setPosts(p || []); setAccounts(all || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const loadIns = useCallback(async () => {
    if (!acc?.connected) return;
    setInsLoading(true); setInsErr(null);
    try {
      const r = await fetch(`/api/meta/insights?account_id=${id}&days=${days}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Não foi possível ler os resultados da Meta.");
      setIns(j);
    } catch (e: any) { setInsErr(e.message); setIns(null); }
    setInsLoading(false);
  }, [id, days, acc?.connected]);
  useEffect(() => { loadIns(); }, [loadIns]);

  async function sync() {
    setSyncing(true); setMsg(null);
    const r = await fetch("/api/meta/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account_id: id }) });
    const j = await r.json();
    setMsg(r.ok ? `${j.posts} posts sincronizados.` : j.error);
    setSyncing(false); load(); loadIns();
  }
  async function save() {
    await createClient().from("ig_accounts").update({ niche: acc.niche, goals: acc.goals, followers_count: acc.followers_count, brand_voice: acc.brand_voice || null }).eq("id", id);
    setEdit(false);
  }
  async function remove() {
    if (!confirm(`Remover @${acc.username} do Creator? Posts e automações dele também serão removidos.`)) return;
    await createClient().from("ig_accounts").delete().eq("id", id);
    router.push("/creator/perfis");
  }
  async function diagnose() {
    const r = await ai.run<{ text: string }>("profile_diagnosis", { account: acc, posts, resultados: ins ? { dias: ins.days, atual: ins.current, anterior: ins.previous } : null });
    if (r) setDiag(r.text);
  }
  async function saveDiag() {
    await createClient().from("content_ideas").insert({ account_id: id, kind: "diagnostico", title: `Diagnóstico @${acc.username} · ${new Date().toLocaleDateString("pt-BR")}`, body: diag });
    setMsg("Diagnóstico salvo na pauta.");
  }
  async function genVoice() {
    const r = await ai.run<{ text: string }>("brand_voice", { account: acc, samples });
    if (r) { setAcc({ ...acc, brand_voice: r.text }); await createClient().from("ig_accounts").update({ brand_voice: r.text }).eq("id", id); setVoiceEdit(false); }
  }
  async function saveVoice() { await createClient().from("ig_accounts").update({ brand_voice: acc.brand_voice || null }).eq("id", id); setVoiceEdit(false); }

  // ---- números dos posts (o que o Instagram mais pesa: compartilhamentos e salvamentos por alcance)
  const calc = useMemo(() => {
    const perf = (p: any) => p.plays ?? p.reach ?? null;
    const vals = posts.map(perf).filter((v: any) => v != null).sort((a: number, b: number) => a - b);
    const median = vals.length ? (vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2) : 0;
    const xMed = (p: any) => (median && perf(p) != null ? perf(p) / median : null);
    const avgOf = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const eng = (p: any) => (p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0) + (p.shares || 0);
    const compartMed = avgOf(posts.map((p) => taxas(p).compart));
    const salvosMed = avgOf(posts.map((p) => taxas(p).salvos));
    const avgReach = avgOf(posts.map((p) => p.reach ?? null));
    const avgViews = avgOf(posts.map((p) => p.plays ?? null));
    const avgEng = posts.length ? posts.reduce((a, p) => a + eng(p), 0) / posts.length : null;
    const engRate = avgEng != null && acc?.followers_count ? avgEng / acc.followers_count : null;
    const byType: Record<string, { n: number; s: number[]; r: number[]; e: number }> = {};
    posts.forEach((p) => {
      const k = p.media_type || "?"; byType[k] ??= { n: 0, s: [], r: [], e: 0 };
      byType[k].n++; byType[k].e += eng(p);
      const t = taxas(p).sinal; if (t != null) byType[k].s.push(t);
      if (p.reach != null) byType[k].r.push(p.reach);
    });
    const useRate = Object.values(byType).some((v) => v.s.length);
    const ranking = Object.entries(byType).map(([k, v]) => ({
      k, n: v.n, val: useRate ? avgOf(v.s) ?? 0 : v.e / v.n, reach: avgOf(v.r),
    })).sort((a, b) => b.val - a.val);
    const sinal = (p: any) => taxas(p).sinal ?? -1;
    const top = [...posts].filter((p) => taxas(p).sinal != null).sort((a, b) => sinal(b) - sinal(a)).slice(0, 6);
    const cols = [...posts].reverse().filter((p) => p.reach).map((p) => ({ id: p.id, date: (p.posted_at || "").slice(0, 10), a: taxas(p).compart || 0, b: taxas(p).salvos || 0, caption: p.caption, thumb: p.thumbnail_url, tipo: formato(p.media_type) }));
    return { xMed, eng, compartMed, salvosMed, avgReach, avgViews, engRate, ranking, useRate, top, cols, sinal };
  }, [posts, acc?.followers_count]);

  if (!acc) return <p className="text-fog">Carregando…</p>;
  const { xMed, compartMed, salvosMed, avgReach, avgViews, engRate, ranking, useRate, top, cols, sinal } = calc;
  const sorted = sort === "sinal" ? [...posts].sort((a, b) => sinal(b) - sinal(a) || calc.eng(b) - calc.eng(a)) : posts;
  const sel = METRICAS.find((m) => m.k === metric)!;
  const serie = (k: MK) => (ins?.series || []).map((d: any) => ({ date: d.date, v: d[k] ?? null }));
  const delta = (k: MK) => {
    const c = ins?.current?.[k], p = ins?.previous?.[k];
    if (c == null || p == null || k === "follows" || !p) return null;
    return (c - p) / p;
  };
  const avail = (k: MK) => ins?.current?.[k] != null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <Link href="/creator/perfis" className="inline-flex items-center gap-2 text-sm text-fog hover:text-paper"><I.back className="w-4 h-4" />Perfis & marca</Link>
        {accounts.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scroll-thin -mx-1 px-1">
            {accounts.map((a) => (
              <Link key={a.id} href={`/creator/desempenho/${a.id}`} className={`chip whitespace-nowrap !text-xs !py-1 ${a.id === id ? "chip-mint" : "hover:text-paper"}`}>
                {a.profile_picture_url ? <img src={a.profile_picture_url} alt="" className="w-4 h-4 rounded-full object-cover" /> : null}@{a.username}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 rise">
        <div className="flex items-center gap-4 min-w-0">
          {acc.profile_picture_url ? <img src={acc.profile_picture_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-mint/40" /> : <div className="w-16 h-16 rounded-full bg-panel2 grid place-items-center font-display text-2xl font-bold text-mint">{acc.username[0]?.toUpperCase()}</div>}
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-mint tracking-widest uppercase">Creator · Desempenho & insights</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight truncate">@{acc.username}</h1>
            <p className="text-fog text-sm">{fmt(acc.followers_count)} seguidores{acc.media_count ? ` · ${fmt(acc.media_count)} posts` : ""}{acc.last_synced_at && ` · sincronizado ${new Date(acc.last_synced_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {acc.connected && <button onClick={sync} disabled={syncing} className="btn btn-ghost"><I.refresh className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando…" : "Sincronizar"}</button>}
          <button onClick={diagnose} disabled={ai.busy} className="btn btn-mint"><I.spark className="w-4 h-4" />{ai.busy ? "Analisando…" : "Diagnóstico com IA"}</button>
        </div>
      </div>
      {msg && <div className="card px-4 py-3 mb-5 text-sm text-mint border-mint-dim">{msg}</div>}
      {ai.error && <div className="card px-4 py-3 mb-5 text-sm text-danger border-danger/40">{ai.error}</div>}

      {/* 1. Resultados da conta */}
      <section className="mb-8">
        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <div>
            <p className="font-mono text-[11px] text-mint tracking-widest uppercase">01 · Resultados</p>
            <h2 className="font-display text-xl font-bold">Como a conta foi nos últimos {days} dias</h2>
          </div>
          <div className="flex rounded-[10px] border border-line p-0.5 text-xs">
            {[7, 14, 30].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-[8px] ${days === d ? "bg-mint text-[#06140e] font-semibold" : "text-fog hover:text-paper"}`}>{d} dias</button>)}
          </div>
        </div>

        {!acc.connected ? (
          <div className="card p-6 text-sm text-fog">Perfil manual. Conecte pela Meta em <Link href="/creator/perfis" className="text-mint underline">Perfis & marca</Link> para ver alcance, visualizações e seguidores por dia.</div>
        ) : insErr ? (
          <div className="card p-5 text-sm"><p className="text-danger">{insErr}</p><button onClick={loadIns} className="btn btn-ghost btn-sm mt-3"><I.refresh className="w-3.5 h-3.5" />Tentar de novo</button></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-3">
              {METRICAS.map((m) => {
                const v = ins?.current?.[m.k];
                const d = delta(m.k);
                const on = metric === m.k;
                return (
                  <button key={m.k} onClick={() => setMetric(m.k)} disabled={!ins || !avail(m.k)}
                    className={`card p-3.5 text-left transition-colors disabled:opacity-60 ${on ? "!border-mint" : "hover:border-fog/50"}`}>
                    <p className="text-xs text-fog truncate">{m.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="font-display text-2xl font-bold">{insLoading && !ins ? <span className="inline-block w-12 h-6 rounded bg-panel2 animate-pulse" /> : num(v)}</p>
                      {d != null && <span className={`text-[11px] font-semibold ${d >= 0 ? "text-mint" : "text-danger"}`}>{d >= 0 ? "↑" : "↓"} {Math.abs(d * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>}
                    </div>
                    <div className="mt-2"><Spark values={serie(m.k).map((x: any) => x.v)} active={on} /></div>
                  </button>
                );
              })}
            </div>
            <div className="card p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-display font-bold">{sel.label} por dia</p>
                  <p className="text-xs text-fog">{sel.hint}{delta(metric) != null && ` · comparado aos ${days} dias anteriores (${num(ins?.previous?.[metric])})`}</p>
                </div>
                {insLoading && <I.refresh className="w-4 h-4 text-fog animate-spin" />}
              </div>
              {ins ? <AreaChart key={metric + days} data={serie(metric)} label={sel.label} /> : <div className="h-[220px] rounded-[10px] bg-panel2/50 animate-pulse" />}
            </div>
          </>
        )}
      </section>

      {/* 2. O que o Instagram pesa */}
      <section className="mb-8">
        <p className="font-mono text-[11px] text-mint tracking-widest uppercase">02 · O que o algoritmo pesa</p>
        <h2 className="font-display text-xl font-bold">Compartilhamentos e salvamentos por alcance</h2>
        <p className="text-sm text-fog mb-3 max-w-2xl">O Instagram hoje pesa mais compartilhamentos, salvamentos, tempo assistido e views do que curtidas e seguidores. Média dos últimos {posts.length} posts sincronizados.</p>

        <div className="grid lg:grid-cols-3 gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <Big label="Compartilhamentos" value={pct(compartMed, 2)} hint="por pessoa alcançada" dot="var(--color-mint)" />
            <Big label="Salvamentos" value={pct(salvosMed, 2)} hint="por pessoa alcançada" dot={LILAS} />
            <Big label="Alcance médio" value={num(avgReach && Math.round(avgReach))} hint="pessoas por post" />
            <Big label="Views médias" value={num(avgViews && Math.round(avgViews))} hint={`engajamento ${engRate != null ? (engRate * 100).toFixed(1) + "%" : "–"} por seguidor (pesa menos)`} />
          </div>
          <div className="card p-4 md:p-5 lg:col-span-2 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div><p className="font-display font-bold">Post a post</p><p className="text-xs text-fog">Cada coluna é um post, do mais antigo ao mais recente. Passe o dedo ou o mouse para ver.</p></div>
              <div className="flex gap-3 text-xs text-fog">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-mint" />Compartilhamentos</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LILAS }} />Salvamentos</span>
              </div>
            </div>
            {cols.length ? <SignalColumns posts={cols} /> : <p className="text-fog text-sm py-10 text-center">Sem posts com alcance. {acc.connected ? "Clique em Sincronizar." : ""}</p>}
          </div>
        </div>
      </section>

      {/* 3. Ranking de formatos + melhores posts */}
      <section className="grid lg:grid-cols-3 gap-3 mb-8">
        <div className="card p-4 md:p-5">
          <p className="font-mono text-[11px] text-mint tracking-widest uppercase">03 · Ranking de formatos</p>
          <p className="text-xs text-fog mb-4">{useRate ? "Compartilhamentos + salvamentos por alcance, média por formato" : "Engajamento médio por formato"}</p>
          {!ranking.length ? <p className="text-fog text-sm">Sem posts sincronizados.</p> : (
            <ol className="space-y-4">
              {ranking.map((r, i) => (
                <li key={r.k}>
                  <div className="flex items-baseline gap-3 mb-1.5">
                    <span className={`font-display text-lg font-extrabold w-6 ${i === 0 ? "text-mint" : "text-fog"}`}>{i + 1}</span>
                    <span className="font-semibold flex-1">{formato(r.k)} <span className="text-fog text-xs font-normal">· {r.n} {r.n === 1 ? "post" : "posts"}{r.reach != null ? ` · ${num(Math.round(r.reach))} de alcance médio` : ""}</span></span>
                    <span className="font-semibold text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{useRate ? pct(r.val, 2) : num(Math.round(r.val))}</span>
                  </div>
                  <div className="pl-9"><HBar value={r.val} max={ranking[0].val} color={i === 0 ? "var(--color-mint)" : "var(--color-slate)"} /></div>
                </li>
              ))}
            </ol>
          )}
          {ranking.length > 1 && <p className="text-xs text-fog mt-5 pt-4 border-t border-line">Faça mais <b className="text-paper">{formato(ranking[0].k)}</b>: é o formato que mais gera compartilhamento e salvamento por pessoa alcançada.</p>}
        </div>

        <div className="card p-4 md:p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div><p className="font-mono text-[11px] text-mint tracking-widest uppercase">04 · Melhores posts</p><p className="text-xs text-fog">Os que mais foram compartilhados e salvos por alcance. Repita o que eles têm em comum.</p></div>
          </div>
          {!top.length ? <p className="text-fog text-sm">Sem posts com alcance.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {top.map((p, i) => {
                const t = taxas(p); const xm = xMed(p);
                return (
                  <a key={p.id} href={p.permalink} target="_blank" className="group rounded-[12px] overflow-hidden bg-panel2 border border-line hover:border-mint transition-colors">
                    <div className="relative aspect-[4/5] bg-ink">
                      {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform" /> : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <span className="absolute top-2 left-2 font-display font-extrabold text-sm bg-black/60 text-paper rounded-md px-1.5">#{i + 1}</span>
                      {xm != null && <span className={`absolute top-2 right-2 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${xm >= 2 ? "bg-mint text-[#06140e]" : "bg-black/60 text-paper"}`}>{xm.toFixed(1)}x mediana</span>}
                      <div className="absolute bottom-0 inset-x-0 p-2.5">
                        <p className="font-display text-xl font-bold text-paper leading-none">{pct(t.sinal, 1)}</p>
                        <p className="text-[10px] text-paper/70 mt-0.5">compart. + salvos por alcance</p>
                      </div>
                    </div>
                    <div className="px-2.5 py-2 text-[11px] text-fog flex justify-between gap-2"><span>{formato(p.media_type)} · {new Date(p.posted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}</span><span>{num(p.reach)} alc.</span></div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Público */}
      {acc.connected && ins?.audience && (ins.audience.gender || ins.audience.age || ins.audience.city) && <Publico a={ins.audience} />}

      {/* 6. Todos os posts */}
      <section className="card p-4 md:p-5 mb-8">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div><p className="font-mono text-[11px] text-mint tracking-widest uppercase">06 · Todos os posts</p><p className="text-xs text-fog">Números de cada post, para conferir e comparar.</p></div>
          <div className="flex gap-1 flex-wrap">
            {(["recent", "sinal"] as const).map((s) => <button key={s} onClick={() => { setSort(s); setShowTable(true); }} className={`btn btn-sm ${sort === s && showTable ? "btn-mint" : "btn-ghost"}`}>{s === "recent" ? "Recentes" : "Mais compartilhados e salvos"}</button>)}
            {showTable && <button onClick={() => setShowTable(false)} className="btn btn-sm btn-ghost">Fechar</button>}
          </div>
        </div>
        {!posts.length ? <p className="text-fog text-sm py-6 text-center">{acc.connected ? "Clique em Sincronizar para puxar os posts." : "Perfis manuais não têm posts automáticos. Conecte via Meta para métricas reais."}</p> : !showTable ? (
          <button onClick={() => setShowTable(true)} className="w-full text-sm text-fog hover:text-mint py-3 border border-dashed border-line rounded-[10px]">Ver os {posts.length} posts em tabela</button>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm min-w-[940px]">
              <thead><tr className="text-left text-fog text-xs border-b border-line">{["Post", "Formato", "Data", "x mediana", "Compart./alc.", "Salvos/alc.", "Alcance", "Views", "Compart.", "Salvos", "Curtidas", "Coment."].map((h) => <th key={h} className="py-2 pr-3 font-normal whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                {sorted.map((p) => {
                  const t = taxas(p); const xm = xMed(p);
                  return (
                    <tr key={p.id} className="border-b border-line/60 hover:bg-panel2/50">
                      <td className="py-2.5 pr-3"><a href={p.permalink} target="_blank" className="flex items-center gap-2.5 max-w-[260px]">{p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-panel2" />}<span className="truncate">{p.caption || "(sem legenda)"}</span></a></td>
                      <td className="pr-3 text-fog text-xs">{formato(p.media_type)}</td>
                      <td className="pr-3 text-fog text-xs whitespace-nowrap">{p.posted_at && new Date(p.posted_at).toLocaleDateString("pt-BR")}</td>
                      <td className="pr-3 text-xs">{xm != null ? <span className={`rounded-full px-1.5 py-0.5 ${xm >= 2 ? "bg-mint/15 text-mint font-semibold" : xm < 0.5 ? "text-fog" : ""}`}>{xm.toFixed(1)}x</span> : "–"}</td>
                      <td className="pr-3 text-xs"><Cell v={t.compart} max={0.05} color="var(--color-mint)" /></td>
                      <td className="pr-3 text-xs"><Cell v={t.salvos} max={0.05} color={LILAS} /></td>
                      {[p.reach, p.plays, p.shares, p.saved, p.like_count, p.comments_count].map((v, i) => <td key={i} className="pr-3 text-xs">{fmt(v)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {diag && (
        <section className="card p-6 mb-6 border-mint-dim rise">
          <div className="flex items-center justify-between mb-2"><h2 className="font-display font-bold text-lg text-mint">Diagnóstico</h2><button onClick={saveDiag} className="btn btn-ghost btn-sm">Salvar na pauta</button></div>
          <Markdown text={diag} />
        </section>
      )}

      {/* contexto e voz: o que a IA usa */}
      <div className="grid lg:grid-cols-2 gap-3">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3"><h2 className="font-display font-bold">Contexto do perfil</h2><button className="text-xs text-fog hover:text-mint" onClick={() => (edit ? save() : setEdit(true))}>{edit ? "Salvar" : "Editar"}</button></div>
          {edit ? (
            <div className="space-y-3">
              <div><label className="label">Nicho</label><input className="input" value={acc.niche || ""} onChange={(e) => setAcc({ ...acc, niche: e.target.value })} /></div>
              <div><label className="label">Objetivos</label><textarea className="input" value={acc.goals || ""} onChange={(e) => setAcc({ ...acc, goals: e.target.value })} /></div>
              {!acc.connected && <div><label className="label">Seguidores</label><input type="number" className="input" value={acc.followers_count || ""} onChange={(e) => setAcc({ ...acc, followers_count: Number(e.target.value) || null })} /></div>}
              <button onClick={remove} className="text-xs text-danger flex items-center gap-1"><I.trash className="w-3.5 h-3.5" />Remover perfil</button>
            </div>
          ) : (
            <div className="text-sm space-y-2"><p><span className="text-fog">Nicho:</span> {acc.niche || "não definido"}</p><p><span className="text-fog">Objetivos:</span> {acc.goals || "não definidos"}</p><p className="text-xs text-fog pt-2">A IA usa esse contexto em todas as análises.</p></div>
          )}
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between mb-2"><h2 className="font-display font-bold">Voz da marca</h2><button className="text-xs text-fog hover:text-mint" onClick={() => (voiceEdit ? saveVoice() : setVoiceEdit(true))}>{voiceEdit ? "Salvar" : acc.brand_voice ? "Editar" : "Definir"}</button></div>
          {voiceEdit ? (
            <div className="space-y-3">
              <div><label className="label">Como a marca escreve (a IA segue isso em tudo)</label><textarea className="input min-h-[130px]" value={acc.brand_voice || ""} onChange={(e) => setAcc({ ...acc, brand_voice: e.target.value })} placeholder="Ex.: tom próximo e confiante, frases curtas, fala 'a gente', sem emojis, nunca usa 'top' ou 'incrível'…" /></div>
              <div><label className="label">Ou gere a partir de 3 textos seus</label><textarea className="input min-h-[110px]" value={samples} onChange={(e) => setSamples(e.target.value)} placeholder="Cole 3 legendas ou roteiros que tenham a cara da marca." />
                <button type="button" disabled={ai.busy || samples.length < 80} onClick={genVoice} className="btn btn-ghost btn-sm mt-2"><I.spark className="w-3.5 h-3.5" />{ai.busy ? "Lendo…" : "Extrair voz da marca"}</button></div>
            </div>
          ) : <p className="text-sm whitespace-pre-wrap line-clamp-6">{acc.brand_voice || <span className="text-fog">Ainda não definida. Com ela, legendas, roteiros e respostas saem com o jeito da marca.</span>}</p>}
        </section>
      </div>
    </>
  );
}

function Big({ label, value, hint, dot }: { label: string; value: string; hint: string; dot?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-fog flex items-center gap-1.5">{dot && <span className="w-2 h-2 rounded-sm" style={{ background: dot }} />}{label}</p>
      <p className="font-display text-3xl font-bold mt-1">{value}</p>
      <p className="text-[11px] text-fog mt-0.5">{hint}</p>
    </div>
  );
}

function Cell({ v, max, color }: { v: number | null; max: number; color: string }) {
  if (v == null) return <span className="text-fog">–</span>;
  return (
    <div className="flex items-center gap-2 min-w-[92px]">
      <span className="w-11">{pct(v)}</span>
      <span className="flex-1 h-1.5 rounded-full bg-panel2 overflow-hidden"><span className="block h-full rounded-r-[4px]" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} /></span>
    </div>
  );
}

const FAIXAS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
function Publico({ a }: { a: { gender: { k: string[]; v: number }[] | null; age: { k: string[]; v: number }[] | null; city: { k: string[]; v: number }[] | null; total?: number } }) {
  const g = a.gender || [];
  const gt = g.reduce((s, x) => s + x.v, 0) || 1;
  const gv = (c: string) => g.filter((x) => x.k[0] === c).reduce((s, x) => s + x.v, 0) / gt;
  const ages = (a.age || []).filter((x) => FAIXAS.includes(x.k[0])).sort((x, y) => FAIXAS.indexOf(x.k[0]) - FAIXAS.indexOf(y.k[0]));
  const at = ages.reduce((s, x) => s + x.v, 0) || 1;
  const amax = Math.max(...ages.map((x) => x.v), 1);
  const city = a.city || [];
  const ct = a.total || (a.city || []).reduce((s, x) => s + x.v, 0) || 1;
  const cmax = city[0]?.v || 1;
  const segs = [{ k: "F", l: "Mulheres", c: "var(--color-mint)" }, { k: "M", l: "Homens", c: LILAS }].map((s) => ({ ...s, v: gv(s.k) })).filter((s) => s.v > 0);
  return (
    <section className="mb-8">
      <p className="font-mono text-[11px] text-mint tracking-widest uppercase">05 · Público</p>
      <h2 className="font-display text-xl font-bold mb-3">Quem segue o perfil</h2>
      <div className="grid md:grid-cols-3 gap-3">
        {g.length > 0 && (
          <div className="card p-4 md:p-5">
            <p className="font-display font-bold mb-4">Gênero</p>
            <div className="flex gap-[2px] h-7 rounded-[4px] overflow-hidden" role="img" aria-label={segs.map((s) => `${s.l} ${(s.v * 100).toFixed(1)}%`).join(", ")}>
              {segs.map((s) => <div key={s.k} className="h-full rounded-[4px] flex items-center px-2 text-[11px] font-semibold text-[#06140e]" style={{ width: `${s.v * 100}%`, background: s.c }}>{s.v > 0.15 ? `${(s.v * 100).toFixed(0)}%` : ""}</div>)}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-fog">{segs.map((s) => <span key={s.k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.c }} />{s.l}</span>)}</div>
          </div>
        )}
        {ages.length > 0 && (
          <div className="card p-4 md:p-5">
            <p className="font-display font-bold mb-4">Faixa etária</p>
            <div className="flex items-end gap-2 h-32">
              {ages.map((x) => (
                <div key={x.k[0]} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${x.k[0]}: ${((x.v / at) * 100).toFixed(1)}%`}>
                  <span className="text-[10px] text-fog">{((x.v / at) * 100).toFixed(0)}%</span>
                  <div className="w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${(x.v / amax) * 100}%`, background: x.v === amax ? "var(--color-mint)" : "var(--color-slate)" }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">{ages.map((x) => <span key={x.k[0]} className="flex-1 text-center text-[10px] text-fog">{x.k[0]}</span>)}</div>
          </div>
        )}
        {city.length > 0 && (
          <div className="card p-4 md:p-5">
            <p className="font-display font-bold mb-4">Principais cidades</p>
            <ul className="space-y-2.5">
              {city.slice(0, 6).map((c) => (
                <li key={c.k[0]}>
                  <div className="flex justify-between text-xs mb-1"><span className="truncate">{c.k[0]}</span><span className="text-fog">{((c.v / ct) * 100).toFixed(1)}%</span></div>
                  <HBar value={c.v} max={cmax} color={c.v === cmax ? "var(--color-mint)" : "var(--color-slate)"} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
