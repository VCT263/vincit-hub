/**
 * Sugestões de edição a partir da fala (transcrição): lettering, imagem de inserção, motion e câmera.
 * Roda no navegador, sem IA paga. Cada sugestão é só uma proposta: quem edita aceita ou descarta.
 * A frequência e os tipos vêm do kit do cliente.
 */
import { isHot, totalDuration, uid, type Kit, type OverlayMode, type Project, type Title, type TitleKind, type Zoom } from "./model";

export type Camada = "lettering" | "insercao" | "motion" | "camera";
export type Sugestao = {
  id: string;
  camada: Camada;
  t: number;
  end: number;
  resumo: string;
  motivo: string;
  title?: Title;
  zoom?: Zoom;
  /** imagem de inserção: palavra para buscar no banco interno, Pexels, Pixabay ou Openverse */
  busca?: string;
  modo?: OverlayMode;
};
type W = { start: number; end: number; t: string };

const GAP: Record<string, number> = { pouco: 14, medio: 8, muito: 5 };
const STOP = new Set("aquela aquele aquilo assim agora antes apenas ainda aqui algum alguma alguns algumas além bem cada coisa coisas como comigo conosco contra depois desde deles delas dessa desse disso então entre essa esse esta este estou estava fazer gente isso isto mais mesmo minha muito muita nada nossa nosso outra outro para pela pelo porque pois quando quanto quem sempre sobre também tanto tenho todo toda todos todas tudo você vocês você? vamos vai sabe saber ser seja sendo sido tinha tipo uma umas uns hoje ontem amanhã dizer falar falando fazendo querer quero acho posso pode podem precisa preciso realmente exatamente simplesmente basicamente certo verdade ninguém alguém comenta comentar mostrar mostra quase detalhe problema pessoa pessoas forma maneira momento vezes nunca muitas muitos pouco poucos ninguem comecei começar comecou começou porque primeiro primeira segundo segunda terceiro terceira último última depois então".split(" "));

const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%$,.]/gu, "").replace(/[.,]+$/, "");
const sentenceOf = (ws: W[], i: number) => {
  let a = i, b = i;
  while (a > 0 && !/[.!?]$/.test(ws[a - 1].t)) a--;
  while (b < ws.length - 1 && !/[.!?]$/.test(ws[b].t)) b++;
  return { a, b, words: ws.slice(a, b + 1) };
};

