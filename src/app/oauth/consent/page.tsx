import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { CLAUDE_CLIENT_ID, SUPABASE_URL, isClaudeRedirect } from "@/lib/oauth";

export const dynamic = "force-dynamic";

const ITEMS = [
  "Ver seus perfis, briefing, voz da marca e métricas dos posts",
  "Criar campanhas, roteiros e ideias no Quadro de produção",
  "Salvar análises nos seus perfis",
];

/** Tela de autorização do conector do Claude (Supabase › OAuth Server › Authorization Path = /oauth/consent) */
export default async function Consent({ searchParams }: { searchParams: Promise<{ authorization_id?: string; erro?: string }> }) {
  const { authorization_id: id, erro } = await searchParams;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id || ""}`)}`);
  const { data: { session } } = await s.auth.getSession();

  let det: any = null, problem = erro || "";
  if (!id) problem = "Pedido de autorização sem identificação. Tente vincular de novo pelo Claude.";
  else {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorizations/${encodeURIComponent(id)}`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session?.access_token}`, "X-Supabase-Api-Version": "2024-01-01" },
      cache: "no-store",
    });
    det = await r.json().catch(() => null);
    if (!r.ok) problem = det?.msg || det?.message || det?.error_description || "Este pedido expirou. Volte ao Claude e tente vincular de novo.";
    // já autorizado antes: volta direto para o Claude
    else if (det?.redirect_url && !det?.authorization_id) redirect(det.redirect_url);
    else {
      const cid = det?.client?.id || det?.client?.client_id;
      if ((cid && cid !== CLAUDE_CLIENT_ID) || !isClaudeRedirect(det?.redirect_uri || "")) problem = "Só o conector oficial do Claude pode se ligar ao VINCIT HUB.";
    }
  }

  const { data: acc } = await s.rpc("my_access");
  const ativo = (acc as any)?.role === "superadmin" || (acc as any)?.status === "ativo";

  return (
    <main className="relative z-10 min-h-screen grid place-items-center px-5 py-10">
      <div className="card p-7 sm:p-8 max-w-md w-full rise">
        <Logo className="h-6" />
        {problem ? (
          <>
            <h1 className="font-display text-2xl font-bold mt-8">Não deu para vincular</h1>
            <p className="text-fog text-sm mt-3 leading-relaxed">{problem}</p>
          </>
        ) : !ativo ? (
          <>
            <h1 className="font-display text-2xl font-bold mt-8">Seu acesso ainda não está liberado</h1>
            <p className="text-fog text-sm mt-3 leading-relaxed">O Claude só pode usar o HUB depois que o administrador liberar o seu plano.</p>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] text-mint tracking-widest uppercase mt-8">Vincular ao Claude</p>
            <h1 className="font-display text-2xl font-bold mt-2 leading-tight">O Claude quer acessar sua conta do VINCIT HUB</h1>
            <p className="text-fog text-sm mt-3">Conta: <span className="text-paper">{user!.email}</span></p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {ITEMS.map((t) => (
                <li key={t} className="flex gap-2.5"><span className="text-mint mt-0.5">✓</span><span>{t}</span></li>
              ))}
            </ul>
            <p className="text-xs text-fog mt-5 leading-relaxed">O Claude vê só os seus dados e só o que o seu plano libera. A IA roda na sua assinatura do Claude. Para desligar, remova o conector nas configurações do Claude.</p>
            <form action="/api/oauth/decision" method="POST" className="grid grid-cols-2 gap-3 mt-7">
              <input type="hidden" name="authorization_id" value={id} />
              <button className="btn btn-ghost justify-center" name="decision" value="deny">Recusar</button>
              <button className="btn btn-mint justify-center" name="decision" value="approve">Permitir</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
