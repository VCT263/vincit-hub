// Regras de senha do HUB. O Supabase do projeto exige no mínimo 9 caracteres.
export const SENHA_MIN = 9;
export const SENHA_REGRAS: [string, (p: string) => boolean][] = [
  [`${SENHA_MIN}+ caracteres`, (p) => p.length >= SENHA_MIN],
  ["letra maiúscula", (p) => /[A-Z]/.test(p)],
  ["número", (p) => /\d/.test(p)],
];
export const SENHA_AVISO = `A senha precisa de ${SENHA_MIN} caracteres, uma letra maiúscula e um número.`;
export const senhaOk = (p: string) => SENHA_REGRAS.every(([, f]) => f(p));

// Traduz os erros do Supabase Auth ligados à senha.
export function erroSenha(e: { message?: string; code?: string } | null | undefined): string {
  const m = e?.message || "";
  if (e?.code === "same_password" || /different from the old/i.test(m)) return "A nova senha precisa ser diferente da atual.";
  if (e?.code === "weak_password" || /at least \d+ characters|weak/i.test(m)) return SENHA_AVISO;
  if (e?.code === "reauthentication_needed") return "Por segurança, confirme a senha atual para trocar.";
  if (/session/i.test(m)) return "O link expirou. Peça um novo em Esqueci minha senha.";
  if (/rate limit|only request this after/i.test(m)) return "Aguarde alguns segundos antes de pedir de novo.";
  return m || "Não foi possível salvar a senha.";
}

// Pede o e-mail de redefinição sem PKCE: o link traz a sessão no endereço (#access_token)
// e funciona em qualquer navegador (ex.: o app de e-mail do celular), não só no que pediu.
export async function pedirLinkSenha(email: string): Promise<string | null> {
  const redirect = `${location.origin}/auth/callback?next=/auth/nova-senha`;
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    body: JSON.stringify({ email }),
  });
  if (r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return erroSenha({ message: j.msg || j.message || j.error_description, code: j.error_code });
}
