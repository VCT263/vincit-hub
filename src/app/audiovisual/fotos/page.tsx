"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { I } from "@/components/icons";
import Modal from "@/components/agency/Modal";
import { createClient } from "@/lib/supabase/client";
import { aiFetch } from "@/lib/aiFetch";
import { apagarComLixeira } from "@/lib/lixeira";
import { salvarNoDrive } from "@/lib/drive";
import { MARCAS, lutPorId, type Lut } from "@/lib/luts/catalog";
import { aplicarNaFoto, tabelaDe, temVisual, type Tabela } from "@/lib/luts/previa";
import CorTabs from "@/components/av/CorTabs";
import {
  CONTROLES, ESTILOS, ZERO, analisar, aplicar, autoCorrecao, combinar, estiloDaReferencia, gerarCube, lerImagem,
  type Ajustes, type Analise, type Estilo,
} from "@/lib/foto/engine";

/* Editor de fotos do Audiovisual (28/11). Editor genérico, como o Editor de vídeo e o Motion:
   correção automática + catálogo de estilos com prévia + ajustes básicos (luz, contraste, sombras, cor).
   Tudo roda no navegador, sem custo. O Claude (pela fila) olha a foto e escolhe estilo e ajustes. */

type Estado = { auto: boolean; estilo: string; intensidade: number; finos: Partial<Ajustes>; manterCor: boolean; lut?: string; lutForca?: number };
type CorLut = { lut: Lut; t: Tabela; forca: number } | null;
/* marcas da Biblioteca de LUTs que mudam o visual de uma foto (as conversões puras deixariam igual) */
const MARCAS_FOTO = MARCAS.map((m) => ({ ...m, luts: m.luts.filter(temVisual) })).filter((m) => m.luts.length);
type Foto = {
  key: string; nome: string; img: HTMLImageElement; mini: ImageData; analise: Analise; autoAj: Partial<Ajustes>;
  driveId?: string; drivePasta?: string;
  estado: Estado; dbId?: string; originalUrl?: string; resultadoUrl?: string; sugestao?: any;
};
type Linha = { id: string; tipo: "foto" | "estilo"; titulo: string; original_url: string | null; resultado_url: string | null; spec: any; updated_at: string };

