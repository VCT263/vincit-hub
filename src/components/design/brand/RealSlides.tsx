"use client";
import type { CSSProperties, ReactNode } from "react";
import type { Archetype } from "@/lib/brand-strategy";
import { useLite, useSmall } from "./lazy";

/* Páginas feitas com o material real da marca: a expressão dos arquétipos escrita para ela
   (data.verbal.expressao), o plano de grid do Instagram com fotos de verdade (data.feed),
   as aplicações que a marca já usa (data.aplicacoes_reais) e o moodboard de fotografia
   (data.foto_moodboard). O que não existir não vira página. */

export type Expressao = { narrativa?: string; verbal?: string; visual?: string; fotografia?: string; atracao?: string };
export type FeedPost = { id: string; tipo?: string; img?: string; titulo?: string; legenda?: string; por_que?: string };
export type Feed = { regra?: string; posts?: FeedPost[] };
export type AppReal = { id: string; nome: string; img?: string; onde?: string; colecao?: string; nota?: string };
export type FotoMood = { direcao?: string; luz?: string; cor?: string; enquadramento?: string; casting?: string; faca?: string[]; evite?: string[]; imgs?: { id: string; url: string; legenda?: string; fonte?: string }[] };

type X = { W: number; H: number; ink: string; paper: string; acc: string; name: string; T: (s?: CSSProperties) => CSSProperties; B: (s?: CSSProperties) => CSSProperties; G: (s?: CSSProperties) => CSSProperties; hasG: boolean };

