"use client";
import { aiFetch } from "@/lib/aiFetch";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAccounts, fmt } from "@/lib/useAccounts";
import { FORMATS } from "@/lib/formats";
import { I } from "@/components/icons";

const ESTILO: Record<string, string> = { tom: "Tom", estetica: "Estética", ritmo_edicao: "Edição", persona: "Persona", frequencia: "Frequência" };
const typeName = (t?: string) => (t === "CAROUSEL_ALBUM" ? "Carrossel" : t === "IMAGE" ? "Foto" : t === "VIDEO" ? "Vídeo" : t || "Post");
const typeColor = (t: string) => ({ Reels: "#18F2B2", Carrossel: "#7aa7ff", Foto: "#f2c94c", Shorts: "#ff7a7a", "Vídeo": "#c58bff" } as Record<string, string>)[t] || "#8a948f";
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] || s).trim();

function Stat({ n, l }: { n: string; l: string }) {
  return <div className="bg-panel2 rounded-xl px-3 py-2 text-center min-w-[72px]"><p className="font-display font-bold text-lg leading-none">{n}</p><p className="text-[10px] text-fog mt-1">{l}</p></div>;
}

/** miniatura do post quando a Meta devolve a mídia; senão, um bloco com a cor do formato */
function Thumb({ it }: { it: any }) {
  const [bad, setBad] = useState(false);
  const src = it?.thumb || (it?.media && !/\.mp4/.test(it.media) ? it.media : null);
  if (src && !bad) return <img src={src} alt="" onError={() => setBad(true)} className="w-16 h-20 rounded-lg object-cover shrink-0" />;
  return <div className="w-16 h-20 rounded-lg shrink-0 grid place-items-center" style={{ background: `color-mix(in srgb, ${typeColor(it?.type || "")} 22%, transparent)` }}>{it?.type === "Reels" || it?.type === "Vídeo" || it?.type === "Shorts" ? <I.play className="w-5 h-5 opacity-70" /> : <I.cards className="w-5 h-5 opacity-70" />}</div>;
}

const TIPOS: Record<string, string> = { gancho: "Gancho", formato: "Formato", estrutura: "Estrutura", estetica: "Estética", tema: "Tema", serie: "Série / quadro", cta: "CTA", edicao: "Edição", estrategia: "Estratégia" };

