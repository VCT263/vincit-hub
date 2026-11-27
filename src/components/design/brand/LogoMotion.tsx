"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { download, monoSvg, primaryLogo, readableOn, contrast, svgParts, svgWithFonts } from "@/lib/design";
import { I } from "@/components/icons";

/* Animação do logo (revelação de 5 s em loop): desenha o contorno, preenche, encaixa com
   easing cúbico e passa um brilho. Tudo no navegador, sem custo: vira vídeo (MediaRecorder)
   e SVG animado. Inspirado no "Prompt #1" do @spotdesignn. */

const T = 5, FPS = 30;
const SIZES = { "1:1": [1080, 1080], "9:16": [1080, 1920], "16:9": [1920, 1080] } as const;
type Size = keyof typeof SIZES;
type Bg = "Escuro" | "Claro" | "Primária";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => (v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
const out = (v: number) => 1 - Math.pow(1 - v, 3);

/** valores de cada camada no tempo t (uma só fonte para o vídeo e para o SVG animado) */
function at(t: number) {
  const draw = ease(clamp((t - .2) / 1.8));
  return {
    dash: 1 - draw,
    stroke: 1 - ease(clamp((t - 2.3) / .6)),
    fill: ease(clamp((t - 1.6) / .9)),
    scale: .93 + .07 * out(clamp((t - 1.6) / 1)),
    sweep: -.5 + 2 * ease(clamp((t - 2.8) / 1.1)),
    fade: ease(clamp((t - 4.5) / .5)),
  };
}

const SHAPES = /<(path|rect|circle|ellipse|polygon|polyline|line)\b/g;
const fontsOf = (svg: string) => Array.from(new Set(Array.from(svg.matchAll(/font-family="([^"]+)"/g)).map((m) => m[1].split(",")[0].replace(/['"]/g, "").trim())));

function scene(d: any, size: Size, bgKey: Bg) {
  const C: Record<string, string> = { Primária: "#2d6a4f", Escuro: "#141414", Claro: "#f4f4f2", ...Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex])) };
  const bg = C[bgKey];
  const fg = readableOn(bg) === "#ffffff" ? (bgKey === "Escuro" ? C["Claro"] : "#ffffff") : C["Escuro"];
  const line = bgKey !== "Primária" && contrast(bg, C["Primária"]) > 2.2 ? C["Primária"] : fg;
  const orig = primaryLogo(d);
  // em fundo claro a marca entra com as cores dela; em fundo escuro ou de cor, numa cor só
  const fillSvg = bgKey === "Claro" ? orig : primaryLogo(d, fg);
  const [W, H] = SIZES[size];
  const p = svgParts(orig); const ar = p.w / p.h;
  let lw = W * .62, lh = lw / ar; if (lh > H * .34) { lh = H * .34; lw = lh * ar; }
  const lx = (W - lw) / 2, ly = (H - lh) / 2;
  const nest = (s: string) => { const q = svgParts(s); return `<svg x="${lx}" y="${ly}" width="${lw}" height="${lh}" viewBox="${q.vb}" preserveAspectRatio="xMidYMid meet">${q.inner}</svg>`; };
  const strokeLayer = nest(orig.replace(SHAPES, '<$1 pathLength="100"'));
  const fillLayer = nest(fillSvg);
  const maskLayer = nest(monoSvg(orig, "#ffffff"));
  const sw = Math.max(1.5, W / 520);
  return { W, H, bg, line, lw, lh, lx, ly, strokeLayer, fillLayer, maskLayer, sw, fonts: fontsOf(orig + fillSvg) };
}
type Scene = ReturnType<typeof scene>;

function frameSvg(s: Scene, css: string, t: number) {
  const v = at(t); const cx = s.W / 2, cy = s.H / 2; const band = s.lw * .32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.W} ${s.H}" width="${s.W}" height="${s.H}"><defs><style>${css}
