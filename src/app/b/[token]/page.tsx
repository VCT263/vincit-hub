"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BriefingForm, { shellCliente } from "@/components/design/briefing/Formulario";

/* Briefing de marca que o cliente responde sem login. Ao enviar, chega na Criação de marca como solicitação. */

const SERIF = { fontFamily: '"Bodoni Moda", Georgia, serif' };

export default function BriefingPublico() {
  const { token } = useParams<{ token: string }>();
  const [b, setB] = useState<any>(undefined);
  useEffect(() => { createClient().rpc("pub_get_briefing", { p_token: token }).then(({ data }) => setB(data || null)); }, [token]);

  if (b === undefined) return shellCliente(<div className="min-h-full grid place-items-center text-[#8a847a]">Carregando…</div>);
  if (!b) return shellCliente(<div className="min-h-full grid place-items-center px-6 text-center"><div><p className="text-[28px]" style={SERIF}>Link não encontrado</p><p className="text-[#7a746a] mt-2">Peça um link novo para quem te enviou.</p></div></div>);
  if (b.status === "projeto") return shellCliente(<div className="min-h-full grid place-items-center px-6 text-center"><div className="max-w-md"><p className="text-[34px] leading-tight" style={SERIF}>Briefing recebido</p><p className="text-[#7a746a] mt-3">Suas respostas já viraram o projeto da marca. Se quiser mudar algo, fale direto com a gente.</p></div></div>);
  return <BriefingForm b={b} inicial={b.answers} storageKey={`vincit-briefing:${token}`}
    onSend={async (a) => { const { data, error } = await createClient().rpc("pub_submit_briefing", { p_token: token, p_answers: a, p_name: a.seu_nome || "" }); return !error && !!data; }} />;
}
