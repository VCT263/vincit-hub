/** Google Drive como banco de mídia: o arquivo fica no Drive, o HUB guarda o índice e as etiquetas (tabela av_media) */

/* 28/11: acesso completo (aprovado pelo Vinícius) para o HUB criar as pastas, salvar os exports e organizar a Entrada.
   O app do Google está em modo de teste: só as contas de teste usam. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
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

/** Os dois lados do banco: recursos técnicos de edição e o que a própria produtora gravou */
export const GROUPS = [
  { g: "tecnico", l: "Técnico", d: "Recursos para editar: efeitos, trilhas, inserções de banco, transições, LUTs, modelos e referências", pasta: "Técnico" },
  { g: "meu", l: "Meus conteúdos", d: "O que você gravou: fotos, vídeos, inserções e projetos entregues", pasta: "Meus conteúdos" },
] as const;

/** Áreas do banco de mídia. Cada arquivo do Drive fica em uma área (coluna kind), e cada área num dos dois lados. */
export const KINDS = [
  { k: "sfx", g: "tecnico", l: "Efeitos sonoros", d: "Whooshes, impactos, risers e foley", pasta: "Efeitos sonoros" },
  { k: "trilha", g: "tecnico", l: "Trilhas", d: "Músicas e beds para os vídeos", pasta: "Trilhas" },
  { k: "insercao", g: "tecnico", l: "Inserções de banco", d: "B-roll pronto para cobrir a fala", pasta: "Inserções de banco" },
  { k: "externo", g: "tecnico", l: "Banco externo", d: "Stock baixado de Pexels, Envato, Artgrid e outros", pasta: "Banco externo" },
  { k: "transicao", g: "tecnico", l: "Transições", d: "Transições, overlays, light leaks e texturas", pasta: "Transições" },
  { k: "imagem", g: "tecnico", l: "Elementos e PNGs", d: "Recortes, ícones, PNGs e elementos gráficos", pasta: "Elementos e PNGs" },
  { k: "marca", g: "tecnico", l: "Marcas e logos", d: "Logos, fontes e manuais dos clientes", pasta: "Marcas" },
  { k: "lut", g: "tecnico", l: "LUTs", d: "Correção e look de cor", pasta: "LUTs" },
  { k: "modelo", g: "tecnico", l: "Modelos", d: "Templates de edição, motion e presets", pasta: "Modelos" },
  { k: "referencia", g: "tecnico", l: "Referências", d: "Vídeos e imagens de inspiração", pasta: "Referências" },
  { k: "video", g: "meu", l: "Vídeos gravados", d: "Brutos e takes das suas gravações", pasta: "Vídeos" },
  { k: "take", g: "meu", l: "Inserções gravadas", d: "B-roll que você mesmo gravou", pasta: "Inserções gravadas" },
  { k: "foto", g: "meu", l: "Fotos", d: "Fotos que você tirou, brutas e editadas", pasta: "Fotos" },
  { k: "interno", g: "meu", l: "Projetos e entregas", d: "Cortes, finais e posts entregues", pasta: "Projetos e entregas" },
  { k: "outro", g: "tecnico", l: "Outros", d: "O que não entrou em nenhuma área", pasta: "" },
] as const;
export const groupOf = (k: string) => KINDS.find((x) => x.k === k)?.g || "tecnico";

const MEU = /(meus?|minhas?|pr[oó]prios?|autora?is|gravad[oa]s|capta[cç][aãõ]|clientes?|eventos?|shows?|ensaios?|sess[aãõ])/i;
const TEC = /(t[eé]cnico|recursos|assets|kit|biblioteca|library)/i;
const BY_FOLDER: [RegExp, string][] = [
  [/(transi[cç]|overlays?|light ?leaks?|texturas?|glitch)/i, "transicao"],
  [/(^|\b)(sfx|efeitos?|sound ?effects?|foley|whoosh)/i, "sfx"],
  [/(trilhas?|m[uú]sicas?|music|soundtrack|bgm)/i, "trilha"],
  [/(refer[eê]ncias?|inspira)/i, "referencia"],
  [/(^|\b)luts?\b/i, "lut"],
  [/(modelos?|templates?|presets?|mogrt|motion)/i, "modelo"],
  [/(marcas?|logos?|brand|identidade|fontes?|fonts?|manual)/i, "marca"],
  [/(externo|stock|pexels|unsplash|pixabay|envato|artgrid|artlist|storyblocks|shutterstock|freepik|adobe ?stock|banco de (imagens|v[ií]deos))/i, "externo"],
  [/(entregas?|finais|finalizados?|cortes|projetos?|posts?|reels?|interno)/i, "interno"],
  [/(b-?roll|inser[cç][aãõ]|takes?|footage|apoio)/i, "insercao"],
  [/(elementos?|png|[ií]cones?|icons?|recortes?|gr[aá]ficos?)/i, "imagem"],
  [/(fotos?|photos?)/i, "foto"],
  [/(v[ií]deos?|brutos?|raw)/i, "video"],
];
const PHOTO = ["jpg", "jpeg", "heic", "heif", "arw", "cr2", "cr3", "nef", "dng", "raf", "orf", "rw2", "tif", "tiff"];