.st *{fill:none !important;stroke:${s.line} !important;stroke-width:${s.sw}px !important;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.st path,.st rect,.st circle,.st ellipse,.st polygon,.st polyline,.st line{stroke-dasharray:100 100;stroke-dashoffset:${(v.dash * 100).toFixed(2)}}
.st text{stroke-dasharray:900 900;stroke-dashoffset:${(v.dash * 900).toFixed(1)}}
.st mask *{stroke:none !important}</style>
<linearGradient id="sg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="lm" maskUnits="userSpaceOnUse" x="0" y="0" width="${s.W}" height="${s.H}">${s.maskLayer}</mask></defs>
<rect width="${s.W}" height="${s.H}" fill="${s.bg}"/>
<g transform="translate(${cx} ${cy}) scale(${v.scale.toFixed(4)}) translate(${-cx} ${-cy})">
<g class="st" opacity="${v.stroke.toFixed(3)}">${s.strokeLayer}</g>
<g opacity="${v.fill.toFixed(3)}">${s.fillLayer}</g>
<g mask="url(#lm)" opacity="${v.fill.toFixed(3)}"><rect x="${s.lx + v.sweep * s.lw - band / 2}" y="${s.ly - s.lh * .3}" width="${band}" height="${s.lh * 1.6}" fill="url(#sg)" transform="skewX(-18)"/></g>
</g>
<rect width="${s.W}" height="${s.H}" fill="${s.bg}" opacity="${v.fade.toFixed(3)}"/></svg>`;
}

/** SVG com animação CSS em loop, amostrando a mesma linha do tempo */
function animatedSvg(s: Scene, css: string) {
  const N = 50; const k: Record<string, string[]> = { dash: [], dasht: [], stroke: [], fill: [], scale: [], sweep: [], fade: [] };
  const cx = s.W / 2, cy = s.H / 2; const band = s.lw * .32;
  for (let i = 0; i <= N; i++) {
    const v = at((i / N) * T); const pc = `${(i / N * 100).toFixed(1)}%`;
    k.dash.push(`${pc}{stroke-dashoffset:${(v.dash * 100).toFixed(2)}}`); k.dasht.push(`${pc}{stroke-dashoffset:${(v.dash * 900).toFixed(1)}}`);
    k.stroke.push(`${pc}{opacity:${v.stroke.toFixed(3)}}`); k.fill.push(`${pc}{opacity:${v.fill.toFixed(3)}}`); k.fade.push(`${pc}{opacity:${v.fade.toFixed(3)}}`);
    k.scale.push(`${pc}{transform:translate(${cx}px,${cy}px) scale(${v.scale.toFixed(4)}) translate(${-cx}px,${-cy}px)}`);
    k.sweep.push(`${pc}{transform:translateX(${(v.sweep * s.lw).toFixed(1)}px)}`);
  }
  const anim = (n: string) => `animation:${n} ${T}s linear infinite`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.W} ${s.H}"><defs><style>${css}
${Object.entries(k).map(([n, f]) => `@keyframes ${n}{${f.join("")}}`).join("\n")}
.st *{fill:none !important;stroke:${s.line} !important;stroke-width:${s.sw}px !important;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.st path,.st rect,.st circle,.st ellipse,.st polygon,.st polyline,.st line{stroke-dasharray:100 100;${anim("dash")}}
.st text{stroke-dasharray:900 900;${anim("dasht")}}
.st mask *{stroke:none !important}
.st{${anim("stroke")}} .fl{${anim("fill")}} .fd{${anim("fade")}} .sc{${anim("scale")}} .sw{${anim("sweep")}}</style>
<linearGradient id="sg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="lm" maskUnits="userSpaceOnUse" x="0" y="0" width="${s.W}" height="${s.H}">${s.maskLayer}</mask></defs>
<rect width="${s.W}" height="${s.H}" fill="${s.bg}"/>
<g class="sc"><g class="st">${s.strokeLayer}</g><g class="fl">${s.fillLayer}</g>
<g class="fl" mask="url(#lm)"><g class="sw"><rect x="${s.lx - band / 2}" y="${s.ly - s.lh * .3}" width="${band}" height="${s.lh * 1.6}" fill="url(#sg)" transform="skewX(-18)"/></g></g></g>
<rect class="fd" width="${s.W}" height="${s.H}" fill="${s.bg}"/></svg>`;
}

