"use client";
import type { CSSProperties, ReactNode } from "react";
import { lockupSvg, patternSvg, primaryLogo, readableOn, svgUrl, type Pattern } from "@/lib/design";
import { SvgView } from "../ui";
import { grainBg, warmGrain } from "./grain";

/* Aplicações em objetos reais, montadas só com CSS (perspectiva, luz e sombra) a partir do próprio sistema
   da marca: nada de imagem paga nem API. Cada cena é desenhada em W×H e serve tanto para a etapa
   Aplicações quanto para as páginas do manual. O cartão e o símbolo em 3D giram na tela e ficam parados no PDF. */

export type Foto = { id: string; url: string; pos?: "centro" | "te" | "td" | "be" | "bd"; tam?: number; cor?: "claro" | "escuro" | "primaria"; impresso?: boolean; rot?: number; legenda?: string };

export const SCENES = [
  { k: "papelaria", l: "Papelaria", d: "Papel timbrado, envelope e cartões sobre a mesa" },
  { k: "cartao3d", l: "Cartão em 3D", d: "Frente e verso girando (animado)" },
  { k: "logo3d", l: "Símbolo em 3D", d: "O símbolo com volume, girando (animado)" },
  { k: "camiseta", l: "Camiseta", d: "Uniforme e merch" },
  { k: "sacola", l: "Sacola", d: "Embalagem de entrega e loja" },
  { k: "celular", l: "Perfil no celular", d: "Instagram com avatar, destaques e grade" },
  { k: "letreiro", l: "Letreiro iluminado", d: "Parede da sede, estúdio ou loja" },
  { k: "copo", l: "Copo e caneca", d: "Café, eventos e brinde" },
  { k: "cartaz", l: "Cartaz na rua", d: "Pôster lambe-lambe com o grafismo" },
] as const;
export type SceneKey = (typeof SCENES)[number]["k"];

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;
warmGrain(GRAIN);
const SHADOW = "0 1px 1px rgba(0,0,0,.14), 0 6px 12px rgba(0,0,0,.12), 0 24px 48px rgba(0,0,0,.2), 0 60px 90px rgba(0,0,0,.16)";
const SHEEN = "linear-gradient(125deg, rgba(255,255,255,.28), rgba(255,255,255,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,.08))";

