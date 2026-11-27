import type { SupabaseClient } from "@supabase/supabase-js";
import { can, hubAllowed, type Access } from "@/lib/access";

/**
 * Ferramentas do conector VINCIT HUB para o Claude (MCP).
 * Rodam com o token da própria pessoa: o RLS do Supabase limita tudo aos dados dela.
 * Nenhuma ferramenta chama IA: quem escreve é o Claude, na assinatura de quem usa.
 */
export type Ctx = { sb: SupabaseClient; userId: string; email: string; access: Access };

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: any;
  readOnly?: boolean;
  needs?: string; // ferramenta do plano exigida
  run: (ctx: Ctx, a: any) => Promise<any>;
};

const TZ = "America/Sao_Paulo";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const addDays = (d: string, n: number) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const clip = (s: any, n: number) => (s == null ? null : String(s).slice(0, n));
const ORIGIN = "Enviado pelo Claude";

class UserError extends Error {}
const fail = (m: string): never => { throw new UserError(m); };
export const isUserError = (e: unknown) => e instanceof UserError;

async function account(ctx: Ctx, id?: string | null) {
  if (!id) return null;
  const { data } = await ctx.sb.from("ig_accounts").select("id, username").eq("id", id).maybeSingle();
  if (!data) fail("Perfil não encontrado. Use listar_perfis para ver os ids dos seus perfis.");
  return data;
}

/** status do Quadro de produção pela etapa (ideia, roteiro…); null se a pessoa não tiver o modelo */
async function statusFor(ctx: Ctx, stage: string) {
  const { data } = await ctx.sb.from("content_statuses").select("id").eq("stage", stage).order("position").limit(1);
  return data?.[0]?.id || null;
}

const date = { type: "string", description: "Data no formato AAAA-MM-DD" };
const accountId = { type: "string", description: "id do perfil (de listar_perfis). Opcional." };

