import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { widgetUser } from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * Ações do app e dos widgets nativos (POST /api/resumo/acao).
 * Chave pessoal no cabeçalho "Authorization: Bearer <chave>" (ou ?k=).
 * Corpo: { acao: "concluir", id } marca a tarefa como feita · { acao: "reabrir", id } desfaz ·
 * { acao: "criar", titulo, data? } cria na caixa de entrada (ou com prazo, se vier a data AAAA-MM-DD).
 * Usa a service role: toda consulta filtra por owner_id. Os gatilhos do banco cuidam de done_at, etapa e recorrência.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const k = auth.startsWith("Bearer ") ? auth.slice(7) : new URL(request.url).searchParams.get("k");
  const db = createServiceClient();
  const uid = await widgetUser(db, k);
  if (!uid) return NextResponse.json({ ok: false, error: "Chave inválida. Conecte o app de novo em Minha conta." }, { status: 401 });
  const { data: prof } = await db.from("profiles").select("status").eq("id", uid).maybeSingle();
  if (prof?.status && prof.status !== "ativo") return NextResponse.json({ ok: false, error: "Assinatura inativa." }, { status: 403 });

  const b = await request.json().catch(() => ({} as any));
  const uuid = /^[0-9a-f-]{36}$/i;

  if (b.acao === "concluir" || b.acao === "reabrir") {
    if (!uuid.test(String(b.id || ""))) return NextResponse.json({ ok: false, error: "Tarefa inválida." }, { status: 400 });
    const { data, error } = await db.from("ag_tasks").update({ done: b.acao === "concluir" }).eq("id", b.id).eq("owner_id", uid).select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ ok: false, error: "Tarefa não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (b.acao === "criar") {
    const titulo = String(b.titulo || "").trim().slice(0, 300);
    if (!titulo) return NextResponse.json({ ok: false, error: "Escreva o título da tarefa." }, { status: 400 });
    const data = /^\d{4}-\d{2}-\d{2}$/.test(String(b.data || "")) ? b.data : null;
    const { data: row, error } = await db.from("ag_tasks").insert({ owner_id: uid, title: titulo, inbox: !data, due_date: data, priority: null }).select("id").single();
    if (error) return NextResponse.json({ ok: false, error: "Não foi possível criar a tarefa." }, { status: 500 });
    return NextResponse.json({ ok: true, id: row.id });
  }

  return NextResponse.json({ ok: false, error: "Ação desconhecida." }, { status: 400 });
}
