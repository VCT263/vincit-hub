import { NextResponse } from "next/server";
import { vapid } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Chave pública do push (o navegador precisa dela para se inscrever) */
export async function GET() {
  const k = await vapid();
  if (!k) return NextResponse.json({ error: "Notificações indisponíveis no servidor agora." }, { status: 503 });
  return NextResponse.json({ key: k.pub });
}