export default function RefProfiles() {
  const { accounts } = useAccounts();
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ url: "", account_id: "", paste: "" });
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<any>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [tipo, setTipo] = useState("");

  const load = useCallback(async () => {
    const { data } = await createClient().from("ref_profiles").select("*").order("created_at", { ascending: false });
    setList(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!f.account_id && accounts[0]) setF((x) => ({ ...x, account_id: accounts[0].id })); }, [accounts, f.account_id]);

  async function analyze(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await aiFetch("/api/ref-profile", { url: f.url, account_id: f.account_id || undefined, paste: f.paste || undefined });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro");
      setF({ ...f, url: "", paste: "" }); setShowPaste(false);
      await load(); openRow(j);
    } catch (e: any) { setErr(e.message); if (/Cole legendas|cole títulos/i.test(e.message)) setShowPaste(true); }
    setBusy(false);
  }
  function openRow(r: any) { setOpen(r); setSel(r.selected || []); setMsg(null); setTipo(""); }
  async function saveSel() { await createClient().from("ref_profiles").update({ selected: sel }).eq("id", open.id); setMsg("Seleção salva."); load(); }
  async function toPlanner() {
    const items = (open.analysis?.itens || []).filter((x: any) => sel.includes(x.id));
    if (!items.length) return;
    await createClient().from("content_ideas").insert(items.map((x: any) => ({
      account_id: open.account_id, kind: "ideia", title: `${x.titulo} (ref. ${open.handle})`.slice(0, 120), format: x.tipo === "formato" ? null : null,
      body: `**Inspirado em:** ${open.title} (${open.url})\n\n**O que eles fazem:** ${x.o_que_eles_fazem}\n\n**Como adaptar:** ${x.como_adaptar}\n\n**Ideia pronta:** ${x.exemplo}${x.carta ? `\n\n**Carta:** ${FORMATS.find((c) => c.id === x.carta)?.name || x.carta}` : ""}`,
    })));
    await saveSel(); setMsg(`${items.length} ideia(s) no Quadro, na coluna Ideia.`);
  }
  async function del(r: any) { if (!confirm(`Excluir a análise de ${r.handle}?`)) return; await createClient().from("ref_profiles").delete().eq("id", r.id); setOpen(null); load(); }

  const a = open?.analysis || {};
  const items: any[] = a.itens || [];
  const byTipo = items.reduce((m: Record<string, any[]>, x) => ((m[x.tipo] ||= []).push(x), m), {});
  const snapItems: any[] = open?.snapshot?.items || [];
  const score = (i: any) => i?.views ?? (i?.likes != null ? i.likes + (i.comments || 0) * 3 : null);
  const vals = snapItems.map(score).filter((v): v is number => v != null).sort((x, y) => x - y);
  const med = vals.length ? vals[Math.floor(vals.length / 2)] || 1 : 0;
  const topNs = new Set((a.top_conteudos || []).map((t: any) => t.n));
  const bars = med ? snapItems.map((it, i) => ({ ...it, i, x: (score(it) || 0) / med, top: topNs.has(i + 1), title: it.title || "", type: typeName(it.type) })).filter((b) => b.type !== "material colado").reverse() : [];
  const maxX = Math.max(1, ...bars.map((b) => b.x));
  const mixCount: Record<string, number> = {};
  bars.forEach((b) => { mixCount[b.type] = (mixCount[b.type] || 0) + 1; });
  const mix = Object.entries(mixCount).sort((x, y) => y[1] - x[1]);
  const tops = (a.top_conteudos || []).slice(0, 6).map((t: any) => { const it = snapItems[(t.n || 0) - 1]; return { ...t, it: it && { ...it, type: typeName(it.type) }, x: med && it ? (score(it) || 0) / med : 0 }; });

  return (
    <div className="space-y-6">
      <form onSubmit={analyze} className="card p-5">
        <p className="font-display font-bold text-lg">Roube como um artista</p>
        <p className="text-sm text-fog mb-4">Cole o link de um perfil do Instagram ou canal do YouTube. A IA estuda o estilo, os ganchos, formatos e temas que funcionam e devolve uma seleção adaptada ao seu briefing — você escolhe o que aproveitar.</p>
        <div className="grid md:grid-cols-[1fr_200px_auto] gap-3">
          <input required className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="instagram.com/perfil ou youtube.com/@canal" />
          <select className="input" value={f.account_id} onChange={(e) => setF({ ...f, account_id: e.target.value })}><option value="">Adaptar para…</option>{accounts.map((x) => <option key={x.id} value={x.id}>@{x.username}</option>)}</select>
          <button disabled={busy} className="btn btn-mint"><I.spark className="w-4 h-4" />{busy ? "Analisando… (até 1 min)" : "Analisar perfil"}</button>
        </div>
        <button type="button" onClick={() => setShowPaste(!showPaste)} className="text-xs text-fog hover:text-mint mt-3">{showPaste ? "− Ocultar material extra" : "+ Colar material extra (legendas, roteiros, transcrições)"}</button>
        {showPaste && <textarea className="input min-h-[120px] mt-2" value={f.paste} onChange={(e) => setF({ ...f, paste: e.target.value })} placeholder="Opcional no YouTube. No Instagram, é necessário quando o perfil não é profissional ou sua conta não está conectada à Meta." />}
        {err && <p className="text-danger text-sm mt-3">{err}</p>}
        <p className="text-[11px] text-fog mt-3">Instagram: leitura automática de perfis profissionais usando sua conta conectada à Meta. YouTube: últimos 15 vídeos do canal com visualizações.</p>
      </form>

      {!!list.length && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((r) => (
            <button key={r.id} onClick={() => openRow(r)} className={`card p-4 text-left flex items-center gap-3 hover:border-slate ${open?.id === r.id ? "border-mint-dim" : ""}`}>
              {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full bg-panel2 grid place-items-center text-mint font-bold">{(r.title || r.handle)[0]?.toUpperCase()}</div>}
              <div className="min-w-0 flex-1"><p className="font-semibold truncate">{r.title}</p><p className="text-xs text-fog">{r.platform === "youtube" ? "YouTube" : "Instagram"} · {r.followers ? `${fmt(r.followers)} seg. · ` : ""}{(r.selected || []).length} selecionado(s)</p></div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <section className="card p-5 md:p-6 border-mint-dim rise">
          {/* cabeçalho: quem é, em números */}
          <div className="flex flex-wrap items-center gap-4">
            {open.avatar_url ? <img src={open.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-mint/40" /> : <div className="w-16 h-16 rounded-full bg-panel2 grid place-items-center text-mint text-2xl font-bold">{(open.title || open.handle)[0]?.toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-2xl leading-tight">{open.title}</p>
              <a href={open.url} target="_blank" rel="noopener noreferrer" className="text-xs text-fog hover:text-mint">@{open.handle.replace(/^@/, "")} ↗</a>
            </div>
            <div className="flex gap-2">
              {open.followers ? <Stat n={fmt(open.followers)} l="seguidores" /> : null}
              <Stat n={String(snapItems.length)} l="posts lidos" />
              <Stat n={String(items.length)} l="ideias" />
            </div>
            <button onClick={() => del(open)} className="btn btn-ghost btn-sm" aria-label="Excluir"><I.trash className="w-4 h-4" /></button>
          </div>

          {a.resumo && <p className="mt-5 text-lg leading-snug font-display">{firstSentence(a.resumo)}</p>}
          {a.resumo && firstSentence(a.resumo) !== a.resumo && <details className="mt-1 text-sm text-fog"><summary className="cursor-pointer hover:text-mint w-fit">ler resumo completo</summary><p className="mt-2 leading-relaxed">{a.resumo}</p></details>}

          {/* o que funciona, em gráfico: cada barra é um post, altura = vezes a mediana */}
          {!!bars.length && (
            <div className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
                <p className="label text-mint mb-0">O que mais funcionou nos últimos {bars.length} posts</p>
                <div className="flex flex-wrap gap-1.5">{mix.map(([t, n]) => <span key={t} className="chip"><span className="w-2 h-2 rounded-full" style={{ background: typeColor(t) }} />{t} {Math.round((n / bars.length) * 100)}%</span>)}</div>
              </div>
              <div className="flex items-end gap-[3px] h-28 bg-panel2 rounded-xl px-3 pt-3 pb-2">
                {bars.map((b) => (
                  <a key={b.i} href={b.url} target="_blank" rel="noopener noreferrer" title={`${b.x.toFixed(1)}× a mediana · ${b.type} · ${b.date || ""}\n${b.title.slice(0, 120)}`}
                    className="flex-1 min-w-[3px] rounded-t transition-opacity hover:opacity-100" style={{ height: `${Math.max(6, (b.x / maxX) * 100)}%`, background: typeColor(b.type), opacity: b.top ? 1 : 0.35 }} />
                ))}
              </div>
              <p className="text-[11px] text-fog mt-1.5">Do mais antigo ao mais recente. Barras acesas são os destaques; passe o mouse para ver o post.</p>
            </div>
          )}

          {/* destaques com o multiplicador grande */}
          {!!tops.length && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {tops.map((t, i) => (
                <a key={i} href={t.it?.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-xl border border-line bg-panel2 p-3 hover:border-mint-dim">
                  <Thumb it={t.it} />
                  <div className="min-w-0">
                    <p className="font-display font-extrabold text-2xl text-mint leading-none">{t.x ? `${t.x.toFixed(1)}×` : `#${i + 1}`}<span className="text-[10px] font-mono text-fog font-normal ml-1.5">{t.it?.type}</span></p>
                    <p className="text-xs text-fog line-clamp-1 mt-1">{t.it?.title || `Item ${t.n}`}</p>
                    <p className="text-sm mt-1 line-clamp-3">{t.por_que}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* estilo em blocos curtos */}
          {a.estilo && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-5">
              {Object.entries(a.estilo).map(([k, v]) => (
                <details key={k} className="bg-panel2 rounded-xl p-3 group">
                  <summary className="cursor-pointer list-none">
                    <p className="text-[10px] uppercase tracking-wide text-mint">{ESTILO[k] || k.replace("_", " ")}</p>
                    <p className="text-sm mt-1 line-clamp-3 group-open:line-clamp-none">{String(v)}</p>
                  </summary>
                </details>
              ))}
            </div>
          )}
          {!!a.pilares?.length && <div className="flex flex-wrap gap-1.5 mt-4"><span className="text-xs text-fog mr-1 self-center">Pilares:</span>{a.pilares.map((p: string) => <span key={p} className="chip">{p}</span>)}</div>}

          {/* escolha: cartões curtos, a ideia pronta em destaque */}
          <div className="flex flex-wrap items-center gap-2 mt-8 mb-3">
            <p className="font-display font-bold text-lg mr-auto">Escolha o que levar para você</p>
            <button onClick={() => setSel(sel.length === items.length ? [] : items.map((x) => x.id))} className="btn btn-ghost btn-sm">{sel.length === items.length ? "Limpar" : "Selecionar tudo"}</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button onClick={() => setTipo("")} className={`chip ${!tipo ? "chip-mint" : "hover:text-paper"}`}>Tudo {items.length}</button>
            {Object.entries(byTipo).map(([t, xs]) => <button key={t} onClick={() => setTipo(t)} className={`chip ${tipo === t ? "chip-mint" : "hover:text-paper"}`}>{TIPOS[t] || t} {(xs as any[]).length}</button>)}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.filter((x) => !tipo || x.tipo === tipo).map((x) => {
              const on = sel.includes(x.id);
              const card = FORMATS.find((c) => c.id === x.carta);
              return (
                <div key={x.id} onClick={() => setSel(on ? sel.filter((y) => y !== x.id) : [...sel, x.id])} className={`rounded-xl border p-4 cursor-pointer transition-colors flex flex-col ${on ? "border-mint bg-mint/5" : "border-line bg-panel2 hover:border-slate"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-5 h-5 rounded-md border grid place-items-center text-[11px] shrink-0 ${on ? "bg-mint border-mint text-ink" : "border-slate"}`}>{on && "✓"}</span>
                    <span className="text-[10px] uppercase tracking-widest text-fog">{TIPOS[x.tipo] || x.tipo}</span>
                  </div>
                  <p className="font-semibold leading-snug">{x.titulo}</p>
                  {x.exemplo && <p className="font-display text-[15px] leading-snug mt-2 text-mint">“{x.exemplo}”</p>}
                  <details onClick={(e) => e.stopPropagation()} className="mt-auto pt-3 text-sm">
                    <summary className="cursor-pointer text-xs text-fog hover:text-mint w-fit">como adaptar</summary>
                    <div className="space-y-1.5 mt-2">
                      <p className="text-fog"><b className="text-paper/80 font-medium">Eles:</b> {x.o_que_eles_fazem}</p>
                      <p><b className="text-mint font-medium">Você:</b> {x.como_adaptar}</p>
                      {card && <Link href={`/creator/laboratorio?tab=criar&carta=${card.id}`} className="inline-block text-[11px] text-mint hover:underline">Carta {card.n} · {card.name} → criar no Laboratório</Link>}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
          {!!a.evitar?.length && <details className="mt-6 bg-danger/5 border border-danger/20 rounded-xl p-4"><summary className="label text-danger cursor-pointer mb-0">Não roube ({a.evitar.length})</summary><ul className="list-disc ml-5 text-sm space-y-1 mt-2">{a.evitar.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></details>}

          {/* barra fixa: o próximo passo fica sempre à vista */}
          <div className="sticky bottom-3 mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink/95 backdrop-blur px-4 py-3 shadow-lg">
            <p className="text-sm mr-auto">{sel.length ? <><b className="text-mint">{sel.length}</b> escolhida(s) de {items.length}</> : <span className="text-fog">Toque nos cartões para escolher</span>}{msg && <span className="text-mint ml-2">· {msg}</span>}</p>
            <button onClick={saveSel} className="btn btn-ghost btn-sm">Salvar seleção</button>
            <button disabled={!sel.length} onClick={toPlanner} className="btn btn-mint btn-sm">Enviar ao Quadro como ideias</button>
          </div>
        </section>
      )}
    </div>
  );
}
