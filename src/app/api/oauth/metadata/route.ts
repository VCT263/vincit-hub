import { NextResponse } from "next/server";
import { CORS, SUPABASE_URL, siteOrigin } from "@/lib/oauth";

/** /.well-known/oauth-protected-resource e /.well-known/oauth-authorization-server (via rewrite no next.config) */
export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind === "resource") {
    return NextResponse.json(
      {
        resource: `${origin}/api/mcp`,
        authorization_servers: [origin],
        bearer_methods_supported: ["header"],
        resource_name: "VINCIT HUB",
        resource_documentation: `${origin}/conta`,
      },
      { headers: CORS },
    );
  }
  const auth = `${SUPABASE_URL}/auth/v1`;
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${auth}/oauth/authorize`,
      token_endpoint: `${auth}/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      jwks_uri: `${auth}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    },
    { headers: CORS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
