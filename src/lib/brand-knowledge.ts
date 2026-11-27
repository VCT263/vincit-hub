/* ───────────── Base de conhecimento de marca ─────────────
   Estudo de 27/11/2026: cases do Behance (Trato Studio e Casagrande, do Bortoletto Studio;
   Your Sister's Clothes; EQUŌS), os dois decks de referência do Vinícius no Canva e os bancos
   de fontes (Google Fonts, Fontshare, Velvetyne, Collletttivo, uncut.wtf, DaFont).
   Usado pela etapa de Tipografia, pela Apresentação e pelos pedidos ao Claude. */

import type { FontCat } from "./fonts";

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

/** Guia dos tipos de letra: o que cada família é, o que passa, quando usar e quando evitar.
    Serve para conversar com o cliente antes de escolher fonte (base: caderno de amostras da Alanis Gomes, 27/11). */
export type TypeClass = { k: string; grupo: string; l: string; cat: FontCat; ex: string; it?: boolean; w?: number; oque: string; sente: string; usar: string; evitar: string };
export const TYPE_GROUPS = [
  { k: "serifa", l: "Serifadas", d: "Têm pequenos traços (serifas) nas pontas das letras. Passam tradição, cuidado e sofisticação; funcionam bem impressas e em textos longos." },
  { k: "sans", l: "Sem serifa", d: "Traço limpo, sem os 'pezinhos'. Leem bem em tela e passam modernidade, clareza e proximidade." },
  { k: "script", l: "Manuscritas", d: "Imitam caligrafia ou assinatura. Trazem afeto e gesto humano, mas cansam rápido: use como detalhe." },
  { k: "display", l: "Display e decorativas", d: "Feitas para chamar atenção em logo, capa e cartaz. Têm muita personalidade e pouca leitura em bloco." },
  { k: "mono", l: "Monoespaçadas", d: "Cada letra ocupa a mesma largura, como máquina de escrever ou código. Técnicas e honestas: ótimas em rótulos e detalhes." },
] as const;
export const TYPE_GUIDE: TypeClass[] = [
  { k: "didone", grupo: "serifa", l: "Didone (alto contraste)", cat: "didone", ex: "Bodoni Moda", oque: "Traço muito grosso ao lado de traço finíssimo, serifa reta e fina.", sente: "Moda, luxo, revista.", usar: "Nome grande, títulos, embalagem premium.", evitar: "Texto pequeno ou tela de celular em corpo baixo: o traço fino some." },
  { k: "garalde", grupo: "serifa", l: "Clássica (garalde)", cat: "serifa", ex: "Cormorant Garamond", oque: "Contraste suave e eixo inclinado, herdado da escrita com pena.", sente: "Delicada, literária, atemporal.", usar: "Marcas de cuidado, papelaria, textos longos impressos.", evitar: "Marca que precisa parecer jovem e digital." },
  { k: "contemporanea", grupo: "serifa", l: "Serifa contemporânea", cat: "serifa", ex: "Fraunces", oque: "Serifa redesenhada hoje: cantos macios, formas abertas, às vezes com toque retrô.", sente: "Editorial e acolhedora, chique sem ser antiga.", usar: "Beleza, bem-estar, alimentação autoral.", evitar: "Quando o cliente quer frieza e precisão." },
  { k: "slab", grupo: "serifa", l: "Serifa quadrada (slab)", cat: "slab", ex: "Zilla Slab", oque: "Serifas grossas e retangulares, quase sem contraste.", sente: "Robusta, artesanal, industrial.", usar: "Comida, cerveja, ferramentas, marcas de bairro.", evitar: "Luxo e delicadeza." },
  { k: "grotesca", grupo: "sans", l: "Grotesca", cat: "grotesca", ex: "Hanken Grotesk", oque: "Sem serifa neutra, de desenho levemente irregular.", sente: "Direta, contemporânea, versátil.", usar: "Texto, interface, legendas; a 'voz de estrutura' da marca.", evitar: "Como única fonte de uma marca que precisa de emoção." },
  { k: "geometrica", grupo: "sans", l: "Geométrica", cat: "geometrica", ex: "Jost", w: 300, oque: "Construída com círculo e reta: O redondo, A pontudo.", sente: "Limpa, moderna, de estúdio.", usar: "Logotipo em caixa alta espaçada, tecnologia, wellness.", evitar: "Texto muito longo em peso fino." },
  { k: "humanista", grupo: "sans", l: "Humanista", cat: "humanista", ex: "Figtree", oque: "Sem serifa com traço que lembra a caligrafia, aberta e variada.", sente: "Próxima, calma, fácil de ler.", usar: "Clínicas, saúde, educação, texto corrido.", evitar: "Quando precisa de impacto de pôster." },
  { k: "condensada", grupo: "sans", l: "Condensada", cat: "condensada", ex: "Bebas Neue", oque: "Letras altas e estreitas, muitas vezes pesadas.", sente: "Força, energia, esporte, urgência.", usar: "Fitness, títulos de conteúdo, cartaz, moda urbana.", evitar: "Marcas delicadas e silenciosas." },
  { k: "formal", grupo: "script", l: "Caligráfica formal", cat: "script", ex: "Pinyon Script", oque: "Letra cursiva de pena, ligada, com hastes longas.", sente: "Elegância clássica, convite, cerimônia.", usar: "Um selo, uma palavra, assinatura no rótulo.", evitar: "Nome principal pequeno ou em tela: fica ilegível." },
  { k: "assinatura", grupo: "script", l: "Assinatura e casual", cat: "script", ex: "Mr Dafoe", oque: "Escrita rápida, como caneta ou pincel.", sente: "Pessoal, feito à mão, autoral.", usar: "Ao lado de uma grotesca rígida, para provar que tem gente por trás.", evitar: "Usar em tudo: perde a força." },
  { k: "display", grupo: "display", l: "Display", cat: "display", ex: "Unbounded", oque: "Desenho expressivo: largo, gordo, estranho ou ornamental.", sente: "Autoral, cultural, memorável.", usar: "Logo, capa, campanha.", evitar: "Texto corrido e marcas que querem discrição." },
  { k: "mono", grupo: "mono", l: "Monoespaçada", cat: "mono", ex: "DM Mono", oque: "Todas as letras com a mesma largura.", sente: "Técnica, honesta, de laboratório.", usar: "Rótulos, medidas, fórmulas, numeração de peças.", evitar: "Como fonte principal de marca afetiva." },
];
/** os eixos que diferenciam uma fonte da outra dentro do mesmo tipo */
export const TYPE_AXES = [
  { l: "Peso", d: "Fino passa delicadeza e preço alto; forte passa energia e juventude." },
  { l: "Largura", d: "Condensada é vertical e urgente; larga é calma e luxuosa." },
  { l: "Contraste", d: "Alto contraste é moda; traço igual é neutro e moderno." },
  { l: "Inclinação", d: "Itálico traz gesto e feminilidade; reta traz firmeza." },
  { l: "Caixa", d: "Maiúsculas espaçadas soam caras e silenciosas; minúsculas soam próximas." },
];

