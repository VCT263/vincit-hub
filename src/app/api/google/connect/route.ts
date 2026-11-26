import { NextResponse } from "next/server";
import { GOOGLE_SCOPES } from "@/lib/google";
import { DRIVE_SCOPE } from "@/lib/drive";

export async function GET(request: Request) {
  const req = new URL(request.url);
  const origin = req.origin;
  // ?drive=1 pede também a leitura do Google Drive (banco de mídia do Audiovisual); ?next= volta para a página de origem
  const drive = req.searchParams.get("drive") === "1";
  const next = req.searchParams.get("next") || "";
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(`${origin}/conta?google_erro=${encodeURIComponent("A integração com o Google ainda não foi configurada pelo administrador (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).")}#google`);
  const state = crypto.randomUUID();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", `${origin}/api/google/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", drive ? `${GOOGLE_SCOPES} ${DRIVE_SCOPE}` : GOOGLE_SCOPES);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  const res = NextResponse.redirect(u.toString());
  res.cookies.set("g_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  if (next.startsWith("/") && !next.startsWith("//")) res.cookies.set("g_next", next, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  else res.cookies.delete("g_next");
  return res;
}
