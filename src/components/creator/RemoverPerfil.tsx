"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apagarComLixeira, apagarDeVez, LIXEIRA_DIAS } from "@/lib/lixeira";
import { I } from "@/components/icons";

/* Remover x apagar um perfil do Creator (pedido do Vinícius, 27/11).
   Remover: vai para a Lixeira por 15 dias e dá para recuperar.
   Apagar de vez: some na hora, com posts e histórico, sem como recuperar.
   Perfil compartilhado por outra conta: só dá para tirar da sua conta (o perfil continua com o dono). */
export default function RemoverPerfil({ acc }: { acc: { id: string; owner_id: string; username: string } }) {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { createClient().auth.getUser().then(({ data }) => setMe(data.user?.id || null)); }, []);
  if (!me) return null;
  const dono = me === acc.owner_id;
  const nome = `@${acc.username}`;

  async function remover() {
    const ok = await apagarComLixeira({ tabela: "ig_accounts", filtro: { id: acc.id }, oque: `${nome} do Creator, com posts, automações e histórico dele`, rotulo: `Perfil: ${nome}`, link: "/creator/perfis" });
    if (ok) router.push("/creator/perfis");
  }
  async function apagar() {
    const ok = await apagarDeVez({ tabela: "ig_accounts", filtro: { id: acc.id }, oque: `${nome}, com posts, automações e histórico dele`, rotulo: `Perfil: ${nome}` });
    if (ok) router.push("/creator/perfis");
  }
  async function sair() {
    const ok = await apagarComLixeira({ tabela: "ig_account_members", filtro: { account_id: acc.id, user_id: me! }, oque: `${nome} da sua conta (o perfil continua com o dono)`, rotulo: `Acesso ao perfil ${nome}`, link: "/creator/desempenho" });
    if (ok) router.push("/creator/perfis");
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-bold mb-1">Remover ou apagar este perfil</h2>
      {dono ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg border border-line p-4 flex flex-col">
              <p className="font-semibold text-sm">Remover</p>
              <p className="text-xs text-fog mt-1 flex-1">Tira o perfil do HUB e manda para a Lixeira. Fica lá {LIXEIRA_DIAS} dias e dá para recuperar com tudo que tinha.</p>
              <button onClick={remover} className="btn btn-ghost btn-sm mt-3 self-start"><I.trash className="w-3.5 h-3.5" />Remover</button>
            </div>
            <div className="rounded-lg border border-danger/40 p-4 flex flex-col">
              <p className="font-semibold text-sm text-danger">Apagar de vez</p>
              <p className="text-xs text-fog mt-1 flex-1">Apaga agora o perfil, os posts, as automações e o histórico. Não passa pela Lixeira e não dá para recuperar.</p>
              <button onClick={apagar} className="btn btn-sm mt-3 self-start bg-danger/15 text-danger hover:bg-danger/25"><I.trash className="w-3.5 h-3.5" />Apagar de vez</button>
            </div>
          </div>
          <p className="text-[11px] text-fog mt-3">As duas opções pedem a sua senha de novo. O Instagram em si não é afetado: só sai do HUB.</p>
        </>
      ) : (
        <>
          <p className="text-xs text-fog mb-3">Este perfil é de outra conta e foi compartilhado com você. Você pode tirá-lo da sua conta; ele continua com o dono. Só o dono pode remover ou apagar o perfil.</p>
          <button onClick={sair} className="btn btn-ghost btn-sm"><I.trash className="w-3.5 h-3.5" />Tirar da minha conta</button>
        </>
      )}
    </section>
  );
}
