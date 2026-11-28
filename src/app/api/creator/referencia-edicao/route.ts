import { NextResponse } from "next/server";
import { callClaude, extractJson, withAIQueue } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { brandPrompt } from "@/lib/brandPrompt";
import { kitParaEstilo, normalizeEdicao, promptEngenhariaReversa, promptJuntar } from "@/lib/referenciaEdicao";

export const maxDuration = 60;

/* Engenharia reversa da edição (28/11). modo "analisar": uma referência com link vira análise + proposta de Kit,
   gravadas em references_lib.edicao. modo "juntar": 2 ou 3 referências analisadas viram um Kit de estilo da marca.
   modo "estilo": refaz a folha de um Estilo de referência com os vídeos dele já desmontados (até 8); o Kit só vem ao aprovar.
   Vai pela fila do Claude; quando ele responde, esta rota roda de novo e grava. */
/** cores, voz e manual da marca do perfil, para a folha sair com a cara da marca */
async function contextoMarca(sb: any, accountId?: string | null) {
  if (!accountId) return "";
  let ctx = "";
  const { data: acc } = await sb.from("ig_accounts").select("username,niche,brand_voice").eq("id", accountId).maybeSingle();
  if (acc) ctx += `Marca: @${acc.username}${acc.niche ? ` · nicho ${acc.niche}` : ""}${acc.brand_voice ? `\nVoz: ${acc.brand_voice}` : ""}\n`;
  const { data: marca } = await sb.from("design_projects").select("data").eq("kind", "marca").is("archived_at", null).eq("data->>perfil_id", accountId).limit(1).maybeSingle();
  if (marca?.data) ctx += `\n${brandPrompt(marca.data)}\n`;
  return ctx;
}

async function handle(req: Request) {
  try {
    const body = await req.json();
    const sb = await createClient();

    if (body.modo === "estilo") {
      const { data: est } = await sb.from("ref_estilos").select("id,name,descricao,account_id").eq("id", body.estilo_id).maybeSingle();
      if (!est) return NextResponse.json({ error: "Estilo não encontrado." }, { status: 404 });
      const { data: refs } = await sb.from("references_lib").select("id,title,url,edicao").eq("estilo_id", est.id).not("edicao", "is", null).order("created_at", { ascending: false }).limit(8);
      const ok = (refs || []).filter((r: any) => r.edicao?.planos?.length);
      if (!ok.length) return NextResponse.json({ error: "Nenhum vídeo deste estilo foi desmontado ainda." }, { status: 400 });
      const ctx = await contextoMarca(sb, est.account_id);
      const text = await callClaude({ maxTokens: 6000, prompt: promptJuntar({ contexto: ctx, estilo: { nome: est.name, descricao: est.descricao || undefined }, analises: ok.map((r: any) => ({ titulo: r.title, url: r.url, edicao: normalizeEdicao(r.edicao) })) }) });
      const folha = { ...normalizeEdicao(extractJson(text)), at: new Date().toISOString(), fontes_ref: ok.map((r: any) => r.id) };
      if (!folha.resumo && !folha.planos.length) return NextResponse.json({ error: "O Claude não mandou a folha. Tente de novo." }, { status: 500 });
      await sb.from("ref_estilos").update({ folha, folha_refs: ok.map((r: any) => r.id), folha_at: folha.at, folha_request: null, updated_at: folha.at }).eq("id", est.id);
      return NextResponse.json({ folha });
    }

    if (body.modo === "juntar") {
      const ids: string[] = Array.isArray(body.ref_ids) ? body.ref_ids.slice(0, 3) : [];
      const { data: refs } = await sb.from("references_lib").select("id,title,url,edicao").in("id", ids);
      const ok = (refs || []).filter((r: any) => r.edicao);
      if (ok.length < 2) return NextResponse.json({ error: "Escolha 2 ou 3 referências já analisadas." }, { status: 400 });
      const ctx = await contextoMarca(sb, body.account_id);
      const text = await callClaude({ maxTokens: 6000, prompt: promptJuntar({ contexto: ctx, analises: ok.map((r: any) => ({ titulo: r.title, url: r.url, edicao: normalizeEdicao(r.edicao) })) }) });
      const folha = normalizeEdicao(extractJson(text));
      const nome = String(body.nome || "").trim().slice(0, 120) || `Folha de ${ok.length} referências`;
      const data = { ...kitParaEstilo(folha.kit), origem: { referencias: ok.map((r: any) => r.id), resumo: folha.resumo, copiar: folha.copiar, planos: folha.planos } };
      const { data: kit, error } = await sb.from("av_style_kits").insert({ name: nome, account_id: body.account_id || null, data }).select("id").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ kit_id: kit.id, nome, resumo: folha.resumo });
    }

    const { data: ref } = await sb.from("references_lib").select("id,title,url,handle").eq("id", body.ref_id).maybeSingle();
    if (!ref) return NextResponse.json({ error: "Referência não encontrada." }, { status: 404 });
    if (!ref.url) return NextResponse.json({ error: "A referência precisa do link do vídeo." }, { status: 400 });
    const text = await callClaude({ maxTokens: 8000, prompt: promptEngenhariaReversa({ url: ref.url, titulo: ref.title, handle: ref.handle || undefined }) });
    const edicao = { ...normalizeEdicao(extractJson(text)), at: new Date().toISOString() };
    /* sem planos = o Claude não viu o vídeo (ex.: o painel do claude.ai, que não abre links). Não grava recusa como análise. */
    if (!edicao.planos.length) {
      await sb.from("references_lib").update({ edicao_request: null }).eq("id", ref.id);
      return NextResponse.json({ error: `O Claude não conseguiu ver o vídeo${edicao.resumo ? `: ${edicao.resumo.slice(0, 200)}` : "."} Peça de novo com o Claude do Mac aberto (Claude Code ou o Claude com o Chrome).` }, { status: 422 });
    }
    await sb.from("references_lib").update({ edicao, edicao_request: null }).eq("id", ref.id);
    return NextResponse.json({ edicao });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro na engenharia reversa" }, { status: 500 });
  }
}

export const POST = withAIQueue("/api/creator/referencia-edicao", handle);