/* mistura duas cores hex */
function mix(a: string, b: string, t: number) {
  const p = (h: string) => { const x = h.replace("#", ""); const n = parseInt(x.length === 3 ? x.split("").map((c) => c + c).join("") : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [A, B] = [p(a), p(b)];
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function sceneKit(d: any) {
  const C: Record<string, string> = { Primária: "#2d6a4f", Apoio: "#52796f", Destaque: "#e9c46a", Escuro: "#141414", Claro: "#f4f4f2", ...Object.fromEntries((d.palette || []).map((s: any) => [s.role, s.hex])) };
  const t = d.type || { title: "Bricolage Grotesque", body: "Inter", tw: 800 };
  const name = d.brief?.nome || "Marca";
  const hasSym = !!(d.symbol_id || d.logo_id);
  const mark = (c: string) => (hasSym ? lockupSvg("simbolo", d, c) : d.monogram ? lockupSvg("monograma", d, c) : primaryLogo(d, c));
  const logo = (c?: string) => primaryLogo(d, c);
  const pat = (bg: string, fg: string, w = 600, h = 600) => {
    const p: Pattern = { source: d.monogram && !hasSym ? "monograma" : "simbolo", scale: 120, gap: 60, rotate: 0, offset: true, opacity: 1, ...(d.pattern || {}), bg, fg };
    return hasSym || d.monogram ? svgUrl(patternSvg(d, p, w, h)) : "";
  };
  const on = (bg: string) => (readableOn(bg) === "#ffffff" ? (bg === C["Escuro"] ? C["Claro"] : "#ffffff") : C["Escuro"]);
  const T = (s: CSSProperties = {}): CSSProperties => ({ fontFamily: `"${t.title}"`, fontWeight: t.tw || 700, fontStyle: t.ti ? "italic" : "normal", lineHeight: .95, ...s });
  const B = (s: CSSProperties = {}): CSSProperties => ({ fontFamily: `"${t.body}"`, ...s });
  const slogan = d.brief?.slogan || d.brief?.frase_mae || (d.brief?.fala || [])[0] || name;
  const handle = "@" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9._]/g, "");
  return { C, t, name, hasSym, mark, logo, pat, on, T, B, slogan, handle, acc: C["Primária"], ink: C["Escuro"], paper: C["Claro"] };
}
type K = ReturnType<typeof sceneKit>;

const Svg = ({ svg, style }: { svg: string; style: CSSProperties }) => <div style={style}><SvgView svg={svg} className="w-full h-full" /></div>;
const Cap = ({ k, children, color }: { k: K; children: ReactNode; color: string }) => (
  <div style={k.B({ position: "absolute", left: 48, bottom: 36, color, fontSize: 13, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 600, opacity: .7 })}>{children}</div>
);
const Grain = ({ dark }: { dark?: boolean }) => <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: grainBg(GRAIN), opacity: dark ? .14 : .09, mixBlendMode: dark ? "screen" : "multiply" }} />;
/* luz de janela vinda do canto: dá volume à mesa ou à parede */
const Light = ({ from = "20% 0%", s = .35 }: { from?: string; s?: number }) => <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(120% 90% at ${from}, rgba(255,255,255,${s}), rgba(255,255,255,0) 55%), radial-gradient(90% 80% at 90% 110%, rgba(0,0,0,${s * .6}), rgba(0,0,0,0) 60%)` }} />;

/* ───────── cenas ───────── */
function Papelaria({ k, W, H }: { k: K; W: number; H: number }) {
  const table = mix(k.paper, "#9a958c", .35);
  const u = H / 900;
  const card = (front: boolean, style: CSSProperties) => (
    <div style={{ position: "absolute", width: 340 * u, height: 220 * u, boxShadow: SHADOW, ...style, background: front ? "#fbfbf9" : k.acc, overflow: "hidden" }}>
      {front ? (
        <div style={{ position: "absolute", inset: 22 * u, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Svg svg={k.logo(k.ink)} style={{ width: "52%", height: 44 * u }} />
          <div style={k.B({ fontSize: 11 * u, color: k.ink, lineHeight: 1.5 })}><b>Nome Sobrenome</b><br />Direção criativa<br />{k.handle}</div>
        </div>
      ) : k.pat(k.acc, k.on(k.acc)) ? <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${k.pat(k.acc, mix(k.acc, k.on(k.acc), .35), 340, 220)}")`, backgroundSize: "cover" }} /> : <Svg svg={k.mark(k.on(k.acc))} style={{ position: "absolute", inset: "28%" }} />}
      <div style={{ position: "absolute", inset: 0, background: SHEEN }} />
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: table, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, perspective: 2600 * u }}>
        <div style={{ position: "absolute", left: "50%", top: "52%", width: 0, height: 0, transform: "rotateX(52deg) rotateZ(-32deg)", transformStyle: "preserve-3d" }}>
          {/* papel timbrado */}
          <div style={{ position: "absolute", left: -560 * u, top: -420 * u, width: 520 * u, height: 735 * u, background: "#fdfdfb", boxShadow: SHADOW, padding: 44 * u }}>
            <Svg svg={k.logo(k.ink)} style={{ width: 170 * u, height: 46 * u }} />
            <div style={{ marginTop: 70 * u, display: "grid", gap: 12 * u }}>{[90, 96, 82, 94, 60, 0, 92, 88, 97, 70].map((w, i) => <span key={i} style={{ height: 7 * u, width: `${w}%`, background: w ? "#d9d8d4" : "transparent" }} />)}</div>
            <div style={{ position: "absolute", left: 44 * u, right: 44 * u, bottom: 40 * u, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={k.B({ fontSize: 10 * u, color: "#8a8a86" })}>{k.handle.slice(1)}.com.br</span>
              <span style={{ width: 70 * u, height: 6 * u, background: k.acc }} />
            </div>
            <div style={{ position: "absolute", inset: 0, background: SHEEN }} />
          </div>
          {/* envelope */}
          <div style={{ position: "absolute", left: 10 * u, top: -400 * u, width: 620 * u, height: 310 * u, background: k.ink, boxShadow: SHADOW, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, transparent 49.6%, ${mix(k.ink, "#000", .35)} 50%, transparent 50.4%), linear-gradient(20deg, transparent 49.6%, ${mix(k.ink, "#000", .35)} 50%, transparent 50.4%)` }} />
            <Svg svg={k.mark(k.acc)} style={{ position: "absolute", right: 40 * u, bottom: 36 * u, width: 70 * u, height: 70 * u }} />
            <div style={{ position: "absolute", inset: 0, background: SHEEN }} />
          </div>
          {card(true, { left: 60 * u, top: -40 * u, transform: "rotate(-6deg)" })}
          {card(false, { left: 140 * u, top: 150 * u, transform: "rotate(9deg)" })}
          {card(true, { left: 430 * u, top: 40 * u, transform: "rotate(-2deg)" })}
          {/* caneta */}
          <div style={{ position: "absolute", left: 470 * u, top: 330 * u, width: 360 * u, height: 16 * u, borderRadius: 99, background: `linear-gradient(180deg, ${mix(k.ink, "#fff", .25)}, ${k.ink} 60%, #000)`, transform: "rotate(-20deg)", boxShadow: "0 10px 14px rgba(0,0,0,.3)" }} />
        </div>
      </div>
      <Light from="10% -10%" s={.4} />
      <Grain />
      <Cap k={k} color={k.ink}>Papelaria · timbrado, envelope e cartões</Cap>
      <span style={{ display: "none" }}>{W}</span>
    </div>
  );
}

function Cartao3D({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900; const w = 640 * u, h = 400 * u;
  const bgPat = k.pat(k.acc, mix(k.acc, k.on(k.acc), .3), 640, 400);
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 70% at 50% 42%, ${mix(k.ink, "#fff", .14)}, ${k.ink} 70%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "46%", perspective: 2200 * u }}>
        <div className="scene-spin" style={{ position: "absolute", left: -w / 2, top: -h / 2, width: w, height: h, transformStyle: "preserve-3d" }}>
          <div style={{ position: "absolute", inset: 0, background: "#fbfbf9", backfaceVisibility: "hidden", borderRadius: 6 * u, overflow: "hidden", display: "grid", placeItems: "center" }}>
            <Svg svg={k.logo(k.ink)} style={{ width: "56%", height: "30%" }} />
            <div style={{ position: "absolute", inset: 0, background: SHEEN }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: k.acc, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 6 * u, overflow: "hidden" }}>
            {bgPat && <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${bgPat}")`, backgroundSize: "cover", opacity: .5 }} />}
            <div style={k.B({ position: "absolute", left: 36 * u, bottom: 30 * u, color: k.on(k.acc), fontSize: 15 * u, lineHeight: 1.5 })}><b>Nome Sobrenome</b><br />{k.handle}</div>
            <Svg svg={k.mark(k.on(k.acc))} style={{ position: "absolute", right: 36 * u, top: 32 * u, width: 80 * u, height: 80 * u }} />
            <div style={{ position: "absolute", inset: 0, background: SHEEN }} />
          </div>
        </div>
      </div>
      <div className="scene-shadow" style={{ position: "absolute", left: "50%", top: "80%", width: w * .9, height: 40 * u, marginLeft: -w * .45, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.6), rgba(0,0,0,0))" }} />
      <Grain dark />
      <Cap k={k} color={k.paper}>Cartão de visita · frente e verso</Cap>
    </div>
  );
}

