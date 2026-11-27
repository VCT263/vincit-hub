"use client";
import Mockups from "./Mockups";
import type { StepProps } from "./types";

/* mockups-design.com: licença permite uso comercial e para clientes, sem crédito; só não pode redistribuir os PSD */
const MOCKUPS = [
  ["Cartões de visita", "free-business-card-mockups"], ["Papelaria", "free-stationery-mockups"], ["Embalagem", "packaging-mockups"],
  ["Sacolas", "free-bags-mockups"], ["Canecas", "free-mugs-mockups"], ["Vestuário", "apparel"], ["Etiquetas", "label-tags-2"],
  ["Fachada e placas", "free-signage-mockups"], ["Urbanos", "urban-mockups"], ["Pôsteres", "free-poster-mockups"], ["Logo", "free-logo-mockups"], ["Telas", "free-devices-mockups"],
];

export default function ApplicationsStep({ d, go }: StepProps) {
  return (
    <div className="space-y-4">
      <Mockups d={d} />
      <div className="card p-4 space-y-2">
        <p className="font-semibold text-sm">Mockups realistas grátis</p>
        <p className="text-xs text-fog">Para a apresentação e o Behance: baixe o logo em PNG ou SVG na etapa Apresentação e cole no objeto inteligente do PSD, ou use o editor online do site (sem Photoshop). Uso comercial e para clientes liberado, sem crédito; só não pode repassar os arquivos PSD.</p>
        <div className="flex flex-wrap gap-1.5">{MOCKUPS.map(([l, slug]) => <a key={slug} href={`https://mockups-design.com/${slug}/`} target="_blank" rel="noreferrer" className="chip hover:border-mint">{l} ↗</a>)}</div>
      </div>
      <p className="text-xs text-fog">As peças usam a assinatura principal, o monograma, a paleta, as fontes e o grafismo. Se algo não funcionar aqui, ajuste em <button onClick={() => go("logotipo")} className="text-mint">Logotipo</button>, <button onClick={() => go("cores")} className="text-mint">Cores</button> ou <button onClick={() => go("grafismos")} className="text-mint">Grafismos</button>.</p>
    </div>
  );
}
