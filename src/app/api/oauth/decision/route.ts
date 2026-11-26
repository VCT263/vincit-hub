import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL, isClaudeRedirect } from "@/lib/oauth";

/** Resposta da tela /oauth/consent: aprova ou recusa no Supabase e devolve a pessoa ao Claude */
export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("authorization_id") || "");
  const action = form.get("decision") === "approve" ? "approve" : "deny";
  const back = (msg: string) => NextResponse.redirect(new URL(`/oauth/consent?authorization_id=${encodeURIComponent(id)}&erro=${encodeURIComponent(msg)}`, req.url), 303);
  if (!id) return back("Pedido sem identificação.");

  const s = await createClient();
  const { data: { session } } = await s.auth.getSession();
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`, req.url), 303);

  if (action === "approve") {
    const { data: acc } = await s.rpc("my_access");
    if ((acc as any)?.role !== "superadmin" && (acc as any)?.status !== "ativo") return back("Seu acesso ainda não está liberado.");
  }

  const r = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorizations/${encodeURIComponent(id)}/consent`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" },
    body: JSON.stringify({ action }),
    cache: "no-store",
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.redirect_url) return back(d?.msg || d?.message || "O Supabase recusou o pedido. Tente vincular de novo.");
  if (!isClaudeRedirect(d.redirect_url)) return back("Endereço de retorno não reconhecido.");
  return NextResponse.redirect(d.redirect_url, 303);
}
