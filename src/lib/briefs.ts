/**
 * Refinador de pedidos (27/11): antes de produzir, o Claude lê o pedido cru e devolve um brief completo
 * no formato que diretores de motion usam. O brief é mostrado na tela, a pessoa ajusta e só então a peça é feita.
 *
 * Formato em 8 partes, adaptado de charlie947/motion-graphics-skills (motion-prompt-writer, MIT),
 * feicaiclub/video-spec-builder (MIT) e das travas do Tejashmakwana/motionmaxxing (Apache-2.0).
 * O mesmo formato serve ao Motion (tipo "motion") e ao editor de vídeo (tipo "edicao", com o bloco `edicao`).
 */

import { NOMES_ESTILOS } from "./motion/estilos-texto";

export type BriefCena = { inicio: number; fim: number; o_que: string; texto?: string; movimento?: string; fala?: string; estilo?: string };
export type Brief = {
  tipo: "motion" | "edicao";
  titulo: string;
  /** 1. a régua de qualidade em uma linha */
  regua: string;
  /** 2. formato */
  formato: { largura: number; altura: number; duracao: number; fps: number; fundo: "solido" | "transparente"; zona_segura: string };
  /** 3. a ideia única: o que a peça faz, numa frase */
  ideia: string;
  /** 4. visual da marca */
  visual: { cores: { nome: string; hex: string; uso: string }[]; letras: { nome: string; uso: string }[]; grafismos: string[]; regras: string[] };
  /** 5. movimento: curvas, ritmo e amarração na fala ou na música */
  movimento: string[];
  /** 6. nunca */
  nunca: string[];
  /** 7. conferir antes de entregar */
  conferir: string[];
  /** 8. cena a cena */
  cenas: BriefCena[];
  /** o que só a pessoa ou a cliente pode responder (preço, data, peça, aprovação) */
  falta_da_cliente: string[];
  /** campos extras do editor (combinados com a conversa de edição) */
  edicao?: Record<string, string | string[]>;
};

/** O que todo motion de marca deve evitar (sinais de "motion de IA"). Vale para o Motion e para os grafismos do editor. */
export const NUNCA_PADRAO = [
  "contador de página (01/03), timecode, rótulo de marca no canto ou colchetes de canto",
  "manchete parada à esquerda com cartão ao lado, como slide",
  "título digitado letra a letra com cursor",
  "fade em todas as passagens; prefira corte no movimento",
  "quadro parado por mais de 3 quadros seguidos",
  "elemento que nasce do tamanho zero sem passar do ponto",
  "degradê cinza ou fundo chapado sem textura quando a marca tem papel e grão",
  "clichê do tema (ex.: neve, pinheiro, gorro no Natal) quando a marca não usa",
  "palavra, número ou preço que não veio do pedido, do roteiro ou da marca",
];

const CONFERIR_PADRAO = [
  "ver um quadro a cada 0,5 s e julgar como diretor de arte: algo genérico, pequeno ou vazio, refazer",
  "ver em 200 px de largura (como no feed): o texto principal ainda lê",
  "zona segura do Instagram livre (topo 250 px e base 420 px no 9:16)",
  "o último quadro emenda com o vídeo (limpo ou na cor do próximo plano)",
];

const num = (v: any, d: number, min: number, max: number) => { const n = Number(v); return isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
const str = (v: any, max = 400) => (v == null ? "" : String(v).slice(0, max));
const list = (v: any, max = 16, len = 300) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);