/** área sugerida pelo nome, pela pasta e pelo formato; o usuário pode trocar depois */
export function inferKind(name: string, mime: string, folder: string, size?: number): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["cube", "3dl", "look", "lut"].includes(ext)) return "lut";
  if (["mogrt", "aep", "aet", "drp", "drfx", "setting", "prfpst", "ffx", "moti", "motn", "prproj", "epr"].includes(ext)) return "modelo";
  if (["ttf", "otf", "woff", "woff2", "ai", "eps"].includes(ext)) return "marca";
  const audio = mime.startsWith("audio/"), video = mime.startsWith("video/"), image = mime.startsWith("image/");
  const segs = (folder || "").split("/").filter(Boolean);
  // lado: a pasta mais de cima que disser "Técnico" ou "Meus conteúdos" (ou parecer gravação própria)
  let side: "tecnico" | "meu" | "" = "";
  for (const s of segs) { if (TEC.test(s)) { side = "tecnico"; break; } if (MEU.test(s)) { side = "meu"; break; } }
  // a pasta de cima define a área (ex.: "Marcas/Cliente X" fica em Marcas)
  for (const s of segs) for (const [re, k0] of BY_FOLDER) if (re.test(s)) {
    let k = k0;
    if (["insercao", "imagem", "externo", "marca", "foto", "video", "transicao"].includes(k) && audio) continue;
    if ((k === "sfx" || k === "trilha") && !audio && !video) continue;
    if (k === "foto" && !image) continue;
    if (k === "video" && !video) continue;
    // no lado "Meus conteúdos", inserção é a gravada por você; no técnico, "vídeos/fotos" viram banco
    if (side === "meu" && k === "insercao") k = "take";
    if (side === "tecnico" && (k === "video" || k === "take")) k = "insercao";
    if (side === "tecnico" && k === "foto") k = "imagem";
    return k;
  }
  if (/logo/i.test(name)) return "marca";
  if (audio) return (size || 0) > 4_000_000 ? "trilha" : "sfx";
  // sem pasta que diga a área: arquivo de câmera é seu; PNG e afins são elementos
  if (video) return side === "tecnico" ? "insercao" : "video";
  if (image) return PHOTO.includes(ext) && side !== "tecnico" ? "foto" : "imagem";
  return "outro";
}

/** subpasta do arquivo dentro da área: tira da frente as pastas que só dizem o lado ou a área */
export function subPath(folder: string, kind: string): string[] {
  const segs = (folder || "").split("/").filter(Boolean);
  const same = (k: string) => k === kind || (kind === "take" && k === "insercao") || (kind === "insercao" && (k === "video" || k === "take")) || (kind === "imagem" && k === "foto");
  let i = 0;
  while (i < segs.length && (TEC.test(segs[i]) || /^meus conte[uú]dos$/i.test(segs[i]))) i++;
  if (i < segs.length && BY_FOLDER.some(([re, k]) => re.test(segs[i]) && same(k))) i++;
  return segs.slice(i);
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

/** No navegador: salva um export no Drive da pessoa, já na pasta certa (área › perfil › mês), e põe no Banco de mídia.
 *  kind = área do banco (foto, interno, lut…); sub troca o mês por uma subpasta fixa (ex.: "Motion"). */
export async function salvarNoDrive(o: { kind: string; nome: string; blob: Blob; accountId?: string | null; sub?: string }): Promise<{ ok: boolean; caminho?: string; link?: string; error?: string; needsScope?: boolean }> {
  const meta = { kind: o.kind, nome: o.nome, mime: o.blob.type || "application/octet-stream", account_id: o.accountId || null, sub: o.sub };
  const r = await fetch("/api/av/drive/salvar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(meta) }).then((x) => x.json()).catch(() => ({ error: "Falha de conexão" }));
  if (!r.ok) return { ok: false, error: r.error || "Não salvou no Drive.", needsScope: r.needsScope };
  let arquivo: any = null;
  try {
    const up = await fetch(r.uploadUrl, { method: "PUT", headers: { "content-type": meta.mime }, body: o.blob });
    if (up.ok) arquivo = await up.json().catch(() => null);
  } catch {}
  if (!arquivo?.id) {
    // plano B: o servidor manda (só arquivo de até ~4 MB, limite da Vercel)
    if (o.blob.size > 4_000_000) return { ok: false, error: "O Drive não aceitou o envio direto deste arquivo." };
    const fd = new FormData(); fd.append("meta", JSON.stringify(meta)); fd.append("file", o.blob, o.nome);
    const b = await fetch("/api/av/drive/salvar", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ error: "Falha de conexão" }));
    if (!b.ok) return { ok: false, error: b.error || "Não salvou no Drive.", needsScope: b.needsScope };
    arquivo = b.arquivo;
  }
  const ix = await fetch("/api/av/drive/indexar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ drive_id: arquivo.id, pasta: r.pasta }) }).then((x) => x.json()).catch(() => ({}));
  return { ok: true, caminho: r.caminho, link: ix.link || arquivo.webViewLink };
}
