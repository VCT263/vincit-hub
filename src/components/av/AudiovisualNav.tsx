"use client";
import HubNav from "../HubNav";
import { I } from "../icons";

/* Fase 1: visão geral, teleprompter e banco de mídia. Pré-produção e pós entram nas próximas fases. */
const items = [
  { href: "/audiovisual", label: "Visão geral", Icon: I.grid },
  { href: "/audiovisual/teleprompter", label: "Teleprompter", Icon: I.prompter, group: "02 · Gravação" },
  { href: "/audiovisual/midia", label: "Banco de mídia", Icon: I.folder, group: "04 · Acervo" },
];

export default function AudiovisualNav() {
  return <HubNav title="Audiovisual" desc="Gravação, edição e acervo" root="/audiovisual" items={items} />;
}
