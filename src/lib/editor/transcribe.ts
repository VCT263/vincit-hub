/**
 * Legenda automática grátis: Whisper rodando no navegador (transformers.js), com tempo por palavra.
 * O modelo (~80 MB) baixa uma vez e fica no cache do navegador. Usa a placa de vídeo (WebGPU) quando há.
 */
import { ALL_FORMATS, AudioBufferSink, BlobSource, Input } from "mediabunny";
import type { Word } from "./model";

const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";
const MODEL = "onnx-community/whisper-base_timestamped";

const WORKER = `
let asr = null;
async function load(post) {
  if (asr) return asr;
  const { pipeline } = await import("${TRANSFORMERS}");
  const progress_callback = (p) => { if (p.status === "progress" && p.total) post({ type: "progress", f: p.loaded / p.total, msg: "Baixando o modelo de legenda (só na primeira vez)…" }); };
  let device = "wasm";
  try { if (self.navigator.gpu && await self.navigator.gpu.requestAdapter()) device = "webgpu"; } catch (e) {}
  asr = await pipeline("automatic-speech-recognition", "${MODEL}", { device, dtype: device === "webgpu" ? "fp32" : "q8", progress_callback });
  return asr;
}
self.onmessage = async (ev) => {
  const post = (m) => self.postMessage(m);
  try {
    const p = await load(post);
    post({ type: "progress", f: 1, msg: "Transcrevendo…" });
    let out;
    try {
      out = await p(ev.data.audio, { language: "portuguese", task: "transcribe", return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
    } catch (e) {
      out = await p(ev.data.audio, { language: "portuguese", task: "transcribe", return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
    }
    post({ type: "done", chunks: out.chunks || [], text: out.text || "" });
  } catch (e) { post({ type: "error", msg: String(e && e.message || e) }); }
};`;

let worker: Worker | null = null;
function getWorker() {
  if (!worker) worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" })), { type: "module" });
  return worker;
}

/** áudio do arquivo em 16 kHz mono, que é o que o Whisper espera */
async function audio16k(file: File): Promise<Float32Array> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const at = await input.getPrimaryAudioTrack();
  if (!at) throw new Error("Este arquivo não tem áudio.");
  const dur = await input.computeDuration();
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dur * 16000)), 16000);
  for await (const b of new AudioBufferSink(at).buffers()) {
    const s = off.createBufferSource();
    s.buffer = b.buffer;
    s.connect(off.destination);
    s.start(b.timestamp);
  }
  const r = await off.startRendering();
  return r.getChannelData(0);
}

/** separa trechos (quando o modelo só devolve frases) em palavras com tempo proporcional */
function toWords(chunks: { text: string; timestamp: [number, number | null] }[]): Word[] {
  const out: Word[] = [];
  for (const c of chunks) {
    const s = c.timestamp?.[0] ?? 0;
    const e = c.timestamp?.[1] ?? s + 0.4;
    const parts = c.text.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) { if (parts[0]) out.push({ s, e, t: parts[0] }); continue; }
    const total = parts.reduce((a, p) => a + p.length, 0);
    let t = s;
    for (const p of parts) { const d = ((e - s) * p.length) / total; out.push({ s: t, e: t + d, t: p }); t += d; }
  }
  return out;
}

export async function transcribe(file: File, onProgress: (f: number, msg: string) => void): Promise<Word[]> {
  onProgress(0, "Lendo o áudio…");
  const audio = await audio16k(file);
  const w = getWorker();
  return new Promise((resolve, reject) => {
    w.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === "progress") onProgress(m.f, m.msg);
      else if (m.type === "done") resolve(toWords(m.chunks));
      else if (m.type === "error") reject(new Error(m.msg));
    };
    w.postMessage({ audio }, [audio.buffer]);
  });
}
