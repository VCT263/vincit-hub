"use client";
import HubNav from "../HubNav";
import { I } from "../icons";

/* Gravação (a decupagem fica na folha do card do Quadro; teleprompter e Recuperador abrem pela visão geral), edição e acervo. A pós-produção é feita no Editor do HUB; o Premiere voltou ao menu (27/11) como segunda saída do Editor, para acabamento manual. */
const items = [
  { href: "/audiovisual", label: "Visão geral", Icon: I.grid },
  { href: "/audiovisual/ordem-do-dia", label: "Ordem do dia", Icon: I.calendar, group: "01 · Gravação", also: ["/audiovisual/decupagem", "/audiovisual/teleprompter"] },
  { href: "/audiovisual/editor", label: "Editor", Icon: I.video, group: "02 · Pós-produção" },
  { href: "/audiovisual/motion", label: "Motion", Icon: I.spark, group: "02 · Pós-produção" },
  { href: "/audiovisual/fotos", label: "Fotos", Icon: I.camera, group: "02 · Pós-produção" },
  { href: "/audiovisual/premiere", label: "Premiere", Icon: I.arrow, group: "02 · Pós-produção" },
  { href: "/audiovisual/midia", label: "Banco de mídia", Icon: I.folder, group: "03 · Acervo" },
  { href: "/audiovisual/kit", label: "Kit de estilo", Icon: I.pen, group: "03 · Acervo" },
];

export default function AudiovisualNav() {
  return <HubNav title="Audiovisual" desc="Gravação, edição e acervo" root="/audiovisual" items={items} />;
}
