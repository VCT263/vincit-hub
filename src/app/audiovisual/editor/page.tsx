"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  FONTS_CSS, H, W, applyCuts, captionScreens, drawCover, drawOverlays, fmt, layout, locate, mergeKit, outputWords, removeSilences, segLen, totalDuration, uid, zoomAt,
  type Kit, type Media, type Project, type Title, type Zoom,
} from "@/lib/editor/model";

type Busy = { f: number; msg: string } | null;
const EMPTY: Project = { segments: [], titles: [], zooms: [], captionsOn: true, edits: {} };

const PRESETS = [
  { key: "impacto", title: "Corte seco + zoom", desc: "Tira os silêncios, zoom de 110% nas frases fortes, legenda palavra a palavra.", estilo: "impacto", zoom: true, cut: true },
  { key: "broll", title: "Talking head limpo", desc: "Tira os silêncios, legenda com caixa colorida, sem zoom.", estilo: "caixa", zoom: false, cut: true },
  { key: "editorial", title: "Editorial", desc: "Legenda serifada e discreta, cortes só nos silêncios longos.", estilo: "editorial", zoom: false, cut: true },
  { key: "documental", title: "Documental calmo", desc: "Mantém as pausas, legenda simples embaixo, sem zoom.", estilo: "documental", zoom: false, cut: false },
];

