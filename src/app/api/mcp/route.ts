import { NextResponse } from "next/server";
import { createClient as createPlain } from "@supabase/supabase-js";
import type { Access } from "@/lib/access";
import { CORS, siteOrigin } from "@/lib/oauth";
import { TOOLS, allowed, isUserError, listTools, type Ctx } from "@/lib/mcp";
import { promptConector } from "@/lib/entrevista";

/**
 * Conector VINCIT HUB para o Claude (servidor MCP, transporte HTTP "streamable", sem sessão).
 * Autenticação: token OAuth do Supabase Auth emitido para o app "Claude" (ver /oauth/consent).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS = [
  "Conector do VINCIT HUB (plataforma de conteúdo e gestão da produtora VINCIT). Responda em português do Brasil.",
  "Antes de criar conteúdo, chame listar_perfis e respeite nicho, objetivos, voz da marca e briefing do perfil. Quando o perfil tiver direcionamento_marca (manual da marca criado no Design), siga-o à risca em posts, legendas, roteiros e planos de edição: voz, frases, palavras proibidas, cores, letras e regras.",
  "Para análises, use ler_desempenho e cite só números reais; nunca invente métricas.",
  "Regras de texto: primeira linha da legenda com até 125 caracteres, no máximo 5 hashtags, sem clichês de IA. Para ser achado na busca do Instagram e nas IAs, responda uma pergunta clara já no gancho (dita em voz alta no vídeo) e use palavras-chave do produto na legenda.",
  "Antes de entregar uma legenda, tire os vícios de texto de IA: evite revelações do tipo 'O resultado?', 'Não é X, é Y', 'Sem X. Sem Y. Só Z.', trios em sequência, frases soltas de efeito (no máximo 2), anúncios de sinceridade ('vou ser sincero', 'real') e palavras de IA ('crucial', 'jornada', 'elevar', 'potencializar'); use no máximo 1 travessão. Prefira um número exato com referência (quem, quando, quanto), um nome real e um detalhe concreto; se faltar, pergunte em vez de inventar. Fecho com pedido de ação específico (salvar, mandar para alguém), não 'o que você acha?'.",
  "Métricas: em análises e fechamentos, comece por compartilhamentos e salvamentos por alcance, views e tempo assistido; curtidas e seguidores pesam menos.",
  "Marca de moda (ex.: ISYS): distribua a pauta entre 4 tipos e use o tipo como pilar: Fundadora (história e inspiração da peça, 1 por semana no mínimo), Estilo de vida (arrume-se comigo, look do dia), Educativo (tecido, caimento, tamanhos em corpos diferentes, jeitos de usar) e Editorial (só com verba). Inclua 1 peça fora do padrão por semana (formato, cor ou edição diferente).",
  "Mostre o conteúdo à pessoa e confirme antes de chamar as ferramentas que gravam (enviar_*, salvar_analise).",
  "Pacote da semana: quando a pessoa pedir a semana de um perfil num pedido só (ex.: 'Natal ISYS, semana 1'), chame listar_perfis e listar_conteudos com perfil_id, de e ate da semana; complete os cards que já existem em vez de criar outros (enviar_roteiro com conteudo_id) e só crie cards para o que faltar. Para cada peça entregue tipo, gancho falado, roteiro com cenas e teleprompter, legenda, CTA e estilo de edição; feche com a checklist de revisão (gancho responde uma pergunta, peça com nome e corpo real, mix da semana, palavras proibidas, um CTA) e com o que só a pessoa pode dar (peças, preços, datas). Mostre tudo junto e grave só depois do ok.",
  "Entrevista de marca: quando a pessoa pedir a entrevista (ou usar o prompt entrevista_de_marca), chame entrevista_abrir, conduza uma pergunta por vez seguindo as regras dela, registre cada resposta com entrevista_registrar sem pedir confirmação e, no fim, mostre a proposta e chame entrevista_concluir com o ok.",
  "Quando a pessoa pedir para responder os pedidos de IA do HUB, chame listar_pedidos_ia e responda cada pedido com responder_pedido_ia, seguindo as instruções e o formato do prompt (JSON quando pedido); não precisa confirmar cada um.",
].join(" ");

/** prompts prontos que aparecem no Claude de quem liga o conector */
const PROMPTS = [
  {
    name: "entrevista_de_marca", title: "Entrevista de marca",
    description: "Conversa (por voz ou texto) que entrevista o dono da marca, questiona respostas vagas e propõe o briefing do perfil no HUB.",
    arguments: [{ name: "perfil", description: "@ do perfil (opcional)", required: false }],
    text: (a: any) => promptConector(a?.perfil ? String(a.perfil).slice(0, 60) : undefined),
  },
];

