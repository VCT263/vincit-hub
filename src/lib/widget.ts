/**
 * Chave pessoal do widget de resumo (Scriptable no iPhone e no Mac).
 * Formato: <user id>.<versão>.<assinatura HMAC>. A versão fica em app_metadata.widget_v do usuário;
 * gerar uma chave nova aumenta a versão e invalida a anterior. Só roda no servidor.
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const secret = () => process.env.WIDGET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sign = (payload: string) => createHmac("sha256", secret()).update("widget:" + payload).digest("base64url").slice(0, 32);

export const widgetReady = () => !!(secret() && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function widgetToken(uid: string, v: number) {
  const p = `${uid}.${v}`;
  return `${p}.${sign(p)}`;
}

/** confere a chave e devolve o id do usuário, ou null */
export async function widgetUser(admin: SupabaseClient, k: string | null): Promise<string | null> {
  if (!k || !secret()) return null;
  const m = /^([0-9a-f-]{36})\.(\d{1,6})\.([A-Za-z0-9_-]{32})$/.exec(k.trim());
  if (!m) return null;
  const [, uid, v, sig] = m;
  const want = Buffer.from(sign(`${uid}.${v}`)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const { data } = await admin.auth.admin.getUserById(uid);
  if (!data?.user) return null;
  const cur = Number((data.user.app_metadata as any)?.widget_v || 1);
  return cur === Number(v) ? uid : null;
}

/** versão atual da chave do usuário; com nova = true, troca a chave (a antiga para de funcionar) */
export async function widgetVersion(admin: SupabaseClient, uid: string, nova = false): Promise<number> {
  const { data } = await admin.auth.admin.getUserById(uid);
  const meta = (data?.user?.app_metadata as any) || {};
  let v = Number(meta.widget_v || 1);
  if (nova) {
    v += 1;
    await admin.auth.admin.updateUserById(uid, { app_metadata: { ...meta, widget_v: v } });
  }
  return v;
}
