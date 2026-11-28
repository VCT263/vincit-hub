import { NextResponse } from "next/server";
import { callClaude, extractJson, withAIQueue } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { KINDS, listChildren, noScope } from "@/lib/drive";
import { ENTRADA, criarEstrutura, destino, garantirCaminho, garantirPasta, limparNome, mesDe, mover, perfilPeloNome, podeEscrever, raizDoUsuario, regraEntrada } from "@/lib/driveEscrita";

export const maxDuration = 60;

/* Organiza a pasta Entrada do Drive da pessoa (28/11).
   1ª passada: regras (tipo, extensão, nome, perfil citado no nome) movem o que dá para saber.
   O que sobrar volta em "duvidas"; a página manda de novo com claude=true e o Claude decide pela fila (sem API paga). */
async function handle(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const auth = await googleToken(s);
    if (!auth) return NextResponse.json({ error: "Conecte o Google de novo.", needsScope: true }, { status: 400 });
    if (!(await podeEscrever(auth.token))) return NextResponse.json({ error: "Falta liberar o HUB para organizar o Drive.", needsScope: true }, { status: 400 });
    const tk = auth.token;
    const raiz = await raizDoUsuario(s, tk, user.id);
    if (body.estrutura !== false) await criarEstrutura(tk, raiz.id);
    const entrada = await garantirPasta(tk, raiz.id, ENTRADA);
    const soltos = (await listChildren(tk, `'${entrada}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`, "id,name,mimeType,size,createdTime")).slice(0, 60);
    const { data: contas } = await s.from("ig_accounts").select("id,name,username");
    const lista = (contas || []) as { id: string; name: string | null; username: string }[];
    const movidos: { nome: string; para: string }[] = [];
    const duvidas: any[] = [];
    const cache = new Map<string, string>();
    const levar = async (f: any, kind: string, perfil: string | null) => {
      const c = destino(kind, perfil, mesDe(f.createdTime));
      const key = c.join("/");
      if (!cache.has(key)) cache.set(key, await garantirCaminho(tk, raiz.id, c));
      await mover(tk, f.id, entrada, cache.get(key)!);
      movidos.push({ nome: f.name, para: c.join(" › ") });
    };

    if (!body.claude) {
      for (const f of soltos) {
        const kind = regraEntrada(f);
        if (kind) await levar(f, kind, perfilPeloNome(f.name, lista));
        else duvidas.push({ id: f.id, nome: f.name, tipo: f.mimeType });
      }
      return NextResponse.json({ ok: true, movidos, duvidas });
    }

    // 2ª passada: o Claude decide área e perfil do que as regras não souberam
    const ids = new Set((Array.isArray(body.duvidas) ? body.duvidas : []).map((d: any) => String(d.id)));
    const alvo = soltos.filter((f) => ids.has(f.id));
    if (!alvo.length) return NextResponse.json({ ok: true, movidos, duvidas: [] });
    const areas = KINDS.filter((k) => k.pasta).map((k) => `${k.k}: ${k.l} (${k.d})`).join("\n");
    const text = await callClaude({
      maxTokens: 2000,
      prompt: `Organize arquivos soltos na pasta Entrada do Google Drive de uma produtora (VINCIT HUB).
Áreas possíveis (id: nome, o que entra):
${areas}
Perfis (clientes/marcas): ${lista.map((c) => c.name || c.username).join(", ") || "nenhum"}.
Arquivos (id | nome | tipo):
${alvo.map((f) => `${f.id} | ${f.name} | ${f.mimeType}`).join("\n")}

Para cada arquivo, escolha a área pelo nome e pelo tipo. Perfil só se o nome deixar claro; senão null. Se não der para saber, use "ficar" para deixar na Entrada.
Responda SOMENTE com JSON: {"arquivos":[{"id":"...","area":"id da área ou ficar","perfil":"nome do perfil ou null"}]}`,
    });
    const j = extractJson(text) || {};
    const fica: any[] = [];
    for (const a of Array.isArray(j.arquivos) ? j.arquivos : []) {
      const f = alvo.find((x) => x.id === String(a.id));
      if (!f) continue;
      const kind = KINDS.some((k) => k.k === a.area && k.pasta) ? String(a.area) : null;
      if (!kind) { fica.push({ id: f.id, nome: f.name, tipo: f.mimeType }); continue; }
      const perfil = a.perfil && lista.some((c) => [c.name, c.username].includes(a.perfil)) ? limparNome(String(a.perfil)) : null;
      await levar(f, kind, perfil);
    }
    return NextResponse.json({ ok: true, movidos, duvidas: fica });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Falhou.", needsScope: e.res ? noScope(e.res) : false }, { status: 400 });
  }
}

export const POST = withAIQueue("/api/av/drive/organizar", handle);
