/**
 * Exporta um motion no navegador (WebCodecs via Mediabunny, igual ao Editor).
 * MP4 H.264 para postar ou levar a qualquer editor; WebM VP9 com transparência para usar por cima do vídeo.
 */
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from "mediabunny";
import { MOTION_SIZES, drawMotion, motionDuration, preloadMotion, type MotionFormat, type MotionSpec } from "./engine";

const FPS = 30;

export async function exportMotion(spec: MotionSpec, o: { tipo?: "mp4" | "webm"; formato?: MotionFormat; onProgress?: (f: number) => void; signal?: { cancel: boolean } } = {}) {
  const tipo = o.tipo || "mp4";
  const [W, H] = MOTION_SIZES[o.formato || spec.formato];
  const total = motionDuration(spec);
  if (!total) throw new Error("O motion não tem cenas.");
  const codec = tipo === "webm" ? "vp9" : "avc";
  if (!(await canEncodeVideo(codec, { width: W, height: H }))) throw new Error(tipo === "webm" ? "Este navegador não exporta WebM transparente. Use o Chrome ou o Edge no computador." : "Este navegador não exporta H.264. Use o Chrome ou o Edge no computador.");
  await preloadMotion(spec);
  if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;
  const output = new Output({ format: tipo === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const src = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH, keyFrameInterval: 2, ...(tipo === "webm" ? { alpha: "keep" as const } : {}) });
  output.addVideoTrack(src, { frameRate: FPS });
  await output.start();
  const n = Math.ceil(total * FPS);
  for (let i = 0; i < n; i++) {
    if (o.signal?.cancel) { await output.cancel(); throw new Error("Exportação cancelada."); }
    ctx.clearRect(0, 0, W, H);
    drawMotion(ctx, spec, i / FPS, W, H, { transparente: tipo === "webm" });
    await src.add(i / FPS, 1 / FPS);
    if (i % 10 === 0) o.onProgress?.(i / n);
  }
  src.close();
  await output.finalize();
  o.onProgress?.(1);
  return new Blob([output.target.buffer!], { type: tipo === "webm" ? "video/webm" : "video/mp4" });
}
