import { AXES } from "./design";

/* Briefing de marca para o cliente responder sem login (link público /b/<token>).
   As perguntas são as do briefing interno da Criação de marca, reescritas sem termos técnicos,
   com perguntas extras que tiram mais do cliente (história, sensações, "se fosse uma pessoa",
   o que não quer de jeito nenhum, marca anterior). toBrief() converte para o briefing interno. */

export type QType = "text" | "textarea" | "chips" | "multi" | "single" | "eixos" | "estilos" | "cores" | "imagens" | "logo";
export type Q = { k: string; l: string; help?: string; ph?: string; type?: QType; options?: string[]; sugest?: string[]; max?: number; req?: boolean };
export type Etapa = { k: string; t: string; d: string; qs: Q[] };

export const ETAPAS: Etapa[] = [
  { k: "voce", t: "Para começar", d: "O básico, para a gente saber com quem está falando.", qs: [
    { k: "seu_nome", l: "Qual é o seu nome?", req: true, ph: "Seu nome" },
    { k: "marca_nome", l: "Como a sua marca se chama?", help: "Escreva exatamente do jeito que você quer ver no logo, com maiúsculas e minúsculas.", req: true, ph: "Ex.: AG Skin" },
    { k: "nome_extra", l: "Existe algum nome que aparece no CNPJ, no contrato ou numa sigla e que NÃO deve entrar no logo?", ph: "Ex.: AG Skin Concept Ltda." },
    { k: "instagram", l: "Instagram ou site da marca, se já tiver", ph: "@suamarca" },
    { k: "momento", l: "Em que momento a sua marca está?", type: "single", options: ["Está nascendo agora", "Já existe e quero uma marca nova", "Já existe e quero só renovar"] },
  ] },
  { k: "negocio", t: "O seu negócio", d: "Conte com as suas palavras. Não existe resposta certa, quanto mais detalhe, melhor.", qs: [
    { k: "oque", l: "O que você faz? Explique como se estivesse contando para um amigo.", type: "textarea", req: true, ph: "Ex.: cuido da pele das minhas clientes com tratamentos naturais, sem exagero." },
    { k: "servicos", l: "Quais são os principais produtos ou serviços?", type: "chips", ph: "Digite um e aperte Enter" },
    { k: "historia", l: "Como tudo começou? Por que você criou esse negócio?", type: "textarea", ph: "A história por trás da marca." },
    { k: "orgulho", l: "Do que você mais se orgulha no seu trabalho?", type: "textarea" },
    { k: "futuro", l: "Onde você imagina a sua marca daqui a 5 anos?", type: "textarea", ph: "Ex.: uma clínica própria, uma linha de produtos, uma comunidade." },
  ] },
  { k: "cliente", t: "Quem é o seu cliente", d: "A marca é feita para atrair as pessoas certas. Pense em quem você mais gosta de atender.", qs: [
    { k: "cliente", l: "Descreva a pessoa que você mais gosta de atender.", type: "textarea", req: true, help: "Idade, rotina, do que ela gosta, o que ela valoriza, onde passa o tempo.", ph: "Ex.: mulher de 25 a 35 anos, ativa, viaja, cuida de si sem exagero." },
    { k: "dor", l: "O que essa pessoa procura quando chega até você?", type: "textarea", ph: "O problema que você resolve ou o desejo que você realiza." },
    { k: "sentir", l: "Como você quer que o cliente se sinta depois de te conhecer?", type: "chips", sugest: ["Confiante", "Cuidada", "Acolhida", "Bonita", "Leve", "Especial", "Segura", "Inspirada", "Livre", "Bem resolvida"] },
    { k: "canais", l: "Por onde as pessoas te encontram hoje?", type: "multi", options: ["Instagram", "Indicação", "Google", "Espaço físico", "WhatsApp", "Site", "TikTok", "Eventos"] },
  ] },
  { k: "mercado", t: "Você e o mercado", d: "Olhar para os outros ajuda a decidir o que seguir e o que evitar.", qs: [
    { k: "concorrentes", l: "Quem faz algo parecido com você?", type: "chips", ph: "Nome ou @ do Instagram, aperte Enter" },
    { k: "diferente", l: "O que você faz diferente deles?", type: "textarea" },
    { k: "admira", l: "Marcas que você admira, de qualquer área, e por quê", type: "textarea", ph: "Ex.: Aesop, pelo jeito calmo e sofisticado. Nike, pela energia." },
  ] },
  { k: "personalidade", t: "A personalidade", d: "Imagine que a sua marca é uma pessoa. Como ela é?", qs: [
    { k: "eixos", l: "Arraste cada linha para o lado que mais combina com a marca", type: "eixos" },
    { k: "palavras", l: "Escolha até 5 palavras que a marca precisa transmitir", type: "chips", max: 5, sugest: ["Refinada", "Leve", "Natural", "Moderna", "Delicada", "Confiante", "Acolhedora", "Sofisticada", "Jovem", "Atemporal", "Ousada", "Minimalista", "Alegre", "Elegante", "Autêntica", "Intencional"] },
    { k: "nao_palavras", l: "E o que ela NÃO pode parecer?", type: "chips", sugest: ["Barata", "Fria", "Infantil", "Genérica", "Exagerada", "Antiquada", "Séria demais", "Pesada", "Artificial"] },
    { k: "pessoa", l: "Se a sua marca fosse uma pessoa, como ela seria?", type: "textarea", help: "Como se veste, como fala, onde passa o fim de semana.", ph: "Ex.: uma mulher de 30 anos, camisa de linho, fala baixo, corre na praia de manhã." },
    { k: "lugar", l: "E se fosse um lugar?", ph: "Ex.: um hotel pequeno em Comporta, luz de fim de tarde." },
  ] },
  { k: "visual", t: "O visual", d: "Aqui não precisa saber de design. Marque o que te chama atenção.", qs: [
    { k: "estilos", l: "Quais estilos têm mais a ver com a sua marca?", type: "estilos", help: "Pode marcar mais de um." },
    { k: "tipo_logo", l: "Como você imagina o logo?", type: "logo" },
    { k: "cores_gosta", l: "Cores que você gosta para a marca", type: "cores" },
    { k: "cores_evita", l: "Cores que você não quer", type: "cores" },
    { k: "nao_quer", l: "Tem algo que você NÃO quer de jeito nenhum?", type: "textarea", req: true, help: "Uma forma, um símbolo, uma palavra no logo, um estilo. Isso evita surpresa ruim lá na frente.", ph: "Ex.: não quero símbolo em arco, não quero a palavra “esteticista” no logo, nada de marrom pesado." },
    { k: "onde", l: "Onde a marca vai aparecer?", type: "multi", options: ["Instagram", "Site / loja online", "Embalagem / sacola", "Etiqueta", "Fachada", "Cartão de visita", "Uniforme", "Vídeo"] },
  ] },
  { k: "referencias", t: "Referências", d: "Imagens dizem mais que palavras. Envie prints, fotos ou links do que você gosta e do que não gosta.", qs: [
    { k: "refs", l: "Imagens de referência", type: "imagens", help: "Marque cada uma como “gosto” ou “não gosto” e, se puder, diga o porquê." },
    { k: "links", l: "Links (Pinterest, Instagram, sites)", type: "chips", ph: "Cole o link e aperte Enter" },
    { k: "antes", l: "Já fez uma marca ou logo antes? O que gostou e o que não gostou?", type: "textarea", help: "Se não gostou de algum trabalho anterior, conte o que incomodou. É uma das respostas mais úteis." },
  ] },
  { k: "fechar", t: "Para fechar", d: "Quase lá.", qs: [
    { k: "prazo", l: "Tem alguma data importante?", ph: "Ex.: inauguração em março, lançamento no Natal." },
    { k: "extra", l: "Algo mais que a gente precisa saber?", type: "textarea" },
    { k: "contato", l: "WhatsApp ou e-mail para falarmos", ph: "(31) 9…" },
  ] },
];

