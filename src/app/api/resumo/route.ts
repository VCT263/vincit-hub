import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { widgetUser } from "@/lib/widget";
import { occurrences } from "@/components/tasks/shared";
import { addDays, monday, todayBR } from "@/components/dia/shared";

export const dynamic = "force-dynamic";

const PUBLISHED = ["publicado", "analisado"];
const KIND: Record<string, string> = { captacao: "Captação", reuniao: "Reunião" };

/**
 * Resumo de Seu dia para o widget (GET /api/resumo?k=<chave pessoal>).
 * Rota pública protegida pela chave; usa a service role, então TODA consulta filtra por owner_id.
 */
export async function GET(request: Request) {
  const k = new URL(request.url).searchParams.get("k");
  const db = createServiceClient();
  const uid = await widgetUser(db, k);
  if (!uid) return NextResponse.json({ ok: false, error: "Chave inválida. Gere uma nova em Minha conta." }, { status: 401 });

  const { data: prof } = await db.from("profiles").select("name,status").eq("id", uid).maybeSingle();
  if (prof?.status && prof.status !== "ativo") return NextResponse.json({ ok: false, error: "Assinatura inativa." }, { status: 403 });

  const today = todayBR(), wStart = monday(today), wEnd = addDays(wStart, 6), until = addDays(today, 7);
  const [{ data: tasks }, { data: events }, { data: unread }, { data: statuses }, { data: content }] = await Promise.all([
    db.from("ag_tasks").select("id,title,due_date,due_time,done,done_at,inbox").eq("owner_id", uid).is("parent_id", null).or(`done.eq.false,done_at.gte.${wStart}T03:00:00Z`),
    db.from("ag_events").select("title,kind,starts_at,recurrence,recurrence_until,exdates,location").eq("owner_id", uid),
    db.from("notifications").select("id").eq("owner_id", uid).is("read_at", null).limit(100),
    db.from("content_statuses").select("id,stage").eq("owner_id", uid),
    db.from("content_ideas").select("title,planned_for,status_id,status_changed_at,archived_at").eq("owner_id", uid).is("archived_at", null).or(`planned_for.eq.${today},status_changed_at.gte.${wStart}T03:00:00Z`),
  ]);

  const loc = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString();
  const nowHM = loc(new Date().toISOString()).slice(11, 16);
  const TK = (tasks || []).filter((t) => !t.inbox);
  const hm = (t: any) => (typeof t.due_time === "string" ? t.due_time.slice(0, 5) : "");

  // ── hoje ──
  const late = TK.filter((t) => !t.done && t.due_date && t.due_date < today);
  const dueToday = TK.filter((t) => t.due_date === today);
  const doneToday = TK.filter((t) => t.done && t.done_at && loc(t.done_at).slice(0, 10) === today);
  const lista = [
    ...late.sort((a, b) => a.due_date.localeCompare(b.due_date)),
    ...dueToday.filter((t) => !t.done).sort((a, b) => (hm(a) || "99").localeCompare(hm(b) || "99")),
  ].slice(0, 8).map((t) => ({ titulo: t.title, hora: hm(t), atrasada: t.due_date < today }));

  // ── agenda (compromissos de hoje que ainda não passaram e o próximo da semana) ──
  const agenda: { dia: string; hora: string; titulo: string; tipo: string; local?: string }[] = [];
  for (const e of events || []) {
    const d0 = loc(e.starts_at).slice(0, 10), h = loc(e.starts_at).slice(11, 16);
    for (const d of occurrences(d0, e.recurrence, today, until, e.recurrence_until, e.exdates || []))
      if (d > today || h >= nowHM) agenda.push({ dia: d, hora: h, titulo: e.title, tipo: KIND[e.kind] || "Compromisso", local: e.location || undefined });
  }
  agenda.sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));

  // ── semana (relatório) ──
  const stage = new Map((statuses || []).map((s) => [s.id, s.stage]));
  const weekTasks = TK.filter((t) => t.due_date && t.due_date >= wStart && t.due_date <= wEnd);
  const weekDone = TK.filter((t) => t.done && t.done_at && loc(t.done_at).slice(0, 10) >= wStart).length;
  const C = content || [];
  const publicados = C.filter((c) => PUBLISHED.includes(stage.get(c.status_id) || "") && c.status_changed_at && loc(c.status_changed_at).slice(0, 10) >= wStart).length;
  const publicarHoje = C.filter((c) => c.planned_for === today && !PUBLISHED.includes(stage.get(c.status_id) || "")).map((c) => c.title);
  const previstas = weekTasks.length;
  const feitasPrevistas = weekTasks.filter((t) => t.done).length;

  const h = parseInt(nowHM);
  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      ok: true,
      gerado_em: new Date().toISOString(),
      data: today,
      saudacao: (h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite") + (prof?.name ? `, ${String(prof.name).split(" ")[0]}` : ""),
      hoje: { abertas: late.length + dueToday.filter((t) => !t.done).length, atrasadas: late.length, para_hoje: dueToday.filter((t) => !t.done).length, concluidas: doneToday.length, publicar: publicarHoje.length },
      tarefas: lista,
      publicar: publicarHoje.slice(0, 4),
      agenda: agenda.filter((a) => a.dia === today).slice(0, 5),
      proximo: agenda[0] || null,
      semana: { de: wStart, ate: wEnd, concluidas: weekDone, previstas, feitas_previstas: feitasPrevistas, pct: previstas ? Math.round((feitasPrevistas / previstas) * 100) : null, publicados },
      avisos: (unread || []).length,
      url: origin + "/",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
