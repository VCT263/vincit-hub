/**
 * Traz uma imagem do Pexels, Pixabay ou Openverse pelo servidor, para o Editor poder desenhar e exportar
 * (o navegador bloqueia exportar quadros com imagem de outro site). Só aceita esses sites.
 */
const HOSTS = ["images.pexels.com", "pixabay.com", "cdn.pixabay.com", "api.openverse.org"];
const LIMIT = 15 * 1024 * 1024;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") || "";
  let u: URL;
  try { u = new URL(raw); } catch { return new Response("Endereço inválido", { status: 400 }); }
  if (u.protocol !== "https:" || !HOSTS.includes(u.hostname)) return new Response("Site não permitido", { status: 400 });
  const r = await fetch(u, { headers: { "User-Agent": "vincit-hub/1.0" }, redirect: "follow" });
  if (!r.ok) return new Response("Não deu para baixar", { status: 502 });
  const final = new URL(r.url);
  if (!HOSTS.includes(final.hostname) && !/\.(pexels|pixabay|openverse|wikimedia|flickr|staticflickr)\.(com|org)$/.test(final.hostname)) return new Response("Site não permitido", { status: 400 });
  const type = r.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return new Response("Não é imagem", { status: 400 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > LIMIT) return new Response("Imagem grande demais", { status: 413 });
  return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
}
