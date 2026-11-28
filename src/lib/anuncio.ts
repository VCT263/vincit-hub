/**
 * Regras de anúncio (28/11): quando o card é anúncio, valem estas regras no lugar das de conteúdo orgânico.
 * O card mostra a lista e o conector do Claude manda segui-las ao escrever o roteiro.
 */
export type AdBrief = { objetivo?: string; publico?: string; oferta?: string; botao?: string; ganchos?: string; texto?: string; titulo?: string };

export const AD_OBJETIVOS = ["Mensagens no WhatsApp", "Vendas no site", "Tráfego para o perfil", "Reconhecimento"];
export const AD_BOTOES = ["Enviar mensagem", "Comprar agora", "Saiba mais", "Ver mais", "Cadastre-se"];

export const AD_RULES = [
  "Gancho visual no 1º segundo: o produto ou a dor já aparecem, sem abertura de marca.",
  "Oferta e motivo nos 3 primeiros segundos; um anúncio, uma oferta.",
  "Legenda embutida em toda fala: a maioria assiste sem som.",
  "15 a 30 s em 9:16. Texto e rosto fora da zona de botões (14% de cima e 35% de baixo livres).",
  "Prova concreta: cliente real, número com referência ou demonstração da peça.",
  "Um CTA só, igual ao botão do anúncio (ex.: Enviar mensagem).",
  "3 variações de gancho para testar; o resto do vídeo é o mesmo.",
  "Texto principal curto (até 125 caracteres antes do 'mais') e título com até 40.",
  "Sem hashtags e sem horário de publicação: o anúncio roda pelo orçamento.",
  "Políticas da Meta: nada de antes/depois de corpo, nem pergunta sobre atributo pessoal (\"Você está acima do peso?\").",
];

/** texto das regras para o conector e para os prompts */
export const AD_RULES_TEXT = AD_RULES.map((r, i) => `${i + 1}. ${r}`).join(" ");
