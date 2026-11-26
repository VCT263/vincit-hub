/** Teleprompter: transforma o roteiro (markdown do Quadro de produção) em blocos de palavras para ler e seguir pela voz */

export type Tok = { t: string; cue?: boolean; i?: number }; // i = índice da palavra falada
export type Block = { toks: Tok[]; label?: string };

/** normaliza para comparar com o que o reconhecimento de voz devolve */
export const norm = (w: string) => w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export function parseScript(md: string): { blocks: Block[]; words: string[] } {
  const words: string[] = [];
  const blocks: Block[] = [];
  const lines = (md || "").replace(/\r/g, "").split("\n");
  for (let raw of lines) {
    raw = raw.trim();
    if (!raw) continue;
    raw = raw.replace(/^#{1,6}\s*/, "").replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
    let label: string | undefined;
    // "**Gancho:** texto" ou "Gancho: texto" curto no começo vira etiqueta do bloco
    const m = raw.match(/^\*\*([^*]{1,40}?):?\*\*:?\s*(.*)$/) || raw.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú ]{1,24}):\s+(.*)$/);
    if (m) { label = m[1].replace(/:$/, "").trim(); raw = m[2]; }
    raw = raw.replace(/\*\*|__|`/g, "").replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$|[.,!?;:])/g, "$1$2");
    const toks: Tok[] = [];
    // [marcações] e (indicações) entre colchetes viram dicas, não falas
    const parts = raw.split(/(\[[^\]]*\])/);
    for (const p of parts) {
      if (!p) continue;
      if (p.startsWith("[")) { toks.push({ t: p, cue: true }); continue; }
      for (const w of p.split(/\s+/)) {
        if (!w) continue;
        const n = norm(w);
        if (n) { toks.push({ t: w, i: words.length }); words.push(n); } else toks.push({ t: w });
      }
    }
    if (toks.length || label) blocks.push({ toks, label });
  }
  return { blocks, words };
}

/** tempo estimado de leitura (150 palavras por minuto) */
export const estimate = (n: number) => { const s = Math.round((n / 150) * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/**
 * Acha em que palavra do roteiro a pessoa está, a partir das últimas palavras reconhecidas.
 * Procura perto da posição atual para não pular para uma frase repetida lá na frente.
 */
export function matchVoice(words: string[], heard: string[], cur: number): number | null {
  const tail = heard.map(norm).filter(Boolean).slice(-5);
  if (!tail.length) return null;
  let best = -1, bestScore = 0;
  const from = Math.max(0, cur - 4), to = Math.min(words.length - 1, cur + 40);
  for (let j = from; j <= to; j++) {
    let score = 0;
    for (let k = 0; k < tail.length; k++) {
      const w = words[j - k], h = tail[tail.length - 1 - k];
      if (w == null) break;
      if (w === h) score += 1;
      else if (w.length > 3 && h.length > 3 && (w.startsWith(h.slice(0, 4)) || h.startsWith(w.slice(0, 4)))) score += 0.6;
    }
    const near = 1 - (Math.abs(j - cur) / 60); // desempata a favor do mais próximo
    if (score + near * 0.3 > bestScore) { bestScore = score + near * 0.3; best = j; }
  }
  const need = tail.length >= 3 ? 1.8 : tail.length === 2 ? 1.6 : 1.1;
  if (best < 0 || bestScore < need) return null;
  return best + 1;
}

export type PrompterPrefs = { speed: number; font: number; mirror: boolean; countdown: boolean; hideCues: boolean; voice: boolean; align: "center" | "left" };
export const DEFAULT_PREFS: PrompterPrefs = { speed: 4, font: 0, mirror: false, countdown: true, hideCues: false, voice: false, align: "center" };
export function loadPrefs(): PrompterPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("av-prompter") || "{}") }; } catch { return DEFAULT_PREFS; }
}
export function savePrefs(p: PrompterPrefs) { try { localStorage.setItem("av-prompter", JSON.stringify(p)); } catch {} }

/** canal de tempo real do controle remoto (mesma conta no celular e no notebook) */
export const remoteChannel = (uid: string) => `prompter-${uid}`;
