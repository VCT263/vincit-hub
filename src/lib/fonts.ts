/* ───────────── Acervo de fontes gratuitas (uso comercial liberado) ─────────────
   Google Fonts (licença OFL) e Fontshare (Indian Type Foundry, licença ITF FFL).
   w = pesos disponíveis entre 400, 600, 700 e 800 (os que o HUB usa). */

export type FontCat = "didone" | "serifa" | "slab" | "grotesca" | "geometrica" | "humanista" | "condensada" | "display" | "mono" | "script";
export type FontDef = { f: string; cat: FontCat; src: "google" | "fontshare"; w: number[]; slug?: string; it?: boolean };

export const FONT_CATS: { k: FontCat; l: string; d: string }[] = [
  { k: "didone", l: "Serifa de alto contraste", d: "Didone e display serif: moda, luxo, editorial. Fica melhor grande." },
  { k: "serifa", l: "Serifa editorial", d: "Livro e revista: confiança, tradição, calor humano." },
  { k: "slab", l: "Serifa quadrada", d: "Slab: robusta, artesanal, industrial, alimentação." },
  { k: "grotesca", l: "Grotesca", d: "Sans neutra ou com personalidade: moderna, direta, versátil." },
  { k: "geometrica", l: "Geométrica", d: "Círculos e retas: tecnologia, clareza, simpatia." },
  { k: "humanista", l: "Humanista", d: "Traço de caligrafia: próxima, legível, ótima para texto corrido." },
  { k: "condensada", l: "Condensada", d: "Estreita e pesada: pôster, impacto, esporte, moda urbana." },
  { k: "display", l: "Display", d: "Expressiva e autoral: cultura, agência, marcas que querem ser lembradas." },
  { k: "mono", l: "Monoespaçada", d: "Código e máquina de escrever: técnica, honesta, rótulos e detalhes." },
  { k: "script", l: "Manuscrita", d: "Assinatura e caligrafia: afeto, feito à mão. Use pouco, como detalhe." },
];

const G = (f: string, cat: FontCat, w = [400, 600, 700, 800], it = false): FontDef => ({ f, cat, src: "google", w, it });
/** famílias com itálico de verdade (desenhado, não inclinado) */
const GI = (f: string, cat: FontCat, w = [400, 600, 700, 800]) => G(f, cat, w, true);
const S = (f: string, cat: FontCat, w = [400, 700]): FontDef => ({ f, cat, src: "fontshare", w, slug: f.toLowerCase().replace(/\s+/g, "-") });

