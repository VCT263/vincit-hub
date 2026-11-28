"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import Markdown from "@/components/Markdown";
import { FRAMINGS } from "@/lib/shots";
import { MOVES, PARTS, mmss, rowsFromScript, scriptExtras, speechSeconds } from "@/lib/roteiro";
import { kitFrom } from "@/lib/design";
import { parseFont } from "@/lib/editor/model";
import { apagarComLixeira } from "@/lib/lixeira";

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
/* ---------- identidade da marca na folha ---------- */
type Brand = { name: string; accent: string; dark: string; font: string; logo?: string; from: "marca" | "kit" | "hub" };
const HUB_BRAND: Brand = { name: "VINCIT HUB", accent: "#6eefb6", dark: "#141416", font: "Bricolage Grotesque", from: "hub" };
/** marca do cliente na seção Design; senão o kit de estilo do perfil ou do cliente; senão a do HUB */
function pickBrand(item: any, marcas: any[], kits: any[], clientName?: string | null): Brand {
  const m = item.client_id && marcas.find((x) => x.client_id === item.client_id);
  if (m) {
    const k = kitFrom(m);
    return { name: k.name || clientName || m.title, accent: k.colors["Primária"] || HUB_BRAND.accent, dark: k.colors["Escuro"] || HUB_BRAND.dark, font: k.title || HUB_BRAND.font, logo: k.logo, from: "marca" };
  }
  const kit = kits.find((x) => item.account_id && x.account_id === item.account_id) || kits.find((x) => item.client_id && x.client_id === item.client_id);
  if (kit) {
    const d = kit.data || {};
    return { name: clientName || kit.name, accent: d.cores?.destaque || HUB_BRAND.accent, dark: d.cores?.fundo && lum(d.cores.fundo) < 0.3 ? d.cores.fundo : HUB_BRAND.dark, font: parseFont(d.fontes?.titulo).family || HUB_BRAND.font, from: "kit" };
  }
  return { ...HUB_BRAND, name: clientName || HUB_BRAND.name };
}
function lum(hex: string) {
  const h = (hex || "").replace("#", "");
  if (h.length < 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** fonte de título da marca, carregada do Google Fonts na hora */
function useBrandFont(font: string) {
  useEffect(() => {
    if (!font || /bricolage/i.test(font)) return;
    const fam = font.trim().replace(/ /g, "+");
    const id = `rt-font-${fam}`;
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@400;700;800;900&display=swap`;
    l.onerror = () => { l.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`; };
    document.head.appendChild(l);
  }, [font]);
}

/* ---------- linguagem de set: siglas de plano e movimento ---------- */
const SIGLA_PLANO: [RegExp, string, string][] = [
  [/geral/i, "PG", "plano geral"], [/aberto|conjunto/i, "PA", "plano aberto"], [/m[eé]dio fechado/i, "PP", "primeiro plano"],
  [/m[eé]dio/i, "PM", "plano médio"], [/close|primeiro/i, "CL", "close"], [/detalhe/i, "PD", "plano detalhe"], [/macro/i, "MC", "macro"],
  [/top|zenital/i, "ZEN", "zenital (top shot)"], [/contra/i, "CPL", "contra-plongée"], [/plong/i, "PLG", "plongée"],
  [/over|ombro/i, "OTS", "sobre o ombro"], [/pov/i, "POV", "ponto de vista"], [/drone/i, "DRN", "drone"],
];
const SIGLA_MOV: [RegExp, string, string][] = [
  [/fix|trip/i, "FIXA", "câmera fixa"], [/m[aã]o/i, "MÃO", "câmera na mão"], [/push|aproxima/i, "PUSH", "aproxima devagar"],
  [/pull|afasta/i, "PULL", "afasta devagar"], [/pan/i, "PAN", "panorâmica"], [/tilt/i, "TILT", "tilt"], [/acompanha|segue/i, "SEGUE", "acompanha a ação"],
  [/travel/i, "TRAV", "travelling"], [/gimbal/i, "GMB", "gimbal"], [/zoom/i, "ZOOM", "zoom na edição"],
];
const sigla = (v: string | null | undefined, list: [RegExp, string, string][]) => { const f = v ? list.find(([re]) => re.test(v)) : null; return f ? { s: f[1], d: f[2] } : null; };

/** timecode de cada plano: usa o tempo do roteiro (0–3s) ou estima pela fala */
function timecodes(rows: any[]) {
  let t = 0;
  return rows.map((x) => {
    const m = splitPart(x.part)[1].match(/(\d+)\s*[–-]\s*(\d+)/);
    let a = t, b: number;
    if (m) { a = +m[1]; b = +m[2]; } else b = a + Math.max(2, speechSeconds(x.line || ""));
    t = b;
    return `${mmss(a)}–${mmss(b)}`;
  });
}

/* colunas da decupagem: no celular, fala, direção e B-roll empilhados; no computador e no PDF, lado a lado */
const GRID = "grid-cols-[52px_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.85fr)_28px]";
const GRID_M = "grid-cols-[44px_minmax(0,1fr)_30px]";
const GRID_MD = "md:grid-cols-[52px_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.85fr)_28px]";
const GRID_PRINT = "print:grid-cols-[52px_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.85fr)_28px]";

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
  const [brand, setBrand] = useState<Brand>(HUB_BRAND);
  const built = useRef(false);
  // B-roll gravado: marca só neste aparelho (é lista de conferência do set)
  const [brollOk, setBrollOk] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setBrollOk(JSON.parse(localStorage.getItem(`rt-broll-${id}`) || "{}")); } catch {} }, [id]);
  const toggleBroll = (sid: string) => setBrollOk((m) => { const n = { ...m, [sid]: !m[sid] }; try { localStorage.setItem(`rt-broll-${id}`, JSON.stringify(n)); } catch {} return n; });
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
      const [rows, { data: ci }, { data: sh }, { data: marcas }, { data: kits }] = await Promise.all([
        loadShots(),
        c.from("content_ideas").select("tech_brief,body,hook").eq("id", id).maybeSingle(),
        c.from("av_shoots").select("id,title,date,call_time,wrap_time,location,team,share_token").contains("content_ids", [id]).order("date", { ascending: false }).limit(1),
        c.from("design_projects").select("id,title,client_id,data").eq("kind", "marca").is("archived_at", null).order("updated_at", { ascending: false }),
        c.from("av_style_kits").select("name,account_id,client_id,data").order("updated_at", { ascending: false }),
      ]);
      setBrand(pickBrand(item, marcas || [], kits || [], clientName));
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
    if (replace && shots?.length) await apagarComLixeira({ tabela: "av_shots", filtro: { content_id: id }, oque: "a tabela anterior", rotulo: "Roteiro técnico substituído", link: "/creator/producao", semSenha: true });
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
    const sh = shots?.find((x) => x.id === sid);
    if (!(await apagarComLixeira({ tabela: "av_shots", filtro: { id: sid }, oque: "esta linha do roteiro técnico", rotulo: `Linha do roteiro: ${(sh?.line || sh?.description || "sem texto").slice(0, 60)}` }))) return;
    setShots((l) => (l || []).filter((x) => x.id !== sid));
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

  useBrandFont(brand.font);
  const falas = (shots || []).filter((x) => x.line);
  const secs = speechSeconds(falas.map((x) => x.line).join(" ") || "");
  const gravados = (shots || []).filter((x) => x.done).length;
  const tcs = timecodes(shots || []);
  const total = tcs.length ? tcs[tcs.length - 1].split("–")[1] : falas.length ? mmss(secs) : null;
  // cena = sequência de planos da mesma etapa; plano = 1.1, 1.2…
  const nums: string[] = [];
  const firstOf: boolean[] = [];
  let sc = 0, pl = 0;
  (shots || []).forEach((x, i) => {
    const first = i === 0 || splitPart(shots![i - 1].part)[0] !== splitPart(x.part)[0];
    if (first) { sc++; pl = 0; }
    pl++; nums.push(`${sc}.${pl}`); firstOf.push(first);
  });
  const usedPl = [...new Map((shots || []).map((x) => sigla(x.framing, SIGLA_PLANO)).filter(Boolean).map((x) => [x!.s, x!])).values()];
  const usedMv = [...new Map((shots || []).map((x) => sigla(x.movement, SIGLA_MOV)).filter(Boolean).map((x) => [x!.s, x!])).values()];
  // na folha do set ficam só as dicas de gravação; as de edição, legenda e capa ficam no roteiro completo
  const dicas = extras.dicas.filter((d) => !/edi[cç][aã]o|legenda|capa\b|m[uú]sica|trilha|corte/i.test(d));
  const light = lum(brand.accent) > 0.55;
  const chip = { background: light ? brand.dark : brand.accent, color: light ? brand.accent : "#fff" };
  const bf = { fontFamily: `"${brand.font}", var(--font-display)` };
  const v = (x?: string | null) => x || "—";
  const brolls = (shots || []).map((x, i) => ({ x, n: nums[i] })).filter(({ x }) => (x.broll || "").trim());

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
        <article className="roteiro-paper relative overflow-hidden mx-auto w-full max-w-[210mm] min-h-[297mm] bg-[#fafaf7] text-[#141416] rounded-[6px] shadow-[0_30px_80px_rgba(0,0,0,.55)] px-5 pt-9 pb-7 sm:px-8 md:px-[15mm] md:pt-[17mm] md:pb-[15mm]" onClick={(e) => e.stopPropagation()}>
          {/* faixa da marca */}
          <div className="absolute inset-x-0 top-0 h-[7px] sheet-ink print:hidden" style={{ background: `linear-gradient(90deg, ${brand.accent} 0 72%, ${brand.dark} 72% 100%)` }} />

          {/* cabeçalho */}
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {brand.logo ? <img loading="lazy" decoding="async" src={brand.logo} alt="" className="h-8 max-w-[140px] object-contain" /> : (
                <span className="w-8 h-8 rounded-[7px] grid place-items-center text-[15px] font-black sheet-ink shrink-0" style={{ ...chip, ...bf }}>{(brand.name || "V").slice(0, 1).toUpperCase()}</span>
              )}
              <span className="text-[15px] font-extrabold tracking-tight truncate" style={bf}>{brand.name}</span>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-[9.5px] uppercase tracking-[.2em] text-[#141416] font-bold">Roteiro técnico de gravação</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-[#8a8f94] mt-0.5">RT-{id.slice(0, 4).toUpperCase()} · {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </header>

          <div className="mt-7 mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#6b6f74]">{[item.format, accountName ? `@${accountName}` : null, statusName].filter(Boolean).join(" · ")}</p>
            <h1 className="text-[30px] sm:text-[40px] font-extrabold leading-[1] tracking-tight mt-2 break-words" style={bf}>{item.title || "Sem título"}</h1>
          </div>

          {/* ficha técnica (como uma claquete) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 border-[1.5px] border-[#141416] rounded-[6px] overflow-hidden">
            {([
              ["Marca", brand.name],
              ["Formato", v(item.format)],
              ["Pilar", v(item.pillar)],
              ["Publicação", v(fmtDate(item.planned_for))],
              ["Diária", shoot ? `${fmtDate(shoot.date)}${shoot.call_time ? ` · ${String(shoot.call_time).slice(0, 5)}` : ""}` : fmtDate(item.record_date) || "a definir"],
              ["Locação", v(shoot?.location || brief.locacao)],
              ["Duração", total ? `~${total}` : "—"],
              ["Planos", shots ? `${shots.length}${gravados ? ` · ${gravados} ok` : ""}` : "…"],
            ] as const).map(([l, val], i) => (
              <div key={l} className={`px-3 py-2.5 border-[#141416]/15 ${i % 2 ? "" : "border-r"} sm:border-r print:border-r ${i % 4 === 3 ? "sm:border-r-0 print:border-r-0" : ""} ${i < 6 ? "border-b" : ""} ${i >= 4 ? "sm:border-b-0 print:border-b-0" : ""}`}>
                <p className="font-mono text-[8.5px] uppercase tracking-[.18em] text-[#8a8f94]">{l}</p>
                <p className="text-[13px] font-semibold mt-1 truncate">{val}</p>
              </div>
            ))}
          </div>

          {/* 01 conceito */}
          <Sec n={1} title="Conceito criativo" chip={chip} bf={bf}>
            <div className="grid md:grid-cols-[1.25fr_1fr] print:grid-cols-[1.25fr_1fr] gap-5">
              <div className="pl-4" style={{ boxShadow: `inset 3px 0 0 ${light ? brand.dark : brand.accent}` }}>
                <p className="sheet-label">Gancho · 0 a 3 segundos</p>
                <Field value={hook} onCommit={saveHook} placeholder="Escreva o gancho" className="text-[22px] sm:text-[26px] font-extrabold leading-[1.1] tracking-tight" style={bf} />
                {extras.ganchos.length > 1 && (
                  <div className="roteiro-noprint flex flex-wrap gap-1.5 mt-2.5">
                    {extras.ganchos.slice(0, 4).map((g) => (
                      <button key={g} onClick={() => saveHook(g)} className={`text-left text-xs rounded-full border px-3 py-1 ${g === hook ? "border-[#141416] bg-[#141416] text-[#fafaf7]" : "border-[#d4d4ce] text-[#4a4d52] hover:border-[#141416]"}`}>{g}</button>
                    ))}
                  </div>
                )}
                {extras.ideia && <p className="text-[13.5px] leading-relaxed text-[#4a4d52] mt-4">{extras.ideia}</p>}
              </div>
              <div className="grid gap-3 content-start">
                <div><p className="sheet-label">Objetivo</p><Field value={brief.objetivo || ""} onCommit={(x) => saveBrief("objetivo", x)} placeholder="O que a pessoa precisa sentir, entender ou fazer" className="text-[13.5px]" /></div>
                <div><p className="sheet-label">Tom e sensação</p><Field value={brief.tom || ""} onCommit={(x) => saveBrief("tom", x)} placeholder="Ex.: papo próximo, sem cara de anúncio" className="text-[13.5px]" /></div>
                <div><p className="sheet-label">Referência visual</p><Field value={brief.referencia || ""} onCommit={(x) => saveBrief("referencia", x)} placeholder="Um vídeo, um perfil ou uma estética" className="text-[13.5px]" /></div>
              </div>
            </div>
          </Sec>

          {/* 02 decupagem técnica: fala × direção × B-roll */}
          <Sec n={2} title="Decupagem técnica" aside="fala, direção e B-roll, plano a plano" chip={chip} bf={bf} className="print:break-before-page print:mt-0">
            <div className="rounded-[6px] border-[1.5px] border-[#141416] overflow-hidden sheet-ink">
              <div className={`hidden md:grid print:grid ${GRID} font-mono text-[9px] uppercase tracking-[.16em]`} style={{ background: brand.dark, color: "#fafaf7" }}>
                <span className="px-2 py-2">Plano</span>
                <span className="px-3 py-2 border-l border-white/15">Fala · o que dizer</span>
                <span className="px-3 py-2 border-l border-white/15">Direção · como gravar</span>
                <span className="px-3 py-2 border-l border-white/15">B-roll · à parte</span>
                <span className="py-2 border-l border-white/15 text-center">ok</span>
              </div>
              {shots === null && <p className="text-sm text-[#6b6f74] p-4">Carregando…</p>}
              {shots && !shots.length && <p className="text-sm text-[#6b6f74] p-4">Nenhum plano ainda.</p>}
              {shots?.map((x, i) => {
                const [et, tempo] = splitPart(x.part);
                const col = etapaColor(et);
                const sp = sigla(x.framing, SIGLA_PLANO), sm = sigla(x.movement, SIGLA_MOV);
                const cell = "min-w-0 px-3 md:border-l print:border-l border-[#e3e3dd] md:py-3 print:py-3 md:col-start-auto md:row-start-auto print:col-start-auto print:row-start-auto";
                return (
                  <div key={x.id} className="roteiro-row">
                    {firstOf[i] && (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 border-t border-[#141416] first:border-t-0" style={{ background: col.bg }}>
                        <span className="text-[13px] font-extrabold tracking-tight" style={{ ...bf, color: col.ink }}>Cena {nums[i].split(".")[0].padStart(2, "0")}</span>
                        <span className="w-1 h-1 rounded-full" style={{ background: col.ink }} />
                        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[.18em]" style={{ color: col.ink }}>{et || "Sem etapa"}</span>
                      </div>
                    )}
                    <div className={`grid ${GRID_M} ${GRID_MD} ${GRID_PRINT} border-t border-[#d4d4ce] ${x.done ? "bg-[color-mix(in_srgb,var(--color-mint)_10%,#fafaf7)] print:bg-transparent" : ""}`} style={{ boxShadow: `inset 3px 0 0 ${col.c}` }}>
                      <div className="pl-2.5 pr-1 py-3 row-span-3 md:row-span-1 print:row-span-1">
                        <p className="text-[17px] font-extrabold leading-none tracking-tight" style={bf}>{nums[i]}</p>
                        <p className="font-mono text-[8.5px] text-[#6b6f74] mt-1.5 leading-tight tabular-nums">{tempo ? tempo : tcs[i]}</p>
                      </div>
                      {/* fala: só o que se diz (o teleprompter lê esta coluna) */}
                      <div className={`${cell} col-start-2 row-start-1 pt-3`}>
                        <p className="sheet-tag md:hidden print:hidden">Fala</p>
                        <Field value={x.line || ""} onCommit={(t) => patchShot(x.id, { line: t || null })} placeholder="Sem fala · só imagem" className="text-[15px] font-medium leading-relaxed" />
                        <div className="roteiro-noprint flex items-center gap-1 mt-2 text-[#9a9c9f]">
                          <select value={et} onChange={(e) => patchShot(x.id, { part: tempo ? `${e.target.value} · ${tempo}` : e.target.value })} className="bg-transparent font-mono text-[9px] uppercase tracking-[.12em] text-[#6b6f74] outline-none cursor-pointer">
                            {[...new Set([...PARTS, et].filter(Boolean))].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <span className="flex-1" />
                          <button onClick={() => moveShot(i, -1)} className="px-1 hover:text-[#141416]" aria-label="Subir">▲</button>
                          <button onClick={() => moveShot(i, 1)} className="px-1 hover:text-[#141416]" aria-label="Descer">▼</button>
                          <button onClick={() => removeShot(x.id)} className="px-1 hover:text-[#c0392b]" aria-label="Apagar"><I.trash className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {/* direção: plano, câmera e estilo da cena, junto da fala */}
                      <div className={`${cell} col-start-2 row-start-2 pt-2.5 md:bg-transparent text-[13px] leading-snug`}>
                        <p className="sheet-tag md:hidden print:hidden">Direção</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1.5 min-w-0"><Pill s={sp?.s} /><Field value={x.framing || ""} onCommit={(t) => patchShot(x.id, { framing: t || null })} placeholder="Plano" list="rt-framings" className="text-[12px] text-[#4a4d52] !w-[112px]" /></span>
                          <span className="flex items-center gap-1.5 min-w-0"><Pill s={sm?.s} /><Field value={x.movement || ""} onCommit={(t) => patchShot(x.id, { movement: t || null })} placeholder="Câmera" list="rt-moves" className="text-[12px] text-[#4a4d52] !w-[112px]" /></span>
                        </div>
                        <Field value={x.description || ""} onCommit={(t) => patchShot(x.id, { description: t || "Plano" })} placeholder="Estilo da cena: ação, lugar, tom" className="mt-1.5 text-[#33363a]" />
                      </div>
                      {/* B-roll: imagem de apoio gravada à parte */}
                      <div className={`${cell} col-start-2 row-start-3 pt-2.5 pb-3 text-[13px] leading-snug`}>
                        <p className="sheet-tag md:hidden print:hidden">B-roll</p>
                        {x.broll || broll === x.id ? (
                          <div className="rounded-[4px] border border-dashed border-[#d9b45a] bg-[#fdf6e3] px-2 py-1.5 print:bg-transparent">
                            <Field value={x.broll || ""} onCommit={(t) => { setBroll(null); patchShot(x.id, { broll: t || null }); }} placeholder="O que gravar de apoio, sem fala" className="text-[12.5px] text-[#5c4300]" />
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setBroll(x.id)} className="roteiro-noprint text-[11px] text-[#9a9c9f] hover:text-[#141416]">+ B-roll</button>
                            <span className="hidden print:inline text-[#b3b4b0]">—</span>
                          </>
                        )}
                      </div>
                      <div className="py-3 md:border-l print:border-l border-[#e3e3dd] flex justify-center col-start-3 row-start-1 md:col-start-auto md:row-start-auto print:col-start-auto print:row-start-auto">
                        <button onClick={() => patchShot(x.id, { done: !x.done })} className={`w-[17px] h-[17px] rounded-[4px] border-[1.5px] grid place-items-center text-[10px] font-bold ${x.done ? "bg-[#141416] border-[#141416] text-[var(--color-mint)] print:bg-transparent print:text-[#141416]" : "border-[#9a9c9f]"}`} aria-label="Gravado" title="Gravado">{x.done ? "✓" : ""}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {(usedPl.length > 0 || usedMv.length > 0) && (
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#6b6f74]">
                {[...usedPl, ...usedMv].map((u, j) => <span key={u.s} className="whitespace-nowrap">{j > 0 && <span className="mx-1.5 text-[#c9c9c3]">·</span>}<b className="font-mono font-bold text-[#141416]">{u.s}</b> {u.d}</span>)}
              </p>
            )}
            {shots && (
              <div className="roteiro-noprint flex flex-wrap gap-2 mt-3">
                <button onClick={addShot} className="sheet-btn">+ Adicionar plano</button>
                {body.trim() && <button onClick={rebuild} className="sheet-btn">{armed ? "Confirmar: remontar tabela" : "Remontar a partir do roteiro"}</button>}
                <details className="w-full mt-1 rounded-[10px] border border-[#e3e3dd] bg-[#f3f3ee]">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[#4a4d52]">Texto completo do roteiro</summary>
                  {editText == null ? (
                    <>
                      <div className="px-4 pb-3 text-[#141416] sheet-md">{body.trim() ? <Markdown text={body} /> : <p className="text-sm text-[#6b6f74]">Vazio.</p>}</div>
                      <div className="px-4 pb-4"><button onClick={() => setEditText(body)} className="sheet-btn">Editar texto</button></div>
                    </>
                  ) : (
                    <div className="p-3">
                      <textarea className="w-full min-h-[280px] bg-white border border-[#dcdcd6] rounded-[8px] p-3 font-mono text-xs leading-relaxed text-[#141416] outline-none focus:border-[#141416]" value={editText} onChange={(e) => setEditText(e.target.value)} />
                      <div className="flex gap-2 mt-2"><button onClick={saveText} className="sheet-btn sheet-btn-dark">Salvar roteiro</button><button onClick={() => setEditText(null)} className="sheet-btn">Cancelar</button></div>
                    </div>
                  )}
                </details>
              </div>
            )}
          </Sec>

          {/* 03 B-roll: lista para gravar à parte, de uma vez */}
          {brolls.length > 0 && (
            <Sec n={3} title="B-roll" aside="gravar à parte, sem fala" chip={chip} bf={bf}>
              <p className="text-[12.5px] text-[#6b6f74] -mt-1 mb-3">Imagens de apoio que cobrem a fala na edição. Grave em sequência, depois das falas ou quando a luz estiver boa.</p>
              <ol className="border-[1.5px] border-[#141416] rounded-[6px] overflow-hidden sheet-ink">
                {brolls.map(({ x, n }, j) => {
                  const ok = !!brollOk[x.id];
                  return (
                    <li key={x.id} className={`grid grid-cols-[48px_minmax(0,1fr)_30px] items-start ${j ? "border-t border-[#e3e3dd]" : ""} ${ok ? "bg-[#fdf6e3] print:bg-transparent" : ""}`}>
                      <span className="pl-3 py-2.5 text-[14px] font-extrabold tracking-tight" style={bf}>{n}</span>
                      <span className={`py-2.5 pr-2 text-[13.5px] leading-snug ${ok ? "line-through text-[#8a8f94] print:no-underline print:text-[#141416]" : ""}`}>{x.broll}</span>
                      <span className="py-2.5 flex justify-center">
                        <button onClick={() => toggleBroll(x.id)} className={`w-[17px] h-[17px] rounded-[4px] border-[1.5px] grid place-items-center text-[10px] font-bold ${ok ? "bg-[#141416] border-[#141416] text-[#f0b429] print:bg-transparent print:text-[#141416]" : "border-[#9a9c9f]"}`} aria-label="B-roll gravado" title="Gravado">{ok ? "✓" : ""}</button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Sec>
          )}

          {/* set: ordem do dia */}
          <Sec n={brolls.length ? 4 : 3} title="Set" aside="ordem do dia" chip={chip} bf={bf}>
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 border-[1.5px] border-[#141416] rounded-[6px] overflow-hidden">
              {([
                ["Data", shoot ? fmtDate(shoot.date) : fmtDate(item.record_date) || "a definir"],
                ["Chamada", shoot?.call_time ? String(shoot.call_time).slice(0, 5) : "—"],
                ["Encerramento", shoot?.wrap_time ? String(shoot.wrap_time).slice(0, 5) : "—"],
                ["Equipe", Array.isArray(shoot?.team) && shoot.team.length ? shoot.team.map((t: any) => t.name).filter(Boolean).join(", ") || `${shoot.team.length} pessoas` : "—"],
              ] as const).map(([l, val], i) => (
                <div key={l} className={`px-3 py-2.5 border-[#141416]/15 ${i % 2 ? "" : "border-r"} sm:border-r print:border-r ${i === 3 ? "sm:border-r-0 print:border-r-0" : ""} ${i < 2 ? "border-b sm:border-b-0 print:border-b-0" : ""}`}>
                  <p className="font-mono text-[8.5px] uppercase tracking-[.18em] text-[#8a8f94]">{l}</p>
                  <p className="text-[13px] font-semibold mt-1 truncate">{val}</p>
                </div>
              ))}
            </div>
            <div className="roteiro-noprint flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
              <Link href={shoot ? "/audiovisual/ordem-do-dia" : `/audiovisual/ordem-do-dia?c=${id}`} className="underline underline-offset-4 decoration-[#b5b5ae] hover:decoration-[#141416]">{shoot ? "Abrir a ordem do dia" : "Criar a ordem do dia"} →</Link>
              <Link href={`/audiovisual/teleprompter?c=${id}`} className="underline underline-offset-4 decoration-[#b5b5ae] hover:decoration-[#141416]">Teleprompter com {falas.length} falas · ~{mmss(secs)} →</Link>
            </div>

            <div className="grid sm:grid-cols-2 print:grid-cols-2 mt-4 border-t border-[#d4d4ce]">
              {BRIEF.map(([key, l, ph], i) => (
                <div key={key} className={`py-3 border-b border-[#d4d4ce] ${i % 2 === 0 ? "sm:pr-4 sm:border-r print:pr-4 print:border-r" : "sm:pl-4 print:pl-4"}`}>
                  <p className="sheet-label">{l}</p>
                  <Field value={brief[key] || ""} onCommit={(x) => saveBrief(key, x)} placeholder={ph} className="text-[13.5px]" />
                </div>
              ))}
            </div>

            {dicas.length > 0 && (
              <div className="mt-5">
                <p className="sheet-label">Notas de direção</p>
                <ol className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed">
                  {dicas.map((d, j) => <li key={j} className="grid grid-cols-[22px_1fr] gap-1"><span className="font-mono text-[10px] text-[#8a8f94] pt-[3px]">{String(j + 1).padStart(2, "0")}</span><span>{d.replace(/\*\*/g, "")}</span></li>)}
                </ol>
              </div>
            )}
          </Sec>

          {/* aprovação */}
          <div className="grid grid-cols-2 gap-8 mt-14 break-inside-avoid">
            {["Direção", `Aprovação · ${clientName || brand.name}`].map((l) => (
              <div key={l}><div className="h-8 border-b border-[#141416]" /><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#6b6f74] mt-1.5">{l}</p></div>
            ))}
          </div>

          <footer className="mt-8 pt-3 border-t border-[#dcdcd6] flex justify-between gap-4 font-mono text-[9px] uppercase tracking-[.16em] text-[#8a8f94]">
            <span className="truncate">{brand.name} · roteiro técnico · {item.title}</span>
            <span className="shrink-0">VINCIT HUB</span>
          </footer>

          <datalist id="rt-framings">{FRAMINGS.map((f) => <option key={f} value={f} />)}</datalist>
          <datalist id="rt-moves">{MOVES.map((f) => <option key={f} value={f} />)}</datalist>
        </article>
      </div>
    </div>
  );
  return mounted ? createPortal(doc, document.body) : null;
}

function Sec({ n, title, aside, chip, bf, className = "", children }: { n: number; title: string; aside?: string; chip: React.CSSProperties; bf: React.CSSProperties; className?: string; children: React.ReactNode }) {
  return (
    <section id={`rt-${n}`} className={`mt-11 scroll-mt-20 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[12px] font-extrabold px-1.5 py-0.5 rounded-[4px] sheet-ink leading-none" style={{ ...chip, ...bf }}>0{n}</span>
        <h2 className="text-[21px] sm:text-[24px] font-extrabold tracking-tight leading-none" style={bf}>{title}</h2>
        <span className="flex-1 h-px bg-[#141416] translate-y-1" />
        {aside && <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[.16em] text-[#8a8f94]">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** sigla de plano ou movimento, como na linguagem de set */
function Pill({ s }: { s?: string }) {
  return <span className={`font-mono text-[9px] font-bold tracking-[.06em] px-1.5 py-[2px] rounded-[3px] shrink-0 sheet-ink ${s ? "bg-[#141416] text-[#fafaf7]" : "border border-dashed border-[#c9c9c3] text-[#b3b4b0]"}`}>{s || "—"}</span>;
}

/** campo da folha: parece texto impresso, vira campo ao tocar; salva ao sair */
function Field({ value, onCommit, placeholder, className = "", list, style }: { value: string; onCommit: (v: string) => void; placeholder?: string; className?: string; list?: string; style?: React.CSSProperties }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = "0px"; el.style.height = el.scrollHeight + "px"; } }, [v]);
  const commit = () => { const t = v.trim(); if (t !== (value || "").trim()) onCommit(t); };
  if (list) return <input className={`sheet-input ${className}`} style={style} list={list} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />;
  return <textarea ref={ref} rows={1} className={`sheet-input ${className}`} style={style} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />;
}