const Label = ({ x, children, style }: { x: X; children: ReactNode; style?: CSSProperties }) => <p style={x.B({ fontSize: 13, letterSpacing: ".28em", textTransform: "uppercase", fontWeight: 600, ...style })}>{children}</p>;
const Tag = ({ x, children, dark }: { x: X; children: ReactNode; dark?: boolean }) => (
  <span style={x.B({ display: "inline-block", padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", background: dark ? "rgba(0,0,0,.55)" : x.ink, color: "#fff", backdropFilter: "blur(4px)" })}>{children}</span>
);

/** foto real, reduzida no celular para não estourar a memória do Safari */
export function Pic({ url, style, children }: { url?: string; style?: CSSProperties; children?: ReactNode }) {
  const lite = useLite();
  const src = useSmall(url || "", url && lite ? 800 : 0);
  return <div style={{ position: "relative", overflow: "hidden", background: src ? `#111 url("${src}") center/cover no-repeat` : "#00000014", ...style }}>{children}</div>;
}

const TIPOS: Record<string, string> = { foto: "Foto", provador: "Provador", detalhe: "Detalhe", cliente: "Cliente", arte: "Arte", reels: "Reels", carrossel: "Carrossel" };
const tipo = (t?: string) => TIPOS[t || ""] || t || "Post";

/** Narrativa, verbal, visual, fotografia e atração escritos para a marca, com o arquétipo como apoio */
export function ExpressionSlide({ x, ex, mix }: { x: X; ex: Expressao; mix: { a: Archetype; pct: number }[] }) {
  const rows: [string, string | undefined, (a: Archetype) => string][] = [
    ["Narrativa", ex.narrativa, (a) => a.narrativa],
    ["Verbal", ex.verbal, (a) => a.verbal],
    ["Visual", ex.visual, (a) => `${a.forma} ${a.visual}.`],
    ["Fotografia", ex.fotografia, (a) => a.foto],
    ["Atração", ex.atracao, (a) => a.atracao],
  ];
  const shown = rows.filter(([, t]) => t);
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: `auto repeat(${shown.length}, 1fr)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", paddingBottom: 18, borderBottom: `2px solid ${x.ink}` }}>
        <h2 style={x.T({ fontSize: 64, textTransform: "uppercase", lineHeight: .95 })}>Como a {x.name} se expressa</h2>
        <p style={x.B({ fontSize: 13, opacity: .6, textAlign: "right" })}>{mix.map((m) => `${m.a.l} ${m.pct}%`).join(" · ")}</p>
      </div>
      {shown.map(([l, t, g]) => (
        <div key={l} style={{ display: "grid", gridTemplateColumns: "220px 1fr 300px", gap: 32, alignItems: "center", borderBottom: `1px solid ${x.ink}30` }}>
          <p style={x.T({ fontSize: 30, textTransform: "uppercase" })}>{l}</p>
          <p style={x.B({ fontSize: (t || "").length > 200 ? 17 : 20, lineHeight: 1.45 })}>{t}</p>
          <p style={x.B({ fontSize: 12, lineHeight: 1.45, opacity: .5, borderLeft: `1px solid ${x.ink}30`, paddingLeft: 16 })}>Do arquétipo: {mix.slice(0, 2).map((m) => g(m.a)).join(" ")}</p>
        </div>
      ))}
    </div>
  );
}

/** o grid de 9 como aparece no perfil, com o ritmo explicado ao lado */
export function FeedGridSlide({ x, feed }: { x: X; feed: Feed }) {
  const posts = (feed.posts || []).slice(0, 9);
  const counts = posts.reduce<Record<string, number>>((m, p) => { const k = tipo(p.tipo); m[k] = (m[k] || 0) + 1; return m; }, {});
  const side = x.H - 112;
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `${side + 112}px 1fr`, background: x.paper, color: x.ink }}>
      <div style={{ padding: 56 }}>
        <div style={{ width: side, height: side, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 4 }}>
          {posts.map((p, i) => (
            <Pic key={p.id || i} url={p.img} style={p.img ? undefined : { background: x.acc }}>
              {!p.img && <p style={x.T({ position: "absolute", inset: 16, fontSize: 22, color: "#fff", display: "flex", alignItems: "center" })}>{p.titulo}</p>}
              <div style={{ position: "absolute", left: 8, top: 8 }}><Tag x={x} dark>{tipo(p.tipo)}</Tag></div>
            </Pic>
          ))}
        </div>
      </div>
      <div style={{ padding: "56px 56px 56px 8px", display: "flex", flexDirection: "column" }}>
        <Label x={x} style={{ opacity: .6 }}>Instagram · grid</Label>
        <h2 style={x.T({ fontSize: 72, textTransform: "uppercase", marginTop: 14, lineHeight: .95 })}>Feed vivo</h2>
        {feed.regra && <p style={x.B({ fontSize: 19, lineHeight: 1.5, marginTop: 22 })}>{feed.regra}</p>}
        <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
          {Object.entries(counts).map(([k, n]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${x.ink}30`, paddingTop: 10 }}>
              <span style={x.T({ fontSize: 30, width: 44 })}>{n}</span><span style={x.B({ fontSize: 15, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 })}>{k}</span>
              <div style={{ flex: 1, height: 6, background: `${x.ink}14` }}><div style={{ width: `${(n / posts.length) * 100}%`, height: "100%", background: x.ink }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** cada post do grid: o que é, a legenda e por que ele está ali */
export function FeedWhySlide({ x, feed }: { x: X; feed: Feed }) {
  const posts = (feed.posts || []).slice(0, 9);
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: "14px 28px" }}>
      {posts.map((p, i) => (
        <div key={p.id || i} style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 14, borderTop: `1px solid ${x.ink}30`, paddingTop: 12, minHeight: 0 }}>
          <Pic url={p.img} style={p.img ? { height: 120 } : { height: 120, background: x.acc }} />
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <Label x={x} style={{ fontSize: 10, opacity: .55 }}>{String(i + 1).padStart(2, "0")} · {tipo(p.tipo)}</Label>
            {p.titulo && <p style={x.T({ fontSize: 17, marginTop: 4, lineHeight: 1.1 })}>{p.titulo}</p>}
            {p.legenda && <p style={x.B({ fontSize: 12.5, lineHeight: 1.4, marginTop: 5, fontStyle: "italic", opacity: .85 })}>“{p.legenda}”</p>}
            {p.por_que && <p style={x.B({ fontSize: 12, lineHeight: 1.4, marginTop: 5, opacity: .6 })}>{p.por_que}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** aplicações que a marca já usa, em grade; uma coleção ganha página própria com a peça principal grande */
export function RealAppsSlide({ x, items, title, sub }: { x: X; items: AppReal[]; title: string; sub?: string }) {
  const [hero, ...rest] = items;
  const many = items.length > 3;
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: many ? "1.15fr 1fr" : "1.4fr 1fr", background: "#0d0d0d", color: "#f4f1ea" }}>
      <Pic url={hero?.img}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "80px 40px 32px", background: "linear-gradient(transparent, rgba(0,0,0,.75))" }}>
          <Label x={x} style={{ fontSize: 11, opacity: .7 }}>{[hero?.onde, hero?.colecao].filter(Boolean).join(" · ")}</Label>
          <p style={x.T({ fontSize: 34, marginTop: 6, color: "#fff" })}>{hero?.nome}</p>
          {hero?.nota && <p style={x.B({ fontSize: 15, marginTop: 8, lineHeight: 1.45, opacity: .85, maxWidth: 560 })}>{hero.nota}</p>}
        </div>
      </Pic>
      <div style={{ padding: 48, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Label x={x} style={{ opacity: .6 }}>{sub || "Aplicações reais"}</Label>
        <h2 style={x.T({ fontSize: title.length > 18 ? 48 : 64, textTransform: "uppercase", marginTop: 12, lineHeight: .95, color: "#fff" })}>{title}</h2>
        <div style={{ marginTop: 28, flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: rest.length > 2 ? "1fr 1fr" : "1fr", gridAutoRows: "1fr", gap: 14 }}>
          {rest.slice(0, 4).map((a) => (
            <div key={a.id} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <Pic url={a.img} style={{ flex: 1, minHeight: 0 }} />
              <p style={x.B({ fontSize: 13, fontWeight: 600, marginTop: 8 })}>{a.nome}</p>
              {a.nota && <p style={x.B({ fontSize: 11.5, opacity: .6, lineHeight: 1.35, marginTop: 2 })}>{a.nota}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** moodboard de fotografia: colagem das imagens com a direção em uma frase */
export function PhotoMoodSlide({ x, m }: { x: X; m: FotoMood }) {
  const imgs = (m.imgs || []).slice(0, 9);
  const areas = ["1 / 1 / 3 / 3", "1 / 3 / 2 / 4", "2 / 3 / 3 / 4", "1 / 4 / 3 / 5", "3 / 1 / 4 / 2", "3 / 2 / 4 / 3", "3 / 3 / 4 / 4", "3 / 4 / 4 / 5", "1 / 5 / 4 / 6"];
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "340px 1fr", background: x.paper, color: x.ink }}>
      <div style={{ padding: "56px 0 56px 56px", display: "flex", flexDirection: "column" }}>
        <Label x={x} style={{ opacity: .6 }}>Fotografia · moodboard</Label>
        <h2 style={x.T({ fontSize: 64, textTransform: "uppercase", marginTop: 14, lineHeight: .95 })}>O olhar da {x.name}</h2>
        {m.direcao && <p style={x.B({ fontSize: 16.5, lineHeight: 1.55, marginTop: "auto" })}>{m.direcao}</p>}
      </div>
      <div style={{ padding: 40, display: "grid", gridTemplateColumns: `repeat(${imgs.length > 8 ? 5 : 4}, 1fr)`, gridTemplateRows: "repeat(3, 1fr)", gap: 8 }}>
        {imgs.map((im, i) => <Pic key={im.id || i} url={im.url} style={imgs.length > 8 ? { gridArea: areas[i] } : i === 0 ? { gridRow: "span 2", gridColumn: "span 2" } : undefined} />)}
      </div>
    </div>
  );
}

/** regras de fotografia: luz, cor, enquadramento, casting, faça e evite */
export function PhotoRulesSlide({ x, m }: { x: X; m: FotoMood }) {
  const cells = ([["Luz", m.luz], ["Cor", m.cor], ["Enquadramento", m.enquadramento], ["Quem aparece", m.casting]] as const).filter(([, v]) => v);
  const thumbs = (m.imgs || []).slice(0, 4);
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 style={x.T({ fontSize: 64, textTransform: "uppercase", lineHeight: .95 })}>Como fotografar</h2>
        {cells.map(([l, v]) => <div key={l} style={{ borderTop: `1px solid ${x.ink}30`, paddingTop: 12 }}><Label x={x} style={{ fontSize: 11, opacity: .55, marginBottom: 6 }}>{l}</Label><p style={x.B({ fontSize: 17, lineHeight: 1.45 })}>{v}</p></div>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>
        {thumbs.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${thumbs.length}, 1fr)`, gap: 8, height: 180 }}>{thumbs.map((t, i) => <Pic key={t.id || i} url={t.url} />)}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, flex: 1 }}>
          {([["Faça", m.faca, "✓"], ["Evite", m.evite, "✕"]] as const).map(([l, list, s]) => (
            <div key={l}>
              <Label x={x} style={{ borderBottom: `2px solid ${x.ink}`, paddingBottom: 8 }}>{l}</Label>
              {(list || []).map((t) => <p key={t} style={x.B({ fontSize: 15, lineHeight: 1.45, padding: "10px 0", borderBottom: `1px solid ${x.ink}20`, display: "flex", gap: 10 })}><span style={{ opacity: .5 }}>{s}</span>{t}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- feed ideal: o que existe, o que fazer e como fica ---------- */

export type FeedIdeal = {
  diagnostico?: string; regra?: string;
  manter?: string[]; melhorar?: { o_que: string; como: string }[]; fazer?: string[];
  posts?: (FeedPost & { base?: string; ref?: string })[];
  referencias?: { id: string; url: string; marca?: string; o_que_pegar?: string }[];
};

/** um post do feed ideal: a foto quando existe; sem foto, uma representação desenhada pelo tipo */
export function IdealPost({ x, p, small }: { x: X; p: FeedPost; small?: boolean }) {
  const f = small ? .6 : 1;
  const t = p.tipo || "";
  if (p.img) return <Pic url={p.img}><div style={{ position: "absolute", left: 8, top: 8 }}><Tag x={x} dark>{tipo(t)}</Tag></div></Pic>;
  const head = (bg: string, fg: string, inner: ReactNode) => (
    <div style={{ position: "relative", overflow: "hidden", background: bg, color: fg, boxShadow: `inset 0 0 0 1px ${x.ink}22`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14 * f }}>
      <div><Tag x={x} dark>{tipo(t)}</Tag></div>{inner}
    </div>
  );
  if (t === "arte") return head(x.acc, "#fff", <p style={x.T({ fontSize: 26 * f, lineHeight: 1.05 })}>{p.titulo}</p>);
  if (t === "reels") return head(x.ink, x.paper, <>
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: .35 }}><div style={{ width: 56 * f, height: 56 * f, borderRadius: 99, border: `2px solid ${x.paper}`, display: "grid", placeItems: "center", fontSize: 20 * f }}>▶</div></div>
    <p style={x.B({ fontSize: 15 * f, lineHeight: 1.25, fontWeight: 700, position: "relative" })}>{p.titulo}</p>
  </>);
  if (t === "carrossel") return head(x.paper, x.ink, <>
    <p style={x.T({ fontSize: 24 * f, lineHeight: 1.05 })}>{p.titulo}</p>
    <div style={{ display: "flex", gap: 4 }}>{[0, 1, 2, 3, 4].map((n) => <span key={n} style={{ width: 6 * f, height: 6 * f, borderRadius: 9, background: x.ink, opacity: n ? .25 : 1 }} />)}</div>
  </>);
  return head(`repeating-linear-gradient(135deg, ${x.ink}10 0 10px, ${x.ink}1c 10px 20px)`, x.ink, <p style={x.B({ fontSize: 13 * f, lineHeight: 1.35 })}><span style={{ opacity: .55 }}>Foto: </span>{p.titulo}</p>);
}

const Grid9 = ({ x, posts, size, ideal }: { x: X; posts: FeedPost[]; size: number; ideal?: boolean }) => (
  <div style={{ width: size, height: size * 4 / 3, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 3 }}>
    {posts.slice(0, 9).map((p, i) => ideal ? <IdealPost key={p.id || i} x={x} p={p} small /> : <Pic key={p.id || i} url={p.img}><div style={{ position: "absolute", left: 6, top: 6 }}><Tag x={x} dark>{tipo(p.tipo)}</Tag></div></Pic>)}
  </div>
);

/** o feed de hoje ao lado do feed ideal */
export function FeedCompareSlide({ x, atual, ideal }: { x: X; atual: Feed; ideal: FeedIdeal }) {
  const size = (x.H - 150) * 3 / 4;
  return (
    <div style={{ position: "absolute", inset: 0, background: x.paper, color: x.ink, display: "grid", gridTemplateColumns: `${size}px 1fr ${size}px`, gap: 44, padding: "52px 56px" }}>
      <div><Label x={x} style={{ opacity: .55, marginBottom: 12 }}>Hoje</Label><Grid9 x={x} posts={atual.posts || []} size={size} /></div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
        <Label x={x} style={{ opacity: .6 }}>Instagram · feed ideal</Label>
        <h2 style={x.T({ fontSize: 58, textTransform: "uppercase", lineHeight: .95 })}>Do que existe ao ideal</h2>
        {ideal.diagnostico && <p style={x.B({ fontSize: 16, lineHeight: 1.55 })}>{ideal.diagnostico}</p>}
        {ideal.regra && <p style={x.B({ fontSize: 15, lineHeight: 1.5, borderTop: `2px solid ${x.ink}`, paddingTop: 12, fontWeight: 600 })}>{ideal.regra}</p>}
        <p style={x.T({ fontSize: 46, textAlign: "right", opacity: .3 })}>→</p>
      </div>
      <div><Label x={x} style={{ opacity: .55, marginBottom: 12, color: x.acc }}>Ideal</Label><Grid9 x={x} posts={ideal.posts || []} size={size} ideal /></div>
    </div>
  );
}

/** manter, melhorar e fazer */
export function FeedPlanSlide({ x, ideal }: { x: X; ideal: FeedIdeal }) {
  const col = (l: string, mark: string, items: ReactNode[]) => (
    <div style={{ minWidth: 0 }}>
      <Label x={x} style={{ borderBottom: `2px solid ${x.ink}`, paddingBottom: 10 }}>{l}</Label>
      {items.map((it, i) => <div key={i} style={x.B({ fontSize: 15, lineHeight: 1.45, padding: "12px 0", borderBottom: `1px solid ${x.ink}20`, display: "flex", gap: 10 })}><span style={{ opacity: .5, flex: "none" }}>{mark}</span><div>{it}</div></div>)}
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 26 }}>
      <h2 style={x.T({ fontSize: 60, textTransform: "uppercase", lineHeight: .95 })}>O plano do feed</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr", gap: 40, flex: 1, minHeight: 0 }}>
        {col("Manter", "✓", (ideal.manter || []).map((t) => t))}
        {col("Melhorar", "↗", (ideal.melhorar || []).map((m) => <><b style={{ fontWeight: 700 }}>{m.o_que}</b><br /><span style={{ opacity: .75 }}>{m.como}</span></>))}
        {col("Começar a fazer", "+", (ideal.fazer || []).map((t) => t))}
      </div>
    </div>
  );
}

/** cada post do ideal, com legenda, porquê e de onde ele vem */
export function FeedIdealWhySlide({ x, ideal, atual }: { x: X; ideal: FeedIdeal; atual: Feed }) {
  const posts = (ideal.posts || []).slice(0, 9);
  const byId = new Map((atual.posts || []).map((p) => [p.id, p]));
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: "14px 28px" }}>
      {posts.map((p, i) => { const base = p.base ? byId.get(p.base) : undefined; return (
        <div key={p.id || i} style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 14, borderTop: `1px solid ${x.ink}30`, paddingTop: 12, minHeight: 0 }}>
          <div style={{ display: "grid", height: 128 }}><IdealPost x={x} p={p} small /></div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <Label x={x} style={{ fontSize: 10, opacity: .55 }}>{String(i + 1).padStart(2, "0")} · {tipo(p.tipo)}{base ? " · melhora um post atual" : " · novo"}</Label>
            {p.titulo && <p style={x.T({ fontSize: 16, marginTop: 4, lineHeight: 1.1 })}>{p.titulo}</p>}
            {p.legenda && <p style={x.B({ fontSize: 12, lineHeight: 1.4, marginTop: 5, fontStyle: "italic", opacity: .85 })}>“{p.legenda}”</p>}
            {p.por_que && <p style={x.B({ fontSize: 11.5, lineHeight: 1.4, marginTop: 5, opacity: .6 })}>{p.por_que}</p>}
          </div>
        </div>
      ); })}
    </div>
  );
}

/** referências de outras marcas: o que pegar de cada uma */
export function FeedRefsSlide({ x, ideal }: { x: X; ideal: FeedIdeal }) {
  const refs = (ideal.referencias || []).filter((r) => r.url).slice(0, 6);
  return (
    <div style={{ position: "absolute", inset: 0, background: x.paper, color: x.ink, padding: "52px 56px", display: "grid", gridTemplateRows: "auto 1fr", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <h2 style={x.T({ fontSize: 58, textTransform: "uppercase", lineHeight: .95 })}>Referências</h2>
        <Label x={x} style={{ opacity: .55 }}>Instagram · o que pegar de cada uma</Label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(3, refs.length)}, 1fr)`, gap: 16, minHeight: 0 }}>
        {refs.map((r) => (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Pic url={r.url} style={{ flex: 1, minHeight: 0 }} />
            {r.marca && <p style={x.T({ fontSize: 20, marginTop: 10 })}>{r.marca}</p>}
            {r.o_que_pegar && <p style={x.B({ fontSize: 13, lineHeight: 1.4, marginTop: 4, opacity: .75 })}>{r.o_que_pegar}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