/** analisa a fala e devolve sugestões espalhadas no vídeo, sem amontoar */
export function sugerir(p: Project, words: W[], kit: Kit, opts: { roteiro?: string; titulo?: string; wide?: boolean } = {}): Sugestao[] {
  const out: Sugestao[] = [];
  const end = totalDuration(p);
  if (!words.length || end <= 0) return out;
  const letTipos = new Set(kit.lettering?.tipos || ["gancho", "palavra", "vazado", "riscado", "frase", "cta"]);
  const motTipos = new Set(kit.motion?.tipos || ["numero", "grafico", "checklist", "relogio", "progresso"]);
  const movs = new Set(kit.camera?.movimentos || ["punch", "push", "tremida"]);
  const gL = GAP[kit.lettering?.frequencia || "medio"], gI = GAP[kit.insercao?.frequencia || "medio"] + 2, gM = GAP[kit.motion?.frequencia || "medio"] + 4;
  // ocupação: duas coisas grandes não entram juntas
  const busy: [number, number][] = [];
  const free = (a: number, b: number) => !busy.some(([x, y]) => a < y + 0.4 && b > x - 0.4);
  const lastOf: Record<Camada, number> = { lettering: -99, insercao: -99, motion: -99, camera: -99 };
  const push = (s: Omit<Sugestao, "id">, gap: number, ocupa = true) => {
    if (s.t - lastOf[s.camada] < gap) return false;
    if (ocupa && !free(s.t, s.end)) return false;
    out.push({ ...s, id: uid() });
    lastOf[s.camada] = s.t;
    if (ocupa) busy.push([s.t, s.end]);
    return true;
  };
  const T = (kind: TitleKind, text: string, start: number, len: number, sub?: string): Title => ({ id: uid(), kind, text, sub, start, end: Math.min(end, start + len) });
  const ws = words as W[];

  // 1) gancho: a primeira frase vira título nos primeiros segundos
  if (letTipos.has("gancho")) {
    const s0 = sentenceOf(ws, 0);
    const txt = opts.titulo || s0.words.map((w) => w.t).join(" ").replace(/[.!?]+$/, "");
    if (txt) push({ camada: "lettering", t: 0, end: Math.min(end, 2.4), resumo: `Gancho: "${txt.slice(0, 60)}"`, motivo: "Os primeiros 3 segundos seguram quem está rolando o feed.", title: T("gancho", txt.split(/\s+/).slice(0, 9).join(" "), 0, 2.4) }, 0, false);
  }

  // 2) motion nos números, tempos, crescimento e listas
  ws.forEach((w, i) => {
    if (w.start < 2.5) return;
    const c = clean(w.t), next = clean(ws[i + 1]?.t || ""), prev = clean(ws[i - 1]?.t || "");
    const len = 2.6;
    if (/^\d/.test(c)) {
      const num = c.replace(/[.,]$/, "");
      if (/^(minuto|minutos|hora|horas|dia|dias|semana|semanas|mês|meses|ano|anos|segundos)$/.test(next) && motTipos.has("relogio"))
        push({ camada: "motion", t: w.start, end: w.start + len, resumo: `Relógio: ${num} ${next}`, motivo: "Tempo falado fica mais claro com um relógio girando.", title: T("relogio", `${num} ${next}`, w.start, len) }, gM);
      else if ((/%$/.test(c) || next === "por" || next === "porcento") && motTipos.has("progresso") && parseFloat(num) <= 100)
        push({ camada: "motion", t: w.start, end: w.start + len, resumo: `Barra de progresso: ${num.replace("%", "")}%`, motivo: "Porcentagem vira uma barra enchendo.", title: T("progresso", num.replace("%", ""), w.start, len, sentenceOf(ws, i).words.slice(-3).map((x) => x.t).join(" ").replace(/[.!?]+$/, "")) }, gM);
      else if (motTipos.has("numero"))
        push({ camada: "motion", t: w.start, end: w.start + len, resumo: `Número subindo: ${prev === "r$" || /reais/.test(next) ? "R$ " : ""}${num}`, motivo: "Números ditos prendem mais quando aparecem contando.", title: T("numero", `${prev === "r$" || /reais/.test(next) ? "R$ " : ""}${num}${/^(mil|milhões|milhão)$/.test(next) ? ` ${next}` : ""}`, w.start, len, ws.slice(i + 1, i + 4).map((x) => x.t).join(" ").replace(/[.!?,]+$/, "")) }, gM);
    } else if (/^(cresceu|crescer|crescimento|aumentou|aumentar|dobrou|dobrar|triplicou|subiu|escalar|escala|faturamento|lucro)$/.test(c) && motTipos.has("grafico")) {
      push({ camada: "motion", t: w.start, end: w.start + len, resumo: `Gráfico crescendo: "${w.t}"`, motivo: "Ideia de crescimento fica visual com barras subindo.", title: T("grafico", w.t.replace(/[^\p{L}\p{N}]/gu, ""), w.start, len) }, gM);
    } else if (/^(primeiro|primeira|três|tres|quatro|cinco|passos|dicas|erros|motivos|formas|jeitos|coisas)$/.test(c) && /^(passos|dicas|erros|motivos|formas|jeitos|coisas|é|:)$/.test(next || c) && motTipos.has("checklist")) {
      // pega os próximos itens curtos como lista
      const s = sentenceOf(ws, i);
      const tail = ws.slice(s.b + 1, s.b + 40);
      const items: string[] = [];
      let cur: string[] = [];
      for (const x of tail) { cur.push(x.t.replace(/[.,!?;:]+$/, "")); if (/[.,!?;]$/.test(x.t) || cur.length >= 4) { items.push(cur.join(" ")); cur = []; } if (items.length >= 3) break; }
      if (items.length >= 2) push({ camada: "motion", t: w.start, end: w.start + 3.2, resumo: `Checklist: ${items.join(" · ")}`, motivo: "Quando a fala enumera, a lista na tela ajuda a acompanhar.", title: T("checklist", s.words.slice(0, 5).map((x) => x.t).join(" ").replace(/[.!?:]+$/, ""), w.start, 3.2, items.join(" | ")) }, gM);
    }
  });

  // 3) câmera: tremida nos números/revelações, punch nas perguntas e exclamações, push nas frases longas
  ws.forEach((w, i) => {
    if (w.start < 1.5) return;
    const strong = /[!?]$/.test(w.t);
    if (strong && movs.has("punch")) {
      const s = sentenceOf(ws, i);
      push({ camada: "camera", t: s.words[0].start, end: Math.min(end, w.end + 0.6), resumo: `Punch-in em "${s.words.slice(0, 4).map((x) => x.t).join(" ")}…"`, motivo: "Pergunta ou exclamação pede aproximação.", zoom: { id: uid(), start: s.words[0].start, end: Math.min(end, w.end + 0.6), scale: 112, tipo: "punch" } }, 5, false);
    } else if (/^(mas|porém|só que|agora)$/i.test(clean(w.t)) && i > 0 && /[.!?]$/.test(ws[i - 1].t) && movs.has("chicote")) {
      push({ camada: "camera", t: w.start, end: w.start + 0.5, resumo: `Chicote na virada "${w.t}"`, motivo: "Virada de assunto ganha um movimento rápido.", zoom: { id: uid(), start: w.start, end: w.start + 0.5, scale: 104, tipo: "chicote" } }, 8, false);
    }
  });
  for (let i = 0; i < ws.length; i++) {
    const s = sentenceOf(ws, i);
    i = s.b;
    const dur = s.words[s.words.length - 1].end - s.words[0].start;
    if (dur > 5 && movs.has("push")) push({ camada: "camera", t: s.words[0].start, end: s.words[s.words.length - 1].end, resumo: `Aproximação lenta em "${s.words.slice(0, 4).map((x) => x.t).join(" ")}…"`, motivo: "Frase longa: a câmera vai chegando para não cansar.", zoom: { id: uid(), start: s.words[0].start, end: s.words[s.words.length - 1].end, scale: 110, tipo: "push" } }, 6, false);
  }

  // 4) lettering nas palavras fortes e numa frase de efeito
  const usados = new Set<string>();
  // contraste "não é X, é Y" / "não X, mas Y": risca a palavra errada e mostra a certa
  if (letTipos.has("riscado")) {
    const limpa = (x?: W) => (x?.t || "").replace(/[^\p{L}\p{N}%$]/gu, "");
    for (let i = 0; i < ws.length - 3; i++) {
      if (!/^não$/i.test(limpa(ws[i]))) continue;
      let j = i + 1;
      if (/^(é|era|foi|são|tem|precisa)$/i.test(limpa(ws[j]))) j++;
      const a = ws.slice(j, j + 3).find((x) => !STOP.has(limpa(x).toLowerCase()) && limpa(x).length >= 3);
      if (!a) continue;
      const ai = ws.indexOf(a);
      let b: W | undefined;
      for (let k = ai + 1; k < Math.min(ws.length - 1, ai + 6); k++) {
        if (/^(é|mas|sim|e sim|porém)$/i.test(limpa(ws[k]))) { b = ws.slice(k + 1, k + 4).find((x) => !STOP.has(limpa(x).toLowerCase()) && limpa(x).length >= 3 && !/^(é|sim)$/i.test(limpa(x))); break; }
      }
      if (!b || limpa(a).toLowerCase() === limpa(b).toLowerCase()) continue;
      const st = a.start, en = Math.max(b.end + 0.8, st + 2.2);
      if (push({ camada: "lettering", t: st, end: en, resumo: `Riscado: "${limpa(a)}" → "${limpa(b)}"`, motivo: "A fala corrige uma ideia: riscar e mostrar a certa deixa o contraste visível.", title: T("riscado", limpa(a), st, en - st, limpa(b)) }, gL)) { usados.add(limpa(a).toLowerCase()); usados.add(limpa(b).toLowerCase()); }
    }
  }
  if (letTipos.has("frase")) {
    // a frase curta mais forte: exclamação, palavra forte e poucas palavras
    const frases: { st: number; en: number; ws: W[]; score: number }[] = [];
    for (let i = 0; i < ws.length; i++) {
      const s = sentenceOf(ws, i); i = s.b;
      const n = s.words.length, last = s.words[n - 1];
      if (n < 3 || n > 7 || s.words[0].start < 4 || !/[!.]$/.test(last.t)) continue;
      const score = (/!$/.test(last.t) ? 2 : 0) + (s.words.some((x) => isHot(x.t)) ? 1 : 0) + (n <= 5 ? 1 : 0) + (/^(isso|esse|essa|é|eu)$/i.test(s.words[0].t) ? 1 : 0);
      frases.push({ st: s.words[0].start, en: Math.max(s.words[0].start + 2.4, last.end + 0.5), ws: s.words, score });
    }
    frases.sort((a, b) => b.score - a.score);
    for (const f of frases.slice(0, 3)) {
      const hot = f.ws.find((x) => isHot(x.t)) || f.ws[f.ws.length - 1];
      if (push({ camada: "lettering", t: f.st, end: f.en, resumo: `Frase de impacto: "${f.ws.map((x) => x.t).join(" ")}"`, motivo: "Frase curta e forte merece a tela toda.", title: T("frase", f.ws.map((x) => x.t).join(" ").replace(/[.!?]+$/, ""), f.st, f.en - f.st, hot.t.replace(/[^\p{L}\p{N}]/gu, "")) }, 0)) break;
    }
  }
  // 5) imagens de inserção nos substantivos concretos (o que dá para mostrar)
  const cands = ws.map((w, i) => ({ w, i, c: w.t.toLowerCase().replace(/[^\p{L}]/gu, "") }))
    .filter(({ w, c }) => w.start > 3 && w.end < end - 2 && c.length >= 4 && !STOP.has(c) && !/(mente|ando|endo|indo|ar|er|ir|ou|ei|ava|amos|emos|aram|eram|iram)$/.test(c));
  // palavras que se repetem são o tema: priorize
  const freq: Record<string, number> = {};
  cands.forEach(({ c }) => (freq[c] = (freq[c] || 0) + 1));
  const roteiro = (opts.roteiro || "").toLowerCase();
  cands.sort((a, b) => a.w.start - b.w.start).forEach(({ w, c }) => {
    const noRot = roteiro.length > 0 && new RegExp(`\\b${c}`).test(roteiro);
    const score = (freq[c] > 1 ? 1 : 0) + (noRot ? 2 : 0) + (!roteiro && c.length >= 7 ? 1 : 0);
    if (score < 1) return;
    const len = 2.4;
    push({ camada: "insercao", t: w.start, end: w.start + len, resumo: `Imagem de "${c}"`, motivo: roteiro.includes(c) ? "Está no roteiro e dá para mostrar." : freq[c] > 1 ? "Tema que volta na fala." : "Coisa concreta que dá para mostrar.", busca: c, modo: (kit.insercao?.modo as OverlayMode) || "cheia" }, gI);
  });

  const kindsPalavra = (["palavra", "vazado", "letreiro"] as TitleKind[]).filter((k) => letTipos.has(k));
  let alt = 0;
  if (kindsPalavra.length) ws.forEach((w, i) => {
    const c = w.t.replace(/[^\p{L}\p{N}%$]/gu, "");
    if (w.start < 3 || c.length < 6 || /\d/.test(c) || /(ando|endo|indo|mente)$/i.test(c) || STOP.has(c.toLowerCase()) || usados.has(c.toLowerCase()) || !isHot(w.t)) return;
    const kind = kindsPalavra[alt % kindsPalavra.length];
    const sub = kind === "vazado" ? ws.slice(i + 1, i + 3).map((x) => x.t).join(" ").replace(/[.,!?]+$/, "") : undefined;
    if (push({ camada: "lettering", t: w.start, end: w.start + 2, resumo: `${kind === "vazado" ? "Texto vazado" : kind === "letreiro" ? "Letreiro" : "Palavra-chave"}: "${c}"`, motivo: "Palavra forte da fala.", title: T(kind, c, w.start, 2, sub) }, gL)) { usados.add(c.toLowerCase()); alt++; }
  });

  // 6) CTA no fim
  if (letTipos.has("cta") && end > 8) push({ camada: "lettering", t: Math.max(0, end - 3), end, resumo: "CTA no final", motivo: "Fecha pedindo a ação.", title: T("cta", opts.wide ? "Se inscreve e ativa o sininho" : "Comenta EU QUERO", Math.max(0, end - 3), 3) }, 0, false);

  return out.sort((a, b) => a.t - b.t);
}

export const CAMADA_LABEL: Record<Camada, string> = { lettering: "Lettering", insercao: "Imagem", motion: "Motion", camera: "Câmera" };
