"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* Aba "Cor" do Audiovisual: o editor de Fotos e a Biblioteca de LUTs, com os mesmos looks nos dois. */
const ABAS = [
  { href: "/audiovisual/fotos", label: "Fotos" },
  { href: "/audiovisual/luts", label: "Biblioteca de LUTs" },
];

export default function CorTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1.5 mb-4 border-b border-line pb-2">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} className={`chip ${path.startsWith(a.href) ? "chip-mint" : ""}`}>{a.label}</Link>
      ))}
    </div>
  );
}
