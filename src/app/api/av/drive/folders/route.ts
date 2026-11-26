import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { FOLDER, gdrive, listChildren } from "@/lib/drive";

/** pastas para escolher o banco de mídia. ?parent=root | shared | <id> */
export async function GET(request: Request) {
  const parent = new URL(request.url).searchParams.get("parent") || "root";
  const s = await createClient();
  const auth = await googleToken(s);
  if (!auth) return NextResponse.json({ error: "Google não conectado" }, { status: 400 });
  const q = parent === "shared" ? `sharedWithMe and mimeType='${FOLDER}' and trashed=false` : `'${parent.replace(/'/g, "")}' in parents and mimeType='${FOLDER}' and trashed=false`;
  try {
    const folders = await listChildren(auth.token, q, "id,name");
    let name = parent === "root" ? "Meu Drive" : parent === "shared" ? "Compartilhados comigo" : "";
    if (!name) name = (await gdrive(auth.token, `/files/${encodeURIComponent(parent)}`, { fields: "name", supportsAllDrives: "true" })).data?.name || "Pasta";
    return NextResponse.json({ name, folders: folders.map((f) => ({ id: f.id, name: f.name })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.res?.status || 500 });
  }
}
