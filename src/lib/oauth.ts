/**
 * Login do conector do Claude (MCP) pelo servidor OAuth 2.1 do Supabase Auth.
 *
 * O registro dinâmico aberto do Supabase fica DESLIGADO (qualquer app poderia se registrar).
 * No lugar dele, /api/oauth/register só entrega o app "Claude" já cadastrado no Supabase
 * (cliente público com PKCE) e só para os endereços de retorno do próprio Claude.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** id do app "Claude" em Supabase › Authentication › OAuth Apps (não é segredo: cliente público) */
export const CLAUDE_CLIENT_ID = process.env.CLAUDE_OAUTH_CLIENT_ID || "8fc696df-2368-4434-aa55-d7d839105e68";

/** endereços de retorno aceitos (os mesmos cadastrados no app do Supabase) */
export const CLAUDE_REDIRECTS = ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"];

export const isClaudeRedirect = (u: string) => CLAUDE_REDIRECTS.includes((u || "").split("?")[0]);

/** origem pública do site (respeita o domínio que a pessoa usou) */
export function siteOrigin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Accept",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
