"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import Markdown from "@/components/Markdown";
import { FRAMINGS } from "@/lib/shots";
import { MOVES, PARTS, mmss, rowsFromScript, scriptExtras, speechSeconds } from "@/lib/roteiro";

type Props = {
  item: any;
  accountName?: string | null;
  clientName?: string | null;
  statusName?: string | null;
  onPatch: (p: { body?: string; hook?: string | null }) => void;
  onClose: () => void;
};

const BRIEF: [string, string, string][] = [
  ["locacao", "Locação", "Onde grava, como o espaço precisa estar"],
  ["luz", "Luz", "Janela de lado, softbox, luz prática…"],
  ["figurino", "Figurino e objetos", "Roupa, cores, objetos que aparecem"],
  ["equipamento", "Câmera e equipamento", "Celular 9:16, tripé, lapela, gimbal"],
];
/** "Gancho · 0–3s" → ["Gancho", "0–3s"] */
const splitPart = (p?: string | null): [string, string] => { const [a, ...b] = (p || "").split(" · "); return [a.trim(), b.join(" · ").trim()]; };
/** cor de cada etapa do roteiro na tabela */
function etapaColor(e: string) {
  const k = e.toLowerCase();
  if (/gancho|abertura/.test(k)) return { c: "#3ed69a", bg: "#dcf7ea", ink: "#0b5a3b" };
  if (/cta|chamada/.test(k)) return { c: "#f0b429", bg: "#fdf0cf", ink: "#7a5300" };
  if (/virada|prova|cl[ií]max/.test(k)) return { c: "#8b7cf0", bg: "#ebe8fd", ink: "#3c2f99" };
  if (/fecha|final/.test(k)) return { c: "#8a8f94", bg: "#ececea", ink: "#3d4045" };
  return { c: "#5b8fa8", bg: "#e3edf2", ink: "#244a5c" };
}
const fmtDate = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "") : null);

