"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  CAMERA_LEVELS, FONTS_CSS, H, TITLE_LABEL, W, activeOverlays, applyCuts, drawInsert, isHot, setFormat, cameraLevel, speechCamera, captionScreens, drawCover, drawOverlays, fmt, layout, locate, mergeKit, outputWords, removeSilences, segLen, totalDuration, uid, zoomAt,
  type Format, type Kit, type Media, type Overlay, type OverlayMode, type Project, type Title, type Zoom,
} from "@/lib/editor/model";

type Busy = { f: number; msg: string } | null;
const EMPTY: Project = { segments: [], titles: [], zooms: [], captionsOn: true, edits: {} };

type Preset = { key: string; title: string; desc: string; estilo: string; zoom: boolean; cut: number | false; camera: number; captions: boolean; jump?: number; fade?: boolean; keywords?: boolean; abertura?: boolean };
const PRESETS_V: Preset[] = [
  { key: "impacto", title: "Corte seco + zoom", desc: "Tira os silêncios, câmera forte que acompanha a fala, punch de 110% nas frases fortes, legenda palavra a palavra.", estilo: "impacto", zoom: true, cut: 0, camera: 3, captions: true },
  { key: "broll", title: "Talking head limpo", desc: "Tira os silêncios, legenda com caixa colorida, câmera média seguindo a fala.", estilo: "caixa", zoom: false, cut: 0, camera: 2, captions: true },
  { key: "editorial", title: "Editorial", desc: "Legenda serifada e discreta, cortes só nos silêncios longos, câmera suave.", estilo: "editorial", zoom: false, cut: 0.9, camera: 1, captions: true },
  { key: "documental", title: "Documental calmo", desc: "Mantém as pausas, legenda simples embaixo, câmera parada.", estilo: "documental", zoom: false, cut: false, camera: 0, captions: true },
];
/* horizontal (YouTube): a partir do seu vídeo "21KM em Floripa" e de canais de conhecimento/autodesenvolvimento */
const PRESETS_H: Preset[] = [
  { key: "vlog", title: "Vlog de série", desc: "Abertura com o título sobre o quadro desfocado, corte seco com punch alternado (jump cut), câmera suave, sem legenda, fade no fim. Coloque os B-rolls por cima.", estilo: "editorial", zoom: false, cut: 0, camera: 1, captions: false, jump: 112, fade: true, abertura: true },
  { key: "conhecimento", title: "Conhecimento (ritmo alto)", desc: "Corte seco, punch alternado, câmera média, palavra-chave na tela nas ideias fortes. Estilo de canais de ciência e produtividade.", estilo: "impacto", zoom: true, cut: 0, camera: 2, captions: false, jump: 115, fade: true, keywords: true, abertura: true },
  { key: "documentario", title: "Documentário", desc: "Mantém respiros (corta só pausas longas), câmera suave, legenda discreta embaixo, abertura e fade.", estilo: "documental", zoom: false, cut: 0.9, camera: 1, captions: true, fade: true, abertura: true },
  { key: "conversa", title: "Conversa / podcast", desc: "Sem cortes, câmera parada, nome na tela no começo. Bom para entrevista.", estilo: "documental", zoom: false, cut: false, camera: 0, captions: false },
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
  const [preset, setPreset] = useState("");
  const [addAs, setAddAs] = useState<"fala" | "broll">("fala");
  const [ask, setAsk] = useState("");
  const [plan, setPlan] = useState<{ id: string; status: string; plan?: any; note?: string } | null>(null);

  setFormat(p.format); // W e H da prévia acompanham o formato escolhido
  const wide = p.format === "16:9";
  const PRESETS = wide ? PRESETS_H : PRESETS_V;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brollVideos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const images = useRef<Map<string, HTMLImageElement>>(new Map());
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
  const camLevel = cameraLevel(p, kit);
  const cam = useMemo(() => speechCamera(words, camLevel), [words, camLevel]);

  /* ---------- dados do HUB ---------- */
  useEffect(() => {
    const s = createClient();
    s.from("av_style_kits").select("id,name,data").order("updated_at", { ascending: false }).then(({ data }) => setKits((data as any) || []));
    s.from("content_ideas").select("id,title,hook,format").is("archived_at", null).order("updated_at", { ascending: false }).limit(80).then(({ data }) => setContents(data || []));
    if (document.fonts) FONTS_LOAD.forEach((f) => document.fonts.load(f).catch(() => {}));
  }, []);

  /* ---------- importar arquivos ---------- */
  async function addFiles(files: FileList | null, as: "fala" | "broll" = addAs) {
    if (!files?.length) return;
    const added: Media[] = [];
    for (const file of Array.from(files)) {
      const isImg = file.type.startsWith("image/");
      if (isImg && as === "fala") { setMsg(`${file.name} é imagem: ela entra como B-roll (escolha "B-roll" antes de adicionar).`); continue; }
      if (!isImg && !file.type.startsWith("video/") && !/\.(mov|mp4|m4v|mkv|webm)$/i.test(file.name)) continue;
      const url = URL.createObjectURL(file);
      const meta = isImg
        ? await new Promise<{ d: number; w: number; h: number }>((res) => { const im = new Image(); im.onload = () => res({ d: 5, w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ d: 0, w: 0, h: 0 }); im.src = url; })
        : await new Promise<{ d: number; w: number; h: number }>((res) => {
          const v = document.createElement("video");
          v.preload = "metadata"; v.src = url;
          v.onloadedmetadata = () => res({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
          v.onerror = () => res({ d: 0, w: 0, h: 0 });
        });
      if (!meta.d) { setMsg(`Não consegui abrir ${file.name}. Use MP4 ou MOV em H.264/H.265, ou JPG/PNG.`); continue; }
      added.push({ id: uid(), name: file.name, file, url, duration: meta.d, width: meta.w, height: meta.h, image: isImg, broll: as === "broll" });
    }
    if (!added.length) return;
    setMedia((m) => [...m, ...added]);
    // o formato acompanha o primeiro take de fala (deitado → horizontal)
    const firstTalk = added.find((m) => !m.broll);
    if (firstTalk && !p.segments.length && !p.format && firstTalk.width > firstTalk.height) setP((pp) => ({ ...pp, format: "16:9" }));
    if (as === "fala") setP((pp) => ({ ...pp, segments: [...pp.segments, ...added.map((m) => ({ id: uid(), mediaId: m.id, in: 0, out: m.duration }))] }));
    else setMsg(`${added.length} B-roll(s) no acervo. Leve o cursor até o ponto e clique em "Tela cheia" ou "Lateral" na lista.`);
  }

  function addOverlay(m: Media, mode: OverlayMode) {
    const start = tRef.current;
    const len = Math.min(m.image ? 4 : Math.max(1, m.duration), 4);
    const end = Math.min(total || start + len, start + len);
    if (end - start < 0.3) { setMsg("Leve o cursor para antes do fim do vídeo."); return; }
    update((pp) => ({ ...pp, overlays: [...(pp.overlays || []), { id: uid(), mediaId: m.id, start, end, in: 0, mode }] }));
  }
  const setOv = (id: string, patch: Partial<Overlay>) => setP((pp) => ({ ...pp, overlays: (pp.overlays || []).map((o) => (o.id === id ? { ...o, ...patch } : o)) }));

  /* ---------- prévia ---------- */
  const draw = useCallback((time: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const loc = locate(p, time);
    const v = loc ? videos.current.get(loc.seg.mediaId) : null;
    if (v && v.readyState >= 2) drawCover(ctx, v, v.videoWidth, v.videoHeight, zoomAt(p, time, cam));
    else { ctx.fillStyle = "#0c0c0d"; ctx.fillRect(0, 0, W, H); }
    const act = activeOverlays(p, time);
    brollVideos.current.forEach((bv, id) => { if (!act.some((o) => o.mediaId === id)) bv.pause(); });
    for (const ov of act) {
      const im = images.current.get(ov.mediaId);
      if (im?.complete && im.naturalWidth) { drawInsert(ctx, ov, im, im.naturalWidth, im.naturalHeight, time); continue; }
      const bv = brollVideos.current.get(ov.mediaId);
      if (!bv) continue;
      const target = ov.in + (time - ov.start);
      if (!playRef.current || Math.abs(bv.currentTime - target) > 0.3) bv.currentTime = target;
      if (playRef.current && bv.paused) bv.play().catch(() => {});
      if (bv.readyState >= 2) drawInsert(ctx, ov, bv, bv.videoWidth, bv.videoHeight, time);
    }
    drawOverlays(ctx, p, screens, time, kit);
  }, [p, screens, kit, cam]);

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
    const pending = media.filter((m) => !m.words && !m.broll);
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
    if (!media.some((m) => m.words)) { setMsg("Gere a legenda primeiro (aba Legenda). O estilo usa a fala para cortar e mexer a câmera."); return; }
    const minGap = pr.cut === false ? 0 : pr.cut || (kit.regras?.silencio_ms || 350) / 1000;
    let next: Project = { ...p, camera: pr.camera, captionsOn: pr.captions, jumpPunch: pr.jump, fade: !!pr.fade };
    if (pr.cut !== false) next = { ...next, segments: removeSilences(p, media, minGap) };
    const ws = outputWords(next, media);
    const end = totalDuration(next);
    if (pr.zoom) {
      const zooms: Zoom[] = [];
      let last = -10;
      ws.forEach((w, i) => {
        const strong = /[!?]$/.test(w.t) || (i > 0 && ws[i - 1].t.match(/[.!?]$/));
        if (strong && w.start - last > 3) { zooms.push({ id: uid(), start: w.start, end: Math.min(w.start + 1.6, end), scale: 110 }); last = w.start; }
      });
      next = { ...next, zooms };
    } else next = { ...next, zooms: [] };
    let titles = next.titles.filter((x) => x.kind !== "palavra" && x.kind !== "episodio");
    if (pr.keywords) {
      let last = -10;
      for (const w of ws) {
        const clean = w.t.replace(/[^\p{L}\p{N}%$]/gu, "");
        if (clean.length >= 4 && isHot(w.t) && w.start - last > 9 && w.start > 4) { titles.push({ id: uid(), kind: "palavra", text: clean, start: w.start, end: Math.min(end, w.start + 2.2) }); last = w.start; }
      }
    }
    if (pr.abertura) {
      const c = contents.find((x) => x.id === contentId);
      titles = [{ id: uid(), kind: "episodio", text: c?.title || "Título do episódio", sub: String(new Date().getFullYear()), start: 0, end: Math.min(end, 3.5) }, ...titles];
    }
    next = { ...next, titles };
    update(() => next);
    seek(0);
    setMsg(`Estilo "${pr.title}" aplicado.${pr.cut !== false ? ` Ficou com ${next.segments.length} trechos.` : ""}`);
  }

  function addTitle(kind: Title["kind"]) {
    const c = contents.find((x) => x.id === contentId);
    const n = p.titles.filter((x) => x.kind === "capitulo").length + 1;
    const def: Record<Title["kind"], [string, string | undefined, number]> = {
      gancho: [c?.hook || c?.title || "Seu gancho aqui", undefined, 2.5],
      cta: [wide ? "Se inscreve e ativa o sininho" : "Comenta EU QUERO", undefined, 3],
      lower_third: ["Nome", "Cargo ou @perfil", 3.5],
      episodio: [c?.title || "Título do episódio", `EP. 01 · ${new Date().getFullYear()}`, 3.5],
      capitulo: ["Título do capítulo", `Capítulo ${n}`, 3],
      palavra: ["Palavra", undefined, 2.2],
    };
    const [text, sub, len] = def[kind];
    const start = kind === "cta" ? Math.max(0, total - 3) : kind === "gancho" || kind === "episodio" ? 0 : tRef.current;
    update((pp) => ({ ...pp, titles: [...pp.titles, { id: uid(), kind, text, sub, start, end: Math.min(total || len, start + len) }] }));
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
      request: [ask.trim(), wide ? "Plano para o editor do HUB (vídeo horizontal 16:9 para YouTube, formato série). Cortes são aplicados direto na timeline. B-rolls disponíveis: " + (media.filter((m) => m.broll).map((m) => m.name).join(", ") || "nenhum") : "Plano para o editor do HUB (vídeo vertical 9:16). Cortes são aplicados direto na timeline."].filter(Boolean).join(" · "),
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
    let next: Project = { ...p, ...(pl.camera != null && !isNaN(+pl.camera) ? { camera: Math.max(0, Math.min(3, Math.round(+pl.camera))) } : {}) };
    if ((pl.titulos || []).length) next = { ...next, titles: [...next.titles, ...pl.titulos.map((x: any) => ({ id: uid(), kind: Object.keys(TITLE_LABEL).includes(x.tipo) ? x.tipo : "gancho", text: String(x.texto || ""), sub: x.linha ? String(x.linha) : undefined, start: +x.inicio, end: x.fim != null ? +x.fim : +x.inicio + 2.5 }))] };
    if ((pl.zooms || []).length) next = { ...next, zooms: [...next.zooms, ...pl.zooms.map((z: any) => ({ id: uid(), start: +z.inicio, end: z.fim != null ? +z.fim : +z.inicio + 1.5, scale: +z.escala || 110 }))] };
    // B-roll do plano: casa pelo nome do arquivo que está no acervo
    const ins = (pl.insercoes || []).map((x: any) => {
      const name = String(x.midia || "").toLowerCase();
      const m = name && media.find((mm) => mm.name.toLowerCase().includes(name) || name.includes(mm.name.toLowerCase().replace(/\.[a-z0-9]+$/, "")));
      return m ? { id: uid(), mediaId: m.id, start: +x.inicio, end: x.fim != null ? +x.fim : +x.inicio + 3, in: 0, mode: (["esquerda", "direita"].includes(x.modo) ? x.modo : "cheia") as OverlayMode } : null;
    }).filter(Boolean) as Overlay[];
    if (ins.length) next = { ...next, overlays: [...(next.overlays || []), ...ins] };
    // cortes por último: títulos e zooms do plano estão no tempo de antes dos cortes
    const cuts = (pl.cortes || []).map((c: any) => ({ inicio: +c.inicio, fim: +c.fim }));
    if (cuts.length) {
      const shift = (x: number) => x - cuts.filter((c: any) => c.fim <= x).reduce((a: number, c: any) => a + (c.fim - c.inicio), 0);
      next = { ...next, segments: applyCuts(next, cuts), titles: next.titles.map((x) => ({ ...x, start: shift(x.start), end: shift(x.end) })), zooms: next.zooms.map((z) => ({ ...z, start: shift(z.start), end: shift(z.end) })), overlays: (next.overlays || []).map((o) => ({ ...o, start: shift(o.start), end: shift(o.end) })) };
    }
    update(() => next);
    seek(0);
    const s = createClient();
    await s.from("av_edit_sessions").update({ status: "aplicado", applied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", plan.id);
    setPlan({ ...plan, status: "aplicado" });
    setMsg(`Plano aplicado: ${cuts.length} cortes, ${(pl.zooms || []).length} zooms, ${(pl.titulos || []).length} textos${ins.length ? `, ${ins.length} B-rolls` : ""}. Espaço para ver.`);
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
          <p className="text-sm text-fog mt-1 max-w-2xl">Cortes, legenda automática no estilo do cliente, títulos, B-roll e câmera, em 9:16 para Reels ou 16:9 para YouTube. Tudo roda no seu computador. Para vídeos maiores, use o <Link href="/audiovisual/premiere" className="text-mint">Premiere com o Claude</Link>.</p>
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
          <Link href="/audiovisual/kit" className="chip self-center">Editar kits</Link>
          <div className="flex rounded-xl border border-line overflow-hidden text-sm">
            {(["9:16", "16:9"] as Format[]).map((f) => (
              <button key={f} onClick={() => { update((pp) => ({ ...pp, format: f })); setPreset(""); }} className={`px-3 py-2 font-semibold ${(p.format || "9:16") === f ? "bg-mint/10 text-mint" : "text-fog"}`}>{f === "9:16" ? "Vertical 9:16" : "YouTube 16:9"}</button>
            ))}
          </div>
          <button disabled={!total || !!busy} onClick={doExport} className="px-4 py-2 rounded-xl bg-mint text-ink font-semibold text-sm disabled:opacity-40 inline-flex items-center gap-2"><I.arrow className="w-4 h-4 rotate-90" />Exportar {wide ? "1920×1080" : "1080×1920"}</button>
        </div>
      </div>

      {msg && <p className="text-sm text-mint mb-3">{msg}</p>}
      {busy && (
        <div className="card p-3 mb-3 flex items-center gap-3">
          <div className="flex-1"><p className="text-sm">{busy.msg}</p><div className="h-1.5 bg-line rounded mt-2"><div className="h-full bg-mint rounded" style={{ width: `${Math.round(busy.f * 100)}%` }} /></div></div>
          <button onClick={() => { cancelRef.current.cancel = true; }} className="chip">Cancelar</button>
        </div>
      )}

      <div className={`grid gap-3 ${wide ? "lg:grid-cols-[280px_minmax(0,1fr)_260px]" : "lg:grid-cols-[300px_minmax(0,1fr)_290px]"}`}>
        {/* ---------- esquerda ---------- */}
        <aside className="card p-3 min-w-0 order-2 lg:order-1">
          <div className="flex flex-wrap gap-1 mb-3">
            {(["clipes", "legenda", "textos", "estilo"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${tab === k ? "border-mint-dim text-mint" : "border-line text-fog"}`}>{{ clipes: "Clipes", legenda: "Legenda", textos: "Textos", estilo: "Lettering" }[k]}</button>
            ))}
          </div>

          {tab === "clipes" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 text-xs">
                {([["fala", "Fala (timeline)"], ["broll", "B-roll (por cima)"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setAddAs(k)} className={`rounded-lg border px-2 py-1.5 font-semibold ${addAs === k ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>
                ))}
              </div>
              <label className="block border border-dashed border-line rounded-xl p-4 text-center text-sm text-fog cursor-pointer hover:border-mint-dim">
                <input type="file" accept={addAs === "broll" ? "video/*,image/*,.mov,.mp4" : "video/*,.mov,.mp4"} multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <I.plus className="w-5 h-5 mx-auto mb-1" />{addAs === "broll" ? "Adicionar B-roll (vídeo ou imagem)" : "Adicionar vídeos do computador"}
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
              <ul className="text-xs text-fog space-y-1.5">
                {media.map((m) => (
                  <li key={m.id}>
                    <div className="flex justify-between gap-2"><span className="truncate">{m.broll ? "▧ " : ""}{m.name}</span><span className="font-mono shrink-0">{m.image ? "imagem" : fmt(m.duration)}{m.words ? " · legenda" : ""}</span></div>
                    {m.broll && <div className="flex gap-1 mt-1"><button onClick={() => addOverlay(m, "cheia")} className="chip">Tela cheia no cursor</button><button onClick={() => addOverlay(m, wide ? "esquerda" : "direita")} className="chip">{wide ? "Lateral" : "Cartão"}</button></div>}
                  </li>
                ))}
              </ul>
              {(p.overlays || []).length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">B-rolls na timeline</p>
                  {(p.overlays || []).map((o) => (
                    <div key={o.id} className="rounded-xl border border-line p-2 space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="truncate">{media.find((m) => m.id === o.mediaId)?.name}</span><button onClick={() => update((pp) => ({ ...pp, overlays: (pp.overlays || []).filter((x) => x.id !== o.id) }))} className="text-red-400">Apagar</button></div>
                      <select className="input !py-1 text-xs" value={o.mode} onChange={(e) => setOv(o.id, { mode: e.target.value as OverlayMode })}>
                        <option value="cheia">Tela cheia</option><option value="esquerda">Cartão à esquerda</option><option value="direita">Cartão à direita</option>
                      </select>
                      <div className="grid grid-cols-3 gap-1.5">
                        <NumIn label="De" value={o.start} onChange={(v) => setOv(o.id, { start: v })} />
                        <NumIn label="Até" value={o.end} onChange={(v) => setOv(o.id, { end: v })} />
                        <NumIn label="Início do clipe" value={o.in} onChange={(v) => setOv(o.id, { in: Math.max(0, v) })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <button onClick={() => addTitle("episodio")} className="chip">+ Abertura do episódio</button>
                <button onClick={() => addTitle("capitulo")} className="chip">+ Capítulo</button>
                <button onClick={() => addTitle("palavra")} className="chip">+ Palavra-chave</button>
                <button onClick={() => update((pp) => ({ ...pp, zooms: [...pp.zooms, { id: uid(), start: tRef.current, end: Math.min(total, tRef.current + 1.5), scale: 112 }] }))} className="chip">+ Zoom no cursor</button>
              </div>
              {p.titles.map((tt) => (
                <div key={tt.id} className="rounded-xl border border-line p-2.5 space-y-2">
                  <div className="flex justify-between text-xs text-fog"><span>{TITLE_LABEL[tt.kind]}</span><button onClick={() => update((pp) => ({ ...pp, titles: pp.titles.filter((x) => x.id !== tt.id) }))} className="text-red-400">Apagar</button></div>
                  <input className="input !py-1.5 text-sm" value={tt.text} onChange={(e) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, text: e.target.value } : x)) }))} />
                  {["episodio", "capitulo", "lower_third", "palavra"].includes(tt.kind) && <input className="input !py-1 text-xs" placeholder={tt.kind === "episodio" ? "Linha de baixo (ex.: EP. 03 · 2026)" : tt.kind === "capitulo" ? "Linha de cima (ex.: Capítulo 2)" : "Linha pequena"} value={tt.sub || ""} onChange={(e) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, sub: e.target.value || undefined } : x)) }))} />}
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
              <p className="text-xs text-fog">Ajustes por cima do kit {baseKit ? `"${kits.find((k) => k.id === kitId)?.name}"` : "padrão"}. Para guardar de vez, edite na página <Link href="/audiovisual/kit" className="text-mint">Kit de estilo</Link>.</p>
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
          <canvas key={wide ? "h" : "v"} ref={canvasRef} width={W} height={H} className={`w-full rounded-2xl border border-line bg-black ${wide ? "aspect-video" : "max-w-[320px] aspect-[9/16]"}`} />
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
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-semibold">Câmera que acompanha a fala</p>
            <p className="text-xs text-fog mt-0.5">Zoom in e zoom out lentos a cada frase, mais fundo nas perguntas e exclamações, e um toque rápido nas palavras fortes. Usa a legenda gerada.</p>
            <div className="grid grid-cols-4 gap-1 mt-2">
              {CAMERA_LEVELS.map((l, i) => (
                <button key={l} onClick={() => update((pp) => ({ ...pp, camera: i }))} className={`rounded-lg border px-1 py-1.5 text-[11px] font-semibold ${camLevel === i ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!p.jumpPunch} onChange={(e) => update((pp) => ({ ...pp, jumpPunch: e.target.checked ? 112 : undefined }))} />Punch alternado nos cortes</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!p.fade} onChange={(e) => update((pp) => ({ ...pp, fade: e.target.checked }))} />Fade no começo e no fim</label>
            </div>
            {camLevel > 0 && media.length > 0 && !words.length && <p className="text-[11px] text-amber-300 mt-1.5">Gere a legenda (aba Legenda) para a câmera seguir a fala.</p>}
          </div>
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
            {(p.overlays || []).length > 0 && <Track name="B-ROLL">{(p.overlays || []).map((o) => <Block key={o.id} left={pct(o.start)} width={pct(o.end - o.start)} cls="bg-sky-400/80 text-ink">{o.mode === "cheia" ? "▣" : "◧"} {media.find((m) => m.id === o.mediaId)?.name}</Block>)}</Track>}
            <Track name="CÂMERA">{cam.moves.map((m, i) => <Block key={i} left={pct(m.start)} width={pct(m.end - m.start)} cls={`border ${m.to >= m.from ? "border-sky-400/70 text-sky-300" : "border-orange-400/70 text-orange-300"}`}>{m.to >= m.from ? "zoom in" : "zoom out"} {Math.round(m.to * 100)}%</Block>)}{cam.hits.map((h, i) => <span key={`h${i}`} className="absolute top-2 w-2 h-2 -ml-1 rounded-full bg-sky-300 pointer-events-none" style={{ left: pct(h.t) }} />)}</Track>
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
        {media.filter((m) => m.broll && !m.image).map((m) => (
          <video key={`b${m.id}`} src={m.url} preload="auto" muted playsInline ref={(el) => { if (el) brollVideos.current.set(m.id, el); else brollVideos.current.delete(m.id); }} onLoadedData={() => draw(tRef.current)} />
        ))}
        {media.filter((m) => m.image).map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`i${m.id}`} src={m.url} alt="" ref={(el) => { if (el) images.current.set(m.id, el); else images.current.delete(m.id); }} onLoad={() => draw(tRef.current)} />
        ))}
        {media.filter((m) => !m.broll).map((m) => (
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
