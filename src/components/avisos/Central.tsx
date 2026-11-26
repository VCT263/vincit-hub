"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncTask } from "@/lib/gsync";
import { addDays, todayBR } from "@/components/dia/shared";
import { I } from "@/components/icons";
import { A } from "@/components/agency/icons";
import { CATS, TOM_CLS, adiado, ativo, grupos, ha, meta, opcoesAdiar, type Cat, type Nota } from "./meta";

type Modo = "pop" | "pagina" | "resumo";
type Aba = "abertos" | "adiados" | "lidos";

const ICONE: Record<Cat, (p: { className?: string }) => React.ReactNode> = {
  tarefas: A.check, agenda: A.cal, conteudo: I.camera, gestor: I.briefcase, rotina: I.refresh, outros: I.bell,
};

/** avisa o sino, o menu e as listas de tarefas que algo mudou */
const avisar = () => { window.dispatchEvent(new Event("vh:avisos")); window.dispatchEvent(new Event("vh:tasks")); };

/**
 * Central de avisos do HUB: a mesma lista no sino do topo (pop), na página Avisos e no card do Resumo.
 * Filtra por categoria, agrupa por dia e resolve na hora: concluir tarefa, passar para amanhã,
 * marcar recebimento, adiar o aviso ou marcar como lido.
 */
