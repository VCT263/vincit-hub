// Baixa o PSD grátis de uma página do mockups-design.com para o importador de mockups do HUB.
// Só aceita páginas desse site e exige usuário logado (verify_jwt). Repassa o .zip em stream, com CORS.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-expose-headers": "content-length, x-mockup-title, x-mockup-image" };
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "accept-language": "en" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const page = new URL(req.url).searchParams.get("page") || "";
    const u = new URL(page);
    if (u.hostname !== "mockups-design.com") return json({ error: "Use um link de mockups-design.com" }, 400);
    let cookie = "";
    const get = async (url: string) => {
      const r = await fetch(url, { headers: { ...UA, cookie, referer: page }, redirect: "follow" });
      const sc = r.headers.get("set-cookie"); if (sc) cookie = [cookie, ...sc.split(/,(?=[^;]+=)/).map((c) => c.split(";")[0])].filter(Boolean).join("; ");
      return r;
    };
    const html = await (await get(u.toString())).text();
    const id = (html.match(/mockups-design\.com\/download\/(\d+)\//) || [])[1];
    if (!id) return json({ error: "Não achei o botão de download nessa página" }, 404);
    const title = ((html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || "").replace(/ - Mockups Design$/, "");
    const image = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || "";
    if (new URL(req.url).searchParams.get("info")) return json({ id, title, image });
    const prog = await (await get(`https://mockups-design.com/download-in-progress/?dlm-dp-dl=${id}`)).text();
    const m = prog.match(new RegExp(`download/${id}/\\?([^"]+)"[^>]*>`));
    const dl = `https://mockups-design.com/download/${id}/` + (m ? "?" + m[1].replace(/&amp;|&#038;/g, "&") : "");
    const r = await get(dl);
    const ct = r.headers.get("content-type") || "";
    if (!/zip|octet|x-rar|photoshop/.test(ct)) return json({ error: "O site não entregou o arquivo (" + ct + ")" }, 502);
    return new Response(r.body, { headers: { ...CORS, "content-type": ct, "content-length": r.headers.get("content-length") || "", "x-mockup-title": encodeURIComponent(title), "x-mockup-image": image } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });
