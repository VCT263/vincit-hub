import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";

const LIMIT = 80 * 1024 * 1024; // prévia de áudio e imagem; vídeo abre no player do Drive

/** prévia/baixar um arquivo do banco de mídia direto do Drive, com suporte a Range para o player de áudio */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dl = new URL(request.url).searchParams.has("download");
  const s = await createClient();
  const { data: row } = await s.from("av_media").select("name,mime,size,web_link").eq("drive_id", id).maybeSingle();
  if (!row) return new Response("Não encontrado", { status: 404 });
  if ((row.size || 0) > LIMIT && row.web_link) return Response.redirect(row.web_link, 302);
  const auth = await googleToken(s);
  if (!auth) return new Response("Sem conexão", { status: 401 });
  const headers: Record<string, string> = { Authorization: `Bearer ${auth.token}` };
  const range = request.headers.get("range");
  if (range) headers.Range = range;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, { headers });
  if (!r.ok && r.status !== 206) return new Response("Falha ao ler do Drive", { status: r.status });
  const out = new Headers({ "Content-Type": row.mime || r.headers.get("content-type") || "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=600" });
  for (const h of ["content-length", "content-range"]) { const v = r.headers.get(h); if (v) out.set(h, v); }
  out.set("Content-Disposition", `${dl ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(row.name)}`);
  return new Response(r.body, { status: r.status, headers: out });
}
