"use client";
import { useEffect, useState } from "react";
import { I } from "@/components/icons";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const b64 = (s: string) => {
  const p = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
};
const device = () => {
  const u = navigator.userAgent;
  return /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "Navegador";
};

/** Minha conta → App e notificações: instalar o HUB e ligar o push neste aparelho */
export default function PushSettings() {
  const [st, setSt] = useState<"carregando" | "sem_suporte" | "instalar_ios" | "negado" | "desligado" | "ligado">("carregando");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    (async () => {
      const isIos = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      setIos(isIos);
      if (isIos && !standalone) return setSt("instalar_ios");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setSt("sem_suporte");
      if (Notification.permission === "denied") return setSt("negado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setSt(sub && Notification.permission === "granted" ? "ligado" : "desligado");
    })().catch(() => setSt("sem_suporte"));
  }, []);

  async function ligar() {
    if (!KEY) return setMsg({ t: "As notificações ainda não foram configuradas no servidor (faltam as chaves VAPID na Vercel)." });
    setBusy(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setSt(perm === "denied" ? "negado" : "desligado"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(KEY) }));
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), device: device() }) }).then((x) => x.json());
      if (!r.ok) throw new Error(r.error);
      setSt("ligado");
      await testar();
    } catch (e: any) {
      setMsg({ t: "Não foi possível ligar as notificações. " + (e?.message || "") });
    } finally { setBusy(false); }
  }

  async function desligar() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ off: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setBusy(false); setSt("desligado"); setMsg({ t: "Notificações desligadas neste aparelho.", ok: true });
  }

  async function testar() {
    const r = await fetch("/api/push/test", { method: "POST" }).then((x) => x.json()).catch(() => null);
    setMsg(r?.ok ? { t: "Notificação de teste enviada. Se não chegou, confira se o modo Foco ou Não perturbe está ligado.", ok: true } : { t: r?.error || "Não foi possível enviar o teste." });
  }

  return (
    <section id="notificacoes" className="card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-[10px] bg-panel2 grid place-items-center shrink-0 text-mint"><I.bolt className="w-5 h-5" /></span>
        <div>
          <p className="font-display font-bold">App e notificações</p>
          <p className="text-xs text-fog">Instale o HUB como app e receba no celular e no Mac os lembretes de tarefa, o que vence hoje, os atrasos e os avisos da semana.</p>
        </div>
      </div>

      {st === "instalar_ios" && (
        <ol className="text-sm space-y-2 list-decimal pl-5 marker:text-mint">
          <li>Abra esta página no <b>Safari</b> do iPhone (iOS 16.4 ou mais novo).</li>
          <li>Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</li>
          <li>Abra o HUB pelo ícone novo, volte em <b>Minha conta</b> e toque em <b>Ativar notificações</b>.</li>
        </ol>
      )}
      {st === "sem_suporte" && <p className="text-sm text-fog">Este navegador não aceita notificações. No Mac, use o Safari (macOS Sonoma ou mais novo) ou o Chrome.</p>}
      {st === "negado" && <p className="text-sm text-fog">As notificações estão bloqueadas para o HUB. Libere em {ios ? "Ajustes → Notificações → VINCIT" : "configurações do navegador → Notificações"} e recarregue a página.</p>}
      {st === "desligado" && <button className="btn btn-mint w-full" disabled={busy} onClick={ligar}>{busy ? "Ligando…" : "Ativar notificações neste aparelho"}</button>}
      {st === "ligado" && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="chip-mint text-xs">Ligadas neste aparelho</span>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={testar}>Enviar teste</button>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={desligar}>Desligar</button>
        </div>
      )}
      {!ios && st !== "carregando" && (
        <p className="text-xs text-fog"><b className="text-paper">Instalar no Mac:</b> no Safari, menu Arquivo → Adicionar ao Dock. No Chrome, ícone de instalar na barra de endereço. Ative as notificações em cada aparelho.</p>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.t}</p>}
    </section>
  );
}
