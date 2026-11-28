"use client";
/* eslint-disable @next/next/no-img-element */
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadFonts } from "@/lib/design";
import { FONT_CATS, FONT_LIB, fontsOfCat, type FontCat } from "@/lib/fonts";
import { TYPE_GROUPS, TYPE_GUIDE, TASTE_AXES } from "@/lib/brand-knowledge";

/* Pré-projeto que o cliente responde sem login: tipos de letra, mostruário com "gosto / não quero"
   e o mapa do gosto. Tema claro editorial, celular primeiro. O rascunho fica salvo no aparelho. */

const SERIF = { fontFamily: '"Bodoni Moda", Georgia, serif' };
const INK = "#151515", MUTED = "#8a847a", LINE = "#d9d4cb", RED = "#9b2c1f";

export default function PreProjetoPublico() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<any>(undefined);
  const [g, setG] = useState<any>({ fontes: {}, eixos: {}, notas: "" });
  const [nome, setNome] = useState("");
  const [cat, setCat] = useState<FontCat>("didone");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const key = `vincit-gosto:${token}`;
  const codes = useMemo(() => Object.fromEntries(FONT_LIB.map((x, i) => [x.f, `T${String(i + 1).padStart(2, "0")}`])), []);

  useEffect(() => {
    loadFonts(["Bodoni Moda", ...TYPE_GUIDE.map((c) => c.ex)]);
    createClient().rpc("pub_get_taste", { p_token: token }).then(({ data }) => {
      setP(data || null);
      let draft: any = null;
      try { draft = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
      const base = draft?.g || data?.gosto || {};
      setG({ fontes: base.fontes || {}, eixos: base.eixos || {}, notas: base.notas || "" });
      setNome(draft?.nome || data?.gosto?.cliente?.nome || "");
    });
  }, [token]); // eslint-disable-line
  useEffect(() => { if (p) { try { localStorage.setItem(key, JSON.stringify({ g, nome })); } catch {} } }, [g, nome, p, key]);
  useEffect(() => { loadFonts(fontsOfCat(cat).map((x) => x.f)); }, [cat]);

  const mark = (f: string, v: 1 | -1) => setG((o: any) => { const fs = { ...o.fontes }; if (fs[f] === v) delete fs[f]; else fs[f] = v; return { ...o, fontes: fs }; });
  const fav = Object.values(g.fontes).filter((v) => v === 1).length;
  const nao = Object.values(g.fontes).filter((v) => v === -1).length;
  const eixos = Object.keys(g.eixos).length;

  async function enviar() {
    setBusy(true); setErr("");
    const { data, error } = await createClient().rpc("pub_submit_taste", { p_token: token, p_gosto: g, p_name: nome });
    setBusy(false);
    if (error || !data) { setErr("Não conseguimos enviar agora. Confira a internet e tente de novo; suas escolhas continuam salvas aqui."); return; }
    try { localStorage.removeItem(key); } catch {}
    setSent(true); document.getElementById("gosto-shell")?.scrollTo({ top: 0 });
  }

  const shell = (children: React.ReactNode) => (
    <div id="gosto-shell" className="fixed inset-0 overflow-y-auto bg-[#f4f2ee] text-[#151515] z-10" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{children}</div>
  );
  if (p === undefined) return shell(<div className="min-h-full grid place-items-center text-[#8a847a]">Carregando…</div>);
  if (!p) return shell(<div className="min-h-full grid place-items-center px-6 text-center"><div><p className="text-[28px]" style={SERIF}>Link não encontrado</p><p className="text-[#7a746a] mt-2">Peça um link novo para quem te enviou.</p></div></div>);

  const marca = p.nome || p.title;
  const Head = (
    <header className="sticky top-0 z-20 bg-[#f4f2ee]/90 backdrop-blur border-b border-[#e2ddd4]">
      <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
        <img loading="lazy" decoding="async" src="/vincit-logo-escuro.svg" alt="VINCIT" className="h-5 w-auto" />
        <span className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">Pré-projeto</span>
      </div>
    </header>
  );
  const Sec = ({ n, t, d, children }: { n: string; t: string; d?: string; children: React.ReactNode }) => (
    <section className="border-t border-[#d9d4cb] pt-8 mt-12">
      <div className="flex items-end gap-3"><span className="text-[44px] leading-[.8]" style={SERIF}>{n}</span><h2 className="text-[26px] md:text-[32px] leading-tight" style={SERIF}>{t}</h2></div>
      {d && <p className="text-[15px] text-[#4a463f] mt-3 leading-relaxed max-w-xl">{d}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );

  if (sent) return shell(<>
    {Head}
    <main className="max-w-3xl mx-auto px-5 py-16 md:py-24">
      <p className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">Recebido</p>
      <h1 className="text-[44px] md:text-[64px] leading-[1.02] mt-3" style={SERIF}>Obrigado{nome ? `, ${nome.split(" ")[0]}` : ""}.</h1>
      <p className="text-[17px] text-[#4a463f] mt-6 leading-relaxed max-w-lg">Suas escolhas chegaram. Elas vão guiar o desenho da sua marca: a letra, o peso e o jeito. Se mudar de ideia, é só abrir o mesmo link e enviar de novo.</p>
    </main>
  </>);

  return shell(<>
    {Head}
    <main className="max-w-3xl mx-auto px-5 pt-12 pb-40 md:pt-20">
      <p className="text-[11px] tracking-[.22em] uppercase text-[#8a847a]">Para {marca}</p>
      <h1 className="text-[44px] md:text-[72px] leading-[.98] mt-4" style={SERIF}>Antes de desenhar,<br /><i>o seu gosto.</i></h1>
      <p className="text-[17px] text-[#4a463f] mt-6 leading-relaxed max-w-lg">Como um arquiteto que mostra amostras de piso e tinta antes da obra: aqui estão letras de vários estilos, já com o nome da sua marca. Marque as que você gosta e as que não quer, sem pensar muito. Não existe resposta certa.</p>
      <p className="text-[13px] text-[#8a847a] mt-4">Suas escolhas ficam salvas neste aparelho. Pode parar e voltar depois pelo mesmo link.</p>
      {p.gosto?.cliente?.em && <p className="text-[14px] mt-4 bg-white/70 border border-[#d9d4cb] rounded-xl px-4 py-3">Você já enviou em {new Date(p.gosto.cliente.em).toLocaleDateString("pt-BR")}. Se mudar algo, é só enviar de novo.</p>}

      <Sec n="01" t="Os tipos de letra" d="Toda letra pertence a uma destas famílias. Cada uma passa uma sensação diferente.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TYPE_GROUPS.map((gr) => { const ex = TYPE_GUIDE.find((c) => c.grupo === gr.k)!; return (
            <div key={gr.k} className="bg-white/70 border border-[#e2ddd4] rounded-2xl p-4">
              <p className="text-[56px] leading-none" style={{ fontFamily: `"${ex.ex}"`, fontWeight: ex.w || 400 }}>Ag</p>
              <p className="text-[15px] font-medium mt-3">{gr.l}</p>
              <p className="text-[13px] text-[#6b665d] mt-1 leading-snug">{gr.d}</p>
            </div>
          ); })}
        </div>
      </Sec>

      <Sec n="02" t="O mostruário" d="Escolha um estilo e marque. Cada letra tem um código: se preferir, pode só mandar os códigos por mensagem.">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-5 px-5">
          {FONT_CATS.map((c) => <button key={c.k} onClick={() => setCat(c.k)} className={`shrink-0 rounded-full px-4 py-2 text-[14px] border ${cat === c.k ? "bg-[#151515] text-[#f4f2ee] border-[#151515]" : "border-[#cfc9be]"}`}>{c.l}</button>)}
        </div>
        <p className="text-[13.5px] text-[#6b665d] mt-2">{FONT_CATS.find((c) => c.k === cat)?.d}</p>
        <div className="grid sm:grid-cols-2 gap-2 mt-4">
          {fontsOfCat(cat).map((x) => { const v = g.fontes[x.f]; const w = x.w.includes(400) ? 400 : x.w[0]; return (
            <div key={x.f} className={`rounded-2xl border bg-white/80 overflow-hidden ${v === 1 ? "border-[#151515] ring-1 ring-[#151515]" : v === -1 ? "border-[#e2ddd4] opacity-45" : "border-[#e2ddd4]"}`}>
              <div className="px-4 pt-3">
                <div className="flex justify-between text-[11px] text-[#8a847a]"><span className="font-semibold">{codes[x.f]}</span><span>{x.f}</span></div>
                <p className="text-[32px] leading-tight mt-2 truncate" style={{ fontFamily: `"${x.f}"`, fontWeight: w }}>{marca}</p>
                <p className="text-[12px] uppercase tracking-[.3em] mt-1 truncate text-[#8F3A22]" style={{ fontFamily: `"${x.f}"`, fontWeight: w }}>{marca}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2 mt-1">
                <button onClick={() => mark(x.f, 1)} className={`rounded-full py-2 text-[14px] border ${v === 1 ? "bg-[#151515] text-[#f4f2ee] border-[#151515]" : "border-[#cfc9be]"}`}>Gosto</button>
                <button onClick={() => mark(x.f, -1)} className={`rounded-full py-2 text-[14px] border ${v === -1 ? "border-[#9b2c1f] text-[#9b2c1f]" : "border-[#cfc9be]"}`}>Não quero</button>
              </div>
            </div>
          ); })}
        </div>
      </Sec>

      <Sec n="03" t="O seu mapa" d="Em cada linha, toque no lado que mais combina com você.">
        <div className="space-y-4">
          {TASTE_AXES.map((a) => (
            <div key={a.k}>
              <p className="text-[14px] text-[#6b665d] mb-1.5">{a.l}</p>
              <div className="grid grid-cols-3 gap-1.5">{a.o.map((o, i) => { const on = g.eixos[a.k] === i; return (
                <button key={o} onClick={() => setG((s: any) => { const e = { ...s.eixos }; if (on) delete e[a.k]; else e[a.k] = i; return { ...s, eixos: e }; })} className={`rounded-xl px-2 py-3 text-[13.5px] leading-tight border ${on ? "bg-[#151515] text-[#f4f2ee] border-[#151515]" : "bg-white/70 border-[#e2ddd4]"}`}>{o}</button>
              ); })}</div>
            </div>
          ))}
        </div>
      </Sec>

      <Sec n="04" t="Com as suas palavras">
        <textarea value={g.notas} onChange={(e) => setG((s: any) => ({ ...s, notas: e.target.value }))} rows={4} placeholder="O que você sentiu vendo as letras? O que lembra você, o que não tem nada a ver?" className="w-full rounded-2xl border border-[#d9d4cb] bg-white/80 px-4 py-3 text-[15px] outline-none focus:border-[#151515]" />
        <label className="block text-[13px] text-[#8a847a] mt-4 mb-1">Seu nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-full border border-[#d9d4cb] bg-white/80 px-4 py-3 text-[15px] outline-none focus:border-[#151515]" />
      </Sec>
      {err && <p className="mt-6 text-[14px]" style={{ color: RED }}>{err}</p>}
    </main>
    <div className="fixed bottom-0 inset-x-0 z-20 bg-[#f4f2ee]/95 backdrop-blur border-t border-[#e2ddd4]">
      <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
        <p className="text-[13px] mr-auto" style={{ color: MUTED }}><b style={{ color: INK }}>{fav}</b> gosto · {nao} não quero · {eixos}/{TASTE_AXES.length} no mapa</p>
        <button onClick={enviar} disabled={busy || (!fav && !eixos)} className="rounded-full px-6 py-3 text-[15px] font-medium disabled:opacity-50" style={{ background: INK, color: "#f4f2ee", borderColor: LINE }}>{busy ? "Enviando…" : "Enviar"}</button>
      </div>
    </div>
  </>);
}
