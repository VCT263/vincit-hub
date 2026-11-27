"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { PHASES, STEPS, CANVA_BRAND_KIT, canvaNew, timeAgo } from "@/lib/design";
import { BrandCard } from "@/components/design/ui";

type Row = { id: string; kind: string; title: string; step: string; preview: string | null; updated_at: string; data: any };

export default function DesignHome() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    createClient().from("design_projects").select("id,kind,title,step,preview,updated_at,data").is("archived_at", null).order("updated_at", { ascending: false }).limit(12)
      .then(({ data }) => setRows((data as any) || []));
  }, []);

  async function start(kind: "marca" | "carrossel" | "peca") {
    setBusy(kind);
    const title = kind === "marca" ? "Nova marca" : kind === "carrossel" ? "Novo carrossel" : "Nova peça";
    const { data } = await createClient().from("design_projects").insert({ kind, title, step: kind === "marca" ? "briefing" : "edicao" }).select("id").single();
    setBusy("");
    if (data) router.push(kind === "marca" ? `/design/marcas/${data.id}` : `/design/pecas/${data.id}`);
  }

  const brands = (rows || []).filter((r) => r.kind === "marca");
  const pieces = (rows || []).filter((r) => r.kind !== "marca");

  return (
    <>
      <PageHead kicker="DESIGN" title="Visão geral" desc="Crie marcas do briefing ao manual e monte carrosséis e peças com o kit da marca. O Claude sugere caminhos pela sua assinatura, sem custo extra.">
        <Link href="/design/pecas" className="btn btn-ghost"><I.cards className="w-4 h-4" />Peças</Link>
        <button onClick={() => start("marca")} disabled={!!busy} className="btn btn-mint"><I.plus className="w-4 h-4" />Nova marca</button>
      </PageHead>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {([
          ["marca", "Criar uma marca", "Briefing, logo, cores, tipografia e manual, passo a passo.", I.shapes],
          ["carrossel", "Montar um carrossel", "Modelos prontos com as cores e fontes da marca. Exporta PNG.", I.cards],
          ["peca", "Fazer uma peça estática", "Anúncio, frase, aviso ou produto com foto, em 4:5, 1:1 ou 9:16.", I.pen],
        ] as const).map(([k, t, d, Icon], i) => (
          <button key={k} onClick={() => start(k)} disabled={!!busy} className="card p-5 text-left hover:border-mint transition-colors rise group" style={{ animationDelay: `${i * .04}s` }}>
            <span className="w-10 h-10 rounded-xl bg-panel2 grid place-items-center text-mint mb-4 group-hover:bg-mint group-hover:text-[var(--color-on-mint,#06140e)] transition-colors"><Icon className="w-5 h-5" /></span>
            <p className="font-display font-bold text-lg">{busy === k ? "Criando…" : t}</p>
            <p className="text-sm text-fog mt-1">{d}</p>
          </button>
        ))}
      </div>

      <section className="card p-5 mb-6 rise">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-4">Como uma marca nasce aqui</p>
        <ol className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {PHASES.map((f, i) => (
            <li key={f}>
              <p className="font-mono text-[11px] text-mint">0{i + 1}</p>
              <p className="font-display font-bold mt-1">{f}</p>
              <ul className="text-xs text-fog mt-1.5 space-y-0.5">{STEPS.filter((s) => s.fase === f).map((s) => <li key={s.k}>{s.l}</li>)}</ul>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Marcas em criação</p>
            <Link href="/design/marcas" className="text-xs text-fog hover:text-paper">Todas →</Link>
          </div>
          {rows === null ? <div className="h-24 animate-pulse bg-panel2 rounded-xl" /> : !brands.length ? (
            <p className="text-sm text-fog py-6 text-center">Nenhuma marca ainda. Comece pelo briefing, leva uns 10 minutos.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {brands.slice(0, 4).map((b) => <BrandCard key={b.id} b={b} />)}
            </div>
          )}
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Peças recentes</p>
            <Link href="/design/pecas" className="text-xs text-fog hover:text-paper">Todas →</Link>
          </div>
          {rows !== null && !pieces.length && <p className="text-sm text-fog py-6 text-center">Nenhuma peça ainda.</p>}
          <div className="divide-y divide-line">
            {pieces.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/design/pecas/${p.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                <span className="w-10 h-12 rounded-md bg-panel2 overflow-hidden shrink-0">{p.preview && <img loading="lazy" decoding="async" src={p.preview} alt="" className="w-full h-full object-cover" />}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{p.title}</p><p className="text-xs text-fog">{p.kind === "carrossel" ? `Carrossel · ${(p.data?.slides || []).length} páginas` : "Peça estática"} · {timeAgo(p.updated_at)}</p></div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-5 mt-4 flex flex-col md:flex-row gap-4 md:items-center">
        <span className="w-10 h-10 rounded-xl bg-panel2 grid place-items-center text-mint shrink-0"><I.link className="w-5 h-5" /></span>
        <div className="flex-1">
          <p className="font-display font-bold">Canva</p>
          <p className="text-sm text-fog mt-1">Cada marca exporta logo, cores e fontes para o Kit de Marca do Canva, e cada peça abre um design no tamanho certo no Canva para o acabamento.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={canvaNew(1080, 1350)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Post 4:5 no Canva</a>
          <a href={CANVA_BRAND_KIT} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Kit de Marca do Canva</a>
        </div>
      </section>
    </>
  );
}
