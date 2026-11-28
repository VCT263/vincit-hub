import { AsyncLocalStorage } from "node:async_hooks";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `Você é o CREATOR, estrategista sênior de conteúdo para Instagram do VINCIT HUB.
A VINCIT é uma produtora audiovisual brasileira. Você ajuda a planejar conteúdo estratégico: análise de perfis, tendências, referências, ganchos, roteiros, legendas e automações por palavra-chave.
Regras:
- Responda sempre em português do Brasil, direto e prático, sem enrolação.
- Baseie-se nos dados fornecidos. Quando estimar, deixe claro que é estimativa.
- Pense em formatos do Instagram: Reels, carrossel, foto, Stories, Lives.
- Ganchos curtos (até 12 palavras), um único CTA por peça.
- NUNCA invente números, resultados, depoimentos, clientes ou fontes. Quando faltar um dado, deixe um marcador como {{seu número}} ou {{nome do cliente}}.
- Legenda: a 1ª linha precisa funcionar sozinha (o feed corta em ~125 caracteres). Máximo de 5 hashtags por post (limite atual do Instagram).
- Escreva como gente: sem clichês de IA ('no mundo de hoje', 'desvende', 'jornada', 'mergulhe'), sem excesso de travessões e emojis.
- Quando houver "Voz da marca" no contexto, siga-a à risca.
- Você conhece a biblioteca de formatos criativos do VINCIT HUB (ideação, ganchos, copy, estruturas narrativas, elementos de storytelling, formatos de vídeo, linguagem de cinema e estratégia — inclui as 32 cartas da Hannah Franklin e frameworks como AIDA, PAS, Story Circle, ABT, StoryBrand, Kuleshov, Hero-Hub-Help) e sugere a carta adequada quando ajuda.`;

/** Cota diária de uso da IA por assinante (função ai_quota_hit no banco). Sem a função, libera. */
export async function aiQuotaExceeded(supabase: any) {
  // pedido que volta da fila do Claude já foi contado quando entrou
  if (queueCtx.getStore()?.reqId) return false;
  const { data, error } = await supabase.rpc("ai_quota_hit");
  return !error && data === false;
}
export const QUOTA_MSG = "Você atingiu o limite diário de uso da IA. Tente de novo amanhã.";

