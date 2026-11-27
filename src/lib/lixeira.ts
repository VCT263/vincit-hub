/* Lixeira do HUB (regra do Vinícius, 27/11/2026): nada é apagado na hora.
   Excluir pede a senha de novo, o item ganha deleted_at (ou archived_at, nas marcas) e fica
   15 dias na lixeira, de onde pode ser recuperado. Depois disso o cron diário hub-lixeira
   (private.lixeira_purge, tabelas registradas em private.lixeira_tabelas) apaga de vez. */
export const LIXEIRA_DIAS = 15;

/** dias que faltam para o item sair da lixeira de vez */
export const diasRestantes = (at: string) => Math.max(0, Math.ceil(LIXEIRA_DIAS - (Date.now() - new Date(at).getTime()) / 864e5));

export const prazoTexto = (at: string) => { const n = diasRestantes(at); return n === 0 ? "Sai da lixeira hoje" : `Sai da lixeira em ${n} ${n === 1 ? "dia" : "dias"}`; };
