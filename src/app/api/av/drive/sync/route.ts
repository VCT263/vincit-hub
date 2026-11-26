import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { FOLDER, driveRow, inferKind, listChildren, noScope } from "@/lib/drive";

export const maxDuration = 60;
const MAX_FOLDERS = 300, MAX_FILES = 8000;

/** lê a pasta do Drive (com subpastas) e atualiza o índice do banco de mídia */
export async function POST() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: cfg } = await s.from("av_settings").select("drive_folder_id").maybeSingle();
  if (!cfg?.drive_folder_id) return NextResponse.json({ error: "Escolha a pasta do Drive primeiro" }, { status: 400 });
  const auth = await googleToken(s);
  if (!auth) return NextResponse.json({ error: "Conexão com o Google expirou. Conecte de novo." }, { status: 400 });

  const started = new Date().toISOString();
  const files: { f: any; folder: string }[] = [];
  const queue = [{ id: cfg.drive_folder_id as string, path: "" }];
  let folders = 0;
  try {
    while (queue.length && folders < MAX_FOLDERS && files.length < MAX_FILES) {
      const { id, path } = queue.shift()!;
      folders++;
      const kids = await listChildren(auth.token, `'${id}' in parents and trashed=false`);
      for (const f of kids) {
        if (f.mimeType === FOLDER) queue.push({ id: f.id, path: path ? `${path}/${f.name}` : f.name });
        else if (!String(f.mimeType).startsWith("application/vnd.google-apps")) files.push({ f, folder: path });
      }
    }
  } catch (e: any) {
    const msg = e.res && noScope(e.res) ? "Falta liberar o acesso ao Google Drive." : e.message;
    await s.from("av_settings").update({ last_error: msg }).eq("owner_id", user.id);
    return NextResponse.json({ error: msg, needsScope: e.res ? noScope(e.res) : false }, { status: 400 });
  }

  const { data: existing } = await s.from("av_media").select("drive_id");
  const have = new Set((existing || []).map((x: any) => x.drive_id));
  const now = new Date().toISOString();
  const fresh = files.filter((x) => !have.has(x.f.id)).map(({ f, folder }) => ({ owner_id: user.id, ...driveRow(f, folder), kind: inferKind(f.name, f.mimeType || "", folder, Number(f.size || 0)), updated_at: now }));
  const old = files.filter((x) => have.has(x.f.id)).map(({ f, folder }) => ({ owner_id: user.id, ...driveRow(f, folder), updated_at: now }));
  for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await s.from("av_media").insert(fresh.slice(i, i + 500));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  for (let i = 0; i < old.length; i += 500) {
    const { error } = await s.from("av_media").upsert(old.slice(i, i + 500), { onConflict: "owner_id,drive_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // o que sumiu do Drive (ou da pasta) sai da lista
  const truncated = folders >= MAX_FOLDERS || files.length >= MAX_FILES;
  if (!truncated) await s.from("av_media").update({ missing: true }).lt("updated_at", started).eq("missing", false);
  await s.from("av_settings").update({ last_sync_at: now, last_error: truncated ? `A pasta é grande: li ${files.length} arquivos em ${folders} pastas.` : null }).eq("owner_id", user.id);
  return NextResponse.json({ ok: true, files: files.length, added: fresh.length, folders, truncated });
}
