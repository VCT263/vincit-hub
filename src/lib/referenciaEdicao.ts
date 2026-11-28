/**
 * Engenharia reversa da edição de um reel de referência (28/11).
 * O pedido vai pela fila do Claude. Quem responde (o Claude no Mac do Vinícius) baixa o vídeo, quebra plano a plano
 * com o rea-video (JuneYaooo/rea-video, Apache-2.0, só ffmpeg, modo offline) e devolve a análise + uma proposta de Kit.
 * A análise fica em references_lib.edicao; o Kit de estilo (av_style_kits) só nasce quando a pessoa aprova.
 * Estilos de referência: vários links num estilo só; a cada vídeo novo a folha do estilo é refeita (o que se repete vira regra).
 * A folha vira Kit quando a pessoa aprova, e aprovar de novo atualiza o mesmo Kit.
 */
import { NOMES_ESTILOS } from "./motion/estilos-texto";

export type Plano = { inicio: number; fim: number; tipo: string; o_que: string; camera?: string; texto?: string };
export type KitProposto = {
  cores?: { destaque?: string; texto?: string; fundo?: string };
  fontes?: { titulo?: string; legenda?: string };
  legenda?: { palavras_por_tela?: number; caixa_alta?: boolean; posicao?: string; destaque?: string };
  regras?: { plano_medio_s?: number; primeiro_corte_s?: number; corte_max_s?: number; max_sem_rosto_s?: number; trilha_db?: number; sfx?: string };
  camera?: { intensidade?: number; movimentos?: string[] };
  lettering?: string;
  motion?: { tipos?: string[]; frequencia?: string };
};
export type Edicao = {
  resumo: string;
  categoria: string;
  duracao_s?: number;
  cortes_por_min?: number;
  plano_medio_s?: number;
  primeiro_corte_s?: number;
  planos: Plano[];
  legenda: string;
  letterings: string[];
  motion: string[];
  estilos_do_catalogo: string[];
  cor: { paleta: string[]; look: string };
  som: { voz?: string; musica?: string; sfx?: string[] };
  copiar: string[];
  nao_copiar: string[];
  como_foi_medido: string;
  kit: KitProposto;
  at?: string;
  fontes_ref?: string[];
};

const s = (v: any, n = 400) => (v == null ? "" : String(v).slice(0, n));
const n = (v: any) => { const x = Number(v); return isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : undefined; };
const l = (v: any, max = 12, len = 240) => (Array.isArray(v) ? v.map((x) => s(x, len)).filter(Boolean).slice(0, max) : []);
const hex = (v: any) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v) : undefined);

export function normalizeKit(k: any): KitProposto {
  k = k || {};
  return {
    cores: { destaque: hex(k.cores?.destaque), texto: hex(k.cores?.texto), fundo: hex(k.cores?.fundo) },
    fontes: { titulo: s(k.fontes?.titulo, 60) || undefined, legenda: s(k.fontes?.legenda, 60) || undefined },
    legenda: { palavras_por_tela: n(k.legenda?.palavras_por_tela), caixa_alta: typeof k.legenda?.caixa_alta === "boolean" ? k.legenda.caixa_alta : undefined, posicao: s(k.legenda?.posicao, 60) || undefined, destaque: s(k.legenda?.destaque, 120) || undefined },
    regras: { plano_medio_s: n(k.regras?.plano_medio_s), primeiro_corte_s: n(k.regras?.primeiro_corte_s), corte_max_s: n(k.regras?.corte_max_s), max_sem_rosto_s: n(k.regras?.max_sem_rosto_s), trilha_db: Number.isFinite(Number(k.regras?.trilha_db)) ? Number(k.regras.trilha_db) : undefined, sfx: s(k.regras?.sfx, 200) || undefined },
    camera: { intensidade: n(k.camera?.intensidade), movimentos: l(k.camera?.movimentos, 6, 80) },
    lettering: s(k.lettering, 400) || undefined,
    motion: { tipos: l(k.motion?.tipos, 10, 80), frequencia: s(k.motion?.frequencia, 120) || undefined },
  };
}

