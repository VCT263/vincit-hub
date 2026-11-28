import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleToken } from "@/lib/google";
import { KINDS, noScope } from "@/lib/drive";
import { destino, enviarPeloServidor, garantirCaminho, limparNome, mesDe, nomePerfil, podeEscrever, raizDoUsuario, sessaoDeEnvio } from "@/lib/driveEscrita";

export const maxDuration = 60;

/* Salvar um export no Drive, já na pasta certa (área › perfil › mês).
   JSON: devolve uma sessão para o navegador mandar o arquivo direto ao Drive (qualquer tamanho).
   multipart (meta + file): o servidor manda (só arquivo pequeno, plano B quando o envio direto falha). */
export async function POST(request: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const multipart = (request.headers.get("content-type") || "").includes("multipart/form-data");
  let meta: any, file: File | null = null;
  if (multipart) { const fd = await request.formData(); meta = JSON.parse(String(fd.get("meta") || "{}")); file = fd.get("file") as File | null; }
  else meta = await request.json().catch(() => ({}));
  const kind = String(meta.kind || "");
  if (!KINDS.some((k) => k.k === kind)) return NextResponse.json({ error: "Área do Drive inválida." }, { status: 400 });
  const nome = limparNome(String(meta.nome || "arquivo"));
  const mime = String(meta.mime || file?.type || "application/octet-stream");

  const auth = await googleToken(s);
  if (!auth) return NextResponse.json({ error: "Conecte o Google de novo.", needsScope: true }, { status: 400 });
  if (!(await podeEscrever(auth.token))) return NextResponse.json({ error: "Falta liberar o HUB para salvar no Drive.", needsScope: true }, { status: 400 });
  try {
    const raiz = await raizDoUsuario(s, auth.token, user.id);
    // caminho explícito (ex.: a pasta de uma sessão de fotos + "Editadas"); senão, área › perfil › mês
    const explicito = Array.isArray(meta.caminho) ? meta.caminho.slice(0, 8).map((x: any) => limparNome(String(x))).filter(Boolean) : [];
    const caminho = explicito.length ? explicito : destino(kind, await nomePerfil(s, meta.account_id), mesDe(), meta.sub ? String(meta.sub) : undefined);
    const pasta = await garantirCaminho(auth.token, raiz.id, caminho);
    const texto = [raiz.nome, ...caminho].join(" › ");
    if (multipart) {
      if (!file) return NextResponse.json({ error: "Faltou o arquivo." }, { status: 400 });
      const f = await enviarPeloServidor(auth.token, pasta, nome, mime, await file.arrayBuffer());
      return NextResponse.json({ ok: true, arquivo: f, caminho: texto, pasta: caminho.join("/") });
    }
    const origem = request.headers.get("origin") || new URL(request.url).origin;
    const uploadUrl = await sessaoDeEnvio(auth.token, pasta, nome, mime, origem);
    return NextResponse.json({ ok: true, uploadUrl, caminho: texto, pasta: caminho.join("/") });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, needsScope: e.res ? noScope(e.res) : false }, { status: 400 });
  }
}