export default function Central({ modo, limite, aoNavegar }: { modo: Modo; limite?: number; aoNavegar?: () => void }) {
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [aba, setAba] = useState<Aba>("abertos");
  const [cat, setCat] = useState<Cat | "todas">("todas");
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    let q = createClient().from("notifications").select("id,kind,title,body,href,source_type,source_id,created_at,read_at,snoozed_until").order("created_at", { ascending: false });
    q = modo === "pagina" ? q.limit(300) : q.is("read_at", null).limit(100);
    const { data } = await q;
    setNotas((data as Nota[]) || []);
    setAgora(Date.now());
  }, [modo]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    window.addEventListener("vh:avisos", carregar);
    window.addEventListener("focus", carregar);
    return () => { clearInterval(t); window.removeEventListener("vh:avisos", carregar); window.removeEventListener("focus", carregar); };
  }, [carregar]);

  const daAba = useMemo(() => (notas || []).filter((n) => (aba === "abertos" ? ativo(n, agora) : aba === "adiados" ? adiado(n, agora) : !!n.read_at)), [notas, aba, agora]);
  const contagem = useMemo(() => {
    const c: Partial<Record<Cat, number>> = {};
    for (const n of daAba) { const k = meta(n).cat; c[k] = (c[k] || 0) + 1; }
    return c;
  }, [daAba]);
  const visiveis = useMemo(() => {
    const l = cat === "todas" ? daAba : daAba.filter((n) => meta(n).cat === cat);
    return limite ? l.slice(0, limite) : l;
  }, [daAba, cat, limite]);
  const abertos = (notas || []).filter((n) => ativo(n, agora));
  const nAdiados = (notas || []).filter((n) => adiado(n, agora)).length;
  const urgentes = abertos.filter((n) => meta(n).tom === "danger").length;

  // ── ações ──
  const s = () => createClient();
  const tirar = (ids: string[], patch: Partial<Nota>) => setNotas((l) => (l || []).map((n) => (ids.includes(n.id) ? { ...n, ...patch } : n)));
  async function lidas(ids: string[]) {
    if (!ids.length) return;
    const read_at = new Date().toISOString();
    tirar(ids, { read_at });
    await s().from("notifications").update({ read_at }).in("id", ids);
    avisar();
  }
  async function naoLida(id: string) {
    tirar([id], { read_at: null, snoozed_until: null });
    await s().from("notifications").update({ read_at: null, snoozed_until: null }).eq("id", id);
    avisar();
  }
  async function adiar(id: string, ate: string | null) {
    tirar([id], { snoozed_until: ate });
    await s().from("notifications").update({ snoozed_until: ate }).eq("id", id);
    avisar();
  }
  async function concluir(n: Nota) {
    if (!n.source_id) return;
    await s().from("ag_tasks").update({ done: true }).eq("id", n.source_id);
    syncTask(n.source_id);
    await lidas([n.id]);
  }
  async function amanha(n: Nota) {
    if (!n.source_id) return;
    await s().from("ag_tasks").update({ due_date: addDays(todayBR(), 1) }).eq("id", n.source_id);
    syncTask(n.source_id);
    await lidas([n.id]);
  }
  async function recebido(n: Nota) {
    if (!n.source_id) return;
    await s().from("ag_transactions").update({ paid: true, paid_at: todayBR() }).eq("id", n.source_id);
    await lidas([n.id]);
  }

  if (!notas) return <p className="text-sm text-fog px-2 py-6">Carregando avisos…</p>;

  const pop = modo === "pop", pagina = modo === "pagina";
  const kicker = "font-mono text-[11px] tracking-widest uppercase";

  const chips = (
    <div className={`flex gap-1.5 overflow-x-auto scroll-thin ${pop ? "px-2 pb-2" : "pb-1"}`}>
      <Chip ativo={cat === "todas"} onClick={() => setCat("todas")} label="Todos" n={daAba.length} />
      {CATS.filter((c) => contagem[c.key]).map((c) => (
        <Chip key={c.key} ativo={cat === c.key} onClick={() => setCat(c.key)} label={c.label} n={contagem[c.key] || 0} />
      ))}
    </div>
  );

  const lista = !visiveis.length ? (
    <Vazio aba={aba} filtrado={cat !== "todas"} compacto={!pagina} />
  ) : pagina ? (
    <div className="space-y-4">
      {grupos(visiveis).map((g) => (
        <section key={g.titulo} className="card p-2 md:p-3">
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <p className={`${kicker} text-fog`}>{g.titulo} · {g.itens.length}</p>
            {aba !== "lidos" && <button onClick={() => lidas(g.itens.map((x) => x.id))} className="text-xs text-fog hover:text-mint">Marcar como lidos</button>}
          </div>
          <ul className="divide-y divide-line/60">
            {g.itens.map((n) => <Item key={n.id} n={n} aba={aba} grande acoes={{ lidas, naoLida, adiar, concluir, amanha, recebido }} aoNavegar={aoNavegar} />)}
          </ul>
        </section>
      ))}
    </div>
  ) : (
    <ul className={pop ? "max-h-[min(60vh,520px)] overflow-y-auto scroll-thin px-1" : ""}>
      {(pop ? grupos(visiveis) : [{ titulo: "", itens: visiveis }]).map((g) => (
        <li key={g.titulo || "todos"}>
          {g.titulo && <p className={`${kicker} text-fog/80 px-2 pt-3 pb-1 text-[10px]`}>{g.titulo}</p>}
          <ul className={pop ? "" : "grid md:grid-cols-2 gap-x-6"}>
            {g.itens.map((n) => <Item key={n.id} n={n} aba={aba} acoes={{ lidas, naoLida, adiar, concluir, amanha, recebido }} aoNavegar={aoNavegar} />)}
          </ul>
        </li>
      ))}
    </ul>
  );

  // ── sino do topo ──
  if (pop) {
    return (
      <div>
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
          <div className="flex items-baseline gap-2">
            <p className="font-display font-extrabold text-lg tracking-tight">Avisos</p>
            {abertos.length > 0 && <span className={`${kicker} text-mint text-[10px]`}>{abertos.length} não lido{abertos.length === 1 ? "" : "s"}</span>}
          </div>
          {abertos.length > 0 && <button type="button" onClick={() => lidas(abertos.map((x) => x.id))} className="text-xs text-fog hover:text-mint">Marcar tudo como lido</button>}
        </div>
        {daAba.length > 0 && chips}
        <div className="border-t border-line/70">{lista}</div>
        <div className="flex items-center justify-between gap-2 border-t border-line/70 px-3 py-2.5 text-xs">
          <Link href="/avisos" onClick={aoNavegar} className="text-mint font-semibold hover:underline">Ver todos os avisos{nAdiados ? ` · ${nAdiados} adiado${nAdiados === 1 ? "" : "s"}` : ""}</Link>
          <Link href="/conta#notificacoes" onClick={aoNavegar} className="text-fog hover:text-paper">Notificações no celular</Link>
        </div>
      </div>
    );
  }

  // ── card do Resumo ──
  if (modo === "resumo") {
    return (
      <>
        <div className="flex items-center justify-between mb-2 gap-3">
          <p className={`${kicker} text-fog`}>Avisos · {abertos.length} não lido{abertos.length === 1 ? "" : "s"}{urgentes ? <span className="text-danger"> · {urgentes} urgente{urgentes === 1 ? "" : "s"}</span> : null}</p>
          <div className="flex items-center gap-3">
            {abertos.length > 0 && <button onClick={() => lidas(abertos.map((x) => x.id))} className="text-xs text-fog hover:text-mint">Marcar tudo como lido</button>}
            <Link href="/avisos" className="text-xs text-fog hover:text-mint">Ver todos</Link>
          </div>
        </div>
        {lista}
        {limite && daAba.length > limite && <Link href="/avisos" className="inline-block mt-3 text-sm text-mint hover:underline">Mais {daAba.length - limite} aviso{daAba.length - limite === 1 ? "" : "s"}</Link>}
      </>
    );
  }

  // ── página Avisos ──
  return (
    <>
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 rise">
        <div>
          <p className={`${kicker} text-mint`}>Seu dia · Avisos</p>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mt-2">Avisos</h1>
          <p className="mt-3 text-[15px] md:text-base">
            {abertos.length ? (
              <>
                <span>{abertos.length} pedindo atenção</span>
                {urgentes > 0 && <><span className="text-fog"> · </span><span className="text-danger">{urgentes} urgente{urgentes === 1 ? "" : "s"}</span></>}
                {nAdiados > 0 && <><span className="text-fog"> · </span><span className="text-fog">{nAdiados} adiado{nAdiados === 1 ? "" : "s"}</span></>}
              </>
            ) : <span className="text-fog">Tudo em dia. Nenhum aviso pedindo atenção.</span>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/conta#notificacoes" className="btn btn-ghost"><I.bell className="w-4 h-4" />Notificações no celular</Link>
          {abertos.length > 0 && <button onClick={() => lidas(abertos.map((x) => x.id))} className="btn btn-mint">Marcar tudo como lido</button>}
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <nav className="flex gap-1 bg-panel border border-line rounded-xl p-1 shrink-0">
          {([["abertos", "Não lidos", abertos.length], ["adiados", "Adiados", nAdiados], ["lidos", "Lidos", null]] as const).map(([k, l, n]) => (
            <button key={k} onClick={() => { setAba(k); setCat("todas"); }}
              className={`px-3 py-1.5 rounded-[9px] text-sm font-semibold transition-colors ${aba === k ? "bg-mint text-[var(--color-on-mint,#06140e)]" : "text-fog hover:text-paper hover:bg-panel2"}`}>
              {l}{n ? <span className="ml-1.5 font-mono text-[11px] opacity-80">{n}</span> : null}
            </button>
          ))}
        </nav>
        {daAba.length > 0 && <div className="min-w-0">{chips}</div>}
      </div>

      {lista}
      {aba === "lidos" && visiveis.length > 0 && <p className="text-xs text-fog mt-4">Avisos lidos ficam aqui por 30 dias.</p>}
    </>
  );
}

