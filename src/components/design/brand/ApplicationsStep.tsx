"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { shrink, uid } from "@/lib/design";
import Mockups from "./Mockups";
import { PhotoScene, SCENES, Scene, SceneStyle, sceneKit, type Foto } from "./Scenes";
import { ARTS, CATS, MockupStage, useMockups } from "./MockupView";
import type { StepProps } from "./types";

/* mockups-design.com: licença permite uso comercial e para clientes, sem crédito; só não pode redistribuir os PSD */
const MOCKUPS = [
  ["Cartões de visita", "free-business-card-mockups"], ["Papelaria", "free-stationery-mockups"], ["Embalagem", "packaging-mockups"],
  ["Sacolas", "free-bags-mockups"], ["Canecas", "free-mugs-mockups"], ["Vestuário", "apparel"], ["Etiquetas", "label-tags-2"],
  ["Fachada e placas", "free-signage-mockups"], ["Urbanos", "urban-mockups"], ["Pôsteres", "free-poster-mockups"], ["Logo", "free-logo-mockups"], ["Telas", "free-devices-mockups"],
];
/* fotos grátis (licença Pexels: uso comercial liberado, sem crédito) para colocar o logo em cima */
const PEXELS = [["Parede lisa", "parede lisa"], ["Fachada de loja", "fachada de loja"], ["Escritório", "escritório criativo"], ["Estúdio de filmagem", "estúdio de filmagem"], ["Camiseta no cabide", "camiseta cabide"], ["Sacola de papel", "sacola de papel"], ["Copo de café", "copo de café"], ["Outdoor", "outdoor cidade"]];
const W = 1600, H = 900;

/** desenha a cena em 1600×900 e escala para a largura disponível */
function Fit({ children, w = W, h = H }: { children: ReactNode; w?: number; h?: number }) {
  const ref = useRef<HTMLDivElement>(null); const [k, setK] = useState(.3);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / w)); ro.observe(el); setK(el.clientWidth / w);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-lg" style={{ height: h * k }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${k})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

