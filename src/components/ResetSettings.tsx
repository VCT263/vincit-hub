"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Recomeçar do zero: escolhe o que zerar, confirma a senha (etapa 1) e digita ZERAR (etapa 2).
export default function ResetSettings({ gestor = true }: { gestor?: boolean }) {
  const [open, setOpen] = useState(false);
  const [fin, setFin] = useState(gestor);
  useEffect(() => setFin(gestor), [gestor]); // o acesso ao Gestor chega depois do primeiro render
  const [dia, setDia] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [pw, setPw] = useState("");
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);

  function reset() { setOpen(false); setStep(1); setPw(""); setWord(""); setBusy(false); }

  async function checkPw(e: React.FormEvent) {
    e.preventDefault();
    if (!fin && !dia) return setMsg({ t: "Escolha pelo menos uma parte para zerar." });
    setBusy(true); setMsg(null);
    const s = createClient();
    const { data } = await s.auth.getUser();
    const email = data.user?.email;
    if (!email) { setBusy(false); return setMsg({ t: "Entre de novo e tente outra vez." }); }
    const { error } = await s.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return setMsg({ t: "Senha incorreta." });
    setPw(""); setStep(2);
  }

  async function run() {
    if (word.trim().toUpperCase() !== "ZERAR") return;
    setBusy(true);
    const { data, error } = await createClient().rpc("reset_my_data", { p_financeiro: fin, p_seu_dia: dia });
    if (error) { setBusy(false); return setMsg({ t: "Não deu para zerar agora. Tente de novo." }); }
    const r = (data || {}) as Record<string, number>;
    const parts = [
      r.lancamentos != null && `${r.lancamentos} lançamentos`,
      r.cobrancas != null && `${r.cobrancas} cobranças`,
      r.tarefas != null && `${r.tarefas} tarefas`,
      r.projetos != null && `${r.projetos} projetos`,
    ].filter(Boolean).join(", ");
    reset();
    setMsg({ t: `Pronto, zerado: ${parts || "nada para apagar"}.`, ok: true });
  }

  return (
    <section className="card p-5 space-y-3">
      <div>
        <p className="font-display font-bold">Recomeçar do zero</p>
        <p className="text-xs text-fog mt-1">Apaga o que você já trouxe para o HUB. Clientes, contas, categorias e agenda continuam. Não dá para desfazer.</p>
      </div>
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="btn btn-ghost btn-sm text-danger">Zerar dados…</button>
      ) : step === 1 ? (
        <form onSubmit={checkPw} className="space-y-3">
          {gestor && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={fin} onChange={(e) => setFin(e.target.checked)} className="mt-1" />
            <span>Financeiro do Gestor<span className="block text-xs text-fog">Receitas e despesas, recorrentes e previstas, histórico e cobranças.</span></span></label>}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={dia} onChange={(e) => setDia(e.target.checked)} className="mt-1" />
            <span>Tarefas e projetos do Seu dia<span className="block text-xs text-fog">Todas as tarefas, rotinas, projetos e o histórico deles.</span></span></label>
          <p className="text-xs text-fog">Etapa 1 de 2: confirme com a sua senha.</p>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Sua senha" autoComplete="current-password" aria-label="Sua senha" />
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm">Cancelar</button>
            <button disabled={!pw || busy} className="btn btn-sm bg-danger text-ink disabled:opacity-40">{busy ? "Conferindo…" : "Continuar"}</button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-fog">Etapa 2 de 2: vai sair {[fin && "o financeiro", dia && "as tarefas e projetos"].filter(Boolean).join(" e ")}. Para confirmar, digite <b className="text-paper">ZERAR</b>.</p>
          <input className="input" value={word} onChange={(e) => setWord(e.target.value)} placeholder="ZERAR" autoFocus aria-label="Digite ZERAR para confirmar" />
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm">Cancelar</button>
            <button type="button" disabled={word.trim().toUpperCase() !== "ZERAR" || busy} onClick={run} className="btn btn-sm bg-danger text-ink disabled:opacity-40">{busy ? "Zerando…" : "Zerar de vez"}</button>
          </div>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.t}</p>}
    </section>
  );
}
