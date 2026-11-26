import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTo, vapid } from "@/lib/push";

/** Manda uma notificação de teste para os aparelhos do usuário logado */
export async function POST() {
  const s = await createClient();
  const { data } = await s.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await vapid())) return NextResponse.json({ error: "Notificações indisponíveis no servidor agora. Tente de novo em instantes." }, { status: 503 });
  const { data: subs } = await s.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  const sent = await sendTo(s as any, subs || [], { title: "VINCIT HUB", body: "Notificações ligadas. Você vai receber seus lembretes e avisos aqui.", href: "/", tag: "teste" });
  return NextResponse.json({ ok: sent > 0, sent, devices: subs?.length || 0 });
}
