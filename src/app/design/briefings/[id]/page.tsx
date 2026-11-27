"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { CORES, ESTILOS, ESTILO_FONTS, ETAPAS, TIPOS_LOGO, answerText, answersText, blank, filledCount, totalCount, type RefImg } from "@/lib/briefing-cliente";
import { loadFonts } from "@/lib/design";
import { STATUS, briefingUrl, criarProjeto, whatsLink, type Briefing } from "@/components/design/briefing/acoes";

export default function BriefingDetalhe() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<Briefing | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useRef<any>(null);

  useEffect(() => {
    loadFonts(ESTILO_FONTS);
    createClient().from("design_briefings").select("*").eq("id", id).single().then(({ data }) => { if (!data) router.replace("/design/briefings"); else setB(data as any); });
  }, [id]); // eslint-disable-line

  const save = (patch: Partial<Briefing>, wait = 0) => {
    setB((o) => (o ? { ...o, ...patch } : o));
    clearTimeout(t.current);
    t.current = setTimeout(() => createClient().from("design_briefings").update(patch).eq("id", id).then(), wait);
  };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2200); };

  if (!b) return <div className="card h-96 animate-pulse" />;
  const a = b.answers || {};
  const has = !blank(a) && !!b.answered_at;
  const url = briefingUrl(b.token);

  async function projeto() {
    if (!b) return;
    setBusy(true);
    const pid = await criarProjeto(b);
    if (pid) router.push(`/design/marcas/${pid}`); else { setBusy(false); flash("Não deu para criar o projeto. Tente de novo."); }
  }
  async function excluir() {
    if (!b || b.status === "projeto") return;
    await createClient().from("design_briefings").delete().eq("id", b.id);
    router.push("/design/briefings");
  }

  const refs: RefImg[] = a.refs || [];
  const coresDe = (k: string) => (a[k] || []).map((n: string) => ({ n, h: CORES.find((c) => c.n === n)?.h }));

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/design/briefings" className="btn btn-ghost btn-sm"><I.back className="w-3.5 h-3.5" />Briefings</Link>
        <span className={`chip ${STATUS[b.status].c}`}>{STATUS[b.status].l}</span>
        {msg && <span className="text-xs text-mint ml-auto">{msg}</span>}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 rise">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-mint tracking-widest uppercase">Briefing de marca{b.client_name ? ` · ${b.client_name}` : ""}</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-1 truncate">{a.marca_nome || b.title}</h1>
          <p className="text-fog mt-1.5 text-sm">{has ? `Respondido por ${b.respondent || "cliente"} em ${new Date(b.answered_at!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · ${filledCount(a)} de ${totalCount} perguntas` : "Ainda sem resposta. Mande o link para o cliente."}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {b.status === "respondido" && <button onClick={projeto} disabled={busy} className="btn btn-mint"><I.shapes className="w-4 h-4" />{busy ? "Criando…" : "Criar projeto de marca"}</button>}
          {b.status === "projeto" && b.brand_id && <Link href={`/design/marcas/${b.brand_id}`} className="btn btn-mint">Abrir projeto<I.arrow className="w-4 h-4" /></Link>}
          {has && <button onClick={async () => { await navigator.clipboard.writeText(`Briefing de marca · ${a.marca_nome || b.title}\n\n${answersText(a)}${b.notes ? `\n\n## Minhas notas\n${b.notes}` : ""}`); flash("Briefing copiado em texto"); }} className="btn btn-ghost"><I.copy className="w-4 h-4" />Copiar para o Claude</button>}
        </div>
      </div>

      <section className="card p-4 mb-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fog mb-1">Link do cliente (sem login)</p>
          <p className="font-mono text-sm truncate">{url}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={async () => { await navigator.clipboard.writeText(url); flash("Link copiado"); }} className="btn btn-ghost btn-sm"><I.copy className="w-3.5 h-3.5" />Copiar</button>
          <a href={whatsLink(b)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Mandar no WhatsApp ↗</a>
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Ver como o cliente ↗</a>
        </div>
      </section>

      {!has ? (
        <section className="card p-5">
          <label className="label">Mensagem de abertura que o cliente vê</label>
          <textarea value={b.intro || ""} onChange={(e) => save({ intro: e.target.value }, 700)} rows={3} className="input" placeholder="Em branco, entra o texto padrão." />
          <p className="text-xs text-fog mt-3">Quando o cliente enviar, você recebe um aviso no sino e o briefing aparece em Criação de marca, em Solicitações recebidas.</p>
          <button onClick={excluir} className="btn btn-ghost btn-sm mt-4 text-fog hover:!text-danger"><I.trash className="w-3.5 h-3.5" />Excluir briefing</button>
        </section>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="space-y-5">
            {/* leitura rápida: o que não pode ser mal interpretado */}
            <section className="card p-5 rise">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-4">Leitura rápida</p>
              {a.nao_quer && (
                <div className="border-l-2 border-danger pl-4 mb-5">
                  <p className="text-[11px] uppercase tracking-widest text-danger font-semibold">Não quer de jeito nenhum</p>
                  <p className="text-[15px] mt-1 whitespace-pre-wrap">{a.nao_quer}</p>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-5">
                <div><p className="label">Nome no logo</p><p className="font-display text-2xl font-bold">{a.marca_nome || "—"}</p>{a.nome_extra && <p className="text-xs text-fog mt-1">Fora do logo: {a.nome_extra}</p>}</div>
                <div><p className="label">Precisa transmitir</p><div className="flex flex-wrap gap-1.5">{(a.palavras || []).map((w: string) => <span key={w} className="chip chip-mint">{w}</span>)}</div>
                  {!!a.nao_palavras?.length && <><p className="label mt-3">Não pode parecer</p><div className="flex flex-wrap gap-1.5">{a.nao_palavras.map((w: string) => <span key={w} className="chip text-danger border-danger/40">{w}</span>)}</div></>}
                </div>
                {!!a.tipo_logo?.length && <div><p className="label">Logo que imagina</p><p className="text-sm">{a.tipo_logo.map((k: string) => TIPOS_LOGO.find((x) => x.k === k)?.l).join(", ")}</p></div>}
                {(!!a.cores_gosta?.length || !!a.cores_evita?.length) && (
                  <div>
                    <p className="label">Cores</p>
                    <div className="flex flex-wrap gap-1.5">{coresDe("cores_gosta").map((c: any) => <span key={c.n} className="chip"><span className="w-3 h-3 rounded-full border border-white/20" style={{ background: c.h || "transparent" }} />{c.n}</span>)}</div>
                    {!!a.cores_evita?.length && <div className="flex flex-wrap gap-1.5 mt-2">{coresDe("cores_evita").map((c: any) => <span key={c.n} className="chip line-through decoration-danger"><span className="w-3 h-3 rounded-full border border-white/20" style={{ background: c.h || "transparent" }} />{c.n}</span>)}</div>}
                  </div>
                )}
              </div>
              {!!a.estilos?.length && (
                <div className="mt-5">
                  <p className="label">Estilos que marcou</p>
                  <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
                    {a.estilos.map((k: string) => { const e = ESTILOS.find((x) => x.k === k); if (!e) return null; return (
                      <div key={k} className="shrink-0 w-32 rounded-xl overflow-hidden border border-line">
                        <div className="h-14 px-2.5 pt-2" style={{ background: e.bg, color: e.fg }}><span style={{ fontFamily: `"${e.font}"`, fontWeight: e.w, fontStyle: e.it ? "italic" : "normal", textTransform: e.up ? "uppercase" : "none", fontSize: 20 }}>Marca</span></div>
                        <p className="text-[11px] px-2.5 py-1.5">{e.l}</p>
                      </div>
                    ); })}
                  </div>
                </div>
              )}
            </section>

            {!!refs.length && (
              <section className="card p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-4">Referências do cliente · {refs.filter((r) => r.tipo === "gosto").length} gosta · {refs.filter((r) => r.tipo === "evitar").length} não gosta</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {refs.map((r) => (
                    <figure key={r.id} className={`rounded-xl overflow-hidden border ${r.tipo === "evitar" ? "border-danger/60" : "border-line"}`}>
                      <img src={r.img} alt="" className="w-full aspect-square object-cover" />
                      <figcaption className="px-2.5 py-2 text-xs"><span className={r.tipo === "evitar" ? "text-danger font-semibold" : "text-mint font-semibold"}>{r.tipo === "evitar" ? "Não gosta" : "Gosta"}</span>{r.note && <span className="text-fog"> · {r.note}</span>}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {ETAPAS.map((e, i) => {
              const rows = e.qs.filter((q) => q.type !== "imagens").map((q) => ({ q, t: answerText(q, a[q.k]) })).filter((r) => r.t);
              if (!rows.length) return null;
              return (
                <section key={e.k} className="card p-5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-4">0{i + 1} · {e.t}</p>
                  <dl className="space-y-4">{rows.map(({ q, t: txt }) => (
                    <div key={q.k}><dt className="text-xs text-fog">{q.l}</dt><dd className="text-[15px] mt-1 whitespace-pre-wrap">{q.type === "chips" && q.k === "links" ? (a.links || []).map((u: string) => <a key={u} href={u} target="_blank" rel="noreferrer" className="block text-mint underline truncate">{u}</a>) : txt}</dd></div>
                  ))}</dl>
                </section>
              );
            })}
          </div>

          <aside className="card p-5 lg:sticky lg:top-24 space-y-4">
            <div>
              <p className="font-semibold text-sm">Suas notas</p>
              <p className="text-xs text-fog mt-0.5 mb-2">Complete o que faltou, o que você percebeu na conversa e o que precisa confirmar com o cliente. Vai junto para o projeto.</p>
              <textarea value={b.notes || ""} onChange={(e) => save({ notes: e.target.value }, 700)} rows={8} className="input" placeholder="Ex.: confirmar se “AG Skin” entra com S maiúsculo. Ela fala muito de esporte: explorar comunidade." />
            </div>
            {b.status === "respondido" && <button onClick={projeto} disabled={busy} className="btn btn-mint w-full"><I.shapes className="w-4 h-4" />{busy ? "Criando…" : "Criar projeto de marca"}</button>}
            <p className="text-[11px] text-fog">O projeto já nasce com nome, o que faz, público, concorrentes, palavras, tipo de logo, cores, o que evitar, personalidade e as referências. Você segue pela Estratégia.</p>
            <div className="pt-3 border-t border-line flex flex-wrap gap-2">
              {b.status !== "projeto" && <button onClick={() => save({ status: "aberto" })} className="btn btn-ghost btn-sm" title="O cliente pode reenviar pelo mesmo link">Reabrir para o cliente</button>}
              {b.status !== "arquivado" ? <button onClick={() => save({ status: "arquivado" })} className="btn btn-ghost btn-sm">Arquivar</button>
                : <button onClick={() => save({ status: b.brand_id ? "projeto" : "respondido" })} className="btn btn-ghost btn-sm">Desarquivar</button>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
