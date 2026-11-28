"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Ajuda from "@/components/ajuda/Ajuda";
import Link from "next/link";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  CAMERA_LEVELS, CAMERA_MOVES, CAPTION_STYLES, LETTERING_KINDS, LOOKS, MOTION_KINDS, OVERLAY_MODES, TITLE_SUB_HINT, TRANSITIONS, FONTS_CSS, shakeAt, H, TITLE_LABEL, W, activeOverlays, applyCuts, drawInsert, isHot, setFormat, cameraLevel, speechCamera, captionScreens, drawCover, drawOverlays, fmt, layout, locate, mergeKit, outputWords, removeSilences, segLen, totalDuration, uid, zoomAt,
  type Format, type Kit, type Media, type Overlay, type OverlayMode, type Project, type Title, type Zoom,
} from "@/lib/editor/model";
import { CAMADA_LABEL, sugerir, type Sugestao } from "@/lib/editor/sugestoes";
import { planoPremiere } from "@/lib/editor/premiere";
import { ESTILOS, aplicarEstilo, estiloByNum, estiloTags, projetoDoEstilo } from "@/lib/editor/styles";
import MotionStudio, { MotionThumb, fileToDataUrl, type MotionDoc } from "@/components/av/MotionStudio";
import { aiFetch } from "@/lib/aiFetch";
import { coresDoKit, motionDuration, normalizeSpec, onImageLoad, specDoModelo, type Cena, type MotionSpec } from "@/lib/motion/engine";
import { motionEnd, type MotionClip } from "@/lib/editor/model";

type Busy = { f: number; msg: string } | null;
const EMPTY: Project = { segments: [], titles: [], zooms: [], captionsOn: true, edits: {} };

