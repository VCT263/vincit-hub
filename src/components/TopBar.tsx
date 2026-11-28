"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { I } from "./icons";
import { A } from "./agency/icons";
import { useAccess } from "@/lib/useAccess";
import { hubAllowed } from "@/lib/access";
import Bell from "./dia/Bell";

/* rotas de Seu dia (a aba "/" fica ativa em todas) */
const DIA = ["/tarefas", "/agenda", "/rotina", "/projetos", "/avisos"];

/* Navegador horizontal: troca entre Seu dia e os hubs sem sair do topo */
const tabs = [
  { href: "/", label: "Seu dia", Icon: A.home },
  { href: "/creator", label: "Creator", Icon: I.camera, hub: "creator" as const },
  { href: "/agency", label: "Gestor", Icon: I.briefcase, hub: "agency" as const },
  { href: "/audiovisual", label: "Audiovisual", Icon: I.video, hub: "audiovisual" as const },
  { href: "/design", label: "Design", Icon: I.palette, hub: "design" as const },
  { href: "/ecommerce", label: "E-commerce", Icon: I.bag, hub: "ecommerce" as const },
];

export default function TopBar() {
  const path = usePathname();
  const acc = useAccess();
  const visible = tabs.filter((t) => !t.hub || !acc || hubAllowed(acc.tools, t.hub));
  const isActive = (h: string) => (h === "/" ? path === "/" || DIA.some((d) => path === d || path.startsWith(d + "/")) : path.startsWith(h));
  const nav = (
    <nav className="flex gap-1 bg-panel border border-line rounded-xl p-1 overflow-x-auto scroll-thin">
      {visible.map(({ href, label, Icon }) => (
        <Link key={href} href={href} data-tour={"hub-" + href}
          className={`flex-1 shrink-0 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 rounded-[9px] text-sm font-semibold whitespace-nowrap transition-colors ${isActive(href) ? "bg-mint text-[var(--color-on-mint,#06140e)]" : "text-fog hover:text-paper hover:bg-panel2"}`}>
          <Icon className="w-4 h-4" /> {label}
        </Link>
      ))}
    </nav>
  );
  /* celular: barra fixa embaixo só com ícones, como aplicativo (nome em aria-label e no title) */
  const bottom = (
    <nav aria-label="Áreas do HUB" className="bottom-nav md:hidden print:hidden fixed z-40 rounded-2xl border border-line bg-panel shadow-[0_8px_30px_rgba(0,0,0,.45)]"
      // solta das bordas: os cantos arredondados do iPhone e a barra de gestos não cortam os ícones
      style={{ left: "max(14px, env(safe-area-inset-left))", right: "max(14px, env(safe-area-inset-right))", bottom: "max(12px, calc(env(safe-area-inset-bottom) + 6px))" }}>
      <div className="flex items-stretch justify-around px-1.5 h-14">
        {visible.map(({ href, label, Icon }) => {
          const on = isActive(href);
          return (
            <Link key={href} href={href} data-tour={"hub-" + href} aria-label={label} title={label} aria-current={on ? "page" : undefined}
              className="flex-1 grid place-items-center">
              <span className={`grid place-items-center w-11 h-9 rounded-xl transition-colors ${on ? "bg-mint text-[var(--color-on-mint,#06140e)]" : "text-fog active:bg-panel2"}`}>
                <Icon className="w-[22px] h-[22px]" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
  return (
    <>
    <header className="print:hidden sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="h-16 flex items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo className="h-5" />
          <span className="font-mono text-[10px] text-fog border border-line rounded-md px-1.5 py-0.5">HUB</span>
        </Link>
        <div className="hidden md:block">{nav}</div>
        <form action="/auth/signout" method="post" className="ml-auto flex items-center gap-2">
          <span data-tour="sino" className="inline-flex"><Bell /></span>
          {acc?.role === "superadmin" && <Link href="/admin" className="btn btn-ghost btn-sm text-mint">Admin</Link>}
          <Link href="/conta/lixeira" data-tour="lixeira" className="btn btn-ghost btn-sm" aria-label="Lixeira" title="Lixeira"><I.trash className="w-3.5 h-3.5" /></Link>
          <Link href="/conta" data-tour="conta" className="btn btn-ghost btn-sm"><I.user className="w-3.5 h-3.5" /><span className="hidden sm:inline">Minha conta</span></Link>
          <button className="btn btn-ghost btn-sm" aria-label="Sair"><I.logout className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sair</span></button>
        </form>
      </div>
    </header>
    {bottom}
    </>
  );
}
