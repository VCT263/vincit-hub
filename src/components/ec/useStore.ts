"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "ec_store";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch {} };

/** Lojas que o usuário vê (dono ou membro) e a loja escolhida. */
export function useStore() {
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const s = createClient();
    const [{ data, error }, { data: u }] = await Promise.all([s.from("ec_stores").select("*").order("created_at"), s.auth.getUser()]);
    if (error) setError(error.message.includes("ec_stores") ? "A seção E-commerce ainda não foi ativada no banco." : error.message);
    const list = data || [];
    setStores(list); setUid(u.user?.id || null);
    const saved = read();
    setStoreId(list.find((x: any) => x.id === saved)?.id || list[0]?.id || null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const choose = (id: string) => { write(id); setStoreId(id); };
  const store = stores.find((x) => x.id === storeId) || null;
  return { stores, store, storeId, choose, reload: load, loading, error, isOwner: !!store && store.owner_id === uid };
}