/** Pré-projeto: mapa do gosto do cliente, um lado em cada linha (0, 1 ou 2) */
export const TASTE_AXES = [
  { k: "serifa", l: "Serifa", o: ["Com serifa", "Tanto faz", "Sem serifa"] },
  { k: "contraste", l: "Contraste", o: ["Alto, de moda", "Médio", "Traço igual"] },
  { k: "peso", l: "Peso", o: ["Fino", "Regular", "Forte"] },
  { k: "largura", l: "Largura", o: ["Alta e estreita", "Normal", "Larga"] },
  { k: "inclinacao", l: "Inclinação", o: ["Reta", "Itálico num detalhe", "Itálico em tudo"] },
  { k: "caixa", l: "Caixa", o: ["Maiúsculas espaçadas", "Tanto faz", "Minúsculas"] },
  { k: "gesto", l: "Manuscrita", o: ["Nenhuma", "Só num detalhe", "Assinatura em destaque"] },
] as const;
/** famílias mostradas em vários pesos no pré-projeto */
export const TASTE_WEIGHTS = ["Bodoni Moda", "Fraunces", "Jost", "Montserrat"];

/** resumo do gosto em texto, para o Claude e para a etapa de Tipografia */
export function tasteText(g: any = {}) {
  const fav = Object.entries(g.fontes || {}).filter(([, v]) => v === 1).map(([f]) => f);
  const nao = Object.entries(g.fontes || {}).filter(([, v]) => v === -1).map(([f]) => f);
  const eixos = TASTE_AXES.filter((a) => g.eixos?.[a.k] !== undefined).map((a) => `${a.l}: ${a.o[g.eixos[a.k]]}`);
  const out = [];
  if (eixos.length) out.push("Gosto do cliente (pré-projeto): " + eixos.join("; ") + ".");
  if (fav.length) out.push("Letras que gostou: " + fav.join(", ") + ".");
  if (nao.length) out.push("Letras que não quer: " + nao.join(", ") + ".");
  if (g.notas) out.push("Observações: " + g.notas);
  return out.join("\n");
}

/** regras que vão junto nos pedidos ao Claude */
export function knowledgeText() {
  return [
    "Critérios de estúdio (Behance) para não parecer feito por IA:",
    ...ANTI_AI.map(([a, b]) => `- Em vez de "${a}": ${b}.`),
    "Sistema tipográfico em 3 vozes: estrutura (grotesca: clareza), editorial (serifa ou condensada: interpretação) e gesto (manuscrita: movimento, usada pouco).",
    "Tipos de letra e o que passam: " + TYPE_GUIDE.map((c) => `${c.l} (${c.sente.replace(/\.$/, "")})`).join("; ") + ".",
  ].join("\n");
}

export function systemsFor(arqs: string[] = [], nicho?: string) {
  const score = (s: TypeSystem) => arqs.reduce((t, a, i) => t + (s.arquetipos.includes(a) ? 3 - i : 0), 0) + (nicho && s.nichos.includes(nicho) ? 2 : 0);
  return [...TYPE_SYSTEMS].map((s) => ({ s, n: score(s) })).sort((a, b) => b.n - a.n);
}
