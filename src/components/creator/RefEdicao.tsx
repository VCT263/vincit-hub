"use client";
/**
 * Engenharia reversa da edição em Creator > Referências (28/11).
 * Novo: cola o link do reel e o pedido vai para a fila do Claude. Painel: mostra a análise, cria o Kit de estilo
 * com a proposta (só quando a pessoa aprova) e junta 2 ou 3 referências numa folha da marca.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { aiFetch, AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { useAccounts } from "@/lib/useAccounts";
import { I } from "@/components/icons";
import { kitParaEstilo, normalizeEdicao, type Edicao } from "@/lib/referenciaEdicao";

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

export function RefEdicaoNovo({ onCreated }: { onCreated: (id?: string) => void }) {
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const u = url.trim(); if (!u) return;
    const h = handle.trim() ? (handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`) : "";
    const { data, error } = await createClient().from("references_lib").insert({ title: `Edição${h ? ` de ${h}` : ""} · ${new Date().toLocaleDateString("pt-BR")}`, url: u, handle: h || null, format: "Reels", tags: ["edição"] }).select("id").single();
    if (error) { setMsg(error.message); return; }
    setUrl(""); setHandle(""); onCreated(data.id);
    setMsg("Pedido na fila do Claude. Ele baixa o vídeo no seu Mac, quebra plano a plano e a análise aparece no card.");
    const r = await pedir(data.id);
    setMsg(r.ok ? "Análise pronta. Abra o card para ver e criar o Kit." : r.error);
    onCreated(data.id);
  }
  return (
    <form onSubmit={enviar} className="card p-5 mb-8">
      <p className="font-display font-bold">Engenharia reversa</p>
      <p className="text-sm text-fog mt-1">Cole o link de um reel. O Claude desmonta a edição (cortes, ritmo, câmera, legenda, letterings, motion, cor e som) e propõe um Kit de estilo. O Kit só vale depois que você aprovar.</p>
      <div className="grid sm:grid-cols-[minmax(0,1fr)_180px_auto] gap-2 mt-3">
        <input type="url" required className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" />
        <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@perfil (opcional)" />
        <button className="btn btn-mint"><I.spark className="w-4 h-4" />Desmontar</button>
      </div>
      {msg && <p className="text-sm text-mint mt-2">{msg}</p>}
    </form>
  );
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
  const k = e.kit;
  const num = (v?: number, suf = " s") => (v ? `${String(v).replace(".", ",")}${suf}` : "–");
  return (
    <div className="rounded-xl border border-line p-4 space-y-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><p className="label text-mint">Edição (engenharia reversa)</p><p>{e.resumo}</p></div>
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
        <div className="flex flex-wrap gap-2 mt-3">
          {r.kit_id ? <Link href="/audiovisual/kit" className="btn btn-ghost btn-sm">Ver o Kit de estilo</Link> : <button onClick={criarKit} className="btn btn-mint btn-sm">Aprovar e criar o Kit de estilo</button>}
          <button onClick={analisar} disabled={!!busy} className="btn btn-ghost btn-sm">{busy || "Desmontar de novo"}</button>
        </div>
      </div>
      {e.como_foi_medido && <p className="text-[11px] text-fog">Como foi medido: {e.como_foi_medido}</p>}
      {msg && <p className="text-sm text-mint">{msg}</p>}
    </div>
  );
}

export function JuntarRefs({ refs, onDone }: { refs: any[]; onDone: () => void }) {
  const { accounts } = useAccounts();
  const [sel, setSel] = useState<string[]>([]);
  const [conta, setConta] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prontas = refs.filter((r) => r.edicao);
  if (prontas.length < 2) return null;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  async function juntar() {
    setBusy(true); setMsg("Na fila do Claude. Ele junta o que as referências têm em comum e escreve a folha da marca.");
    const res = await aiFetch(URL_API, { task: "referencia_juntar", modo: "juntar", ref_ids: sel, account_id: conta || null, nome, account: conta ? { id: conta } : undefined });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Kit "${j.nome}" criado: ${j.resumo || ""} Ajuste em Audiovisual > Kit de estilo.` : j.error || "O Claude ainda não respondeu.");
    if (res.ok) { setSel([]); onDone(); }
  }
  return (
    <div className="card p-5 mb-6">
      <p className="font-display font-bold">Juntar referências numa folha da marca</p>
      <p className="text-sm text-fog mt-1">Escolha 2 ou 3 vídeos já desmontados. O que eles têm em comum vira regra do Kit, nas cores e letras da marca. O que é identidade do outro criador fica de fora.</p>
      <div className="flex flex-wrap gap-2 mt-3">{prontas.map((r) => <button key={r.id} onClick={() => toggle(r.id)} className={`chip ${sel.includes(r.id) ? "chip-mint" : ""}`}>{r.title}</button>)}</div>
      {sel.length >= 2 && (
        <div className="grid sm:grid-cols-[200px_minmax(0,1fr)_auto] gap-2 mt-3">
          <select className="input" value={conta} onChange={(e) => setConta(e.target.value)}><option value="">Perfil da marca…</option>{accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}</select>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do Kit (ex.: ISYS reels de produto)" />
          <button disabled={busy} onClick={juntar} className="btn btn-mint"><I.spark className="w-4 h-4" />{busy ? "Juntando…" : "Juntar"}</button>
        </div>
      )}
      {msg && <p className="text-sm text-mint mt-2">{msg}</p>}
    </div>
  );
}
