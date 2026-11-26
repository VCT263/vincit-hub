"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

/** ordem do dia para a equipe no set: abre no celular, sem login */
export default function SetPage() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<any>(undefined);
  const [tab, setTab] = useState<"planos" | "checklist" | "equipe">("planos");

  const load = useCallback(() => createClient().rpc("av_shoot_public", { p_token: token }).then(({ data }) => setP(data || null)), [token]);
  useEffect(() => { load(); }, [load]);

  async function check(contentIdx: number, shotIdx: number) {
    const sh = p.contents[contentIdx].shots[shotIdx];
    const done = !sh.done;
    setP({ ...p, contents: p.contents.map((c: any, i: number) => (i !== contentIdx ? c : { ...c, shots: c.shots.map((s: any, j: number) => (j === shotIdx ? { ...s, done } : s)) })) });
    try { navigator.vibrate?.(10); } catch {}
    await createClient().rpc("av_shoot_check", { p_token: token, p_shot: sh.id, p_done: done });
  }

  if (p === undefined) return <main className="min-h-screen grid place-items-center text-fog">Carregando…</main>;
  if (!p) return <main className="min-h-screen grid place-items-center text-fog p-6 text-center">Link inválido ou desativado pela produtora.</main>;

  const all = (p.contents || []).flatMap((c: any) => c.shots);
  const done = all.filter((s: any) => s.done).length;
  const date = new Date(p.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const maps = p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : null;

  return (
    <main className="relative z-10 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="flex items-center justify-between mb-8"><Logo className="h-5" /><span className="font-mono text-[10px] text-fog">ORDEM DO DIA</span></header>
        <p className="font-mono text-[11px] text-mint uppercase tracking-widest">{date}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">{p.title}</h1>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="card p-3"><p className="text-[11px] text-fog">Chegada</p><p className="font-display font-bold text-xl">{hhmm(p.call_time) || "–"}</p></div>
          <div className="card p-3"><p className="text-[11px] text-fog">Fim previsto</p><p className="font-display font-bold text-xl">{hhmm(p.wrap_time) || "–"}</p></div>
        </div>
        {(p.location || p.address) && (
          <div className="card p-3 mt-2 flex items-center gap-3">
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{p.location || "Local"}</p>{p.address && <p className="text-xs text-fog">{p.address}</p>}</div>
            {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm shrink-0">Mapa</a>}
          </div>
        )}
        {p.client && <p className="text-xs text-fog mt-2">Cliente: {p.client}</p>}
        {p.notes && <p className="text-sm mt-3 whitespace-pre-wrap bg-panel2 rounded-xl p-3">{p.notes}</p>}

        <div className="flex gap-1 bg-panel border border-line rounded-xl p-1 mt-6 text-sm font-semibold sticky top-2 z-10">
          {([["planos", `Planos ${done}/${all.length}`], ["checklist", "Checklist"], ["equipe", "Equipe"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-lg ${tab === k ? "bg-panel2 text-paper" : "text-fog"}`}>{l}</button>
          ))}
        </div>

        {tab === "planos" && (
          <div className="mt-4 space-y-6">
            {!p.contents.length && <p className="text-sm text-fog">Nenhum conteúdo nesta diária.</p>}
            {p.contents.map((c: any, ci: number) => (
              <section key={c.id}>
                <p className="font-display font-bold text-lg">{c.title}</p>
                {c.format && <p className="text-xs text-fog">{c.format}</p>}
                {!c.shots.length && <p className="text-sm text-fog mt-2">Sem decupagem.</p>}
                <div className="mt-2 divide-y divide-line">
                  {c.shots.map((s: any, si: number) => (
                    <button key={s.id} onClick={() => check(ci, si)} className="w-full flex items-start gap-3 py-3 text-left">
                      <span className={`mt-0.5 w-6 h-6 rounded-md border-2 shrink-0 grid place-items-center text-sm ${s.done ? "bg-mint border-mint text-[var(--color-on-mint,#06140e)]" : "border-[#4a4d52]"}`}>{s.done && "✓"}</span>
                      <span className="font-mono text-[11px] text-fog mt-1 w-5 shrink-0">{String(si + 1).padStart(2, "0")}</span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[15px] font-semibold leading-snug ${s.done ? "text-fog line-through" : ""}`}>{s.description}</span>
                        <span className="block text-xs text-fog mt-0.5">{[s.framing, s.audio].filter(Boolean).join(" · ")}</span>
                        {s.notes && <span className="block text-xs text-mint mt-0.5">{s.notes}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "checklist" && (
          <div className="mt-4 card p-4">
            {!(p.checklist || []).length && <p className="text-sm text-fog">Sem checklist.</p>}
            {(p.checklist || []).map((c: any, k: number) => (
              <p key={k} className="flex items-start gap-3 py-2 text-sm border-b border-line last:border-0">
                <span className={`mt-0.5 w-4 h-4 rounded border shrink-0 ${c.done ? "bg-mint border-mint" : "border-[#4a4d52]"}`} />
                <span className={c.done ? "text-fog line-through" : ""}>{c.t}</span>
              </p>
            ))}
            <p className="text-[11px] text-fog mt-3">Quem marca o checklist é a produção, no HUB.</p>
          </div>
        )}

        {tab === "equipe" && (
          <div className="mt-4 space-y-3">
            <div className="card p-4">
              {!(p.team || []).length && <p className="text-sm text-fog">Equipe não informada.</p>}
              {(p.team || []).map((m: any, k: number) => (
                <div key={k} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{m.name}</p><p className="text-xs text-fog">{[m.role, m.call ? `chega ${m.call}` : ""].filter(Boolean).join(" · ")}</p></div>
                  {m.phone && <a href={`https://wa.me/${String(m.phone).replace(/\D/g, "").replace(/^(?!55)/, "55")}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">WhatsApp</a>}
                </div>
              ))}
            </div>
            {(p.equipment || []).length > 0 && (
              <div className="card p-4"><p className="label">Equipamento</p><div className="flex flex-wrap gap-1.5">{p.equipment.map((e: string, k: number) => <span key={k} className="chip">{e}</span>)}</div></div>
            )}
          </div>
        )}
        <p className="text-center text-[11px] text-fog mt-10">Feito no VINCIT HUB</p>
      </div>
    </main>
  );
}
