import { NextResponse } from "next/server";
import { callClaude, extractJson, aiQuotaExceeded, QUOTA_MSG, withAIQueue } from "@/lib/ai";
import { AGENTS } from "@/lib/agents";
import { FORMATS, CATS, MIDIAS, FORMAT_MIDIA, formatBrief } from "@/lib/formats";
import { EXAMPLES } from "@/lib/formats-examples";
import { BRIEFING, briefingText } from "@/lib/briefing";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

function postsTable(posts: any[]) {
  return (posts || []).slice(0, 40).map((p) =>
    `- ${p.posted_at?.slice(0, 10) || "?"} | ${p.media_type || "?"} | curtidas ${p.like_count ?? "-"} | coment. ${p.comments_count ?? "-"} | alcance ${p.reach ?? "-"} | salvos ${p.saved ?? "-"} | compart. ${p.shares ?? "-"} | views ${p.plays ?? "-"} | "${(p.caption || "").replace(/\s+/g, " ").slice(0, 160)}"`
  ).join("\n");
}

async function handle(req: Request) {
  try {
    const { task, data } = await req.json();
    if (await aiQuotaExceeded(await createClient())) return NextResponse.json({ error: QUOTA_MSG }, { status: 429 });
    const ctx = data?.account ? `Perfil: @${data.account.username}${data.account.niche ? ` | Nicho: ${data.account.niche}` : ""}${data.account.goals ? ` | Objetivos: ${data.account.goals}` : ""}${data.account.followers_count ? ` | Seguidores: ${data.account.followers_count}` : ""}${data.account.brand_voice ? `\nVoz da marca: ${data.account.brand_voice}` : ""}${data.account.briefing ? `\n${briefingText(data.account.briefing)}` : ""}` : "";

    if (task === "profile_diagnosis") {
      const text = await callClaude({
        maxTokens: 5000,
        prompt: `${ctx}\n\nÚltimos posts e métricas:\n${postsTable(data.posts) || "(sem posts sincronizados)"}\n\nFaça um diagnóstico estratégico do perfil em markdown com as seções:\n## Resumo\n## O que está funcionando (com evidências dos números)\n## O que não está funcionando\n## Padrões de formato, tema e gancho\n## Leitura de funil (views altas e poucos seguidores = problema de perfil; poucas views = problema de gancho/conteúdo; compartilhamentos e seguidores por alcance)\n## Outliers (posts acima de 2x a mediana de views/alcance e o que têm em comum)\n## Melhores dias/horários (se der para inferir)\n## Plano de ação para as próximas 2 semanas (lista numerada, concreta)\n## 5 ideias de posts com gancho\nSeja específico e use os números.`,
      });
      return NextResponse.json({ text });
    }

    if (task === "trends") {
      const text = await callClaude({
        webSearch: true,
        maxTokens: 6000,
        prompt: `${ctx}\nNicho/tema: ${data.niche}\nPúblico: ${data.audience || "não informado"}\nFoco: ${data.focus || "geral"}\nData de hoje: ${new Date().toISOString().slice(0, 10)}\n\nPesquise na web as tendências ATUAIS de conteúdo no Instagram para esse nicho no Brasil (formatos em alta, áudios/trends de Reels, temas em discussão, datas próximas relevantes). Depois responda SOMENTE com um JSON:\n{"resumo":"2-3 frases sobre o cenário","tendencias":[{"titulo":"...","por_que":"por que está em alta e evidência","formato":"Reels|Carrossel|Stories|Foto|Live","gancho":"gancho pronto","ideia":"como a VINCIT/perfil pode aplicar, em 2-3 frases","urgencia":"alta|media|baixa"}]}\nTraga de 6 a 10 tendências.`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "reference") {
      const text = await callClaude({
        maxTokens: 4000,
        prompt: `${ctx}\nAnalise esta referência de conteúdo:\nTítulo: ${data.title}\nPerfil: ${data.handle || "-"}\nURL: ${data.url || "-"}\nFormato: ${data.format || "-"}\n${data.views ? `Views: ${data.views}` : ""}${data.followers ? ` | Seguidores do perfil: ${data.followers}` : ""}${data.median_views ? ` | Mediana de views do perfil: ${data.median_views}` : ""}\nConteúdo (legenda/transcrição/descrição):\n"""${data.content || ""}"""\n\nResponda SOMENTE com JSON:\n{"gancho":"qual é o gancho e por que prende","estrutura":["passo 1","passo 2"],"por_que_funciona":"...","gatilhos":["curiosidade","..."],"modelo_de_copy":"template reutilizável com [colchetes] nas partes variáveis","adaptacoes":["ideia adaptada 1","ideia 2","ideia 3"],"formula_gancho":"nome da fórmula do gancho (ex.: contradição, número específico, mistério, POV)","formatos_criativos":["cartas das 32 que a referência usa"],"sinais_de_tendencia":["..."],"nota":0-10}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "copy") {
      const text = await callClaude({
        maxTokens: data.format === "YouTube" ? 7000 : 4000,
        prompt: `${ctx}\nCrie o conteúdo:\nTema: ${data.topic}\nFormato: ${data.format}\nObjetivo: ${data.goal}\nTom: ${data.tone}\n${data.keyword ? `CTA de automação: pedir para comentar a palavra "${data.keyword}" para receber no direct.` : ""}\n${data.reference ? `Use como referência de estrutura:\n${data.reference}` : ""}\n\nMétodo:\n- Ganchos de até 12 palavras, cada um com uma fórmula diferente (contradição, número específico, erro comum, segredo/bastidor, mistério, POV, pergunta que dói, antes × depois…). Indique a fórmula entre parênteses.\n- ${data.format === "YouTube" ? "Vídeo longo para YouTube: 3 títulos de até 60 caracteres (régua 4U), 3 ideias de thumbnail (texto de até 4 palavras + descrição da imagem), gancho dos primeiros 30 segundos (promessa + prova do que vem), roteiro em capítulos com minutagem, um re-gancho a cada ~2 minutos, CTA no meio e no fim, descrição com palavras-chave e capítulos." : data.format === "Carrossel" ? "Carrossel de 7 a 10 slides: slide 1 título-gancho com promessa concreta, uma ideia por slide, um slide de virada (efeito A-há), penúltimo com resumo em checklist, último com um único CTA; sugestão visual entre colchetes." : data.format === "Reels" ? "Roteiro em blocos com tempo, cena/visual, fala e texto na tela; gancho nos 2 primeiros segundos; ~2,5 palavras por segundo de fala." : "Conteúdo direto, uma ideia central."}\n- Legenda: 1ª linha funciona sozinha (até 125 caracteres), diga se o trabalho da legenda é complementar o vídeo ou converter, um único CTA.\n- SEO: 3 palavras-chave para usar na 1ª linha, no texto na tela e no texto alternativo + até 5 hashtags específicas.\n\nEntregue em markdown:\n## 5 opções de gancho\n${data.format === "YouTube" ? "## 3 títulos\n## 3 thumbnails\n## Gancho (0–30s)\n## Roteiro por capítulos (minutagem · cena/visual · fala · re-ganchos)\n## CTA\n## Descrição com capítulos e palavras-chave" : `## ${data.format === "Carrossel" ? "Texto slide a slide" : data.format === "Reels" || data.format === "Stories" ? "Roteiro (tempo · cena · fala · texto na tela)" : "Conteúdo"}\n## Legenda pronta\n## CTA\n## Palavras-chave e hashtags (até 5)`}${data.format_card ? `\n\nUse o formato criativo \"${data.format_card}\" na construção do roteiro e explique em 1 linha como ele foi aplicado.` : ""}`,
      });
      return NextResponse.json({ text });
    }

    if (task === "automation_copy") {
      const text = await callClaude({
        maxTokens: 1200,
        prompt: `${ctx}\nCrie as mensagens de uma automação de Instagram. Quando alguém comentar "${data.keyword}" no post, o perfil responde publicamente e envia uma DM.\nO que será entregue: ${data.offer}\n${data.link ? `Link: ${data.link}` : ""}\nResponda SOMENTE com JSON: {"public_reply":"resposta curta e variada para o comentário, até 80 caracteres, sem link, avisando que mandou no direct","dm_message":"mensagem de direct calorosa, até 500 caracteres, que ENTREGA o prometido logo na primeira frase (sem exigir seguir ou responder antes)${data.link ? " e menciona que o link segue abaixo" : ""}, e termina com uma pergunta leve que abre conversa"}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "agent") {
      const ag = AGENTS.find((a) => a.id === data.agent);
      if (!ag) return NextResponse.json({ error: "Agente desconhecido" }, { status: 400 });
      const text = await callClaude({
        webSearch: !!ag.web,
        maxTokens: 5000,
        prompt: `${ag.prompt}\n\n${ctx}\nData de hoje: ${new Date().toISOString().slice(0, 10)}\n\nPedido:\n"""${data.input || ""}"""\n\nResponda em markdown, pronto para usar.`,
      });
      return NextResponse.json({ text });
    }

    if (task === "format_apply") {
      const f = FORMATS.find((x) => x.id === data.card);
      const f2 = data.card2 ? FORMATS.find((x) => x.id === data.card2) : null;
      if (!f) return NextResponse.json({ error: "Carta desconhecida" }, { status: 400 });
      const desc = (x: typeof f) => `Carta ${x.n} · ${x.name} (${CATS[x.cat].l}${x.source ? ` · ${x.source}` : ""})\nEssência: ${x.essence}\nPor que funciona: ${x.why}\nComo aplicar: ${x.how.join(" ")}\nExemplo de estrutura: ${(EXAMPLES[x.id] || []).map(([a, b]) => `${a}: ${b}`).join(" | ")}`;
      const text = await callClaude({
        maxTokens: data.format === "YouTube" ? 7000 : 3500,
        prompt: `${ctx}\nAplique o formato criativo abaixo${f2 ? " combinado com o segundo" : ""} ao tema.\n\n${desc(f)}${f2 ? `\n\n${desc(f2)}` : ""}\n\nTema: ${data.topic}\nFormato de entrega: ${data.format || "Reels"}\nObjetivo: ${data.goal || "alcance e conexão"}\n\nEntregue em markdown:\n## Ideia em 1 frase\n## 3 opções de gancho\n${data.format === "YouTube" ? "## Título e thumbnail (3 opções)\n## Roteiro por capítulos (minutagem · cena/visual · fala · re-ganchos a cada ~2 min)\n## Dicas de gravação e edição para essa carta\n## Descrição com capítulos" : data.format === "Carrossel" || data.format === "Foto" ? "## Texto slide a slide (com sugestão visual)\n## Dicas de design para essa carta\n## Legenda (1ª linha forte, 1 CTA, até 5 hashtags)" : "## Roteiro (tempo · cena/visual · fala · texto na tela)\n## Dicas de gravação e edição para essa carta\n## Legenda (1ª linha forte, 1 CTA, até 5 hashtags)"}\n## Por que essa carta funciona aqui (2 linhas)`,
      });
      return NextResponse.json({ text });
    }

    if (task === "format_suggest") {
      const text = await callClaude({
        maxTokens: 2500,
        prompt: `${ctx}\nTema: ${data.topic}\nFormato de entrega: ${data.format || "qualquer"}\n\nBiblioteca de cartas (número. nome (categoria) [mídias]: essência):\n${formatBrief(data.format ? FORMAT_MIDIA[data.format] : undefined)}\n\nEscolha 3 combinações diferentes de 2 ou 3 cartas que deixariam esse tema original e fora do padrão. Misture categorias (ex.: um gancho + uma estrutura + um recurso visual). Responda em markdown, para cada combinação:\n### Combinação N: nome curto\n**Cartas:** número e nome de cada\n**Ideia:** 2-3 frases descrevendo o vídeo/post\n**Gancho:** frase pronta\nNo fim, 1 linha dizendo qual das 3 você gravaria primeiro e por quê.`,
      });
      return NextResponse.json({ text });
    }

    if (task === "growth_plan") {
      const sb = await createClient();
      const { data: diag } = data.account?.id ? await sb.from("profile_diagnoses").select("result,created_at").eq("account_id", data.account.id).order("created_at", { ascending: false }).limit(1) : { data: null as any };
      const dg = diag?.[0]?.result;
      const diagText = dg ? `\nÚltimo Raio-X do perfil (${diag[0].created_at.slice(0, 10)}): ${dg.resumo || ""}\nNotas por eixo: ${(dg.eixos || []).map((e: any) => `${e.key} ${e.nota ?? "sem informação"}${e.lacunas?.length ? ` (lacunas: ${e.lacunas.join("; ")})` : ""}`).join(" | ")}\nPrioridades: ${(dg.prioridades || []).join("; ")}${dg.nicho?.lacuna ? `\nEspaço livre no nicho: ${dg.nicho.lacuna}` : ""}\nA estratégia deve atacar as lacunas e prioridades do Raio-X.` : "";
      const { data: posts } = data.account?.id ? await sb.from("ig_posts").select("posted_at,media_type,like_count,comments_count,reach,saved,shares,plays,caption").eq("account_id", data.account.id).order("posted_at", { ascending: false }).limit(40) : { data: [] as any[] };
      const text = await callClaude({
        maxTokens: 8000,
        prompt: `${ctx}\nSeguidores atuais: ${data.account?.followers_count ?? "não informado"}\nMeta definida pelo usuário: ${data.goal || "não informada (proponha uma meta realista)"}\nHorizonte: ${data.horizon || 90} dias\nTempo/recursos disponíveis: ${data.resources || "ver briefing"}\nÚltimos posts:\n${postsTable(posts || []) || "(sem métricas sincronizadas)"}${diagText}\n\nMonte uma ESTRATÉGIA DE CRESCIMENTO para este perfil do Instagram. Seja específico ao briefing; não invente números de resultados (estimativas devem ser marcadas como estimativa). Responda SOMENTE com JSON:\n{\n "diagnostico": "situação atual em 3-4 frases, citando dados quando houver",\n "posicionamento": "frase de posicionamento recomendada",\n "meta": {"principal": "meta SMART", "kpis": [{"nome": "...", "atual": "... ou ?", "alvo": "...", "como_medir": "..."}]},\n "alavancas": [{"nome": "Conteúdo|Perfil|Comunidade|Collabs|Automação|Anúncios|Outra", "acao": "...", "impacto": "alto|medio|baixo", "esforco": "alto|medio|baixo"}],\n "fases": [{"titulo": "Dias 1-30: ...", "foco": "...", "acoes": [{"id": "a1", "texto": "ação concreta e verificável"}]}],\n "cadencia": {"semana": "ex.: 3 Reels + 2 carrosséis + stories diários", "mix": "prova/ensino/opinião/história/oferta em %", "melhores_formatos": ["..."]},\n "series": [{"nome": "quadro recorrente", "ideia": "...", "frequencia": "..."}],\n "rotina_diaria": ["checklist de 15-20 min/dia"],\n "riscos": ["..."]\n}\nUse 3 fases (30/60/90 ou proporcional ao horizonte), 5-8 ações por fase, ids únicos.`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "content_calendar") {
      const days = data.period === "mes" ? 30 : 7;
      const start = data.start || new Date().toISOString().slice(0, 10);
      const cards = FORMATS.filter((f) => !data.formats?.includes("YouTube") || f.fmt.includes("longo")).map((f) => `${f.id}: ${f.name}`).join(", ");
      const text = await callClaude({
        maxTokens: data.period === "mes" ? 12000 : 6000,
        prompt: `${ctx}\nCrie o calendário de conteúdo de ${days} dias começando em ${start} (datas no formato AAAA-MM-DD).\nFrequência desejada: ${data.frequency || "ver briefing"}\nFormatos prioritários: ${(data.formats || []).join(", ") || "ver briefing"}\nFoco do período: ${data.focus || "crescimento e autoridade"}\n${data.strategy ? `Estratégia vigente:\n${data.strategy}\n` : ""}Equilibre o mix (prova, ensino, opinião, história, oferta — no máximo 1 oferta a cada 5), use os pilares do briefing, varie as cartas de formatos criativos e considere datas sazonais do período.\nCartas disponíveis (id: nome): ${cards}\n\nResponda SOMENTE com JSON: {"logica": "2 frases sobre a lógica do período", "posts": [{"data": "AAAA-MM-DD", "formato": "Reels|Carrossel|Stories|YouTube|Foto", "pilar": "...", "tipo": "prova|ensino|opiniao|historia|oferta", "titulo": "tema em até 80 caracteres", "gancho": "frase de abertura", "carta": "id da carta", "roteiro": "3-5 linhas com a estrutura do conteúdo", "cta": "um único CTA"}]}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "briefing_draft") {
      const schema = BRIEFING.flatMap((sec) => sec.fields).map((f) => `"${f.k}": ${f.type === "chips" || f.type === "multi" ? "string[]" : "string"} // ${f.l}${f.options ? ` (uma de: ${f.options.join(" / ")})` : ""}`).join("\n");
      const text = await callClaude({
        maxTokens: 3000,
        prompt: `A partir do material abaixo, preencha o briefing estratégico de um perfil de Instagram. Use SOMENTE o que está no material ou é inferência direta e segura dele; deixe "" ou [] quando não houver informação. Nunca invente números, clientes ou resultados. Para campos com opções, use exatamente uma das opções.\n\nMaterial:\n"""${(data.text || "").slice(0, 12000)}"""\n\nResponda SOMENTE com JSON neste formato:\n{\n${schema}\n}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "brand_voice") {
      const text = await callClaude({
        maxTokens: 1200,
        prompt: `${ctx}\nAnalise os textos abaixo, escritos pela própria marca, e descreva a VOZ DA MARCA em no máximo 900 caracteres, como instruções para um redator: tom, pessoa (eu/nós/você), tamanho de frase, vocabulário e gírias usadas, palavras proibidas, uso de emoji, como abre e como fecha um texto. Não invente; baseie-se só nos textos.\n\nTextos:\n"""${data.samples || ""}"""\n\nResponda só com o texto da voz da marca, sem título.`,
      });
      return NextResponse.json({ text });
    }

    if (task === "proposal_text") {
      const c = data.client || {};
      const text = await callClaude({
        maxTokens: 3000,
        prompt: `Você escreve propostas comerciais para a VINCIT, produtora audiovisual brasileira. Tom: profissional, próximo e confiante, sem exageros.\nProjeto: ${data.title}\nCliente: ${c.name || "-"}${c.company ? ` (${c.company})` : ""}${c.segment ? ` · segmento ${c.segment}` : ""}\nItens orçados: ${data.items || "-"}\nInvestimento total: ${data.total}\nContexto adicional: ${data.brief || "-"}\n\nResponda SOMENTE com JSON: {"intro":"abertura pessoal de 2-3 frases para o cliente","scope":"escopo em parágrafos curtos ou tópicos com hífen","deliverables":"lista de entregáveis com hífen, específica (duração, formatos, resolução, quantidade de revisões)","timeline":"cronograma por etapas com prazos estimados","payment_terms":"condições de pagamento sugeridas (ex.: 50% na aprovação e 50% na entrega) e forma de pagamento"}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "ecommerce_campaign") {
      const a = data.action || {};
      const phases = (k: string) => (a[k] || []).map((x: any) => x.t).join("; ") || "-";
      const text = await callClaude({
        maxTokens: 6000,
        prompt: `Você é estrategista de marketing de varejo de moda (loja física e online) no Brasil. Monte a campanha de uma ação comercial da loja ${data.store}.
Método da loja (Plano de 90 dias): toda ação tem antes (aquecimento, começando pelo menos 5 dias antes), durante e depois (pós-venda); chame primeiro quem já conhece a loja (clientes VIP e inativas); em datas de desconto, só peças selecionadas e desconto "até", nunca a coleção nova; presente por faixa de compra em vez de desconto quando possível; nada de antecipar liquidação.
${data.profile ? `Perfil da loja:\n${data.profile}\n` : ""}Ação: ${a.title} (${data.kind})
Data: ${a.date}${a.end_date ? ` até ${a.end_date}` : ""} · aquecimento a partir de ${a.warmup_date || "5 dias antes"}
Meta: ${a.goal ? `R$ ${a.goal}` : "não definida"}${a.goal_max ? ` (máxima R$ ${a.goal_max})` : ""}
Frase da ação: vou fazer ${a.do_what || "{{o quê}}"}, porque ${a.because || "{{motivo}}"}, oferecendo ${a.offering || "{{oferta}}"}, para ${a.audience || "{{público}}"}, mirando ${a.aiming || "{{resultado}}"}.
Fases já planejadas: antes: ${phases("before_items")} | durante: ${phases("during_items")} | depois: ${phases("after_items")}
Vitrine: ${a.vm_window || "não definida"}
Hoje: ${data.today}. Não sugira datas no passado.

Responda SOMENTE com JSON:
{"conceito":"nome curto da campanha","mensagem":"mensagem central em 1-2 frases","fases":[{"fase":"Antes|Durante|Depois","periodo":"datas","objetivo":"o que a fase precisa conseguir"}],"pauta":[{"data":"AAAA-MM-DD","fase":"Antes|Durante|Depois","canal":"Instagram|WhatsApp|E-mail|Loja","formato":"Reels|Carrossel|Stories|Foto|Live","titulo":"tema em até 80 caracteres","gancho":"frase de abertura","roteiro":"3-5 linhas com a estrutura ou as cenas","legenda":"legenda pronta para postar, no tom da loja","cta":"um único CTA"}],"whatsapp":[{"para":"VIP|Inativas|Todas","quando":"data ou momento","mensagem":"texto pronto, curto, com {{nome}}"}],"oferta":{"mecanica":"como funciona a oferta em 1-2 frases","faixas":[{"acima":500,"brinde":"o que ganha"}]},"equipe":{"briefing":"o que a equipe de vendas precisa saber e falar, 2-3 frases","objecoes":[{"objecao":"o que a cliente diz","resposta":"como responder"}]},"vitrine":"sugestão de vitrine e VM em 1-2 frases","cuidados":["o que evitar nessa ação"]}
Pauta de 6 a 12 itens cobrindo as três fases, com no máximo 1 oferta direta a cada 3 conteúdos. Não invente números de resultado.`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "shot_list") {
      const media = (data.media || []).slice(0, 150).map((m: any) => `- ${m.name} (${m.kind}${m.tags?.length ? `; ${m.tags.join(", ")}` : ""})`).join("\n");
      const text = await callClaude({
        maxTokens: 3500,
        prompt: `Você é assistente de direção de uma produtora audiovisual. Faça a decupagem (lista de planos para gravar) do roteiro abaixo.\nFormato: ${data.format || "Reels 9:16"}\nTítulo: ${data.title || "-"}\nRoteiro:\n"""${(data.script || "").slice(0, 8000)}"""\n${media ? `\nArquivos disponíveis no banco de mídia da produtora (use o nome EXATO só quando servir de verdade):\n${media}\n` : ""}\nRegras:\n- Na ordem da montagem. Fala para a câmera e inserções (b-roll) separadas.\n- Enquadramento curto (ex.: Médio · olho, Close, Detalhe, Top shot, Plano aberto, POV).\n- Áudio: voz, som ambiente ou o efeito sonoro sugerido.\n- Não invente produto, local ou pessoa que o roteiro não cita; quando precisar, use {{marcador}}.\n- Entre 4 e 20 planos.\n\nResponda SOMENTE com JSON: {"planos":[{"descricao":"o que gravar","enquadramento":"...","audio":"...","midia":"nome exato do arquivo do banco ou vazio","notas":"dica curta de set ou vazio"}]}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "ecommerce_closing") {
      const text = await callClaude({
        maxTokens: 3000,
        prompt: `Você é consultor de gestão de loja de moda. Escreva o fechamento do ${data.quarter} da loja ${data.store}, pelo método do Plano de 90 dias (meta mínima paga contas e pró-labore; meta = mínima + lucro; super meta vale prêmio).
Meses (metas e vendido informado no fechamento): ${JSON.stringify(data.months)}
Dados do trimestre (estoque, pró-labore, prioridades): ${JSON.stringify(data.quarter_data)}
Ações do calendário (meta e resultado): ${JSON.stringify(data.actions)}
Use só esses números; quando faltar um dado, diga que falta. Responda em markdown com:
## Resultado (vendido x meta mínima, meta e super meta, por mês e no total)
## Ações que funcionaram e as que não
## O que repetir e o que mudar
## Para o próximo trimestre (3 prioridades concretas)`,
      });
      return NextResponse.json({ text });
    }

    if (task === "brand_concepts") {
      const fonts = (data.fonts || []).join(", ");
      const text = await callClaude({
        maxTokens: 6000,
        prompt: `Você é diretor de arte de um estúdio de branding. A partir do briefing, proponha 3 caminhos de logo bem diferentes entre si: 1) tipográfico (só o nome, com um detalhe próprio), 2) símbolo + nome, 3) monograma ou selo.
Marca: ${data.nome}
Briefing:
${(data.brief || "").slice(0, 4000)}
${data.refs?.length ? `Notas do moodboard:\n${data.refs.join("\n")}\n` : ""}
Regras do SVG:
- Um <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"> por conceito, sem width/height.
- Só path, rect, circle, ellipse, polygon, line, g e text. Sem imagem, script, filtro, link ou fonte externa.
- O nome escrito exatamente "${data.nome}" em <text> com font-family de UMA destas fontes do Google: ${fonts}.
- Símbolos simples, geométricos, que funcionem pequenos e em uma cor. No máximo 3 cores por logo, sobre fundo claro (não desenhe o fundo).
- Nada de clichê do nicho (lâmpada, globo, engrenagem) a não ser que o briefing peça.
Para cada conceito dê também uma paleta de 5 cores em hexadecimal nesta ordem: primária, apoio, destaque, escuro (quase preto), claro (quase branco), e um par de fontes da lista.
Responda SOMENTE com JSON: {"conceitos":[{"nome":"nome curto do caminho","ideia":"o conceito em 1-2 frases, ligando ao briefing","svg":"<svg ...>...</svg>","paleta":["#hex","#hex","#hex","#hex","#hex"],"fontes":{"titulo":"fonte","texto":"fonte"}}]}`,
      });
      return NextResponse.json(extractJson(text));
    }

    if (task === "carousel_copy") {
      const n = data.kind === "peca" ? 1 : Math.max(3, Math.min(10, Number(data.pages) || 6));
      const text = await callClaude({
        maxTokens: 2500,
        prompt: `Escreva ${n === 1 ? "o texto de uma peça estática" : `um carrossel de Instagram com ${n} páginas`} sobre: ${(data.tema || "").slice(0, 600)}
${data.brand ? `Marca e briefing:\n${String(data.brand).slice(0, 3000)}\n` : ""}Regras:
- ${n === 1 ? "Uma página só, com chamada forte." : "Página 1 é a capa com gancho de até 10 palavras; a última é a chamada (um único CTA); as do meio entregam o conteúdo, uma ideia por página."}
- Título com no máximo 60 caracteres, texto com no máximo 160. Kicker curto em caixa alta (ex.: 01, DICA, ERRO COMUM) ou vazio.
- layout: capa, texto, lista (itens separados por \n no body), citacao ou cta. bg: primaria, escuro, claro ou destaque, alternando para dar ritmo.
- Nada de números, depoimentos ou resultados inventados; use {{marcador}} quando faltar dado. Sem clichês de IA.
Responda SOMENTE com JSON: {"slides":[{"layout":"capa","kicker":"","title":"","body":"","bg":"primaria"}],"legenda":"legenda pronta, primeira linha até 125 caracteres, até 5 hashtags"}`,
      });
      return NextResponse.json(extractJson(text));
    }

    return NextResponse.json({ error: "Tarefa desconhecida" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: 500 });
  }
}

/** sem API paga: o pedido vai para a fila do Claude (conector VINCIT HUB) e volta para esta rota */
export const POST = withAIQueue("ai", handle);
