"use client";
import HubNav from "./HubNav";
import { I } from "./icons";

/* Menu enxuto (27/11, aprovado pelo Vinícius): Planejador virou a vista Calendário do Quadro, Formatos virou aba do Laboratório,
   Estratégia junto do Raio-X. Tendências e Automações saíram do menu; as rotas continuam.
   28/11: Agendar publicações voltou ao menu (só com Instagram conectado). Desempenho & insights saiu do menu: abre pelo perfil
   em Perfis & briefing, que fica marcado enquanto a pessoa vê o desempenho (pedido do Vinícius, era duplicado).
   28/11: Raio-X e estratégia saiu do menu: é único de cada perfil e mora na aba Plano da ficha do perfil (Perfis & marca). */
const items = [
  { href: "/creator", label: "Visão geral", Icon: I.grid },
  { href: "/creator/perfis", label: "Perfis & marca", Icon: I.user, group: "Base", also: ["/creator/entrevista", "/creator/desempenho", "/creator/diagnostico", "/creator/estrategia"] },
  { href: "/creator/referencias", label: "Referências", Icon: I.bookmark, group: "01 · Análise" },
  { href: "/creator/brainstorm", label: "Brainstorm", Icon: I.spark, group: "02 · Criação" },
  { href: "/creator/laboratorio", label: "Laboratório", Icon: I.flask, group: "02 · Criação", also: ["/creator/formatos"] },
  { href: "/creator/producao", label: "Quadro de produção", Icon: I.board, group: "02 · Criação", also: ["/creator/pauta"] },
  { href: "/creator/agendar", label: "Agendar publicações", Icon: I.calendar, group: "03 · Publicação", needsIg: true },
];

export default function CreatorNav() {
  return <HubNav title="Creator" desc="Conteúdo e crescimento no Instagram" root="/creator" items={items} />;
}
