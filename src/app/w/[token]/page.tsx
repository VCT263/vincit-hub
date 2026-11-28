"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Previa from "@/components/design/paginas/Previa";
import type { Comentario } from "@/lib/paginas";

/* Link público da página: o cliente navega pela prévia, comenta tocando na tela e aprova. Sem login. */
export default function PaginaCliente() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<any>(undefined);
  const [slug, setSlug] = useState("");
  const [modo, setModo] = useState<"phone" | "desk">("phone");
  const [comentar, setComentar] = useState(false);
  const [novo, setNovo] = useState<{ x: number; y: number } | null>(null);
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState("");
  const [aprovar, setAprovar] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    createClient().rpc("pub_get_page", { p_token: token }).then(({ data }) => setP(data || null));
    try { setNome(localStorage.getItem("vincit-nome") || ""); } catch {}
    if (window.innerWidth >= 1100) setModo("desk");
  }, [token]);

  const telas = p?.versao?.telas || [];
  const tela = telas.find((t: any) => t.slug === slug) || telas[0] || null;
  const doModo = useMemo(() => ((p?.comments || []) as Comentario[]).filter((c) => c.tela === tela?.slug && (c.modo || "phone") === modo), [p, tela, modo]);

  function guardarNome(n: string) { setNome(n); try { localStorage.setItem("vincit-nome", n); } catch {} }
  async function enviar() {
    if (!novo || !texto.trim() || !tela) return;
    const { data } = await createClient().rpc("pub_page_comment", { p_token: token, p_tela: tela.slug, p_x: novo.x, p_y: novo.y, p_modo: modo, p_texto: texto.trim(), p_nome: nome });
    if (data) { setP({ ...p, comments: [...(p.comments || []), data] }); setNovo(null); setTexto(""); setMsg("Comentário enviado. A equipe já recebeu."); }
    else setMsg("Não deu para enviar agora. Tente de novo.");
  }
  async function confirmarAprovacao() {
    const { data } = await createClient().rpc("pub_page_approve", { p_token: token, p_nome: nome });
    if (data) { setP({ ...p, status: "aprovado", approved: { nome: nome || "Cliente", em: new Date().toISOString(), v: p.versao?.n } }); setAprovar(false); setMsg("Página aprovada. Obrigado!"); }
  }

  const shell = (c: React.ReactNode) => <main className="min-h-screen bg-[#f4f2ef] text-[#1d1b19]">{c}</main>;
  if (p === undefined) return shell(<div className="min-h-screen grid place-items-center text-[#8a847a]">Carregando…</div>);
  if (!p) return shell(<div className="min-h-screen grid place-items-center text-center px-6"><div><p className="text-2xl font-semibold">Link não encontrado</p><p className="text-[#7a746a] mt-2">Peça um link novo para quem te enviou.</p></div></div>);

  const btn = "rounded-full px-4 py-2 text-sm font-medium border transition-colors";
  return shell(
    <div className="max-w-[1400px] mx-auto px-4 py-5 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] tracking-[.16em] uppercase text-[#8a847a]">{p.company || "Prévia para aprovação"} · versão {p.versao?.n}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">{p.title}</h1>
        </div>
        {p.approved
          ? <span className="rounded-full bg-[#1d1b19] text-white text-sm px-4 py-2">Aprovada por {p.approved.nome}</span>
          : <button onClick={() => setAprovar(true)} className={`${btn} bg-[#1d1b19] text-white border-[#1d1b19]`}>Aprovar página</button>}
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 overflow-x-auto max-w-full">
          {telas.map((t: any) => (
            <button key={t.slug} onClick={() => setSlug(t.slug)} className={`${btn} whitespace-nowrap ${tela?.slug === t.slug ? "bg-white border-[#1d1b19]" : "border-transparent text-[#6d6760] hover:bg-white/60"}`}>{t.nome}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="hidden sm:inline-flex bg-white rounded-full p-1 border border-[#e3dfda]">
            {(["phone", "desk"] as const).map((m) => <button key={m} onClick={() => setModo(m)} className={`px-3 py-1 rounded-full text-sm ${modo === m ? "bg-[#1d1b19] text-white" : "text-[#6d6760]"}`}>{m === "phone" ? "Celular" : "Computador"}</button>)}
          </div>
          <button onClick={() => { setComentar((c) => !c); setNovo(null); }} className={`${btn} ${comentar ? "bg-[#1d1b19] text-white border-[#1d1b19]" : "bg-white border-[#e3dfda]"}`}>{comentar ? "Sair dos comentários" : "Comentar"}</button>
        </div>
      </div>
      {comentar && <p className="text-sm text-center mb-3 text-[#6d6760]">Toque no ponto da página que você quer comentar.</p>}
      {msg && <p className="text-sm text-center mb-3">{msg}</p>}

      <Previa tela={tela} modo={modo} comments={doModo} comentar={comentar} altura={720}
        onTela={(s) => setSlug(s)} onClique={(x, y) => { setNovo({ x, y }); setTexto(""); }} />

      {(novo || aprovar) && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center p-0 sm:p-6" onClick={() => { setNovo(null); setAprovar(false); }}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-lg">{aprovar ? "Aprovar esta versão?" : "Seu comentário"}</p>
            <label className="block mt-3 text-sm text-[#6d6760]">Seu nome
              <input className="mt-1 w-full rounded-xl border border-[#e3dfda] px-3 py-2.5 text-[#1d1b19] text-base" value={nome} onChange={(e) => guardarNome(e.target.value)} placeholder="Como você se chama" /></label>
            {!aprovar && <textarea className="mt-3 w-full rounded-xl border border-[#e3dfda] px-3 py-2.5 text-base" rows={4} autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que você quer mudar aqui?" />}
            {aprovar && <p className="text-sm text-[#6d6760] mt-3">A equipe recebe o aviso e prepara a publicação. Ajustes depois disso viram uma versão nova.</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={aprovar ? confirmarAprovacao : enviar} disabled={!aprovar && !texto.trim()} className={`${btn} bg-[#1d1b19] text-white border-[#1d1b19] disabled:opacity-40 flex-1`}>{aprovar ? "Aprovar" : "Enviar comentário"}</button>
              <button onClick={() => { setNovo(null); setAprovar(false); }} className={`${btn} border-[#e3dfda]`}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
