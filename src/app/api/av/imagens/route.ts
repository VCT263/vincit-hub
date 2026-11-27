import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca de imagens de inserção para o Editor, nesta ordem:
 * 1) banco interno (Banco de mídia, Drive), 2) Pexels e 3) Pixabay (com chave grátis), 4) Openverse (sem chave).
 * As chaves ficam só no servidor (PEXELS_API_KEY, PIXABAY_API_KEY).
 */
export type Imagem = { fonte: string; id: string; thumb: string; url: string; autor?: string; licenca?: string; link?: string; video?: boolean; w?: number; h?: number };

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  const wide = sp.get("formato") === "16:9";
  if (!q) return NextResponse.json({ itens: [], fontes: {} });
  const fontes: Record<string, string> = {};
  const tarefas: Promise<Imagem[]>[] = [];

  // 1) banco interno: nome, pasta ou tag
  tarefas.push((async () => {
    const s = await createClient();
    const qq = q.replace(/[^\p{L}\p{N} -]/gu, "").trim();
    if (!qq) return [];
    const like = `%${qq}%`;
    const { data, error } = await s.from("av_media").select("drive_id,name,mime,width,height,tags,kind").eq("missing", false)
      .or(`name.ilike."${like}",folder.ilike."${like}",tags.cs.{${qq.toLowerCase().replace(/ /g, "")}}`).limit(24);
    if (error) { fontes.interno = `erro: ${error.message}`; return []; }
    fontes.interno = "ok";
    return (data || []).filter((r) => /^(image|video)\//.test(r.mime || "")).map((r) => ({
      fonte: "interno", id: r.drive_id, thumb: `/api/av/drive/thumb/${r.drive_id}?s=480`, url: `/api/av/drive/file/${r.drive_id}`, autor: r.name, video: /^video\//.test(r.mime || ""), w: r.width || undefined, h: r.height || undefined,
    }));
  })());

  // 2) Pexels
  const pk = process.env.PEXELS_API_KEY;
  if (pk) tarefas.push((async () => {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=12&locale=pt-BR&orientation=${wide ? "landscape" : "portrait"}`, { headers: { Authorization: pk }, cache: "no-store" });
    if (!r.ok) { fontes.pexels = `erro ${r.status}`; return []; }
    fontes.pexels = "ok";
    const j = await r.json();
    return (j.photos || []).map((x: any) => ({ fonte: "pexels", id: String(x.id), thumb: x.src?.medium, url: wide ? x.src?.landscape || x.src?.large : x.src?.portrait || x.src?.large, autor: x.photographer, licenca: "Licença Pexels (uso livre)", link: x.url, w: x.width, h: x.height }));
  })()); else fontes.pexels = "sem chave";

  // 3) Pixabay
  const xk = process.env.PIXABAY_API_KEY;
  if (xk) tarefas.push((async () => {
    const r = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(xk)}&q=${encodeURIComponent(q)}&lang=pt&image_type=photo&safesearch=true&per_page=12&orientation=${wide ? "horizontal" : "vertical"}`, { cache: "no-store" });
    if (!r.ok) { fontes.pixabay = `erro ${r.status}`; return []; }
    fontes.pixabay = "ok";
    const j = await r.json();
    return (j.hits || []).map((x: any) => ({ fonte: "pixabay", id: String(x.id), thumb: x.webformatURL, url: x.largeImageURL || x.webformatURL, autor: x.user, licenca: "Licença Pixabay (uso livre)", link: x.pageURL, w: x.imageWidth, h: x.imageHeight }));
  })()); else fontes.pixabay = "sem chave";

  // 4) Openverse: imagens com licença livre, sem chave (a miniatura passa pelo próprio Openverse)
  tarefas.push((async () => {
    fontes.openverse = "fora do ar";
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=12&license_type=commercial,modification&mature=false`, { headers: { "User-Agent": "vincit-hub/1.0" }, cache: "no-store" });
    if (!r.ok) { fontes.openverse = `erro ${r.status}`; return []; }
    fontes.openverse = "ok";
    const j = await r.json();
    return (j.results || []).map((x: any) => ({ fonte: "openverse", id: x.id, thumb: x.thumbnail, url: x.thumbnail, autor: x.creator, licenca: `${String(x.license || "").toUpperCase()} ${x.license_version || ""}`.trim(), link: x.foreign_landing_url, w: x.width, h: x.height }));
  })());

  const res = await Promise.allSettled(tarefas);
  const itens = res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return NextResponse.json({ itens, fontes });
}