export const TOOLS: Tool[] = [
  {
    name: "quem_sou_eu",
    title: "Minha conta no HUB",
    description: "Mostra a conta do VINCIT HUB ligada a este conector: e-mail, plano, status e ferramentas liberadas.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    run: async (ctx) => ({ email: ctx.email, nome: ctx.access.name || null, plano: ctx.access.plan || null, status: ctx.access.status, papel: ctx.access.role, ferramentas: ctx.access.tools, vence_em: ctx.access.expires_at || null }),
  },
  {
    name: "listar_perfis",
    title: "Listar perfis",
    description: "Lista os perfis de Instagram da pessoa no HUB, com nicho, objetivos, voz da marca e briefing. Use antes de criar conteúdo para respeitar a marca.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    needs: "creator",
    run: async (ctx) => {
      const { data, error } = await ctx.sb.from("ig_accounts")
        .select("id, username, name, niche, goals, brand_voice, briefing, followers_count, follows_count, media_count, connected, last_synced_at")
        .order("created_at");
      if (error) fail(error.message);
      return { perfis: data || [] };
    },
  },
  {
    name: "ler_desempenho",
    title: "Ler desempenho do perfil",
    description: "Traz os posts de um perfil nos últimos N dias com alcance, curtidas, comentários, salvamentos, compartilhamentos e plays, as taxas por alcance, os totais e os destaques. Use os números reais; não invente métricas. Analise primeiro compartilhamentos e salvamentos por alcance e views: são os sinais que o Instagram mais pesa; curtidas e seguidores pesam menos.",
    inputSchema: { type: "object", properties: { perfil_id: { type: "string", description: "id do perfil (de listar_perfis)" }, dias: { type: "integer", minimum: 1, maximum: 365, default: 30 } }, required: ["perfil_id"] },
    readOnly: true,
    needs: "creator",
    run: async (ctx, a) => {
      const acc = await account(ctx, a.perfil_id);
      const dias = Math.min(365, Math.max(1, Number(a.dias) || 30));
      const since = new Date(Date.now() - dias * 864e5).toISOString();
      const { data, error } = await ctx.sb.from("ig_posts")
        .select("media_type, caption, permalink, posted_at, like_count, comments_count, reach, saved, shares, plays")
        .eq("account_id", a.perfil_id).gte("posted_at", since).order("posted_at", { ascending: false }).limit(200);
      if (error) fail(error.message);
      const rate = (p: any, k: string) => (Number(p.reach) ? Math.round(((Number(p[k]) || 0) / Number(p.reach)) * 10000) / 100 : null);
      const posts = (data || []).map((p: any) => ({ ...p, caption: clip(p.caption, 300), compart_por_alcance_pct: rate(p, "shares"), salvos_por_alcance_pct: rate(p, "saved") }));
      const sum = (k: string) => posts.reduce((t: number, p: any) => t + (Number(p[k]) || 0), 0);
      const alc = sum("reach");
      const sinal = (p: any) => (p.compart_por_alcance_pct ?? -1) + (p.salvos_por_alcance_pct ?? 0);
      const destaques = posts.filter((p: any) => p.reach).sort((a: any, b: any) => sinal(b) - sinal(a)).slice(0, 5)
        .map((p: any) => ({ permalink: p.permalink, media_type: p.media_type, posted_at: p.posted_at, compart_por_alcance_pct: p.compart_por_alcance_pct, salvos_por_alcance_pct: p.salvos_por_alcance_pct, plays: p.plays }));
      return {
        perfil: acc, periodo_dias: dias, quantidade: posts.length,
        totais: { alcance: alc, curtidas: sum("like_count"), comentarios: sum("comments_count"), salvamentos: sum("saved"), compartilhamentos: sum("shares"), plays: sum("plays") },
        taxas_por_alcance_pct: alc ? { compartilhamentos: Math.round((sum("shares") / alc) * 10000) / 100, salvamentos: Math.round((sum("saved") / alc) * 10000) / 100 } : null,
        destaques_por_compart_e_salvos: destaques,
        posts,
        aviso: posts.length ? undefined : "Sem posts sincronizados nesse período. Sincronize o perfil no HUB (Desempenho) antes de analisar.",
      };
    },
  },
  {
    name: "resumo_do_hub",
    title: "Resumo do HUB",
    description: "Números do momento: tarefas de hoje, conteúdos previstos para os próximos 7 dias, ideias no Quadro de produção e os últimos itens enviados.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    run: async (ctx) => {
      const d = today(), w = addDays(d, 7);
      const [t, sem, ideias, ult] = await Promise.all([
        ctx.sb.from("ag_tasks").select("id", { count: "exact", head: true }).eq("done", false).lte("due_date", d),
        ctx.sb.from("content_ideas").select("id", { count: "exact", head: true }).is("archived_at", null).gte("planned_for", d).lte("planned_for", w),
        ctx.sb.from("content_ideas").select("id", { count: "exact", head: true }).is("archived_at", null),
        ctx.sb.from("content_ideas").select("id, title, kind, format, planned_for, created_at, account_id, ig_accounts(username), content_statuses(name)").is("archived_at", null).order("created_at", { ascending: false }).limit(8),
      ]);
      return {
        hoje: d,
        tarefas_hoje_ou_atrasadas: t.count ?? 0,
        conteudos_proximos_7_dias: sem.count ?? 0,
        conteudos_no_quadro: ideias.count ?? 0,
        ultimos: (ult.data || []).map((x: any) => ({ id: x.id, titulo: x.title, tipo: x.kind, formato: x.format, data: x.planned_for, criado_em: x.created_at, perfil: x.ig_accounts?.username || null, status: x.content_statuses?.name || null })),
      };
    },
  },
  {
    name: "listar_conteudos",
    title: "Listar conteúdos do quadro",
    description: "Lista os conteúdos do Quadro de produção (mais recentes primeiro), com filtro opcional por perfil.",
    inputSchema: { type: "object", properties: { perfil_id: accountId, limite: { type: "integer", minimum: 1, maximum: 50, default: 20 } } },
    readOnly: true,
    needs: "creator",
    run: async (ctx, a) => {
      let q = ctx.sb.from("content_ideas").select("id, title, kind, format, pillar, hook, planned_for, created_at, content_statuses(name, stage)").is("archived_at", null).order("created_at", { ascending: false }).limit(Math.min(50, Number(a.limite) || 20));
      if (a.perfil_id) q = q.eq("account_id", a.perfil_id);
      const { data, error } = await q;
      if (error) fail(error.message);
      return { conteudos: (data || []).map((x: any) => ({ id: x.id, titulo: x.title, tipo: x.kind, formato: x.format, pilar: x.pillar, gancho: x.hook, data: x.planned_for, status: x.content_statuses?.name || null, criado_em: x.created_at })) };
    },
  },
  {
    name: "enviar_campanha",
    title: "Enviar campanha ao Planejador",
    description: "Grava uma campanha (série de posts com data) no Planejador e no Quadro de produção do CREATOR. Cada post vira um card com gancho, roteiro, legenda e CTA.",
    inputSchema: {
      type: "object",
      required: ["nome", "posts"],
      properties: {
        perfil_id: accountId,
        nome: { type: "string", description: "Nome da campanha" },
        objetivo: { type: "string" },
        posts: {
          type: "array", minItems: 1, maxItems: 60,
          items: {
            type: "object", required: ["titulo"],
            properties: { titulo: { type: "string" }, data: date, formato: { type: "string", enum: ["Reels", "Carrossel", "Stories", "Foto", "YouTube", "Live"] }, pilar: { type: "string" }, gancho: { type: "string" }, roteiro: { type: "string" }, legenda: { type: "string" }, cta: { type: "string" } },
          },
        },
      },
    },
    needs: "creator:planejador",
    run: async (ctx, a) => {
      await account(ctx, a.perfil_id);
      const posts: any[] = Array.isArray(a.posts) ? a.posts.slice(0, 60) : [];
      if (!posts.length) fail("Envie ao menos um post.");
      const status_id = await statusFor(ctx, "pauta") || await statusFor(ctx, "ideia");
      const rows = posts.map((p) => ({
        account_id: a.perfil_id || null, kind: "plano", status: "backlog", status_id,
        title: clip(p.titulo, 120) || "Post", format: p.formato || null, planned_for: p.data || null, pillar: clip(p.pilar || a.nome, 80), hook: clip(p.gancho, 300),
        body: `**Campanha:** ${a.nome}${a.objetivo ? ` · **Objetivo:** ${a.objetivo}` : ""}\n\n**Gancho:** ${p.gancho || "-"}\n\n**Roteiro:**\n${p.roteiro || "-"}\n\n**Legenda:**\n${p.legenda || "-"}\n\n**CTA:** ${p.cta || "-"}\n\n_${ORIGIN}_`,
        caption: p.legenda || null,
      }));
      const { data, error } = await ctx.sb.from("content_ideas").insert(rows).select("id");
      if (error) fail(error.message);
      return { ok: true, criados: data?.length || 0, onde: "CREATOR › Planejador e Quadro de produção", ids: (data || []).map((x: any) => x.id) };
    },
  },
  {
    name: "enviar_roteiro",
    title: "Enviar roteiro",
    description: "Grava um roteiro de vídeo no Quadro de produção, na etapa Roteiro (gancho, roteiro com cenas e texto de teleprompter, legenda).",
    inputSchema: {
      type: "object", required: ["titulo", "roteiro"],
      properties: { perfil_id: accountId, titulo: { type: "string" }, formato: { type: "string", enum: ["Reels", "Carrossel", "Stories", "Foto", "YouTube", "Live"] }, gancho: { type: "string" }, roteiro: { type: "string", description: "Cenas, falas e texto do teleprompter" }, legenda: { type: "string" }, data: date, pilar: { type: "string" } },
    },
    needs: "creator:producao",
    run: async (ctx, a) => {
      await account(ctx, a.perfil_id);
      const status_id = await statusFor(ctx, "roteiro");
      const { data, error } = await ctx.sb.from("content_ideas").insert({
        account_id: a.perfil_id || null, kind: "copy", status_id, title: clip(a.titulo, 120), format: a.formato || "Reels", hook: clip(a.gancho, 300), planned_for: a.data || null, pillar: clip(a.pilar, 80),
        body: `${a.gancho ? `**Gancho:** ${a.gancho}\n\n` : ""}**Roteiro:**\n${a.roteiro}${a.legenda ? `\n\n**Legenda:**\n${a.legenda}` : ""}\n\n_${ORIGIN}_`,
        caption: a.legenda || null,
      }).select("id").single();
      if (error) fail(error.message);
      return { ok: true, id: data?.id, onde: "CREATOR › Quadro de produção (etapa Roteiro)" };
    },
  },
  {
    name: "enviar_ideias",
    title: "Enviar ideias",
    description: "Grava uma lista de ideias de conteúdo no Quadro de produção, na etapa Ideia.",
    inputSchema: {
      type: "object", required: ["ideias"],
      properties: { perfil_id: accountId, ideias: { type: "array", minItems: 1, maxItems: 30, items: { type: "object", required: ["titulo"], properties: { titulo: { type: "string" }, formato: { type: "string" }, descricao: { type: "string" }, gancho: { type: "string" } } } } },
    },
    needs: "creator:producao",
    run: async (ctx, a) => {
      await account(ctx, a.perfil_id);
      const list: any[] = Array.isArray(a.ideias) ? a.ideias.slice(0, 30) : [];
      if (!list.length) fail("Envie ao menos uma ideia.");
      const status_id = await statusFor(ctx, "ideia");
      const { data, error } = await ctx.sb.from("content_ideas").insert(list.map((i) => ({
        account_id: a.perfil_id || null, kind: "ideia", status_id, title: clip(i.titulo, 200), format: i.formato || null, hook: clip(i.gancho, 300),
        body: `${i.descricao || ""}\n\n_${ORIGIN}_`.trim(),
      }))).select("id");
      if (error) fail(error.message);
      return { ok: true, criados: data?.length || 0, onde: "CREATOR › Quadro de produção (etapa Ideia)" };
    },
  },
  {
    name: "salvar_analise",
    title: "Salvar análise",
    description: "Salva uma análise (diagnóstico) de um perfil no HUB, junto dos diagnósticos do Desempenho. Baseie-se em ler_desempenho; não invente números.",
    inputSchema: { type: "object", required: ["perfil_id", "texto"], properties: { perfil_id: { type: "string", description: "id do perfil (de listar_perfis)" }, titulo: { type: "string" }, texto: { type: "string", description: "Análise em Markdown" } } },
    needs: "creator:desempenho",
    run: async (ctx, a) => {
      const acc: any = await account(ctx, a.perfil_id);
      const title = clip(a.titulo, 150) || `Análise @${acc?.username} · ${new Date().toLocaleDateString("pt-BR", { timeZone: TZ })}`;
      const { data, error } = await ctx.sb.from("content_ideas").insert({ account_id: a.perfil_id, kind: "diagnostico", title, body: `${a.texto}\n\n_${ORIGIN}_` }).select("id").single();
      if (error) fail(error.message);
      return { ok: true, id: data?.id, onde: "CREATOR › Desempenho & insights" };
    },
  },
  {
    name: "listar_pedidos_ia",
    title: "Pedidos de IA do HUB",
    description: "Lista os pedidos de IA que as telas do HUB deixaram para o Claude responder (diagnósticos, legendas, calendário, tendências, referências, propostas, decupagem…). Cada pedido traz as instruções (system) e o prompt completos. Responda cada um com responder_pedido_ia seguindo exatamente o formato pedido no prompt (muitos pedem só JSON). O resultado volta sozinho para a tela que pediu.",
    inputSchema: { type: "object", properties: { incluir_respondidos: { type: "boolean", default: false, description: "Inclui os já respondidos nas últimas 24 h" } } },
    readOnly: true,
    run: async (ctx, a) => {
      let q = ctx.sb.from("ai_requests").select("id, label, task, endpoint, status, system, prompt, web_search, max_tokens, created_at, account_id").order("created_at", { ascending: true }).limit(20);
      q = a.incluir_respondidos ? q.gte("created_at", new Date(Date.now() - 864e5).toISOString()) : q.in("status", ["pending", "running"]);
      const { data, error } = await q;
      if (error) fail(error.message);
      const pedidos = (data || []).map((r: any) => ({
        id: r.id, titulo: r.label || r.task || "Pedido de IA", tarefa: r.task, status: r.status, criado_em: r.created_at,
        precisa_pesquisa_web: !!r.web_search, max_tokens: r.max_tokens, instrucoes: r.system, prompt: r.prompt,
      }));
      return { quantidade: pedidos.length, pedidos, como_responder: "Escreva a resposta como se fosse a IA do HUB (instrucoes = system, prompt = mensagem do usuário) e envie o texto puro com responder_pedido_ia. Quando o prompt pede JSON, responda só o JSON." };
    },
  },
  {
    name: "responder_pedido_ia",
    title: "Responder pedido de IA",
    description: "Envia a resposta do Claude para um pedido de IA do HUB (id de listar_pedidos_ia). A tela que fez o pedido recebe o resultado e grava como antes.",
    inputSchema: { type: "object", required: ["id", "texto"], properties: { id: { type: "string" }, texto: { type: "string", description: "Resposta completa, no formato pedido pelo prompt" } } },
    run: async (ctx, a) => {
      const { error } = await ctx.sb.rpc("ai_request_answer", { p_id: a.id, p_text: String(a.texto || "") });
      if (error) fail(error.message);
      return { ok: true, id: a.id, aviso: "Respondido. A tela do HUB que fez o pedido mostra o resultado em alguns segundos (se ainda estiver aberta)." };
    },
  },
  {
    name: "recusar_pedido_ia",
    title: "Recusar pedido de IA",
    description: "Marca um pedido de IA do HUB como não atendido, com o motivo (ex.: faltam dados). A tela mostra o motivo como erro.",
    inputSchema: { type: "object", required: ["id", "motivo"], properties: { id: { type: "string" }, motivo: { type: "string" } } },
    run: async (ctx, a) => {
      const { error } = await ctx.sb.rpc("ai_request_fail", { p_id: a.id, p_error: String(a.motivo || "") });
      if (error) fail(error.message);
      return { ok: true, id: a.id };
    },
  },
  {
    name: "listar_edicoes_premiere",
    title: "Edições esperando plano (Premiere e Editor do HUB)",
    description: "Lista as edições que o plugin VINCIT HUB do Premiere ou o Editor do HUB (projeto \"Editor do HUB\") mandaram para o Claude: clipes da timeline, transcrição com tempos, o pedido do editor, o roteiro e a decupagem do conteúdo e o kit de estilo. Monte o plano de edição e envie com enviar_plano_edicao. Os tempos são em segundos da sequência.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "id de uma edição específica (opcional)" }, incluir_aplicadas: { type: "boolean", default: false } } },
    readOnly: true,
    needs: "audiovisual:premiere",
    run: async (ctx, a) => {
      let q = ctx.sb.from("av_edit_sessions").select("id, content_id, kit_id, project_name, sequence_name, fps, duration_sec, timeline, transcript, request, status, plan_note, created_at").order("created_at", { ascending: false }).limit(5);
      if (a.id) q = q.eq("id", a.id);
      else if (!a.incluir_aplicadas) q = q.eq("status", "aguardando_plano");
      const { data, error } = await q;
      if (error) fail(error.message);
      const out = [];
      for (const s of data || []) {
        const [{ data: ci }, { data: shots }, { data: kit }] = await Promise.all([
          s.content_id ? ctx.sb.from("content_ideas").select("title, hook, body, format").eq("id", s.content_id).maybeSingle() : Promise.resolve({ data: null }),
          s.content_id ? ctx.sb.from("av_shots").select("position, description, framing, audio").eq("content_id", s.content_id).order("position") : Promise.resolve({ data: [] }),
          s.kit_id ? ctx.sb.from("av_style_kits").select("name, data").eq("id", s.kit_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        out.push({
          id: s.id, status: s.status, projeto: s.project_name, sequencia: s.sequence_name, fps: s.fps, duracao_s: s.duration_sec,
          pedido_do_editor: s.request, clipes: s.timeline, transcricao: s.transcript,
          conteudo: ci ? { titulo: ci.title, gancho: ci.hook, formato: ci.format, roteiro: clip(ci.body, 6000) } : null,
          decupagem: shots || [], kit_de_estilo: kit,
        });
      }
      return {
        quantidade: out.length, edicoes: out,
        formato_do_plano: {
          resumo: "1 a 3 frases sobre a edição proposta",
          cortes: "[{inicio, fim, motivo}] trechos para remover (respiros, erros, repetições)",
          legendas: "[{inicio, fim, texto, destaque}] frases curtas de 1 a 4 palavras; destaque = palavra a colorir",
          titulos: "[{inicio, fim, texto, tipo: 'gancho'|'cta'|'lower_third'|'episodio'|'capitulo'|'palavra'|'frase'|'letreiro'|'data'|'lista'|'rec', linha?}] episodio = abertura da série (linha = 'EP. 03 · 2026'); capitulo = roda de capítulos numerada; palavra = palavra-chave na tela; frase = frase de impacto no centro com o quadro escurecido (linha = palavras na cor de destaque); letreiro = palavra gigante espaçada no alto; data = data e lugar do vlog (linha = dia da semana); lista = tela de explicação (linha = itens separados por |); rec = efeito câmera REC em preto e branco. Tipos novos valem no Editor do HUB",
          zooms: "[{inicio, fim, escala}] escala em %, ex.: 110",
          insercoes: "[{inicio, fim, midia, motivo, modo?}] midia = nome do arquivo (no Editor do HUB, um dos B-rolls listados no pedido entra sozinho por cima da fala); modo = 'cheia' | 'esquerda' | 'direita' (cartão lateral)",
          marcadores: "[{inicio, texto}] observações livres para o editor",
          camera: "0 a 3 (só no Editor do HUB): câmera que acompanha a fala com zoom in e out por frase; 0 parada, 1 suave, 2 média, 3 forte",
        },
        regras: "Use só tempos que existem na transcrição/timeline. Respeite o kit de estilo e o pedido do editor. Nada é aplicado sem o editor revisar no Premiere.",
      };
    },
  },
  {
    name: "enviar_plano_edicao",
    title: "Enviar plano de edição",
    description: "Envia o plano de edição (JSON no formato de listar_edicoes_premiere) para uma sequência. O plugin do Premiere ou o Editor do HUB mostra o plano e a pessoa escolhe o que aplicar. No Editor do HUB os cortes são aplicados de verdade na timeline.",
    inputSchema: {
      type: "object", required: ["id", "plano"],
      properties: { id: { type: "string" }, plano: { type: "object", description: "{resumo, cortes, legendas, titulos, zooms, insercoes, marcadores, camera}" }, observacao: { type: "string" } },
    },
    needs: "audiovisual:premiere",
    run: async (ctx, a) => {
      let p = a.plano;
      if (typeof p === "string") { try { p = JSON.parse(p); } catch { fail("O plano precisa ser um JSON válido."); } }
      if (!p || typeof p !== "object" || Array.isArray(p)) fail("O plano precisa ser um objeto JSON.");
      const keys = ["cortes", "legendas", "titulos", "zooms", "insercoes", "marcadores"];
      const plan: any = { resumo: clip(p.resumo, 1000) || "" };
      if (p.camera != null && Number.isFinite(+p.camera)) plan.camera = Math.max(0, Math.min(3, Math.round(+p.camera)));
      for (const k of keys) {
        const arr = Array.isArray(p[k]) ? p[k] : [];
        plan[k] = arr.filter((x: any) => x && Number.isFinite(+x.inicio)).slice(0, 2000).map((x: any) => {
          const o: any = { ...x, inicio: +x.inicio };
          if (x.fim != null) o.fim = +x.fim;
          return o;
        });
      }
      if (!keys.some((k) => plan[k].length)) fail("O plano está vazio. Inclua ao menos cortes, legendas, títulos, zooms, inserções ou marcadores.");
      const { data, error } = await ctx.sb.from("av_edit_sessions").update({ plan, plan_note: clip(a.observacao, 1000), status: "plano_pronto", plan_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", a.id).select("id").maybeSingle();
      if (error) fail(error.message);
      if (!data) fail("Edição não encontrada. Use listar_edicoes_premiere para ver os ids.");
      return { ok: true, id: a.id, itens: Object.fromEntries(keys.map((k) => [k, plan[k].length])), aviso: "O plano aparece no Premiere ou no Editor do HUB em alguns segundos." };
    },
  },
  {
    name: "salvar_kit_estilo",
    title: "Salvar kit de estilo",
    description: "Cria ou atualiza o kit de estilo de edição de um perfil ou cliente (cores, fontes, legenda, motion, regras de corte, MOGRTs). O plugin do Premiere e o plano de edição usam este kit.",
    inputSchema: {
      type: "object", required: ["nome", "kit"],
      properties: {
        id: { type: "string", description: "id do kit para atualizar (opcional)" }, nome: { type: "string" }, perfil_id: accountId,
        kit: { type: "object", description: "{cores:{destaque, texto, fundo}, fontes:{titulo, legenda}, legenda:{estilo, palavras_por_tela, caixa_alta}, motion:[...], regras:{corte_max_s, silencio_ms, trilha_db}, mogrts:{legenda, gancho, cta, lower_third} (caminho do .mogrt no computador do editor)}" },
      },
    },
    needs: "audiovisual:premiere",
    run: async (ctx, a) => {
      await account(ctx, a.perfil_id);
      const row = { name: clip(a.nome, 120), account_id: a.perfil_id || null, data: a.kit || {}, updated_at: new Date().toISOString() };
      const q = a.id ? ctx.sb.from("av_style_kits").update(row).eq("id", a.id) : ctx.sb.from("av_style_kits").insert(row);
      const { data, error } = await q.select("id").maybeSingle();
      if (error) fail(error.message);
      if (!data) fail("Kit não encontrado.");
      return { ok: true, id: data.id, onde: "AUDIOVISUAL › Premiere" };
    },
  },
];

export function allowed(t: Tool, acc: Access) {
  if (!t.needs || acc.role === "superadmin") return true;
  if (t.needs === "creator") return hubAllowed(acc.tools, "creator");
  return can(acc.tools, t.needs);
}

export function listTools(acc: Access) {
  return TOOLS.filter((t) => allowed(t, acc)).map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: { title: t.title, readOnlyHint: !!t.readOnly, destructiveHint: false, idempotentHint: !!t.readOnly, openWorldHint: false },
  }));
}
