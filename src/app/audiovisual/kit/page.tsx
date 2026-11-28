"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  CAMERA_LEVELS, CAMERA_MOVES, CAPTION_ANIMS, CAPTION_STYLES, DEFAULT_KIT, FONTS, FONTS_CSS, H, LETTERING_KINDS, MOTION_KINDS, OVERLAY_MODES, TITLE_LABEL, W,
  setFormat, captionScreens, cameraAt, drawInsert, drawOverlays, mergeKit, shakeAt, speechCamera, transitionZoom, zoomAt,
  type Kit, type Overlay, type OverlayMode, type Project, type Title, type TitleKind, type Zoom,
} from "@/lib/editor/model";
import { ESTILOS, estiloByNum, estiloTags, kitComEstilo, projetoDoEstilo, type Estilo } from "@/lib/editor/styles";
import { apagarComLixeira } from "@/lib/lixeira";
import { kitComMarca } from "@/lib/kitMarca";

type Row = { id?: string; name: string; account_id?: string | null; data: Kit; marca?: { id: string; title?: string } };

const EMPTY: Row = { name: "", data: { ...structuredClone(DEFAULT_KIT), mogrts: { legenda: "", gancho: "", cta: "", lower_third: "" } } };

const PESOS = ["", " Bold", " ExtraBold", " Black"];
const FONTS_LOAD = ['700 40px "Cinzel"', '700 40px "Playfair Display"', '500 40px "JetBrains Mono"', 'italic 400 40px "Instrument Serif"', '400 40px "Instrument Serif"', '400 40px "Anton"', '900 40px "Inter"', '800 40px "Inter"', '700 40px "Inter"', '500 40px "Inter"', '400 40px "Archivo Black"', '400 40px "Bebas Neue"', '900 40px "Montserrat"', '700 40px "Montserrat"', '900 40px "Poppins"', '700 40px "Poppins"', '800 40px "Bricolage Grotesque"'];

/* fala de exemplo da prévia, com tempo por palavra */
const SAMPLE = "Você está perdendo 70% das vendas! Sabe por quê? Porque ninguém explicou o produto direito. Isso muda tudo.".split(" ");
const sampleWords = (() => {
  let t = 0.3;
  return SAMPLE.map((w, i) => {
    const d = 0.16 + w.length * 0.035;
    const out = { start: t, end: t + d, t: w, key: `s:${i}` };
    t += d + (/[!?.]$/.test(w) ? 0.55 : 0.06);
    return out;
  });
})();
const SAMPLE_LEN = sampleWords[sampleWords.length - 1].end + 0.8;

/** exemplos de texto para cada lettering e motion na prévia */
const DEMO_TEXT: Record<TitleKind, [string, string?]> = {
  gancho: ["O erro que trava suas vendas"], cta: ["Comenta EU QUERO"], lower_third: ["Vinícius Gontijo", "VINCIT"], episodio: ["21KM em Floripa", "2026"], capitulo: ["A largada"],
  palavra: ["Vendas"], frase: ["Isso muda tudo", "tudo"], letreiro: ["Malícia"], data: ["16 de agosto de 2026", "domingo"], lista: ["O que muda o jogo", "dormir melhor | treinar cedo | escrever o dia"],
  rec: ["REC", "4K UHD"], vazado: ["vendas", "sem anúncio"], riscado: ["tática", "estratégia"],
  numero: ["70%", "das vendas"], grafico: ["Vendas", "em 3 meses"], checklist: ["3 ajustes", "foto | preço | descrição"], seta: ["olha aqui", "baixo"], relogio: ["30 min", "por dia"], progresso: ["70", "da meta"],
};
/** em que momento da fala de exemplo cada demonstração entra (nunca fica fixo o vídeo todo) */
const DEMO_AT = 1.1, DEMO_LEN = 2.4;

type Camada = "identidade" | "legenda" | "lettering" | "camera" | "insercao" | "motion" | "premiere";
const CAMADAS: [Camada, string, string][] = [
  ["identidade", "Identidade", "Nome, estilo padrão, cores e fontes"],
  ["legenda", "Legenda", "A fala escrita na tela"],
  ["lettering", "Lettering", "Textos de destaque que entram e saem"],
  ["camera", "Câmera", "Movimentos que dão ritmo"],
  ["insercao", "Imagem de inserção", "Fotos e vídeos por cima da fala"],
  ["motion", "Motion", "Animações nas cores do kit"],
  ["premiere", "Premiere", "2ª saída e MOGRTs"],
];
const FREQ: [string, string][] = [["pouco", "Pouco"], ["medio", "Médio"], ["muito", "Muito"]];
const LET_DESC: Partial<Record<TitleKind, string>> = {
  gancho: "Título nos 2 primeiros segundos.", palavra: "Palavra forte num selo colorido.", vazado: "Palavra grande e transparente no espaço vazio, com linha em itálico.", riscado: "Uma palavra é riscada e a certa entra embaixo (\"não é X, é Y\").",
  frase: "Frase curta ocupa a tela, com o fundo escurecido.", letreiro: "Palavra gigante com letras espaçadas.", lower_third: "Nome e cargo no canto.", cta: "Pedido de ação no final.",
  episodio: "Abertura de série sobre o quadro desfocado.", capitulo: "Roda numerada de capítulos.", data: "Data e lugar do vlog.", lista: "Tela de explicação com itens.", rec: "Moldura de câmera antiga.",
};
const MOT_DESC: Partial<Record<TitleKind, string>> = {
  numero: "Quando a fala cita um número ou valor.", grafico: "Quando a fala fala de crescimento.", checklist: "Quando a fala enumera passos ou dicas.",
  seta: "Para apontar algo no quadro.", relogio: "Quando a fala cita tempo (minutos, dias).", progresso: "Quando a fala cita porcentagem.",
};

