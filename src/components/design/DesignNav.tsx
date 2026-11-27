"use client";
import HubNav from "../HubNav";
import { I } from "../icons";

/* Marca (criação de identidade, do briefing ao manual) e Peças (carrossel e estático com o kit da marca). */
const items = [
  { href: "/design", label: "Visão geral", Icon: I.grid },
  { href: "/design/marcas", label: "Criação de marca", Icon: I.shapes, group: "01 · Marca" },
  { href: "/design/pecas", label: "Carrosséis e peças", Icon: I.cards, group: "02 · Peças" },
  { href: "/design/mockups", label: "Mockups fotográficos", Icon: I.camera, group: "03 · Biblioteca" },
];

export default function DesignNav() {
  return <HubNav title="Design" desc="Marca, carrosséis e peças" root="/design" items={items} />;
}
