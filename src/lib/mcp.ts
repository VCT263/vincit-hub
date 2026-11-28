import { brandPrompt } from "@/lib/brandPrompt";
import { GUIA_REFINAR_EDICAO, normalizeBrief } from "@/lib/briefs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { can, hubAllowed, type Access } from "@/lib/access";
import { ESTILOS, estiloByNum, estiloTags } from "@/lib/editor/styles";
import { igTokenForOwner } from "@/lib/tokens";
import { gget } from "@/lib/meta";
import { contaInsights } from "@/lib/igInsights";
import { porMes } from "@/lib/igHistorico";
import { NOVIDADES, VERSAO_IA, novidadesDesde } from "@/lib/novidades";
import { briefingProgress } from "@/lib/briefing";
import { FORMATO_ROTEIRO, rowsFromScript } from "@/lib/roteiro";
import { AD_RULES_TEXT } from "@/lib/anuncio";
import { TEMAS, REGRAS_CONDUCAO, contextoPerfil, esquemaBriefing, limparProposta, type Turno } from "@/lib/entrevista";
import { kitsComMarca } from "./kitMarca";

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

/** célula de tabela markdown: sem quebra de linha nem barra vertical */
const celula = (v: any) => String(v ?? "").replace(/\r?\n+/g, " ").replace(/\|/g, "/").trim() || "—";
/** cenas do conector → tabela do roteiro (Tempo · Etapa · Fala · Direção · B-roll · Texto na tela) */
export function tabelaRoteiro(cenas: any[]) {
  const linhas = cenas.map((c) => {
    const dir = [[c.plano, c.camera].filter(Boolean).join(", "), c.direcao].filter((x) => x && String(x).trim()).join(". ");
    return `| ${[c.tempo, c.etapa, c.fala, dir, c.broll, c.texto_tela].map(celula).join(" | ")} |`;
  });
  return ["| Tempo | Etapa | Fala | Direção | B-roll | Texto na tela |", "|---|---|---|---|---|---|", ...linhas].join("\n");
}
/** refaz a folha do roteiro técnico (av_shots) a partir da tabela; os planos antigos vão para a lixeira */
async function refazerFolha(ctx: Ctx, contentId: string, roteiro: string) {
  if (!/^\s*\|/m.test(roteiro || "")) return 0;
  const rows = rowsFromScript(roteiro);
  if (!rows.length) return 0;
  const { count } = await ctx.sb.from("av_shots").select("id", { count: "exact", head: true }).eq("content_id", contentId);
  if (count) {
    const { error } = await ctx.sb.rpc("lixeira_apagar_varios", { p_passos: [{ tabela: "av_shots", filtro: { content_id: contentId } }], p_rotulo: "Roteiro técnico substituído pelo Claude", p_link: "/creator/producao" });
    if (error && !/nada para apagar/.test(error.message)) return 0;
  }
  const { error } = await ctx.sb.from("av_shots").insert(rows.map((r, i) => ({ content_id: contentId, position: i, ...r })));
  return error ? 0 : rows.length;
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
    name: "comecar_no_hub",
    title: "Começar no HUB",
    description: "Chame uma vez no começo da conversa. Traz a conta do HUB, os perfis (briefing pronto em %, se há manual da marca), as pendências (pedidos de IA na fila, entrevistas em andamento) e as novidades de IA desde a última visita desta pessoa, e marca as novidades como vistas.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const [{ data: perfis }, { data: marcas }, { count: pedidos }, { data: ents }, { data: visto }] = await Promise.all([
        ctx.sb.from("ig_accounts").select("id, username, name, niche, briefing, connected").order("created_at"),
        ctx.sb.from("design_projects").select("data").eq("kind", "marca").is("archived_at", null).not("data->>perfil_id", "is", null),
        ctx.sb.from("ai_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "running"]),
        ctx.sb.from("brand_interviews").select("id, account_id, status, updated_at").in("status", ["andamento", "concluida"]).order("updated_at", { ascending: false }).limit(10),
        ctx.sb.from("hub_ai_seen").select("versao").eq("user_id", ctx.userId).maybeSingle(),
      ]);
      const comManual = new Set((marcas || []).map((m: any) => m.data?.perfil_id));
      const nomes = new Map((perfis || []).map((p: any) => [p.id, p.username]));
      const novas = novidadesDesde(visto?.versao);
      if (visto?.versao !== VERSAO_IA) await ctx.sb.from("hub_ai_seen").upsert({ user_id: ctx.userId, versao: VERSAO_IA, visto_em: new Date().toISOString() });
      return {
        conta: { email: ctx.email, nome: ctx.access.name || null, plano: ctx.access.plan || null, status: ctx.access.status },
        perfis: (perfis || []).map((p: any) => ({ id: p.id, perfil: `@${p.username}`, nicho: p.niche || null, briefing_pronto_pct: briefingProgress(p.briefing), manual_da_marca: comManual.has(p.id), instagram_conectado: !!p.connected })),
        pendencias: {
          pedidos_de_ia_na_fila: pedidos || 0,
          entrevistas: (ents || []).map((e: any) => ({ id: e.id, perfil: `@${nomes.get(e.account_id) || "?"}`, status: e.status === "concluida" ? "briefing proposto, falta aprovar no HUB" : "em andamento" })),
        },
        versao_ia: VERSAO_IA,
        novidades: novas,
        dica: novas.length ? "Conte as novidades em 2 ou 3 linhas antes de seguir." : "Sem novidades desde a última visita.",
        prompts_prontos: ["Começar no HUB", "Dossiê do perfil", "Plano do mês", "Pacote da semana", "Análise do perfil", "Refazer aberturas", "Responder pedidos de IA", "Entrevista de marca"],
      };
    },
  },
  {
    name: "novidades",
    title: "Novidades de IA do HUB",
    description: "Lista as novidades de IA do VINCIT HUB (o que mudou nas ferramentas, prompts e regras), da mais nova para a mais antiga.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    run: async () => ({ versao_ia: VERSAO_IA, novidades: NOVIDADES }),
  },
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
    description: "Lista os perfis de Instagram da pessoa no HUB, com nicho, objetivos, voz da marca, briefing e, quando houver, o direcionamento_marca (manual da marca do Design: voz, frases, proibidas, cores, letras, regras de post e de vídeo). Use antes de criar conteúdo e siga a marca à risca.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    needs: "creator",
    run: async (ctx) => {
      const { data, error } = await ctx.sb.from("ig_accounts")
        .select("id, username, name, niche, goals, brand_voice, briefing, followers_count, follows_count, media_count, connected, last_synced_at")
        .order("created_at");
      if (error) fail(error.message);
      // marca do Design ligada a cada perfil: o direcionamento completo para a IA
      const { data: marcas } = await ctx.sb.from("design_projects").select("data").eq("kind", "marca").is("archived_at", null).not("data->>perfil_id", "is", null);
      const porPerfil = new Map((marcas || []).map((m: any) => [m.data?.perfil_id, m.data]));
      return { perfis: (data || []).map((p: any) => (porPerfil.has(p.id) ? { ...p, direcionamento_marca: brandPrompt(porPerfil.get(p.id)) } : p)) };
    },
  },
  {
    name: "ler_desempenho",
    title: "Ler desempenho do perfil",
    description: "Traz o desempenho de um perfil: os posts dos últimos N dias (alcance, curtidas, comentários, salvamentos, compartilhamentos, views, tempo médio assistido dos Reels, pilar do Quadro), as taxas por alcance, médias por formato e por pilar, os destaques e os resultados da conta no Business Suite (visualizações, alcance, interações, visitas ao perfil, novos seguidores e cliques no link contra o período anterior; alcance de seguidores × não seguidores; horários com mais seguidores online; público; histórico mês a mês guardado no HUB). Use os números reais; não invente métricas. Analise primeiro compartilhamentos e salvamentos por alcance, tempo assistido e views: são os sinais que o Instagram mais pesa; curtidas e seguidores pesam menos.",
    inputSchema: { type: "object", properties: { perfil_id: { type: "string", description: "id do perfil (de listar_perfis)" }, dias: { type: "integer", minimum: 1, maximum: 365, default: 30 } }, required: ["perfil_id"] },
    readOnly: true,
    needs: "creator",
    run: async (ctx, a) => {
      const acc = await account(ctx, a.perfil_id);
      const dias = Math.min(365, Math.max(1, Number(a.dias) || 30));
      const since = new Date(Date.now() - dias * 864e5).toISOString();
      const { data, error } = await ctx.sb.from("ig_posts")
        .select("ig_media_id, media_type, caption, permalink, posted_at, like_count, comments_count, reach, saved, shares, plays, avg_watch_ms")
        .eq("account_id", a.perfil_id).gte("posted_at", since).order("posted_at", { ascending: false }).limit(200);
      if (error) fail(error.message);
      const rate = (p: any, k: string) => (Number(p.reach) ? Math.round(((Number(p[k]) || 0) / Number(p.reach)) * 10000) / 100 : null);
      const ids = (data || []).map((p: any) => p.ig_media_id).filter(Boolean);
      const { data: ideas } = ids.length ? await ctx.sb.from("content_ideas").select("ig_media_id, pillar").in("ig_media_id", ids) : { data: [] as any[] };
      const pilarDe = new Map((ideas || []).filter((i: any) => i.pillar).map((i: any) => [i.ig_media_id, i.pillar]));
      const posts = (data || []).map(({ ig_media_id, avg_watch_ms, ...p }: any) => ({
        ...p, caption: clip(p.caption, 300), compart_por_alcance_pct: rate(p, "shares"), salvos_por_alcance_pct: rate(p, "saved"),
        tempo_medio_assistido_s: avg_watch_ms != null ? Math.round(avg_watch_ms / 100) / 10 : null, pilar: pilarDe.get(ig_media_id) || null,
      }));
      const media = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null; };
      const grupo = (key: (p: any) => string | null) => {
        const g: Record<string, any[]> = {};
        posts.forEach((p: any) => { const k = key(p); if (k) (g[k] ??= []).push(p); });
        return Object.entries(g).map(([k, ps]) => ({ grupo: k, posts: ps.length, compart_por_alcance_pct: media(ps.map((p) => p.compart_por_alcance_pct)), salvos_por_alcance_pct: media(ps.map((p) => p.salvos_por_alcance_pct)), alcance_medio: media(ps.map((p) => p.reach)), tempo_medio_assistido_s: media(ps.map((p) => p.tempo_medio_assistido_s)) }))
          .sort((a, b) => ((b.compart_por_alcance_pct || 0) + (b.salvos_por_alcance_pct || 0)) - ((a.compart_por_alcance_pct || 0) + (a.salvos_por_alcance_pct || 0)));
      };
      // resultados da conta (Business Suite), quando o perfil está conectado à Meta
      let conta: any = null;
      try {
        const { data: full } = await ctx.sb.from("ig_accounts").select("ig_user_id, followers_count, connected").eq("id", a.perfil_id).maybeSingle();
        const token = full?.ig_user_id ? await igTokenForOwner(a.perfil_id, ctx.userId) : null;
        if (full?.ig_user_id && token) {
          const r: any = await contaInsights(full as any, token, Math.min(30, Math.max(7, dias)), false);
          const varia = (k: string) => (r.current?.[k] != null && r.previous?.[k] ? Math.round(((r.current[k] - r.previous[k]) / r.previous[k]) * 1000) / 10 : null);
          const pctOf = (x: number, t: number) => (t ? Math.round((x / t) * 1000) / 10 : null);
          const grid: number[][] | null = r.online;
          const DS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
          const horas = grid ? grid.flatMap((row, d) => row.map((v, h) => ({ dia: DS[d], hora: h, online: v }))).sort((x, y) => y.online - x.online) : [];
          const g = (r.audience?.gender || []).filter((x: any) => x.k[0] !== "U"); const gt = g.reduce((t: number, x: any) => t + x.v, 0);
          conta = {
            periodo_dias: r.days,
            resultados: Object.fromEntries(["views", "reach", "total_interactions", "profile_views", "follows", "profile_links_taps"].map((k) => [k, { valor: r.current?.[k] ?? null, periodo_anterior: r.previous?.[k] ?? null, variacao_pct: varia(k) }])),
            alcance_nao_seguidores_pct: r.follow?.reach ? pctOf(r.follow.reach.nao, r.follow.reach.nao + r.follow.reach.seguidores) : null,
            views_nao_seguidores_pct: r.follow?.views ? pctOf(r.follow.views.nao, r.follow.views.nao + r.follow.views.seguidores) : null,
            horarios_mais_online: horas.slice(0, 5),
            historico_mensal: await (async () => {
              const { data: h } = await ctx.sb.from("ig_account_daily").select("day,views,total_interactions,profile_views,follows,profile_links_taps").eq("account_id", a.perfil_id).order("day");
              return porMes(h || []);
            })(),
            publico: {
              genero_pct: Object.fromEntries(g.map((x: any) => [x.k[0] === "F" ? "mulheres" : "homens", pctOf(x.v, gt)])),
              faixas_etarias: (r.audience?.age || []).map((x: any) => ({ faixa: x.k[0], seguidores: x.v })),
              cidades: (r.audience?.city || []).slice(0, 5).map((x: any) => ({ cidade: x.k[0], pct_seguidores: pctOf(x.v, r.audience.total || 0) })),
            },
          };
        }
      } catch {}
      const sum = (k: string) => posts.reduce((t: number, p: any) => t + (Number(p[k]) || 0), 0);
      const alc = sum("reach");
      const sinal = (p: any) => (p.compart_por_alcance_pct ?? -1) + (p.salvos_por_alcance_pct ?? 0);
      const destaques = posts.filter((p: any) => p.reach).sort((a: any, b: any) => sinal(b) - sinal(a)).slice(0, 5)
        .map((p: any) => ({ permalink: p.permalink, media_type: p.media_type, posted_at: p.posted_at, compart_por_alcance_pct: p.compart_por_alcance_pct, salvos_por_alcance_pct: p.salvos_por_alcance_pct, plays: p.plays, tempo_medio_assistido_s: p.tempo_medio_assistido_s, pilar: p.pilar }));
      return {
        perfil: acc, periodo_dias: dias, quantidade: posts.length,
        totais: { alcance: alc, curtidas: sum("like_count"), comentarios: sum("comments_count"), salvamentos: sum("saved"), compartilhamentos: sum("shares"), plays: sum("plays") },
        taxas_por_alcance_pct: alc ? { compartilhamentos: Math.round((sum("shares") / alc) * 10000) / 100, salvamentos: Math.round((sum("saved") / alc) * 10000) / 100 } : null,
        destaques_por_compart_e_salvos: destaques,
        por_formato: grupo((p) => p.media_type),
        por_pilar: grupo((p) => p.pilar),
        tempo_medio_assistido_reels_s: media(posts.map((p: any) => p.tempo_medio_assistido_s)),
        conta,
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
    inputSchema: { type: "object", properties: { perfil_id: accountId, limite: { type: "integer", minimum: 1, maximum: 50, default: 20 }, de: { type: "string", description: "Só conteúdos com data a partir deste dia (AAAA-MM-DD). Opcional; com de/ate a lista vem em ordem de data." }, ate: { type: "string", description: "Só conteúdos com data até este dia (AAAA-MM-DD). Opcional." } } },
    readOnly: true,
    needs: "creator",
    run: async (ctx, a) => {
      const periodo = Boolean(a.de || a.ate);
      let q = ctx.sb.from("content_ideas").select("id, title, kind, format, pillar, hook, planned_for, created_at, content_statuses(name, stage)").is("archived_at", null).order(periodo ? "planned_for" : "created_at", { ascending: periodo }).limit(Math.min(50, Number(a.limite) || 20));
      if (a.perfil_id) q = q.eq("account_id", a.perfil_id);
      if (a.de) q = q.gte("planned_for", a.de);
      if (a.ate) q = q.lte("planned_for", a.ate);
      const { data, error } = await q;
      if (error) fail(error.message);
      return { conteudos: (data || []).map((x: any) => ({ id: x.id, titulo: x.title, tipo: x.kind, formato: x.format, pilar: x.pillar, gancho: x.hook, data: x.planned_for, status: x.content_statuses?.name || null, criado_em: x.created_at })) };
    },
  },
  {
    name: "enviar_campanha",
    title: "Enviar campanha ao Quadro",
    description: "Grava uma campanha (série de posts com data) no Quadro de produção do CREATOR (também aparece na vista Calendário). Cada post vira um card com gancho, roteiro, legenda e CTA.",
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
      return { ok: true, criados: data?.length || 0, onde: "CREATOR › Quadro de produção", ids: (data || []).map((x: any) => x.id) };
    },
  },
  {
    name: "enviar_roteiro",
    title: "Enviar roteiro",
    description: "Grava um roteiro de vídeo no Quadro de produção, na etapa Roteiro (gancho, cenas, legenda). Para vídeo (Reels, Stories, YouTube, Live) mande as cenas em 'cenas': cada plano com a fala, a direção de gravação (plano, câmera e estilo da cena) e o B-roll em campos separados. O HUB monta a tabela do roteiro, o teleprompter (só as falas) e a folha do roteiro técnico do set. Com conteudo_id, completa um card que já existe (por exemplo, um post da campanha) e o move para Roteiro, sem criar card novo; a folha técnica desse card é refeita com as cenas novas.",
    inputSchema: {
      type: "object", required: ["titulo"],
      properties: { conteudo_id: { type: "string", description: "id de um card do Quadro (de listar_conteudos) para completar em vez de criar outro. Opcional." }, perfil_id: accountId, titulo: { type: "string" }, formato: { type: "string", enum: ["Reels", "Carrossel", "Stories", "Foto", "YouTube", "Live"] }, gancho: { type: "string" },
        cenas: {
          type: "array", maxItems: 40, description: "Vídeo: um item por plano, na ordem da montagem. Fala, direção e B-roll nunca se misturam.",
          items: { type: "object", properties: {
            tempo: { type: "string", description: "ex.: 0–3s" },
            etapa: { type: "string", description: "Gancho, Desenvolvimento, Prova, CTA ou Fechamento" },
            fala: { type: "string", description: "só o que a pessoa diz em voz alta (vai para o teleprompter). Vazio quando o plano é só imagem" },
            plano: { type: "string", description: "enquadramento: Close, Médio · olho, Médio fechado, Detalhe, Plano aberto, Top shot, POV…" },
            camera: { type: "string", description: "movimento: Fixa (tripé), Na mão, leve, Push-in lento, Pull-out, Acompanha a ação, Gimbal…" },
            direcao: { type: "string", description: "estilo da cena que se grava junto da fala: quem, onde, ação, olhar, tom. Sem repetir a fala" },
            broll: { type: "string", description: "imagens de apoio para gravar à parte, sem fala, que cobrem este trecho na edição. Vazio se não tiver" },
            texto_tela: { type: "string", description: "texto que aparece na tela, se houver" },
          } },
        },
        roteiro: { type: "string", description: "Para carrossel, foto ou texto: o conteúdo slide a slide. Em vídeo, prefira 'cenas'; se mandar roteiro de vídeo aqui, use a tabela: " + FORMATO_ROTEIRO }, legenda: { type: "string", description: "Legenda sem as hashtags (vão em 'hashtags'). Não use em anúncio: o texto do anúncio vai em 'anuncio.texto'" },
        hashtags: { type: "string", description: "Até 5 hashtags separadas por espaço, de acordo com o conteúdo. Não use em anúncio" },
        horario: { type: "string", description: "Horário sugerido de publicação, HH:MM (veja horarios_mais_online em ler_desempenho e o formato). Não use em anúncio" },
        direcao_editor: { type: "string", description: "Direção para o editor: ritmo, cortes, legenda na tela, trilha, zooms e onde entra cada B-roll. O Editor do HUB abre com ela no pedido" },
        direcao_motion: { type: "string", description: "Pedido para o Motion, se a peça precisar: o que animar, duração e em que momento entra. Vazio se não precisar" },
        anuncio: { type: "object", description: "Só quando a peça for anúncio (segue as regras de anúncio, não as de conteúdo).", properties: { objetivo: { type: "string", description: "Mensagens no WhatsApp, Vendas no site, Tráfego para o perfil ou Reconhecimento" }, publico: { type: "string" }, oferta: { type: "string", description: "oferta e motivo, com prazo" }, botao: { type: "string", description: "Enviar mensagem, Comprar agora, Saiba mais, Ver mais ou Cadastre-se" }, ganchos: { type: "string", description: "3 variações de gancho, uma por linha" }, texto: { type: "string", description: "texto principal, até 125 caracteres antes do 'mais'" }, titulo: { type: "string", description: "até 40 caracteres" } } },
        data: date, pilar: { type: "string" }, estilo: { type: "string", description: "Estilo de edição sugerido, número do catálogo '01' a '12' (veja catalogo_de_estilos em listar_edicoes_premiere). O Editor do HUB já abre com ele" } },
    },
    needs: "creator:producao",
    run: async (ctx, a) => {
      await account(ctx, a.perfil_id);
      const status_id = await statusFor(ctx, "roteiro");
      const est = estiloByNum(a.estilo);
      const cenas: any[] = Array.isArray(a.cenas) ? a.cenas.slice(0, 40) : [];
      if (!cenas.length && !a.roteiro) fail("Mande as cenas (vídeo) ou o roteiro (carrossel, foto).");
      const roteiro = cenas.length ? tabelaRoteiro(cenas) : a.roteiro;
      // o que o post precisa para ir ao ar e a direção de quem edita e anima
      const extras = camposDoCard(a);
      const body = `${a.gancho ? `**Gancho:** ${a.gancho}\n\n` : ""}**Roteiro:**\n${roteiro}${a.legenda ? `\n\n**Legenda:**\n${a.legenda}` : ""}${est ? `\n\n**Estilo de edição:** ${est.num} · ${est.nome}` : ""}\n\n_${ORIGIN}_`;
      if (a.conteudo_id) {
        const { data: atual } = await ctx.sb.from("content_ideas").select("id, account_id, format, planned_for, pillar, hook").eq("id", a.conteudo_id).maybeSingle();
        if (!atual) fail("Card não encontrado. Use listar_conteudos para ver os ids.");
        const patch: Record<string, any> = {
          title: clip(a.titulo, 120), body, kind: "copy",
          format: a.formato || atual!.format || "Reels", hook: clip(a.gancho, 300) || atual!.hook,
          planned_for: a.data || atual!.planned_for, pillar: clip(a.pilar, 80) || atual!.pillar,
        };
        if (a.legenda) patch.caption = a.legenda;
        Object.assign(patch, extras);
        if (a.perfil_id) patch.account_id = a.perfil_id;
        if (status_id) patch.status_id = status_id;
        const { error } = await ctx.sb.from("content_ideas").update(patch).eq("id", a.conteudo_id);
        if (error) fail(error.message);
        const folha = await refazerFolha(ctx, a.conteudo_id, roteiro);
        return { ok: true, id: a.conteudo_id, atualizado: true, planos: folha, onde: "CREATOR › Quadro de produção (etapa Roteiro)" };
      }
      const { data, error } = await ctx.sb.from("content_ideas").insert({
        account_id: a.perfil_id || null, kind: "copy", status_id, title: clip(a.titulo, 120), format: a.formato || "Reels", hook: clip(a.gancho, 300), planned_for: a.data || null, pillar: clip(a.pilar, 80),
        body, caption: a.legenda || null, ...extras,
      }).select("id").single();
      if (error) fail(error.message);
      const folha = data?.id ? await refazerFolha(ctx, data.id, roteiro) : 0;
      return { ok: true, id: data?.id, planos: folha, onde: "CREATOR › Quadro de produção (etapa Roteiro)" };
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
      return { ok: true, id: data?.id, onde: "CREATOR › Perfis & marca (desempenho do perfil)" };
    },
  },
  {
    name: "ler_comentarios",
    title: "Ler comentários do perfil",
    description: "Lê ao vivo, na Meta, os comentários dos posts mais recentes de um perfil (nada é guardado no HUB) e separa as perguntas que o perfil ainda não respondeu. Use para tirar pauta do que o público pergunta (Plano do mês) e para achar dúvidas de produto. Cite as perguntas como estão; não invente.",
    inputSchema: { type: "object", required: ["perfil_id"], properties: { perfil_id: { type: "string", description: "id do perfil (de listar_perfis)" }, posts: { type: "integer", minimum: 1, maximum: 30, default: 15, description: "Quantos posts recentes com comentário ler" }, dias: { type: "integer", minimum: 7, maximum: 365, default: 90 } } },
    readOnly: true,
    needs: "creator",
    run: async (ctx, a) => {
      const acc: any = await account(ctx, a.perfil_id);
      const { data: full } = await ctx.sb.from("ig_accounts").select("ig_user_id").eq("id", a.perfil_id).maybeSingle();
      const token = full?.ig_user_id ? await igTokenForOwner(a.perfil_id, ctx.userId) : null;
      if (!token) fail("Este perfil não está conectado à Meta no HUB. Conecte o Instagram em Perfis & marca e tente de novo.");
      const dias = Math.min(365, Math.max(7, Number(a.dias) || 90));
      const { data: posts, error } = await ctx.sb.from("ig_posts").select("ig_media_id, permalink, caption, posted_at, comments_count")
        .eq("account_id", a.perfil_id).gt("comments_count", 0).gte("posted_at", new Date(Date.now() - dias * 864e5).toISOString())
        .order("posted_at", { ascending: false }).limit(Math.min(30, Math.max(1, Number(a.posts) || 15)));
      if (error) fail(error.message);
      const eu = String(acc?.username || "").toLowerCase();
      const pergunta = (t: string) => /\?/.test(t) || /^(como|qual|quais|quanto|quando|onde|tem |vocês|voces|serve|vende|entrega|aceita|posso|dá pra|da pra)/i.test(t.trim());
      const lidos = await Promise.all((posts || []).map(async (p: any) => {
        try {
          const j: any = await gget(`${p.ig_media_id}/comments`, { access_token: token as string, fields: "text,username,timestamp,like_count,replies{username}", limit: "50" });
          const cs = (j.data || []).filter((c: any) => String(c.username || "").toLowerCase() !== eu && String(c.text || "").trim());
          return {
            post: { permalink: p.permalink, data: p.posted_at?.slice(0, 10), legenda: clip(p.caption, 120) },
            comentarios: cs.map((c: any) => ({ texto: clip(c.text, 400), curtidas: c.like_count || 0, pergunta: pergunta(String(c.text)), respondido: (c.replies?.data || []).some((r: any) => String(r.username || "").toLowerCase() === eu) })),
          };
        } catch (e: any) { return { post: { permalink: p.permalink, data: p.posted_at?.slice(0, 10) }, comentarios: [], erro: String(e?.message || e).slice(0, 160) }; }
      }));
      const semResposta = lidos.flatMap((l: any) => l.comentarios.filter((c: any) => c.pergunta && !c.respondido).map((c: any) => ({ pergunta: c.texto, curtidas: c.curtidas, post: l.post.permalink })));
      return {
        perfil: `@${acc?.username}`, posts_lidos: lidos.length,
        perguntas_sem_resposta: semResposta.sort((x: any, y: any) => y.curtidas - x.curtidas).slice(0, 60),
        por_post: lidos.map((l: any) => ({ ...l, comentarios: l.comentarios.slice(0, 25) })),
        aviso: lidos.length ? undefined : "Nenhum post com comentário nesse período. Sincronize o perfil em Desempenho.",
      };
    },
  },
  {
    name: "registrar_aprendizado",
    title: "Registrar aprendizado",
    description: "Guarda no briefing do perfil (campo Aprendizados) uma regra que saiu de uma correção da pessoa, para nunca repetir o erro. Toda IA do HUB e este conector passam a seguir. Uma regra por chamada, em 1 frase curta e acionável. Mostre a regra e confirme antes de chamar.",
    inputSchema: { type: "object", required: ["perfil_id", "regra"], properties: { perfil_id: { type: "string", description: "id do perfil (de listar_perfis)" }, regra: { type: "string", description: "Ex.: Não reescrever um gancho que já foi aprovado." } } },
    needs: "creator",
    run: async (ctx, a) => {
      const regra = String(a.regra || "").replace(/\s+/g, " ").trim().slice(0, 240);
      if (regra.length < 5) fail("Escreva a regra numa frase.");
      const { data: acc, error: e1 } = await ctx.sb.from("ig_accounts").select("id, username, briefing").eq("id", a.perfil_id).maybeSingle();
      if (e1) fail(e1.message);
      if (!acc) fail("Perfil não encontrado. Use listar_perfis para ver os ids dos seus perfis.");
      const b: any = acc!.briefing || {};
      const atuais: string[] = Array.isArray(b.aprendizados) ? b.aprendizados : [];
      const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\d]+/gu, " ").trim();
      if (atuais.some((x) => norm(x) === norm(regra))) return { ok: true, ja_existia: true, total: atuais.length };
      const lista = [...atuais, regra].slice(-80);
      const { error } = await ctx.sb.from("ig_accounts").update({ briefing: { ...b, aprendizados: lista }, briefing_updated_at: new Date().toISOString() }).eq("id", a.perfil_id);
      if (error) fail(error.message);
      return { ok: true, total: lista.length, onde: "CREATOR › Perfis & marca › Briefing (Marca & estilo › Aprendizados)" };
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
          s.content_id ? ctx.sb.from("content_ideas").select("title, hook, body, format, editor_brief, motion_brief, is_ad, ad_brief").eq("id", s.content_id).maybeSingle() : Promise.resolve({ data: null }),
          s.content_id ? ctx.sb.from("av_shots").select("position, description, framing, audio").eq("content_id", s.content_id).order("position") : Promise.resolve({ data: [] }),
          s.kit_id ? ctx.sb.from("av_style_kits").select("id, name, data").eq("id", s.kit_id).maybeSingle().then(async (r: any) => ({ data: r.data ? (await kitsComMarca(ctx.sb, [r.data]))[0] : null })) : Promise.resolve({ data: null }),
        ]);
        out.push({
          id: s.id, status: s.status, projeto: s.project_name, sequencia: s.sequence_name, fps: s.fps, duracao_s: s.duration_sec,
          pedido_do_editor: s.request, clipes: s.timeline, transcricao: s.transcript,
          conteudo: ci ? { titulo: ci.title, gancho: ci.hook, formato: ci.format, roteiro: clip(ci.body, 6000), direcao_editor: ci.editor_brief || null, direcao_motion: ci.motion_brief || null, anuncio: ci.is_ad ? { ...(ci.ad_brief || {}), regras: AD_RULES_TEXT } : null } : null,
          decupagem: shots || [], kit_de_estilo: kit,
        });
      }
      return {
        quantidade: out.length, edicoes: out,
        formato_do_plano: {
          resumo: "1 a 3 frases sobre a edição proposta",
          brief: "opcional, recomendado: o brief da edição (8 partes, tipo 'edicao'), escrito antes do plano; veja regras",
          cortes: "[{inicio, fim, motivo}] trechos para remover (respiros, erros, repetições)",
          legendas: "[{inicio, fim, texto, destaque}] frases curtas de 1 a 4 palavras; destaque = palavra a colorir",
          titulos: "[{inicio, fim, texto, tipo: 'gancho'|'cta'|'lower_third'|'episodio'|'capitulo'|'palavra'|'frase'|'letreiro'|'data'|'lista'|'rec'|'vazado'|'riscado'|'numero'|'grafico'|'checklist'|'seta'|'relogio'|'progresso', linha?}] episodio = abertura da série (linha = 'EP. 03 · 2026'); capitulo = roda de capítulos numerada; palavra = palavra-chave na tela; frase = frase de impacto no centro com o quadro escurecido (linha = palavras na cor de destaque); letreiro = palavra gigante espaçada no alto; data = data e lugar do vlog (linha = dia da semana); lista = tela de explicação (linha = itens separados por |); rec = efeito câmera REC em preto e branco; vazado = palavra grande e transparente no espaço vazio (linha = 2ª linha em itálico); riscado = palavra riscada em vermelho e a certa embaixo (texto = a errada, linha = a certa; use em 'não é X, é Y'). Motion (animação nas cores do kit, alternativa à imagem): numero = número contando (texto '70%' ou 'R$ 3 mil', linha = legenda); grafico = barras subindo (linha = legenda); checklist = itens marcados (linha = itens separados por |); seta = seta desenhada (linha = esquerda|direita|cima|baixo); relogio = relógio girando (texto '30 min'); progresso = barra enchendo (texto = número de 0 a 100). Nada fica fixo o vídeo todo: cada texto dura 2 a 3 s. Tipos novos valem no Editor do HUB",
          zooms: "[{inicio, fim, escala, tipo?}] escala em %, ex.: 110; tipo = punch (rápido) | push (aproxima devagar) | pull (afasta devagar) | tremida (impacto) | chicote (virada de assunto)",
          insercoes: "[{inicio, fim, midia, motivo, modo?}] midia = nome do arquivo (no Editor do HUB, um dos B-rolls listados no pedido entra sozinho por cima da fala); modo = 'cheia' | 'esquerda' | 'direita' (cartão lateral) | 'polaroid' | 'circulo' | 'metade' (metade de cima) | 'pagina' (fundo claro com a foto num cartão). Use inserção só em alguns trechos, não no vídeo todo",
          marcadores: "[{inicio, texto}] observações livres para o editor",
          camera: "0 a 3 (só no Editor do HUB): câmera que acompanha a fala com zoom in e out por frase; 0 parada, 1 suave, 2 média, 3 forte",
          estilo: "'01' a '12' (só no Editor do HUB): número do catálogo de estilos. Aplica lettering, câmera, cor, transição e jump cut do estilo; seus cortes, zooms e títulos entram por cima. Use o estilo pedido, senão o padrão do kit (kit_de_estilo.data.estilo), senão sugira o que combina com o roteiro",
        },
        catalogo_de_estilos: ESTILOS.map((e) => ({ numero: e.num, nome: e.nome, resumo: e.resumo, bom_para: e.uso, definicao: estiloTags(e).join(" · ") })),
        regras: GUIA_REFINAR_EDICAO + " Use só tempos que existem na transcrição/timeline. Respeite o kit de estilo (kit_de_estilo.data.regras e vocabulario) e o pedido do editor. Nada é aplicado sem o editor revisar no Premiere. Corte entre frases, nunca dentro de uma: tire o silêncio maior que regras.silencio_ms, mantenha regras.folga_ms de respiro e as pausas naturais de até regras.batida_ms depois de vírgula ou de 'primeiro'. Vício (regras.vicios) só sai com silêncio dos dois lados. Tomada repetida: fica a última limpa; gaguejo e falso começo saem. História: gancho nos 3 s iniciais, uma linha de contexto, um plano por item de lista, virada que volta ao gancho, CTA. Ritmo de reel com fala: primeiro corte até regras.primeiro_corte_s, planos de cerca de regras.plano_medio_s, a pessoa fora da tela no máximo regras.max_sem_rosto_s. Legenda de 1 a 3 palavras, um visual só no vídeo inteiro, cor em no máximo 45% das telas e por sentido, nunca sobre a boca (sobretudo nos 2,5 s iniciais), com a grafia do vocabulário. Som: trilha cerca de 11 dB abaixo da voz, efeito sonoro só em ação visível (regras.sfx), no estilo de som da marca (regras.som_estilo: delicado, tatil, minimal, cinematico ou agressivo; sons em public/sons, gerados pelo Earshot), volume final regras.lufs e pico regras.pico_dbtp. Nunca invente número para enfeitar uma fala.",
      };
    },
  },
  {
    name: "enviar_plano_edicao",
    title: "Enviar plano de edição",
    description: "Envia o plano de edição (JSON no formato de listar_edicoes_premiere) para uma sequência. O plugin do Premiere ou o Editor do HUB mostra o plano e a pessoa escolhe o que aplicar. No Editor do HUB os cortes são aplicados de verdade na timeline.",
    inputSchema: {
      type: "object", required: ["id", "plano"],
      properties: { id: { type: "string" }, plano: { type: "object", description: "{resumo, cortes, legendas, titulos, zooms, insercoes, marcadores, camera, estilo}" }, observacao: { type: "string" } },
    },
    needs: "audiovisual:premiere",
    run: async (ctx, a) => {
      let p = a.plano;
      if (typeof p === "string") { try { p = JSON.parse(p); } catch { fail("O plano precisa ser um JSON válido."); } }
      if (!p || typeof p !== "object" || Array.isArray(p)) fail("O plano precisa ser um objeto JSON.");
      const keys = ["cortes", "legendas", "titulos", "zooms", "insercoes", "marcadores"];
      const plan: any = { resumo: clip(p.resumo, 1000) || "" };
      if (p.brief && typeof p.brief === "object") plan.brief = normalizeBrief(p.brief, "edicao");
      if (p.camera != null && Number.isFinite(+p.camera)) plan.camera = Math.max(0, Math.min(3, Math.round(+p.camera)));
      const est = estiloByNum(p.estilo);
      if (est) plan.estilo = est.num;
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
        kit: { type: "object", description: "{cores:{destaque, texto, fundo}, fontes:{titulo, legenda}, legenda:{estilo, palavras_por_tela, caixa_alta}, motion:[...], regras:{corte_max_s, silencio_ms, trilha_db, folga_ms, batida_ms, vicios[], tomada, plano_medio_s, primeiro_corte_s, max_sem_rosto_s, lufs, pico_dbtp, sfx, som_estilo: delicado|tatil|minimal|cinematico|agressivo}, vocabulario: 'errado = certo' por linha, estilo: '01' a '12' (estilo padrão do cliente no catálogo), mogrts:{legenda, gancho, cta, lower_third} (caminho do .mogrt no computador do editor)}" },
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
  {
    name: "entrevista_abrir",
    title: "Abrir entrevista de marca",
    description: "Abre (ou retoma) a entrevista de marca de um perfil: traz o briefing atual, os temas, as regras de condução e a conversa já feita (no HUB ou no Claude). Use para conduzir a entrevista com a pessoa, uma pergunta por vez, com senso crítico.",
    inputSchema: { type: "object", required: ["perfil_id"], properties: { perfil_id: { type: "string", description: "id do perfil (de listar_perfis)" }, nova: { type: "boolean", description: "true para começar outra do zero" } } },
    needs: "creator",
    run: async (ctx, a) => {
      await account(ctx, a.perfil_id);
      const { data: acc } = await ctx.sb.from("ig_accounts").select("id, username, name, niche, goals, brand_voice, briefing").eq("id", a.perfil_id).maybeSingle();
      let ent: any = null;
      if (!a.nova) ent = (await ctx.sb.from("brand_interviews").select("id, status, turns, tema").eq("account_id", a.perfil_id).eq("status", "andamento").order("updated_at", { ascending: false }).limit(1).maybeSingle()).data;
      if (!ent) {
        const { data, error } = await ctx.sb.from("brand_interviews").insert({ account_id: a.perfil_id, owner_id: ctx.userId }).select("id, status, turns, tema").single();
        if (error) fail(error.message);
        ent = data;
      }
      return {
        entrevista_id: ent.id, perfil: `@${acc?.username}`, tema_atual: ent.tema, conversa_ate_agora: ent.turns || [],
        briefing_atual: contextoPerfil(acc), temas: TEMAS, regras: REGRAS_CONDUCAO,
        como_registrar: "A cada resposta, chame entrevista_registrar com a pergunta feita, a resposta e quem respondeu. Ao final, entrevista_concluir com a proposta.",
        formato_da_proposta: `{"resumo": string, "campos": {${esquemaBriefing()}}, "campanha": {"pecas": [{"nome","preco","tamanhos","obs"}], "datas": [string], "oferta": string, "gravacao": string, "meta": string}, "citacoes": [string], "pendencias": [string]}`,
        tela_no_hub: `/creator/entrevista?perfil=${a.perfil_id}`,
      };
    },
  },
  {
    name: "entrevista_registrar",
    title: "Registrar resposta da entrevista",
    description: "Grava no HUB uma pergunta da entrevista de marca e a resposta da pessoa (para a conversa aparecer no HUB e poder continuar lá). Não precisa pedir confirmação.",
    inputSchema: { type: "object", required: ["entrevista_id", "pergunta", "resposta"], properties: { entrevista_id: { type: "string" }, pergunta: { type: "string" }, resposta: { type: "string" }, quem: { type: "string", description: "nome de quem respondeu" }, tema: { type: "integer", minimum: 1, maximum: 10 } } },
    needs: "creator",
    run: async (ctx, a) => {
      const { data: ent } = await ctx.sb.from("brand_interviews").select("id, turns, tema, status").eq("id", a.entrevista_id).maybeSingle();
      if (!ent) fail("Entrevista não encontrada. Use entrevista_abrir.");
      const at = new Date().toISOString();
      const tema = Number(a.tema) || ent.tema || 1;
      const turns: Turno[] = [...(ent.turns || []), { r: "e", t: clip(a.pergunta, 1500)!, tema, at, via: "claude" }, { r: "p", t: clip(a.resposta, 6000)!, quem: clip(a.quem, 60) || undefined, tema, at, via: "claude" }];
      const { error } = await ctx.sb.from("brand_interviews").update({ turns, tema, status: "andamento", updated_at: at }).eq("id", a.entrevista_id);
      if (error) fail(error.message);
      return { ok: true, respostas: turns.filter((t) => t.r === "p").length };
    },
  },
  {
    name: "entrevista_concluir",
    title: "Concluir entrevista de marca",
    description: "Salva a proposta de briefing da entrevista (formato em entrevista_abrir). O briefing do perfil só muda depois que a pessoa aprova na tela Entrevista do HUB. Mostre a proposta e confirme antes de chamar.",
    inputSchema: { type: "object", required: ["entrevista_id", "proposta"], properties: { entrevista_id: { type: "string" }, proposta: { type: "object" } } },
    needs: "creator",
    run: async (ctx, a) => {
      let p = a.proposta;
      if (typeof p === "string") { try { p = JSON.parse(p); } catch { fail("A proposta precisa ser um JSON válido."); } }
      const proposta = limparProposta(p);
      const { data, error } = await ctx.sb.from("brand_interviews").update({ proposta, status: "concluida", updated_at: new Date().toISOString() }).eq("id", a.entrevista_id).select("id, account_id").maybeSingle();
      if (error) fail(error.message);
      if (!data) fail("Entrevista não encontrada.");
      return { ok: true, campos: Object.keys(proposta.campos), aprovar_em: `/creator/entrevista?perfil=${data.account_id}` };
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

/** campos novos do card (28/11): publicação, direção de edição e Motion, anúncio */
function camposDoCard(a: any) {
  const out: Record<string, any> = {};
  const hhmm = String(a.horario || "").match(/^(\d{1,2})[:h](\d{2})?/);
  if (hhmm && Number(hhmm[1]) < 24) out.publish_time = `${hhmm[1].padStart(2, "0")}:${hhmm[2] || "00"}`;
  const tags = String(a.hashtags || "").match(/#?[\p{L}\d_]+/gu)?.map((t) => (t.startsWith("#") ? t : "#" + t)).slice(0, 5);
  if (tags?.length) out.hashtags = tags.join(" ");
  if (a.direcao_editor) out.editor_brief = clip(a.direcao_editor, 4000);
  if (a.direcao_motion) out.motion_brief = clip(a.direcao_motion, 2000);
  if (a.anuncio && typeof a.anuncio === "object") {
    const keys = ["objetivo", "publico", "oferta", "botao", "ganchos", "texto", "titulo"];
    const ad: Record<string, string> = {};
    for (const k of keys) if (a.anuncio[k]) ad[k] = clip(String(a.anuncio[k]), 1000) as string;
    out.is_ad = true; out.ad_brief = ad;
  }
  return out;
}
