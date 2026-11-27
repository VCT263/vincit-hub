"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAI } from "@/lib/useAI";
import { I } from "@/components/icons";
import Modal from "@/components/agency/Modal";
import { DEFAULT_KIT, SIZES, briefText, canvaNew, download, drawSlide, kitFrom, loadFonts, shrink, uid, type Kit, type Slide } from "@/lib/design";

const LAYOUTS: [Slide["layout"], string][] = [["capa", "Capa"], ["texto", "Texto"], ["lista", "Lista"], ["citacao", "Frase"], ["cta", "Chamada"]];
const BGS: [Slide["bg"], string][] = [["primaria", "Primária"], ["escuro", "Escuro"], ["claro", "Claro"], ["destaque", "Destaque"], ["imagem", "Foto"]];

function Canvas({ slide, kit, size, n, total, w, onReady }: { slide: Slide; kit: Kit; size: { w: number; h: number }; n: number; total: number; w: number; onReady?: (c: HTMLCanvasElement) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    loadFonts([kit.title, kit.body]).then(() => { if (alive && ref.current) drawSlide(ref.current, slide, kit, { w: w, h: Math.round(w * size.h / size.w) }, n, total).then(() => alive && ref.current && onReady?.(ref.current)); });
    return () => { alive = false; };
  }, [slide, kit, size, n, total, w]); // eslint-disable-line
  return <canvas ref={ref} className="w-full h-auto block rounded-lg" />;
}

