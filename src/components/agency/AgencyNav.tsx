"use client";
import HubNav from "@/components/HubNav";
import { A } from "./icons";

/* Funil, Equipe e Equipamentos saíram do menu em 27/11 (rotas continuam; equipamentos são escolhidos na Ordem do dia). */
const items = [
  { href: "/agency", label: "Visão geral", Icon: A.home },
  { href: "/agency/clientes", label: "Clientes", Icon: A.users, group: "01 · Comercial" },
  { href: "/agency/financeiro", label: "Financeiro", Icon: A.money, group: "01 · Comercial" },
  { href: "/agency/propostas", label: "Propostas & orçamentos", Icon: A.doc, group: "01 · Comercial" },
];

export default function AgencyNav() {
  return <HubNav title="Gestor" desc="Clientes, financeiro e propostas" root="/agency" items={items} />;
}
