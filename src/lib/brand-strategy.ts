/** Estratégia de marca: nichos, arquétipos e posicionamento (base para a criação ser intencional). */

export type Niche = { k: string; l: string; codigos: string; quebrar: string; cores: string[]; fontes: string; formas: string; busca: string[]; evitar: string };

/** códigos visuais de cada nicho: o que o público já reconhece e onde dá para se diferenciar */
export const NICHES: Niche[] = [
  { k: "moda", l: "Moda e vestuário", codigos: "Logotipos tipográficos, muito espaço em branco, foto editorial em primeiro plano.", quebrar: "Assinatura manuscrita ou monograma com personalidade, sistema de etiquetas como peça de marca.", cores: ["#111111", "#efe9e1", "#b7a58c", "#6b705c"], fontes: "Serifas de alto contraste (Didone) ou grotescas finas; script para assinatura.", formas: "Monograma, logotipo com espaçamento largo, etiqueta.", busca: ["womenswear brand identity", "fashion branding", "quiet luxury identity"], evitar: "Cabide, silhueta de mulher, rosa-chiclete por padrão." },
  { k: "beleza", l: "Beleza e estética", codigos: "Tons de pele, nude e rosé, serifas delicadas, embalagens limpas.", quebrar: "Cor saturada única, tipografia geométrica e linguagem clínica e honesta.", cores: ["#f3e6dc", "#c99a86", "#3b2f2f", "#e8d5c4"], fontes: "Serifa suave ou sans geométrica leve.", formas: "Formas orgânicas, gotas, arcos.", busca: ["skincare branding", "beauty clinic identity", "aesthetic clinic logo"], evitar: "Rosto feminino em traço, folha genérica, brilho dourado em tudo." },
  { k: "alimentacao", l: "Alimentação e bebidas", codigos: "Cores quentes e apetitosas, ilustração, selos e carimbos.", quebrar: "Sistema tipográfico forte, cor inesperada (azul, verde frio), padrões a partir do símbolo.", cores: ["#c8553d", "#f2c14e", "#2d3047", "#fbf3e6"], fontes: "Grotescas pesadas, serifas expressivas, letreiramento.", formas: "Selo, emblema, mascote, padrão.", busca: ["restaurant branding", "coffee shop identity", "bakery brand identity"], evitar: "Chapéu de chef, garfo e faca cruzados, xícara com fumaça." },
  { k: "saude", l: "Saúde e clínicas", codigos: "Azul e verde, cruz, coração, formas arredondadas.", quebrar: "Paleta quente e humana, foto real, tom de voz próximo.", cores: ["#2a6f97", "#a9d6e5", "#f5f3ee", "#1b263b"], fontes: "Sans humanista legível (alta clareza).", formas: "Símbolo abstrato simples, monograma.", busca: ["clinic branding", "healthcare identity", "dental clinic logo"], evitar: "Cruz, estetoscópio, batimento cardíaco." },
  { k: "tecnologia", l: "Tecnologia e SaaS", codigos: "Azul-violeta, gradiente, sans geométrica, ícone em bloco.", quebrar: "Serifa, cor terrosa, ilustração feita à mão, nome sem ícone.", cores: ["#4361ee", "#7209b7", "#0b0d17", "#f1f5f9"], fontes: "Grotescas e geométricas; mono como apoio.", formas: "Símbolo modular, letra construída em grade.", busca: ["saas brand identity", "tech startup branding", "fintech identity"], evitar: "Circuito, nuvem, lâmpada, engrenagem." },
  { k: "educacao", l: "Educação e cursos", codigos: "Cores primárias, livro, capelo, linguagem infantil.", quebrar: "Editorial e adulto, tipografia forte, cor única marcante.", cores: ["#264653", "#e9c46a", "#f4a261", "#fefae0"], fontes: "Sans amigável + serifa editorial.", formas: "Monograma, marca tipográfica, grafismo de sublinhado.", busca: ["education brand identity", "online course branding", "school rebranding"], evitar: "Capelo, livro aberto, lâmpada." },
  { k: "imobiliario", l: "Arquitetura e imóveis", codigos: "Linhas retas, preto e dourado, casas e telhados.", quebrar: "Materiais (madeira, concreto) como cor, tipografia leve, foto de vida e não de prédio.", cores: ["#2b2b2b", "#d9d4c7", "#a47551", "#556b2f"], fontes: "Sans geométrica leve ou serifa clássica.", formas: "Logotipo, monograma, grade construtiva.", busca: ["architecture studio branding", "real estate identity", "interior design brand"], evitar: "Telhado, chave, prédio em silhueta." },
  { k: "servicos", l: "Serviços e consultoria", codigos: "Azul-marinho, sans neutra, ícone abstrato de seta/crescimento.", quebrar: "Personalidade do fundador, cor quente, assinatura com voz própria.", cores: ["#14213d", "#fca311", "#e5e5e5", "#000000"], fontes: "Sans neutra + serifa para títulos.", formas: "Logotipo, monograma, ícone de seta só se tiver ideia.", busca: ["consulting brand identity", "law firm branding", "agency identity"], evitar: "Seta para cima, aperto de mão, gráfico de barras." },
  { k: "fitness", l: "Fitness e esporte", codigos: "Preto e neon, itálico, peso tipográfico alto, energia.", quebrar: "Calma e bem-estar, cores suaves, ritmo de respiração.", cores: ["#0b0b0b", "#c6ff00", "#ff4d00", "#f2f2f2"], fontes: "Condensadas pesadas e itálicas.", formas: "Símbolo dinâmico, monograma em itálico.", busca: ["gym branding", "sports brand identity", "pilates studio branding"], evitar: "Haltere, silhueta musculosa, raio." },
  { k: "audiovisual", l: "Audiovisual e criativo", codigos: "Preto, tipografia experimental, play/câmera, granulado.", quebrar: "Sistema rígido e editorial, cor de assinatura única, motion como identidade.", cores: ["#000000", "#18f2b2", "#efefef", "#094231"], fontes: "Display com personalidade + sans neutra.", formas: "Logotipo forte, símbolo que anima, grafismo de enquadramento.", busca: ["production company branding", "film studio identity", "creative studio logo"], evitar: "Claquete, rolo de filme, botão de play." },
  { k: "pet", l: "Pet", codigos: "Patinhas, cores vibrantes, ilustração fofa.", quebrar: "Elegância, paleta sóbria, humor na comunicação.", cores: ["#ffb703", "#219ebc", "#023047", "#fff8ef"], fontes: "Rounded sans e letreiramento.", formas: "Mascote, símbolo simpático.", busca: ["pet brand identity", "veterinary clinic branding", "pet food packaging"], evitar: "Patinha, osso, coração com pata." },
  { k: "varejo", l: "Varejo e loja local", codigos: "Cores fortes de promoção, preço grande, logotipo com sombra.", quebrar: "Sistema limpo e reconhecível, sacola e etiqueta como mídia.", cores: ["#d62828", "#003049", "#fcbf49", "#eae2b7"], fontes: "Grotesca robusta, fácil em fachada.", formas: "Logotipo + selo, padrão para sacola.", busca: ["retail store branding", "boutique identity", "concept store branding"], evitar: "Carrinho de compras, etiqueta de preço como símbolo." },
];

