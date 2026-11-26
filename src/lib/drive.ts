/** Google Drive como banco de mídia: o arquivo fica no Drive, o HUB guarda o índice e as etiquetas (tabela av_media) */

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const API = "https://www.googleapis.com/drive/v3";
export const FOLDER = "application/vnd.google-apps.folder";
const FIELDS = "id,name,mimeType,size,modifiedTime,hasThumbnail,webViewLink,videoMediaMetadata(width,height,durationMillis),imageMediaMetadata(width,height)";

export async function gdrive(token: string, path: string, params: Record<string, string> = {}) {
  const u = new URL(API + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

/** sem permissão do Drive (conexão antiga só com a Agenda) */
export const noScope = (r: { status: number; data: any }) => r.status === 403 && /insufficient|scope|PERMISSION/i.test(JSON.stringify(r.data || ""));

export async function listChildren(token: string, q: string, fields = FIELDS) {
  const out: any[] = [];
  let pageToken = "";
  for (let i = 0; i < 20; i++) {
    const p: Record<string, string> = { q, fields: `nextPageToken,files(${fields})`, pageSize: "1000", supportsAllDrives: "true", includeItemsFromAllDrives: "true", orderBy: "folder,name" };
    if (pageToken) p.pageToken = pageToken;
    const r = await gdrive(token, "/files", p);
    if (!r.ok) throw Object.assign(new Error(r.data?.error?.message || "Falha ao ler o Drive"), { res: r });
    out.push(...(r.data.files || []));
    pageToken = r.data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export const KINDS = [
  { k: "sfx", l: "Efeitos sonoros" },
  { k: "trilha", l: "Trilhas" },
  { k: "insercao", l: "Imagens de inserção" },
  { k: "imagem", l: "Fotos e PNGs" },
  { k: "lut", l: "LUTs" },
  { k: "modelo", l: "Modelos" },
  { k: "referencia", l: "Referências" },
  { k: "outro", l: "Outros" },
] as const;

const BY_FOLDER: [RegExp, string][] = [
  [/(^|\b)(sfx|efeitos?|sound ?effects?|foley|whoosh|transi[cç])/i, "sfx"],
  [/(trilhas?|m[uú]sicas?|music|soundtrack|bgm)/i, "trilha"],
  [/(refer[eê]ncias?|inspira)/i, "referencia"],
  [/(^|\b)luts?\b/i, "lut"],
  [/(modelos?|templates?|presets?|mogrt|motion)/i, "modelo"],
  [/(b-?roll|inser[cç][aãõ]|stock|takes?|footage|v[ií]deos?)/i, "insercao"],
  [/(fotos?|imagens?|png|logos?|photos?|images?)/i, "imagem"],
];

/** tipo sugerido pelo nome, pela pasta e pelo formato; o usuário pode trocar depois */
export function inferKind(name: string, mime: string, folder: string, size?: number): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["cube", "3dl", "look", "lut"].includes(ext)) return "lut";
  if (["mogrt", "aep", "aet", "drp", "drfx", "setting", "prfpst", "ffx", "moti", "motn", "prproj", "epr"].includes(ext)) return "modelo";
  const segs = (folder || "").split("/").reverse();
  for (const s of segs) for (const [re, k] of BY_FOLDER) if (re.test(s)) {
    // pasta diz "inserção" mas o arquivo é áudio: respeita o formato
    if ((k === "insercao" || k === "imagem") && mime.startsWith("audio/")) continue;
    return k;
  }
  if (mime.startsWith("audio/")) return (size || 0) > 4_000_000 ? "trilha" : "sfx";
  if (mime.startsWith("video/")) return "insercao";
  if (mime.startsWith("image/")) return "imagem";
  return "outro";
}

/** campos do Drive que vão para a tabela */
export function driveRow(f: any, folder: string) {
  return {
    drive_id: f.id,
    name: f.name,
    mime: f.mimeType,
    folder,
    size: f.size ? Number(f.size) : null,
    duration_ms: f.videoMediaMetadata?.durationMillis ? Number(f.videoMediaMetadata.durationMillis) : null,
    width: f.videoMediaMetadata?.width || f.imageMediaMetadata?.width || null,
    height: f.videoMediaMetadata?.height || f.imageMediaMetadata?.height || null,
    has_thumb: !!f.hasThumbnail,
    web_link: f.webViewLink || null,
    modified_at: f.modifiedTime || null,
    missing: false,
  };
}
