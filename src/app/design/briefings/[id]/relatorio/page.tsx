"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadFonts } from "@/lib/design";
import { CORES, ESTILOS, ESTILO_FONTS, ETAPAS, LETRAS, TIPOS_LOGO, TRACOS, answerText, arqMix, blank, filledCount, totalCount, type Paleta, type RefImg } from "@/lib/briefing-cliente";
import type { Briefing } from "@/components/design/briefing/acoes";

/* Relatório do briefing: resumo editorial para ler, mandar ou salvar em PDF,
   com o formulário completo no fim. ?v=<n> mostra uma versão do histórico. */

const SERIF = { fontFamily: '"Bodoni Moda", Georgia, serif' };
const fog = "#8a847a";
const Q = Object.fromEntries(ETAPAS.flatMap((e) => e.qs).map((q) => [q.k, q]));
const txt = (a: any, k: string) => (Q[k] ? answerText(Q[k], a[k]) : "");
const CONFIRMAR = ["marca_nome", "oque", "pub_quem", "dor", "diferente", "arq", "palavras", "nao_quer", "estilos", "tipo_logo", "cores_gosta", "letras", "prazo", "contato"];

export default function RelatorioBriefing() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<Briefing | null>(null);
  const [v, setV] = useState<number | null>(null);
  const [completo, setCompleto] = useState(true);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    loadFonts(["Bodoni Moda", ...ESTILO_FONTS]);
    const n = new URLSearchParams(window.location.search).get("v");
    if (n != null && n !== "") setV(+n);
    createClient().from("design_briefings").select("*").eq("id", id).single().then(({ data }) => { if (!data) router.replace("/design/briefings"); else setB(data as any); });
    document.documentElement.classList.add("print-relatorio");
    setPronto(true);
    return () => document.documentElement.classList.remove("print-relatorio");
  }, [id]); // eslint-disable-line

  if (!pronto) return null;
  const versao = b && v != null ? (b.versoes || [])[v] : null;
  const a: any = (versao ? versao.answers : b?.answers) || {};
  const quando = versao?.at || a._editado_em || b?.answered_at;
  const mix = arqMix(a.arq);
  const tr = mix[0] ? TRACOS[mix[0].a.k] : null;
  const refs: RefImg[] = a.refs || [];
  const faltam = CONFIRMAR.filter((k) => blank(a[k])).map((k) => Q[k]?.l).filter(Boolean);
  const cor = (n: string) => CORES.find((c) => c.n === n)?.h;
  const S = ({ t, children, alerta }: { t: string; children: React.ReactNode; alerta?: boolean }) => (
    <section className="py-7 border-t border-[#d9d4cb] break-inside-avoid [counter-increment:sec]">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-[13px] tabular-nums before:content-[counter(sec,decimal-leading-zero)]" style={{ color: alerta ? "#9b2c1f" : fog }} />
        <h2 className="text-[26px] md:text-[30px] leading-tight" style={{ ...SERIF, color: alerta ? "#9b2c1f" : undefined }}>{t}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
  const F = ({ l, children }: { l: string; children: React.ReactNode }) => (
    <div><p className="text-[11px] tracking-[.16em] uppercase" style={{ color: fog }}>{l}</p><div className="text-[15px] leading-relaxed mt-1 whitespace-pre-wrap">{children}</div></div>
  );
  const T = ({ l, k }: { l: string; k: string }) => { const t = txt(a, k); return t ? <F l={l}>{t}</F> : null; };
  const Chips = ({ xs }: { xs?: string[] }) => <div className="flex flex-wrap gap-1.5">{(xs || []).map((x) => <span key={x} className="px-3 py-1 rounded-full bg-[#ece6dc] text-[13px]">{x}</span>)}</div>;

  const pagina = !b ? <div className="min-h-full grid place-items-center" style={{ color: fog }}>Carregando…</div> : (
    <>
      <div className="relatorio-noprint sticky top-0 z-10 bg-[#f4f2ee]/90 backdrop-blur border-b border-[#e2ddd4]">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href={`/design/briefings/${id}`} className="text-[14px] underline underline-offset-4 text-[#4a463f]">← Voltar</Link>
          <label className="ml-auto flex items-center gap-2 text-[13px] text-[#4a463f]"><input type="checkbox" checked={completo} onChange={(e) => setCompleto(e.target.checked)} className="accent-[#151515]" />Com o formulário</label>
          <button onClick={() => window.print()} className="bg-[#151515] text-[#f4f2ee] rounded-full px-4 py-2 text-[14px] whitespace-nowrap">Salvar PDF</button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 pt-10 pb-24 print:pt-0 print:pb-0 [counter-reset:sec]">
        <header className="pb-8">
          <div className="flex items-center justify-between">
            <img src="/vincit-logo-escuro.svg" alt="VINCIT" className="h-5 w-auto" />
            <span className="text-[11px] tracking-[.22em] uppercase" style={{ color: fog }}>Relatório do briefing</span>
          </div>
          <p className="text-[12px] tracking-[.18em] uppercase mt-12" style={{ color: fog }}>{b.client_name ? `Cliente · ${b.client_name}` : "Briefing de marca"}</p>
          <h1 className="text-[52px] md:text-[76px] leading-[.98] mt-3" style={SERIF}>{a.marca_nome || b.title}</h1>
          {a.oque && <p className="text-[18px] text-[#4a463f] mt-5 leading-relaxed max-w-2xl">{a.oque}</p>}
          <p className="text-[13px] mt-6" style={{ color: fog }}>
            {quando ? `Respostas de ${new Date(quando).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}` : "Sem resposta"}
            {b.respondent ? ` · por ${b.respondent}` : ""} · {filledCount(a)} de {totalCount} perguntas
            {versao ? ` · versão do histórico (${versao.motivo || "anterior"})` : ""}
          </p>
        </header>

        {(a.nao_quer || a.nao_palavras?.length || a.cores_evita?.length || refs.some((r) => r.tipo === "evitar") || a.nome_extra) && (
          <S t="O que não pode acontecer" alerta>
            {a.nao_quer && <p className="text-[19px] leading-snug border-l-2 border-[#9b2c1f] pl-4" style={SERIF}>{a.nao_quer}</p>}
            {a.nome_extra && <F l="Não entra no logo">{a.nome_extra}</F>}
            {!!a.nao_palavras?.length && <F l="Não pode parecer"><Chips xs={a.nao_palavras} /></F>}
            {!!a.cores_evita?.length && <F l="Cores que não quer">{a.cores_evita.join(", ")}</F>}
            {refs.filter((r) => r.tipo === "evitar" && r.note).map((r) => <F key={r.id} l="Referência que não gosta">{r.note}</F>)}
            <T l="Marca ou logo anterior" k="antes" />
          </S>
        )}

        <S t="O negócio">
          <T l="Momento" k="momento" />
          {!!a.servicos?.length && <F l="Produtos e serviços"><Chips xs={a.servicos} /></F>}
          <T l="Como começou" k="historia" />
          <T l="Do que se orgulha" k="orgulho" />
          <T l="Daqui a 5 anos" k="futuro" />
          <T l="Instagram ou site" k="instagram" />
        </S>

        <S t="Para quem">
          <div className="grid sm:grid-cols-2 gap-4">
            <T l="Quem atende" k="pub_quem" />
            <T l="Idade" k="pub_idade" />
            <T l="Quanto investe" k="pub_bolso" />
            <T l="Por onde chega" k="canais" />
          </div>
          {!!a.pub_gostos?.length && <F l="Do que gosta"><Chips xs={a.pub_gostos} /></F>}
          <T l="Sobre essa pessoa" k="cliente" />
          <T l="O que procura" k="dor" />
          {!!a.sentir?.length && <F l="Como deve se sentir"><Chips xs={a.sentir} /></F>}
        </S>

        {(a.concorrentes?.length || a.diferente || a.admira) && (
          <S t="Mercado">
            {!!a.concorrentes?.length && <F l="Parecidos"><Chips xs={a.concorrentes} /></F>}
            <T l="O que faz diferente" k="diferente" />
            <T l="Marcas que admira" k="admira" />
          </S>
        )}

        <S t="Personalidade">
          {!!mix.length && (
            <div className="grid sm:grid-cols-[1fr_1.2fr] gap-6">
              <div>
                <p className="text-[34px] leading-tight" style={SERIF}>{mix[0].a.l}</p>
                <p className="text-[14px] text-[#4a463f] mt-1">{mix[0].a.d}</p>
                <div className="mt-4 space-y-2">{mix.map((m) => (
                  <div key={m.a.k}><div className="flex justify-between text-[13px]"><span>{m.a.l}</span><span className="tabular-nums">{m.pct}%</span></div>
                    <div className="h-1.5 rounded-full bg-[#e2ddd4] overflow-hidden print-exact"><div className="h-full bg-[#151515]" style={{ width: `${m.pct}%` }} /></div></div>
                ))}</div>
              </div>
              {tr && <div>
                <F l="Jeito de ser"><Chips xs={tr.jeito} /></F>
                <ul className="mt-3 space-y-1">{tr.seVe.map((x) => <li key={x} className="text-[14px] text-[#3a3733]">— {x}</li>)}</ul>
                <p className="text-[17px] italic mt-3" style={SERIF}>{tr.fala}</p>
              </div>}
            </div>
          )}
          {!!a.palavras?.length && <F l="Precisa transmitir"><Chips xs={a.palavras} /></F>}
          <T l="Tom" k="eixos" />
          <T l="Se fosse uma pessoa" k="pessoa" />
          <T l="Se fosse um lugar" k="lugar" />
        </S>

        <S t="Visual">
          {!!a.estilos?.length && (
            <F l="Estilos que marcou">
              <div className="flex flex-wrap gap-2 mt-1">{a.estilos.map((k: string) => { const e = ESTILOS.find((x) => x.k === k); if (!e) return null; return (
                <div key={k} className="w-36 rounded-xl overflow-hidden border border-[#d9d4cb] print-exact"><div className="h-14 px-3 pt-2" style={{ background: e.bg, color: e.fg }}><span style={{ fontFamily: `"${e.font}"`, fontWeight: e.w, fontStyle: e.it ? "italic" : "normal", textTransform: e.up ? "uppercase" : "none", fontSize: 20 }}>{a.marca_nome?.split(" ")[0] || "Marca"}</span></div><p className="text-[11px] px-3 py-1.5">{e.l}</p></div>
              ); })}</div>
            </F>
          )}
          {!!a.tipo_logo?.length && <F l="Logo que imagina">{a.tipo_logo.map((k: string) => TIPOS_LOGO.find((x) => x.k === k)?.l).filter(Boolean).join(", ")}</F>}
          {!!a.cores_gosta?.length && <F l="Cores que gosta"><div className="flex flex-wrap gap-2 mt-1">{a.cores_gosta.map((n: string) => <span key={n} className="flex items-center gap-1.5 text-[13px]"><span className="w-5 h-5 rounded-full border border-black/10 print-exact" style={{ background: cor(n) }} />{n}</span>)}</div></F>}
          {!!a.paletas?.length && <F l="Paletas que montou"><div className="grid sm:grid-cols-3 gap-2 mt-1">{(a.paletas as Paleta[]).map((p, i) => <div key={i} className="flex h-12 rounded-lg overflow-hidden border border-black/10 print-exact">{p.cores.map((c, j) => <span key={j} className="flex-1 flex items-end p-1 text-[9px] uppercase" style={{ background: c }}>{c.slice(1)}</span>)}</div>)}</div></F>}
          {!!a.letras?.length && <F l="Tipos de letra"><div className="grid sm:grid-cols-2 gap-2 mt-1">{(a.letras as string[]).map((k) => { const c = LETRAS.find((x) => x.k === k); if (!c) return null; return (
            <div key={k} className="rounded-xl border border-[#d9d4cb] p-3"><p className="text-[24px] truncate" style={{ fontFamily: `"${c.ex}"`, fontWeight: c.w || 400, fontStyle: c.it ? "italic" : "normal" }}>{a.marca_nome || "Marca"}</p><p className="text-[12px] mt-1" style={{ color: fog }}>{c.l} · {c.sente}</p></div>
          ); })}</div></F>}
          <T l="Jeito da letra" k="letra_eixos" />
          <T l="Onde a marca vai aparecer" k="onde" />
        </S>

        {(refs.length > 0 || a.links?.length) && (
          <S t="Referências">
            {refs.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{refs.map((r) => (
              <figure key={r.id} className="break-inside-avoid">
                <img src={r.img} alt="" className={`w-full aspect-square object-cover rounded-lg border-2 ${r.tipo === "evitar" ? "border-[#9b2c1f]" : "border-transparent"}`} />
                <figcaption className="text-[11px] mt-1 leading-tight"><b style={{ color: r.tipo === "evitar" ? "#9b2c1f" : undefined }}>{r.tipo === "evitar" ? "Não gosta" : "Gosta"}</b>{r.note ? ` · ${r.note}` : ""}</figcaption>
              </figure>
            ))}</div>}
            {!!a.links?.length && <F l="Links">{a.links.map((u: string) => <a key={u} href={u} target="_blank" rel="noreferrer" className="block underline truncate">{u}</a>)}</F>}
          </S>
        )}

        <S t="Próximos passos">
          <div className="grid sm:grid-cols-2 gap-4">
            <T l="Datas importantes" k="prazo" />
            <T l="Contato" k="contato" />
          </div>
          <T l="Algo mais" k="extra" />
          {b.notes && <F l="Notas da equipe">{b.notes}</F>}
          {faltam.length > 0 && <F l="Confirmar com o cliente (sem resposta)"><ul className="space-y-0.5">{faltam.map((l) => <li key={l}>— {l}</li>)}</ul></F>}
        </S>

        {completo && (
          <section className="pt-10 border-t-2 border-[#151515] print:break-before-page">
            <p className="text-[11px] tracking-[.22em] uppercase" style={{ color: fog }}>Anexo</p>
            <h2 className="text-[34px] leading-tight mt-2" style={SERIF}>Formulário completo</h2>
            <div className="mt-6 space-y-8">
              {ETAPAS.map((e, ei) => {
                const rows = e.qs.filter((q) => q.type !== "imagens").map((q) => ({ q, t: answerText(q, a[q.k]) }));
                return (
                  <div key={e.k} className="break-inside-avoid">
                    <p className="text-[20px]" style={SERIF}><span className="mr-2" style={{ color: fog }}>{String(ei + 1).padStart(2, "0")}</span>{e.t}</p>
                    <dl className="mt-3 space-y-3">{rows.map(({ q, t }) => (
                      <div key={q.k}><dt className="text-[12.5px]" style={{ color: fog }}>{q.l}</dt><dd className="text-[15px] mt-0.5 whitespace-pre-wrap">{t || <span className="text-[#b5afa5]">Sem resposta</span>}</dd></div>
                    ))}</dl>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <p className="mt-14 pt-5 border-t border-[#d9d4cb] text-[12px]" style={{ color: fog }}>VINCIT · identidade de marca</p>
      </main>
    </>
  );

  return createPortal(
    <div className="relatorio-root fixed inset-0 z-[60] overflow-y-auto bg-[#f4f2ee] text-[#151515]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{pagina}</div>,
    document.body,
  );
}
