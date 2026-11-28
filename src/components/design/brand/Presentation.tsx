"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AXES, LOCKUPS, cmyk, contrast, hexToRgb, loadFonts, lockupSvg, patternSvg, primaryLogo, readableOn, svgParts, type Pattern, type Swatch } from "@/lib/design";
import { ARCHETYPES, MAP_AXES, NICHES, SCALES, archetypeMix } from "@/lib/brand-strategy";
import { SvgView } from "../ui";
import Mockups from "./Mockups";
import { PhotoScene, SCENES, Scene, SceneStyle, sceneKit, type Foto } from "./Scenes";
import { MockupCover, byGroup, type Mockup } from "./MockupView";
import { brandVoice } from "./MockupArt";
import { brandPrompt } from "@/lib/brandPrompt";
import { createPortal } from "react-dom";
import { useLite, useNear, usePrintAll } from "./lazy";
import { grainBg, warmGrain } from "./grain";
import { ArchetypeSlide, ChannelsSlide, ManifestoSlide, PositioningSlide, RewriteSlide, SituationsSlide, ToneSlide, ValuesSlide, VocabSlide, WeAreSlide, type Verbal } from "./VerbalSlides";
import { ExpressionSlide, FeedGridSlide, FeedWhySlide, PhotoMoodSlide, PhotoRulesSlide, RealAppsSlide, type AppReal, type Feed, type FotoMood, FeedCompareSlide, FeedPlanSlide, FeedIdealWhySlide, FeedRefsSlide, type FeedIdeal } from "./RealSlides";
import { FeedSlide, PostsSlide, SiteDesktopSlide, SiteFullSlide } from "./BrandShowcase";

/* Apresentação de marca no formato de estúdio: grade editorial fixa (faixa lateral com cliente,
   seção e página), divisores de capítulo com número gigante, um acento só, filetes finos.
   Cada slide é desenhado em pixels fixos e escalado na tela; na impressão vira uma página do PDF. */

export const FORMATS = { "16:9": { w: 1600, h: 900, l: "16:9 · tela e PDF padrão" }, "3:2": { w: 1600, h: 1067, l: "3:2 · Behance" }, "4:3": { w: 1600, h: 1200, l: "4:3 · tablet" } } as const;
export type Format = keyof typeof FORMATS;

/** estilos de apresentação (como cases diferentes no Behance): a grade e os divisores mudam com o nicho */
export const STYLES = {
  estudio: { l: "Estúdio", d: "Faixa lateral com o nome, número gigante nos capítulos." },
  editorial: { l: "Editorial", d: "Revista de moda: muito respiro, títulos em itálico, capítulos centralizados." },
  cinema: { l: "Cinema", d: "Tarjas de filme em cima e embaixo, capítulos como cartela de título." },
  suico: { l: "Suíço", d: "Grade rigorosa, índice no alto, números finos, sem enfeite." },
} as const;
export type DeckStyle = keyof typeof STYLES;
export function styleFor(d: any): DeckStyle {
  if (d.deck_style && d.deck_style in STYLES) return d.deck_style;
  const n = d.strategy?.nicho;
  if (n === "moda" || n === "beleza") return "editorial";
  if (n === "audiovisual") return "cinema";
  if (["tecnologia", "servicos", "saude", "educacao", "imobiliario"].includes(n)) return "suico";
  return "estudio";
}

export type Ctx = { style: DeckStyle; W: number; H: number; C: Record<string, string>; ink: string; paper: string; acc: string; T: (s?: CSSProperties) => CSSProperties; B: (s?: CSSProperties) => CSSProperties; G: (s?: CSSProperties) => CSSProperties; hasG: boolean; name: string; year: number };
export type SlideDef = { key: string; tone: "dark" | "light" | "acc"; section: string; body: (x: Ctx) => ReactNode; bare?: boolean };

const arr = (v: any): string[] => (Array.isArray(v) ? v : v ? [v] : []);

export function useDeck(d: any, format: Format, mockups: Mockup[] = []) {
  const pal: Swatch[] = d.palette || [];
  const C: Record<string, string> = { Primária: "#2d6a4f", Apoio: "#52796f", Destaque: "#e9c46a", Escuro: "#141414", Claro: "#f4f4f2", ...Object.fromEntries(pal.map((s) => [s.role, s.hex])) };
  const t = d.type || { title: "Bricolage Grotesque", body: "Inter", tw: 800 };
  useEffect(() => { loadFonts([t.title, t.body, t.accent || ""].filter(Boolean)); }, [t.title, t.body, t.accent]);
  const { w: W, h: H } = FORMATS[format];
  const x: Ctx = {
    style: styleFor(d), W, H, C, ink: C["Escuro"], paper: C["Claro"], acc: C["Primária"], name: d.brief?.nome || "Marca", year: new Date().getFullYear(),
    T: (s = {}) => ({ fontFamily: `"${t.title}"`, fontWeight: t.tw || 700, fontStyle: t.ti ? "italic" : "normal", lineHeight: .92, letterSpacing: "-.015em", ...s }),
    G: (s = {}) => ({ fontFamily: `"${t.accent || t.title}"`, fontWeight: 400, lineHeight: 1, ...s }), hasG: !!t.accent,
    B: (s = {}) => ({ fontFamily: `"${t.body}"`, ...s }),
  };
  return { x, slides: buildSlides(d, x, t, mockups) };
}

/* grão de papel: tira a cara de tela lisa (como nos cases impressos do Behance) */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;
warmGrain(GRAIN);

/** palavra grande que diminui até caber (nome longo, como "Alanis Gomes", saía cortado pela esquerda).
   Mede com canvas: no deck de impressão os slides ficam ocultos até imprimir, sem largura para medir. */
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, st: CSSProperties, size: number) {
  if (typeof document === "undefined") return 0;
  measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = `${st.fontStyle || "normal"} ${st.fontWeight || 400} ${size}px ${st.fontFamily || "serif"}`;
  const ls = typeof st.letterSpacing === "string" && st.letterSpacing.endsWith("em") ? parseFloat(st.letterSpacing) * size : typeof st.letterSpacing === "number" ? st.letterSpacing : 0;
  return measureCtx.measureText(text).width + ls * Math.max(text.length - 1, 0);
}
function FitWord({ style, max, children }: { style: CSSProperties; max: number; children: string }) {
  const base = typeof style.fontSize === "number" ? style.fontSize : 0;
  const calc = () => { const w = base ? textWidth(children, style, base) : 0; return w > max ? max / w : 1; };
  const [k, setK] = useState(1);
  useEffect(() => { setK(calc()); document.fonts?.ready.then(() => setK(calc())); }, [base, max, children, style.fontFamily]); // eslint-disable-line react-hooks/exhaustive-deps
  return <p style={{ ...style, fontSize: base ? base * k : style.fontSize }}>{children}</p>;
}

/* ───────── peças de layout ───────── */
const Label = ({ x, children, style }: { x: Ctx; children: ReactNode; style?: CSSProperties }) => <p style={x.B({ fontSize: 13, letterSpacing: ".28em", textTransform: "uppercase", fontWeight: 600, ...style })}>{children}</p>;
const Rule = ({ c, style }: { c: string; style?: CSSProperties }) => <div style={{ height: 1, background: c, opacity: .35, ...style }} />;

