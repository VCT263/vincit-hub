import { createClient } from "@/lib/supabase/client";

/* Lixeira do HUB (regra do Vinícius, 27/11/2026): nada é apagado na hora.
   Excluir pede a senha de novo, o item ganha deleted_at (ou archived_at, nas marcas) e fica
   15 dias na lixeira, de onde pode ser recuperado. Depois disso o cron diário hub-lixeira
   (private.lixeira_purge, tabelas registradas em private.lixeira_tabelas) apaga de vez. */
export const LIXEIRA_DIAS = 15;

/** dias que faltam para o item sair da lixeira de vez */
export const diasRestantes = (at: string) => Math.max(0, Math.ceil(LIXEIRA_DIAS - (Date.now() - new Date(at).getTime()) / 864e5));

export const prazoTexto = (at: string) => { const n = diasRestantes(at); return n === 0 ? "Sai da lixeira hoje" : `Sai da lixeira em ${n} ${n === 1 ? "dia" : "dias"}`; };

/* Lixeira geral (tabelas sem deleted_at): a linha é apagada de verdade, mas o banco guarda uma cópia
   (com tudo que sai junto em cascata) em public.lixeira_lotes + private.lixeira_itens por 15 dias.
   Recuperar devolve tudo como era (public.lixeira_restaurar). Ver supabase/migrations/20261127180000_lixeira_geral.sql. */

type Filtro = Record<string, string | number | boolean | (string | number)[]>;
export type PassoLixeira = { tabela: string; filtro: Filtro };

// a senha é pedida pelo modal global (ExclusaoHost no layout)
let pedirGlobal: ((oque: string) => Promise<boolean>) | null = null;
export const registrarPedido = (f: typeof pedirGlobal) => { pedirGlobal = f; };

/** pede a senha de novo (segunda autenticação). Sem o modal montado, cai no confirm do navegador. */
export function confirmarExclusao(oque: string) {
  if (pedirGlobal) return pedirGlobal(oque);
  return Promise.resolve(typeof window !== "undefined" && window.confirm(`Mandar ${oque} para a lixeira?`));
}

/**
 * Excluir qualquer coisa do HUB: pede a senha e manda para a lixeira (15 dias para recuperar).
 * oque: como aparece na frase "Vai {oque} para a lixeira" (ex.: 'a tarefa "Gravar reels"').
 * rotulo: como o item aparece na Lixeira. semSenha: só para trocas internas (ex.: substituir planos).
 * Devolve true quando apagou.
 */
export async function apagarComLixeira(o: { tabela?: string; filtro?: Filtro; passos?: PassoLixeira[]; oque: string; rotulo: string; link?: string; semSenha?: boolean }): Promise<boolean> {
  if (!o.semSenha && !(await confirmarExclusao(o.oque))) return false;
  const passos = o.passos || [{ tabela: o.tabela!, filtro: o.filtro! }];
  const { error } = await createClient().rpc("lixeira_apagar_varios", { p_passos: passos, p_rotulo: o.rotulo, p_link: o.link || null });
  if (error) {
    if (/nada para apagar/.test(error.message)) return true;
    if (typeof window !== "undefined") window.alert("Não deu para excluir agora: " + error.message);
    return false;
  }
  return true;
}