const ESTADO0: Estado = { auto: true, estilo: "natural", intensidade: 100, finos: {}, manterCor: false };
const uid = () => Math.random().toString(36).slice(2, 10);
const PREVIA = 1100, MINI = 150, SAIDA = 3000;

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => erro(new Error("Não consegui abrir a imagem.")); i.src = src; });
}
function render(base: ImageData, a: Ajustes, manterCor: boolean, cor: CorLut = null) {
  const out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  aplicar(out, a, { manterCor });
  if (cor) {
    const antes = manterCor ? new Uint8ClampedArray(out.data) : null;
    aplicarNaFoto(out, cor.lut, cor.t, cor.forca);
    if (antes) protegerCor(out.data, base.data, antes);
  }
  return out;
}
/** "Manter cor da peça" também vale para a LUT: nos pontos saturados da foto original volta o tom de antes da LUT, com a luz nova */
function protegerCor(d: Uint8ClampedArray, orig: Uint8ClampedArray, antes: Uint8ClampedArray) {
  for (let i = 0; i < d.length; i += 4) {
    const R = orig[i], G = orig[i + 1], B = orig[i + 2];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    const w = Math.min(1, Math.max(0, ((mx ? (mx - mn) / mx : 0) - 0.22) / 0.25));
    if (!w) continue;
    const L0 = antes[i] * 0.299 + antes[i + 1] * 0.587 + antes[i + 2] * 0.114 || 1, L1 = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const k = L1 / L0;
    for (let c = 0; c < 3; c++) d[i + c] = d[i + c] * (1 - w) + antes[i + c] * k * w;
  }
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
  const [aba, setAba] = useState<"estilos" | "luts" | "ajustes" | "referencia" | "claude">("estilos");
  const [lutMarca, setLutMarca] = useState(MARCAS_FOTO[0]?.id || "");
  const [tabs, setTabs] = useState<Record<string, Tabela>>({});
  const [antes, setAntes] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [conta, setConta] = useState("");
  const [pedido, setPedido] = useState("");
  const [nomeEstilo, setNomeEstilo] = useState("");
  const [refEstilo, setRefEstilo] = useState<Estilo | null>(null);
  const [drive, setDrive] = useState<{ escrita: boolean; pasta?: string } | null>(null);
  const [pastas, setPastas] = useState<{ folder: string; n: number; capa: string; recente: string }[] | null>(null);
  const [verPastas, setVerPastas] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const inputFotos = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const foto = fotos[atual] as Foto | undefined;
  const estado = foto?.estado || ESTADO0;
  // prévia grande só da foto aberta (numa sessão com dezenas de fotos, guardar todas pesa no celular)
  const base = useMemo(() => (foto ? lerImagem(foto.img, PREVIA) : null), [foto?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    const { data } = await createClient().from("av_fotos").select("id,tipo,titulo,original_url,resultado_url,spec,updated_at").order("updated_at", { ascending: false }).limit(80);
    setLinhas((data as any) || []);
    return (data as Linha[]) || [];
  }, []);
  useEffect(() => {
    load().then((l) => { const id = q.get("id"); const r = id && l.find((x) => x.id === id); if (r) abrirSalva(r); });
    createClient().from("ig_accounts").select("id,username").order("username").then(({ data }) => setAccounts((data as any) || []));
    fetch("/api/av/drive/status").then((x) => x.json()).then((st) => setDrive({ escrita: !!(st.drive && st.escrita), pasta: st.cfg?.drive_folder_name })).catch(() => setDrive({ escrita: false }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvos: Estilo[] = useMemo(() => (linhas || []).filter((l) => l.tipo === "estilo").map((l) => ({ id: l.id, nome: l.titulo, desc: "Estilo salvo", ajustes: l.spec?.ajustes || {}, mexeCor: !l.spec?.manterCor })), [linhas]);
  const catalogo = useMemo(() => [...ESTILOS, ...(refEstilo ? [refEstilo] : []), ...salvos], [salvos, refEstilo]);
  const estiloDe = useCallback((id: string) => catalogo.find((e) => e.id === id) || ESTILOS[0], [catalogo]);
  const final = useCallback((f: Foto, e: Estado = f.estado) => combinar(e.auto ? f.autoAj : null, estiloDe(e.estilo).ajustes, e.intensidade, e.finos), [estiloDe]);

  // LUT da biblioteca por cima da edição (mesma prévia da Biblioteca de LUTs)
  const precisaTabela = useCallback((l: Lut) => {
    if (tabs[l.id]) return;
    tabelaDe(l).then((t) => setTabs((x) => ({ ...x, [l.id]: t }))).catch(() => {});
  }, [tabs]);
  const corLut = useCallback((e: Estado): CorLut => {
    const l = e.lut ? lutPorId(e.lut) : undefined;
    if (!l) return null;
    const t = tabs[l.id];
    return t ? { lut: l, t, forca: e.lutForca ?? 100 } : null;
  }, [tabs]);
  useEffect(() => { fotos.forEach((f) => { const l = f.estado.lut && lutPorId(f.estado.lut); if (l) precisaTabela(l); }); }, [fotos, precisaTabela]);
  const marcaLut = MARCAS_FOTO.find((m) => m.id === lutMarca) || MARCAS_FOTO[0];
  useEffect(() => { if (aba === "luts") marcaLut?.luts.forEach(precisaTabela); }, [aba, marcaLut, precisaTabela]);
  const lutThumbs = useMemo(() => {
    const out: Record<string, string> = {};
    if (!foto || aba !== "luts" || !marcaLut) return out;
    const c = document.createElement("canvas"); c.width = foto.mini.width; c.height = foto.mini.height;
    const x = c.getContext("2d")!;
    const a = final(foto);
    for (const l of marcaLut.luts) {
      const t = tabs[l.id];
      if (!t) continue;
      x.putImageData(render(foto.mini, a, estado.manterCor, { lut: l, t, forca: 100 }), 0, 0);
      out[l.id] = c.toDataURL("image/jpeg", 0.8);
    }
    return out;
  }, [foto?.key, aba, marcaLut, tabs, estado.auto, estado.estilo, estado.intensidade, estado.finos, estado.manterCor]); // eslint-disable-line react-hooks/exhaustive-deps

  // prévia grande: redesenha no próximo quadro quando algo muda
  const raf = useRef(0);
  useEffect(() => {
    if (!foto || !base || !canvas.current) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const c = canvas.current!; c.width = base.width; c.height = base.height;
      c.getContext("2d")!.putImageData(antes ? base : render(base, final(foto), estado.manterCor, corLut(estado)), 0, 0);
    });
  }, [foto, base, estado, antes, final, corLut]);

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
    const mini = lerImagem(img, MINI);
    const analise = analisar(lerImagem(img, 400).data);
    return { key: uid(), nome, img, mini, analise, autoAj: autoCorrecao(analise), estado: { ...ESTADO0 }, ...extra };
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
  /** pastas do Banco de mídia que têm fotos: cada uma pode virar uma sessão para editar junta */
  async function abrirPastas() {
    setVerPastas(true);
    const { data } = await createClient().from("av_media").select("drive_id,name,mime,folder,modified_at").eq("missing", false).like("mime", "image/%").limit(5000);
    const m = new Map<string, { folder: string; n: number; capa: string; recente: string }>();
    for (const r of (data as any[]) || []) {
      const k = r.folder || "";
      const g = m.get(k) || { folder: k, n: 0, capa: r.drive_id, recente: "" };
      g.n++; if ((r.modified_at || "") > g.recente) { g.recente = r.modified_at || ""; g.capa = r.drive_id; }
      m.set(k, g);
    }
    setPastas([...m.values()].sort((a, b) => b.recente.localeCompare(a.recente)));
  }
  async function abrirSessao(folder: string) {
    setVerPastas(false);
    const { data } = await createClient().from("av_media").select("drive_id,name,mime,size").eq("missing", false).eq("folder", folder).like("mime", "image/%").order("name").limit(80);
    const itens = (data as any[]) || [];
    if (!itens.length) { setMsg("Essa pasta não tem fotos."); return; }
    const novas: Foto[] = [];
    let falhas = 0;
    for (let i = 0; i < itens.length; i += 4) {
      setOcupado(`Abrindo a sessão: ${Math.min(i + 4, itens.length)} de ${itens.length} fotos…`);
      const lote = await Promise.all(itens.slice(i, i + 4).map(async (r) => {
        // JPG, PNG e WEBP abrem o original; HEIC, RAW e arquivos enormes usam a versão de 2400 px que o Drive gera
        const direto = /^image\/(jpeg|png|webp|gif)$/.test(r.mime || "") && (r.size || 0) < 25e6;
        const urls = direto ? [`/api/av/drive/file/${r.drive_id}`, `/api/av/drive/thumb/${r.drive_id}?s=2400`] : [`/api/av/drive/thumb/${r.drive_id}?s=2400`];
        for (const u of urls) { try { return await prepara(await carregar(u), semExt(r.name), { driveId: r.drive_id, drivePasta: folder }); } catch {} }
        falhas++; return null;
      }));
      novas.push(...(lote.filter(Boolean) as Foto[]));
    }
    const ini = foto?.estado;
    setFotos((fs) => { setAtual(fs.length); return [...fs, ...novas.map((x) => (ini ? { ...x, estado: { ...ini } } : x))]; });
    setOcupado(null);
    setMsg(`Sessão "${folder.split("/").pop() || "pasta"}" aberta com ${novas.length} fotos${falhas ? ` (${falhas} não abriram)` : ""}. Edite uma, toque em "Mesma edição em todas" e salve a sessão no Drive.`);
  }
  /** salva as fotos da sessão no Drive, numa subpasta "Editadas" ao lado das originais */
  async function salvarSessao() {
    const da = fotos.filter((f) => f.drivePasta != null);
    if (!drive?.escrita) { setMsg("Libere a organização do Drive no Banco de mídia para salvar lá."); return; }
    let ok = 0, ultimo = "", erro = "";
    for (const [i, f] of da.entries()) {
      setOcupado(`Salvando no Drive: ${i + 1} de ${da.length}…`);
      const d = await salvarNoDrive({ kind: "foto", nome: `${f.nome || "foto"}.jpg`, blob: await renderSaida(f), caminho: [...(f.drivePasta || "").split("/").filter(Boolean), "Editadas"] });
      if (d.ok) { ok++; ultimo = d.caminho || ""; } else erro = d.error || "";
    }
    setOcupado(null);
    setMsg(`${ok} de ${da.length} fotos salvas no Drive${ultimo ? ` (${ultimo})` : ""}.${erro ? ` Erro: ${erro}` : ""}`);
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
    return paraBlob(render(lerImagem(f.img, SAIDA), final(f), f.estado.manterCor, corLut(f.estado)), 0.92);
  }
  async function salvar(fs: Foto[]) {
    setOcupado(fs.length > 1 ? `Salvando ${fs.length} fotos…` : "Salvando…");
    let avisoDrive = "", erroDrive = "";
    try {
      for (const f0 of fs) {
        const f = await garantirSalva(f0);
        const blob = await renderSaida(f);
        const url = await subir(blob, "editada");
        let driveInfo: any = null;
        if (drive?.escrita) {
          const d = await salvarNoDrive({ kind: "foto", nome: `${f.nome || "foto"}-editada.jpg`, blob, accountId: conta || null });
          if (d.ok) { driveInfo = { caminho: d.caminho, link: d.link }; avisoDrive = d.caminho; } else erroDrive = d.error;
        }
        await createClient().from("av_fotos").update({ resultado_url: url, spec: { estado: f.estado, sugestao: f.sugestao || null, drive: driveInfo }, updated_at: new Date().toISOString() }).eq("id", f.dbId!);
        setFotos((xs) => xs.map((x) => (x.key === f.key ? { ...x, resultadoUrl: url } : x)));
      }
      const onde = fs.length > 1 ? `${fs.length} fotos salvas em "Minhas fotos"` : "Foto salva em \"Minhas fotos\"";
      setMsg(`${onde}${avisoDrive ? ` e no Drive (${avisoDrive})` : ""}.${erroDrive ? ` Drive: ${erroDrive}` : ""}`);
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
  async function lutNoDrive() {
    const a = combinar(null, estiloDe(estado.estilo).ajustes, estado.intensidade, estado.finos);
    const nome = estiloDe(estado.estilo).nome;
    const d = await salvarNoDrive({ kind: "lut", nome: `${nome}.cube`, blob: new Blob([gerarCube(a, nome)], { type: "application/octet-stream" }) });
    setMsg(d.ok ? `LUT salvo no Drive (${d.caminho}).` : `Drive: ${d.error}`);
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
      const corrigida = render(base || lerImagem(foto.img, PREVIA), combinar(estado.auto ? foto.autoAj : null, null, 0, {}), false);
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
      <CorTabs />
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[11px] tracking-[.2em] text-mint uppercase">Audiovisual · Cor</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">Fotos</h1>
          <p className="text-sm text-fog mt-1 max-w-2xl">Correção automática, catálogo de estilos com prévia e os ajustes básicos de luz, contraste, sombras e cor. Para qualquer foto: produto, ensaio, evento, bastidor. Roda no navegador, sem custo. O Claude pode olhar a foto e escolher o estilo e os ajustes.</p>
        </div>
        <div className="flex gap-2">
          <input ref={inputFotos} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }} />
          <button onClick={abrirPastas} className="btn btn-ghost"><I.folder className="w-4 h-4" />Pasta do Banco</button>
          <button onClick={() => inputFotos.current?.click()} className="btn btn-mint"><I.plus className="w-4 h-4" />Abrir fotos</button>
        </div>
      </div>
      {msg && <p className="text-sm text-mint mb-3">{msg}</p>}
      {ocupado && <p className="text-sm text-fog mb-3 animate-pulse">{ocupado}</p>}

      {!foto && (
        <button onClick={() => inputFotos.current?.click()} className="card w-full p-10 mb-4 text-center border-dashed hover:border-mint">
          <I.camera className="w-8 h-8 mx-auto text-mint" />
          <p className="font-display text-lg font-extrabold mt-3">Abra uma ou várias fotos</p>
          <p className="text-sm text-fog mt-1">Do celular ou do computador. Com várias, a mesma edição vale para todas (lote). Para editar uma sessão inteira do Drive, use &quot;Pasta do Banco&quot;.</p>
        </button>
      )}

      {foto && (
        <section className="card p-3 sm:p-4 mb-4">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
            <div className="min-w-0">
              <div className="relative rounded-xl overflow-hidden bg-black/40 grid place-items-center select-none"
                onPointerDown={() => setAntes(true)} onPointerUp={() => setAntes(false)} onPointerLeave={() => setAntes(false)} onContextMenu={(e) => e.preventDefault()}>
                <canvas ref={canvas} className="max-w-full max-h-[62vh] w-auto h-auto block touch-none" />
                <span className="absolute left-2 top-2 chip !bg-black/60">{antes ? "Antes" : estiloAtual.nome + (estado.lut && lutPorId(estado.lut) ? ` + ${lutPorId(estado.lut)!.nome}` : "")}</span>
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
                <button onClick={() => salvar([foto])} disabled={!!ocupado} className="btn btn-mint btn-sm">{drive?.escrita ? "Salvar no HUB e no Drive" : "Salvar no HUB"}</button>
                <button onClick={() => baixarFotos([foto])} disabled={!!ocupado} className="btn btn-ghost btn-sm"><I.download className="w-4 h-4" />Baixar JPG</button>
                {fotos.some((f) => f.drivePasta != null) && <button onClick={salvarSessao} disabled={!!ocupado} className="btn btn-mint btn-sm">Salvar sessão no Drive ({fotos.filter((f) => f.drivePasta != null).length})</button>}
                {fotos.length > 1 && <>
                  <button onClick={aplicarATodas} className="btn btn-ghost btn-sm">Mesma edição em todas</button>
                  <button onClick={() => salvar(fotos)} disabled={!!ocupado} className="btn btn-ghost btn-sm">Salvar as {fotos.length}</button>
                  <button onClick={() => baixarFotos(fotos)} disabled={!!ocupado} className="btn btn-ghost btn-sm">Baixar as {fotos.length}</button>
                </>}
                <button onClick={baixarLut} className="btn btn-ghost btn-sm" title="O mesmo look em LUT para Lightroom, Photoshop e Premiere">LUT .cube</button>
                {drive?.escrita && <button onClick={lutNoDrive} className="btn btn-ghost btn-sm">LUT no Drive</button>}
                <button onClick={() => { setFotos((fs) => fs.filter((_, i) => i !== atual)); setAtual(0); }} className="btn btn-ghost btn-sm text-red-400">Fechar foto</button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex gap-1 mb-3 overflow-x-auto">
                {([["estilos", "Estilos"], ["luts", "LUTs"], ["ajustes", "Ajustes"], ["referencia", "Referência"], ["claude", "Claude"]] as const).map(([k, n]) => (
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

              {aba === "luts" && (
                <div>
                  <p className="text-xs text-fog">As mesmas LUTs da <a href="/audiovisual/luts" className="text-mint underline">Biblioteca</a>, por cima da edição. Assim a foto sai com o mesmo look do vídeo.</p>
                  <div className="flex gap-1 overflow-x-auto mt-2 pb-1">
                    {MARCAS_FOTO.map((m) => <button key={m.id} onClick={() => setLutMarca(m.id)} className={`chip shrink-0 text-xs ${marcaLut?.id === m.id ? "!border-mint !text-mint" : ""}`}>{m.nome}</button>)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto pr-1 mt-2">
                    <button onClick={() => mudar({ lut: undefined })} className={`text-left rounded-lg border-2 overflow-hidden ${!estado.lut ? "border-mint" : "border-transparent"}`}>
                      <div className="w-full aspect-square bg-black/40 grid place-items-center text-[11px] text-fog">Sem LUT</div>
                    </button>
                    {marcaLut?.luts.map((l) => (
                      <button key={l.id} onClick={() => mudar({ lut: l.id, lutForca: 100 })} title={l.desc} className={`text-left rounded-lg border-2 overflow-hidden ${estado.lut === l.id ? "border-mint" : "border-transparent"}`}>
                        {lutThumbs[l.id] ? <img src={lutThumbs[l.id]} alt="" className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-black/40 animate-pulse" />}
                        <p className="text-[10px] leading-tight px-1 py-0.5 truncate">{l.nome}</p>
                      </button>
                    ))}
                  </div>
                  {estado.lut && lutPorId(estado.lut) && <>
                    <p className="text-[11px] text-fog mt-2">{lutPorId(estado.lut)!.desc}</p>
                    <label className="text-xs text-fog block mt-3">Força da LUT: {estado.lutForca ?? 100}%</label>
                    <input type="range" min={0} max={100} value={estado.lutForca ?? 100} onChange={(e) => mudar({ lutForca: +e.target.value })} className="w-full accent-[var(--color-mint)]" />
                  </>}
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
      <Modal open={verPastas} title="Abrir uma sessão do Banco de mídia" onClose={() => setVerPastas(false)} wide>
        {pastas === null && <p className="text-sm text-fog">Carregando…</p>}
        {pastas?.length === 0 && <p className="text-sm text-fog">Nenhuma foto no Banco de mídia ainda. Ponha a sessão numa pasta do Drive (ou na Entrada) e sincronize o Banco.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {pastas?.map((p) => (
            <button key={p.folder} onClick={() => abrirSessao(p.folder)} className="text-left rounded-xl border border-line p-2 hover:border-mint min-w-0">
              <img src={`/api/av/drive/thumb/${p.capa}?s=480`} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover rounded-lg bg-white/5" />
              <p className="text-sm font-semibold truncate mt-2">{p.folder.split("/").pop() || "Pasta do banco"}</p>
              <p className="text-[11px] text-fog truncate">{p.n} foto(s) · {p.folder || "raiz"}</p>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