function Logo3D({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900; const s = 380 * u; const N = 22;
  const side = mix(k.acc, "#000", .55);
  const layer = (c: string) => (k.hasSym ? <img src={svgUrl(k.mark(c))} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <SvgView svg={k.mark(c)} className="w-full h-full" />);
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 70% at 50% 45%, ${mix(k.ink, k.acc, .18)}, ${k.ink} 72%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "46%", perspective: 1800 * u }}>
        <div className="scene-swing" style={{ position: "absolute", left: -s / 2, top: -s / 2, width: s, height: s, transformStyle: "preserve-3d" }}>
          {Array.from({ length: N }, (_, i) => (
            <div key={i} style={{ position: "absolute", inset: 0, transform: `translateZ(${(i - N) * 2.2 * u}px)` }}>{layer(i === 0 ? mix(side, "#000", .3) : side)}</div>
          ))}
          <div style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 ${30 * u}px ${k.acc}55)` }}>{layer(k.acc)}</div>
        </div>
      </div>
      <div className="scene-shadow" style={{ position: "absolute", left: "50%", top: "82%", width: s * 1.1, height: 46 * u, marginLeft: -s * .55, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.65), rgba(0,0,0,0))" }} />
      <Grain dark />
      <Cap k={k} color={k.paper}>{k.hasSym ? "Símbolo" : "Monograma"} em 3D · vinheta, abertura e tela de espera</Cap>
    </div>
  );
}

const SHIRT = "M70 30 L140 8 Q200 40 260 8 L330 30 L398 100 L350 152 L318 128 L318 470 L82 470 L82 128 L50 152 L2 100 Z";
function Shirt({ k, color, logoColor, style, mark }: { k: K; color: string; logoColor: string; style: CSSProperties; mark?: boolean }) {
  return (
    <div style={{ position: "absolute", filter: "drop-shadow(0 30px 30px rgba(0,0,0,.28))", ...style }}>
      <svg viewBox="0 0 400 480" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id={`sf${color.slice(1)}`} x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity=".22" /><stop offset=".25" stopColor="#fff" stopOpacity=".08" /><stop offset=".55" stopColor="#000" stopOpacity=".05" /><stop offset=".8" stopColor="#fff" stopOpacity=".06" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
        </defs>
        <path d={SHIRT} fill={color} />
        <path d="M140 8 Q200 40 260 8 Q240 30 200 34 Q160 30 140 8Z" fill="#000" opacity=".25" />
        <path d={SHIRT} fill={`url(#sf${color.slice(1)})`} />
        <path d="M150 200 Q190 260 170 340 M250 180 Q230 280 262 380" stroke="#000" strokeOpacity=".035" strokeWidth="22" fill="none" style={{ filter: "blur(6px)" }} />
      </svg>
      <div style={{ position: "absolute", left: mark ? "56%" : "32%", width: mark ? "14%" : "36%", top: mark ? "22%" : "27%", height: mark ? "11%" : "12%", opacity: .95 }}>
        <SvgView svg={mark ? k.mark(logoColor) : k.logo(logoColor)} className="w-full h-full" />
      </div>
    </div>
  );
}
function Camiseta({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900;
  const wall = mix(k.paper, "#b8b2a8", .25);
  const second = k.acc === k.ink ? mix(k.ink, "#fff", .8) : k.acc;
  return (
    <div style={{ position: "absolute", inset: 0, background: wall, overflow: "hidden" }}>
      <Shirt k={k} color={second} logoColor={k.on(second)} mark style={{ left: "16%", top: 140 * u, width: 470 * u, height: 564 * u, transform: "rotate(-4deg)" }} />
      <Shirt k={k} color={k.ink} logoColor={k.acc === k.ink ? k.paper : k.acc} style={{ left: "44%", top: 110 * u, width: 520 * u, height: 624 * u, transform: "rotate(2deg)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 * u, background: mix(wall, "#000", .12) }} />
      <Light from="80% -10%" s={.45} />
      <Grain />
      <Cap k={k} color={k.ink}>Vestuário · camiseta da equipe</Cap>
    </div>
  );
}

function Bag({ k, color, w, h, style }: { k: K; color: string; w: number; h: number; style: CSSProperties }) {
  const sideW = w * .2; const fg = k.on(color);
  return (
    <div style={{ position: "absolute", width: w + sideW, height: h + h * .3, ...style }}>
      <div style={{ position: "absolute", left: w * .26, top: 0, width: w * .48, height: h * .36, border: `${Math.max(3, w * .02)}px solid ${mix(color, "#000", .45)}`, borderBottom: 0, borderRadius: `${w}px ${w}px 0 0` }} />
      <div style={{ position: "absolute", left: 0, top: h * .3, width: w, height: h, background: color, boxShadow: SHADOW, display: "grid", placeItems: "center" }}>
        <Svg svg={k.logo(fg)} style={{ width: "62%", height: "22%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.05), rgba(255,255,255,.1) 40%, rgba(0,0,0,.12))" }} />
      </div>
      <div style={{ position: "absolute", left: w, top: h * .3, width: sideW, height: h, background: mix(color, "#000", .3), clipPath: "polygon(0 0, 100% 9%, 100% 95%, 0 100%)" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent 49%, rgba(0,0,0,.18) 50%, transparent 51%)` }} />
      </div>
    </div>
  );
}
function Sacola({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900;
  const wall = mix(k.paper, k.acc, .1);
  return (
    <div style={{ position: "absolute", inset: 0, background: wall, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", background: mix(wall, "#000", .1) }} />
      <Bag k={k} color={k.paper === "#ffffff" ? "#f3f1ec" : mix(k.paper, "#fff", .4)} w={300 * u} h={340 * u} style={{ left: "26%", bottom: "17%" }} />
      <Bag k={k} color={k.acc} w={380 * u} h={430 * u} style={{ left: "43%", bottom: "13%" }} />
      <Bag k={k} color={k.ink} w={250 * u} h={290 * u} style={{ left: "63%", bottom: "19%" }} />
      <Light from="15% -5%" s={.4} />
      <Grain />
      <Cap k={k} color={k.ink}>Embalagem · sacolas em três tamanhos</Cap>
    </div>
  );
}

function Celular({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900; const w = 380 * u, h = 780 * u;
  const tiles = [k.acc, "pat", k.ink, "logo", k.paper, k.acc, "pat2", k.ink, "slogan"];
  const pat = k.pat(k.acc, k.ink, 300, 300), pat2 = k.pat(k.ink, k.acc, 300, 300);
  return (
    <div style={{ position: "absolute", inset: 0, background: k.acc, overflow: "hidden" }}>
      {pat && <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${k.pat(k.acc, mix(k.acc, k.on(k.acc), .12), 600, 600)}")`, backgroundSize: `${520 * u}px` }} />}
      <div style={{ position: "absolute", left: "50%", top: "50%", perspective: 2400 * u }}>
        <div style={{ position: "absolute", left: -w / 2, top: -h / 2, width: w, height: h, borderRadius: 54 * u, background: "#0b0b0c", padding: 14 * u, boxShadow: `${-40 * u}px ${60 * u}px ${80 * u}px rgba(0,0,0,.35)`, transform: "rotateY(-18deg) rotateX(8deg) rotateZ(4deg)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 42 * u, background: "#fff", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: "50%", top: 10 * u, width: 100 * u, height: 28 * u, marginLeft: -50 * u, borderRadius: 99, background: "#0b0b0c" }} />
            <div style={{ padding: `${56 * u}px ${18 * u}px 0` }}>
              <p style={k.B({ fontSize: 15 * u, fontWeight: 700, color: "#111" })}>{k.handle.slice(1)}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 * u, marginTop: 12 * u }}>
                <div style={{ width: 78 * u, height: 78 * u, borderRadius: 99, background: k.ink, display: "grid", placeItems: "center", boxShadow: `0 0 0 ${3 * u}px #fff, 0 0 0 ${5 * u}px ${k.acc}` }}><Svg svg={k.mark(k.acc === k.ink ? k.paper : k.acc)} style={{ width: "56%", height: "56%" }} /></div>
                <div style={k.B({ display: "flex", gap: 14 * u, fontSize: 11 * u, color: "#111", textAlign: "center" })}>{[["128", "posts"], ["12,4 mil", "seguidores"], ["310", "seguindo"]].map(([a, b]) => <span key={b}><b style={{ display: "block", fontSize: 14 * u }}>{a}</b>{b}</span>)}</div>
              </div>
              <p style={k.B({ fontSize: 11.5 * u, color: "#111", marginTop: 10 * u, lineHeight: 1.4 })}><b>{k.name}</b><br />{String(k.slogan).slice(0, 70)}</p>
              <div style={{ display: "flex", gap: 12 * u, marginTop: 12 * u }}>{[k.acc, k.ink, k.paper, k.C["Apoio"]].map((c, i) => <span key={i} style={{ width: 50 * u, height: 50 * u, borderRadius: 99, background: c, boxShadow: `0 0 0 ${2 * u}px #fff, 0 0 0 ${3 * u}px #ddd` }} />)}</div>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 360 * u, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 * u }}>
              {tiles.map((c, i) => (
                <div key={i} style={{ background: c === "pat" ? (pat ? `url("${pat}") center/cover` : k.acc) : c === "pat2" ? (pat2 ? `url("${pat2}") center/cover` : k.ink) : c === "logo" ? k.paper : c === "slogan" ? k.acc : c, display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {c === "logo" && <Svg svg={k.logo(k.ink)} style={{ width: "76%", height: "40%" }} />}
                  {c === "slogan" && <span style={k.T({ fontSize: 13 * u, color: k.on(k.acc), padding: 8 * u, textAlign: "center" })}>{String(k.slogan).split(" ").slice(0, 4).join(" ")}</span>}
                  {c === k.ink && i === 2 && <Svg svg={k.mark(k.acc === k.ink ? k.paper : k.acc)} style={{ width: "40%", height: "40%" }} />}
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,.22), rgba(255,255,255,0) 35%)" }} />
          </div>
        </div>
      </div>
      <Grain />
      <Cap k={k} color={k.on(k.acc)}>Redes · perfil do Instagram</Cap>
    </div>
  );
}

function Letreiro({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900;
  const wall = mix(k.ink, "#3a3a3a", .35);
  const glow = k.acc === k.ink ? k.paper : k.acc;
  return (
    <div style={{ position: "absolute", inset: 0, background: wall, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.25) 1px, transparent 1px)`, backgroundSize: `100% ${150 * u}px`, opacity: .6 }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(48% 46% at 50% 44%, ${glow}33, transparent 70%)` }} />
      <div style={{ position: "absolute", left: "22%", right: "22%", top: "28%", height: "28%", filter: `drop-shadow(0 0 ${8 * u}px ${glow}) drop-shadow(0 0 ${36 * u}px ${glow}aa) drop-shadow(0 ${40 * u}px ${30 * u}px rgba(0,0,0,.5))` }}>
        <SvgView svg={k.logo(mix(glow, "#fff", .35))} className="w-full h-full" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", background: `linear-gradient(180deg, ${mix(wall, "#000", .5)}, ${mix(wall, "#000", .3)})` }} />
      <div style={{ position: "absolute", left: "30%", right: "30%", bottom: "20%", height: 16 * u, borderRadius: "50%", background: `radial-gradient(closest-side, ${glow}55, transparent)` }} />
      <Grain dark />
      <Cap k={k} color={k.paper}>Ambiente · letreiro com luz de fundo</Cap>
    </div>
  );
}

function Cup({ k, color, w, h, style, handle = true }: { k: K; color: string; w: number; h: number; style: CSSProperties; handle?: boolean }) {
  return (
    <div style={{ position: "absolute", width: w * 1.35, height: h * 1.1, ...style }}>
      {handle && <div style={{ position: "absolute", left: w * .82, top: h * .22, width: w * .42, height: h * .5, borderRadius: "40%", border: `${w * .09}px solid ${mix(color, "#000", .15)}` }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, borderRadius: `0 0 ${w * .12}px ${w * .12}px`, background: color, overflow: "hidden", boxShadow: "0 40px 40px -10px rgba(0,0,0,.35)" }}>
        <div style={{ position: "absolute", left: "16%", right: "16%", top: "34%", height: "26%" }}><SvgView svg={k.mark(k.on(color))} className="w-full h-full" /></div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.35), rgba(255,255,255,.22) 28%, rgba(255,255,255,0) 45%, rgba(0,0,0,.08) 70%, rgba(0,0,0,.4))" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: -w * .08, width: w, height: w * .16, borderRadius: "50%", background: mix(color, "#000", .2), boxShadow: `inset 0 ${w * .03}px ${w * .04}px rgba(0,0,0,.5)` }} />
    </div>
  );
}
function Copo({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900;
  const table = mix(k.paper, "#8f8a82", .25);
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${mix(table, "#fff", .25)} 0 58%, ${table} 58% 100%)`, overflow: "hidden" }}>
      <Cup k={k} color={k.ink} w={250 * u} h={300 * u} style={{ left: "26%", top: "30%" }} />
      <Cup k={k} color={k.acc} w={200 * u} h={330 * u} handle={false} style={{ left: "50%", top: "26%" }} />
      <Cup k={k} color={k.paper === "#ffffff" ? "#f1efe9" : k.paper} w={170 * u} h={200 * u} style={{ left: "64%", top: "42%" }} />
      <Light from="10% 0%" s={.35} />
      <Grain />
      <Cap k={k} color={k.ink}>Brinde · caneca e copo</Cap>
    </div>
  );
}

function Cartaz({ k, H }: { k: K; W: number; H: number }) {
  const u = H / 900;
  const wall = mix("#8d8a84", k.paper, .3);
  const posters = [k.acc, k.ink, k.acc];
  return (
    <div style={{ position: "absolute", inset: 0, background: wall, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.12) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.1) 1px, transparent 1px)`, backgroundSize: `${240 * u}px ${110 * u}px` }} />
      <div style={{ position: "absolute", inset: 0, perspective: 2400 * u }}>
        <div style={{ position: "absolute", left: "8%", right: "4%", top: "10%", bottom: "12%", display: "flex", gap: 10 * u, transform: "rotateY(-16deg)", transformOrigin: "100% 50%" }}>
          {posters.map((bg, i) => {
            const pat = k.pat(bg, mix(bg, k.on(bg), .25), 500, 700);
            return (
              <div key={i} style={{ flex: 1, background: bg, position: "relative", overflow: "hidden", boxShadow: "0 10px 20px rgba(0,0,0,.25)", padding: 34 * u, display: "flex", flexDirection: "column", justifyContent: "space-between", color: k.on(bg) }}>
                {i !== 1 && pat && <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${pat}")`, backgroundSize: "cover", opacity: .6 }} />}
                <Svg svg={i === 1 ? k.mark(k.acc === k.ink ? k.paper : k.acc) : k.logo(k.on(bg))} style={{ position: "relative", width: i === 1 ? "40%" : "70%", height: i === 1 ? 140 * u : 60 * u }} />
                <p style={k.T({ position: "relative", fontSize: 50 * u, lineHeight: 1 })}>{i === 1 ? k.slogan : ""}</p>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(255,255,255,.18), transparent 30%), repeating-linear-gradient(90deg, transparent 0 60px, rgba(0,0,0,.03) 60px 62px)" }} />
              </div>
            );
          })}
        </div>
      </div>
      <Light from="0% 0%" s={.35} />
      <Grain />
      <Cap k={k} color={k.ink}>Rua · cartazes lambe-lambe</Cap>
    </div>
  );
}

