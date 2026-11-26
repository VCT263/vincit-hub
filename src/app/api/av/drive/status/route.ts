import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured, googleToken } from "@/lib/google";
import { gdrive, noScope } from "@/lib/drive";

/** situação da conexão com o Drive e da pasta escolhida */
export async function GET() {
  const s = await createClient();
  const { data: cfg } = await s.from("av_settings").select("drive_folder_id,drive_folder_name,last_sync_at,last_error").maybeSingle();
  if (!googleConfigured()) return NextResponse.json({ configured: false, google: false, drive: false, cfg });
  const auth = await googleToken(s);
  if (!auth) return NextResponse.json({ configured: true, google: false, drive: false, cfg });
  const r = await gdrive(auth.token, "/about", { fields: "user(emailAddress)" });
  return NextResponse.json({ configured: true, google: true, drive: r.ok, needsScope: noScope(r), email: r.data?.user?.emailAddress || auth.cfg.email, cfg });
}