export async function callClaude(opts: { prompt: string; webSearch?: boolean; maxTokens?: number }) {
  if (aiMode() === "claude") return viaClaudeQueue(opts);
  const key = process.env.ANTHROPIC_API_KEY!;
  const body: any = {
    model: process.env.AI_MODEL || "claude-sonnet-5-5",
    max_tokens: opts.maxTokens ?? 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: opts.prompt }],
  };
  if (opts.webSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Erro da IA (${res.status})`);
  return (json.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
}

export function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[\[{]/);
  if (start < 0) throw new Error("A IA não retornou dados estruturados.");
  const open = candidate[start];
  const close = open === "[" ? "]" : "}";
  const end = candidate.lastIndexOf(close);
  return JSON.parse(candidate.slice(start, end + 1));
}

/* ───────────── IA pela assinatura do Claude (sem API paga) ─────────────
 * Sem AI_MODE=api, nenhuma rota chama a API da Anthropic. O pedido vai para public.ai_requests
 * e a rota responde 202. O Claude da pessoa responde pelo conector VINCIT HUB (painel ou chat,
 * ferramentas listar_pedidos_ia / responder_pedido_ia). O navegador repete o POST com
 * `_ai_request` (src/lib/aiFetch.ts); com o pedido respondido, a rota roda de novo usando o texto
 * do Claude e devolve/grava o resultado como antes, na mesma tela.
 */
export const aiMode = (): "api" | "claude" => (process.env.AI_MODE === "api" && process.env.ANTHROPIC_API_KEY ? "api" : "claude");

type QueueCtx = { endpoint: string; body: any; sb: any; reqId?: string; result?: string; used?: boolean; queuedId?: string; label?: string };
const queueCtx = new AsyncLocalStorage<QueueCtx>();

export const AI_LABELS: Record<string, string> = {
  profile_diagnosis: "Diagnóstico do perfil", trends: "Tendências", reference: "Análise de referência", copy: "Legenda / copy",
  automation_copy: "Mensagens da automação", agent: "Especialista do Creator", format_apply: "Aplicar formato criativo", format_suggest: "Sugerir formatos",
  growth_plan: "Plano de crescimento", content_calendar: "Calendário de conteúdo", briefing_draft: "Rascunho do briefing", brand_voice: "Voz da marca",
  proposal_text: "Texto da proposta", ecommerce_campaign: "Campanha do e-commerce", shot_list: "Decupagem (planos)", ecommerce_closing: "Fechamento do e-commerce",
  brand_concepts: "Símbolos da marca (Design)", brand_territories: "Territórios criativos (Design)", brand_verbal: "Expressão verbal da marca (Design)", carousel_copy: "Texto de carrossel (Design)",
  motion: "Motion sob demanda (Audiovisual)", cenas_roteiro: "Cenas do roteiro (Editor)",
  entrevista_turno: "Entrevista de marca (próxima pergunta)", entrevista_briefing: "Entrevista de marca (briefing)",
  motion_brief: "Refinar pedido de motion (brief)", motion_html: "Produzir motion (HyperFrames)",
};

async function viaClaudeQueue(opts: { prompt: string; webSearch?: boolean; maxTokens?: number }) {
  const ctx = queueCtx.getStore();
  if (!ctx) throw new Error("A IA do HUB roda pelo Claude: abra esta função pelo site do HUB.");
  if (ctx.result != null && !ctx.used) { ctx.used = true; return ctx.result; }
  const { _ai_request, ...payload } = ctx.body || {};
  const task = typeof payload.task === "string" ? payload.task : null;
  const account = payload?.data?.account?.id || payload?.account_id || null;
  const label = ctx.label || (task && AI_LABELS[task]) || (ctx.endpoint.includes("diagnostico") ? "Diagnóstico de crescimento" : ctx.endpoint.includes("ref-profile") ? "Análise de perfil de referência" : "Pedido de IA");
  const { data, error } = await ctx.sb.from("ai_requests").insert({
    endpoint: ctx.endpoint, task, label, payload, account_id: account,
    system: SYSTEM, prompt: opts.prompt, web_search: !!opts.webSearch, max_tokens: opts.maxTokens ?? 4000,
  }).select("id").single();
  if (error) throw new Error(`Não consegui enviar o pedido ao Claude: ${error.message}`);
  ctx.queuedId = data.id; ctx.label = label;
  throw new Error("__AI_QUEUED__");
}

/** Envolve o POST de uma rota de IA: fila do Claude quando não há API paga ligada. */
export function withAIQueue(endpoint: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (aiMode() === "api") return handler(req);
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch {}
    const sb = await createClient();
    const reqId: string | undefined = typeof body?._ai_request === "string" ? body._ai_request : undefined;
    let result: string | undefined;
    if (reqId) {
      const { data: row } = await sb.from("ai_requests").select("id, status, result_text, error, label").eq("id", reqId).maybeSingle();
      if (!row) return NextResponse.json({ error: "Pedido de IA não encontrado." }, { status: 404 });
      if (row.status === "error") return NextResponse.json({ error: row.error || "O Claude não conseguiu responder." }, { status: 500 });
      if (row.status !== "done") return NextResponse.json({ queued: true, request_id: row.id, label: row.label, status: row.status }, { status: 202 });
      result = row.result_text || "";
    }
    const ctx: QueueCtx = { endpoint, body, sb, reqId, result };
    const clone = new Request(req.url, { method: "POST", headers: req.headers, body: raw });
    const res = await queueCtx.run(ctx, () => handler(clone));
    if (ctx.queuedId) return NextResponse.json({ queued: true, request_id: ctx.queuedId, label: ctx.label }, { status: 202 });
    if (reqId && res.ok) await sb.from("ai_requests").update({ delivered_at: new Date().toISOString() }).eq("id", reqId);
    return res;
  };
}
