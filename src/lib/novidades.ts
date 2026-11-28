/**
 * Novidades de IA do VINCIT HUB. O conector entrega esta lista ao Claude de cada pessoa
 * (ferramenta comecar_no_hub / novidades) e Minha conta mostra a mesma lista.
 * Ao publicar uma mudança de IA (prompt, ferramenta, regra do conector), acrescente um item
 * NO TOPO e suba VERSAO_IA: o Claude de cada cliente conta a novidade na próxima conversa.
 */
export type Novidade = { versao: string; data: string; titulo: string; texto: string };

export const NOVIDADES: Novidade[] = [
  { versao: "2026.11.28-7", data: "2026-11-28", titulo: "Manifesto da marca na entrevista, no dossiê e no manual", texto: "A entrevista de marca agora começa pela corrente do manifesto: crença (o que o mercado erra), problema, método e fronteira, e propõe frase-mãe, problema, método, regras de ouro e indicadores. O \"Dossiê do perfil\" compara o manifesto com os posts e aponta os 2 elos mais fracos. No manual entram as páginas Como a marca pensa e Direção de conteúdo, e ao agendar um post o HUB mostra as regras de ouro do perfil e avisa se a legenda usa linguagem proibida." },
  { versao: "2026.11.28-6", data: "2026-11-28", titulo: "Painel da VINCIT dentro da conversa", texto: "Ao chamar \"Começar no HUB\", o Claude desenha o painel da VINCIT aqui na conversa: perfis com o briefing pronto em %, manual da marca, pendências e as novidades de IA com o selo Novo. O botão Atualizar puxa tudo de novo na hora, e os botões levam ao pacote da semana, à entrevista de marca, à análise do perfil e ao HUB. Se o painel não aparecer, desligue e ligue o conector VINCIT HUB de novo." },
  { versao: "2026.11.28-5", data: "2026-11-28", titulo: "Dossiê, aprendizados e pauta tirada dos comentários", texto: "Prompt \"Dossiê do perfil\": o Claude lê os posts e comentários reais, mostra os ganchos e temas que funcionaram e propõe campos do briefing para aprovar na tela Entrevista. Toda correção sua pode virar regra no campo Aprendizados do briefing (registrar_aprendizado), e toda IA do HUB passa a seguir. A ferramenta ler_comentarios traz as perguntas sem resposta do público para o prompt \"Plano do mês\", e o prompt \"Refazer aberturas\" propõe 3 ganchos novos para os Reels abaixo da mediana." },
  { versao: "2026.11.28-4", data: "2026-11-28", titulo: "Card pronto para publicar e anúncio com regras próprias", texto: "O roteiro já chega ao Quadro com legenda, hashtags, horário sugerido de publicação, direção para o editor e pedido para o Motion. O agendamento usa o horário e as hashtags do card, e o Editor e o Motion abrem com a direção no pedido. Quando a peça é anúncio, o card troca legenda e horário por objetivo, público, oferta, botão, 3 ganchos para testar e texto do anúncio, e o Claude segue as regras de anúncio." },
  { versao: "2026.11.28-3", data: "2026-11-28", titulo: "Roteiro com fala, direção e B-roll separados", texto: "Em vídeo, o enviar_roteiro recebe as cenas plano a plano, com a fala (vai para o teleprompter), a direção de gravação (plano, câmera e estilo da cena) e o B-roll em campos separados. A folha do roteiro técnico do set mostra as três coisas em colunas e junta o B-roll numa lista para gravar à parte." },
  { versao: "2026.11.28-2", data: "2026-11-28", titulo: "Começar no HUB e prompts prontos", texto: "Ao ligar o conector, use o prompt \"Começar no HUB\": o Claude carrega sua conta, perfis, manual da marca e pendências. Há prompts prontos para pacote da semana, análise do perfil, pedidos de IA e entrevista de marca. As regras e os prompts se atualizam sozinhos a cada versão do HUB." },
  { versao: "2026.11.28-1", data: "2026-11-28", titulo: "Entrevista de marca por voz", texto: "Uma entrevistadora conversa com o dono da marca, questiona respostas vagas e propõe o briefing do perfil. Funciona no HUB (Creator › Perfis & briefing › Entrevista por voz, com botão de áudio) e aqui no Claude, pelo prompt \"Entrevista de marca\". O briefing só muda depois de aprovado no HUB." },
  { versao: "2026.11.27-3", data: "2026-11-27", titulo: "Motion pelo Claude", texto: "O pedido de motion do Audiovisual vira um brief para aprovar e depois uma peça animada (HyperFrames), feita pelo Claude e exportada no navegador." },
  { versao: "2026.11.27-2", data: "2026-11-27", titulo: "Pacote da semana", texto: "Peça a semana de um perfil num pedido só (ex.: \"Natal ISYS, semana 1\"): o Claude completa os cards que já existem no Quadro em vez de criar outros e entrega roteiro, legenda, CTA e estilo de edição de cada peça." },
  { versao: "2026.11.27-1", data: "2026-11-27", titulo: "Métricas que pesam e mix de moda", texto: "Análises começam por compartilhamentos e salvamentos por alcance, views e tempo assistido. Para marcas de moda, a pauta segue 4 tipos (Fundadora, Estilo de vida, Educativo, Editorial) e uma peça fora do padrão por semana." },
];

export const VERSAO_IA = NOVIDADES[0].versao;

/** novidades depois da versão que a pessoa já viu (todas, se nunca viu) */
export function novidadesDesde(vista?: string | null) {
  if (!vista) return NOVIDADES;
  const i = NOVIDADES.findIndex((n) => n.versao === vista);
  return i < 0 ? NOVIDADES : NOVIDADES.slice(0, i);
}
