/** Mix de conteúdo para marca de moda (pesquisa de 27/11/2026) e as métricas que o Instagram mais pesa hoje. */

export type TipoModa = "fundadora" | "estilo" | "educativo" | "editorial";

export const TIPOS_MODA: Record<TipoModa, { label: string; dica: string; cor: string; alvo: number }> = {
  fundadora: { label: "Fundadora", dica: "História da marca e a inspiração de cada peça. Pelo menos 1 por semana.", cor: "#f5c84c", alvo: 0.25 },
  estilo: { label: "Estilo de vida", dica: "Arrume-se comigo, look do dia, a peça nos lugares onde a cliente vive.", cor: "#c084fc", alvo: 0.35 },
  educativo: { label: "Educativo", dica: "Tecido, forro, caimento, tabela de tamanhos, a peça em corpos diferentes, jeitos de usar.", cor: "#6eefb6", alvo: 0.35 },
  editorial: { label: "Editorial", dica: "Campanha aspiracional que posiciona a marca como premium. Só com verba.", cor: "#7aa7ff", alvo: 0.05 },
};
export const TIPO_KEYS = Object.keys(TIPOS_MODA) as TipoModa[];

/** conta os tipos de uma lista de peças e diz o que está faltando */
export function mixDe<T extends { tipo?: string; fora_do_padrao?: boolean }>(xs: T[]) {
  const n = xs.length;
  const conta = Object.fromEntries(TIPO_KEYS.map((k) => [k, xs.filter((x) => x.tipo === k).length])) as Record<TipoModa, number>;
  const semTipo = xs.filter((x) => !x.tipo || !(x.tipo in TIPOS_MODA)).length;
  const fora = xs.filter((x) => x.fora_do_padrao).length;
  const faltando = n >= 4 ? TIPO_KEYS.filter((k) => k !== "editorial" && conta[k] === 0) : [];
  return { n, conta, semTipo, fora, faltando };
}

/** taxas por alcance, que é como o algoritmo lê o conteúdo */
export function taxas(p: { reach?: number | null; saved?: number | null; shares?: number | null }) {
  const r = Number(p.reach) || 0;
  if (!r) return { compart: null as number | null, salvos: null as number | null, sinal: null as number | null };
  const compart = (Number(p.shares) || 0) / r, salvos = (Number(p.saved) || 0) / r;
  return { compart, salvos, sinal: compart + salvos };
}

export const pct = (v: number | null | undefined, casas = 1) => (v == null ? "–" : `${(v * 100).toFixed(casas)}%`);
