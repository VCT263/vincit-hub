"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";

/** Motions da campanha (28/11): a pasta do Motion ligada a esta ação. Os motions criados com a pasta
 *  aberta e os cards enviados ao Quadro guardam o id da ação; o Editor abre a pasta certa sozinho. */
export default function MotionsDaCampanha({ actionId, pasta }: { actionId: string; pasta: string }) {
  const [rows, setRows] = useState<{ id: string; titulo: string; status: string }[] | null>(null);
  useEffect(() => {
    createClient().from("av_motions").select("id,titulo,status").eq("ec_action_id", actionId).order("updated_at", { ascending: false }).limit(30)
      .then(({ data }) => setRows((data as any) || []));
  }, [actionId]);
  const link = `/audiovisual/motion?campanha=${actionId}&pasta=${encodeURIComponent(pasta)}`;
  return (
    <section className="card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Motions da campanha{rows?.length ? ` (${rows.length})` : ""}</p>
      {rows === null && <p className="text-sm text-fog">Carregando…</p>}
      {rows?.length === 0 && <p className="text-sm text-fog">Nenhum motion ainda. Abra a pasta e peça ao Claude ou use um modelo da marca: tudo entra na pasta &quot;{pasta}&quot; e aparece no Editor quando você editar um vídeo desta campanha.</p>}
      {!!rows?.length && (
        <div className="space-y-1">{rows.map((r) => (
          <Link key={r.id} href={`/audiovisual/motion?id=${r.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-mint">
            <span className="truncate">{r.titulo}</span>
            <span className="text-[11px] text-fog shrink-0">{r.status === "pedido" ? "com o Claude" : "pronto"}</span>
          </Link>
        ))}</div>
      )}
      <Link href={link} className="btn btn-ghost mt-3 w-full justify-center"><I.folder className="w-4 h-4" />Abrir a pasta no Motion</Link>
    </section>
  );
}
