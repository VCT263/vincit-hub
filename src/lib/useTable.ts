"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apagarComLixeira } from "@/lib/lixeira";

const TIPOS: Record<string, string> = { ag_clients: "Cliente", ag_deals: "Negócio do funil", ag_equipment: "Equipamento", ag_team: "Pessoa da equipe", ag_price_items: "Item de preço", ag_events: "Evento" };

/** CRUD genérico para as tabelas do GESTOR (RLS garante que só o dono vê). */
export function useTable<T = any>(table: string, opts: { select?: string; order?: string; asc?: boolean; filter?: [string, any] } = {}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(opts);
  const load = useCallback(async () => {
    let q: any = createClient().from(table).select(opts.select || "*");
    if (opts.filter) q = q.eq(opts.filter[0], opts.filter[1]);
    q = q.order(opts.order || "created_at", { ascending: opts.asc ?? false });
    const { data, error } = await q;
    if (error) setError(error.message);
    setRows((data as T[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, key]);
  useEffect(() => { load(); }, [load]);

  async function save(row: any) {
    const s = createClient();
    const { id, ...rest } = row;
    Object.keys(rest).forEach((k) => { if (rest[k] === "") rest[k] = null; if (typeof rest[k] === "object" && rest[k] && !Array.isArray(rest[k]) && k !== "items" && k !== "onboarding") delete rest[k]; });
    const res = id ? await s.from(table).update(rest).eq("id", id).select().single() : await s.from(table).insert(rest).select().single();
    if (res.error) { setError(res.error.message); return null; }
    setError(null); await load();
    return res.data as T;
  }
  async function patch(id: string, values: any) {
    setRows((xs: any) => xs.map((x: any) => (x.id === id ? { ...x, ...values } : x)));
    const { error } = await createClient().from(table).update(values).eq("id", id);
    if (error) { setError(error.message); load(); }
  }
  /** excluir = pedir a senha e mandar para a lixeira (15 dias para recuperar). nome aparece no aviso e na Lixeira. */
  async function remove(id: string, nome?: string, link?: string) {
    const tipo = TIPOS[table] || "Item";
    const ok = await apagarComLixeira({ tabela: table, filtro: { id }, oque: nome ? `"${nome}"` : "este item", rotulo: nome ? `${tipo}: ${nome}` : tipo, link });
    if (ok) await load();
    return ok;
  }
  return { rows, loading, error, reload: load, save, patch, remove, setRows };
}
