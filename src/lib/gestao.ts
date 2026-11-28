/** Gestão do negócio (28/11/2026): contas que o Gestor usa para dizer se a empresa está saudável.
 *  Base: Profit First (divisão do que entra), Sebrae (pró-labore fixo, meses de caixa),
 *  e o que o Asaas mostrou da VINCIT (receita concentrada, tudo saindo para a pessoa física, notas faltando). */

export type Aloc = { lucro: number; prolabore: number; impostos: number; operacao: number };
/** ponto de partida do Profit First para empresa de serviço com receita até R$ 250 mil/ano */
export const ALOC_PADRAO: Aloc = { lucro: 5, prolabore: 50, impostos: 15, operacao: 30 };
export const ALOC_INFO: { k: keyof Aloc; l: string; d: string; c: string }[] = [
  { k: "lucro", l: "Lucro e reserva", d: "Fica na empresa: reserva de 3 a 6 meses e distribuição no trimestre.", c: "#6eefb6" },
  { k: "prolabore", l: "Pró-labore", d: "Seu salário: valor fixo, no mesmo dia, todo mês.", c: "#22d3ee" },
  { k: "impostos", l: "Impostos", d: "DAS e o que mais vencer; separe assim que receber.", c: "#f5c84c" },
  { k: "operacao", l: "Operação", d: "Equipe, contabilidade, equipamento, software, transporte.", c: "#ff6b6b" },
];
export const alocDe = (a: any): Aloc => ({ ...ALOC_PADRAO, ...(a || {}) });

/** categorias de receita (as padrão do Financeiro) */
const RECEITAS = ["projetos", "mensalidades / contratos", "mensalidade / recorrente", "aluguel de equipamento", "outras receitas"];
export const eReceita = (cat: string | null | undefined) => RECEITAS.includes((cat || "").toLowerCase());

/** categoria de despesa → grupo da divisão */
export function grupoDe(cat: string | null | undefined): keyof Aloc | null {
  const c = (cat || "").toLowerCase();
  if (c === "transferência") return null;
  if (c.includes("pró-labore") || c.includes("pro-labore") || c.includes("retirada")) return "prolabore";
  if (c.includes("imposto")) return "impostos";
  return "operacao";
}

type Tx = { kind: string; amount: any; due_date: string; paid?: boolean; category?: string | null; client_id?: string | null; transfer_id?: string | null; description?: string; ag_clients?: { name?: string } | null };
const n = (v: any) => Number(v) || 0;
const real = (t: Tx) => !t.transfer_id && t.category !== "Transferência";

export function mesesAtras(ref: string, k: number) { const [y, m] = ref.split("-").map(Number); return new Date(y, m - 1 - k, 15).toISOString().slice(0, 7); }

/** quanto entrou e para onde foi, num intervalo de meses [de, ate] (AAAA-MM) */
export function resumo(tx: Tx[], de: string, ate: string) {
  const dentro = tx.filter((t) => real(t) && t.paid !== false && t.due_date && t.due_date.slice(0, 7) >= de && t.due_date.slice(0, 7) <= ate);
  let receita = 0;
  const saida: Aloc = { lucro: 0, prolabore: 0, impostos: 0, operacao: 0 };
  for (const t of dentro) {
    const ehReceita = eReceita(t.category);
    // estorno: entrada numa categoria de despesa abate a despesa; saída numa categoria de receita abate a receita
    if (t.kind === "entrada") { if (ehReceita || !t.category) receita += n(t.amount); else { const g = grupoDe(t.category); if (g) saida[g] -= n(t.amount); } }
    else if (ehReceita) receita -= n(t.amount);
    else { const g = grupoDe(t.category); if (g) saida[g] += n(t.amount); }
  }
  const gasto = saida.prolabore + saida.impostos + saida.operacao;
  saida.lucro = receita - gasto; // o que sobrou na empresa
  const porCliente: Record<string, { id: string; nome: string; v: number }> = {};
  for (const t of dentro.filter((x) => x.client_id && eReceita(x.category))) {
    const k = t.client_id!; porCliente[k] = porCliente[k] || { id: k, nome: t.ag_clients?.name || "Cliente", v: 0 }; porCliente[k].v += (t.kind === "entrada" ? 1 : -1) * n(t.amount);
  }
  const clientes = Object.values(porCliente).filter((c) => c.v > 0.01).sort((a, b) => b.v - a.v);
  return { receita, saida, gasto, clientes };
}

/** clientes que são do mesmo grupo (ex.: Domus Produções, Domus Doctor, Domus Educação) contam juntos na concentração */
export function grupoCliente(nome: string) { return (nome || "").trim().split(/\s+/)[0].toLowerCase(); }