/** imagem de exemplo para mostrar a inserção na prévia */
let placeholder: HTMLCanvasElement | null = null;
function demoImage() {
  if (placeholder) return placeholder;
  const c = document.createElement("canvas"); c.width = 900; c.height = 1200;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 900, 1200); gr.addColorStop(0, "#f2c38b"); gr.addColorStop(0.5, "#d96c4a"); gr.addColorStop(1, "#3b2a5a");
  g.fillStyle = gr; g.fillRect(0, 0, 900, 1200);
  g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(640, 300, 120, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(20,20,30,.55)"; g.beginPath(); g.moveTo(0, 1200); g.lineTo(0, 760); g.lineTo(300, 520); g.lineTo(560, 820); g.lineTo(760, 640); g.lineTo(900, 760); g.lineTo(900, 1200); g.fill();
  g.fillStyle = "#fff"; g.font = '700 64px "Inter", sans-serif'; g.fillText("IMAGEM", 60, 1110);
  placeholder = c;
  return c;
}

/** o que a prévia mostra: textos, zooms e inserções em momentos da fala de exemplo */
type Demo = { titles?: Title[]; zooms?: Zoom[]; insert?: OverlayMode; captions?: boolean; label?: string };
const demoTitle = (kind: TitleKind, start = DEMO_AT, len = DEMO_LEN): Title => ({ id: `d-${kind}`, kind, text: DEMO_TEXT[kind][0], sub: DEMO_TEXT[kind][1], start, end: start + len });

/** texto que melhor mostra o estilo na prévia */
const tituloDoEstilo = (e?: Estilo): TitleKind | null => {
  if (!e) return null;
  const x = e.textos;
  return x.rec ? "rec" : x.palavras === "letreiro" ? "letreiro" : x.abertura || (x.frase ? "frase" : x.nome ? "lower_third" : x.palavras ? "palavra" : null);
};
const demoDoEstilo = (e: Estilo): Demo => {
  const k = tituloDoEstilo(e);
  const titles: Title[] = [];
  if (k === "rec") titles.push({ ...demoTitle("rec"), start: 0, end: SAMPLE_LEN + 1 });
  else if (k === "episodio") titles.push(demoTitle("episodio", 0, 2.2));
  else if (k) titles.push(demoTitle(k));
  if (e.textos.palavras && k !== e.textos.palavras) titles.push(demoTitle(e.textos.palavras, 4.2, 1.8));
  return { titles, zooms: e.zoom ? [{ id: "z", start: 2.6, end: 3.6, scale: 110, tipo: "punch" }] : [] };
};

