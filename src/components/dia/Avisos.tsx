"use client";
import Central from "@/components/avisos/Central";

export type Aviso = { id: string; title: string; href?: string | null; action?: string; tone?: "danger" | "warn" | "muted" };

/** Avisos do Resumo: os 6 mais recentes da central, com as mesmas ações rápidas */
export default function Avisos(_: { fallback?: Aviso[] }) {
  return <Central modo="resumo" limite={6} />;
}