/** logo sobre foto real (upload ou Pexels), na posição, cor e tamanho escolhidos */
export function PhotoScene({ k, f, H }: { k: K; f: Foto; W: number; H: number }) {
  const u = H / 900;
  const col = f.cor === "escuro" ? k.ink : f.cor === "primaria" ? k.acc : "#ffffff";
  const tam = f.tam || 30;
  const pos: Record<string, CSSProperties> = {
    centro: { left: "50%", top: "50%", transform: `translate(-50%,-50%) rotate(${f.rot || 0}deg)` },
    te: { left: 56 * u, top: 50 * u, transform: `rotate(${f.rot || 0}deg)`, transformOrigin: "0 0" },
    td: { right: 56 * u, top: 50 * u, transform: `rotate(${f.rot || 0}deg)`, transformOrigin: "100% 0" },
    be: { left: 56 * u, bottom: 70 * u, transform: `rotate(${f.rot || 0}deg)`, transformOrigin: "0 100%" },
    bd: { right: 56 * u, bottom: 70 * u, transform: `rotate(${f.rot || 0}deg)`, transformOrigin: "100% 100%" },
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: k.ink, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", width: `${tam}%`, height: `${tam * .45}%`, ...pos[f.pos || "centro"], mixBlendMode: f.impresso ? (col === k.ink ? "multiply" : "screen") : "normal", opacity: f.impresso ? .92 : 1 }}>
        <SvgView svg={k.logo(col)} className="w-full h-full" />
      </div>
      {f.legenda && <Cap k={k} color="#ffffff">{f.legenda}</Cap>}
    </div>
  );
}