const fontCss = async (fonts: string[]) => (await svgWithFonts("<svg></svg>", fonts)).match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
const loadImg = (url: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

export default function LogoMotion({ d, name }: { d: any; name: string }) {
  const [size, setSize] = useState<Size>("1:1");
  const [bg, setBg] = useState<Bg>("Escuro");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  const frames = useRef<HTMLImageElement[]>([]);
  const urls = useRef<string[]>([]);
  const has = !!primaryLogo(d);
  const s = useMemo(() => (has ? scene(d, size, bg) : null), [d, size, bg, has]);
  const cssRef = useRef<{ key: string; css: string }>({ key: "", css: "" });

  // prepara os quadros (as fontes vão embutidas para o desenho no canvas sair certo)
  useEffect(() => {
    if (!s) return; let stop = false; let raf = 0;
    (async () => {
      setBusy(true); setMsg("Preparando a animação…");
      const key = s.fonts.join("|");
      if (cssRef.current.key !== key) cssRef.current = { key, css: await fontCss(s.fonts) };
      const css = cssRef.current.css;
      urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = [];
      const imgs: HTMLImageElement[] = [];
      for (let i = 0; i < T * FPS; i++) {
        if (stop) return;
        const u = URL.createObjectURL(new Blob([frameSvg(s, css, i / FPS)], { type: "image/svg+xml" })); urls.current.push(u);
        imgs.push(await loadImg(u));
      }
      frames.current = imgs; setBusy(false); setMsg("");
      const c = cv.current; if (!c) return; const ctx = c.getContext("2d")!; const t0 = performance.now();
      const loop = () => { const i = Math.floor(((performance.now() - t0) / 1000) * FPS) % imgs.length; ctx.drawImage(imgs[i], 0, 0, c.width, c.height); raf = requestAnimationFrame(loop); };
      loop();
    })().catch(() => { setBusy(false); setMsg("Não deu para montar a animação neste navegador."); });
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, [s]);

  async function video() {
    if (!s || !frames.current.length) return;
    const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const type = types.find((x) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(x));
    if (!type) { setMsg("Este navegador não grava vídeo. Use o SVG animado ou abra no Chrome."); return; }
    setBusy(true); setMsg("Gravando 5 segundos…");
    const c = document.createElement("canvas"); c.width = s.W; c.height = s.H; const ctx = c.getContext("2d")!;
    ctx.drawImage(frames.current[0], 0, 0);
    const rec = new MediaRecorder(c.captureStream(FPS), { mimeType: type, videoBitsPerSecond: 12_000_000 });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start(); const t0 = performance.now();
    await new Promise<void>((r) => { const step = () => { const el = (performance.now() - t0) / 1000; if (el >= T) return r(); ctx.drawImage(frames.current[Math.min(frames.current.length - 1, Math.floor(el * FPS))], 0, 0); requestAnimationFrame(step); }; step(); });
    rec.stop(); await done;
    download(URL.createObjectURL(new Blob(chunks, { type })), `${name}-logo-animado-${size.replace(":", "x")}.${type.includes("mp4") ? "mp4" : "webm"}`);
    setBusy(false); setMsg(type.includes("webm") ? "Vídeo em WebM: o Premiere e o CapCut abrem; para Instagram, converta para MP4 se precisar." : "");
  }
  function svgFile() {
    if (!s) return;
    download(URL.createObjectURL(new Blob([animatedSvg(s, cssRef.current.css)], { type: "image/svg+xml" })), `${name}-logo-animado.svg`);
  }

  if (!s) return null;
  return (
    <div className="card p-4 space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-sm mr-2">Logo animado</p>
        <div className="flex gap-1">{(Object.keys(SIZES) as Size[]).map((k) => <button key={k} onClick={() => setSize(k)} className={`chip !px-2.5 !py-1 ${size === k ? "chip-mint" : ""}`}>{k}</button>)}</div>
        <div className="flex gap-1">{(["Escuro", "Claro", "Primária"] as Bg[]).map((k) => <button key={k} onClick={() => setBg(k)} className={`chip !px-2.5 !py-1 ${bg === k ? "chip-mint" : ""}`}>Fundo {k.toLowerCase()}</button>)}</div>
        <button disabled={busy} onClick={video} className="btn btn-mint btn-sm ml-auto"><I.video className="w-3.5 h-3.5" />Baixar vídeo</button>
        <button disabled={busy} onClick={svgFile} className="btn btn-ghost btn-sm"><I.download className="w-3.5 h-3.5" />SVG animado</button>
      </div>
      <div className="flex gap-4 items-start flex-wrap">
        <canvas ref={cv} width={s.W / 2} height={s.H / 2} className="rounded-lg border border-white/10 bg-black" style={{ width: size === "16:9" ? 480 : size === "9:16" ? 180 : 320, maxWidth: "100%", aspectRatio: `${s.W}/${s.H}`, height: "auto" }} />
        <div className="text-xs text-fog space-y-1.5 max-w-sm">
          <p>5 segundos em loop: o contorno se desenha, a marca preenche e encaixa, e um brilho passa. Use na abertura e no fim dos vídeos, nos stories e na apresentação ao cliente.</p>
          <p>O vídeo sai em {size} a 30 quadros. O SVG animado abre no navegador e serve para sites.</p>
          {msg && <p className="text-mint">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
