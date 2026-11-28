/** Textos de ajuda do HUB: ícone "?" ao lado dos títulos e passos do tour do primeiro login. */

export type Dica = { titulo: string; texto: string; passos?: string[] };

/** Ajuda de cada tela, pela rota. Vale o prefixo mais longo que bater com a página aberta. */
export const AJUDA_TELA: Record<string, Dica> = {
  "/": { titulo: "Seu dia", texto: "O resumo do dia: o que está atrasado, a agenda de hoje, o que publicar e gravar. Comece por aqui toda manhã.", passos: ["Resolva primeiro o que está em vermelho.", "Tarefas com prazo vão para o Google Agenda se ele estiver conectado.", "Segunda é dia de planejar a semana em Rotina; sexta, de revisar."] },
  "/tarefas": { titulo: "Tarefas e projetos", texto: "Lista do que fazer, separada por espaço e por projeto. Tarefa com prazo aparece na Agenda e no resumo do dia.", passos: ["Use a caixa de entrada para anotar rápido e organize depois.", "Abra um projeto para ver as tarefas e os dados de entrega."] },
  "/agenda": { titulo: "Agenda", texto: "Compromissos, captações, entregas, recebimentos e tarefas com prazo num calendário só.", passos: ["Um compromisso pode se repetir e virar tarefa.", "Com o Google Agenda conectado (Minha conta), os eventos vão e voltam sozinhos."] },
  "/rotina": { titulo: "Rotina da semana", texto: "Segunda você planeja a semana; sexta você revisa o que foi feito e o que fica para a próxima." },
  "/projetos": { titulo: "Projetos", texto: "Cada trabalho de cliente com etapas, datas de captação e entrega, revisões e tarefas." },
  "/avisos": { titulo: "Avisos", texto: "Tudo que precisa da sua atenção: prazos vencidos, cobranças, revisões demais e pedidos do Claude. O sino no topo mostra os novos." },

  "/creator": { titulo: "Creator", texto: "Onde o conteúdo nasce e é acompanhado: perfis com briefing, Quadro de produção, criação e desempenho.", passos: ["Comece por Perfis & briefing.", "Cada conteúdo é um card no Quadro e anda pelas etapas: ideia, roteiro, gravação, edição, publicação e análise."] },
  "/creator/perfis": { titulo: "Perfis & briefing", texto: "A base de tudo. Cada perfil de trabalho (sua marca, Vinst, ISYS) tem nicho, objetivos, voz da marca e briefing. A IA usa isso para criar e analisar.", passos: ["Conecte o Instagram pelo botão Conectar via Meta para puxar as métricas.", "Preencha o briefing antes de pedir campanhas ao Claude."] },
  "/creator/producao": { titulo: "Quadro de produção", texto: "Todo conteúdo da ideia ao post publicado. Arraste o card entre os status; o quadro avisa o que falta para avançar.", passos: ["Abra o card para ver roteiro, legenda, teleprompter, decupagem e ordem do dia.", "O botão Próximo passo leva direto à próxima etapa.", "Campanhas criadas no Claude chegam aqui como cards."] },
  "/creator/pauta": { titulo: "Calendário do Quadro", texto: "O mesmo Quadro de produção, por data. Arraste para mudar o dia de publicação ou gere a semana com IA a partir do briefing." },
  "/creator/laboratorio": { titulo: "Laboratório", texto: "Onde a ideia vira texto: crie com IA, use uma carta de formato, chame um especialista e revise antes de mandar ao Quadro." },
  "/creator/brainstorm": { titulo: "Brainstorm", texto: "Quadro em branco para pensar livre: post-its, setas, imagens e desenho. Salva sozinho." },
  "/creator/desempenho": { titulo: "Desempenho", texto: "Métricas reais do Instagram de cada perfil. Olhe primeiro compartilhamentos e salvamentos por alcance, views e tempo assistido.", passos: ["Precisa do Instagram conectado em Perfis & briefing."] },
  "/creator/diagnostico": { titulo: "Raio-X e estratégia", texto: "Diagnóstico do perfil em 5 eixos de crescimento, só com dados reais. Vira prioridades e um plano de 30/60/90 dias." },
  "/creator/referencias": { titulo: "Referências", texto: "Estude perfis e posts que funcionaram. A IA desmonta o que deu certo e adapta para o seu briefing; mande as melhores ideias para o Quadro." },
  "/creator/tendencias": { titulo: "Tendências", texto: "Pesquisa o que está em alta no seu nicho. Pedidos com pesquisa na web são respondidos no chat do Claude." },
  "/creator/agendar": { titulo: "Agendar publicações", texto: "Agende posts, carrosséis, Reels e Stories. O HUB publica no horário marcado e move o card do Quadro para Publicado. O horário sugerido é o pico dos seus seguidores online." },
  "/creator/automacoes": { titulo: "Automações", texto: "Respostas automáticas no direct e publicações agendadas no Instagram. Só funciona com o Instagram conectado." },
  "/creator/estrategia": { titulo: "Estratégia de crescimento", texto: "Plano de 30/60/90 dias feito do briefing, das métricas e do último Raio-X." },

  "/audiovisual": { titulo: "Audiovisual", texto: "Gravação e edição: teleprompter, decupagem, ordem do dia, banco de mídia no Drive, editor e Premiere. Roteiros e datas vêm do Quadro do Creator." },
  "/audiovisual/teleprompter": { titulo: "Teleprompter", texto: "Puxa o roteiro do card. Feito para o celular: segue a sua voz e pode ser controlado de outro aparelho pelo link de controle." },
  "/audiovisual/decupagem": { titulo: "Decupagem", texto: "Quebra o roteiro em planos para gravar. A lista vai para a ordem do dia e para o set." },
  "/audiovisual/ordem-do-dia": { titulo: "Ordem do dia", texto: "Cada diária com horário, local, equipe, equipamento, planos e checklist. A equipe abre pelo link no celular, sem login." },
  "/audiovisual/midia": { titulo: "Banco de mídia", texto: "Sua pasta do Google Drive vira o acervo: Técnico (trilhas, efeitos, LUTs) e Meus conteúdos.", passos: ["Precisa do Google conectado em Minha conta.", "Escolha a pasta raiz do Drive e sincronize."] },
  "/audiovisual/kit": { titulo: "Kit de estilo", texto: "Cores, letras e legendas de cada marca para o editor e o Premiere. Dá para copiar de uma marca do Design." },
  "/audiovisual/luts": { titulo: "Biblioteca de LUTs", texto: "Prévia de como cada LUT deixa o vídeo, separada por marca (Blackmagic, Kodak, Canon, Sony, Fujifilm). O arquivo original é baixado no site oficial.", passos: ["Escolha a marca e a LUT e compare antes e depois.", "Baixe pelo link oficial e, se quiser conferir, use Testar a LUT que baixei."] },
  "/audiovisual/premiere": { titulo: "Premiere com o Claude", texto: "O plugin do Premiere manda a timeline para o HUB; o Claude devolve o plano de edição e o plugin aplica.", passos: ["Baixe o plugin (.ccx) e instale com dois cliques.", "Abra o painel VINCIT HUB no Premiere e entre com o login do HUB."] },
  "/audiovisual/editor": { titulo: "Editor", texto: "Edição rápida no navegador com legenda, câmera que segue a fala e o Kit de estilo da marca." },
  "/audiovisual/ferramentas": { titulo: "Ferramentas", texto: "Para resolver problemas pontuais, como recuperar vídeo que não abre. Tudo roda no seu computador." },

  "/design": { titulo: "Design", texto: "Crie marcas do briefing ao manual e monte carrosséis e peças com o kit da marca.", passos: ["Mande um briefing pelo link, o cliente responde no celular.", "A marca pronta alimenta Peças, Mockups e o Kit de estilo do Audiovisual."] },
  "/design/marcas": { titulo: "Criação de marca", texto: "Briefing, referências, logo, cores, tipografia e manual. Salva sozinho e dá para voltar a qualquer etapa." },
  "/design/pecas": { titulo: "Carrosséis e peças", texto: "Escolha um modelo, troque textos e fotos e exporte em PNG com as cores e a logo da marca." },
  "/design/mockups": { titulo: "Mockups", texto: "Fotos profissionais em que a logo e as cores da marca entram sozinhas." },
  "/design/briefings": { titulo: "Briefings", texto: "Crie um link, mande para o cliente e a resposta vira projeto de marca com um toque." },

  "/ecommerce": { titulo: "E-commerce", texto: "Plano de 90 dias da loja: metas, ações e campanhas. Vendas, caixa e estoque continuam na Nuvemshop e no Nuvem Moda." },
  "/ecommerce/plano": { titulo: "Plano do trimestre", texto: "Meta mínima, meta e super meta por mês. Comece pela venda do mesmo mês do ano passado." },
  "/ecommerce/acoes": { titulo: "Ações e campanhas", texto: "Duas datas por mês, cada uma com objetivo e meta. A pauta da campanha vai para o Quadro do Creator." },
  "/ecommerce/inteligencia": { titulo: "Inteligência do negócio", texto: "Quem é a cliente, o que comprar, quanto cobrar e o que os concorrentes fazem." },
  "/ecommerce/lancamento": { titulo: "Lançamento da loja", texto: "Checklist com prazo contado a partir do dia D da loja online." },

  "/agency": { titulo: "Gestor", texto: "A operação da produtora: clientes, propostas, financeiro, equipe e equipamentos." },
  "/agency/clientes": { titulo: "Clientes", texto: "Cadastro, ficha e onboarding de cada cliente." },
  "/agency/propostas": { titulo: "Propostas", texto: "Monte o orçamento, gere o texto e mande um link para o cliente aceitar online." },
  "/agency/financeiro": { titulo: "Financeiro", texto: "Contas, lançamentos, recorrências, relatórios e cobranças com Pix." },
  "/agency/funil": { titulo: "Funil de vendas", texto: "Cada oportunidade do primeiro contato ao fechamento." },
  "/agency/equipe": { titulo: "Equipe", texto: "Quem faz parte do time, diárias e produtividade." },
  "/agency/equipamentos": { titulo: "Equipamentos", texto: "Inventário, reservas por projeto e manutenção." },

  "/conta": { titulo: "Minha conta", texto: "Seus dados, integrações (Claude, Google, Arc Route), notificações, widget, senha e lixeira. O guia de configuração mostra o que falta." },
  "/conta/configurar": { titulo: "Guia de configuração", texto: "O que precisa estar ligado para o HUB funcionar e o que é opcional, com o estado de cada item na sua conta." },
  "/conta/lixeira": { titulo: "Lixeira", texto: "Tudo que você exclui pede a sua senha e fica aqui por 15 dias. Depois disso some de vez." },
};

