import { AXES, harmony, type Swatch } from "./design";
import { ARCHETYPES, type Archetype } from "./brand-strategy";
import { TYPE_GUIDE } from "./brand-knowledge";

/* Briefing de marca para o cliente responder sem login (link público /b/<token>).
   As perguntas são as do briefing interno da Criação de marca, reescritas sem termos técnicos,
   com perguntas extras que tiram mais do cliente (história, sensações, "se fosse uma pessoa",
   o que não quer de jeito nenhum, marca anterior). toBrief() converte para o briefing interno. */

export type QType = "text" | "textarea" | "chips" | "multi" | "single" | "eixos" | "estilos" | "cores" | "imagens" | "logo" | "arquetipo" | "roda" | "letras" | "letra_eixos";
export type Q = { k: string; l: string; help?: string; ph?: string; type?: QType; options?: string[]; sugest?: string[]; max?: number; req?: boolean };
export type Etapa = { k: string; t: string; d: string; qs: Q[] };

export const ETAPAS: Etapa[] = [
  { k: "voce", t: "Para começar", d: "O básico, para a gente saber com quem está falando.", qs: [
    { k: "seu_nome", l: "Qual é o seu nome?", req: true, ph: "Seu nome" },
    { k: "marca_nome", l: "Como a sua marca se chama?", help: "Escreva exatamente do jeito que você quer ver no logo, com maiúsculas e minúsculas.", req: true, ph: "Ex.: Ateliê Lume" },
    { k: "nome_extra", l: "Existe algum nome que aparece no CNPJ, no contrato ou numa sigla e que NÃO deve entrar no logo?", ph: "Ex.: Lume Comércio de Moda Ltda." },
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
  { k: "cliente", t: "Quem é o seu cliente", d: "A marca é feita para atrair as pessoas certas. Pense em quem você mais gosta de atender e marque o que tem a ver.", qs: [
    { k: "pub_quem", l: "Quem você mais atende?", type: "multi", options: ["Mulheres", "Homens", "Todos os públicos", "Casais", "Famílias", "Mães e pais", "Crianças", "Empresas"] },
    { k: "pub_idade", l: "Qual a idade dessas pessoas?", type: "multi", help: "Pode marcar mais de uma faixa.", options: ["Até 17", "18 a 24", "25 a 34", "35 a 44", "45 a 54", "55 ou mais"] },
    { k: "pub_bolso", l: "Quanto o seu cliente costuma investir?", type: "single", options: ["Busca preço acessível", "Paga um pouco mais por qualidade", "Alto padrão: não olha tanto o preço", "Luxo: quer exclusividade"] },
    { k: "pub_gostos", l: "Do que essas pessoas gostam?", type: "multi", help: "Marque os interesses que mais aparecem nos seus clientes.", options: ["Academia e esporte", "Corrida e ar livre", "Viagens", "Moda", "Beleza e autocuidado", "Bem-estar e saúde", "Gastronomia", "Vinho e café", "Arte e cultura", "Música e festa", "Casa e decoração", "Natureza", "Leitura", "Tecnologia", "Carreira e negócios", "Maternidade", "Pets", "Espiritualidade"] },
    { k: "cliente", l: "Quer contar mais sobre essa pessoa?", type: "textarea", help: "Com as suas palavras: rotina, o que valoriza, onde passa o tempo.", ph: "Ex.: mulher de 25 a 35 anos, ativa, viaja, cuida de si sem exagero." },
    { k: "dor", l: "O que essa pessoa procura quando chega até você?", type: "textarea", ph: "O problema que você resolve ou o desejo que você realiza." },
    { k: "sentir", l: "Como você quer que o cliente se sinta depois de te conhecer?", type: "chips", sugest: ["Confiante", "Cuidada", "Acolhida", "Bonita", "Leve", "Especial", "Segura", "Inspirada", "Livre", "Bem resolvida"] },
    { k: "canais", l: "Por onde as pessoas te encontram hoje?", type: "multi", options: ["Instagram", "Indicação", "Google", "Espaço físico", "WhatsApp", "Site", "TikTok", "Eventos"] },
  ] },
  { k: "mercado", t: "Você e o mercado", d: "Olhar para os outros ajuda a decidir o que seguir e o que evitar.", qs: [
    { k: "concorrentes", l: "Quem faz algo parecido com você?", type: "chips", ph: "Nome ou @ do Instagram, aperte Enter" },
    { k: "diferente", l: "O que você faz diferente deles?", type: "textarea" },
    { k: "admira", l: "Marcas que você admira, de qualquer área, e por quê", type: "textarea", ph: "Ex.: Aesop, pelo jeito calmo e sofisticado. Nike, pela energia." },
  ] },
  { k: "defende", t: "O que você defende", d: "Marcas fortes acreditam em alguma coisa. Responda do seu jeito, sem medo de soar simples.", qs: [
    { k: "crenca", l: "O que você acha que muita gente faz errado no seu mercado?", type: "textarea", ph: "Ex.: as lojas vendem para um corpo só e a cliente sai achando que o problema é ela." },
    { k: "custo", l: "E o que isso custa para o seu cliente? Conte um caso real, se tiver.", type: "textarea", ph: "Ex.: uma cliente comprou três calças pela internet e devolveu todas." },
    { k: "jeito", l: "Como você resolve isso? Explique o seu jeito, passo a passo.", type: "textarea", help: "Se esse jeito tiver um nome, escreva também.", ph: "Ex.: a gente separa a peça no tamanho certo antes de a cliente chegar e ajusta na hora." },
    { k: "lembrado", l: "Daqui a 3 anos, que frase você quer ouvir de um cliente sobre a sua marca?", ph: "Ex.: “lá eu sempre acho o meu número e saio me sentindo bonita”." },
  ] },
  { k: "personalidade", t: "A personalidade", d: "Imagine que a sua marca é uma pessoa. Como ela é?", qs: [
    { k: "arq", l: "Arraste o ponto para onde a sua marca mora", type: "arquetipo", help: "Toda marca forte tem uma personalidade parecida com a de um personagem. Mova o ponto e veja quem a sua marca vai virando." },
    { k: "eixos", l: "Arraste cada linha para o lado que mais combina com a marca", type: "eixos" },
    { k: "palavras", l: "Escolha até 5 palavras que a marca precisa transmitir", type: "chips", max: 5, sugest: ["Refinada", "Leve", "Natural", "Moderna", "Delicada", "Confiante", "Acolhedora", "Sofisticada", "Jovem", "Atemporal", "Ousada", "Minimalista", "Alegre", "Elegante", "Autêntica", "Intencional"] },
    { k: "nao_palavras", l: "E o que ela NÃO pode parecer?", type: "chips", sugest: ["Barata", "Fria", "Infantil", "Genérica", "Exagerada", "Antiquada", "Séria demais", "Pesada", "Artificial"] },
    { k: "pessoa", l: "Se a sua marca fosse uma pessoa, como ela seria?", type: "textarea", help: "Como se veste, como fala, onde passa o fim de semana.", ph: "Ex.: uma mulher de 30 anos, camisa de linho, fala baixo, corre na praia de manhã." },
    { k: "lugar", l: "E se fosse um lugar?", ph: "Ex.: um hotel pequeno em Comporta, luz de fim de tarde." },
  ] },
  { k: "visual", t: "O visual", d: "Aqui não precisa saber de design. Marque o que te chama atenção.", qs: [
    { k: "estilos", l: "Quais estilos têm mais a ver com a sua marca?", type: "estilos", help: "Pode marcar mais de um." },
    { k: "tipo_logo", l: "Como você imagina o logo?", type: "logo" },
    { k: "nao_quer", l: "Tem algo que você NÃO quer de jeito nenhum?", type: "textarea", req: true, help: "Uma forma, um símbolo, uma palavra no logo, um estilo. Isso evita surpresa ruim lá na frente.", ph: "Ex.: não quero símbolo em arco, não quero a palavra “esteticista” no logo, nada de marrom pesado." },
    { k: "onde", l: "Onde a marca vai aparecer?", type: "multi", options: ["Instagram", "Site / loja online", "Embalagem / sacola", "Etiqueta", "Fachada", "Cartão de visita", "Uniforme", "Vídeo"] },
  ] },
  { k: "cores_letras", t: "Cores e letras", d: "Cor e tipo de letra mudam completamente o que a marca transmite. Explore à vontade: não existe escolha errada.", qs: [
    { k: "cores_gosta", l: "Cores que você gosta para a marca", type: "cores" },
    { k: "paletas", l: "Brinque com a roda de cores", type: "roda", help: "Arraste o ponto pela roda e escolha um jeito de combinar. As outras cores vêm junto. Gostou? Salve a paleta (até 3)." },
    { k: "cores_evita", l: "Cores que você não quer", type: "cores" },
    { k: "letras", l: "Que tipo de letra combina com a sua marca?", type: "letras", help: "Cada família de letra passa uma sensação. Toque nas que combinam (pode marcar mais de uma)." },
    { k: "letra_eixos", l: "E o jeito da letra?", type: "letra_eixos", help: "Dentro de cada tipo, pequenos detalhes mudam tudo. Arraste para o lado que combina mais." },
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
/* ── arquétipos: roda de Mark & Pearson em 4 quadrantes; o ponto do cliente vira uma mistura de até 3 ── */
export const QUADRANTES = [
  { k: "independencia", l: "Liberdade", d: "buscar o próprio caminho", x: 0, y: 0 },
  { k: "mudanca", l: "Transformação", d: "deixar uma marca no mundo", x: 1, y: 0 },
  { k: "estabilidade", l: "Estrutura", d: "dar ordem e segurança", x: 0, y: 1 },
  { k: "pertencimento", l: "Conexão", d: "estar junto, sentir", x: 1, y: 1 },
];
/** ângulo (graus, 0 = direita, sentido anti-horário) de cada arquétipo na roda */
const ARQ_ANG: Record<string, number> = { inocente: 165, sabio: 135, explorador: 105, rebelde: 75, mago: 45, heroi: 15, amante: -15, bobo: -45, cara_comum: -75, cuidador: -105, criador: -135, governante: -165 };
/** posição do arquétipo no quadro (0..1, y para baixo) */
export function arqPos(k: string) { const a = (ARQ_ANG[k] * Math.PI) / 180; return { x: .5 + .33 * Math.cos(a), y: .5 - .31 * Math.sin(a) }; }
/** mistura de arquétipos a partir do ponto (x, y em 0..1): até 3, somando 100% */
/** traços de personalidade em linguagem do dia a dia, para o cliente se reconhecer em cada arquétipo */
export const TRACOS: Record<string, { jeito: string[]; seVe: string[]; fala: string }> = {
  inocente: { jeito: ["otimista", "simples", "honesta", "leve", "acolhedora"], seVe: ["Acredita que o bem vence e gosta das coisas sem complicação.", "Prefere a verdade dita com carinho a um discurso esperto."], fala: "\u201cÉ simples: faz bem e pronto.\u201d" },
  sabio: { jeito: ["curiosa", "criteriosa", "calma", "didática", "confiável"], seVe: ["Pesquisa antes de decidir e gosta de explicar o porquê das coisas.", "Prefere provar com fatos a prometer demais."], fala: "\u201cDeixa eu te mostrar como funciona.\u201d" },
  explorador: { jeito: ["livre", "aventureira", "inquieta", "autêntica", "independente"], seVe: ["Fica entediada com rotina e quer sempre conhecer o novo.", "Valoriza ser dona do próprio caminho."], fala: "\u201cBora ver o que tem do outro lado?\u201d" },
  rebelde: { jeito: ["ousada", "direta", "provocadora", "corajosa", "sem filtro"], seVe: ["Questiona o jeito de sempre e não pede licença para fazer diferente.", "Prefere dividir opiniões a ser mais uma igual às outras."], fala: "\u201cIsso aí não funciona. A gente faz diferente.\u201d" },
  mago: { jeito: ["visionária", "encantadora", "intuitiva", "transformadora", "misteriosa"], seVe: ["Gosta de ver a cara de surpresa das pessoas com o resultado.", "Acredita que dá para transformar a vida de alguém."], fala: "\u201cImagina como vai ficar depois.\u201d" },
  heroi: { jeito: ["determinada", "forte", "disciplinada", "competitiva", "focada"], seVe: ["Gosta de desafio e de mostrar resultado.", "Puxa as pessoas para darem o seu melhor."], fala: "\u201cVocê consegue. Vamos juntos até o fim.\u201d" },
  amante: { jeito: ["sensível", "sedutora", "elegante", "calorosa", "detalhista"], seVe: ["Cuida de cada detalhe para a experiência ser bonita e marcante.", "Quer que a pessoa se sinta especial e desejada."], fala: "\u201cVocê merece se sentir assim.\u201d" },
  bobo: { jeito: ["divertida", "espontânea", "bem-humorada", "leve", "irreverente"], seVe: ["Tira sorriso das pessoas e não leva tudo tão a sério.", "Acha que comprar e trabalhar pode ser gostoso."], fala: "\u201cA vida já é séria demais, né?\u201d" },
  cara_comum: { jeito: ["próxima", "pé no chão", "sincera", "prática", "amiga"], seVe: ["Fala de igual para igual, sem pose nem frescura.", "Quer que todo mundo se sinta bem-vindo."], fala: "\u201cÉ gente como a gente.\u201d" },
  cuidador: { jeito: ["atenciosa", "protetora", "paciente", "generosa", "presente"], seVe: ["Lembra do nome, do problema e da história de cada cliente.", "Se sente bem quando o outro está bem cuidado."], fala: "\u201cPode deixar comigo, eu cuido de você.\u201d" },
  criador: { jeito: ["criativa", "original", "caprichosa", "artística", "imaginativa"], seVe: ["Faz questão de ter a própria assinatura em tudo.", "Prefere fazer do zero a copiar o que já existe."], fala: "\u201cFiz pensando só em você.\u201d" },
  governante: { jeito: ["segura", "exigente", "sofisticada", "organizada", "líder"], seVe: ["Gosta de padrão alto, de ordem e de tudo no lugar.", "Quer passar a sensação de que está no controle."], fala: "\u201cAqui é o melhor. Sem improviso.\u201d" },
};

export function arqMix(p?: { x: number; y: number }): { a: Archetype; pct: number }[] {
  if (!p) return [];
  const sc = ARCHETYPES.map((a) => { const q = arqPos(a.k); const d2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; return { a, s: Math.exp(-d2 / .02) }; }).sort((m, n) => n.s - m.s).slice(0, 3);
  const tot = sc.reduce((t, m) => t + m.s, 0) || 1;
  const pct = sc.map((m) => Math.round((m.s / tot) * 20) * 5);
  pct[0] += 100 - pct.reduce((t, n) => t + n, 0);
  return sc.map((m, i) => ({ a: m.a, pct: pct[i] })).filter((m) => m.pct >= 5);
}

/* ── roda de cores (como o Adobe Color): cor base + regra de combinação ── */
export const REGRAS = [
  { k: "analoga", l: "Vizinhas", d: "cores lado a lado na roda: calma e harmonia" },
  { k: "mono", l: "Um tom só", d: "variações da mesma cor: elegante e sóbria" },
  { k: "complementar", l: "Opostas", d: "cores de lados opostos: contraste e energia" },
  { k: "triade", l: "Três pontas", d: "três cores espaçadas: viva e equilibrada" },
];
export type Paleta = { base: string; regra: string; cores: string[] };
export const paletaDe = (base: string, regra: string): Swatch[] => harmony(base, regra);

/* ── tipos de letra explicados para quem não é designer ── */
export const LETRAS = TYPE_GUIDE;
export const LETRA_EIXOS: { k: string; l: string; d: string; aL: string; zL: string; a: { t: string; f: string; w?: number; it?: boolean; up?: boolean; ls?: string }; z: { t: string; f: string; w?: number; it?: boolean; up?: boolean; ls?: string } }[] = [
  { k: "peso", aL: "fina", zL: "forte", l: "Peso", d: "Fina passa delicadeza e preço alto. Forte passa energia e juventude.", a: { t: "Marca", f: "Jost", w: 400 }, z: { t: "Marca", f: "Archivo Black", w: 400 } },
  { k: "largura", aL: "estreita", zL: "larga", l: "Largura", d: "Estreita é vertical e urgente. Larga é calma e luxuosa.", a: { t: "MARCA", f: "Bebas Neue" }, z: { t: "Marca", f: "Unbounded", w: 400 } },
  { k: "contraste", aL: "traço com contraste", zL: "traço igual", l: "Contraste do traço", d: "Traço grosso ao lado de fino lembra moda e revista. Traço igual é neutro e moderno.", a: { t: "Marca", f: "Bodoni Moda", w: 400 }, z: { t: "Marca", f: "Jost", w: 400 } },
  { k: "inclinacao", aL: "reta", zL: "inclinada", l: "Inclinação", d: "Reta passa firmeza. Inclinada (itálico) traz gesto e movimento.", a: { t: "Marca", f: "Cormorant Garamond", w: 500 }, z: { t: "Marca", f: "Cormorant Garamond", w: 500, it: true } },
  { k: "caixa", aL: "maiúsculas", zL: "minúsculas", l: "Maiúsculas ou minúsculas", d: "Maiúsculas espaçadas soam caras e silenciosas. Minúsculas soam próximas.", a: { t: "MARCA", f: "Jost", w: 400, ls: ".28em" }, z: { t: "marca", f: "Jost", w: 400 } },
];
export const ESTILO_FONTS = Array.from(new Set([...ESTILOS.map((e) => e.font), ...LETRAS.map((l) => l.ex), ...LETRA_EIXOS.flatMap((e) => [e.a.f, e.z.f])]));

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
  if (q.type === "arquetipo") return arqMix(v).map((m) => `${m.a.l} ${m.pct}%`).join(", ");
  if (q.type === "roda") return (v as Paleta[]).map((p, i) => `Paleta ${i + 1}: ${p.cores.join(" ")}`).join(" · ");
  if (q.type === "letras") return (v as string[]).map((k) => LETRAS.find((l) => l.k === k)?.l || k).join(", ");
  if (q.type === "letra_eixos") return Object.entries(v as Record<string, number>).map(([k, n]) => { const e = LETRA_EIXOS.find((x) => x.k === k); return e ? `${e.l}: ${n < 40 ? e.aL : n > 60 ? e.zL : "meio-termo"}` : ""; }).filter(Boolean).join(" · ");
  return Array.isArray(v) ? v.join(", ") : String(v);
}

const join = (...xs: any[]) => xs.filter((x) => !blank(x)).map((x) => (Array.isArray(x) ? x.join(", ") : x)).join("\n\n");

/** respostas do cliente → briefing interno da Criação de marca (campos em data.brief) e referências */
export function toBrief(a: any = {}) {
  const brief: any = {
    nome: a.marca_nome,
    oque: join(a.oque, a.servicos?.length ? `Principais produtos ou serviços: ${a.servicos.join(", ")}` : ""),
    proposito: join(a.historia, a.orgulho ? `Orgulho: ${a.orgulho}` : ""),
    publico: join([a.pub_quem?.join(", "), a.pub_idade?.length ? `${a.pub_idade.join(", ")} anos` : ""].filter(Boolean).join(" · "), a.cliente),
    persona: join(a.dor ? `Procura: ${a.dor}` : "", a.sentir?.length ? `Quer se sentir: ${a.sentir.join(", ")}` : "", a.canais?.length ? `Chega por: ${a.canais.join(", ")}` : "", a.pub_gostos?.length ? `Interesses: ${a.pub_gostos.join(", ")}` : "", a.pub_bolso ? `Investimento: ${a.pub_bolso}` : ""),
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
    problema: join(a.crenca, a.custo ? `O que custa para o cliente: ${a.custo}` : ""),
    framework: a.jeito,
    visao: a.lembrado ? `Quer ouvir do cliente: ${a.lembrado}` : undefined,
  };
  for (const k of Object.keys(brief)) if (blank(brief[k])) delete brief[k];
  const refs = [
    ...((a.refs || []) as RefImg[]).map((r) => ({ id: r.id, img: r.img, tipo: r.tipo, note: r.note ? `Cliente: ${r.note}` : "Enviada pelo cliente" })),
    ...((a.links || []) as string[]).filter((u) => /^https?:\/\//.test(u)).map((u, i) => ({ id: `l${i}${Date.now().toString(36)}`, url: u, tipo: "gosto" as const, note: "Link enviado pelo cliente" })),
  ];
  const mix = arqMix(a.arq);
  const strategy = mix.length ? { arquetipos: mix.map((m) => m.a.k), pesos: mix.map((m) => m.pct) } : undefined;
  const p0 = (a.paletas || [])[0] as Paleta | undefined;
  const palette = p0 ? paletaDe(p0.base, p0.regra) : undefined;
  return { brief, refs, strategy, palette };
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
