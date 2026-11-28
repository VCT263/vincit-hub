"use client";
import { useEffect, useState } from "react";
import Ajuda from "@/components/ajuda/Ajuda";
import { NOVIDADES, VERSAO_IA } from "@/lib/novidades";

import { CLAUDE_PANEL_URL } from "@/lib/painelApp";
/** link do painel do HUB publicado no Claude (artifact) */
export { CLAUDE_PANEL_URL };

/** /conta: como ligar o Claude ao HUB pelo conector (MCP) */
export default function ClaudeSettings() {
  const [url, setUrl] = useState("https://vincit-hub.vercel.app/api/mcp");
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${location.origin}/api/mcp`), []);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <section id="claude" className="card p-5 space-y-4 scroll-mt-6">
      <div>
        <p className="font-display font-bold flex items-center gap-2">Usar no Claude <Ajuda id="claude" /></p>
        <p className="text-sm text-fog mt-1">Ligue o Claude ao seu HUB para criar campanhas, roteiros, ideias e análises direto na conversa. A IA roda na sua assinatura do Claude.</p>
      </div>
      <div>
        <p className="label">URL do conector</p>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copy} className="btn btn-mint btn-sm shrink-0">{copied ? "Copiado" : "Copiar"}</button>
        </div>
      </div>
      <ol className="text-sm space-y-1.5 list-decimal pl-5 text-fog">
        <li>No Claude, abra <span className="text-paper">Configurações › Conectores › Adicionar conector personalizado</span>.</li>
        <li>Nome <span className="text-paper">VINCIT HUB</span> e a URL acima. Clique em Adicionar e depois em Conectar.</li>
        <li>Entre com o login do HUB e clique em <span className="text-paper">Permitir</span>.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir conectores do Claude</a>
        {CLAUDE_PANEL_URL && <a href={CLAUDE_PANEL_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir o painel do HUB no Claude</a>}
      </div>
      <p className="text-sm text-fog">No Claude, escolha o prompt <span className="text-paper">Começar no HUB</span> (botão + › VINCIT HUB). Regras, ferramentas e prompts se atualizam sozinhos a cada versão do HUB.</p>
      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Novidades de IA <span className="font-mono text-[11px] text-fog ml-1">versão {VERSAO_IA}</span></summary>
        <ul className="mt-3 space-y-3">
          {NOVIDADES.map((n) => (
            <li key={n.versao} className="text-sm">
              <p className="font-semibold">{n.titulo} <span className="font-mono text-[11px] text-fog">{n.data.split("-").reverse().join("/")}</span></p>
              <p className="text-fog">{n.texto}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
