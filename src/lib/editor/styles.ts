/**
 * Catálogo fixo de estilos de edição (01, 02, 03…).
 * O estilo define a FORMA (lettering, cortes, câmera, transição, cor e textos automáticos).
 * As CORES vêm do kit do cliente, então o mesmo estilo serve para marcas diferentes.
 * Referências: edições elaboradas do Instagram (kinetic typography, serifa itálica, colagem, neon, glitch)
 * e dos canais do YouTube estudados (Vinci Society, André Pilli, Luana Carolina, Lina Rodrigues, Ana Jords).
 */
import { isHot, outputWords, removeSilences, totalDuration, uid, type Kit, type Media, type Project, type Title, type Zoom } from "./model";

export type Estilo = {
  num: string;
  nome: string;
  resumo: string;
  /** de onde veio a ideia */
  referencia: string;
  /** para quê serve melhor */
  uso: string;
  formato: "ambos" | "9:16" | "16:9";
  legenda: { estilo: string; caixa_alta: boolean; palavras_por_tela: number; animacao?: string };
  fontes: { titulo: string; legenda: string };
  /** false: legenda desligada */
  captions: boolean;
  /** silêncio mínimo para cortar, em segundos (0 = padrão do kit, false = não corta) */
  cut: number | false;
  /** câmera que segue a fala: 0 a 3 */
  camera: number;
  /** punch alternado nos cortes, em % */
  jump?: number;
  /** zoom de 110% nas frases fortes */
  zoom: boolean;
  transicao: string;
  look: string;
  grao?: boolean;
  fade: boolean;
  textos: {
    abertura?: "episodio" | "gancho" | "data";
    /** palavra forte vira texto na tela: pequena (palavra) ou gigante (letreiro) */
    palavras?: "palavra" | "letreiro";
    /** primeira frase forte vira frase de efeito */
    frase?: boolean;
    /** nome e cargo no começo */
    nome?: boolean;
    /** moldura de câmera REC o vídeo todo */
    rec?: boolean;
    cta?: boolean;
  };
};

