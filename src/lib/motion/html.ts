/**
 * Motion em HTML (27/11): a peça é uma composição HyperFrames (HTML + CSS + GSAP, licença Apache-2.0)
 * escrita pelo Claude a partir do brief. O HUB mostra e exporta no próprio navegador, sem servidor e sem custo:
 * a composição roda num iframe isolado (sandbox só com scripts), o runtime do HyperFrames posiciona cada quadro,
 * o html-to-image (MIT) fotografa o quadro e o Mediabunny grava MP4 ou WebM transparente.
 */
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from "mediabunny";
import type { Brief } from "@/lib/briefs";
import { briefEmTexto } from "@/lib/briefs";
import { ESTILOS_TEXTO } from "./estilos-texto";

export const HF_VERSION = "0.9.104";
const CDN = {
  gsap: "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
  runtime: `https://cdn.jsdelivr.net/npm/@hyperframes/player@${HF_VERSION}/dist/hyperframe.runtime.iife.js`,
  foto: "https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js",
};

export type Variavel = { id: string; type: string; label: string; default: any; options?: string[] };

/** variáveis declaradas no <html data-composition-variables> (o que a tela deixa trocar: texto, cor) */
export function variaveisDeclaradas(html: string): Variavel[] {
  const m = html.match(/data-composition-variables\s*=\s*'([\s\S]*?)'/) || html.match(/data-composition-variables\s*=\s*"([\s\S]*?)"/);
  if (!m) return [];
  try {
    const raw = m[1].replace(/&quot;/g, '"');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => v && typeof v.id === "string").slice(0, 24) : [];
  } catch { return []; }
}

