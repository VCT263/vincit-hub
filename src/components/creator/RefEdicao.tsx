"use client";
/**
 * Engenharia reversa da edição em Creator > Referências (28/11).
 * Novo: cola um ou vários links (de preferência dentro de um Estilo de referência) e cada um vai para a fila do Claude.
 * Painel: mostra a análise e cria o Kit (só quando a pessoa aprova). Estilos: vários links num estilo só; a folha do
 * estilo é refeita a cada vídeo novo desmontado (o que se repete vira regra) e aprovar de novo atualiza o mesmo Kit.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { aiFetch, AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { useAccounts } from "@/lib/useAccounts";
import { I } from "@/components/icons";
import { kitParaEstilo, mesclarKit, normalizeEdicao, type Edicao } from "@/lib/referenciaEdicao";
import { apagarComLixeira } from "@/lib/lixeira";

const URL_API = "/api/creator/referencia-edicao";

/** pede a análise e guarda o id do pedido na referência, para retomar depois se a página fechar */
async function pedir(refId: string, reqId?: string) {
  const s = createClient();
  const grab = (e: Event) => { const d = (e as CustomEvent<AIQueueEvent>).detail; if (d.state === "waiting") { s.from("references_lib").update({ edicao_request: d.id }).eq("id", refId).then(() => {}); window.removeEventListener(AI_QUEUE_EVENT, grab); } };
  window.addEventListener(AI_QUEUE_EVENT, grab);
  const res = await aiFetch(URL_API, { task: "referencia_edicao", modo: "analisar", ref_id: refId, ...(reqId ? { _ai_request: reqId } : {}) }, { maxWaitMs: 3 * 60 * 60 * 1000 });
  window.removeEventListener(AI_QUEUE_EVENT, grab);
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const } : { ok: false as const, error: j.error || "O Claude ainda não respondeu." };
}

