"use client";
import type { CSSProperties, ReactNode } from "react";
import { monoSvg, svgParts } from "@/lib/design";
import { sceneKit } from "./Scenes";
import { SvgView } from "../ui";

/* Peças desenhadas para cada objeto dos mockups fotográficos.
   Nada de logo carimbado no meio: cada área recebe a peça que ela é de verdade (carta, cartão, story, claquete…)
   escrita na voz da marca e montada com as regras do manual: fundo e proporção da paleta, cor de destaque só onde
   o manual manda, grafismo do território (cantos de enquadramento, pesponto de losangos), frases da marca. */

export const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;

export function mix(a: string, b: string, t: number) {
  const p = (h: string) => { const x = h.replace("#", ""); const n = parseInt(x.length === 3 ? x.split("").map((c) => c + c).join("") : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [A, B] = [p(a), p(b)];
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const ar = (svg: string) => { if (!svg) return 1; const p = svgParts(svg); return p.w / p.h; };

/** tudo o que as peças precisam saber da marca, tirado do briefing, da paleta e do território */
export function brandVoice(d: any) {
  const k = sceneKit(d);
  const b = d.brief || {};
  const terr = (d.territories || []).find((t: any) => t.id === d.territory_id) || {};
  const fala: string[] = (b.fala || []).filter(Boolean);
  const pal: any[] = d.palette || [];
  const nameOf = (role: string) => norm(pal.find((p) => p.role === role)?.name || "");
  const first = norm(b.proporcao || "").trim().split(/[\s,]+/)[0] || "";
  const dark = !!first && nameOf("Escuro").startsWith(first);
  const regras = norm([...(b.regras_visuais || []), ...(b.elementos || []), terr.forma, terr.cor, terr.tipo, terr.metafora].filter(Boolean).join(" "));
  const t = d.type || {};
  const lema: string = b.slogan || k.slogan;
  const trad = fala.map((f) => f.split(":")).find((p) => p.length > 1 && norm(p[0]).includes(norm(lema).slice(0, 10)))?.[1]?.trim().replace(/\.$/, "");
  const oque = norm(`${b.oque || ""} ${b.aplicacoes || ""}`);
  const biz: "video" | "moda" | "servico" = /audiovisual|video|produtora|filme|gravac/.test(oque) ? "video" : /moda|roupa|vestu|loja|jeans/.test(oque) ? "moda" : "servico";
  const city = `${b.oque || ""}`.match(/\(([A-ZÀ-Ú][^()]{2,24})\)/)?.[1] || "";
  const gradient = /degrade/.test(regras);
  const light = k.acc;
  const soft = k.C["Apoio"];
  const base = dark ? k.ink : k.paper;
  const text = dark ? k.C["Claro"] : k.ink;
  const onAcc = dark ? k.ink : k.paper;
  const kwStyle: CSSProperties = gradient
    ? { backgroundImage: `linear-gradient(100deg, ${light} 10%, ${mix(light, soft, .55)} 95%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
    : { color: light, fontStyle: "italic" };
  const kw = (s: string) => { const w = (s || "").replace(/[.,:;!?…]+$/g, "").trim().split(/\s+/).pop() || ""; return w.replace(/[.,:;!?]/g, ""); };
  const sz = (fala.join(" ") + " " + (b.publico || "")).match(/\b(\d{2})\s*(?:ao|a|–|-)\s*(\d{2})\b/);
  const sizes = sz ? Array.from({ length: Math.floor((+sz[2] - +sz[1]) / 2) + 1 }, (_, i) => String(+sz[1] + i * 2)) : [];
  const dot = (c: string) => (d.pattern?.svg ? monoSvg(d.pattern.svg, c) : k.mark(c));
  return {
    k, b, terr, fala, dark, lema, trad, biz, city, light, soft, base, text, onAcc, kwStyle, kw, sizes, dot,
    grain: /grao|granul/.test(regras), corners: /canto|enquadra/.test(regras), stitch: !!d.pattern?.svg,
    latinScript: /latim|assinatura a mao/.test(regras) && !!t.accent,
    G: (s: CSSProperties = {}): CSSProperties => ({ fontFamily: `"${t.accent || t.title}"`, fontWeight: 400, lineHeight: 1, ...s }),
    site: b.site || `${k.handle.slice(1)}.com.br`,
    frase: fala[0] || lema, frase2: fala[1] || b.frase_mae || lema, frase3: fala.find((f, i) => i > 1 && !norm(f).includes(norm(lema).slice(0, 10))) || b.frase_mae || fala[0] || lema,
    mae: b.frase_mae || fala[0] || lema, pilares: (b.pilares || []) as string[], missao: b.missao || "", dif: b.diferencial || "",
    terrNome: terr.nome || lema,
  };
}
export type Voice = ReturnType<typeof brandVoice>;

/* ───────── peças de apoio ───────── */
export const A = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
export const Svg = ({ svg, style }: { svg: string; style: CSSProperties }) => <div style={A(style)}><SvgView svg={svg} className="w-full h-full" /></div>;
/** logo com a largura certa para a altura pedida (alinha à esquerda/direita de verdade) */
export const Logo = ({ svg, h, style }: { svg: string; h: number; style: CSSProperties }) => <Svg svg={svg} style={{ height: h, width: h * ar(svg), ...style }} />;
export const Bg = ({ c, v, grain }: { c: string; v: Voice; grain?: boolean }) => (
  <>
    <div style={A({ inset: 0, background: c })} />
    {(grain ?? (v.grain && c === v.k.ink)) && <div style={A({ inset: 0, backgroundImage: GRAIN, opacity: .16, mixBlendMode: "screen" })} />}
  </>
);
/** cantos de enquadramento (o visor da câmera) */
export function Corners({ inset, len, th, c, box }: { inset: number; len: number; th: number; c: string; box?: CSSProperties }) {
  const s = (p: CSSProperties): CSSProperties => A({ width: len, height: len, borderColor: c, borderStyle: "solid", borderWidth: 0, ...p });
  return (
    <div style={A({ inset, ...box })}>
      <div style={s({ left: 0, top: 0, borderLeftWidth: th, borderTopWidth: th })} />
      <div style={s({ right: 0, top: 0, borderRightWidth: th, borderTopWidth: th })} />
      <div style={s({ left: 0, bottom: 0, borderLeftWidth: th, borderBottomWidth: th })} />
      <div style={s({ right: 0, bottom: 0, borderRightWidth: th, borderBottomWidth: th })} />
    </div>
  );
}
/** pesponto de losangos: o detalhe do logo costurado em volta (frame) ou numa linha (row) */
export function stitchSvg(W: number, H: number, size: number, gap: number, c: string, frame = true) {
  let s = ""; const step = size + gap;
  const dia = (x: number, y: number) => { s += `<polygon points="${x.toFixed(1)},${(y - size / 2).toFixed(1)} ${(x + size / 2).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + size / 2).toFixed(1)} ${(x - size / 2).toFixed(1)},${y.toFixed(1)}" fill="${c}"/>`; };
  const line = (x1: number, y1: number, x2: number, y2: number, skipEnd: boolean) => { const L = Math.hypot(x2 - x1, y2 - y1); const n = Math.max(1, Math.round(L / step)); for (let i = 0; i < n + (skipEnd ? 0 : 1); i++) dia(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n); };
  const m = size / 2;
  if (frame) { line(m, m, W - m, m, true); line(W - m, m, W - m, H - m, true); line(W - m, H - m, m, H - m, true); line(m, H - m, m, m, true); }
  else line(m, H / 2, W - m, H / 2, false);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}">${s}</svg>`;
}
export const Stitch = ({ style, w, h, size, c, frame = true }: { style: CSSProperties; w: number; h: number; size: number; c: string; frame?: boolean }) => <Svg svg={stitchSvg(w, h, size, size * 1.6, c, frame)} style={{ width: w, height: h, ...style }} />;

/** frase com a palavra-chave em destaque (e o ponto de gravação quando a palavra é REC) */
export function Phrase({ v, text, style, kw }: { v: Voice; text: string; style: CSSProperties; kw?: string }) {
  const w = kw ?? v.kw(text); const i = w ? text.lastIndexOf(w) : -1;
  if (i < 0) return <p style={style}>{text}</p>;
  const rec = /^rec$/i.test(w);
  return (
    <p style={style}>
      {text.slice(0, i)}
      {rec && <span style={{ display: "inline-block", width: ".42em", height: ".42em", borderRadius: 99, background: v.light, margin: "0 .12em .1em 0", verticalAlign: "middle", boxShadow: `0 0 .4em ${v.light}` }} />}
      <span style={v.kwStyle}>{w}</span>{text.slice(i + w.length)}
    </p>
  );
}
/** lema: em latim vira assinatura à mão (VINCIT); nas outras, título em itálico */
export function Lema({ v, size, c, tc, align = "left" }: { v: Voice; size: number; c: string; tc?: string; align?: "left" | "center" | "right" }) {
  return (
    <div style={{ textAlign: align }}>
      <p style={v.latinScript ? v.G({ fontSize: size * 1.5, color: c }) : v.k.T({ fontSize: size, color: c, fontStyle: "italic", fontWeight: 400 })}>{v.lema}</p>
      {v.trad && <p style={v.k.B({ fontSize: size * .32, color: tc || c, letterSpacing: ".28em", textTransform: "uppercase", marginTop: size * .25, opacity: .8 })}>{v.trad}</p>}
    </div>
  );
}
/** selo: o único lugar da assinatura caligráfica na ISYS (pesponto em volta + monograma) */
export function Seal({ v, size, c, bg, text, style }: { v: Voice; size: number; c: string; bg: string; text?: string; style: CSSProperties }) {
  return (
    <div style={A({ width: size, height: size, borderRadius: "50%", background: bg, ...style })}>
      <div style={A({ inset: size * .05, borderRadius: "50%", border: `${size * .008}px dashed ${c}` })} />
      <Svg svg={v.k.mark(c)} style={{ left: "32%", right: "32%", top: "22%", height: "30%" }} />
      <p style={v.G({ position: "absolute", left: "10%", right: "10%", top: "56%", textAlign: "center", fontSize: size * .1, color: c, lineHeight: 1.1 })}>{text || v.frase}</p>
    </div>
  );
}
export const Caps = ({ v, size, c, children, style }: { v: Voice; size: number; c: string; children: ReactNode; style?: CSSProperties }) => (
  <p style={v.k.B({ fontSize: size, color: c, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 500, lineHeight: 1.6, ...style })}>{children}</p>
);
export const Quote = ({ v, size, c, style }: { v: Voice; size: number; c: string; style: CSSProperties }) => <p style={v.k.T({ position: "absolute", fontSize: size, color: c, lineHeight: .8, ...style })}>“</p>;
export function Sizes({ v, size, c, fill, pick, style }: { v: Voice; size: number; c: string; fill: string; pick?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: size * .28, ...style }}>
      {v.sizes.map((s, i) => (
        <span key={s} style={v.k.B({ width: size, height: size, borderRadius: 99, display: "grid", placeItems: "center", fontSize: size * .36, fontWeight: 500, border: `${Math.max(1, size * .03)}px solid ${i === pick ? fill : c}`, background: i === pick ? fill : "transparent", color: i === pick ? v.base : c })}>{s}</span>
      ))}
    </div>
  );
}
const dateBR = () => new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/* ───────── as peças ───────── */
type P = { v: Voice; w: number; h: number; n: number };

/** papel timbrado com carta de verdade na voz da marca */
function Timbrado({ v, w, h }: P) {
  const { k } = v; const m = w * .085; const fs = w * .0145;
  const paper = v.dark ? "#f6f6f4" : k.paper; const ink = k.ink; const sub = mix(ink, paper, .45);
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={paper} v={v} grain={false} />
      <Logo svg={k.logo(ink)} h={w * .042} style={{ left: m, top: m }} />
      <div style={A({ right: m, top: m * .95, textAlign: "right" })}>
        <Caps v={v} size={fs * .72} c={sub}>{v.site}<br />{k.handle}{v.city ? <><br />{v.city}</> : null}</Caps>
      </div>
      {v.stitch ? <Stitch w={w - 2 * m} h={fs * .7} size={fs * .55} c={v.light} frame={false} style={{ left: m, top: m + w * .085 }} />
        : <div style={A({ left: m, right: m, top: m + w * .088, height: Math.max(1, w * .0012), background: mix(ink, paper, .8) })} />}
      <div style={A({ left: m, width: w * .7, top: m + w * .14 })}>
        <p style={k.B({ fontSize: fs, color: sub })}>{v.city ? `${v.city}, ` : ""}{dateBR()}</p>
        <p style={k.B({ fontSize: fs, color: ink, marginTop: fs * 3 })}>Olá,</p>
        {[v.missao, v.dif].filter(Boolean).map((t, i) => <p key={i} style={k.B({ fontSize: fs, color: mix(ink, paper, .15), lineHeight: 1.75, marginTop: fs * 1.4 })}>{t}</p>)}
        <Phrase v={v} text={v.frase} style={k.T({ fontSize: fs * 2.6, color: ink, lineHeight: 1.08, margin: `${fs * 2.4}px 0 ${fs * 1}px`, maxWidth: w * .6 })} />
        <p style={k.B({ fontSize: fs, color: mix(ink, paper, .15), lineHeight: 1.75, marginTop: fs * 1.4 })}>{v.mae}</p>
        <p style={k.B({ fontSize: fs, color: ink, marginTop: fs * 3 })}>Um abraço,</p>
        <p style={v.G({ fontSize: fs * 4.2, color: ink, marginTop: fs * .6 })}>{v.k.name.charAt(0) + v.k.name.slice(1).toLowerCase()}</p>
      </div>
      <div style={A({ left: m, bottom: m, display: "flex", alignItems: "flex-end" })}>
        <Lema v={v} size={fs * 1.7} c={mix(ink, paper, .3)} />
      </div>
      <Svg svg={v.dark ? k.mark(v.light) : v.dot(v.light)} style={{ right: m, bottom: m, width: w * .07, height: w * .07 }} />
      {v.corners && <Corners inset={m * .45} len={w * .04} th={Math.max(1, w * .0016)} c={mix(ink, paper, .75)} />}
    </div>
  );
}

/** capa de proposta / lookbook */
function Capa({ v, w, h }: P) {
  const { k } = v; const m = w * .09;
  const bg = v.dark ? k.ink : k.acc; const fg = v.dark ? k.C["Claro"] : k.paper; const hi = v.dark ? v.light : k.paper;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      {v.dark ? <Quote v={v} size={w * .34} c={hi} style={{ left: m * .8, top: m * .9 }} /> : <Svg svg={v.dot(fg)} style={{ left: m, top: m, width: w * .05, height: w * .05 }} />}
      <Logo svg={k.logo(fg)} h={w * .03} style={{ right: m, top: m * 1.1 }} />
      <div style={A({ left: m, right: m, top: h * .42 })}>
        <Caps v={v} size={w * .017} c={hi}>{v.biz === "video" ? "Proposta de conteúdo" : v.biz === "moda" ? "Lookbook" : "Apresentação"} · {new Date().getFullYear() + 1}</Caps>
        <Phrase v={v} text={v.mae} kw={v.dark ? undefined : ""} style={k.T({ fontSize: w * .088, color: fg, lineHeight: 1.02, marginTop: w * .03 })} />
      </div>
      <div style={A({ left: m, bottom: m })}><Lema v={v} size={w * .036} c={fg} tc={hi} /></div>
      {v.dark ? <Svg svg={k.mark(hi)} style={{ right: m, bottom: m, width: w * .1, height: w * .1 }} />
        : <Stitch w={w * .3} h={w * .02} size={w * .014} c={fg} frame={false} style={{ right: m, bottom: m * 1.2 }} />}
      {v.corners && <Corners inset={m * .45} len={w * .05} th={w * .0025} c={mix(fg, bg, .6)} />}
    </div>
  );
}

