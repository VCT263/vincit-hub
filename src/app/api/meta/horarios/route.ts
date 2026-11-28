import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { igToken } from "@/lib/tokens";
import { online } from "@/lib/igInsights";

/**
 * Seguidores online por dia da semana × hora (Brasília), para sugerir o horário de postar no agendamento.
 * Uma chamada só à Graph API. GET /api/meta/horarios?account_id=...
 */
export async function GET(req: Request) {
  const account_id = new URL(req.url).searchParams.get("account_id") || "";
  const s = await createClient();
  const { data: acc } = await s.from("ig_accounts").select("id,ig_user_id").eq("id", account_id).single();
  if (!acc?.ig_user_id) return NextResponse.json({ grid: null });
  const token = await igToken(s, account_id);
  if (!token) return NextResponse.json({ grid: null });
  const grid = await online(acc.ig_user_id, token, Math.floor(Date.now() / 1000));
  return NextResponse.json({ grid }, { headers: { "cache-control": "private, max-age=3600" } });
}
