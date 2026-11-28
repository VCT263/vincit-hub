/**
 * Som do Motion: escolhe os efeitos do estilo de som (public/sons) para cada cena e mistura numa trilha.
 * O pico de cada som (sons.json, gerado por scripts/gerar-sons.py) cai em cima do movimento.
 */
import { ehEstiloSom, type EstiloSom } from "@/lib/editor/som";
import { motionDuration, type MotionSpec } from "./engine";
import PICOS from "./sons.json";

export type PapelSom = "abertura" | "entrada" | "itens" | "destaque" | "transicao" | "marca";
const GANHO: Record<PapelSom, number> = { abertura: 0.7, entrada: 0.8, itens: 0.45, destaque: 0.85, transicao: 0.75, marca: 0.9 };
const GANHO_ESTILO: Partial<Record<EstiloSom, number>> = { minimal: 0.6, delicado: 0.8 };
const SELF = new Set(["lower_third", "transicao", "encerramento"]);

/** Os momentos de som de um motion: [segundo, papel]. */
export function eventosSom(s: MotionSpec): [number, PapelSom][] {
  const k = s.ritmo === "calmo" ? 1.35 : s.ritmo === "rapido" ? 0.72 : 1;
  const ev: [number, PapelSom][] = [];
  let t0 = 0;
  s.cenas.forEach((c, i) => {
    const em = (dt: number, p: PapelSom) => { if (dt >= 0 && dt < c.dur) ev.push([t0 + dt, p]); };
    switch (c.tipo) {
      case "vinheta": em(0.1, "abertura"); em(c.dur * 0.55, "marca"); break;
      case "titulo": case "citacao": case "editorial": em(0.15, "entrada"); break;
      case "palavras": {
        const n = (c.texto || "").split(/\s+/).filter(Boolean).length;
        for (let w = 0; w < Math.min(n, 10); w++) em(w * (c.dur / Math.max(1, n)) + 0.05, w === 0 ? "entrada" : "itens");
        break;
      }
      case "numero": em(0.1, "entrada"); em(1.4 * k, "destaque"); break;
      case "lista": em(0.15, "entrada"); (c.itens || []).filter(Boolean).forEach((_, j) => em(0.45 * k + j * 0.38 * k + 0.3 * k, "itens")); break;
      case "grafico": em(0.15, "entrada"); (c.itens || []).forEach((_, j) => em(0.4 * k + j * 0.15 * k, "itens")); break;
      case "lower_third": em(0.2, "entrada"); break;
      case "cta": em(0.25, "destaque"); break;
      case "encerramento": em(0.3, "marca"); break;
      case "transicao": em(c.dur * 0.45, "transicao"); break;
    }
    t0 += c.dur;
    const prox = s.cenas[i + 1];
    if (prox && s.transicao !== "corte" && !SELF.has(c.tipo) && !SELF.has(prox.tipo)) ev.push([t0 - 0.05, "transicao"]);
  });
  return ev.sort((a, b) => a[0] - b[0]);
}

/** Mistura a trilha de efeitos do motion. Devolve null sem estilo de som ou sem Web Audio. */
export async function trilhaSom(s: MotionSpec, sampleRate = 48000): Promise<AudioBuffer | null> {
  const estilo = s.som;
  if (!ehEstiloSom(estilo) || typeof OfflineAudioContext === "undefined") return null;
  const total = motionDuration(s);
  if (!total) return null;
  const ev = eventosSom(s);
  if (!ev.length) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * sampleRate), sampleRate);
  const papeis = Array.from(new Set(ev.map((e) => e[1])));
  const buf: Partial<Record<PapelSom, AudioBuffer>> = {};
  await Promise.all(papeis.map(async (p) => {
    const r = await fetch(`/sons/${estilo}/${p}.mp3`);
    if (r.ok) buf[p] = await ctx.decodeAudioData(await r.arrayBuffer());
  }));
  const picos = (PICOS as Record<string, Record<string, number>>)[estilo] || {};
  const master = ctx.createGain(); master.gain.value = GANHO_ESTILO[estilo] ?? 1; master.connect(ctx.destination);
  let ultimo = -1;
  for (const [t, p] of ev) {
    const b = buf[p];
    if (!b) continue;
    if (p !== "itens" && t - ultimo < 0.12) continue; // dois sons grandes colados viram ruído
    if (p !== "itens") ultimo = t;
    const ini = t - (picos[p] || 0);
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain(); g.gain.value = GANHO[p];
    src.connect(g).connect(master);
    src.start(Math.max(0, ini), Math.max(0, -ini));
  }
  return ctx.startRendering();
}
