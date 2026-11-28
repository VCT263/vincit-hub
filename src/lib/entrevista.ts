/**
 * Entrevista de marca: uma entrevistadora que conversa com o dono da marca (por voz ou texto),
 * questiona respostas vagas e no fim propõe o briefing do perfil. Roda de dois jeitos, os dois
 * na assinatura do Claude de quem usa (sem API paga):
 *  - no HUB (/creator/entrevista): cada resposta vai pela fila de IA (tarefas entrevista_turno e
 *    entrevista_briefing em /api/ai);
 *  - no Claude da pessoa: prompt "entrevista_de_marca" e ferramentas entrevista_* do conector.
 * Tabela: public.brand_interviews. O briefing proposto só vale depois de aprovado na tela.
 */
import { BRIEFING, briefingText } from "@/lib/briefing";

export type Turno = { r: "e" | "p"; t: string; quem?: string; tema?: number; at?: string; via?: "hub" | "claude" };

export const TEMAS = [
  "Crença: o que a marca acredita que o mercado faz errado",
  "Problema: o que esse erro custa para o cliente, com um caso real",
  "Método: como a marca resolve, passo a passo, e se esse jeito tem nome",
  "Fronteira: o que a marca nunca seria e palavras que não usa",
  "Visão: onde a marca quer estar daqui a 2 ou 3 anos e como quer ser lembrada",
  "Cliente real: um exemplo de cliente com nome, idade, rotina e o que compra",
  "Personalidade da marca e como ela fala",
  "Produtos ou peças-chave do momento, com nome, preço e tamanhos",
  "Próxima campanha ou data forte (ex.: Natal): datas, entrega, frete, troca",
  "Oferta ou condição da campanha, com motivo e prazo",
  "Gravação: quem aparece nos vídeos e quando dá para gravar",
  "Referências: marcas ou perfis que admiram e por quê",
  "Meta do mês em número e quais sinais mostram que deu certo (salvamentos, mensagens, visitas)",
];

/** os 4 primeiros temas formam a corrente do manifesto: crença → problema → método → fronteira */
export const TEMAS_MANIFESTO = 4;

/** só os campos que a entrevista costuma preencher (o resto do briefing fica como está) */
export const CAMPOS_ENTREVISTA = ["frase_mae", "problema", "framework", "territorio", "regras_ouro", "indicadores", "visao", "persona", "arquetipo", "personalidade", "nao_e", "proibido", "evitar", "gosta", "oferta", "diferencial", "metas", "datas", "rosto", "postura", "matriz_tom", "transformacao", "dores", "desejos", "objecoes"];

/** campos que o Dossiê do perfil (prompt do conector) pode propor, além dos da entrevista: saem dos posts reais */
export const CAMPOS_DOSSIE = ["linguagem", "pilares", "formatos", "provas", "historias", "padrao", "oportunidades"];

const camposBriefing = () => BRIEFING.flatMap((s) => s.fields);

export function contextoPerfil(acc: any) {
  if (!acc) return "(perfil sem dados)";
  return [
    `Perfil: @${acc.username}${acc.name ? ` (${acc.name})` : ""}`,
    acc.niche ? `Nicho: ${acc.niche}` : "",
    acc.goals ? `Objetivos: ${acc.goals}` : "",
    acc.brand_voice ? `Voz da marca: ${acc.brand_voice}` : "",
    acc.briefing ? briefingText(acc.briefing) : "",
  ].filter(Boolean).join("\n").slice(0, 9000);
}

export const REGRAS_CONDUCAO = `Como conduzir:
- Uma pergunta por vez. No máximo 3 frases curtas, em português do Brasil falado, sem listas, sem emoji, sem markdown (a fala é lida em voz alta).
- Comece reagindo à última resposta em poucas palavras e só então pergunte.
- Tenha senso crítico. Se a resposta for vaga ("qualidade", "todo mundo", "atendimento diferenciado"), peça um exemplo concreto, um número ou um nome. Se contradisser o briefing, diga com gentileza e pergunte qual vale. Se a pessoa concordar rápido demais com algo marcado "a validar", peça um motivo ou um caso real.
- Não pergunte o que o briefing já responde com clareza; use o briefing para checar. Priorize o que está vazio ou marcado "a validar" / "estimativa".
- Não elogie à toa e não repita a resposta inteira. Aprofunde no máximo 2 vezes no mesmo tema; depois siga.
- Se a pessoa pedir para pular, siga para o próximo tema.
- Nos 4 primeiros temas (crença, problema, método, fronteira) a pessoa raramente tem a resposta pronta. Ajude a formular: devolva o que ouviu numa frase curta e pergunte se é isso. Crença boa diz o que o mercado erra; problema bom tem um caso real; método bom tem passos e, se possível, um nome; fronteira boa diz o que a marca recusa ser.
- Encerre depois de cobrir os temas (14 a 22 perguntas): agradeça e diga em uma frase o que vai virar briefing.`;

export const temasTexto = () => TEMAS.map((t, i) => `${i + 1}. ${t}`).join("\n");

export function transcricao(turnos: Turno[]) {
  return (turnos || []).map((x) => (x.r === "e" ? `Entrevistadora: ${x.t}` : `${x.quem || "Resposta"}: ${x.t}`)).join("\n").slice(-30000);
}

