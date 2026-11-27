/** Histórico diário da conta (ig_account_daily): o Instagram só entrega 30 dias, então guardamos cada dia fechado. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { contaInsights } from "@/lib/igInsights";

const CAMPOS = ["views", "reach", "total_interactions", "profile_views", "profile_links_taps", "follows"] as const;

/** grava os dias da série (só dias com algum número) */
export async function gravarHistorico(db: SupabaseClient, acc: { id: string; owner_id: string; followers_count?: number | null }, series: any[]) {
  const rows = (series || [])
    .filter((d) => CAMPOS.some((k) => d[k] != null))
    .map((d, i, arr) => ({
      account_id: acc.id, owner_id: acc.owner_id, day: d.date,
      ...Object.fromEntries(CAMPOS.map((k) => [k, d[k] ?? null])),
      ...(i === arr.length - 1 && acc.followers_count != null ? { followers_count: acc.followers_count } : {}),
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return 0;
  const { error } = await db.from("ig_account_daily").upsert(rows, { onConflict: "account_id,day" });
  if (error) throw new Error(error.message);
  return rows.length;
}

/** foto diária de um perfil: preenche 30 dias na primeira vez e depois só os últimos 3 */
export async function fotoDiaria(db: SupabaseClient, acc: { id: string; owner_id: string; ig_user_id: string; followers_count?: number | null }, token: string) {
  const { count } = await db.from("ig_account_daily").select("day", { count: "exact", head: true }).eq("account_id", acc.id);
  const r = await contaInsights(acc, token, count ? 3 : 30);
  return gravarHistorico(db, acc, r.series);
}

/** soma por mês (AAAA-MM) do que está guardado */
export function porMes(rows: any[]) {
  const m: Record<string, any> = {};
  for (const r of rows) {
    const k = String(r.day).slice(0, 7);
    m[k] ??= { mes: k, dias: 0, views: 0, total_interactions: 0, profile_views: 0, follows: 0, profile_links_taps: 0 };
    m[k].dias++;
    for (const c of ["views", "total_interactions", "profile_views", "follows", "profile_links_taps"]) m[k][c] += Number(r[c]) || 0;
  }
  return Object.values(m).sort((a: any, b: any) => a.mes.localeCompare(b.mes));
}
