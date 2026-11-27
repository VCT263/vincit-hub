"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";

/** briefings respondidos pelo cliente que ainda não viraram projeto (topo da Criação de marca) */
export default function Solicitacoes() {
  const [rows, setRows] = useState<any[]>([]);
  const [aguardando, setAguardando] = useState(0);
  useEffect(() => {
    createClient().from("design_briefings").select("id,title,client_name,status,respondent,answered_at,marca:answers->>marca_nome,nao_quer:answers->>nao_quer").in("status", ["respondido", "aberto"]).order("answered_at", { ascending: false })
      .then(({ data }) => { const all = (data as any[]) || []; setRows(all.filter((r) => r.status === "respondido")); setAguardando(all.filter((r) => r.status === "aberto").length); });
  }, []);
  if (!rows.length && !aguardando) return null;
  return (
    <section className="mb-8 rise">
      <div className="flex items-center gap-3 mb-3">
        <p className="font-mono text-[11px] text-mint tracking-widest uppercase">Solicitações recebidas{rows.length ? ` · ${rows.length}` : ""}</p>
        <Link href="/design/briefings" className="text-xs text-fog hover:text-paper ml-auto">{aguardando ? `${aguardando} aguardando o cliente · ` : ""}ver briefings →</Link>
      </div>
      {!rows.length ? <p className="card p-4 text-sm text-fog">Nenhum briefing novo. Assim que o cliente responder, ele aparece aqui.</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((b) => (
            <Link key={b.id} href={`/design/briefings/${b.id}`} className="card p-4 border-mint-dim hover:border-mint transition-colors block">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-mint" /><p className="text-[11px] text-fog">Briefing respondido{b.answered_at ? ` · ${new Date(b.answered_at).toLocaleDateString("pt-BR")}` : ""}</p></div>
              <p className="font-display text-lg font-bold mt-2 truncate">{b.marca || b.title}</p>
              <p className="text-xs text-fog mt-0.5 truncate">{b.respondent || b.client_name || "Cliente"}</p>
              {b.nao_quer && <p className="text-xs mt-3 line-clamp-2 border-l-2 border-danger pl-2"><span className="text-danger">Não quer:</span> {b.nao_quer}</p>}
              <p className="text-sm text-mint mt-3 flex items-center gap-1.5">Analisar e criar projeto<I.arrow className="w-3.5 h-3.5" /></p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