/** prompt de cada vez da entrevistadora (fila do HUB) */
export function promptTurno(acc: any, turnos: Turno[]) {
  return `Você é a entrevistadora de marca do VINCIT HUB, numa conversa ao vivo com o dono ou a equipe da marca. Seu trabalho é fechar o briefing do perfil.

Briefing atual (use para checar; não pergunte de novo o que já está claro):
${contextoPerfil(acc)}

Temas, nesta ordem, adaptando à conversa:
${temasTexto()}

${REGRAS_CONDUCAO}

Conversa até agora:
${transcricao(turnos) || "(ainda não começou: apresente-se em uma frase e faça a primeira pergunta)"}

Responda SOMENTE com JSON: {"fala": string, "tema": número de 1 a ${TEMAS.length}, "nota": "o que você aprendeu na última resposta, curto, ou vazio", "fim": boolean}`;
}

/** formato do briefing proposto pela entrevista (as mesmas chaves do briefing do Creator) */
export function esquemaBriefing() {
  const f = camposBriefing().filter((x) => CAMPOS_ENTREVISTA.includes(x.k));
  return f.map((x) => `"${x.k}": ${x.type === "chips" || x.type === "multi" ? "string[]" : "string"} // ${x.l}${x.options ? ` (uma de: ${x.options.join(" / ")})` : ""}`).join(",\n");
}

export function promptBriefing(acc: any, turnos: Turno[]) {
  return `Abaixo está a transcrição de uma entrevista de marca. Monte a proposta de atualização do briefing do perfil usando SÓ o que foi dito na entrevista (pode combinar com o briefing atual quando a pessoa confirmou). Não invente números, nomes, preços ou datas. Campo sem resposta na entrevista fica de fora. Frases diretas, em português do Brasil.
Manifesto: problema junta a crença e o custo para o cliente; framework descreve o método em camadas ou passos, com o nome que a pessoa deu; regras_ouro são 3 a 5 filtros do tipo "só publicar se..." tirados da fronteira; indicadores são os sinais que a pessoa citou na meta. A frase_mae (até 12 palavras: o que a marca faz e para quem muda o quê) pode ser síntese sua da crença e do método: termine com " (proposta)" se a pessoa não disse a frase.

Briefing atual:
${contextoPerfil(acc)}

Transcrição:
${transcricao(turnos)}

Responda SOMENTE com JSON:
{
"resumo": "3 frases sobre o que a entrevista mostrou",
"campos": {
${esquemaBriefing()}
},
"campanha": {"pecas": [{"nome": string, "preco": string, "tamanhos": string, "obs": string}], "datas": [string], "oferta": string, "gravacao": string, "meta": string},
"citacoes": ["até 5 frases ditas pela marca, literais"],
"pendencias": ["o que ficou sem resposta"]
}`;
}

/** limpa a proposta: só chaves conhecidas, tipos certos */
export function limparProposta(p: any) {
  const campos: Record<string, any> = {};
  const fs = camposBriefing().filter((x) => CAMPOS_ENTREVISTA.includes(x.k) || CAMPOS_DOSSIE.includes(x.k));
  for (const f of fs) {
    const v = p?.campos?.[f.k];
    if (f.type === "chips" || f.type === "multi") { const a = Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20) : []; if (a.length) campos[f.k] = a; }
    else if (v != null && String(v).trim()) campos[f.k] = String(v).trim().slice(0, 3000);
  }
  const arr = (x: any) => (Array.isArray(x) ? x.slice(0, 30) : []);
  return {
    resumo: String(p?.resumo || "").slice(0, 2000),
    campos,
    campanha: p?.campanha && typeof p.campanha === "object" ? { pecas: arr(p.campanha.pecas), datas: arr(p.campanha.datas).map(String), oferta: String(p.campanha.oferta || ""), gravacao: String(p.campanha.gravacao || ""), meta: String(p.campanha.meta || "") } : null,
    citacoes: arr(p?.citacoes).map(String),
    pendencias: arr(p?.pendencias).map(String),
  };
}

export const rotuloCampo = (k: string) => camposBriefing().find((f) => f.k === k)?.l || k;

/** texto do prompt do conector (aparece no Claude de quem liga o VINCIT HUB) */
export function promptConector(perfil?: string) {
  return `Quero fazer a entrevista de marca do VINCIT HUB${perfil ? ` do perfil ${perfil}` : ""}.

1. Chame listar_perfis${perfil ? "" : " e me pergunte qual perfil, se houver mais de um"}; depois chame entrevista_abrir com o perfil_id. Ela traz o briefing atual, os temas, as regras e a conversa que já existir.
2. Conduza a entrevista comigo, uma pergunta por vez, seguindo as regras que vierem em entrevista_abrir (senso crítico, perguntas curtas, sem listas). Se eu estiver no modo de voz, fale como numa conversa.
3. A cada resposta minha, chame entrevista_registrar com a sua pergunta, a minha resposta e quem respondeu, sem me pedir confirmação.
4. Quando os temas estiverem cobertos ou eu disser "encerrar", mostre o briefing proposto e, com o meu ok, chame entrevista_concluir. O HUB mostra a proposta para aprovação antes de mudar o briefing.`;
}
