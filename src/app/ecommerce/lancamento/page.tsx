"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import StoreGate, { StorePicker } from "@/components/ec/StoreGate";
import { addDays, brl, daysBetween, fmtDay, MONTHS, num, PHASES, todayBR, toItems } from "@/lib/ecommerce";

/** Lançamento da loja online: checklist com prazos contados da estreia, funil de visitas e acompanhamento mensal. */
export default function Lancamento() {
  return <StoreGate>{(ctx) => <Launch ctx={ctx} />}</StoreGate>;
}

type LItem = { id: string; cat: string; t: string; d: number; done?: boolean };
const CATS = ["Plataforma", "Catálogo", "Operação", "Integrações", "Divulgação", "Pós-lançamento"];
const DEFAULT: [string, string, number][] = [
  ["Plataforma", "Domínio próprio conectado à loja", -21],
  ["Plataforma", "Layout com logo, cores e banners da coleção", -14],
  ["Plataforma", "Meios de pagamento: Pix, cartão e parcelamento definidos", -14],
  ["Plataforma", "Frete configurado e valor do frete grátis definido", -14],
  ["Plataforma", "Políticas de troca, privacidade e prazos publicadas", -10],
  ["Catálogo", "Fotos padronizadas (frente, costas, detalhe, look completo)", -14],
  ["Catálogo", "Descrição com tecido, caimento e sugestão de uso", -10],
  ["Catálogo", "Tabela de medidas por modelagem", -10],
  ["Catálogo", "Variações de cor e tamanho com estoque conferido", -7],
  ["Catálogo", "Títulos e descrições das categorias para o Google", -7],
  ["Operação", "Decidir se o estoque do online é separado ou o mesmo da loja física", -10],
  ["Operação", "Embalagem, cartão de agradecimento e brinde de boas-vindas", -7],
  ["Operação", "Rotina de separar e postar pedidos em até 24 h", -7],
  ["Operação", "Pedido teste do começo ao fim (compra, pagamento, envio, troca)", -3],
  ["Integrações", "Catálogo no Instagram (Instagram Shopping)", -10],
  ["Integrações", "Pixel da Meta e Google Analytics instalados", -7],
  ["Integrações", "Botão de WhatsApp no site", -7],
  ["Integrações", "Perfil da empresa no Google com o link do site", -3],
  ["Divulgação", "Lista VIP avisada primeiro, com acesso antecipado", -7],
  ["Divulgação", "Cupom ou brinde da primeira compra online", -5],
  ["Divulgação", "Conteúdos de contagem regressiva", -5],
  ["Divulgação", "Link do site na bio e destaque 'Loja online'", -1],
  ["Divulgação", "Post e stories da inauguração", 0],
  ["Pós-lançamento", "Mensagem de agradecimento aos primeiros pedidos", 3],
  ["Pós-lançamento", "Pedir avaliação e foto das clientes", 7],
  ["Pós-lançamento", "Recuperação de carrinho abandonado ativada", 7],
  ["Pós-lançamento", "Revisar visitas, conversão e produtos mais vistos", 14],
];
const rid = () => Math.random().toString(36).slice(2, 10);
const dlabel = (d: number) => (d === 0 ? "dia D" : d < 0 ? `D${d}` : `D+${d}`);