export default function ApplicationsStep({ d, set, go }: StepProps) {
  const kit = sceneKit(d);
  const cenas: string[] = Array.isArray(d.cenas) ? d.cenas : [];
  const lib = useMockups();
  const chosen: string[] = Array.isArray(d.mockups) ? d.mockups : (lib || []).slice(0, 12).map((m) => m.id);
  const arts: Record<string, string[]> = d.mockup_arts || {};
  const [cat, setCat] = useState("");
  const toggleMk = (id: string) => set({ mockups: chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id] });
  const setArt = (id: string, i: number, a: string, n: number) => { const cur = arts[id] || []; const next = Array.from({ length: n }, (_, j) => (j === i ? a : cur[j] || "")); set({ mockup_arts: { ...arts, [id]: next } }); };
  const fotos: Foto[] = d.fotos || [];
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const toggle = (k: string) => set({ cenas: cenas.includes(k) ? cenas.filter((c) => c !== k) : SCENES.map((c) => c.k).filter((c) => c === k || cenas.includes(c)) });
  const F = (id: string, p: Partial<Foto>) => set({ fotos: fotos.map((f) => (f.id === id ? { ...f, ...p } : f)) });
  const add = (u: string) => set({ fotos: [...fotos, { id: uid(), url: u, pos: "centro", tam: 32, cor: "claro", impresso: true, rot: 0 }] });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    const novas: Foto[] = [];
    for (const file of Array.from(files).slice(0, 8 - fotos.length)) {
      const data = await shrink(file, 1800, .84);
      const blob = await (await fetch(data)).blob();
      const path = `${user?.id || "anon"}/design/fotos/${uid()}.jpg`;
      const { error } = await s.storage.from("midia").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) { setErr(error.message); continue; }
      novas.push({ id: uid(), url: s.storage.from("midia").getPublicUrl(path).data.publicUrl, pos: "centro", tam: 32, cor: "claro", impresso: true, rot: 0 });
    }
    if (novas.length) set({ fotos: [...fotos, ...novas] });
    setBusy(false);
  }

  const seg = d.brief?.segmento || d.strategy?.nicho || "";
  return (
    <div className="space-y-6">
      <SceneStyle />
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-semibold">Mockups fotográficos</p>
            <p className="text-xs text-fog">Fotos profissionais (PSD grátis do mockups-design.com) com o logo, as cores e o grafismo da marca aplicados em perspectiva, com a luz, o papel e a sombra da foto. Cada um marcado vira uma página do manual. Escolha a arte de cada área nos botões.</p>
          </div>
          <a href="/design/mockups" className="btn btn-ghost !py-1.5 text-sm">Biblioteca e importar ↗</a>
        </div>
        {lib === null ? <div className="card h-40 animate-pulse" /> : !lib.length ? <p className="text-sm text-fog card p-6 text-center">Nenhum mockup na biblioteca ainda.</p> : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setCat("")} className={`chip ${!cat ? "!border-mint text-mint" : ""}`}>Todos · {lib.length}</button>
              {Array.from(new Set(lib.map((m) => m.category))).map((c) => <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? "!border-mint text-mint" : ""}`}>{CATS[c] || c}</button>)}
              <span className="text-[11px] text-fog self-center ml-auto">{chosen.length} no manual</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lib.filter((m) => !cat || m.category === cat).map((m) => {
                const on = chosen.includes(m.id);
                return (
                  <div key={m.id} className={`rounded-xl border p-2 transition-colors ${on ? "border-mint" : "border-line"}`}>
                    <button onClick={() => toggleMk(m.id)} className="block w-full text-left"><Fit w={m.width} h={m.height}><MockupStage d={d} m={m} arts={arts[m.id]} /></Fit></button>
                    <div className="flex items-center justify-between px-1 pt-2 gap-2">
                      <span className="text-sm font-semibold truncate">{m.title}</span>
                      <button onClick={() => toggleMk(m.id)} className={`text-[11px] font-mono shrink-0 ${on ? "text-mint" : "text-fog"}`}>{on ? "no manual" : "fora"}</button>
                    </div>
                    {m.slots.map((sl, i) => (
                      <div key={i} className="flex flex-wrap gap-1 px-1 pt-1.5">
                        {m.slots.length > 1 && <span className="text-[10px] text-fog self-center mr-1">{sl.name}</span>}
                        {ARTS.map((a) => { const cur = (arts[m.id] || [])[i] || sl.art || "claro"; return <button key={a.k} onClick={() => setArt(m.id, i, a.k, m.slots.length)} className={`chip !text-[10px] !px-1.5 !py-0 ${cur === a.k ? "!border-mint text-mint" : ""}`}>{a.l}</button>; })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold text-sm">Cenas desenhadas (simples, sem foto)</summary>
      <section className="space-y-3 mt-3">
        <div>
          <p className="font-semibold">Objetos em cena</p>
          <p className="text-xs text-fog">Cada cena vira uma página do manual, montada com o logo, as cores e o grafismo da marca. O cartão e o símbolo em 3D giram na tela e saem parados no PDF. Toque para tirar ou pôr no manual.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENES.map((c) => {
            const on = cenas.includes(c.k);
            return (
              <button key={c.k} onClick={() => toggle(c.k)} className={`text-left rounded-xl border p-2 transition-colors ${on ? "border-mint" : "border-line opacity-60 hover:opacity-100"}`}>
                <Fit><Scene d={d} k={c.k} W={W} H={H} kit={kit} /></Fit>
                <div className="flex items-center justify-between px-1 pt-2">
                  <span><span className="text-sm font-semibold">{c.l}</span><span className="block text-[11px] text-fog">{c.d}</span></span>
                  <span className={`text-[11px] font-mono ${on ? "text-mint" : "text-fog"}`}>{on ? "no manual" : "fora"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      </details>

      <section className="card p-4 space-y-3">
        <div>
          <p className="font-semibold">Logo em fotos reais</p>
          <p className="text-xs text-fog">Envie fotos suas (sede, estúdio, equipe, produto) ou cole o link de uma foto do Pexels. O logo entra por cima e cada foto vira uma página do manual. Com “impresso”, ele se mistura à textura da foto, como se estivesse pintado ou gravado.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className={`btn btn-mint !py-1.5 text-sm cursor-pointer ${busy || fotos.length >= 8 ? "opacity-50 pointer-events-none" : ""}`}>
            {busy ? "Enviando…" : "Enviar fotos"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ou cole o link da imagem (images.pexels.com/…)" className="input flex-1 min-w-56 !py-1.5 text-sm" />
          <button onClick={() => { if (/^https:\/\//.test(url)) { add(url.trim()); setUrl(""); } }} disabled={!/^https:\/\//.test(url) || fotos.length >= 8} className="btn btn-ghost !py-1.5 text-sm">Usar link</button>
          <span className="text-[11px] text-fog">{fotos.length}/8</span>
        </div>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-fog self-center mr-1">Fotos grátis no Pexels:</span>
          {[...(seg ? [[seg, seg]] : []), ...PEXELS].map(([l, q]) => <a key={l} href={`https://www.pexels.com/pt-br/procurar/${encodeURIComponent(q)}/`} target="_blank" rel="noreferrer" className="chip hover:border-mint">{l} ↗</a>)}
        </div>
        <p className="text-[11px] text-fog">No Pexels, abra a foto, clique com o botão direito nela e copie o endereço da imagem. Licença livre para uso comercial, sem precisar dar crédito.</p>
        {!!fotos.length && (
          <div className="grid md:grid-cols-2 gap-4">
            {fotos.map((f) => (
              <div key={f.id} className="space-y-2">
                <Fit><PhotoScene k={kit} f={f} W={W} H={H} /></Fit>
                <div className="flex flex-wrap gap-1.5 items-center text-xs">
                  {([["te", "↖"], ["td", "↗"], ["centro", "•"], ["be", "↙"], ["bd", "↘"]] as const).map(([p, l]) => <button key={p} onClick={() => F(f.id, { pos: p })} className={`chip ${f.pos === p ? "!border-mint text-mint" : ""}`}>{l}</button>)}
                  <span className="w-px h-4 bg-line mx-1" />
                  {([["claro", "Branco"], ["escuro", "Escuro"], ["primaria", "Primária"]] as const).map(([c, l]) => <button key={c} onClick={() => F(f.id, { cor: c })} className={`chip ${f.cor === c ? "!border-mint text-mint" : ""}`}>{l}</button>)}
                  <button onClick={() => F(f.id, { impresso: !f.impresso })} className={`chip ${f.impresso ? "!border-mint text-mint" : ""}`}>Impresso</button>
                </div>
                <div className="flex flex-wrap gap-3 items-center text-xs text-fog">
                  <label className="flex items-center gap-2">Tamanho <input type="range" min={8} max={80} value={f.tam || 32} onChange={(e) => F(f.id, { tam: +e.target.value })} /></label>
                  <label className="flex items-center gap-2">Giro <input type="range" min={-25} max={25} value={f.rot || 0} onChange={(e) => F(f.id, { rot: +e.target.value })} /></label>
                  <input value={f.legenda || ""} onChange={(e) => F(f.id, { legenda: e.target.value })} placeholder="Legenda (ex.: Fachada · sede)" className="input flex-1 min-w-40 !py-1 text-xs" />
                  <button onClick={() => set({ fotos: fotos.filter((x) => x.id !== f.id) })} className="text-fog hover:text-danger">Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Peças do dia a dia</p>
        <Mockups d={d} />
      </section>

      <div className="card p-4 space-y-2">
        <p className="font-semibold text-sm">Mockups fotográficos (PSD e Canva)</p>
        <p className="text-xs text-fog">Para um objeto que não está aqui: baixe o logo em PNG ou SVG na etapa Apresentação e cole no objeto inteligente do PSD, ou use o editor online do site (sem Photoshop). Uso comercial e para clientes liberado, sem crédito; só não pode repassar os arquivos PSD. No Canva, os Mockups aplicam a imagem em celular, caneca, camiseta e outros objetos com um clique.</p>
        <div className="flex flex-wrap gap-1.5">
          {MOCKUPS.map(([l, slug]) => <a key={slug} href={`https://mockups-design.com/${slug}/`} target="_blank" rel="noreferrer" className="chip hover:border-mint">{l} ↗</a>)}
          <a href="https://www.canva.com/mockups/" target="_blank" rel="noreferrer" className="chip hover:border-mint">Canva Mockups ↗</a>
        </div>
      </div>
      <p className="text-xs text-fog">As cenas usam a assinatura principal, o símbolo, a paleta, as fontes e o grafismo. Se algo não funcionar aqui, ajuste em <button onClick={() => go("logotipo")} className="text-mint">Logotipo</button>, <button onClick={() => go("cores")} className="text-mint">Cores</button> ou <button onClick={() => go("grafismos")} className="text-mint">Grafismos</button>.</p>
    </div>
  );
}
