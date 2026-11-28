"use client";
import { useEffect } from "react";
import { useConfirmarExclusao } from "@/components/lixeira/ConfirmarExclusao";
import { registrarPedido } from "@/lib/lixeira";

/* Modal de confirmação único do HUB (senha só nas ações de risco): qualquer tela chama apagarComLixeira()/confirmarExclusao() de src/lib/lixeira.ts. */
export default function ExclusaoHost() {
  const { pedir, modal } = useConfirmarExclusao();
  useEffect(() => { registrarPedido((oque, definitivo, senha) => pedir({ oque, definitivo, senha })); return () => registrarPedido(null); }, [pedir]);
  return modal;
}