export const ESTILOS: Estilo[] = [
  {
    num: "01", nome: "Impacto Viral", formato: "ambos",
    resumo: "Corte seco em todos os silêncios, câmera forte, zoom de impacto nos cortes e legenda karaokê em caixa alta.",
    referencia: "Reels de ritmo alto do Explore (#videoediting) e cortes de criadores de negócio.",
    uso: "Reels de alcance, gancho forte, conteúdo rápido.",
    legenda: { estilo: "karaoke", caixa_alta: true, palavras_por_tela: 2 }, fontes: { titulo: "Anton", legenda: "Montserrat Black" },
    captions: true, cut: 0, camera: 3, zoom: true, transicao: "zoom", look: "contraste", fade: false,
    textos: { abertura: "gancho", cta: true },
  },
  {
    num: "02", nome: "Minimal Branco", formato: "ambos",
    resumo: "Legenda pequena em minúsculas, sem contorno. Corte seco, câmera suave, cor natural. Deixa a pessoa aparecer.",
    referencia: "Criadoras de lifestyle e produtividade com edição limpa (Lina Rodrigues, Reels de rotina).",
    uso: "Rotina, bastidores, falas calmas e marcas premium.",
    legenda: { estilo: "minimal", caixa_alta: false, palavras_por_tela: 5 }, fontes: { titulo: "Inter Bold", legenda: "Inter Medium" },
    captions: true, cut: 0, camera: 1, zoom: false, transicao: "corte", look: "natural", fade: true,
    textos: {},
  },
  {
    num: "03", nome: "Editorial Serifado", formato: "ambos",
    resumo: "Mistura sans com serifa itálica nas palavras fortes, frase de efeito na tela, transição com desfoque e cor de filme.",
    referencia: "Tipografia de revista nos Reels (sans + serif itálica), Thay Dantas / Vinci Society.",
    uso: "Autoridade, reflexão, conteúdo de marca pessoal.",
    legenda: { estilo: "serifa", caixa_alta: false, palavras_por_tela: 3 }, fontes: { titulo: "Instrument Serif", legenda: "Inter Black" },
    captions: true, cut: 0.6, camera: 1, zoom: false, transicao: "blur", look: "filme", fade: true,
    textos: { frase: true },
  },
  {
    num: "04", nome: "Documentário", formato: "ambos",
    resumo: "Mantém os respiros, legenda discreta embaixo, nome na tela, mergulho no preto entre partes e grão de filme.",
    referencia: "Mini documentários do YouTube e séries de bastidores.",
    uso: "Histórias, cases de cliente, entrevistas longas.",
    legenda: { estilo: "documental", caixa_alta: false, palavras_por_tela: 6 }, fontes: { titulo: "Playfair Display", legenda: "Inter Medium" },
    captions: true, cut: 0.9, camera: 1, zoom: false, transicao: "preto", look: "filme", grao: true, fade: true,
    textos: { abertura: "episodio", nome: true },
  },
  {
    num: "05", nome: "Vlog Cinema", formato: "ambos",
    resumo: "O seu estilo do \"21KM em Floripa\": abertura com título sobre o quadro desfocado, jump cut com punch alternado, sem legenda, cor quente e fade.",
    referencia: "Seu vídeo \"21KM em Floripa\" e vlogs do André Pilli.",
    uso: "Séries de vlog, viagens, provas, dia a dia.",
    legenda: { estilo: "editorial", caixa_alta: false, palavras_por_tela: 4 }, fontes: { titulo: "Cinzel", legenda: "Inter Bold" },
    captions: false, cut: 0, camera: 1, jump: 112, zoom: false, transicao: "corte", look: "quente", fade: true,
    textos: { abertura: "episodio" },
  },
  {
    num: "06", nome: "Conhecimento", formato: "ambos",
    resumo: "Ritmo alto, punch alternado, palavra-chave gigante na tela nas ideias fortes e flash branco nos cortes.",
    referencia: "Canais de ciência e produtividade (Ana Jords, Luana Carolina).",
    uso: "Explicar conceito, dica, aula curta.",
    legenda: { estilo: "impacto", caixa_alta: true, palavras_por_tela: 3 }, fontes: { titulo: "Archivo Black", legenda: "Inter Black" },
    captions: true, cut: 0, camera: 2, jump: 115, zoom: true, transicao: "flash", look: "contraste", fade: true,
    textos: { abertura: "gancho", palavras: "letreiro" },
  },
  {
    num: "07", nome: "Podcast / Corte", formato: "ambos",
    resumo: "Legenda com caixa colorida, nome e cargo na tela, câmera quase parada e cortes só nos silêncios longos.",
    referencia: "Cortes de podcast que viralizam no Reels e no Shorts.",
    uso: "Trechos de podcast, entrevista, live.",
    legenda: { estilo: "caixa", caixa_alta: true, palavras_por_tela: 3 }, fontes: { titulo: "Bebas Neue", legenda: "Poppins Black" },
    captions: true, cut: 0.7, camera: 1, zoom: true, transicao: "corte", look: "natural", fade: false,
    textos: { nome: true },
  },
  {
    num: "08", nome: "Kinetic Pôster", formato: "ambos",
    resumo: "Cada palavra num bloco torto de cor, letreiros gigantes, glitch nos cortes e contraste alto. Tipografia em movimento.",
    referencia: "Kinetic typography do Instagram (#kinetictypography): pôsteres de palavras empilhadas.",
    uso: "Gancho visual, frases curtas, lançamento.",
    legenda: { estilo: "bloco", caixa_alta: true, palavras_por_tela: 2 }, fontes: { titulo: "Bricolage Grotesque", legenda: "Archivo Black" },
    captions: true, cut: 0, camera: 2, zoom: true, transicao: "glitch", look: "contraste", fade: false,
    textos: { palavras: "letreiro", frase: true },
  },
  {
    num: "09", nome: "Neon Noturno", formato: "ambos",
    resumo: "Legenda com brilho neon na cor de destaque, cor fria, flash nos cortes e câmera média.",
    referencia: "Edições noturnas e de tecnologia com números brilhando.",
    uso: "Tecnologia, noite, música, eventos.",
    legenda: { estilo: "neon", caixa_alta: true, palavras_por_tela: 2 }, fontes: { titulo: "Bebas Neue", legenda: "Montserrat Black" },
    captions: true, cut: 0, camera: 2, zoom: true, transicao: "flash", look: "frio", fade: true,
    textos: { abertura: "gancho" },
  },
  {
    num: "10", nome: "Colagem", formato: "ambos",
    resumo: "Blocos de palavra estilo recorte de papel, grão, cor quente e mergulho no preto. Visual feito à mão.",
    referencia: "Colagem e sticker de papel nos Reels criativos.",
    uso: "Moda, beleza, estilo de vida, conteúdo afetivo.",
    legenda: { estilo: "bloco", caixa_alta: false, palavras_por_tela: 3 }, fontes: { titulo: "Instrument Serif", legenda: "Poppins Black" },
    captions: true, cut: 0, camera: 1, zoom: false, transicao: "preto", look: "quente", grao: true, fade: true,
    textos: { frase: true },
  },
  {
    num: "11", nome: "Retrô REC", formato: "ambos",
    resumo: "Moldura de câmera REC, data na tela, preto e branco com grão e glitch nos cortes. Cara de câmera antiga.",
    referencia: "Vlogs com estética de filmadora (Ana Jords, Reels retrô).",
    uso: "Bastidores, memória, \"um dia comigo\".",
    legenda: { estilo: "minimal", caixa_alta: true, palavras_por_tela: 4 }, fontes: { titulo: "JetBrains Mono", legenda: "JetBrains Mono" },
    captions: true, cut: 0, camera: 1, zoom: false, transicao: "glitch", look: "pb", grao: true, fade: true,
    textos: { abertura: "data", rec: true },
  },
  {
    num: "12", nome: "Explicação", formato: "ambos",
    resumo: "Legenda em caixa, nome na tela, palavras-chave pequenas, zoom de impacto nos cortes. Claro e didático.",
    referencia: "Vídeos de explicação e tutoriais do YouTube.",
    uso: "Tutorial, passo a passo, produto.",
    legenda: { estilo: "caixa", caixa_alta: false, palavras_por_tela: 4 }, fontes: { titulo: "Montserrat Black", legenda: "Inter Black" },
    captions: true, cut: 0, camera: 2, zoom: true, transicao: "zoom", look: "natural", fade: true,
    textos: { nome: true, palavras: "palavra", cta: true },
  },
  {
    num: "13", nome: "Revelar", formato: "ambos",
    resumo: "A frase inteira aparece apagada e cada palavra acende quando é dita. Cada palavra pisca numa caixa branca ao entrar. Riscado e corrigido nos contrastes.",
    referencia: "Reels do app Captions e de legendas dinâmicas no Premiere (pesquisa de 27/11).",
    uso: "Talking head de opinião, aula curta, conteúdo para ler junto.",
    legenda: { estilo: "revelar", caixa_alta: false, palavras_por_tela: 5, animacao: "flash" }, fontes: { titulo: "Inter Black", legenda: "Inter Bold" },
    captions: true, cut: 0, camera: 2, zoom: true, transicao: "corte", look: "natural", fade: false,
    textos: { abertura: "gancho", palavras: "palavra", cta: true },
  },
  {
    num: "14", nome: "Brilho", formato: "ambos",
    resumo: "Uma ideia por tela em branco grande com brilho suave, câmera que respira e fotos em cartão sobre página branca.",
    referencia: "Reels de criadores com legenda em glow e B-roll em cartão (Submagic, Captions, pesquisa de 27/11).",
    uso: "Storytelling, bastidores, conteúdo aspiracional.",
    legenda: { estilo: "brilho", caixa_alta: false, palavras_por_tela: 2, animacao: "desfoque" }, fontes: { titulo: "Inter Black", legenda: "Inter Black" },
    captions: true, cut: 0.6, camera: 1, zoom: false, transicao: "blur", look: "quente", fade: true,
    textos: { frase: true },
  },
  {
    num: "15", nome: "Explicativo editorial", formato: "ambos",
    resumo: "Fala com páginas editoriais por cima (papel claro, título serifado, foto da peça em cartão) montadas pelo Claude a partir do roteiro. Legenda uma palavra por vez com a palavra forte gigante no meio.",
    referencia: "Reels de vídeo explicativo montado pelo Claude e de plugin de legenda no Premiere (referências do Vinícius, 27/11).",
    uso: "Educativo (tecido, caimento, jeitos de usar), história da peça pela fundadora, bastidores com explicação.",
    legenda: { estilo: "chave", caixa_alta: false, palavras_por_tela: 4, animacao: "pop" }, fontes: { titulo: "Inter Black", legenda: "Inter Bold" },
    captions: true, cut: 0, camera: 1, zoom: true, transicao: "corte", look: "natural", fade: true,
    textos: {},
  },
];

