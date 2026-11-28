"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ctx, SlideDef } from "./Presentation";
import { useLite, useNear } from "./lazy";

/* Páginas da apresentação como imagens prontas.
   No computador, o HUB fotografa cada slide (o mesmo motor do vídeo) e guarda dois JPEGs por página
   no Storage: um grande (1600 px, tela cheia e PDF) e um leve (800 px, lista no celular). O link
   público e o celular só mostram essas imagens, sem montar os slides de código: é o que evitava o
   iPhone recarregar a página ("Um problema ocorreu repetidamente") nos mockups. */

export type Paginas = { sig: string; format: string; w: number; h: number; urls: string[]; thumbs: string[]; at: string };

const IGNORA = new Set(["paginas", "entrega"]);
/** assinatura do conteúdo: muda quando qualquer coisa que aparece nos slides muda */
export function deckSig(d: any, format: string, mockups: unknown[] = []) {
  const json = JSON.stringify([format, Object.keys(d || {}).filter((k) => !IGNORA.has(k)).sort().map((k) => [k, d[k]]), mockups]);
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) { h ^= json.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + json.length.toString(36);
}

async function shrinkBlob(b: Blob, w: number) {
  const bmp = await createImageBitmap(b);
  const c = document.createElement("canvas"); c.width = w; c.height = Math.round((bmp.height * w) / bmp.width);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return new Promise<Blob>((r) => c.toBlob((o) => r(o!), "image/jpeg", .82));
}

/** fotografa os slides, sobe para o Storage e devolve o registro para gravar em data.paginas */
export async function gerarPaginas(id: string, x: Ctx, slides: SlideDef[], sig: string, format: string, onProg: (f: number) => void, stop: () => boolean, antigas?: Paginas | null): Promise<Paginas | null> {
  const { rasterize } = await import("./Motion");
  const shots = await rasterize(x, slides.map((s, n) => ({ s, n })), slides.length, 1600, (f) => onProg(f * .8), stop);
  if (stop() || shots.some((b) => !b.size)) return null;
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const dir = `${user?.id || "anon"}/design/paginas/${id}`;
  const urls: string[] = [], thumbs: string[] = [];
  for (let i = 0; i < shots.length; i++) {
    if (stop()) return null;
    const n = String(i + 1).padStart(2, "0");
    const small = await shrinkBlob(shots[i], 800);
    for (const [path, blob, list] of [[`${dir}/${sig}-${n}.jpg`, shots[i], urls], [`${dir}/${sig}-${n}-p.jpg`, small, thumbs]] as const) {
      const { error } = await s.storage.from("midia").upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
      if (error) throw error;
      list.push(s.storage.from("midia").getPublicUrl(path).data.publicUrl);
    }
    onProg(.8 + (.2 * (i + 1)) / shots.length);
  }
  // as imagens da versão anterior são só um cache das páginas: saem quando a nova fica pronta
  if (antigas?.urls?.length && antigas.sig !== sig) {
    const velhas = [...antigas.urls, ...(antigas.thumbs || [])].map((u) => decodeURIComponent(u.split("/object/public/midia/")[1] || "")).filter((p) => p.startsWith(dir + "/"));
    if (velhas.length) await s.storage.from("midia").remove(velhas).catch(() => null);
  }
  return { sig, format, w: x.W, h: x.H, urls, thumbs, at: new Date().toISOString() };
}

/** no Manual: mantém as imagens em dia sozinho (só no computador) e mostra o estado */
export function PaginasStatus({ id, d, set, x, slides, format, mockups }: { id: string; d: any; set: (p: any) => void; x: Ctx; slides: SlideDef[]; format: string; mockups: unknown[] | null }) {
  const lite = useLite();
  const pg: Paginas | null = d.paginas || null;
  const sig = useMemo(() => (mockups ? deckSig(d, format, mockups) : ""), [d, format, mockups]);
  const emDia = !!pg && pg.sig === sig && pg.urls?.length === slides.length;
  const [prog, setProg] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const run = useRef(0);

  async function gerar() {
    if (!sig) return;
    const me = ++run.current;
    setErr(""); setProg(0);
    try {
      const novo = await gerarPaginas(id, x, slides, sig, format, (f) => me === run.current && setProg(f), () => me !== run.current, pg);
      if (novo && me === run.current) set({ paginas: novo });
    } catch (e: any) { if (me === run.current) setErr(e?.message || "Não deu para gerar as imagens."); }
    if (me === run.current) setProg(null);
  }
  // no computador, refaz sozinho alguns segundos depois da última mudança
  useEffect(() => {
    if (lite || !sig || emDia) return;
    const t = setTimeout(gerar, 6000);
    return () => clearTimeout(t);
  }, [sig, lite, emDia]); // eslint-disable-line
  useEffect(() => () => { run.current++; }, []);

  return (
    <p className="text-[11px] text-fog leading-relaxed">
      {prog !== null ? <>Preparando as páginas para o celular e o link… {Math.round(prog * 100)}%</>
        : emDia ? <>Páginas prontas para o celular e o link do cliente ({pg!.urls.length} imagens).</>
        : lite ? <>As páginas para o celular são preparadas quando você abre esta etapa no computador.</>
        : <>As páginas para o celular e o link vão ser atualizadas em instantes.</>}
      {err && <span className="text-danger"> {err}</span>}
      {!lite && prog === null && <> <button onClick={gerar} className="underline hover:text-paper">{emDia ? "Refazer" : "Preparar agora"}</button></>}
    </p>
  );
}

/** lista de páginas em imagem: só carrega as que estão perto da tela */
export function PaginasLista({ pg, onOpen }: { pg: Paginas; onOpen: (i: number) => void }) {
  const lite = useLite();
  return (
    <div className="max-w-5xl mx-auto px-3 md:px-8 space-y-3 md:space-y-6">
      {pg.urls.map((u, i) => <Pagina key={u} src={lite ? pg.thumbs?.[i] || u : u} ratio={pg.h / pg.w} n={i + 1} onOpen={() => onOpen(i)} />)}
    </div>
  );
}

function Pagina({ src, ratio, n, onOpen }: { src: string; ratio: number; n: number; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const near = useNear(ref, "60% 0px");
  return (
    <button ref={ref} onClick={onOpen} className="block w-full relative overflow-hidden rounded-lg bg-panel2 shadow-xl cursor-zoom-in" style={{ paddingTop: `${ratio * 100}%` }} aria-label={`Abrir página ${n}`}>
      {near && <img src={src} alt={`Página ${n}`} decoding="async" className="absolute inset-0 w-full h-full object-cover" />}
    </button>
  );
}
