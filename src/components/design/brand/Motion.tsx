"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { Frame, type Ctx, type SlideDef } from "./Presentation";
import { drawMotion, motionDuration, preloadMotion, specDoModelo, type MotionSpec } from "@/lib/motion/engine";
import { primaryLogo, svgUrl } from "@/lib/design";

/** vinheta de abertura com o logo, feita no motor de motion do Audiovisual */
export function introSpec(x: Ctx, d: any): MotionSpec {
  const fam = (st: CSSProperties) => String(st.fontFamily || "").split(",")[0].replace(/["']/g, "").trim() || "Inter";
  let logo: string | undefined;
  try { const svg = primaryLogo(d, x.paper); if (svg) logo = svgUrl(svg); } catch {}
  const spec = specDoModelo("abertura", { formato: "16:9", cores: { fundo: x.ink, texto: x.paper, destaque: x.acc, apoio: x.acc }, fontes: { titulo: fam(x.T()), texto: fam(x.B()) }, logo, fundo: "solido", grao: true });
  spec.cenas[0].texto = x.name;
  spec.cenas[0].sub = d?.brief?.slogan || "Identidade de marca";
  return spec;
}

/** a vinheta tocando num canvas do tamanho do slide; chama onEnd quando acaba */
function IntroStage({ x, spec, playing, onEnd }: { x: Ctx; spec: MotionSpec; playing: boolean; onEnd: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useRef(0);
  useEffect(() => {
    let raf = 0, last = performance.now(), on = true;
    const D = motionDuration(spec);
    preloadMotion(spec).catch(() => {}).then(() => {
      const tick = (now: number) => {
        if (!on) return;
        if (playing) t.current += (now - last) / 1000;
        last = now;
        const g = ref.current?.getContext("2d");
        if (g) drawMotion(g, spec, Math.min(t.current, D - .001), x.W, x.H);
        if (t.current >= D) { onEnd(); return; }
        raf = requestAnimationFrame(tick);
      };
      last = performance.now(); raf = requestAnimationFrame(tick);
    });
    return () => { on = false; cancelAnimationFrame(raf); };
  }, [spec, playing]); // eslint-disable-line
  return <canvas ref={ref} width={x.W} height={x.H} style={{ position: "absolute", inset: 0, width: x.W, height: x.H, zIndex: 4 }} />;
}

/* A apresentação da marca como vídeo, em estilo motion graphic, sem custo: tudo roda no navegador.
   - Assistir: os slides passam sozinhos, com entrada em camadas, zoom lento e cortina na cor da marca
     nos capítulos. Toque à direita ou à esquerda para avançar ou voltar.
   - Baixar: cada slide vira imagem (modern-screenshot), a animação é desenhada num canvas e gravada
     com MediaRecorder (MP4 onde o navegador grava MP4, senão WebM). Grava em tempo real. */

export type VideoMode = "curto" | "completo";
const SHORT = ["capa", "essencia", "posicionamento", "roda", "territorio", "moodboard", "logo", "versoes", "cores", "tipo", "grafismo", "foto-mood", "real-col-", "feed-grid", "feed-ideal", "insta-feed", "manifesto", "bento", "fim"];
type Tr = "fade" | "rise" | "zoom" | "wipe";

export function pickSlides(slides: SlideDef[], mode: VideoMode) {
  const all = slides.map((s, n) => ({ s, n }));
  if (mode === "completo") return all.filter(({ s }) => s.key !== "sumario");
  let mk = 0;
  return all.filter(({ s }) => SHORT.some((k) => (k.endsWith("-") ? s.key.startsWith(k) : s.key === k)) || (s.key.startsWith("mk-") && mk++ < 4));
}
const isDiv = (s: SlideDef) => s.key.startsWith("div-");
const isPhoto = (s: SlideDef) => /^(mk-|foto-|real-|cena-)/.test(s.key);
export function durOf(s: SlideDef, mode: VideoMode) {
  if (isDiv(s)) return 2.6;
  if (s.key === "capa" || s.key === "fim") return 4.2;
  if (s.key === "manifesto") return mode === "curto" ? 7 : 10;
  if (isPhoto(s)) return mode === "curto" ? 3 : 3.8;
  return mode === "curto" ? 3.8 : 5.5;
}
const trOf = (s: SlideDef, i: number): Tr => (isDiv(s) || s.key === "fim" ? "wipe" : isPhoto(s) ? "zoom" : i % 2 ? "rise" : "fade");
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
export const totalDur = (x: { s: SlideDef }[], mode: VideoMode) => x.reduce((a, { s }) => a + durOf(s, mode), 0);

const CSS = `
.mo-layer{position:absolute;inset:0;overflow:hidden}
.mo-out{z-index:1;animation:moOut .8s ease forwards}
.mo-in{z-index:2}
.mo-fade{animation:moFade .8s ease both}
.mo-rise{animation:moRise .9s cubic-bezier(.2,.7,.2,1) both}
.mo-zoom{animation:moZoom 1.1s cubic-bezier(.2,.7,.2,1) both}
.mo-wipe{animation:moClip .9s cubic-bezier(.7,0,.2,1) .3s both}
.mo-sweep{position:absolute;inset:0;z-index:3;pointer-events:none;animation:moSweep 1.2s cubic-bezier(.7,0,.2,1) both}
.mo-kb{position:absolute;inset:0;transform-origin:60% 40%;animation:moKb var(--d) linear both}
.mo-in .deck-slide>*>*{animation:moUp .8s cubic-bezier(.2,.7,.2,1) both}
.mo-in[data-bare="0"] .deck-slide>*>*>*{animation:moUp .7s cubic-bezier(.2,.7,.2,1) both}
.mo-in .deck-slide>*>*:nth-child(1),.mo-in .deck-slide>*>*>*:nth-child(1){animation-delay:.25s}
.mo-in .deck-slide>*>*:nth-child(2),.mo-in .deck-slide>*>*>*:nth-child(2){animation-delay:.4s}
.mo-in .deck-slide>*>*:nth-child(3),.mo-in .deck-slide>*>*>*:nth-child(3){animation-delay:.55s}
.mo-in .deck-slide>*>*:nth-child(4),.mo-in .deck-slide>*>*>*:nth-child(4){animation-delay:.7s}
.mo-in .deck-slide>*>*:nth-child(5),.mo-in .deck-slide>*>*>*:nth-child(5){animation-delay:.85s}
.mo-in .deck-slide>*>*:nth-child(n+6),.mo-in .deck-slide>*>*>*:nth-child(n+6){animation-delay:1s}
.mo-paused,.mo-paused *{animation-play-state:paused!important}
@keyframes moKb{from{transform:scale(1)}to{transform:scale(1.045)}}
@keyframes moUp{from{opacity:0;translate:0 26px}to{opacity:1;translate:0 0}}
@keyframes moOut{to{transform:scale(1.03)}}
@keyframes moFade{from{opacity:0}}
@keyframes moRise{from{opacity:0;transform:translateY(60px)}}
@keyframes moZoom{from{opacity:0;transform:scale(1.12)}}
@keyframes moClip{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes moSweep{0%{transform:translateX(-101%)}45%{transform:translateX(0)}100%{transform:translateX(101%)}}
`;

/** player em tela cheia: passa sozinho, com movimento */
export function MotionPlayer({ x, slides, mode, onClose, intro }: { x: Ctx; slides: SlideDef[]; mode: VideoMode; onClose: () => void; intro?: MotionSpec }) {
  const [inIntro, setInIntro] = useState(!!intro);
  const seq = useMemo(() => pickSlides(slides, mode), [slides, mode]);
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [prog, setProg] = useState(0);
  const [vp, setVp] = useState({ w: 1600, h: 900 });
  const el = useRef(0);
  const total = totalDur(seq, mode);
  const before = seq.slice(0, i).reduce((a, { s }) => a + durOf(s, mode), 0);
  const D = durOf(seq[i].s, mode);

  const go = (n: number) => {
    if (n < 0 || n >= seq.length) return;
    setPrev(i); setI(n); el.current = 0; setProg(0); setEnded(false);
    window.setTimeout(() => setPrev((p) => (p === i ? null : p)), 900);
  };

  useEffect(() => {
    const fit = () => setVp({ w: window.innerWidth, h: window.innerHeight }); fit();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === " ") setPlaying((p) => !p); if (e.key === "ArrowRight") goRef.current(iRef.current + 1); if (e.key === "ArrowLeft") goRef.current(iRef.current - 1); };
    window.addEventListener("resize", fit); window.addEventListener("keydown", key);
    document.documentElement.requestFullscreen?.().catch(() => {});
    (screen.orientation as any)?.lock?.("landscape").catch(() => {});
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("keydown", key); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, []); // eslint-disable-line
  const goRef = useRef(go); goRef.current = go;
  const iRef = useRef(i); iRef.current = i;

  useEffect(() => {
    if (!playing || inIntro) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      el.current += (now - last) / 1000; last = now;
      setProg(Math.min(1, el.current / D));
      if (el.current >= D) { if (i + 1 < seq.length) { goRef.current(i + 1); return; } setPlaying(false); setEnded(true); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, playing, D, seq.length, inIntro]);

  const k = Math.min(vp.w / x.W, (vp.h - 56) / x.H);
  const cur = seq[i];
  const tr = trOf(cur.s, i);
  const layer = (idx: number, cls: string, style?: CSSProperties) => {
    const it = seq[idx];
    return (
      <div key={`${cls}-${idx}`} className={`mo-layer ${cls}`} data-bare={it.s.bare ? "1" : "0"} style={style}>
        <div className="mo-kb" style={{ "--d": `${durOf(it.s, mode) + 1}s` } as CSSProperties}><Frame x={x} s={it.s} n={it.n + 1} total={slides.length}>{it.s.body(x)}</Frame></div>
      </div>
    );
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center print:hidden select-none">
      <style>{CSS}</style>
      <div style={{ width: x.W * k, height: x.H * k, position: "relative", overflow: "hidden" }}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const f = (e.clientX - r.left) / r.width; if (f > .66) go(i + 1); else if (f < .33) go(i - 1); else setPlaying((p) => !p); }}>
        <div className={playing ? "" : "mo-paused"} style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: x.W, height: x.H, position: "relative" }}>
          {prev !== null && prev !== i && layer(prev, "mo-out")}
          {!inIntro && layer(i, `mo-in mo-${tr}`)}
          {inIntro && intro && <IntroStage x={x} spec={intro} playing={playing} onEnd={() => { setInIntro(false); el.current = 0; }} />}
          {tr === "wipe" && <div key={`sw-${i}`} className="mo-sweep" style={{ background: x.acc }} />}
        </div>
        {ended && <div className="absolute inset-0 grid place-items-center bg-black/40"><button onClick={(e) => { e.stopPropagation(); setPrev(null); setI(0); el.current = 0; setEnded(false); setInIntro(!!intro); setPlaying(true); }} className="btn btn-mint">↺ Assistir de novo</button></div>}
      </div>
      <div className="w-full max-w-5xl px-4 h-14 flex items-center gap-3 text-white/70 text-xs font-mono">
        <button onClick={() => setPlaying((p) => !p)} className="w-8 h-8 grid place-items-center rounded-full bg-white/10 text-white" aria-label={playing ? "Pausar" : "Continuar"}>{playing ? "❚❚" : "▶"}</button>
        <div className="flex-1 flex gap-[2px] h-1.5">
          {seq.map((it, n) => <button key={n} onClick={() => go(n)} className="flex-1 bg-white/20 rounded-sm overflow-hidden" style={{ flexGrow: durOf(it.s, mode) }} aria-label={`Ir para ${n + 1}`}><div className="h-full bg-white" style={{ width: n < i ? "100%" : n === i ? `${prog * 100}%` : 0 }} /></button>)}
        </div>
        <span className="tabular-nums whitespace-nowrap">{fmt(before + prog * D)} / {fmt(total)}</span>
        <button onClick={onClose} className="hover:text-white whitespace-nowrap">Sair</button>
      </div>
    </div>
  );
}

