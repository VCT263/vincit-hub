"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { BrandCard } from "@/components/design/ui";

export default function Marcas() {
  const router = useRouter();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    createClient().from("design_projects").select("id,title,step,data,updated_at").eq("kind", "marca").is("archived_at", null).order("updated_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);
  async function novo() {
    setBusy(true);
    const { data } = await createClient().from("design_projects").insert({ kind: "marca", title: "Nova marca" }).select("id").single();
    if (data) router.push(`/design/marcas/${data.id}`); else setBusy(false);
  }
  const shown = (rows || []).filter((r) => !q || (r.data?.brief?.nome || r.title).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead kicker="Design · 01 Marca" title="Criação de marca" desc="Cada marca passa por briefing, referências, logo, cores, tipografia e manual. Tudo salva sozinho e você pode voltar a qualquer etapa.">
        <button onClick={novo} disabled={busy} className="btn btn-mint"><I.plus className="w-4 h-4" />{busy ? "Criando…" : "Nova marca"}</button>
      </PageHead>
      {!!rows?.length && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca" className="input max-w-64 mb-4 !py-1.5 text-sm" />}
      {rows === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="card h-48 animate-pulse" />)}</div>
      ) : !rows.length ? (
        <div className="card p-10 text-center rise">
          <p className="font-display text-xl font-bold">Nenhuma marca ainda</p>
          <p className="text-fog text-sm mt-2 max-w-md mx-auto">Comece pelo briefing. Com ele preenchido, o Claude propõe caminhos de logo, paleta e fontes, e você escolhe e ajusta.</p>
          <button onClick={novo} disabled={busy} className="btn btn-mint mt-5"><I.plus className="w-4 h-4" />Criar a primeira marca</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{shown.map((b) => <BrandCard key={b.id} b={b} />)}</div>
      )}
    </>
  );
}
