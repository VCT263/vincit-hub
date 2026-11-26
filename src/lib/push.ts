/** Notificações push (Web Push com VAPID). Só roda no servidor. */
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

type Vapid = { pub: string; priv: string };
let cached: Vapid | null = null;

/**
 * Chaves VAPID: as da Vercel (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY), se existirem;
 * senão as guardadas no banco (private.app_config), geradas aqui no primeiro uso.
 */
export async function vapid(): Promise<Vapid | null> {
  if (cached) return cached;
  let k: any = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ? { pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv: process.env.VAPID_PRIVATE_KEY }
    : null;
  const db = createServiceClient();
  if (!k) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const { data, error } = await db.rpc("push_vapid_get");
    if (error) return null;
    k = data;
  }
  if (!k?.pub || !k?.priv) {
    const g = webpush.generateVAPIDKeys();
    const r = await db.rpc("push_vapid_set", { p_pub: g.publicKey, p_priv: g.privateKey });
    k = r.data;
  }
  if (!k?.pub || !k?.priv) return null;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://vincit-hub.vercel.app", k.pub, k.priv);
  return (cached = { pub: k.pub, priv: k.priv });
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushMsg = { title: string; body?: string; href?: string; tag?: string };

/** envia para as inscrições dadas; apaga as que o navegador já cancelou (404/410) */
export async function sendTo(db: SupabaseClient, subs: Sub[], msg: PushMsg) {
  if (!subs.length || !(await vapid())) return 0;
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal" });
      ok++;
      await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }));
  return ok;
}

/**
 * Chamado pelo cron (service role): envia os avisos ainda não enviados de quem ativou o push.
 * Vários avisos de uma vez (ex.: às 7h) viram uma notificação só.
 */
export async function pushPending(db: SupabaseClient) {
  if (!(await vapid())) return 0;
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data: subs } = await db.from("push_subscriptions").select("id,owner_id,endpoint,p256dh,auth,created_at");
  if (!subs?.length) return 0;
  const owners = [...new Set(subs.map((s) => s.owner_id))];
  const { data: notes } = await db.from("notifications").select("id,owner_id,title,href,created_at")
    .is("pushed_at", null).is("read_at", null).gte("created_at", since).in("owner_id", owners).order("created_at").limit(500);
  if (!notes?.length) return 0;

  let sent = 0; const done: string[] = [];
  for (const owner of owners) {
    const mine = subs.filter((s) => s.owner_id === owner);
    const first = mine.reduce((m, s) => (s.created_at < m ? s.created_at : m), mine[0].created_at);
    const list = notes.filter((n) => n.owner_id === owner && n.created_at >= first);
    if (!list.length) continue;
    const msg: PushMsg = list.length === 1
      ? { title: list[0].title, href: list[0].href || "/", tag: "aviso-" + list[0].id }
      : { title: `Seu dia · ${list.length} avisos`, body: list.slice(0, 3).map((n) => n.title).join("\n") + (list.length > 3 ? `\n+ ${list.length - 3}` : ""), href: "/", tag: "avisos" };
    sent += await sendTo(db, mine, msg);
    done.push(...list.map((n) => n.id));
  }
  if (done.length) await db.from("notifications").update({ pushed_at: new Date().toISOString() }).in("id", done);
  return sent;
}