function Chip({ ativo, onClick, label, n }: { ativo: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button type="button" onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${ativo ? "border-mint/60 bg-mint/10 text-mint" : "border-line text-fog hover:text-paper hover:border-fog/50"}`}>
      {label}<span className="font-mono text-[10px] opacity-80">{n}</span>
    </button>
  );
}

function Vazio({ aba, filtrado, compacto }: { aba: Aba; filtrado: boolean; compacto: boolean }) {
  const t = filtrado ? "Nada nesta categoria." : aba === "adiados" ? "Nenhum aviso adiado." : aba === "lidos" ? "Nenhum aviso lido nos últimos 30 dias." : "Tudo em dia. Nenhum aviso pedindo atenção.";
  return (
    <div className={`flex flex-col items-center text-center ${compacto ? "py-6" : "card py-14"}`}>
      <span className="w-10 h-10 rounded-xl bg-mint/10 text-mint grid place-items-center mb-3"><A.check className="w-5 h-5" /></span>
      <p className="text-sm text-fog">{t}</p>
    </div>
  );
}

type Acoes = {
  lidas: (ids: string[]) => Promise<void>; naoLida: (id: string) => Promise<void>; adiar: (id: string, ate: string | null) => Promise<void>;
  concluir: (n: Nota) => Promise<void>; amanha: (n: Nota) => Promise<void>; recebido: (n: Nota) => Promise<void>;
};

function Item({ n, aba, acoes, grande, aoNavegar }: { n: Nota; aba: Aba; acoes: Acoes; grande?: boolean; aoNavegar?: () => void }) {
  const m = meta(n);
  const Icone = ICONE[m.cat];
  const [menu, setMenu] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const rodar = (f: () => Promise<void>) => async () => { setOcupado(true); try { await f(); } finally { setOcupado(false); } };
  const tarefa = n.source_type === "task" && !!n.source_id && ["tarefa_atrasada", "tarefa_hoje", "lembrete"].includes(n.kind);
  const cobranca = n.source_type === "transaction" && n.kind === "cobranca_vencida" && !!n.source_id;
  const btn = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50";
  const ghost = `${btn} text-fog hover:text-paper hover:bg-panel2`;
  const lido = !!n.read_at;

  return (
    <li className={`group relative flex gap-3 rounded-xl px-2 ${grande ? "py-3" : "py-2.5"} hover:bg-panel2/60 transition-colors ${lido ? "opacity-70" : ""}`}>
      <span className={`shrink-0 grid place-items-center rounded-[10px] ${grande ? "w-9 h-9" : "w-8 h-8"} ${TOM_CLS[m.tom]}`}><Icone className="w-4 h-4" /></span>
      <div className="flex-1 min-w-0">
        <Link href={n.href || "/"} onClick={() => { if (!lido) acoes.lidas([n.id]); aoNavegar?.(); }} className={`block ${grande ? "text-[15px]" : "text-sm"} leading-snug hover:text-mint ${grande ? "" : "line-clamp-2"}`}>
          {m.titulo}
        </Link>
        <p className="mt-0.5 text-[11px] text-fog flex flex-wrap items-center gap-x-1.5">
          <span className={m.tom === "danger" ? "text-danger" : m.tom === "warn" ? "text-[#f5c84c]" : ""}>{m.label}</span>
          <span>·</span><span>{ha(n.created_at)}</span>
          {aba === "adiados" && n.snoozed_until && <><span>·</span><span>volta {new Date(n.snoozed_until).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</span></>}
        </p>

        {menu ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-fog mr-1">Lembrar em</span>
            {opcoesAdiar().map((o) => <button key={o.label} disabled={ocupado} onClick={rodar(async () => { await acoes.adiar(n.id, o.ate); setMenu(false); })} className={`${btn} border border-line text-paper hover:border-mint hover:text-mint`}>{o.label}</button>)}
            <button onClick={() => setMenu(false)} className={ghost}>Cancelar</button>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-1 -ml-2">
            {aba === "lidos" ? (
              <button disabled={ocupado} onClick={rodar(() => acoes.naoLida(n.id))} className={ghost}>Marcar como não lido</button>
            ) : (
              <>
                {tarefa && <button disabled={ocupado} onClick={rodar(() => acoes.concluir(n))} className={`${btn} text-mint hover:bg-mint/10`}><A.check className="w-3.5 h-3.5" />Concluir</button>}
                {tarefa && n.kind !== "lembrete" && <button disabled={ocupado} onClick={rodar(() => acoes.amanha(n))} className={ghost}>{grande ? "Passar para amanhã" : "Amanhã"}</button>}
                {cobranca && (confirma
                  ? <button disabled={ocupado} onClick={rodar(() => acoes.recebido(n))} className={`${btn} bg-mint text-[var(--color-on-mint,#06140e)]`}>Confirmar recebido</button>
                  : <button onClick={() => { setConfirma(true); setTimeout(() => setConfirma(false), 4000); }} className={`${btn} text-mint hover:bg-mint/10`}><A.money className="w-3.5 h-3.5" />Marcar recebido</button>)}
                {aba === "adiados"
                  ? <button disabled={ocupado} onClick={rodar(() => acoes.adiar(n.id, null))} className={ghost}>Trazer de volta</button>
                  : <button onClick={() => setMenu(true)} className={ghost}><A.clock className="w-3.5 h-3.5" />Adiar</button>}
                <button disabled={ocupado} onClick={rodar(() => acoes.lidas([n.id]))} className={ghost} title="Marcar como lido">{grande ? "Marcar como lido" : "Lido"}</button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
