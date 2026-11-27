"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { FONTS } from "@/lib/editor/model";
import { kitFrom, loadFonts } from "@/lib/design";
import {
  CENA_CAMPOS, CENA_LABEL, CENA_TIPOS, FUNDO_LABEL, MODELOS, MOTION_FORMAT_LABEL, MOTION_SIZES, TRANSICAO_LABEL,
  cenaAt, coresDoKit, drawMotion, mix, motionDuration, normalizeSpec, novaCena, onImageLoad, specDoModelo,
  type Cena, type CenaTipo, type Fundo, type MotionFormat, type MotionSpec, type Ritmo, type Transicao,
} from "@/lib/motion/engine";

export type MotionDoc = { id?: string; titulo: string; spec: MotionSpec; kit_id?: string | null; brand_id?: string | null; account_id?: string | null; content_id?: string | null; origem?: string };
type Opt = { id: string; name: string; data?: any };

/** imagem do computador → data URL JPEG (até 1600 px), para não pesar no banco */
export async function fileToDataUrl(file: File, max = 1600, png = false) {
  const url = URL.createObjectURL(file);
  const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  if (file.type === "image/svg+xml") { const txt = await file.text(); URL.revokeObjectURL(url); return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(txt)}`; }
  const sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc);
  c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
}

/** prévia parada (ou tocando) de um motion num canvas pequeno */
export function MotionThumb({ spec, t = 1.2, className = "" }: { spec: MotionSpec; t?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [W, H] = MOTION_SIZES[spec.formato];
  useEffect(() => {
    const draw = () => { const c = ref.current; if (!c) return; const ctx = c.getContext("2d")!; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.scale(c.width / W, c.height / H); drawMotion(ctx, spec, Math.min(t, motionDuration(spec) - 0.05), W, H); };
    loadFonts([spec.fontes.titulo, spec.fontes.texto].map((f) => f.replace(/\s+(Black|ExtraBold|Bold|SemiBold|Medium|Regular|Italic)$/i, ""))).then(draw);
    draw();
    return onImageLoad(draw);
  }, [spec, t, W, H]);
  return <canvas ref={ref} width={Math.round(W / 6)} height={Math.round(H / 6)} className={`w-full h-auto rounded-lg bg-[repeating-conic-gradient(#222_0_25%,#2a2a2a_0_50%)] [background-size:16px_16px] ${className}`} />;
}

/**
 * Criador de motion: modelos, visual (kit do Editor ou marca do Design), cenas e prévia ao vivo.
 * Usado na página Motion e dentro do Editor (gaveta "Criar motion"), com onUse para entrar no vídeo.
 */
export default function MotionStudio({ initial, onSaved, onUse, useLabel = "Usar no Editor", compact = false }: {
  initial?: Partial<MotionDoc>; onSaved?: (d: MotionDoc) => void; onUse?: (d: MotionDoc) => void; useLabel?: string; compact?: boolean;
}) {
  const [doc, setDoc] = useState<MotionDoc>(() => ({ titulo: initial?.titulo || "Novo motion", spec: initial?.spec ? normalizeSpec(initial.spec) : specDoModelo("abertura"), ...initial } as MotionDoc));
  const spec = doc.spec;
  const [kits, setKits] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [sel, setSel] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const cancel = useRef({ cancel: false });
  const ref = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const total = motionDuration(spec);
  const [W, H] = MOTION_SIZES[spec.formato];

  useEffect(() => {
    const s = createClient();
    s.from("av_style_kits").select("id,name,data").order("updated_at", { ascending: false }).then(({ data }) => setKits((data as any) || []));
    s.from("design_projects").select("id,title,data").eq("kind", "marca").is("archived_at", null).order("updated_at", { ascending: false }).then(({ data }) => setBrands(((data as any) || []).map((b: any) => ({ id: b.id, name: b.data?.brief?.nome || b.title, data: b }))));
  }, []);
  useEffect(() => { loadFonts([spec.fontes.titulo, spec.fontes.texto, "Instrument Serif"].map((f) => f.replace(/\s+(Black|ExtraBold|Bold|SemiBold|Medium|Regular|Italic)$/i, ""))).then(() => draw(tRef.current)); }, [spec.fontes.titulo, spec.fontes.texto]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<MotionSpec>) => setDoc((d) => ({ ...d, spec: { ...d.spec, ...patch } }));
  const setCena = (i: number, patch: Partial<Cena>) => setDoc((d) => ({ ...d, spec: { ...d.spec, cenas: d.spec.cenas.map((c, j) => (j === i ? { ...c, ...patch } : c)) } }));
  const startOf = (i: number) => spec.cenas.slice(0, i).reduce((a, c) => a + c.dur, 0);

  /* ---------- prévia ---------- */
  const draw = useCallback((time: number) => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(c.width / W, c.height / H);
    drawMotion(ctx, spec, time, W, H);
  }, [spec, W, H]);
  useEffect(() => onImageLoad(() => draw(tRef.current)), [draw]);
  useEffect(() => {
    if (!playing || !total) { draw(tRef.current); return; }
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      tRef.current = (tRef.current + (now - last) / 1000) % total; last = now;
      setT(tRef.current); draw(tRef.current);
      const at = cenaAt(spec, tRef.current); if (at && at.i !== sel && !compact) setSel(at.i);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total, draw]); // eslint-disable-line react-hooks/exhaustive-deps
  const seek = (x: number) => { setPlaying(false); tRef.current = Math.max(0, Math.min(total - 0.01, x)); setT(tRef.current); draw(tRef.current); };

  /* ---------- visual ---------- */
  function aplicarKit(id: string) {
    const k = kits.find((x) => x.id === id);
    setDoc((d) => ({ ...d, kit_id: id || null, spec: k ? { ...d.spec, ...coresDoKit(k.data) } : d.spec }));
  }
  function aplicarMarca(id: string) {
    const b = brands.find((x) => x.id === id);
    if (!b) { setDoc((d) => ({ ...d, brand_id: null })); return; }
    const k = kitFrom(b.data);
    const C = k.colors as Record<string, string>;
    const fundo = C["Escuro"] || "#0C0C0D", texto = C["Claro"] || "#FFFFFF";
    setDoc((d) => ({ ...d, brand_id: id, account_id: b.data?.data?.perfil_id || d.account_id, spec: { ...d.spec,
      cores: { fundo, texto, destaque: C["Destaque"] || C["Primária"] || d.spec.cores.destaque, apoio: C["Apoio"] ? mix(fundo, C["Apoio"], 0.35) : mix(fundo, texto, 0.14) },
      fontes: { titulo: k.title || d.spec.fontes.titulo, texto: k.body || d.spec.fontes.texto },
      logo: k.logo || d.spec.logo,
      cenas: d.spec.cenas.map((c) => (c.tipo === "vinheta" && (!c.texto || c.texto === "VINCIT") ? { ...c, texto: k.name || c.texto } : c)) } }));
  }
  function modelo(id: string) {
    const m = MODELOS.find((x) => x.id === id)!;
    // fundo e transição vêm do modelo (ex.: sair da Transição não deixa o próximo transparente)
    const next = specDoModelo(id, { ritmo: spec.ritmo, grafismo: spec.grafismo, grao: spec.grao, fundo: spec.imagem ? "imagem" : undefined });
    setDoc((d) => ({ ...d, titulo: d.id ? d.titulo : m.nome, spec: { ...next, formato: d.spec.formato, cores: d.spec.cores, fontes: d.spec.fontes, logo: d.spec.logo, imagem: d.spec.imagem, handle: d.spec.handle } }));
    setSel(0); tRef.current = 0; setPlaying(true);
  }

  /* ---------- salvar e exportar ---------- */
  async function save(silent = false): Promise<MotionDoc | null> {
    const s = createClient();
    const row = { titulo: doc.titulo.trim() || "Motion sem nome", formato: spec.formato, spec, kit_id: doc.kit_id || null, brand_id: doc.brand_id || null, account_id: doc.account_id || null, content_id: doc.content_id || null, status: "pronto", updated_at: new Date().toISOString() };
    const r = doc.id ? await s.from("av_motions").update(row).eq("id", doc.id).select("id").single() : await s.from("av_motions").insert({ ...row, origem: doc.origem || "hub" }).select("id").single();
    if (r.error) { setMsg(`Não deu para salvar: ${r.error.message}`); return null; }
    const d = { ...doc, id: r.data.id };
    setDoc(d);
    if (!silent) setMsg("Motion salvo.");
    onSaved?.(d);
    return d;
  }
  async function exportar(tipo: "mp4" | "webm") {
    cancel.current.cancel = false;
    setBusy("Preparando…");
    try {
      const { exportMotion } = await import("@/lib/motion/export");
      const blob = await exportMotion(spec, { tipo, onProgress: (f) => setBusy(`Gerando o vídeo… ${Math.round(f * 100)}%`), signal: cancel.current });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${(doc.titulo || "motion").replace(/[^\w\-À-ú ]+/g, "").trim() || "motion"} ${spec.formato.replace(":", "x")}.${tipo}`;
      document.body.appendChild(a); a.click(); a.remove();
      setMsg(tipo === "webm" ? "WebM transparente baixado. Serve para pôr por cima do vídeo no CapCut, DaVinci ou Premiere." : "MP4 baixado.");
    } catch (e: any) { setMsg(e.message); }
    setBusy(null);
  }
  async function usar() {
    // sem salvar (ex.: sem internet) o motion entra no vídeo do mesmo jeito
    const d = (await save(true)) || doc;
    onUse?.(d);
  }

  const c = spec.cenas[sel];
  const campos = c ? CENA_CAMPOS[c.tipo] : {};
  const transp = spec.fundo === "transparente";
  const fontes = useMemo(() => Array.from(new Set([...FONTS, spec.fontes.titulo, spec.fontes.texto])), [spec.fontes]);

  return (
    <div className={`grid gap-3 ${compact ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-[260px_minmax(0,1fr)_340px]"}`}>
      {/* ---------- modelos e visual ---------- */}
      {!compact && (
        <aside className="card p-3 space-y-3 order-2 lg:order-1 min-w-0">
          <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Modelos</p>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {MODELOS.map((m) => (
              <button key={m.id} onClick={() => modelo(m.id)} className="text-left rounded-xl border border-line hover:border-mint-dim px-3 py-2">
                <p className="text-sm font-semibold">{m.nome}</p>
                <p className="text-[11px] text-fog leading-snug">{m.desc}</p>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* ---------- prévia ---------- */}
      <section className="card p-3 min-w-0 order-1 lg:order-2">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input value={doc.titulo} onChange={(e) => setDoc((d) => ({ ...d, titulo: e.target.value }))} className="input !w-auto flex-1 min-w-[160px] font-semibold" aria-label="Nome do motion" />
          <div className="flex rounded-xl border border-line overflow-hidden text-xs">
            {(["9:16", "16:9", "1:1"] as MotionFormat[]).map((f) => (
              <button key={f} onClick={() => set({ formato: f })} className={`px-2.5 py-2 font-semibold ${spec.formato === f ? "bg-mint/10 text-mint" : "text-fog"}`} title={MOTION_FORMAT_LABEL[f]}>{f}</button>
            ))}
          </div>
        </div>
        {compact && (
          <div className="flex flex-wrap gap-1 mb-2">
            {MODELOS.map((m) => <button key={m.id} onClick={() => modelo(m.id)} className="chip">{m.nome}</button>)}
          </div>
        )}
        <div className="flex justify-center rounded-xl p-2 bg-[repeating-conic-gradient(#1b1b1d_0_25%,#232326_0_50%)] [background-size:20px_20px]">
          <canvas ref={ref} width={W / 2} height={H / 2} className="rounded-lg shadow-lg" style={{ width: "100%", maxWidth: spec.formato === "9:16" ? 300 : spec.formato === "1:1" ? 420 : 640, height: "auto", aspectRatio: `${W}/${H}` }} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setPlaying((p) => !p)} className="w-9 h-9 grid place-items-center rounded-full bg-mint text-ink shrink-0" aria-label={playing ? "Pausar" : "Tocar"}>{playing ? <I.pause className="w-4 h-4" /> : <I.play className="w-4 h-4" />}</button>
          <input type="range" min={0} max={total || 1} step={0.01} value={t} onChange={(e) => seek(+e.target.value)} className="flex-1 accent-[var(--color-mint)]" aria-label="Tempo" />
          <span className="font-mono text-[11px] text-fog w-20 text-right">{t.toFixed(1)}/{total.toFixed(1)} s</span>
        </div>
        {/* linha das cenas */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
          {spec.cenas.map((k, i) => (
            <button key={k.id} onClick={() => { setSel(i); seek(startOf(i) + 0.05); }} style={{ flex: `${k.dur} 0 60px` }} className={`rounded-lg border px-2 py-1.5 text-left ${sel === i ? "border-mint text-mint" : "border-line text-fog"}`}>
              <p className="text-[11px] font-semibold truncate">{CENA_LABEL[k.tipo].split(" (")[0]}</p>
              <p className="font-mono text-[10px]">{k.dur.toFixed(1)} s</p>
            </button>
          ))}
          <select value="" onChange={(e) => { if (!e.target.value) return; const n = novaCena(e.target.value as CenaTipo); setDoc((d) => ({ ...d, spec: { ...d.spec, cenas: [...d.spec.cenas, n] } })); setSel(spec.cenas.length); }} className="input !w-auto !py-1 text-xs shrink-0" aria-label="Adicionar cena">
            <option value="">+ Cena</option>
            {CENA_TIPOS.map((k) => <option key={k} value={k}>{CENA_LABEL[k]}</option>)}
          </select>
        </div>
        {msg && <p className="text-sm text-mint mt-3">{msg}</p>}
        {busy && <div className="flex items-center gap-2 mt-3 text-sm"><span className="flex-1">{busy}</span><button onClick={() => { cancel.current.cancel = true; }} className="chip">Cancelar</button></div>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => save()} className="btn btn-ghost btn-sm">Salvar</button>
          <button disabled={!!busy || !total} onClick={() => exportar("mp4")} className="btn btn-ghost btn-sm"><I.download className="w-4 h-4" />MP4</button>
          <button disabled={!!busy || !total} onClick={() => exportar("webm")} className="btn btn-ghost btn-sm" title="Fundo transparente, para pôr por cima do vídeo em outro editor"><I.download className="w-4 h-4" />WebM transparente</button>
          {onUse && <button disabled={!total} onClick={usar} className="btn btn-mint btn-sm ml-auto"><I.video className="w-4 h-4" />{useLabel}</button>}
        </div>
        {transp && <p className="text-[11px] text-fog mt-2">Fundo transparente: no Editor ele entra por cima do vídeo. O MP4 sai com fundo preto; para outro editor, use o WebM.</p>}
      </section>

      {/* ---------- cena e visual ---------- */}
      <aside className="card p-3 space-y-4 order-3 min-w-0">
        {c ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Cena {sel + 1}</p>
              <div className="flex gap-1">
                <button onClick={() => { if (sel === 0) return; setDoc((d) => { const a = [...d.spec.cenas]; [a[sel - 1], a[sel]] = [a[sel], a[sel - 1]]; return { ...d, spec: { ...d.spec, cenas: a } }; }); setSel(sel - 1); }} className="chip" aria-label="Mover para antes">←</button>
                <button onClick={() => { if (sel >= spec.cenas.length - 1) return; setDoc((d) => { const a = [...d.spec.cenas]; [a[sel + 1], a[sel]] = [a[sel], a[sel + 1]]; return { ...d, spec: { ...d.spec, cenas: a } }; }); setSel(sel + 1); }} className="chip" aria-label="Mover para depois">→</button>
                <button onClick={() => { setDoc((d) => ({ ...d, spec: { ...d.spec, cenas: d.spec.cenas.filter((_, j) => j !== sel) } })); setSel(Math.max(0, sel - 1)); }} className="chip text-red-400">Tirar</button>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <select value={c.tipo} onChange={(e) => setCena(sel, { tipo: e.target.value as CenaTipo })} className="input !py-1.5 text-sm">
                {CENA_TIPOS.map((k) => <option key={k} value={k}>{CENA_LABEL[k]}</option>)}
              </select>
              <label className="flex items-center gap-1 text-xs text-fog"><input type="number" min={0.4} max={20} step={0.1} value={c.dur} onChange={(e) => setCena(sel, { dur: Math.max(0.4, +e.target.value || 0.4) })} className="input !py-1.5 !px-2 text-sm" aria-label="Duração em segundos" />s</label>
            </div>
            {campos.texto && <Field label={campos.texto}><textarea rows={2} value={c.texto || ""} onChange={(e) => setCena(sel, { texto: e.target.value })} className="input text-sm" /></Field>}
            {campos.sub && <Field label={campos.sub}><input value={c.sub || ""} onChange={(e) => setCena(sel, { sub: e.target.value })} className="input text-sm" /></Field>}
            {campos.itens && <Field label={campos.itens}><textarea rows={4} value={(c.itens || []).join("\n")} onChange={(e) => setCena(sel, { itens: e.target.value.split("\n") })} className="input text-sm font-mono" /></Field>}
            {campos.valor && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Antes"><input value={c.prefixo || ""} onChange={(e) => setCena(sel, { prefixo: e.target.value })} className="input text-sm" placeholder="R$" /></Field>
                <Field label="Número"><input type="number" value={c.valor ?? ""} onChange={(e) => setCena(sel, { valor: e.target.value === "" ? undefined : +e.target.value })} className="input text-sm" /></Field>
                <Field label="Depois"><input value={c.sufixo || ""} onChange={(e) => setCena(sel, { sufixo: e.target.value })} className="input text-sm" placeholder="%" /></Field>
              </div>
            )}
            <Field label="Fundo desta cena">
              <select value={c.fundo || ""} onChange={(e) => setCena(sel, { fundo: (e.target.value || undefined) as Fundo | undefined })} className="input !py-1.5 text-sm">
                <option value="">Igual ao motion</option>
                {(Object.keys(FUNDO_LABEL) as Fundo[]).map((f) => <option key={f} value={f}>{FUNDO_LABEL[f]}</option>)}
              </select>
            </Field>
          </div>
        ) : <p className="text-sm text-fog">Escolha um modelo ou adicione uma cena.</p>}

        <div className="space-y-2 border-t border-line pt-3">
          <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Visual</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kit de estilo">
              <select value={doc.kit_id || ""} onChange={(e) => aplicarKit(e.target.value)} className="input !py-1.5 text-sm">
                <option value="">—</option>
                {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </Field>
            <Field label="Marca do Design">
              <select value={doc.brand_id || ""} onChange={(e) => aplicarMarca(e.target.value)} className="input !py-1.5 text-sm">
                <option value="">—</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["fundo", "texto", "destaque", "apoio"] as const).map((k) => (
              <label key={k} className="text-[11px] text-fog capitalize">{k}<input type="color" value={spec.cores[k]} onChange={(e) => set({ cores: { ...spec.cores, [k]: e.target.value } })} className="block w-full h-8 rounded-lg border border-line bg-transparent mt-1" /></label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Letra do título"><select value={spec.fontes.titulo} onChange={(e) => set({ fontes: { ...spec.fontes, titulo: e.target.value } })} className="input !py-1.5 text-sm">{fontes.map((f) => <option key={f}>{f}</option>)}</select></Field>
            <Field label="Letra do texto"><select value={spec.fontes.texto} onChange={(e) => set({ fontes: { ...spec.fontes, texto: e.target.value } })} className="input !py-1.5 text-sm">{fontes.map((f) => <option key={f}>{f}</option>)}</select></Field>
            <Field label="Fundo"><select value={spec.fundo} onChange={(e) => set({ fundo: e.target.value as Fundo })} className="input !py-1.5 text-sm">{(Object.keys(FUNDO_LABEL) as Fundo[]).map((f) => <option key={f} value={f}>{FUNDO_LABEL[f]}</option>)}</select></Field>
            <Field label="Transição"><select value={spec.transicao} onChange={(e) => set({ transicao: e.target.value as Transicao })} className="input !py-1.5 text-sm">{(Object.keys(TRANSICAO_LABEL) as Transicao[]).map((f) => <option key={f} value={f}>{TRANSICAO_LABEL[f]}</option>)}</select></Field>
            <Field label="Ritmo"><select value={spec.ritmo} onChange={(e) => set({ ritmo: e.target.value as Ritmo })} className="input !py-1.5 text-sm"><option value="calmo">Calmo</option><option value="normal">Normal</option><option value="rapido">Rápido</option></select></Field>
            <Field label="@ ou site"><input value={spec.handle || ""} onChange={(e) => set({ handle: e.target.value || undefined })} className="input !py-1.5 text-sm" placeholder="@perfil" /></Field>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!spec.grafismo} onChange={(e) => set({ grafismo: e.target.checked })} />Linhas no fundo</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!spec.grao} onChange={(e) => set({ grao: e.target.checked })} />Grão de filme</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <UploadBtn label={spec.logo ? "Trocar logo" : "Logo (PNG/SVG)"} accept="image/png,image/svg+xml,image/webp" onFile={async (f) => set({ logo: await fileToDataUrl(f, 1200, true) })} onClear={spec.logo ? () => set({ logo: undefined }) : undefined} />
            <UploadBtn label={spec.imagem ? "Trocar imagem" : "Imagem de fundo"} accept="image/*" onFile={async (f) => set({ imagem: await fileToDataUrl(f), fundo: "imagem" })} onClear={spec.imagem ? () => set({ imagem: undefined, fundo: spec.fundo === "imagem" ? "gradiente" : spec.fundo }) : undefined} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[11px] text-fog mb-1">{label}</span>{children}</label>;
}
function UploadBtn({ label, accept, onFile, onClear }: { label: string; accept: string; onFile: (f: File) => void; onClear?: () => void }) {
  return (
    <div className="flex gap-1">
      <label className="flex-1 chip justify-center cursor-pointer text-center"><input type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} /><I.plus className="w-3 h-3" />{label}</label>
      {onClear && <button onClick={onClear} className="chip text-red-400" aria-label="Tirar">×</button>}
    </div>
  );
}
