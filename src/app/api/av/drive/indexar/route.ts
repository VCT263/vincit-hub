import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { driveRow, gdrive, inferKind } from "@/lib/drive";

/** põe no Banco de mídia um arquivo que o HUB acabou de salvar no Drive (sem esperar a próxima sincronização) */
export async function POST(request: Request) {
  const { drive_id, pasta, account_id } = await request.json().catch(() => ({}));
  if (!drive_id) return NextResponse.json({ error: "Faltou o arquivo." }, { status: 400 });
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const auth = await googleToken(s);
  if (!auth) return NextResponse.json({ error: "Conecte o Google de novo." }, { status: 400 });
  const r = await gdrive(auth.token, `/files/${encodeURIComponent(drive_id)}`, { fields: "id,name,mimeType,size,modifiedTime,hasThumbnail,webViewLink,videoMediaMetadata(width,height,durationMillis),imageMediaMetadata(width,height)", supportsAllDrives: "true" });
  if (!r.ok) return NextResponse.json({ error: r.data?.error?.message || "Arquivo não encontrado no Drive." }, { status: 400 });
  const folder = String(pasta || "");
  // salvo a partir de um perfil: o arquivo fica ligado ao cliente dele
  const { data: conta } = account_id ? await s.from("ig_accounts").select("client_id").eq("id", account_id).maybeSingle() : { data: null };
  const row = { owner_id: user.id, ...driveRow(r.data, folder), kind: inferKind(r.data.name, r.data.mimeType || "", folder, Number(r.data.size || 0)), ...(conta?.client_id ? { client_id: conta.client_id } : {}), updated_at: new Date().toISOString() };
  const { error } = await s.from("av_media").upsert(row, { onConflict: "owner_id,drive_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, link: r.data.webViewLink, kind: row.kind });
}
