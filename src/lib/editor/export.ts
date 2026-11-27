/**
 * Exporta o projeto em MP4 (1080×1920 vertical ou 1920×1080 horizontal) no próprio navegador (WebCodecs via Mediabunny).
 * Vídeo: decodifica só os trechos usados, desenha com as legendas e títulos e codifica em H.264.
 * Áudio: junta os trechos numa OfflineAudioContext e codifica em AAC (ou Opus se o navegador não tiver AAC).
 */
import {
  ALL_FORMATS, AudioBufferSink, AudioBufferSource, BlobSource, BufferTarget, CanvasSink, CanvasSource, Input, Mp4OutputFormat, Output,
  QUALITY_HIGH, canEncodeAudio, canEncodeVideo,
} from "mediabunny";
import * as M from "./model";
import { activeOverlays, drawInsert, setFormat, cameraLevel, captionScreens, drawCover, speechCamera, drawOverlays, layout, outputWords, segLen, totalDuration, zoomAt, type Kit, type Media, type Project } from "./model";

const RATE = 48000;

export async function exportMp4(p: Project, media: Media[], kit: Kit, onProgress: (f: number, msg: string) => void, signal?: { cancel: boolean }) {
  setFormat(p.format);
  const W = M.W, H = M.H;
  const total = totalDuration(p);
  if (!total) throw new Error("A timeline está vazia.");
  if (!(await canEncodeVideo("avc", { width: W, height: H }))) throw new Error("Este navegador não exporta H.264. Use o Chrome ou o Edge no computador.");
  const audioCodec = (await canEncodeAudio("aac")) ? "aac" : "opus";

  const byId = new Map(media.map((m) => [m.id, m]));
  const words = outputWords(p, media);
  const screens = captionScreens(words, kit.legenda?.palavras_por_tela || 3);
  const cam = speechCamera(words, cameraLevel(p, kit));

  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: 30 });
  const audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: 160000 });
  output.addAudioTrack(audioSource);
  await output.start();

  // ---- áudio primeiro (é rápido) ----
  onProgress(0, "Juntando o áudio…");
  const off = new OfflineAudioContext(2, Math.ceil(total * RATE) + RATE, RATE);
  for (const l of layout(p)) {
    const m = byId.get(l.seg.mediaId);
    if (!m) continue;
    const input = new Input({ source: new BlobSource(m.file), formats: ALL_FORMATS });
    const at = await input.getPrimaryAudioTrack();
    if (!at || !(await at.canDecode())) continue;
    const sink = new AudioBufferSink(at);
    for await (const b of sink.buffers(l.seg.in, l.seg.out)) {
      const src = off.createBufferSource();
      src.buffer = b.buffer;
      src.connect(off.destination);
      const offset = Math.max(0, l.seg.in - b.timestamp);
      const when = l.start + Math.max(0, b.timestamp - l.seg.in);
      const dur = Math.min(b.duration - offset, l.end - when);
      if (dur > 0) src.start(when, offset, dur);
    }
  }
  const mixed = await off.startRendering();
  const trimmed = new AudioBuffer({ length: Math.ceil(total * RATE), numberOfChannels: 2, sampleRate: RATE });
  for (let c = 0; c < 2; c++) trimmed.copyToChannel(mixed.getChannelData(c).subarray(0, trimmed.length), c);
  await audioSource.add(trimmed);
  audioSource.close();

  // ---- B-roll por cima: cada inserção tem o seu leitor, que anda junto com a saída ----
  const inserts = insertReader(p, byId);

  // ---- vídeo, trecho por trecho ----
  const FPS = 30;
  let frame = 0;
  const totalFrames = Math.ceil(total * FPS);
  for (const l of layout(p)) {
    const m = byId.get(l.seg.mediaId);
    if (!m) continue;
    const input = new Input({ source: new BlobSource(m.file), formats: ALL_FORMATS });
    const vt = await input.getPrimaryVideoTrack();
    if (!vt) continue;
    const sw = vt.displayWidth, sh = vt.displayHeight;
    const scale = W > H && sw / sh < 1 ? H / sh : Math.max(W / sw, H / sh);
    const sink = new CanvasSink(vt, { width: Math.round(sw * scale), height: Math.round(sh * scale), fit: "fill" });
    const frames = Math.round(segLen(l.seg) * FPS);
    const times = Array.from({ length: frames }, (_, i) => l.seg.in + i / FPS);
    let i = 0;
    for await (const wc of sink.canvasesAtTimestamps(times)) {
      if (signal?.cancel) { await output.cancel(); throw new Error("Exportação cancelada."); }
      const t = l.start + i / FPS;
      if (wc) drawCover(ctx, wc.canvas, wc.canvas.width, wc.canvas.height, zoomAt(p, t, cam));
      for (const ov of activeOverlays(p, t)) {
        const fr = await inserts.frame(ov, t);
        if (fr) drawInsert(ctx, ov, fr, fr.width, fr.height, t);
      }
      drawOverlays(ctx, p, screens, t, kit);
      await videoSource.add(frame / FPS, 1 / FPS);
      frame++; i++;
      if (frame % 15 === 0) onProgress(frame / totalFrames, `Gerando o vídeo… ${Math.round((frame / totalFrames) * 100)}%`);
    }
  }
  inserts.close();
  videoSource.close();
  await output.finalize();
  onProgress(1, "Pronto");
  return new Blob([output.target.buffer!], { type: "video/mp4" });
}

/** lê os quadros dos B-rolls na ordem em que a saída pede (imagem fica parada; vídeo anda) */
function insertReader(p: Project, byId: Map<string, Media>) {
  type R = { it?: AsyncIterator<any>; img?: ImageBitmap; last?: OffscreenCanvas | HTMLCanvasElement | ImageBitmap; lastT: number; failed?: boolean };
  const readers = new Map<string, R>();
  const FPS = 30;
  async function open(ov: NonNullable<Project["overlays"]>[number]): Promise<R> {
    const m = byId.get(ov.mediaId);
    const r: R = { lastT: -1 };
    if (!m) { r.failed = true; return r; }
    if (m.file.type.startsWith("image/")) { r.img = await createImageBitmap(m.file); return r; }
    const input = new Input({ source: new BlobSource(m.file), formats: ALL_FORMATS });
    const vt = await input.getPrimaryVideoTrack();
    if (!vt) { r.failed = true; return r; }
    const sw = vt.displayWidth, sh = vt.displayHeight;
    const sc = Math.min(1, 1920 / Math.max(sw, sh));
    const sink = new CanvasSink(vt, { width: Math.round(sw * sc), height: Math.round(sh * sc), fit: "fill" });
    const n = Math.max(1, Math.round((ov.end - ov.start) * FPS));
    const times = Array.from({ length: n }, (_, i) => Math.min(m.duration - 0.05, ov.in + i / FPS));
    r.it = sink.canvasesAtTimestamps(times)[Symbol.asyncIterator]();
    return r;
  }
  return {
    async frame(ov: NonNullable<Project["overlays"]>[number], t: number) {
      let r = readers.get(ov.id);
      if (!r) { r = await open(ov); readers.set(ov.id, r); }
      if (r.failed) return null;
      if (r.img) return r.img;
      // avança até o quadro deste instante
      const want = Math.round((t - ov.start) * FPS);
      while (r.lastT < want && r.it) {
        const n = await r.it.next();
        if (n.done) { r.it = undefined; break; }
        r.lastT++;
        if (n.value) r.last = n.value.canvas;
      }
      return (r.last as any) || null;
    },
    close() { readers.forEach((r) => { r.it?.return?.(); r.img?.close(); }); },
  };
}
