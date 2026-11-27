"use client";
import type { CSSProperties, ReactNode } from "react";
import { ARCH_DEPTH, TONE_AXES, type Archetype } from "@/lib/brand-strategy";

/* Capítulos de plataforma, arquétipos e expressão verbal do manual, no padrão dos manuais de
   estúdio: declaração de posicionamento, valores vividos, cada arquétipo por dentro, manifesto,
   tom de voz em 4 eixos (Nielsen Norman), "somos, mas não somos", vocabulário, tom por situação,
   a marca em cada canal e reescritas (genérico x do jeito da marca).
   Os dados ficam em data.verbal (ver Verbal); o que faltar não vira página. */

export type Verbal = {
  posicionamento?: { publico?: string; necessidade?: string; categoria?: string; diferencial?: string; prova?: string };
  manifesto?: string;
  tom?: Record<string, number>;
  tom_porque?: Record<string, string>;
  somos?: { somos: string; nao: string }[];
  usamos?: string[];
  evitamos?: string[];
  trocas?: { em_vez: string; dizemos: string }[];
  situacoes?: { quando: string; tom: string; exemplo: string }[];
  canais?: { canal: string; como: string; exemplo: string }[];
  reescritas?: { generico: string; marca: string }[];
  valores?: { valor: string; vive: string; comunica: string; influencia: string }[];
  arquetipos?: Record<string, string>;
};

type X = { W: number; H: number; ink: string; paper: string; acc: string; name: string; T: (s?: CSSProperties) => CSSProperties; B: (s?: CSSProperties) => CSSProperties; G: (s?: CSSProperties) => CSSProperties; hasG: boolean };