function Launch({ ctx }: { ctx: any }) {
  const today = todayBR();
  const [L, setL] = useState<any>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from("ec_launch").select("*").eq("store_id", ctx.storeId).maybeSingle();
    setL(data || { store_id: ctx.storeId, launch_date: null, items: DEFAULT.map(([cat, t, d]) => ({ id: rid(), cat, t, d })), funnel: {}, months: {}, _new: true });
  }, [ctx.storeId]);
  useEffect(() => { load(); }, [load]);

  async function save(patch: any) {
    const next = { ...L, ...patch };
    setL(next);
    const { _new, ...row } = next;
    const { error } = await createClient().from("ec_launch").upsert({ ...row, updated_at: new Date().toISOString() });
    if (error) setMsg(error.message); else if (_new) setL({ ...next, _new: false });
  }

  if (!L) return <p className="text-sm text-fog">Carregando…</p>;
  const items: LItem[] = L.items || [];
  const setItems = (xs: LItem[]) => save({ items: xs });
  const done = items.filter((x) => x.done).length;
  const ld = L.launch_date as string | null;
  const toLaunch = ld ? daysBetween(today, ld) : null;
  const late = ld ? items.filter((x) => !x.done && addDays(ld, x.d) < today) : [];
  const f = L.funnel || {};
  const orders = f.goal && f.ticket ? Math.ceil(f.goal / f.ticket) : null;
  const visits = orders && f.conv ? Math.ceil(orders / (f.conv / 100)) : null;

  // meses acompanhados: do mês da estreia (ou atual) por 6 meses
  const startM = (ld || today).slice(0, 7);
  const monthsList = Array.from({ length: 6 }, (_, i) => { const d = new Date(Number(startM.slice(0, 4)), Number(startM.slice(5, 7)) - 1 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const M = L.months || {};
  const setMonth = (m: string, k: string, v: number | null) => { if ((M[m]?.[k] ?? null) !== v) save({ months: { ...M, [m]: { ...(M[m] || {}), [k]: v } } }); };
  const maxRev = Math.max(f.goal || 0, ...monthsList.map((m) => Number(M[m]?.receita) || 0), 1);

  async function createAction() {
    if (!ld) return;
    const { data, error } = await createClient().from("ec_actions").insert({
      store_id: ctx.storeId, title: "Inauguração da loja online", kind: "lancamento", date: ld, warmup_date: addDays(ld, -7), goal: f.goal ? Math.round(f.goal / 4) : null,
      do_what: "a inauguração da loja online", audience: "clientes da loja física e seguidoras do Instagram",
      before_items: toItems(PHASES.before), during_items: toItems(PHASES.during), after_items: toItems(PHASES.after),
    }).select("id").single();
    if (error) return setMsg(error.message);
    location.href = `/ecommerce/acoes/campanha?id=${data.id}`;
  }

  return (
    <>
      <PageHead kicker="E-COMMERCE · 03 LOJA ONLINE" title="Lançamento da loja online" desc="Tudo o que precisa estar pronto antes da estreia na Nuvemshop, com prazo contado a partir do dia D, a conta de visitas que a meta exige e o acompanhamento dos primeiros meses.">
        <StorePicker ctx={ctx} />
        <div className="flex items-center gap-2"><label className="text-xs text-fog">Dia D</label><input type="date" className="input w-auto" defaultValue={ld || ""} onBlur={(e) => e.target.value !== (ld || "") && save({ launch_date: e.target.value || null })} /></div>
        {ld && <button onClick={createAction} className="btn btn-mint"><I.calendar className="w-4 h-4" />Criar campanha da inauguração</button>}
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="card p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Estreia</p><p className="font-display text-2xl md:text-3xl font-extrabold mt-2 tabular-nums">{toLaunch == null ? "–" : toLaunch > 0 ? `${toLaunch} dias` : toLaunch === 0 ? "Hoje" : "No ar"}</p><p className="text-xs text-fog mt-1">{ld ? fmtDay(ld) + "/" + ld.slice(0, 4) : "defina o dia D acima"}</p></div>
        <div className="card p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Pronto</p><p className="font-display text-2xl md:text-3xl font-extrabold mt-2 tabular-nums">{items.length ? Math.round((done / items.length) * 100) : 0}%</p><p className="text-xs text-fog mt-1">{done} de {items.length} itens</p><div className="h-1 rounded-full bg-line mt-2 overflow-hidden"><div className="h-full bg-mint" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div></div>
        <div className="card p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Atrasados</p><p className={`font-display text-2xl md:text-3xl font-extrabold mt-2 tabular-nums ${late.length ? "text-danger" : ""}`}>{ld ? late.length : "–"}</p><p className="text-xs text-fog mt-1 truncate">{late[0] ? late[0].t : "nenhum item fora do prazo"}</p></div>
        <div className="card p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-fog">Visitas por mês</p><p className="font-display text-2xl md:text-3xl font-extrabold mt-2 tabular-nums">{visits ? visits.toLocaleString("pt-BR") : "–"}</p><p className="text-xs text-fog mt-1">{visits ? `${Math.ceil(visits / 30).toLocaleString("pt-BR")} por dia para ${orders} pedidos` : "preencha o funil abaixo"}</p></div>
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-4 items-start">
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Checklist da estreia</p>
          <div className="grid md:grid-cols-2 gap-4">
            {CATS.map((cat) => {
              const xs = items.filter((x) => x.cat === cat).sort((a, b) => a.d - b.d);
              const dn = xs.filter((x) => x.done).length;
              return (
                <div key={cat} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between mb-2"><p className="text-xs font-bold uppercase tracking-wide">{cat}</p><span className="text-[11px] text-fog tabular-nums">{dn}/{xs.length}</span></div>
                  <div className="space-y-1.5">
                    {xs.map((x) => {
                      const due = ld ? addDays(ld, x.d) : null, isLate = !!due && !x.done && due < today;
                      return (
                        <div key={x.id} className="group flex items-start gap-2 text-sm">
                          <input type="checkbox" className="mt-1 accent-[var(--color-mint)]" checked={!!x.done} onChange={() => setItems(items.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)))} />
                          <span className={`flex-1 ${x.done ? "line-through text-fog" : ""}`}>{x.t}</span>
                          <span className={`font-mono text-[10px] shrink-0 mt-0.5 ${isLate ? "text-danger" : "text-fog"}`} title={dlabel(x.d)}>{due ? fmtDay(due) : dlabel(x.d)}</span>
                          <button onClick={() => setItems(items.filter((y) => y.id !== x.id))} className="opacity-0 group-hover:opacity-100 text-fog hover:text-danger" aria-label="Remover"><I.trash className="w-3.5 h-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); const t = (draft[cat] || "").trim(); if (!t) return; setItems([...items, { id: rid(), cat, t, d: -3 }]); setDraft({ ...draft, [cat]: "" }); }} className="mt-2">
                    <input className="input !py-1.5 text-sm" placeholder="+ item (prazo D-3)" value={draft[cat] || ""} onChange={(e) => setDraft({ ...draft, [cat]: e.target.value })} />
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-mint mb-3">Funil da meta online</p>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label">Meta/mês R$</label><input inputMode="decimal" className="input !px-2" defaultValue={f.goal ?? ""} onBlur={(e) => save({ funnel: { ...f, goal: num(e.target.value) } })} /></div>
              <div><label className="label">Ticket R$</label><input inputMode="decimal" className="input !px-2" defaultValue={f.ticket ?? ""} placeholder={ctx.store?.profile?.ticket ? String(ctx.store.profile.ticket) : ""} onBlur={(e) => save({ funnel: { ...f, ticket: num(e.target.value) } })} /></div>
              <div><label className="label">Conversão %</label><input inputMode="decimal" className="input !px-2" defaultValue={f.conv ?? ""} placeholder="1" onBlur={(e) => save({ funnel: { ...f, conv: num(e.target.value?.replace(",", ".")) } })} /></div>
            </div>
            <div className="mt-4 space-y-2">
              {[["Visitas no site", visits], ["Pedidos", orders], ["Faturamento", f.goal ? brl(f.goal) : null]].map(([l, v], i) => (
                <div key={String(l)} className="rounded-lg bg-panel2 px-3 py-2 flex justify-between items-center" style={{ marginLeft: i * 14, marginRight: i * 14 }}>
                  <span className="text-xs text-fog">{l}</span><span className="font-display font-bold tabular-nums">{v == null ? "–" : typeof v === "number" ? v.toLocaleString("pt-BR") : v}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-fog mt-3">Referência aproximada de mercado: lojas de moda online convertem perto de 1% das visitas. Os números reais aparecem no painel da Nuvemshop.</p>
          </section>

          <section className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Primeiros meses (do painel da Nuvemshop)</p>
            <div className="flex items-end gap-2 h-24 mb-3">
              {monthsList.map((m) => {
                const r = Number(M[m]?.receita) || 0;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full rounded-t bg-mint/80" style={{ height: `${(r / maxRev) * 100}%`, minHeight: r ? 4 : 0 }} title={brl(r)} />
                    <span className="text-[10px] text-fog">{MONTHS[Number(m.slice(5, 7)) - 1].slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
            {f.goal ? <p className="text-[11px] text-fog mb-2">Barra cheia = {brl(maxRev)}; meta mensal {brl(f.goal)}.</p> : null}
            <div className="space-y-2">
              {monthsList.map((m) => {
                const x = M[m] || {}, conv = x.visitas && x.pedidos ? (x.pedidos / x.visitas) * 100 : null, tk = x.pedidos && x.receita ? x.receita / x.pedidos : null;
                return (
                  <div key={m} className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5 items-center">
                    <span className="text-xs text-fog">{MONTHS[Number(m.slice(5, 7)) - 1].slice(0, 3)}</span>
                    <input inputMode="numeric" className="input !px-2 !py-1 text-xs" placeholder="visitas" defaultValue={x.visitas ?? ""} onBlur={(e) => setMonth(m, "visitas", num(e.target.value))} />
                    <input inputMode="numeric" className="input !px-2 !py-1 text-xs" placeholder="pedidos" defaultValue={x.pedidos ?? ""} onBlur={(e) => setMonth(m, "pedidos", num(e.target.value))} />
                    <input inputMode="decimal" className="input !px-2 !py-1 text-xs" placeholder="R$" defaultValue={x.receita ?? ""} onBlur={(e) => setMonth(m, "receita", num(e.target.value))} />
                    {(conv != null || tk != null) && <p className="col-start-2 col-span-3 text-[10px] text-fog -mt-1">{conv != null ? `conversão ${conv.toFixed(2).replace(".", ",")}%` : ""}{conv != null && tk != null ? " · " : ""}{tk != null ? `ticket ${brl(tk)}` : ""}</p>}
                  </div>
                );
              })}
            </div>
          </section>
          {msg && <p className="text-sm text-danger">{msg}</p>}
          <p className="text-[11px] text-fog">A campanha da inauguração entra no <Link href="/ecommerce/acoes" className="text-mint">calendário de ações</Link> com aquecimento de 7 dias.</p>
        </aside>
      </div>
    </>
  );
}