export const estiloByNum = (n?: string | null) => ESTILOS.find((e) => e.num === String(n || "").padStart(2, "0"));

/** etiquetas curtas da definição, para mostrar nos cartões */
export function estiloTags(e: Estilo) {
  const tx = e.textos;
  return [
    `Legenda ${e.captions ? e.legenda.estilo : "desligada"}`,
    e.cut === false ? "Sem cortes" : e.cut && e.cut >= 0.6 ? "Corta pausas longas" : "Corte seco",
    ["Câmera parada", "Câmera suave", "Câmera média", "Câmera forte"][e.camera],
    `Transição ${e.transicao}`,
    `Cor ${e.look}${e.grao && e.look !== "filme" ? " + grão" : ""}`,
    e.jump ? `Jump cut ${e.jump}%` : "",
    tx.abertura ? `Abertura ${tx.abertura}` : "",
    tx.palavras ? (tx.palavras === "letreiro" ? "Letreiro gigante" : "Palavra-chave") : "",
    tx.frase ? "Frase de efeito" : "",
    tx.nome ? "Nome na tela" : "",
    tx.rec ? "Moldura REC" : "",
    e.fade ? "Fade" : "",
  ].filter(Boolean);
}

/** kit do cliente com o lettering do estilo por cima (as cores continuam as do cliente) */
export function kitComEstilo(kit: Kit, e?: Estilo): Kit {
  if (!e) return kit;
  return { ...kit, legenda: { ...kit.legenda, ...e.legenda }, fontes: { ...kit.fontes, ...e.fontes } };
}