export function Frame({ x, s, n, total, children }: { x: Ctx; s: SlideDef; n: number; total: number; children: ReactNode }) {
  const bg = s.tone === "dark" ? x.ink : s.tone === "acc" ? x.acc : x.paper;
  const fg = readableOn(bg) === "#ffffff" ? (s.tone === "dark" ? x.paper : "#ffffff") : x.ink;
  const nn = String(n).padStart(2, "0");
  const grain = <div aria-hidden className="deck-grain" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: grainBg(GRAIN), opacity: s.tone === "dark" ? .16 : .1, mixBlendMode: s.tone === "dark" ? "screen" : "multiply" }} />;
  const wrap = (inner: ReactNode) => <div className="deck-slide" data-style={x.style} style={{ width: x.W, height: x.H, background: bg, color: fg, position: "relative", overflow: "hidden" }}>{inner}{grain}<span style={{ display: "none" }}>{total}</span></div>;
  if (s.bare) return wrap(children);
  const small = (t: ReactNode, st: CSSProperties = {}) => <Label x={x} style={{ fontSize: 11, opacity: .65, ...st }}>{t}</Label>;
  if (x.style === "editorial") return wrap(<>
    <div style={{ position: "absolute", left: 100, right: 100, top: 40, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
      {small(s.section)}<span style={x.T({ fontSize: 22, fontStyle: "italic", fontWeight: 400, letterSpacing: 0 })}>{x.name}</span>{small(`${nn} / ${String(total).padStart(2, "0")}`, { textAlign: "right" })}
    </div>
    <div style={{ position: "absolute", left: 100, right: 100, top: 120, bottom: 84 }}>{children}</div>
    <div style={{ position: "absolute", left: 100, right: 100, bottom: 36, display: "flex", justifyContent: "space-between" }}>{small("Identidade de marca", { opacity: .4 })}{small(x.year, { opacity: .4 })}</div>
  </>);
  if (x.style === "cinema") return wrap(<>
    <Letterbox x={x} left={`SC ${nn}`} mid={s.section} right={x.name} n={`${nn} / ${String(total).padStart(2, "0")}`} />
    {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([r, b]) => <span key={`${r}${b}`} style={{ position: "absolute", [r ? "right" : "left"]: 40, [b ? "bottom" : "top"]: 72, width: 22, height: 22, borderColor: `${fg}55`, borderStyle: "solid", borderWidth: 0, [r ? "borderRightWidth" : "borderLeftWidth"]: 1, [b ? "borderBottomWidth" : "borderTopWidth"]: 1 } as CSSProperties} />)}
    <div style={{ position: "absolute", left: 100, right: 100, top: 108, bottom: 100 }}>{children}</div>
  </>);
  if (x.style === "suico") return wrap(<>
    <div style={{ position: "absolute", left: 80, right: 80, top: 36, display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "end" }}>
      <span style={x.B({ fontSize: 13, fontWeight: 700 })}>{x.name}</span>{small(s.section, { opacity: .55 })}<span style={x.B({ fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" })}>{nn}<span style={{ opacity: .4 }}> / {String(total).padStart(2, "0")}</span></span>
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 64, height: 2, background: fg }} />
    <div style={{ position: "absolute", left: 80, right: 80, top: 104, bottom: 64 }}>{children}</div>
    <span style={{ position: "absolute", left: 80, bottom: 30, width: 10, height: 10, background: x.acc }} />
  </>);
  const strip = 72;
  return wrap(<>
    <div style={{ position: "absolute", inset: `0 ${strip}px 0 0`, padding: "0 72px" }}>
      <div style={{ position: "absolute", left: 72, right: 56, top: 44, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label x={x} style={{ fontSize: 11, opacity: .7 }}>{s.section}</Label>
        <Label x={x} style={{ fontSize: 11, opacity: .7 }}>{x.name} · {x.year}</Label>
      </div>
      <Rule c={fg} style={{ position: "absolute", left: 0, right: 0, top: 76 }} />
      <div style={{ position: "absolute", left: 72, right: 56, top: 112, bottom: 64 }}>{children}</div>
    </div>
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: strip, borderLeft: `1px solid ${fg}33`, display: "flex", flexDirection: "column" }}>
      <div style={{ height: "30%", background: s.tone === "acc" ? x.ink : x.acc, color: readableOn(s.tone === "acc" ? x.ink : x.acc), display: "grid", placeItems: "center" }}>
        <span style={x.B({ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase", fontWeight: 700 })}>{x.name}</span>
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <span style={x.B({ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", opacity: .6 })}>Identidade de marca</span>
      </div>
      <div style={{ height: strip, borderTop: `1px solid ${fg}33`, display: "grid", placeItems: "center" }}>
        <span style={x.B({ fontSize: 15, fontWeight: 700 })}>{nn}</span>
      </div>
    </div>
  </>);
}

/** divisor de capítulo, conforme o estilo: número gigante sangrando a margem (estúdio), cartela centralizada
   em itálico (editorial), cartela de filme com moldura (cinema) ou número fino na grade (suíço) */
const divider = (num: number, title: string, sub: string, style: DeckStyle = "estudio"): SlideDef => ({
  key: `div-${num}`, tone: style === "editorial" || style === "suico" ? "light" : "dark", section: title, bare: style !== "estudio", body: (x) => {
    const nn = String(num).padStart(2, "0");
    if (style === "editorial") return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 160px" }}>
        <Label x={x} style={{ fontSize: 13, opacity: .6 }}>Capítulo {nn}</Label>
        <h2 style={x.T({ fontSize: 150, fontStyle: "italic", fontWeight: 400, letterSpacing: "-.03em", marginTop: 26, lineHeight: .95 })}>{title}</h2>
        <div style={{ width: 80, height: 2, background: x.acc, margin: "34px 0 26px" }} />
        <p style={x.B({ fontSize: 21, opacity: .7, maxWidth: 620, lineHeight: 1.5 })}>{sub}</p>
        <p style={x.B({ position: "absolute", bottom: 44, fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase", opacity: .5 })}>{x.name}</p>
      </div>
    );
    if (style === "cinema") return (
      <div style={{ position: "absolute", inset: 0 }}>
        <Letterbox x={x} left={`CAP. ${nn}`} mid={title} right={x.name} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", border: `1px solid ${x.paper}55`, padding: "54px 90px", textAlign: "center", minWidth: 760 }}>
          <Label x={x} style={{ fontSize: 12, color: x.acc }}>Capítulo {nn}</Label>
          <h2 style={x.T({ fontSize: 104, textTransform: "uppercase", marginTop: 20 })}>{title}</h2>
          <p style={x.B({ fontSize: 19, opacity: .7, maxWidth: 560, lineHeight: 1.5, margin: "22px auto 0" })}>{sub}</p>
        </div>
      </div>
    );
    if (style === "suico") return (
      <div style={{ position: "absolute", inset: 0, padding: "56px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", position: "absolute", inset: "0 80px", pointerEvents: "none" }}>{Array.from({ length: 12 }, (_, i) => <div key={i} style={{ borderLeft: `1px solid ${x.ink}12`, height: "100%" }} />)}</div>
        <p style={x.T({ fontSize: 300, fontWeight: 200, letterSpacing: "-.06em", lineHeight: .8, color: x.ink })}>{nn}</p>
        <div style={{ position: "absolute", left: 80, right: 80, bottom: 70, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 60, alignItems: "end", borderTop: `2px solid ${x.ink}`, paddingTop: 22 }}>
          <h2 style={x.T({ fontSize: 96, letterSpacing: "-.03em" })}>{title}</h2>
          <p style={x.B({ fontSize: 18, lineHeight: 1.5, opacity: .7 })}>{sub}</p>
        </div>
        <span style={{ position: "absolute", top: 70, right: 80, width: 18, height: 18, background: x.acc }} />
      </div>
    );
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <span style={x.T({ position: "absolute", left: -110, bottom: -x.H * .14, fontSize: x.H * .78, color: x.acc, lineHeight: 1, letterSpacing: "-.06em" })}>{nn}.</span>
        <div style={{ position: "absolute", left: "50%", right: 40, top: "34%" }}>
          <h2 style={x.T({ fontSize: 118, textTransform: "uppercase" })}>{title}</h2>
          <Rule c={x.paper} style={{ margin: "28px 0 18px", opacity: .5 }} />
          <p style={x.B({ fontSize: 22, opacity: .75, maxWidth: 520, lineHeight: 1.4 })}>{sub}</p>
        </div>
      </div>
    );
  },
});

/** tarjas de cinema em cima e embaixo, com rótulos de claquete */
function Letterbox({ x, left, mid, right, n }: { x: Ctx; left: string; mid: string; right: string; n?: string }) {
  const bar: CSSProperties = { position: "absolute", left: 0, right: 0, height: 56, background: "#000", color: "#ffffffaa", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px" };
  const t = (s: string) => <span style={x.B({ fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", fontWeight: 600 })}>{s}</span>;
  return (
    <>
      <div style={{ ...bar, top: 0 }}>{t(left)}{t(mid)}{t(right)}</div>
      <div style={{ ...bar, bottom: 0 }}>{t("Identidade de marca")}<span style={{ display: "flex", gap: 6 }}>{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} style={{ width: 14, height: 8, borderRadius: 2, background: "#ffffff22" }} />)}</span>{t(n || String(x.year))}</div>
    </>
  );
}

function Logo({ svg, x, style, color }: { svg: string; x: Ctx; style: CSSProperties; color?: string }) {
  return svg ? <div style={style}><SvgView svg={svg} className="w-full h-full" /></div> : <div style={{ ...style, display: "grid", placeItems: "center" }}><span style={x.T({ fontSize: 120, color })}>{x.name}</span></div>;
}

function construction(sys: string, cons: any, line: string, prot: string) {
  const sp = svgParts(sys); const xx = (Math.min(sp.w, sp.h) * (cons.x || 25)) / 100; const M = xx * 1.4; const u = xx / 2; const g: string[] = [];
  for (let gx = -M; gx <= sp.w + M + .01; gx += u) g.push(`<line x1="${gx}" y1="${-M}" x2="${gx}" y2="${sp.h + M}" stroke="${line}" stroke-opacity=".22" stroke-width="${sp.w / 1000}"/>`);
  for (let gy = -M; gy <= sp.h + M + .01; gy += u) g.push(`<line x1="${-M}" y1="${gy}" x2="${sp.w + M}" y2="${gy}" stroke="${line}" stroke-opacity=".22" stroke-width="${sp.w / 1000}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-M} ${-M} ${sp.w + 2 * M} ${sp.h + 2 * M}">${g.join("")}<svg x="0" y="0" width="${sp.w}" height="${sp.h}" viewBox="${sp.vb}">${sp.inner}</svg><rect x="${-xx}" y="${-xx}" width="${sp.w + 2 * xx}" height="${sp.h + 2 * xx}" fill="none" stroke="${prot}" stroke-dasharray="${xx / 4} ${xx / 6}" stroke-width="${sp.w / 450}"/><text x="${-xx}" y="${-xx - xx * .25}" font-family="Inter" font-size="${xx * .45}" fill="${prot}">x</text></svg>`;
}

/* ───────── os slides ───────── */
function buildSlides(d: any, x0: Ctx, t: any, mockups: Mockup[] = []): SlideDef[] {
  const b = d.brief || {}; const st = d.strategy || {};
  const niche = NICHES.find((n) => n.k === st.nicho);
  const mix = archetypeMix(st);
  const terr = (d.territories || []).find((v: any) => v.id === d.territory_id);
  const sys = primaryLogo(d);
  const pal: Swatch[] = d.palette?.length ? d.palette : Object.entries(x0.C).map(([role, hex]) => ({ role, hex }));
  const locks = LOCKUPS.filter((k) => (k.k === "monograma" ? !!d.monogram : k.k === "logotipo" ? !!d.logotype : k.k === "simbolo" ? !!(d.symbol_id || d.logo_id) : !!d.logotype && !!(d.symbol_id || d.logo_id)));
  const cons = d.construcao || { x: 25, min_px: 24, min_mm: 10 };
  const pat: Pattern = { source: d.monogram ? "monograma" : "simbolo", scale: 120, gap: 60, rotate: 0, offset: true, opacity: 1, bg: x0.acc, fg: x0.ink, ...(d.pattern || {}) };
  const hasPat = !!(d.symbol_id || d.logo_id || d.monogram);
  const refs = (d.refs || []).filter((r: any) => r.img && r.tipo !== "evitar").slice(0, 8);
  const ratio = t.scale || 1.25, base = t.base || 16;
  const S: SlideDef[] = [];
  const chapters: string[] = [];
  const chapter = (title: string, sub: string) => { chapters.push(title); S.push(divider(chapters.length, title, sub, x0.style)); };
  const vb: Verbal = d.verbal || {};
  const hasExpr = !!vb.expressao && Object.values(vb.expressao).some(Boolean);
  const manifesto: string = vb.manifesto || b.manifesto || "";

  // capa
  S.push({ key: "capa", tone: "dark", section: "", bare: true, body: (x) => (
    <div style={{ position: "absolute", inset: 0, padding: "56px 72px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><Label x={x} style={{ opacity: .7 }}>Identidade de marca</Label><Label x={x} style={{ opacity: .7 }}>{x.year}</Label></div>
      <Rule c={x.paper} style={{ margin: "22px -72px 0" }} />
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}><Logo svg={primaryLogo(d, x.paper)} x={x} color={x.paper} style={{ width: "62%", height: x.H * .36 }} /></div>
      <Rule c={x.paper} style={{ margin: "0 -72px 22px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1 style={x.T({ fontSize: 64, textTransform: "uppercase", color: contrast(x.acc, x.ink) >= 3 ? x.acc : x.paper })}>Apresentação<br />de marca{x.hasG && <span style={x.G({ display: "inline-block", marginLeft: 18, fontSize: 64, color: x.paper, textTransform: "none", transform: "rotate(-7deg)", whiteSpace: "nowrap", verticalAlign: "-0.15em" })}>{x.name.toLowerCase()}</span>}</h1>
        <div style={x.B({ fontSize: 16, textAlign: "right", lineHeight: 1.7, opacity: .8 })}><p>Cliente: <b>{x.name}</b></p><p>Projeto: VINCIT</p></div>
      </div>
    </div>
  ) });

  // sumário (preenchido depois que os capítulos existirem)
  const sumIdx = S.length;
  S.push({ key: "sumario", tone: "light", section: "Sumário", body: () => null });

  /* 01 Estratégia */
  if (niche || st.posicao || st.mapa?.length) {
    chapter("Estratégia", "O mercado em que a marca joga e o espaço que ela decide ocupar.");
    if (niche) S.push({ key: "nicho", tone: "light", section: "Estratégia · nicho", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div><Label x={x} style={{ color: x.acc }}>Nicho</Label><h2 style={x.T({ fontSize: 96, marginTop: 14, textTransform: "uppercase" })}>{niche.l}</h2></div>
          <div style={{ display: "flex", gap: 8 }}>{niche.cores.map((c) => <span key={c} style={{ flex: 1, height: 18, background: c }} />)}</div>
        </div>
        <div style={x.B({ fontSize: 20, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 26, justifyContent: "center" })}>
          <div><Label x={x} style={{ opacity: .55, marginBottom: 8 }}>O código do nicho</Label><p>{niche.codigos}</p></div>
          <Rule c={x.ink} />
          <div><Label x={x} style={{ opacity: .55, marginBottom: 8 }}>Nossa decisão</Label><p style={x.T({ fontSize: 34, lineHeight: 1.1 })}>{st.codigo === "quebrar" ? "Quebrar o código para ser lembrada." : "Seguir o código com mais qualidade."}</p><p style={{ marginTop: 10 }}>{st.codigo === "quebrar" ? niche.quebrar : niche.codigos}</p></div>
          <Rule c={x.ink} />
          <div><Label x={x} style={{ opacity: .55, marginBottom: 8 }}>Clichês que evitamos</Label><p>{niche.evitar}</p></div>
        </div>
      </div>
    ) });
    if (st.mapa?.length) {
      const ax: [string, string] = st.eixos || ["preco", "tom"]; const A = (k: string) => MAP_AXES.find((m) => m[0] === k) || MAP_AXES[0];
      S.push({ key: "mapa", tone: "light", section: "Estratégia · posicionamento", body: (x) => (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 56, height: "100%" }}>
          <div style={{ position: "relative", border: `1px solid ${x.ink}40` }}>
            <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: `${x.ink}40` }} /><span style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: `${x.ink}40` }} />
            {[[A(ax[0])[1], { left: 14, top: "50%", transform: "translateY(-130%)" }], [A(ax[0])[2], { right: 14, top: "50%", transform: "translateY(-130%)" }], [A(ax[1])[2], { top: 12, left: "50%", transform: "translateX(12px)" }], [A(ax[1])[1], { bottom: 12, left: "50%", transform: "translateX(12px)" }]].map(([l, p]: any) => <Label key={l} x={x} style={{ position: "absolute", fontSize: 11, opacity: .6, ...p }}>{l}</Label>)}
            {st.mapa.map((p: any) => <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: p.me ? 26 : 12, height: p.me ? 26 : 12, borderRadius: 99, background: p.me ? x.acc : x.ink, opacity: p.me ? 1 : .45, boxShadow: p.me ? `0 0 0 10px ${x.acc}33` : "none" }} />
              <span style={x.B({ fontSize: p.me ? 20 : 15, fontWeight: p.me ? 700 : 400, whiteSpace: "nowrap", opacity: p.me ? 1 : .7 })}>{p.me ? x.name : p.name}</span></div>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Label x={x} style={{ color: x.acc }}>Posicionamento</Label>
            <p style={x.T({ fontSize: 46, lineHeight: 1.05, marginTop: 18 })}>{st.posicao || "O espaço vazio do mapa é a oportunidade."}</p>
          </div>
        </div>
      ) });
    }
  }

  /* 02 Plataforma */
  if (b.missao || b.proposito || arr(b.pilares).length || b.oque) {
    chapter("Plataforma", "Por que a marca existe, o que ela promete e no que ela se apoia.");
    S.push({ key: "essencia", tone: "light", section: "Plataforma · essência", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 72, height: "100%", alignItems: "center" }}>
        <div><Label x={x} style={{ color: x.acc }}>Propósito</Label><p style={x.T({ fontSize: 58, lineHeight: 1.02, marginTop: 18 })}>{b.proposito || b.missao || b.oque}</p></div>
        <div style={x.B({ fontSize: 19, lineHeight: 1.55, display: "grid", gap: 26 })}>
          {[["O que fazemos", b.oque], ["Missão", b.missao], ["Para quem", b.publico], ["Valores", arr(b.valores).join(" · ")]].filter(([, v]) => v).map(([l, v]) => <div key={l as string}><Label x={x} style={{ opacity: .55, marginBottom: 8 }}>{l}</Label><p>{v}</p><Rule c={x.ink} style={{ marginTop: 22 }} /></div>)}
        </div>
      </div>
    ) });
    if (arr(b.pilares).length) S.push({ key: "pilares", tone: "dark", section: "Plataforma · pilares", body: (x) => (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <h2 style={x.T({ fontSize: 88, textTransform: "uppercase" })}>Pilares</h2>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${arr(b.pilares).length}, 1fr)`, marginTop: 40, borderTop: `1px solid ${x.paper}55` }}>
          {arr(b.pilares).map((p, i) => <div key={p} style={{ padding: "28px 28px 0 0", borderRight: i < arr(b.pilares).length - 1 ? `1px solid ${x.paper}33` : "none", paddingLeft: i ? 28 : 0 }}>
            <span style={x.T({ fontSize: 110, color: x.acc })}>{String(i + 1).padStart(2, "0")}</span>
            <p style={x.T({ fontSize: 40, marginTop: 24, textTransform: "uppercase" })}>{p}</p></div>)}
        </div>
      </div>
    ) });
    if (vb.posicionamento?.categoria || st.posicao) S.push({ key: "posicionamento", tone: "light", section: "Plataforma · posicionamento", body: (x) => <PositioningSlide x={x} v={vb} posicao={st.posicao} /> });
    if (vb.valores?.length) S.push({ key: "valores", tone: "light", section: "Plataforma · valores", body: (x) => <ValuesSlide x={x} v={vb} /> });
    if (b.eixos) S.push({ key: "personalidade", tone: "light", section: "Plataforma · personalidade", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 72, height: "100%", alignItems: "center" }}>
        <div><h2 style={x.T({ fontSize: 88, textTransform: "uppercase" })}>Persona&shy;lidade</h2>{arr(b.palavras).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 30 }}>{arr(b.palavras).map((p) => <span key={p} style={x.B({ padding: "8px 18px", background: x.ink, color: x.paper, borderRadius: 99, fontSize: 15, fontWeight: 600 })}>{p}</span>)}</div>}</div>
        <div style={{ display: "grid", gap: 22 }}>{AXES.map(([k, a, z]) => { const v = b.eixos?.[k] ?? 50; return (
          <div key={k} style={x.B({ display: "grid", gridTemplateColumns: "150px 1fr 150px", alignItems: "center", gap: 18, fontSize: 16 })}>
            <span style={{ textAlign: "right", opacity: v < 50 ? 1 : .45, fontWeight: v < 50 ? 700 : 400 }}>{a}</span>
            <div style={{ position: "relative", height: 2, background: `${x.ink}33` }}><span style={{ position: "absolute", top: -9, left: `calc(${v}% - 10px)`, width: 20, height: 20, borderRadius: 99, background: x.acc, border: `3px solid ${x.paper}`, boxShadow: `0 0 0 1px ${x.ink}` }} /></div>
            <span style={{ opacity: v > 50 ? 1 : .45, fontWeight: v > 50 ? 700 : 400 }}>{z}</span></div>
        ); })}</div>
      </div>
    ) });
  }

  /* 03 Arquétipos */
  if (mix.length) {
    chapter("Arquétipos", "A personalidade da marca em hierarquia: quem predomina, quem complementa, quem apoia.");
    S.push({ key: "roda", tone: "light", section: "Arquétipos · hierarquia", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, height: "100%", alignItems: "center" }}>
        <div style={{ display: "grid", gap: 34 }}>
          {mix.map((m) => <div key={m.a.k}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><Label x={x} style={{ opacity: .6 }}>{m.role}</Label><span style={x.T({ fontSize: 30 })}>{m.pct}%</span></div>
            <p style={x.T({ fontSize: 56, textTransform: "uppercase", margin: "6px 0 12px" })}>{m.a.l}</p>
            <div style={{ height: 14, background: `${x.ink}18` }}><div style={{ width: `${m.pct}%`, height: "100%", background: x.ink }} /></div>
            <p style={x.B({ fontSize: 16, marginTop: 10, opacity: .75 })}>{m.a.d} {m.a.narrativa}</p>
          </div>)}
        </div>
        <Wheel x={x} mix={mix} />
      </div>
    ) });
    if (hasExpr) S.push({ key: "matriz", tone: "light", section: "Arquétipos · expressão", body: (x) => <ExpressionSlide x={x} ex={vb.expressao!} mix={mix} /> });
    else S.push({ key: "matriz", tone: "light", section: "Arquétipos · expressão", body: (x) => (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${mix.length}, 1fr)`, borderBottom: `2px solid ${x.ink}` }}>
          <span />{mix.map((m) => <div key={m.a.k} style={{ padding: "0 0 14px 20px" }}><span style={x.B({ background: x.ink, color: x.paper, padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" })}>{m.a.l} {m.pct}%</span></div>)}
        </div>
        {([["Narrativa", (a: any) => a.narrativa], ["Verbal", (a: any) => `${a.verbal} ${a.palavras.map((p: string) => `“${p}”`).join(" ")}`], ["Visual", (a: any) => `${a.forma} ${a.visual}.`], ["Fotografia", (a: any) => a.foto], ["Atração", (a: any) => a.atracao]] as const).map(([l, f]) => (
          <div key={l} style={{ flex: 1, display: "grid", gridTemplateColumns: `200px repeat(${mix.length}, 1fr)`, borderBottom: `1px solid ${x.ink}30` }}>
            <div style={{ display: "flex", alignItems: "center" }}><Label x={x} style={{ fontSize: 12 }}>{l}</Label></div>
            {mix.map((m) => <div key={m.a.k} style={x.B({ padding: "0 20px", fontSize: 16, lineHeight: 1.4, display: "flex", alignItems: "center", borderLeft: `1px solid ${x.ink}20` })}>{f(m.a)}</div>)}
          </div>
        ))}
      </div>
    ) });
  }

  mix.forEach((m, i) => S.push({ key: `arq-${m.a.k}`, tone: "light", section: `Arquétipos · ${m.a.l}`, body: (x) => <ArchetypeSlide x={x} a={m.a} pct={m.pct} role={m.role} pratica={vb.arquetipos?.[m.a.k]} n={i + 1} /> }));

  /* 04 Conceito */
  if (terr) {
    chapter("Conceito", "A grande ideia que dá sentido a cada forma, cor e palavra.");
    S.push({ key: "territorio", tone: "acc", section: "Conceito · território", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 64, height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Label x={x}>Território criativo</Label>
          <h2 style={x.T({ fontSize: 128, textTransform: "uppercase" })}>{terr.nome}</h2>
          <p style={x.B({ fontSize: 24, lineHeight: 1.45, maxWidth: 680 })}>{terr.ideia}</p>
        </div>
        <div style={x.B({ fontSize: 18, lineHeight: 1.5, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20 })}>
          {terr.metafora && <div><Label x={x} style={{ opacity: .7, marginBottom: 6 }}>Metáfora</Label><p style={x.T({ fontSize: 30, lineHeight: 1.1 })}>{terr.metafora}</p></div>}
          {[["Forma", terr.forma], ["Cor", terr.cor], ["Tipografia", terr.tipo]].filter(([, v]) => v).map(([l, v]) => <div key={l}><Rule c="currentColor" style={{ marginBottom: 12 }} /><Label x={x} style={{ opacity: .7, marginBottom: 4, fontSize: 11 }}>{l}</Label><p>{v}</p></div>)}
        </div>
      </div>
    ) });
    if (refs.length >= 3) S.push({ key: "moodboard", tone: "light", section: "Conceito · referências", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 40, height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}><h2 style={x.T({ fontSize: 80, textTransform: "uppercase" })}>Estética</h2>{arr(terr.palavras).length > 0 && <div style={x.B({ fontSize: 18, lineHeight: 1.8 })}>{arr(terr.palavras).map((p) => <p key={p}>— {p}</p>)}</div>}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 10 }}>
          {refs.map((r: any, i: number) => <div key={r.id} style={{ background: `url("${r.img}") center/cover`, gridRow: i === 0 ? "span 2" : undefined }} />)}
        </div>
      </div>
    ) });
  }

  /* 05 Identidade visual */
  chapter("Identidade visual", "Logo, assinaturas, construção, cores, tipografia e grafismos.");
  S.push({ key: "logo", tone: "light", section: "Identidade visual · logo", body: (x) => (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", height: "100%" }}>
      <div style={{ display: "grid", placeItems: "center" }}><Logo svg={sys} x={x} style={{ width: "64%", height: x.H * .42 }} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><h2 style={x.T({ fontSize: 72, textTransform: "uppercase" })}>Logo</h2><p style={x.B({ fontSize: 17, maxWidth: 560, lineHeight: 1.5, opacity: .75 })}>{terr ? `Nasce do território "${terr.nome}". ` : ""}{terr?.forma ? terr.forma : mix[0] ? `Traduz o ${mix[0].a.l.toLowerCase()}: ${mix[0].a.forma.toLowerCase()}` : "A assinatura principal da marca."}</p></div>
    </div>
  ) });
  S.push({ key: "versoes", tone: "light", section: "Identidade visual · versões", bare: true, body: (x) => (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }}>
      {[[x.paper, undefined, "Positiva"], [x.ink, x.paper, "Negativa"], [x.acc, readableOn(x.acc), "Sobre a cor da marca"], ["#ffffff", x.ink, "Uma cor"]].map(([bg, mono, l]) => (
        <div key={l as string} style={{ background: bg as string, color: readableOn(bg as string), position: "relative", display: "grid", placeItems: "center" }}>
          <Logo svg={mono ? primaryLogo(d, mono as string) : sys} x={x} color={mono as string} style={{ width: "58%", height: "46%" }} />
          <Label x={x} style={{ position: "absolute", left: 40, bottom: 32, fontSize: 11, opacity: .7 }}>{l}</Label>
        </div>
      ))}
    </div>
  ) });
  if (locks.length > 1) S.push({ key: "assinaturas", tone: "light", section: "Identidade visual · assinaturas", body: (x) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, locks.length)}, 1fr)`, gridAutoRows: "1fr", gap: 0, height: "100%", borderTop: `1px solid ${x.ink}30`, borderLeft: `1px solid ${x.ink}30` }}>
      {locks.map((k) => (
        <div key={k.k} style={{ borderRight: `1px solid ${x.ink}30`, borderBottom: `1px solid ${x.ink}30`, padding: 28, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}><Logo svg={lockupSvg(k.k, d)} x={x} style={{ width: "80%", height: locks.length > 3 ? x.H * .17 : x.H * .3 }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={x.T({ fontSize: 26, textTransform: "uppercase" })}>{k.l}</span><span style={x.B({ fontSize: 12, opacity: .6, maxWidth: 220, textAlign: "right" })}>{(d.principal || "horizontal") === k.k ? "Principal · " : ""}{k.d}</span></div>
        </div>
      ))}
    </div>
  ) });
  if (sys) S.push({ key: "construcao", tone: "light", section: "Identidade visual · construção", body: (x) => (
    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 56, height: "100%" }}>
      <div style={{ border: `1px solid ${x.ink}25`, display: "grid", placeItems: "center", padding: 30 }}><SvgView svg={construction(sys, cons, x.ink, x.acc === x.paper ? x.ink : x.acc)} className="w-full h-full" /></div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <h2 style={x.T({ fontSize: 72, textTransform: "uppercase" })}>Constru&shy;ção</h2>
        <div style={x.B({ fontSize: 16, lineHeight: 1.5, display: "grid", gap: 18 })}>
          <div><Label x={x} style={{ fontSize: 11, marginBottom: 4 }}>Grade modular</Label><p>Módulo de meia unidade x. Formas e espaços se alinham a ela.</p></div>
          <div><Label x={x} style={{ fontSize: 11, marginBottom: 4 }}>Área de proteção</Label><p>x = {cons.x}% da altura da assinatura, livre de qualquer outro elemento.</p></div>
          <div><Label x={x} style={{ fontSize: 11, marginBottom: 4 }}>Redução mínima</Label><p>{cons.min_px} px na tela e {cons.min_mm} mm no impresso.</p></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>{[72, 44, cons.min_px].map((h, i) => { const sp = svgParts(sys); return <div key={i}><div style={{ height: h, width: (h * sp.w) / sp.h }}><SvgView svg={sys} className="w-full h-full" /></div><p style={x.B({ fontSize: 11, opacity: .6, marginTop: 6 })}>{h}px</p></div>; })}</div>
      </div>
    </div>
  ) });
  if (d.monogram) S.push({ key: "monograma", tone: "dark", section: "Identidade visual · monograma", body: (x) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, height: "100%", alignItems: "center" }}>
      <div><h2 style={x.T({ fontSize: 96, textTransform: "uppercase" })}>Mono&shy;grama</h2><p style={x.B({ fontSize: 19, lineHeight: 1.5, marginTop: 24, opacity: .8, maxWidth: 520 })}>A forma reduzida da marca para favicon, avatar, etiqueta, bordado e carimbo: onde a assinatura completa não cabe.</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, height: "70%" }}>
        <div style={{ background: x.acc, display: "grid", placeItems: "center", padding: 40 }}><SvgView svg={lockupSvg("monograma", d, readableOn(x.acc))} className="w-full h-full" /></div>
        <div style={{ display: "grid", gap: 16 }}><div style={{ background: x.paper, display: "grid", placeItems: "center", padding: 24 }}><SvgView svg={lockupSvg("monograma", d)} className="w-full h-full" /></div><div style={{ border: `1px solid ${x.paper}44`, display: "grid", placeItems: "center", padding: 24 }}><SvgView svg={lockupSvg("monograma", d, x.paper)} className="w-full h-full" /></div></div>
      </div>
    </div>
  ) });
  S.push({ key: "cores", tone: "light", section: "Identidade visual · cores", bare: true, body: (x) => (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: pal.map((_, i) => (i === 0 ? "2.2fr" : "1fr")).join(" ") }}>
      {pal.map((s, i) => { const [r, g, bb] = hexToRgb(s.hex); const fg = readableOn(s.hex); return (
        <div key={s.role + s.hex} style={{ background: s.hex, color: fg, padding: "48px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {i === 0 ? <h2 style={x.T({ fontSize: 120, textTransform: "uppercase" })}>Cores</h2> : <span />}
          <div style={x.B({ fontSize: 14, lineHeight: 1.7 })}>
            <Label x={x} style={{ fontSize: 11, marginBottom: 10, opacity: .8 }}>{s.role}</Label>
            <p style={x.T({ fontSize: i === 0 ? 48 : 30, marginBottom: 10 })}>{s.hex.toUpperCase()}</p>
            <p>RGB {r} {g} {bb}</p><p>CMYK {cmyk(s.hex).join(" ")}</p>
          </div>
        </div>
      ); })}
    </div>
  ) });
  S.push({ key: "proporcao", tone: "light", section: "Identidade visual · uso das cores", body: (x) => (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", gap: 30 }}>
      <h2 style={x.T({ fontSize: 72, textTransform: "uppercase" })}>Proporção</h2>
      <div style={{ display: "flex", border: `1px solid ${x.ink}22` }}>{[[x.paper, 55, "Fundos claros"], [x.ink, 20, "Texto e contraste"], [x.acc, 15, "Cor da marca"], [x.C["Apoio"], 7, "Apoio"], [x.C["Destaque"], 3, "Destaque"]].map(([c, p, l]) => (
        <div key={l as string} style={{ width: `${p}%`, background: c as string, color: readableOn(c as string), padding: 18, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}><span style={x.T({ fontSize: 40 })}>{p}%</span>{(p as number) >= 7 && <span style={x.B({ fontSize: 12, marginTop: 6 })}>{l}</span>}</div>
      ))}</div>
      <p style={x.B({ fontSize: 16, opacity: .7 })}>Quanto mais rara a cor, mais ela chama atenção. CMYK é aproximado: confirme a prova com a gráfica.</p>
    </div>
  ) });
  S.push({ key: "tipo", tone: "light", section: "Identidade visual · tipografia", bare: true, body: (x) => {
    const bands: { role: string; font: string; why: string; word: string; st: CSSProperties; bg: string }[] = [
      { role: "Editorial", font: `${t.title}${t.ti ? " Italic" : ""}`, why: "Leitura e interpretação", word: x.name, st: x.T({ fontSize: x.H * .3, lineHeight: 1 }), bg: x.paper },
      { role: "Estrutura", font: t.body, why: "Clareza e responsabilidade", word: "Aa Bb Cc 123", st: x.B({ fontSize: x.H * .26, fontWeight: 600, lineHeight: 1, letterSpacing: "-.03em" }), bg: x.C["Apoio"] },
      ...(x.hasG ? [{ role: "Gesto", font: t.accent, why: "Realidade e movimento", word: x.name.toLowerCase(), st: x.G({ fontSize: x.H * .3 }), bg: x.paper }] : []),
    ];
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: `repeat(${bands.length}, 1fr)` }}>
        {bands.map((bd, i) => { const fg = readableOn(bd.bg) === "#ffffff" ? "#ffffff" : x.ink; return (
          <div key={bd.role} style={{ background: bd.bg, color: fg, position: "relative", overflow: "hidden", borderTop: i ? `1px solid ${x.ink}22` : "none" }}>
            <div style={x.B({ position: "absolute", left: 56, right: 56, top: 22, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 600 })}>
              <span>{i === 0 ? "Tipografias" : bd.role}</span><span style={{ textAlign: "center" }}>{bd.font}</span><span style={{ textAlign: "right", opacity: .7 }}>{bd.why}</span>
            </div>
            <FitWord style={{ ...bd.st, position: "absolute", right: 56, bottom: -x.H * .05, whiteSpace: "nowrap" }} max={x.W - 56 - (i === 0 ? 300 : 56)}>{bd.word}</FitWord>
            {i === 0 && <p style={x.B({ position: "absolute", left: 56, bottom: 22, fontSize: 12, opacity: .6 })}>escala {[4, 3, 2, 1, 0].map((n) => Math.round(base * ratio ** n)).join(" · ")} px</p>}
          </div>
        ); })}
      </div>
    );
  } });
  if (hasPat) S.push({ key: "grafismo", tone: "dark", section: "Identidade visual · grafismos", bare: true, body: (x) => (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1.6fr 1fr" }}>
      <div style={{ overflow: "hidden" }}><SvgView svg={patternSvg(d, pat, 1000, 900)} className="w-full h-full" /></div>
      <div style={{ padding: "56px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Label x={x} style={{ opacity: .6 }}>Grafismos</Label>
        <div><h2 style={x.T({ fontSize: 84, textTransform: "uppercase" })}>Padrão</h2><p style={x.B({ fontSize: 18, lineHeight: 1.55, marginTop: 22, opacity: .8 })}>Nasce {pat.svg ? (d.pattern?.nome || "de um detalhe do logo") : pat.source === "monograma" ? "do monograma" : "do símbolo"}. Cheio em embalagens e fundos de destaque; sutil atrás de texto.</p></div>
        <div style={{ height: "28%", overflow: "hidden" }}><SvgView svg={patternSvg(d, { ...pat, bg: x.paper, fg: x.acc, opacity: .5 }, 600, 260)} className="w-full h-full" /></div>
      </div>
    </div>
  ) });

  /* fotografia: moodboard e regras, quando a marca tem direção própria */
  const fm: FotoMood = d.foto_moodboard || {};
  if ((fm.imgs || []).filter((i) => i.url).length >= 3) S.push({ key: "foto-mood", tone: "light", section: "Identidade visual · fotografia", bare: true, body: (x) => <PhotoMoodSlide x={x} m={fm} /> });
  if (fm.luz || fm.faca?.length) S.push({ key: "foto-regras", tone: "light", section: "Identidade visual · fotografia", body: (x) => <PhotoRulesSlide x={x} m={fm} /> });

  /* 06 Aplicações */
  chapter("Aplicações", "A marca no mundo real: redes, papelaria, embalagem e ponto de venda.");
  /* o que a marca já usa vem primeiro: cada coleção numa página, o resto em grupos de 5 */
  const reais = ((d.aplicacoes_reais || []) as AppReal[]).filter((a) => a.img);
  const cols = [...new Set(reais.map((a) => a.colecao).filter(Boolean))] as string[];
  cols.forEach((c) => { const it = reais.filter((a) => a.colecao === c); S.push({ key: `real-col-${c}`, tone: "dark", section: `Aplicações · coleção ${c}`, bare: true, body: (x) => <RealAppsSlide x={x} items={it} title={`Coleção ${c}`} sub="Aplicações reais · lançamento" /> }); });
  const soltas = reais.filter((a) => !a.colecao);
  for (let i = 0; i < soltas.length; i += 5) { const it = soltas.slice(i, i + 5); S.push({ key: `real-${i}`, tone: "dark", section: "Aplicações · em uso", bare: true, body: (x) => <RealAppsSlide x={x} items={it} title="A marca em uso" /> }); }
  /* mockups fotográficos (PSD do mockups-design.com): um por página, sangrando, como nos cases do Behance */
  const chosen: string[] | undefined = Array.isArray(d.mockups) ? d.mockups : undefined;
  const arts: Record<string, string[]> = d.mockup_arts || {};
  byGroup(chosen ? chosen.map((id) => mockups.find((m) => m.id === id)).filter(Boolean) as Mockup[] : mockups.slice(0, 12)).flatMap((x) => x.items).forEach((m) => S.push({ key: `mk-${m.id}`, tone: "dark", section: `Aplicações · ${m.title}`, bare: true, body: (x) => <MockupCover d={d} m={m} arts={arts[m.id]} W={x.W} H={x.H} caption /> }));
  /* a marca em uso: site e Instagram */
  const voz = brandVoice(d);
  S.push({ key: "site-hero", tone: "dark", section: "Aplicações · site", bare: true, body: (x) => <SiteDesktopSlide v={voz} W={x.W} H={x.H} label="Site · primeira dobra" /> });
  S.push({ key: "site-meio", tone: "dark", section: "Aplicações · site", bare: true, body: (x) => <SiteDesktopSlide v={voz} W={x.W} H={x.H} offset={1660} label="Site · o que a marca oferece e como trabalha" /> });
  S.push({ key: "site-inteiro", tone: "dark", section: "Aplicações · site", bare: true, body: (x) => <SiteFullSlide v={voz} W={x.W} H={x.H} /> });
  const feed: Feed = d.feed || {};
  if ((feed.posts || []).length >= 6) {
    S.push({ key: "feed-grid", tone: "light", section: "Aplicações · Instagram", bare: true, body: (x) => <FeedGridSlide x={x} feed={feed} /> });
    S.push({ key: "feed-porque", tone: "light", section: "Aplicações · Instagram · cada post", body: (x) => <FeedWhySlide x={x} feed={feed} /> });
  }
  const fi: FeedIdeal = d.feed_ideal || {};
  if ((fi.posts || []).length >= 6) {
    S.push({ key: "feed-ideal", tone: "light", section: "Aplicações · Instagram · feed ideal", bare: true, body: (x) => <FeedCompareSlide x={x} atual={feed} ideal={fi} /> });
    if (fi.manter?.length || fi.melhorar?.length || fi.fazer?.length) S.push({ key: "feed-plano", tone: "light", section: "Aplicações · Instagram · plano", body: (x) => <FeedPlanSlide x={x} ideal={fi} /> });
    S.push({ key: "feed-ideal-posts", tone: "light", section: "Aplicações · Instagram · feed ideal, post a post", body: (x) => <FeedIdealWhySlide x={x} ideal={fi} atual={feed} /> });
    if ((fi.referencias || []).filter((r) => r.url).length >= 3) S.push({ key: "feed-refs", tone: "light", section: "Aplicações · Instagram · referências", bare: true, body: (x) => <FeedRefsSlide x={x} ideal={fi} /> });
  }
  S.push({ key: "insta-feed", tone: "light", section: "Aplicações · Instagram", bare: true, body: (x) => <FeedSlide v={voz} W={x.W} H={x.H} /> });
  S.push({ key: "insta-posts", tone: "dark", section: "Aplicações · Instagram", bare: true, body: (x) => <PostsSlide v={voz} W={x.W} H={x.H} /> });
  S.push({ key: "mockups", tone: "light", section: "Aplicações · redes e peças", body: () => <div style={{ height: "100%" }}><Mockups d={d} compact /></div> });
  /* cenas desenhadas (opcionais) e fotos reais com o logo aplicado */
  const kit = sceneKit(d);
  const cenas: string[] = Array.isArray(d.cenas) ? d.cenas : [];
  SCENES.filter((c) => cenas.includes(c.k)).forEach((c) => S.push({ key: `cena-${c.k}`, tone: "light", section: `Aplicações · ${c.l}`, bare: true, body: (x) => <><SceneStyle /><Scene d={d} k={c.k} W={x.W} H={x.H} kit={kit} /></> }));
  ((d.fotos || []) as Foto[]).filter((f) => f.url).forEach((f) => S.push({ key: `foto-${f.id}`, tone: "dark", section: "Aplicações · foto", bare: true, body: (x) => <PhotoScene k={kit} f={f} W={x.W} H={x.H} /> }));

  /* 07 Expressão verbal */
  if (arr(b.fala).length || arr(b.nunca).length || mix.length || manifesto || vb.tom) {
    chapter("Expressão verbal", "Como a marca fala, as palavras que são dela e as que ela nunca usa.");
    if (manifesto) S.push({ key: "manifesto", tone: "dark", section: "Expressão verbal · manifesto", body: (x) => <ManifestoSlide x={x} text={manifesto} /> });
    if (vb.tom || b.matriz_tom) S.push({ key: "tom", tone: "light", section: "Expressão verbal · tom de voz", body: (x) => <ToneSlide x={x} v={vb} matriz={b.matriz_tom} /> });
    if (vb.somos?.length) S.push({ key: "somos", tone: "light", section: "Expressão verbal · somos, mas não somos", body: (x) => <WeAreSlide x={x} v={vb} /> });
    if (vb.usamos?.length || vb.trocas?.length) S.push({ key: "vocab", tone: "light", section: "Expressão verbal · vocabulário", body: (x) => <VocabSlide x={x} v={vb} /> });
    if (vb.situacoes?.length) S.push({ key: "situacoes", tone: "light", section: "Expressão verbal · tom por situação", body: (x) => <SituationsSlide x={x} v={vb} /> });
    if (vb.canais?.length) S.push({ key: "canais", tone: "light", section: "Expressão verbal · canais", body: (x) => <ChannelsSlide x={x} v={vb} /> });
    if (vb.reescritas?.length) S.push({ key: "reescritas", tone: "light", section: "Expressão verbal · reescrita", body: (x) => <RewriteSlide x={x} v={vb} /> });
    const fala = arr(b.fala).length ? arr(b.fala) : mix[0]?.a.palavras || [];
    const nunca = arr(b.nunca).length ? arr(b.nunca) : mix.map((m) => m.a.nunca);
    S.push({ key: "verbal", tone: "light", section: "Expressão verbal · frases", body: (x) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", borderTop: `2px solid ${x.ink}` }}>
        <div style={{ paddingTop: 28, paddingRight: 48, borderRight: `1px solid ${x.ink}30` }}>
          <span style={x.B({ background: x.ink, color: x.paper, padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" })}>A marca fala</span>
          <div style={{ marginTop: 34, display: "grid", gap: 20 }}>{fala.slice(0, 5).map((f) => <p key={f} style={x.T({ fontSize: 40, lineHeight: 1.05 })}>“{f}”</p>)}</div>
        </div>
        <div style={{ paddingTop: 28, paddingLeft: 48 }}>
          <span style={x.B({ border: `1.5px solid ${x.ink}`, padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" })}>A marca nunca diz</span>
          <div style={{ marginTop: 34, display: "grid", gap: 16 }}>{nunca.slice(0, 5).map((f) => <p key={f} style={x.B({ fontSize: 24, textDecoration: "line-through", opacity: .5 })}>{f}</p>)}</div>
          {mix[0] && <p style={x.B({ fontSize: 17, lineHeight: 1.5, marginTop: 40, opacity: .8 })}><b>Tom:</b> {(archetypeOfK(st.ativ_verbal) || mix[0].a).verbal}</p>}
        </div>
      </div>
    ) });
  }

  /* não fazer */
  if (sys) S.push({ key: "naofazer", tone: "light", section: "Uso incorreto", body: (x) => (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100%", gap: 28 }}>
      <h2 style={x.T({ fontSize: 72, textTransform: "uppercase" })}>Não fazer</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
        {([["Distorcer", { transform: "scaleX(1.5)" }], ["Girar", { transform: "rotate(-15deg)" }], ["Trocar as cores", { filter: "hue-rotate(140deg) saturate(1.6)" }], ["Sem contraste", { opacity: .18 }]] as const).map(([l, st2]) => (
          <div key={l} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, border: `1px solid ${x.ink}25`, display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ width: "70%", height: "34%", ...st2 }}><SvgView svg={sys} className="w-full h-full" /></div>
              <span style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 99, background: "#e03131", color: "#fff", display: "grid", placeItems: "center", fontSize: 18 }}>×</span>
            </div>
            <p style={x.B({ fontSize: 15, marginTop: 12, fontWeight: 600 })}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  ) });

  /* a marca em uma página: guia em bento para mandar no WhatsApp ou fixar na parede */
  if (sys) S.push({ key: "bento", tone: "light", section: "A marca em uma página", bare: true, body: (x) => {
    const cell = (bg: string, extra: CSSProperties = {}): CSSProperties => ({ background: bg, color: readableOn(bg) === "#ffffff" ? "#ffffff" : x.ink, borderRadius: 14, position: "relative", overflow: "hidden", ...extra });
    const cap = (l: string, c?: string) => <span style={x.B({ position: "absolute", left: 18, bottom: 14, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600, opacity: .75, color: c })}>{l}</span>;
    const mark = d.symbol_id || d.logo_id ? lockupSvg("simbolo", d, readableOn(x.acc) === "#ffffff" ? "#ffffff" : x.ink) : d.monogram ? lockupSvg("monograma", d, readableOn(x.acc) === "#ffffff" ? "#ffffff" : x.ink) : "";
    const frase = b.slogan || arr(b.fala)[0] || b.proposito || "";
    return (
      <div style={{ position: "absolute", inset: 0, padding: 28, display: "grid", gap: 14, gridTemplateColumns: "1.25fr 1fr .9fr 1fr", gridTemplateRows: "1fr 1fr .9fr" }}>
        <div style={cell(x.ink, { gridColumn: "1 / 3", gridRow: "1 / 3", display: "grid", placeItems: "center" })}><Logo svg={primaryLogo(d, x.paper)} x={x} color={x.paper} style={{ width: "64%", height: "40%" }} />{cap("Logo principal")}</div>
        <div style={cell(x.acc, { display: "grid", placeItems: "center" })}>{mark ? <div style={{ width: "52%", height: "52%" }}><SvgView svg={mark} className="w-full h-full" /></div> : null}{cap(d.symbol_id || d.logo_id ? "Símbolo" : "Monograma")}</div>
        <div style={cell("#ffffff", { gridRow: "1 / 3", padding: 22, display: "flex", flexDirection: "column", border: `1px solid ${x.ink}14` })}>
          <span style={x.T({ fontSize: x.H * .2, lineHeight: .9, color: x.ink })}>Aa</span>
          <p style={x.B({ fontSize: 12, lineHeight: 1.6, marginTop: 14, opacity: .7, wordBreak: "break-all" })}>ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</p>
          <div style={{ marginTop: "auto" }}>
            <p style={x.T({ fontSize: 22 })}>{t.title}</p><p style={x.B({ fontSize: 13, opacity: .65, marginTop: 4 })}>títulos</p>
            <p style={x.B({ fontSize: 20, fontWeight: 600, marginTop: 14 })}>{t.body}</p><p style={x.B({ fontSize: 13, opacity: .65, marginTop: 4 })}>texto</p>
            {x.hasG && <><p style={x.G({ fontSize: 30, marginTop: 12 })}>{t.accent}</p><p style={x.B({ fontSize: 13, opacity: .65, marginTop: 2 })}>gesto, usado pouco</p></>}
          </div>
        </div>
        <div style={cell(x.paper, { border: `1px solid ${x.ink}18`, padding: 16 })}><div style={{ position: "absolute", inset: "12px 12px 34px" }}><SvgView svg={construction(sys, cons, "#0f9e6e", "#e03131")} className="w-full h-full" /></div>{cap("Área de proteção")}</div>
        <div style={cell(pat.bg, { gridColumn: "1 / 2" })}>{hasPat ? <SvgView svg={patternSvg(d, pat, 520, 300)} className="w-full h-full" /> : null}</div>
        <div style={cell(x.paper, { gridColumn: "2 / 4", border: `1px solid ${x.ink}18`, padding: "24px 26px", display: "flex", flexDirection: "column", justifyContent: "space-between" })}>
          <Label x={x} style={{ fontSize: 11, opacity: .6 }}>{x.name} · identidade de marca · {x.year}</Label>
          {frase && <p style={x.T({ fontSize: 34, lineHeight: 1.05, maxWidth: "92%" })}>{x.hasG ? <span style={x.G({ fontSize: 44, color: x.acc })}>“</span> : "“"}{frase}”</p>}
        </div>
        <div style={{ display: "grid", gridTemplateRows: `repeat(${pal.length}, 1fr)`, borderRadius: 14, overflow: "hidden", border: `1px solid ${x.ink}14` }}>
          {pal.map((s) => <div key={s.role} style={x.B({ background: s.hex, color: readableOn(s.hex), display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", fontSize: 12, fontWeight: 600 })}><span>{s.name || s.role}</span><span>{s.hex.toUpperCase()}</span></div>)}
        </div>
      </div>
    );
  } });

  /* direcionamento para a IA: o mesmo texto que vai junto dos pedidos de post e edição */
  const prompt = brandPrompt(d);
  S.push({ key: "ia", tone: "dark", section: "Direcionamento para IA", body: (x) => (
    <div style={{ position: "absolute", inset: 0, padding: "56px 64px", display: "grid", gridTemplateColumns: "1fr 2.4fr", gap: 48 }}>
      <div>
        <Label x={x} style={{ color: x.acc }}>Direcionamento para IA</Label>
        <p style={x.T({ fontSize: x.H * .07, color: x.paper, marginTop: 18, lineHeight: 1 })}>A marca explicada para a máquina.</p>
        <p style={x.B({ fontSize: 15, lineHeight: 1.6, color: x.paper, opacity: .7, marginTop: 22 })}>Este texto vai junto de todo pedido de post, carrossel, roteiro e edição de vídeo no HUB e no Claude. Copie na etapa Manual para usar em qualquer IA.</p>
      </div>
      <div style={x.B({ columnCount: 3, columnGap: 28, fontSize: 9.5, lineHeight: 1.45, color: x.paper, opacity: .85, whiteSpace: "pre-wrap", overflow: "hidden" })}>{prompt.replace(/^# .*\n\n/, "")}</div>
    </div>
  ) });

  // encerramento
  S.push({ key: "fim", tone: "dark", section: "", bare: true, body: (x) => (
    <div style={{ position: "absolute", inset: 0, padding: "56px 72px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Logo svg={primaryLogo(d, x.paper)} x={x} color={x.paper} style={{ width: 280, height: 90 }} />
      <h2 style={x.T({ fontSize: x.H * .19, textTransform: "uppercase", lineHeight: .86 })}>Isso nunca<br /><span style={x.hasG ? x.G({ color: x.acc, textTransform: "none", fontSize: x.H * .24 }) : { color: x.acc }}>é o fim.</span></h2>
      <div style={{ display: "flex", justifyContent: "space-between" }}><Label x={x} style={{ opacity: .6 }}>{x.name} · identidade de marca</Label><Label x={x} style={{ opacity: .6 }}>VINCIT · {x.year}</Label></div>
    </div>
  ) });

  // sumário com os capítulos reais
  S[sumIdx] = { key: "sumario", tone: "light", section: "Sumário", body: (x) => (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 56, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end" }}><span style={x.T({ fontSize: 120, writingMode: "vertical-rl", transform: "rotate(180deg)", textTransform: "uppercase" })}>Sumário</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 56, alignContent: "end" }}>
        {chapters.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "baseline", gap: 22, borderTop: `1px solid ${x.ink}35`, padding: "20px 0" }}>
            <span style={x.T({ fontSize: 44, color: x.acc === x.paper ? x.ink : x.acc })}>{String(i + 1).padStart(2, "0")}.</span>
            <span style={x.T({ fontSize: 34, textTransform: "uppercase" })}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  ) };
  return S;
}

const archetypeOfK = (k?: string) => ARCHETYPES.find((a) => a.k === k);

function Wheel({ x, mix }: { x: Ctx; mix: { a: (typeof ARCHETYPES)[number]; pct: number }[] }) {
  const n = ARCHETYPES.length, R = 300, r0 = 110, c = 320;
  const P = (a: number, r: number) => `${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`;
  return (
    <svg viewBox="0 0 640 640" style={{ width: "100%", height: x.H * .64 }}>
      <circle cx={c} cy={c} r={R + 12} fill="none" stroke={x.ink} strokeOpacity=".25" />
      {ARCHETYPES.map((a, i) => {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, mid = (a0 + a1) / 2;
        const m = mix.find((v) => v.a.k === a.k);
        return (
          <g key={a.k}>
            <path d={`M${P(a0, r0)} L${P(a0, R)} A${R} ${R} 0 0 1 ${P(a1, R)} L${P(a1, r0)} A${r0} ${r0} 0 0 0 ${P(a0, r0)}Z`} fill={m ? x.ink : "transparent"} fillOpacity={m ? .25 + m.pct / 90 : 0} stroke={x.ink} strokeOpacity=".3" />
            <text x={c + 208 * Math.cos(mid)} y={c + 208 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" fontFamily={x.B().fontFamily as string} fontSize="17" fontWeight={m ? 700 : 400} fill={m && m.pct > 25 ? x.paper : x.ink} opacity={m ? 1 : .6}>{a.l.split(" ")[0]}</text>
            {m && <circle cx={c + (R + 12) * Math.cos(mid)} cy={c + (R + 12) * Math.sin(mid)} r="12" fill={x.acc === x.paper ? x.ink : x.acc} />}
          </g>
        );
      })}
      <circle cx={c} cy={c} r={r0 - 6} fill={x.ink} />
      <text x={c} y={c - 8} textAnchor="middle" fontFamily={x.B().fontFamily as string} fontSize="15" letterSpacing="4" fill={x.paper} opacity=".7">ARQUÉTIPOS</text>
      <text x={c} y={c + 24} textAnchor="middle" fontFamily={x.T().fontFamily as string} fontWeight="700" fontSize="26" fill={x.paper}>{mix[0]?.a.l}</text>
    </svg>
  );
}

/** um slide escalado para caber na largura do contêiner (na impressão, tamanho real) */
export function ScaledSlide({ x, s, n, total }: { x: Ctx; s: SlideDef; n: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null); const [k, setK] = useState(.5);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / x.W)); ro.observe(el); setK(el.clientWidth / x.W);
    return () => ro.disconnect();
  }, [x.W]);
  const near = useNear(ref, useLite() ? "40% 0px" : "100% 0px");
  return (
    <div ref={ref} className="deck-wrap w-full relative overflow-hidden rounded-lg shadow-2xl bg-panel2" style={{ height: x.H * k }}>
      {near && <div className="deck-scale" style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: x.W, height: x.H }}>
        <Frame x={x} s={s} n={n} total={total}>{s.body(x)}</Frame>
      </div>}
    </div>
  );
}

/** o PDF: na hora de imprimir, os slides vão para uma camada própria no body, no tamanho real
   (sem escala, sem o layout do HUB em volta), uma página por slide no tamanho do formato */
export function PrintDeck({ x, slides }: { x: Ctx; slides: SlideDef[] }) {
  const on = usePrintAll();
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!on) return;
    const root = document.createElement("div"); root.className = "print-deck-root";
    const st = document.createElement("style");
    st.textContent = `@media print { @page { size: ${x.W}px ${x.H}px; margin: 0; } }`;
    document.body.appendChild(root); document.head.appendChild(st); document.documentElement.classList.add("print-deck");
    setEl(root);
    return () => { root.remove(); st.remove(); document.documentElement.classList.remove("print-deck"); setEl(null); };
  }, [on, x.W, x.H]);
  if (!el) return null;
  return createPortal(slides.map((s, i) => (
    <div key={s.key} className="print-deck-page" style={{ width: x.W, height: x.H }}><Frame x={x} s={s} n={i + 1} total={slides.length}>{s.body(x)}</Frame></div>
  )), el);
}

/** apresentação em tela cheia: setas para navegar, Esc para sair */
export function Presenter({ x, slides, start, onClose }: { x: Ctx; slides: SlideDef[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [vp, setVp] = useState({ w: 1600, h: 900 });
  useEffect(() => {
    const fit = () => setVp({ w: window.innerWidth, h: window.innerHeight }); fit();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (["ArrowRight", " ", "PageDown"].includes(e.key)) setI((v) => Math.min(slides.length - 1, v + 1)); if (["ArrowLeft", "PageUp"].includes(e.key)) setI((v) => Math.max(0, v - 1)); };
    window.addEventListener("resize", fit); window.addEventListener("keydown", key);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("keydown", key); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, []); // eslint-disable-line
  // celular em pé com slide deitado: gira o slide para ocupar a tela inteira (como virar o aparelho)
  const rot = vp.h > vp.w && x.W > x.H;
  const k = rot ? Math.min(vp.h / x.W, vp.w / x.H) : Math.min(vp.w / x.W, vp.h / x.H);
  const swipe = useRef<number | null>(null);
  const go = (fwd: boolean) => setI((v) => (fwd ? Math.min(slides.length - 1, v + 1) : Math.max(0, v - 1)));
  return (
    <div className="fixed inset-0 z-[100] bg-black grid place-items-center print:hidden touch-none"
      onTouchStart={(e) => { swipe.current = rot ? e.touches[0].clientY : e.touches[0].clientX; }}
      onTouchEnd={(e) => { const a = swipe.current; swipe.current = null; if (a == null) return; const b = rot ? e.changedTouches[0].clientY : e.changedTouches[0].clientX; if (Math.abs(b - a) > 40) { e.preventDefault(); go(b < a); } }}
      onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); go(rot ? e.clientY - r.top > r.height / 2 : e.clientX - r.left > r.width / 2); }}>
      <div style={{ width: (rot ? x.H : x.W) * k, height: (rot ? x.W : x.H) * k }}><div style={{ transform: rot ? `translateX(${x.H * k}px) rotate(90deg) scale(${k})` : `scale(${k})`, transformOrigin: "0 0", width: x.W, height: x.H }}><Frame x={x} s={slides[i]} n={i + 1} total={slides.length}>{slides[i].body(x)}</Frame></div></div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white/60 hover:text-white text-sm font-mono">Esc · sair</button>
      <span className="absolute bottom-4 right-4 text-white/50 text-xs font-mono">{i + 1} / {slides.length}</span>
    </div>
  );
}
