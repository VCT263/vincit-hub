"use client";
/**
 * Motion em HTML (HyperFrames): brief do Claude para aprovar, prévia ao vivo, textos e cores trocáveis,
 * exportação em MP4 ou WebM transparente no navegador e pedido de ajuste. Ver src/lib/motion/html.ts.
 */
import AreaSegura from "@/components/av/AreaSegura";
import { useEffect, useMemo, useRef, useState } from "react";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { normalizeBrief, type Brief } from "@/lib/briefs";
import { salvarNoDrive } from "@/lib/drive";
import { MotionFrame, exportarHtml, infoComposicao, montarDoc, variaveisDeclaradas } from "@/lib/motion/html";
import { eventosHtml, mixarEventos } from "@/lib/motion/som";
import { ehEstiloSom } from "@/lib/editor/som";
import { EstiloSomSelect } from "@/components/av/EstiloSom";

export type HtmlRow = { id: string; titulo: string; spec: any; status: string; account_id?: string | null; kit_id?: string | null };

export default function MotionHtml({ row, onProduzir, onRefinar, onSaved }: {
  row: HtmlRow;
  /** aprova o brief (com as respostas e o ajuste) e pede a peça ao Claude */
  onProduzir: (row: HtmlRow, ajuste: string) => void;
  /** pede um brief novo com o ajuste */
  onRefinar: (row: HtmlRow, ajuste: string) => void;
  onSaved?: () => void;
}) {
  const spec = row.spec || {};
  const brief: Brief | null = spec.brief ? normalizeBrief(spec.brief) : null;
  const html: string = spec.html || "";
  const [valores, setValores] = useState<Record<string, any>>(spec.valores || {});
  const [titulo, setTitulo] = useState(row.titulo);
  const [ajuste, setAjuste] = useState("");
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [verBrief, setVerBrief] = useState(!html);
  const cancel = useRef({ cancel: false });
  const [ultimo, setUltimo] = useState<{ blob: Blob; nome: string } | null>(null);
  const [driveLink, setDriveLink] = useState<string | null>(null);

  // estilo de som (28/11): o da peça; sem escolha, o do Kit de estilo (regras.som_estilo). "nenhum" = mudo
  const [som, setSom] = useState<string | undefined>(spec.som);
  useEffect(() => {
    if (spec.som || !row.kit_id) return;
    createClient().from("av_style_kits").select("data").eq("id", row.kit_id).maybeSingle().then(({ data }) => { const e = (data as any)?.data?.regras?.som_estilo; if (ehEstiloSom(e)) setSom((s) => s || e); });
  }, [row.kit_id, spec.som]);
  const somAtivo = ehEstiloSom(som) ? som : undefined;
  const cenas = useMemo(() => (brief?.cenas || []).map((c) => ({ inicio: c.inicio })), [brief]);

  const vars = useMemo(() => variaveisDeclaradas(html), [html]);
  const info = useMemo(() => infoComposicao(html), [html]);

  async function salvar() {
    await createClient().from("av_motions").update({ titulo, spec: { ...spec, valores, som: som || undefined }, updated_at: new Date().toISOString() }).eq("id", row.id);
    setMsg("Salvo."); onSaved?.();
  }
  async function exportar(tipo: "mp4" | "webm") {
    cancel.current.cancel = false;
    setBusy("Preparando…");
    try {
      const blob = await exportarHtml(html, valores, { tipo, som: somAtivo, cenas, onProgress: (f) => setBusy(`Gerando o vídeo… ${Math.round(f * 100)}%`), signal: cancel.current });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(titulo || "motion").replace(/[^\w\-À-ú ]+/g, "").trim() || "motion"} ${info.w}x${info.h}.${tipo}`;
      setUltimo({ blob, nome: a.download }); setDriveLink(null);
      document.body.appendChild(a); a.click(); a.remove();
      setMsg(tipo === "webm" ? "WebM transparente baixado. Serve para pôr por cima do vídeo no Editor, no Premiere ou no CapCut." : "MP4 baixado.");
    } catch (e: any) { setMsg(e.message); }
    setBusy(null);
  }
  async function paraDrive() {
    if (!ultimo) return;
    setBusy("Salvando no Drive…");
    const r = await salvarNoDrive({ kind: "interno", sub: "Motion", nome: ultimo.nome, blob: ultimo.blob, accountId: row.account_id });
    setBusy(null);
    if (r.ok) { setDriveLink(r.link || null); setMsg(`Salvo no Drive em ${r.caminho || "Meus conteúdos > Projetos e entregas > Motion"}.`); }
    else setMsg(r.needsScope ? "Falta liberar o Drive: abra o Banco de mídia e toque em \"Liberar organização do Drive\"." : r.error || "Não salvou no Drive.");
  }
  function respostasTexto() {
    if (!brief) return "";
    return brief.falta_da_cliente.map((q, i) => (respostas[i]?.trim() ? `${q} → ${respostas[i].trim()}` : "")).filter(Boolean).join("\n");
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input !w-auto flex-1 min-w-[160px] font-semibold" aria-label="Nome do motion" />
        <span className="chip">HyperFrames · {info.w}x{info.h}{html ? ` · ${info.duracao} s` : ""}</span>
        {brief && html && <button onClick={() => setVerBrief((v) => !v)} className="chip">{verBrief ? "Esconder brief" : "Ver brief"}</button>}
      </div>

      <div className={`grid gap-5 mt-4 ${html ? "lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]" : ""}`}>
        {html && <Previa html={html} valores={valores} w={info.w} h={info.h} duracao={info.duracao} som={somAtivo} cenas={cenas} />}

        <div className="min-w-0 space-y-4">
          {brief && verBrief && <BriefView brief={brief} respostas={respostas} setRespostas={setRespostas} />}

          {!html && brief && (
            <div className="rounded-xl border border-mint/40 p-3">
              <p className="text-sm font-semibold">Aprovar o brief</p>
              <p className="text-xs text-fog mt-1">Responda o que faltar acima e, se quiser, escreva um ajuste. Depois o Claude escreve a peça seguindo o brief.</p>
              <textarea rows={2} value={ajuste} onChange={(e) => setAjuste(e.target.value)} className="input mt-2 text-sm" placeholder="Ajuste (opcional). Ex.: troque a frase final por 'Natal do seu jeito'." />
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => onProduzir(row, [respostasTexto(), ajuste].filter(Boolean).join("\n"))} className="btn btn-mint btn-sm"><I.spark className="w-4 h-4" />Aprovar e produzir</button>
                <button disabled={!ajuste.trim()} onClick={() => onRefinar(row, [respostasTexto(), ajuste].filter(Boolean).join("\n"))} className="btn btn-ghost btn-sm">Refazer o brief com o ajuste</button>
              </div>
            </div>
          )}

          {html && (
            <div className="max-w-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Efeitos sonoros</p>
              <EstiloSomSelect compacto value={somAtivo} onChange={(v) => setSom(v || "nenhum")} />
              <p className="text-[11px] text-fog mt-1">Tocam na prévia e saem no MP4 e no WebM. Salve para guardar a escolha.</p>
            </div>
          )}

          {html && vars.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Textos e cores</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {vars.map((v) => (
                  <label key={v.id} className="block min-w-0">
                    <span className="text-[11px] text-fog">{v.label || v.id}</span>
                    {v.type === "color"
                      ? <div className="flex items-center gap-2"><input type="color" value={valores[v.id] ?? v.default} onChange={(e) => setValores((x) => ({ ...x, [v.id]: e.target.value }))} className="h-9 w-12 rounded border border-line bg-transparent" /><span className="text-xs text-fog">{valores[v.id] ?? v.default}</span></div>
                      : v.type === "select" && Array.isArray(v.options)
                      ? <select value={valores[v.id] ?? v.default} onChange={(e) => setValores((x) => ({ ...x, [v.id]: e.target.value }))} className="input text-sm">{v.options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                      : <input value={valores[v.id] ?? v.default ?? ""} onChange={(e) => setValores((x) => ({ ...x, [v.id]: e.target.value }))} className="input text-sm" />}
                  </label>
                ))}
              </div>
            </div>
          )}

          {html && (
            <>
              {busy && <div className="flex items-center gap-2 text-sm"><span className="flex-1">{busy}</span><button onClick={() => { cancel.current.cancel = true; }} className="chip">Cancelar</button></div>}
              <div className="flex flex-wrap gap-2">
                <button onClick={salvar} className="btn btn-ghost btn-sm">Salvar</button>
                <button disabled={!!busy} onClick={() => exportar("mp4")} className="btn btn-ghost btn-sm"><I.download className="w-4 h-4" />MP4</button>
                <button disabled={!!busy} onClick={() => exportar("webm")} className="btn btn-ghost btn-sm" title="Fundo transparente, para pôr por cima do vídeo"><I.download className="w-4 h-4" />WebM transparente</button>
                {ultimo && <button disabled={!!busy} onClick={paraDrive} className="btn btn-ghost btn-sm" title={`Salva ${ultimo.nome} na pasta Motion do Drive`}>Salvar no Drive</button>}
                {driveLink && <a href={driveLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir no Drive</a>}
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-sm font-semibold">Pedir ajuste ao Claude</p>
                <textarea rows={2} value={ajuste} onChange={(e) => setAjuste(e.target.value)} className="input mt-2 text-sm" placeholder="Ex.: a cortina vermelha entra cedo demais; deixe o título 20% maior." />
                <button disabled={!ajuste.trim()} onClick={() => onProduzir(row, ajuste)} className="btn btn-ghost btn-sm mt-2"><I.spark className="w-4 h-4" />Mandar ajuste</button>
              </div>
            </>
          )}
          {msg && <p className="text-sm text-mint">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

/** prévia ao vivo num iframe isolado, com tocar/pausar e barra de tempo */
/* capa dos cards (pedido do Vinícius, 28/11): um quadro parado da peça, para saber qual é qual na lista.
   Carrega só quando o card aparece na tela e no máximo 2 de cada vez (cada uma abre a composição num iframe). */
let capasRodando = 0;
const filaCapas: (() => void)[] = [];
function vezDaCapa() { return new Promise<() => void>((res) => { const vai = () => { capasRodando++; res(() => { capasRodando--; filaCapas.shift()?.(); }); }; if (capasRodando < 2) vai(); else filaCapas.push(vai); }); }

export function CapaMotion({ html, valores, className = "" }: { html: string; valores?: Record<string, any>; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const ifr = useRef<HTMLIFrameElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [pronta, setPronta] = useState(false);
  const [scale, setScale] = useState(0.15);
  const info = useMemo(() => infoComposicao(html), [html]);
  const vals = JSON.stringify(valores || {});
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / info.w)); ro.observe(el);
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVisivel(true); io.disconnect(); } }, { rootMargin: "200px" }); io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, [info.w]);
  useEffect(() => {
    if (!visivel || !ifr.current) return;
    let vivo = true; let solta: (() => void) | null = null;
    const f = new MotionFrame(ifr.current);
    (async () => {
      solta = await vezDaCapa(); if (!vivo) { solta(); return; }
      try { await f.load(montarDoc(html, JSON.parse(vals))); await f.info(); await f.pause().catch(() => {}); await f.seek(Math.min(info.duracao * 0.6, Math.max(0, info.duracao - 0.3))); if (vivo) setPronta(true); } catch {}
      solta(); solta = null;
    })();
    return () => { vivo = false; solta?.(); f.destroy(); };
  }, [visivel, html, vals, info.duracao]);
  return (
    <div ref={box} className={`relative w-full overflow-hidden rounded-lg bg-black ${className}`} style={{ aspectRatio: `${info.w} / ${info.h}`, backgroundImage: "repeating-conic-gradient(#2c2c2c 0 25%, #1f1f1f 0 50%)", backgroundSize: "20px 20px" }}>
      {visivel && <iframe ref={ifr} sandbox="allow-scripts" tabIndex={-1} aria-hidden title="Capa do motion" style={{ width: info.w, height: info.h, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: pronta ? 1 : 0, transition: "opacity .3s" }} />}
      {!pronta && <span className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-widest text-mint">Pronto</span>}
    </div>
  );
}

export function Previa({ html, valores, w, h, duracao, className = "", som, cenas }: { html: string; valores: Record<string, any>; w: number; h: number; duracao: number; className?: string; som?: string; cenas?: { inicio: number }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const ifr = useRef<HTMLIFrameElement>(null);
  const frame = useRef<MotionFrame | null>(null);
  const [scale, setScale] = useState(0.3);
  const [t, setT] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [grade, setGrade] = useState(false);
  const doc = useMemo(() => montarDoc(html, valores), [html, valores]);
  // som da prévia: a trilha de efeitos é montada uma vez e toca junto, a partir do segundo em que a peça está
  const [tweens, setTweens] = useState<[number, number][] | null>(null);
  const [mudo, setMudo] = useState(false);
  const trilha = useRef<AudioBuffer | null>(null);
  const actx = useRef<AudioContext | null>(null);
  const fonte = useRef<AudioBufferSourceNode | null>(null);
  const cenasKey = JSON.stringify(cenas || []);
  const pararSom = () => { try { fonte.current?.stop(); } catch {} fonte.current = null; };
  const tocarSom = (de: number) => {
    pararSom();
    if (mudo || !trilha.current) return;
    if (!actx.current) actx.current = new AudioContext();
    const a = actx.current; a.resume().catch(() => {});
    const s = a.createBufferSource(); s.buffer = trilha.current; s.connect(a.destination);
    s.start(0, Math.max(0, Math.min(de, trilha.current.duration - 0.01)));
    fonte.current = s;
  };
  useEffect(() => {
    trilha.current = null; pararSom();
    if (!som || !tweens) return;
    let vivo = true;
    mixarEventos(som, eventosHtml(tweens, JSON.parse(cenasKey), duracao), duracao).then((b) => {
      if (!vivo) return; trilha.current = b;
      if (tocando && frame.current) frame.current.time().then((r) => { if (vivo && r.playing) tocarSom(r.t); }).catch(() => {});
    }).catch(() => {});
    return () => { vivo = false; };
  }, [som, tweens, cenasKey, duracao]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mudo) pararSom(); else if (tocando) tocarSom(t); }, [mudo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { pararSom(); actx.current?.close().catch(() => {}); }, []);

  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w));
    ro.observe(el); return () => ro.disconnect();
  }, [w]);
  useEffect(() => {
    if (!ifr.current) return;
    const f = new MotionFrame(ifr.current);
    frame.current = f;
    let vivo = true;
    const id = setTimeout(async () => {
      setErro(null);
      await f.load(doc);
      try { await f.info(); if (!vivo) return; setTweens(await f.eventos()); await f.seek(Math.min(t, duracao)); await f.play(); setTocando(true); tocarSom(Math.min(t, duracao)); }
      catch (e: any) { if (vivo) setErro(e.message); }
    }, 250);
    return () => { vivo = false; clearTimeout(id); f.destroy(); pararSom(); };
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tocando) return;
    const iv = setInterval(async () => { try { const r = await frame.current?.time(); if (r) { setT(r.t); if (!r.playing && r.t >= duracao - 0.05) { await frame.current?.seek(0); await frame.current?.play(); tocarSom(0); } } } catch {} }, 150);
    return () => clearInterval(iv);
  }, [tocando, duracao]);

  async function alternar() {
    if (!frame.current) return;
    if (tocando) { await frame.current.pause(); setTocando(false); pararSom(); }
    else { await frame.current.play(); setTocando(true); tocarSom(t >= duracao - 0.05 ? 0 : t); }
  }
  async function ir(v: number) { setT(v); pararSom(); if (tocando) { await frame.current?.pause(); setTocando(false); } await frame.current?.seek(v); }

  return (
    <div className={className}>
      <div ref={box} className="relative w-full overflow-hidden rounded-xl border border-line bg-black" style={{ aspectRatio: `${w} / ${h}`, backgroundImage: "repeating-conic-gradient(#2c2c2c 0 25%, #1f1f1f 0 50%)", backgroundSize: "28px 28px" }}>
        <iframe ref={ifr} sandbox="allow-scripts" title="Prévia do motion" style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, position: "absolute", left: 0, top: 0 }} />
        {grade && <AreaSegura w={w} h={h} />}
        {erro && <div className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-red-300 bg-black/70">{erro}</div>}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button onClick={alternar} className="chip" aria-label={tocando ? "Pausar" : "Tocar"}>{tocando ? "Pausar" : "Tocar"}</button>
        <input type="range" min={0} max={duracao || 1} step={0.01} value={t} onChange={(e) => ir(+e.target.value)} className="flex-1 accent-[var(--color-mint)]" aria-label="Tempo" />
        <span className="font-mono text-[11px] text-fog w-12 text-right">{t.toFixed(1)} s</span>
        {som && <button onClick={() => setMudo((m) => !m)} className={`chip ${mudo ? "" : "chip-mint"}`} title="Efeitos sonoros do estilo de som">{mudo ? "Som desligado" : "Som"}</button>}
        <button onClick={() => setGrade((g) => !g)} className={`chip ${grade ? "chip-mint" : ""}`} title="Margem de 35 px e as faixas que o app do Instagram cobre">Área segura</button>
      </div>
    </div>
  );
}

function BriefView({ brief, respostas, setRespostas }: { brief: Brief; respostas: Record<number, string>; setRespostas: (f: (r: Record<number, string>) => Record<number, string>) => void }) {
  const linha = (n: string, rotulo: string, corpo: React.ReactNode) => (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2 border-b border-line last:border-0">
      <span className="font-mono text-[11px] text-mint pt-0.5">{n}</span>
      <div className="min-w-0"><p className="text-[11px] uppercase tracking-wider text-fog">{rotulo}</p><div className="text-sm mt-0.5">{corpo}</div></div>
    </div>
  );
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Brief do Claude · {brief.formato.largura}x{brief.formato.altura} · {brief.formato.duracao} s</p>
      {linha("1", "Régua", brief.regua)}
      {linha("3", "Ideia", brief.ideia)}
      {linha("4", "Visual", <>
        <div className="flex flex-wrap gap-2 mb-1">{brief.visual.cores.map((c, i) => <span key={i} className="inline-flex items-center gap-1 text-xs"><i className="w-3.5 h-3.5 rounded-full border border-line inline-block" style={{ background: c.hex }} />{c.nome} <span className="text-fog">{c.uso}</span></span>)}</div>
        <p className="text-xs text-fog">{brief.visual.letras.map((l) => `${l.nome} (${l.uso})`).join(" · ")}</p>
        {brief.visual.grafismos.length > 0 && <p className="text-xs mt-1">Grafismos: {brief.visual.grafismos.join("; ")}</p>}
      </>)}
      {linha("5", "Movimento", <ul className="list-disc pl-4 text-xs space-y-0.5">{brief.movimento.map((m, i) => <li key={i}>{m}</li>)}</ul>)}
      {linha("8", "Cena a cena", <ol className="space-y-1">{brief.cenas.map((c, i) => <li key={i} className="text-xs"><span className="font-mono text-fog">{c.inicio.toFixed(1)}–{c.fim.toFixed(1)} s</span> {c.o_que}{c.texto ? <> · <b>&quot;{c.texto}&quot;</b></> : null}{c.estilo ? <span className="chip ml-1">{c.estilo}</span> : null}</li>)}</ol>)}
      {linha("6", "Nunca", <p className="text-xs text-fog">{brief.nunca.join(" · ")}</p>)}
      {brief.falta_da_cliente.length > 0 && linha("?", "Falta você responder", <div className="space-y-2">{brief.falta_da_cliente.map((q, i) => (
        <label key={i} className="block"><span className="text-xs">{q}</span><input value={respostas[i] || ""} onChange={(e) => setRespostas((r) => ({ ...r, [i]: e.target.value }))} className="input text-sm mt-1" /></label>
      ))}</div>)}
    </div>
  );
}
