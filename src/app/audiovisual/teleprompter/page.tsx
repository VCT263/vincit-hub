"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import Modal from "@/components/agency/Modal";
import Prompter from "@/components/av/Prompter";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PREFS, estimate, loadPrefs, parseScript, savePrefs, type PrompterPrefs } from "@/lib/prompter";

const AVULSO = "__avulso";
const READY = ["roteiro", "producao"];
const fmtDay = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "") : "");

export default function TeleprompterPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [sel, setSel] = useState<string | null>(null);
  const [scope, setScope] = useState<"gravar" | "todos">("gravar");
  const [q, setQ] = useState("");
  const [avulso, setAvulso] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PrompterPrefs>(DEFAULT_PREFS);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data }, { data: st }, { data: cl }] = await Promise.all([
      s.from("content_ideas").select("id,title,body,hook,record_date,planned_for,status_id,client_id,format").is("archived_at", null).order("record_date", { ascending: true, nullsFirst: false }).limit(500),
      s.from("content_statuses").select("id,name,stage,color"),
      s.from("ag_clients").select("id,name"),
    ]);
    const m = new Map((st || []).map((x: any) => [x.id, x]));
    setItems((data || []).map((i: any) => ({ ...i, st: m.get(i.status_id) })));
    setClients(new Map((cl || []).map((x: any) => [x.id, x.name])));
  }, []);

  useEffect(() => {
    load();
    setPrefs(loadPrefs());
    try { setAvulso(localStorage.getItem("av-prompter-avulso") || ""); } catch {}
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) { setSel(c); setScope("todos"); }
  }, [load]);

  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const list = useMemo(() => {
    let l = (items || []).filter((i) => (i.body || "").trim());
    if (scope === "gravar") l = l.filter((i) => READY.includes(i.st?.stage) || (i.record_date && i.record_date >= today));
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((i) => (i.title + " " + (clients.get(i.client_id) || "")).toLowerCase().includes(t)); }
    return l;
  }, [items, scope, q, clients, today]);

  const cur = sel === AVULSO ? { id: null, title: "Texto avulso", body: avulso } : (items || []).find((i) => i.id === sel);
  const parsed = useMemo(() => parseScript(cur?.body || ""), [cur?.body]);

  async function saveEdit() {
    if (editing == null || !cur) return;
    setSaving(true);
    if (sel === AVULSO) { setAvulso(editing); try { localStorage.setItem("av-prompter-avulso", editing); } catch {} }
    else await createClient().from("content_ideas").update({ body: editing }).eq("id", sel);
    setSaving(false); setEditing(null);
    if (sel !== AVULSO) load();
  }

  async function openRemote() {
    setRemote(true);
    try {
      const QR = (await import("qrcode")).default;
      setQr(await QR.toDataURL(window.location.origin + "/audiovisual/teleprompter/controle", { margin: 1, width: 360, color: { dark: "#0c0c0d", light: "#f1f1f1" } }));
    } catch { setQr(null); }
  }
  const setP = (p: Partial<PrompterPrefs>) => { const n = { ...prefs, ...p }; setPrefs(n); savePrefs(n); };

  return (
    <>
      <PageHead kicker="02 · GRAVAÇÃO" title="Teleprompter" desc="Puxa o roteiro do conteúdo no Creator. Funciona no celular, segue a sua voz e pode ser controlado de outro aparelho.">
        <button onClick={openRemote} className="btn btn-ghost"><I.phone className="w-4 h-4" />Controlar pelo celular</button>
      </PageHead>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* lista */}
        <section className={`card p-4 ${sel ? "hidden lg:block" : ""}`}>
          <div className="flex gap-1 bg-panel2 rounded-xl p-1 mb-3">
            {([["gravar", "Para gravar"], ["todos", "Todos com roteiro"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setScope(k)} className={`flex-1 text-xs font-semibold py-1.5 rounded-lg ${scope === k ? "bg-panel text-paper" : "text-fog"}`}>{l}</button>
            ))}
          </div>
          <div className="relative mb-3">
            <I.search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
            <input className="input pl-9" placeholder="Buscar roteiro ou cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!items && <p className="text-sm text-fog py-6 text-center">Carregando…</p>}
          {items && !list.length && (
            <p className="text-sm text-fog py-6 text-center">
              {scope === "gravar" ? "Nenhum roteiro nas etapas Roteiro ou Produção." : "Nenhum conteúdo com roteiro ainda."}{" "}
              <Link href="/creator/producao" className="text-mint underline">Abrir o Quadro de produção</Link>
            </p>
          )}
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto scroll-thin">
            {list.map((i) => {
              const n = parseScript(i.body).words.length;
              return (
                <button key={i.id} onClick={() => { setSel(i.id); setEditing(null); }} className={`text-left rounded-xl border p-3 transition-colors ${sel === i.id ? "border-mint-dim bg-mint/5" : "border-line hover:border-fog"}`}>
                  <p className="text-sm font-semibold leading-snug">{i.title}</p>
                  <p className="text-xs text-fog mt-0.5 truncate">{[clients.get(i.client_id), i.record_date ? "grava " + fmtDay(i.record_date) : null].filter(Boolean).join(" · ") || i.st?.name}</p>
                  <div className="flex gap-1.5 mt-2">
                    {i.st && <span className="chip"><span className="w-1.5 h-1.5 rounded-full" style={{ background: i.st.color }} />{i.st.name}</span>}
                    <span className="chip">{estimate(n)}</span>
                  </div>
                </button>
              );
            })}
            <button onClick={() => { setSel(AVULSO); setEditing(avulso ? null : ""); }} className={`text-left rounded-xl border border-dashed p-3 text-sm ${sel === AVULSO ? "border-mint-dim text-paper" : "border-line text-fog hover:text-paper"}`}>+ Colar um texto avulso</button>
          </div>
        </section>

        {/* roteiro escolhido */}
        <section className={`card p-5 ${sel ? "" : "hidden lg:block"}`}>
          {!cur ? (
            <div className="py-16 text-center text-fog">
              <I.prompter className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p className="text-sm">Escolha um roteiro para abrir no teleprompter.</p>
            </div>
          ) : (
            <>
              <button onClick={() => setSel(null)} className="lg:hidden text-xs text-fog mb-3 flex items-center gap-1"><I.back className="w-3.5 h-3.5" />Roteiros</button>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display font-extrabold text-2xl tracking-tight">{cur.title}</h2>
                  <p className="text-xs text-fog mt-1">{[sel !== AVULSO && clients.get((cur as any).client_id), (cur as any).record_date ? "grava " + fmtDay((cur as any).record_date) : null, `${parsed.words.length} palavras`, `~${estimate(parsed.words.length)} lendo com calma`].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {editing == null && <button onClick={() => setEditing(cur.body || "")} className="btn btn-ghost btn-sm"><I.pen className="w-3.5 h-3.5" />Editar</button>}
                  <button onClick={() => setOpen(true)} disabled={!parsed.words.length} className="btn btn-mint"><I.play className="w-4 h-4" />Começar</button>
                </div>
              </div>

              {editing != null ? (
                <div className="mt-4">
                  <textarea className="input min-h-[320px] font-[inherit] leading-relaxed" value={editing} onChange={(e) => setEditing(e.target.value)} placeholder="Cole ou escreva o texto. Use [colchetes] para indicações que não são faladas." />
                  <p className="text-xs text-fog mt-2">{sel === AVULSO ? "Fica salvo só neste aparelho." : "Salva no cartão do conteúdo, no Quadro de produção."} Use [colchetes] para indicações de cena e **Etiqueta:** no começo da linha para marcar blocos.</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={saveEdit} disabled={saving} className="btn btn-mint btn-sm">{saving ? "Salvando…" : "Salvar roteiro"}</button>
                    <button onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-black border border-line p-5 max-h-[46vh] overflow-y-auto scroll-thin text-[17px] leading-relaxed font-semibold">
                  {parsed.blocks.map((b, i) => (
                    <p key={i} className="mb-3">
                      {b.label && <span className="block font-mono text-[10px] uppercase tracking-widest text-mint mb-0.5">{b.label}</span>}
                      {b.toks.map((t, k) => <span key={k} className={t.cue ? "text-fog text-sm font-normal" : ""}>{t.t} </span>)}
                    </p>
                  ))}
                  {!parsed.blocks.length && <p className="text-fog font-normal text-sm">Sem texto ainda. Toque em Editar para escrever.</p>}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-5 text-sm">
                {([
                  ["countdown", "Contagem de 3 s antes de começar"],
                  ["voice", "Rolar pela minha voz (Chrome)"],
                  ["mirror", "Espelhar para o vidro do prompter"],
                  ["hideCues", "Esconder [indicações] e etiquetas"],
                ] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center justify-between gap-3 py-2 border-b border-line cursor-pointer">
                    <span>{l}</span>
                    <button type="button" role="switch" aria-checked={!!prefs[k]} onClick={() => setP({ [k]: !prefs[k] } as any)} className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${prefs[k] ? "bg-mint" : "bg-line"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper transition-all ${prefs[k] ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </label>
                ))}
                <label className="flex items-center justify-between gap-3 py-2 border-b border-line">
                  <span>Velocidade inicial</span>
                  <input type="range" min={1} max={15} step={0.5} value={prefs.speed} onChange={(e) => setP({ speed: +e.target.value })} className="accent-[var(--color-mint)] w-32" />
                </label>
                <label className="flex items-center justify-between gap-3 py-2 border-b border-line">
                  <span>Alinhamento</span>
                  <select className="input !w-auto !py-1 text-sm" value={prefs.align} onChange={(e) => setP({ align: e.target.value as any })}>
                    <option value="center">Centro</option><option value="left">Esquerda</option>
                  </select>
                </label>
              </div>
            </>
          )}
        </section>
      </div>

      {open && cur && (
        <Prompter title={cur.title} text={cur.body || ""} contentId={sel === AVULSO ? null : sel} prefs={prefs} setPrefs={setPrefs} onClose={() => setOpen(false)} />
      )}

      <Modal open={remote} title="Controlar pelo celular" onClose={() => setRemote(false)}>
        <div className="flex flex-col sm:flex-row gap-5 items-center">
          {qr ? <img src={qr} alt="QR code do controle remoto" className="w-44 h-44 rounded-xl" /> : <div className="w-44 h-44 rounded-xl bg-panel2" />}
          <div className="text-sm text-fog space-y-2">
            <p>1. Abra o teleprompter neste aparelho (notebook, tablet ou o celular que fica na câmera).</p>
            <p>2. No outro celular, aponte a câmera para o código e entre com a <b className="text-paper">mesma conta</b> do HUB.</p>
            <p>3. Pause, acelere, volte e marque o take bom de longe.</p>
            <Link href="/audiovisual/teleprompter/controle" className="text-mint underline text-xs">ou abra o controle aqui</Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
