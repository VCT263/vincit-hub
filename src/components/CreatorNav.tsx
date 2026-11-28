"use client";
import HubNav from "./HubNav";
import { I } from "./icons";

/* Menu enxuto (27/11, aprovado pelo Vinícius): Planejador virou a vista Calendário do Quadro, Formatos virou aba do Laboratório,
   Estratégia junto do Raio-X. Tendências e Automações saíram do menu; as rotas continuam.
   28/11: Agendar publicações voltou ao menu (só com Instagram conectado).
   28/11 (pedido do Vinícius): "Desempenho & insights" saiu do menu; o perfil abre dentro de Perfis & briefing. */
const items = [
  { href: "/creator", label: "Visão geral", Icon: I.grid },
  { href: "/creator/perfis", label: "Perfis & briefing", Icon: I.user, group: "Base", also: ["/creator/entrevista", "/creator/desempenho"] },
  { href: "/creator/referencias", label: "Referências", Icon: I.bookmark, group: "01 · Análise" },
  { href: "/creator/diagnostico", label: "Raio-X e estratégia", Icon: I.target, group: "01 · Análise", also: ["/creator/estrategia"] },
  { href: "/creator/brainstorm", label: "Brainstorm", Icon: I.spark, group: "02 · Criação" },
  { href: "/creator/laboratorio", label: "Laboratório", Icon: I.flask, group: "02 · Criação", also: ["/creator/formatos"] },
  { href: "/creator/producao", label: "Quadro de produção", Icon: I.board, group: "02 · Criação", also: ["/creator/pauta"] },
  { href: "/creator/agendar", label: "Agendar publicações", Icon: I.calendar, group: "03 · Publicação", needsIg: true },
];

export default function CreatorNav() {
  return <HubNav title="Creator" desc="Conteúdo e crescimento no Instagram" root="/creator" items={items} />;
}