/** eixos de personalidade com rótulos do dia a dia (mesmas chaves do briefing interno) */
export const EIXOS_CLIENTE: Record<string, [string, string]> = {
  classica: ["Clássica, tradicional", "Moderna, atual"],
  seria: ["Séria", "Divertida"],
  acessivel: ["Para todo mundo", "Exclusiva, premium"],
  discreta: ["Discreta, silenciosa", "Ousada, chama atenção"],
  simples: ["Simples, limpa", "Cheia de detalhes"],
  racional: ["Prática, objetiva", "Emocional, afetiva"],
};

/** estilos visuais com uma prévia pequena (fonte + cores) */
export const ESTILOS: { k: string; l: string; d: string; bg: string; fg: string; ac: string; font: string; w: number; it?: boolean; up?: boolean }[] = [
  { k: "minimal", l: "Minimalista", d: "pouco elemento, muito respiro", bg: "#f4f2ee", fg: "#151515", ac: "#151515", font: "Inter", w: 300 },
  { k: "elegante", l: "Elegante e clássico", d: "serifa fina, alto contraste", bg: "#efe9e1", fg: "#1d1a17", ac: "#8a7560", font: "Bodoni Moda", w: 400, it: true },
  { k: "delicado", l: "Delicado", d: "traço leve, tons suaves", bg: "#f6ece6", fg: "#6d5a52", ac: "#d8b4a6", font: "Cormorant Garamond", w: 400, it: true },
  { k: "natural", l: "Natural e orgânico", d: "terra, folha, textura", bg: "#e7e4d8", fg: "#3e4a33", ac: "#a08661", font: "Fraunces", w: 400 },
  { k: "luxo", l: "Luxo discreto", d: "escuro, dourado, silêncio", bg: "#141311", fg: "#e9dfcc", ac: "#c2a56b", font: "Cormorant Garamond", w: 500, up: true },
  { k: "moderno", l: "Moderno e ousado", d: "letra forte, contraste", bg: "#111111", fg: "#ffffff", ac: "#ff4d2e", font: "Archivo Black", w: 400, up: true },
  { k: "jovem", l: "Jovem e alegre", d: "cor viva, leveza", bg: "#ffe9a8", fg: "#1f3c88", ac: "#ff6f91", font: "Syne", w: 700 },
  { k: "esportivo", l: "Esportivo e enérgico", d: "movimento, velocidade", bg: "#0f2a1d", fg: "#d6ff3c", ac: "#d6ff3c", font: "Bebas Neue", w: 400, up: true },
  { k: "artesanal", l: "Artesanal", d: "feito à mão, afetivo", bg: "#f3e6d3", fg: "#6b3b25", ac: "#c46a3c", font: "Caveat", w: 700 },
  { k: "tech", l: "Tecnológico", d: "preciso, geométrico", bg: "#eef1f5", fg: "#0d1b2a", ac: "#2f6bff", font: "Space Grotesk", w: 600 },
];
export const ESTILO_FONTS = Array.from(new Set(ESTILOS.map((e) => e.font)));

