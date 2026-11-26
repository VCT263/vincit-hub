"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import StoreGate, { StorePicker } from "@/components/ec/StoreGate";
import { brl, num, todayBR } from "@/lib/ecommerce";

/** Inteligência do negócio: cliente ideal, mix da coleção, preço e margem, concorrentes. Tudo digitado, sem IA. */
export default function Inteligencia() {
  return <StoreGate>{(ctx) => <Intel ctx={ctx} />}</StoreGate>;
}

const TABS = [["persona", "Cliente ideal"], ["mix", "Mix da coleção"], ["preco", "Preço e margem"], ["concorrentes", "Concorrentes"]] as const;
const rid = () => Math.random().toString(36).slice(2, 10);
const pct = (v: number | null) => (v == null || !isFinite(v) ? "–" : `${v.toFixed(1).replace(".", ",")}%`);

function Intel({ ctx }: { ctx: any }) {
  const [tab, setTab] = useState<string>(() => { try { return localStorage.getItem("ec_intel_tab") || "persona"; } catch { return "persona"; } });
  const [D, setD] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [buyCap, setBuyCap] = useState<number | null>(null);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data }, { data: m }] = await Promise.all([
      s.from("ec_intel").select("*").eq("store_id", ctx.storeId).maybeSingle(),
      s.from("ec_months").select("buy_cap").eq("store_id", ctx.storeId).eq("month", todayBR().slice(0, 8) + "01").maybeSingle(),
    ]);
    setD(data || { store_id: ctx.storeId, persona: {}, mix: [], pricing: {}, products: [], competitors: [] });
    setBuyCap(m?.buy_cap ?? null);
  }, [ctx.storeId]);
  useEffect(() => { load(); }, [load]);

  async function save(patch: any) {
    const next = { ...D, ...patch };
    setD(next);
    const { error } = await createClient().from("ec_intel").upsert({ ...next, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : null);
  }
  const pick = (t: string) => { setTab(t); try { localStorage.setItem("ec_intel_tab", t); } catch {} };

  if (!D) return <p className="text-sm text-fog">Carregando…</p>;
  return (
    <>
      <PageHead kicker="E-COMMERCE · 04 NEGÓCIO" title="Inteligência do negócio" desc="Quem é a cliente, o que comprar e em que proporção, quanto cobrar sem perder margem e o que os concorrentes estão fazendo. Base para as campanhas e para as compras.">
        <StorePicker ctx={ctx} />
      </PageHead>
      <div className="flex gap-1 card !rounded-xl p-1 mb-4 overflow-x-auto">
        {TABS.map(([k, l]) => <button key={k} onClick={() => pick(k)} className={`btn btn-sm whitespace-nowrap ${tab === k ? "btn-mint" : "btn-ghost"}`}>{l}</button>)}
      </div>
      {msg && <p className="card p-3 text-sm text-danger mb-4">{msg}</p>}
      {tab === "persona" && <Persona D={D} save={save} profile={ctx.store?.profile} />}
      {tab === "mix" && <Mix D={D} save={save} buyCap={buyCap} />}
      {tab === "preco" && <Pricing D={D} save={save} />}
      {tab === "concorrentes" && <Competitors D={D} save={save} />}
    </>
  );
}

const PERSONA: [string, string, string][] = [
  ["nome", "Como chamamos ela", "Ex.: a Carol"],
  ["idade", "Idade e momento de vida", "Ex.: 34 anos, casada, um filho pequeno"],
  ["rotina", "Rotina", "Ex.: trabalha em escritório, academia de manhã, sai com as amigas no fim de semana"],
  ["ocasioes", "Para que ocasiões ela compra", "Ex.: trabalho, aniversário, viagem, festa de fim de ano"],
  ["desejos", "O que ela quer sentir", "Ex.: estar bem vestida sem esforço, receber elogio"],
  ["dores", "O que a incomoda ao comprar roupa", "Ex.: não achar o tamanho, peça que não serve depois de lavar, falta de tempo"],
  ["objecoes", "Por que ela não compra", "Ex.: achar caro, medo de errar o tamanho no online"],
  ["gatilhos", "O que faz ela comprar", "Ex.: ver a peça vestida em alguém parecido com ela, novidade, atendimento pelo nome"],
  ["onde", "Onde ela está", "Ex.: Instagram à noite, WhatsApp, passa pelo centro na hora do almoço"],
  ["marcas", "Marcas que ela admira", "Ex.: Farm, Animale, perfis de moda que segue"],
];

