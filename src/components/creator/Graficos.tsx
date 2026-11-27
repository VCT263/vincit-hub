"use client";
/** Gráficos leves em SVG para Desempenho & insights (sem biblioteca): área com cursor, sparkline e colunas empilhadas. */
import { useRef, useState } from "react";

const MINT = "var(--color-mint)";
export const LILAS = "#c084fc";
const GRID = "var(--color-line)";

export const num = (n: number | null | undefined, casas = 0) =>
  n == null ? "–" : Intl.NumberFormat("pt-BR", { notation: Math.abs(n) >= 10000 ? "compact" : "standard", maximumFractionDigits: casas || (Math.abs(n) >= 10000 ? 1 : 0) }).format(n);

const diaCurto = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

/** ticks redondos do eixo y */
function ticks(max: number) {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** gráfico de área de uma série por dia, com cursor e balão */
export function AreaChart({ data, label, fmtV = (v: number) => num(v), height = 220 }: { data: { date: string; v: number | null }[]; label: string; fmtV?: (v: number) => string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = height, L = 44, R = 12, T = 12, B = 26;
  const vals = data.map((d) => d.v ?? 0);
  const tk = ticks(Math.max(...vals, 0));
  const max = tk[tk.length - 1] || 1;
  const n = data.length;
  const x = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.v ?? 0).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const step = Math.max(1, Math.ceil(n / 6));
  const peak = vals.indexOf(Math.max(...vals));

  function move(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none touch-none" role="img" aria-label={`${label} por dia`}
        onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
        {tk.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-fog" fontSize={11} style={{ fontVariantNumeric: "tabular-nums" }}>{num(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % step === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= step / 2) ? (
          <text key={d.date} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-fog" fontSize={11}>{diaCurto(d.date)}</text>
        ) : null)}
        <path d={area} fill={MINT} opacity={0.1} />
        <path d={line} fill="none" stroke={MINT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {vals[peak] > 0 && hover == null && (
          <g>
            <circle cx={x(peak)} cy={y(vals[peak])} r={4.5} fill={MINT} stroke="var(--color-panel)" strokeWidth={2} />
            <text x={Math.min(Math.max(x(peak), L + 30), W - R - 30)} y={Math.max(y(vals[peak]) - 10, 11)} textAnchor="middle" className="fill-paper" fontSize={12} fontWeight={600}>{fmtV(vals[peak])}</text>
          </g>
        )}
        {h && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={T} y2={y(0)} stroke="var(--color-fog)" strokeWidth={1} />
            <circle cx={x(hover!)} cy={y(h.v ?? 0)} r={5} fill={MINT} stroke="var(--color-panel)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && (
        <div className="absolute top-0 pointer-events-none card px-3 py-2 text-xs shadow-xl" style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > n / 2 ? "-105%" : "5%"})` }}>
          <p className="text-fog">{new Date(h.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}</p>
          <p className="font-semibold text-paper mt-0.5"><span className="inline-block w-2 h-2 rounded-full bg-mint mr-1.5" />{h.v == null ? "–" : fmtV(h.v)} <span className="text-fog font-normal">{label.toLowerCase()}</span></p>
        </div>
      )}
    </div>
  );
}

/** sparkline de 1 série, sem eixos */
export function Spark({ values, active }: { values: (number | null)[]; active?: boolean }) {
  const v = values.map((x) => x ?? 0);
  const W = 100, H = 28;
  const max = Math.max(...v, 1);
  const d = v.map((p, i) => `${i ? "L" : "M"}${((i / Math.max(1, v.length - 1)) * W).toFixed(1)},${(H - 2 - (p / max) * (H - 4)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-7" aria-hidden>
      <path d={`${d}L${W},${H}L0,${H}Z`} fill={active ? MINT : "var(--color-fog)"} opacity={0.12} />
      <path d={d} fill="none" stroke={active ? MINT : "var(--color-fog)"} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** colunas empilhadas (compartilhamentos + salvamentos por alcance), uma por post, em ordem de data */
export function SignalColumns({ posts, onPick }: { posts: { id: string; date: string; a: number; b: number; caption?: string; thumb?: string; tipo: string }[]; onPick?: (id: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 200, L = 40, R = 8, T = 10, B = 22;
  const tk = ticks(Math.max(...posts.map((p) => p.a + p.b), 0.0001) * 100).map((t) => t / 100);
  const max = tk[tk.length - 1] || 1;
  const n = posts.length || 1;
  const slot = (W - L - R) / n;
  const bw = Math.min(24, slot - 2);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const h = hover != null ? posts[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Compartilhamentos e salvamentos por alcance, por post" onPointerLeave={() => setHover(null)}>
        {tk.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" className="fill-fog" fontSize={11}>{(t * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</text>
          </g>
        ))}
        {posts.map((p, i) => {
          const cx = L + slot * i + slot / 2, x0 = cx - bw / 2;
          const ya = y(p.a), yb = y(p.a + p.b);
          const dim = hover != null && hover !== i;
          return (
            <g key={p.id} opacity={dim ? 0.45 : 1} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onClick={() => onPick?.(p.id)} className="cursor-pointer">
              <rect x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent" />
              {p.a > 0 && <path d={roundTop(x0, ya, bw, y(0) - ya, p.b > 0 ? 0 : 3)} fill={MINT} />}
              {p.b > 0 && <path d={roundTop(x0, yb, bw, Math.max(0, ya - yb - (p.a > 0 ? 2 : 0)), 3)} fill={LILAS} />}
            </g>
          );
        })}
        <text x={L} y={H - 5} className="fill-fog" fontSize={11}>{posts[0] && diaCurto(posts[0].date)}</text>
        <text x={W - R} y={H - 5} textAnchor="end" className="fill-fog" fontSize={11}>{posts[n - 1] && diaCurto(posts[n - 1].date)}</text>
      </svg>
      {h && (
        <div className="absolute top-0 pointer-events-none card p-2.5 text-xs shadow-xl w-56" style={{ left: `${((L + slot * hover! + slot / 2) / W) * 100}%`, transform: `translateX(${hover! > n / 2 ? "-105%" : "5%"})` }}>
          <div className="flex gap-2">
            {h.thumb ? <img src={h.thumb} alt="" className="w-10 h-10 rounded object-cover" /> : null}
            <div className="min-w-0"><p className="text-fog">{diaCurto(h.date)} · {h.tipo}</p><p className="truncate text-paper">{h.caption || "(sem legenda)"}</p></div>
          </div>
          <p className="mt-2 flex justify-between"><span><span className="inline-block w-2 h-2 rounded-sm bg-mint mr-1.5" />Compartilhamentos</span><b className="text-paper">{(h.a * 100).toFixed(2)}%</b></p>
          <p className="flex justify-between"><span><span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ background: LILAS }} />Salvamentos</span><b className="text-paper">{(h.b * 100).toFixed(2)}%</b></p>
        </div>
      )}
    </div>
  );
}

/** retângulo com cantos de cima arredondados e base reta */
function roundTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** barra horizontal fina com valor na ponta */
export function HBar({ value, max, color = MINT }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-panel2 overflow-hidden">
      <div className="h-full rounded-r-[4px]" style={{ width: `${max ? Math.max(1.5, (value / max) * 100) : 0}%`, background: color }} />
    </div>
  );
}