export default function PieceEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [d, setD] = useState<any>({ slides: [], size: "4x5" });
  const [brands, setBrands] = useState<any[]>([]);
  const [cur, setCur] = useState(0);
  const [saved, setSaved] = useState("salvo");
  const [ai, setAi] = useState(false);
  const [tema, setTema] = useState("");
  const [quadro, setQuadro] = useState<any[] | null>(null);
  const { run, busy, error } = useAI();
  const timer = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = createClient();
    Promise.all([
      s.from("design_projects").select("*").eq("id", id).single(),
      s.from("design_projects").select("id,title,data").eq("kind", "marca").is("archived_at", null).order("updated_at", { ascending: false }),
    ]).then(([{ data }, { data: bs }]) => {
      if (!data) { router.replace("/design/pecas"); return; }
      setP(data); setD({ size: "4x5", slides: [], ...(data.data || {}) }); setBrands(bs || []);
    });
  }, [id]); // eslint-disable-line

  const brand = brands.find((b) => b.id === p?.brand_id);
  const kit: Kit = useMemo(() => (brand ? kitFrom(brand) : DEFAULT_KIT), [brand]);
  const size = SIZES.find((s) => s.k === d.size) || SIZES[0];
  const slides: Slide[] = d.slides || [];
  const s = slides[cur];

  const persist = useCallback((row: any) => {
    clearTimeout(timer.current); setSaved("salvando…");
    timer.current = setTimeout(async () => { const { error: e } = await createClient().from("design_projects").update(row).eq("id", id); setSaved(e ? "não salvou" : "salvo"); }, 700);
  }, [id]);
  const setData = (patch: any) => setD((old: any) => { const next = { ...old, ...patch }; persist({ data: next, title: p?.title }); return next; });
  const setSlides = (next: Slide[]) => setData({ slides: next });
  const up = (patch: Partial<Slide>) => setSlides(slides.map((x, i) => (i === cur ? { ...x, ...patch } : x)));
  const setRow = (patch: any) => { setP((x: any) => ({ ...x, ...patch })); persist({ ...patch, data: d }); };

  const addSlide = (base?: Partial<Slide>) => { const n: Slide = { id: uid(), layout: "texto", title: "Novo título", body: "", bg: "claro", ...base }; const next = [...slides]; next.splice(cur + 1, 0, n); setSlides(next); setCur(cur + 1); };
  const move = (dir: -1 | 1) => { const j = cur + dir; if (j < 0 || j >= slides.length) return; const next = [...slides]; [next[cur], next[j]] = [next[j], next[cur]]; setSlides(next); setCur(j); };
  const del = () => { if (slides.length < 2) return; setSlides(slides.filter((_, i) => i !== cur)); setCur(Math.max(0, cur - 1)); };

  async function exportAll(only?: number) {
    await loadFonts([kit.title, kit.body]);
    const list = only != null ? [only] : slides.map((_, i) => i);
    for (const i of list) {
      const c = document.createElement("canvas");
      await drawSlide(c, slides[i], kit, size, i + 1, slides.length);
      download(c.toDataURL("image/png"), `${(p.title || "peca").replace(/[^\w\-]+/g, "-")}-${String(i + 1).padStart(2, "0")}.png`);
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  const savePreview = (c: HTMLCanvasElement) => {
    if (cur !== 0) return;
    const t = document.createElement("canvas"); t.width = 270; t.height = Math.round(270 * c.height / c.width); t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
    const url = t.toDataURL("image/jpeg", .7);
    if (url !== p.preview) { p.preview = url; createClient().from("design_projects").update({ preview: url }).eq("id", id); }
  };

  async function askClaude() {
    const r: any = await run("carousel_copy", { tema, pages: p.kind === "peca" ? 1 : Math.max(4, Math.min(10, slides.length || 6)), brand: brand ? `${brand.data?.brief?.nome || brand.title}\n${briefText(brand.data?.brief)}` : "", kind: p.kind });
    if (!r?.slides?.length) return;
    const okL = LAYOUTS.map((x) => x[0]), okB = BGS.map((x) => x[0]);
    setSlides(r.slides.map((x: any, i: number) => ({ id: uid(), layout: okL.includes(x.layout) ? x.layout : i === 0 ? "capa" : "texto", kicker: x.kicker || "", title: x.title || "", body: x.body || "", bg: okB.includes(x.bg) && x.bg !== "imagem" ? x.bg : i === 0 ? "primaria" : "claro" })));
    if (r.legenda) setData({ caption: r.legenda });
    setCur(0); setAi(false);
  }
  async function openQuadro() {
    const { data } = await createClient().from("content_ideas").select("id,title,body,format").is("archived_at", null).not("body", "is", null).order("created_at", { ascending: false }).limit(40);
    setQuadro(data || []);
  }
  function fromIdea(c: any) {
    const parts = (c.body || "").split(/\n\s*\n|\n(?=\s*(?:\d+[.)]|slide|página|-)\s)/i).map((x: string) => x.replace(/^\s*(?:\d+[.)]|slide \d+:?|página \d+:?|-)\s*/i, "").trim()).filter(Boolean).slice(0, 10);
    const sl: Slide[] = [{ id: uid(), layout: "capa", title: c.title, bg: "primaria" }, ...parts.map((t: string) => { const [first, ...rest] = t.split("\n"); return { id: uid(), layout: "texto" as const, title: first.slice(0, 90), body: rest.join(" ").slice(0, 240), bg: "claro" as const }; })];
    setSlides(sl); setCur(0); setQuadro(null); setRow({ title: c.title });
  }

  if (!p) return <div className="card h-96 animate-pulse" />;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Link href="/design/pecas" className="btn btn-ghost btn-sm"><I.back className="w-3.5 h-3.5" />Peças</Link>
        <input value={p.title} onChange={(e) => setRow({ title: e.target.value })} className="flex-1 min-w-40 bg-transparent font-display font-extrabold text-xl outline-none" />
        <span className="text-[11px] font-mono text-fog">{saved}</span>
      </div>

      <div className="card p-3 mb-4 flex flex-wrap gap-2 items-center">
        <select value={p.brand_id || ""} onChange={(e) => setRow({ brand_id: e.target.value || null })} className="input !w-auto !py-1.5 text-sm">
          <option value="">Kit padrão VINCIT</option>
          {brands.map((b) => <option key={b.id} value={b.id}>Marca: {b.data?.brief?.nome || b.title}</option>)}
        </select>
        <select value={d.size} onChange={(e) => setData({ size: e.target.value })} className="input !w-auto !py-1.5 text-sm">{SIZES.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}</select>
        <button onClick={() => { setTema(p.title.replace(/^(Carrossel|Peça) · /, "")); setAi(true); }} className="btn btn-ghost btn-sm"><I.spark className="w-3.5 h-3.5" />Texto com o Claude</button>
        <button onClick={openQuadro} className="btn btn-ghost btn-sm"><I.board className="w-3.5 h-3.5" />Puxar do Quadro</button>
        <div className="ml-auto flex gap-2 flex-wrap">
          <a href={canvaNew(size.w, size.h)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Abre um design em branco no mesmo tamanho; arraste os PNGs para lá">Abrir no Canva ↗</a>
          <button onClick={() => exportAll()} className="btn btn-mint btn-sm"><I.download className="w-3.5 h-3.5" />Baixar {slides.length > 1 ? `${slides.length} PNGs` : "PNG"}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[120px_1fr_320px] gap-4 items-start">
        <div className="flex lg:flex-col gap-2 overflow-x-auto scroll-thin lg:max-h-[75vh] lg:overflow-y-auto pb-1 order-2 lg:order-1">
          {slides.map((x, i) => (
            <button key={x.id} onClick={() => setCur(i)} className={`shrink-0 w-24 lg:w-full rounded-lg border-2 ${i === cur ? "border-mint" : "border-transparent hover:border-line"}`}>
              <Canvas slide={x} kit={kit} size={size} n={i + 1} total={slides.length} w={216} />
              <p className="text-[10px] text-fog py-0.5">{i + 1}</p>
            </button>
          ))}
          {p.kind === "carrossel" && <button onClick={() => addSlide()} className="shrink-0 w-24 lg:w-full aspect-[4/5] rounded-lg border border-dashed border-line text-fog hover:text-mint hover:border-mint grid place-items-center"><I.plus className="w-5 h-5" /></button>}
        </div>

        <div className="order-1 lg:order-2">
          {s ? <div className="max-w-[520px] mx-auto"><Canvas slide={s} kit={kit} size={size} n={cur + 1} total={slides.length} w={1080} onReady={savePreview} /></div> : <p className="text-fog text-center py-20">Sem páginas.</p>}
          {d.caption && <div className="card p-4 mt-4 max-w-[520px] mx-auto"><p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-1">Legenda sugerida</p><textarea value={d.caption} onChange={(e) => setData({ caption: e.target.value })} rows={4} className="input text-sm" /></div>}
        </div>

        {s && (
          <div className="card p-4 space-y-3 order-3">
            <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Página {cur + 1}</p>
              {p.kind === "carrossel" && <div className="flex gap-1">
                <button onClick={() => move(-1)} className="btn btn-ghost btn-sm !px-2" aria-label="Mover para trás">←</button>
                <button onClick={() => move(1)} className="btn btn-ghost btn-sm !px-2" aria-label="Mover para frente">→</button>
                <button onClick={() => addSlide({ ...s, id: uid() })} className="btn btn-ghost btn-sm !px-2" aria-label="Duplicar"><I.copy className="w-3.5 h-3.5" /></button>
                <button onClick={del} className="btn btn-ghost btn-sm !px-2 hover:!text-danger" aria-label="Apagar"><I.trash className="w-3.5 h-3.5" /></button>
              </div>}
            </div>
            <div><label className="label">Layout</label><div className="flex flex-wrap gap-1.5">{LAYOUTS.map(([k, l]) => <button key={k} onClick={() => up({ layout: k })} className={`chip !px-2.5 !py-1 ${s.layout === k ? "chip-mint" : ""}`}>{l}</button>)}</div></div>
            <div><label className="label">Fundo</label><div className="flex flex-wrap gap-1.5">{BGS.map(([k, l]) => (
              <button key={k} onClick={() => (k === "imagem" && !s.img ? fileRef.current?.click() : up({ bg: k }))} className={`chip !px-2.5 !py-1 ${s.bg === k ? "chip-mint" : ""}`}>
                {k !== "imagem" && <span className="w-3 h-3 rounded-full border border-line" style={{ background: kit.colors[l === "Primária" ? "Primária" : l] }} />}{l}</button>
            ))}</div></div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) up({ img: await shrink(f, 1350, .85), bg: "imagem" }); e.target.value = ""; }} />
            {s.bg === "imagem" && <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm w-full">{s.img ? "Trocar foto" : "Escolher foto"}</button>}
            <div><label className="label">Chamada pequena</label><input value={s.kicker || ""} onChange={(e) => up({ kicker: e.target.value })} className="input" placeholder="Ex.: GUIA RÁPIDO" /></div>
            <div><label className="label">Título</label><textarea value={s.title} onChange={(e) => up({ title: e.target.value })} rows={2} className="input" /></div>
            <div><label className="label">{s.layout === "lista" ? "Itens (um por linha)" : "Texto"}</label><textarea value={s.body || ""} onChange={(e) => up({ body: e.target.value })} rows={s.layout === "lista" ? 4 : 3} className="input" /></div>
            <button onClick={() => exportAll(cur)} className="btn btn-ghost btn-sm w-full"><I.download className="w-3.5 h-3.5" />Baixar só esta</button>
          </div>
        )}
      </div>

      <Modal open={ai} title="Texto com o Claude" onClose={() => setAi(false)}>
        <label className="label">Tema da peça</label>
        <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={3} className="input" placeholder="Ex.: 5 jeitos de usar a camisa branca no verão" />
        <p className="text-xs text-fog mt-2">{brand ? `Usa o briefing da marca ${brand.data?.brief?.nome || brand.title}.` : "Escolha uma marca no topo para o texto seguir o tom dela."} O pedido vai para a fila do Claude (sua assinatura) e o texto aparece aqui quando ele responder. Substitui os textos atuais.</p>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
        <button onClick={askClaude} disabled={busy || !tema.trim()} className="btn btn-mint mt-4 w-full"><I.spark className="w-4 h-4" />{busy ? "Esperando o Claude…" : "Pedir o texto"}</button>
      </Modal>

      <Modal open={quadro !== null} title="Puxar um conteúdo do Quadro" onClose={() => setQuadro(null)}>
        {quadro && !quadro.length && <p className="text-sm text-fog">Nenhum conteúdo com roteiro no Quadro de produção.</p>}
        <div className="divide-y divide-line">
          {(quadro || []).map((c) => (
            <button key={c.id} onClick={() => fromIdea(c)} className="w-full text-left py-3 hover:text-mint">
              <p className="font-semibold text-sm">{c.title}</p><p className="text-xs text-fog line-clamp-2">{c.format ? `${c.format} · ` : ""}{c.body}</p>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
