"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Código de sincronia do Arc Route + ID da agenda do Google */
export default function SyncSettings({ code }: { code: string }) {
  const [v, setV] = useState(code);
  const [cal, setCal] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  async function saveCode() {
    const { data, error } = await createClient().rpc("set_sync_code", { p_code: v });
    if (error) return setMsg({ t: error.message.replace(/^.*?:\s*/, "") });
    setV(data || ""); setMsg({ t: data ? "Código salvo. Suas tarefas do Arc Route agora aparecem aqui." : "Código removido.", ok: true });
  }
  async function saveCal() {
    const r = await fetch("/api/google/prefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendar_id: cal }) }).then((x) => x.json()).catch(() => null);
    setMsg(r?.ok ? { t: "Agenda do Google atualizada.", ok: true } : { t: "Conecte o Google Agenda antes." });
  }
  return (
    <section className="card p-5 space-y-3">
      <p className="font-display font-bold">Sincronia com o Arc Route</p>
      <p className="text-xs text-fog">Cole o código que aparece em Arc Route → Configurações → Sincronia. Ele liga as suas tarefas e agenda dos dois sistemas.</p>
      <div className="flex gap-2"><input className="input font-mono" value={v} onChange={(e) => setV(e.target.value.toUpperCase())} placeholder="ARC-XXXX-XXXX" /><button type="button" className="btn btn-mint btn-sm" onClick={saveCode}>Salvar</button></div>
      <p className="label">ID da agenda do Google (vazio = principal)</p>
      <div className="flex gap-2"><input className="input" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="seuemail@gmail.com" /><button type="button" className="btn btn-ghost btn-sm" onClick={saveCal}>Salvar</button></div>
      {msg && <p className={"text-xs " + (msg.ok ? "text-mint" : "text-danger")}>{msg.t}</p>}
    </section>
  );
}