/** cartão de visita, frente */
function Cartao({ v, w, h }: P) {
  const { k } = v; const bg = v.base; const fg = v.dark ? k.C["Claro"] : k.ink;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      <Svg svg={k.logo(fg)} style={{ left: "24%", right: "24%", top: "30%", bottom: "30%" }} />
      {v.corners && <Corners inset={h * .1} len={h * .1} th={h * .006} c={v.light} />}
      {v.stitch && <Stitch w={w * .88} h={h * .82} size={h * .022} c={v.light} style={{ left: w * .06, top: h * .09 }} />}
      {v.dark && <Caps v={v} size={h * .03} c={mix(fg, bg, .4)} style={{ position: "absolute", left: 0, right: 0, bottom: h * .16, textAlign: "center" }}>{v.lema}</Caps>}
    </div>
  );
}

/** cartão de visita, verso: a cor de destaque chapada, o símbolo grande sangrando */
function CartaoVerso({ v, w, h }: P) {
  const { k } = v; const bg = k.acc; const fg = v.onAcc;
  return (
    <div style={A({ inset: 0, overflow: "hidden" })}>
      <Bg c={bg} v={v} grain={false} />
      <Svg svg={k.mark(v.dark ? fg : mix(bg, fg, .22))} style={{ right: -h * .32, top: -h * .2, width: h * 1.25, height: h * 1.25 }} />
      <div style={A({ left: w * .07, bottom: h * .12 })}>
        <p style={k.T({ fontSize: h * .07, color: fg, lineHeight: 1.1, maxWidth: w * .5 })}>{v.frase}</p>
        <Caps v={v} size={h * .032} c={fg} style={{ marginTop: h * .06, opacity: .85 }}>{k.handle}<br />{v.site}</Caps>
      </div>
    </div>
  );
}

