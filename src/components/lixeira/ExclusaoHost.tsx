"use client";
import { useEffect } from "react";
import { useConfirmarExclusao } from "@/components/lixeira/ConfirmarExclusao";
import { registrarPedido } from "@/lib/lixeira";

/* Modal de senha único do HUB: qualquer tela chama apagarComLixeira()/confirmarExclusao() de src/lib/lixeira.ts. */
export default function ExclusaoHost() {
  const { pedir, modal } = useConfirmarExclusao();
  useEffect(() => { registrarPedido((oque, definitivo) => pedir({ oque, definitivo })); return () => registrarPedido(null); }, [pedir]);
  return modal;
}
