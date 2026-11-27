/* ───────────── Base de conhecimento de marca ─────────────
   Estudo de 27/11/2026: cases do Behance (Trato Studio e Casagrande, do Bortoletto Studio;
   Your Sister's Clothes; EQUŌS), os dois decks de referência do Vinícius no Canva e os bancos
   de fontes (Google Fonts, Fontshare, Velvetyne, Collletttivo, uncut.wtf, DaFont).
   Usado pela etapa de Tipografia, pela Apresentação e pelos pedidos ao Claude. */

/** as vozes de um sistema tipográfico de estúdio: cada fonte tem um papel e um porquê */
export const VOICES = [
  { k: "estrutura", l: "Estrutura", d: "Grotesca para texto, interface, legendas e informação. Clareza e responsabilidade." },
  { k: "editorial", l: "Editorial", d: "Serifa ou condensada para títulos e frases-manifesto. Leitura e interpretação." },
  { k: "gesto", l: "Gesto", d: "Manuscrita ou assinatura, usada pouco: uma palavra, um selo, um detalhe. Realidade e movimento." },
] as const;

export type TypeSystem = {
  k: string; l: string; ideia: string;
  estrutura: string; editorial: string; editorialItalic?: boolean; edWeight?: number; gesto?: string;
  arquetipos: string[]; nichos: string[]; ref: string;
};

/** sistemas tipográficos curados, só com fontes gratuitas para uso comercial que o HUB carrega */
export const TYPE_SYSTEMS: TypeSystem[] = [
  { k: "assinatura", l: "Assinatura e estrutura", ideia: "Grotesca firme para informar, serifa itálica para interpretar, assinatura à mão para provar que tem gente por trás.",
    estrutura: "Hanken Grotesk", editorial: "Instrument Serif", editorialItalic: true, gesto: "Mr Dafoe", arquetipos: ["criador", "rebelde", "explorador", "heroi"], nichos: ["audiovisual", "servicos", "fitness"], ref: "Trato Studio (Bortoletto)" },
  { k: "quiet_luxury", l: "Luxo silencioso", ideia: "Didone grande e leve, sans fina e espaçada em caixa alta, assinatura caligráfica só no selo.",
    estrutura: "Inter Tight", editorial: "Bodoni Moda", edWeight: 400, gesto: "Monsieur La Doulaise", arquetipos: ["governante", "amante"], nichos: ["moda", "beleza", "imobiliario"], ref: "maisons de moda e joalheria" },
  { k: "editorial_quente", l: "Editorial quente", ideia: "Serifa suave e redonda com sans amigável. Parece revista, mas abraça.",
    estrutura: "Figtree", editorial: "Fraunces", edWeight: 400, gesto: "La Belle Aurore", arquetipos: ["cuidador", "inocente", "amante"], nichos: ["beleza", "saude", "alimentacao"], ref: "skincare e clínicas de estética autorais" },
  { k: "manifesto", l: "Manifesto", ideia: "Condensada pesada gritando, mono para os detalhes técnicos, rabisco por cima como pichação.",
    estrutura: "Space Mono", editorial: "Anton", gesto: "Reenie Beanie", arquetipos: ["rebelde", "heroi"], nichos: ["fitness", "moda", "audiovisual"], ref: "streetwear e marcas esportivas independentes" },
  { k: "atelie", l: "Ateliê", ideia: "Serifa gorda e simpática de letreiro, grotesca honesta, anotação à mão de quem faz.",
    estrutura: "Work Sans", editorial: "Young Serif", gesto: "Nothing You Could Do", arquetipos: ["criador", "cara_comum", "cuidador"], nichos: ["alimentacao", "varejo", "pet"], ref: "padarias, cafés e cerâmicas autorais" },
  { k: "arquitetura", l: "Arquitetura", ideia: "Grotesca neutra e grande, serifa itálica de livro para as ideias, mono para medidas e códigos.",
    estrutura: "Switzer", editorial: "Newsreader", editorialItalic: true, edWeight: 400, gesto: "", arquetipos: ["sabio", "governante"], nichos: ["imobiliario", "servicos", "tecnologia"], ref: "Casagrande (Bortoletto), escritórios de arquitetura" },
  { k: "pop", l: "Pop", ideia: "Display gordo e redondo, grotesca simples, letra de caderno. Divertida sem ser infantil.",
    estrutura: "Familjen Grotesk", editorial: "Dela Gothic One", gesto: "Caveat", arquetipos: ["bobo", "inocente", "cara_comum"], nichos: ["moda", "alimentacao", "pet", "varejo"], ref: "Your Sister's Clothes, marcas Y2K" },
  { k: "natureza", l: "Natureza honesta", ideia: "Condensada de placa de trilha, slab robusta, escrita rápida de diário de campo.",
    estrutura: "Zilla Slab", editorial: "Big Shoulders Display", gesto: "Marck Script", arquetipos: ["explorador", "cara_comum", "heroi"], nichos: ["fitness", "alimentacao", "pet"], ref: "outdoor, cervejarias e cafés de origem" },
  { k: "tech_humana", l: "Tecnologia humana", ideia: "Grotesca geométrica precisa, serifa de alto contraste para dar alma, mono para dados.",
    estrutura: "General Sans", editorial: "Gloock", gesto: "", arquetipos: ["mago", "sabio", "criador"], nichos: ["tecnologia", "educacao", "saude"], ref: "startups com marca editorial" },
  { k: "serena", l: "Clínica serena", ideia: "Sans calma e arredondada, serifa delicada nos títulos, nada gritando.",
    estrutura: "Satoshi", editorial: "Gambetta", edWeight: 400, gesto: "Sacramento", arquetipos: ["cuidador", "inocente", "sabio"], nichos: ["saude", "beleza", "educacao"], ref: "clínicas, terapias e bem-estar" },
  { k: "classico_vivo", l: "Clássico vivo", ideia: "Garamond elegante com grotesca contemporânea: tradição que não parece velha.",
    estrutura: "Schibsted Grotesk", editorial: "Cormorant Garamond", edWeight: 600, gesto: "Herr Von Muellerhoff", arquetipos: ["governante", "sabio", "amante"], nichos: ["servicos", "imobiliario", "moda"], ref: "advocacia, joalheria e vinícolas" },
  { k: "cultura", l: "Cultura", ideia: "Display autoral com personalidade forte, sans neutra para equilibrar, mono nos créditos.",
    estrutura: "Instrument Sans", editorial: "Clash Display", gesto: "Mrs Saint Delafield", arquetipos: ["criador", "mago", "rebelde"], nichos: ["audiovisual", "educacao", "tecnologia"], ref: "agências, festivais e produtoras" },
];

