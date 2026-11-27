import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const raw = searchParams.get("next") || "/";
  // só caminhos internos
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // link aberto em outro navegador (sem o code_verifier) ou já usado: avisa em vez de cair no login calado
    if (error) return NextResponse.redirect(`${origin}${next === "/auth/nova-senha" ? "/auth/nova-senha?erro=link" : "/login?erro=link"}`);
  }
  // sem code: o link de senha traz a sessão no #fragmento, que o navegador mantém no redirecionamento
  return NextResponse.redirect(`${origin}${next}`);
}
