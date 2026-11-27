"use client";
/* eslint-disable @next/next/no-img-element */
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadFonts } from "@/lib/design";
import { ETAPAS, ESTILO_FONTS, answerText, blank, type RefImg } from "@/lib/briefing-cliente";
import Pergunta from "@/components/design/briefing/Pergunta";

/* Briefing de marca que o cliente responde sem login. Tema claro editorial, celular primeiro.
   O rascunho fica salvo no aparelho; ao enviar, chega na Criação de marca como solicitação. */

const SERIF = { fontFamily: '"Bodoni Moda", Georgia, serif' };

export default function BriefingPublico() {
  const { token } = useParams<{ token: string }>();
  const [b, setB] = useState<any>(undefined);
  const [a, setA] = useState<any>({});
  const [i, setI] = useState(-1); // -1 = abertura, ETAPAS.length = revisão
  const [miss, setMiss] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const key = `vincit-briefing:${token}`;

  useEffect(() => {
    loadFonts(["Bodoni Moda", ...ESTILO_FONTS]);
    createClient().rpc("pub_get_briefing", { p_token: token }).then(({ data }) => {
      setB(data || null);
      let draft: any = null;
      try { draft = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
      setA(draft || data?.answers || {});
    });
  }, [token]); // eslint-disable-line
  useEffect(() => { if (b && !blank(a)) { try { localStorage.setItem(key, JSON.stringify(a)); } catch {} } }, [a, b, key]);

  const go = (n: number) => { setI(n); setMiss([]); setTimeout(() => document.getElementById("briefing-shell")?.scrollTo({ top: 0, behavior: "smooth" }), 10); };
  const etapa = ETAPAS[i];
  function next() {
    if (etapa) {
      const m = etapa.qs.filter((q) => q.req && blank(a[q.k])).map((q) => q.k);
      if (m.length) { setMiss(m); document.getElementById(`q-${m[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    }
    go(i + 1);
  }
  async function enviar() {
    setBusy(true); setErr("");
    const { data, error } = await createClient().rpc("pub_submit_briefing", { p_token: token, p_answers: a, p_name: a.seu_nome || "" });
    setBusy(false);
    if (error || !data) { setErr("Não conseguimos enviar agora. Confira a internet e tente de novo; suas respostas continuam salvas aqui."); return; }
    try { localStorage.removeItem(key); } catch {}
    setSent(true); document.getElementById("briefing-shell")?.scrollTo({ top: 0 });
  }

  const pct = useMemo(() => Math.round(((i + 1) / (ETAPAS.length + 1)) * 100), [i]);
  const shell = (children: React.ReactNode) => (
    <div id="briefing-shell" className="fixed inset-0 overflow-y-auto bg-[#f4f2ee] text-[#151515] z-10" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{children}</div>
  );

  if (b === undefined) return shell(<div className="min-h-full grid place-items-center text-[#8a847a]">Carregando…</div>);
  if (!b) return shell(<div className="min-h-full grid place-items-center px-6 text-center"><div><p className="text-[28px]" style={SERIF}>Link não encontrado</p><p className="text-[#7a746a] mt-2">Peça um link novo para quem te enviou.</p></div></div>);
  if (b.status === "projeto" && !sent) return shell(<div className="min-h-full grid place-items-center px-6 text-center"><div className="max-w-md"><p className="text-[34px] leading-tight" style={SERIF}>Briefing recebido</p><p className="text-[#7a746a] mt-3">Suas respostas já viraram o projeto da marca. Se quiser mudar algo, fale direto com a gente.</p></div></div>);

  const quem = b.company || "VINCIT";
  const Head = (
    <header className="sticky top-0 z-20 bg-[#f4f2ee]/90 backdrop-blur border-b border-[#e2ddd4]">
      <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
        <img src="/vincit-logo-escuro.svg" alt="VINCIT" className="h-5 w-auto" />
        <span className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">Briefing de marca</span>
      </div>
      {i >= 0 && !sent && <div className="h-[2px] bg-[#e2ddd4]"><div className="h-full bg-[#151515] transition-all duration-500" style={{ width: `${pct}%` }} /></div>}
    </header>
  );

  if (sent) return shell(<>
    {Head}
    <main className="max-w-2xl mx-auto px-5 py-16 md:py-24">
      <p className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">Recebido</p>
      <h1 className="text-[44px] md:text-[64px] leading-[1.02] mt-3" style={SERIF}>Obrigado{a.seu_nome ? `, ${String(a.seu_nome).split(" ")[0]}` : ""}.</h1>
      <p className="text-[17px] text-[#4a463f] mt-6 leading-relaxed max-w-lg">Suas respostas chegaram. Agora a gente lê tudo com calma, estuda o seu mercado e volta com os próximos passos. Se lembrar de algo, é só abrir este link de novo e reenviar.</p>
      <div className="mt-12 border-t border-[#d9d4cb] pt-5 text-[13px] text-[#8a847a]">{quem} · identidade de marca</div>
    </main>
  </>);

  if (i === -1) return shell(<>
    {Head}
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 md:pt-24">
      <p className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">{b.client_name ? `Para ${b.client_name}` : "Para você"}</p>
      <h1 className="text-[46px] md:text-[76px] leading-[.98] mt-4 tracking-[-.01em]" style={SERIF}>Vamos começar<br /><i>pela sua história.</i></h1>
      <p className="text-[17px] text-[#4a463f] mt-7 leading-relaxed max-w-lg whitespace-pre-wrap">{b.intro || "Antes de desenhar qualquer coisa, a gente precisa te conhecer: o que você faz, para quem, o que você ama e o que não quer ver de jeito nenhum. Responda do seu jeito, sem termos técnicos."}</p>
      <div className="mt-10 grid grid-cols-3 border-y border-[#d9d4cb] divide-x divide-[#d9d4cb] text-center">
        {[[String(ETAPAS.length), "etapas curtas"], ["15", "minutos, mais ou menos"], ["0", "termos técnicos"]].map(([n, l]) => <div key={l} className="py-5 px-2"><p className="text-[34px] leading-none" style={SERIF}>{n}</p><p className="text-[12px] text-[#8a847a] mt-2 leading-tight">{l}</p></div>)}
      </div>
      <p className="text-[13px] text-[#8a847a] mt-5">Suas respostas ficam salvas neste aparelho enquanto você preenche. Pode parar e voltar depois pelo mesmo link.</p>
      {b.status === "respondido" && <p className="text-[14px] mt-4 bg-white/70 border border-[#d9d4cb] rounded-xl px-4 py-3">Você já enviou este briefing{b.answered_at ? ` em ${new Date(b.answered_at).toLocaleDateString("pt-BR")}` : ""}. Pode revisar e reenviar se quiser mudar algo.</p>}
      <button onClick={() => go(0)} className="mt-9 w-full sm:w-auto bg-[#151515] text-[#f4f2ee] rounded-full px-8 py-4 text-[16px] font-medium hover:bg-black transition-colors">Começar o briefing →</button>
    </main>
  </>);

  if (i >= ETAPAS.length) return shell(<>
    {Head}
    <main className="max-w-2xl mx-auto px-5 pt-10 pb-36">
      <p className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">Antes de enviar</p>
      <h2 className="text-[38px] md:text-[52px] leading-[1.02] mt-3" style={SERIF}>Confira se está<br /><i>tudo do seu jeito.</i></h2>
      <p className="text-[15px] text-[#4a463f] mt-4">É aqui que se evita o mal-entendido. Se algo não ficou claro, toque em “ajustar”.</p>
      <div className="mt-8 space-y-8">
        {ETAPAS.map((e, ei) => {
          const rows = e.qs.map((q) => ({ q, t: answerText(q, a[q.k]) })).filter((r) => r.t);
          return (
            <section key={e.k} className="border-t border-[#d9d4cb] pt-5">
              <div className="flex items-baseline justify-between gap-3"><p className="text-[22px]" style={SERIF}><span className="text-[#8a847a] mr-2">{String(ei + 1).padStart(2, "0")}</span>{e.t}</p><button onClick={() => go(ei)} className="text-[13px] underline underline-offset-4 text-[#4a463f]">ajustar</button></div>
              {!rows.length ? <p className="text-[14px] text-[#a39d93] mt-2">Nada respondido.</p> : (
                <dl className="mt-3 space-y-3">{rows.map(({ q, t }) => (
                  <div key={q.k}><dt className="text-[12.5px] text-[#8a847a]">{q.l}</dt><dd className="text-[15px] mt-0.5 whitespace-pre-wrap">{t}</dd></div>
                ))}</dl>
              )}
              {e.k === "referencias" && !!(a.refs || []).length && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-1">{(a.refs as RefImg[]).map((r) => <img key={r.id} src={r.img} alt="" className={`h-20 rounded-lg border-2 ${r.tipo === "evitar" ? "border-[#9b2c1f]" : "border-transparent"}`} />)}</div>
              )}
            </section>
          );
        })}
      </div>
      {err && <p className="mt-6 text-[14px] text-[#9b2c1f]">{err}</p>}
      <Bar>
        <button onClick={() => go(ETAPAS.length - 1)} className="px-5 py-3.5 rounded-full border border-[#cfc9be] text-[15px]">Voltar</button>
        <button onClick={enviar} disabled={busy} className="flex-1 bg-[#151515] text-[#f4f2ee] rounded-full px-6 py-3.5 text-[16px] font-medium disabled:opacity-60">{busy ? "Enviando…" : "Enviar briefing"}</button>
      </Bar>
    </main>
  </>);

  return shell(<>
    {Head}
    <main className="max-w-2xl mx-auto px-5 pt-10 pb-36">
      <div className="flex items-end gap-4">
        <span className="text-[64px] md:text-[88px] leading-[.8] text-[#151515]" style={SERIF}>{String(i + 1).padStart(2, "0")}</span>
        <span className="text-[12px] tracking-[.18em] uppercase text-[#8a847a] pb-1.5">de {String(ETAPAS.length).padStart(2, "0")}</span>
      </div>
      <h2 className="text-[34px] md:text-[46px] leading-[1.04] mt-5" style={SERIF}>{etapa.t}</h2>
      <p className="text-[15.5px] text-[#4a463f] mt-3 leading-relaxed">{etapa.d}</p>
      <div className="mt-10 space-y-11">
        {etapa.qs.map((q) => (
          <div key={q.k} id={`q-${q.k}`} className={miss.includes(q.k) ? "pl-4 border-l-2 border-[#9b2c1f]" : ""}>
            <Pergunta q={q} v={a[q.k]} all={a} set={(v) => { setA((o: any) => ({ ...o, [q.k]: v })); if (miss.includes(q.k)) setMiss((m) => m.filter((x) => x !== q.k)); }} />
            {miss.includes(q.k) && <p className="text-[13px] text-[#9b2c1f] mt-2">Essa é importante, responda do seu jeito.</p>}
          </div>
        ))}
      </div>
      <Bar>
        <button onClick={() => go(i - 1)} className="px-5 py-3.5 rounded-full border border-[#cfc9be] text-[15px]">Voltar</button>
        <button onClick={next} className="flex-1 bg-[#151515] text-[#f4f2ee] rounded-full px-6 py-3.5 text-[16px] font-medium">{i === ETAPAS.length - 1 ? "Revisar respostas" : "Continuar"}</button>
      </Bar>
    </main>
  </>);
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-20 bg-gradient-to-t from-[#f4f2ee] via-[#f4f2ee] to-[#f4f2ee]/0 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="max-w-2xl mx-auto px-5 flex gap-3">{children}</div>
    </div>
  );
}
