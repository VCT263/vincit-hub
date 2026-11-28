"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { aiFetch } from "@/lib/aiFetch";
import { apagarComLixeira } from "@/lib/lixeira";
import {
  CONTROLES, ESTILOS, ZERO, analisar, aplicar, autoCorrecao, combinar, estiloDaReferencia, gerarCube, lerImagem,
  type Ajustes, type Analise, type Estilo,
} from "@/lib/foto/engine";

/* Editor de fotos do Audiovisual (28/11). Editor genérico, como o Editor de vídeo e o Motion:
   correção automática + catálogo de estilos com prévia + ajustes básicos (luz, contraste, sombras, cor).
   Tudo roda no navegador, sem custo. O Claude (pela fila) olha a foto e escolhe estilo e ajustes. */

type Estado = { auto: boolean; estilo: string; intensidade: number; finos: Partial<Ajustes>; manterCor: boolean };
type Foto = {
  key: string; nome: string; img: HTMLImageElement; base: ImageData; mini: ImageData; analise: Analise; autoAj: Partial<Ajustes>;
  estado: Estado; dbId?: string; originalUrl?: string; resultadoUrl?: string; sugestao?: any;
};
type Linha = { id: string; tipo: "foto" | "estilo"; titulo: string; original_url: string | null; resultado_url: string | null; spec: any; updated_at: string };

