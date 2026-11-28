/**
 * Estilo de som da marca: guia os efeitos sonoros que o Claude escolhe para o Motion e a edição.
 * Os ids são do catálogo do Earshot (github.com/Leonxlnx/earshot, MIT), que gera o som em código
 * no Mac, sem API paga: `earshot make "sound=<id>" -o arquivo.wav`.
 * Cada papel é um momento da peça; o som entra com o pico em cima do movimento.
 */
export type EstiloSom = "delicado" | "cinematico" | "agressivo";

export const ESTILOS_SOM: Record<EstiloSom, { nome: string; quando: string; sons: Record<string, string> }> = {
  delicado: {
    nome: "Delicado",
    quando: "moda, beleza, marca afetiva: sons leves de vidro, brilho e sopro, volume baixo",
    sons: { abertura: "shine/sweep", entrada: "whoosh/soft", itens: "tick/glass", destaque: "sparkle/burst", transicao: "whoosh/soft", marca: "coin/bright" },
  },
  cinematico: {
    nome: "Cinemático",
    quando: "lançamento, campanha, editorial: subida que termina no título, impacto grave e braam na marca",
    sons: { abertura: "rise/reverse", entrada: "boom/deep", itens: "tick/metal", destaque: "boom/short", transicao: "reverse_swell/cymbal", marca: "braam/hit" },
  },
  agressivo: {
    nome: "Agressivo",
    quando: "promoção, oferta, ritmo de viral: glitch, pancada seca e grave caindo",
    sons: { abertura: "glitch/burst", entrada: "hit/drop", itens: "glitch/short", destaque: "hit/crit", transicao: "whoosh/heavy", marca: "sub_drop/pro + hit/crit" },
  },
};

/** Texto para o pedido ao Claude: o estilo do kit e os sons de cada momento. */
export function guiaSom(estilo?: string): string {
  const e = ESTILOS_SOM[(estilo as EstiloSom)] || null;
  if (!e) return "";
  const sons = Object.entries(e.sons).map(([papel, id]) => `${papel}: ${id}`).join("; ");
  return `Estilo de som da marca: ${e.nome} (${e.quando}). Sons do Earshot por momento: ${sons}. Pico do som em cima do movimento, um som por ação visível, mix final no LUFS do kit.`;
}