/** Ajuda de partes da tela (cartões de Minha conta e afins). */
export const AJUDA: Record<string, Dica> = {
  claude: { titulo: "Conector do Claude", texto: "Os botões de IA do HUB não usam API paga: viram um pedido na fila e o Claude responde pela sua assinatura, pelo conector VINCIT HUB.", passos: ["Adicione o conector uma vez no Claude (passos abaixo).", "Deixe o painel do HUB aberto numa aba do Claude com Responder automaticamente ligado.", "Campanhas, roteiros e análises longas você pede direto no chat do Claude, e ele grava no HUB."] },
  google: { titulo: "Google Agenda e Drive", texto: "Um login do Google liga a Agenda (compromissos e tarefas com prazo vão e voltam) e o Drive (Banco de mídia do Audiovisual)." },
  arc: { titulo: "Arc Route", texto: "Liga as tarefas e a agenda do Arc Route às do HUB. Opcional: só se você usa o Arc Route." },
  push: { titulo: "Notificações", texto: "Instale o HUB como app e receba avisos no celular e no computador. Opcional, mas ajuda a não perder prazo." },
  widget: { titulo: "Widget", texto: "Mostra o dia na tela inicial do celular ou do Mac por um calendário assinável. Opcional." },
  marca: { titulo: "Personalização", texto: "Cor e logo da sua marca no sistema. Opcional." },
  senha: { titulo: "Senha", texto: "Use pelo menos 9 caracteres, uma letra maiúscula e um número. A senha também confirma as exclusões." },
  lixeira: { titulo: "Lixeira", texto: "Toda exclusão pede a sua senha e vai para a lixeira por 15 dias, com opção de recuperar." },
};

