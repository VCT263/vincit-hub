/**
 * Roteiro técnico (folha A4 do Quadro de produção).
 * Monta, sem IA, a tabela fala × direção técnica a partir do roteiro em markdown.
 * Cada linha vira um plano da decupagem (av_shots), então a folha, a decupagem e a ordem do dia mostram a mesma lista.
 */
import { FALA_COL, NOT_SPOKEN, SPOKEN, col, parseScript, parseTables, splitSections, unquote } from "@/lib/prompter";

export type SheetRow = {
  part: string | null; line: string | null; description: string; framing: string | null;
  movement: string | null; broll: string | null; audio: string | null; notes: string | null;
};

export const MOVES = ["Fixa (tripé)", "Na mão, leve", "Push-in lento", "Pull-out", "Pan", "Tilt", "Acompanha a ação", "Travelling", "Gimbal", "Zoom digital na edição"];
export const AUDIOS = ["Voz (lapela)", "Voz (celular perto)", "Som ambiente", "Trilha baixa", "Trilha sobe", "Efeito (whoosh)", "Silêncio"];
export const PARTS = ["Gancho", "Contexto", "Desenvolvimento", "Virada", "Prova", "CTA", "Fechamento"];

const CTA = /coment|segue|seguir|salva|compartilh|manda|link|clica|chama|agenda|direct|dm\b|me conta/i;

/** sugestão de enquadramento pela descrição da cena */
export function guessFraming(scene: string, talking: boolean): string | null {
  const s = scene.toLowerCase();
  if (/top ?shot|de cima|vista superior/.test(s)) return "Top shot";
  if (/pov|ponto de vista/.test(s)) return "POV";
  if (/macro/.test(s)) return "Macro";
  if (/detalhe|m[aã]os?\b|produto|textura|close ?up de/.test(s)) return "Detalhe";
  if (/close|primeir[oa] plano|rosto/.test(s)) return "Close";
  if (/m[eé]dio fechado/.test(s)) return "Médio fechado";
  if (/m[eé]dio|cintura|peito/.test(s)) return "Médio · olho";
  if (/geral|aberto|ambiente|cabine|sala|loja/.test(s)) return "Plano aberto";
  return talking ? "Médio · olho" : null;
}
/** sugestão de movimento pela descrição da cena */
export function guessMove(scene: string, talking: boolean): string | null {
  const s = scene.toLowerCase();
  if (/aproxim|push|entra devagar|zoom in/.test(s)) return "Push-in lento";
  if (/afasta|pull|abre o plano/.test(s)) return "Pull-out";
  if (/acompanha|segue|caminha|andando/.test(s)) return "Acompanha a ação";
  if (/gimbal/.test(s)) return "Gimbal";
  if (/pan\b|panor/.test(s)) return "Pan";
  if (/trip[eé]|fix/.test(s)) return "Fixa (tripé)";
  return talking ? "Fixa (tripé)" : "Na mão, leve";
}

/** etapa do roteiro pela posição: a primeira fala é o gancho, a última com chamada é o CTA */
function partFor(i: number, n: number, line: string, given?: string) {
  if (given) return given;
  if (i === 0) return "Gancho";
  if (i === n - 1) return CTA.test(line) ? "CTA" : "Fechamento";
  return "Desenvolvimento";
}

export function rowsFromScript(md: string): SheetRow[] {
  const table = parseTables(md).find((t) => col(t.head, FALA_COL) >= 0);
  if (table) {
    const h = table.head;
    const f = col(h, FALA_COL);
    const tempo = col(h, /tempo|tc\b|time|dura/i);
    const cena = col(h, /cena|visual|imagem|a[cç][aã]o|plano/i);
    const tela = col(h, /tela|lettering|letreiro|texto/i, FALA_COL);
    const audio = col(h, /[aá]udio|som|trilha/i);
    const broll = col(h, /b-?roll|inser/i);
    const mov = col(h, /movimento|c[aâ]mera/i);
    const etapa = col(h, /etapa|parte|bloco/i);
    const rows = table.rows.filter((r) => r.some((c) => c.trim()));
    return rows.map((r, i) => {
      const line = unquote(r[f] || "");
      const scene = cena >= 0 ? (r[cena] || "").trim() : "";
      const talking = !!line;
      const part = partFor(i, rows.length, line, etapa >= 0 ? r[etapa] : undefined);
      return {
        part: tempo >= 0 && r[tempo] ? `${part} · ${r[tempo]}` : part,
        line: line || null,
        description: scene || (talking ? "Fala para a câmera" : "Inserção"),
        framing: guessFraming(scene, talking),
        movement: mov >= 0 && r[mov] ? r[mov] : guessMove(scene, talking),
        broll: broll >= 0 && r[broll] ? r[broll] : null,
        audio: audio >= 0 && r[audio] ? r[audio] : talking ? "Voz (lapela)" : "Som ambiente",
        notes: tela >= 0 && r[tela] ? `Tela: ${unquote(r[tela])}` : null,
      };
    });
  }

  // sem tabela: cada bloco falado vira uma linha e as [indicações] viram B-roll
  const { blocks } = parseScript(md || "");
  const spoken = blocks.filter((b) => b.toks.some((t) => !t.cue));
  return blocks
    .map((b) => {
      const line = b.toks.filter((t) => !t.cue).map((t) => t.t).join(" ").trim();
      const cues = b.toks.filter((t) => t.cue).map((t) => t.t.replace(/^\[|\]$/g, "").trim()).filter(Boolean);
      return { b, line, cues };
    })
    .filter((x) => x.line || x.cues.length)
    .map((x) => {
      const idx = spoken.indexOf(x.b);
      const scene = x.cues.join(" · ");
      return {
        part: x.line ? partFor(idx, spoken.length, x.line, x.b.label) : x.b.label || "Inserção",
        line: x.line || null,
        description: x.line ? "Fala para a câmera" : `Inserção: ${scene}`,
        framing: x.line ? "Médio · olho" : guessFraming(scene, false),
        movement: x.line ? "Fixa (tripé)" : guessMove(scene, false),
        broll: x.line && x.cues.length ? scene : null,
        audio: x.line ? "Voz (lapela)" : "Som ambiente",
        notes: null,
      } as SheetRow;
    });
}

/** partes do markdown que não são falas e valem mostrar na folha (ideia, opções de gancho, dicas de gravação) */
export function scriptExtras(md: string) {
  const secs = splitSections(md);
  const find = (re: RegExp) => secs.find((s) => s.title && re.test(s.title));
  const ideia = find(/ideia|conceito|resumo/i)?.body.trim() || null;
  const ganchos = (find(/gancho/i)?.body || "").split("\n").map((l) => unquote(l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")).replace(/\*\*/g, "")).filter(Boolean);
  const dicas = ((find(/dica/i) || secs.find((s) => s.title && /grava[cç][aã]o|dire[cç][aã]o|\bset\b/i.test(s.title) && !SPOKEN.test(s.title)))?.body || "").split("\n").map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  const legenda = find(/legenda|caption/i)?.body.trim() || null;
  const hasRest = secs.some((s) => s.title && (SPOKEN.test(s.title) || !NOT_SPOKEN.test(s.title)));
  return { ideia, ganchos, dicas, legenda, hasRest };
}

/** tempo de fala estimado (150 palavras por minuto), em segundos */
export const speechSeconds = (text: string) => Math.round(((text || "").split(/\s+/).filter(Boolean).length / 150) * 60);
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
