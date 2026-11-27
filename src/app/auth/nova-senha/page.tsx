"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { SENHA_AVISO, SENHA_MIN, SENHA_REGRAS, erroSenha, pedirLinkSenha, senhaOk } from "@/lib/senha";

// Destino do link "Esqueci minha senha". O link chega com a sessão no #fragmento
// (access_token/refresh_token) ou com o erro do Supabase (#error_code=otp_expired).
export default function NovaSenha() {
  const [estado, setEstado] = useState<"lendo" | "pronto" | "erro" | "feito">("lendo");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const s = createClient();
      const h = new URLSearchParams(location.hash.slice(1));
      const q = new URLSearchParams(location.search);
      if (location.hash) history.replaceState(null, "", location.pathname);
      const at = h.get("access_token"), rt = h.get("refresh_token");
      if (at && rt) {
        const { error } = await s.auth.setSession({ access_token: at, refresh_token: rt });
        if (error) { setEstado("erro"); return; }
      } else if (h.get("error") || q.get("erro")) {
        setEstado("erro"); return;
      }
      const { data } = await s.auth.getUser();
      if (!data.user) { setEstado("erro"); return; }
      setEmail(data.user.email || "");
      setEstado("pronto");
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!senhaOk(pw)) return setMsg({ t: SENHA_AVISO });
    if (pw !== pw2) return setMsg({ t: "As senhas não conferem." });
    setBusy(true); setMsg(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ t: erroSenha(error) });
    setEstado("feito");
    setTimeout(() => { window.location.href = "/"; }, 1500);
  }

  async function novoLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return setMsg({ t: "Digite seu e-mail." });
    setBusy(true);
    const err = await pedirLinkSenha(email);
    setBusy(false);
    setMsg(err ? { t: err } : { t: "Se houver uma conta com esse e-mail, enviamos um novo link. Use o link do e-mail mais recente.", ok: true });
  }

  return (
    <main className="relative z-10 min-h-screen grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/login" className="inline-block"><Logo className="h-7" /></Link>
        {estado === "lendo" && <p className="text-fog">Abrindo o link…</p>}

        {estado === "pronto" && (
          <form onSubmit={salvar} className="card p-5 space-y-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold">Crie a nova senha</h1>
              {email && <p className="text-xs text-fog mt-1 truncate">{email}</p>}
            </div>
            <div className="relative">
              <input className="input pr-16" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova senha" autoComplete="new-password" minLength={SENHA_MIN} required autoFocus />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-0 top-0 h-full px-3.5 text-fog hover:text-paper text-xs">{show ? "Ocultar" : "Mostrar"}</button>
            </div>
            <input className="input" type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repita a nova senha" autoComplete="new-password" required />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {SENHA_REGRAS.map(([t, f]) => <span key={t} className={`text-[11px] ${f(pw) ? "text-mint" : "text-fog"}`}>{f(pw) ? "✓ " : ""}{t}</span>)}
            </div>
            <button className="btn btn-mint w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar e entrar"}</button>
            {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.t}</p>}
          </form>
        )}

        {estado === "feito" && (
          <div className="card p-5 space-y-2">
            <h1 className="font-display text-2xl font-extrabold">Senha trocada</h1>
            <p className="text-sm text-fog">Entrando no HUB…</p>
          </div>
        )}

        {estado === "erro" && (
          <form onSubmit={novoLink} className="card p-5 space-y-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold">Link expirado</h1>
              <p className="text-sm text-fog mt-1">Esse link já foi usado ou venceu. Cada pedido novo invalida os anteriores, então use sempre o e-mail mais recente. Peça outro abaixo.</p>
            </div>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" autoComplete="email" required />
            <button className="btn btn-mint w-full" disabled={busy}>{busy ? "Enviando…" : "Enviar novo link"}</button>
            {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.t}</p>}
            <Link href="/login" className="block text-center text-xs text-fog hover:text-mint">Voltar ao login</Link>
          </form>
        )}
      </div>
    </main>
  );
}
