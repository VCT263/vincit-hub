"use client";
import { useState } from "react";
import { I } from "@/components/icons";
import { widgetScript } from "@/lib/widgetScript";

/** Minha conta → Widget no celular e no Mac: gera a chave pessoal e o script do Scriptable */
export default function WidgetSettings() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [open, setOpen] = useState(false);

  async function gerar(nova = false) {
    if (nova && !confirmTroca()) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/resumo/chave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nova }) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMsg({ t: r?.error || "Não foi possível gerar o widget." });
    setUrl(r.url); setOpen(true);
    if (nova) setMsg({ t: "Chave nova gerada. Cole o script de novo no Scriptable; o antigo parou de funcionar.", ok: true });
  }
  // troca de chave sem diálogo do navegador: pede um segundo toque
  const [armed, setArmed] = useState(false);
  function confirmTroca() {
    if (armed) { setArmed(false); return true; }
    setArmed(true); setTimeout(() => setArmed(false), 4000);
    return false;
  }

  async function copiar() {
    if (!url) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-mint").trim() || "#6eefb6";
    try {
      await navigator.clipboard.writeText(widgetScript(url, /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#6eefb6"));
      setMsg({ t: "Script copiado. Agora cole no Scriptable (passo 2).", ok: true });
    } catch { setMsg({ t: "Não consegui copiar. Toque e segure no botão ou tente em outro navegador." }); }
  }

  return (
    <section id="widget" className="card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-[10px] bg-panel2 grid place-items-center shrink-0 text-mint"><I.calendar className="w-5 h-5" /></span>
        <div>
          <p className="font-display font-bold">Widget no celular e no Mac</p>
          <p className="text-xs text-fog">Tarefas de hoje, atrasadas, próximo compromisso e o resumo da semana na tela inicial, na tela bloqueada e na mesa do Mac.</p>
        </div>
      </div>
      {!url ? (
        <button className="btn btn-mint w-full" disabled={busy} onClick={() => gerar()}>{busy ? "Gerando…" : "Criar meu widget"}</button>
      ) : (
        <>
          <button className="btn btn-mint w-full" onClick={copiar}><I.copy className="w-4 h-4" />Copiar script do widget</button>
          <button className="text-xs text-fog hover:text-paper underline" onClick={() => setOpen(!open)}>{open ? "Esconder" : "Ver"} o passo a passo</button>
          {open && (
            <ol className="text-sm space-y-2 list-decimal pl-5 marker:text-mint">
              <li>No iPhone, instale o app grátis <b>Scriptable</b> na App Store.</li>
              <li>Toque em <b>Copiar script do widget</b> aqui (abra esta página no iPhone). No Scriptable, toque em <b>+</b>, cole o texto e dê o nome <b>VINCIT</b>.</li>
              <li>Na tela inicial, segure num espaço vazio, toque em <b>Editar → Adicionar widget</b>, escolha <b>Scriptable</b> e o tamanho (pequeno, médio ou grande).</li>
              <li>Segure o widget, toque em <b>Editar widget</b> e em Script escolha <b>VINCIT</b>. Tocar nele abre o HUB.</li>
              <li><b>Tela bloqueada:</b> segure a tela bloqueada, <b>Personalizar → Tela bloqueada</b>, adicione o Scriptable e escolha VINCIT.</li>
              <li><b>No Mac</b> (macOS Sonoma ou mais novo, mesma conta Apple do iPhone): clique com o botão direito na mesa, <b>Editar Widgets</b>, procure Scriptable na seção do iPhone e arraste para a mesa. Depois clique com o botão direito no widget, <b>Editar</b>, e escolha VINCIT.</li>
            </ol>
          )}
          <p className="text-xs text-fog">O widget atualiza sozinho a cada 15 minutos, mais ou menos (quem decide é o iPhone). A chave do script é pessoal: quem tiver o script vê o seu resumo.</p>
          <button className={`btn btn-sm ${armed ? "btn-mint" : "btn-ghost"}`} disabled={busy} onClick={() => gerar(true)}>{armed ? "Toque de novo para trocar" : "Trocar chave (desliga o script antigo)"}</button>
        </>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.t}</p>}
    </section>
  );
}
