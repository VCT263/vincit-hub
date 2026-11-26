import { createServiceClient } from "@/lib/supabase/server";
import { widgetUser } from "@/lib/widget";
import { occurrences } from "@/components/tasks/shared";
import { addDays, todayBR } from "@/components/dia/shared";

export const dynamic = "force-dynamic";

const PUBLISHED = ["publicado", "analisado"];

/** escapa texto no formato iCalendar */
const esc = (s: any) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** quebra linhas acima de 75 bytes (RFC 5545) */
function fold(line: string) {
  const out: string[] = []; let cur = ""; let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > 74) { out.push(cur); cur = " "; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}
const ymd = (d: string) => d.replace(/-/g, "");
/** data e hora de Brasília (UTC-3, sem horário de verão) para UTC no formato iCalendar */
const utc = (d: string, hm: string) => new Date(`${d}T${hm}:00-03:00`).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
const utcIso = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

type Ev = { uid: string; title: string; date: string; hm?: string; endIso?: string; startIso?: string; desc?: string; url?: string; loc?: string };

/**
 * Calendário assinável de Seu dia (GET /api/calendario?k=<chave do widget>), para o Calendário do iPhone e do Mac
 * e o widget nativo de Calendário. Rota pública protegida pela chave; usa a service role e filtra tudo por owner_id.
 */
export async function GET(request: Request) {
  const k = new URL(request.url).searchParams.get("k");
  const db = createServiceClient();
  const uid = await widgetUser(db, k);
  if (!uid) return new Response("Chave inválida. Gere uma nova em Minha conta.", { status: 401 });
  const { data: prof } = await db.from("profiles").select("status").eq("id", uid).maybeSingle();
  if (prof?.status && prof.status !== "ativo") return new Response("Assinatura inativa.", { status: 403 });

  const origin = new URL(request.url).origin;
  const today = todayBR(), from = addDays(today, -14), to = addDays(today, 90);
  const [{ data: tasks }, { data: events }, { data: projects }, { data: statuses }, { data: content }] = await Promise.all([
    db.from("ag_tasks").select("id,title,description,due_date,due_time,done,inbox").eq("owner_id", uid).is("parent_id", null).not("due_date", "is", null).or(`done.eq.false,due_date.gte.${from}`),
    db.from("ag_events").select("id,title,kind,starts_at,ends_at,recurrence,recurrence_until,exdates,location,notes").eq("owner_id", uid),
    db.from("ag_projects").select("id,title,stage,shoot_date,due_date").eq("owner_id", uid),
    db.from("content_statuses").select("id,stage").eq("owner_id", uid),
    db.from("content_ideas").select("id,title,format,planned_for,record_date,status_id,archived_at").eq("owner_id", uid).is("archived_at", null),
  ]);

  const evs: Ev[] = [];
  const TK = (tasks || []).filter((t) => !t.inbox);
  const late = TK.filter((t) => !t.done && t.due_date < today);

  // resumo do dia (aparece no topo do widget de Calendário)
  const dueToday = TK.filter((t) => !t.done && t.due_date === today).length;
  const parts = [dueToday ? `${dueToday} para hoje` : "", late.length ? `${late.length} atrasada${late.length > 1 ? "s" : ""}` : ""].filter(Boolean);
  evs.push({ uid: `resumo-${today}`, title: "Seu dia · " + (parts.join(", ") || "tudo em dia"), date: today, url: origin + "/", desc: late.slice(0, 10).map((t) => "Atrasada: " + t.title).join("\n") });

  for (const t of TK) {
    if (t.due_date > to) continue;
    const hm = typeof t.due_time === "string" ? t.due_time.slice(0, 5) : "";
    if (!t.done && t.due_date < today) {
      // atrasada: mostra hoje, para não sumir do widget
      evs.push({ uid: `tarefa-${t.id}`, title: "Atrasada: " + t.title, date: today, url: `${origin}/tarefas?t=${t.id}`, desc: t.description || "" });
      continue;
    }
    if (t.due_date < from) continue;
    evs.push({ uid: `tarefa-${t.id}`, title: (t.done ? "✓ " : "") + t.title, date: t.due_date, hm: /^\d{2}:\d{2}$/.test(hm) ? hm : undefined, url: `${origin}/tarefas?t=${t.id}`, desc: t.description || "" });
  }

  const loc = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString();
  for (const e of events || []) {
    const d0 = loc(e.starts_at).slice(0, 10), hm = loc(e.starts_at).slice(11, 16);
    const dur = e.ends_at ? new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime() : 3600e3;
    for (const d of occurrences(d0, e.recurrence, from, to, e.recurrence_until, e.exdates || [])) {
      const startIso = new Date(`${d}T${hm}:00-03:00`).toISOString();
      evs.push({ uid: `evento-${e.id}-${d}`, title: e.title, date: d, startIso, endIso: new Date(new Date(startIso).getTime() + Math.max(dur, 15 * 60e3)).toISOString(), loc: e.location || "", desc: e.notes || "", url: origin + "/agenda" });
    }
  }

  for (const p of projects || []) {
    if (p.shoot_date && p.shoot_date >= from && p.shoot_date <= to) evs.push({ uid: `captacao-${p.id}`, title: "Captação · " + p.title, date: p.shoot_date, url: `${origin}/tarefas?projeto=${p.id}` });
    if (p.due_date && p.stage !== "entregue" && p.due_date >= from && p.due_date <= to) evs.push({ uid: `entrega-${p.id}`, title: "Entrega · " + p.title, date: p.due_date, url: `${origin}/tarefas?projeto=${p.id}` });
  }

  const stage = new Map((statuses || []).map((s) => [s.id, s.stage]));
  for (const c of content || []) {
    const pub = PUBLISHED.includes(stage.get(c.status_id) || "");
    if (c.planned_for && !pub && c.planned_for >= from && c.planned_for <= to) evs.push({ uid: `publicar-${c.id}`, title: "Publicar: " + (c.title || "conteúdo"), date: c.planned_for, desc: c.format || "", url: `${origin}/creator/producao?c=${c.id}` });
    if (c.record_date && c.record_date >= from && c.record_date <= to) evs.push({ uid: `gravar-${c.id}`, title: "Gravação · " + (c.title || "conteúdo"), date: c.record_date, desc: c.format || "", url: `${origin}/creator/producao?c=${c.id}` });
  }

  const stamp = utcIso(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VINCIT HUB//Seu dia//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:VINCIT HUB", "X-WR-TIMEZONE:America/Sao_Paulo", "X-WR-CALDESC:Tarefas\\, compromissos e prazos de Seu dia",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M", "X-PUBLISHED-TTL:PT15M",
  ];
  for (const e of evs) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@vincit-hub`, `DTSTAMP:${stamp}`);
    if (e.startIso) lines.push(`DTSTART:${utcIso(e.startIso)}`, `DTEND:${utcIso(e.endIso!)}`);
    else if (e.hm) { lines.push(`DTSTART:${utc(e.date, e.hm)}`, `DTEND:${utcIso(new Date(new Date(`${e.date}T${e.hm}:00-03:00`).getTime() + 30 * 60e3).toISOString())}`); }
    else lines.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`);
    lines.push(`SUMMARY:${esc(e.title)}`, "TRANSP:TRANSPARENT");
    if (e.desc) lines.push(`DESCRIPTION:${esc(e.desc)}`);
    if (e.loc) lines.push(`LOCATION:${esc(e.loc)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="vincit-hub.ics"', "Cache-Control": "no-store" },
  });
}