/** o que faz um trabalho parecer feito por IA, e o que os estúdios fazem no lugar */
export const ANTI_AI: [string, string][] = [
  ["Fonte digitada crua, do jeito que veio", "Logotipo desenhado: kerning a olho, letra alterada, ligadura, minúscula, empilhado ou em selo"],
  ["Tudo em negrito e no mesmo tamanho médio", "Contraste extremo de escala: palavra gigante (às vezes cortada na borda) e microtexto de 9 a 11 px"],
  ["Títulos grandes sempre pesados", "Peso leve ou regular em tamanho grande; o negrito fica para a condensada de impacto"],
  ["Tudo centralizado e simétrico em cartões arredondados", "Grade editorial assimétrica, filetes finos, informação nos cantos em 3 colunas"],
  ["Símbolo geométrico genérico (círculo, folha, onda)", "Símbolo que nasce da ideia, do nome ou de um gesto; forma orgânica quando o conceito pede"],
  ["Paleta 'harmoniosa' de gerador", "Poucas cores com tensão e nome próprio (Areia clara, Cobre fosco), com Pantone"],
  ["Superfícies lisas e perfeitas", "Textura e imperfeição: grão de papel, borrão de movimento, traço à mão"],
  ["Adjetivos genéricos (inovadora, de qualidade)", "Frases com voz própria em cada peça, até na etiqueta"],
  ["Mockup limpo sem contexto", "Fotografia com direção (luz, gente real, lugar) carregando metade da marca"],
  ["Mostrar só o resultado", "Mostrar o porquê: estratégia, território, construção e só então a forma"],
];

/** bancos de fontes e o que vale saber de licença */
export const FONT_SOURCES = [
  { l: "Google Fonts", url: "https://fonts.google.com", lic: "OFL: grátis para uso comercial, inclusive logo. Já está no Canva." },
  { l: "Fontshare (ITF)", url: "https://www.fontshare.com", lic: "Grátis para uso comercial pela licença ITF FFL. Baixe para usar no Canva e no Illustrator." },
  { l: "Velvetyne", url: "https://velvetyne.fr", lic: "Fontes livres (OFL) e experimentais, ótimas para logo autoral." },
  { l: "Collletttivo", url: "https://www.collletttivo.it", lic: "Coletivo italiano, fontes livres e contemporâneas (OFL)." },
  { l: "uncut.wtf", url: "https://uncut.wtf", lic: "Catálogo curado de fontes contemporâneas gratuitas; confira a licença de cada uma." },
  { l: "DaFont", url: "https://www.dafont.com", lic: "Cuidado: a maioria é só para uso pessoal. Para marca, use só as marcadas como 100% Free ou Public domain, e ainda assim prefira vetorizar e ajustar." },
];

/** regras que vão junto nos pedidos ao Claude */
export function knowledgeText() {
  return [
    "Critérios de estúdio (Behance) para não parecer feito por IA:",
    ...ANTI_AI.map(([a, b]) => `- Em vez de "${a}": ${b}.`),
    "Sistema tipográfico em 3 vozes: estrutura (grotesca: clareza), editorial (serifa ou condensada: interpretação) e gesto (manuscrita: movimento, usada pouco).",
  ].join("\n");
}

export function systemsFor(arqs: string[] = [], nicho?: string) {
  const score = (s: TypeSystem) => arqs.reduce((t, a, i) => t + (s.arquetipos.includes(a) ? 3 - i : 0), 0) + (nicho && s.nichos.includes(nicho) ? 2 : 0);
  return [...TYPE_SYSTEMS].map((s) => ({ s, n: score(s) })).sort((a, b) => b.n - a.n);
}
