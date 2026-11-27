import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { igToken } from "@/lib/tokens";
import { contaInsights } from "@/lib/igInsights";

export const maxDuration = 60;

/**
 * Resultados da conta no período, no formato do Meta Business Suite (Insights > Resultados e Público).
 * GET /api/meta/insights?account_id=...&days=7|14|30
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const account_id = url.searchParams.get("account_id") || "";
    const days = Math.min(30, Math.max(7, Number(url.searchParams.get("days")) || 30));
    const s = await createClient();
    const { data: acc } = await s.from("ig_accounts").select("id,ig_user_id,followers_count").eq("id", account_id).single();
    if (!acc?.ig_user_id) return NextResponse.json({ error: "Conta não conectada à Meta." }, { status: 400 });
    const token = await igToken(s, account_id);
    if (!token) return NextResponse.json({ error: "Token não encontrado. Conecte a conta de novo." }, { status: 400 });
    return NextResponse.json(await contaInsights(acc, token, days), { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