export default function Editor() {
  const [media, setMedia] = useState<Media[]>([]);
  const [p, setP] = useState<Project>(EMPTY);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"clipes" | "legenda" | "textos" | "estilo">("clipes");
  const [kits, setKits] = useState<{ id: string; name: string; data: Kit }[]>([]);
  const [kitId, setKitId] = useState("");
  const [override, setOverride] = useState<Kit>({});
  const [contents, setContents] = useState<any[]>([]);
  const [contentId, setContentId] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [preset, setPreset] = useState("impacto");
  const [ask, setAsk] = useState("");
  const [plan, setPlan] = useState<{ id: string; status: string; plan?: any; note?: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const tRef = useRef(0);
  const playRef = useRef(false);
  const cancelRef = useRef({ cancel: false });

  const baseKit = kits.find((k) => k.id === kitId)?.data;
  const kit = useMemo(() => {
    const k = mergeKit(baseKit);
    return { ...k, cores: { ...k.cores, ...(override.cores || {}) }, legenda: { ...k.legenda, ...(override.legenda || {}) }, fontes: { ...k.fontes, ...(override.fontes || {}) } };
  }, [baseKit, override]);
  const total = totalDuration(p);
  const words = useMemo(() => outputWords(p, media), [p, media]);
  const screens = useMemo(() => captionScreens(words, kit.legenda?.palavras_por_tela || 3), [words, kit]);

  /* ---------- dados do HUB ---------- */
  useEffect(() => {
    const s = createClient();
    s.from("av_style_kits").select("id,name,data").order("updated_at", { ascending: false }).then(({ data }) => setKits((data as any) || []));
    s.from("content_ideas").select("id,title,hook,format").is("archived_at", null).order("updated_at", { ascending: false }).limit(80).then(({ data }) => setContents(data || []));
    if (document.fonts) FONTS_LOAD.forEach((f) => document.fonts.load(f).catch(() => {}));
  }, []);

  /* ---------- importar arquivos ---------- */
  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const added: Media[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("video/") && !/\.(mov|mp4|m4v|mkv|webm)$/i.test(file.name)) continue;
      const url = URL.createObjectURL(file);
      const meta = await new Promise<{ d: number; w: number; h: number }>((res) => {
        const v = document.createElement("video");
        v.preload = "metadata"; v.src = url;
        v.onloadedmetadata = () => res({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => res({ d: 0, w: 0, h: 0 });
      });
      if (!meta.d) { setMsg(`Não consegui abrir ${file.name}. Use MP4 ou MOV em H.264/H.265.`); continue; }
      added.push({ id: uid(), name: file.name, file, url, duration: meta.d, width: meta.w, height: meta.h });
    }
    if (!added.length) return;
    setMedia((m) => [...m, ...added]);
    setP((pp) => ({ ...pp, segments: [...pp.segments, ...added.map((m) => ({ id: uid(), mediaId: m.id, in: 0, out: m.duration }))] }));
  }

  /* ---------- prévia ---------- */
  const draw = useCallback((time: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const loc = locate(p, time);
    const v = loc ? videos.current.get(loc.seg.mediaId) : null;
    if (v && v.readyState >= 2) drawCover(ctx, v, v.videoWidth, v.videoHeight, zoomAt(p, time));
    else { ctx.fillStyle = "#0c0c0d"; ctx.fillRect(0, 0, W, H); }
    drawOverlays(ctx, p, screens, time, kit);
  }, [p, screens, kit]);

  const seek = useCallback((time: number) => {
    time = Math.max(0, Math.min(total, time));
    tRef.current = time; setT(time);
    const loc = locate(p, time);
    if (!loc) { draw(time); return; }
    const v = videos.current.get(loc.seg.mediaId);
    if (v) {
      videos.current.forEach((o) => { if (o !== v) o.pause(); });
      if (Math.abs(v.currentTime - loc.src) > 0.05) v.currentTime = loc.src;
      const once = () => { draw(tRef.current); v.removeEventListener("seeked", once); };
      v.addEventListener("seeked", once);
    }
    draw(time);
  }, [p, total, draw]);

  useEffect(() => { if (!playRef.current) draw(tRef.current); }, [draw]);

  useEffect(() => {
    if (!playing) return;
    playRef.current = true;
    let raf = 0;
    let current: string | null = null;
    const tick = () => {
      const loc = locate(p, tRef.current);
      if (!loc || tRef.current >= total - 0.02) { setPlaying(false); return; }
      const v = videos.current.get(loc.seg.mediaId)!;
      if (current !== loc.seg.id) {
        current = loc.seg.id;
        videos.current.forEach((o) => { if (o !== v) o.pause(); });
        v.currentTime = loc.src;
        v.play().catch(() => {});
      }
      const now = loc.start + (v.currentTime - loc.seg.in);
      if (v.currentTime >= loc.seg.out - 0.01) {
        tRef.current = loc.end + 0.001; // pula para o próximo trecho
      } else tRef.current = Math.max(tRef.current, now);
      setT(tRef.current);
      draw(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); playRef.current = false; videos.current.forEach((o) => o.pause()); };
  }, [playing, p, total, draw]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      if (e.code === "Space") { e.preventDefault(); setPlaying((x) => !x); }
      if (e.key === "s" && sel) split();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  /* ---------- edição ---------- */
  const update = (fn: (pp: Project) => Project) => { setPlaying(false); setP(fn); };
  function split() {
    const loc = locate(p, tRef.current);
    if (!loc || loc.src - loc.seg.in < 0.1 || loc.seg.out - loc.src < 0.1) return;
    update((pp) => ({ ...pp, segments: pp.segments.flatMap((s) => s.id !== loc.seg.id ? [s] : [{ ...s, out: loc.src }, { id: uid(), mediaId: s.mediaId, in: loc.src, out: s.out }]) }));
  }
  const removeSeg = (id: string) => update((pp) => ({ ...pp, segments: pp.segments.filter((s) => s.id !== id) }));
  const moveSeg = (id: string, d: number) => update((pp) => {
    const a = [...pp.segments]; const i = a.findIndex((s) => s.id === id); const j = i + d;
    if (i < 0 || j < 0 || j >= a.length) return pp;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...pp, segments: a };
  });
  const trim = (id: string, key: "in" | "out", v: number) => update((pp) => ({ ...pp, segments: pp.segments.map((s) => s.id !== id ? s : { ...s, [key]: key === "in" ? Math.min(v, s.out - 0.1) : Math.max(v, s.in + 0.1) }) }));

  async function transcribeAll() {
    const pending = media.filter((m) => !m.words);
    if (!pending.length) { setMsg("Todos os clipes já têm legenda."); return; }
    const { transcribe } = await import("@/lib/editor/transcribe");
    try {
      for (const [i, m] of pending.entries()) {
        const words = await transcribe(m.file, (f, msgx) => setBusy({ f, msg: `${msgx} (${i + 1}/${pending.length})` }));
        setMedia((all) => all.map((x) => (x.id === m.id ? { ...x, words } : x)));
      }
      setMsg("Legenda pronta. Confira o texto na aba Legenda.");
    } catch (e: any) { setMsg(`Não deu para transcrever: ${e.message}`); }
    setBusy(null);
  }

  async function applyPreset(key: string) {
    const pr = PRESETS.find((x) => x.key === key)!;
    setPreset(key);
    setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), estilo: pr.estilo } }));
    if (!media.some((m) => m.words)) { setMsg("Gere a legenda primeiro (aba Legenda). O estilo usa a fala para cortar e dar zoom."); return; }
    const minGap = pr.key === "editorial" ? 0.9 : (kit.regras?.silencio_ms || 350) / 1000;
    let next: Project = { ...p };
    if (pr.cut) next = { ...next, segments: removeSilences(p, media, minGap) };
    if (pr.zoom) {
      const ws = outputWords(next, media);
      const zooms: Zoom[] = [];
      let last = -10;
      ws.forEach((w, i) => {
        const strong = /[!?]$/.test(w.t) || (i > 0 && ws[i - 1].t.match(/[.!?]$/));
        if (strong && w.start - last > 3) { zooms.push({ id: uid(), start: w.start, end: Math.min(w.start + 1.6, next.segments.length ? totalDuration(next) : 0), scale: 110 }); last = w.start; }
      });
      next = { ...next, zooms };
    } else next = { ...next, zooms: [] };
    update(() => next);
    seek(0);
    setMsg(`Estilo "${pr.title}" aplicado.${pr.cut ? ` Ficou com ${next.segments.length} trechos.` : ""}`);
  }

  function addTitle(kind: Title["kind"]) {
    const c = contents.find((x) => x.id === contentId);
    const text = kind === "gancho" ? c?.hook || c?.title || "Seu gancho aqui" : kind === "cta" ? "Comenta EU QUERO" : "Nome · Cargo";
    const start = kind === "cta" ? Math.max(0, total - 3) : kind === "gancho" ? 0 : tRef.current;
    update((pp) => ({ ...pp, titles: [...pp.titles, { id: uid(), kind, text, start, end: Math.min(total || 3, start + (kind === "gancho" ? 2.5 : 3)) }] }));
  }

  async function doExport() {
    setPlaying(false);
    cancelRef.current = { cancel: false };
    try {
      await document.fonts?.ready;
      const { exportMp4 } = await import("@/lib/editor/export");
      const blob = await exportMp4(p, media, kit, (f, m) => setBusy({ f, msg: m }), cancelRef.current);
      if (result) URL.revokeObjectURL(result.url);
      setResult({ url: URL.createObjectURL(blob), size: blob.size });
      setMsg("Vídeo exportado. Baixe abaixo da prévia.");
    } catch (e: any) { setMsg(e.message); }
    setBusy(null);
  }

  /* ---------- plano do Claude (pela fila do conector, sem API paga) ---------- */
  async function askClaude() {
    if (!words.length) { setMsg("Gere a legenda antes: o Claude usa a fala para montar o plano."); return; }
    const s = createClient();
    const row = {
      content_id: contentId || null, kit_id: kitId || null, project_name: "Editor do HUB", sequence_name: contents.find((c) => c.id === contentId)?.title || "Edição no HUB",
      fps: 30, duration_sec: +total.toFixed(2),
      timeline: layout(p).map((l) => ({ faixa: "V1", nome: media.find((m) => m.id === l.seg.mediaId)?.name, inicio: +l.start.toFixed(2), fim: +l.end.toFixed(2) })),
      transcript: words.map((w) => ({ inicio: +w.start.toFixed(2), fim: +w.end.toFixed(2), texto: w.t })),
      request: [ask.trim(), "Plano para o editor do HUB (vídeo vertical 9:16). Cortes são aplicados direto na timeline."].filter(Boolean).join(" · "),
    };
    const { data, error } = await s.from("av_edit_sessions").insert(row).select("id,status").single();
    if (error) { setMsg(error.message); return; }
    setPlan({ id: data.id, status: data.status });
    setMsg("Pedido enviado. No Claude, peça: \"faça o plano da edição do HUB\".");
  }
  useEffect(() => {
    if (!plan || plan.status !== "aguardando_plano") return;
    const s = createClient();
    const iv = setInterval(async () => {
      const { data } = await s.from("av_edit_sessions").select("status,plan,plan_note").eq("id", plan.id).maybeSingle();
      if (data && data.status !== "aguardando_plano") setPlan({ id: plan.id, status: data.status, plan: data.plan, note: data.plan_note });
    }, 6000);
    return () => clearInterval(iv);
  }, [plan]);
  async function applyPlan() {
    if (!plan?.plan) return;
    const pl = plan.plan;
    let next: Project = { ...p };
    if ((pl.titulos || []).length) next = { ...next, titles: [...next.titles, ...pl.titulos.map((x: any) => ({ id: uid(), kind: ["gancho", "cta", "lower_third"].includes(x.tipo) ? x.tipo : "gancho", text: String(x.texto || ""), start: +x.inicio, end: x.fim != null ? +x.fim : +x.inicio + 2.5 }))] };
    if ((pl.zooms || []).length) next = { ...next, zooms: [...next.zooms, ...pl.zooms.map((z: any) => ({ id: uid(), start: +z.inicio, end: z.fim != null ? +z.fim : +z.inicio + 1.5, scale: +z.escala || 110 }))] };
    // cortes por último: títulos e zooms do plano estão no tempo de antes dos cortes
    const cuts = (pl.cortes || []).map((c: any) => ({ inicio: +c.inicio, fim: +c.fim }));
    if (cuts.length) {
      const shift = (x: number) => x - cuts.filter((c: any) => c.fim <= x).reduce((a: number, c: any) => a + (c.fim - c.inicio), 0);
      next = { ...next, segments: applyCuts(next, cuts), titles: next.titles.map((x) => ({ ...x, start: shift(x.start), end: shift(x.end) })), zooms: next.zooms.map((z) => ({ ...z, start: shift(z.start), end: shift(z.end) })) };
    }
    update(() => next);
    seek(0);
    const s = createClient();
    await s.from("av_edit_sessions").update({ status: "aplicado", applied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", plan.id);
    setPlan({ ...plan, status: "aplicado" });
    setMsg(`Plano aplicado: ${cuts.length} cortes, ${(pl.zooms || []).length} zooms, ${(pl.titulos || []).length} textos. Espaço para ver.`);
  }

  /* ---------- timeline ---------- */
  const L = layout(p);
  const pct = (x: number) => `${total ? (x / total) * 100 : 0}%`;
  const tlRef = useRef<HTMLDivElement>(null);
  const clickTl = (e: React.MouseEvent) => {
    const r = tlRef.current!.getBoundingClientRect();
    seek(((e.clientX - r.left - 64) / (r.width - 64)) * total);
  };
  const selSeg = p.segments.find((s) => s.id === sel);
  const selMedia = selSeg && media.find((m) => m.id === selSeg.mediaId);

  return (
    <>
      <link rel="stylesheet" href={FONTS_CSS} />
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[11px] tracking-[.2em] text-mint uppercase">Audiovisual · Pós-produção</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">Editor</h1>
          <p className="text-sm text-fog mt-1 max-w-2xl">Cortes, legenda automática no estilo do cliente, títulos e zoom, exportado em 9:16. Tudo roda no seu computador. Para vídeos maiores, use o <Link href="/audiovisual/premiere" className="text-mint">Premiere com o Claude</Link>.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={contentId} onChange={(e) => setContentId(e.target.value)}>
            <option value="">Conteúdo do HUB…</option>
            {contents.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="input !w-auto" value={kitId} onChange={(e) => { setKitId(e.target.value); setOverride({}); }}>
            <option value="">Kit padrão</option>
            {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <button disabled={!total || !!busy} onClick={doExport} className="px-4 py-2 rounded-xl bg-mint text-ink font-semibold text-sm disabled:opacity-40 inline-flex items-center gap-2"><I.arrow className="w-4 h-4 rotate-90" />Exportar 1080×1920</button>
        </div>
      </div>

      {msg && <p className="text-sm text-mint mb-3">{msg}</p>}
      {busy && (
        <div className="card p-3 mb-3 flex items-center gap-3">
          <div className="flex-1"><p className="text-sm">{busy.msg}</p><div className="h-1.5 bg-line rounded mt-2"><div className="h-full bg-mint rounded" style={{ width: `${Math.round(busy.f * 100)}%` }} /></div></div>
          <button onClick={() => { cancelRef.current.cancel = true; }} className="chip">Cancelar</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)_290px] gap-3">
        {/* ---------- esquerda ---------- */}
        <aside className="card p-3 min-w-0 order-2 lg:order-1">
          <div className="flex flex-wrap gap-1 mb-3">
            {(["clipes", "legenda", "textos", "estilo"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${tab === k ? "border-mint-dim text-mint" : "border-line text-fog"}`}>{{ clipes: "Clipes", legenda: "Legenda", textos: "Textos", estilo: "Lettering" }[k]}</button>
            ))}
          </div>

          {tab === "clipes" && (
            <div className="space-y-3">
              <label className="block border border-dashed border-line rounded-xl p-4 text-center text-sm text-fog cursor-pointer hover:border-mint-dim">
                <input type="file" accept="video/*,.mov,.mp4" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <I.plus className="w-5 h-5 mx-auto mb-1" />Adicionar vídeos do computador
              </label>
              {selSeg && selMedia ? (
                <div className="rounded-xl border border-line p-3 space-y-2">
                  <p className="text-sm font-semibold truncate">{selMedia.name}</p>
                  <Range label="Início" value={selSeg.in} max={selMedia.duration} onChange={(v) => trim(selSeg.id, "in", v)} />
                  <Range label="Fim" value={selSeg.out} max={selMedia.duration} onChange={(v) => trim(selSeg.id, "out", v)} />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button onClick={split} className="chip">Dividir no cursor (S)</button>
                    <button onClick={() => moveSeg(selSeg.id, -1)} className="chip">← Antes</button>
                    <button onClick={() => moveSeg(selSeg.id, 1)} className="chip">Depois →</button>
                    <button onClick={() => { removeSeg(selSeg.id); setSel(null); }} className="chip text-red-400">Apagar</button>
                  </div>
                </div>
              ) : <p className="text-xs text-fog">Clique num trecho da timeline para cortar, dividir ou mudar a ordem.</p>}
              <ul className="text-xs text-fog space-y-1">
                {media.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="truncate">{m.name}</span><span className="font-mono">{fmt(m.duration)}{m.words ? " · legenda" : ""}</span></li>)}
              </ul>
            </div>
          )}

          {tab === "legenda" && (
            <div className="space-y-3">
              <button disabled={!media.length || !!busy} onClick={transcribeAll} className="w-full px-3 py-2 rounded-xl border border-mint-dim text-mint text-sm font-semibold disabled:opacity-40">Gerar legenda automática</button>
              <p className="text-xs text-fog">O Whisper roda no seu navegador, sem custo. Na primeira vez ele baixa o modelo (uns 80 MB).</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.captionsOn} onChange={(e) => update((pp) => ({ ...pp, captionsOn: e.target.checked }))} />Mostrar legenda no vídeo</label>
              <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
                {screens.map((s, i) => (
                  <div key={i} className={`rounded-lg p-2 text-sm border ${t >= s.start && t < s.end ? "border-mint-dim" : "border-transparent"}`}>
                    <button onClick={() => seek(s.start + 0.01)} className="font-mono text-[10px] text-fog">{fmt(s.start)}</button>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.words.map((w) => (
                        <input key={w.key} value={w.t} onChange={(e) => setP((pp) => ({ ...pp, edits: { ...pp.edits, [w.key]: e.target.value } }))} className="bg-transparent border-b border-line focus:border-mint outline-none text-sm" style={{ width: `${Math.max(2, w.t.length) + 1}ch` }} />
                      ))}
                    </div>
                  </div>
                ))}
                {!screens.length && <p className="text-xs text-fog">A legenda aparece aqui para você corrigir palavra por palavra. Apague o texto de uma palavra para tirar ela.</p>}
              </div>
            </div>
          )}

          {tab === "textos" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => addTitle("gancho")} className="chip">+ Gancho</button>
                <button onClick={() => addTitle("cta")} className="chip">+ CTA</button>
                <button onClick={() => addTitle("lower_third")} className="chip">+ Nome na tela</button>
                <button onClick={() => update((pp) => ({ ...pp, zooms: [...pp.zooms, { id: uid(), start: tRef.current, end: Math.min(total, tRef.current + 1.5), scale: 112 }] }))} className="chip">+ Zoom no cursor</button>
              </div>
              {p.titles.map((tt) => (
                <div key={tt.id} className="rounded-xl border border-line p-2.5 space-y-2">
                  <div className="flex justify-between text-xs text-fog"><span>{{ gancho: "Gancho", cta: "CTA", lower_third: "Nome na tela" }[tt.kind]}</span><button onClick={() => update((pp) => ({ ...pp, titles: pp.titles.filter((x) => x.id !== tt.id) }))} className="text-red-400">Apagar</button></div>
                  <input className="input !py-1.5 text-sm" value={tt.text} onChange={(e) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, text: e.target.value } : x)) }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumIn label="De (s)" value={tt.start} onChange={(v) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, start: v } : x)) }))} />
                    <NumIn label="Até (s)" value={tt.end} onChange={(v) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, end: v } : x)) }))} />
                  </div>
                </div>
              ))}
              {p.zooms.length > 0 && <p className="text-xs text-fog">{p.zooms.length} zoom(s) na timeline. <button className="text-red-400" onClick={() => update((pp) => ({ ...pp, zooms: [] }))}>Tirar todos</button></p>}
            </div>
          )}

          {tab === "estilo" && (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-fog">Ajustes por cima do kit {baseKit ? `"${kits.find((k) => k.id === kitId)?.name}"` : "padrão"}. Para guardar de vez, edite o kit no Premiere com o Claude.</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[["impacto", "Impacto"], ["caixa", "Caixa"], ["editorial", "Editorial"], ["documental", "Documental"]].map(([v, l]) => (
                  <button key={v} onClick={() => setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), estilo: v } }))} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${kit.legenda?.estilo === v ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-fog w-24">Destaque</span>
                {["#F5C84C", "#6EEFB6", "#FF5A5F", "#7AA7FF", "#C084FC", "#FFFFFF"].map((c) => (
                  <button key={c} aria-label={c} onClick={() => setOverride((o) => ({ ...o, cores: { ...(o.cores || {}), destaque: c } }))} className={`w-6 h-6 rounded-md border-2 ${kit.cores?.destaque?.toUpperCase() === c ? "border-paper" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
              <label className="flex items-center gap-2"><span className="text-xs text-fog w-24">Palavras/tela</span><input type="range" min={1} max={6} value={kit.legenda?.palavras_por_tela || 3} onChange={(e) => setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), palavras_por_tela: +e.target.value } }))} className="flex-1 accent-[var(--color-mint)]" /><span className="font-mono text-xs w-4">{kit.legenda?.palavras_por_tela}</span></label>
              <label className="flex items-center gap-2"><span className="text-xs text-fog w-24">Altura</span><input type="range" min={0.3} max={0.85} step={0.01} value={kit.legenda?.altura || 0.64} onChange={(e) => setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), altura: +e.target.value } }))} className="flex-1 accent-[var(--color-mint)]" /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!kit.legenda?.caixa_alta} onChange={(e) => setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), caixa_alta: e.target.checked } }))} />Caixa alta</label>
            </div>
          )}
        </aside>

        {/* ---------- centro ---------- */}
        <div className="card p-3 flex flex-col items-center gap-3 order-1 lg:order-2 min-w-0">
          <canvas ref={canvasRef} width={W} height={H} className="w-full max-w-[320px] aspect-[9/16] rounded-2xl border border-line bg-black" />
          <div className="flex items-center gap-3">
            <button disabled={!total} onClick={() => setPlaying((x) => !x)} className="px-4 py-2 rounded-xl border border-line text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40">{playing ? <I.pause className="w-4 h-4" /> : <I.play className="w-4 h-4" />}{playing ? "Pausar" : "Tocar"}</button>
            <span className="font-mono text-xs text-soft tabular-nums">{fmt(t)} / {fmt(total)}</span>
          </div>
          {result && (
            <div className="w-full max-w-[320px] rounded-xl border border-mint-dim p-3 text-sm">
              <p className="font-semibold">Vídeo pronto · {(result.size / 1048576).toFixed(1)} MB</p>
              <a href={result.url} download={`${(contents.find((c) => c.id === contentId)?.title || "video").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60)}.mp4`} className="mt-2 inline-flex px-3 py-1.5 rounded-lg bg-mint text-ink font-semibold">Baixar MP4</a>
            </div>
          )}
          {!media.length && <p className="text-sm text-fog text-center">Comece adicionando os takes na aba Clipes.</p>}
        </div>

        {/* ---------- direita ---------- */}
        <aside className="card p-3 min-w-0 order-3 space-y-2">
          <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Estilo de edição</p>
          {PRESETS.map((pr) => (
            <button key={pr.key} disabled={!media.length || !!busy} onClick={() => applyPreset(pr.key)} className={`w-full text-left rounded-xl border p-3 disabled:opacity-50 ${preset === pr.key ? "border-mint bg-mint/5" : "border-line"}`}>
              <p className="text-sm font-semibold">{pr.title}</p>
              <p className="text-xs text-fog mt-0.5">{pr.desc}</p>
            </button>
          ))}
          <div className="rounded-xl border border-purple-400/30 bg-purple-400/5 p-3 text-xs text-soft">
            <p className="font-semibold text-purple-300">Plano do Claude</p>
            <p className="mt-1">O Claude lê a fala, o roteiro e o kit e devolve cortes, zooms e textos. Usa a sua assinatura, sem API paga.</p>
            <textarea value={ask} onChange={(e) => setAsk(e.target.value)} rows={2} placeholder="Ex.: ritmo rápido, gancho forte, CTA para comentar" className="input !py-1.5 text-xs mt-2" />
            {!plan || plan.status === "aplicado" || plan.status === "cancelado" ? (
              <button disabled={!media.length || !!busy} onClick={askClaude} className="mt-2 px-3 py-1.5 rounded-lg border border-purple-400/50 text-purple-300 font-semibold disabled:opacity-40">Pedir plano ao Claude</button>
            ) : plan.status === "aguardando_plano" ? (
              <p className="mt-2 text-amber-300">Esperando o Claude… No Claude, peça: "faça o plano da edição do HUB".</p>
            ) : (
              <div className="mt-2 space-y-2">
                {plan.plan?.resumo && <p className="text-paper">{plan.plan.resumo}</p>}
                <p className="text-fog">{["cortes", "zooms", "titulos"].map((k) => `${(plan.plan?.[k] || []).length} ${k}`).join(" · ")}</p>
                {(plan.plan?.insercoes || []).length > 0 && <ul className="text-fog list-disc pl-4">{plan.plan.insercoes.slice(0, 6).map((x: any, i: number) => <li key={i}>B-roll em {fmt(+x.inicio)}: {x.midia}</li>)}</ul>}
                <div className="flex gap-2"><button onClick={applyPlan} className="px-3 py-1.5 rounded-lg bg-purple-400 text-ink font-semibold">Aplicar</button><button onClick={() => setPlan(null)} className="px-3 py-1.5 rounded-lg border border-line">Descartar</button></div>
              </div>
            )}
          </div>
        </aside>

        {/* ---------- timeline ---------- */}
        <div className="card p-3 lg:col-span-3 order-4 overflow-x-auto">
          <div ref={tlRef} onClick={clickTl} className="relative min-w-[640px] select-none cursor-pointer">
            <Track name="TEXTO">{p.titles.map((x) => <Block key={x.id} left={pct(x.start)} width={pct(x.end - x.start)} cls="bg-purple-400 text-ink">{x.text}</Block>)}</Track>
            <Track name="LEGENDA">{p.captionsOn && screens.map((s, i) => <Block key={i} left={pct(s.start)} width={pct(s.end - s.start)} cls="bg-amber-300/80 text-ink">{s.words.map((w) => w.t).join(" ")}</Block>)}</Track>
            <Track name="ZOOM">{p.zooms.map((z) => <Block key={z.id} left={pct(z.start)} width={pct(z.end - z.start)} cls="border border-dashed border-mint text-mint">{z.scale}%</Block>)}</Track>
            <Track name="VÍDEO">
              {L.map((l, i) => (
                <Block key={l.seg.id} left={pct(l.start)} width={pct(l.end - l.start)} onClick={(e) => { e.stopPropagation(); setSel(l.seg.id); setTab("clipes"); seek(l.start + 0.01); }}
                  cls={`${sel === l.seg.id ? "ring-2 ring-mint" : ""} ${i % 2 ? "bg-[#4f7366]" : "bg-[#5b7f72]"} text-ink`}>
                  {media.find((m) => m.id === l.seg.mediaId)?.name} · {segLen(l.seg).toFixed(1)}s
                </Block>
              ))}
            </Track>
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 pointer-events-none" style={{ left: `calc(64px + (100% - 64px) * ${total ? t / total : 0})` }} />
          </div>
          <p className="text-[11px] text-fog mt-2">Espaço toca e pausa · clique na timeline para ir até o ponto · S divide o trecho no cursor.</p>
        </div>
      </div>

      {/* vídeos escondidos que alimentam a prévia */}
      <div className="hidden">
        {media.map((m) => (
          <video key={m.id} src={m.url} preload="auto" playsInline ref={(el) => { if (el) videos.current.set(m.id, el); else videos.current.delete(m.id); }} onLoadedData={() => draw(tRef.current)} />
        ))}
      </div>
    </>
  );
}

