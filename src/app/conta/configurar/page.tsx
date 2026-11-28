"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { I } from "@/components/icons";
import Ajuda from "@/components/ajuda/Ajuda";
import { refazerTour } from "@/components/ajuda/Tour";
import { useAccess } from "@/lib/useAccess";
import { hubAllowed } from "@/lib/access";
import { CLAUDE_PANEL_URL } from "@/components/ClaudeSettings";

type Estado = "ok" | "parcial" | "falta" | "sem";
type Item = {
  id: string; nivel: "obrigatorio" | "recomendado" | "opcional";
  titulo: string; serve: string; estado: Estado; detalhe?: string;
  passos: string[]; acao?: { href: string; label: string; externo?: boolean };
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");

const CHIP: Record<Estado, { t: string; c: string }> = {
  ok: { t: "Pronto", c: "bg-mint/15 text-mint" },
  parcial: { t: "Em parte", c: "bg-[#f5c84c]/15 text-[#f5c84c]" },
  falta: { t: "Falta", c: "bg-danger/15 text-danger" },
  sem: { t: "Confira", c: "bg-panel2 text-fog" },
};

export default function Configurar() {
  const acc = useAccess();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    if (!acc) return;
    const s = createClient();
    const creator = hubAllowed(acc.tools, "creator");
    const gestor = hubAllowed(acc.tools, "agency");
    const av = hubAllowed(acc.tools, "audiovisual");
    (async () => {
      const { data: { user } } = await s.auth.getUser();
      if (!user) return;
      const cnt = (q: any) => q.then((r: any) => r.count || 0).catch(() => 0);
      const [perfis, ig, done, pend, g, avs, push, prof, prem] = await Promise.all([
        creator ? s.from("ig_accounts").select("id,briefing,niche").then((r) => r.data || []) : Promise.resolve([] as any[]),
        creator ? cnt(s.from("ig_accounts").select("id", { count: "exact", head: true }).not("ig_user_id", "is", null)) : 0,
        s.from("ai_requests").select("done_at").eq("status", "done").order("done_at", { ascending: false }).limit(1).then((r) => r.data?.[0] || null),
        s.from("ai_requests").select("created_at").eq("status", "pending").order("created_at").limit(1).then((r) => r.data?.[0] || null),
        s.rpc("google_status").then((r) => (r.data as any) || { connected: false }),
        av ? s.from("av_settings").select("drive_folder_id,drive_folder_name,last_sync_at").eq("owner_id", user.id).maybeSingle().then((r) => r.data) : null,
        cnt(s.from("push_subscriptions").select("id", { count: "exact", head: true })),
        s.from("profiles").select("sync_code,brand_color,brand_logo_url").eq("id", user.id).maybeSingle().then((r) => r.data),
        av ? cnt(s.from("av_edit_sessions").select("id", { count: "exact", head: true })) : 0,
      ]);

      const comBriefing = perfis.filter((p: any) => (p.briefing && Object.keys(p.briefing).length) || p.niche).length;
      const pendVelho = pend && Date.now() - new Date(pend.created_at).getTime() > 10 * 60e3;
      const lista: Item[] = [
        { id: "conta", nivel: "obrigatorio", titulo: "Conta e senha", serve: "Entrar no HUB e confirmar exclusões.", estado: "ok", detalhe: "Você já está dentro.",
          passos: ["Troque a senha em Minha conta quando quiser.", "A mesma senha confirma toda exclusão (vai para a lixeira por 15 dias)."], acao: { href: "/conta", label: "Minha conta" } },
        { id: "claude", nivel: "obrigatorio", titulo: "Conector do Claude", serve: "É a IA do HUB: os botões de IA viram pedidos que o Claude responde pela sua assinatura, sem custo extra.",
          estado: pendVelho ? "parcial" : done ? "ok" : "falta",
          detalhe: pendVelho ? `Há pedido esperando desde ${fmt(pend.created_at)}. Abra o painel do HUB no Claude.` : done ? `Funcionando. Última resposta em ${fmt(done.done_at)}.` : "Ainda não vimos nenhuma resposta do Claude nesta conta.",
          passos: ["No Claude: Configurações › Conectores › Adicionar conector personalizado.", "Nome VINCIT HUB e a URL que está em Minha conta › Usar no Claude.", "Clique em Conectar, entre com o login do HUB e clique em Permitir.", "Deixe o painel do HUB aberto numa aba do Claude com Responder automaticamente ligado."],
          acao: { href: "/conta#claude", label: "Ver a URL do conector" } },
      ];
      if (creator) lista.push(
        { id: "perfis", nivel: "obrigatorio", titulo: "Perfis de trabalho com briefing", serve: "Sua marca, Vinst e ISYS. Sem briefing a IA cria no escuro.",
          estado: !perfis.length ? "falta" : comBriefing < perfis.length ? "parcial" : "ok",
          detalhe: perfis.length ? `${perfis.length} perfil(is), ${comBriefing} com briefing.` : "Nenhum perfil cadastrado.",
          passos: ["Abra Creator › Perfis & briefing.", "Cadastre cada perfil e preencha nicho, objetivos, voz da marca e briefing."], acao: { href: "/creator/perfis", label: "Abrir perfis" } },
        { id: "instagram", nivel: "obrigatorio", titulo: "Instagram (Meta)", serve: "Puxa métricas e posts reais para Desempenho, Raio-X e a análise de 7 dias.",
          estado: ig ? "ok" : "falta", detalhe: ig ? `${ig} conta(s) conectada(s).` : "Nenhuma conta do Instagram conectada.",
          passos: ["Em Creator › Perfis & briefing, clique em Conectar via Meta.", "Entre na conta do Facebook dona da Página ligada ao Instagram e marque só as Páginas certas.", "Conta de outra pessoa (ex.: a loja) precisa ser testadora do app antes de conectar."],
          acao: { href: "/creator/perfis", label: "Conectar Instagram" } },
      );
      lista.push({ id: "google", nivel: "obrigatorio", titulo: "Google Drive e Agenda", serve: "O Drive é o Banco de mídia do HUB: brutos, referências, marca e tudo que o HUB exporta ficam lá, e o Claude acha sozinho. A Agenda recebe tarefas com prazo.",
        estado: g.connected ? (g.last_error ? "parcial" : "ok") : "falta",
        detalhe: g.connected ? `Conectado${g.email ? " como " + g.email : ""}.${g.last_error ? " Erro no último envio: " + g.last_error : ""}` : "Não conectado.",
        passos: gestor ? ["Em Minha conta › Google Agenda, clique em Conectar.", "Aceite Agenda e Drive na tela do Google."] : ["A conexão com o Google aparece em Minha conta para quem tem o hub Gestor. Peça ao administrador."],
        acao: gestor ? { href: "/conta#google", label: "Conectar Google" } : undefined });
      if (av) lista.push(
        { id: "drive", nivel: "obrigatorio", titulo: "Pasta do Banco de mídia", serve: "Escolhe a pasta do Drive que vira o acervo: Entrada, Meus conteúdos (brutos e vídeos) e Técnico (referências, marca, trilhas).",
          estado: avs?.drive_folder_id ? "ok" : "falta", detalhe: avs?.drive_folder_id ? `Pasta ${avs.drive_folder_name || ""}${avs.last_sync_at ? ", sincronizada em " + fmt(avs.last_sync_at) : ""}.` : "Nenhuma pasta escolhida.",
          passos: ["Conecte o Google antes.", "Abra Audiovisual › Banco de mídia e escolha a pasta raiz."], acao: { href: "/audiovisual/midia", label: "Abrir Banco de mídia" } },
        { id: "premiere", nivel: "opcional", titulo: "Plugin do Premiere", serve: "Manda a timeline do Premiere ao HUB e aplica o plano de edição que o Claude devolve.",
          estado: prem ? "ok" : "sem", detalhe: prem ? `${prem} edição(ões) recebidas do Premiere.` : "Nenhuma edição recebida ainda.",
          passos: ["Baixe o plugin (.ccx) em Audiovisual › Premiere e abra com dois cliques.", "No Premiere: Janela › Extensões › VINCIT HUB, e entre com o login do HUB."], acao: { href: "/audiovisual/premiere", label: "Abrir Premiere" } },
      );
      lista.push(
        { id: "adobe", nivel: "opcional", titulo: "Adobe no Claude", serve: "No chat do Claude: tirar fundo, redimensionar para redes, retocar fotos e modelos do Express.",
          estado: "sem", detalhe: "Fica no Claude; o HUB não consegue ver se está ligado.",
          passos: ["No Claude: Configurações › Conectores, procure Adobe e conecte com a sua conta Adobe.", "Os apps do Mac (Premiere, Photoshop) pelo Claude só chegam em 2027."], acao: { href: "https://claude.ai/settings/connectors", label: "Abrir conectores", externo: true } },
        { id: "push", nivel: "opcional", titulo: "Notificações e app", serve: "Avisos de prazo no celular e no computador.",
          estado: push ? "ok" : "falta", detalhe: push ? `${push} aparelho(s) recebendo.` : "Nenhum aparelho recebendo.",
          passos: ["No celular, abra o HUB e adicione à tela de início.", "Em Minha conta › App e notificações, clique em Ativar."], acao: { href: "/conta#notificacoes", label: "Ativar" } },
        { id: "widget", nivel: "opcional", titulo: "Widget do dia", serve: "O dia na tela inicial do celular ou do Mac.", estado: "sem", detalhe: "O HUB não consegue ver se o widget está instalado.",
          passos: ["Em Minha conta › Widget, copie o link do calendário e assine no seu aparelho."], acao: { href: "/conta#widget", label: "Configurar widget" } },
        { id: "arc", nivel: "opcional", titulo: "Arc Route", serve: "Junta as tarefas e a agenda do Arc Route com as do HUB.", estado: prof?.sync_code ? "ok" : "sem",
          detalhe: prof?.sync_code ? "Código salvo." : "Só se você usa o Arc Route.", passos: ["No Arc Route: Configurações › Sincronia, copie o código.", "Cole em Minha conta › Sincronia com o Arc Route."], acao: { href: "/conta#arc", label: "Colar código" } },
        { id: "marca", nivel: "opcional", titulo: "Personalização", serve: "Cor e logo da sua marca no sistema.", estado: prof?.brand_color || prof?.brand_logo_url ? "ok" : "sem",
          detalhe: prof?.brand_color || prof?.brand_logo_url ? "Marca aplicada." : "Usando as cores do VINCIT.", passos: ["Em Minha conta › Personalização, escolha a cor e envie a logo."], acao: { href: "/conta", label: "Personalizar" } },
      );
      setItens(lista);
    })();
  }, [acc]);

  const obrig = (itens || []).filter((x) => x.nivel === "obrigatorio");
  const prontos = obrig.filter((x) => x.estado === "ok").length;
  const grupos: { k: Item["nivel"]; t: string; d: string }[] = [
    { k: "obrigatorio", t: "Obrigatório", d: "Sem isso o fluxo não roda." },
    { k: "recomendado", t: "Recomendado", d: "Ajuda, mas o fluxo roda sem." },
    { k: "opcional", t: "Opcional", d: "Liga quando for usar." },
  ];

  return (
    <main className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between px-5 md:px-10 py-5 border-b border-line">
        <Link href="/"><Logo className="h-6" /></Link>
        <Link href="/conta" className="btn btn-ghost btn-sm"><I.back className="w-3.5 h-3.5" />Minha conta</Link>
      </header>
      <div className="max-w-xl mx-auto px-5 py-10 space-y-6">
        <div>
          <p className="font-mono text-[11px] text-mint tracking-widest uppercase">Primeiros passos</p>
          <h1 className="font-display text-3xl font-extrabold mt-1 flex items-center gap-2">Guia de configuração <Ajuda tela /></h1>
        </div>

        <section className="card p-5">
          {!itens ? <p className="text-sm text-fog">Conferindo a sua conta…</p> : (
            <>
              <div className="flex items-end justify-between gap-3">
                <p className="font-display text-4xl font-extrabold">{prontos}<span className="text-fog text-2xl">/{obrig.length}</span></p>
                <p className="text-sm text-fog text-right">{prontos === obrig.length ? "Tudo que é obrigatório está pronto." : "obrigatórios prontos"}</p>
              </div>
              <div className="h-2 rounded-full bg-line mt-3 overflow-hidden"><div className="h-full bg-mint rounded-full transition-all" style={{ width: `${obrig.length ? (prontos / obrig.length) * 100 : 0}%` }} /></div>
              <button type="button" onClick={refazerTour} className="btn btn-ghost btn-sm mt-4">Refazer o tour de boas-vindas</button>
            </>
          )}
        </section>

        {itens && grupos.map((g) => {
          const lista = itens.filter((x) => x.nivel === g.k);
          if (!lista.length) return null;
          return (
            <section key={g.k} className="space-y-2">
              <div className="px-1"><p className="font-display font-bold text-lg">{g.t}</p><p className="text-xs text-fog">{g.d}</p></div>
              {lista.map((x) => {
                const open = aberto === x.id;
                return (
                  <div key={x.id} className="card">
                    <button type="button" onClick={() => setAberto(open ? null : x.id)} className="w-full flex items-center gap-3 p-4 text-left" aria-expanded={open}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${x.estado === "ok" ? "bg-mint" : x.estado === "parcial" ? "bg-[#f5c84c]" : x.estado === "falta" ? "bg-danger" : "bg-line"}`} />
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold block">{x.titulo}</span>
                        <span className="text-xs text-fog block truncate">{x.detalhe}</span>
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-md shrink-0 ${CHIP[x.estado].c}`}>{CHIP[x.estado].t}</span>
                      <span className={`text-fog transition-transform ${open ? "rotate-90" : ""}`}>›</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 -mt-1 space-y-3">
                        <p className="text-sm text-fog">{x.serve}</p>
                        {x.detalhe && <p className="text-xs bg-panel2 rounded-lg px-3 py-2">{x.detalhe}</p>}
                        <ol className="space-y-1.5 text-sm">
                          {x.passos.map((p, i) => (
                            <li key={i} className="flex gap-2"><span className="w-5 h-5 shrink-0 rounded-full bg-mint/15 text-mint text-[11px] font-bold grid place-items-center">{i + 1}</span><span>{p}</span></li>
                          ))}
                        </ol>
                        {x.acao && (x.acao.externo
                          ? <a href={x.acao.href} target="_blank" rel="noreferrer" className="btn btn-mint btn-sm w-full sm:w-auto">{x.acao.label}</a>
                          : <Link href={x.acao.href} className="btn btn-mint btn-sm w-full sm:w-auto">{x.acao.label}</Link>)}
                        {x.id === "claude" && CLAUDE_PANEL_URL && <a href={CLAUDE_PANEL_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm w-full sm:w-auto sm:ml-2">Abrir o painel do HUB no Claude</a>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </main>
  );
}