export const TIPOS_LOGO: { k: string; l: string; d: string; brief: string }[] = [
  { k: "nome", l: "Só o nome escrito", d: "o nome desenhado com uma letra própria", brief: "Só o nome (logotipo)" },
  { k: "simbolo", l: "Um símbolo junto do nome", d: "um desenho que acompanha o nome", brief: "Símbolo + nome" },
  { k: "iniciais", l: "As iniciais entrelaçadas", d: "um monograma, como em joias e ateliês", brief: "Monograma (iniciais)" },
  { k: "selo", l: "Um selo ou emblema", d: "tudo dentro de uma forma, como um carimbo", brief: "Emblema / selo" },
  { k: "aberto", l: "Não sei, quero sugestões", d: "você decide junto com a gente", brief: "Aberto a sugestões" },
];

export const CORES: { n: string; h: string }[] = [
  { n: "Branco", h: "#ffffff" }, { n: "Off-white", h: "#f3efe8" }, { n: "Nude", h: "#e6cfbf" }, { n: "Areia", h: "#d8c3a5" }, { n: "Rosa claro", h: "#f2c9cf" },
  { n: "Rosa", h: "#e48aa0" }, { n: "Terracota", h: "#c0603f" }, { n: "Vermelho", h: "#c9252c" }, { n: "Laranja", h: "#f08a24" }, { n: "Amarelo", h: "#f2c84b" },
  { n: "Dourado", h: "#c2a56b" }, { n: "Marrom", h: "#6b4a35" }, { n: "Verde-oliva", h: "#6e7444" }, { n: "Verde", h: "#2f7d4f" }, { n: "Verde-água", h: "#7fc8b8" },
  { n: "Azul claro", h: "#a9c8e8" }, { n: "Azul", h: "#2357a6" }, { n: "Azul-marinho", h: "#14264a" }, { n: "Lilás", h: "#b7a3d6" }, { n: "Roxo", h: "#5b2a86" },
  { n: "Cinza", h: "#9a9a9a" }, { n: "Grafite", h: "#3a3a3a" }, { n: "Preto", h: "#0e0e0e" },
];