function Persona({ D, save, profile }: { D: any; save: (p: any) => void; profile: any }) {
  const p = D.persona || {};
  const filled = PERSONA.filter(([k]) => p[k]).length;
  const set = (k: string, v: string) => { if ((p[k] || "") !== v) save({ persona: { ...p, [k]: v || null } }); };
  const ideas = [
    p.dores && `Conteúdo que resolve a dor: ${String(p.dores).split(/[,.;]/)[0].trim()}`,
    p.objecoes && `Quebra de objeção: ${String(p.objecoes).split(/[,.;]/)[0].trim()}`,
    p.ocasioes && `Look para cada ocasião: ${String(p.ocasioes).split(/[,.;]/).slice(0, 3).map((x) => x.trim()).filter(Boolean).join(", ")}`,
    p.gatilhos && `Prova: ${String(p.gatilhos).split(/[,.;]/)[0].trim()}`,
    p.desejos && `Desejo: ${String(p.desejos).split(/[,.;]/)[0].trim()}`,
  ].filter(Boolean) as string[];
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
      <section className="card p-5 grid md:grid-cols-2 gap-3">
        {PERSONA.map(([k, l, ph]) => (
          <div key={k} className={k === "nome" || k === "idade" ? "" : "md:col-span-1"}><label className="label">{l}</label><textarea rows={2} className="input !min-h-0 text-sm" defaultValue={p[k] || ""} placeholder={ph} onBlur={(e) => set(k, e.target.value.trim())} /></div>
        ))}
      </section>
      <aside className="space-y-4">
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mint">Retrato</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="w-12 h-12 rounded-full bg-mint/15 text-mint grid place-items-center font-display font-bold text-lg">{(p.nome || "?").replace(/^a\s+/i, "").slice(0, 1).toUpperCase()}</span>
            <div><p className="font-display font-bold text-lg">{p.nome || "Sem nome ainda"}</p><p className="text-xs text-fog">{p.idade || profile?.publico || "preencha ao lado"}</p></div>
          </div>
          <div className="h-1.5 rounded-full bg-line mt-4 overflow-hidden"><div className="h-full bg-mint" style={{ width: `${(filled / PERSONA.length) * 100}%` }} /></div>
          <p className="text-[11px] text-fog mt-1">{filled}/{PERSONA.length} respostas</p>
        </section>
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Pautas que saem daqui</p>
          {ideas.length ? <ul className="space-y-2 text-sm">{ideas.map((x, i) => <li key={i} className="flex gap-2"><I.spark className="w-4 h-4 text-mint shrink-0 mt-0.5" />{x}</li>)}</ul> : <p className="text-sm text-fog">Responda dores, objeções, ocasiões e gatilhos para virar pauta de conteúdo.</p>}
          <p className="text-[11px] text-fog mt-3">As campanhas pedidas ao Claude no chat usam esta persona.</p>
        </section>
      </aside>
    </div>
  );
}

const TIPOS: Record<string, [string, number, string]> = {
  basico: ["Básico", 60, "Vende o ano todo, gira estoque"],
  tendencia: ["Tendência", 30, "A novidade da estação"],
  conceito: ["Conceito", 10, "Peça de desejo, vitrine e conteúdo"],
};

