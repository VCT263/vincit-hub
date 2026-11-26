import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushReady, sendTo } from "@/lib/push";

/** Manda uma notificação de teste para os aparelhos do usuário logado */
export async function POST() {
  const s = await createClient();
  const { data } = await s.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!pushReady()) return NextResponse.json({ error: "Push indisponível: faltam as chaves VAPID na Vercel." }, { status: 503 });
  const { data: subs } = await s.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  const sent = await sendTo(s as any, subs || [], { title: "VINCIT HUB", body: "Notificações ligadas. Você vai receber seus lembretes e avisos aqui.", href: "/", tag: "teste" });
  return NextResponse.json({ ok: sent > 0, sent, devices: subs?.length || 0 });
}