/** só os campos do projeto (sem mexer em cortes e textos): usado na prévia do kit */
export function projetoDoEstilo(p: Project, e: Estilo): Project {
  return { ...p, estilo: e.num, camera: e.camera, captionsOn: e.captions, jumpPunch: e.jump, fade: e.fade, look: e.look, transicao: e.transicao, grao: !!e.grao };
}

/** aplica o estilo inteiro: cortes, zooms e textos automáticos a partir da fala */
export function aplicarEstilo(e: Estilo, p: Project, media: Media[], kit: Kit, info: { titulo?: string; gancho?: string; nome?: string; cargo?: string; cta?: string } = {}): Project {
  const minGap = e.cut === false ? 0 : e.cut || (kit.regras?.silencio_ms || 350) / 1000;
  let next = projetoDoEstilo(p, e);
  if (e.cut !== false && media.some((m) => m.words)) next = { ...next, segments: removeSilences(p, media, minGap) };
  const ws = outputWords(next, media);
  const end = totalDuration(next);
  const zooms: Zoom[] = [];
  if (e.zoom) {
    let last = -10;
    ws.forEach((w, i) => {
      const strong = /[!?]$/.test(w.t) || (i > 0 && ws[i - 1].t.match(/[.!?]$/));
      if (strong && w.start - last > 3) { zooms.push({ id: uid(), start: w.start, end: Math.min(w.start + 1.6, end), scale: 110 }); last = w.start; }
    });
  }
  next = { ...next, zooms };
  const auto: Title["kind"][] = ["palavra", "letreiro", "episodio", "gancho", "data", "frase", "lower_third", "rec", "cta"];
  let titles = next.titles.filter((x) => !auto.includes(x.kind));
  const tx = e.textos;
  const add = (kind: Title["kind"], text: string, start: number, len: number, sub?: string) => {
    if (end <= 0) return;
    titles.push({ id: uid(), kind, text, sub, start: Math.max(0, Math.min(start, end - 0.5)), end: Math.min(end, start + len) });
  };
  const ano = String(new Date().getFullYear());
  if (tx.abertura === "episodio") add("episodio", info.titulo || "Título do episódio", 0, 3.5, `EP. 01 · ${ano}`);
  if (tx.abertura === "gancho") add("gancho", info.gancho || info.titulo || "Seu gancho aqui", 0, 2.5);
  if (tx.abertura === "data") add("data", new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }), 0.3, 3, new Date().toLocaleDateString("pt-BR", { weekday: "long" }));
  if (tx.nome) add("lower_third", info.nome || "Nome", tx.abertura ? 3.6 : 0.5, 3.5, info.cargo || "Cargo ou @perfil");
  if (tx.rec) add("rec", "REC", 0, end || 9999, "4K UHD");
  if (tx.palavras) {
    let last = -10;
    for (const w of ws) {
      const clean = w.t.replace(/[^\p{L}\p{N}%$]/gu, "");
      if (clean.length >= 4 && isHot(w.t) && w.start - last > 9 && w.start > 4) { add(tx.palavras, clean, w.start, tx.palavras === "letreiro" ? 1.6 : 2.2); last = w.start; }
    }
  }
  if (tx.frase) {
    // primeira frase curta e forte depois da abertura
    let buf: typeof ws = [];
    for (const w of ws) {
      buf.push(w);
      if (/[.!?]$/.test(w.t)) {
        if (buf.length >= 3 && buf.length <= 8 && buf[0].start > 3) {
          const hot = buf.find((b) => isHot(b.t));
          add("frase", buf.map((b) => b.t).join(" ").replace(/[.!?]+$/, ""), buf[0].start, Math.max(2.5, buf[buf.length - 1].end - buf[0].start + 0.6), hot?.t.replace(/[^\p{L}\p{N}]/gu, ""));
          break;
        }
        buf = [];
      }
    }
  }
  if (tx.cta) add("cta", info.cta || "Comenta EU QUERO", Math.max(0, end - 3), 3);
  return { ...next, titles };
}
