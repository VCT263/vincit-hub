"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { CAROUSEL_TEMPLATES, STATIC_TEMPLATES, timeAgo, uid } from "@/lib/design";

export default function Pecas() {
  const router = useRouter();
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    createClient().from("design_projects").select("id,kind,title,preview,updated_at,data").in("kind", ["carrossel", "peca"]).is("archived_at", null).order("updated_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  async function start(kind: "carrossel" | "peca", key: string) {
    setBusy(key);
    const ct = CAROUSEL_TEMPLATES.find((t) => t.k === key), st = STATIC_TEMPLATES.find((t) => t.k === key);
    const slides = kind === "carrossel" ? (ct?.slides || [{ layout: "capa", title: "Título da capa", bg: "primaria" }]) : [st?.slide || { layout: "capa", title: "Título", bg: "primaria" }];
    const { data } = await createClient().from("design_projects").insert({
      kind, step: "edicao", title: kind === "carrossel" ? `Carrossel · ${ct?.l || "em branco"}` : `Peça · ${st?.l || "em branco"}`,
      data: { size: st?.size || "4x5", slides: slides.map((s) => ({ ...s, id: uid() })) },
    }).select("id").single();
    if (data) router.push(`/design/pecas/${data.id}`); else setBusy("");
  }

  async function remove(id: string) {
    await createClient().from("design_projects").update({ archived_at: new Date().toISOString() }).eq("id", id);
    setRows((r) => r && r.filter((x) => x.id !== id));
  }

  return (
    <>
      <PageHead kicker="Design · 02 Peças" title="Carrosséis e peças" desc="Escolha um modelo, troque os textos e as fotos e exporte em PNG. As cores, fontes e logo vêm da marca que você escolher.">
        <button onClick={() => start("carrossel", "branco")} disabled={!!busy} className="btn btn-mint"><I.plus className="w-4 h-4" />Carrossel em branco</button>
      </PageHead>

      <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-3">Modelos de carrossel</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {CAROUSEL_TEMPLATES.map((t, i) => (
          <button key={t.k} onClick={() => start("carrossel", t.k)} disabled={!!busy} className="card p-4 text-left hover:border-mint transition-colors rise" style={{ animationDelay: `${i * .03}s` }}>
            <div className="flex gap-1 h-16 mb-3">{t.slides.slice(0, 4).map((s, j) => <span key={j} className="flex-1 rounded-md" style={{ background: s.bg === "primaria" ? "var(--color-mint)" : s.bg === "escuro" ? "#0c0c0d" : s.bg === "destaque" ? "#f5c84c" : s.bg === "imagem" ? "linear-gradient(160deg,#3d525a,#0c0c0d)" : "#f1f1f1", border: "1px solid var(--color-line)" }} />)}</div>
            <p className="font-semibold text-sm">{busy === t.k ? "Criando…" : t.l}</p>
            <p className="text-xs text-fog mt-1">{t.d} · {t.slides.length} páginas</p>
          </button>
        ))}
      </div>

      <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-3">Peças estáticas</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {STATIC_TEMPLATES.map((t) => (
          <button key={t.k} onClick={() => start("peca", t.k)} disabled={!!busy} className="card p-4 text-left hover:border-mint transition-colors">
            <p className="font-mono text-[10px] text-mint">{t.size.replace("x", ":")}</p>
            <p className="font-semibold text-sm mt-1">{busy === t.k ? "Criando…" : t.l}</p>
            <p className="text-xs text-fog mt-1">{t.d}</p>
          </button>
        ))}
      </div>

      <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-3">Suas peças{rows ? ` · ${rows.length}` : ""}</p>
      {rows === null ? <div className="card h-40 animate-pulse" /> : !rows.length ? (
        <p className="text-sm text-fog py-8 text-center card">Nenhuma peça ainda. Comece por um modelo acima.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rows.map((r) => (
            <div key={r.id} className="card overflow-hidden group relative">
              <Link href={`/design/pecas/${r.id}`} className="block">
                <div className="aspect-[4/5] bg-panel2">{r.preview && <img loading="lazy" decoding="async" src={r.preview} alt="" className="w-full h-full object-cover" />}</div>
                <div className="p-3"><p className="font-semibold text-sm truncate">{r.title}</p><p className="text-[11px] text-fog">{r.kind === "carrossel" ? `${(r.data?.slides || []).length} páginas` : "estática"} · {timeAgo(r.updated_at)}</p></div>
              </Link>
              <button onClick={() => remove(r.id)} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-ink/80 text-fog hover:text-danger grid place-items-center opacity-0 group-hover:opacity-100" aria-label="Arquivar"><I.trash className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
