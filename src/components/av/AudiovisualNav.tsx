"use client";
import HubNav from "../HubNav";
import { I } from "../icons";

/* Pré-produção (decupagem, ordem do dia), gravação (Ferramentas, que inclui o teleprompter) e acervo. A pós-produção entra na Fase 3. */
const items = [
  { href: "/audiovisual", label: "Visão geral", Icon: I.grid },
  { href: "/audiovisual/decupagem", label: "Decupagem", Icon: I.board, group: "01 · Pré-produção" },
  { href: "/audiovisual/ordem-do-dia", label: "Ordem do dia", Icon: I.calendar, group: "01 · Pré-produção" },
  { href: "/audiovisual/ferramentas", label: "Ferramentas", Icon: I.spark, group: "02 · Gravação", also: ["/audiovisual/teleprompter"] },
  { href: "/audiovisual/midia", label: "Banco de mídia", Icon: I.folder, group: "04 · Acervo" },
];

export default function AudiovisualNav() {
  return <HubNav title="Audiovisual" desc="Gravação, edição e acervo" root="/audiovisual" items={items} />;
}
