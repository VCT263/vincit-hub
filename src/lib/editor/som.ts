/**
 * Estilos de som da marca: guiam os efeitos sonoros do Motion e da edição.
 * Os sons são do Earshot (github.com/Leonxlnx/earshot, MIT), gerados em código, sem API paga,
 * por scripts/gerar-sons.py; ficam em public/sons/<estilo>/<papel>.mp3 (+ previa.mp3).
 * Papéis: abertura, entrada, itens, destaque, transicao, marca.
 */
export type EstiloSom = "delicado" | "tatil" | "minimal" | "cinematico" | "agressivo";
export const ESTILO_SOM_IDS: EstiloSom[] = ["delicado", "tatil", "minimal", "cinematico", "agressivo"];

export const ESTILOS_SOM: Record<EstiloSom, { nome: string; quando: string; sons: Record<string, string> }> = {
  delicado: {
    nome: "Delicado",
    quando: "moda, beleza, marca afetiva: brilho, vidro e sininho, volume baixo",
    sons: { abertura: "shine/sweep", entrada: "whoosh/soft", itens: "tick/glass", destaque: "sparkle/burst", transicao: "whoosh/soft", marca: "coin/bright" },
  },
  tatil: {
    nome: "Tátil",
    quando: "moda e produto físico: sons reais de zíper, tecido, papel, tesoura e salto",
    sons: { abertura: "zipper/jacket", entrada: "cloth/rustle", itens: "paper/card", destaque: "scissors/snip", transicao: "swipe/hand", marca: "step/heels" },
  },
  minimal: {
    nome: "Minimal",
    quando: "educativo, serviço, tecnologia: cliques curtos e discretos que não disputam com a voz",
    sons: { abertura: "hover/tone", entrada: "click/trackpad", itens: "hover/tone", destaque: "success/click", transicao: "send/swoosh", marca: "next/step" },
  },
  cinematico: {
    nome: "Cinemático",
    quando: "lançamento, campanha, editorial: subida que chega no título, impacto grave e braam na marca",
    sons: { abertura: "rise/reverse", entrada: "boom/deep", itens: "tick/metal", destaque: "boom/short", transicao: "reverse_swell/cymbal", marca: "braam/hit" },
  },
  agressivo: {
    nome: "Agressivo",
    quando: "promoção, oferta, ritmo de viral: glitch, pancada seca e grave caindo",
    sons: { abertura: "glitch/burst", entrada: "hit/drop", itens: "glitch/short", destaque: "hit/crit", transicao: "whoosh/heavy", marca: "hit/crit + sub_drop/pro" },
  },
};

export const ehEstiloSom = (v: unknown): v is EstiloSom => typeof v === "string" && (ESTILO_SOM_IDS as string[]).includes(v);
export const previaSom = (e: EstiloSom) => `/sons/${e}/previa.mp3`;

/** Texto para o pedido ao Claude: o estilo do kit e os sons de cada momento. */
export function guiaSom(estilo?: string): string {
  if (!ehEstiloSom(estilo)) return "";
  const e = ESTILOS_SOM[estilo];
  const sons = Object.entries(e.sons).map(([papel, id]) => `${papel}: ${id}`).join("; ");
  return `Estilo de som da marca: ${e.nome} (${e.quando}). O Motion do HUB já exporta com esses sons (spec.som = "${estilo}"). Para editar fora do HUB, os mesmos sons do Earshot por momento: ${sons}. Pico do som em cima do movimento, um som por ação visível, mix final no LUFS do kit.`;
}
