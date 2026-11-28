import { NextResponse } from "next/server";
import { callClaude, extractJson, withAIQueue } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { brandPrompt } from "@/lib/brandPrompt";
import { CENA_CAMPOS, CENA_LABEL, CENA_TIPOS, normalizeSpec } from "@/lib/motion/engine";
import { normalizeBrief, promptRefinarMotion } from "@/lib/briefs";
import { conferirHtml, extrairHtml, promptProduzirHtml } from "@/lib/motion/html";
import { kitsComMarca } from "@/lib/kitMarca";
import { guiaSom } from "@/lib/editor/som";

export const maxDuration = 60;

/* Etapas do motion em HTML (27/11): "brief" refina o pedido cru num brief de 8 partes; "html" escreve a composição
   HyperFrames a partir do brief aprovado. Sem etapa, segue o motor antigo de cenas (motions já salvos). */

/* Motion sob demanda: a pessoa descreve o motion no HUB e o Claude devolve as cenas em JSON.
   Vai pela fila do Claude (sem API paga); quando o Claude responde, esta rota roda de novo,
   monta o motion com as cores e letras escolhidas na tela e grava em av_motions. */
async function handle(req: Request) {
  try {
    const { motion_id, pedido, formato, base, account_id, etapa, ajuste, variacao } = await req.json();
    if (!motion_id || !String(pedido || "").trim()) return NextResponse.json({ error: "Descreva o motion que você quer." }, { status: 400 });
    const sb = await createClient();
    const { data: row } = await sb.from("av_motions").select("id,spec,kit_id,ec_action_id").eq("id", motion_id).maybeSingle();
    if (!row) return NextResponse.json({ error: "Pedido de motion não encontrado." }, { status: 404 });

    let ctx = "";
    if (account_id) {
      const { data: acc } = await sb.from("ig_accounts").select("username,niche,brand_voice").eq("id", account_id).maybeSingle();
      if (acc) ctx += `Perfil: @${acc.username}${acc.niche ? ` · nicho ${acc.niche}` : ""}${acc.brand_voice ? `\nVoz da marca: ${acc.brand_voice}` : ""}\n`;
      const { data: marca } = await sb.from("design_projects").select("data").eq("kind", "marca").is("archived_at", null).eq("data->>perfil_id", account_id).limit(1).maybeSingle();
      if (marca?.data) ctx += `\n${brandPrompt(marca.data)}\n`;
    }
    if ((row as any).ec_action_id) {
      // pasta ligada a uma campanha do E-commerce: o motion segue o conceito e a mensagem dela
      const { data: acao } = await sb.from("ec_actions").select("title,date,end_date,campaign").eq("id", (row as any).ec_action_id).maybeSingle();
      if (acao) {
        const c = (acao as any).campaign || {};
        ctx += `\nCampanha: ${acao.title} (${acao.date}${acao.end_date ? ` a ${acao.end_date}` : ""})${c.conceito ? `\nConceito: ${c.conceito}` : ""}${c.mensagem ? `\nMensagem: ${c.mensagem}` : ""}${c.oferta?.mecanica ? `\nOferta: ${c.oferta.mecanica}` : ""}\nOs motions desta campanha formam uma família: mesma linguagem visual, mesmo ritmo e o conceito presente.\n`;
      }
    }
    {
      const kitId = (row as any).kit_id;
      if (kitId) {
        const { data: kit0 } = await sb.from("av_style_kits").select("id,name,data").eq("id", kitId).maybeSingle();
        const kit = kit0 ? (await kitsComMarca(sb, [kit0]))[0] : null;
        if (kit?.data) ctx += `\nKit de estilo "${kit.name || ""}": cores ${JSON.stringify(kit.data.cores || {})}, fontes ${JSON.stringify(kit.data.fontes || {})}.\n`;
        if (kit?.data?.regras?.som_estilo) ctx += guiaSom(kit.data.regras.som_estilo) + "\n";
      }
    }

    /* aprovadas e descartadas no Motion (28/11): o que a pessoa já disse que gosta ou não gosta */
    {
      let q = sb.from("av_motions").select("titulo,spec").neq("id", motion_id).not("spec->>avaliacao", "is", null).order("updated_at", { ascending: false }).limit(12);
      if (account_id) q = q.eq("account_id", account_id);
      const { data: av } = await q;
      const linha = (m: any) => `- ${m.titulo}: ${String(m.spec?.brief?.ideia || "").slice(0, 160)}${m.spec?.brief?.cenas?.length ? ` (cenas: ${m.spec.brief.cenas.map((c: any) => c.estilo || c.tipo || "").filter(Boolean).slice(0, 4).join(", ")})` : ""}`;
      const ap = (av || []).filter((m: any) => m.spec?.avaliacao === "aprovado").slice(0, 6);
      const de = (av || []).filter((m: any) => m.spec?.avaliacao === "descartado").slice(0, 6);
      if (ap.length) ctx += `\nPeças que a pessoa APROVOU (siga a linha delas):\n${ap.map(linha).join("\n")}\n`;
      if (de.length) ctx += `\nPeças que a pessoa DESCARTOU (evite o que elas tinham):\n${de.map(linha).join("\n")}\n`;
    }

    if (etapa === "brief") {
      const text = await callClaude({ maxTokens: 5000, prompt: promptRefinarMotion({ pedido: String(pedido), formato, contexto: ctx, ajuste, briefAnterior: row.spec?.brief }) });
      const brief = normalizeBrief(extractJson(text), "motion");
      if (!brief.cenas.length) return NextResponse.json({ error: "O Claude não mandou as cenas do brief. Tente de novo." }, { status: 500 });
      const { pendente: _p1, ...sem1 } = row.spec || {};
      const spec = { ...sem1, motor: "html", etapa: "brief", brief, html: undefined, formato: formato || row.spec?.formato || "9:16" };
      await sb.from("av_motions").update({ spec, titulo: brief.titulo.slice(0, 80), status: "pronto", updated_at: new Date().toISOString() }).eq("id", motion_id);
      return NextResponse.json({ brief, titulo: brief.titulo });
    }
    if (etapa === "html") {
      const brief = normalizeBrief(base?.brief || row.spec?.brief, "motion");
      if (!brief.cenas.length) return NextResponse.json({ error: "Falta o brief aprovado." }, { status: 400 });
      // variacao (biblioteca de animações, 28/11): versão nova do mesmo brief, feita do zero numa direção de movimento
      const dir = variacao ? `Esta é uma VERSÃO ALTERNATIVA para uma biblioteca de animações: mantenha os textos, as cores, as fontes e a duração do brief, e mude o movimento seguindo esta direção: ${String(variacao).slice(0, 600)}` : "";
      const text = await callClaude({ maxTokens: 16000, prompt: promptProduzirHtml({ brief, contexto: ctx, ajuste: [dir, ajuste].filter(Boolean).join("\n") || undefined, htmlAnterior: ajuste && !variacao ? row.spec?.html : undefined }) });
      const html = extrairHtml(text);
      const problemas = conferirHtml(html);
      if (problemas.length) return NextResponse.json({ error: `A composição veio com problema: ${problemas.join("; ")}.` }, { status: 500 });
      const { pendente: _p2, ...sem2 } = row.spec || {};
      const spec = { ...sem2, motor: "html", etapa: "pronto", brief, html, valores: ajuste && !variacao ? sem2.valores || {} : {} };
      await sb.from("av_motions").update({ spec, titulo: brief.titulo.slice(0, 80), status: "pronto", updated_at: new Date().toISOString() }).eq("id", motion_id);
      return NextResponse.json({ ok: true, titulo: brief.titulo });
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
