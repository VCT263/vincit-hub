"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { aiFetch, AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { apagarComLixeira } from "@/lib/lixeira";
import MotionStudio, { MotionThumb, type MotionDoc } from "@/components/av/MotionStudio";
import { MOTION_FORMAT_LABEL, motionDuration, normalizeSpec, specDoModelo, type MotionFormat } from "@/lib/motion/engine";
import MotionHtml, { CapaMotion, type HtmlRow } from "@/components/av/MotionHtml";
import { MODELOS_HTML } from "@/lib/motion/modelos-html";
import { ESTILOS_TEXTO } from "@/lib/motion/estilos-texto";
import { infoComposicao } from "@/lib/motion/html";

/** motion em HTML (HyperFrames, 27/11): brief do Claude → peça. Os motions antigos de cenas seguem no MotionStudio. */
const ehHtml = (r: { spec: any }) => r.spec?.motor === "html";
const SEM = "__sem_pasta", NOVA = "__nova_pasta";
/** corpo do pedido à fila para retomar a etapa que ficou esperando */
const corpoPendente = (r: Row) => {
  const etapa = r.spec?.pendente?.etapa;
  if (!ehHtml(r) || !etapa) return { task: "motion", motion_id: r.id, pedido: r.pedido, formato: r.formato, account_id: r.account_id };
  return { task: etapa === "brief" ? "motion_brief" : "motion_html", etapa, motion_id: r.id, pedido: r.pedido, formato: r.formato, account_id: r.account_id, ajuste: r.spec?.pendente?.ajuste || undefined, variacao: r.spec?.pendente?.variacao || undefined, base: etapa === "html" ? { brief: r.spec?.brief } : undefined };
};

/** biblioteca de animações (ideia do @gabeberaldo, 28/11): direções de movimento para as versões de uma peça */
const DIRECOES = [
  { nome: "Rápida", texto: "entrada forte e rápida: cortes secos, texto entra com escala e desfoque de movimento, ritmo acelerado, nada parado mais de 1 s." },
  { nome: "Elegante", texto: "calma e elegante: fades e deslizes longos, curvas suaves (ease-in-out), bastante respiro na tela, movimentos pequenos." },
  { nome: "Cinética", texto: "tipografia cinética: as palavras se montam uma a uma ou letra a letra, cada uma com um ponto de ancoragem diferente (girar, esticar, cair)." },
  { nome: "Camadas", texto: "editorial em camadas: formas, cartões e blocos de cor de destaque deslizam em camadas com paralaxe, o texto aparece por trás de uma máscara." },
  { nome: "Contraste", texto: "contraste máximo: troca de fundo a cada cena (cor da marca e escuro), texto grande em caixa alta, transições de corte com flash curto." },
  { nome: "Mínima", texto: "mínima: uma só linha de movimento contínuo (traço ou forma que conduz o olho), texto pequeno e preciso, muito espaço vazio." },
];

type Row = { id: string; titulo: string; formato: MotionFormat; spec: any; status: "pedido" | "pronto"; pedido?: string; ai_request_id?: string | null; account_id?: string | null; kit_id?: string | null; brand_id?: string | null; pasta?: string | null; ec_action_id?: string | null; updated_at: string };

export default function MotionPage() {
  return <Suspense><Motion /></Suspense>;
}