export function Scene({ d, k: key, W, H, kit }: { d: any; k: SceneKey; W: number; H: number; kit?: K }) {
  const k = kit || sceneKit(d);
  const P = { k, W, H };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {key === "papelaria" ? <Papelaria {...P} /> : key === "cartao3d" ? <Cartao3D {...P} /> : key === "logo3d" ? <Logo3D {...P} /> : key === "camiseta" ? <Camiseta {...P} /> : key === "sacola" ? <Sacola {...P} /> : key === "celular" ? <Celular {...P} /> : key === "letreiro" ? <Letreiro {...P} /> : key === "copo" ? <Copo {...P} /> : <Cartaz {...P} />}
    </div>
  );
}

/* animações: giram na tela, param num ângulo bonito na impressão */
export const SCENE_CSS = `
@keyframes sceneSpin { from { transform: rotateY(-20deg) rotateX(8deg) } to { transform: rotateY(340deg) rotateX(8deg) } }
@keyframes sceneSwing { 0%,100% { transform: rotateY(-38deg) rotateX(6deg) } 50% { transform: rotateY(38deg) rotateX(-4deg) } }
@keyframes sceneShadow { 0%,100% { transform: scaleX(1) } 50% { transform: scaleX(.6) } }
.scene-spin { animation: sceneSpin 7s cubic-bezier(.45,.05,.55,.95) infinite; transform: rotateY(-20deg) rotateX(8deg) }
.scene-swing { animation: sceneSwing 6s ease-in-out infinite; transform: rotateY(-28deg) rotateX(6deg) }
.scene-shadow { animation: sceneShadow 3.5s ease-in-out infinite }
@media print { .scene-spin { animation: none; transform: rotateY(-24deg) rotateX(8deg) } .scene-swing { animation: none; transform: rotateY(-30deg) rotateX(6deg) } .scene-shadow { animation: none } }
@media (prefers-reduced-motion: reduce) { .scene-spin, .scene-swing, .scene-shadow { animation: none } }
`;
export const SceneStyle = () => <style dangerouslySetInnerHTML={{ __html: SCENE_CSS }} />;
