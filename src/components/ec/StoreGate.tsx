"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "./useStore";

type Ctx = ReturnType<typeof useStore>;

/** Mostra a escolha de loja (ou o cadastro da primeira) e só renderiza o conteúdo com uma loja escolhida. */
export default function StoreGate({ children }: { children: (ctx: Ctx & { store: any; storeId: string }) => React.ReactNode }) {
  const ctx = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function create(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    setBusy(true); setErr(null);
    const { data, error } = await createClient().from("ec_stores").insert({ name: name.trim(), segment: "moda" }).select().single();
    setBusy(false);
    if (error) return setErr(error.message);
    ctx.choose(data.id); ctx.reload();
  }
  if (ctx.loading) return <p className="text-sm text-fog">Carregando…</p>;
  if (ctx.error) return <p className="card p-5 text-sm text-danger">{ctx.error}</p>;
  if (!ctx.store) return (
    <form onSubmit={create} className="card p-6 max-w-lg">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mint">Primeiro passo</p>
      <h2 className="font-display font-bold text-xl mt-1">Cadastre a loja</h2>
      <p className="text-sm text-fog mt-2">O plano, as metas e as ações ficam ligados à loja. Depois você adiciona quem mais da loja pode ver e editar.</p>
      <label className="label mt-4">Nome da loja</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: ISYS" autoFocus />
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
      <button disabled={busy} className="btn btn-mint mt-4">{busy ? "Criando…" : "Criar loja"}</button>
      <p className="text-xs text-fog mt-3">Vendas, caixa, estoque e financeiro continuam no sistema da loja. Aqui fica a parte estratégica.</p>
    </form>
  );
  return <>{children(ctx as any)}</>;
}

export function StorePicker({ ctx }: { ctx: Ctx }) {
  if (ctx.stores.length < 2) return <span className="chip chip-mint">{ctx.store?.name}</span>;
  return (
    <select className="input w-auto" value={ctx.storeId || ""} onChange={(e) => ctx.choose(e.target.value)}>
      {ctx.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}
