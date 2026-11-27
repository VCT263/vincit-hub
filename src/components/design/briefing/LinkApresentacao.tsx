"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { brandUrl } from "./acoes";

type Retorno = { decisao: "aprovado" | "ajuste"; texto?: string; nome?: string; em: string };

/* Link público da apresentação da marca (/m/<token>): o cliente vê no celular ou no computador,
   baixa o PDF e aprova ou pede ajuste. Os retornos voltam para cá e para o sino. */
export default function LinkApresentacao({ id, d, set }: { id: string; d: any; set: (p: any) => void }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  const ent = d.entrega || {};
  const retornos: Retorno[] = ent.retornos || [];

  useEffect(() => {
    createClient().from("design_projects").select("share_token,entrega:data->entrega").eq("id", id).single().then(({ data }) => {
      setToken((data as any)?.share_token || null);
      // o cliente pode ter respondido com o projeto aberto: traz os retornos novos para o editor não apagá-los ao salvar
      const fresh = (data as any)?.entrega || {};
      if ((fresh.retornos || []).length > retornos.length || (fresh.aprovado && !ent.aprovado)) set({ entrega: { ...ent, retornos: fresh.retornos || [], aprovado: fresh.aprovado || ent.aprovado } });
    });
  }, [id]); // eslint-disable-line

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };
  async function criar() {
    const t = crypto.randomUUID();
    const { error } = await createClient().from("design_projects").update({ share_token: t }).eq("id", id);
    if (!error) { setToken(t); await navigator.clipboard.writeText(brandUrl(t)).catch(() => {}); flash("Link criado e copiado"); }
  }
  async function desligar() {
    const { error } = await createClient().from("design_projects").update({ share_token: null }).eq("id", id);
    if (!error) setToken(null);
  }
  if (token === undefined) return null;
  const url = token ? brandUrl(token) : "";
  const zap = `https://wa.me/?text=${encodeURIComponent(`Sua marca está pronta para ver! Abra com calma, de preferência no computador: ${url}`)}`;

  return (
    <div className="card p-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-sm mr-auto flex items-center gap-2"><I.link className="w-4 h-4" />Link para o cliente</p>
        {msg && <span className="text-xs text-mint">{msg}</span>}
        {!token ? <button onClick={criar} className="btn btn-mint btn-sm">Criar link da apresentação</button> : <>
          <button onClick={async () => { await navigator.clipboard.writeText(url); flash("Copiado"); }} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar</button>
          <a href={zap} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">WhatsApp ↗</a>
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Ver como o cliente ↗</a>
          <button onClick={desligar} className="btn btn-ghost btn-sm text-fog" title="O link para de funcionar">Desligar</button>
        </>}
      </div>
      {token ? <p className="font-mono text-xs text-fog mt-2 truncate">{url}</p>
        : <p className="text-xs text-fog mt-2">Uma página com a apresentação inteira, que o cliente abre sem login, baixa em PDF e aprova ou pede ajuste. Mostra sempre a versão salva mais recente.</p>}
      {!!retornos.length && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          {[...retornos].reverse().map((r, i) => (
            <div key={i} className="text-sm flex gap-2">
              <span className={`chip shrink-0 ${r.decisao === "aprovado" ? "chip-mint" : "text-danger border-danger/40"}`}>{r.decisao === "aprovado" ? "Aprovou" : "Pediu ajuste"}</span>
              <p className="min-w-0"><span className="text-fog">{r.nome} · {new Date(r.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>{r.texto && <span className="block whitespace-pre-wrap">{r.texto}</span>}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