export function EdicaoPanel({ r, onChange }: { r: any; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const retomado = useRef(false);
  const e: Edicao | null = r.edicao ? normalizeEdicao(r.edicao) : null;

  useEffect(() => {
    if (e || !r.edicao_request || retomado.current) return;
    retomado.current = true;
    setBusy("Na fila do Claude…");
    pedir(r.id, r.edicao_request).then((x) => { setBusy(null); if (!x.ok) setMsg(x.error); onChange(); });
  }, [r.id, r.edicao_request]); // eslint-disable-line react-hooks/exhaustive-deps

  async function analisar() {
    setBusy("Na fila do Claude…"); setMsg(null);
    const x = await pedir(r.id);
    setBusy(null); if (!x.ok) setMsg(x.error); onChange();
  }
  async function criarKit() {
    if (!e) return;
    const s = createClient();
    const nome = `Estilo ${r.handle || r.title}`.slice(0, 120);
    const { data, error } = await s.from("av_style_kits").insert({ name: nome, data: { ...kitParaEstilo(e.kit), origem: { referencias: [r.id], url: r.url, resumo: e.resumo } } }).select("id").single();
    if (error) { setMsg(error.message); return; }
    await s.from("references_lib").update({ kit_id: data.id }).eq("id", r.id);
    setMsg(`Kit "${nome}" criado. Ajuste e ligue a um perfil em Audiovisual > Kit de estilo.`); onChange();
  }

  if (!e) {
    return (
      <div className="rounded-xl border border-line p-4">
        <p className="label text-mint">Edição (engenharia reversa)</p>
        {busy ? <p className="text-sm">{busy} O Claude baixa o vídeo no seu Mac e quebra plano a plano.</p>
          : r.url ? <button onClick={analisar} className="btn btn-ghost btn-sm mt-1"><I.spark className="w-4 h-4" />Desmontar a edição deste vídeo</button>
          : <p className="text-sm text-fog">Para desmontar a edição, a referência precisa do link do vídeo.</p>}
        {msg && <p className="text-sm text-danger mt-2">{msg}</p>}
      </div>
    );
  }
  return (
    <FichaEdicao e={e} titulo="Edição (engenharia reversa)" msg={msg}>
      {r.kit_id ? <Link href="/audiovisual/kit" className="btn btn-ghost btn-sm">Ver o Kit de estilo</Link> : <button onClick={criarKit} className="btn btn-mint btn-sm">Aprovar e criar o Kit de estilo</button>}
      <button onClick={analisar} disabled={!!busy} className="btn btn-ghost btn-sm">{busy || "Desmontar de novo"}</button>
    </FichaEdicao>
  );
}

const num = (v?: number, suf = " s") => (v ? `${String(v).replace(".", ",")}${suf}` : "–");

/** A ficha da edição (de um vídeo ou a folha de um estilo), com os botões de ação dentro do quadro do Kit. */
export function FichaEdicao({ e, titulo, msg, children }: { e: Edicao; titulo: string; msg?: string | null; children?: React.ReactNode }) {
  const k = e.kit;
  return (
    <div className="rounded-xl border border-line p-4 space-y-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><p className="label text-mint">{titulo}</p><p>{e.resumo}</p></div>
        <span className="chip">{e.categoria || "vídeo"}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([["Duração", num(e.duracao_s)], ["Cortes por minuto", num(e.cortes_por_min, "")], ["Plano médio", num(e.plano_medio_s)], ["Primeiro corte", num(e.primeiro_corte_s)]] as const).map(([a, b]) => (
          <div key={a} className="rounded-lg bg-panel2 p-2.5"><p className="text-[11px] text-fog">{a}</p><p className="font-mono">{b}</p></div>
        ))}
      </div>
      {e.planos.length > 0 && (
        <div><p className="label text-mint">Plano a plano</p>
          <ol className="space-y-1">{e.planos.map((p, i) => <li key={i} className="text-xs"><span className="font-mono text-fog">{p.inicio.toFixed(1)}–{p.fim.toFixed(1)} s</span> <b>{p.tipo}</b> · {p.o_que}{p.camera ? ` · câmera: ${p.camera}` : ""}{p.texto ? ` · "${p.texto}"` : ""}</li>)}</ol>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {e.legenda && <div><p className="label text-mint">Legenda</p><p>{e.legenda}</p></div>}
        {e.letterings.length > 0 && <div><p className="label text-mint">Letterings</p><ul className="list-disc ml-5">{e.letterings.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {e.motion.length > 0 && <div><p className="label text-mint">Motion</p><ul className="list-disc ml-5">{e.motion.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {(e.som.voz || e.som.musica || e.som.sfx?.length) ? <div><p className="label text-mint">Som</p><p>{[e.som.voz, e.som.musica, e.som.sfx?.join(", ")].filter(Boolean).join(" · ")}</p></div> : null}
        {(e.cor.paleta.length > 0 || e.cor.look) && <div><p className="label text-mint">Cor</p><div className="flex items-center gap-1.5 flex-wrap">{e.cor.paleta.map((h) => <i key={h} title={h} className="w-5 h-5 rounded-full border border-line inline-block" style={{ background: h }} />)}<span className="text-xs text-fog">{e.cor.look}</span></div></div>}
        {e.estilos_do_catalogo.length > 0 && <div><p className="label text-mint">No Motion do HUB</p><div className="flex flex-wrap gap-1">{e.estilos_do_catalogo.map((x) => <Link key={x} href="/audiovisual/motion" className="chip hover:text-mint">{x}</Link>)}</div></div>}
      </div>
      {(e.copiar.length > 0 || e.nao_copiar.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {e.copiar.length > 0 && <div><p className="label text-mint">Vale trazer</p><ul className="list-disc ml-5">{e.copiar.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {e.nao_copiar.length > 0 && <div><p className="label text-fog">É do outro criador, não copiar</p><ul className="list-disc ml-5 text-fog">{e.nao_copiar.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </div>
      )}
      <div className="rounded-lg bg-panel2 p-3">
        <p className="label text-mint mb-1">Kit proposto</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(k.cores || {}).filter(([, v]) => v).map(([n2, v]) => <span key={n2} className="inline-flex items-center gap-1"><i className="w-3.5 h-3.5 rounded-full border border-line inline-block" style={{ background: v as string }} />{n2}</span>)}
          {k.fontes?.titulo && <span>título: {k.fontes.titulo}</span>}{k.fontes?.legenda && <span>legenda: {k.fontes.legenda}</span>}
          {k.legenda?.palavras_por_tela && <span>{k.legenda.palavras_por_tela} palavras por tela</span>}
          {k.regras?.plano_medio_s && <span>plano médio {num(k.regras.plano_medio_s)}</span>}
          {k.camera?.movimentos?.length ? <span>câmera: {k.camera.movimentos.join(", ")}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">{children}</div>
      </div>
      {e.como_foi_medido && <p className="text-[11px] text-fog">Como foi medido: {e.como_foi_medido}</p>}
      {msg && <p className="text-sm text-mint">{msg}</p>}
    </div>
  );
}

/** tira o rastreio (?igsh=…) do link e descarta o que não é link */
function limparLinks(txt: string) {
  const out: string[] = [];
  for (const m of txt.match(/https?:\/\/[^\s,;]+/g) || []) {
    let u = m;
    try { const x = new URL(m); if (/instagram\.com|tiktok\.com/.test(x.hostname)) { x.search = ""; x.hash = ""; } u = x.toString(); } catch { continue; }
    if (!out.includes(u)) out.push(u);
  }
  return out.slice(0, 12);
}
const novoTitulo = (u: string) => { const m = u.match(/\/(?:reel|reels|p|video)\/([\w-]+)/); return `Edição · ${m ? m[1].slice(0, 11) : new Date().toLocaleDateString("pt-BR")}`; };

/** pede a folha do estilo e guarda o id do pedido no estilo, para retomar depois */
async function pedirFolha(estiloId: string, reqId?: string) {
  const s = createClient();
  const grab = (e: Event) => { const d = (e as CustomEvent<AIQueueEvent>).detail; if (d.state === "waiting") { s.from("ref_estilos").update({ folha_request: d.id }).eq("id", estiloId).then(() => {}); window.removeEventListener(AI_QUEUE_EVENT, grab); } };
  window.addEventListener(AI_QUEUE_EVENT, grab);
  const res = await aiFetch(URL_API, { task: "referencia_estilo", modo: "estilo", estilo_id: estiloId, ...(reqId ? { _ai_request: reqId } : {}) }, { maxWaitMs: 3 * 60 * 60 * 1000 });
  window.removeEventListener(AI_QUEUE_EVENT, grab);
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const } : { ok: false as const, error: j.error || "O Claude ainda não respondeu." };
}

/** Engenharia reversa: cola um ou vários links e escolhe (ou cria) o Estilo de referência; abaixo, os estilos. */
export function RefEdicaoArea({ refs, onChange, onOpen }: { refs: any[]; onChange: () => void; onOpen: (id: string) => void }) {
  const { accounts } = useAccounts();
  const [estilos, setEstilos] = useState<any[]>([]);
  const [txt, setTxt] = useState("");
  const [destino, setDestino] = useState("novo");
  const [nome, setNome] = useState("");
  const [conta, setConta] = useState("");
  const [desc, setDesc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const loadEstilos = async () => { const { data } = await createClient().from("ref_estilos").select("*").order("updated_at", { ascending: false }); setEstilos(data || []); return data || []; };
  useEffect(() => { loadEstilos().then((l) => { if (l.length) { setDestino(l[0].id); setAberto(l[0].id); } }); }, []);
  const recarregar = () => { loadEstilos(); onChange(); };

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const links = limparLinks(txt);
    if (!links.length) { setMsg("Cole pelo menos um link de vídeo."); return; }
    const s = createClient();
    setBusy(true); setMsg(null);
    let estiloId: string | null = destino && destino !== "sem" && destino !== "novo" ? destino : null;
    if (destino === "novo") {
      if (!nome.trim()) { setBusy(false); setMsg("Dê um nome ao estilo (ex.: Reels de produto com motion)."); return; }
      const { data, error } = await s.from("ref_estilos").insert({ name: nome.trim().slice(0, 120), account_id: conta || null, descricao: desc.trim() || null }).select("id").single();
      if (error) { setBusy(false); setMsg(error.message); return; }
      estiloId = data.id; setNome(""); setDesc(""); setDestino(data.id); setAberto(data.id);
    }
    const ja = new Set(refs.filter((r) => r.estilo_id === estiloId).map((r) => r.url));
    const novos = links.filter((u) => !ja.has(u));
    const { data: linhas, error } = await s.from("references_lib").insert(novos.map((u) => ({ title: novoTitulo(u), url: u, format: "Reels", tags: ["edição"], estilo_id: estiloId }))).select("id");
    if (error) { setBusy(false); setMsg(error.message); return; }
    setTxt(""); recarregar();
    if (!estiloId && linhas?.[0]) onOpen(linhas[0].id);
    setMsg(`${novos.length} ${novos.length === 1 ? "vídeo" : "vídeos"} na fila do Claude. Ele baixa cada um no seu Mac e quebra plano a plano.${estiloId ? " Quando terminar, a folha do estilo é refeita sozinha." : ""}`);
    let feitos = 0;
    const res = await Promise.all((linhas || []).map((l: any) => pedir(l.id).then((x) => { feitos++; setMsg(`${feitos} de ${novos.length} desmontados.`); onChange(); return x; })));
    const erros = res.filter((x) => !x.ok).length;
    if (estiloId && res.some((x) => x.ok)) {
      setMsg(`${feitos - erros} de ${novos.length} desmontados. Agora o Claude refaz a folha do estilo com todos os vídeos dele.`);
      const f = await pedirFolha(estiloId);
      setMsg(f.ok ? "Folha do estilo atualizada. Confira e aprove para virar Kit." : f.error);
    } else setMsg(erros ? `${erros} não ${erros === 1 ? "voltou" : "voltaram"}: ${(res.find((x) => !x.ok) as any)?.error}` : "Análise pronta. Abra o card na Biblioteca.");
    setBusy(false); recarregar();
  }

  return (
    <>
      <form onSubmit={enviar} className="card p-5 mb-6 space-y-3">
        <div>
          <p className="font-display font-bold">Engenharia reversa</p>
          <p className="text-sm text-fog mt-1">Cole um ou vários links de reels, um por linha. O Claude desmonta cada edição (cortes, ritmo, câmera, legenda, letterings, motion, cor e som). Num Estilo de referência, o que se repete entre os vídeos vira regra, e o estilo fica mais preciso a cada link novo.</p>
        </div>
        <textarea className="input min-h-[96px] font-mono text-xs" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"https://www.instagram.com/reel/…\nhttps://www.instagram.com/reel/…"} />
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-2">
          <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="novo">+ Novo estilo</option>
            {estilos.map((x) => <option key={x.id} value={x.id}>Estilo: {x.name}</option>)}
            <option value="sem">Sem estilo (vídeo solto)</option>
          </select>
          {destino === "novo" ? (
            <div className="grid sm:grid-cols-[minmax(0,1fr)_180px] gap-2">
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do estilo (ex.: Motion explicativo)" />
              <select className="input" value={conta} onChange={(e) => setConta(e.target.value)}><option value="">Marca (opcional)</option>{accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}</select>
              <input className="input sm:col-span-2" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="O que você quer pegar desses vídeos (opcional): ritmo, legenda, motion…" />
            </div>
          ) : <p className="text-xs text-fog self-center">{destino === "sem" ? "Cada link vira uma referência solta na Biblioteca." : "Os links entram nesse estilo e a folha dele é refeita."}</p>}
        </div>
        <div className="flex justify-end"><button disabled={busy} className="btn btn-mint"><I.spark className="w-4 h-4" />{busy ? "Desmontando…" : "Desmontar"}</button></div>
        {msg && <p className="text-sm text-mint">{msg}</p>}
      </form>

      {estilos.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="font-display font-bold text-lg">Estilos de referência <span className="text-fog font-normal text-sm">({estilos.length})</span></h2>
          {estilos.map((x) => <EstiloCard key={x.id} est={x} refs={refs.filter((r) => r.estilo_id === x.id)} soltas={refs.filter((r) => !r.estilo_id && r.url)} aberto={aberto === x.id} onToggle={() => setAberto(aberto === x.id ? null : x.id)} onChange={recarregar} contas={accounts} />)}
        </div>
      )}
    </>
  );
}

function EstiloCard({ est, refs, soltas, aberto, onToggle, onChange, contas }: { est: any; refs: any[]; soltas: any[]; aberto: boolean; onToggle: () => void; onChange: () => void; contas: any[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const retomou = useRef(false);
  const prontas = refs.filter((r) => r.edicao);
  const pendentes = refs.filter((r) => !r.edicao && r.edicao_request);
  const usadas: string[] = est.folha_refs || [];
  const desatualizada = prontas.length > 0 && (prontas.length !== usadas.length || prontas.some((r) => !usadas.includes(r.id)));
  const folha: Edicao | null = est.folha ? normalizeEdicao(est.folha) : null;
  const conta = contas.find((a) => a.id === est.account_id);

  async function refazer(reqId?: string) {
    setBusy("O Claude está refazendo a folha com todos os vídeos do estilo…"); setMsg(null);
    const f = await pedirFolha(est.id, reqId);
    setBusy(null); setMsg(f.ok ? "Folha atualizada." : f.error); onChange();
  }
  /* retoma o que ficou na fila quando a página fechou: vídeos pendentes e a folha; depois refaz a folha se entrou vídeo novo */
  useEffect(() => {
    if (retomou.current) return;
    retomou.current = true;
    (async () => {
      if (pendentes.length) { setBusy(`Esperando o Claude desmontar ${pendentes.length} ${pendentes.length === 1 ? "vídeo" : "vídeos"}…`); await Promise.all(pendentes.map((r) => pedir(r.id, r.edicao_request))); setBusy(null); onChange(); }
      if (est.folha_request) await refazer(est.folha_request);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function aprovar() {
    if (!folha) return;
    const s = createClient();
    const novo = { ...kitParaEstilo(folha.kit), origem: { estilo_id: est.id, referencias: usadas, resumo: folha.resumo, copiar: folha.copiar, planos: folha.planos } };
    if (est.kit_id) {
      const { data: atual } = await s.from("av_style_kits").select("data").eq("id", est.kit_id).maybeSingle();
      if (atual) {
        const { error } = await s.from("av_style_kits").update({ data: { ...mesclarKit(atual.data, novo), origem: novo.origem }, updated_at: new Date().toISOString() }).eq("id", est.kit_id);
        setMsg(error ? error.message : `Kit "${est.name}" atualizado com a folha nova. O que você ajustou à mão no Kit foi mantido.`); return;
      }
    }
    const { data, error } = await s.from("av_style_kits").insert({ name: est.name, account_id: est.account_id || null, data: novo }).select("id").single();
    if (error) { setMsg(error.message); return; }
    await s.from("ref_estilos").update({ kit_id: data.id }).eq("id", est.id);
    setMsg(`Kit "${est.name}" criado. Ele aparece no Editor, no Motion e no Premiere.`); onChange();
  }
  async function tirar(id: string) { await createClient().from("references_lib").update({ estilo_id: null }).eq("id", id); onChange(); }
  async function incluir(id: string) {
    if (!id) return;
    const r = soltas.find((x) => x.id === id);
    await createClient().from("references_lib").update({ estilo_id: est.id }).eq("id", id); onChange();
    if (r && !r.edicao) { setBusy("Desmontando o vídeo novo…"); await pedir(id); setBusy(null); onChange(); }
  }
  async function apagar() {
    if (await apagarComLixeira({ tabela: "ref_estilos", filtro: { id: est.id }, oque: `o estilo "${est.name}" (os vídeos voltam para a Biblioteca soltos)`, rotulo: "Estilo de referência", link: "/creator/referencias" })) onChange();
  }

  return (
    <div className={`card ${aberto ? "border-mint-dim" : ""}`}>
      <button onClick={onToggle} className="w-full text-left p-4 md:p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-panel2 grid place-items-center font-mono text-mint shrink-0">{refs.length}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{est.name}</p>
          <p className="text-xs text-fog mt-0.5">{prontas.length} de {refs.length} {refs.length === 1 ? "vídeo desmontado" : "vídeos desmontados"}{conta ? ` · @${conta.username}` : ""}{est.kit_id ? " · tem Kit" : ""}</p>
        </div>
        {desatualizada && !busy && <span className="chip chip-mint">vídeo novo</span>}
        {busy && <span className="chip">na fila</span>}
      </button>
      {aberto && (
        <div className="px-4 md:px-5 pb-5 border-t border-line pt-4 space-y-4">
          {est.descricao && <p className="text-sm text-fog">{est.descricao}</p>}
          <div>
            <p className="label text-mint">Vídeos do estilo</p>
            <div className="flex flex-wrap gap-1.5">
              {refs.map((r) => (
                <span key={r.id} className={`chip ${r.edicao ? "" : "opacity-70"}`} title={r.edicao?.resumo || "ainda não desmontado"}>
                  {r.edicao ? "✂" : "…"} <a href={r.url} target="_blank" className="hover:text-mint">{r.handle || r.title}</a>
                  <button onClick={() => tirar(r.id)} aria-label="Tirar do estilo" className="ml-1 text-fog hover:text-danger">×</button>
                </span>
              ))}
              {!refs.length && <span className="text-sm text-fog">Nenhum vídeo ainda. Cole os links acima com este estilo escolhido.</span>}
            </div>
            {soltas.length > 0 && (
              <select className="input mt-2 max-w-sm text-sm" value="" onChange={(e) => incluir(e.target.value)}>
                <option value="">+ Trazer uma referência da Biblioteca…</option>
                {soltas.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            )}
          </div>
          {busy && <p className="text-sm">{busy}</p>}
          {desatualizada && !busy && (
            <div className="rounded-lg bg-panel2 p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{folha ? `Entraram vídeos depois da última folha (${usadas.length} → ${prontas.length}).` : `${prontas.length} ${prontas.length === 1 ? "vídeo pronto" : "vídeos prontos"} para virar a folha do estilo.`}</span>
              <button onClick={() => refazer()} className="btn btn-mint btn-sm"><I.spark className="w-4 h-4" />{folha ? "Atualizar a folha" : "Fazer a folha"}</button>
            </div>
          )}
          {folha ? (
            <FichaEdicao e={folha} titulo={`Folha do estilo · ${usadas.length} ${usadas.length === 1 ? "vídeo" : "vídeos"}`} msg={msg}>
              <button onClick={aprovar} className="btn btn-mint btn-sm">{est.kit_id ? "Atualizar o Kit com esta folha" : "Aprovar e criar o Kit de estilo"}</button>
              {est.kit_id && <Link href="/audiovisual/kit" className="btn btn-ghost btn-sm">Ver o Kit</Link>}
            </FichaEdicao>
          ) : msg && <p className="text-sm text-mint">{msg}</p>}
          <div className="flex justify-end"><button onClick={apagar} className="btn btn-ghost btn-sm"><I.trash className="w-3.5 h-3.5" />Apagar estilo</button></div>
        </div>
      )}
    </div>
  );
}
