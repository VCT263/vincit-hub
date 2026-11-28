import { toCube } from "@/lib/luts/core";
import { MARCAS } from "@/lib/luts/catalog";

/* .cube das LUTs autorais VINCIT (/api/luts/<look>.cube). Público: o plugin do Premiere baixa sem login.
   As LUTs de marca o HUB não gera nem hospeda. */
const AUTORAIS = new Map((MARCAS.find((m) => m.id === "vincit")?.luts || []).map((l) => [l.look!, l.nome]));

export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const { nome } = await params;
  const look = nome.replace(/\.cube$/i, "");
  const titulo = AUTORAIS.get(look);
  if (!titulo) return new Response("LUT não encontrada", { status: 404 });
  const arquivo = `VINCIT_${titulo.normalize("NFD").replace(/[^\w ]/g, "").trim().replace(/ +/g, "_")}.cube`;
  return new Response(toCube({ look }, `VINCIT ${titulo}`), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