function Motion() {
  const q = useSearchParams();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "aprovado" | "descartado">("todas");
  const [open, setOpen] = useState<Partial<MotionDoc> | null>(null);
  const [openHtml, setOpenHtml] = useState<HtmlRow | null>(null);
  const [key, setKey] = useState(0);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [pedido, setPedido] = useState("");
  const [formato, setFormato] = useState<MotionFormat>("9:16");
  // ?perfil=<id> (vindo de Perfis & marca): mostra só os motions do perfil e já cria para ele
  const [perfilF, setPerfilF] = useState(() => q.get("perfil") || "");
  const [conta, setConta] = useState(() => q.get("perfil") || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [falhas, setFalhas] = useState<Record<string, string>>({});
  // abas no topo (28/11): Meus motions (a lista) e Criar motion (pedido ao Claude, modelos e estilos)
  const [aba, setAba] = useState<"meus" | "criar">(() => { if (q.get("c")) return "criar"; try { return localStorage.getItem("motion-aba") === "criar" ? "criar" : "meus"; } catch { return "meus"; } });
  const trocarAba = (k: "meus" | "criar") => { setAba(k); try { localStorage.setItem("motion-aba", k); } catch {} };
  // seleção de vários motions para mandar à lixeira de uma vez (28/11)
  const [selecao, setSelecao] = useState<Set<string> | null>(null);
  const marcar = (id: string) => setSelecao((s) => { const n = new Set(s || []); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const tentados = useRef(new Set<string>());
  // pastas (28/11): agrupam os motions por campanha, coleção ou ação. "" = todas, SEM = sem pasta
  const [pasta, setPasta] = useState<string>(() => { const u = q.get("pasta"); if (u) return u.slice(0, 60); try { return localStorage.getItem("motion-pasta") || ""; } catch { return ""; } });
  // pasta ligada a uma campanha do E-commerce (vem de ?campanha=&pasta= ou dos motions que já estão nela)
  const [campanhaUrl] = useState<{ id: string; pasta: string } | null>(() => { const id = q.get("campanha"), n = q.get("pasta"); return id && n ? { id, pasta: n.slice(0, 60) } : null; });
  const [pastasNovas, setPastasNovas] = useState<string[]>([]);
  useEffect(() => { try { localStorage.setItem("motion-pasta", pasta); } catch {} }, [pasta]);
  const pastas = Array.from(new Set([...((rows || []).map((r) => r.pasta).filter(Boolean) as string[]), ...pastasNovas, ...(campanhaUrl ? [campanhaUrl.pasta] : [])])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const pastaAtual = pasta && pasta !== SEM ? pasta : null;
  const campanhaDa = (n: string | null) => (!n ? null : campanhaUrl?.pasta === n ? campanhaUrl.id : (rows || []).find((r) => r.pasta === n && r.ec_action_id)?.ec_action_id || null);
  const campanhaAtual = campanhaDa(pastaAtual);
  function novaPasta(): string | null {
    const nome = window.prompt("Nome da pasta (ex.: Natal ISYS, Coleção Jeanswear)")?.trim().slice(0, 60);
    if (!nome) return null;
    setPastasNovas((x) => (x.includes(nome) ? x : [...x, nome]));
    return nome;
  }
  async function mover(r: Row, destino: string) {
    let nome: string | null = destino === SEM ? null : destino;
    if (destino === NOVA) { nome = novaPasta(); if (!nome) return; }
    const ec_action_id = campanhaDa(nome);
    setRows((rs) => (rs || []).map((x) => (x.id === r.id ? { ...x, pasta: nome, ec_action_id } : x)));
    const { error } = await createClient().from("av_motions").update({ pasta: nome, ec_action_id }).eq("id", r.id);
    if (error) { setMsg(error.message); load(); }
  }

  const load = useCallback(async () => {
    const { data } = await createClient().from("av_motions").select("id,titulo,formato,spec,status,pedido,ai_request_id,account_id,kit_id,brand_id,pasta,ec_action_id,updated_at").order("updated_at", { ascending: false }).limit(200);
    setRows((data as any) || []);
    return (data as Row[]) || [];
  }, []);
  useEffect(() => {
    load().then((list) => {
      const id = q.get("id");
      const r = id && list.find((x) => x.id === id);
      if (r && r.status === "pronto") abrir(r);
    });
    createClient().from("ig_accounts").select("id,username").order("username").then(({ data }) => setAccounts((data as any) || []));
    // veio do card do Quadro (?c=): o pedido do Motion escrito no card já entra no campo
    const c = q.get("c");
    if (c) createClient().from("content_ideas").select("title,motion_brief,account_id").eq("id", c).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (data.motion_brief) setPedido((p) => p || `${data.motion_brief}\n\n(Card do Quadro: ${data.title})`);
      if (data.account_id) setConta((x) => x || data.account_id);
    });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // pedidos que ficaram esperando (a pessoa fechou a página): volta a perguntar à fila
  useEffect(() => {
    const pend = (rows || []).filter((r) => r.status === "pedido" && r.ai_request_id);
    if (!pend.length) return;
    const iv = setInterval(async () => {
      let changed = false;
      for (const r of pend) {
        const res = await fetch("/api/av/motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...corpoPendente(r), _ai_request: r.ai_request_id }) }).catch(() => null);
        if (res && res.status !== 202) changed = true;
      }
      if (changed) { const list = await load(); setOpenHtml((o) => (o ? (list.find((x) => x.id === o.id) as any) || o : o)); }
    }, 15000);
    return () => clearInterval(iv);
  }, [rows, load]);

  // pedido que não chegou à fila (a página fechou ou deu erro antes de ganhar número): manda de novo uma vez
  const reenviar = useCallback(async (r: Row) => {
    tentados.current.add(r.id);
    setFalhas((f) => { const { [r.id]: _, ...rest } = f; return rest; });
    const res = await fetch("/api/av/motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpoPendente(r)) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 202 && j.request_id) { await createClient().from("av_motions").update({ ai_request_id: j.request_id }).eq("id", r.id); load(); return; }
    if (res?.ok) { load(); return; }
    setFalhas((f) => ({ ...f, [r.id]: j.error || "Não chegou ao Claude." }));
  }, [load]);
  useEffect(() => {
    const presos = (rows || []).filter((r) => r.status === "pedido" && !r.ai_request_id && r.pedido && !tentados.current.has(r.id) && Date.now() - new Date(r.updated_at).getTime() > 60000);
    presos.forEach((r) => { reenviar(r); });
  }, [rows, reenviar]);

  function abrir(r: Row) {
    if (ehHtml(r)) { setOpen(null); setOpenHtml({ id: r.id, titulo: r.titulo, spec: r.spec, status: r.status, account_id: r.account_id, kit_id: r.kit_id }); setKey((k) => k + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setOpenHtml(null);
    setOpen({ id: r.id, titulo: r.titulo, spec: normalizeSpec(r.spec), kit_id: r.kit_id, brand_id: r.brand_id, account_id: r.account_id });
    setKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function novo() { setOpenHtml(null); setOpen({ titulo: "Novo motion", spec: specDoModelo("abertura") }); setKey((k) => k + 1); }

  /** manda uma etapa do motion em HTML para a fila e acompanha até voltar */
  async function etapa(motionId: string, corpo: any, aviso: string) {
    const s = createClient();
    setMsg(aviso);
    const grab = (e: Event) => { const d = (e as CustomEvent<AIQueueEvent>).detail; if (d.state === "waiting") { s.from("av_motions").update({ ai_request_id: d.id }).eq("id", motionId).then(() => load()); window.removeEventListener(AI_QUEUE_EVENT, grab); } };
    window.addEventListener(AI_QUEUE_EVENT, grab);
    const res = await aiFetch("/api/av/motion", corpo);
    window.removeEventListener(AI_QUEUE_EVENT, grab);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j.error || "O Claude não respondeu ainda. O pedido continua na lista."); load(); return; }
    const list = await load();
    const r = list.find((x) => x.id === motionId);
    if (r) abrir(r);
    setMsg(corpo.etapa === "brief" ? `Brief "${j.titulo}" pronto. Confira, responda o que faltar e aprove.` : `Motion "${j.titulo}" pronto. Troque textos e cores e exporte.`);
  }

  async function pedir() {
    if (!pedido.trim()) { setMsg("Escreva o que o motion precisa mostrar."); return; }
    const s = createClient();
    const { data: kit } = await s.from("av_style_kits").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const texto = pedido.trim();
    const spec = { motor: "html", etapa: "brief", formato, pendente: { etapa: "brief" } };
    const { data, error } = await s.from("av_motions").insert({ titulo: "Pedido: " + texto.slice(0, 50), formato, spec, status: "pedido", pedido: texto, origem: "pedido", pasta: pastaAtual, ec_action_id: campanhaAtual, account_id: conta || null, kit_id: kit?.id || null }).select("id").single();
    if (error) { setMsg(error.message); return; }
    setPedido(""); load(); trocarAba("meus");
    await etapa(data.id, { task: "motion_brief", etapa: "brief", motion_id: data.id, pedido: texto, formato, account_id: conta || null }, "Pedido enviado. Primeiro o Claude refina o pedido num brief para você aprovar.");
  }
  async function refinar(r: HtmlRow, ajuste: string) {
    const row = rows?.find((x) => x.id === r.id); if (!row) return;
    const spec = { ...r.spec, pendente: { etapa: "brief", ajuste } };
    await createClient().from("av_motions").update({ spec, status: "pedido", ai_request_id: null }).eq("id", r.id);
    setOpenHtml(null); load();
    await etapa(r.id, { task: "motion_brief", etapa: "brief", motion_id: r.id, pedido: row.pedido || r.titulo, formato: row.formato, account_id: row.account_id, ajuste }, "Ajuste enviado. O Claude refaz o brief.");
  }
  async function produzir(r: HtmlRow, ajuste: string) {
    const row = rows?.find((x) => x.id === r.id); if (!row) return;
    const spec = { ...r.spec, pendente: { etapa: "html", ajuste } };
    await createClient().from("av_motions").update({ spec, status: "pedido", ai_request_id: null }).eq("id", r.id);
    setOpenHtml(null); load();
    await etapa(r.id, { task: "motion_html", etapa: "html", motion_id: r.id, pedido: row.pedido || r.titulo, formato: row.formato, account_id: row.account_id, ajuste: ajuste || undefined, base: { brief: r.spec?.brief } }, r.spec?.html ? "Ajuste enviado. O Claude refaz a peça." : "Brief aprovado. O Claude escreve a peça e ela aparece aqui.");
  }
  /** gera versões da mesma peça em direções de movimento diferentes, para aprovar ou descartar */
  async function versoes(r: Row) {
    const brief = r.spec?.brief;
    if (!brief?.cenas?.length) { setMsg("Aprove o brief desta peça antes de gerar versões."); return; }
    const nTxt = window.prompt(`Quantas versões de "${r.titulo}"? (2 a 6)\nDireções: ${DIRECOES.map((d) => d.nome).join(", ")}`, "4");
    const n = Math.max(2, Math.min(6, parseInt(nTxt || "", 10) || 0));
    if (!nTxt) return;
    const s = createClient();
    const base = r.titulo.replace(/ · versão .*$/, "");
    const novos: { id: string; d: (typeof DIRECOES)[number] }[] = [];
    for (const d of DIRECOES.slice(0, n)) {
      const spec = { motor: "html", etapa: "brief", formato: r.formato, brief, versao_de: r.spec?.versao_de || r.id, direcao: d.nome, pendente: { etapa: "html", variacao: d.texto } };
      const { data, error } = await s.from("av_motions").insert({ titulo: `${base} · versão ${d.nome}`.slice(0, 80), formato: r.formato, spec, status: "pedido", pedido: r.pedido || r.titulo, origem: "pedido", pasta: r.pasta || null, ec_action_id: r.ec_action_id || null, account_id: r.account_id || null, kit_id: r.kit_id || null }).select("id").single();
      if (error) { setMsg(error.message); break; }
      novos.push({ id: data.id, d });
    }
    if (!novos.length) return;
    if (r.pasta && pasta !== "" && pasta !== r.pasta) setPasta(r.pasta);
    load();
    setMsg(`${novos.length} versões de "${base}" foram para o Claude (${novos.map((x) => x.d.nome).join(", ")}). Elas aparecem na lista; aprove as boas e descarte as outras, e o Claude passa a seguir as aprovadas.`);
    await Promise.all(novos.map(({ id, d }) => {
      const grab = (e: Event) => { const det = (e as CustomEvent<AIQueueEvent>).detail; if (det.state === "waiting") { s.from("av_motions").update({ ai_request_id: det.id }).eq("id", id).then(() => load()); window.removeEventListener(AI_QUEUE_EVENT, grab); } };
      return aiFetch("/api/av/motion", { task: "motion_html", etapa: "html", motion_id: id, pedido: r.pedido || r.titulo, formato: r.formato, account_id: r.account_id, variacao: d.texto, base: { brief } }).catch(() => null);
    }));
    load();
  }
  async function usarModelo(id: string) {
    const m = [...MODELOS_HTML, ...ESTILOS_TEXTO].find((x) => x.id === id); if (!m) return;
    const { data, error } = await createClient().from("av_motions").insert({ titulo: `${m.nome} · ${m.marca}`, formato: "9:16", spec: { motor: "html", etapa: "pronto", html: m.html, valores: {}, modelo: m.id }, status: "pronto", origem: "hub", pasta: pastaAtual, ec_action_id: campanhaAtual }).select("id").single();
    if (error) { setMsg(error.message); return; }
    trocarAba("meus");
    const list = await load();
    const r = list.find((x) => x.id === data.id);
    if (r) abrir(r);
  }

  /** aprovada ou descartada (ideia do @gabeberaldo): fica no spec e vira referência no pedido das próximas peças */
  async function avaliar(r: Row, v: "aprovado" | "descartado") {
    const nova = r.spec?.avaliacao === v ? null : v;
    const spec = { ...(r.spec || {}), avaliacao: nova || undefined };
    setRows((rs) => (rs || []).map((x) => (x.id === r.id ? { ...x, spec } : x)));
    await createClient().from("av_motions").update({ spec }).eq("id", r.id);
  }
  async function excluir(r: Row) {
    const ok = await apagarComLixeira({ tabela: "av_motions", filtro: { id: r.id }, oque: `o motion "${r.titulo}"`, rotulo: `Motion: ${r.titulo}`, link: "/audiovisual/motion" });
    if (ok) { if (open?.id === r.id) setOpen(null); if (openHtml?.id === r.id) setOpenHtml(null); load(); }
  }
  async function excluirSelecionados() {
    const ids = Array.from(selecao || []); if (!ids.length) return;
    const nomes = (rows || []).filter((r) => selecao?.has(r.id)).map((r) => r.titulo);
    const ok = await apagarComLixeira({ tabela: "av_motions", filtro: { id: ids }, oque: ids.length === 1 ? `o motion "${nomes[0]}"` : `${ids.length} motions`, rotulo: ids.length === 1 ? `Motion: ${nomes[0]}` : `${ids.length} motions: ${nomes.slice(0, 3).join(", ")}${nomes.length > 3 ? "…" : ""}`, link: "/audiovisual/motion" });
    if (ok) { if (open?.id && selecao?.has(open.id)) setOpen(null); if (openHtml && selecao?.has(openHtml.id)) setOpenHtml(null); setSelecao(null); setMsg(`${ids.length} ${ids.length === 1 ? "motion foi" : "motions foram"} para a lixeira (15 dias para recuperar).`); load(); }
  }
  async function duplicar(r: Row) {
    const { id, updated_at, ai_request_id, ...rest } = r as any;
    await createClient().from("av_motions").insert({ ...rest, titulo: r.titulo + " (cópia)", status: "pronto", origem: "hub" });
    load();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[11px] tracking-[.2em] text-mint uppercase">Audiovisual · Pós-produção</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">Motion</h1>
          <p className="text-sm text-fog mt-1 max-w-2xl">Vinhetas, peças animadas, nome na tela e transições em 9:16, 16:9 ou 1:1, com as cores do kit ou da marca do Design. O motion entra no <Link href="/audiovisual/editor" className="text-mint">Editor</Link> por cima do vídeo ou como clipe, e o Editor cria motion a partir do vídeo.</p>
        </div>
        <button onClick={novo} className="btn btn-mint"><I.plus className="w-4 h-4" />Novo motion</button>
      </div>
      <div className="flex gap-1 mb-4 border-b border-line" role="tablist">
        {([["meus", `Meus motions${rows ? ` (${rows.length})` : ""}`], ["criar", "Criar motion"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => trocarAba(k)} className={`px-4 py-2 -mb-px text-sm font-semibold border-b-2 ${aba === k ? "border-mint text-mint" : "border-transparent text-fog hover:text-white"}`}>{l}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-mint mb-3">{msg}</p>}

      {openHtml && (
        <div className="mb-5">
          <MotionHtml key={key} row={openHtml} onProduzir={produzir} onRefinar={refinar} onSaved={() => load()} />
        </div>
      )}
      {open && (
        <div className="mb-5">
          <MotionStudio key={key} initial={open} onSaved={() => load()} onUse={(d) => router.push(`/audiovisual/editor?motion=${d.id}`)} />
        </div>
      )}

      {aba === "criar" && <>
      <section className="card p-5 mb-4">
        <p className="font-display text-lg font-extrabold">Pedir motion ao Claude</p>
        <p className="text-sm text-fog mt-1">Descreva a peça do seu jeito: para quê, o que aparece, o texto e o clima. O Claude primeiro refina o pedido num brief (ideia, visual da marca, movimento e cena a cena) para você aprovar; depois escreve a peça.</p>
        <textarea rows={3} value={pedido} onChange={(e) => setPedido(e.target.value)} className="input mt-3 text-sm" placeholder="Ex.: vinheta de 3 s para abrir os vídeos da campanha de Natal da ISYS, com o logo e a frase 'Natal com a sua cara'." />
        <div className="flex flex-wrap gap-2 mt-2">
          <select value={formato} onChange={(e) => setFormato(e.target.value as MotionFormat)} className="input !w-auto text-sm">
            {(Object.keys(MOTION_FORMAT_LABEL) as MotionFormat[]).map((f) => <option key={f} value={f}>{MOTION_FORMAT_LABEL[f]}</option>)}
          </select>
          <select value={conta} onChange={(e) => setConta(e.target.value)} className="input !w-auto text-sm">
            <option value="">Sem perfil</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}
          </select>
          <button onClick={pedir} className="btn btn-mint ml-auto"><I.spark className="w-4 h-4" />Pedir ao Claude</button>
        </div>
      </section>

      <section className="card p-5 mb-4">
        <p className="font-display text-lg font-extrabold">Modelos da marca</p>
        <p className="text-sm text-fog mt-1">Peças prontas com a identidade da ISYS. Troque o texto e a cor e exporte.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
          {MODELOS_HTML.map((m) => (
            <button key={m.id} onClick={() => usarModelo(m.id)} className="text-left rounded-xl border border-line p-3 hover:border-mint">
              <p className="text-sm font-semibold">{m.nome}</p>
              <p className="text-[11px] text-fog mt-1">{m.desc}</p>
              <span className="chip mt-2 inline-block">{m.marca}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5 mb-4">
        <p className="font-display text-lg font-extrabold">Estilos de texto por cima do vídeo</p>
        <p className="text-sm text-fog mt-1">Escolha pelo nome, troque o texto e exporte em WebM transparente. Ele cai em cima do vídeo de quem fala no Editor, no Premiere ou no CapCut, na palavra que você quiser.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-3">
          {ESTILOS_TEXTO.map((m) => (
            <button key={m.id} onClick={() => usarModelo(m.id)} title={m.desc} className="text-left rounded-xl border border-line p-2.5 hover:border-mint min-w-0">
              <p className="text-[13px] font-semibold leading-tight">{m.nome}</p>
              <p className="text-[10px] text-fog mt-1 line-clamp-2">{m.desc}</p>
            </button>
          ))}
        </div>
      </section>
      </>}

      {aba === "meus" && <>
      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Meus motions</p>
        {rows === null && <p className="text-sm text-fog">Carregando…</p>}
        {rows?.length === 0 && <p className="text-sm text-fog py-6 text-center">Nenhum motion ainda. Comece por um modelo em &quot;Novo motion&quot; ou peça um ao Claude.</p>}
        {!!rows?.some((r) => r.spec?.avaliacao) && (
          <div className="flex flex-wrap gap-1 mb-3">{([["todas", "Todas"], ["aprovado", "Aprovadas"], ["descartado", "Descartadas"]] as const).map(([k, l]) => <button key={k} onClick={() => setFiltro(k)} className={`chip ${filtro === k ? "chip-mint" : ""}`}>{l} ({k === "todas" ? rows.length : rows.filter((r) => r.spec?.avaliacao === k).length})</button>)}</div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {perfilF && <button onClick={() => setPerfilF("")} className="chip chip-mint">@{accounts.find((a) => a.id === perfilF)?.username || "perfil"} ✕</button>}
          <button onClick={() => setPasta("")} className={`chip ${pasta === "" ? "!border-mint text-mint" : ""}`}>Todas ({rows?.length || 0})</button>
          {pastas.map((n) => <button key={n} onClick={() => setPasta(n)} className={`chip ${pasta === n ? "!border-mint text-mint" : ""}`}><I.folder className="w-3 h-3 inline -mt-0.5 mr-1" />{n} ({(rows || []).filter((r) => r.pasta === n).length})</button>)}
          {(rows || []).some((r) => !r.pasta) && pastas.length > 0 && <button onClick={() => setPasta(SEM)} className={`chip ${pasta === SEM ? "!border-mint text-mint" : ""}`}>Sem pasta ({(rows || []).filter((r) => !r.pasta).length})</button>}
          <button onClick={() => { const n = novaPasta(); if (n) setPasta(n); }} className="chip"><I.plus className="w-3 h-3 inline -mt-0.5" /> Nova pasta</button>
          {!!rows?.length && <button onClick={() => setSelecao((s) => (s ? null : new Set()))} className={`chip ml-auto ${selecao ? "chip-mint" : ""}`}>{selecao ? "Cancelar seleção" : "Selecionar"}</button>}
        </div>
        {selecao && (
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 mb-3 rounded-xl border border-line bg-[var(--color-ink,#141414)] p-2">
            <span className="text-sm">{selecao.size} {selecao.size === 1 ? "selecionado" : "selecionados"}</span>
            <button onClick={() => setSelecao(new Set((rows || []).filter((r) => (!perfilF || r.account_id === perfilF) && (filtro === "todas" || r.spec?.avaliacao === filtro) && (pasta === "" ? true : pasta === SEM ? !r.pasta : r.pasta === pasta)).map((r) => r.id)))} className="chip">Selecionar todos</button>
            <button disabled={!selecao.size} onClick={excluirSelecionados} className="chip text-red-400 ml-auto disabled:opacity-40"><I.trash className="w-3 h-3 inline -mt-0.5 mr-1" />Excluir {selecao.size || ""}</button>
          </div>
        )}
        {pastaAtual && <p className="text-xs text-fog -mt-2 mb-3">Os motions que você criar agora (pedido ao Claude ou modelo) entram na pasta &quot;{pastaAtual}&quot;.{campanhaAtual ? <> A pasta é da <Link href={`/ecommerce/acoes/campanha?id=${campanhaAtual}`} className="text-mint">campanha no E-commerce</Link>: o Claude lê o conceito dela no pedido, e o Editor abre esta pasta quando o vídeo é de um card da campanha.</> : " No Editor, a aba Motion também filtra por pasta."}</p>}
        {(pasta === "" && pastas.length ? [...pastas, SEM] : [pasta || SEM]).map((grupo) => {
          const lista = (rows || []).filter((r) => !perfilF || r.account_id === perfilF).filter((r) => filtro === "todas" || r.spec?.avaliacao === filtro).filter((r) => (pasta === "" && !pastas.length) ? true : grupo === SEM ? !r.pasta : r.pasta === grupo);
          if (!lista.length) return pasta === "" ? null : <p key={grupo} className="text-sm text-fog py-6 text-center">Pasta vazia. Crie um motion com a pasta aberta ou mova um para cá pelo seletor do card.</p>;
          return (
        <div key={grupo} className="mb-5 last:mb-0">
        {pasta === "" && pastas.length > 0 && <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><I.folder className="w-4 h-4 text-mint" />{grupo === SEM ? "Sem pasta" : grupo} <span className="text-fog font-normal">· {lista.length}</span></p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {lista.map((r) => {
            if (ehHtml(r)) {
              const h = r.spec?.html as string | undefined;
              const inf = h ? infoComposicao(h) : null;
              const esperando = r.status === "pedido";
              const fase = esperando ? (r.spec?.pendente?.etapa === "html" ? "Claude escrevendo a peça…" : "Claude refinando o pedido…") : h ? "Pronto" : "Brief para aprovar";
              return (
                <div key={r.id} className={`relative rounded-xl border p-2 ${selecao?.has(r.id) ? "border-red-400" : openHtml?.id === r.id ? "border-mint" : "border-line"}`}>
                  {selecao && <Marca on={selecao.has(r.id)} onClick={() => marcar(r.id)} />}
                  {!esperando && h
                    ? <button onClick={() => (selecao ? marcar(r.id) : abrir(r))} className="block w-full" aria-label={`Abrir ${r.titulo}`}><CapaMotion html={h} valores={r.spec?.valores} /></button>
                    : <button disabled={esperando && !selecao} onClick={() => (selecao ? marcar(r.id) : abrir(r))} className="block w-full aspect-[9/12] rounded-lg bg-white/5 p-3 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-mint">{fase}</span>
                    <p className="text-xs text-fog mt-2 line-clamp-6">{r.spec?.brief?.ideia || r.pedido || ""}</p>
                    {esperando && falhas[r.id] && <span className="block text-red-400 text-xs mt-2">{falhas[r.id]}</span>}
                  </button>}
                  {esperando && falhas[r.id] && <button onClick={() => reenviar(r)} className="chip mt-2">Tentar de novo</button>}
                  <p className="text-sm font-semibold truncate mt-2">{r.titulo}</p>
                  <p className="text-[11px] text-fog">{r.formato}{inf ? ` · ${inf.duracao} s` : ""} · HyperFrames</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {!esperando && <button onClick={() => abrir(r)} className="chip">Abrir</button>}
                    {!esperando && h && <>
                      <button onClick={() => avaliar(r, "aprovado")} className={`chip ${r.spec?.avaliacao === "aprovado" ? "chip-mint" : ""}`} title="O Claude segue a linha das aprovadas nas próximas peças">{r.spec?.avaliacao === "aprovado" ? "✓ Aprovada" : "Aprovar"}</button>
                      <button onClick={() => avaliar(r, "descartado")} className={`chip ${r.spec?.avaliacao === "descartado" ? "text-red-400 border-red-400/50" : ""}`} title="O Claude evita o que as descartadas tinham">{r.spec?.avaliacao === "descartado" ? "✗ Descartada" : "Descartar"}</button>
                    </>}
                    {!esperando && r.spec?.brief?.cenas?.length > 0 && <button onClick={() => versoes(r)} className="chip" title="Gera versões desta peça com movimentos diferentes para você aprovar ou descartar">Gerar versões</button>}
                    <select value={r.pasta || SEM} onChange={(e) => mover(r, e.target.value)} aria-label="Pasta" className="chip !py-0 max-w-[9rem] bg-transparent"><option value={SEM}>Sem pasta</option>{pastas.map((n) => <option key={n} value={n}>{n}</option>)}<option value={NOVA}>+ Nova pasta…</option></select>
                    <button onClick={() => excluir(r)} className="chip text-red-400" aria-label={`Excluir ${r.titulo}`}><I.trash className="w-3 h-3" /></button>
                  </div>
                </div>
              );
            }
            const spec = normalizeSpec(r.spec);
            return (
              <div key={r.id} className={`relative rounded-xl border p-2 ${selecao?.has(r.id) ? "border-red-400" : open?.id === r.id ? "border-mint" : "border-line"}`}>
                {selecao && <Marca on={selecao.has(r.id)} onClick={() => marcar(r.id)} />}
                {r.status === "pedido" || !spec.cenas.length
                  ? <div className="aspect-[9/12] grid place-items-center text-center text-xs text-fog p-3 rounded-lg bg-white/5">{r.ai_request_id ? "Esperando o Claude…" : falhas[r.id] ? <span className="text-red-400">{falhas[r.id]}</span> : "Enviando o pedido…"}<br />{r.pedido?.slice(0, 80)}{falhas[r.id] && <button onClick={() => reenviar(r)} className="chip mt-2">Tentar de novo</button>}</div>
                  : <button onClick={() => (selecao ? marcar(r.id) : abrir(r))} className="block w-full"><MotionThumb spec={spec} /></button>}
                <p className="text-sm font-semibold truncate mt-2">{r.titulo}</p>
                <p className="text-[11px] text-fog">{r.formato} · {motionDuration(spec).toFixed(1)} s</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.status === "pronto" && <button onClick={() => abrir(r)} className="chip">Abrir</button>}
                  {r.status === "pronto" && <Link href={`/audiovisual/editor?motion=${r.id}`} className="chip">No Editor</Link>}
                  {r.status === "pronto" && <button onClick={() => duplicar(r)} className="chip">Duplicar</button>}
                  <select value={r.pasta || SEM} onChange={(e) => mover(r, e.target.value)} aria-label="Pasta" className="chip !py-0 max-w-[9rem] bg-transparent"><option value={SEM}>Sem pasta</option>{pastas.map((n) => <option key={n} value={n}>{n}</option>)}<option value={NOVA}>+ Nova pasta…</option></select>
                    <button onClick={() => excluir(r)} className="chip text-red-400" aria-label={`Excluir ${r.titulo}`}><I.trash className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
          );
        })}
      </section>
      </>}
    </>
  );
}

/** caixinha de seleção no canto do card */
function Marca({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} aria-label={on ? "Tirar da seleção" : "Selecionar"} className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-md border-2 grid place-items-center text-sm font-bold ${on ? "bg-red-500 border-red-500 text-white" : "bg-black/60 border-white/70 text-transparent"}`}>✓</button>
  );
}
