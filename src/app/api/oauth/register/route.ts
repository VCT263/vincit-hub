import { NextResponse } from "next/server";
import { CLAUDE_CLIENT_ID, CLAUDE_REDIRECTS, CORS, isClaudeRedirect } from "@/lib/oauth";

/**
 * Registro de cliente (RFC 7591) restrito: devolve sempre o app "Claude" já cadastrado no Supabase,
 * e só quando todos os endereços de retorno pedidos são os do Claude. Qualquer outro app é recusado.
 */
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const uris: string[] = Array.isArray(body?.redirect_uris) ? body.redirect_uris : [];
  if (!uris.length || !uris.every(isClaudeRedirect)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "Este servidor só aceita o conector oficial do Claude (claude.ai)." },
      { status: 400, headers: CORS },
    );
  }
  return NextResponse.json(
    {
      client_id: CLAUDE_CLIENT_ID,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: "Claude",
      redirect_uris: CLAUDE_REDIRECTS.filter((u) => uris.some((x) => x.split("?")[0] === u)),
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