const ESTADO0: Estado = { auto: true, estilo: "natural", intensidade: 100, finos: {}, manterCor: false };
const uid = () => Math.random().toString(36).slice(2, 10);
const PREVIA = 1100, MINI = 150, SAIDA = 3000;

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => erro(new Error("Não consegui abrir a imagem.")); i.src = src; });
}
function render(base: ImageData, a: Ajustes, manterCor: boolean) {
  const out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  aplicar(out, a, { manterCor });
  return out;
}
function paraBlob(img: ImageData, q = 0.9): Promise<Blob> {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  c.getContext("2d")!.putImageData(img, 0, 0);
  return new Promise((ok) => c.toBlob((b) => ok(b!), "image/jpeg", q));
}
function baixar(blob: Blob, nome: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const semExt = (n: string) => n.replace(/\.[a-z0-9]+$/i, "");

export default function FotosPage() {
  return <Suspense><Fotos /></Suspense>;
}

function Fotos() {
  const q = useSearchParams();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [atual, setAtual] = useState(0);
  const [aba, setAba] = useState<"estilos" | "ajustes" | "referencia" | "claude">("estilos");
  const [antes, setAntes] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [conta, setConta] = useState("");
  const [pedido, setPedido] = useState("");
  const [nomeEstilo, setNomeEstilo] = useState("");
  const [refEstilo, setRefEstilo] = useState<Estilo | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const inputFotos = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const foto = fotos[atual] as Foto | undefined;
  const estado = foto?.estado || ESTADO0;

  const load = useCallback(async () => {
    const { data } = await createClient().from("av_fotos").select("id,tipo,titulo,original_url,resultado_url,spec,updated_at").order("updated_at", { ascending: false }).limit(80);
    setLinhas((data as any) || []);
    return (data as Linha[]) || [];
  }, []);
  useEffect(() => {
    load().then((l) => { const id = q.get("id"); const r = id && l.find((x) => x.id === id); if (r) abrirSalva(r); });
    createClient().from("ig_accounts").select("id,username").order("username").then(({ data }) => setAccounts((data as any) || []));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvos: Estilo[] = useMemo(() => (linhas || []).filter((l) => l.tipo === "estilo").map((l) => ({ id: l.id, nome: l.titulo, desc: "Estilo salvo", ajustes: l.spec?.ajustes || {}, mexeCor: !l.spec?.manterCor })), [linhas]);
  const catalogo = useMemo(() => [...ESTILOS, ...(refEstilo ? [refEstilo] : []), ...salvos], [salvos, refEstilo]);
  const estiloDe = useCallback((id: string) => catalogo.find((e) => e.id === id) || ESTILOS[0], [catalogo]);
  const final = useCallback((f: Foto, e: Estado = f.estado) => combinar(e.auto ? f.autoAj : null, estiloDe(e.estilo).ajustes, e.intensidade, e.finos), [estiloDe]);

  // prévia grande: redesenha no próximo quadro quando algo muda
  const raf = useRef(0);
  useEffect(() => {
    if (!foto || !canvas.current) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const c = canvas.current!; c.width = foto.base.width; c.height = foto.base.height;
      c.getContext("2d")!.putImageData(antes ? foto.base : render(foto.base, final(foto), estado.manterCor), 0, 0);
    });
  }, [foto, estado, antes, final]);

  // miniaturas do catálogo na própria foto
  const thumbs = useMemo(() => {
    if (!foto) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    const c = document.createElement("canvas"); c.width = foto.mini.width; c.height = foto.mini.height;
    const x = c.getContext("2d")!;
    for (const e of catalogo) {
      x.putImageData(render(foto.mini, combinar(estado.auto ? foto.autoAj : null, e.ajustes, 100, {}), estado.manterCor), 0, 0);
      out[e.id] = c.toDataURL("image/jpeg", 0.8);
    }
    return out;
  }, [foto?.key, catalogo, estado.auto, estado.manterCor]); // eslint-disable-line react-hooks/exhaustive-deps

  function mudar(p: Partial<Estado>) {
    setFotos((fs) => fs.map((f, i) => (i === atual ? { ...f, estado: { ...f.estado, ...p } } : f)));
  }
  function fino(k: keyof Ajustes, v: number) { mudar({ finos: { ...estado.finos, [k]: v } }); }

  async function prepara(img: HTMLImageElement, nome: string, extra: Partial<Foto> = {}): Promise<Foto> {
    const base = lerImagem(img, PREVIA), mini = lerImagem(img, MINI);
    const analise = analisar(base.data);
    return { key: uid(), nome, img, base, mini, analise, autoAj: autoCorrecao(analise), estado: { ...ESTADO0 }, ...extra };
  }
  async function adicionar(files: FileList | null) {
    if (!files?.length) return;
    setOcupado("Abrindo as fotos…");
    const novas: Foto[] = [];
    for (const f of Array.from(files).slice(0, 30)) {
      if (!f.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(f);
      try { novas.push(await prepara(await carregar(url), semExt(f.name))); } catch { setMsg(`Não abri ${f.name}. Use JPG, PNG ou WEBP (HEIC do iPhone: exporte como JPG).`); }
    }
    // mesma edição da foto aberta para as novas, como num lote
    const base = foto?.estado;
    setFotos((fs) => { const n = [...fs, ...novas.map((x) => (base ? { ...x, estado: { ...base } } : x))]; setAtual(fs.length); return n; });
    setOcupado(null);
  }
  async function abrirSalva(l: Linha) {
    if (!l.original_url) return;
    setOcupado("Abrindo…");
    try {
      const f = await prepara(await carregar(l.original_url), l.titulo, { dbId: l.id, originalUrl: l.original_url, resultadoUrl: l.resultado_url || undefined, sugestao: l.spec?.sugestao });
      f.estado = { ...ESTADO0, ...(l.spec?.estado || {}) };
      setFotos((fs) => { const i = fs.findIndex((x) => x.dbId === l.id); if (i >= 0) { setAtual(i); return fs; } setAtual(fs.length); return [...fs, f]; });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { setMsg(e.message); }
    setOcupado(null);
  }

  async function subir(blob: Blob, nome: string) {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    const path = `${user?.id || "anon"}/fotos/${nome}-${uid()}.jpg`;
    const { error } = await s.storage.from("midia").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    return s.storage.from("midia").getPublicUrl(path).data.publicUrl;
  }
  /** guarda a original (se ainda não estiver no HUB) e cria a linha da foto */
  async function garantirSalva(f: Foto): Promise<Foto> {
    if (f.dbId && f.originalUrl) return f;
    const orig = lerImagem(f.img, SAIDA);
    const originalUrl = f.originalUrl || await subir(await paraBlob(orig, 0.92), "original");
    const { data, error } = await createClient().from("av_fotos").insert({ tipo: "foto", titulo: f.nome.slice(0, 80) || "Foto", original_url: originalUrl, account_id: conta || null, spec: { estado: f.estado } }).select("id").single();
    if (error) throw new Error(error.message);
    const g = { ...f, dbId: data.id, originalUrl };
    setFotos((fs) => fs.map((x) => (x.key === f.key ? { ...x, dbId: g.dbId, originalUrl } : x)));
    return g;
  }
  async function renderSaida(f: Foto) {
    return paraBlob(render(lerImagem(f.img, SAIDA), final(f), f.estado.manterCor), 0.92);
  }
  async function salvar(fs: Foto[]) {
    setOcupado(fs.length > 1 ? `Salvando ${fs.length} fotos…` : "Salvando…");
    try {
      for (const f0 of fs) {
        const f = await garantirSalva(f0);
        const url = await subir(await renderSaida(f), "editada");
        await createClient().from("av_fotos").update({ resultado_url: url, spec: { estado: f.estado, sugestao: f.sugestao || null }, updated_at: new Date().toISOString() }).eq("id", f.dbId!);
        setFotos((xs) => xs.map((x) => (x.key === f.key ? { ...x, resultadoUrl: url } : x)));
      }
      setMsg(fs.length > 1 ? `${fs.length} fotos salvas em "Minhas fotos".` : "Foto salva em \"Minhas fotos\".");
      load();
    } catch (e: any) { setMsg(`Não salvou: ${e.message}`); }
    setOcupado(null);
  }
  async function baixarFotos(fs: Foto[]) {
    setOcupado(fs.length > 1 ? `Preparando ${fs.length} fotos…` : "Preparando…");
    for (const f of fs) { baixar(await renderSaida(f), `${f.nome || "foto"}-editada.jpg`); await new Promise((r) => setTimeout(r, 350)); }
    setOcupado(null);
  }
  function aplicarATodas() {
    if (!foto) return;
    setFotos((fs) => fs.map((f) => ({ ...f, estado: { ...foto.estado, finos: { ...foto.estado.finos } } })));
    setMsg(`Mesma edição em ${fotos.length} fotos. A correção automática continua lendo cada foto.`);
  }
  function lookAtual(): Partial<Ajustes> {
    // estilo × intensidade + finos, sem a correção automática (ela é de cada foto)
    const a = combinar(null, estiloDe(estado.estilo).ajustes, estado.intensidade, estado.finos);
    const out: Partial<Ajustes> = {};
    (Object.keys(a) as (keyof Ajustes)[]).forEach((k) => { if (a[k]) out[k] = Math.round(a[k]); });
    return out;
  }
  async function salvarEstilo() {
    const nome = nomeEstilo.trim();
    if (!nome) { setMsg("Dê um nome ao estilo."); return; }
    const { error } = await createClient().from("av_fotos").insert({ tipo: "estilo", titulo: nome.slice(0, 60), spec: { ajustes: lookAtual(), manterCor: estado.manterCor }, resultado_url: foto?.resultadoUrl || null });
    if (error) { setMsg(error.message); return; }
    setNomeEstilo(""); setMsg(`Estilo "${nome}" entrou no catálogo.`); load();
  }
  function baixarLut() {
    const a = combinar(null, estiloDe(estado.estilo).ajustes, estado.intensidade, estado.finos);
    const nome = estiloDe(estado.estilo).nome;
    baixar(new Blob([gerarCube(a, nome)], { type: "text/plain" }), `${nome.normalize("NFD").replace(/[^\w ]/g, "").trim().replace(/ +/g, "-").toLowerCase() || "look"}.cube`);
  }
  async function usarReferencia(files: FileList | null) {
    const file = files?.[0];
    if (!file || !foto) return;
    try {
      const ref = await carregar(URL.createObjectURL(file));
      const corrigida = render(foto.base, combinar(estado.auto ? foto.autoAj : null, null, 0, {}), false);
      const aj = estiloDaReferencia(analisar(lerImagem(ref, 600).data), analisar(corrigida.data));
      const e: Estilo = { id: "referencia", nome: "Da referência", desc: `Look tirado de ${file.name}`, ajustes: aj, mexeCor: true };
      setRefEstilo(e);
      mudar({ estilo: "referencia", intensidade: 100 });
      setMsg("Look da referência aplicado. Ajuste a intensidade, e salve como estilo se quiser usar de novo.");
    } catch (e: any) { setMsg(e.message); }
  }
  async function pedirClaude() {
    if (!foto) return;
    setOcupado("Enviando a foto ao Claude…");
    try {
      const f = await garantirSalva(foto);
      setOcupado("Esperando o Claude… (o pedido fica na fila do HUB)");
      const res = await aiFetch("/api/av/foto", {
        task: "foto_estilo", foto_id: f.dbId, url: f.originalUrl, pedido: pedido.trim(), analise: f.analise, auto: f.estado.auto ? f.autoAj : {}, account_id: conta || null,
        estilos_salvos: salvos.map((s) => ({ id: s.id, nome: s.nome, ajustes: s.ajustes })),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error || "O Claude não respondeu ainda."); setOcupado(null); return; }
      const s = j.sugestao;
      setFotos((fs) => fs.map((x) => (x.key === f.key ? { ...x, sugestao: s, estado: { ...x.estado, auto: true, estilo: s.estilo, intensidade: s.intensidade, finos: s.ajustes || {}, manterCor: !!s.manter_cor } } : x)));
      setMsg(`Claude: ${s.explicacao || "ajuste aplicado."}`);
      setAba("ajustes");
    } catch (e: any) { setMsg(e.message); }
    setOcupado(null);
  }
  async function excluir(l: Linha) {
    const ok = await apagarComLixeira({ tabela: "av_fotos", filtro: { id: l.id }, oque: l.tipo === "estilo" ? `o estilo "${l.titulo}"` : `a foto "${l.titulo}"`, rotulo: `${l.tipo === "estilo" ? "Estilo de foto" : "Foto"}: ${l.titulo}`, link: "/audiovisual/fotos" });
    if (ok) load();
  }

  const fA = foto ? final(foto) : ZERO;
  const estiloAtual = estiloDe(estado.estilo);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[11px] tracking-[.2em] text-mint uppercase">Audiovisual · Pós-produção</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">Fotos</h1>
          <p className="text-sm text-fog mt-1 max-w-2xl">Correção automática, catálogo de estilos com prévia e os ajustes básicos de luz, contraste, sombras e cor. Para qualquer foto: produto, ensaio, evento, bastidor. Roda no navegador, sem custo. O Claude pode olhar a foto e escolher o estilo e os ajustes.</p>
        </div>
        <div className="flex gap-2">
          <input ref={inputFotos} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }} />
          <button onClick={() => inputFotos.current?.click()} className="btn btn-mint"><I.plus className="w-4 h-4" />Abrir fotos</button>
        </div>
      </div>
      {msg && <p className="text-sm text-mint mb-3">{msg}</p>}
      {ocupado && <p className="text-sm text-fog mb-3 animate-pulse">{ocupado}</p>}

      {!foto && (
        <button onClick={() => inputFotos.current?.click()} className="card w-full p-10 mb-4 text-center border-dashed hover:border-mint">
          <I.camera className="w-8 h-8 mx-auto text-mint" />
          <p className="font-display text-lg font-extrabold mt-3">Abra uma ou várias fotos</p>
          <p className="text-sm text-fog mt-1">Do celular ou do computador. Com várias, a mesma edição vale para todas (lote).</p>
        </button>
      )}

      {foto && (
        <section className="card p-3 sm:p-4 mb-4">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
            <div className="min-w-0">
              <div className="relative rounded-xl overflow-hidden bg-black/40 grid place-items-center select-none"
                onPointerDown={() => setAntes(true)} onPointerUp={() => setAntes(false)} onPointerLeave={() => setAntes(false)} onContextMenu={(e) => e.preventDefault()}>
                <canvas ref={canvas} className="max-w-full max-h-[62vh] w-auto h-auto block touch-none" />
                <span className="absolute left-2 top-2 chip !bg-black/60">{antes ? "Antes" : estiloAtual.nome}</span>
                <span className="absolute right-2 bottom-2 text-[10px] text-white/70 bg-black/50 rounded px-1.5 py-0.5">Segure para ver o antes</span>
              </div>
              {fotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                  {fotos.map((f, i) => (
                    <button key={f.key} onClick={() => setAtual(i)} className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${i === atual ? "border-mint" : "border-transparent"}`}>
                      <img src={f.img.src} alt={f.nome} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => salvar([foto])} disabled={!!ocupado} className="btn btn-mint btn-sm">Salvar no HUB</button>
                <button onClick={() => baixarFotos([foto])} disabled={!!ocupado} className="btn btn-ghost btn-sm"><I.download className="w-4 h-4" />Baixar JPG</button>
                {fotos.length > 1 && <>
                  <button onClick={aplicarATodas} className="btn btn-ghost btn-sm">Mesma edição em todas</button>
                  <button onClick={() => salvar(fotos)} disabled={!!ocupado} className="btn btn-ghost btn-sm">Salvar as {fotos.length}</button>
                  <button onClick={() => baixarFotos(fotos)} disabled={!!ocupado} className="btn btn-ghost btn-sm">Baixar as {fotos.length}</button>
                </>}
                <button onClick={baixarLut} className="btn btn-ghost btn-sm" title="O mesmo look em LUT para Lightroom, Photoshop e Premiere">LUT .cube</button>
                <button onClick={() => { setFotos((fs) => fs.filter((_, i) => i !== atual)); setAtual(0); }} className="btn btn-ghost btn-sm text-red-400">Fechar foto</button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex gap-1 mb-3 overflow-x-auto">
                {([["estilos", "Estilos"], ["ajustes", "Ajustes"], ["referencia", "Referência"], ["claude", "Claude"]] as const).map(([k, n]) => (
                  <button key={k} onClick={() => setAba(k)} className={`chip shrink-0 ${aba === k ? "chip-mint" : ""}`}>{n}</button>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={estado.auto} onChange={(e) => mudar({ auto: e.target.checked })} className="accent-[var(--color-mint)]" />Correção automática</label>
                <label className="flex items-center gap-2" title="Peças coloridas (roupa, produto) não mudam de cor com o estilo"><input type="checkbox" checked={estado.manterCor} onChange={(e) => mudar({ manterCor: e.target.checked })} className="accent-[var(--color-mint)]" />Manter cor da peça</label>
              </div>

              {aba === "estilos" && (
                <>
                  <div className="grid grid-cols-3 gap-2 max-h-[46vh] overflow-y-auto pr-1">
                    {catalogo.map((e) => (
                      <button key={e.id} onClick={() => mudar({ estilo: e.id, intensidade: 100, finos: {} })} title={e.desc} className={`text-left rounded-lg border-2 overflow-hidden ${estado.estilo === e.id ? "border-mint" : "border-transparent"}`}>
                        {thumbs[e.id] ? <img src={thumbs[e.id]} alt="" className="w-full aspect-[4/5] object-cover" /> : <div className="w-full aspect-[4/5] bg-white/5" />}
                        <p className="text-[11px] font-semibold px-1 py-1 truncate">{e.nome}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-fog mt-2">{estiloAtual.desc}{estiloAtual.mexeCor && !estado.manterCor ? " Este estilo mexe nas cores: em foto de produto, marque \"Manter cor da peça\"." : ""}</p>
                  <label className="text-xs text-fog block mt-3">Intensidade: {estado.intensidade}%</label>
                  <input type="range" min={0} max={150} value={estado.intensidade} onChange={(e) => mudar({ intensidade: +e.target.value })} className="w-full accent-[var(--color-mint)]" />
                  <div className="flex gap-2 mt-3">
                    <input value={nomeEstilo} onChange={(e) => setNomeEstilo(e.target.value)} className="input text-sm" placeholder="Nome para salvar este look" />
                    <button onClick={salvarEstilo} className="btn btn-ghost btn-sm shrink-0">Salvar estilo</button>
                  </div>
                </>
              )}

              {aba === "ajustes" && (
                <div className="max-h-[52vh] overflow-y-auto pr-1">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[11px] text-fog">Por cima do estilo. O número entre parênteses é o valor final.</p>
                    <button onClick={() => mudar({ finos: {} })} className="chip shrink-0">Zerar</button>
                  </div>
                  {CONTROLES.map((g) => (
                    <div key={g.grupo} className="mb-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-mint mb-1">{g.grupo}</p>
                      {g.itens.map((c) => (
                        <div key={c.k} className="mb-1.5">
                          <div className="flex justify-between text-xs"><span>{c.nome}</span><span className="text-fog tabular-nums">{Math.round(estado.finos[c.k] ?? 0)} ({Math.round(fA[c.k])})</span></div>
                          <input type="range" min={c.min} max={c.max} value={estado.finos[c.k] ?? 0} onChange={(e) => fino(c.k, +e.target.value)} onDoubleClick={() => fino(c.k, 0)} className="w-full accent-[var(--color-mint)]" />
                          {(c.k === "forcaSombras" || c.k === "forcaRealces") && fA[c.k] > 0 && (() => {
                            const hk = c.k === "forcaSombras" ? "tomSombras" : "tomRealces";
                            return <input type="range" min={0} max={360} value={fA[hk]} onChange={(e) => fino(hk, +e.target.value)} className="w-full h-2 rounded appearance-none" style={{ background: "linear-gradient(90deg,red,yellow,lime,cyan,blue,magenta,red)" }} aria-label="Cor do tom" />;
                          })()}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {aba === "referencia" && (
                <div>
                  <p className="text-sm text-fog">Mande uma foto com o look que você quer (de um ensaio, de outra marca, de um filme). O HUB compara as duas e leva a sua foto para a mesma luz, cor e contraste.</p>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { usarReferencia(e.target.files); e.target.value = ""; }} />
                  <button onClick={() => inputRef.current?.click()} className="btn btn-mint btn-sm mt-3"><I.camera className="w-4 h-4" />Escolher a referência</button>
                  {refEstilo && <p className="text-xs text-fog mt-3">{refEstilo.desc}. Ele entrou no catálogo como &quot;Da referência&quot;.</p>}
                </div>
              )}

              {aba === "claude" && (
                <div>
                  <p className="text-sm text-fog">O Claude olha a foto (ou a leitura de cor e luz dela), escolhe o estilo do catálogo e acerta os ajustes. Pela fila do HUB, na sua assinatura do Claude.</p>
                  <textarea rows={3} value={pedido} onChange={(e) => setPedido(e.target.value)} className="input mt-3 text-sm" placeholder="Ex.: foto de produto para o site, cor fiel do vestido. Ou: deixa com cara de editorial de Natal." />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <select value={conta} onChange={(e) => setConta(e.target.value)} className="input !w-auto text-sm">
                      <option value="">Sem perfil</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}
                    </select>
                    <button onClick={pedirClaude} disabled={!!ocupado} className="btn btn-mint btn-sm ml-auto"><I.spark className="w-4 h-4" />Pedir ao Claude</button>
                  </div>
                  {foto.sugestao?.explicacao && <p className="text-xs text-mint mt-3">Última sugestão: {foto.sugestao.explicacao}</p>}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Minhas fotos</p>
        {linhas === null && <p className="text-sm text-fog">Carregando…</p>}
        {linhas && !linhas.some((l) => l.tipo === "foto") && <p className="text-sm text-fog py-4 text-center">Nenhuma foto salva ainda.</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {linhas?.filter((l) => l.tipo === "foto").map((l) => (
            <div key={l.id} className="min-w-0">
              <button onClick={() => abrirSalva(l)} className="block w-full rounded-lg overflow-hidden bg-white/5">
                {l.resultado_url || l.original_url ? <img src={(l.resultado_url || l.original_url)!} alt={l.titulo} loading="lazy" className="w-full aspect-[4/5] object-cover" /> : <div className="aspect-[4/5]" />}
              </button>
              <p className="text-[11px] font-semibold truncate mt-1">{l.titulo}</p>
              <div className="flex gap-1 mt-1">
                {l.resultado_url && <a href={l.resultado_url} target="_blank" rel="noreferrer" className="chip">Ver</a>}
                <button onClick={() => excluir(l)} className="chip text-red-400" aria-label={`Excluir ${l.titulo}`}><I.trash className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
        {salvos.length > 0 && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mt-5 mb-2">Estilos salvos</p>
            <div className="flex flex-wrap gap-2">
              {linhas?.filter((l) => l.tipo === "estilo").map((l) => (
                <span key={l.id} className="chip">{l.titulo}<button onClick={() => excluir(l)} className="ml-1 text-red-400" aria-label={`Excluir ${l.titulo}`}><I.trash className="w-3 h-3" /></button></span>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
