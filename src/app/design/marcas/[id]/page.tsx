"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { PHASES, STEPS, stepOf, type Step } from "@/lib/design";
import BriefStep from "@/components/design/brand/BriefStep";
import TasteStep from "@/components/design/brand/TasteStep";
import RefsStep from "@/components/design/brand/RefsStep";
import StrategyStep from "@/components/design/brand/StrategyStep";
import ConceptStep from "@/components/design/brand/ConceptStep";
import SymbolStep from "@/components/design/brand/SymbolStep";
import LogotypeStep from "@/components/design/brand/LogotypeStep";
import ConstructionStep from "@/components/design/brand/ConstructionStep";
import PatternStep from "@/components/design/brand/PatternStep";
import ApplicationsStep from "@/components/design/brand/ApplicationsStep";
import ColorStep from "@/components/design/brand/ColorStep";
import TypeStep from "@/components/design/brand/TypeStep";
import ManualStep from "@/components/design/brand/ManualStep";
import type { StepProps } from "@/components/design/brand/types";
import ClienteBriefing from "@/components/design/briefing/ClienteBriefing";


export default function BrandWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const [p, setP] = useState<any>(null);
  const [d, setD] = useState<any>({});
  const [step, setStep] = useState<Step>("estrategia");
  const [saved, setSaved] = useState<"ok" | "salvando" | "erro">("ok");
  const timer = useRef<any>(null);
  const pending = useRef<any>(null);

  useEffect(() => {
    createClient().from("design_projects").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) { router.replace("/design/marcas"); return; }
      setP(data); setD(data.data || {});
      const q = sp.get("etapa");
      setStep(stepOf(q || data.step));
    });
  }, [id]); // eslint-disable-line

  const flush = useCallback(async () => {
    const row = pending.current; if (!row) return;
    pending.current = null; setSaved("salvando");
    const { error } = await createClient().from("design_projects").update(row).eq("id", id);
    setSaved(error ? "erro" : "ok");
  }, [id]);
  const queue = (row: any) => { pending.current = { ...(pending.current || {}), ...row }; clearTimeout(timer.current); timer.current = setTimeout(flush, 700); setSaved("salvando"); };
  useEffect(() => () => { clearTimeout(timer.current); flush(); }, [flush]);

  const set = (patch: any) => setD((old: any) => {
    const next = { ...old, ...patch };
    queue({ data: next, ...(next.brief?.nome ? { title: next.brief.nome } : {}) });
    return next;
  });
  const go = (s: Step) => {
    setStep(s);
    const reached = Math.max(STEPS.findIndex((x) => x.k === s), STEPS.findIndex((x) => x.k === stepOf(p?.step)));
    const far = STEPS[reached]?.k || s;
    if (far !== p?.step) { setP((x: any) => ({ ...x, step: far })); queue({ step: far }); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!p) return <div className="card h-96 animate-pulse" />;
  const idx = STEPS.findIndex((s) => s.k === step);
  const info = STEPS[idx];
  const props: StepProps = { d, set, id, go };

  return (
    <>
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <Link href="/design/marcas" className="btn btn-ghost btn-sm"><I.back className="w-3.5 h-3.5" />Marcas</Link>
        <p className="font-display font-extrabold text-xl truncate flex-1">{d.brief?.nome || p.title}</p>
        <span className={`text-[11px] font-mono ${saved === "erro" ? "text-danger" : "text-fog"}`}>{saved === "ok" ? "salvo" : saved === "salvando" ? "salvando…" : "não salvou, tente de novo"}</span>
      </div>

      <ClienteBriefing briefingId={p.briefing_id || d.cliente?.briefing_id} />

      <nav className="flex gap-4 overflow-x-auto scroll-thin pb-2 mb-6 print:hidden" aria-label="Etapas da marca">
        {PHASES.map((f) => (
          <div key={f} className="shrink-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-fog mb-1.5 pl-1">{f}</p>
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => s.fase !== f ? null : (() => {
                const far = STEPS.findIndex((x) => x.k === stepOf(p.step));
                const done = i < far || (i === far && i !== idx);
                return (
                  <button key={s.k} onClick={() => go(s.k)} className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${s.k === step ? "border-mint bg-mint/10 text-mint" : "border-line text-fog hover:text-paper"}`}>
                    <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-mono ${s.k === step ? "bg-mint text-[var(--color-on-mint,#06140e)]" : done ? "bg-mint/20 text-mint" : "bg-panel2"}`}>{done && s.k !== step ? "✓" : i + 1}</span>
                    {s.l}
                  </button>
                );
              })())}
            </div>
          </div>
        ))}
      </nav>

      <div className="mb-6 rise print:hidden">
        <p className="font-mono text-[11px] text-mint tracking-widest uppercase">{info.fase} · etapa {idx + 1} de {STEPS.length}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">{info.l}</h1>
        <p className="text-fog mt-1 max-w-2xl">{info.d}</p>
        <p className="text-xs text-fog/80 mt-3 max-w-2xl border-l-2 border-mint/40 pl-3">{info.dica}</p>
      </div>

      {step === "estrategia" && <StrategyStep {...props} />}
      {step === "briefing" && <BriefStep {...props} />}
      {step === "preprojeto" && <TasteStep {...props} />}
      {step === "conceito" && <ConceptStep {...props} />}
      {step === "referencias" && <RefsStep {...props} />}
      {step === "simbolo" && <SymbolStep {...props} />}
      {step === "logotipo" && <LogotypeStep {...props} />}
      {step === "construcao" && <ConstructionStep {...props} />}
      {step === "grafismos" && <PatternStep {...props} />}
      {step === "aplicacoes" && <ApplicationsStep {...props} />}
      {step === "cores" && <ColorStep {...props} />}
      {step === "tipografia" && <TypeStep {...props} />}
      {step === "manual" && <ManualStep {...props} />}

      {step !== "manual" && (
        <div className="flex justify-between gap-2 mt-8 print:hidden">
          {idx > 0 ? <button onClick={() => go(STEPS[idx - 1].k)} className="btn btn-ghost min-w-0"><I.back className="w-4 h-4 shrink-0" /><span className="truncate">{STEPS[idx - 1].l}</span></button> : <span />}
          <button onClick={() => go(STEPS[idx + 1].k)} className="btn btn-mint min-w-0"><span className="truncate">{STEPS[idx + 1].l}</span><I.arrow className="w-4 h-4 shrink-0" /></button>
        </div>
      )}
    </>
  );
}
