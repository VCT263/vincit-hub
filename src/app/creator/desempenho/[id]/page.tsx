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
  const [hist, setHist] = useState<any[]>([]);
  const [rankBy, setRankBy] = useState<"formato" | "pilar">("formato");
  const ai = useAI();

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: a }, { data: p }, { data: all }] = await Promise.all([
      s.from("ig_accounts").select("*").eq("id", id).single(),
      s.from("ig_posts").select("*").eq("account_id", id).order("posted_at", { ascending: false }),
      s.from("ig_accounts").select("id,username,profile_picture_url,connected").order("created_at"),
    ]);
    // pilar do card do Quadro que publicou o post (content_ideas.ig_media_id)
    const { data: ideas } = await s.from("content_ideas").select("ig_media_id,pillar").eq("account_id", id).not("ig_media_id", "is", null);
    const pil = new Map((ideas || []).filter((i: any) => i.pillar).map((i: any) => [i.ig_media_id, i.pillar]));
    setAcc(a); setPosts((p || []).map((x: any) => ({ ...x, pilar: pil.get(x.ig_media_id) || null }))); setAccounts(all || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const loadIns = useCallback(async () => {
    if (!acc?.connected) return;
    setInsLoading(true); setInsErr(null);
    try {
      const r = await fetch(`/api/meta/insights?account_id=${id}&days=${days}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Não foi possível ler os resultados da Meta.");
      setIns(j);
      const { data: h } = await createClient().from("ig_account_daily").select("day,views,total_interactions,profile_views,follows,profile_links_taps").eq("account_id", id).order("day");
      setHist(h || []);
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
    const watchMed = avgOf(posts.map((p) => p.avg_watch_ms ?? null));
    const useRate = posts.some((p) => taxas(p).sinal != null);
    const rank = (key: (p: any) => string | null) => {
      const g: Record<string, { n: number; s: number[]; r: number[]; w: number[]; e: number }> = {};
      posts.forEach((p) => {
        const k = key(p); if (!k) return; g[k] ??= { n: 0, s: [], r: [], w: [], e: 0 };
        g[k].n++; g[k].e += eng(p);
        const t = taxas(p).sinal; if (t != null) g[k].s.push(t);
        if (p.reach != null) g[k].r.push(p.reach);
        if (p.avg_watch_ms != null) g[k].w.push(p.avg_watch_ms);
      });
      return Object.entries(g).map(([k, v]) => ({ k, n: v.n, val: useRate ? avgOf(v.s) ?? 0 : v.e / v.n, reach: avgOf(v.r), watch: avgOf(v.w) })).sort((a, b) => b.val - a.val);
    };
    const ranking = rank((p) => p.media_type || "?");
    const rankingPilar = rank((p) => p.pilar);
    const sinal = (p: any) => taxas(p).sinal ?? -1;
    const top = [...posts].filter((p) => taxas(p).sinal != null).sort((a, b) => sinal(b) - sinal(a)).slice(0, 6);
    const cols = [...posts].reverse().filter((p) => p.reach).map((p) => ({ id: p.id, date: (p.posted_at || "").slice(0, 10), a: taxas(p).compart || 0, b: taxas(p).salvos || 0, caption: p.caption, thumb: p.thumbnail_url, tipo: formato(p.media_type) }));
    return { rankingPilar, watchMed, xMed, eng, compartMed, salvosMed, avgReach, avgViews, engRate, ranking, useRate, top, cols, sinal };
  }, [posts, acc?.followers_count]);

  if (!acc) return <p className="text-fog">Carregando…</p>;
  const { rankingPilar, watchMed, xMed, compartMed, salvosMed, avgReach, avgViews, engRate, ranking, useRate, top, cols, sinal } = calc;
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
                {a.profile_picture_url ? <img loading="lazy" decoding="async" src={a.profile_picture_url} alt="" className="w-4 h-4 rounded-full object-cover" /> : null}@{a.username}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 rise">
        <div className="flex items-center gap-4 min-w-0">
          {acc.profile_picture_url ? <img loading="lazy" decoding="async" src={acc.profile_picture_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-mint/40" /> : <div className="w-16 h-16 rounded-full bg-panel2 grid place-items-center font-display text-2xl font-bold text-mint">{acc.username[0]?.toUpperCase()}</div>}
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-mint tracking-widest uppercase">Creator · Desempenho & insights</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight truncate">@{acc.username}</h1>
            <p className="text-fog text-sm">{fmt(acc.followers_count)} seguidores{acc.media_count ? ` · ${fmt(acc.media_count)} posts` : ""}{acc.last_synced_at && ` · sincronizado ${new Date(acc.last_synced_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {acc.connected && <button onClick={sync} disabled={syncing} className="btn btn-ghost"><I.refresh className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando…" : "Sincronizar"}</button>}
          {/* o diagnóstico mora no Raio-X (27/11); aqui ficam só os números */}
          <Link href={`/creator/diagnostico?perfil=${id}`} className="btn btn-mint"><I.target className="w-4 h-4" />Raio-X e estratégia</Link>
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
            {ins?.follow && <Descoberta f={ins.follow} />}
            {hist.length > 0 && <MesAMes rows={hist} />}
          </>
        )}
      </section>

      {/* 2. O que o Instagram pesa */}
      <section className="mb-8">
        <p className="font-mono text-[11px] text-mint tracking-widest uppercase">02 · O que o algoritmo pesa</p>
        <h2 className="font-display text-xl font-bold">Compartilhamentos e salvamentos por alcance</h2>
        <p className="text-sm text-fog mb-3 max-w-2xl">O Instagram hoje pesa mais compartilhamentos, salvamentos, tempo assistido e views do que curtidas e seguidores. Média dos últimos {posts.length} posts sincronizados.</p>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Big label="Compartilhamentos" short="Compartilhados" value={pct(compartMed, 2)} hint="por pessoa alcançada" dot="var(--color-mint)" />
            <Big label="Salvamentos" value={pct(salvosMed, 2)} hint="por pessoa alcançada" dot={LILAS} />
            <Big label="Alcance médio" value={num(avgReach && Math.round(avgReach))} hint="pessoas por post" />
            <Big label="Tempo assistido" value={seg(watchMed)} hint="média por Reel" />
            <Big label="Views médias" value={num(avgViews && Math.round(avgViews))} hint={`engajamento ${pct(engRate)} por seguidor (pesa menos)`} className="col-span-2 lg:col-span-1" />
          </div>
          <div className="card p-4 md:p-5 flex flex-col">
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
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-mono text-[11px] text-mint tracking-widest uppercase">03 · Ranking</p>
            <div className="flex rounded-[10px] border border-line p-0.5 text-[11px]">
              {(["formato", "pilar"] as const).map((k) => <button key={k} onClick={() => setRankBy(k)} className={`px-2.5 py-1 rounded-[8px] ${rankBy === k ? "bg-mint text-[#06140e] font-semibold" : "text-fog hover:text-paper"}`}>{k === "formato" ? "Formato" : "Pilar"}</button>)}
            </div>
          </div>
          <p className="text-xs text-fog mb-4">{useRate ? `Compartilhamentos + salvamentos por alcance, média por ${rankBy}` : `Engajamento médio por ${rankBy}`}</p>
          {(() => {
            const list = rankBy === "formato" ? ranking : rankingPilar;
            const nome = (k: string) => (rankBy === "formato" ? formato(k) : k);
            if (!list.length) return rankBy === "pilar"
              ? <p className="text-fog text-sm">Ainda nenhum post publicado pelo Quadro de produção. Quando um card com pilar for publicado (o link do post fica no card), ele entra aqui.</p>
              : <p className="text-fog text-sm">Sem posts sincronizados.</p>;
            return (
              <>
                <ol className="space-y-4">
                  {list.map((r, i) => (
                    <li key={r.k}>
                      <div className="flex items-baseline gap-3 mb-1.5">
                        <span className={`font-display text-lg font-extrabold w-6 ${i === 0 ? "text-mint" : "text-fog"}`}>{i + 1}</span>
                        <span className="font-semibold flex-1 min-w-0">{nome(r.k)}<span className="block text-fog text-[11px] font-normal">{r.n} {r.n === 1 ? "post" : "posts"}{r.reach != null ? ` · alcance médio ${num(Math.round(r.reach))}` : ""}{r.watch != null ? ` · assistido ${seg(r.watch)}` : ""}</span></span>
                        <span className="font-semibold text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{useRate ? pct(r.val, 2) : num(Math.round(r.val))}</span>
                      </div>
                      <div className="pl-9"><HBar value={r.val} max={list[0].val} color={i === 0 ? "var(--color-mint)" : "var(--color-slate)"} /></div>
                    </li>
                  ))}
                </ol>
                {list.length > 1 && <p className="text-xs text-fog mt-5 pt-4 border-t border-line">Faça mais <b className="text-paper">{nome(list[0].k)}</b>: é o {rankBy} que mais gera compartilhamento e salvamento por pessoa alcançada.</p>}
                {rankBy === "pilar" && <p className="text-[11px] text-fog mt-3">{list.reduce((t, r) => t + r.n, 0)} de {posts.length} posts têm pilar (vêm do Quadro de produção).</p>}
              </>
            );
          })()}
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
                      {p.thumbnail_url ? <img loading="lazy" decoding="async" src={p.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform" /> : <p className="absolute inset-x-3 top-10 text-xs text-fog line-clamp-5">{p.caption || "(sem legenda)"}</p>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <span className="absolute top-2 left-2 font-display font-extrabold text-sm bg-black/60 text-paper rounded-md px-1.5">#{i + 1}</span>
                      {xm != null && <span className={`absolute top-2 right-2 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${xm >= 2 ? "bg-mint text-[#06140e]" : "bg-black/60 text-paper"}`}>{xm.toFixed(1)}x mediana</span>}
                      <div className="absolute bottom-0 inset-x-0 p-2.5">
                        <p className="font-display text-xl font-bold text-paper leading-none">{pct(t.sinal, 1)}</p>
                        <p className="text-[10px] text-paper/70 mt-0.5">compart. + salvos por alcance</p>
                      </div>
                    </div>
                    <div className="px-2.5 py-2 text-[11px] text-fog flex flex-wrap justify-between gap-x-2"><span className="whitespace-nowrap">{formato(p.media_type)} · {new Date(p.posted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}</span><span className="whitespace-nowrap">{p.avg_watch_ms != null ? `${seg(p.avg_watch_ms)} · ` : ""}{num(p.reach)} alc.</span></div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Público */}
      {acc.connected && ins?.online && <QuandoPostar grid={ins.online} />}

      {acc.connected && ins?.audience && (ins.audience.gender || ins.audience.age || ins.audience.city) && <Publico a={ins.audience} />}

      {/* 6. Todos os posts */}
      <section className="card p-4 md:p-5 mb-8">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div><p className="font-mono text-[11px] text-mint tracking-widest uppercase">07 · Todos os posts</p><p className="text-xs text-fog">Números de cada post, para conferir e comparar.</p></div>
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
              <thead><tr className="text-left text-fog text-xs border-b border-line">{["Post", "Formato", "Data", "x mediana", "Compart./alc.", "Salvos/alc.", "Tempo méd.", "Alcance", "Views", "Compart.", "Salvos", "Curtidas", "Coment."].map((h) => <th key={h} className="py-2 pr-3 font-normal whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                {sorted.map((p) => {
                  const t = taxas(p); const xm = xMed(p);
                  return (
                    <tr key={p.id} className="border-b border-line/60 hover:bg-panel2/50">
                      <td className="py-2.5 pr-3"><a href={p.permalink} target="_blank" className="flex items-center gap-2.5 max-w-[260px]">{p.thumbnail_url ? <img loading="lazy" decoding="async" src={p.thumbnail_url} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-panel2" />}<span className="truncate">{p.caption || "(sem legenda)"}</span></a></td>
                      <td className="pr-3 text-fog text-xs">{formato(p.media_type)}</td>
                      <td className="pr-3 text-fog text-xs whitespace-nowrap">{p.posted_at && new Date(p.posted_at).toLocaleDateString("pt-BR")}</td>
                      <td className="pr-3 text-xs">{xm != null ? <span className={`rounded-full px-1.5 py-0.5 ${xm >= 2 ? "bg-mint/15 text-mint font-semibold" : xm < 0.5 ? "text-fog" : ""}`}>{xm.toFixed(1)}x</span> : "–"}</td>
                      <td className="pr-3 text-xs"><Cell v={t.compart} max={0.05} color="var(--color-mint)" /></td>
                      <td className="pr-3 text-xs"><Cell v={t.salvos} max={0.05} color={LILAS} /></td>
                      <td className="pr-3 text-xs whitespace-nowrap">{seg(p.avg_watch_ms)}</td>
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

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MCAMPOS = ["views", "total_interactions", "profile_views", "follows"];
/** últimos 4 meses (o mês atual e os 3 anteriores) somados do histórico diário guardado no HUB, um gráfico por métrica */
function MesAMes({ rows }: { rows: any[] }) {
  const br = new Date(Date.now() - 3 * 3600e3);
  const meses = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth() - 3 + i, 1));
    return { mes: d.toISOString().slice(0, 7), dias: 0, n: {} as Record<string, number>, views: 0, total_interactions: 0, profile_views: 0, follows: 0 } as any;
  });
  const idx = Object.fromEntries(meses.map((x, i) => [x.mes, i]));
  const comDado = rows.filter((r) => MCAMPOS.some((c) => r[c] != null));
  for (const r of comDado) {
    const x = meses[idx[String(r.day).slice(0, 7)]];
    if (!x) continue;
    x.dias++;
    for (const c of MCAMPOS) if (r[c] != null) { x[c] += Number(r[c]) || 0; x.n[c] = (x.n[c] || 0) + 1; }
  }
  const atual = meses[3].mes;
  const diasNoMes = (k: string) => (k === atual ? br.getUTCDate() - 1 : new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0).getDate());
  const nome = (k: string) => `${MESES[Number(k.slice(5, 7)) - 1]}${k.slice(0, 4) !== String(br.getUTCFullYear()) ? "/" + k.slice(2, 4) : ""}`;
  const desde = comDado[0] ? new Date(comDado[0].day + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "") : "–";
  const semSeg = meses.some((x) => x.dias && !x.n.follows);
  return (
    <div className="card p-4 md:p-5 mt-3">
      <div className="mb-4">
        <p className="font-display font-bold">Últimos 4 meses</p>
        <p className="text-xs text-fog">
          Soma de cada mês com os dias que o HUB guardou (desde {desde}). Barra mais clara = mês com dias faltando; tracejado = sem dado.{semSeg ? " O Instagram só informa novos seguidores dos últimos 30 dias, por isso os meses antigos começam a contar a partir de agora." : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        {[["views", "Visualizações"], ["total_interactions", "Interações"], ["profile_views", "Visitas ao perfil"], ["follows", "Novos seguidores"]].map(([k, l]) => {
          const max = Math.max(...meses.map((x) => x[k]), 1);
          const total = meses.reduce((a, x) => a + x[k], 0);
          const faltaAlgum = meses.some((x) => x.dias && !x.n[k]);
          return (
            <div key={k}>
              <p className="text-xs text-fog">{l}</p>
              <p className="flex flex-wrap items-baseline gap-x-1.5"><span className="font-display text-xl font-bold">{num(total)}</span><span className="text-[11px] text-fog whitespace-nowrap">{faltaAlgum ? "nos meses com dado" : "em 4 meses"}</span></p>
              <div className="flex items-end gap-1.5 h-24 mt-2">
                {meses.map((x) => {
                  const nk = x.n[k] || 0;
                  const parcial = nk < diasNoMes(x.mes);
                  return (
                    <div key={x.mes} className="flex-1 flex flex-col items-center justify-end h-full" title={`${nome(x.mes)}: ${nk ? num(x[k]) : "sem dados"} (${nk} dias guardados)`}>
                      {nk ? (
                        <>
                          <span className="text-[10px] text-paper mb-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>{num(x[k])}</span>
                          <div className="w-full max-w-[28px] rounded-t-[4px] bg-mint" style={{ height: `${Math.max(2, (x[k] / max) * 80)}%`, opacity: parcial ? 0.45 : 1 }} />
                        </>
                      ) : <div className="w-full max-w-[28px] h-px border-t border-dashed border-line" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-1 border-t border-line pt-1">{meses.map((x) => <span key={x.mes} className={`flex-1 text-center text-[10px] ${x.mes === atual ? "text-paper" : "text-fog"}`}>{nome(x.mes)}</span>)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** milissegundos em "4,2 s" ou "1 min 05 s" */
const seg = (ms: number | null | undefined) => {
  if (ms == null) return "–";
  const s = ms / 1000;
  return s < 60 ? `${s.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s` : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s`;
};

/** alcance e views divididos entre quem já segue e gente nova */
function Descoberta({ f }: { f: Record<string, { seguidores: number; nao: number }> }) {
  const rows = [["reach", "Alcance"], ["views", "Visualizações"]].filter(([k]) => f[k] && f[k].seguidores + f[k].nao > 0);
  if (!rows.length) return null;
  const novo = f.reach ? f.reach.nao / ((f.reach.seguidores + f.reach.nao) || 1) : null;
  return (
    <div className="card p-4 md:p-5 mt-3">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="font-display font-bold">Gente nova ou sua base?</p>
          <p className="text-xs text-fog">Quanto do período chegou a quem ainda não segue o perfil. Mais não seguidores = mais descoberta.</p>
        </div>
        <div className="flex gap-3 text-xs text-fog">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-mint" />Não seguidores</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LILAS }} />Seguidores</span>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map(([k, l]) => {
          const t = f[k].seguidores + f[k].nao; const a = f[k].nao / t, b = f[k].seguidores / t;
          return (
            <div key={k} className="grid grid-cols-[84px_1fr] sm:grid-cols-[92px_1fr] items-center gap-2 sm:gap-3">
              <span className="text-xs text-fog">{l}</span>
              <div className="flex gap-[2px] h-7" role="img" aria-label={`${l}: ${pct(a, 1)} não seguidores, ${pct(b, 1)} seguidores`}>
                {a > 0 && <div className="h-full min-w-0 overflow-hidden whitespace-nowrap rounded-[4px] flex items-center px-2 text-[11px] font-semibold text-[#06140e] bg-mint" title={`${pct(a, 1)} · ${num(f[k].nao)}`} style={{ width: `${a * 100}%` }}>{a > 0.4 ? `${pct(a, 0)} · ${num(f[k].nao)}` : a > 0.12 ? pct(a, 0) : ""}</div>}
                {b > 0 && <div className="h-full min-w-0 overflow-hidden whitespace-nowrap rounded-[4px] flex items-center px-2 text-[11px] font-semibold text-[#06140e]" title={`${pct(b, 1)} · ${num(f[k].seguidores)}`} style={{ width: `${b * 100}%`, background: LILAS }}>{b > 0.4 ? `${pct(b, 0)} · ${num(f[k].seguidores)}` : b > 0.12 ? pct(b, 0) : ""}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {novo != null && <p className="text-xs text-fog mt-4">{novo >= 0.5 ? "A maior parte do alcance veio de quem não segue: o conteúdo está sendo distribuído para fora da base." : "A maior parte do alcance ficou na sua base. Ganchos que respondem uma pergunta clara e Reels compartilháveis ajudam a chegar em gente nova."}</p>}
    </div>
  );
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
/** mapa de calor dia × hora dos seguidores online (uma cor, mais forte = mais gente) */
function QuandoPostar({ grid }: { grid: number[][] }) {
  const [sel, setSel] = useState<[number, number] | null>(null);
  const max = Math.max(...grid.flat(), 1), min = Math.min(...grid.flat());
  const ranked = grid.flatMap((row, d) => row.map((v, h) => ({ d, h, v }))).sort((a, b) => b.v - a.v);
  // melhores janelas: um por dia diferente
  const best: typeof ranked = [];
  for (const c of ranked) { if (best.length >= 3) break; if (!best.some((b) => b.d === c.d)) best.push(c); }
  const hourAvg = Array.from({ length: 24 }, (_, h) => grid.reduce((a, r) => a + r[h], 0) / 7);
  const bestHour = hourAvg.indexOf(Math.max(...hourAvg));
  const cur = sel ? { d: sel[0], h: sel[1], v: grid[sel[0]][sel[1]] } : null;
  return (
    <section className="mb-8">
      <p className="font-mono text-[11px] text-mint tracking-widest uppercase">05 · Quando postar</p>
      <h2 className="font-display text-xl font-bold">Quando seus seguidores estão online</h2>
      <p className="text-sm text-fog mb-3">Média das últimas semanas, em horário de Brasília. Poste um pouco antes do pico.</p>
      <div className="grid lg:grid-cols-4 gap-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3 content-start">
          <div className="card p-4"><p className="text-xs text-fog">Melhor hora no geral</p><p className="font-display text-3xl font-bold mt-1">{bestHour}h</p><p className="text-[11px] text-fog mt-0.5">~{num(Math.round(hourAvg[bestHour]))} seguidores online</p></div>
          <div className="card p-4"><p className="text-xs text-fog mb-2">Picos da semana</p><ol className="space-y-1.5 text-sm">{best.map((b, i) => <li key={i} className="flex justify-between gap-2"><span><span className="text-fog mr-1.5">{i + 1}.</span>{DIAS_LONGO[b.d]}, {b.h}h</span><span className="text-fog">{num(b.v)}</span></li>)}</ol></div>
        </div>
        <div className="card p-3 sm:p-4 md:p-5 lg:col-span-3">
          <div onPointerLeave={() => setSel(null)}>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }}>
              {grid.map((row, d) => (
                <div key={d} className="contents">
                  <span className="text-[11px] text-fog self-center">{DIAS[d]}</span>
                  {row.map((v, h) => (
                    <button key={h} type="button" onPointerEnter={() => setSel([d, h])} onClick={() => setSel([d, h])}
                      aria-label={`${DIAS_LONGO[d]} ${h}h: ${v} seguidores online`}
                      className={`h-5 sm:h-6 rounded-[2px] sm:rounded-[3px] ${cur && cur.d === d && cur.h === h ? "ring-1 ring-paper" : ""}`}
                      style={{ background: `color-mix(in srgb, var(--color-mint) ${Math.round(6 + Math.pow((v - min) / (max - min || 1), 1.6) * 94)}%, var(--color-panel2))` }} />
                  ))}
                </div>
              ))}
              <span />
              {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-[10px] text-fog text-center whitespace-nowrap">{h % 3 === 0 ? <span className={h % 6 ? "hidden sm:inline" : ""}>{h}h</span> : null}</span>)}
            </div>
            <div className="flex items-center justify-between gap-3 mt-3 text-xs text-fog flex-wrap">
              <span>{cur ? <><b className="text-paper">{DIAS_LONGO[cur.d]}, {cur.h}h</b> · {num(cur.v)} seguidores online</> : "Passe o dedo ou o mouse nos quadrados."}</span>
              <span className="flex items-center gap-1.5">menos<span className="w-16 h-2 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--color-mint) 8%, var(--color-panel2)), var(--color-mint))" }} />mais</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Big({ label, short, value, hint, dot, className = "" }: { label: string; short?: string; value: string; hint: string; dot?: string; className?: string }) {
  return (
    <div className={`card p-4 min-w-0 ${className}`}>
      <p className="text-xs text-fog flex items-center gap-1.5">{dot && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: dot }} />}{short ? <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></> : <span className="truncate">{label}</span>}</p>
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

const UF: Record<string, string> = { Acre: "AC", Alagoas: "AL", "Amapá": "AP", Amazonas: "AM", Bahia: "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR", Pernambuco: "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO", Roraima: "RR", "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO" };
const cidade = (c: string) => { const [n, e = ""] = c.split(", "); const est = e.replace(/ \(state\)$/, ""); return est ? `${n}, ${UF[est] || est}` : n; };
const FAIXAS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
function Publico({ a }: { a: { gender: { k: string[]; v: number }[] | null; age: { k: string[]; v: number }[] | null; city: { k: string[]; v: number }[] | null; total?: number } }) {
  const g = (a.gender || []).filter((x) => x.k[0] === "F" || x.k[0] === "M");
  const gt = g.reduce((s, x) => s + x.v, 0) || 1;
  const gv = (c: string) => g.filter((x) => x.k[0] === c).reduce((s, x) => s + x.v, 0) / gt;
  const ages = (a.age || []).filter((x) => FAIXAS.includes(x.k[0]) && (x.k[0] !== "13-17" || x.v > 0)).sort((x, y) => FAIXAS.indexOf(x.k[0]) - FAIXAS.indexOf(y.k[0]));
  const at = ages.reduce((s, x) => s + x.v, 0) || 1;
  const amax = Math.max(...ages.map((x) => x.v), 1);
  const city = a.city || [];
  const ct = a.total || (a.city || []).reduce((s, x) => s + x.v, 0) || 1;
  const cmax = city[0]?.v || 1;
  const segs = [{ k: "F", l: "Mulheres", c: "var(--color-mint)" }, { k: "M", l: "Homens", c: LILAS }].map((s) => ({ ...s, v: gv(s.k) })).filter((s) => s.v > 0);
  return (
    <section className="mb-8">
      <p className="font-mono text-[11px] text-mint tracking-widest uppercase">06 · Público</p>
      <h2 className="font-display text-xl font-bold mb-3">Quem segue o perfil</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {g.length > 0 && (
          <div className="card p-4 md:p-5">
            <p className="font-display font-bold mb-4">Gênero</p>
            <div className="flex gap-[2px] h-7 rounded-[4px] overflow-hidden" role="img" aria-label={segs.map((s) => `${s.l} ${(s.v * 100).toFixed(1)}%`).join(", ")}>
              {segs.map((s) => <div key={s.k} className="h-full rounded-[4px] flex items-center px-2 text-[11px] font-semibold text-[#06140e]" style={{ width: `${s.v * 100}%`, background: s.c }}>{s.v > 0.15 ? `${(s.v * 100).toFixed(0)}%` : ""}</div>)}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">{segs.map((s) => <div key={s.k}><p className="text-xs text-fog flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.c }} />{s.l}</p><p className="font-display text-2xl sm:text-3xl font-bold mt-1">{pct(s.v, 1)}</p></div>)}</div>
            <p className="text-[11px] text-fog mt-4">Entre quem informou o gênero.</p>
          </div>
        )}
        {ages.length > 0 && (
          <div className="card p-4 md:p-5">
            <p className="font-display font-bold mb-4">Faixa etária</p>
            <div className="flex items-end gap-2 h-32">
              {ages.map((x) => (
                <div key={x.k[0]} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${x.k[0]}: ${((x.v / at) * 100).toFixed(1)}%`}>
                  <span className="text-[10px] text-fog">{Math.round((x.v / at) * 100)}%</span>
                  <div className="w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${(x.v / amax) * 100}%`, background: x.v === amax ? "var(--color-mint)" : "var(--color-slate)" }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">{ages.map((x) => <span key={x.k[0]} className="flex-1 text-center text-[10px] text-fog">{x.k[0]}</span>)}</div>
          </div>
        )}
        {city.length > 0 && (
          <div className="card p-4 md:p-5 md:col-span-2 lg:col-span-1">
            <p className="font-display font-bold mb-4">Principais cidades</p>
            <ul className="space-y-2.5">
              {city.slice(0, 6).map((c) => (
                <li key={c.k[0]}>
                  <div className="flex justify-between text-xs mb-1"><span className="truncate">{cidade(c.k[0])}</span><span className="text-fog">{pct(c.v / ct, 1)}</span></div>
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
