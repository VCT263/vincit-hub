import { MARCAS } from "@/lib/luts/catalog";

/* Catálogo da Biblioteca de LUTs para o plugin do Premiere: nome, o que entra, link oficial e,
   nas autorais, o endereço do .cube. Público e sem dados de conta. */
export async function GET() {
  const marcas = MARCAS.map((m) => ({
    id: m.id, nome: m.nome,
    luts: m.luts.map((l) => ({ id: l.id, nome: l.nome, tipo: l.tipo, entrada: l.entrada, look: l.look || null, desc: l.desc, passo: l.passo, autoral: !!l.autoral, url: l.autoral ? `/api/luts/${l.look}.cube` : l.onde.url, onde: l.onde.label })),
  }));
  return Response.json({ marcas }, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600", "Access-Control-Allow-Origin": "*" } });
}
