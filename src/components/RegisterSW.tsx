"use client";
import { useEffect } from "react";

/** registra o service worker das notificações push (public/sw.js) */
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