function Mix({ D, save, buyCap }: { D: any; save: (p: any) => void; buyCap: number | null }) {
  const rows: any[] = D.mix || [];
  const setRows = (xs: any[]) => save({ mix: xs });
  const upd = (id: string, k: string, v: any) => { const r = rows.find((x) => x.id === id); if (r && (r[k] ?? null) !== v) setRows(rows.map((x) => (x.id === id ? { ...x, [k]: v } : x))); };
  const tot = rows.reduce((a, r) => ({ pecas: a.pecas + (Number(r.pecas) || 0), custo: a.custo + (Number(r.pecas) || 0) * (Number(r.custo) || 0), venda: a.venda + (Number(r.pecas) || 0) * (Number(r.preco) || 0) }), { pecas: 0, custo: 0, venda: 0 });
  const byTipo = Object.keys(TIPOS).map((t) => { const p = rows.filter((r) => r.tipo === t).reduce((a, r) => a + (Number(r.pecas) || 0), 0); return { t, p, share: tot.pecas ? (p / tot.pecas) * 100 : 0 }; });
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
      <section className="card p-5 overflow-x-auto">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Compra planejada por categoria</p>
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-left text-[11px] text-fog"><th className="pb-2 pr-2 font-normal">Categoria</th><th className="pb-2 pr-2 font-normal">Tipo</th><th className="pb-2 pr-2 font-normal">Peças</th><th className="pb-2 pr-2 font-normal">Custo un.</th><th className="pb-2 pr-2 font-normal">Preço un.</th><th className="pb-2 pr-2 font-normal text-right">Investimento</th><th className="pb-2 pr-2 font-normal text-right">Markup</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-1.5 pr-2"><input className="input !py-1 !px-2" defaultValue={r.cat || ""} placeholder="Ex.: vestidos" onBlur={(e) => upd(r.id, "cat", e.target.value)} /></td>
                <td className="py-1.5 pr-2"><select className="input !py-1 !px-2" value={r.tipo || "basico"} onChange={(e) => upd(r.id, "tipo", e.target.value)}>{Object.entries(TIPOS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></td>
                <td className="py-1.5 pr-2 w-20"><input inputMode="numeric" className="input !py-1 !px-2" defaultValue={r.pecas ?? ""} onBlur={(e) => upd(r.id, "pecas", num(e.target.value))} /></td>
                <td className="py-1.5 pr-2 w-24"><input inputMode="decimal" className="input !py-1 !px-2" defaultValue={r.custo ?? ""} onBlur={(e) => upd(r.id, "custo", num(e.target.value))} /></td>
                <td className="py-1.5 pr-2 w-24"><input inputMode="decimal" className="input !py-1 !px-2" defaultValue={r.preco ?? ""} onBlur={(e) => upd(r.id, "preco", num(e.target.value))} /></td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{brl((Number(r.pecas) || 0) * (Number(r.custo) || 0))}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{r.custo && r.preco ? `${(r.preco / r.custo).toFixed(1).replace(".", ",")}×` : "–"}</td>
                <td><button onClick={() => setRows(rows.filter((x) => x.id !== r.id))} className="text-fog hover:text-danger" aria-label="Remover"><I.trash className="w-4 h-4" /></button></td>
              </tr>
            ))}
            <tr className="border-t border-line font-semibold"><td className="py-2 pr-2">Total</td><td /><td className="py-2 pr-2 tabular-nums">{tot.pecas}</td><td /><td /><td className="py-2 pr-2 text-right tabular-nums">{brl(tot.custo)}</td><td className="py-2 pr-2 text-right tabular-nums">{tot.custo ? `${(tot.venda / tot.custo).toFixed(1).replace(".", ",")}×` : "–"}</td><td /></tr>
          </tbody>
        </table>
        <button onClick={() => setRows([...rows, { id: rid(), tipo: "basico" }])} className="btn btn-ghost btn-sm mt-3"><I.plus className="w-4 h-4" />Categoria</button>
      </section>
      <aside className="space-y-4">
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Pirâmide da coleção</p>
          <div className="space-y-3">
            {byTipo.slice().reverse().map(({ t, p, share }) => {
              const [l, target, hint] = TIPOS[t], off = tot.pecas ? share - target : 0;
              return (
                <div key={t}>
                  <div className="flex justify-between text-sm"><span className="font-semibold">{l}</span><span className="tabular-nums">{pct(share)} <span className="text-fog text-xs">ideal ~{target}%</span></span></div>
                  <div className="relative h-2 rounded-full bg-line mt-1 overflow-hidden"><div className="h-full bg-mint" style={{ width: `${Math.min(100, share)}%` }} /><span className="absolute top-0 h-full w-0.5 bg-paper/70" style={{ left: `${target}%` }} /></div>
                  <p className="text-[11px] text-fog mt-0.5">{p} peças · {hint}{tot.pecas && Math.abs(off) >= 10 ? (off > 0 ? " · acima do ideal" : " · abaixo do ideal") : ""}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-fog mt-3">Proporção de referência do varejo de moda; ajuste ao perfil da loja.</p>
        </section>
        <section className="card p-5 text-sm space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Contra o teto de compra</p>
          <div className="flex justify-between"><span className="text-fog">Investimento planejado</span><span className="tabular-nums">{brl(tot.custo)}</span></div>
          <div className="flex justify-between"><span className="text-fog">Teto do mês (Plano)</span><span className="tabular-nums">{brl(buyCap)}</span></div>
          {buyCap != null && tot.custo > 0 && <p className={tot.custo > buyCap ? "text-danger" : "text-mint"}>{tot.custo > buyCap ? `Passa ${brl(tot.custo - buyCap)} do teto` : `Sobra ${brl(buyCap - tot.custo)}`}</p>}
          <div className="flex justify-between border-t border-line pt-2"><span className="text-fog">Venda potencial a preço cheio</span><span className="tabular-nums">{brl(tot.venda)}</span></div>
        </section>
      </aside>
    </div>
  );
}

function Pricing({ D, save }: { D: any; save: (p: any) => void }) {
  const P = D.pricing || {};
  const [c, setC] = useState<Record<string, number | null>>({ custo: null, markup: P.markup ?? 2.5, imposto: P.imposto ?? 6, cartao: P.cartao ?? 3.5, comissao: P.comissao ?? 0, extra: P.extra ?? 0, preco: null });
  const [name, setName] = useState("");
  const setDefault = (k: string, v: number | null) => { setC({ ...c, [k]: v }); if ((P[k] ?? null) !== v) save({ pricing: { ...P, [k]: v } }); };
  const preco = c.preco ?? (c.custo && c.markup ? Math.round(c.custo * c.markup * 100) / 100 : null);
  const varPct = ((c.imposto || 0) + (c.cartao || 0) + (c.comissao || 0)) / 100;
  const margin = (p: number) => (c.custo != null ? p - c.custo - p * varPct - (c.extra || 0) : null);
  const m0 = preco ? margin(preco) : null;
  // desconto máximo sem margem negativa: p*(1-d)*(1-varPct) = custo + extra
  const maxDisc = preco && c.custo != null ? (1 - (c.custo + (c.extra || 0)) / (preco * (1 - varPct))) * 100 : null;
  const products: any[] = D.products || [];
  const field = (k: string, l: string, def?: boolean) => (
    <div><label className="label">{l}</label><input inputMode="decimal" className="input" value={c[k] ?? ""} onChange={(e) => setC({ ...c, [k]: num(e.target.value.replace(",", ".")) })} onBlur={(e) => def && setDefault(k, num(e.target.value.replace(",", ".")))} /></div>
  );
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
      <section className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Calculadora</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {field("custo", "Custo da peça R$")}
          {field("markup", "Markup (×)", true)}
          {field("preco", "Ou preço de venda R$")}
          {field("extra", "Embalagem/frete R$", true)}
          {field("imposto", "Imposto %", true)}
          {field("cartao", "Taxa cartão %", true)}
          {field("comissao", "Comissão %", true)}
        </div>
        <p className="text-[11px] text-fog mt-2">Markup, imposto, taxas e extras ficam salvos como padrão da loja. Se preencher o preço, ele vale no lugar do markup.</p>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-panel2 p-4"><p className="text-[11px] text-fog">Preço</p><p className="font-display text-2xl font-extrabold tabular-nums">{brl(preco)}</p></div>
          <div className="rounded-xl bg-panel2 p-4"><p className="text-[11px] text-fog">Sobra por peça</p><p className={`font-display text-2xl font-extrabold tabular-nums ${m0 != null && m0 < 0 ? "text-danger" : ""}`}>{brl(m0)}</p><p className="text-[11px] text-fog">{preco && m0 != null ? `${pct((m0 / preco) * 100)} do preço` : ""}</p></div>
          <div className="rounded-xl bg-panel2 p-4"><p className="text-[11px] text-fog">Desconto máximo</p><p className="font-display text-2xl font-extrabold tabular-nums">{maxDisc != null ? pct(Math.max(0, maxDisc)) : "–"}</p><p className="text-[11px] text-fog">antes de ficar no prejuízo</p></div>
        </div>
        {preco && c.custo != null ? (
          <div className="mt-5">
            <p className="text-xs text-fog mb-2">Se der desconto</p>
            <div className="divide-y divide-line text-sm">
              {[10, 20, 30, 40, 50].map((d) => { const p = preco * (1 - d / 100), m = margin(p)!; return (
                <div key={d} className="py-1.5 grid grid-cols-[60px_1fr_1fr_1fr] gap-2 tabular-nums"><span className="text-fog">{d}%</span><span>{brl(p)}</span><span className={m < 0 ? "text-danger" : ""}>sobra {brl(m)}</span><span className="text-fog">{pct((m / p) * 100)}</span></div>
              ); })}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; save({ products: [{ id: rid(), nome: name.trim(), custo: c.custo, preco, sobra: m0 }, ...products].slice(0, 60) }); setName(""); }} className="flex gap-2 mt-4">
              <input className="input" placeholder="Nome da peça para guardar" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-ghost">Guardar</button>
            </form>
          </div>
        ) : null}
      </section>
      <aside className="card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Peças calculadas ({products.length})</p>
        {products.length === 0 && <p className="text-sm text-fog">Guarde aqui as peças que você calculou para consultar na hora da compra ou da liquidação.</p>}
        <div className="divide-y divide-line">
          {products.map((x) => (
            <div key={x.id} className="py-2 flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0"><p className="truncate">{x.nome}</p><p className="text-[11px] text-fog tabular-nums">custo {brl(x.custo)} · preço {brl(x.preco)} · sobra {brl(x.sobra)}</p></div>
              <button onClick={() => save({ products: products.filter((y) => y.id !== x.id) })} className="text-fog hover:text-danger" aria-label="Remover"><I.trash className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

const COMP: [string, string][] = [["insta", "Instagram"], ["faixa", "Faixa de preço"], ["fortes", "O que fazem bem"], ["fracos", "Onde deixam a desejar"], ["ideia", "Ideia para a nossa loja"]];

function Competitors({ D, save }: { D: any; save: (p: any) => void }) {
  const xs: any[] = D.competitors || [];
  const set = (xs2: any[]) => save({ competitors: xs2 });
  const upd = (id: string, k: string, v: any) => { const r = xs.find((x) => x.id === id); if (r && (r[k] || "") !== v) set(xs.map((x) => (x.id === id ? { ...x, [k]: v, visto: todayBR() } : x))); };
  return (
    <>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {xs.map((x) => (
          <section key={x.id} className="card p-5 space-y-2">
            <div className="flex items-center gap-2">
              <input className="input font-display font-bold" defaultValue={x.nome || ""} placeholder="Nome da loja" onBlur={(e) => upd(x.id, "nome", e.target.value)} />
              <button onClick={() => set(xs.filter((y) => y.id !== x.id))} className="text-fog hover:text-danger shrink-0" aria-label="Remover"><I.trash className="w-4 h-4" /></button>
            </div>
            {COMP.map(([k, l]) => (
              <div key={k}><label className="label">{l}</label>{k === "insta" || k === "faixa" ? <input className="input text-sm" defaultValue={x[k] || ""} onBlur={(e) => upd(x.id, k, e.target.value)} /> : <textarea rows={2} className="input !min-h-0 text-sm" defaultValue={x[k] || ""} onBlur={(e) => upd(x.id, k, e.target.value)} />}</div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-fog">{x.visto ? `atualizado em ${x.visto.split("-").reverse().join("/")}` : ""}</p>
              {x.insta && <a href={`https://instagram.com/${String(x.insta).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`} target="_blank" rel="noreferrer" className="text-xs text-mint">Abrir perfil →</a>}
            </div>
          </section>
        ))}
        <button onClick={() => set([...xs, { id: rid(), visto: todayBR() }])} className="card p-5 grid place-items-center text-fog hover:text-paper min-h-[160px]"><span className="flex items-center gap-2"><I.plus className="w-4 h-4" />Concorrente</span></button>
      </div>
      <p className="text-[11px] text-fog mt-3">Reveja uma vez por mês: vitrine, preço, coleção nova e o que mais engaja no Instagram deles.</p>
    </>
  );
}
