import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { igToken } from "@/lib/tokens";
import { gget } from "@/lib/meta";

export const maxDuration = 60;

/**
 * Resultados da conta no período, no formato do Meta Business Suite (Insights > Resultados e Público).
 * Lido ao vivo da Graph API, sem gravar nada: série por dia, total do período e do período anterior, e o público.
 * GET /api/meta/insights?account_id=...&days=7|14|30
 */
const DAILY = ["views", "reach", "total_interactions", "profile_views", "profile_links_taps"];
const DAY = 86400;

const tv = (data: any[], name: string) => {
  const it = (data || []).find((x: any) => x.name === name);
  return it ? Number(it.total_value?.value ?? it.values?.[0]?.value ?? 0) : null;
};

async function totals(id: string, token: string, since: number, until: number, metrics = DAILY) {
  try {
    const j = await gget(`${id}/insights`, { access_token: token, metric: metrics.join(","), period: "day", metric_type: "total_value", since: String(since), until: String(until) });
    return Object.fromEntries(metrics.map((m) => [m, tv(j.data, m)]));
  } catch {
    // alguma métrica pode não existir na conta: tenta uma a uma
    const out: Record<string, number | null> = {};
    await Promise.all(metrics.map(async (m) => {
      try {
        const j = await gget(`${id}/insights`, { access_token: token, metric: m, period: "day", metric_type: "total_value", since: String(since), until: String(until) });
        out[m] = tv(j.data, m);
      } catch { out[m] = null; }
    }));
    return out;
  }
}

async function demo(id: string, token: string, breakdown: string) {
  for (const extra of [{}, { timeframe: "this_month" }, { timeframe: "last_90_days" }]) {
    try {
      const j = await gget(`${id}/insights`, { access_token: token, metric: "follower_demographics", period: "lifetime", metric_type: "total_value", breakdown, ...extra });
      const res = j.data?.[0]?.total_value?.breakdowns?.[0]?.results || [];
      if (res.length) return res.map((r: any) => ({ k: r.dimension_values as string[], v: Number(r.value) || 0 }));
    } catch {}
  }
  return null;
}

/** alcance e visualizações divididos entre seguidores e não seguidores */
async function byFollow(id: string, token: string, since: number, until: number) {
  try {
    const j = await gget(`${id}/insights`, { access_token: token, metric: "reach,views", period: "day", metric_type: "total_value", breakdown: "follow_type", since: String(since), until: String(until) });
    const out: Record<string, { seguidores: number; nao: number }> = {};
    for (const it of j.data || []) {
      const res = it.total_value?.breakdowns?.[0]?.results || [];
      const get = (k: string) => res.filter((r: any) => r.dimension_values?.[0] === k).reduce((a: number, r: any) => a + (Number(r.value) || 0), 0);
      out[it.name] = { seguidores: get("FOLLOWER"), nao: get("NON_FOLLOWER") };
    }
    return Object.keys(out).length ? out : null;
  } catch { return null; }
}

/** seguidores online por dia da semana × hora (horário de Brasília), média dos últimos dias */
async function online(id: string, token: string, end: number) {
  try {
    const j = await gget(`${id}/insights`, { access_token: token, metric: "online_followers", period: "lifetime", since: String(end - 29 * DAY), until: String(end) });
    const vals = j.data?.[0]?.values || [];
    const sum = Array.from({ length: 7 }, () => Array(24).fill(0));
    const cnt = Array.from({ length: 7 }, () => Array(24).fill(0));
    let any = false;
    for (const v of vals) {
      if (!v?.value || typeof v.value !== "object") continue;
      const day0 = new Date(v.end_time).getTime() - DAY * 1000; // o valor descreve o dia anterior ao end_time
      for (const [h, n] of Object.entries(v.value)) {
        const t = new Date(day0 + Number(h) * 3600 * 1000 - 3 * 3600 * 1000); // horas em UTC -> Brasília
        sum[t.getUTCDay()][t.getUTCHours()] += Number(n) || 0;
        cnt[t.getUTCDay()][t.getUTCHours()]++;
        any = true;
      }
    }
    return any ? sum.map((row, d) => row.map((x, h) => (cnt[d][h] ? Math.round(x / cnt[d][h]) : 0))) : null;
  } catch { return null; }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const account_id = url.searchParams.get("account_id") || "";
    const days = Math.min(30, Math.max(7, Number(url.searchParams.get("days")) || 30));
    const s = await createClient();
    const { data: acc } = await s.from("ig_accounts").select("id,ig_user_id,followers_count").eq("id", account_id).single();
    if (!acc?.ig_user_id) return NextResponse.json({ error: "Conta não conectada à Meta." }, { status: 400 });
    const token = await igToken(s, account_id);
    if (!token) return NextResponse.json({ error: "Token não encontrado. Conecte a conta de novo." }, { status: 400 });
    const id = acc.ig_user_id;

    // dias fechados: de (hoje - days) até hoje 00h, no fuso de Brasília
    const now = new Date();
    const todayBr = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000 + 3 * 3600;
    const end = todayBr > now.getTime() / 1000 ? todayBr - DAY : todayBr;
    const start = end - days * DAY;
    const dayStarts = Array.from({ length: days }, (_, i) => start + i * DAY);

    const [cur, prev, perDay, followers, gender, age, city] = await Promise.all([
      totals(id, token, start, end),
      totals(id, token, start - days * DAY, start),
      Promise.all(dayStarts.map((d) => totals(id, token, d, d + DAY))),
      gget(`${id}/insights`, { access_token: token, metric: "follower_count", period: "day", since: String(start), until: String(end) })
        .then((j) => (j.data?.[0]?.values || []).map((v: any) => ({ t: v.end_time, v: Number(v.value) || 0 })))
        .catch(() => null),
      demo(id, token, "gender"),
      demo(id, token, "age"),
      demo(id, token, "city"),
    ]);
    const [follow, onlineGrid] = await Promise.all([byFollow(id, token, start, end), online(id, token, end)]);
    // seguidores ganhos por dia, alinhados aos mesmos dias da série
    const fMap = new Map<string, number>();
    (followers || []).forEach((f: any) => fMap.set(new Date(new Date(f.t).getTime() - DAY * 1000).toISOString().slice(0, 10), f.v));
    const series = dayStarts.map((d, i) => {
      const date = new Date((d - 3 * 3600) * 1000 + 12 * 3600 * 1000).toISOString().slice(0, 10);
      return { date, ...perDay[i], follows: followers ? fMap.get(date) ?? 0 : null };
    });
    const sum = (k: string) => (series.some((x: any) => x[k] != null) ? series.reduce((a: number, x: any) => a + (Number(x[k]) || 0), 0) : null);

    return NextResponse.json({
      days,
      series,
      current: { ...cur, follows: sum("follows") },
      previous: prev,
      followers_count: acc.followers_count,
      follow,
      online: onlineGrid,
      audience: { gender, age, city: city ? city.sort((a: any, b: any) => b.v - a.v).slice(0, 8) : null, total: acc.followers_count || (gender || []).reduce((a: number, x: any) => a + x.v, 0) },
    }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
