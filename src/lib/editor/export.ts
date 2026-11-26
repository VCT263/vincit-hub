/**
 * Exporta o projeto em MP4 1080×1920 no próprio navegador (WebCodecs via Mediabunny).
 * Vídeo: decodifica só os trechos usados, desenha com as legendas e títulos e codifica em H.264.
 * Áudio: junta os trechos numa OfflineAudioContext e codifica em AAC (ou Opus se o navegador não tiver AAC).
 */
import {
  ALL_FORMATS, AudioBufferSink, AudioBufferSource, BlobSource, BufferTarget, CanvasSink, CanvasSource, Input, Mp4OutputFormat, Output,
  QUALITY_HIGH, canEncodeAudio, canEncodeVideo,
} from "mediabunny";
import { H, W, captionScreens, drawCover, drawOverlays, layout, outputWords, segLen, totalDuration, zoomAt, type Kit, type Media, type Project } from "./model";

const RATE = 48000;

export async function exportMp4(p: Project, media: Media[], kit: Kit, onProgress: (f: number, msg: string) => void, signal?: { cancel: boolean }) {
  const total = totalDuration(p);
  if (!total) throw new Error("A timeline está vazia.");
  if (!(await canEncodeVideo("avc", { width: W, height: H }))) throw new Error("Este navegador não exporta H.264. Use o Chrome ou o Edge no computador.");
  const audioCodec = (await canEncodeAudio("aac")) ? "aac" : "opus";

  const byId = new Map(media.map((m) => [m.id, m]));
  const screens = captionScreens(outputWords(p, media), kit.legenda?.palavras_por_tela || 3);

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
    const scale = Math.max(W / sw, H / sh);
    const sink = new CanvasSink(vt, { width: Math.round(sw * scale), height: Math.round(sh * scale), fit: "fill" });
    const frames = Math.round(segLen(l.seg) * FPS);
    const times = Array.from({ length: frames }, (_, i) => l.seg.in + i / FPS);
    let i = 0;
    for await (const wc of sink.canvasesAtTimestamps(times)) {
      if (signal?.cancel) { await output.cancel(); throw new Error("Exportação cancelada."); }
      const t = l.start + i / FPS;
      if (wc) drawCover(ctx, wc.canvas, wc.canvas.width, wc.canvas.height, zoomAt(p, t));
      drawOverlays(ctx, p, screens, t, kit);
      await videoSource.add(frame / FPS, 1 / FPS);
      frame++; i++;
      if (frame % 15 === 0) onProgress(frame / totalFrames, `Gerando o vídeo… ${Math.round((frame / totalFrames) * 100)}%`);
    }
  }
  videoSource.close();
  await output.finalize();
  onProgress(1, "Pronto");
  return new Blob([output.target.buffer!], { type: "video/mp4" });
}