export function normalizeEdicao(x: any): Edicao {
  x = x || {};
  return {
    resumo: s(x.resumo, 400),
    categoria: s(x.categoria, 40),
    duracao_s: n(x.duracao_s), cortes_por_min: n(x.cortes_por_min), plano_medio_s: n(x.plano_medio_s), primeiro_corte_s: n(x.primeiro_corte_s),
    planos: (Array.isArray(x.planos) ? x.planos : []).slice(0, 60).map((p: any) => ({ inicio: n(p?.inicio) ?? 0, fim: n(p?.fim) ?? 0, tipo: s(p?.tipo, 40), o_que: s(p?.o_que, 240), camera: s(p?.camera, 120) || undefined, texto: s(p?.texto, 160) || undefined })),
    legenda: s(x.legenda, 400),
    letterings: l(x.letterings), motion: l(x.motion), estilos_do_catalogo: l(x.estilos_do_catalogo, 8, 60),
    cor: { paleta: (Array.isArray(x.cor?.paleta) ? x.cor.paleta : []).map(hex).filter(Boolean).slice(0, 6) as string[], look: s(x.cor?.look, 240) },
    som: { voz: s(x.som?.voz, 200) || undefined, musica: s(x.som?.musica, 200) || undefined, sfx: l(x.som?.sfx, 8, 120) },
    copiar: l(x.copiar, 8), nao_copiar: l(x.nao_copiar, 8),
    como_foi_medido: s(x.como_foi_medido, 300),
    kit: normalizeKit(x.kit),
  };
}

const FORMATO = `{"resumo":"a edição em uma frase","categoria":"gravado|ia|3d|codigo|tela|misto",
"duracao_s":0,"cortes_por_min":0,"plano_medio_s":0,"primeiro_corte_s":0,
"planos":[{"inicio":0,"fim":1.2,"tipo":"rosto inteiro|tela dividida|motion em tela cheia|b-roll|produto|tela gravada","o_que":"o que se vê","camera":"parada, push-in, punch, tremida…","texto":"texto na tela, se houver"}],
"legenda":"como é a legenda: palavras por tela, caixa, posição, cor, destaque",
"letterings":["cada tipo de título/lettering e como entra"],
"motion":["cada grafismo ou animação e quando aparece"],
"estilos_do_catalogo":["nomes do catálogo do HUB que reproduzem os letterings"],
"cor":{"paleta":["#RRGGBB"],"look":"contraste, saturação, temperatura"},
"som":{"voz":"...","musica":"gênero, BPM, entra/sai","sfx":["whoosh no corte…"]},
"copiar":["o que vale trazer para a marca"],"nao_copiar":["o que é da identidade do outro e não se copia"],
"como_foi_medido":"rea-video + quadros, ou só quadros no navegador",
"kit":{"cores":{"destaque":"#RRGGBB","texto":"#RRGGBB","fundo":"#RRGGBB"},"fontes":{"titulo":"família do Google Fonts parecida","legenda":"..."},
"legenda":{"palavras_por_tela":2,"caixa_alta":false,"posicao":"centro|baixo","destaque":"como a palavra-chave é marcada"},
"regras":{"plano_medio_s":1.4,"primeiro_corte_s":0.8,"corte_max_s":3,"max_sem_rosto_s":4,"trilha_db":-18,"sfx":"quando usar"},
"camera":{"intensidade":0,"movimentos":["push-in"]},"lettering":"regra de títulos","motion":{"tipos":["..."],"frequencia":"a cada X s"}}}`;

