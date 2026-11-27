"use client";
import Mockups from "./Mockups";
import type { StepProps } from "./types";

export default function ApplicationsStep({ d, go }: StepProps) {
  return (
    <div className="space-y-4">
      <Mockups d={d} />
      <p className="text-xs text-fog">As peças usam a assinatura principal, o monograma, a paleta, as fontes e o grafismo. Se algo não funcionar aqui, ajuste em <button onClick={() => go("logotipo")} className="text-mint">Logotipo</button>, <button onClick={() => go("cores")} className="text-mint">Cores</button> ou <button onClick={() => go("grafismos")} className="text-mint">Grafismos</button>.</p>
    </div>
  );
}