export function ajudaDaTela(path: string): Dica | null {
  let best: string | null = null;
  for (const k of Object.keys(AJUDA_TELA)) {
    const hit = k === "/" ? path === "/" : path === k || path.startsWith(k + "/");
    if (hit && (!best || k.length > best.length)) best = k;
  }
  return best ? AJUDA_TELA[best] : null;
}

/** Fluxo de trabalho do HUB, mostrado no tour e no guia. */
export const FLUXO = ["Plano", "Ação", "Conteúdo", "Gravação", "Edição", "Publicação", "Análise", "Fechamento"];

export type PassoTour = { alvo?: string; titulo: string; texto: string; fluxo?: boolean; fim?: boolean };

/** Passos do tour do primeiro login. `alvo` é o data-tour do elemento destacado; sem alvo (ou alvo escondido) o pop-up fica no centro. */
export const TOUR: PassoTour[] = [
  { titulo: "Bem-vindo ao VINCIT HUB", texto: "Aqui você planeja, produz e analisa o trabalho de cada cliente num lugar só. Em um minuto mostramos o caminho." },
  { titulo: "Um fluxo só", texto: "Todo trabalho anda pelas mesmas etapas. Cada área do HUB cuida de uma parte, e o card do conteúdo leva os dados de uma etapa para a outra.", fluxo: true },
  { alvo: "hub-/", titulo: "Seu dia", texto: "Comece por aqui toda manhã: atrasados, agenda de hoje, o que gravar e publicar. Tarefas, Agenda, Rotina e Avisos ficam no menu dessa área." },
  { alvo: "hub-/ecommerce", titulo: "E-commerce: o plano", texto: "Metas do trimestre e ações da loja (como o Natal da ISYS). A pauta da campanha vira cards no Quadro do Creator." },
  { alvo: "hub-/creator", titulo: "Creator: o conteúdo", texto: "Perfis com briefing, Quadro de produção e desempenho. Cada conteúdo é um card que anda da ideia até a análise de 7 dias." },
  { alvo: "hub-/audiovisual", titulo: "Audiovisual: gravar e editar", texto: "Teleprompter no celular, decupagem, ordem do dia, Banco de mídia no Drive, editor e Premiere. Tudo puxa o roteiro do card." },
  { alvo: "hub-/design", titulo: "Design: a marca", texto: "Marca do briefing ao manual, carrosséis e mockups. As cores e letras da marca seguem para as peças e para o vídeo." },
  { alvo: "hub-/agency", titulo: "Gestor: a operação", texto: "Clientes, propostas, financeiro e equipe da produtora." },
  { titulo: "A IA é o Claude", texto: "Os botões de IA criam um pedido e o Claude responde pela sua assinatura, sem custo extra. Para isso, ligue o conector VINCIT HUB no Claude e deixe o painel do HUB aberto numa aba. Criação longa você pede no chat do Claude, e ele grava aqui." },
  { alvo: "sino", titulo: "Avisos", texto: "O sino mostra prazos vencidos, cobranças e o que precisa de você." },
  { alvo: "lixeira", titulo: "Lixeira", texto: "Excluir sempre pede a sua senha e manda para a lixeira por 15 dias. Dá para recuperar." },
  { alvo: "conta", titulo: "Minha conta", texto: "Integrações, notificações, senha e o botão para refazer este tour quando quiser." },
  { titulo: "Pronto para começar", texto: "Veja no guia o que falta ligar na sua conta. Em cada tela, o ícone ? ao lado do título explica o uso.", fim: true },
];

export const TOUR_KEY = "vh_tour_done";
