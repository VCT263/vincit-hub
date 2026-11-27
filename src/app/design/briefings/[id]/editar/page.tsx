"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BriefingForm, { shellCliente } from "@/components/design/briefing/Formulario";
import { comVersao, mudancas, type Briefing } from "@/components/design/briefing/acoes";

/* A equipe edita as respostas do briefing pelo mesmo formulário do cliente.
   A versão de antes vai para o histórico. */
export default function EditarBriefing() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<Briefing | null>(null);
  useEffect(() => {
    createClient().from("design_briefings").select("*").eq("id", id).single().then(({ data }) => { if (!data) router.replace("/design/briefings"); else setB(data as any); });
  }, [id]); // eslint-disable-line
  const sair = () => router.push(`/design/briefings/${id}`);

  if (!b) return shellCliente(<div className="min-h-full grid place-items-center text-[#8a847a]">Carregando…</div>);
  return (
    <BriefingForm modo="equipe" b={b} inicial={b.answers} onSair={sair}
      onSend={async (a) => {
        if (b.answered_at && !mudancas(b.answers, a).length) return true;
        const agora = new Date().toISOString();
        const patch: Partial<Briefing> = {
          answers: { ...a, _editado_em: agora },
          versoes: comVersao(b, "Antes da edição da equipe"),
          ...(b.status === "aberto" ? { status: "respondido" as const } : {}),
          ...(!b.answered_at ? { answered_at: agora, respondent: b.respondent || "Equipe" } : {}),
        };
        const { error } = await createClient().from("design_briefings").update(patch).eq("id", id);
        return !error;
      }} />
  );
}
