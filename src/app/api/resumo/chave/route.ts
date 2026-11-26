import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { widgetReady, widgetToken, widgetVersion } from "@/lib/widget";

/** Chave do widget do usuário logado. body: { nova: true } troca a chave e desliga a anterior. */
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!widgetReady()) return NextResponse.json({ error: "Widget indisponível: falta a chave do servidor na Vercel." }, { status: 503 });
  const v = await widgetVersion(createServiceClient(), data.user.id, !!b.nova);
  const origin = new URL(request.url).origin;
  return NextResponse.json({ ok: true, token: widgetToken(data.user.id, v), url: `${origin}/api/resumo?k=${widgetToken(data.user.id, v)}` });
}
