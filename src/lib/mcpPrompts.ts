/**
 * Prompts prontos do conector VINCIT HUB. Aparecem no Claude de quem liga o conector e são
 * servidos pelo HUB a cada pedido: quando o texto muda aqui, todo cliente recebe a versão nova
 * sem reinstalar. Tudo roda na assinatura do Claude de quem usa.
 */
import { promptConector } from "@/lib/entrevista";

type Arg = { name: string; description: string; required?: boolean };
export type McpPrompt = { name: string; title: string; description: string; arguments: Arg[]; text: (a: Record<string, string>) => string };

const perfilArg: Arg = { name: "perfil", description: "@ do perfil (opcional)", required: false };
const s = (v: any, n = 80) => (v ? String(v).slice(0, n) : "");

export const PROMPTS: McpPrompt[] = [
  {
    name: "criar_pagina", title: "Criar página",
    description: "Cria ou ajusta uma página, landing ou site no Design › Páginas e sites, com prévia e aprovação do cliente no HUB.",
    arguments: [{ name: "pagina", description: "nome ou id da página (opcional)", required: false }],
    text: (a) => `Vamos trabalhar em Páginas e sites do VINCIT HUB${a.pagina ? ` (${s(a.pagina, 80)})` : ""}. Chame paginas_pendentes (sem id para ver a lista e depois com o id da página certa). Siga a skill_criar_paginas que vem no resultado: se for a primeira versão, me mostre a ficha da página (objetivo, público, oferta e prova, seções em ordem, tom, destino) e espere meu ok; se for ajuste, leia os comentários abertos e o pedido e mexa só no que foi pedido. Escreva cada tela como HTML completo, celular primeiro, com a marca do manual e as fotos que vierem. Revise o texto contra os vícios de IA e grave com salvar_pagina, marcando os comentários atendidos. No fim, me mande o link do HUB e o link do cliente.`,
  },
  {
    name: "comecar_no_hub", title: "Começar no HUB",
    description: "Carrega sua conta, perfis, manual da marca, pendências e as novidades de IA do VINCIT HUB.",
    arguments: [],
    text: () => `Vamos trabalhar no VINCIT HUB. Chame comecar_no_hub (o resultado aparece como o painel da VINCIT aqui na conversa, com o botão Atualizar; se o painel não aparecer, me passe o link painel.completo) e me mostre, em poucas linhas: quem sou eu no HUB, meus perfis (com o quanto do briefing está pronto e se há manual da marca), o que está pendente e as novidades de IA desde a última vez. Depois sugira o próximo passo mais útil para esta semana e pergunte o que eu quero fazer.`,
  },
  {
    name: "dossie_do_perfil", title: "Dossiê do perfil",
    description: "Lê os posts e os comentários reais do perfil e devolve o que funcionou (ganchos, palavras, temas) e uma proposta de briefing para aprovar no HUB.",
    arguments: [perfilArg],
    text: (a) => `Monte o Dossiê do perfil${a.perfil ? ` ${s(a.perfil, 60)}` : ""}. Chame listar_perfis, ler_desempenho com 90 dias e ler_comentarios (se o perfil estiver conectado). Só com números e textos reais, escreva:
1. Os 5 posts que mais seguraram (compartilhamentos e salvamentos por alcance, tempo assistido), com o gancho de cada (a primeira linha da legenda) e o número que justifica.
2. Os padrões de abertura que funcionaram e os que morreram.
3. As palavras e expressões que o perfil e o público mais usam.
4. Os temas mais salvos e compartilhados e as perguntas que o público repete.
5. O que repetir e o que parar.
6. Manifesto contra os posts: se o briefing tiver manifesto (frase-mãe, problema, método/framework, o que não é, regras de ouro, indicadores), passe por cada elo da corrente (crença, problema, método, fronteira, voz, visual, rotina, prova) e diga se os posts sustentam, contradizem ou ignoram, citando um post. Aponte os 2 elos mais fracos e o que publicar para fortalecer cada um. Não peça de novo o que o briefing já tem.
Mostre e, com o meu ok, grave com salvar_analise (título "Dossiê do perfil"). Depois proponha só os campos do briefing que os posts sustentam (linguagem, pilares, formatos, provas, historias, padrao, oportunidades e, se ficar claro, dores, desejos e objecoes): chame entrevista_abrir com nova=true e entrevista_concluir com resumo começando por "Dossiê do perfil:" e citacoes com os ganchos que funcionaram. O briefing só muda quando eu aprovar na tela Entrevista do HUB.`,
  },
  {
    name: "plano_do_mes", title: "Plano do mês",
    description: "Monta o mês de conteúdo a partir dos posts que funcionaram e das perguntas sem resposta nos comentários, e manda para o Quadro.",
    arguments: [perfilArg, { name: "mes", description: "Ex.: dezembro (opcional)", required: false }],
    text: (a) => `Monte o plano${a.mes ? ` de ${s(a.mes, 30)}` : " do próximo mês"}${a.perfil ? ` do perfil ${s(a.perfil, 60)}` : ""}. Chame listar_perfis (siga briefing, aprendizados e manual da marca), ler_desempenho com 90 dias, ler_comentarios e listar_conteudos do período para não repetir o que já está no Quadro. Cada peça leva data, tipo/pilar (em marca de moda, o mix de 4 tipos e 1 peça fora do padrão por semana), formato, gancho falado e CTA. Cada gancho responde uma pergunta real do público (cite qual) ou repete um padrão que funcionou (cite o post e o número). Mostre o mês em tabela e, com o meu ok, envie com enviar_campanha.`,
  },
  {
    name: "pacote_da_semana", title: "Pacote da semana",
    description: "Monta a semana de conteúdo de um perfil (roteiro, legenda, CTA e estilo de edição) completando os cards do Quadro.",
    arguments: [perfilArg, { name: "semana", description: "Ex.: Natal, semana 1 (opcional)", required: false }],
    text: (a) => `Monte o pacote da semana${a.semana ? ` "${s(a.semana)}"` : ""}${a.perfil ? ` do perfil ${s(a.perfil, 60)}` : ""} seguindo as regras do conector VINCIT HUB: listar_perfis, listar_conteudos da semana, completar os cards que já existem e criar só o que faltar. Mostre tudo junto com a checklist de revisão e grave só depois do meu ok.`,
  },
  {
    name: "analise_do_perfil", title: "Análise do perfil",
    description: "Lê o desempenho real do perfil e entrega uma análise com o que fazer nas próximas 2 semanas.",
    arguments: [perfilArg, { name: "dias", description: "Período em dias (padrão 30)", required: false }],
    text: (a) => `Analise o desempenho${a.perfil ? ` do perfil ${s(a.perfil, 60)}` : ""} nos últimos ${Number(a.dias) > 0 ? Number(a.dias) : 30} dias com ler_desempenho. Comece por compartilhamentos e salvamentos por alcance, views e tempo assistido; cite só números reais. Feche com o que repetir, o que parar e 3 ideias para as próximas 2 semanas. Me mostre e, com o meu ok, grave com salvar_analise.`,
  },
  {
    name: "refazer_aberturas", title: "Refazer aberturas",
    description: "Acha os Reels que seguraram menos que a mediana e propõe 3 ganchos novos e como reeditar só os primeiros segundos.",
    arguments: [perfilArg],
    text: (a) => `Revise os Reels${a.perfil ? ` do perfil ${s(a.perfil, 60)}` : ""} com ler_desempenho de 30 dias. Pegue os publicados há 7 dias ou mais que ficaram abaixo da mediana do período em compartilhamentos e salvamentos por alcance ou em tempo assistido (no máximo 5). Para cada um: por que a abertura não segurou, com os números; 3 ganchos novos falados em até 1,5 s, seguindo briefing, aprendizados e manual da marca; e como reeditar só os 3 primeiros segundos com o que já foi gravado (corte, texto na tela, B-roll). Mostre e, com o meu ok, envie com enviar_ideias, uma ideia por Reel com o título "Nova abertura: <título do Reel>" e formato Reel.`,
  },
  {
    name: "responder_pedidos_ia", title: "Responder pedidos de IA",
    description: "Responde os pedidos que os botões de IA do HUB deixaram na fila; o resultado volta para a tela que pediu.",
    arguments: [],
    text: () => `Chame listar_pedidos_ia e responda cada pedido pendente com responder_pedido_ia, seguindo as instruções e o formato de cada prompt (só JSON quando pedido). No fim, diga quantos respondeu.`,
  },
  {
    name: "entrevista_de_marca", title: "Entrevista de marca",
    description: "Conversa (por voz ou texto) que entrevista o dono da marca, questiona respostas vagas e propõe o briefing do perfil no HUB.",
    arguments: [perfilArg],
    text: (a) => promptConector(a.perfil ? s(a.perfil, 60) : undefined),
  },
];