export type Nota = { id?: string; number?: number | null; client_id?: string | null; client_name?: string | null; amount: any; issued_at: string; status?: string; pdf_url?: string | null; xml_url?: string | null };

/** recebimentos de cliente sem nota fiscal parecida (mesmo cliente, valor até R$ 1 de diferença, até 45 dias) */
export function semNota(tx: Tx[], notas: Nota[], de: string) {
  const emitidas = notas.filter((x) => (x.status || "emitida") === "emitida");
  const usadas = new Set<number>();
  const faltam: Tx[] = [];
  const recs = tx.filter((t) => real(t) && t.kind === "entrada" && t.paid !== false && t.client_id && t.due_date >= de).sort((a, b) => a.due_date.localeCompare(b.due_date));
  for (const t of recs) {
    const d = new Date(t.due_date + "T12:00").getTime();
    const i = emitidas.findIndex((x, j) => !usadas.has(j) && x.client_id === t.client_id && Math.abs(n(x.amount) - n(t.amount)) <= 1 && Math.abs(new Date(x.issued_at + "T12:00").getTime() - d) <= 45 * 864e5);
    if (i >= 0) usadas.add(i); else faltam.push(t);
  }
  return faltam;
}

/** fotografia da saúde do negócio nos últimos 12 meses */
export function saude(p: { tx: Tx[]; notas: Nota[]; saldo: number; aloc?: any; clientes?: { id: string; name: string; status?: string; contract?: any }[]; hoje: string }) {
  const mes = p.hoje.slice(0, 7);
  const de = mesesAtras(mes, 11);
  const r = resumo(p.tx, de, mes);
  const media = r.receita / 12;
  // concentração por grupo de cliente
  const grupos: Record<string, { nome: string; v: number }> = {};
  for (const c of r.clientes) { const g = grupoCliente(c.nome); grupos[g] = grupos[g] || { nome: c.nome.split(/\s+/)[0], v: 0 }; grupos[g].v += c.v; }
  const topGrupos = Object.values(grupos).sort((a, b) => b.v - a.v);
  const maior = topGrupos[0] ? { ...topGrupos[0], pct: r.receita ? (topGrupos[0].v / r.receita) * 100 : 0 } : null;
  // meses de caixa: saldo ÷ média do que sai por mês (últimos 3 meses fechados)
  const r3 = resumo(p.tx, mesesAtras(mes, 3), mesesAtras(mes, 1));
  const custoMes = r3.gasto / 3;
  const mesesCaixa = custoMes > 0 ? p.saldo / custoMes : null;
  const aloc = alocDe(p.aloc);
  const pct = (v: number) => (r.receita ? (v / r.receita) * 100 : 0);
  const faltaNota = semNota(p.tx, p.notas, de + "-01");
  const contratos = (p.clientes || []).filter((c) => c.status === "ativo" && n(c.contract?.valor_mensal) > 0);
  const mrr = contratos.reduce((a, c) => a + n(c.contract.valor_mensal), 0);

  const alertas: { t: string; nivel: "alto" | "medio" }[] = [];
  if (maior && maior.pct >= 50) alertas.push({ nivel: "alto", t: `${Math.round(maior.pct)}% da receita vem do grupo ${maior.nome}. Se ele sair, a empresa perde quase tudo: buscar um 2º cliente fixo é a prioridade.` });
  if (r.receita && pct(r.saida.lucro) < 2) alertas.push({ nivel: "alto", t: `Sobrou ${Math.round(pct(r.saida.lucro))}% do que entrou. O alvo é ${aloc.lucro}%: fixe o pró-labore e deixe a diferença na empresa.` });
  if (r.receita && pct(r.saida.impostos) < aloc.impostos / 2) alertas.push({ nivel: "medio", t: `Impostos pagos foram ${Math.round(pct(r.saida.impostos))}% da receita. Separe ${aloc.impostos}% de cada recebimento para não ser pego de surpresa.` });
  if (mesesCaixa !== null && mesesCaixa < 3) alertas.push({ nivel: mesesCaixa < 1 ? "alto" : "medio", t: `O caixa paga ${mesesCaixa < 0.1 ? "menos de 1 semana" : `${mesesCaixa.toFixed(1)} mês(es)`} de custos. O mínimo saudável é 3 meses.` });
  if (faltaNota.length) alertas.push({ nivel: "medio", t: `${faltaNota.length} recebimento(s) sem nota fiscal nos últimos 12 meses.` });

  return { de, mes, r, media, maior, topGrupos: topGrupos.slice(0, 4), mesesCaixa, custoMes, aloc, pct, faltaNota, mrr, contratos: contratos.length, alertas };
}

export type Contrato = { valor_mensal?: number; dia_vencimento?: number; inicio?: string; fim?: string; escopo?: { item: string; qtd: number }[]; observacoes?: string };