const Label = ({ x, children, style }: { x: X; children: ReactNode; style?: CSSProperties }) => <p style={x.B({ fontSize: 13, letterSpacing: ".28em", textTransform: "uppercase", fontWeight: 600, ...style })}>{children}</p>;
const Rule = ({ c, style }: { c: string; style?: CSSProperties }) => <div style={{ height: 1, background: c, opacity: .35, ...style }} />;
const Pill = ({ x, children, solid = true, c }: { x: X; children: ReactNode; solid?: boolean; c?: string }) => (
  <span style={x.B({ display: "inline-block", padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", ...(solid ? { background: c || x.ink, color: x.paper } : { border: `1.5px solid ${c || x.ink}` }) })}>{children}</span>
);
const lum = (hex: string) => { const h = (hex || "#000").replace("#", ""); const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6); const c = [0, 2, 4].map((i) => { const v = parseInt(n.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
/** o acento quando dá para ler sobre o fundo claro; se não der (menta no papel), a tinta */
const accOn = (x: X, bg = x.paper) => (contrast(x.acc, bg) >= 2.6 ? x.acc : contrast(x.ink, bg) > contrast(x.paper, bg) ? x.ink : x.paper);
/** texto legível sobre uma cor */
const textOn = (x: X, bg: string) => (contrast(x.paper, bg) >= contrast(x.ink, bg) ? x.paper : x.ink);
const fit = (s: string, big: number, small: number, max = 120) => ((s || "").length > max ? small : big);

/** "Para X, que Y, a marca é Z que W, porque P." com as partes variáveis no acento */
export function PositioningSlide({ x, v, posicao }: { x: X; v: Verbal; posicao?: string }) {
  const p = v.posicionamento || {};
  const parts = [["Para quem", p.publico], ["Que precisa", p.necessidade], ["Somos", p.categoria], ["Que", p.diferencial], ["Porque", p.prova]].filter(([, t]) => t) as [string, string][];
  const hi = (s?: string) => <span style={{ color: accOn(x) }}>{s}</span>;
  const full = parts.length >= 4;
  const text = full ? <>Para {hi(p.publico)}{p.necessidade ? <>, que {hi(p.necessidade)}</> : null}, {x.name} é {hi(p.categoria)} que {hi(p.diferencial)}{p.prova ? <>, porque {hi(p.prova)}</> : null}.</> : posicao;
  const len = full ? [p.publico, p.necessidade, p.categoria, p.diferencial, p.prova].join(" ").length : (posicao || "").length;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Label x={x} style={{ opacity: .6 }}>Declaração de posicionamento</Label>
      <p style={x.T({ fontSize: len > 260 ? 44 : len > 180 ? 52 : 62, lineHeight: 1.08, marginTop: 28, maxWidth: 1300, textTransform: "none" })}>{text}</p>
      {full && <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: `repeat(${parts.length}, 1fr)`, borderTop: `1px solid ${x.ink}55` }}>
        {parts.map(([l, t], i) => <div key={l} style={{ padding: "18px 18px 0 0", paddingLeft: i ? 18 : 0, borderLeft: i ? `1px solid ${x.ink}25` : "none" }}>
          <Label x={x} style={{ fontSize: 11, color: accOn(x), marginBottom: 8 }}>{l}</Label><p style={x.B({ fontSize: 15, lineHeight: 1.4, opacity: .8 })}>{t}</p></div>)}
      </div>}
    </div>
  );
}

/** valores vividos: cada valor com como a marca vive, comunica e influencia */
export function ValuesSlide({ x, v }: { x: X; v: Verbal }) {
  const vs = (v.valores || []).slice(0, 5);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h2 style={x.T({ fontSize: 80, textTransform: "uppercase" })}>Valores</h2>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${vs.length}, 1fr)`, marginTop: 34, borderTop: `2px solid ${x.ink}` }}>
        {vs.map((c, i) => (
          <div key={c.valor} style={{ padding: "22px 22px 0 0", paddingLeft: i ? 22 : 0, borderLeft: i ? `1px solid ${x.ink}25` : "none", display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={x.T({ fontSize: vs.length > 3 ? 40 : 64, color: accOn(x) })}>{String(i + 1).padStart(2, "0")}</span>
            <p style={x.T({ fontSize: vs.length > 4 ? 30 : vs.length > 3 ? 38 : 48, textTransform: "uppercase", lineHeight: 1 })}>{c.valor}</p>
            {[["Como vive", c.vive], ["Como comunica", c.comunica], ["Como influencia", c.influencia]].filter(([, t]) => t).map(([l, t]) => (
              <div key={l}><Label x={x} style={{ fontSize: 11, opacity: .55, marginBottom: 6 }}>{l}</Label><p style={x.B({ fontSize: vs.length > 4 ? 13.5 : vs.length > 3 ? 15.5 : 18, lineHeight: 1.45 })}>{t}</p></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** um arquétipo por dentro: o que deseja, teme, como age, o dom, a armadilha e como aparece nesta marca */
export function ArchetypeSlide({ x, a, pct, role, pratica, n }: { x: X; a: Archetype; pct: number; role: string; pratica?: string; n: number }) {
  const dp = ARCH_DEPTH[a.k];
  const cell = (l: string, t?: string) => t ? (
    <div style={{ borderTop: `1px solid ${x.ink}30`, paddingTop: 12 }}>
      <Label x={x} style={{ fontSize: 11, opacity: .55, marginBottom: 6 }}>{l}</Label>
      <p style={x.B({ fontSize: 16, lineHeight: 1.45 })}>{t}</p>
    </div>
  ) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 64, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Pill x={x}>{role}</Pill><span style={x.T({ fontSize: 34 })}>{pct}%</span></div>
        <p style={x.T({ fontSize: a.l.length > 10 ? 84 : 112, textTransform: "uppercase", marginTop: 26, lineHeight: .9 })}>{a.l}</p>
        {dp && <p style={x.hasG ? x.G({ fontSize: 44, color: accOn(x), marginTop: 18 }) : x.T({ fontSize: 30, fontStyle: "italic", fontWeight: 400, color: accOn(x), marginTop: 18 })}>“{dp.lema}”</p>}
        <p style={x.B({ fontSize: 18, lineHeight: 1.5, marginTop: "auto", opacity: .8 })}>{a.narrativa}</p>
        <p style={x.B({ fontSize: 13, marginTop: 14, opacity: .55 })}>Marcas que vivem esse arquétipo: {a.marcas}</p>
        <span style={x.T({ fontSize: 14, opacity: .4, marginTop: 6 })}>{String(n).padStart(2, "0")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 32px", alignContent: "start" }}>
        {cell("Deseja", dp?.desejo)}{cell("Teme", dp?.medo)}
        {cell("Como age", dp?.estrategia)}{cell("O dom", dp?.talento)}
        {cell("No verbal", `${a.verbal} Palavras: ${a.palavras.join(", ")}.`)}{cell("No visual", `${a.forma} ${a.foto}`)}
        {cell("Armadilha a evitar", dp?.armadilha)}{cell("Nunca", a.nunca)}
        {pratica && <div style={{ gridColumn: "1 / -1", background: x.ink, color: x.paper, padding: "20px 24px", marginTop: 6 }}>
          <Label x={x} style={{ fontSize: 11, color: accOn(x, x.ink), marginBottom: 8 }}>Na {x.name}</Label>
          <p style={x.B({ fontSize: 17, lineHeight: 1.5 })}>{pratica}</p>
        </div>}
      </div>
    </div>
  );
}

/** manifesto em página inteira, como texto de revista */
export function ManifestoSlide({ x, text }: { x: X; text: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const total = text.length;
  const size = total > 900 ? 22 : total > 650 ? 26 : total > 420 ? 30 : 36;
  const cols = total > 650 ? 2 : 1;
  const last = paras.length > 1 ? paras.pop()! : "";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.7fr 2fr", gap: 64, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <h2 style={x.T({ fontSize: 96, textTransform: "uppercase" })}>Mani&shy;festo</h2>
        <span style={x.T({ fontSize: 200, color: accOn(x, x.ink), lineHeight: .7 })}>“</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ columnCount: cols, columnGap: 56 }}>
          {paras.map((p, i) => <p key={i} style={x.T({ fontSize: size, lineHeight: 1.22, fontWeight: 400, letterSpacing: 0, whiteSpace: "pre-line", marginBottom: size * .9, breakInside: "avoid" })}>{p}</p>)}
        </div>
        {last && <p style={x.T({ fontSize: size * 1.25, lineHeight: 1.1, color: accOn(x, x.ink), whiteSpace: "pre-line", marginTop: 8 })}>{last}</p>}
      </div>
    </div>
  );
}

/** tom de voz em 4 eixos: a voz é uma só, o tom muda com a situação */
export function ToneSlide({ x, v, matriz }: { x: X; v: Verbal; matriz?: string }) {
  const tom = v.tom || {};
  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.6fr", gap: 72, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <h2 style={x.T({ fontSize: 88, textTransform: "uppercase" })}>Tom de voz</h2>
        <p style={x.B({ fontSize: 19, lineHeight: 1.5, marginTop: 24, opacity: .8 })}>A voz da {x.name} é uma só. O tom ajusta com o momento, como uma pessoa que fala diferente num velório e numa festa, sem deixar de ser ela.</p>
        {matriz && <div style={{ marginTop: "auto" }}><Label x={x} style={{ fontSize: 11, color: accOn(x), marginBottom: 8 }}>A mistura</Label><p style={x.B({ fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-line" })}>{matriz}</p></div>}
      </div>
      <div style={{ display: "grid", gap: 26, alignContent: "center" }}>
        {TONE_AXES.map(([k, a, z]) => { const val = tom[k] ?? 50; return (
          <div key={k}>
            <div style={x.B({ display: "flex", justifyContent: "space-between", fontSize: 20, marginBottom: 12 })}>
              <span style={{ fontWeight: val < 50 ? 700 : 400, opacity: val < 50 ? 1 : .45 }}>{a}</span>
              <span style={{ fontWeight: val > 50 ? 700 : 400, opacity: val > 50 ? 1 : .45 }}>{z}</span>
            </div>
            <div style={{ position: "relative", height: 2, background: `${x.ink}30` }}>
              <div style={{ position: "absolute", left: 0, top: -1, height: 4, width: `${val}%`, background: x.ink }} />
              <span style={{ position: "absolute", top: -10, left: `calc(${val}% - 11px)`, width: 22, height: 22, borderRadius: 99, background: x.acc, border: `3px solid ${x.paper}`, boxShadow: `0 0 0 1px ${x.ink}` }} />
            </div>
            {v.tom_porque?.[k] && <p style={x.B({ fontSize: 14.5, lineHeight: 1.45, marginTop: 12, opacity: .7 })}>{v.tom_porque[k]}</p>}
          </div>
        ); })}
      </div>
    </div>
  );
}

/** somos X, mas não Y: o traço e o exagero dele */
export function WeAreSlide({ x, v }: { x: X; v: Verbal }) {
  const rows = (v.somos || []).slice(0, 5);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `2px solid ${x.ink}`, paddingBottom: 14 }}>
        <div><Pill x={x}>Somos</Pill></div><div><Pill x={x} solid={false}>Mas não somos</Pill></div>
      </div>
      {rows.map((r) => (
        <div key={r.somos} style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", borderBottom: `1px solid ${x.ink}25` }}>
          <p style={x.T({ fontSize: rows.length > 4 ? 44 : 54, textTransform: "uppercase" })}>{r.somos}</p>
          <p style={x.B({ fontSize: 24, opacity: .55 })}>{r.nao}</p>
        </div>
      ))}
    </div>
  );
}

/** vocabulário: o que usamos, o que evitamos e as trocas */
export function VocabSlide({ x, v }: { x: X; v: Verbal }) {
  const tr = (v.trocas || []).slice(0, 6);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 48, height: "100%", borderTop: `2px solid ${x.ink}`, paddingTop: 26 }}>
      <div><Pill x={x}>Usamos</Pill>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>{(v.usamos || []).slice(0, 16).map((w) => <span key={w} style={x.T({ fontSize: 30, lineHeight: 1.15, marginRight: 14 })}>{w}</span>)}</div>
      </div>
      <div style={{ borderLeft: `1px solid ${x.ink}25`, paddingLeft: 40 }}><Pill x={x} solid={false}>Evitamos</Pill>
        <div style={{ display: "grid", gap: 10, marginTop: 26 }}>{(v.evitamos || []).slice(0, 10).map((w) => <span key={w} style={x.B({ fontSize: 20, textDecoration: "line-through", opacity: .5 })}>{w}</span>)}</div>
      </div>
      <div style={{ borderLeft: `1px solid ${x.ink}25`, paddingLeft: 40 }}><Pill x={x}>Em vez de… dizemos</Pill>
        <div style={{ display: "grid", gap: 0, marginTop: 20 }}>{tr.map((t) => (
          <div key={t.em_vez} style={{ padding: "12px 0", borderBottom: `1px solid ${x.ink}20` }}>
            <p style={x.B({ fontSize: 15, opacity: .5, textDecoration: "line-through" })}>{t.em_vez}</p>
            <p style={x.B({ fontSize: 19, fontWeight: 600, marginTop: 4 })}>{t.dizemos}</p>
          </div>))}</div>
      </div>
    </div>
  );
}

/** o tom muda com o momento */
export function SituationsSlide({ x, v }: { x: X; v: Verbal }) {
  const rows = (v.situacoes || []).slice(0, 5);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 1.8fr", borderBottom: `2px solid ${x.ink}`, paddingBottom: 12 }}>
        <Label x={x} style={{ fontSize: 12 }}>Quando</Label><Label x={x} style={{ fontSize: 12 }}>O tom</Label><Label x={x} style={{ fontSize: 12 }}>Como soa</Label>
      </div>
      {rows.map((r) => (
        <div key={r.quando} style={{ flex: 1, display: "grid", gridTemplateColumns: "0.8fr 1fr 1.8fr", alignItems: "center", borderBottom: `1px solid ${x.ink}25`, gap: 24 }}>
          <p style={x.T({ fontSize: 30, textTransform: "uppercase" })}>{r.quando}</p>
          <p style={x.B({ fontSize: 16, lineHeight: 1.45, opacity: .75 })}>{r.tom}</p>
          <p style={x.T({ fontSize: fit(r.exemplo, 26, 21), lineHeight: 1.2, fontWeight: 400, letterSpacing: 0 })}>“{r.exemplo}”</p>
        </div>
      ))}
    </div>
  );
}

/** a marca em cada canal, com um exemplo real de texto */
export function ChannelsSlide({ x, v }: { x: X; v: Verbal }) {
  const cs = (v.canais || []).slice(0, 4);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cs.length}, 1fr)`, gap: 0, height: "100%", borderTop: `2px solid ${x.ink}` }}>
      {cs.map((c, i) => (
        <div key={c.canal} style={{ padding: "24px 26px 0 0", paddingLeft: i ? 26 : 0, borderLeft: i ? `1px solid ${x.ink}25` : "none", display: "flex", flexDirection: "column" }}>
          <p style={x.T({ fontSize: 40, textTransform: "uppercase" })}>{c.canal}</p>
          <p style={x.B({ fontSize: 16, lineHeight: 1.5, marginTop: 14, opacity: .75, minHeight: 96 })}>{c.como}</p>
          <div style={{ marginTop: 30, background: i % 2 ? x.acc : x.ink, color: textOn(x, i % 2 ? x.acc : x.ink), padding: "24px 24px", borderRadius: 2 }}>
            <Label x={x} style={{ fontSize: 10, opacity: .7, marginBottom: 12 }}>Exemplo</Label>
            <p style={x.T({ fontSize: fit(c.exemplo, 24, 20, 150), lineHeight: 1.3, fontWeight: 400, letterSpacing: 0, whiteSpace: "pre-line" })}>{c.exemplo}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** reescrita: o texto genérico e o mesmo texto do jeito da marca */
export function RewriteSlide({ x, v }: { x: X; v: Verbal }) {
  const rs = (v.reescritas || []).slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 48, borderBottom: `2px solid ${x.ink}`, paddingBottom: 12 }}>
        <div><Pill x={x} solid={false}>Qualquer marca diria</Pill></div><div><Pill x={x}>Do jeito {x.name}</Pill></div>
      </div>
      {rs.map((r) => (
        <div key={r.generico} style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 48, alignItems: "center", borderBottom: `1px solid ${x.ink}25` }}>
          <p style={x.B({ fontSize: 18, lineHeight: 1.45, opacity: .45 })}>{r.generico}</p>
          <p style={x.T({ fontSize: fit(r.marca, 30, 24, 110), lineHeight: 1.15, fontWeight: 400, letterSpacing: 0 })}>{r.marca}</p>
        </div>
      ))}
    </div>
  );
}
