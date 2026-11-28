/**
 * Segunda saída do Editor: converte a edição montada no HUB num plano para o painel VINCIT HUB no Premiere.
 * O Premiere recebe o vídeo bruto (os arquivos originais em V1, um depois do outro, a partir do 0),
 * então todos os tempos vão no tempo do arquivo original, não no tempo da saída já cortada.
 * Os cortes viram marcadores para conferir; legendas e letterings usam os MOGRTs do kit ou viram marcadores.
 */
import { MOTION_KINDS, TITLE_LABEL, OVERLAY_MODES, layout, motionEnd, segLen, type Kit, type Media, type Project, type Word } from "./model";

type Screen = { start: number; end: number; words: { t: string }[] };

const r2 = (x: number) => Math.round(x * 100) / 100;

export function planoPremiere(p: Project, media: Media[], kit: Kit, screens: Screen[], estilo?: { num: string; nome: string } | null) {
  const L = layout(p);
  // arquivos da fala, na ordem em que aparecem na timeline: é assim que entram em V1 no Premiere
  const ordem: Media[] = [];
  for (const l of L) { const m = media.find((x) => x.id === l.seg.mediaId); if (m && !ordem.includes(m)) ordem.push(m); }
  const offset = new Map<string, number>();
  let acc = 0;
  for (const m of ordem) { offset.set(m.id, acc); acc += m.duration || 0; }

  /** tempo da saída → tempo da sequência do Premiere (arquivo original) */
  const seqT = (t: number, fim = false) => {
    const tt = fim ? Math.max(0, t - 0.001) : t;
    const l = L.find((x) => tt >= x.start && tt < x.end) || L[L.length - 1];
    if (!l) return 0;
    const src = l.seg.in + Math.min(segLen(l.seg), Math.max(0, tt - l.start));
    return r2((offset.get(l.seg.mediaId) || 0) + src + (fim ? 0.001 : 0));
  };

  // cortes: o que ficou de fora de cada arquivo
  const cortes: { inicio: number; fim: number; motivo: string }[] = [];
  for (const m of ordem) {
    const usados = p.segments.filter((s) => s.mediaId === m.id).map((s) => [s.in, s.out] as [number, number]).sort((a, b) => a[0] - b[0]);
    let cur = 0;
    const off = offset.get(m.id) || 0;
    for (const [a, b] of usados) {
      if (a - cur > 0.1) cortes.push({ inicio: r2(off + cur), fim: r2(off + a), motivo: cur === 0 ? "Começo sem fala" : "Silêncio ou trecho tirado no Editor do HUB" });
      cur = Math.max(cur, b);
    }
    if ((m.duration || 0) - cur > 0.1) cortes.push({ inicio: r2(off + cur), fim: r2(off + (m.duration || 0)), motivo: "Final sem fala" });
  }

  const legendas = p.captionsOn ? screens.map((s) => ({ inicio: seqT(s.start), fim: seqT(s.end, true), texto: s.words.map((w) => w.t).join(" ") })) : [];

  const titulos = p.titles.filter((t) => !MOTION_KINDS.includes(t.kind)).map((t) => ({ inicio: seqT(t.start), fim: seqT(t.end, true), texto: t.text, tipo: t.kind, linha: t.sub || undefined, nome: TITLE_LABEL[t.kind] }));
  const motion = p.titles.filter((t) => MOTION_KINDS.includes(t.kind)).map((t) => ({ inicio: seqT(t.start), fim: seqT(t.end, true), texto: t.text, tipo: t.kind, linha: t.sub || undefined, nome: TITLE_LABEL[t.kind] }));

  const zooms = p.zooms.map((z) => ({ inicio: seqT(z.start), fim: seqT(z.end, true), escala: z.scale, tipo: z.tipo || "punch" }));

  const modo = (m: string) => OVERLAY_MODES.find(([v]) => v === m)?.[1] || m;
  const insercoes = (p.overlays || []).map((o) => {
    const m = media.find((x) => x.id === o.mediaId);
    return { inicio: seqT(o.start), fim: seqT(o.end, true), midia: m?.name || "imagem", modo: o.mode, motivo: `Imagem de inserção (${modo(o.mode)})` };
  });

  // motion e instruções de estilo vão como marcadores com nota
  const marcadores: { inicio: number; fim?: number; texto: string }[] = [];
  const leg = kit.legenda || {};
  marcadores.push({ inicio: 0, texto: `VINCIT · ${estilo ? `Estilo ${estilo.num} ${estilo.nome} · ` : ""}legenda ${leg.estilo || "impacto"}${leg.animacao ? ` (${leg.animacao})` : ""}, ${leg.palavras_por_tela || 3} palavras por tela${leg.caixa_alta ? ", caixa alta" : ""} · fontes ${kit.fontes?.titulo || ""} / ${kit.fontes?.legenda || ""} · destaque ${kit.cores?.destaque || ""}${p.look && p.look !== "natural" ? ` · look ${p.look}` : ""}${p.logCamera ? ` · log ${p.logCamera} (LUT de entrada)` : ""}${p.lut ? ` · LUT ${p.lut} (baixe em /audiovisual/luts)` : ""}${p.transicao && p.transicao !== "corte" ? ` · transição ${p.transicao}` : ""}` });

  // cenas e motions por cima (pacote de cenas do roteiro, vinhetas): marcador com o texto, para pôr o MP4 do HUB em V3
  for (const m of p.motions || []) {
    const c = m.spec.cenas[0];
    const txt = m.spec.cenas.length === 1 && c ? [c.sub, c.texto].filter(Boolean).join(" · ").replace(/\*/g, "") : `${m.spec.cenas.length} cenas`;
    marcadores.push({ inicio: seqT(m.start), fim: seqT(motionEnd(m), true), texto: `MOTION ${m.nome.replace(/^Cena · /, "Cena: ")}${txt ? ` (${txt})` : ""}. Exporte em Audiovisual > Motion e ponha em V3${m.transparente ? " (WebM transparente)" : ""}.` });
  }

  const plan = {
    resumo: `Edição montada no Editor do HUB${estilo ? ` no estilo ${estilo.num} · ${estilo.nome}` : ""}: ${cortes.length} cortes, ${legendas.length} legendas, ${titulos.length} letterings, ${motion.length} motion, ${zooms.length} movimentos de câmera, ${insercoes.length} imagens.`,
    origem: "editor_hub",
    estilo: estilo?.num,
    cortes, legendas, titulos, motion, zooms, insercoes, marcadores,
  };

  // transcrição e timeline no tempo da sequência, para o Claude poder refazer o plano se pedirem
  const transcript: { inicio: number; fim: number; texto: string }[] = [];
  for (const m of ordem) (m.words || []).forEach((w: Word) => transcript.push({ inicio: r2((offset.get(m.id) || 0) + w.s), fim: r2((offset.get(m.id) || 0) + w.e), texto: w.t }));
  const timeline = ordem.map((m) => ({ faixa: "V1", nome: m.name, inicio: r2(offset.get(m.id) || 0), fim: r2((offset.get(m.id) || 0) + (m.duration || 0)) }));
  return { plan, transcript, timeline, duracao: r2(acc), arquivos: ordem.map((m) => m.name) };
}
