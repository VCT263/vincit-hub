import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** define a pasta do Drive que funciona como banco de mídia */
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  if (!b.id || !b.name) return NextResponse.json({ error: "Escolha uma pasta" }, { status: 400 });
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: prev } = await s.from("av_settings").select("drive_folder_id").maybeSingle();
  const { error } = await s.from("av_settings").upsert({ owner_id: user.id, drive_folder_id: b.id, drive_folder_name: b.name, last_error: null, updated_at: new Date().toISOString() });
  // trocou de pasta: o que era da pasta antiga sai da lista (as etiquetas ficam guardadas caso volte)
  if (!error && prev?.drive_folder_id && prev.drive_folder_id !== b.id) await s.from("av_media").update({ missing: true }).eq("missing", false);
  return NextResponse.json({ ok: !error, error: error?.message });
}
