"use client";
import { useState } from "react";
import { lockupSvg, primaryLogo, svgParts, type LockupKind } from "@/lib/design";
import { SvgView } from "../ui";
import type { StepProps } from "./types";

const PHI = 1.618;

export default function ConstructionStep({ d, set }: StepProps) {
  const pal: Record<string, string> = Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex]));
  const [show, setShow] = useState({ grade: true, circulos: true, protecao: true, linhas: true });
  const base = primaryLogo(d);
  const c = d.construcao || { x: 25, min_px: 24, min_mm: 10 };
  const C = (patch: any) => set({ construcao: { ...c, ...patch } });
  if (!base) return <p className="text-sm text-fog text-center py-10">Escolha um símbolo ou salve o logotipo antes de ver a construção.</p>;

  const p = svgParts(base); const W = p.w, H = p.h;
  const x = (Math.min(W, H) * c.x) / 100; // unidade x (área de proteção)
  const M = x * 1.6;
  const hasSymLeft = (d.principal || "horizontal") === "horizontal" && (d.symbol_id || d.logo_id);
  const sc = hasSymLeft ? { cx: H / 2, cy: H / 2, r: H / 2 } : { cx: W / 2, cy: H / 2, r: Math.min(W, H) / 2 };
  const unit = x / 2;
  const grid: string[] = [];
  if (show.grade) {
    for (let gx = -M; gx <= W + M; gx += unit) grid.push(`<line x1="${gx}" y1="${-M}" x2="${gx}" y2="${H + M}" stroke="#0f9e6e" stroke-opacity=".22" stroke-width="${W / 900}"/>`);
    for (let gy = -M; gy <= H + M; gy += unit) grid.push(`<line x1="${-M}" y1="${gy}" x2="${W + M}" y2="${gy}" stroke="#0f9e6e" stroke-opacity=".22" stroke-width="${W / 900}"/>`);
  }
  const circles = show.circulos ? [1, 1 / PHI, 1 / PHI / PHI, 1 / PHI ** 3].map((k) => `<circle cx="${sc.cx}" cy="${sc.cy}" r="${sc.r * k}" fill="none" stroke="#ff6b6b" stroke-opacity=".7" stroke-width="${W / 600}"/>`).join("") + `<line x1="${sc.cx}" y1="${-M}" x2="${sc.cx}" y2="${H + M}" stroke="#ff6b6b" stroke-opacity=".5" stroke-width="${W / 900}"/>` : "";
  const prot = show.protecao ? `<rect x="${-x}" y="${-x}" width="${W + 2 * x}" height="${H + 2 * x}" fill="none" stroke="#0f9e6e" stroke-dasharray="${x / 4} ${x / 6}" stroke-width="${W / 500}"/><text x="${-x}" y="${-x - x * .2}" font-family="JetBrains Mono" font-size="${x * .5}" fill="#0f9e6e">x</text>` : "";
  const lines = show.linhas ? [0, H].map((y) => `<line x1="${-M}" y1="${y}" x2="${W + M}" y2="${y}" stroke="#8a8f94" stroke-width="${W / 900}" stroke-dasharray="${x / 5}"/>`).join("") : "";
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-M} ${-M} ${W + 2 * M} ${H + 2 * M}">${grid.join("")}<svg x="0" y="0" width="${W}" height="${H}" viewBox="${p.vb}">${p.inner}</svg>${circles}${prot}${lines}</svg>`;
  const fav = d.monogram ? lockupSvg("monograma", d) : lockupSvg((d.symbol_id || d.logo_id ? "simbolo" : "logotipo") as LockupKind, d);

  return (
    <div className="space-y-5">
      <section className="card p-5 rise">
        <div className="flex flex-wrap gap-2 mb-4">
          {([["grade", "Grade modular"], ["circulos", "Círculos áureos"], ["protecao", "Área de proteção"], ["linhas", "Linhas de base"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setShow({ ...show, [k]: !show[k] })} className={`chip !px-3 !py-1.5 ${show[k] ? "chip-mint" : ""}`}>{l}</button>
          ))}
        </div>
        <div className="rounded-xl p-6 border border-line" style={{ background: pal["Claro"] || "#f4f4f2" }}><SvgView svg={overlay} className="w-full h-72 md:h-96" /></div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div><label className="label">Unidade x (área de proteção): {c.x}% da altura</label><input type="range" min={10} max={60} value={c.x} onChange={(e) => C({ x: +e.target.value })} className="w-full accent-[var(--color-mint)]" /></div>
          <div><label className="label">Redução mínima na tela (px de altura)</label><input type="number" value={c.min_px} onChange={(e) => C({ min_px: +e.target.value })} className="input" /></div>
          <div><label className="label">Redução mínima impressa (mm de altura)</label><input type="number" value={c.min_mm} onChange={(e) => C({ min_mm: +e.target.value })} className="input" /></div>
        </div>
        <p className="text-xs text-fog mt-3">A grade usa metade da unidade x como módulo. Os círculos seguem a proporção áurea (1 : 1,618) a partir do símbolo; ajuste o desenho até as curvas conversarem com eles. Esses parâmetros vão para o manual.</p>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Teste de redução</p>
          <div className="rounded-xl bg-[#f4f4f2] p-5 flex items-end gap-6 flex-wrap">
            {[64, 40, c.min_px, 16].map((h, i) => (
              <div key={i} className="text-center">
                <div style={{ height: h, width: (h * W) / H }}><SvgView svg={base} className="w-full h-full" /></div>
                <p className={`text-[10px] mt-1 ${h < c.min_px ? "text-[#e03131]" : "text-neutral-500"}`}>{h}px{h < c.min_px ? " · abaixo do mínimo" : ""}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Favicon e ícone de app</p>
          <div className="flex items-end gap-5 flex-wrap">
            {[180, 64, 32, 16].map((s) => (
              <div key={s} className="text-center">
                <div className="grid place-items-center overflow-hidden" style={{ width: Math.max(s, 16), height: Math.max(s, 16), borderRadius: s * .22, background: pal["Primária"] || "#111" }}>
                  <SvgView svg={fav} className="w-[78%] h-[78%]" />
                </div>
                <p className="text-[10px] text-fog mt-1">{s}px</p>
              </div>
            ))}
            <div className="rounded-lg bg-panel2 border border-line px-3 py-2 flex items-center gap-2 text-xs"><span className="w-4 h-4 rounded-sm overflow-hidden grid place-items-center" style={{ background: pal["Primária"] || "#111" }}><SvgView svg={fav} className="w-full h-full" /></span>{d.brief?.nome || "Marca"} · site</div>
          </div>
          <p className="text-[11px] text-fog mt-3">Se o detalhe some em 16 px, use o monograma ou uma versão simplificada do símbolo.</p>
        </section>
      </div>
    </div>
  );
}
