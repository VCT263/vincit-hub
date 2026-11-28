import { brandVideoKit } from "./brandPrompt";

/**
 * Kit de estilo ligado à marca do Design (marca.data.kit_id = kit.id): as cores e a fonte dos títulos
 * vêm sempre da marca, ao vivo. O kit guarda só o jeito de editar (legenda, câmera, lettering, regras).
 * Assim não existe cópia que fica velha quando a marca muda.
 */
export type MarcaRow = { id: string; title?: string; data: any };

export function kitComMarca<T extends { id?: string; data?: any }>(kit: T, marca?: MarcaRow | null): T & { marca?: { id: string; title?: string } } {
  if (!marca?.data) return kit;
  const v = brandVideoKit(marca.data);
  const data = kit.data || {};
  return {
    ...kit,
    data: { ...data, cores: { ...(data.cores || {}), ...v.cores }, fontes: { ...(data.fontes || {}), titulo: v.fontes.titulo } },
    marca: { id: marca.id, title: marca.title },
  };
}

/** marcas do Design por id de kit */
export async function marcasPorKit(sb: any): Promise<Map<string, MarcaRow>> {
  const { data } = await sb.from("design_projects").select("id,title,data").eq("kind", "marca").is("archived_at", null).not("data->>kit_id", "is", null);
  return new Map(((data as any[]) || []).map((m) => [m.data.kit_id, m]));
}

/** aplica a marca ligada em uma lista de kits */
export async function kitsComMarca<T extends { id?: string; data?: any }>(sb: any, kits: T[]): Promise<(T & { marca?: { id: string; title?: string } })[]> {
  if (!kits.length) return kits;
  const m = await marcasPorKit(sb);
  return kits.map((k) => kitComMarca(k, k.id ? m.get(k.id) : null));
}
