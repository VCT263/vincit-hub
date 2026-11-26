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

/** Áreas do banco de mídia. Cada arquivo do Drive fica em uma área (coluna kind). */
export const KINDS = [
  { k: "sfx", l: "Efeitos sonoros", d: "Whooshes, impactos, transições e foley", pasta: "Efeitos sonoros" },
  { k: "trilha", l: "Trilhas", d: "Músicas e beds para os vídeos", pasta: "Trilhas" },
  { k: "insercao", l: "Imagens de inserção", d: "B-roll e takes de apoio para cobrir a fala", pasta: "Inserções" },
  { k: "externo", l: "Banco de imagens externo", d: "Stock baixado de Pexels, Envato, Artgrid e outros", pasta: "Banco externo" },
  { k: "interno", l: "Banco de conteúdos interno", d: "O que a produtora gravou e entregou: brutos, cortes e finais", pasta: "Conteúdos internos" },
  { k: "marca", l: "Marcas e logos", d: "Logos, fontes e manuais dos clientes", pasta: "Marcas" },
  { k: "imagem", l: "Fotos e PNGs", d: "Fotos, recortes, ícones e elementos gráficos", pasta: "Fotos e PNGs" },
  { k: "lut", l: "LUTs", d: "Correção e look de cor", pasta: "LUTs" },
  { k: "modelo", l: "Modelos", d: "Templates de edição, motion e presets", pasta: "Modelos" },
  { k: "referencia", l: "Referências", d: "Vídeos e imagens de inspiração", pasta: "Referências" },
  { k: "outro", l: "Outros", d: "O que não entrou em nenhuma área", pasta: "" },
] as const;

const BY_FOLDER: [RegExp, string][] = [
  [/(^|\b)(sfx|efeitos?|sound ?effects?|foley|whoosh|transi[cç])/i, "sfx"],
  [/(trilhas?|m[uú]sicas?|music|soundtrack|bgm)/i, "trilha"],
  [/(refer[eê]ncias?|inspira)/i, "referencia"],
  [/(^|\b)luts?\b/i, "lut"],
  [/(modelos?|templates?|presets?|mogrt|motion)/i, "modelo"],
  [/(marcas?|logos?|brand|identidade|fontes?|fonts?|manual)/i, "marca"],
  [/(externo|stock|pexels|unsplash|pixabay|envato|artgrid|artlist|storyblocks|shutterstock|freepik|adobe ?stock|banco de (imagens|v[ií]deos))/i, "externo"],
  [/(interno|brutos?|raw|grava[cç][aãõ]|capta[cç][aãõ]|entregas?|finais|finalizados?|cortes|conte[uú]dos?|projetos?|posts?|reels?)/i, "interno"],
  [/(b-?roll|inser[cç][aãõ]|takes?|footage|apoio)/i, "insercao"],
  [/(fotos?|imagens?|png|photos?|images?|[ií]cones?|icons?|elementos?)/i, "imagem"],
];

/** área sugerida pelo nome, pela pasta e pelo formato; o usuário pode trocar depois */
export function inferKind(name: string, mime: string, folder: string, size?: number): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["cube", "3dl", "look", "lut"].includes(ext)) return "lut";
  if (["mogrt", "aep", "aet", "drp", "drfx", "setting", "prfpst", "ffx", "moti", "motn", "prproj", "epr"].includes(ext)) return "modelo";
  if (["ttf", "otf", "woff", "woff2", "ai", "eps"].includes(ext)) return "marca";
  // a pasta de cima define a área (ex.: "Marcas/Cliente X" fica em Marcas)
  const segs = (folder || "").split("/");
  for (const s of segs) for (const [re, k] of BY_FOLDER) if (re.test(s)) {
    const audio = mime.startsWith("audio/");
    // pasta diz "inserção" ou "banco de imagens" mas o arquivo é áudio: respeita o formato
    if (["insercao", "imagem", "externo", "marca"].includes(k) && audio) continue;
    if (k === "sfx" || k === "trilha") { if (!audio && !mime.startsWith("video/")) continue; }
    return k;
  }
  if (/logo/i.test(name)) return "marca";
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
