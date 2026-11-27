/** Decupagem: planos sugeridos a partir do roteiro, sem IA (a IA é opcional e refina) */
import { rowsFromScript } from "@/lib/roteiro";

export const FRAMINGS = ["Plano geral", "Plano aberto", "Médio · olho", "Médio fechado", "Close", "Detalhe", "Macro", "Top shot", "Plongée", "Contra-plongée", "Over the shoulder", "POV", "Drone"];
export type Shot = {
  description: string; framing?: string | null; audio?: string | null; notes?: string | null;
  part?: string | null; line?: string | null; movement?: string | null; broll?: string | null;
};

/**
 * Cada fala do roteiro vira um plano com a direção técnica ao lado (a mesma lista da folha do roteiro técnico).
 * Quando o roteiro é uma tabela (Tempo · Cena · Fala · Texto na tela), cada linha da tabela vira um plano.
 * É o ponto de partida: você ajusta depois.
 */
export function shotsFromScript(md: string): Shot[] {
  return rowsFromScript(md);
}
