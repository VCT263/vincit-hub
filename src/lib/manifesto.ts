/**
 * Manifesto e diagnóstico de marca: o "documento mestre" de cada perfil ou marca.
 * Os mesmos campos (mesmas chaves) entram no briefing do Creator e no briefing da marca no Design,
 * para que conteúdo e identidade visual partam da mesma base e a pessoa não se perca a longo prazo.
 * Modelo e exemplo preenchido: Claude Doc "Modelo de manifesto e diagnóstico de marca".
 */
export type MField = { k: string; l: string; type?: "text" | "textarea" | "chips"; ph?: string; help?: string };

export const MANIFESTO_FIELDS: MField[] = [
  { k: "frase_mae", l: "Frase-mãe (posicionamento em 1 frase)", ph: "Ex.: Estratégia prática para transformar ambição em execução.", help: "Se a frase serve para qualquer pessoa, está genérica." },
  { k: "manifesto", l: "Manifesto (texto-base)", type: "textarea", ph: "O texto que vira vídeo inaugural, post fixado e norte de comunicação." },
  { k: "arquetipo", l: "Arquétipo dominante e secundário", ph: "Ex.: Estrategista prático e executador · secundário: disciplinado e resiliente" },
  { k: "territorio", l: "Território (o que a marca conecta)", type: "textarea", ph: "Ex.: integração entre mentalidade, marca e execução." },
  { k: "problema", l: "Problema que a marca resolve (diagnóstico)", type: "textarea", ph: "Ex.: as pessoas agem sem direção, executam sem estrutura e confundem movimento com avanço." },
  { k: "transformacao", l: "Transformação prometida", type: "chips", ph: "Ex.: clareza, método aplicável" },
  { k: "nao_e", l: "O que a marca NÃO é (anti-posicionamento)", type: "chips", ph: "Ex.: coach motivacional, guru, trend" },
  { k: "regras_ouro", l: "Regras de ouro", type: "chips", ph: "Ex.: nunca postar por hype" },
  { k: "framework", l: "Método ou framework próprio", type: "textarea", ph: "Ex.: Direção → Estrutura → Execução → Posicionamento → Percepção. Todo conteúdo encaixa em uma camada." },
  { k: "matriz_tom", l: "Matriz de tom de voz", type: "textarea", ph: "Ex.: 40% empresarial minimalista, 30% intelectual, 20% cinemático, 10% urbano." },
  { k: "estrutura", l: "Estrutura padrão do discurso", type: "textarea", ph: "Ex.: observação concreta → interpretação → estrutura → aplicação → fechamento reflexivo." },
  { k: "proibido", l: "Linguagem proibida", type: "chips", ph: "Ex.: \"você precisa…\", \"o segredo é…\"" },
  { k: "fechamento", l: "Padrão de fechamento", ph: "Ex.: gera clareza e responsabilidade, sem dar ordem." },
  { k: "postura", l: "Postura em vídeo", ph: "Ex.: olhar firme, voz estável, sem teatralizar." },
  { k: "indicadores", l: "Indicadores de que está funcionando", type: "chips", ph: "Ex.: salvamentos, compartilhamentos, DMs" },
  { k: "ritmo", l: "Ritmo de produção (ciclo)", type: "textarea", ph: "Ex.: ciclo de 15 dias: planeja, estrutura, produz, refina, publica, analisa." },
  { k: "visao", l: "Visão de 3 anos", type: "textarea", ph: "Ex.: ser referência em integração estratégica, com framework próprio consolidado." },
];

const filled = (v: any) => (Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim()));

/** texto do manifesto para o contexto da IA (vale para o Creator e para o Design) */
export function manifestoText(b: any): string {
  if (!b || typeof b !== "object") return "";
  return MANIFESTO_FIELDS.filter((f) => filled(b[f.k])).map((f) => `- ${f.l}: ${Array.isArray(b[f.k]) ? b[f.k].join("; ") : String(b[f.k]).replace(/\s+/g, " ").trim()}`).join("\n");
}