export const FONT_LIB: FontDef[] = [
  // serifa de alto contraste
  GI("Playfair Display", "didone"), GI("Bodoni Moda", "didone"), G("DM Serif Display", "didone", [400]), GI("Instrument Serif", "didone", [400]),
  G("Abril Fatface", "didone", [400]), G("Gloock", "didone", [400]), G("Prata", "didone", [400]), S("Boska", "didone", [400, 700]), S("Zodiak", "didone", [400, 700, 800]),
  // serifa editorial
  GI("Fraunces", "serifa"), GI("Cormorant Garamond", "serifa", [400, 600, 700]), GI("EB Garamond", "serifa"), GI("Newsreader", "serifa"),
  GI("Libre Caslon Text", "serifa", [400, 700]), GI("Spectral", "serifa"), G("Young Serif", "serifa", [400]), GI("Literata", "serifa"),
  S("Gambetta", "serifa", [400, 600, 700]), S("Erode", "serifa", [400, 600, 700]), S("Sentient", "serifa", [400, 700]),
  // slab
  G("Roboto Slab", "slab"), G("Zilla Slab", "slab", [400, 600, 700]), G("Arvo", "slab", [400, 700]), G("Bitter", "slab"),
  // grotesca
  G("Inter", "grotesca"), G("Inter Tight", "grotesca"), G("Bricolage Grotesque", "grotesca"), G("Space Grotesk", "grotesca", [400, 600, 700]),
  GI("Archivo", "grotesca"), GI("Hanken Grotesk", "grotesca"), G("Schibsted Grotesk", "grotesca"), G("Familjen Grotesk", "grotesca", [400, 600, 700]),
  GI("Instrument Sans", "grotesca", [400, 600, 700]), S("General Sans", "grotesca", [400, 600, 700]), S("Switzer", "grotesca", [400, 600, 700, 800]),
  S("Cabinet Grotesk", "grotesca", [400, 700, 800]), S("Clash Grotesk", "grotesca", [400, 600, 700]), S("Supreme", "grotesca", [400, 700, 800]),
  // geométrica
  G("Poppins", "geometrica"), G("Montserrat", "geometrica"), G("Outfit", "geometrica"), G("Manrope", "geometrica"), G("Urbanist", "geometrica"),
  G("Plus Jakarta Sans", "geometrica"), G("Sora", "geometrica"), G("Lexend", "geometrica"), G("Red Hat Display", "geometrica"), G("Jost", "geometrica"),
  G("DM Sans", "geometrica"), S("Satoshi", "geometrica", [400, 700]), S("Chillax", "geometrica", [400, 600, 700]),
  // humanista (texto)
  G("Source Sans 3", "humanista"), GI("Work Sans", "humanista"), G("Nunito Sans", "humanista"), G("Nunito", "humanista"), G("Figtree", "humanista"),
  G("Onest", "humanista"), G("Mulish", "humanista"), G("Lato", "humanista", [400, 700]), G("IBM Plex Sans", "humanista", [400, 600, 700]), G("Barlow", "humanista"),
  // condensada
  G("Bebas Neue", "condensada", [400]), G("Anton", "condensada", [400]), G("Oswald", "condensada", [400, 600, 700]), G("Barlow Condensed", "condensada"),
  GI("Big Shoulders Display", "condensada"), G("Antonio", "condensada", [400, 600, 700]), G("League Gothic", "condensada", [400]), G("Archivo Narrow", "condensada", [400, 600, 700]),
  S("Tanker", "condensada", [400]),
  // display
  G("Syne", "display"), G("Unbounded", "display"), G("Archivo Black", "display", [400]), G("Dela Gothic One", "display", [400]),
  G("Krona One", "display", [400]), G("Michroma", "display", [400]), S("Clash Display", "display", [400, 600, 700]), S("Panchang", "display", [400, 600, 700, 800]),
  // mono
  G("JetBrains Mono", "mono"), G("IBM Plex Mono", "mono", [400, 600, 700]), G("Space Mono", "mono", [400, 700]), G("DM Mono", "mono", [400]),
  // manuscrita
  G("Caveat", "script", [400, 600, 700]), G("Dancing Script", "script", [400, 600, 700]), G("Pinyon Script", "script", [400]), G("Great Vibes", "script", [400]),
  G("Italianno", "script", [400]), G("Homemade Apple", "script", [400]),
  // assinatura e gesto: para o "feito à mão" ao lado de uma grotesca rígida
  G("Mrs Saint Delafield", "script", [400]), G("Monsieur La Doulaise", "script", [400]), G("Herr Von Muellerhoff", "script", [400]), G("Mr Dafoe", "script", [400]),
  G("La Belle Aurore", "script", [400]), G("Nothing You Could Do", "script", [400]), G("Reenie Beanie", "script", [400]), G("Marck Script", "script", [400]), G("Sacramento", "script", [400]),
];

export const fontDef = (f: string) => FONT_LIB.find((x) => x.f === f);
export const fontsOfCat = (c: FontCat) => FONT_LIB.filter((x) => x.cat === c);

/** URL do CSS da família, só com os pesos que existem (um peso inexistente derruba o pedido no Google) */
export function fontCssUrl(f: string) {
  const d = fontDef(f);
  if (d?.src === "fontshare") return `https://api.fontshare.com/v2/css?f[]=${d.slug}@400,500,600,700,800,900&display=swap`;
  const w = d?.w || [400, 700];
  const fam = encodeURIComponent(f).replace(/%20/g, "+");
  if (d?.it) return `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${[...w.map((x) => `0,${x}`), ...w.map((x) => `1,${x}`)].join(";")}&display=swap`;
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${w.join(";")}&display=swap`;
}