export type RefImg = { id: string; img: string; tipo: "gosto" | "evitar"; note?: string };
export const blank = (v: any) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

/** texto legível de uma resposta (para resumo e revisão) */
export function answerText(q: Q, v: any): string {
  if (blank(v)) return "";
  if (q.type === "eixos") return Object.entries(v as Record<string, number>).map(([k, n]) => { const e = EIXOS_CLIENTE[k]; if (!e) return ""; return n < 40 ? e[0] : n > 60 ? e[1] : `entre ${e[0].toLowerCase()} e ${e[1].toLowerCase()}`; }).filter(Boolean).join(" · ");
  if (q.type === "estilos") return (v as string[]).map((k) => ESTILOS.find((e) => e.k === k)?.l || k).join(", ");
  if (q.type === "logo") return (v as string[]).map((k) => TIPOS_LOGO.find((e) => e.k === k)?.l || k).join(", ");
  if (q.type === "cores") return (v as string[]).join(", ");
  if (q.type === "imagens") return `${(v as RefImg[]).length} imagem(ns)`;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

const join = (...xs: any[]) => xs.filter((x) => !blank(x)).map((x) => (Array.isArray(x) ? x.join(", ") : x)).join("\n\n");

/** respostas do cliente → briefing interno da Criação de marca (campos em data.brief) e referências */
export function toBrief(a: any = {}) {
  const brief: any = {
    nome: a.marca_nome,
    oque: join(a.oque, a.servicos?.length ? `Principais produtos ou serviços: ${a.servicos.join(", ")}` : ""),
    proposito: join(a.historia, a.orgulho ? `Orgulho: ${a.orgulho}` : ""),
    publico: a.cliente,
    persona: join(a.dor ? `Procura: ${a.dor}` : "", a.sentir?.length ? `Quer se sentir: ${a.sentir.join(", ")}` : "", a.canais?.length ? `Chega por: ${a.canais.join(", ")}` : ""),
    concorrentes: a.concorrentes,
    diferencial: a.diferente,
    palavras: a.palavras,
    estilo: (a.tipo_logo || []).map((k: string) => TIPOS_LOGO.find((t) => t.k === k)?.brief).filter(Boolean),
    cores_gosta: a.cores_gosta,
    cores_evita: a.cores_evita,
    aplicacoes: a.onde,
    nao_e: a.nao_palavras,
    proibido: a.nao_quer ? [a.nao_quer] : undefined,
    eixos: a.eixos,
  };
  for (const k of Object.keys(brief)) if (blank(brief[k])) delete brief[k];
  const refs = [
    ...((a.refs || []) as RefImg[]).map((r) => ({ id: r.id, img: r.img, tipo: r.tipo, note: r.note ? `Cliente: ${r.note}` : "Enviada pelo cliente" })),
    ...((a.links || []) as string[]).filter((u) => /^https?:\/\//.test(u)).map((u, i) => ({ id: `l${i}${Date.now().toString(36)}`, url: u, tipo: "gosto" as const, note: "Link enviado pelo cliente" })),
  ];
  return { brief, refs };
}

/** briefing completo em texto (para colar no Claude ou ler de uma vez) */
export function answersText(a: any = {}) {
  const out: string[] = [];
  for (const e of ETAPAS) {
    const lines = e.qs.map((q) => { const t = answerText(q, a[q.k]); return t ? `- ${q.l}\n  ${t.replace(/\n/g, "\n  ")}` : ""; }).filter(Boolean);
    if (lines.length) out.push(`## ${e.t}\n${lines.join("\n")}`);
  }
  const refs = (a.refs || []) as RefImg[];
  const notas = refs.filter((r) => r.note).map((r) => `- ${r.tipo === "gosto" ? "Gosta" : "Não gosta"}: ${r.note}`);
  if (notas.length) out.push(`## Notas das referências\n${notas.join("\n")}`);
  return out.join("\n\n");
}

export const filledCount = (a: any = {}) => ETAPAS.flatMap((e) => e.qs).filter((q) => !blank(a[q.k])).length;
export const totalCount = ETAPAS.flatMap((e) => e.qs).length;
export const AXES_KEYS = AXES.map(([k]) => k);