const SUB_HINT = TITLE_SUB_HINT;
export default function Editor() {
  const [media, setMedia] = useState<Media[]>([]);
  const [p, setP] = useState<Project>(EMPTY);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"clipes" | "legenda" | "textos" | "estilo" | "motion">("clipes");
  const [motions, setMotions] = useState<{ id: string; titulo: string; spec: MotionSpec }[]>([]);
  const [studio, setStudio] = useState<Partial<MotionDoc> | null>(null);
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
  const [sugs, setSugs] = useState<Sugestao[] | null>(null);
  const [busca, setBusca] = useState<{ id: string; q: string; itens?: any[]; fontes?: Record<string, string>; loading?: boolean } | null>(null);

  setFormat(p.format); // W e H da prévia acompanham o formato escolhido
  const wide = p.format === "16:9";
  const catalogo = ESTILOS.filter((e) => e.formato === "ambos" || e.formato === p.format || (!p.format && e.formato === "9:16"));
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
    s.from("content_ideas").select("id,title,hook,format,body").is("archived_at", null).order("updated_at", { ascending: false }).limit(80).then(({ data }) => setContents(data || []));
    if (document.fonts) FONTS_LOAD.forEach((f) => document.fonts.load(f).catch(() => {}));
    loadMotions().then((list) => {
      const id = new URLSearchParams(window.location.search).get("motion");
      const m = id && list.find((x) => x.id === id);
      if (m) { setTab("motion"); setMsg(`Motion "${m.titulo}" pronto para entrar. Adicione o vídeo e, na aba Motion, escolha por cima no cursor ou como clipe.`); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function loadMotions() {
    const { data } = await createClient().from("av_motions").select("id,titulo,spec").eq("status", "pronto").order("updated_at", { ascending: false }).limit(40);
    const list = ((data as any) || []).map((r: any) => ({ ...r, spec: normalizeSpec(r.spec) })) as { id: string; titulo: string; spec: MotionSpec }[];
    setMotions(list);
    return list;
  }

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
  /* ---------- motion (feito em /audiovisual/motion ou aqui na gaveta) ---------- */
  function motionOver(m: { id?: string; titulo: string; spec: MotionSpec }) {
    const start = Math.max(0, Math.min(tRef.current, Math.max(0, total - 0.3)));
    update((pp) => ({ ...pp, motions: [...(pp.motions || []), { id: uid(), start, spec: m.spec, nome: m.titulo, motionId: m.id, transparente: m.spec.fundo === "transparente" }] }));
    setMsg(`"${m.titulo}" entrou por cima em ${fmt(start)}${m.spec.fundo === "transparente" ? " (transparente)" : ""}. Ajuste o início na aba Motion.`);
  }
  /** motion como clipe: vira um MP4 na hora (no navegador) e entra na timeline, somando tempo */
  async function motionClip(m: { id?: string; titulo: string; spec: MotionSpec }, where: "inicio" | "fim") {
    try {
      cancelRef.current.cancel = false;
      setBusy({ f: 0, msg: `Gerando o clipe de "${m.titulo}"…` });
      const { exportMotion } = await import("@/lib/motion/export");
      const fmtP = (p.format || "9:16") as Format;
      const blob = await exportMotion({ ...m.spec, fundo: m.spec.fundo === "transparente" ? "gradiente" : m.spec.fundo }, { formato: fmtP, onProgress: (f) => setBusy({ f, msg: `Gerando o clipe de "${m.titulo}"… ${Math.round(f * 100)}%` }), signal: cancelRef.current });
      const file = new File([blob], `${m.titulo.replace(/[\\/:*?"<>|]+/g, "")}.mp4`, { type: "video/mp4" });
      const dur = motionDuration(m.spec);
      const [w, h] = fmtP === "16:9" ? [1920, 1080] : [1080, 1920];
      const md: Media = { id: uid(), name: file.name, file, url: URL.createObjectURL(file), duration: dur, width: w, height: h, words: [] };
      setMedia((all) => [...all, md]);
      const seg = { id: uid(), mediaId: md.id, in: 0, out: dur };
      update((pp) => {
        if (where === "fim") return { ...pp, segments: [...pp.segments, seg] };
        // no começo: tudo que já estava na timeline anda junto
        const sh = <T extends { start: number }>(x: T) => ({ ...x, start: x.start + dur, ...("end" in x ? { end: (x as any).end + dur } : {}) });
        return { ...pp, segments: [seg, ...pp.segments], titles: pp.titles.map(sh), zooms: pp.zooms.map(sh), overlays: (pp.overlays || []).map(sh), motions: (pp.motions || []).map(sh) };
      });
      setMsg(`"${m.titulo}" entrou como clipe no ${where === "fim" ? "fim" : "começo"} (${dur.toFixed(1)} s).`);
    } catch (e: any) { setMsg(e.message); }
    setBusy(null);
  }
  const setMo = (id: string, patch: Partial<MotionClip>) => setP((pp) => ({ ...pp, motions: (pp.motions || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  /** do vídeo para o motion: quadro atual como fundo, texto do momento e cores do kit */
  function criarMotion() {
    setPlaying(false);
    let imagem: string | undefined;
    try { if (total && canvasRef.current) imagem = canvasRef.current.toDataURL("image/jpeg", 0.82); } catch {}
    const tt = p.titles.find((x) => tRef.current >= x.start && tRef.current < x.end);
    const sc = screens.find((x) => tRef.current >= x.start && tRef.current < x.end);
    const texto = tt?.text || contents.find((c) => c.id === contentId)?.hook || contents.find((c) => c.id === contentId)?.title || sc?.words.map((w) => w.t).join(" ") || "Seu título aqui";
    const base = specDoModelo("peca", { formato: (p.format || "9:16") as Format, ...coresDoKit(kit), imagem, fundo: imagem ? "imagem" : "gradiente" });
    base.cenas = [{ ...base.cenas[0], texto, sub: undefined }];
    setStudio({ titulo: "Motion do vídeo", spec: base, kit_id: kitId || null, content_id: contentId || null, origem: "editor" });
  }

  /** pacote de cenas a partir do roteiro: o Claude lê a fala (pela fila) e devolve uma cena editorial para cada ideia forte;
      cada cena entra por cima, em tela cheia, no momento em que a ideia é dita, nas cores do kit */
  const [cenasBusy, setCenasBusy] = useState(false);
  async function pedirCenas() {
    if (!words.length) { setMsg("Gere a legenda primeiro (aba Legenda): as cenas saem da fala."); return; }
    setCenasBusy(true); setPlaying(false);
    setMsg("Pedido de cenas enviado ao Claude. Fica na fila do HUB até ele responder (painel do HUB no Claude).");
    try {
      // a fala em frases curtas, com os tempos da saída editada
      const fala: { inicio: number; fim: number; texto: string }[] = [];
      let cur: typeof words = [];
      const flush = () => { if (cur.length) fala.push({ inicio: +cur[0].start.toFixed(2), fim: +cur[cur.length - 1].end.toFixed(2), texto: cur.map((w) => w.t).join(" ") }); cur = []; };
      words.forEach((w, i) => { if (cur.length >= 16 || (i && w.start - words[i - 1].end > 0.6)) flush(); cur.push(w); if (/[.!?]$/.test(w.t)) flush(); });
      flush();
      const fotos = media.filter((m) => m.image).map((m) => ({ id: m.id, nome: m.name }));
      const c = contents.find((x) => x.id === contentId);
      const roteiro = c ? [c.title, c.hook, c.body].filter(Boolean).join("\n") : "";
      const r = await aiFetch("/api/av/cenas", { task: "cenas_roteiro", fala, roteiro, fotos, formato: p.format || "9:16", duracao: total });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao pedir as cenas");
      const base = { formato: (p.format || "9:16") as Format, ...coresDoKit(kit), fundo: "solido", transicao: "fade", ritmo: "normal", grafismo: false };
      const clips: MotionClip[] = [];
      let livre = 0;
      for (const it of j.cenas as { inicio: number; cena: Cena; foto: string | null }[]) {
        const start = Math.max(it.inicio, livre);
        if (start > total - 1) break;
        const m = it.foto ? media.find((x) => x.id === it.foto) : null;
        const imagem = m ? await fileToDataUrl(m.file, 1200).catch(() => undefined) : undefined;
        const spec = normalizeSpec({ ...base, cenas: [{ ...it.cena, imagem }] });
        spec.cenas[0].dur = Math.min(spec.cenas[0].dur, Math.max(1, total - start));
        clips.push({ id: uid(), start, spec, nome: `Cena · ${(it.cena.texto || it.cena.tipo).replace(/\*/g, "").slice(0, 40)}` });
        livre = start + spec.cenas[0].dur + 0.5;
      }
      // um novo pacote troca o anterior; motions feitos à mão ficam
      update((pp) => ({ ...pp, motions: [...(pp.motions || []).filter((m) => !m.nome.startsWith("Cena · ")), ...clips] }));
      setMsg(`${clips.length} cenas entraram na fala. Confira na faixa MOTION; edite ou tire cada uma aqui na aba Motion.`);
    } catch (e: any) { setMsg(e.message); }
    setCenasBusy(false);
  }

  const setOv = (id: string, patch: Partial<Overlay>) => setP((pp) => ({ ...pp, overlays: (pp.overlays || []).map((o) => (o.id === id ? { ...o, ...patch } : o)) }));

  /* ---------- prévia ---------- */
  const draw = useCallback((time: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const loc = locate(p, time);
    const v = loc ? videos.current.get(loc.seg.mediaId) : null;
    if (v && v.readyState >= 2) drawCover(ctx, v, v.videoWidth, v.videoHeight, zoomAt(p, time, cam), false, shakeAt(p, time));
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
  useEffect(() => onImageLoad(() => { if (!playRef.current) draw(tRef.current); }), [draw]);

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

  function applyPreset(num: string) {
    const e = estiloByNum(num);
    if (!e) return;
    setPreset(num);
    setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), ...e.legenda }, fontes: { ...(o.fontes || {}), ...e.fontes } }));
    if (!media.some((m) => m.words)) {
      update((pp) => projetoDoEstilo(pp, e));
      setMsg(`Estilo ${e.num} · ${e.nome}: lettering, câmera, cor e transição aplicados. Gere a legenda (aba Legenda) e aplique de novo para cortar e pôr os textos.`);
      return;
    }
    const c = contents.find((x) => x.id === contentId);
    const next = aplicarEstilo(e, p, media, kit, { titulo: c?.title, gancho: c?.hook || c?.title, cta: wide ? "Se inscreve e ativa o sininho" : undefined });
    update(() => next);
    seek(0);
    setMsg(`Estilo ${e.num} · ${e.nome} aplicado.${e.cut !== false ? ` Ficou com ${next.segments.length} trechos.` : ""}`);
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
      frase: ["Encontre conforto no desconforto", "conforto", 3],
      letreiro: ["Malícia", undefined, 2.5],
      data: [new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }), new Date().toLocaleDateString("pt-BR", { weekday: "long" }), 3],
      lista: ["O que muda o jogo", "dormir melhor | treinar cedo | escrever o dia", 6],
      rec: ["REC", "4K UHD", 4],
      vazado: ["vendas", "sem anúncio", 2.4],
      riscado: ["tática", "estratégia", 2.4],
      numero: ["70%", "das vendas", 2.6], grafico: ["Vendas", "em 3 meses", 2.8], checklist: ["3 ajustes", "foto | preço | descrição", 3.4],
      seta: ["olha aqui", "baixo", 2], relogio: ["30 min", "por dia", 2.6], progresso: ["70", "da meta", 2.6],
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
  /* ---------- sugestões a partir da fala ---------- */
  function gerarSugestoes() {
    if (!words.length) { setMsg("Gere a legenda primeiro (aba Legenda): as sugestões saem da fala."); return; }
    const c = contents.find((x) => x.id === contentId);
    const out = sugerir(p, words, kit, { roteiro: c?.body, titulo: c?.hook || undefined, wide });
    setSugs(out);
    setMsg(out.length ? `${out.length} sugestões. Aceite uma a uma ou todas de uma vez.` : "Não achei pontos para sugerir nessa fala.");
  }
  function aplicarSug(sg: Sugestao, pp: Project): Project {
    if (sg.title) return { ...pp, titles: [...pp.titles, sg.title] };
    if (sg.zoom) return { ...pp, zooms: [...pp.zooms.filter((z) => z.end <= sg.zoom!.start || z.start >= sg.zoom!.end), sg.zoom] };
    return pp;
  }
  function aceitar(sg: Sugestao) {
    if (sg.camada === "insercao") { buscarImagem(sg); return; }
    update((pp) => aplicarSug(sg, pp));
    setSugs((l) => (l || []).filter((x) => x.id !== sg.id));
  }
  function aceitarTodas() {
    const ok = (sugs || []).filter((x) => x.camada !== "insercao");
    update((pp) => ok.reduce((acc, sg) => aplicarSug(sg, acc), pp));
    setSugs((l) => (l || []).filter((x) => x.camada === "insercao"));
    setMsg(`${ok.length} sugestões aplicadas. As imagens de inserção ficaram na lista: escolha a imagem de cada uma.`);
  }
  async function buscarImagem(sg: Sugestao, q = sg.busca || "") {
    setBusca({ id: sg.id, q, loading: true });
    try {
      const r = await fetch(`/api/av/imagens?q=${encodeURIComponent(q)}&formato=${p.format || "9:16"}`);
      const j = await r.json();
      setBusca({ id: sg.id, q, itens: j.itens || [], fontes: j.fontes || {} });
    } catch { setBusca({ id: sg.id, q, itens: [] }); }
  }
  async function usarImagem(sg: Sugestao, it: any) {
    setBusy({ f: 0.3, msg: "Trazendo a imagem…" });
    try {
      const src = it.fonte === "interno" ? it.url : `/api/av/imagens/baixar?url=${encodeURIComponent(it.url)}`;
      const r = await fetch(src);
      if (!r.ok) throw new Error(await r.text());
      const blob = await r.blob();
      const isVid = blob.type.startsWith("video/");
      const name = `${it.fonte} · ${(it.autor || sg.busca || "imagem").toString().slice(0, 40)}${isVid ? ".mp4" : ".jpg"}`;
      const file = new File([blob], name, { type: blob.type });
      const url = URL.createObjectURL(file);
      const meta = isVid
        ? await new Promise<{ d: number; w: number; h: number }>((res) => { const v = document.createElement("video"); v.preload = "metadata"; v.src = url; v.onloadedmetadata = () => res({ d: v.duration, w: v.videoWidth, h: v.videoHeight }); v.onerror = () => res({ d: 0, w: 0, h: 0 }); })
        : await new Promise<{ d: number; w: number; h: number }>((res) => { const im = new Image(); im.onload = () => res({ d: 5, w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ d: 0, w: 0, h: 0 }); im.src = url; });
      if (!meta.d) throw new Error("arquivo não abriu");
      const m: Media = { id: uid(), name, file, url, duration: meta.d, width: meta.w, height: meta.h, image: !isVid, broll: true };
      setMedia((all) => [...all, m]);
      update((pp) => ({ ...pp, overlays: [...(pp.overlays || []), { id: uid(), mediaId: m.id, start: sg.t, end: Math.min(totalDuration(pp), sg.end), in: 0, mode: sg.modo || "cheia" }] }));
      setSugs((l) => (l || []).filter((x) => x.id !== sg.id));
      setBusca(null);
      setMsg(`Imagem de "${sg.busca}" entrou em ${fmt(sg.t)}.${it.licenca ? ` Licença: ${it.licenca}${it.autor ? `, de ${it.autor}` : ""}.` : ""}`);
    } catch (e: any) { setMsg(`Não deu para usar essa imagem: ${e.message}`); }
    setBusy(null);
  }

  /** segunda saída: manda a edição montada aqui para o painel VINCIT HUB no Premiere */
  const [prSent, setPrSent] = useState<string | null>(null);
  async function sendPremiere() {
    if (!p.segments.length) { setMsg("Adicione o vídeo antes de mandar para o Premiere."); return; }
    const est = estiloByNum(preset || baseKit?.estilo);
    const x = planoPremiere(p, media, kit, screens, est ? { num: est.num, nome: est.nome } : null);
    const s = createClient();
    const row = {
      content_id: contentId || null, kit_id: kitId || null, project_name: "Editor do HUB → Premiere",
      sequence_name: contents.find((c) => c.id === contentId)?.title || x.arquivos.join(", ") || "Edição do HUB",
      fps: 30, duration_sec: x.duracao, timeline: x.timeline, transcript: x.transcript,
      request: `Enviado do Editor do HUB. No Premiere, coloque ${x.arquivos.length > 1 ? "os arquivos " + x.arquivos.join(", ") + " em V1, um depois do outro," : "o arquivo " + (x.arquivos[0] || "original") + " em V1"} a partir do 0.`,
      status: "plano_pronto", plan: x.plan, plan_note: "Montado no Editor do HUB",
    };
    const { data, error } = await s.from("av_edit_sessions").insert(row).select("id").single();
    if (error) { setMsg(error.message); return; }
    setPrSent(data.id);
    setMsg(`Enviado ao Premiere: ${x.plan.resumo} Abra o painel VINCIT HUB no Premiere e clique em Aplicar.`);
  }

  async function askClaude() {
    if (!words.length) { setMsg("Gere a legenda antes: o Claude usa a fala para montar o plano."); return; }
    const s = createClient();
    const row = {
      content_id: contentId || null, kit_id: kitId || null, project_name: "Editor do HUB", sequence_name: contents.find((c) => c.id === contentId)?.title || "Edição no HUB",
      fps: 30, duration_sec: +total.toFixed(2),
      timeline: layout(p).map((l) => ({ faixa: "V1", nome: media.find((m) => m.id === l.seg.mediaId)?.name, inicio: +l.start.toFixed(2), fim: +l.end.toFixed(2) })),
      transcript: words.map((w) => ({ inicio: +w.start.toFixed(2), fim: +w.end.toFixed(2), texto: w.t })),
      request: [ask.trim(), wide ? "Plano para o editor do HUB (vídeo horizontal 16:9 para YouTube, formato série). Cortes são aplicados direto na timeline. B-rolls disponíveis: " + (media.filter((m) => m.broll).map((m) => m.name).join(", ") || "nenhum") : "Plano para o editor do HUB (vídeo vertical 9:16). Cortes são aplicados direto na timeline.", preset || baseKit?.estilo ? `Estilo escolhido: ${preset || baseKit?.estilo} (pode sugerir outro do catálogo em "estilo")` : "Sugira um estilo do catálogo (01 a 14) em \"estilo\""].filter(Boolean).join(" · "),
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
    const est = estiloByNum(pl.estilo);
    if (est) { setPreset(est.num); setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), ...est.legenda }, fontes: { ...(o.fontes || {}), ...est.fontes } })); }
    let next: Project = { ...(est ? projetoDoEstilo(p, est) : p), ...(pl.camera != null && !isNaN(+pl.camera) ? { camera: Math.max(0, Math.min(3, Math.round(+pl.camera))) } : {}) };
    if ((pl.titulos || []).length) next = { ...next, titles: [...next.titles, ...pl.titulos.map((x: any) => ({ id: uid(), kind: Object.keys(TITLE_LABEL).includes(x.tipo) ? x.tipo : "gancho", text: String(x.texto || ""), sub: x.linha ? String(x.linha) : undefined, start: +x.inicio, end: x.fim != null ? +x.fim : +x.inicio + 2.5 }))] };
    if ((pl.zooms || []).length) next = { ...next, zooms: [...next.zooms, ...pl.zooms.map((z: any) => ({ id: uid(), start: +z.inicio, end: z.fim != null ? +z.fim : +z.inicio + 1.5, scale: +z.escala || 110, tipo: ["punch", "push", "pull", "tremida", "chicote"].includes(z.tipo) ? z.tipo : undefined }))] };
    // B-roll do plano: casa pelo nome do arquivo que está no acervo
    const ins = (pl.insercoes || []).map((x: any) => {
      const name = String(x.midia || "").toLowerCase();
      const m = name && media.find((mm) => mm.name.toLowerCase().includes(name) || name.includes(mm.name.toLowerCase().replace(/\.[a-z0-9]+$/, "")));
      return m ? { id: uid(), mediaId: m.id, start: +x.inicio, end: x.fim != null ? +x.fim : +x.inicio + 3, in: 0, mode: (OVERLAY_MODES.some(([v]) => v === x.modo) ? x.modo : "cheia") as OverlayMode } : null;
    }).filter(Boolean) as Overlay[];
    if (ins.length) next = { ...next, overlays: [...(next.overlays || []), ...ins] };
    // cortes por último: títulos e zooms do plano estão no tempo de antes dos cortes
    const cuts = (pl.cortes || []).map((c: any) => ({ inicio: +c.inicio, fim: +c.fim }));
    if (cuts.length) {
      const shift = (x: number) => x - cuts.filter((c: any) => c.fim <= x).reduce((a: number, c: any) => a + (c.fim - c.inicio), 0);
      next = { ...next, segments: applyCuts(next, cuts), titles: next.titles.map((x) => ({ ...x, start: shift(x.start), end: shift(x.end) })), zooms: next.zooms.map((z) => ({ ...z, start: shift(z.start), end: shift(z.end) })), overlays: (next.overlays || []).map((o) => ({ ...o, start: shift(o.start), end: shift(o.end) })), motions: (next.motions || []).map((m) => ({ ...m, start: shift(m.start) })) };
    }
    update(() => next);
    seek(0);
    const s = createClient();
    await s.from("av_edit_sessions").update({ status: "aplicado", applied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", plan.id);
    setPlan({ ...plan, status: "aplicado" });
    setMsg(`Plano aplicado${est ? ` no estilo ${est.num} · ${est.nome}` : ""}: ${cuts.length} cortes, ${(pl.zooms || []).length} zooms, ${(pl.titulos || []).length} textos${ins.length ? `, ${ins.length} B-rolls` : ""}. Espaço para ver.`);
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
          <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">Editor <Ajuda tela className="relative -top-1 ml-1" /></h1>
          <p className="text-sm text-fog mt-1 max-w-2xl">Cortes, legenda automática no estilo do cliente, títulos, B-roll e câmera, em 9:16 para Reels ou 16:9 para YouTube. Tudo roda no seu computador. Para vídeos maiores, use o <Link href="/audiovisual/premiere" className="text-mint">Premiere com o Claude</Link>.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={contentId} onChange={(e) => { setContentId(e.target.value); const m = String(contents.find((c) => c.id === e.target.value)?.body || "").match(/Estilo de edição:\*\*\s*(\d{2})/); if (m && estiloByNum(m[1])) { setPreset(m[1]); setMsg(`O roteiro sugere o estilo ${m[1]} · ${estiloByNum(m[1])!.nome}. Clique nele à direita para aplicar.`); } }}>
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
            {(["clipes", "legenda", "textos", "motion", "estilo"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${tab === k ? "border-mint-dim text-mint" : "border-line text-fog"}`}>{{ clipes: "Clipes", legenda: "Legenda", textos: "Lettering e motion", motion: "Motion", estilo: "Visual da legenda" }[k]}</button>
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
                        {OVERLAY_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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

          {tab === "motion" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-line p-2.5 space-y-1.5">
                <button disabled={cenasBusy || !total} onClick={pedirCenas} className="w-full px-3 py-2 rounded-xl bg-mint text-ink text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"><I.spark className="w-4 h-4" />{cenasBusy ? "Esperando o Claude…" : "Cenas do roteiro (Claude)"}</button>
                <p className="text-xs text-fog">O Claude lê a fala e o roteiro e monta páginas editoriais (papel, título serifado, foto da peça em cartão), números e listas, cada uma no momento em que a ideia é dita. Fotos adicionadas como B-roll entram nos cartões.</p>
              </div>
              <button onClick={criarMotion} className="w-full px-3 py-2 rounded-xl border border-mint-dim text-mint text-sm font-semibold inline-flex items-center justify-center gap-2"><I.spark className="w-4 h-4" />Criar motion a partir do vídeo</button>
              <p className="text-xs text-fog">Usa o quadro do cursor como fundo, o texto do momento e as cores do kit. Também dá para criar e pedir ao Claude em <Link href="/audiovisual/motion" className="text-mint">Motion</Link>.</p>
              {(p.motions || []).length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">No vídeo</p>
                  {(p.motions || []).map((m) => (
                    <div key={m.id} className="rounded-xl border border-line p-2 space-y-1.5">
                      <div className="flex justify-between gap-2 text-xs"><span className="truncate font-semibold">{m.nome}</span><button onClick={() => update((pp) => ({ ...pp, motions: (pp.motions || []).filter((x) => x.id !== m.id) }))} className="text-red-400 shrink-0">Tirar</button></div>
                      <div className="grid grid-cols-2 gap-1.5 items-end">
                        <NumIn label="Começa em" value={m.start} onChange={(v) => setMo(m.id, { start: Math.max(0, v) })} />
                        <span className="text-[11px] text-fog pb-2">{motionDuration(m.spec).toFixed(1)} s</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!m.transparente} onChange={(e) => setMo(m.id, { transparente: !e.target.checked })} />Cobrir o vídeo (com fundo)</label>
                      <div className="flex gap-1"><button onClick={() => setStudio({ id: m.motionId, titulo: m.nome, spec: m.spec })} className="chip">Editar</button><button onClick={() => seek(m.start + 0.01)} className="chip">Ir até</button></div>
                    </div>
                  ))}
                </div>
              )}
              <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Meus motions</p>
              {motions.length === 0 && <p className="text-xs text-fog">Nenhum motion salvo ainda.</p>}
              <div className="grid grid-cols-2 gap-2">
                {motions.map((m) => (
                  <div key={m.id} className="rounded-xl border border-line p-1.5">
                    <MotionThumb spec={m.spec} />
                    <p className="text-[11px] font-semibold truncate mt-1">{m.titulo}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button disabled={!total} onClick={() => motionOver(m)} className="chip !text-[10px] disabled:opacity-40">Por cima</button>
                      <button disabled={!!busy} onClick={() => motionClip(m, "inicio")} className="chip !text-[10px]">Clipe no início</button>
                      <button disabled={!!busy} onClick={() => motionClip(m, "fim")} className="chip !text-[10px]">No fim</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "textos" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <p className="w-full font-mono text-[10px] tracking-[.14em] text-fog uppercase">Lettering</p>
                {LETTERING_KINDS.map((k) => <button key={k} onClick={() => addTitle(k)} className="chip">+ {TITLE_LABEL[k]}</button>)}
                <p className="w-full font-mono text-[10px] tracking-[.14em] text-fog uppercase mt-1">Motion</p>
                {MOTION_KINDS.map((k) => <button key={k} onClick={() => addTitle(k)} className="chip">+ {TITLE_LABEL[k]}</button>)}
                <p className="w-full font-mono text-[10px] tracking-[.14em] text-fog uppercase mt-1">Câmera no cursor</p>
                {CAMERA_MOVES.map(([k, l]) => <button key={k} onClick={() => update((pp) => ({ ...pp, zooms: [...pp.zooms, { id: uid(), start: tRef.current, end: Math.min(total, tRef.current + (k === "push" || k === "pull" ? 3 : k === "punch" ? 1.5 : 0.6)), scale: k === "push" || k === "pull" ? 118 : 112, tipo: k }] }))} className="chip">+ {l}</button>)}
              </div>
              {p.titles.map((tt) => (
                <div key={tt.id} className="rounded-xl border border-line p-2.5 space-y-2">
                  <div className="flex justify-between text-xs text-fog"><span>{TITLE_LABEL[tt.kind]}</span><button onClick={() => update((pp) => ({ ...pp, titles: pp.titles.filter((x) => x.id !== tt.id) }))} className="text-red-400">Apagar</button></div>
                  <input className="input !py-1.5 text-sm" value={tt.text} onChange={(e) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, text: e.target.value } : x)) }))} />
                  {tt.kind in SUB_HINT && <input className="input !py-1 text-xs" placeholder={SUB_HINT[tt.kind]} value={tt.sub || ""} onChange={(e) => setP((pp) => ({ ...pp, titles: pp.titles.map((x) => (x.id === tt.id ? { ...x, sub: e.target.value || undefined } : x)) }))} />}
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
                {CAPTION_STYLES.map(([v, l]) => (
                  <button key={v} title={l} onClick={() => setOverride((o) => ({ ...o, legenda: { ...(o.legenda || {}), estilo: v } }))} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${kit.legenda?.estilo === v ? "border-mint text-mint" : "border-line text-fog"}`}>{l.split(" (")[0]}</button>
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
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Estilo de edição</p>
            <Link href="/audiovisual/kit#catalogo" className="text-[11px] text-mint">ver catálogo</Link>
          </div>
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {catalogo.map((e) => {
              const on = preset === e.num;
              return (
                <button key={e.num} disabled={!media.length || !!busy} onClick={() => applyPreset(e.num)} className={`w-full text-left rounded-xl border px-3 py-2 disabled:opacity-50 ${on ? "border-mint bg-mint/5" : "border-line"}`}>
                  <p className="text-sm font-semibold"><span className="font-mono text-mint mr-1.5">{e.num}</span>{e.nome}{baseKit?.estilo === e.num && <span className="ml-1.5 text-[10px] font-mono text-amber-300">PADRÃO</span>}</p>
                  {on ? <><p className="text-xs text-fog mt-0.5">{e.resumo}</p><p className="text-[10px] text-soft mt-1">{estiloTags(e).join(" · ")}</p></> : <p className="text-[11px] text-fog truncate">{e.uso}</p>}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-200">Sugestões da edição</p>
              <Link href="/audiovisual/kit" className="text-[11px] text-fog">ajustar no kit</Link>
            </div>
            <p className="text-fog mt-1">Lê a fala e o roteiro e sugere lettering, imagem de inserção, motion e câmera nos pontos certos, seguindo o kit.</p>
            <div className="flex gap-2 mt-2">
              <button disabled={!media.length || !!busy} onClick={gerarSugestoes} className="px-3 py-1.5 rounded-lg border border-amber-300/50 text-amber-200 font-semibold disabled:opacity-40">{sugs ? "Sugerir de novo" : "Sugerir edição"}</button>
              {sugs && sugs.some((x) => x.camada !== "insercao") && <button onClick={aceitarTodas} className="px-3 py-1.5 rounded-lg bg-amber-300 text-ink font-semibold">Aceitar todas</button>}
            </div>
            {sugs && (
              <ul className="mt-2 space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {sugs.map((sg) => (
                  <li key={sg.id} className="rounded-lg border border-line p-2">
                    <div className="flex items-start gap-2">
                      <button onClick={() => seek(sg.t + 0.01)} className="font-mono text-[10px] text-fog shrink-0 mt-0.5">{fmt(sg.t)}</button>
                      <div className="min-w-0 flex-1">
                        <p><span className={`font-mono text-[9px] uppercase tracking-wider mr-1 ${sg.camada === "lettering" ? "text-purple-300" : sg.camada === "motion" ? "text-mint" : sg.camada === "camera" ? "text-sky-300" : "text-amber-200"}`}>{CAMADA_LABEL[sg.camada]}</span>{sg.resumo}</p>
                        <p className="text-fog text-[11px]">{sg.motivo}</p>
                      </div>
                      <button onClick={() => aceitar(sg)} className="text-mint font-semibold shrink-0" title={sg.camada === "insercao" ? "Buscar imagem" : "Aceitar"}>{sg.camada === "insercao" ? "Buscar" : "✓"}</button>
                      <button onClick={() => setSugs((l) => (l || []).filter((x) => x.id !== sg.id))} className="text-fog shrink-0" title="Descartar">✕</button>
                    </div>
                    {busca?.id === sg.id && (
                      <div className="mt-2 space-y-1.5">
                        <form onSubmit={(e) => { e.preventDefault(); buscarImagem(sg, busca.q); }} className="flex gap-1">
                          <input className="input !py-1 text-xs" value={busca.q} onChange={(e) => setBusca({ ...busca, q: e.target.value })} />
                          <button className="chip">Buscar</button>
                        </form>
                        {busca.loading ? <p className="text-fog">Buscando no banco interno, Pexels, Pixabay e Openverse…</p> : (
                          <>
                            <div className="grid grid-cols-3 gap-1">
                              {(busca.itens || []).slice(0, 18).map((it) => (
                                <button key={it.fonte + it.id} onClick={() => usarImagem(sg, it)} title={`${it.fonte}${it.autor ? ` · ${it.autor}` : ""}${it.licenca ? ` · ${it.licenca}` : ""}`} className="relative aspect-square rounded-md overflow-hidden border border-line hover:border-mint">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={it.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] px-1 truncate">{it.fonte}</span>
                                </button>
                              ))}
                            </div>
                            {!(busca.itens || []).length && <p className="text-fog">Nada encontrado. Tente outra palavra.</p>}
                            <p className="text-[10px] text-fog">{Object.entries(busca.fontes || {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {!sugs.length && <li className="text-fog">Nada pendente.</li>}
              </ul>
            )}
          </div>
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
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-[11px] text-fog">Cor
                <select value={p.look || "natural"} onChange={(e) => update((pp) => ({ ...pp, look: e.target.value }))} className="input !py-1 text-xs mt-0.5">{LOOKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label className="text-[11px] text-fog">Transição
                <select value={p.transicao || "corte"} onChange={(e) => update((pp) => ({ ...pp, transicao: e.target.value }))} className="input !py-1 text-xs mt-0.5">{TRANSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
            </div>
            <label className="flex items-center gap-1.5 text-xs mt-1.5"><input type="checkbox" checked={!!p.grao} onChange={(e) => update((pp) => ({ ...pp, grao: e.target.checked }))} />Grão de filme</label>
            {camLevel > 0 && media.length > 0 && !words.length && <p className="text-[11px] text-amber-300 mt-1.5">Gere a legenda (aba Legenda) para a câmera seguir a fala.</p>}
          </div>
          <div className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-3 text-xs text-soft">
            <p className="font-semibold text-sky-300">Levar para o Premiere</p>
            <p className="mt-1">Manda esta edição (cortes, legendas, letterings, motion, câmera e imagens) para o painel VINCIT HUB no Premiere, para acabar à mão com mais recursos. Lá, use o arquivo original em V1 a partir do 0.</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button disabled={!media.length || !!busy} onClick={sendPremiere} className="px-3 py-1.5 rounded-lg border border-sky-400/50 text-sky-300 font-semibold disabled:opacity-40">Enviar para o Premiere</button>
              <Link href="/audiovisual/premiere" className="text-fog underline">Como usar</Link>
            </div>
            {prSent && <p className="mt-1.5 text-mint">Enviado. No Premiere: Janela › Extensões › VINCIT HUB.</p>}
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
            <Track name="ZOOM">{p.zooms.map((z) => <Block key={z.id} left={pct(z.start)} width={pct(z.end - z.start)} cls="border border-dashed border-mint text-mint">{CAMERA_MOVES.find((m) => m[0] === (z.tipo || "punch"))?.[1]} {z.scale}%</Block>)}</Track>
            {(p.overlays || []).length > 0 && <Track name="B-ROLL">{(p.overlays || []).map((o) => <Block key={o.id} left={pct(o.start)} width={pct(o.end - o.start)} cls="bg-sky-400/80 text-ink">{OVERLAY_MODES.find(([v]) => v === o.mode)?.[1]} · {media.find((m) => m.id === o.mediaId)?.name}</Block>)}</Track>}
            {(p.motions || []).length > 0 && <Track name="MOTION">{(p.motions || []).map((m) => <Block key={m.id} left={pct(m.start)} width={pct(Math.min(total, motionEnd(m)) - m.start)} onClick={(e) => { e.stopPropagation(); setTab("motion"); seek(m.start + 0.01); }} cls="bg-pink-400/80 text-ink">{m.nome}</Block>)}</Track>}
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

      {studio && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm overflow-y-auto p-3 md:p-6" onClick={() => setStudio(null)}>
          <div className="max-w-5xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2"><p className="font-display text-lg font-extrabold">Criar motion</p><button onClick={() => setStudio(null)} className="chip">Fechar</button></div>
            <MotionStudio compact initial={studio} useLabel={total ? "Pôr no vídeo no cursor" : "Salvar e voltar"} onSaved={() => loadMotions()}
              onUse={(d) => {
                setStudio(null); loadMotions();
                const existing = (p.motions || []).find((x) => d.id && x.motionId === d.id);
                if (existing) { setMo(existing.id, { spec: d.spec, nome: d.titulo }); setMsg(`"${d.titulo}" atualizado no vídeo.`); }
                else if (total) motionOver({ id: d.id, titulo: d.titulo, spec: d.spec });
              }} />
          </div>
        </div>
      )}

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
