"use client";
import HubNav from "../HubNav";
import { I } from "../icons";

/* Etapa 1: visão geral, plano do trimestre e calendário de ações. Vendas e estoque ficam no ERP da loja. */
const items = [
  { href: "/ecommerce", label: "Visão geral", Icon: I.grid },
  { href: "/ecommerce/plano", label: "Plano do trimestre", Icon: I.target, group: "01 · Metas" },
  { href: "/ecommerce/acoes", label: "Ações e campanhas", Icon: I.calendar, group: "02 · Vendas" },
];

export default function EcommerceNav() {
  return <HubNav title="E-commerce" desc="Plano de 90 dias da loja" root="/ecommerce" items={items} />;
}