const FONTS_LOAD = ['400 40px "Anton"', '900 40px "Inter"', '800 40px "Inter"', '400 40px "Archivo Black"', 'italic 400 40px "Instrument Serif"', '400 40px "Bebas Neue"', '900 40px "Montserrat"', '900 40px "Poppins"'];

function Track({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center h-9 border-b border-line/60">
      <span className="w-16 shrink-0 font-mono text-[10px] tracking-wider text-fog">{name}</span>
      <div className="relative flex-1 h-6">{children}</div>
    </div>
  );
}
function Block({ left, width, cls, children, onClick }: { left: string; width: string; cls: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return <div onClick={onClick} className={`absolute top-0 h-6 rounded-md px-1.5 text-[10px] font-mono flex items-center overflow-hidden whitespace-nowrap ${cls}`} style={{ left, width }}>{children}</div>;
}
function Range({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs"><span className="w-10 text-fog">{label}</span>
      <input type="range" min={0} max={max} step={0.04} value={value} onChange={(e) => onChange(+e.target.value)} className="flex-1 accent-[var(--color-mint)]" />
      <span className="font-mono w-12 text-right">{fmt(value)}</span>
    </label>
  );
}
function NumIn({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="text-xs text-fog">{label}<input type="number" step={0.1} className="input !py-1 text-sm mt-0.5" value={+value.toFixed(2)} onChange={(e) => onChange(+e.target.value)} /></label>;
}