export function infoComposicao(html: string) {
  const w = Number(html.match(/data-composition-id="[^"]*"[^>]*data-width="(\d+)"/)?.[1] || html.match(/data-width="(\d+)"/)?.[1] || 1080);
  const h = Number(html.match(/data-composition-id="[^"]*"[^>]*data-height="(\d+)"/)?.[1] || html.match(/data-height="(\d+)"/)?.[1] || 1920);
  const d = Number(html.match(/data-composition-id="[^"]*"[^>]*data-duration="([\d.]+)"/)?.[1] || html.match(/data-duration="([\d.]+)"/)?.[1] || 5);
  return { w, h, duracao: d };
}

/** confere o mínimo para a composição rodar; devolve a lista de problemas (vazia = ok) */
export function conferirHtml(html: string) {
  const p: string[] = [];
  if (!/data-composition-id=/.test(html)) p.push("falta o elemento raiz com data-composition-id");
  if (!/__timelines/.test(html)) p.push("a linha do tempo não foi registrada em window.__timelines");
  if (!/paused\s*:\s*true/.test(html)) p.push("a linha do tempo precisa nascer pausada (paused: true)");
  if (/Math\.random|Date\.now|fetch\(/.test(html)) p.push("usa algo que muda a cada vez (Math.random, Date.now ou fetch)");
  if (html.length > 400_000) p.push("a composição passou de 400 KB");
  return p;
}

/** limpa a resposta do Claude: tira cercas de código e texto fora do HTML */
export function extrairHtml(text: string) {
  let t = String(text || "").trim();
  const cerca = t.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (cerca) t = cerca[1].trim();
  const i = t.search(/<!doctype html|<html/i);
  if (i > 0) t = t.slice(i);
  const f = t.lastIndexOf("</html>");
  if (f > 0) t = t.slice(0, f + 7);
  return t;
}

const BRIDGE = `(function(){
function ready(){return new Promise(function(res){var n=0;(function w(){if(window.__player&&window.__playerReady)return res();if(++n>600)return res();setTimeout(w,25)})()})}
async function seek(t){await ready();try{window.__player.pause()}catch(e){}var r=window.__player.renderSeek(t);if(r&&r.then)await r;if(window.__hfWaitForSeekCompletion)await window.__hfWaitForSeekCompletion()}
function root(){return document.querySelector('[data-composition-id]')}
window.addEventListener('message',async function(ev){var d=ev.data||{};if(d.__hub!=='motion')return;
try{
if(d.cmd==='info'){await ready();await document.fonts.ready;var r=root();parent.postMessage({__hub:'motion',id:d.id,ok:true,duracao:window.__player.getDuration(),w:+r.getAttribute('data-width'),h:+r.getAttribute('data-height')},'*')}
else if(d.cmd==='seek'){await seek(d.t);parent.postMessage({__hub:'motion',id:d.id,ok:true},'*')}
else if(d.cmd==='play'){await ready();window.__player.play();parent.postMessage({__hub:'motion',id:d.id,ok:true},'*')}
else if(d.cmd==='pause'){await ready();window.__player.pause();parent.postMessage({__hub:'motion',id:d.id,ok:true,t:window.__player.getTime()},'*')}
else if(d.cmd==='time'){parent.postMessage({__hub:'motion',id:d.id,ok:true,t:window.__player?window.__player.getTime():0,playing:window.__player?window.__player.isPlaying():false},'*')}
else if(d.cmd==='frame'){await seek(d.t);var el=root();if(d.transparente){document.documentElement.style.background='transparent';document.body.style.background='transparent'}
var c=await htmlToImage.toCanvas(el,{width:d.w,height:d.h,pixelRatio:1,cacheBust:false,backgroundColor:d.transparente?undefined:getComputedStyle(el).backgroundColor});
var b=await createImageBitmap(c);parent.postMessage({__hub:'motion',id:d.id,ok:true,bmp:b},'*',[b])}
}catch(e){parent.postMessage({__hub:'motion',id:d.id,ok:false,erro:String(e&&e.message||e)},'*')}});
parent.postMessage({__hub:'motion',ola:true},'*');
})();`;

/** monta o documento que roda no iframe: troca os valores das variáveis, fixa as versões e liga a ponte com o HUB */
export function montarDoc(html: string, valores: Record<string, any> = {}) {
  let d = extrairHtml(html);
  // scripts de GSAP/runtime que o Claude tenha posto: a versão é a do HUB
  d = d.replace(/<script[^>]*src="[^"]*(gsap|hyperframe)[^"]*"[^>]*><\/script>/gi, "");
  // a foto do quadro precisa ler as folhas de fonte do Google
  d = d.replace(/<link(?![^>]*crossorigin)([^>]*fonts\.googleapis\.com[^>]*)>/gi, '<link crossorigin="anonymous"$1>');
  const decl = variaveisDeclaradas(d);
  const vals: Record<string, any> = {};
  decl.forEach((v) => (vals[v.id] = v.default));
  Object.assign(vals, valores);
  const head = `<script>window.__hfVariables=${JSON.stringify(valores).replace(/</g, "\\u003c")};window.__hyperframes=window.__hyperframes||{getVariables:function(){return ${JSON.stringify(vals).replace(/</g, "\\u003c")}}};window.__timelines=window.__timelines||{};</script><script src="${CDN.gsap}"></script>`;
  d = /<head[^>]*>/i.test(d) ? d.replace(/<head[^>]*>/i, (m) => m + head) : head + d;
  const fim = `<script src="${CDN.runtime}"></script><script src="${CDN.foto}"></script><script>${BRIDGE}</script>`;
  d = /<\/body>/i.test(d) ? d.replace(/<\/body>/i, fim + "</body>") : d + fim;
  return d;
}

/** controla uma composição num iframe isolado */
export class MotionFrame {
  iframe: HTMLIFrameElement;
  private n = 0;
  private wait: Record<number, (d: any) => void> = {};
  private ola: (() => void) | null = null;
  private onMsg = (e: MessageEvent) => {
    const d = e.data;
    if (e.source !== this.iframe.contentWindow || !d || d.__hub !== "motion") return;
    if (d.ola) { this.ola?.(); this.ola = null; return; }
    if (!this.wait[d.id]) return;
    this.wait[d.id](d); delete this.wait[d.id];
  };
  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    iframe.setAttribute("sandbox", "allow-scripts");
    window.addEventListener("message", this.onMsg);
  }
  /** carrega a composição e espera a ponte dizer "olá" (o load do about:blank inicial não conta) */
  load(doc: string, timeout = 45000) {
    return new Promise<void>((res, rej) => {
      const to = setTimeout(() => { this.ola = null; rej(new Error("A composição não carregou. Confira a internet e tente de novo.")); }, timeout);
      this.ola = () => { clearTimeout(to); res(); };
      this.iframe.srcdoc = doc;
    });
  }
  ask(m: any, timeout = 30000): Promise<any> {
    return new Promise((res, rej) => {
      const id = ++this.n;
      const to = setTimeout(() => { delete this.wait[id]; rej(new Error("A composição não respondeu.")); }, timeout);
      this.wait[id] = (d) => { clearTimeout(to); d.ok ? res(d) : rej(new Error(d.erro || "Erro na composição.")); };
      this.iframe.contentWindow?.postMessage({ ...m, __hub: "motion", id }, "*");
    });
  }
  info() { return this.ask({ cmd: "info" }, 45000) as Promise<{ duracao: number; w: number; h: number }>; }
  seek(t: number) { return this.ask({ cmd: "seek", t }); }
  play() { return this.ask({ cmd: "play" }); }
  pause() { return this.ask({ cmd: "pause" }); }
  time() { return this.ask({ cmd: "time" }, 3000) as Promise<{ t: number; playing: boolean }>; }
  async frame(t: number, w: number, h: number, transparente = false): Promise<ImageBitmap> { return (await this.ask({ cmd: "frame", t, w, h, transparente })).bmp; }
  destroy() { window.removeEventListener("message", this.onMsg); }
}

/** exporta a composição em MP4 (H.264) ou WebM VP9 com transparência, quadro a quadro, no navegador */
export async function exportarHtml(html: string, valores: Record<string, any>, o: { tipo?: "mp4" | "webm"; fps?: number; onProgress?: (f: number) => void; signal?: { cancel: boolean } } = {}) {
  const tipo = o.tipo || "mp4";
  const fps = o.fps || 30;
  const iframe = document.createElement("iframe");
  const { w: W0, h: H0 } = infoComposicao(html);
  // o iframe fica visível, pequeno, no canto: o Chrome congela iframes fora da tela e a foto do quadro não sai
  const sc = 150 / W0;
  Object.assign(iframe.style, { position: "fixed", right: "16px", bottom: "16px", width: W0 + "px", height: H0 + "px", border: "0", transform: `scale(${sc})`, transformOrigin: "100% 100%", zIndex: "9999", pointerEvents: "none", borderRadius: `${12 / sc}px`, boxShadow: "0 10px 40px rgba(0,0,0,.4)" });
  document.body.appendChild(iframe);
  const f = new MotionFrame(iframe);
  try {
    await f.load(montarDoc(html, valores));
    const info = await f.info();
    const W = info.w || W0, H = info.h || H0, total = info.duracao || infoComposicao(html).duracao;
    const codec = tipo === "webm" ? "vp9" : "avc";
    if (!(await canEncodeVideo(codec, { width: W, height: H }))) throw new Error("Este navegador não exporta esse formato. Use o Chrome ou o Edge no computador.");
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext("2d")!;
    const output = new Output({ format: tipo === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    const src = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH, keyFrameInterval: 2, ...(tipo === "webm" ? { alpha: "keep" as const } : {}) });
    output.addVideoTrack(src, { frameRate: fps });
    await output.start();
    const n = Math.max(1, Math.round(total * fps));
    for (let i = 0; i < n; i++) {
      if (o.signal?.cancel) { await output.cancel(); throw new Error("Exportação cancelada."); }
      const bmp = await f.frame(i / fps, W, H, tipo === "webm");
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bmp, 0, 0, W, H);
      bmp.close();
      await src.add(i / fps, 1 / fps);
      o.onProgress?.(i / n);
    }
    src.close();
    await output.finalize();
    o.onProgress?.(1);
    return new Blob([output.target.buffer!], { type: tipo === "webm" ? "video/webm" : "video/mp4" });
  } finally {
    f.destroy();
    iframe.remove();
  }
}

/** Prompt de produção: o Claude escreve a composição HyperFrames a partir do brief aprovado. */
/** quando o brief pede estilos do catálogo, explica cada um para a peça seguir o mesmo movimento */
function estilosDoBrief(b: Brief) {
  const nomes = Array.from(new Set(b.cenas.map((c) => c.estilo).filter(Boolean))) as string[];
  const usados = ESTILOS_TEXTO.filter((e) => nomes.some((n) => n.toLowerCase() === e.nome.toLowerCase()));
  if (!usados.length) return "";
  return `\nEstilos de texto do catálogo do HUB que o brief pede (siga o mesmo movimento, nas cores do brief):\n${usados.map((e) => `- ${e.nome}: ${e.desc}`).join("\n")}\n`;
}

export function promptProduzirHtml(o: { brief: Brief; contexto?: string; ajuste?: string; htmlAnterior?: string }) {
  const b = o.brief;
  return `${o.contexto || ""}
Você é motion designer sênior. Escreva a composição HyperFrames (HTML + CSS + GSAP) que realiza exatamente este brief aprovado:

${briefEmTexto(b)}
${estilosDoBrief(b)}${o.htmlAnterior ? `\nVersão anterior da composição (mude só o que o ajuste pede e mantenha o resto):\n${o.htmlAnterior.slice(0, 60000)}\n` : ""}${o.ajuste ? `\nAjuste pedido: """${o.ajuste.slice(0, 1500)}"""\n` : ""}
Contrato técnico (sem isso a peça não roda nem exporta):
- Um arquivo HTML completo. <html lang="pt-BR" data-composition-variables='[...]'> declara as variáveis trocáveis (todo texto da tela e as cores principais): {"id","type":"string|color|select","label" em português,"default"} (select leva "options").
- No script, leia os valores com window.__hyperframes.getVariables() e aplique (textContent e variáveis CSS).
- Raiz: <div id="root" data-composition-id="main" data-start="0" data-duration="${b.formato.duracao}" data-width="${b.formato.largura}" data-height="${b.formato.altura}">. html, body e #root com ${b.formato.largura}x${b.formato.altura} px e overflow hidden.
- Cada bloco que aparece num trecho é um filho com class="clip", data-start e data-duration (em segundos). Fundo ${b.formato.fundo === "transparente" ? "transparente: não pinte html, body nem #root" : "pintado no #root"}.
- Fontes só do Google Fonts por <link href="https://fonts.googleapis.com/css2?...&display=swap" rel="stylesheet">. Não carregue outros scripts: o HUB injeta o GSAP 3.15.
- const tl = gsap.timeline({ paused: true }); ...; window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl; tl.seek(0);
- Use só set, to, from e fromTo com posição absoluta (3º argumento). Anime x, y, xPercent, yPercent, scale, rotation, opacity e clipPath. Não anime letterSpacing, width, height nem fontSize (travam no export): para espalhar letras, separe em <span> e anime x de cada uma.
- Se o CSS já tem transform num elemento, anime com fromTo partindo do mesmo valor.
- Nada de Math.random, Date.now, fetch, imagens de fora ou vídeos. Grão e texturas com SVG inline (feTurbulence) ou CSS.
- Se o elemento repete (pontos, letras, itens), gere com um laço no script.

Direção (o que separa motion de marca de motion de IA):
- Curvas: entrada com expo.out ou power3.out, saída com power2.in ou expo.inOut; escada de 0,08 a 0,15 s; nada linear, exceto o empurrão lento de câmera no fundo.
- Sempre algo vivo: um empurrão de 2 a 5% no quadro inteiro durante a peça.
- Hierarquia: uma coisa em foco por vez; título grande (120 px ou mais), rótulos de 30 px ou mais.
- Respeite a zona segura e o "nunca" do brief.

Responda SOMENTE com o HTML completo, sem explicação.`;
}