/** folha A4 do roteiro técnico: pauta, roteiro falado, tabela fala × direção técnica e set */
export default function ScriptSheet({ item, accountName, clientName, statusName, onPatch, onClose }: Props) {
  const id = item.id as string;
  const [body, setBody] = useState<string>(item.body || "");
  const [hook, setHook] = useState<string>(item.hook || "");
  const [shots, setShots] = useState<any[] | null>(null);
  const [brief, setBrief] = useState<Record<string, string>>({});
  const [shoot, setShoot] = useState<any | null | undefined>(undefined);
  const [editText, setEditText] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [broll, setBroll] = useState<string | null>(null);
  const built = useRef(false);
  const s = () => createClient();

  const extras = useMemo(() => scriptExtras(body), [body]);

  const loadShots = useCallback(async () => {
    const { data } = await s().from("av_shots").select("*").eq("content_id", id).order("position");
    setShots(data || []);
    return data || [];
  }, [id]);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const c = s();
      const [rows, { data: ci }, { data: sh }] = await Promise.all([
        loadShots(),
        c.from("content_ideas").select("tech_brief,body,hook").eq("id", id).maybeSingle(),
        c.from("av_shoots").select("id,title,date,call_time,wrap_time,location,team,share_token").contains("content_ids", [id]).order("date", { ascending: false }).limit(1),
      ]);
      setBrief((ci?.tech_brief as any) || {});
      setShoot(sh?.[0] || null);
      // primeira vez: monta a tabela a partir do roteiro
      const text = ci?.body ?? item.body ?? "";
      if (!built.current && !rows.length && text.trim()) {
        built.current = true;
        await insertRows(rowsFromScript(text), true);
        setMsg("Montei a tabela a partir do roteiro. As instruções técnicas são sugestões: ajuste o que precisar.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function insertRows(list: any[], replace: boolean) {
    const c = s();
    if (replace) await c.from("av_shots").delete().eq("content_id", id);
    const base = replace ? 0 : (shots?.[shots.length - 1]?.position || 0) + 1;
    if (list.length) {
      const { error } = await c.from("av_shots").insert(list.map((x, i) => ({ content_id: id, position: base + i, ...x })));
      if (error) setMsg(error.message);
    }
    await loadShots();
  }

  async function rebuild() {
    if (shots?.length && !armed) { setArmed(true); setMsg("Remontar substitui a tabela atual. Toque de novo para confirmar."); setTimeout(() => setArmed(false), 6000); return; }
    setArmed(false);
    await insertRows(rowsFromScript(body), true);
    setMsg("Tabela remontada a partir do roteiro.");
  }

  async function patchShot(sid: string, p: any) {
    const old = shots?.find((x) => x.id === sid);
    setShots((l) => (l || []).map((x) => (x.id === sid ? { ...x, ...p } : x)));
    await s().from("av_shots").update(p).eq("id", sid);
    // fala editada na folha: atualiza o mesmo trecho no roteiro, para o teleprompter ler a versão nova
    if ("line" in p && old?.line && p.line && body.includes(old.line)) {
      const nb = body.replace(old.line, p.line);
      setBody(nb); onPatch({ body: nb });
      await s().from("content_ideas").update({ body: nb }).eq("id", id);
    }
  }
  async function removeShot(sid: string) {
    setShots((l) => (l || []).filter((x) => x.id !== sid));
    await s().from("av_shots").delete().eq("id", sid);
  }
  async function moveShot(i: number, d: -1 | 1) {
    if (!shots) return;
    const j = i + d; if (j < 0 || j >= shots.length) return;
    const a = shots[i], b = shots[j];
    const n = [...shots]; n[i] = { ...b, position: a.position }; n[j] = { ...a, position: b.position };
    setShots(n);
    await Promise.all([s().from("av_shots").update({ position: b.position }).eq("id", a.id), s().from("av_shots").update({ position: a.position }).eq("id", b.id)]);
  }
  async function addShot() {
    await insertRows([{ part: "Desenvolvimento", line: null, description: "Novo plano", framing: "Médio · olho", movement: "Fixa (tripé)", audio: "Voz (lapela)" }], false);
  }
  async function saveBrief(k: string, v: string) {
    const nb = { ...brief, [k]: v };
    if (!v) delete nb[k];
    setBrief(nb);
    await s().from("content_ideas").update({ tech_brief: nb }).eq("id", id);
  }
  async function saveHook(v: string) {
    setHook(v); onPatch({ hook: v || null });
    await s().from("content_ideas").update({ hook: v || null }).eq("id", id);
  }
  async function saveText() {
    if (editText == null) return;
    setBody(editText); onPatch({ body: editText });
    await s().from("content_ideas").update({ body: editText }).eq("id", id);
    setEditText(null);
    setMsg("Roteiro salvo. Se mudou as falas, use Remontar tabela para refazer a direção técnica.");
  }

  function print() {
    const st = document.createElement("style");
    st.textContent = "@page { size: A4 portrait; margin: 14mm 14mm 16mm; }";
    document.head.appendChild(st);
    document.documentElement.classList.add("print-roteiro");
    const fit = () => document.querySelectorAll<HTMLTextAreaElement>(".roteiro-root textarea").forEach((t) => { t.style.height = "0px"; t.style.height = t.scrollHeight + "px"; });
    const done = () => { st.remove(); document.documentElement.classList.remove("print-roteiro"); window.removeEventListener("afterprint", done); requestAnimationFrame(fit); };
    window.addEventListener("afterprint", done);
    requestAnimationFrame(() => { fit(); window.print(); });
  }

  const falas = (shots || []).filter((x) => x.line);
  const secs = speechSeconds(falas.map((x) => x.line).join(" ") || "");
  const gravados = (shots || []).filter((x) => x.done).length;
  const legend = [...new Set((shots || []).map((x) => splitPart(x.part)[0]).filter(Boolean))];
  // na folha do set ficam só as dicas de gravação; as de edição, legenda e capa ficam no roteiro completo
  const dicas = extras.dicas.filter((d) => !/edi[cç][aã]o|legenda|capa\b|m[uú]sica|trilha|corte/i.test(d));
  const doc = (
    <div className="roteiro-root fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm overflow-y-auto scroll-thin" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      {/* barra de ações (não sai na impressão) */}
      <div className="roteiro-noprint sticky top-0 z-10 bg-ink/95 backdrop-blur border-b border-line" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-[1100px] mx-auto px-3 md:px-6 py-2.5 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[.2em] uppercase text-mint">Roteiro técnico</p>
            <p className="text-sm font-semibold truncate">{item.title}</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scroll-thin shrink min-w-0">
            <Link href={`/audiovisual/teleprompter?c=${id}`} className="btn btn-ghost btn-sm shrink-0" title="Teleprompter"><I.prompter className="w-4 h-4" /><span className="hidden md:inline">Teleprompter</span></Link>
            <Link href={`/audiovisual/decupagem?c=${id}`} className="btn btn-ghost btn-sm shrink-0" title="Decupagem"><I.board className="w-4 h-4" /><span className="hidden md:inline">Decupagem</span></Link>
            <Link href={shoot ? "/audiovisual/ordem-do-dia" : `/audiovisual/ordem-do-dia?c=${id}`} className="btn btn-ghost btn-sm shrink-0" title="Ordem do dia"><I.calendar className="w-4 h-4" /><span className="hidden md:inline">Ordem do dia</span></Link>
            <button onClick={print} className="btn btn-mint btn-sm shrink-0" title="Imprimir ou salvar em PDF"><I.download className="w-4 h-4" /><span className="hidden sm:inline">PDF</span></button>
            <button onClick={onClose} className="btn btn-ghost btn-sm shrink-0">Fechar</button>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 md:px-6 py-5 md:py-10">
        {msg && <p className="roteiro-noprint max-w-[210mm] mx-auto mb-3 text-sm text-mint" onClick={(e) => e.stopPropagation()}>{msg}</p>}
        <article className="roteiro-paper relative mx-auto w-full max-w-[210mm] min-h-[297mm] bg-[#fafaf7] text-[#141416] rounded-[6px] shadow-[0_30px_80px_rgba(0,0,0,.55)] px-5 py-7 sm:px-8 md:px-[15mm] md:py-[15mm]" onClick={(e) => e.stopPropagation()}>
          {/* cabeçalho */}
          <header className="flex items-start justify-between gap-4 pb-5 border-b-2 border-[#141416]">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[.2em] uppercase text-[#6b6f74]">Roteiro técnico{item.format ? ` · ${item.format}` : ""}{accountName ? ` · @${accountName}` : ""}</p>
              <h1 className="font-display font-extrabold text-[26px] sm:text-[34px] leading-[1.02] tracking-tight mt-2 break-words">{item.title || "Sem título"}</h1>
            </div>
            <div className="text-right shrink-0 pt-0.5">
              <p className="font-display font-extrabold text-[13px] tracking-tight">VINCIT<span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-mint)] mx-1 align-middle sheet-ink" />HUB</p>
              {statusName && <p className="font-mono text-[10px] uppercase tracking-widest text-[#6b6f74] mt-1">{statusName}</p>}
            </div>
          </header>

          {/* ficha */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-6 md:grid-cols-6 border-b border-[#dcdcd6]">
            {([
              ["Cliente", clientName || "Conteúdo próprio"],
              ["Pilar", item.pillar || "–"],
              ["Publica", fmtDate(item.planned_for) || "–"],
              ["Grava", fmtDate(shoot?.date || item.record_date) || "a definir"],
              ["Duração", falas.length ? `~${mmss(secs)}` : "–"],
              ["Planos", shots ? `${shots.length}${gravados ? ` · ${gravados} ✓` : ""}` : "…"],
            ] as const).map(([l, v]) => (
              <div key={l} className="py-3 pr-3 border-t border-[#dcdcd6] sm:border-t-0">
                <dt className="font-mono text-[9.5px] uppercase tracking-[.16em] text-[#8a8f94]">{l}</dt>
                <dd className="text-[13px] font-semibold mt-1 truncate">{v}</dd>
              </div>
            ))}
          </dl>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 mt-4 font-mono text-[10px] uppercase tracking-[.16em] text-[#6b6f74]">
            {["Pauta", "Roteiro", "Direção de gravação", "Set"].map((t, i) => <a key={t} href={`#rt-${i + 1}`} className="hover:text-[#141416]"><span className="text-[#141416] font-bold">0{i + 1}</span> {t}</a>)}
          </nav>

          {/* 01 pauta */}
          <Sec n={1} title="Pauta e intenção">
            {extras.ideia && <p className="text-[15px] leading-relaxed mb-5 max-w-[62ch]">{extras.ideia}</p>}
            <p className="sheet-label">Gancho · os primeiros 3 segundos</p>
            <Field value={hook} onCommit={saveHook} placeholder="Escreva o gancho" className="font-display font-extrabold text-[20px] sm:text-[24px] leading-tight tracking-tight" />
            {extras.ganchos.length > 1 && (
              <div className="roteiro-noprint flex flex-wrap gap-1.5 mt-2">
                {extras.ganchos.slice(0, 4).map((g) => (
                  <button key={g} onClick={() => saveHook(g)} className={`text-left text-xs rounded-full border px-3 py-1 ${g === hook ? "border-[#141416] bg-[#141416] text-[#fafaf7]" : "border-[#d4d4ce] text-[#4a4d52] hover:border-[#141416]"}`}>{g}</button>
                ))}
              </div>
            )}
            <div className="grid sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-4 mt-5">
              <div><p className="sheet-label">Objetivo do vídeo</p><Field value={brief.objetivo || ""} onCommit={(v) => saveBrief("objetivo", v)} placeholder="O que a pessoa precisa sentir, entender ou fazer" /></div>
              <div><p className="sheet-label">Tom e sensação</p><Field value={brief.tom || ""} onCommit={(v) => saveBrief("tom", v)} placeholder="Ex.: papo próximo, sem cara de anúncio" /></div>
            </div>
          </Sec>

          {/* 02 roteiro falado */}
          <Sec n={2} title="Roteiro" aside={falas.length ? `${falas.length} falas · ~${mmss(secs)} de fala` : undefined}>
            {falas.length > 0 ? (
              <ol className="space-y-3">
                {falas.map((x) => (
                  <li key={x.id} className="grid grid-cols-[92px_1fr] sm:grid-cols-[120px_1fr] gap-3 break-inside-avoid">
                    <span className="font-mono text-[10px] uppercase tracking-[.14em] pt-1 font-bold sheet-ink" style={{ color: etapaColor(splitPart(x.part)[0]).ink }}>{x.part || ""}</span>
                    <p className="text-[15px] leading-relaxed">{x.line}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#6b6f74]">{shots === null ? "Carregando…" : body.trim() ? "Ainda sem falas na tabela. Use Remontar tabela ou escreva as falas na direção técnica." : "Este conteúdo ainda não tem roteiro. Escreva abaixo ou desenvolva no Laboratório."}</p>
            )}
            <div className="roteiro-noprint mt-5 rounded-[10px] border border-[#e3e3dd] bg-[#f3f3ee]">
              {editText == null ? (
                <details>
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[#4a4d52]">Texto completo do roteiro</summary>
                  <div className="px-4 pb-4 text-[#141416] sheet-md">{body.trim() ? <Markdown text={body} /> : <p className="text-sm text-[#6b6f74]">Vazio.</p>}</div>
                  <div className="flex flex-wrap gap-2 px-4 pb-4">
                    <button onClick={() => setEditText(body)} className="sheet-btn">Editar texto</button>
                    <button onClick={rebuild} disabled={!body.trim()} className="sheet-btn">{armed ? "Confirmar: remontar tabela" : "Remontar tabela a partir do texto"}</button>
                  </div>
                </details>
              ) : (
                <div className="p-3">
                  <textarea className="w-full min-h-[280px] bg-white border border-[#dcdcd6] rounded-[8px] p-3 font-mono text-xs leading-relaxed text-[#141416] outline-none focus:border-[#141416]" value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="flex gap-2 mt-2"><button onClick={saveText} className="sheet-btn sheet-btn-dark">Salvar roteiro</button><button onClick={() => setEditText(null)} className="sheet-btn">Cancelar</button></div>
                </div>
              )}
            </div>
          </Sec>

          {/* 03 tabela fala × técnica */}
          <Sec n={3} title="Direção de gravação" aside="o que falar e como filmar" className="print:break-before-page print:mt-0">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 sheet-ink">
              {legend.map((e) => <span key={e} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-[#4a4d52]"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: etapaColor(e).c }} />{e}</span>)}
            </div>
            <div className="rounded-[8px] border-[1.5px] border-[#141416] overflow-hidden sheet-ink">
              <div className={`hidden md:grid print:grid grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1fr)_150px_34px] bg-[#141416] text-[#fafaf7] font-mono text-[9.5px] uppercase tracking-[.16em]`}>
                <span className="px-2 py-2 text-center">#</span>
                <span className="px-3 py-2 border-l border-[#3a3a3e]">Fala</span>
                <span className="px-3 py-2 border-l border-[#3a3a3e]">Cena · o que a câmera vê</span>
                <span className="px-3 py-2 border-l border-[#3a3a3e]">Plano</span>
                <span className="px-1 py-2 border-l border-[#3a3a3e] text-center">✓</span>
              </div>
              {shots === null && <p className="text-sm text-[#6b6f74] p-4">Carregando…</p>}
              {shots && !shots.length && <p className="text-sm text-[#6b6f74] p-4">Nenhuma fala ainda.</p>}
              {shots?.map((x, i) => {
                const [et, tempo] = splitPart(x.part);
                const col = etapaColor(et);
                const first = i === 0 || splitPart(shots[i - 1].part)[0] !== et;
                return (
                  <div key={x.id} className="roteiro-row">
                    {first && (
                      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[#141416] first:border-t-0" style={{ background: col.bg }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: col.c }} />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: col.ink }}>{et || "Sem etapa"}</span>
                      </div>
                    )}
                    <div className={`grid grid-cols-[40px_minmax(0,1fr)_34px] md:grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1fr)_150px_34px] print:grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1fr)_150px_34px] border-t border-[#d4d4ce] ${x.done ? "bg-[color-mix(in_srgb,var(--color-mint)_10%,#fafaf7)] print:bg-transparent" : ""}`} style={{ boxShadow: `inset 4px 0 0 ${col.c}` }}>
                      <div className="pl-2 pr-1 py-3 text-center row-span-3 md:row-span-1 print:row-span-1">
                        <p className="font-display font-extrabold text-[20px] leading-none tracking-tight">{String(i + 1).padStart(2, "0")}</p>
                        {tempo && <p className="font-mono text-[9px] text-[#6b6f74] mt-1 leading-tight">{tempo}</p>}
                      </div>
                      <div className="min-w-0 px-3 py-3 md:border-l print:border-l border-[#e3e3dd] col-start-2 md:col-start-auto print:col-start-auto">
                        <Field value={x.line || ""} onCommit={(v) => patchShot(x.id, { line: v || null })} placeholder="Sem fala (só imagem)" className="text-[15px] leading-relaxed" />
                        <div className="roteiro-noprint flex items-center gap-1 mt-2 text-[#9a9c9f]">
                          <select value={et} onChange={(e) => patchShot(x.id, { part: tempo ? `${e.target.value} · ${tempo}` : e.target.value })} className="bg-transparent font-mono text-[9.5px] uppercase tracking-[.12em] text-[#6b6f74] outline-none cursor-pointer">
                            {[...new Set([...PARTS, et].filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <span className="flex-1" />
                          <button onClick={() => moveShot(i, -1)} className="px-1 hover:text-[#141416]" aria-label="Subir">▲</button>
                          <button onClick={() => moveShot(i, 1)} className="px-1 hover:text-[#141416]" aria-label="Descer">▼</button>
                          <button onClick={() => removeShot(x.id)} className="px-1 hover:text-[#c0392b]" aria-label="Apagar"><I.trash className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="min-w-0 px-3 py-3 md:border-l print:border-l border-[#e3e3dd] col-start-2 md:col-start-auto print:col-start-auto row-start-2 md:row-start-auto print:row-start-auto pt-0 md:pt-3 print:pt-3 text-[13px] leading-snug">
                        <p className="md:hidden print:hidden font-mono text-[9px] uppercase tracking-[.14em] text-[#8a8f94] mb-0.5">Cena</p>
                        <Field value={x.description || ""} onCommit={(v) => patchShot(x.id, { description: v || "Plano" })} placeholder="O que a câmera vê" />
                        {(x.broll || broll === x.id) && (
                          <div className="mt-1.5 flex gap-1 items-baseline"><span className="font-mono text-[9px] uppercase tracking-[.12em] text-[#8a8f94] shrink-0">+ apoio</span><Field value={x.broll || ""} onCommit={(v) => { setBroll(null); patchShot(x.id, { broll: v || null }); }} placeholder="Imagem de apoio para gravar também" /></div>
                        )}
                        {!x.broll && broll !== x.id && <button onClick={() => setBroll(x.id)} className="roteiro-noprint mt-1 text-[11px] text-[#9a9c9f] hover:text-[#141416]">+ imagem de apoio</button>}
                      </div>
                      <div className="min-w-0 px-3 py-3 md:border-l print:border-l border-[#e3e3dd] col-start-2 md:col-start-auto print:col-start-auto row-start-3 md:row-start-auto print:row-start-auto pt-0 md:pt-3 print:pt-3 text-[13px]">
                        <p className="md:hidden print:hidden font-mono text-[9px] uppercase tracking-[.14em] text-[#8a8f94] mb-0.5">Plano</p>
                        <Field value={x.framing || ""} onCommit={(v) => patchShot(x.id, { framing: v || null })} placeholder="Enquadramento" list="rt-framings" className="font-semibold" />
                        <Field value={x.movement || ""} onCommit={(v) => patchShot(x.id, { movement: v || null })} placeholder="Câmera" list="rt-moves" className="text-[12px] text-[#6b6f74]" />
                      </div>
                      <div className="py-3 md:border-l print:border-l border-[#e3e3dd] flex justify-center col-start-3 row-start-1 md:col-start-auto md:row-start-auto print:col-start-auto print:row-start-auto">
                        <button onClick={() => patchShot(x.id, { done: !x.done })} className={`w-[18px] h-[18px] rounded-[4px] border-[1.5px] grid place-items-center text-[11px] font-bold ${x.done ? "bg-[#141416] border-[#141416] text-[var(--color-mint)] print:bg-transparent print:text-[#141416]" : "border-[#9a9c9f]"}`} aria-label="Gravado" title="Gravado">{x.done ? "✓" : ""}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {shots && (
              <div className="roteiro-noprint flex flex-wrap gap-2 mt-3">
                <button onClick={addShot} className="sheet-btn">+ Adicionar fala ou plano</button>
                {body.trim() && <button onClick={rebuild} className="sheet-btn">{armed ? "Confirmar: remontar tabela" : "Remontar a partir do roteiro"}</button>}
              </div>
            )}
          </Sec>

          {/* 04 set */}
          <Sec n={4} title="Set">
            <div className="grid sm:grid-cols-2 print:grid-cols-2 gap-3">
              <Card kicker="Ordem do dia" href={shoot ? "/audiovisual/ordem-do-dia" : `/audiovisual/ordem-do-dia?c=${id}`} cta={shoot ? "Abrir" : "Criar diária"}>
                {shoot === undefined ? <p className="text-[#6b6f74]">…</p> : shoot ? (
                  <>
                    <p className="font-semibold">{fmtDate(shoot.date)}{shoot.call_time ? ` · ${String(shoot.call_time).slice(0, 5)}` : ""}</p>
                    <p className="text-[#4a4d52] mt-0.5">{shoot.location || "Local a definir"}</p>
                    {Array.isArray(shoot.team) && shoot.team.length > 0 && <p className="text-[#6b6f74] mt-0.5">{shoot.team.length} na equipe</p>}
                  </>
                ) : <p className="text-[#6b6f74]">Ainda sem diária marcada para este conteúdo.</p>}
              </Card>
              <Card kicker="Teleprompter" href={`/audiovisual/teleprompter?c=${id}`} cta="Abrir">
                <p className="font-semibold">{falas.length ? `${falas.length} falas · ~${mmss(secs)}` : "Sem falas ainda"}</p>
                <p className="text-[#6b6f74] mt-0.5">Lê só as falas, segue a sua voz e dá para controlar pelo celular.</p>
              </Card>
            </div>

            <div className="grid sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-4 mt-6">
              {BRIEF.map(([key, l, ph]) => (
                <div key={key}><p className="sheet-label">{l}</p><Field value={brief[key] || ""} onCommit={(v) => saveBrief(key, v)} placeholder={ph} /></div>
              ))}
            </div>

            {dicas.length > 0 && (
              <div className="mt-6">
                <p className="sheet-label">Dicas de gravação</p>
                <ul className="mt-1 space-y-1.5 text-[13.5px] leading-relaxed">
                  {dicas.map((d, j) => <li key={j} className="grid grid-cols-[14px_1fr] gap-1"><span className="text-[#8a8f94]">—</span><span>{d.replace(/\*\*/g, "")}</span></li>)}
                </ul>
              </div>
            )}
          </Sec>

          <footer className="mt-10 pt-3 border-t border-[#dcdcd6] flex justify-between font-mono text-[9.5px] uppercase tracking-[.16em] text-[#8a8f94]">
            <span>VINCIT HUB · roteiro técnico</span>
            <span>{new Date().toLocaleDateString("pt-BR")}</span>
          </footer>

          <datalist id="rt-framings">{FRAMINGS.map((f) => <option key={f} value={f} />)}</datalist>
          <datalist id="rt-moves">{MOVES.map((f) => <option key={f} value={f} />)}</datalist>
        </article>
      </div>
    </div>
  );
  return mounted ? createPortal(doc, document.body) : null;
}

function Sec({ n, title, aside, className = "", children }: { n: number; title: string; aside?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={`rt-${n}`} className={`mt-10 scroll-mt-20 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] font-bold bg-[#141416] text-[var(--color-mint)] px-1.5 py-0.5 rounded-[4px] sheet-ink">0{n}</span>
        <h2 className="font-display font-extrabold text-[20px] sm:text-[22px] tracking-tight leading-none">{title}</h2>
        <span className="flex-1 border-b border-dashed border-[#cfcfc9] translate-y-1" />
        {aside && <span className="hidden sm:block font-mono text-[9.5px] uppercase tracking-[.14em] text-[#8a8f94]">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Card({ kicker, href, cta, children }: { kicker: string; href: string; cta: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#dcdcd6] p-3.5 text-[13px] flex flex-col break-inside-avoid">
      <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-[#8a8f94] mb-1.5">{kicker}</p>
      <div className="flex-1">{children}</div>
      <Link href={href} className="roteiro-noprint mt-3 self-start text-xs font-semibold underline underline-offset-4 decoration-[#b5b5ae] hover:decoration-[#141416]">{cta} →</Link>
    </div>
  );
}

function Tech({ label, value, onCommit, placeholder, list, strong }: { label: string; value?: string | null; onCommit: (v: string) => void; placeholder: string; list?: string; strong?: boolean }) {
  return (
    <div className={`grid grid-cols-[52px_1fr] items-baseline gap-2 ${!value ? "print:hidden" : ""}`}>
      <span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#8a8f94]">{label}</span>
      <Field value={value || ""} onCommit={onCommit} placeholder={placeholder} list={list} className={strong ? "font-semibold" : ""} />
    </div>
  );
}

/** campo da folha: parece texto impresso, vira campo ao tocar; salva ao sair */
function Field({ value, onCommit, placeholder, className = "", list }: { value: string; onCommit: (v: string) => void; placeholder?: string; className?: string; list?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = "0px"; el.style.height = el.scrollHeight + "px"; } }, [v]);
  const commit = () => { const t = v.trim(); if (t !== (value || "").trim()) onCommit(t); };
  if (list) return <input className={`sheet-input ${className}`} list={list} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />;
  return <textarea ref={ref} rows={1} className={`sheet-input ${className}`} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />;
}
