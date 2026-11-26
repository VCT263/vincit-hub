import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Liga ou desliga o push deste aparelho. body: { subscription, device } liga · { off: endpoint } desliga */
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  const s = await createClient();
  const { data } = await s.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (b.off) {
    await s.from("push_subscriptions").delete().eq("endpoint", b.off);
    return NextResponse.json({ ok: true });
  }
  const sub = b.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 });
  const { error } = await s.from("push_subscriptions").upsert(
    { owner_id: data.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, device: String(b.device || "").slice(0, 80) || null },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
