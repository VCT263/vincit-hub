"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAccounts } from "@/lib/useAccounts";
import { aiFetch } from "@/lib/aiFetch";
import { openClaudePopup, popupEnabled } from "@/lib/claudePopup";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { TEMAS, rotuloCampo, type Turno } from "@/lib/entrevista";

/**
 * Entrevista de marca: a entrevistadora lê a pergunta em voz alta, a pessoa responde falando
 * (o navegador transcreve, de graça) ou digitando, e o Claude da própria pessoa (fila de IA)
 * questiona e faz a próxima pergunta. No fim, propõe o briefing, que só vale depois de aprovado.
 */
type Ent = { id: string; account_id: string; status: string; turns: Turno[]; tema: number; notas: string[]; proposta: any; updated_at: string };

const sb = () => createClient();
const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export default function Entrevista() {
  const { accounts, loading } = useAccounts();
  const [accId, setAccId] = useState("");
  const [ent, setEnt] = useState<Ent | null>(null);
  const [fala, setFala] = useState("");
  const [txt, setTxt] = useState("");
  const [parcial, setParcial] = useState("");
  const [quem, setQuem] = useState("");
  const [estado, setEstado] = useState<"" | "pensando" | "falando" | "ouvindo">("");
  const [erro, setErro] = useState("");
  const [voz, setVoz] = useState(true);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [aplicado, setAplicado] = useState(false);
  const rec = useRef<any>(null);
  const acc = accounts.find((a) => a.id === accId);
  const busy = estado === "pensando";

  useEffect(() => {
    if (!accId && accounts.length) { const q = new URLSearchParams(location.search).get("perfil"); setAccId(accounts.find((a) => a.id === q)?.id || accounts[0].id); }
  }, [accounts, accId]);
  useEffect(() => { try { setQuem(localStorage.getItem("entrevista_quem") || ""); setVoz(localStorage.getItem("entrevista_voz") !== "0"); } catch {} }, []);

  const ultimaFala = (e: Ent | null) => [...(e?.turns || [])].reverse().find((t) => t.r === "e")?.t || "";

  const carregar = useCallback(async () => {
    if (!accId) return;
    const { data } = await sb().from("brand_interviews").select("*").eq("account_id", accId).neq("status", "arquivada").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    setEnt((cur) => {
      // não troca a conversa enquanto a tela espera o Claude
      if (cur && data && cur.id === data.id && cur.updated_at === data.updated_at) return cur;
      return (data as Ent) || null;
    });
    if (data) { setFala((f) => f || ultimaFala(data as Ent)); if (data.proposta) setSel(Object.fromEntries(Object.keys(data.proposta.campos || {}).map((k) => [k, true]))); }
  }, [accId]);
  useEffect(() => { setEnt(null); setFala(""); setAplicado(false); carregar(); }, [accId, carregar]);
  // a conversa também pode andar pelo Claude (conector): atualiza de tempos em tempos
  useEffect(() => { const t = setInterval(() => { if (!document.hidden && !busy) carregar(); }, 12000); return () => clearInterval(t); }, [carregar, busy]);

  function falar(t: string) {
    setFala(t);
    if (!voz || typeof speechSynthesis === "undefined" || !t) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "pt-BR"; u.rate = 1.02;
      const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("pt-br")) || speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("pt"));
      if (v) u.voice = v;
      u.onstart = () => setEstado("falando");
      u.onend = u.onerror = () => setEstado((s) => (s === "falando" ? "" : s));
      speechSynthesis.speak(u);
    } catch {}
  }

  async function salvar(id: string, patch: any) {
    const { data, error } = await sb().from("brand_interviews").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    setEnt(data as Ent);
    return data as Ent;
  }

  /** pede a próxima fala ao Claude da pessoa (fila); o pop-up abre dentro do clique */
  async function proxima(e: Ent) {
    setEstado("pensando"); setErro("");
    try {
      const r = await aiFetch("/api/ai", { task: "entrevista_turno", data: { id: e.id, account: { id: e.account_id, username: acc?.username } } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "A entrevistadora não respondeu.");
      const tema = Math.max(1, Math.min(TEMAS.length, Number(j.tema) || e.tema || 1));
      const novo = await salvar(e.id, { turns: [...(e.turns || []), { r: "e", t: j.fala, tema, at: new Date().toISOString(), via: "hub" }], tema, notas: j.nota ? [...(e.notas || []), j.nota] : e.notas || [] });
      setEstado("");
      falar(j.fala);
      if (j.fim) await montarBriefing(novo, false);
    } catch (x: any) { setEstado(""); setErro(x.message || "Algo deu errado. Tente enviar de novo."); }
  }

  async function comecar(nova: boolean) {
    if (popupEnabled()) openClaudePopup();
    if (!accId) return;
    try {
      let e = ent;
      if (nova || !e || e.status !== "andamento") {
        if (e && e.status === "andamento") await sb().from("brand_interviews").update({ status: "arquivada" }).eq("id", e.id);
        const { data, error } = await sb().from("brand_interviews").insert({ account_id: accId }).select("*").single();
        if (error) throw new Error(error.message);
        e = data as Ent; setEnt(e); setAplicado(false);
      }
      const last = e.turns?.[e.turns.length - 1];
      if (last?.r === "e") return falar(last.t);
      await proxima(e);
    } catch (x: any) { setErro(x.message); }
  }

  async function enviar(texto = txt) {
    const t = texto.trim();
    if (!t || !ent || busy) return;
    if (popupEnabled()) openClaudePopup();
    pararMic();
    try { localStorage.setItem("entrevista_quem", quem); } catch {}
    try {
      const e = await salvar(ent.id, { turns: [...(ent.turns || []), { r: "p", t, quem: quem.trim() || undefined, tema: ent.tema, at: new Date().toISOString(), via: "hub" }] });
      setTxt(""); setParcial("");
      await proxima(e);
    } catch (x: any) { setErro(x.message); }
  }

  async function montarBriefing(e = ent, abrir = true) {
    if (!e) return;
    if (abrir && popupEnabled()) openClaudePopup();
    setEstado("pensando"); setErro("");
    try {
      const r = await aiFetch("/api/ai", { task: "entrevista_briefing", data: { id: e.id, account: { id: e.account_id, username: acc?.username } } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Não consegui montar o briefing.");
      await salvar(e.id, { proposta: j, status: "concluida" });
      setSel(Object.fromEntries(Object.keys(j.campos || {}).map((k) => [k, true])));
      setFala("Pronto. O briefing proposto está abaixo para revisar e aprovar.");
    } catch (x: any) { setErro(x.message); }
    setEstado("");
  }

  async function aplicar() {
    if (!ent?.proposta || !acc) return;
    const campos = ent.proposta.campos || {};
    const novo = { ...(acc.briefing || {}) };
    for (const k of Object.keys(campos)) if (sel[k]) novo[k] = campos[k];
    const { error } = await sb().from("ig_accounts").update({ briefing: novo, briefing_updated_at: new Date().toISOString() }).eq("id", acc.id);
    if (error) return setErro(error.message);
    await salvar(ent.id, { status: "aprovada", aprovada_em: new Date().toISOString() });
    setAplicado(true);
  }

  // microfone: o navegador transforma a fala em texto (Chrome, Edge, Safari)
  function pararMic() { try { rec.current?.stop(); } catch {} }
  function mic() {
    if (estado === "ouvindo") { pararMic(); return; }
    if (!SR) { setErro("Este navegador não transcreve áudio. No celular, use o microfone do teclado para ditar a resposta."); return; }
    try { speechSynthesis?.cancel(); } catch {}
    const r = new SR();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
    const base = txt ? txt.trim() + " " : "";
    let finais = "";
    r.onresult = (ev: any) => {
      let inter = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const s = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finais += s.trim() + " "; else inter += s;
      }
      setTxt((base + finais).trimStart()); setParcial(inter);
    };
    r.onerror = (ev: any) => { if (ev.error === "not-allowed") setErro("O microfone não foi liberado. Libere nas permissões do navegador ou digite a resposta."); };
    r.onend = () => { setEstado((s) => (s === "ouvindo" ? "" : s)); setParcial(""); };
    rec.current = r;
    try { r.start(); setEstado("ouvindo"); setErro(""); } catch { setErro("O microfone não abriu. Tente de novo."); }
  }

  const turnos = ent?.turns || [];
  const respostas = turnos.filter((t) => t.r === "p").length;
  const tema = ent?.tema || 1;
  const prop = ent?.proposta;
  const orb = estado === "falando" ? "animate-pulse" : estado === "ouvindo" ? "ring-4 ring-mint/60 animate-pulse" : estado === "pensando" ? "animate-spin [animation-duration:3s]" : "";

  return (
    <>
      <PageHead kicker="CREATOR · BASE" title="Entrevista de marca" desc="Uma conversa por voz com o dono da marca. A entrevistadora questiona, aprofunda e no fim propõe o briefing do perfil. Roda no Claude de quem responde.">
        <Link href={`/creator/perfis?tab=briefing${accId ? `&perfil=${accId}` : ""}`} className="btn btn-ghost btn-sm">Ver briefing</Link>
      </PageHead>

      {!loading && !accounts.length && <div className="card p-8 text-center"><p className="font-display text-xl font-bold">Cadastre um perfil primeiro</p></div>}

      {!!accounts.length && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="card p-3 flex flex-wrap items-center gap-2">
            <select className="input !w-auto flex-1 min-w-0" value={accId} onChange={(e) => setAccId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}</select>
            <button type="button" onClick={() => { const v = !voz; setVoz(v); try { localStorage.setItem("entrevista_voz", v ? "1" : "0"); speechSynthesis?.cancel(); } catch {} }} className={`btn btn-sm ${voz ? "btn-mint" : "btn-ghost"}`}>{voz ? "Voz ligada" : "Voz desligada"}</button>
          </div>

          <section className="card p-5 sm:p-7 flex flex-col items-center text-center gap-4" aria-live="polite">
            <div className="relative w-28 h-28">
              <div className={`absolute inset-0 rounded-full border-2 border-mint/40 ${orb}`} />
              <div className={`absolute inset-3 rounded-full border-2 border-dashed border-mint/60 ${estado === "pensando" ? "animate-spin [animation-duration:5s]" : ""}`} />
              <div className={`absolute inset-7 rounded-full grid place-items-center ${estado === "ouvindo" ? "bg-mint text-ink" : "bg-mint/20 text-mint"}`}><I.mic className="w-7 h-7" /></div>
            </div>
            <p className="font-mono text-[11px] tracking-widest uppercase text-fog min-h-[16px]">
              {estado === "pensando" ? "Pensando no seu Claude…" : estado === "falando" ? "Falando" : estado === "ouvindo" ? "Ouvindo" : ent?.status === "andamento" ? "Sua vez" : ent ? "Entrevista encerrada" : "Pronta para começar"}
            </p>
            {ent && <span className="text-[11px] text-mint bg-mint/10 rounded-full px-3 py-1">Tema {tema} de {TEMAS.length} · {TEMAS[tema - 1].split(":")[0]}</span>}
            <p className="font-display text-xl sm:text-2xl leading-snug max-w-[34ch] text-balance">{fala || "Uns 20 minutos de conversa para fechar o que falta da marca. Ela pergunta em voz alta, vocês respondem falando."}</p>
            <div className="w-full max-w-xs h-1 bg-panel2 rounded-full overflow-hidden"><div className="h-full bg-mint transition-all" style={{ width: `${ent?.status === "andamento" ? Math.round(((tema - 1) / TEMAS.length) * 100) : ent ? 100 : 0}%` }} /></div>
            {(!ent || ent.status !== "andamento") && (
              <div className="flex flex-wrap gap-2 justify-center">
                <button type="button" disabled={busy} onClick={() => comecar(!!ent)} className="btn btn-mint">{ent ? "Começar outra entrevista" : "Começar entrevista"}</button>
              </div>
            )}
            {ent?.status === "andamento" && !turnos.length && !busy && <button type="button" onClick={() => comecar(false)} className="btn btn-mint">Ouvir a primeira pergunta</button>}
            {estado === "pensando" && <p className="text-xs text-fog max-w-sm">A pergunta seguinte leva uns 10 a 30 segundos. Ela é feita pelo Claude de quem está respondendo, na janela do painel do HUB.</p>}
          </section>

          {ent?.status === "andamento" && !!turnos.length && (
            <section className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="label !mb-0 shrink-0" htmlFor="quem">Quem responde</label>
                <input id="quem" className="input" value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Ex.: Isa" />
              </div>
              {parcial && <p className="text-sm text-fog italic">{parcial}</p>}
              <textarea id="resposta" className="input min-h-[110px]" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Toque no microfone e fale. O texto aparece aqui e dá para corrigir antes de enviar." />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={mic} disabled={busy} className={`btn ${estado === "ouvindo" ? "btn-mint" : "btn-ghost"} !py-3`}><I.mic className="w-5 h-5" />{estado === "ouvindo" ? "Parar" : "Responder por áudio"}</button>
                <button type="button" onClick={() => enviar()} disabled={busy || !txt.trim()} className="btn btn-mint !py-3">Enviar resposta</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => falar(fala)} disabled={!fala} className="btn btn-ghost btn-sm">Repetir pergunta</button>
                <button type="button" onClick={() => enviar("Vamos pular esta. Próximo tema.")} disabled={busy} className="btn btn-ghost btn-sm">Pular</button>
                <button type="button" onClick={() => montarBriefing()} disabled={busy || respostas < 1} className="btn btn-ghost btn-sm ml-auto">Encerrar e montar briefing</button>
              </div>
            </section>
          )}

          {erro && <p className="text-danger text-sm">{erro}</p>}

          {prop && (
            <section className="card p-5 space-y-4 border-mint-dim">
              <div>
                <p className="font-display text-lg font-bold">Briefing proposto</p>
                {prop.resumo && <p className="text-sm text-fog mt-1">{prop.resumo}</p>}
              </div>
              {Object.keys(prop.campos || {}).length ? (
                <div className="space-y-3">
                  {Object.entries(prop.campos).map(([k, v]: any) => {
                    const atual = acc?.briefing?.[k];
                    const mostra = (x: any) => (Array.isArray(x) ? x.join(" · ") : x || "—");
                    return (
                      <label key={k} className="flex gap-3 items-start rounded-lg border border-line p-3 cursor-pointer">
                        <input type="checkbox" className="mt-1" checked={!!sel[k]} disabled={aplicado || ent?.status === "aprovada"} onChange={(e) => setSel({ ...sel, [k]: e.target.checked })} />
                        <span className="min-w-0 text-sm">
                          <span className="font-semibold block">{rotuloCampo(k)}</span>
                          <span className="block whitespace-pre-wrap">{mostra(v)}</span>
                          {atual && mostra(atual) !== mostra(v) && <span className="block text-[12px] text-fog mt-1">Antes: {mostra(atual).slice(0, 240)}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-fog">A entrevista não trouxe campos novos para o briefing.</p>}

              {prop.campanha && (prop.campanha.pecas?.length || prop.campanha.datas?.length || prop.campanha.oferta || prop.campanha.meta) ? (
                <div className="text-sm space-y-1">
                  <p className="label">Campanha</p>
                  {(prop.campanha.pecas || []).map((p: any, i: number) => <p key={i}>• {[p.nome, p.preco, p.tamanhos, p.obs].filter(Boolean).join(" · ")}</p>)}
                  {(prop.campanha.datas || []).map((d: string, i: number) => <p key={"d" + i}>• {d}</p>)}
                  {prop.campanha.oferta && <p>Oferta: {prop.campanha.oferta}</p>}
                  {prop.campanha.gravacao && <p>Gravação: {prop.campanha.gravacao}</p>}
                  {prop.campanha.meta && <p>Meta: {prop.campanha.meta}</p>}
                </div>
              ) : null}
              {!!prop.citacoes?.length && <div className="text-sm"><p className="label">Frases da marca</p>{prop.citacoes.map((c: string, i: number) => <p key={i} className="italic">“{c}”</p>)}</div>}
              {!!prop.pendencias?.length && <div className="text-sm"><p className="label">Ainda falta</p>{prop.pendencias.map((c: string, i: number) => <p key={i}>• {c}</p>)}</div>}

              {ent?.status === "aprovada" || aplicado
                ? <p className="text-sm text-mint">Aplicado no briefing do perfil.</p>
                : <div className="flex flex-wrap gap-2 justify-end">
                    <button type="button" onClick={() => montarBriefing()} disabled={busy} className="btn btn-ghost btn-sm">Montar de novo</button>
                    <button type="button" onClick={aplicar} disabled={!Object.values(sel).some(Boolean)} className="btn btn-mint btn-sm">Aplicar no briefing</button>
                  </div>}
            </section>
          )}

          {!!turnos.length && (
            <details className="card p-4">
              <summary className="cursor-pointer font-semibold text-sm">Conversa ({respostas} {respostas === 1 ? "resposta" : "respostas"})</summary>
              <div className="mt-3 space-y-2 text-sm">
                {turnos.map((t, i) => (
                  <p key={i} className={t.r === "e" ? "text-fog" : ""}><b className={t.r === "e" ? "text-mint font-semibold" : "font-semibold"}>{t.r === "e" ? "Entrevistadora" : t.quem || "Resposta"}{t.via === "claude" ? " (no Claude)" : ""}: </b>{t.t}</p>
                ))}
              </div>
            </details>
          )}

          <p className="text-xs text-fog">Também dá para fazer a entrevista no app do Claude, por voz: com o conector VINCIT HUB ligado, escolha o prompt “Entrevista de marca”. As respostas aparecem aqui.</p>
        </div>
      )}
    </>
  );
}