export function normalizeBrief(x: any, tipo: Brief["tipo"] = "motion"): Brief {
  const f = x?.formato || {};
  const v = x?.visual || {};
  return {
    tipo: x?.tipo === "edicao" ? "edicao" : tipo,
    titulo: str(x?.titulo, 80) || "Peça sem nome",
    regua: str(x?.regua, 300),
    formato: {
      largura: num(f.largura, 1080, 320, 3840), altura: num(f.altura, 1920, 320, 3840), duracao: num(f.duracao, 5, 0.5, 180), fps: num(f.fps, 30, 24, 60),
      fundo: f.fundo === "transparente" ? "transparente" : "solido", zona_segura: str(f.zona_segura, 200),
    },
    ideia: str(x?.ideia, 400),
    visual: {
      cores: (Array.isArray(v.cores) ? v.cores : []).slice(0, 8).map((c: any) => ({ nome: str(c?.nome, 40), hex: /^#[0-9a-f]{6}$/i.test(c?.hex) ? c.hex : "#000000", uso: str(c?.uso, 120) })),
      letras: (Array.isArray(v.letras) ? v.letras : []).slice(0, 4).map((l: any) => ({ nome: str(l?.nome, 60), uso: str(l?.uso, 160) })),
      grafismos: list(v.grafismos, 10), regras: list(v.regras, 12),
    },
    movimento: list(x?.movimento, 12),
    nunca: list(x?.nunca, 16),
    conferir: list(x?.conferir, 12),
    cenas: (Array.isArray(x?.cenas) ? x.cenas : []).slice(0, 40).map((c: any) => ({
      inicio: num(c?.inicio, 0, 0, 600), fim: num(c?.fim, 0, 0, 600), o_que: str(c?.o_que, 400),
      texto: c?.texto ? str(c.texto, 200) : undefined, movimento: c?.movimento ? str(c.movimento, 300) : undefined, fala: c?.fala ? str(c.fala, 200) : undefined, estilo: c?.estilo ? str(c.estilo, 60) : undefined,
    })),
    falta_da_cliente: list(x?.falta_da_cliente, 8),
    edicao: x?.edicao && typeof x.edicao === "object" ? x.edicao : undefined,
  };
}

const TAMANHOS: Record<string, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };

/** Prompt do refinador do Motion: o Claude lê o pedido cru e devolve o brief em JSON. */
export function promptRefinarMotion(o: { pedido: string; formato?: string; contexto?: string; ajuste?: string; briefAnterior?: Brief }) {
  const [w, h] = TAMANHOS[o.formato || "9:16"] || TAMANHOS["9:16"];
  return `${o.contexto || ""}
Você é diretor de motion design de um estúdio pequeno e exigente. Antes de qualquer animação ser feita, você lê o pedido cru da pessoa e escreve o brief completo que vai guiar a produção. Não anime nada agora.

Pedido cru, feito no Audiovisual do VINCIT HUB (formato ${o.formato || "9:16"}, ${w}x${h}):
"""${o.pedido.slice(0, 2500)}"""
${o.briefAnterior ? `\nBrief anterior (reescreva só o que o ajuste pede):\n${JSON.stringify(o.briefAnterior).slice(0, 6000)}\n` : ""}${o.ajuste ? `\nAjuste pedido pela pessoa: """${o.ajuste.slice(0, 1500)}"""\n` : ""}
Como refinar:
- Traduza adjetivos ("elegante", "impactante", "premium") em decisões que se veem: cor, letra, tamanho, curva, tempo.
- Uma ideia só, que nasce da marca. Use os grafismos e o jeito de escrever que a marca já usa (no manual e nos posts) antes de inventar outros. Diga qual elemento da marca vira movimento.
- Texto na tela: só o que veio do pedido, do roteiro ou da marca. Máximo 6 palavras por vez; título com 120 px ou mais; nada menor que 30 px.
- Tempo: cada cena com início e fim em segundos, somando a duração pedida (vinheta de abertura 3 a 5 s; CTA 3 a 4 s). Nenhuma cena acima de 4 s sem dizer o que ela sustenta.
- Movimento: entra desacelerando, sai acelerando; escada de 0,08 a 0,15 s entre elementos irmãos; algo vivo em todo quadro; corte no movimento em vez de fade.
- Texto por cima do vídeo de quem fala: escolha em cada cena um estilo do catálogo pelo nome (campo "estilo") e diga em que palavra da fala ele entra; fundo transparente. Catálogo: ${NOMES_ESTILOS.join(", ")}.
- O que faltar e só a pessoa souber (preço, data, peça, nome, aprovação) vai em falta_da_cliente; não invente.
- Português do Brasil, frases curtas, sem clichês de IA.

Sempre inclua em "nunca", além do que for específico: ${NUNCA_PADRAO.join("; ")}.
Sempre inclua em "conferir": ${CONFERIR_PADRAO.join("; ")}.

Responda SOMENTE com JSON:
{"tipo":"motion","titulo":"nome curto","regua":"nível de qualidade em uma linha + 'se não passaria em X, não está pronto'",
"formato":{"largura":${w},"altura":${h},"duracao":5,"fps":30,"fundo":"solido|transparente","zona_segura":"..."},
"ideia":"a ideia única em uma frase",
"visual":{"cores":[{"nome":"...","hex":"#RRGGBB","uso":"..."}],"letras":[{"nome":"família do Google Fonts","uso":"..."}],"grafismos":["..."],"regras":["..."]},
"movimento":["..."],"nunca":["..."],"conferir":["..."],
"cenas":[{"inicio":0,"fim":1.2,"o_que":"o que acontece na tela","texto":"texto exato ou vazio","movimento":"como entra e sai","estilo":"nome do catálogo ou vazio","fala":"palavra da fala ou vazio"}],
"falta_da_cliente":["pergunta curta"]}`;
}

/** O brief em texto corrido (para a tela e para o pedido de produção). */
export function briefEmTexto(b: Brief) {
  const L: string[] = [];
  L.push(`# ${b.titulo}`);
  L.push(`1. Régua: ${b.regua}`);
  L.push(`2. Formato: ${b.formato.largura}x${b.formato.altura}, ${b.formato.duracao} s, ${b.formato.fps} fps, fundo ${b.formato.fundo}. ${b.formato.zona_segura}`);
  L.push(`3. Ideia: ${b.ideia}`);
  L.push(`4. Visual: ${b.visual.cores.map((c) => `${c.nome} ${c.hex} (${c.uso})`).join("; ")}. Letras: ${b.visual.letras.map((l) => `${l.nome} (${l.uso})`).join("; ")}. Grafismos: ${b.visual.grafismos.join("; ")}. ${b.visual.regras.join(" ")}`);
  L.push(`5. Movimento: ${b.movimento.join("; ")}`);
  L.push(`6. Nunca: ${b.nunca.join("; ")}`);
  L.push(`7. Conferir: ${b.conferir.join("; ")}`);
  L.push(`8. Cenas:`);
  b.cenas.forEach((c) => L.push(`- ${c.inicio.toFixed(2)}–${c.fim.toFixed(2)} s: ${c.o_que}${c.texto ? ` | texto: "${c.texto}"` : ""}${c.movimento ? ` | movimento: ${c.movimento}` : ""}${c.fala ? ` | na fala: "${c.fala}"` : ""}${c.estilo ? ` | estilo: ${c.estilo}` : ""}`));
  if (b.edicao) Object.entries(b.edicao).forEach(([k, v]) => L.push(`${k}: ${Array.isArray(v) ? v.join("; ") : v}`));
  if (b.falta_da_cliente.length) L.push(`Falta da cliente: ${b.falta_da_cliente.join(" / ")}`);
  return L.join("\n");
}

/** Campos extras do brief de edição (bloco `edicao`), tirados do playbook do Kit (regras de corte, som e legenda). */
export const CAMPOS_EDICAO: Record<string, string> = {
  gancho: "o que a pessoa diz e vê no primeiro 1,5 s; primeiro corte entre 0,6 e 1 s",
  ritmo: "duração média dos planos (kit: plano_medio_s), algo novo na tela a cada 1 a 2 s, nada parado mais de 3 s; onde acelera ou respira",
  planos: "o plano de cada cena, por nome: 'rosto inteiro' (gancho, opinião, chamada), 'tela dividida' (objeto em cima, rosto embaixo, quando a frase aponta para algo; no Motion é o estilo \"Tela dividida\") ou 'motion em tela cheia' (o objeto importa mais que o rosto); troca sempre em corte seco",
  cortes: "silêncio a tirar (silencio_ms), respiro (folga_ms), pausas naturais mantidas (batida_ms), vícios a tirar só com silêncio dos dois lados, tomada repetida: fica a última",
  legenda: "estilo do kit, palavras por tela, palavra em destaque; nunca cobrir a boca; zona segura",
  broll: "onde entra B-roll ou cartão e por quê; a pessoa não fica fora da tela mais que max_sem_rosto_s",
  som: "trilha uns 11 dB abaixo da voz (trilha_db), mix final em lufs e pico_dbtp do kit, efeitos sonoros só na ação (sfx), no estilo de som do kit (som_estilo: delicado, tátil, minimal, cinemático ou agressivo)",
  vocabulario: "palavras da marca que a transcrição erra e como escrever certo",
};

/** Guia do refinador de edição: serve ao prompt abaixo e ao plano pelo conector (listar_edicoes_premiere). */
export const GUIA_REFINAR_EDICAO = `Antes do plano, escreva o brief da edição no formato de 8 partes (tipo "edicao"): régua, formato, ideia única, visual do kit, movimento (câmera, zooms, transições amarrados na fala), nunca, conferir e cena a cena com os tempos da transcrição. No bloco "edicao" preencha: ${Object.entries(CAMPOS_EDICAO).map(([k, v]) => `${k} (${v})`).join("; ")}. O que só a pessoa sabe (preço, peça, data, aprovação) vai em falta_da_cliente; não invente.`;

/** Prompt do refinador do editor: lê o pedido cru, a fala e o kit e devolve o brief de edição em JSON. */
export function promptRefinarEdicao(o: { pedido: string; formato?: string; contexto?: string; fala?: string; regras?: Record<string, any>; ajuste?: string; briefAnterior?: Brief }) {
  const [w, h] = TAMANHOS[o.formato || "9:16"] || TAMANHOS["9:16"];
  return `${o.contexto || ""}
Você é editor-chefe de vídeo curto de um estúdio pequeno e exigente. Antes de qualquer corte, você lê o pedido cru, a fala e o kit da marca e escreve o brief que vai guiar a edição. Não edite nada agora.

Pedido cru (formato ${o.formato || "9:16"}, ${w}x${h}):
"""${o.pedido.slice(0, 2500)}"""
${o.fala ? `\nFala com tempos (segundos):\n${o.fala.slice(0, 8000)}\n` : ""}${o.regras ? `\nRegras do kit: ${JSON.stringify(o.regras).slice(0, 1500)}\n` : ""}${o.briefAnterior ? `\nBrief anterior (reescreva só o que o ajuste pede):\n${JSON.stringify(o.briefAnterior).slice(0, 6000)}\n` : ""}${o.ajuste ? `\nAjuste pedido pela pessoa: """${o.ajuste.slice(0, 1500)}"""\n` : ""}
${GUIA_REFINAR_EDICAO}
Regras: corte entre frases, nunca dentro de uma; cenas com início e fim que existem na fala; texto na tela só o que foi dito ou veio do pedido; português do Brasil, frases curtas, sem clichês de IA.
Sempre inclua em "nunca", além do que for específico: legenda sobre a boca; corte no meio de palavra; ${NUNCA_PADRAO.slice(3, 5).join("; ")}; ${NUNCA_PADRAO[8]}.
Sempre inclua em "conferir": ${CONFERIR_PADRAO.slice(1, 3).join("; ")}; ouvir os cortes em sequência: nenhum corta respiração no meio ou come sílaba.

Responda SOMENTE com JSON:
{"tipo":"edicao","titulo":"nome curto","regua":"...","formato":{"largura":${w},"altura":${h},"duracao":30,"fps":30,"fundo":"solido","zona_segura":"..."},
"ideia":"...","visual":{"cores":[{"nome":"...","hex":"#RRGGBB","uso":"..."}],"letras":[{"nome":"...","uso":"..."}],"grafismos":["..."],"regras":["..."]},
"movimento":["..."],"nunca":["..."],"conferir":["..."],
"cenas":[{"inicio":0,"fim":1.5,"o_que":"...","texto":"...","movimento":"...","fala":"..."}],
"edicao":{${Object.keys(CAMPOS_EDICAO).map((k) => `"${k}":"..."`).join(",")}},
"falta_da_cliente":["..."]}`;
}
