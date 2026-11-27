"use client";
import { useEffect, useRef, useState } from "react";
import { REF_SITES, extractColors, shrink, uid } from "@/lib/design";
import { I } from "@/components/icons";
import type { StepProps } from "./types";

type Ref = { id: string; img?: string; url?: string; note?: string; tipo: "gosto" | "evitar"; colors?: string[] };

export default function RefsStep({ d, set }: StepProps) {
  const refs: Ref[] = d.refs || [];
  const b = d.brief || {};
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const terms = [b.oque?.split(/[.,]/)[0], ...(b.palavras || [])].filter(Boolean).join(" ").slice(0, 60) || b.nome || "moda";
  const [q, setQ] = useState(terms);
  const save = (next: Ref[]) => set({ refs: next });

  async function addFiles(files: FileList | File[]) {
    setBusy(true);
    const added: Ref[] = [];
    for (const f of Array.from(files).filter((x) => x.type.startsWith("image/")).slice(0, 12)) {
      const img = await shrink(f, 800, .8);
      let colors: string[] = [];
      try { colors = await extractColors(img, 5); } catch {}
      added.push({ id: uid(), img, tipo: "gosto", colors });
    }
    save([...added, ...refs]); setBusy(false);
  }
  useEffect(() => {
    const h = (e: ClipboardEvent) => { const fs = Array.from(e.clipboardData?.files || []); if (fs.length) addFiles(fs); };
    window.addEventListener("paste", h); return () => window.removeEventListener("paste", h);
  });

  function addUrl(e: React.FormEvent) {
    e.preventDefault(); const u = url.trim(); if (!/^https?:\/\//.test(u)) return;
    save([{ id: uid(), url: u, tipo: "gosto" }, ...refs]); setUrl("");
  }
  const up = (r: Ref, patch: Partial<Ref>) => save(refs.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
  const host = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } };
  const allColors = Array.from(new Set(refs.filter((r) => r.tipo === "gosto").flatMap((r) => r.colors || []))).slice(0, 15);

  return (
    <div className="space-y-5">
      <section className="card p-5 rise">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Pesquisar referências</p>
        <div className="flex flex-col md:flex-row gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input md:max-w-sm" placeholder="Ex.: moda feminina minimalista" />
          <div className="flex gap-2 flex-wrap">
            {REF_SITES.map((s) => <a key={s.l} href={s.u(q)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">{s.l} ↗</a>)}
          </div>
        </div>
        <p className="text-xs text-fog mt-3">Abra, salve as imagens que chamarem atenção e cole aqui (Ctrl/Cmd + V), ou cole o link do projeto. No Behance, repare como os cases mostram pesquisa, conceito, rascunhos, construção da logo, paleta, fontes e aplicações.</p>
      </section>

      <div className="grid md:grid-cols-[1fr_1fr] gap-3">
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className="card border-dashed p-6 text-center cursor-pointer hover:border-mint transition-colors">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <I.plus className="w-6 h-6 mx-auto text-mint" />
          <p className="font-semibold text-sm mt-2">{busy ? "Lendo imagens…" : "Arraste, cole ou escolha imagens"}</p>
          <p className="text-xs text-fog mt-1">As cores de cada imagem viram sugestão de paleta.</p>
        </div>
        <form onSubmit={addUrl} className="card p-6 flex flex-col justify-center gap-2">
          <label className="label">Link de referência (Behance, Pinterest, Instagram, site)</label>
          <div className="flex gap-2"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.behance.net/gallery/…" className="input min-w-0 flex-1" /><button className="btn btn-mint btn-sm">Adicionar</button></div>
        </form>
      </div>

      {allColors.length > 0 && (
        <section className="card p-4 flex items-center gap-3 flex-wrap rise">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Cores do moodboard</p>
          <div className="flex gap-1">{allColors.map((c) => <span key={c} title={c} className="w-7 h-7 rounded-md border border-line" style={{ background: c }} />)}</div>
          <span className="text-xs text-fog">Ficam disponíveis na etapa Cores.</span>
        </section>
      )}

      {refs.length === 0 ? (
        <p className="text-sm text-fog text-center py-8">Nenhuma referência ainda. Junte de 6 a 15: marcas do nicho, de fora do nicho e o que a marca não quer parecer.</p>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [&>*]:mb-3">
          {refs.map((r) => (
            <div key={r.id} className={`card overflow-hidden break-inside-avoid group ${r.tipo === "evitar" ? "opacity-70" : ""}`}>
              {r.img ? <img src={r.img} alt="" className="w-full" /> : (
                <a href={r.url} target="_blank" rel="noreferrer" className="block p-4 bg-panel2 hover:text-mint">
                  <I.link className="w-4 h-4 mb-2" /><p className="text-sm font-semibold truncate">{host(r.url || "")}</p><p className="text-[11px] text-fog truncate">{r.url}</p>
                </a>
              )}
              {r.colors?.length ? <div className="flex h-2">{r.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div> : null}
              <div className="p-2.5 space-y-2">
                <input value={r.note || ""} onChange={(e) => up(r, { note: e.target.value })} placeholder="O que chama atenção?" className="w-full bg-transparent text-xs outline-none placeholder:text-fog/60" />
                <div className="flex gap-1.5 items-center">
                  <button onClick={() => up(r, { tipo: "gosto" })} className={`chip ${r.tipo === "gosto" ? "chip-mint" : ""}`}>Inspira</button>
                  <button onClick={() => up(r, { tipo: "evitar" })} className={`chip ${r.tipo === "evitar" ? "!text-danger !border-danger/40" : ""}`}>Evitar</button>
                  <button onClick={() => save(refs.filter((x) => x.id !== r.id))} className="ml-auto text-fog hover:text-danger" aria-label="Tirar referência"><I.trash className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
