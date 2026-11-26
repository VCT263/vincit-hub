import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { gdrive } from "@/lib/drive";

/** miniatura de um arquivo do banco de mídia (o link do Drive precisa do token, por isso passa pelo servidor) */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const size = Math.min(1200, Number(new URL(request.url).searchParams.get("s")) || 480);
  const s = await createClient();
  const { data: row } = await s.from("av_media").select("id").eq("drive_id", id).maybeSingle();
  if (!row) return new Response("Não encontrado", { status: 404 });
  const auth = await googleToken(s);
  if (!auth) return new Response("Sem conexão", { status: 401 });
  const meta = await gdrive(auth.token, `/files/${encodeURIComponent(id)}`, { fields: "thumbnailLink", supportsAllDrives: "true" });
  const link = meta.data?.thumbnailLink;
  if (!link) return new Response("Sem miniatura", { status: 404 });
  const r = await fetch(String(link).replace(/=s\d+$/, `=s${size}`), { headers: { Authorization: `Bearer ${auth.token}` } });
  if (!r.ok) return new Response("Sem miniatura", { status: 404 });
  return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
