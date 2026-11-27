"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { printAll } from "@/components/design/brand/lazy";
import { FORMATS, Presenter, PrintDeck, useDeck, type Format } from "@/components/design/brand/Presentation";
import Logo from "@/components/Logo";
import { VideoControls } from "@/components/design/brand/Motion";
import { Reader } from "@/components/design/brand/Reader";

/* Apresentação pública da marca (link do projeto): o cliente vê os slides, apresenta em tela cheia,
   baixa o PDF e aprova ou pede ajuste. Sempre mostra a versão salva mais recente do projeto. */

export default function ApresentacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<any>(undefined);
  useEffect(() => { createClient().rpc("pub_get_brand", { p_token: token }).then(({ data }) => setP(data || null)); }, [token]);
  if (p === undefined) return <main className="min-h-screen grid place-items-center text-fog">Carregando…</main>;
  if (!p) return <main className="min-h-screen grid place-items-center text-fog px-6 text-center">Este link não está mais disponível. Peça um novo para quem te enviou.</main>;
  return <Deck token={token} p={p} />;
}

function Deck({ token, p }: { token: string; p: any }) {
  const d = p.data || {};
  const format: Format = (d.deck_format as Format) in FORMATS ? d.deck_format : "16:9";
  const { x, slides } = useDeck(d, format, p.mockups || []);
  const [show, setShow] = useState<number | null>(null);
  const nome = d.brief?.nome || p.title;
  const ent = d.entrega || {};
  const [mode, setMode] = useState<"" | "ajuste">("");
  const [name, setName] = useState("");
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "aprovado" | "ajuste">("");
  const [aprovado, setAprovado] = useState<string | null>(ent.aprovado || null);

  useEffect(() => { document.title = `${nome} · identidade de marca`; }, [nome]);

  async function enviar(decisao: "aprovado" | "ajuste") {
    if (decisao === "ajuste" && !txt.trim()) return;
    setBusy(true);
    const { data } = await createClient().rpc("pub_brand_feedback", { p_token: token, p_decision: decisao, p_comment: txt, p_name: name });
    setBusy(false);
    if (data) { setDone(decisao); setTxt(""); setMode(""); if (decisao === "aprovado") setAprovado(new Date().toISOString()); }
  }

  return (
    <main className="relative z-10 min-h-screen">
      <header className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 print:hidden">
        <div className="flex items-center justify-between"><Logo className="h-6" vincitOnly /><span className="font-mono text-[11px] text-fog tracking-widest uppercase">Identidade de marca</span></div>
        <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mt-10 leading-[1.02]">{nome}</h1>
        <p className="text-fog mt-3 text-[15px] max-w-xl">Sua marca, do porquê às aplicações. Veja com calma. Na barra das páginas, escolha uma página, duas lado a lado ou todas em miniatura, e use + e − para o zoom. Toque numa página para abrir em tela cheia.</p>
        <div className="flex flex-wrap gap-2 mt-6">
          <button onClick={() => setShow(0)} className="btn btn-mint">▶ Apresentar em tela cheia</button>
          <button onClick={printAll} className="btn btn-ghost">Baixar PDF</button>
          <div className="w-full flex flex-wrap items-center gap-2"><VideoControls x={x} slides={slides} name={nome} d={d} /></div>
          <a href="#retorno" className="btn btn-ghost">{aprovado ? "Aprovada" : "Aprovar ou pedir ajuste"}</a>
        </div>
        <p className="text-[11px] text-fog mt-3">{slides.length} páginas · no PDF, escolha “Salvar como PDF” e ative “Gráficos de fundo”.</p>
      </header>

      <div className="mt-8"><Reader x={x} slides={slides} onPresent={setShow} active={show === null} /></div>

      <section id="retorno" className="max-w-2xl mx-auto px-4 md:px-8 pb-20 print:hidden">
        {aprovado && !mode ? (
          <div className="card p-6 text-center border-mint-dim bg-mint/[.05]">
            <p className="font-display text-2xl font-bold text-mint">{done === "aprovado" ? "Obrigado! Marca aprovada." : "Marca aprovada"}</p>
            <p className="text-fog text-sm mt-2">Em {new Date(aprovado).toLocaleDateString("pt-BR")}. Agora preparamos os arquivos finais para você.</p>
            <button onClick={() => setMode("ajuste")} className="text-xs text-fog underline mt-4">Ainda quero comentar algo</button>
          </div>
        ) : (
          <div className="card p-5 md:p-7">
            <p className="font-display text-2xl font-bold">O que achou?</p>
            <p className="text-fog text-sm mt-1 mb-5">{done === "ajuste" ? "Recebemos o seu pedido. Se quiser, mande mais alguma observação." : "Se estiver tudo certo, aprove. Se quiser mudar algo, conte o que e em qual página."}</p>
            <label className="label">Seu nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input mb-4" placeholder="Seu nome" />
            {mode === "ajuste" && <>
              <label className="label">O que você quer ajustar?</label>
              <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={4} className="input mb-4" placeholder="Ex.: na página 12, gostei mais da versão em uma cor só." autoFocus />
            </>}
            <div className="flex flex-col sm:flex-row gap-2">
              {mode === "ajuste"
                ? <><button onClick={() => enviar("ajuste")} disabled={busy || !txt.trim()} className="btn btn-mint flex-1">{busy ? "Enviando…" : "Enviar pedido de ajuste"}</button><button onClick={() => setMode("")} className="btn btn-ghost">Cancelar</button></>
                : <><button onClick={() => enviar("aprovado")} disabled={busy} className="btn btn-mint flex-1">{busy ? "Enviando…" : "Aprovo a marca"}</button><button onClick={() => setMode("ajuste")} className="btn btn-ghost flex-1">Quero pedir um ajuste</button></>}
            </div>
          </div>
        )}
      </section>
      <PrintDeck x={x} slides={slides} />
      {show !== null && <Presenter x={x} slides={slides} start={show} onClose={() => setShow(null)} />}
    </main>
  );
}