const json = (body: any, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...CORS, ...extra } });

function unauthorized(req: Request, msg = "Faça login no VINCIT HUB para usar o conector.") {
  const meta = `${siteOrigin(req)}/.well-known/oauth-protected-resource`;
  return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: msg } }, 401, {
    // cabeçalho HTTP só aceita ASCII: a mensagem em português vai no corpo
    "WWW-Authenticate": `Bearer error="invalid_token", error_description="Login required", resource_metadata="${meta}"`,
  });
}

async function auth(req: Request): Promise<Ctx | null> {
  const h = req.headers.get("authorization") || "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const sb = createPlain(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: acc } = await sb.rpc("my_access");
  const access = (acc || { role: "user", status: "pendente", tools: [] }) as Access;
  return { sb, userId: data.user.id, email: data.user.email || "", access };
}

async function handle(msg: any, ctx: Ctx) {
  const { id, method, params } = msg || {};
  const ok = (result: any) => ({ jsonrpc: "2.0", id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  switch (method) {
    case "initialize": {
      const v = VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[1];
      return ok({ protocolVersion: v, capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } }, serverInfo: { name: "vincit-hub", title: "VINCIT HUB", version: "1.0.0" }, instructions: INSTRUCTIONS });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: listTools(ctx.access) });
    case "tools/call": {
      const t = TOOLS.find((x) => x.name === params?.name);
      if (!t) return err(-32602, `Ferramenta desconhecida: ${params?.name}`);
      const blocked = (text: string) => ok({ content: [{ type: "text", text }], isError: true });
      if (ctx.access.role !== "superadmin" && ctx.access.status !== "ativo") return blocked(`Sua conta do HUB está ${ctx.access.status}. Fale com o administrador.`);
      if (!allowed(t, ctx.access)) return blocked("Essa ferramenta não está incluída no seu plano do VINCIT HUB.");
      try {
        const out = await t.run(ctx, params?.arguments || {});
        return ok({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: false });
      } catch (e: any) {
        return blocked(isUserError(e) ? e.message : `Erro no HUB: ${e?.message || e}`);
      }
    }
    case "resources/list":
      return ok({ resources: [] });
    case "prompts/list":
      return ok({ prompts: PROMPTS.map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: args })) });
    case "prompts/get": {
      const p = PROMPTS.find((x) => x.name === params?.name);
      if (!p) return err(-32602, `Prompt desconhecido: ${params?.name}`);
      return ok({ description: p.description, messages: [{ role: "user", content: { type: "text", text: p.text(params?.arguments || {}) } }] });
    }
    default:
      return err(-32601, `Método não suportado: ${method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, 400); }
  const ctx = await auth(req);
  if (!ctx) return unauthorized(req);

  const list = Array.isArray(body) ? body : [body];
  const out = [];
  for (const m of list) {
    if (m?.id === undefined || m?.id === null) continue; // notificações e respostas não têm retorno
    out.push(await handle(m, ctx));
  }
  if (!out.length) return new NextResponse(null, { status: 202, headers: CORS });
  return json(Array.isArray(body) ? out : out[0]);
}

/** sem fluxo SSE do servidor: o conector só responde a pedidos */
export async function GET(req: Request) {
  if (!req.headers.get("authorization")) return unauthorized(req);
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