/** Prompt para quem responde a fila: como obter o vídeo, como medir e o formato da resposta. */
export function promptEngenhariaReversa(o: { url: string; titulo?: string; handle?: string; contexto?: string }) {
  return `${o.contexto || ""}
Engenharia reversa da EDIÇÃO de um vídeo de referência, pedida em Creator > Referências do VINCIT HUB.
Referência: ${o.url}${o.handle ? ` (${o.handle})` : ""}${o.titulo ? ` · "${o.titulo.slice(0, 120)}"` : ""}

Como fazer (sem custo, sem API paga):
1. Baixe o vídeo no computador: yt-dlp -o ref.mp4 "${o.url}" (o Instagram pode pedir --cookies-from-browser chrome).
2. Quebre plano a plano com o rea-video (github.com/JuneYaooo/rea-video, Apache-2.0, só ffmpeg, modo offline sem chave): rea-video decompose ref.mp4 -o out/ref. Leia out/ref/VIDEO.md e video/timeline.md, rhythm.md, packaging.md, look.md e sound.md, e olhe os quadros-chave.
3. Sem terminal: abra o link no Chrome e veja um quadro a cada 0,5 a 1 s (e o áudio, se der).
4. Se não conseguir ver o vídeo de jeito nenhum, recuse o pedido dizendo o motivo. Não invente.

Regras:
- Números (cortes por minuto, duração dos planos, primeiro corte) só se foram medidos; senão deixe 0 e diga em como_foi_medido.
- Descreva o que se vê, não elogie. Português do Brasil, frases curtas.
- Em estilos_do_catalogo use só nomes deste catálogo do Motion do HUB: ${NOMES_ESTILOS.join(", ")}.
- O kit é uma proposta de Kit de estilo tirada do que foi medido. Cores em hex. Fontes: a família do Google Fonts mais parecida.
- Separe o que é técnica (copiar) do que é identidade do outro criador (nao_copiar).

Responda SOMENTE com JSON:
${FORMATO}`;
}

/** Prompt para juntar as análises de um estilo (1 a 8 vídeos) numa folha da marca, inspirada e não copiada. */
export function promptJuntar(o: { analises: { titulo: string; url?: string; edicao: Edicao }[]; contexto?: string; estilo?: { nome: string; descricao?: string } }) {
  const n = o.analises.length;
  const cada = Math.min(6000, Math.floor(26000 / Math.max(1, n)));
  const lista = o.analises.map((a, i) => `Referência ${i + 1}: ${a.titulo}${a.url ? ` (${a.url})` : ""}\n${JSON.stringify({ ...a.edicao, planos: a.edicao.planos.slice(0, n > 4 ? 6 : 12) }).slice(0, cada)}`).join("\n\n");
  const est = o.estilo ? `Estilo: "${o.estilo.nome}"${o.estilo.descricao ? `. O que a pessoa quer com ele: ${o.estilo.descricao}` : ""}\n` : "";
  return `${o.contexto || ""}
${est}Junte ${n === 1 ? "esta análise" : `estas ${n} análises`} de edição numa folha de estilo para a marca acima. ${n > 1 ? "O que aparece na maioria dos vídeos vira regra; o que aparece em um só é exceção ou identidade daquele criador e fica de fora. Nos números (plano médio, primeiro corte, cortes por minuto), use a mediana dos que foram medidos." : "Com um vídeo só, tire as regras dele e deixe de fora o que é identidade do criador."} A folha é da marca, não uma cópia: use as cores e letras da marca quando existirem. Em como_foi_medido, diga de quantos vídeos saiu cada regra.

${lista}

Responda SOMENTE com JSON no mesmo formato da análise (resumo = a folha em uma frase; planos = 3 a 6 planos-modelo; kit = o Kit de estilo final):
${FORMATO}`;
}

/** Mescla a proposta no Kit que já existe, camada por camada, sem perder o que a pessoa ajustou à mão. */
export function mesclarKit(atual: any, novo: any) {
  const out: any = { ...(atual || {}) };
  for (const [k, v] of Object.entries(novo || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = { ...out[k], ...(v as any) };
    else if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Converte a proposta no formato do Kit de estilo que o editor, o plugin e o Motion já leem. */
export function kitParaEstilo(k: KitProposto) {
  const limpa = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));
  return {
    cores: limpa(k.cores), fontes: limpa(k.fontes),
    legenda: limpa({ palavras_por_tela: k.legenda?.palavras_por_tela, caixa_alta: k.legenda?.caixa_alta, posicao: k.legenda?.posicao, destaque: k.legenda?.destaque }),
    regras: limpa(k.regras), camera: limpa(k.camera),
    lettering: k.lettering, motion: limpa(k.motion),
  };
}
