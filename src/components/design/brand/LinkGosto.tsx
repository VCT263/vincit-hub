"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";

const tasteUrl = (t: string) => `${typeof window !== "undefined" ? window.location.origin : "https://vincit-hub.vercel.app"}/g/${t}`;

/* Link público do pré-projeto (/g/<token>): o cliente marca sozinho as letras e o mapa do gosto,
   sem login, e o que ele enviar substitui as marcações desta etapa e avisa no sino. */
export default function LinkGosto({ id, d, set }: { id: string; d: any; set: (p: any) => void }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  const cli = d.gosto?.cliente;

  useEffect(() => {
    createClient().from("design_projects").select("taste_token,gosto:data->gosto").eq("id", id).single().then(({ data }) => {
      setToken((data as any)?.taste_token || null);
      // o cliente pode ter respondido com o projeto aberto: traz a resposta para o editor não apagá-la ao salvar
      const fresh = (data as any)?.gosto;
      if (fresh?.cliente?.em && fresh.cliente.em !== d.gosto?.cliente?.em) set({ gosto: fresh });
    });
  }, [id]); // eslint-disable-line

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };
  async function criar() {
    const t = crypto.randomUUID();
    const { error } = await createClient().from("design_projects").update({ taste_token: t }).eq("id", id);
    if (!error) { setToken(t); await navigator.clipboard.writeText(tasteUrl(t)).catch(() => {}); flash("Link criado e copiado"); }
  }
  async function desligar() {
    const { error } = await createClient().from("design_projects").update({ taste_token: null }).eq("id", id);
    if (!error) setToken(null);
  }
  if (token === undefined) return null;
  const url = token ? tasteUrl(token) : "";
  const zap = `https://wa.me/?text=${encodeURIComponent(`Antes de desenhar sua marca, quero entender o seu gosto. Abra com calma, marque as letras que você gosta e as que não quer, e me envie no final: ${url}`)}`;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-sm mr-auto flex items-center gap-2"><I.link className="w-4 h-4" />Link para o cliente marcar sozinho</p>
        {msg && <span className="text-xs text-mint">{msg}</span>}
        {!token ? <button onClick={criar} className="btn btn-mint btn-sm">Criar link do pré-projeto</button> : <>
          <button onClick={async () => { await navigator.clipboard.writeText(url); flash("Copiado"); }} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar</button>
          <a href={zap} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">WhatsApp ↗</a>
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Ver como o cliente ↗</a>
          <button onClick={desligar} className="btn btn-ghost btn-sm text-fog" title="O link para de funcionar">Desligar</button>
        </>}
      </div>
      {token ? <p className="font-mono text-xs text-fog mt-2 truncate">{url}</p>
        : <p className="text-xs text-fog mt-2">Uma página no celular com os tipos de letra, o mostruário e o mapa do gosto. O cliente marca sem login e envia; a resposta aparece aqui e no sino.</p>}
      {cli?.em && <p className="text-xs text-mint mt-2">Respondido por {cli.nome} em {new Date(cli.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. As marcações abaixo são as dele.</p>}
    </div>
  );
}