/** os 12 arquétipos de marca (Mark & Pearson) */
export const ARCHETYPES: { k: string; l: string; d: string; visual: string }[] = [
  { k: "inocente", l: "Inocente", d: "Otimismo, simplicidade, pureza.", visual: "cores claras, formas suaves, muito respiro" },
  { k: "sabio", l: "Sábio", d: "Conhecimento, verdade, análise.", visual: "serifas, azul profundo, grade rigorosa" },
  { k: "explorador", l: "Explorador", d: "Liberdade, descoberta, autenticidade.", visual: "tons terrosos, textura, fotografia ao ar livre" },
  { k: "rebelde", l: "Rebelde", d: "Ruptura, provocação, mudança.", visual: "preto, contraste alto, tipografia experimental" },
  { k: "mago", l: "Mago", d: "Transformação, visão, encanto.", visual: "roxo, gradiente sutil, formas que se transformam" },
  { k: "heroi", l: "Herói", d: "Coragem, superação, performance.", visual: "cores fortes, peso tipográfico, ângulos" },
  { k: "amante", l: "Amante", d: "Desejo, intimidade, sensorialidade.", visual: "tons quentes, serifas de alto contraste, close" },
  { k: "bobo", l: "Bobo da corte", d: "Humor, leveza, irreverência.", visual: "cores vivas, letreiramento, ilustração" },
  { k: "cara_comum", l: "Cara comum", d: "Pertencimento, honestidade, proximidade.", visual: "sans amigável, cores acessíveis, foto real" },
  { k: "cuidador", l: "Cuidador", d: "Proteção, acolhimento, serviço.", visual: "tons suaves, formas arredondadas, humanista" },
  { k: "governante", l: "Governante", d: "Controle, liderança, exclusividade.", visual: "preto e metálico, simetria, serifa clássica" },
  { k: "criador", l: "Criador", d: "Imaginação, originalidade, ofício.", visual: "paleta autoral, grafismos, processo à mostra" },
];

export const MAP_AXES: [string, string, string][] = [
  ["preco", "Acessível", "Premium"],
  ["tom", "Tradicional", "Inovadora"],
  ["emocao", "Racional", "Emocional"],
  ["energia", "Calma", "Intensa"],
];

export const SCALES = [
  { k: 1.125, l: "Segunda maior (1,125): discreta, para muito texto" },
  { k: 1.25, l: "Terça maior (1,25): equilibrada" },
  { k: 1.333, l: "Quarta justa (1,333): editorial" },
  { k: 1.5, l: "Quinta justa (1,5): impacto" },
  { k: 1.618, l: "Proporção áurea (1,618): dramática" },
];

export function strategyText(d: any = {}) {
  const s = { ...(d.brief || {}), ...(d.strategy || {}) };
  const arr = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
  const n = NICHES.find((x) => x.k === s.nicho);
  const a = ARCHETYPES.filter((x) => (s.arquetipos || []).includes(x.k)).map((x) => x.l);
  const t = (d.territories || []).find((x: any) => x.id === d.territory_id);
  return [
    n && `Nicho: ${n.l}. Códigos do nicho: ${n.codigos} Para se diferenciar: ${n.quebrar} Evitar: ${n.evitar}`,
    a.length && `Arquétipos: ${a.join(" + ")}`,
    s.missao && `Missão: ${s.missao}`,
    arr(s.pilares).length && `Pilares: ${arr(s.pilares).join("; ")}`,
    arr(s.fala).length && `A marca fala: ${arr(s.fala).join("; ")}`,
    arr(s.nunca).length && `A marca nunca fala: ${arr(s.nunca).join("; ")}`,
    t && `Território criativo escolhido: ${t.nome}. ${t.ideia} Forma: ${t.forma}. Cor: ${t.cor}. Tipografia: ${t.tipo}.`,
  ].filter(Boolean).join("\n");
}
