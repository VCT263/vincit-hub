"use client";
import { useState } from "react";
import { aiFetch } from "@/lib/aiFetch";

export function useAI() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T = any>(task: string, data: any): Promise<T | null> {
    setBusy(true); setError(null);
    try {
      // sem API paga, o pedido vai para o Claude e o resultado volta para esta tela (ver aiFetch)
      const r = await aiFetch("/api/ai", { task, data });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro");
      return j as T;
    } catch (e: any) { setError(e.message); return null; }
    finally { setBusy(false); }
  }
  return { run, busy, error };
}