/** envelope (frente) */
function Envelope({ v, w, h }: P) {
  const { k } = v; const bg = v.dark ? k.ink : k.paper; const fg = v.dark ? k.C["Claro"] : k.ink; const m = h * .11;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      <Logo svg={k.logo(fg)} h={h * .075} style={{ left: m, top: m }} />
      <Caps v={v} size={h * .024} c={mix(fg, bg, .4)} style={{ position: "absolute", left: m, top: m + h * .12 }}>{v.site} · {k.handle}</Caps>
      {v.stitch ? <><Stitch w={w - 2 * m} h={h * .03} size={h * .02} c={v.light} frame={false} style={{ left: m, bottom: m }} /><p style={v.G({ position: "absolute", right: m, bottom: m + h * .07, fontSize: h * .11, color: v.light })}>{v.frase}</p></>
        : <Svg svg={k.mark(v.light)} style={{ right: m, bottom: m, width: h * .2, height: h * .2 }} />}
      <div style={A({ left: w * .46, top: h * .42 })}>
        <Caps v={v} size={h * .026} c={mix(fg, bg, .45)}>Para</Caps>
        {[.34, .28, .22].map((x, i) => <div key={i} style={{ width: w * x, height: Math.max(1, h * .003), background: mix(fg, bg, .7), marginTop: h * .07 }} />)}
      </div>
    </div>
  );
}
/** envelope (verso): o grafismo na cor de destaque */
function EnvelopeVerso({ v, w, h }: P) {
  const { k } = v; const pat = k.pat(k.acc, v.dark ? mix(k.acc, k.ink, .25) : mix(k.acc, k.paper, .3), Math.round(w), Math.round(h));
  return <div style={A({ inset: 0, background: k.acc, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover" })} />;
}

/** folheto alto (DL): a segunda frase da marca, grande */
function Folheto({ v, w, h }: P) {
  const { k } = v; const bg = v.base; const fg = v.text; const m = w * .1;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      {v.dark && <Quote v={v} size={w * .42} c={v.light} style={{ left: m * .8, top: m }} />}
      {!v.dark && <Svg svg={v.dot(k.acc)} style={{ left: m, top: m, width: w * .08, height: w * .08 }} />}
      <Phrase v={v} text={v.frase2} kw={v.sizes.length ? "" : undefined} style={k.T({ position: "absolute", left: m, right: m, top: h * .28, fontSize: w * .12, color: fg, lineHeight: 1.04 })} />
      {v.sizes.length > 0 && <Sizes v={v} size={w * .12} c={fg} fill={v.light} pick={2} style={{ position: "absolute", left: m, top: h * .62, flexWrap: "wrap" }} />}
      <div style={A({ left: m, bottom: m * 2.2 })}><Lema v={v} size={w * .06} c={v.dark ? v.light : fg} tc={fg} /></div>
      <Logo svg={k.logo(fg)} h={w * .05} style={{ left: m, bottom: m }} />
      <Svg svg={v.dot(v.light)} style={{ right: m, bottom: m, width: w * .09, height: w * .09 }} />
    </div>
  );
}

/** post quadrado: o sistema de posts da marca (aspas, frase, lema, símbolo no canto) */
function Post({ v, w, h }: P) {
  const { k } = v; const bg = v.base; const fg = v.text; const m = w * .08;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      {v.dark ? <Quote v={v} size={w * .3} c={v.light} style={{ left: m, top: m }} /> : <Svg svg={v.dot(k.acc)} style={{ left: "47%", right: "47%", top: m * 1.6, height: w * .06 }} />}
      <Phrase v={v} text={v.frase} style={k.T({ position: "absolute", left: m * 1.2, right: m * 1.2, top: h * .36, fontSize: w * .095, color: fg, lineHeight: 1.05, textAlign: v.dark ? "left" : "center" })} />
      <div style={A({ left: m * 1.2, right: m * 1.2, bottom: m * 1.4 })}>{v.dark ? <Lema v={v} size={w * .05} c={v.light} tc={fg} /> : <Caps v={v} size={w * .022} c={fg} style={{ textAlign: "center" }}>{k.handle}</Caps>}</div>
      {v.dark && <Svg svg={k.mark(v.light)} style={{ right: m, bottom: m, width: w * .08, height: w * .08 }} />}
      {v.stitch && <Stitch w={w * .9} h={h * .9} size={w * .016} c={v.light} style={{ left: w * .05, top: h * .05 }} />}
    </div>
  );
}

/* interface do celular */
export function StatusBar({ v, w, c }: { v: Voice; w: number; c: string }) {
  return (
    <div style={A({ left: w * .09, right: w * .09, top: w * .06, display: "flex", justifyContent: "space-between", alignItems: "center" })}>
      <span style={v.k.B({ fontSize: w * .038, fontWeight: 600, color: c })}>9:41</span>
      <span style={{ display: "flex", gap: w * .015, alignItems: "flex-end" }}>{[.3, .5, .7, .9].map((x, i) => <i key={i} style={{ width: w * .012, height: w * .03 * x, background: c, borderRadius: 2 }} />)}<i style={{ width: w * .06, height: w * .028, border: `${w * .003}px solid ${c}`, borderRadius: w * .008, marginLeft: w * .015 }} /></span>
    </div>
  );
}
export function Avatar({ v, size }: { v: Voice; size: number }) {
  return <div style={{ width: size, height: size, borderRadius: 99, background: v.k.acc, position: "relative", flex: "none", boxShadow: `0 0 0 ${size * .06}px ${v.base}, 0 0 0 ${size * .1}px ${v.light}` }}><Svg svg={v.k.mark(v.onAcc)} style={{ inset: "22%" }} /></div>;
}

/** story do Instagram, com a interface por cima */
function Story({ v, w, h }: P) {
  const { k } = v; const bg = v.base; const fg = v.text; const m = w * .08;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      <StatusBar v={v} w={w} c={fg} />
      <div style={A({ left: m * .5, right: m * .5, top: w * .14, display: "flex", gap: w * .01 })}>{[1, .45, 0].map((p, i) => <div key={i} style={{ flex: 1, height: w * .007, background: mix(fg, bg, .7), borderRadius: 9 }}><div style={{ width: `${p * 100}%`, height: "100%", background: fg, borderRadius: 9 }} /></div>)}</div>
      <div style={A({ left: m * .5, top: w * .18, display: "flex", alignItems: "center", gap: w * .03 })}>
        <Avatar v={v} size={w * .085} />
        <span style={k.B({ fontSize: w * .036, fontWeight: 600, color: fg })}>{k.handle.slice(1)}</span>
        <span style={k.B({ fontSize: w * .034, color: mix(fg, bg, .4) })}>2 h</span>
      </div>
      {v.dark && <Quote v={v} size={w * .4} c={v.light} style={{ left: m, top: h * .2 }} />}
      {!v.dark && <Svg svg={v.dot(k.acc)} style={{ left: "46%", right: "46%", top: h * .24, height: w * .08 }} />}
      <Phrase v={v} text={v.frase3} style={k.T({ position: "absolute", left: m, right: m, top: h * .34, fontSize: w * .11, color: fg, lineHeight: 1.06, textAlign: v.dark ? "left" : "center" })} />
      <div style={A({ left: 0, right: 0, top: h * .66, display: "flex", justifyContent: "center" })}>
        <span style={k.B({ display: "inline-flex", alignItems: "center", gap: w * .025, padding: `${w * .03}px ${w * .05}px`, borderRadius: 99, background: v.dark ? v.light : k.acc, color: v.dark ? k.ink : k.paper, fontSize: w * .04, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,.25)" })}>
          <span style={{ width: w * .045, height: w * .045, borderRadius: 99, border: `${w * .006}px solid currentColor`, display: "inline-block" }} />
          {v.biz === "moda" ? "Chamar no WhatsApp" : "Fale com a gente"}
        </span>
      </div>
      <div style={A({ left: m, right: m, bottom: h * .2 })}>{v.dark ? <Lema v={v} size={w * .06} c={v.light} tc={fg} /> : <p style={v.G({ fontSize: w * .09, color: k.acc, textAlign: "center" })}>{v.lema}</p>}</div>
      <div style={A({ left: m * .5, right: m * .5, bottom: h * .07, display: "flex", alignItems: "center", gap: w * .04 })}>
        <span style={k.B({ flex: 1, border: `${w * .004}px solid ${mix(fg, bg, .5)}`, borderRadius: 99, padding: `${w * .03}px ${w * .05}px`, fontSize: w * .036, color: mix(fg, bg, .3) })}>Enviar mensagem</span>
        <span style={{ fontSize: w * .07, color: fg, lineHeight: 1 }}>♡</span>
        <span style={{ fontSize: w * .06, color: fg, lineHeight: 1, transform: "rotate(-20deg)" }}>➤</span>
      </div>
    </div>
  );
}

/** celular gravando: o visor da câmera, com o feixe de luz da marca e o símbolo em foco */
function Camera({ v, w, h }: P) {
  const { k } = v; const fg = k.C["Claro"]; const m = w * .07;
  return (
    <div style={A({ inset: 0, overflow: "hidden" })}>
      <div style={A({ inset: 0, background: `radial-gradient(70% 45% at 50% 45%, ${mix(v.soft, k.ink, .35)}, ${k.ink} 75%)` })} />
      <div style={A({ left: "-30%", top: "-10%", width: "70%", height: "130%", transform: "rotate(18deg)", background: `linear-gradient(90deg, transparent, ${v.light}26 45%, ${v.light}40 50%, ${v.light}26 55%, transparent)`, filter: `blur(${w * .03}px)` })} />
      <div style={A({ inset: 0, backgroundImage: GRAIN, opacity: .2, mixBlendMode: "screen" })} />
      {[1, 2].map((i) => <div key={"v" + i} style={A({ left: `${(i * 100) / 3}%`, top: 0, bottom: 0, width: Math.max(1, w * .002), background: `${fg}30` })} />)}
      {[1, 2].map((i) => <div key={"h" + i} style={A({ top: `${(i * 100) / 3}%`, left: 0, right: 0, height: Math.max(1, w * .002), background: `${fg}30` })} />)}
      <div style={A({ left: m, right: m, top: w * .17, display: "flex", justifyContent: "space-between", alignItems: "center" })}>
        <span style={k.B({ display: "flex", alignItems: "center", gap: w * .02, fontSize: w * .036, color: fg, fontWeight: 600, letterSpacing: ".1em" })}><i style={{ width: w * .03, height: w * .03, borderRadius: 99, background: "#ff3b30", boxShadow: "0 0 12px #ff3b30" }} />REC 00:01:24:12</span>
        <span style={k.B({ fontSize: w * .032, color: fg, letterSpacing: ".12em" })}>4K · 24 FPS</span>
      </div>
      <Corners inset={0} len={w * .09} th={w * .006} c={v.light} box={{ left: "18%", right: "18%", top: h * .3, bottom: "auto", height: w * .64 }} />
      <Svg svg={k.mark(v.light)} style={{ left: "32%", right: "32%", top: h * .3 + w * .14, height: w * .36 }} />
      <Phrase v={v} text={v.frase2} style={k.T({ position: "absolute", left: m, right: m, top: h * .6, fontSize: w * .088, color: fg, lineHeight: 1.08, textAlign: "center" })} />
      <Caps v={v} size={w * .03} c={`${fg}cc`} style={{ position: "absolute", left: 0, right: 0, bottom: h * .2, textAlign: "center" }}>Cena 01 · Take 03 · {k.name}</Caps>
      <div style={A({ left: "50%", bottom: h * .07, width: w * .2, height: w * .2, marginLeft: -w * .1, borderRadius: 99, border: `${w * .012}px solid ${fg}`, display: "grid", placeItems: "center" })}><i style={{ width: "62%", height: "62%", borderRadius: 99, background: v.light }} /></div>
      <div style={A({ left: m * 1.5, bottom: h * .085, width: w * .12, height: w * .12, borderRadius: w * .02, background: k.acc, overflow: "hidden" })}><Svg svg={k.mark(k.ink)} style={{ inset: "22%" }} /></div>
    </div>
  );
}

/** loja no celular (marca de moda): peça com nome, tamanhos e o atendimento */
function Loja({ v, w, h }: P) {
  const { k } = v; const fg = k.ink; const m = w * .07;
  const pat = k.pat(k.acc, mix(k.acc, k.paper, .25), Math.round(w), Math.round(h * .4));
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={k.paper} v={v} grain={false} />
      <StatusBar v={v} w={w} c={fg} />
      <div style={A({ left: m, right: m, top: w * .16, display: "flex", justifyContent: "space-between", alignItems: "center" })}>
        <span style={{ display: "grid", gap: w * .012 }}>{[0, 1, 2].map((i) => <i key={i} style={{ width: w * .06, height: w * .006, background: fg }} />)}</span>
        <Logo svg={k.logo(fg)} h={w * .07} style={{ position: "relative" }} />
        <span style={{ width: w * .055, height: w * .06, border: `${w * .006}px solid ${fg}`, borderRadius: `0 0 ${w * .01}px ${w * .01}px` }} />
      </div>
      <div style={A({ left: m, right: m, top: w * .3, height: h * .36, background: k.acc, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover", borderRadius: w * .03, overflow: "hidden" })}>
        <Seal v={v} size={w * .34} c={k.acc} bg={k.paper} style={{ right: w * .05, bottom: w * .05 }} />
      </div>
      <div style={A({ left: m, right: m, top: w * .3 + h * .38 })}>
        <Caps v={v} size={w * .028} c={k.acc}>{v.terrNome}</Caps>
        <Phrase v={v} text={v.frase} style={k.T({ fontSize: w * .085, color: fg, lineHeight: 1.05, marginTop: w * .02 })} />
        <p style={k.B({ fontSize: w * .032, color: mix(fg, k.paper, .3), marginTop: w * .03 })}>Tamanho</p>
        {v.sizes.length > 0 && <Sizes v={v} size={w * .12} c={fg} fill={k.acc} pick={2} style={{ marginTop: w * .02 }} />}
        <div style={k.B({ marginTop: w * .06, background: fg, color: k.paper, borderRadius: 99, padding: `${w * .04}px 0`, textAlign: "center", fontSize: w * .038, fontWeight: 600 })}>Separar meu tamanho no WhatsApp</div>
        <p style={k.B({ fontSize: w * .028, color: mix(fg, k.paper, .35), marginTop: w * .03, textAlign: "center" })}>{v.pilares.slice(1, 3).join(" · ")}</p>
      </div>
    </div>
  );
}

/** site no notebook: navegação, frase-mãe e os pilares */
function Site({ v, w, h }: P) {
  const { k } = v; const bg = v.base; const fg = v.text; const m = w * .06;
  const menu = v.biz === "video" ? ["Trabalhos", "Método", "Sobre"] : v.biz === "moda" ? ["Novidades", "Coleção", "Tamanhos", "Loja"] : ["Sobre", "Serviços", "Contato"];
  const pat = !v.dark ? k.pat(k.acc, mix(k.acc, k.paper, .25), Math.round(w * .36), Math.round(h * .7)) : "";
  return (
    <div style={A({ inset: 0, overflow: "hidden" })}>
      <Bg c={bg} v={v} />
      <div style={A({ left: m, right: m, top: h * .06, display: "flex", alignItems: "center", justifyContent: "space-between" })}>
        <Logo svg={k.logo(fg)} h={h * .04} style={{ position: "relative" }} />
        <div style={{ display: "flex", alignItems: "center", gap: w * .03 }}>
          {menu.map((x) => <span key={x} style={k.B({ fontSize: h * .02, color: mix(fg, bg, .25), letterSpacing: ".08em" })}>{x}</span>)}
          <span style={k.B({ fontSize: h * .02, fontWeight: 600, padding: `${h * .012}px ${w * .015}px`, borderRadius: 99, background: v.dark ? v.light : k.acc, color: v.dark ? k.ink : k.paper })}>{v.biz === "moda" ? "WhatsApp" : "Fale com a gente"}</span>
        </div>
      </div>
      <div style={A({ left: m, width: w * .5, top: h * .22 })}>
        <Caps v={v} size={h * .018} c={v.dark ? v.light : k.acc}>{v.terrNome}</Caps>
        <Phrase v={v} text={v.mae} style={k.T({ fontSize: h * .085, color: fg, lineHeight: 1.04, marginTop: h * .025 })} />
        <p style={k.B({ fontSize: h * .021, color: mix(fg, bg, .3), lineHeight: 1.6, marginTop: h * .035, maxWidth: w * .42 })}>{v.missao}</p>
        <div style={{ display: "flex", gap: w * .012, marginTop: h * .04 }}>
          <span style={k.B({ fontSize: h * .02, fontWeight: 600, padding: `${h * .018}px ${w * .022}px`, borderRadius: 99, background: v.dark ? v.light : k.ink, color: v.dark ? k.ink : k.paper })}>{v.biz === "video" ? "Ver trabalhos" : v.biz === "moda" ? "Ver coleção" : "Conhecer"} →</span>
          <span style={k.B({ fontSize: h * .02, padding: `${h * .018}px ${w * .022}px`, borderRadius: 99, border: `1px solid ${mix(fg, bg, .6)}`, color: fg })}>{k.handle}</span>
        </div>
      </div>
      {v.dark ? (
        <>
          <Svg svg={k.mark(v.light)} style={{ right: -w * .05, top: h * .12, width: h * .7, height: h * .7, filter: `drop-shadow(0 0 ${h * .05}px ${v.light}66)` }} />
          {v.corners && <Corners inset={0} len={h * .05} th={h * .003} c={mix(fg, bg, .5)} box={{ left: w * .6, right: m, top: h * .16, bottom: h * .26 }} />}
        </>
      ) : (
        <div style={A({ right: m, top: h * .16, width: w * .34, height: h * .6, borderRadius: h * .02, background: k.acc, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover", overflow: "hidden" })}>
          <Seal v={v} size={h * .26} c={k.acc} bg={k.paper} style={{ left: h * .04, bottom: h * .04 }} />
        </div>
      )}
      <div style={A({ left: m, right: m, bottom: h * .06, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(3, v.pilares.length))}, 1fr)`, gap: w * .03, borderTop: `1px solid ${mix(fg, bg, .8)}`, paddingTop: h * .03 })}>
        {v.pilares.slice(0, 3).map((p, i) => <div key={i}><span style={k.B({ fontSize: h * .018, color: v.dark ? v.light : k.acc, fontWeight: 600 })}>0{i + 1}</span><p style={k.B({ fontSize: h * .022, color: fg, marginTop: h * .008 })}>{p}</p></div>)}
      </div>
    </div>
  );
}

/** caneca: como uma caneca de verdade é impressa. Cerâmica na cor de base da marca e uma
   impressão só, pequena e centrada na frente (símbolo + nome). Nada de moldura nem faixa reta
   atravessando o corpo: em superfície curva elas denunciam a arte chapada. As bordas da arte
   somem em gradiente, como a impressão que dobra para trás do cilindro. */
function Caneca({ v, w, h }: P) {
  const { k } = v;
  const body = v.base; const ink = v.text; const mark = v.dark ? v.light : k.acc;
  const s = h * .3; const cx = w / 2;
  const fade = "linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%)";
  return (
    <div style={A({ inset: 0 })}>
      <div style={A({ inset: 0, background: body })} />
      <div style={A({ left: cx - w * .3, width: w * .6, top: 0, bottom: 0, WebkitMaskImage: fade, maskImage: fade })}>
        <Svg svg={k.mark(mark)} style={{ left: w * .3 - s / 2, top: h * .26, width: s, height: s }} />
        <div style={A({ left: 0, right: 0, top: h * .26 + s + h * .07, display: "flex", justifyContent: "center" })}>
          <Logo svg={k.logo(ink)} h={h * .075} style={{ position: "relative" }} />
        </div>
      </div>
    </div>
  );
}

/** sacola: o símbolo enorme sangrando pela lateral, o nome pequeno no alto */
function Sacola({ v, w, h, n }: P) {
  const { k } = v; const u = Math.min(w, h); const m = u * .08;
  if (n % 2 === 1) {
    const bg = v.dark ? k.acc : k.paper; const fg = v.dark ? k.ink : k.ink;
    return (
      <div style={A({ inset: 0, overflow: "hidden" })}>
        <Bg c={bg} v={v} grain={false} />
        <Svg svg={k.logo(fg)} style={{ left: "20%", right: "20%", top: "36%", height: "16%" }} />
        {v.dark ? <Svg svg={k.mark(fg)} style={{ right: m, bottom: m, width: u * .1, height: u * .1 }} /> : <Seal v={v} size={u * .26} c={k.paper} bg={k.acc} style={{ left: w / 2 - u * .13, bottom: m * 1.2 }} />}
        {v.stitch && <Stitch w={w - m * 2} h={h - m * 2} size={u * .018} c={k.acc} style={{ left: m, top: m }} />}
      </div>
    );
  }
  const bg = v.dark ? k.ink : k.acc; const fg = v.dark ? k.C["Claro"] : k.paper; const big = v.dark ? v.light : mix(k.acc, k.paper, .2);
  return (
    <div style={A({ inset: 0, overflow: "hidden" })}>
      <Bg c={bg} v={v} />
      <Svg svg={k.mark(big)} style={{ right: -u * .32, bottom: -u * .22, width: u * 1.05, height: u * 1.05 }} />
      <Logo svg={k.logo(fg)} h={u * .07} style={{ left: m, top: m }} />
      <div style={A({ left: m, bottom: m })}>{v.dark ? <Lema v={v} size={u * .045} c={fg} tc={fg} /> : <p style={k.T({ fontSize: u * .05, color: fg, fontStyle: "italic", fontWeight: 400, maxWidth: w * .5, lineHeight: 1.1 })}>{v.lema}</p>}</div>
    </div>
  );
}

/** placa da fachada: o símbolo sozinho, como sinal do lugar */
function Placa({ v, w, h }: P) {
  const { k } = v; const u = Math.min(w, h); const bg = v.dark ? k.ink : k.acc; const fg = v.dark ? v.light : k.paper;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} />
      <Svg svg={k.mark(fg)} style={{ left: "26%", right: "26%", top: "22%", bottom: "30%" }} />
      <Logo svg={k.logo(v.dark ? k.C["Claro"] : k.paper)} h={u * .065} style={{ left: w / 2 - (u * .065 * ar(k.logo("#000"))) / 2, bottom: u * .14 }} />
      {v.corners && <Corners inset={u * .08} len={u * .09} th={u * .007} c={mix(k.C["Claro"], bg, .5)} />}
      {v.stitch && <Stitch w={u * .86} h={u * .86} size={u * .02} c={k.paper} style={{ left: (w - u * .86) / 2, top: (h - u * .86) / 2 }} />}
    </div>
  );
}

/** outdoor: uma frase, uma ideia */
function Outdoor({ v, w, h }: P) {
  const { k } = v; const m = h * .12; const bg = v.base; const fg = v.text;
  return (
    <div style={A({ inset: 0, overflow: "hidden" })}>
      <Bg c={bg} v={v} />
      <Phrase v={v} text={v.dark ? v.frase : v.frase2} kw={v.dark ? undefined : ""} style={k.T({ position: "absolute", left: m, width: w * .58, top: "50%", transform: "translateY(-50%)", fontSize: h * .2, color: fg, lineHeight: 1.02 })} />
      {v.dark ? (
        <div style={A({ right: m, top: m, bottom: m, width: w * .26, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" })}>
          <Svg svg={k.mark(v.light)} style={{ position: "relative", width: h * .38, height: h * .38 }} />
          <div style={{ textAlign: "right" }}><Logo svg={k.logo(fg)} h={h * .09} style={{ position: "relative", marginLeft: "auto" }} /><Caps v={v} size={h * .035} c={mix(fg, bg, .4)} style={{ marginTop: h * .03 }}>{k.handle}</Caps></div>
        </div>
      ) : (
        <div style={A({ right: 0, top: 0, bottom: 0, width: w * .3, background: k.acc, backgroundImage: `url("${k.pat(k.acc, mix(k.acc, k.paper, .25), Math.round(w * .3), Math.round(h))}")`, backgroundSize: "cover" })}>
          <Seal v={v} size={h * .55} c={k.acc} bg={k.paper} style={{ left: "50%", top: "50%", marginLeft: -h * .275, marginTop: -h * .275 }} />
        </div>
      )}
      {!v.dark && v.sizes.length > 0 && <Sizes v={v} size={h * .1} c={fg} fill={k.acc} pick={2} style={{ position: "absolute", left: m, bottom: m * .9 }} />}
      {v.corners && <Corners inset={m * .45} len={h * .1} th={h * .006} c={mix(fg, bg, .7)} />}
    </div>
  );
}

/** cartaz vertical: três leituras (frase na cor chapada, símbolo, grafismo) */
function Cartaz({ v, w, h, n }: P) {
  const { k } = v; const m = w * .09; const kind = n % 3;
  if (kind === 0) {
    const bg = k.acc; const fg = v.onAcc;
    return (
      <div style={A({ inset: 0 })}>
        <Bg c={bg} v={v} grain={false} />
        <Svg svg={k.mark(fg)} style={{ right: m, top: m, width: w * .14, height: w * .14 }} />
        <p style={k.T({ position: "absolute", left: m, right: m, top: h * .3, fontSize: w * .13, color: fg, lineHeight: 1.02 })}>{v.dark ? v.frase2 : v.frase}</p>
        <Logo svg={k.logo(fg)} h={w * .055} style={{ left: m, bottom: m }} />
        <Caps v={v} size={w * .022} c={fg} style={{ position: "absolute", right: m, bottom: m }}>{k.handle}</Caps>
      </div>
    );
  }
  if (kind === 1) {
    const bg = v.base; const fg = v.text;
    return (
      <div style={A({ inset: 0 })}>
        <Bg c={bg} v={v} />
        <Svg svg={k.mark(v.dark ? v.light : k.acc)} style={{ left: "22%", right: "22%", top: h * .2, height: w * .56 }} />
        <div style={A({ left: m, right: m, top: h * .62 })}><Lema v={v} size={w * .09} c={fg} tc={v.dark ? v.light : k.acc} align="center" /></div>
        <Logo svg={k.logo(fg)} h={w * .045} style={{ left: w / 2 - (w * .045 * ar(k.logo("#000"))) / 2, bottom: m }} />
        {v.corners && <Corners inset={m * .5} len={w * .07} th={w * .004} c={mix(fg, bg, .6)} />}
      </div>
    );
  }
  const pat = k.pat(v.dark ? k.ink : k.paper, v.dark ? v.light : k.acc, Math.round(w), Math.round(h));
  return (
    <div style={A({ inset: 0, background: v.base, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover" })}>
      <div style={A({ left: m, right: m, top: "50%", transform: "translateY(-50%)", background: v.base, padding: `${w * .08}px ${w * .06}px`, textAlign: "center" })}>
        <Svg svg={k.logo(v.text)} style={{ position: "relative", height: w * .14 }} />
        <Caps v={v} size={w * .024} c={v.text} style={{ marginTop: w * .04 }}>{v.lema}</Caps>
      </div>
    </div>
  );
}

/** bandeiras: nome na vertical, símbolo na cor, lema empilhado */
function Bandeira({ v, w, h, n }: P) {
  const { k } = v; const kind = n % 3;
  if (kind === 1) return <div style={A({ inset: 0 })}><Bg c={k.acc} v={v} grain={false} /><Svg svg={k.mark(v.onAcc)} style={{ left: "16%", right: "16%", top: h * .3, height: w * .68 }} /></div>;
  if (kind === 2) return (
    <div style={A({ inset: 0 })}>
      <Bg c={v.base} v={v} />
      <div style={A({ left: w * .1, right: w * .1, top: h * .22 })}>
        {v.lema.split(/\s+/).length <= 3 ? v.lema.split(/\s+/).map((x, i, all) => <p key={i} style={k.T({ fontSize: w * .2, color: i === all.length - 1 ? (v.dark ? v.light : k.acc) : v.text, lineHeight: 1.1 })}>{x}</p>)
          : <Phrase v={v} text={v.lema} style={k.T({ fontSize: w * .15, color: v.text, lineHeight: 1.12 })} />}
        <div style={{ position: "relative", width: w * .14, height: w * .14, marginTop: w * .12 }}><SvgView svg={v.dot(v.dark ? v.light : k.acc)} className="w-full h-full" /></div>
      </div>
    </div>
  );
  return (
    <div style={A({ inset: 0, overflow: "hidden" })}>
      <Bg c={v.base} v={v} />
      <div style={A({ left: "50%", top: "50%", width: h * .7, height: w * .5, transform: "translate(-50%,-50%) rotate(-90deg)" })}><SvgView svg={k.logo(v.text)} className="w-full h-full" /></div>
    </div>
  );
}

/** camiseta: estampa pequena no peito, como uniforme da equipe */
function Camiseta({ v, w, h }: P) {
  const { k } = v; const bg = v.base; const fg = v.text;
  return (
    <div style={A({ inset: 0 })}>
      <Bg c={bg} v={v} grain={false} />
      <div style={A({ left: 0, right: 0, top: h * .3, display: "flex", flexDirection: "column", alignItems: "center" })}>
        <Svg svg={k.mark(v.dark ? v.light : k.acc)} style={{ position: "relative", width: w * .16, height: w * .16 }} />
        {v.dark ? <Caps v={v} size={w * .028} c={fg} style={{ marginTop: w * .04, letterSpacing: ".4em" }}>{v.lema}</Caps> : <Logo svg={k.logo(fg)} h={w * .06} style={{ position: "relative", marginTop: w * .04 }} />}
      </div>
    </div>
  );
}

/** nome na parede (letra-caixa): só o logo */
function Parede({ v, w, h }: P) {
  const { k } = v;
  return <div style={A({ inset: 0, background: "#ffffff", display: "grid", placeItems: "center" })}><div style={{ width: w * .7, height: h * .5 }}><SvgView svg={k.logo(k.ink)} className="w-full h-full" /></div></div>;
}

export const LAYOUTS: Record<string, { l: string; why: (v: Voice) => string; C: (p: P) => ReactNode }> = {
  timbrado: { l: "Carta", C: Timbrado, why: (v) => `Uma carta de verdade: texto em ${v.k.t.body}, a frase da marca em ${v.k.t.title} e o ${v.dark ? "símbolo" : "losango"} fechando a página.` },
  capa: { l: "Capa", C: Capa, why: (v) => `Capa de ${v.biz === "moda" ? "lookbook" : "proposta"} com a frase-mãe e o lema.` },
  cartao: { l: "Cartão frente", C: Cartao, why: (v) => (v.corners ? "Frente do cartão com os cantos de enquadramento do visor da câmera." : v.stitch ? "Frente do cartão como etiqueta, com o pesponto de losangos." : "Frente do cartão.") },
  cartao_verso: { l: "Cartão verso", C: CartaoVerso, why: () => "Verso na cor de destaque, com o símbolo grande sangrando." },
  envelope: { l: "Envelope", C: Envelope, why: () => "Envelope com o remetente e o detalhe da marca." },
  envelope_verso: { l: "Envelope verso", C: EnvelopeVerso, why: () => "O verso do envelope recebe o grafismo." },
  folheto: { l: "Folheto", C: Folheto, why: () => "Folheto com uma frase só, em tamanho de cartaz." },
  post: { l: "Post", C: Post, why: (v) => (v.dark ? "Post no sistema da marca: aspas, frase, lema e o asterisco no canto." : "Post com o pesponto em volta e a palavra-chave em destaque.") },
  story: { l: "Story", C: Story, why: () => "Story com a interface do Instagram e um botão de ação." },
  camera: { l: "Câmera gravando", C: Camera, why: () => "O celular gravando: feixe de luz menta, o símbolo em foco e a frase de bastidor." },
  loja: { l: "Loja no celular", C: Loja, why: () => "A loja no celular: peça com nome, a grade de tamanhos e o WhatsApp." },
  site: { l: "Site", C: Site, why: () => "Página inicial com a frase-mãe, a missão e os pilares." },
  caneca: { l: "Caneca", C: Caneca, why: (v) => `Cerâmica ${v.dark ? "escura" : "clara"}, como a base da marca, e uma impressão só na frente: o símbolo e o nome, do tamanho que uma caneca de verdade leva.` },
  sacola: { l: "Sacola", C: Sacola, why: () => "Sacola com o símbolo enorme sangrando pela lateral." },
  placa: { l: "Placa", C: Placa, why: () => "O símbolo sozinho como sinal do lugar." },
  outdoor: { l: "Outdoor", C: Outdoor, why: () => "Outdoor com uma frase e uma ideia." },
  cartaz: { l: "Cartaz", C: Cartaz, why: () => "Cartazes em três leituras: frase, símbolo e grafismo." },
  bandeira: { l: "Bandeira", C: Bandeira, why: () => "Bandeiras com o nome, o símbolo e o lema empilhado." },
  camiseta: { l: "Camiseta", C: Camiseta, why: () => "Estampa pequena no peito, como uniforme." },
  parede: { l: "Nome na parede", C: Parede, why: () => "O nome em letra-caixa na parede." },
};

/** qual peça vai em cada área, pelo tipo do mockup e pelo nome da camada no PSD */
export function autoLayout(m: { title: string; category: string; slots: { name: string; w: number; h: number }[] }, i: number, v: Voice): { kind: string; n: number } {
  const num = +(m.title.match(/(\d+)\s*$/)?.[1] || 1) - 1;
  const s = m.slots[i]; const name = (s?.name || "").toLowerCase(); const r = s ? s.w / s.h : 1;
  const same = m.slots.filter((x) => x.name === s?.name).length > 1;
  switch (m.category) {
    case "papelaria":
      if (/^a4/.test(name)) return { kind: name.endsWith("2") ? "capa" : "timbrado", n: 0 };
      if (/env/.test(name)) return { kind: name.includes("2") ? "envelope_verso" : "envelope", n: 0 };
      if (name === "dl") return { kind: "folheto", n: 0 };
      if (/square|quadr/.test(name)) return { kind: "post", n: 0 };
      if (/bc|cart/.test(name)) return { kind: name.endsWith("2") ? "cartao_verso" : "cartao", n: 0 };
      if (/mug|caneca/.test(name)) return { kind: "caneca", n: 0 };
      return { kind: r < 1 ? "timbrado" : "cartao", n: 0 };
    case "cartao": return { kind: num % 2 ? "cartao_verso" : "cartao", n: 0 };
    case "tela":
      if (r < .8) { const j = m.slots.length > 1 ? i % 3 : num % 2; return { kind: j === 1 ? (v.biz === "video" ? "camera" : v.biz === "moda" ? "loja" : "post") : j === 2 ? "post" : "story", n: 0 }; }
      return { kind: "site", n: 0 };
    case "caneca": return { kind: "caneca", n: 0 };
    case "sacola": return { kind: "sacola", n: num };
    case "fachada": return r < .6 ? { kind: "bandeira", n: i } : { kind: "placa", n: 0 };
    case "cartaz": return r > 2 ? { kind: "outdoor", n: 0 } : { kind: "cartaz", n: same || m.slots.length > 1 ? i : num };
    case "vestuario": return { kind: "camiseta", n: 0 };
    case "parede": return { kind: "parede", n: 0 };
  }
  return { kind: r > 2 ? "outdoor" : r < .8 ? "cartaz" : "post", n: i };
}

export function LayoutArt({ v, kind, w, h, n = 0 }: { v: Voice; kind: string; w: number; h: number; n?: number }) {
  const L = LAYOUTS[kind];
  if (!L) return null;
  return <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden" }}><L.C v={v} w={w} h={h} n={n} /></div>;
}
