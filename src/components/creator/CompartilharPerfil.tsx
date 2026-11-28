"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apagarComLixeira } from "@/lib/lixeira";

type Pessoa = { user_id: string; name: string | null; email: string | null; role: string; is_owner: boolean };

/* Agência e cliente: o dono do perfil (ex.: a conta da ISYS) libera o perfil para outra conta do HUB
   (ex.: a agência), que vê desempenho e posts e sincroniza como administradora. */
export default function CompartilharPerfil({ accountId, ownerId }: { accountId: string; ownerId: string }) {
  const [me, setMe] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: u }, { data }] = await Promise.all([s.auth.getUser(), s.rpc("ig_member_list", { p_account: accountId })]);
    setMe(u.user?.id || null);
    setPessoas((data as Pessoa[]) || []);
  }, [accountId]);
  useEffect(() => { load(); }, [load]);

  const souDono = me === ownerId;
  const dono = pessoas.find((p) => p.is_owner);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const { data, error } = await createClient().rpc("ig_add_member", { p_account: accountId, p_email: email, p_role: role });
    if (error) return setMsg(error.message);
    setMsg(`${(data as any)?.name || email} agora vê este perfil.`); setEmail(""); load();
  }
  async function remove(p: Pessoa) {
    const saindo = p.user_id === me;
    if (await apagarComLixeira({ tabela: "ig_account_members", filtro: { account_id: accountId, user_id: p.user_id }, oque: saindo ? "o seu acesso a este perfil" : "o acesso desta pessoa ao perfil", rotulo: "Acesso ao perfil removido", link: "/creator/desempenho" })) {
      if (saindo) window.location.href = "/creator/desempenho"; else load();
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-bold mb-1">Quem vê este perfil</h2>
      <p className="text-xs text-fog mb-3">
        {souDono
          ? "Libere o perfil para a agência ou para quem cuida do marketing. Administrador vê tudo, edita o contexto e sincroniza; leitura só vê."
          : `Perfil de ${dono?.name || dono?.email || "outra conta"}, compartilhado com você.`}
      </p>
      <ul className="text-sm divide-y divide-line mb-3">
        {pessoas.map((p) => (
          <li key={p.user_id} className="py-2 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">{p.name || p.email}{p.user_id === me && <span className="text-fog"> (você)</span>}</span>
            <span className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-fog">{p.is_owner ? "dono" : p.role === "admin" ? "administrador" : "leitura"}</span>
              {!p.is_owner && (souDono || p.user_id === me) && <button onClick={() => remove(p)} className="text-xs text-danger">{p.user_id === me ? "Sair" : "Remover"}</button>}
            </span>
          </li>
        ))}
      </ul>
      {souDono && (
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <input type="email" required className="input flex-1 min-w-[180px]" placeholder="E-mail da conta no HUB" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Administrador</option>
            <option value="leitura">Só leitura</option>
          </select>
          <button className="btn btn-primary btn-sm">Liberar</button>
        </form>
      )}
      {msg && <p className="text-xs text-fog mt-2">{msg}</p>}
    </section>
  );
}
