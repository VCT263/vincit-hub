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

/** os 12 arquétipos de marca (Mark & Pearson), com como cada um se expressa */
export type Archetype = {
  k: string; l: string; d: string; visual: string; grupo: string;
  narrativa: string; verbal: string; palavras: string[]; nunca: string;
  forma: string; cores: string[]; fontes: string[]; foto: string; atracao: string; marcas: string; busca: string;
};
export const ARCH_GROUPS = [
  { k: "independencia", l: "Independência", d: "buscar o paraíso" },
  { k: "mudanca", l: "Mudança", d: "deixar uma marca no mundo" },
  { k: "pertencimento", l: "Pertencimento", d: "não estar só" },
  { k: "estabilidade", l: "Estabilidade", d: "dar estrutura ao mundo" },
];
export const ARCHETYPES: Archetype[] = [
  { k: "inocente", l: "Inocente", grupo: "independencia", d: "Otimismo, simplicidade, pureza.", visual: "cores claras, formas suaves, muito respiro",
    narrativa: "O mundo pode ser simples e bom; a marca devolve a leveza.", verbal: "Frases curtas, positivas, sem jargão.", palavras: ["simples", "leve", "puro", "bem-estar"], nunca: "Ironia, medo, complicação.",
    forma: "Curvas abertas, círculos, traço fino.", cores: ["#f7f4ec", "#bfe3d0", "#f2d7b6"], fontes: ["Nunito", "Figtree", "Fraunces"], foto: "Luz natural alta, branco, rostos tranquilos.", atracao: "Quem quer descomplicar.", marcas: "Dove, Natura Tododia", busca: "minimal pastel brand identity" },
  { k: "sabio", l: "Sábio", grupo: "independencia", d: "Conhecimento, verdade, análise.", visual: "serifas, azul profundo, grade rigorosa",
    narrativa: "A verdade liberta; a marca ensina a enxergar melhor.", verbal: "Didático, preciso, com dados e fontes.", palavras: ["entenda", "método", "evidência", "clareza"], nunca: "Exagero, promessa sem prova.",
    forma: "Grade rigorosa, linhas, diagramas.", cores: ["#0f2a44", "#e9e6df", "#c8a24a"], fontes: ["Newsreader", "IBM Plex Sans", "Libre Caslon Text"], foto: "Ambientes de estudo, detalhe, luz lateral.", atracao: "Quem decide com critério.", marcas: "Google, TED, The Economist", busca: "editorial serif brand identity" },
  { k: "explorador", l: "Explorador", grupo: "independencia", d: "Liberdade, descoberta, autenticidade.", visual: "tons terrosos, textura, fotografia ao ar livre",
    narrativa: "Há sempre um lugar novo; a marca é o equipamento da jornada.", verbal: "Convidativo, aventureiro, verbos de movimento.", palavras: ["descubra", "caminho", "livre", "rota"], nunca: "Conformismo, rotina, luxo vazio.",
    forma: "Linhas de horizonte, mapas, selos de expedição.", cores: ["#3f4a3c", "#c27c4e", "#e8dcc4"], fontes: ["Barlow Condensed", "Zilla Slab", "Archivo"], foto: "Ao ar livre, grão, grande angular.", atracao: "Quem não quer ficar parado.", marcas: "Patagonia, Jeep, The North Face", busca: "outdoor brand identity" },
  { k: "rebelde", l: "Rebelde", grupo: "mudanca", d: "Ruptura, provocação, mudança.", visual: "preto, contraste alto, tipografia experimental",
    narrativa: "As regras estão erradas; a marca quebra o que não funciona.", verbal: "Direto, provocador, frases de manifesto.", palavras: ["quebre", "sem filtro", "contra", "verdade"], nunca: "Pedir licença, linguagem corporativa.",
    forma: "Ângulos, cortes, tipografia distorcida, colagem.", cores: ["#0b0b0b", "#e10600", "#f2f2f2"], fontes: ["Anton", "Tanker", "Space Mono"], foto: "Flash duro, preto e branco, rua.", atracao: "Quem se sente de fora.", marcas: "Harley-Davidson, Diesel, Liquid Death", busca: "bold rebel brand identity" },
  { k: "mago", l: "Mago", grupo: "mudanca", d: "Transformação, visão, encanto.", visual: "roxo, gradiente sutil, formas que se transformam",
    narrativa: "O impossível acontece; a marca transforma quem chega.", verbal: "Inspirador, sensorial, fala de antes e depois.", palavras: ["transforme", "imagine", "revele", "magia"], nunca: "Literalidade, frieza técnica.",
    forma: "Formas que se transformam, simetria radial, brilho.", cores: ["#2b1a4a", "#8f6bd8", "#f1d4a8"], fontes: ["Cormorant Garamond", "Syne", "Instrument Serif"], foto: "Luz dramática, reflexos, névoa.", atracao: "Quem busca transformação.", marcas: "Disney, Apple (lançamentos), Dior J'adore", busca: "mystical brand identity" },
  { k: "heroi", l: "Herói", grupo: "mudanca", d: "Coragem, superação, performance.", visual: "cores fortes, peso tipográfico, ângulos",
    narrativa: "Todo desafio pode ser vencido; a marca prepara para a vitória.", verbal: "Imperativo, enérgico, frases de ação.", palavras: ["supere", "força", "conquiste", "agora"], nunca: "Hesitação, desculpa, vitimismo.",
    forma: "Diagonais, setas, peso, simetria forte.", cores: ["#0a1f44", "#ff4d00", "#ffffff"], fontes: ["Big Shoulders Display", "Archivo Black", "Inter"], foto: "Corpo em movimento, suor, contra-plongée.", atracao: "Quem quer provar do que é capaz.", marcas: "Nike, Gatorade, Under Armour", busca: "sport brand identity bold" },
  { k: "amante", l: "Amante", grupo: "pertencimento", d: "Desejo, intimidade, sensorialidade.", visual: "tons quentes, serifas de alto contraste, close",
    narrativa: "A vida é para ser sentida; a marca é prazer e cuidado consigo.", verbal: "Sensorial, íntimo, adjetivos de textura.", palavras: ["sinta", "toque", "desejo", "pele"], nunca: "Pressa, frieza, tom técnico.",
    forma: "Curvas, serifas finas, monograma entrelaçado.", cores: ["#5b1a1a", "#d9a38f", "#f3e7dc"], fontes: ["Bodoni Moda", "Playfair Display", "Italianno"], foto: "Close, pele, luz quente, foco suave.", atracao: "Quem quer se sentir desejado(a).", marcas: "Chanel, Victoria's Secret, Godiva", busca: "luxury sensual brand identity" },
  { k: "bobo", l: "Bobo da corte", grupo: "pertencimento", d: "Humor, leveza, irreverência.", visual: "cores vivas, letreiramento, ilustração",
    narrativa: "A vida é curta demais para ser chata; a marca diverte.", verbal: "Bem-humorado, trocadilhos, gírias da comunidade.", palavras: ["bora", "sem drama", "rolê", "zoeira"], nunca: "Formalidade, sermão.",
    forma: "Formas bobas, personagens, letras dançando.", cores: ["#ffcf00", "#ff5c8a", "#2b59ff"], fontes: ["Dela Gothic One", "Unbounded", "Caveat"], foto: "Cor saturada, flash, poses engraçadas.", atracao: "Quem quer leveza.", marcas: "M&M's, Old Spice, Duolingo", busca: "playful brand identity" },
  { k: "cara_comum", l: "Cara comum", grupo: "pertencimento", d: "Pertencimento, honestidade, proximidade.", visual: "sans amigável, cores acessíveis, foto real",
    narrativa: "Gente como a gente; a marca está do seu lado, sem pose.", verbal: "Conversa de vizinho, simples, honesto.", palavras: ["a gente", "de verdade", "junto", "pra todo dia"], nunca: "Arrogância, exclusividade.",
    forma: "Formas simples, carimbo, letra arredondada.", cores: ["#1f4e79", "#f2b134", "#f5f1e8"], fontes: ["Work Sans", "Poppins", "Roboto Slab"], foto: "Pessoas reais, casa, rua, sem retoque.", atracao: "Quem quer se ver na marca.", marcas: "Havaianas, IKEA, Magalu", busca: "friendly local brand identity" },
  { k: "cuidador", l: "Cuidador", grupo: "estabilidade", d: "Proteção, acolhimento, serviço.", visual: "tons suaves, formas arredondadas, humanista",
    narrativa: "Ninguém precisa passar por isso sozinho; a marca cuida.", verbal: "Acolhedor, paciente, empático.", palavras: ["cuidar", "com você", "seguro", "carinho"], nunca: "Frieza, pressa, culpa.",
    forma: "Abraço, formas arredondadas, contornos que envolvem.", cores: ["#7a8b5c", "#e9d8c4", "#c9895b"], fontes: ["Nunito Sans", "Fraunces", "Mulish"], foto: "Mãos, toque, luz quente, gestos de cuidado.", atracao: "Quem precisa de apoio.", marcas: "Johnson's Baby, Volvo, Natura", busca: "care brand identity warm" },
  { k: "governante", l: "Governante", grupo: "estabilidade", d: "Controle, liderança, exclusividade.", visual: "preto e metálico, simetria, serifa clássica",
    narrativa: "A excelência é um padrão; a marca é para quem lidera.", verbal: "Seguro, sóbrio, poucas palavras.", palavras: ["excelência", "padrão", "exclusivo", "legado"], nunca: "Gíria, promoção, improviso.",
    forma: "Simetria, brasão, monograma, molduras.", cores: ["#0d0d0d", "#b89b5e", "#efece6"], fontes: ["Cormorant Garamond", "Bodoni Moda", "Inter Tight"], foto: "Arquitetura, materiais nobres, composição central.", atracao: "Quem quer status e controle.", marcas: "Rolex, Mercedes-Benz, American Express", busca: "premium luxury brand identity" },
  { k: "criador", l: "Criador", grupo: "estabilidade", d: "Imaginação, originalidade, ofício.", visual: "paleta autoral, grafismos, processo à mostra",
    narrativa: "Se pode ser imaginado, pode ser feito; a marca dá ferramenta e palco.", verbal: "Autoral, curioso, mostra o processo.", palavras: ["crie", "feito à mão", "ideia", "autoral"], nunca: "Genérico, cópia, fórmula pronta.",
    forma: "Grafismos modulares, sistema que se recombina.", cores: ["#1b1b1b", "#ff6b35", "#f4efe6"], fontes: ["Clash Display", "Syne", "General Sans"], foto: "Processo, bancada, detalhe das mãos.", atracao: "Quem quer expressar algo próprio.", marcas: "LEGO, Adobe, Canva", busca: "creative studio brand identity" },
];
export const archetypeOf = (k?: string) => ARCHETYPES.find((a) => a.k === k);
/** hierarquia arquetípica: até 3 com porcentagem (predominante, secundário, apoio) */
export const ARCH_ROLES = ["Predominante", "Secundário", "Apoio"];
export function archetypeMix(s: any = {}): { a: Archetype; pct: number; role: string }[] {
  const ks: string[] = s.arquetipos || [];
  const def = [50, 30, 20];
  return ks.slice(0, 3).map((k, i) => ({ a: archetypeOf(k)!, pct: s.pesos?.[i] ?? def[i], role: ARCH_ROLES[i] })).filter((x) => x.a);
}

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
  const mix = archetypeMix(s);
  const t = (d.territories || []).find((x: any) => x.id === d.territory_id);
  return [
    n && `Nicho: ${n.l}. Códigos do nicho: ${n.codigos} Para se diferenciar: ${n.quebrar} Evitar: ${n.evitar}`,
    mix.length && `Arquétipos: ${mix.map((m) => `${m.a.l} ${m.pct}% (${m.role.toLowerCase()})`).join(", ")}. ${mix.map((m) => `${m.a.l}: narrativa "${m.a.narrativa}" verbal "${m.a.verbal}" visual "${m.a.forma} ${m.a.visual}"`).join(" | ")}`,
    s.ativ_verbal && `Ativação verbal: ${archetypeOf(s.ativ_verbal)?.l}. Ativação visual: ${archetypeOf(s.ativ_visual)?.l || archetypeOf(s.ativ_verbal)?.l}.`,
    s.missao && `Missão: ${s.missao}`,
    arr(s.pilares).length && `Pilares: ${arr(s.pilares).join("; ")}`,
    arr(s.fala).length && `A marca fala: ${arr(s.fala).join("; ")}`,
    arr(s.nunca).length && `A marca nunca fala: ${arr(s.nunca).join("; ")}`,
    t && `Território criativo escolhido: ${t.nome}. ${t.ideia} Forma: ${t.forma}. Cor: ${t.cor}. Tipografia: ${t.tipo}.`,
  ].filter(Boolean).join("\n");
}
