import { NextResponse } from "next/server";
import { callClaude, extractJson, withAIQueue } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { brandPrompt } from "@/lib/brandPrompt";
import { CONTROLES, ESTILOS, limparAjustes } from "@/lib/foto/engine";

export const maxDuration = 60;

/* Editor de fotos (28/11): a página lê a foto (cor média, níveis, contraste) e manda a leitura, o link
   e o pedido. O Claude escolhe o estilo do catálogo e os ajustes finos e devolve em JSON.
   Vai pela fila do Claude (sem API paga); a sugestão fica gravada em av_fotos.spec.sugestao. */
async function handle(req: Request) {
  try {
    const { foto_id, pedido, analise, auto, url, account_id, estilos_salvos } = await req.json();
    if (!foto_id) return NextResponse.json({ error: "Salve a foto antes de pedir ao Claude." }, { status: 400 });
    const sb = await createClient();
    const { data: row } = await sb.from("av_fotos").select("id,spec").eq("id", foto_id).maybeSingle();
    if (!row) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });

    let ctx = "";
    if (account_id) {
      const { data: acc } = await sb.from("ig_accounts").select("username,niche,brand_voice").eq("id", account_id).maybeSingle();
      if (acc) ctx += `Perfil: @${acc.username}${acc.niche ? ` · nicho ${acc.niche}` : ""}\n`;
      const { data: marca } = await sb.from("design_projects").select("data").eq("kind", "marca").is("archived_at", null).eq("data->>perfil_id", account_id).limit(1).maybeSingle();
      if (marca?.data) ctx += `\n${brandPrompt(marca.data)}\n`;
    }
    const catalogo = [...ESTILOS.map((e) => `- ${e.id}: ${e.nome}. ${e.desc} Ajustes: ${JSON.stringify(e.ajustes)}`),
      ...(Array.isArray(estilos_salvos) ? estilos_salvos.slice(0, 20).map((e: any) => `- ${String(e.id)}: ${String(e.nome).slice(0, 60)} (estilo salvo pela pessoa). Ajustes: ${JSON.stringify(limparAjustes(e.ajustes))}`) : [])].join("\n");
    const controles = CONTROLES.flatMap((g) => g.itens.map((c) => `${c.k} (${c.nome}, ${c.min} a ${c.max})`)).join(", ") + ", tomSombras e tomRealces (matiz 0 a 360, usados com forcaSombras/forcaRealces)";

    const text = await callClaude({
      maxTokens: 1500,
      prompt: `${ctx}
Pedido de ajuste de foto no editor de fotos do VINCIT HUB.
${url ? `Foto: ${url}\n(Se conseguir abrir o link, olhe a foto. Se não, use a leitura abaixo.)` : ""}
Leitura feita no navegador (0 a 255): cor média dos meios-tons R ${Math.round(analise?.mediaR ?? 0)} G ${Math.round(analise?.mediaG ?? 0)} B ${Math.round(analise?.mediaB ?? 0)}; luz mediana ${analise?.mediana ?? "?"}; preto (1%) ${analise?.p1 ?? "?"}; branco (99%) ${analise?.p99 ?? "?"}; contraste (desvio) ${Math.round(analise?.desvio ?? 0)}; saturação média ${Number(analise?.saturacaoMedia ?? 0).toFixed(2)}.
A correção automática já aplicada antes do estilo: ${JSON.stringify(auto || {})}.
O que a pessoa pediu: """${String(pedido || "Corrija a foto e escolha o estilo que combina com ela.").slice(0, 1500)}"""

Catálogo de estilos (id: nome, descrição, ajustes a 100%):
${catalogo}

Controles disponíveis (somados por cima da correção e do estilo): ${controles}.

Regras: escolha UM estilo do catálogo e a intensidade (0 a 100). Use "ajustes" só para o que faltar depois do estilo (valores pequenos, a maioria entre -30 e 30). Foto de produto, roupa ou loja: "manter_cor": true para a peça não mudar de cor. Pele natural, sem exagero. Explique em uma frase, em português do Brasil, o que mudou e por quê.
Responda SOMENTE com JSON:
{"estilo":"id","intensidade":80,"ajustes":{"exposicao":0},"manter_cor":false,"explicacao":"..."}`,
    });
    const j = extractJson(text) || {};
    const ids = [...ESTILOS.map((e) => e.id), ...(Array.isArray(estilos_salvos) ? estilos_salvos.map((e: any) => String(e.id)) : [])];
    const sugestao = {
      estilo: ids.includes(String(j.estilo)) ? String(j.estilo) : "natural",
      intensidade: Math.max(0, Math.min(100, Math.round(Number(j.intensidade) || 80))),
      ajustes: limparAjustes(j.ajustes),
      manter_cor: !!j.manter_cor,
      explicacao: String(j.explicacao || "").slice(0, 400),
      em: new Date().toISOString(),
    };
    await sb.from("av_fotos").update({ spec: { ...(row.spec || {}), sugestao, pendente: null }, updated_at: new Date().toISOString() }).eq("id", foto_id);
    return NextResponse.json({ sugestao });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falhou." }, { status: 500 });
  }
}

export const POST = withAIQueue("/api/av/foto", handle);
