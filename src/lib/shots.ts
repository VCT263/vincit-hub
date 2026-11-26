/** Decupagem: planos sugeridos a partir do roteiro, sem IA (a IA é opcional e refina) */
import { parseScript } from "@/lib/prompter";

export const FRAMINGS = ["Plano geral", "Plano aberto", "Médio · olho", "Médio fechado", "Close", "Detalhe", "Macro", "Top shot", "Plongée", "Contra-plongée", "Over the shoulder", "POV", "Drone"];
export type Shot = { description: string; framing?: string | null; audio?: string | null; notes?: string | null };

/**
 * Cada bloco falado vira um plano de fala para a câmera e cada [indicação] entre colchetes vira uma inserção.
 * É o ponto de partida: você ajusta depois.
 */
export function shotsFromScript(md: string): Shot[] {
  const { blocks } = parseScript(md || "");
  const out: Shot[] = [];
  for (const b of blocks) {
    const words = b.toks.filter((t) => !t.cue).map((t) => t.t);
    if (words.length) {
      const fala = words.slice(0, 10).join(" ") + (words.length > 10 ? "…" : "");
      out.push({ description: `${b.label ? b.label + ": " : ""}fala para a câmera · "${fala}"`, framing: "Médio · olho", audio: "Voz (lapela)" });
    }
    for (const c of b.toks.filter((t) => t.cue)) {
      const t = c.t.replace(/^\[|\]$/g, "").trim();
      if (!t) continue;
      const det = /close|detalhe|m[aã]o|produto|textura/i.test(t);
      out.push({ description: `Inserção: ${t}`, framing: det ? "Detalhe" : "Plano aberto", audio: "Som ambiente" });
    }
  }
  return out;
}
