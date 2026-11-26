"use client";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { useAccess } from "@/lib/useAccess";
import { can } from "@/lib/access";

/** Ferramentas avulsas que resolvem um problema específico do dia a dia da produtora. */
const SKILLS = [
  {
    key: "audiovisual:teleprompter", href: "/audiovisual/teleprompter", Icon: I.prompter, title: "Teleprompter",
    desc: "Puxa o roteiro do Creator, rola pela sua voz, espelha para o vidro do prompter e pode ser controlado pelo celular.",
    tags: ["Roteiro do Creator", "Celular", "Controle remoto"],
  },
  {
    key: "audiovisual:recuperador", href: "/audiovisual/skills/recuperador", Icon: I.refresh, title: "Recuperador de arquivos",
    desc: "Traz de volta vídeo Sony .RSV ou MP4 que não abre depois de a bateria acabar ou o cartão sair, e áudio WAV cortado.",
    tags: ["Sony XAVC S", "WAV", "Roda no seu computador"],
  },
];

export default function Skills() {
  const acc = useAccess();
  return (
    <>
      <PageHead kicker="AUDIOVISUAL" title="Skills" desc="Ferramentas para resolver problemas pontuais de gravação e pós-produção, direto no navegador." />
      <div className="grid md:grid-cols-2 gap-4">
        {SKILLS.map(({ key, href, Icon, title, desc, tags }, i) => {
          const ok = !acc || can(acc.tools, key);
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="w-10 h-10 rounded-xl bg-mint/10 text-mint grid place-items-center"><Icon className="w-5 h-5" /></span>
                {!ok && <span className="chip">fora do seu plano</span>}
              </div>
              <p className="font-display text-xl font-extrabold mt-4">{title}</p>
              <p className="text-sm text-fog mt-1">{desc}</p>
              <div className="flex flex-wrap gap-2 mt-4">{tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
            </>
          );
          return ok ? (
            <Link key={key} href={href} className="card p-5 rise hover:border-mint-dim transition-colors" style={{ animationDelay: `${i * 0.04}s` }}>{body}</Link>
          ) : (
            <div key={key} className="card p-5 opacity-60">{body}</div>
          );
        })}
        <div className="card p-5 border-dashed flex flex-col justify-center text-sm text-fog">
          <p className="font-semibold text-paper">Próximas skills</p>
          <p className="mt-1">Recuperação de H.265 (XAVC HS) e de outras câmeras.</p>
        </div>
      </div>
    </>
  );
}
