"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import CopyButton from "@/components/CopyButton";
import Previa from "@/components/design/paginas/Previa";
import { timeAgo } from "@/lib/design";
import { DESTINOS, STATUS, TIPOS, htmlUnico, pedidoNuvemshop, pedidoParaClaude, type Comentario, type Pagina, type Status } from "@/lib/paginas";

/* Estúdio da página: telas, versões, prévia celular/notebook, comentários com pino, aprovação e entrega. */
export default function Estudio() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const [p, setP] = useState<Pagina | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<string>("");
  const [vi, setVi] = useState<number>(-1); // índice da versão vista (-1 = atual)
  const [slug, setSlug] = useState("");
  const [modo, setModo] = useState<"phone" | "desk">("phone");
  const [comentar, setComentar] = useState(false);
  const [novo, setNovo] = useState<{ x: number; y: number } | null>(null);
  const [texto, setTexto] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [rolar, setRolar] = useState<number | null>(null);
  const [aviso, setAviso] = useState(sp.get("pedido") ? "Pedido criado. Copie o texto abaixo e cole no Claude com o conector VINCIT HUB ligado." : "");

  async function carregar() {
    const { data } = await createClient().from("web_pages").select("*").eq("id", id).maybeSingle();
    setP((data as any) || null);
    if (data?.account_id) createClient().from("ig_accounts").select("username").eq("id", data.account_id).maybeSingle().then(({ data: a }) => setPerfil(a?.username || ""));
  }
  useEffect(() => { carregar(); }, [id]);
  // enquanto está com o Claude, confere a cada 20 s se a versão nova chegou
  useEffect(() => {
    if (p?.status !== "pedido") return;
    const t = setInterval(carregar, 20000);
    return () => clearInterval(t);
  }, [p?.status]);

  const versoes = p?.versions || [];
  const v = versoes.length ? versoes[vi < 0 ? versoes.length - 1 : vi] : null;
  const tela = v?.telas.find((t) => t.slug === slug) || v?.telas[0] || null;
  const doModo = useMemo(() => (p?.comments || []).filter((c) => !c.resolvido && c.tela === tela?.slug && (c.modo || "phone") === modo), [p, tela, modo]);
  const abertos = (p?.comments || []).filter((c) => !c.resolvido);
  const link = typeof window !== "undefined" && p ? `${location.origin}/w/${p.share_token}` : "";

  async function salvar(patch: Partial<Pagina>) {
    if (!p) return;
    setP({ ...p, ...patch });
    const { error } = await createClient().from("web_pages").update(patch).eq("id", p.id);
    if (error) window.alert("Não deu para salvar: " + error.message);
  }
  async function comentarios(fn: (c: Comentario[]) => Comentario[]) {
    const { data } = await createClient().from("web_pages").select("comments").eq("id", id).maybeSingle();
    await salvar({ comments: fn((data?.comments as Comentario[]) || p?.comments || []) });
  }
  async function enviarComentario() {
    if (!novo || !texto.trim() || !tela) return;
    const c: Comentario = { id: crypto.randomUUID(), v: versoes.length, tela: tela.slug, x: novo.x, y: novo.y, modo, texto: texto.trim(), nome: "Equipe", de: "equipe", em: new Date().toISOString(), resolvido: false };
    await comentarios((cs) => [...cs, c]);
    setNovo(null); setTexto("");
  }
  async function pedirAjuste() {
    const lista = abertos.map((c, i) => `${i + 1}. [${c.tela} · ${c.modo === "desk" ? "notebook" : "celular"}] ${c.texto} (${c.nome})`).join("\n");
    await salvar({ status: "pedido", pedido: [ajuste.trim(), lista].filter(Boolean).join("\n\n") || "Revisar a versão atual." });
    setAjuste(""); setAviso("Ajustes enviados. Copie o pedido abaixo e cole no Claude.");
  }
  async function mudarStatus(s: Status) {
    await salvar({ status: s, ...(s === "aprovado" ? { approved: { nome: "Equipe", em: new Date().toISOString(), v: versoes.length } } : {}) });
  }
  function baixar() {
    if (!v || !p) return;
    const blob = new Blob([htmlUnico(p.title, v.telas)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${p.title.replace(/[^\w\- ]+/g, "").trim() || "pagina"}-v${v.n}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  if (p === undefined) return <div className="card h-96 animate-pulse" />;
  if (p === null) return <div className="card p-8 text-center text-fog">Página não encontrada. <Link href="/design/paginas" className="text-mint">Voltar</Link></div>;

  const st = STATUS[p.status] || STATUS.rascunho;
  const b = p.briefing || {};
  const comPedido = p.status === "pedido" || p.status === "rascunho";

  return (
    <div className="lg:-mx-4 xl:-mx-16">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5 rise">
        <div className="min-w-0">
          <Link href="/design/paginas" className="font-mono text-[11px] text-mint tracking-widest uppercase hover:underline">Design · Páginas</Link>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mt-1 break-words">{p.title}</h1>
          <p className="text-sm text-fog mt-1">
            <span className={`chip mr-2 ${st.tone === "mint" ? "chip-mint" : ""}`} style={st.tone === "warn" ? { color: "#f2c46d", borderColor: "#f2c46d55" } : undefined}>{st.l}</span>
            {TIPOS.find((t) => t.k === p.tipo)?.l}{perfil ? ` · @${perfil}` : ""}{v ? ` · v${v.n} de ${timeAgo(v.em)}` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CopyButton text={link} label="Copiar link do cliente" />
          {v && <a href={link} target="_blank" rel="noopener" className="btn btn-ghost btn-sm"><I.link className="w-3.5 h-3.5" />Abrir como cliente</a>}
        </div>
      </div>

      {aviso && <div className="card border-mint/40 p-3 mb-4 text-sm flex justify-between gap-3"><span>{aviso}</span><button onClick={() => setAviso("")} className="text-fog hover:text-white" aria-label="Fechar aviso">×</button></div>}

      {comPedido && (
        <section className="card p-4 sm:p-5 mb-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="max-w-2xl">
              <p className="font-semibold">{p.status === "pedido" ? (versoes.length ? "Ajustes com o Claude" : "Pedido com o Claude") : "Briefing salvo"}</p>
              <p className="text-sm text-fog mt-1">
                {p.status === "pedido"
                  ? "Cole o pedido no Claude (com o conector VINCIT HUB ligado). Ele lê o briefing, a marca e as fotos, mostra a ficha da página e grava as telas aqui. Esta tela se atualiza sozinha."
                  : "Quando o briefing estiver pronto, peça ao Claude para criar a primeira versão."}
              </p>
              {p.pedido && <pre className="text-xs text-fog whitespace-pre-wrap mt-3 bg-panel2 rounded-lg p-3 max-h-40 overflow-auto">{p.pedido}</pre>}
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              {p.status === "rascunho" && <button onClick={() => mudarStatus("pedido")} className="btn btn-mint btn-sm"><I.spark className="w-3.5 h-3.5" />Pedir ao Claude</button>}
              <CopyButton text={pedidoParaClaude(p, versoes.length > 0)} label="Copiar pedido" />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)_300px]">
        {/* esquerda: telas, versões, briefing */}
        <aside className="card p-4 flex flex-col gap-5 order-2 xl:order-1 min-w-0">
          <div>
            <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-2">Telas</p>
            {!v ? <p className="text-sm text-fog">Aparecem quando o Claude gravar a primeira versão.</p> : v.telas.map((t) => {
              const n = abertos.filter((c) => c.tela === t.slug).length;
              return (
                <button key={t.slug} onClick={() => setSlug(t.slug)} className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-lg text-sm ${tela?.slug === t.slug ? "bg-panel2 shadow-[inset_2px_0_0_var(--color-mint)]" : "hover:bg-panel2/60"}`}>
                  <span className="truncate">{t.nome}</span>{n > 0 && <span className="font-mono text-[11px] text-mint">{n}</span>}
                </button>
              );
            })}
          </div>
          {versoes.length > 0 && (
            <div>
              <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-2">Versões</p>
              {[...versoes].reverse().map((x, i) => {
                const idx = versoes.length - 1 - i, on = (vi < 0 ? versoes.length - 1 : vi) === idx;
                return (
                  <button key={x.n} onClick={() => setVi(idx === versoes.length - 1 ? -1 : idx)} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] ${on ? "bg-panel2" : "text-fog hover:bg-panel2/60"}`}>
                    <span className="flex justify-between gap-2"><b className="font-semibold">v{x.n}</b><span className="text-[11px]">{timeAgo(x.em)}</span></span>
                    {x.nota && <span className="block text-[12px] text-fog line-clamp-2 mt-0.5">{x.nota}</span>}
                  </button>
                );
              })}
            </div>
          )}
          <div>
            <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-2">Briefing</p>
            <dl className="text-[13px] space-y-2">
              {([["Objetivo", b.objetivo], ["Para quem", b.publico], ["Oferta", b.oferta], ["Seções", b.secoes], ["Referências", b.referencias], ["Destino", DESTINOS.find((d) => d.k === b.destino)?.l], ["Observações", b.observacoes]] as [string, string | undefined][])
                .filter(([, x]) => x).map(([k, x]) => <div key={k}><dt className="text-fog text-[11px]">{k}</dt><dd className="whitespace-pre-wrap break-words">{x}</dd></div>)}
              {!b.objetivo && !b.secoes && <p className="text-fog">Sem briefing escrito: o Claude usa o perfil e a marca.</p>}
            </dl>
          </div>
        </aside>

        {/* centro: prévia */}
        <section className="card overflow-hidden order-1 xl:order-2 min-w-0" style={{ background: "radial-gradient(circle at 1px 1px,#222226 1px,transparent 0) 0 0/18px 18px, var(--color-ink)" }}>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-line bg-panel">
            <p className="font-semibold text-sm mr-auto truncate">{tela?.nome || "Prévia"}{vi >= 0 && <span className="text-fog font-normal"> · vendo v{v?.n}</span>}</p>
            <div className="inline-flex bg-panel2 rounded-lg p-0.5">
              {(["phone", "desk"] as const).map((m) => (
                <button key={m} onClick={() => setModo(m)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${modo === m ? "bg-ink text-white" : "text-fog"}`}>{m === "phone" ? "Celular" : "Notebook"}</button>
              ))}
            </div>
            <button onClick={() => { setComentar((c) => !c); setNovo(null); }} disabled={!v} className={`btn btn-sm ${comentar ? "btn-mint" : "btn-ghost"}`}>{comentar ? "Sair dos comentários" : "Comentar"}</button>
          </div>
          {comentar && <p className="text-center text-xs text-mint py-1.5 bg-mint/5">Toque na tela onde quer comentar</p>}
          <div className="p-3 sm:p-6">
            <Previa tela={tela} modo={modo} comments={doModo} comentar={comentar} rolarPara={rolar}
              onTela={(s) => setSlug(s)} onClique={(x, y) => { setNovo({ x, y }); setTexto(""); }}
              onPin={(cid) => document.getElementById("c-" + cid)?.scrollIntoView({ behavior: "smooth", block: "center" })} />
          </div>
        </section>

        {/* direita: aprovação, comentários, entrega */}
        <aside className="card p-4 flex flex-col gap-5 order-3 min-w-0">
          <div>
            <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-2">Aprovação</p>
            <div className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${p.approved ? "border-mint" : "border-line"}`}>
              <span className={`w-2 h-2 rounded-full ${p.approved ? "bg-mint" : "bg-[#f2c46d]"}`} />
              {p.approved ? `Aprovada por ${p.approved.nome} · v${p.approved.v}` : v ? "Aguardando o cliente" : "Sem versão para aprovar"}
            </div>
          </div>

          {novo && (
            <div className="rounded-xl border border-mint p-3">
              <p className="text-xs text-fog mb-2">Comentário em {tela?.nome} · {modo === "desk" ? "notebook" : "celular"}</p>
              <textarea className="input" rows={3} autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que mudar aqui?" />
              <div className="flex gap-2 mt-2"><button onClick={enviarComentario} disabled={!texto.trim()} className="btn btn-mint btn-sm">Comentar</button><button onClick={() => setNovo(null)} className="btn btn-ghost btn-sm">Cancelar</button></div>
            </div>
          )}

          <div>
            <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-2">Comentários abertos · {abertos.length}</p>
            {!abertos.length ? <p className="text-sm text-fog">Nenhum. O cliente comenta pelo link, e você pelo botão Comentar.</p> : (
              <div className="flex flex-col gap-2">
                {abertos.map((c) => (
                  <div key={c.id} id={"c-" + c.id} className="rounded-xl bg-panel2 p-3 text-[13px]">
                    <p className="whitespace-pre-wrap break-words">{c.texto}</p>
                    <p className="text-[11px] text-fog mt-1.5 flex flex-wrap gap-x-2">
                      <span>{c.nome}</span><span>{v?.telas.find((t) => t.slug === c.tela)?.nome || c.tela} · {c.modo === "desk" ? "notebook" : "celular"} · v{c.v}</span>
                    </p>
                    <div className="flex gap-3 mt-2 text-[12px]">
                      <button className="text-mint hover:underline" onClick={() => { setSlug(c.tela); setModo(c.modo || "phone"); setVi(-1); setTimeout(() => setRolar(c.y + Math.random() / 1000), 400); }}>Ver na tela</button>
                      <button className="text-fog hover:text-white" onClick={() => comentarios((cs) => cs.map((x) => (x.id === c.id ? { ...x, resolvido: true } : x)))}>Resolver</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {v && (
            <div className="flex flex-col gap-2">
              <textarea className="input" rows={2} value={ajuste} onChange={(e) => setAjuste(e.target.value)} placeholder="Ajuste geral (opcional), além dos comentários" />
              <button onClick={pedirAjuste} disabled={!ajuste.trim() && !abertos.length} className="btn btn-ghost">Mandar ajustes ao Claude</button>
              {!p.approved && <button onClick={() => mudarStatus("aprovado")} className="btn btn-mint">Aprovar esta versão</button>}
            </div>
          )}

          {v && (
            <div>
              <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-2">Entregar</p>
              <div className="flex flex-col gap-2">
                {tela && <CopyButton text={tela.html} label={`Copiar código de "${tela.nome}"`} />}
                <button onClick={baixar} className="btn btn-ghost btn-sm justify-start"><I.download className="w-3.5 h-3.5" />Baixar site (.html com todas as telas)</button>
                <CopyButton text={pedidoNuvemshop(p)} label="Pedido para montar na Nuvemshop" />
                {p.status !== "entregue" && p.approved && <button onClick={() => mudarStatus("entregue")} className="btn btn-ghost btn-sm justify-start">Marcar como entregue</button>}
              </div>
              <p className="text-[11px] text-fog mt-2 leading-relaxed">Na Nuvemshop, o Claude com o conector da loja monta as seções num rascunho do tema Ipanema e manda o link. Você publica no Admin.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
