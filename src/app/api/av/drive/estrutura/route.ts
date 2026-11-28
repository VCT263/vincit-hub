import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { noScope } from "@/lib/drive";
import { criarEstrutura, podeEscrever, raizDoUsuario } from "@/lib/driveEscrita";

export const maxDuration = 60;

/** cria (ou completa) a estrutura de pastas na raiz da pessoa: Entrada, Meus conteúdos e Técnico com as áreas */
export async function POST() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const auth = await googleToken(s);
  if (!auth) return NextResponse.json({ error: "Conecte o Google de novo.", needsScope: true }, { status: 400 });
  if (!(await podeEscrever(auth.token))) return NextResponse.json({ error: "Falta liberar o HUB para organizar o Drive.", needsScope: true }, { status: 400 });
  try {
    const raiz = await raizDoUsuario(s, auth.token, user.id);
    const pastas = await criarEstrutura(auth.token, raiz.id);
    return NextResponse.json({ ok: true, raiz: raiz.nome, pastas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, needsScope: e.res ? noScope(e.res) : false }, { status: 400 });
  }
}
