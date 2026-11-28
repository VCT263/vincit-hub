/** Escrita no Google Drive (28/11): o HUB monta a estrutura de pastas, salva os exports e organiza a pasta Entrada.
 *  O Drive é o banco: a pasta escolhida no Banco de mídia é a raiz de cada pessoa. Só no servidor. */
import { FOLDER, GROUPS, KINDS, inferKind, listChildren } from "@/lib/drive";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
export const RAIZ_PADRAO = "VINCIT HUB";
export const ENTRADA = "Entrada";

export async function driveReq(token: string, method: string, path: string, params: Record<string, string> = {}, body?: any) {
  const u = new URL(API + path);
  for (const [k, v] of Object.entries({ supportsAllDrives: "true", ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

/** o token pode escrever no Drive? (conexões antigas só liam) */
export async function podeEscrever(token: string) {
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return String(j.scope || "").split(" ").some((s: string) => s === "https://www.googleapis.com/auth/drive" || s === "https://www.googleapis.com/auth/drive.file");
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
export const limparNome = (s: string) => s.replace(/[\/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Sem nome";

/** acha a subpasta pelo nome ou cria */
export async function garantirPasta(token: string, pai: string, nome: string): Promise<string> {
  const achadas = await listChildren(token, `'${esc(pai)}' in parents and name='${esc(nome)}' and mimeType='${FOLDER}' and trashed=false`, "id,name");
  if (achadas[0]) return achadas[0].id;
  const r = await driveReq(token, "POST", "/files", { fields: "id" }, { name: nome, mimeType: FOLDER, parents: [pai] });
  if (!r.ok) throw Object.assign(new Error(r.data?.error?.message || "Não consegui criar a pasta no Drive"), { res: r });
  return r.data.id;
}
export async function garantirCaminho(token: string, raiz: string, caminho: string[]) {
  let id = raiz;
  for (const seg of caminho) id = await garantirPasta(token, id, seg);
  return id;
}

/** raiz da pessoa: a pasta escolhida no Banco de mídia; sem ela, cria "VINCIT HUB" no Meu Drive e passa a usar */
export async function raizDoUsuario(s: any, token: string, userId: string): Promise<{ id: string; nome: string }> {
  const { data: cfg } = await s.from("av_settings").select("drive_folder_id,drive_folder_name").maybeSingle();
  if (cfg?.drive_folder_id) return { id: cfg.drive_folder_id, nome: cfg.drive_folder_name || RAIZ_PADRAO };
  const id = await garantirPasta(token, "root", RAIZ_PADRAO);
  await s.from("av_settings").upsert({ owner_id: userId, drive_folder_id: id, drive_folder_name: RAIZ_PADRAO, last_error: null, updated_at: new Date().toISOString() });
  return { id, nome: RAIZ_PADRAO };
}

/** estrutura inicial: Entrada + os dois lados com as áreas do banco */
export async function criarEstrutura(token: string, raiz: string) {
  const criadas: string[] = [];
  await garantirPasta(token, raiz, ENTRADA); criadas.push(ENTRADA);
  for (const g of GROUPS) {
    const gid = await garantirPasta(token, raiz, g.pasta);
    for (const k of KINDS.filter((x) => x.g === g.g && x.pasta)) { await garantirPasta(token, gid, k.pasta); criadas.push(`${g.pasta}/${k.pasta}`); }
  }
  return criadas;
}

const MEUS = new Set(["video", "take", "foto", "interno"]);
/** caminho dentro da raiz para um arquivo de uma área, de um perfil e de um mês */
export function destino(kind: string, perfil: string | null, mes: string, sub?: string): string[] {
  const k = KINDS.find((x) => x.k === kind);
  if (!k || !k.pasta) return [ENTRADA];
  const g = GROUPS.find((x) => x.g === k.g)!;
  const c: string[] = [g.pasta, k.pasta];
  if (MEUS.has(kind)) { if (perfil) c.push(limparNome(perfil)); if (sub) c.push(limparNome(sub)); else c.push(mes); }
  else if (kind === "marca" && perfil) c.push(limparNome(perfil));
  else if (sub) c.push(limparNome(sub));
  return c;
}
export const mesDe = (d?: string | null) => (d ? new Date(d) : new Date()).toISOString().slice(0, 7);

/** nome da pasta do perfil (nome do Instagram, senão o @) */
export async function nomePerfil(s: any, accountId?: string | null) {
  if (!accountId) return null;
  const { data } = await s.from("ig_accounts").select("name,username").eq("id", accountId).maybeSingle();
  return data ? limparNome(data.name || data.username) : null;
}

/** cliente do perfil dono da pasta (Meus conteúdos/<área>/<perfil>/…): liga o arquivo do Drive ao perfil */
export function clientePelaPasta(folder: string, contas: { name: string | null; username: string; client_id: string | null }[]) {
  const partes = new Set(String(folder || "").split("/").map((x) => x.trim().toLowerCase()));
  for (const c of contas) {
    if (!c.client_id) continue;
    if ([c.name, c.username].some((n) => n && partes.has(limparNome(n).toLowerCase()))) return c.client_id;
  }
  return null;
}

/** perfil citado no nome do arquivo (ex.: "isys natal 01.jpg") */
export function perfilPeloNome(nome: string, contas: { name: string | null; username: string }[]) {
  const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const c of contas) {
    const chaves = [c.username, c.name || ""].map((x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[_.]+$/, "").trim()).filter((x) => x.length >= 3);
    if (chaves.some((k) => n.includes(k))) return limparNome(c.name || c.username);
  }
  return null;
}

export async function mover(token: string, fileId: string, de: string, para: string) {
  const r = await driveReq(token, "PATCH", `/files/${fileId}`, { addParents: para, removeParents: de, fields: "id" });
  if (!r.ok) throw Object.assign(new Error(r.data?.error?.message || "Não consegui mover o arquivo"), { res: r });
}

/** sessão de envio direto do navegador ao Drive (vale para arquivo grande, sem passar pelo servidor) */
export async function sessaoDeEnvio(token: string, pasta: string, nome: string, mime: string, origem: string) {
  const r = await fetch(`${UPLOAD}?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink,createdTime`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": mime, Origin: origem },
    body: JSON.stringify({ name: nome, parents: [pasta] }),
  });
  if (!r.ok) { const j = await r.json().catch(() => null); throw Object.assign(new Error(j?.error?.message || "O Drive recusou o envio"), { res: { status: r.status, data: j } }); }
  return r.headers.get("location")!;
}

/** envio pelo servidor (arquivo pequeno, quando o navegador não consegue mandar direto) */
export async function enviarPeloServidor(token: string, pasta: string, nome: string, mime: string, bytes: ArrayBuffer) {
  const b = "hub" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: nome, parents: [pasta] });
  const corpo = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`, bytes, `\r\n--${b}--`]);
  const r = await fetch(`${UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${b}` }, body: corpo });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || "O Drive recusou o envio"), { res: { status: r.status, data: j } });
  return j;
}

/** classifica um arquivo solto da Entrada só pelas regras (nome, tipo e tamanho) */
export function regraEntrada(f: { name: string; mimeType: string; size?: string }) {
  const kind = inferKind(f.name, f.mimeType || "", "", Number(f.size || 0));
  return kind === "outro" ? null : kind;
}
