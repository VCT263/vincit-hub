"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { useAI } from "@/lib/useAI";
import { FRAMINGS, shotsFromScript, type Shot } from "@/lib/shots";
import { parseScript } from "@/lib/prompter";
import { MOVES } from "@/lib/roteiro";
import { apagarComLixeira } from "@/lib/lixeira";

const READY = ["roteiro", "producao"];
const fmtDay = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "") : "");

export default function Decupagem() {
  const [items, setItems] = useState<any[] | null>(null);
  const [counts, setCounts] = useState<Record<string, { n: number; done: number }>>({});
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [media, setMedia] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [shots, setShots] = useState<any[] | null>(null);
  const [scope, setScope] = useState<"gravar" | "todos">("gravar");
  const [msg, setMsg] = useState<string | null>(null);
  const ai = useAI();

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data }, { data: st }, { data: cl }, { data: sh }, { data: md }] = await Promise.all([
      s.from("content_ideas").select("id,title,body,format,record_date,status_id,client_id").is("archived_at", null).order("record_date", { ascending: true, nullsFirst: false }).limit(500),
      s.from("content_statuses").select("id,name,stage,color"),
      s.from("ag_clients").select("id,name"),
      s.from("av_shots").select("content_id,done"),
      s.from("av_media").select("id,name,kind,tags").eq("missing", false).order("name").limit(3000),
    ]);
    const m = new Map((st || []).map((x: any) => [x.id, x]));
    setItems((data || []).map((i: any) => ({ ...i, st: m.get(i.status_id) })));
    setClients(new Map((cl || []).map((x: any) => [x.id, x.name])));
    const c: Record<string, { n: number; done: number }> = {};
    (sh || []).forEach((x: any) => { c[x.content_id] = c[x.content_id] || { n: 0, done: 0 }; c[x.content_id].n++; if (x.done) c[x.content_id].done++; });
    setCounts(c); setMedia(md || []);
  }, []);
  useEffect(() => {
    load();
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) { setSel(c); setScope("todos"); }
  }, [load]);

  const loadShots = useCallback(async (id: string) => {
    setShots(null);
    const { data } = await createClient().from("av_shots").select("*").eq("content_id", id).order("position");
    setShots(data || []);
  }, []);
  useEffect(() => { if (sel) loadShots(sel); }, [sel, loadShots]);

  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const list = useMemo(() => {
    let l = items || [];
    if (scope === "gravar") l = l.filter((i) => READY.includes(i.st?.stage) || (i.record_date && i.record_date >= today));
    return l;
  }, [items, scope, today]);
  const cur = (items || []).find((i) => i.id === sel);

  async function insertShots(list: (Shot & { media_id?: string | null })[], replace: boolean) {
    if (!sel || !list.length) return;
    const s = createClient();
    if (replace && shots?.length) await apagarComLixeira({ tabela: "av_shots", filtro: { content_id: sel }, oque: "os planos anteriores", rotulo: `Planos substituídos: ${cur?.title || "conteúdo"}`, link: "/audiovisual/decupagem", semSenha: true });
    const base = replace ? 0 : (shots?.[shots.length - 1]?.position || 0) + 1;
    await s.from("av_shots").insert(list.map((x, i) => ({ content_id: sel, position: base + i, description: x.description, framing: x.framing || null, audio: x.audio || null, notes: x.notes || null, media_id: x.media_id || null, part: x.part || null, line: x.line || null, movement: x.movement || null, broll: x.broll || null })));
    await loadShots(sel); load();
  }
  async function fromScript() {
    if (!cur?.body) return;
    if (shots?.length && !confirmReplace()) return;
    await insertShots(shotsFromScript(cur.body), true);
    setMsg("Planos criados a partir do roteiro. Ajuste o que precisar.");
  }
  async function withAI() {
    if (!cur?.body) return;
    if (shots?.length && !confirmReplace()) return;
    setMsg(null);
    const r = await ai.run<any>("shot_list", { title: cur.title, format: cur.format, script: cur.body, media: media.map((m) => ({ name: m.name, kind: m.kind, tags: m.tags })) });
    const planos = r?.planos || [];
    if (!planos.length) return;
    const byName = new Map(media.map((m) => [m.name.toLowerCase(), m.id]));
    await insertShots(planos.map((p: any) => ({ description: p.descricao, framing: p.enquadramento, audio: p.audio, notes: p.notas || null, media_id: p.midia ? byName.get(String(p.midia).toLowerCase()) || null : null })), true);
    setMsg(`A IA sugeriu ${planos.length} planos.`);
  }
  // sem diálogo nativo: substituir só com a segunda confirmação na tela
  const [armed, setArmed] = useState(false);
  function confirmReplace() { if (armed) { setArmed(false); return true; } setArmed(true); setMsg("Isso substitui os planos atuais. Toque de novo para confirmar."); setTimeout(() => setArmed(false), 6000); return false; }

  async function patch(id: string, p: any) {
    setShots((l) => (l || []).map((x) => (x.id === id ? { ...x, ...p } : x)));
    await createClient().from("av_shots").update(p).eq("id", id);
    if ("done" in p) load();
  }
  async function remove(id: string) {
    const sh: any = shots?.find((x: any) => x.id === id);
    if (!(await apagarComLixeira({ tabela: "av_shots", filtro: { id }, oque: "este plano", rotulo: `Plano: ${(sh?.description || sh?.line || "sem texto").slice(0, 60)}`, link: "/audiovisual/decupagem" }))) return;
    setShots((l) => (l || []).filter((x) => x.id !== id));
    load();
  }
  async function move(i: number, d: -1 | 1) {
    if (!shots) return;
    const j = i + d; if (j < 0 || j >= shots.length) return;
    const a = shots[i], b = shots[j];
    const n = [...shots]; n[i] = { ...b, position: a.position }; n[j] = { ...a, position: b.position };
    setShots(n);
    const s = createClient();
    await Promise.all([s.from("av_shots").update({ position: b.position }).eq("id", a.id), s.from("av_shots").update({ position: a.position }).eq("id", b.id)]);
  }
  async function add() { await insertShots([{ description: "Novo plano", framing: "Médio · olho", audio: "Voz (lapela)" }], false); }

  const words = cur?.body ? parseScript(cur.body).words.length : 0;

  return (
    <>
      <PageHead kicker="01 · PRÉ-PRODUÇÃO" title="Decupagem" desc="Quebre o roteiro em planos para gravar. Comece pelo roteiro ou pela IA, ajuste e leve a lista para o set na ordem do dia." />

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
        <section className={`card p-4 ${sel ? "hidden lg:block" : ""}`}>
          <div className="flex gap-1 bg-panel2 rounded-xl p-1 mb-3">
            {([["gravar", "Para gravar"], ["todos", "Todos"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setScope(k)} className={`flex-1 text-xs font-semibold py-1.5 rounded-lg ${scope === k ? "bg-panel text-paper" : "text-fog"}`}>{l}</button>
            ))}
          </div>
          {!items && <p className="text-sm text-fog py-6 text-center">Carregando…</p>}
          {items && !list.length && <p className="text-sm text-fog py-6 text-center">Nenhum conteúdo nas etapas Roteiro ou Produção. <Link href="/creator/producao" className="text-mint underline">Quadro de produção</Link></p>}
          <div className="flex flex-col gap-2 max-h-[65vh] overflow-y-auto scroll-thin">
            {list.map((i) => {
              const c = counts[i.id];
              return (
                <button key={i.id} onClick={() => setSel(i.id)} className={`text-left rounded-xl border p-3 transition-colors ${sel === i.id ? "border-mint-dim bg-mint/5" : "border-line hover:border-fog"}`}>
                  <p className="text-sm font-semibold leading-snug">{i.title}</p>
                  <p className="text-xs text-fog mt-0.5 truncate">{[clients.get(i.client_id), i.record_date ? "grava " + fmtDay(i.record_date) : null].filter(Boolean).join(" · ") || i.st?.name}</p>
                  <div className="flex gap-1.5 mt-2">
                    {c ? <span className={`chip ${c.done === c.n ? "chip-mint" : ""}`}>{c.done}/{c.n} planos</span> : <span className="chip" style={{ color: "#f5c84c" }}>sem decupagem</span>}
                    {!i.body && <span className="chip">sem roteiro</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`card p-4 md:p-5 ${sel ? "" : "hidden lg:block"}`}>
          {!cur ? (
            <div className="py-16 text-center text-fog"><I.board className="w-10 h-10 mx-auto mb-3 opacity-60" /><p className="text-sm">Escolha um conteúdo para decupar.</p></div>
          ) : (
            <>
              <button onClick={() => setSel(null)} className="lg:hidden text-xs text-fog mb-3 flex items-center gap-1"><I.back className="w-3.5 h-3.5" />Conteúdos</button>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display font-extrabold text-2xl tracking-tight">{cur.title}</h2>
                  <p className="text-xs text-fog mt-1">{[clients.get(cur.client_id), cur.format, cur.record_date ? "grava " + fmtDay(cur.record_date) : null, words ? `${words} palavras no roteiro` : "sem roteiro"].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {cur.body && <Link href={`/audiovisual/teleprompter?c=${cur.id}`} className="btn btn-ghost btn-sm"><I.prompter className="w-3.5 h-3.5" />Teleprompter</Link>}
                  <button onClick={fromScript} disabled={!cur.body} className="btn btn-ghost btn-sm">Gerar do roteiro</button>
                  <button onClick={withAI} disabled={!cur.body || ai.busy} className="btn btn-mint btn-sm"><I.spark className="w-3.5 h-3.5" />{ai.busy ? "Decupando…" : "Decupar com IA"}</button>
                </div>
              </div>
              {(msg || ai.error) && <p className={`text-sm mt-3 ${ai.error ? "text-danger" : "text-mint"}`}>{ai.error || msg}</p>}
              {!cur.body && <p className="text-sm text-fog mt-3">Este conteúdo ainda não tem roteiro. Escreva no <Link href="/creator/producao" className="text-mint underline">Quadro de produção</Link> ou adicione os planos à mão.</p>}

              <div className="mt-4 flex flex-col gap-2">
                {!shots && <p className="text-sm text-fog">Carregando planos…</p>}
                {shots?.map((s, i) => (
                  <div key={s.id} className={`rounded-xl border p-3 ${s.done ? "border-mint-dim bg-mint/5" : "border-line"}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => patch(s.id, { done: !s.done })} className={`mt-1 w-5 h-5 rounded-md border-2 shrink-0 grid place-items-center ${s.done ? "bg-mint border-mint text-[var(--color-on-mint,#06140e)]" : "border-[#4a4d52]"}`} aria-label="Gravado">{s.done && "✓"}</button>
                      <span className="font-mono text-[11px] text-fog mt-1.5 w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0 grid gap-2">
                        {(s.part || s.line) && <p className="text-sm leading-snug"><span className="font-mono text-[10px] uppercase tracking-widest text-mint mr-2">{s.part}</span>{s.line && <span className="text-paper/90">“{s.line}”</span>}</p>}
                        <input className="input !py-1.5 font-semibold" defaultValue={s.description} onBlur={(e) => e.target.value !== s.description && patch(s.id, { description: e.target.value || "Plano" })} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input className="input !py-1.5 text-sm" list="framings" placeholder="Enquadramento" defaultValue={s.framing || ""} onBlur={(e) => e.target.value !== (s.framing || "") && patch(s.id, { framing: e.target.value || null })} />
                          <input className="input !py-1.5 text-sm" placeholder="Áudio / efeito" defaultValue={s.audio || ""} onBlur={(e) => e.target.value !== (s.audio || "") && patch(s.id, { audio: e.target.value || null })} />
                          <select className="input !py-1.5 text-sm" value={s.media_id || ""} onChange={(e) => patch(s.id, { media_id: e.target.value || null })}>
                            <option value="">Sem mídia do banco</option>
                            {media.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input className="input !py-1.5 text-sm" list="moves" placeholder="Movimento de câmera" defaultValue={s.movement || ""} onBlur={(e) => e.target.value !== (s.movement || "") && patch(s.id, { movement: e.target.value || null })} />
                          <input className="input !py-1.5 text-sm" placeholder="B-roll / inserção" defaultValue={s.broll || ""} onBlur={(e) => e.target.value !== (s.broll || "") && patch(s.id, { broll: e.target.value || null })} />
                        </div>
                        <input className="input !py-1.5 text-sm" placeholder="Nota de set (opcional)" defaultValue={s.notes || ""} onBlur={(e) => e.target.value !== (s.notes || "") && patch(s.id, { notes: e.target.value || null })} />
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => move(i, -1)} className="text-fog hover:text-paper text-xs px-1.5" aria-label="Subir">▲</button>
                        <button onClick={() => move(i, 1)} className="text-fog hover:text-paper text-xs px-1.5" aria-label="Descer">▼</button>
                        <button onClick={() => remove(s.id)} className="text-fog hover:text-danger px-1" aria-label="Apagar"><I.trash className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {shots && !shots.length && <p className="text-sm text-fog py-6 text-center">Nenhum plano ainda. Gere a partir do roteiro, peça para a IA ou adicione à mão.</p>}
                <button onClick={add} className="rounded-xl border border-dashed border-line p-3 text-sm text-fog hover:text-paper text-left">+ Adicionar plano</button>
              </div>
              {shots && shots.length > 0 && <p className="text-xs text-fog mt-3">{shots.length} planos · {shots.filter((s) => s.done).length} gravados · {shots.filter((s) => s.media_id).length} com mídia do banco. Para levar ao set, coloque este conteúdo numa <Link href="/audiovisual/ordem-do-dia" className="text-mint underline">ordem do dia</Link>.</p>}
              <datalist id="framings">{FRAMINGS.map((f) => <option key={f} value={f} />)}</datalist>
              <datalist id="moves">{MOVES.map((f) => <option key={f} value={f} />)}</datalist>
            </>
          )}
        </section>
      </div>
    </>
  );
}
