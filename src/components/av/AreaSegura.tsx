"use client";
/**
 * Grade de área segura por cima da prévia (28/11, ideia do @gabeberaldo): margem de 35 px e, no 9:16,
 * as faixas que a interface do Reels cobre (topo, legenda/perfil embaixo e a coluna de botões à direita).
 * Só desenha; não entra no vídeo exportado. Medidas em px de 1080x1920, convertidas em %.
 */
export const ZONA_REELS = { margem: 35, topo: 250, base: 420, coluna: 150, colunaTopo: 960 };

export default function AreaSegura({ w, h }: { w: number; h: number }) {
  const vertical = h > w;
  const px = (v: number, base: number) => `${(v / base) * 100}%`;
  const m = ZONA_REELS.margem * (w / 1080);
  const faixa = "absolute bg-red-500/20 border-red-400/60";
  const rotulo = "absolute font-mono text-[9px] uppercase tracking-wider text-red-200/90 px-1";
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div className="absolute border border-dashed border-cyan-300/70" style={{ left: px(m, w), right: px(m, w), top: px(m, w * (h / w)), bottom: px(m, w * (h / w)) }} />
      {vertical && <>
        <div className={`${faixa} inset-x-0 top-0 border-b`} style={{ height: px(ZONA_REELS.topo, 1920) }}><span className={`${rotulo} bottom-0 left-0`}>topo do app</span></div>
        <div className={`${faixa} inset-x-0 bottom-0 border-t`} style={{ height: px(ZONA_REELS.base, 1920) }}><span className={`${rotulo} top-0 left-0`}>perfil e legenda</span></div>
        <div className={`${faixa} right-0 border-l`} style={{ width: px(ZONA_REELS.coluna, 1080), top: px(ZONA_REELS.colunaTopo, 1920), bottom: px(ZONA_REELS.base, 1920) }}><span className={`${rotulo} top-0 right-0`}>botões</span></div>
      </>}
    </div>
  );
}
