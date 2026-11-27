"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Reaplica a largura compacta do celular a cada troca de rota (ver lib/compacto.ts) */
export default function Compacto() {
  const path = usePathname();
  useEffect(() => { (window as any).__compacto?.(); }, [path]);
  return null;
}