export default function KitPage() {
  const [kits, setKits] = useState<Row[] | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; username: string }[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [camada, setCamada] = useState<Camada>("identidade");
  const [foco, setFoco] = useState<string>("");
  const [wide, setWide] = useState(false);
  const [ver, setVer] = useState("01");

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: k }, { data: p }, { data: b }] = await Promise.all([
      s.from("av_style_kits").select("id,name,account_id,data").order("updated_at", { ascending: false }),
      s.from("ig_accounts").select("id,username"),
      s.from("design_projects").select("id,title,data").eq("kind", "marca").is("archived_at", null).order("updated_at", { ascending: false }),
    ]);
    setBrands(b || []);
    // kit ligado a uma marca do Design (marca.data.kit_id): cores e fonte de título vêm da marca, ao vivo
    const porKit = new Map((b || []).filter((m: any) => m.data?.kit_id).map((m: any) => [m.data.kit_id, m]));
    setKits(((k as Row[]) || []).map((x) => kitComMarca(x, x.id ? porKit.get(x.id) : null)));
    setProfiles(p || []);
  }, []);
  useEffect(() => {
    load();
    if (document.fonts) FONTS_LOAD.forEach((f) => document.fonts.load(f).catch(() => {}));
  }, [load]);

  async function save() {
    if (!edit) return;
    if (!edit.name.trim()) { setMsg("Dê um nome ao kit."); return; }
    const s = createClient();
    const row = { name: edit.name.trim(), account_id: edit.account_id || null, data: edit.data, updated_at: new Date().toISOString() };
    const { data, error } = edit.id ? await s.from("av_style_kits").update(row).eq("id", edit.id).select("id").single() : await s.from("av_style_kits").insert(row).select("id").single();
    if (error) { setMsg(error.message); return; }
    setEdit({ ...edit, id: data?.id || edit.id });
    setMsg("Kit salvo. Ele já aparece no Editor, no Premiere e para o Claude.");
    load();
  }
  async function del(id: string) {
    const nome = (typeof edit?.name === "string" && edit.name) || "sem nome";
    if (!(await apagarComLixeira({ tabela: "av_style_kits", filtro: { id }, oque: `o kit "${nome}"`, rotulo: `Kit de estilo: ${nome}`, link: "/audiovisual/kit" }))) return;
    setEdit(null); load();
  }
  const set = (path: string[], v: any) => setEdit((e) => {
    if (!e) return e;
    const data: any = structuredClone(e.data || {});
    let o = data;
    for (const k of path.slice(0, -1)) o = o[k] = o[k] || {};
    o[path[path.length - 1]] = v;
    return { ...e, data };
  });
  const toggle = (path: string[], list: string[] | undefined, v: string) => set(path, (list || []).includes(v) ? (list || []).filter((x) => x !== v) : [...(list || []), v]);
  const open = (k: Row) => { setMsg(null); setCamada("identidade"); setEdit(structuredClone({ ...k, data: { ...mergeKit(k.data), mogrts: { ...EMPTY.data.mogrts, ...(k.data?.mogrts || {}) } } })); };
  const d = edit ? mergeKit(edit.data) : null;
  // ?kit=<id> ou ?perfil=<id> (vindo de Perfis & marca): abre o kit direto
  const aberto = useRef(false);
  useEffect(() => {
    if (!kits || aberto.current) return;
    aberto.current = true;
    const q = new URLSearchParams(location.search);
    const k = kits.find((x) => x.id === q.get("kit")) || (q.get("perfil") ? kits.find((x) => x.account_id === q.get("perfil")) : null);
    if (k) open(k);
  }, [kits]); // eslint-disable-line react-hooks/exhaustive-deps
  async function ligarMarca(brandId: string) {
    if (!edit?.id) { setMsg("Salve o kit primeiro e depois ligue à marca."); return; }
    const b = brands.find((x) => x.id === brandId);
    if (!b) return;
    const s = createClient();
    // um kit por marca: a marca aponta para este kit (a ligação antiga, se houver, sai)
    const { error } = await s.from("design_projects").update({ data: { ...(b.data || {}), kit_id: edit.id, perfil_id: b.data?.perfil_id || edit.account_id || null }, updated_at: new Date().toISOString() }).eq("id", b.id);
    if (error) { setMsg(error.message); return; }
    const k = kitComMarca(edit, { ...b, data: { ...(b.data || {}), kit_id: edit.id } });
    setEdit(structuredClone({ ...k, data: { ...mergeKit(k.data), mogrts: { ...EMPTY.data.mogrts, ...(k.data?.mogrts || {}) } } }) as Row);
    setMsg(`Kit ligado à marca ${b.title}. Cores e fonte de título agora vêm dela.`);
    load();
  }

  // o que a prévia mostra na camada aberta
  const demo: Demo = useMemo(() => {
    if (!d) return {};
    if (camada === "lettering") { const k = (foco || "vazado") as TitleKind; return { titles: [k === "rec" ? { ...demoTitle("rec"), start: 0, end: SAMPLE_LEN + 1 } : demoTitle(k)], label: TITLE_LABEL[k] }; }
    if (camada === "motion") { const k = (foco || "numero") as TitleKind; return { titles: [demoTitle(k, 1, 3)], label: TITLE_LABEL[k] }; }
    if (camada === "camera") { const m = foco || "punch"; return { zooms: [{ id: "z", start: 1.2, end: m === "push" || m === "pull" ? 4.2 : 2.6, scale: m === "push" || m === "pull" ? 122 : 115, tipo: m }], label: CAMERA_MOVES.find((x) => x[0] === m)?.[1] }; }
    if (camada === "insercao") { const m = (foco || d.insercao?.modo || "cheia") as OverlayMode; return { insert: m, label: OVERLAY_MODES.find((x) => x[0] === m)?.[1] }; }
    if (camada === "legenda") return { titles: [] };
    const e = estiloByNum(d.estilo);
    return e ? demoDoEstilo(e) : { titles: [demoTitle("gancho", 0, 2)] };
  }, [camada, foco, d?.estilo, d?.insercao?.modo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <link rel="stylesheet" href={FONTS_CSS} />
      <PageHead kicker="AUDIOVISUAL · ACERVO" title="Kit de estilo"
        desc="A identidade de edição de cada cliente, em camadas: legenda, lettering, câmera, imagem de inserção e motion. O Editor usa o kit para sugerir cada camada nos pontos certos da fala." />

      {msg && <p className="text-sm text-mint mb-4">{msg}</p>}

      {!edit && (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-display text-lg font-extrabold">Kits</p>
            <button onClick={() => open(structuredClone(EMPTY))} className="chip"><I.plus className="w-3.5 h-3.5" />Novo kit</button>
          </div>
          {!kits ? <p className="text-sm text-fog mt-4">Carregando…</p> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {kits.map((k) => (
                <button key={k.id} onClick={() => open(k)} className="text-left rounded-xl border border-line p-4 hover:border-mint-dim">
                  <KitThumb kit={mergeKit(k.data)} />
                  <p className="font-semibold mt-3">{k.name}</p>
                  <p className="text-xs text-fog mt-0.5">{k.data?.estilo ? `Estilo ${k.data.estilo} · ` : ""}{k.data?.fontes?.titulo} · legenda {k.data?.legenda?.estilo} · câmera {CAMERA_LEVELS[mergeKit(k.data).camera?.intensidade ?? 0].toLowerCase()}</p>
                  {k.account_id && <p className="text-xs text-mint mt-1">@{profiles.find((p) => p.id === k.account_id)?.username}{k.marca ? ` · marca ${k.marca.title}` : ""}</p>}
                </button>
              ))}
              {!kits.length && <p className="text-sm text-fog">Nenhum kit ainda. Crie aqui ou peça ao Claude: &quot;crie o kit de estilo da ISYS&quot;.</p>}
            </div>
          )}
        </section>
      )}

      {!edit && <Catalogo ver={ver} setVer={setVer} wide={wide} setWide={setWide} kit={mergeKit(kits?.[0]?.data)} kitName={kits?.[0]?.name} />}

      {edit && d && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {CAMADAS.map(([k, l, h]) => (
              <button key={k} onClick={() => { setCamada(k); setFoco(""); }} title={h} className={`shrink-0 rounded-xl border px-3 py-2 text-left ${camada === k ? "border-mint bg-mint/5" : "border-line"}`}>
                <p className={`text-sm font-semibold ${camada === k ? "text-mint" : ""}`}>{l}</p><p className="text-[11px] text-fog">{h}</p>
              </button>
            ))}
          </div>
          <div className={`grid gap-4 ${wide ? "lg:grid-cols-[minmax(0,1fr)_480px]" : "lg:grid-cols-[minmax(0,1fr)_340px]"}`}>
            <section className="card p-5 space-y-5 min-w-0">
              {camada === "identidade" && (<>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Nome do kit"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="ISYS · Impacto amarelo" /></Field>
                  <Field label="Perfil">
                    <select className="input" value={edit.account_id || ""} onChange={(e) => setEdit({ ...edit, account_id: e.target.value || null })}>
                      <option value="">Nenhum</option>
                      {profiles.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
                    </select>
                  </Field>
                </div>
                <Group title="Estilo padrão do cliente">
                  <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-start">
                    <select className="input" value={d.estilo || ""} onChange={(e) => set(["estilo"], e.target.value || undefined)}>
                      <option value="">Nenhum (escolhe na hora de editar)</option>
                      {ESTILOS.map((e) => <option key={e.num} value={e.num}>{e.num} · {e.nome}</option>)}
                    </select>
                    {estiloByNum(d.estilo) && <button onClick={() => { const e = estiloByNum(d.estilo)!; set(["legenda"], { ...d.legenda, ...e.legenda }); set(["fontes"], { ...d.fontes, ...e.fontes }); set(["camera", "intensidade"], e.camera); }} className="chip">Copiar lettering e câmera do estilo</button>}
                  </div>
                  <p className="text-xs text-fog mt-1.5">{estiloByNum(d.estilo) ? estiloByNum(d.estilo)!.resumo : "O Editor e o Claude usam este estilo quando nada mais for pedido. As cores continuam as do kit."}</p>
                </Group>
                <Group title="Cores">
                  {/* a identidade vem da marca do Design, ao vivo (28/11); o kit guarda o que é de edição */}
                  {edit.marca ? (
                    <div className="rounded-xl border border-mint-dim bg-mint/5 p-3 flex items-center gap-3 flex-wrap">
                      <div className="flex gap-1">{(["destaque", "texto", "fundo"] as const).map((c) => <span key={c} className="w-7 h-7 rounded-lg border border-line" style={{ background: (d.cores as any)?.[c] }} />)}</div>
                      <p className="text-sm min-w-0 flex-1">Vêm da marca <b>{edit.marca.title}</b> no Design. Mudou lá, muda aqui.</p>
                      <Link href={`/design/marcas/${edit.marca.id}?etapa=cores`} className="chip">Editar na marca</Link>
                    </div>
                  ) : (<>
                  {!!brands.length && (
                    <select className="input mb-3" value="" onChange={(e) => ligarMarca(e.target.value)}>
                      <option value="">Ligar à marca criada no Design (cores e fonte ao vivo)…</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.title}{b.data?.kit_id && b.data.kit_id !== edit.id ? " (troca o kit dela)" : ""}</option>)}
                    </select>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {([["destaque", "Destaque"], ["texto", "Texto"], ["fundo", "Fundo"]] as const).map(([k, l]) => (
                      <label key={k} className="flex items-center gap-2 rounded-xl border border-line p-2">
                        <input type="color" className="w-9 h-9 rounded-lg bg-transparent shrink-0" value={(d.cores as any)?.[k] || "#000000"} onChange={(e) => set(["cores", k], e.target.value)} />
                        <span className="min-w-0"><span className="block text-xs text-fog">{l}</span><span className="block font-mono text-xs uppercase">{(d.cores as any)?.[k]}</span></span>
                      </label>
                    ))}
                  </div>
                  </>)}
                </Group>
                <Group title="Tipografia">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {edit.marca ? <Field label="Títulos, lettering e motion"><p className="input !text-fog">{d.fontes?.titulo} · da marca {edit.marca.title}</p></Field> : <FontPick label="Títulos, lettering e motion" value={d.fontes?.titulo || "Anton"} onChange={(v) => set(["fontes", "titulo"], v)} />}
                    <FontPick label="Legenda" value={d.fontes?.legenda || "Inter Black"} onChange={(v) => set(["fontes", "legenda"], v)} />
                  </div>
                </Group>
                <Group title="Corte e ritmo">
                  <p className="text-xs text-fog mb-2">Cortar entre frases, nunca no meio. Vício só sai com silêncio dos dois lados. Na tomada repetida fica a última limpa. Valem para o Editor, o plugin do Premiere e o plano do Claude.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Silêncio que corta (ms)"><input type="number" step={50} className="input" value={d.regras?.silencio_ms ?? 350} onChange={(e) => set(["regras", "silencio_ms"], +e.target.value)} /></Field>
                    <Field label="Folga na fala (ms)"><input type="number" step={10} className="input" value={d.regras?.folga_ms ?? 100} onChange={(e) => set(["regras", "folga_ms"], +e.target.value)} /></Field>
                    <Field label="Pausa natural que fica (ms)"><input type="number" step={50} className="input" value={d.regras?.batida_ms ?? 300} onChange={(e) => set(["regras", "batida_ms"], +e.target.value)} /></Field>
                    <Field label="Plano médio (s)"><input type="number" step={0.1} className="input" value={d.regras?.plano_medio_s ?? 1.3} onChange={(e) => set(["regras", "plano_medio_s"], +e.target.value)} /></Field>
                    <Field label="Primeiro corte até (s)"><input type="number" step={0.1} className="input" value={d.regras?.primeiro_corte_s ?? 0.8} onChange={(e) => set(["regras", "primeiro_corte_s"], +e.target.value)} /></Field>
                    <Field label="Corte máx. (s)"><input type="number" className="input" value={d.regras?.corte_max_s ?? 4} onChange={(e) => set(["regras", "corte_max_s"], +e.target.value)} /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Vícios de fala (separe por vírgula)"><input className="input" value={(d.regras?.vicios || []).join(", ")} onChange={(e) => set(["regras", "vicios"], e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
                  </div>
                </Group>
                <Group title="Som">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Trilha (dB)"><input type="number" className="input" value={d.regras?.trilha_db ?? -18} onChange={(e) => set(["regras", "trilha_db"], +e.target.value)} /></Field>
                    <Field label="Volume final (LUFS)"><input type="number" step={0.5} className="input" value={d.regras?.lufs ?? -14} onChange={(e) => set(["regras", "lufs"], +e.target.value)} /></Field>
                    <Field label="Pico máx. (dBTP)"><input type="number" step={0.5} className="input" value={d.regras?.pico_dbtp ?? -1.5} onChange={(e) => set(["regras", "pico_dbtp"], +e.target.value)} /></Field>
                    <Field label="Efeitos sonoros"><select className="input" value={d.regras?.sfx || "acao"} onChange={(e) => set(["regras", "sfx"], e.target.value)}><option value="acao">Só em ação visível</option><option value="nenhum">Nenhum</option></select></Field>
                  </div>
                </Group>
                <Group title="Vocabulário da marca">
                  <p className="text-xs text-fog mb-2">Nomes que a transcrição erra. Uma troca por linha, no formato errado = certo. O Editor corrige a legenda sozinho.</p>
                  <textarea className="input min-h-[84px] font-mono text-xs" placeholder={"isis = ISYS\nvinsthub = VINCIT HUB"} value={d.vocabulario || ""} onChange={(e) => set(["vocabulario"], e.target.value)} />
                </Group>
              </>)}

              {camada === "legenda" && (<>
                <Intro>A legenda é a fala escrita, palavra por palavra, sincronizada com o áudio. A maioria assiste sem som, então ela segura a atenção. Estilos mais usados no Instagram e no CapCut:</Intro>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CAPTION_STYLES.map(([v, full]) => { const [l, h] = [full.split(" (")[0], (full.match(/\((.*)\)/) || [])[1] || ""]; return (
                    <button key={v} onClick={() => set(["legenda", "estilo"], v)} className={`text-left rounded-xl border p-2.5 ${d.legenda?.estilo === v ? "border-mint bg-mint/5" : "border-line"}`}>
                      <p className="text-sm font-semibold">{l}</p><p className="text-[11px] text-fog leading-snug mt-0.5">{h}</p>
                    </button>); })}
                </div>
                <Group title="Animação de entrada">
                  <Chips options={CAPTION_ANIMS} value={d.legenda?.animacao || "pop"} onPick={(v) => set(["legenda", "animacao"], v)} />
                </Group>
                <div className="grid sm:grid-cols-4 gap-3">
                  <Field label={`Palavras por tela: ${d.legenda?.palavras_por_tela}`}><input type="range" min={1} max={6} value={d.legenda?.palavras_por_tela ?? 3} onChange={(e) => set(["legenda", "palavras_por_tela"], +e.target.value)} className="w-full accent-[var(--color-mint)]" /></Field>
                  {wide
                    ? <Field label={`Altura no 16:9: ${Math.round((d.legenda?.altura_h ?? 0.84) * 100)}%`}><input type="range" min={0.5} max={0.92} step={0.01} value={d.legenda?.altura_h ?? 0.84} onChange={(e) => set(["legenda", "altura_h"], +e.target.value)} className="w-full accent-[var(--color-mint)]" /></Field>
                    : <Field label={`Altura no 9:16: ${Math.round((d.legenda?.altura ?? 0.64) * 100)}%`}><input type="range" min={0.4} max={0.85} step={0.01} value={d.legenda?.altura ?? 0.64} onChange={(e) => set(["legenda", "altura"], +e.target.value)} className="w-full accent-[var(--color-mint)]" /></Field>}
                  <Field label="Posição"><select className="input" value={d.legenda?.posicao || "fixa"} onChange={(e) => set(["legenda", "posicao"], e.target.value)}><option value="fixa">Fixa</option><option value="variavel">Muda a cada frase</option></select></Field>
                  <Field label="Caixa alta"><select className="input" value={d.legenda?.caixa_alta ? "1" : "0"} onChange={(e) => set(["legenda", "caixa_alta"], e.target.value === "1")}><option value="1">Sim</option><option value="0">Não</option></select></Field>
                </div>
              </>)}

              {camada === "lettering" && (<>
                <Intro>Lettering é diferente da legenda: são textos de destaque que entram num momento da fala, ficam 2 a 3 segundos e saem. Marque os que o Editor pode sugerir e clique num cartão para ver na prévia.</Intro>
                <Freq value={d.lettering?.frequencia} onPick={(v) => set(["lettering", "frequencia"], v)} />
                <div className="grid sm:grid-cols-2 gap-2">
                  {LETTERING_KINDS.map((k) => <Opt key={k} on={(d.lettering?.tipos || []).includes(k)} foco={foco === k} title={TITLE_LABEL[k]} desc={LET_DESC[k] || ""} onToggle={() => toggle(["lettering", "tipos"], d.lettering?.tipos, k)} onFoco={() => setFoco(k)} />)}
                </div>
              </>)}

              {camada === "camera" && (<>
                <Intro>A câmera que acompanha a fala aproxima e afasta devagar a cada frase. Por cima dela, o Editor sugere movimentos pontuais nos momentos fortes.</Intro>
                <Group title="Câmera que acompanha a fala">
                  <div className="grid grid-cols-4 gap-1.5">
                    {CAMERA_LEVELS.map((l, i) => (
                      <button key={l} onClick={() => set(["camera", "intensidade"], i)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${(d.camera?.intensidade ?? 0) === i ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>
                    ))}
                  </div>
                </Group>
                <Group title="Movimentos que o Editor pode sugerir">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {CAMERA_MOVES.map(([k, l, h]) => <Opt key={k} on={(d.camera?.movimentos || []).includes(k)} foco={(foco || "punch") === k} title={l} desc={h} onToggle={() => toggle(["camera", "movimentos"], d.camera?.movimentos, k)} onFoco={() => setFoco(k)} />)}
                  </div>
                </Group>
              </>)}

              {camada === "insercao" && (<>
                <Intro>Imagens e vídeos por cima da fala, só em alguns trechos, para mostrar o que está sendo dito. O Editor sugere os pontos e busca nesta ordem: banco interno (Banco de mídia), Pexels, Pixabay e Openverse.</Intro>
                <Freq value={d.insercao?.frequencia} onPick={(v) => set(["insercao", "frequencia"], v)} />
                <Group title="Jeito padrão de entrar (clique para ver)">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {OVERLAY_MODES.map(([k, l]) => (
                      <button key={k} onClick={() => { set(["insercao", "modo"], k); setFoco(k); }} className={`text-left rounded-xl border p-2.5 ${(d.insercao?.modo || "cheia") === k ? "border-mint bg-mint/5" : "border-line"}`}><p className="text-sm font-semibold">{l}</p></button>
                    ))}
                  </div>
                </Group>
                <p className="text-xs text-fog">Para o banco interno, guarde as imagens na área &quot;Inserção&quot; do <Link href="/audiovisual/midia" className="text-mint">Banco de mídia</Link> com tags (ex.: vendas, loja, celular). Pexels e Pixabay entram quando as chaves gratuitas forem configuradas.</p>
              </>)}

              {camada === "motion" && (<>
                <Intro>Animações feitas no próprio HUB, nas cores e fontes do kit. São a alternativa à imagem de inserção quando a fala cita números, tempo, crescimento ou listas. Clique num cartão para ver.</Intro>
                <Freq value={d.motion?.frequencia} onPick={(v) => set(["motion", "frequencia"], v)} />
                <div className="grid sm:grid-cols-2 gap-2">
                  {MOTION_KINDS.map((k) => <Opt key={k} on={(d.motion?.tipos || []).includes(k)} foco={(foco || "numero") === k} title={TITLE_LABEL[k]} desc={MOT_DESC[k] || ""} onToggle={() => toggle(["motion", "tipos"], d.motion?.tipos, k)} onFoco={() => setFoco(k)} />)}
                </div>
              </>)}

              {camada === "premiere" && (<>
                <Intro>O Premiere é a segunda saída do Editor: no Editor, &quot;Enviar para o Premiere&quot; manda cortes, legendas, letterings, motion, câmera e imagens para o painel VINCIT HUB no Premiere, onde você ajusta à mão com mais recursos. Aqui ficam os arquivos .mogrt de cada tipo, no computador de quem edita. Tipo sem MOGRT entra como marcador com o texto e a instrução.</Intro>
                <div className="flex flex-wrap gap-2">
                  <a href="/downloads/vincit-hub-premiere.ccx" className="chip"><I.arrow className="w-3.5 h-3.5" />Baixar o plugin (.ccx)</a>
                  <Link href="/audiovisual/premiere" className="chip">Como usar no Premiere</Link>
                </div>
                <p className="text-xs font-semibold text-fog uppercase tracking-wide">Legenda</p>
                <Field label="Legenda"><input className="input font-mono text-xs" value={edit.data.mogrts?.legenda || ""} onChange={(e) => set(["mogrts", "legenda"], e.target.value)} placeholder="/Users/…/legenda.mogrt" /></Field>
                <p className="text-xs font-semibold text-fog uppercase tracking-wide">Lettering</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {LETTERING_KINDS.map((k) => (
                    <Field key={k} label={TITLE_LABEL[k]}><input className="input font-mono text-xs" value={edit.data.mogrts?.[k] || ""} onChange={(e) => set(["mogrts", k], e.target.value)} placeholder="/Users/…/arquivo.mogrt" /></Field>
                  ))}
                </div>
                <p className="text-xs font-semibold text-fog uppercase tracking-wide">Motion</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {MOTION_KINDS.map((k) => (
                    <Field key={k} label={TITLE_LABEL[k]}><input className="input font-mono text-xs" value={edit.data.mogrts?.[k] || ""} onChange={(e) => set(["mogrts", k], e.target.value)} placeholder="/Users/…/arquivo.mogrt" /></Field>
                  ))}
                </div>
              </>)}

              <div className="flex gap-2 pt-2 border-t border-line">
                <button onClick={save} className="px-4 py-2 rounded-xl bg-mint text-ink font-semibold text-sm">Salvar kit</button>
                <button onClick={() => { setEdit(null); setMsg(null); }} className="px-4 py-2 rounded-xl border border-line text-sm">Voltar</button>
                {edit.id && <Link href="/audiovisual/editor" className="px-4 py-2 rounded-xl border border-line text-sm">Abrir o Editor</Link>}
                {edit.id && <button onClick={() => del(edit.id!)} className="ml-auto px-3 py-2 rounded-xl text-sm text-red-400" title="Apagar kit"><I.trash className="w-4 h-4" /></button>}
              </div>
            </section>

            <aside className="card p-4 lg:sticky lg:top-4 self-start">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Prévia ao vivo</p>
                <div className="flex rounded-lg border border-line overflow-hidden text-[11px]">
                  {[[false, "9:16"], [true, "16:9"]].map(([v, l]) => <button key={String(v)} onClick={() => setWide(v as boolean)} className={`px-2 py-1 font-semibold ${wide === v ? "bg-mint/10 text-mint" : "text-fog"}`}>{l as string}</button>)}
                </div>
              </div>
              <Preview kit={d} wide={wide} demo={demo} estilo={camada === "identidade" ? estiloByNum(d.estilo) : undefined} />
              <p className="text-[11px] text-fog mt-2">{demo.label ? `${demo.label}: entra num momento da fala e sai.` : "A prévia repete uma fala de exemplo."} Textos e animações nunca ficam fixos o vídeo todo.</p>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

/** prévia animada: fundo com o gradiente do kit, a fala de exemplo e a camada escolhida no momento certo */
function Preview({ kit, wide, estilo, demo }: { kit: Kit; wide: boolean; estilo?: Estilo; demo: Demo }) {
  const ref = useRef<HTMLCanvasElement>(null);
  setFormat(wide ? "16:9" : "9:16");
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    setFormat(wide ? "16:9" : "9:16");
    const ctx = c.getContext("2d")!;
    const screens = captionScreens(sampleWords, kit.legenda?.estilo === "palavra" ? 1 : kit.legenda?.palavras_por_tela || 3);
    const cam = speechCamera(sampleWords, kit.camera?.intensidade ?? 0);
    // 4 trechos falsos para a transição aparecer nos cortes
    const q = SAMPLE_LEN / 4;
    const titles = demo.titles || [];
    const base: Project = { segments: [0, 1, 2, 3].map((i) => ({ id: `s${i}`, mediaId: "x", in: 0, out: q })), titles, zooms: demo.zooms || [], captionsOn: true, edits: {} };
    const p: Project = estilo ? { ...projetoDoEstilo(base, estilo), captionsOn: estilo.captions } : base;
    const ov: Overlay | null = demo.insert ? { id: "o", mediaId: "x", start: 1.3, end: 3.9, in: 0, mode: demo.insert } : null;
    const img = demo.insert ? demoImage() : null;
    let raf = 0;
    const t0 = performance.now();
    const frame = () => {
      const t = ((performance.now() - t0) / 1000) % SAMPLE_LEN;
      const z = zoomAt(p, t, cam);
      const fx = shakeAt(p, t);
      ctx.save();
      ctx.translate(W / 2 + fx.x, H / 2 + fx.y); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      if (fx.blur) ctx.filter = `blur(${fx.blur}px)`;
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#8a6a52"); g.addColorStop(0.55, "#3c4650"); g.addColorStop(1, kit.cores?.fundo || "#0c0c0d");
      ctx.fillStyle = g; ctx.fillRect(-80, -80, W + 160, H + 160);
      // silhueta de quem fala, para a câmera e os textos terem referência
      ctx.fillStyle = "rgba(255,255,255,.09)";
      const px = wide ? W * 0.62 : W / 2;
      ctx.beginPath(); ctx.arc(px, H * 0.4, wide ? 150 : 190, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px, H * 0.8, wide ? 330 : 420, wide ? 300 : 360, 0, Math.PI, 0); ctx.fill();
      ctx.restore();
      if (ov && img && t >= ov.start && t < ov.end) drawInsert(ctx, ov, img, img.width, img.height, t);
      drawOverlays(ctx, p, screens, t, kit);
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = '500 30px "JetBrains Mono", monospace'; ctx.textBaseline = "top";
      ctx.fillText(`${t.toFixed(1)}s · câmera ${Math.round(z * 100)}%`, 40, 40);
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [kit, wide, estilo, demo]);
  return <canvas key={wide ? "h" : "v"} ref={ref} width={W} height={H} className={`w-full rounded-xl mt-2 bg-ink ${wide ? "aspect-video" : "aspect-[9/16]"}`} />;
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-soft max-w-3xl">{children}</p>;
}
function Chips({ options, value, onPick }: { options: [string, string][]; value: string; onPick: (v: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{options.map(([v, l]) => <button key={v} onClick={() => onPick(v)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${value === v ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>)}</div>;
}
function Freq({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  return <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-fog">Quantas vezes o Editor sugere:</span><Chips options={FREQ} value={value || "medio"} onPick={onPick} /></div>;
}
function Opt({ on, foco, title, desc, onToggle, onFoco }: { on: boolean; foco: boolean; title: string; desc: string; onToggle: () => void; onFoco: () => void }) {
  return (
    <div onClick={onFoco} className={`cursor-pointer rounded-xl border p-3 flex gap-2.5 items-start ${foco ? "border-mint bg-mint/5" : "border-line hover:border-mint-dim"}`}>
      <input type="checkbox" checked={on} onClick={(e) => e.stopPropagation()} onChange={onToggle} className="mt-1 accent-[var(--color-mint)]" title="O Editor pode sugerir" />
      <span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="block text-[11px] text-fog leading-snug mt-0.5">{desc}</span></span>
    </div>
  );
}

/** catálogo fixo numerado: cada estilo com a definição completa e a prévia */
function Catalogo({ ver, setVer, wide, setWide, kit, kitName }: { ver: string; setVer: (v: string) => void; wide: boolean; setWide: (v: boolean) => void; kit: Kit; kitName?: string }) {
  const e = estiloByNum(ver)!;
  return (
    <section id="catalogo" className="card p-5 mt-4">
      <p className="font-display text-lg font-extrabold">Catálogo de estilos</p>
      <p className="text-sm text-fog mt-1 max-w-3xl">Estilos fixos e numerados para pedir na hora de criar: &quot;este Reels no estilo 03&quot;. Cada um define lettering, cortes, câmera, transição, cor e textos automáticos. As cores vêm do kit do cliente. Feitos a partir das edições mais elaboradas do Instagram e dos canais do YouTube que você acompanha.</p>
      <div className={`grid gap-4 mt-4 ${wide ? "lg:grid-cols-[minmax(0,1fr)_480px]" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 content-start min-w-0">
          {ESTILOS.map((x) => (
            <button key={x.num} onClick={() => setVer(x.num)} className={`text-left rounded-xl border p-3 ${ver === x.num ? "border-mint bg-mint/5" : "border-line hover:border-mint-dim"}`}>
              <p className="flex items-baseline gap-2"><span className="font-mono text-mint text-lg font-semibold">{x.num}</span><span className="font-semibold">{x.nome}</span></p>
              <p className="text-xs text-fog mt-1 leading-snug">{x.uso}</p>
            </button>
          ))}
        </div>
        <aside className="lg:sticky lg:top-4 self-start min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold"><span className="font-mono text-mint mr-1.5">{e.num}</span>{e.nome}</p>
            <div className="flex rounded-lg border border-line overflow-hidden text-[11px] shrink-0">
              {[[false, "9:16"], [true, "16:9"]].map(([v, l]) => <button key={String(v)} onClick={() => setWide(v as boolean)} className={`px-2 py-1 font-semibold ${wide === v ? "bg-mint/10 text-mint" : "text-fog"}`}>{l as string}</button>)}
            </div>
          </div>
          <Preview kit={kitComEstilo(kit, e)} wide={wide} estilo={e} demo={demoDoEstilo(e)} />
          <p className="text-sm text-soft mt-3">{e.resumo}</p>
          <div className="flex flex-wrap gap-1 mt-2">{estiloTags(e).map((t) => <span key={t} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-fog">{t}</span>)}</div>
          <dl className="text-xs mt-3 space-y-1">
            <div><dt className="inline text-fog">Lettering: </dt><dd className="inline">{e.fontes.titulo} nos títulos, {e.fontes.legenda} na legenda, {e.legenda.palavras_por_tela} palavras por tela{e.legenda.caixa_alta ? ", caixa alta" : ""}</dd></div>
            <div><dt className="inline text-fog">Bom para: </dt><dd className="inline">{e.uso}</dd></div>
            <div><dt className="inline text-fog">Referência: </dt><dd className="inline">{e.referencia}</dd></div>
          </dl>
          <p className="text-[11px] text-fog mt-2">Prévia com as cores do kit {kitName ? `"${kitName}"` : "padrão"}.</p>
        </aside>
      </div>
    </section>
  );
}

function KitThumb({ kit }: { kit: Kit }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">{(["destaque", "texto", "fundo"] as const).map((c) => <span key={c} className="w-5 h-5 rounded-md border border-line" style={{ background: kit.cores?.[c] }} />)}</div>
      <span className="text-lg leading-none" style={{ fontFamily: `"${(kit.fontes?.titulo || "Anton").replace(/\s+(Black|ExtraBold|Bold)$/i, "")}"`, color: kit.cores?.destaque }}>Aa</span>
    </div>
  );
}

function FontPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const m = value.match(/^(.*?)(\s+(?:Bold|ExtraBold|Black))?$/i);
  const fam = FONTS.find((f) => f.toLowerCase() === (m?.[1] || "").toLowerCase()) || m?.[1] || "Inter";
  const peso = m?.[2] || "";
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs text-fog">{label}</p>
      <p className="text-2xl mt-1 truncate" style={{ fontFamily: `"${fam}"`, fontWeight: /black/i.test(peso) ? 900 : /extrabold/i.test(peso) ? 800 : /bold/i.test(peso) ? 700 : undefined }}>Venda mais 70%</p>
      <div className="grid grid-cols-[1fr_auto] gap-2 mt-2">
        <select className="input" value={fam} onChange={(e) => onChange(e.target.value + peso)}>
          {!FONTS.includes(fam) && <option value={fam}>{fam}</option>}
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="input !w-auto" value={peso} onChange={(e) => onChange(fam + e.target.value)}>
          {PESOS.map((p) => <option key={p} value={p}>{p.trim() || "Normal"}</option>)}
        </select>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase mb-2">{title}</p>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-fog">{label}</span><div className="mt-1">{children}</div></label>;
}