/* ---------- exportação para arquivo de vídeo ---------- */

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));
const easeIO = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function videoSupport() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) return null;
  return ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

/** transforma cada slide em JPEG, um por vez, fora da tela */
async function rasterize(x: Ctx, seq: { s: SlideDef; n: number }[], total: number, outW: number, onProg: (f: number) => void, stop: () => boolean) {
  const { domToBlob } = await import("modern-screenshot");
  /* as fontes da marca vêm do Google Fonts por <link>; o navegador não deixa ler essas regras e a
     imagem gerada não carrega arquivos de fora, então busco o CSS, fico com os blocos latinos (os que
     o português usa) e troco cada arquivo de fonte pelo conteúdo em base64 */
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"], link[rel="stylesheet"][href*="api.fontshare.com"]')].map((l) => l.href);
  const css = (await Promise.all([...new Set(links)].map((h) => fetch(h).then((r) => r.text()).catch(() => "")))).join("\n");
  let latin = css.split(/(?=\/\* )/).filter((b) => /^\/\* latin(-ext)? \*\//.test(b) || !b.startsWith("/*")).join("\n");
  const urls = [...new Set([...latin.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]))];
  const inl = await Promise.all(urls.map(async (u) => {
    try { const bl = await fetch(u).then((r) => r.blob()); return [u, await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(bl); })] as const; } catch { return [u, u] as const; }
  }));
  for (const [u, data] of inl) latin = latin.split(u).join(data);
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-${x.W + 200}px;top:0;width:${x.W}px;height:${x.H}px;pointer-events:none`;
  document.body.appendChild(host);
  const out: Blob[] = [];
  try {
    for (let j = 0; j < seq.length; j++) {
      if (stop()) break;
      const { s, n } = seq[j];
      const box = document.createElement("div"); host.appendChild(box);
      const root = createRoot(box);
      root.render(<Frame x={x} s={s} n={n + 1} total={total}>{s.body(x)}</Frame>);
      await wait(isPhoto(s) ? 1200 : 500);
      await document.fonts.ready;
      const node = box.firstElementChild as HTMLElement;
      const blob = await domToBlob(node, { width: x.W, height: x.H, scale: outW / x.W, type: "image/jpeg", quality: .9, timeout: 15000, font: latin ? { cssText: latin } : undefined }).catch(() => null);
      root.unmount(); box.remove();
      if (blob) out.push(blob); else out.push(new Blob());
      onProg((j + 1) / seq.length);
    }
  } finally { host.remove(); }
  return out;
}

/** desenha a animação no canvas e codifica; devolve o arquivo.
    Com WebCodecs (Mediabunny, o mesmo do Editor) gera MP4 mais rápido que o tempo real e sem depender
    da aba estar na frente; sem WebCodecs, grava em tempo real com MediaRecorder. */
export async function exportVideo(x: Ctx, slides: SlideDef[], mode: VideoMode, onProg: (f: number, fase: string) => void, stop: () => boolean, intro?: MotionSpec): Promise<{ blob: Blob; ext: string } | null> {
  const mb = await import("mediabunny");
  const W = 1920, H = Math.round((W * x.H) / x.W / 2) * 2;
  const fast = typeof VideoEncoder !== "undefined" && (await mb.canEncodeVideo("avc", { width: W, height: H }).catch(() => false));
  const mime = fast ? "video/mp4" : videoSupport();
  if (!mime) throw new Error("Este navegador não grava vídeo. Use o Chrome ou o Safari atualizado.");
  const seq = pickSlides(slides, mode);
  const shots = await rasterize(x, seq, slides.length, W, (f) => onProg(f * .4, "Preparando os slides"), stop);
  if (stop()) return null;

  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  const draw = (b: ImageBitmap, sc: number, dx = 0, dy = 0, a = 1) => {
    g.globalAlpha = a;
    const w = W * sc, h = H * sc;
    g.drawImage(b, (W - w) * .6 + dx, (H - h) * .4 + dy, w, h);
    g.globalAlpha = 1;
  };
  /** um quadro: slide j no instante t (s) da sua entrada */
  const paint = (prevBmp: ImageBitmap | null, bmp: ImageBitmap | null, tr: Tr, D: number, t: number) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    if (prevBmp && t < 1.2) draw(prevBmp, 1.045 + .03 * ease(t / 1.2));
    if (!bmp) return;
    const kb = 1 + .045 * (t / (D + 1));
    if (tr === "fade") draw(bmp, kb, 0, 0, ease(t / .8));
    else if (tr === "rise") draw(bmp, kb, 0, 60 * (1 - ease(t / .9)), ease(t / .9));
    else if (tr === "zoom") draw(bmp, kb + .12 * (1 - ease(t / 1.1)), 0, 0, ease(t / 1.1));
    else {
      const p = easeIO((t - .3) / .9);
      g.save(); g.beginPath(); g.rect(0, 0, W * p, H); g.clip(); draw(bmp, kb); g.restore();
      const sw = easeIO(t / 1.2);
      if (sw < 1) { g.fillStyle = x.acc; const pos = sw < .45 ? -1 + sw / .45 : (sw - .45) / .55; g.fillRect(W * pos, 0, W, H); }
    }
  };
  const ID = intro ? motionDuration(intro) : 0;
  if (intro) await preloadMotion(intro).catch(() => {});
  const total = totalDur(seq, mode) + ID;
  const FPS = 30;

  if (fast) {
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const src = new mb.CanvasSource(cv, { codec: "avc", bitrate: mb.QUALITY_MEDIUM, keyFrameInterval: 2 });
    output.addVideoTrack(src, { frameRate: FPS });
    await output.start();
    let prevBmp: ImageBitmap | null = null, at = 0;
    if (intro) {
      const n = Math.round(ID * FPS);
      for (let f = 0; f < n && !stop(); f++) { drawMotion(g, intro, Math.min(f / FPS, ID - .001), W, H); await src.add(at / FPS, 1 / FPS); at++; }
      prevBmp = await createImageBitmap(cv);
    }
    for (let j = 0; j < seq.length && !stop(); j++) {
      const { s } = seq[j]; const D = durOf(s, mode); const tr = trOf(s, j);
      const bmp = shots[j].size ? await createImageBitmap(shots[j]) : null;
      const n = Math.round(D * FPS);
      for (let f = 0; f < n && !stop(); f++) {
        paint(prevBmp, bmp, tr, D, f / FPS);
        await src.add(at / FPS, 1 / FPS); at++;
        if (f % 15 === 0) onProg(.4 + .6 * (at / FPS) / total, "Montando o vídeo");
      }
      prevBmp?.close(); prevBmp = bmp;
    }
    prevBmp?.close();
    if (stop()) { await output.cancel(); return null; }
    await output.finalize();
    return { blob: new Blob([(output.target as InstanceType<typeof mb.BufferTarget>).buffer!], { type: "video/mp4" }), ext: "mp4" };
  }

  const stream = cv.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  rec.start(1000);
  let elapsed = 0, prevBmp: ImageBitmap | null = null;
  if (intro) {
    const t0 = performance.now();
    await new Promise<void>((resolve) => { const fr = () => { const t = (performance.now() - t0) / 1000; drawMotion(g, intro, Math.min(t, ID - .001), W, H); if (t >= ID || stop()) { resolve(); return; } requestAnimationFrame(fr); }; requestAnimationFrame(fr); });
    elapsed = ID; prevBmp = await createImageBitmap(cv);
  }
  for (let j = 0; j < seq.length && !stop(); j++) {
    const { s } = seq[j]; const D = durOf(s, mode); const tr = trOf(s, j);
    const bmp = shots[j].size ? await createImageBitmap(shots[j]) : null;
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = (performance.now() - t0) / 1000;
        paint(prevBmp, bmp, tr, D, Math.min(t, D));
        onProg(.4 + .6 * Math.min(1, (elapsed + Math.min(t, D)) / total), "Gravando o vídeo");
        if (t >= D || stop()) { resolve(); return; }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    elapsed += D;
    prevBmp?.close(); prevBmp = bmp;
  }
  prevBmp?.close();
  await wait(400);
  rec.stop();
  await done;
  if (stop()) return null;
  return { blob: new Blob(parts, { type: mime.split(";")[0] }), ext: mime.includes("mp4") ? "mp4" : "webm" };
}

/** botões de vídeo (assistir e baixar), com a escolha entre versão curta e completa */
export function VideoControls({ x, slides, name, compact, d }: { x: Ctx; slides: SlideDef[]; name: string; compact?: boolean; d?: any }) {
  const intro = useMemo(() => { try { return introSpec(x, d); } catch { return undefined; } }, [x, d]);
  const [mode, setMode] = useState<VideoMode>("curto");
  const [show, setShow] = useState(false);
  const [job, setJob] = useState<{ f: number; fase: string } | null>(null);
  const [err, setErr] = useState("");
  const cancel = useRef(false);
  const durs = useMemo(() => ({ curto: totalDur(pickSlides(slides, "curto"), "curto") + 2.6, completo: totalDur(pickSlides(slides, "completo"), "completo") + 2.6 }), [slides]);
  const [canRec, setCanRec] = useState(false);
  useEffect(() => { setCanRec(!!videoSupport() || typeof VideoEncoder !== "undefined"); }, []);

  async function baixar() {
    setErr(""); cancel.current = false; setJob({ f: 0, fase: "Preparando os slides" });
    try {
      const r = await exportVideo(x, slides, mode, (f, fase) => setJob({ f, fase }), () => cancel.current, intro);
      if (r) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(r.blob);
        a.download = `${name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-apresentacao-${mode}.${r.ext}`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      }
    } catch (e: any) { setErr(e?.message || "Não deu para gerar o vídeo."); }
    setJob(null);
  }

  return (
    <>
      <div className={`inline-flex items-center gap-1 rounded-full border border-line p-0.5 ${compact ? "" : ""}`}>
        {(["curto", "completo"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`px-2.5 py-1 rounded-full text-[11px] ${mode === m ? "bg-white/10 text-white" : "text-fog"}`}>{m === "curto" ? "Curto" : "Completo"} · {fmt(durs[m])}</button>
        ))}
      </div>
      <button onClick={() => setShow(true)} className="btn btn-ghost btn-sm">▶ Ver em vídeo</button>
      {canRec && <button onClick={baixar} disabled={!!job} className="btn btn-ghost btn-sm">Baixar vídeo</button>}
      {err && <span className="text-xs text-red-400">{err}</span>}
      {show && <MotionPlayer x={x} slides={slides} mode={mode} intro={intro} onClose={() => setShow(false)} />}
      {job && (
        <div className="fixed inset-0 z-[110] bg-black/80 grid place-items-center px-6 print:hidden">
          <div className="card p-6 w-full max-w-sm text-center">
            <p className="font-display text-xl font-bold">Gerando o vídeo</p>
            <p className="text-fog text-sm mt-1">{job.fase}… Deixe esta aba aberta até terminar.</p>
            <div className="h-2 bg-white/10 rounded-full mt-5 overflow-hidden"><div className="h-full bg-mint transition-[width]" style={{ width: `${Math.round(job.f * 100)}%` }} /></div>
            <p className="text-xs text-fog mt-2 font-mono">{Math.round(job.f * 100)}%</p>
            <button onClick={() => { cancel.current = true; }} className="btn btn-ghost btn-sm mt-4">Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
