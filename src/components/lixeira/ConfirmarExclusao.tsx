"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIXEIRA_DIAS } from "@/lib/lixeira";

/* Confirmação antes de excluir.
   Uso: const { pedir, modal } = useConfirmarExclusao();
        if (await pedir({ oque: "o briefing da Alanis" })) { ...manda para a lixeira... }
        e renderize {modal} na tela.
   Regra do Vinícius (28/11): mandar para a lixeira pede só o botão de confirmar.
   A senha (segunda autenticação) fica para as ações de risco: definitivo (apagar de vez,
   sem volta) ou senha: true (ex.: remover um perfil inteiro ou um espaço com todas as tarefas). */
type Pedido = { oque: string; definitivo?: boolean; senha?: boolean };

export function useConfirmarExclusao() {
  const [p, setP] = useState<Pedido | null>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const done = useRef<(ok: boolean) => void>(() => {});

  const pedir = (x: Pedido) => new Promise<boolean>((res) => { done.current = res; setPw(""); setErr(""); setBusy(false); setP(x); });
  const fechar = (ok: boolean) => { setP(null); setPw(""); done.current(ok); };

  const comSenha = !!p && (p.senha ?? !!p.definitivo);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!comSenha) return fechar(true);
    if (!pw) return setErr("Digite a sua senha.");
    setBusy(true); setErr("");
    const s = createClient();
    const { data } = await s.auth.getUser();
    const email = data.user?.email;
    if (!email) { setBusy(false); return setErr("Entre de novo e tente outra vez."); }
    const { error } = await s.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return setErr("Senha incorreta.");
    fechar(true);
  }

  const modal = p ? (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => fechar(false)}>
      <form onSubmit={confirmar} onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm p-5 space-y-3 rise">
        <p className="font-display font-bold text-lg">{p.definitivo ? "Apagar de vez?" : "Mandar para a lixeira?"}</p>
        <p className="text-sm text-fog">
          {p.definitivo
            ? <>Vai apagar {p.oque} para sempre. Isso não dá para desfazer.</>
            : <>Vai {p.oque} para a lixeira. Fica lá por {LIXEIRA_DIAS} dias e dá para recuperar; depois disso é apagado de vez.</>}
        </p>
        {comSenha && (
          <div>
            <label className="label" htmlFor="pw-excluir">Confirme com a sua senha</label>
            <input id="pw-excluir" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" autoFocus />
          </div>
        )}
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={() => fechar(false)} className="btn btn-ghost btn-sm">Cancelar</button>
          <button disabled={busy} autoFocus={!comSenha} className="btn btn-sm bg-danger text-white hover:opacity-90">{busy ? "Conferindo…" : p.definitivo ? "Apagar de vez" : "Mandar para a lixeira"}</button>
        </div>
      </form>
    </div>
  ) : null;

  return { pedir, modal };
}
