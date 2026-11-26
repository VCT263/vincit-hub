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
    description: "Traz os posts de um perfil nos últimos N dias com alcance, curtidas, comentários, salvamentos, compartilhamentos e plays, mais os totais. Use os números reais; não invente métricas.",
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
      const posts = (data || []).map((p: any) => ({ ...p, caption: clip(p.caption, 300) }));
      const sum = (k: string) => posts.reduce((t: number, p: any) => t + (Number(p[k]) || 0), 0);
      return {
        perfil: acc, periodo_dias: dias, quantidade: posts.length,
        totais: { alcance: sum("reach"), curtidas: sum("like_count"), comentarios: sum("comments_count"), salvamentos: sum("saved"), compartilhamentos: sum("shares"), plays: sum("plays") },
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
