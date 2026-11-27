"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { aiFetch, AI_QUEUE_EVENT, type AIQueueEvent } from "@/lib/aiFetch";
import { apagarComLixeira } from "@/lib/lixeira";
import MotionStudio, { MotionThumb, type MotionDoc } from "@/components/av/MotionStudio";
import { MOTION_FORMAT_LABEL, motionDuration, normalizeSpec, specDoModelo, type MotionFormat } from "@/lib/motion/engine";

type Row = { id: string; titulo: string; formato: MotionFormat; spec: any; status: "pedido" | "pronto"; pedido?: string; ai_request_id?: string | null; account_id?: string | null; kit_id?: string | null; brand_id?: string | null; updated_at: string };

export default function MotionPage() {
  return <Suspense><Motion /></Suspense>;
}

function Motion() {
  const q = useSearchParams();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<Partial<MotionDoc> | null>(null);
  const [key, setKey] = useState(0);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [pedido, setPedido] = useState("");
  const [formato, setFormato] = useState<MotionFormat>("9:16");
  const [conta, setConta] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from("av_motions").select("id,titulo,formato,spec,status,pedido,ai_request_id,account_id,kit_id,brand_id,updated_at").order("updated_at", { ascending: false }).limit(60);
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
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // pedidos que ficaram esperando (a pessoa fechou a página): volta a perguntar à fila
  useEffect(() => {
    const pend = (rows || []).filter((r) => r.status === "pedido" && r.ai_request_id);
    if (!pend.length) return;
    const iv = setInterval(async () => {
      let changed = false;
      for (const r of pend) {
        const res = await fetch("/api/av/motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: "motion", motion_id: r.id, pedido: r.pedido, formato: r.formato, account_id: r.account_id, _ai_request: r.ai_request_id }) }).catch(() => null);
        if (res && res.status !== 202) changed = true;
      }
      if (changed) load();
    }, 15000);
    return () => clearInterval(iv);
  }, [rows, load]);

  function abrir(r: Row) {
    setOpen({ id: r.id, titulo: r.titulo, spec: normalizeSpec(r.spec), kit_id: r.kit_id, brand_id: r.brand_id, account_id: r.account_id });
    setKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function novo() { setOpen({ titulo: "Novo motion", spec: specDoModelo("abertura") }); setKey((k) => k + 1); }

  async function pedir() {
    if (!pedido.trim()) { setMsg("Escreva o que o motion precisa mostrar."); return; }
    const s = createClient();
    // o motion do pedido nasce com o visual do kit mais recente (as cores e letras ficam como estão; o Claude escreve as cenas)
    const { data: kit } = await s.from("av_style_kits").select("id,data").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const { coresDoKit } = await import("@/lib/motion/engine");
    const base = normalizeSpec({ ...specDoModelo("abertura"), ...(kit ? coresDoKit(kit.data) : {}), formato, cenas: [] });
    const { data, error } = await s.from("av_motions").insert({ titulo: "Pedido: " + pedido.trim().slice(0, 50), formato, spec: base, status: "pedido", pedido: pedido.trim(), origem: "pedido", account_id: conta || null, kit_id: kit?.id || null }).select("id").single();
    if (error) { setMsg(error.message); return; }
    const motionId = data.id;
    setPedido(""); load();
    setMsg("Pedido enviado ao Claude. Ele responde pela fila do HUB e o motion aparece aqui, pronto para ajustar.");
    // guarda o número do pedido na fila para retomar se a página fechar
    const grab = (e: Event) => { const d = (e as CustomEvent<AIQueueEvent>).detail; if (d.state === "waiting") { s.from("av_motions").update({ ai_request_id: d.id }).eq("id", motionId).then(() => load()); window.removeEventListener(AI_QUEUE_EVENT, grab); } };
    window.addEventListener(AI_QUEUE_EVENT, grab);
    const res = await aiFetch("/api/av/motion", { task: "motion", motion_id: motionId, pedido: pedido.trim(), formato, account_id: conta || null, base: { ...base, imagem: undefined, logo: undefined } });
    window.removeEventListener(AI_QUEUE_EVENT, grab);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j.error || "O Claude não respondeu ainda. O pedido continua na lista."); load(); return; }
    setMsg(`Motion "${j.titulo}" pronto. Ajuste o que quiser e exporte.`);
    const list = await load();
    const r = list.find((x) => x.id === motionId);
    if (r) abrir(r);
  }

  async function excluir(r: Row) {
    const ok = await apagarComLixeira({ tabela: "av_motions", filtro: { id: r.id }, oque: `o motion "${r.titulo}"`, rotulo: `Motion: ${r.titulo}`, link: "/audiovisual/motion" });
    if (ok) { if (open?.id === r.id) setOpen(null); load(); }
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
      {msg && <p className="text-sm text-mint mb-3">{msg}</p>}

      {open && (
        <div className="mb-5">
          <MotionStudio key={key} initial={open} onSaved={() => load()} onUse={(d) => router.push(`/audiovisual/editor?motion=${d.id}`)} />
        </div>
      )}

      <section className="card p-5 mb-4">
        <p className="font-display text-lg font-extrabold">Pedir motion ao Claude</p>
        <p className="text-sm text-fog mt-1">Descreva a peça: para quê, o que aparece, o texto e o clima. O Claude monta as cenas e o motion fica aqui para ajustar e exportar.</p>
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

      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Meus motions</p>
        {rows === null && <p className="text-sm text-fog">Carregando…</p>}
        {rows?.length === 0 && <p className="text-sm text-fog py-6 text-center">Nenhum motion ainda. Comece por um modelo em &quot;Novo motion&quot; ou peça um ao Claude.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rows?.map((r) => {
            const spec = normalizeSpec(r.spec);
            return (
              <div key={r.id} className={`rounded-xl border p-2 ${open?.id === r.id ? "border-mint" : "border-line"}`}>
                {r.status === "pedido" || !spec.cenas.length
                  ? <div className="aspect-[9/12] grid place-items-center text-center text-xs text-fog p-3 rounded-lg bg-white/5">{r.ai_request_id ? "Esperando o Claude…" : "Enviando o pedido…"}<br />{r.pedido?.slice(0, 80)}</div>
                  : <button onClick={() => abrir(r)} className="block w-full"><MotionThumb spec={spec} /></button>}
                <p className="text-sm font-semibold truncate mt-2">{r.titulo}</p>
                <p className="text-[11px] text-fog">{r.formato} · {motionDuration(spec).toFixed(1)} s</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.status === "pronto" && <button onClick={() => abrir(r)} className="chip">Abrir</button>}
                  {r.status === "pronto" && <Link href={`/audiovisual/editor?motion=${r.id}`} className="chip">No Editor</Link>}
                  {r.status === "pronto" && <button onClick={() => duplicar(r)} className="chip">Duplicar</button>}
                  <button onClick={() => excluir(r)} className="chip text-red-400" aria-label={`Excluir ${r.titulo}`}><I.trash className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
