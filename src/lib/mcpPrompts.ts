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
    name: "comecar_no_hub", title: "Começar no HUB",
    description: "Carrega sua conta, perfis, manual da marca, pendências e as novidades de IA do VINCIT HUB.",
    arguments: [],
    text: () => `Vamos trabalhar no VINCIT HUB. Chame comecar_no_hub e me mostre, em poucas linhas: quem sou eu no HUB, meus perfis (com o quanto do briefing está pronto e se há manual da marca), o que está pendente e as novidades de IA desde a última vez. Depois sugira o próximo passo mais útil para esta semana e pergunte o que eu quero fazer.`,
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
