"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* Faixa no projeto de marca que veio de um briefing: deixa à vista o que o cliente pediu e,
   principalmente, o que ele não quer, para não haver leitura errada em nenhuma etapa. */
export default function ClienteBriefing({ briefingId }: { briefingId?: string | null }) {
  const [b, setB] = useState<any>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!briefingId) return;
    createClient().from("design_briefings").select("id,respondent,answered_at,notes,nao_quer:answers->>nao_quer,palavras:answers->palavras,nao_palavras:answers->nao_palavras,nome_extra:answers->>nome_extra,antes:answers->>antes")
      .eq("id", briefingId).maybeSingle().then(({ data }) => setB(data));
  }, [briefingId]);
  if (!b) return null;
  return (
    <div className="card mb-5 print:hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <span className="w-2 h-2 rounded-full bg-mint shrink-0" />
        <span className="text-sm flex-1 min-w-0 truncate"><b>Briefing do cliente</b><span className="text-fog"> · {b.respondent || "cliente"}{b.answered_at ? ` em ${new Date(b.answered_at).toLocaleDateString("pt-BR")}` : ""}</span>{b.nao_quer && !open && <span className="text-fog"> · <span className="text-danger">Não quer:</span> {b.nao_quer}</span>}</span>
        <span className="text-fog text-xs shrink-0">{open ? "fechar ▴" : "ver ▾"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 grid md:grid-cols-2 gap-4 text-sm border-t border-line pt-4">
          {b.nao_quer && <div className="md:col-span-2 border-l-2 border-danger pl-3"><p className="text-[11px] uppercase tracking-widest text-danger font-semibold">Não quer de jeito nenhum</p><p className="mt-1 whitespace-pre-wrap">{b.nao_quer}</p></div>}
          {!!b.palavras?.length && <div><p className="label">Precisa transmitir</p><p>{b.palavras.join(", ")}</p></div>}
          {!!b.nao_palavras?.length && <div><p className="label">Não pode parecer</p><p>{b.nao_palavras.join(", ")}</p></div>}
          {b.nome_extra && <div><p className="label">Fora do logo</p><p>{b.nome_extra}</p></div>}
          {b.antes && <div className="md:col-span-2"><p className="label">Sobre a marca anterior</p><p className="whitespace-pre-wrap">{b.antes}</p></div>}
          {b.notes && <div className="md:col-span-2"><p className="label">Suas notas</p><p className="whitespace-pre-wrap text-fog">{b.notes}</p></div>}
          <Link href={`/design/briefings/${b.id}`} className="text-mint text-sm md:col-span-2">Ver o briefing completo →</Link>
        </div>
      )}
    </div>
  );
}
