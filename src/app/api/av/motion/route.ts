import { NextResponse } from "next/server";
import { callClaude, extractJson, withAIQueue } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { brandPrompt } from "@/lib/brandPrompt";
import { CENA_CAMPOS, CENA_LABEL, CENA_TIPOS, normalizeSpec } from "@/lib/motion/engine";

export const maxDuration = 60;

/* Motion sob demanda: a pessoa descreve o motion no HUB e o Claude devolve as cenas em JSON.
   Vai pela fila do Claude (sem API paga); quando o Claude responde, esta rota roda de novo,
   monta o motion com as cores e letras escolhidas na tela e grava em av_motions. */
async function handle(req: Request) {
  try {
    const { motion_id, pedido, formato, base, account_id } = await req.json();
    if (!motion_id || !String(pedido || "").trim()) return NextResponse.json({ error: "Descreva o motion que você quer." }, { status: 400 });
    const sb = await createClient();
    const { data: row } = await sb.from("av_motions").select("id,spec").eq("id", motion_id).maybeSingle();
    if (!row) return NextResponse.json({ error: "Pedido de motion não encontrado." }, { status: 404 });

    let ctx = "";
    if (account_id) {
      const { data: acc } = await sb.from("ig_accounts").select("username,niche,brand_voice").eq("id", account_id).maybeSingle();
      if (acc) ctx += `Perfil: @${acc.username}${acc.niche ? ` · nicho ${acc.niche}` : ""}${acc.brand_voice ? `\nVoz da marca: ${acc.brand_voice}` : ""}\n`;
      const { data: marca } = await sb.from("design_projects").select("data").eq("kind", "marca").is("archived_at", null).eq("data->>perfil_id", account_id).limit(1).maybeSingle();
      if (marca?.data) ctx += `\n${brandPrompt(marca.data)}\n`;
    }
    const tipos = CENA_TIPOS.map((t) => {
      const f = CENA_CAMPOS[t];
      const campos = [f.texto && `texto = ${f.texto}`, f.sub && `sub = ${f.sub}`, f.itens && `itens = ${f.itens}`, f.valor && "valor (número), prefixo, sufixo (ex.: %, mil, x)"].filter(Boolean).join("; ");
      return `- ${t}: ${CENA_LABEL[t]}${campos ? ` (${campos})` : ""}`;
    }).join("\n");

    const text = await callClaude({
      maxTokens: 2500,
      prompt: `${ctx}
Pedido de motion graphic feito no Audiovisual do VINCIT HUB, formato ${formato || "9:16"}:
"""${String(pedido).slice(0, 2000)}"""

Monte o motion como uma sequência de cenas que o motor do HUB desenha. Tipos de cena:
${tipos}

Regras: textos curtos (título até 7 palavras, item de lista até 4 palavras), números só se vierem do pedido ou do contexto (senão use {{número}}), português do Brasil, sem clichês de IA. Duração de cada cena entre 1,5 e 5 s (transição 0,6 a 1 s). Vinheta de abertura: 2 a 3 s. Use "fundo":"transparente" no motion só quando ele for por cima de um vídeo (lower third, transição).
Responda SOMENTE com JSON:
{"titulo":"nome curto do motion","fundo":"solido|gradiente|imagem|transparente","transicao":"corte|cortina|fade|zoom|deslize","ritmo":"calmo|normal|rapido","handle":"@perfil ou vazio","cenas":[{"tipo":"...","dur":2.5,"texto":"...","sub":"...","itens":["..."],"valor":0,"prefixo":"","sufixo":""}]}`,
    });
    const j = extractJson(text);
    const b = { ...(row.spec || {}), ...(base || {}) }; // logo e imagem ficam no motion salvo, não vão no pedido
    const spec = normalizeSpec({ ...b, formato: formato || b.formato, fundo: j.fundo || b.fundo, transicao: j.transicao || b.transicao, ritmo: j.ritmo || b.ritmo, handle: j.handle || b.handle, cenas: j.cenas });
    if (!spec.cenas.length) return NextResponse.json({ error: "O Claude não mandou cenas. Tente descrever de novo." }, { status: 500 });
    const titulo = String(j.titulo || "Motion sob demanda").slice(0, 80);
    await sb.from("av_motions").update({ spec, titulo, status: "pronto", formato: spec.formato, updated_at: new Date().toISOString() }).eq("id", motion_id);
    return NextResponse.json({ spec, titulo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro no motion" }, { status: 500 });
  }
}

export const POST = withAIQueue("/api/av/motion", handle);
