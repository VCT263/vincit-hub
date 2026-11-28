"use client";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { quadMatrix } from "@/lib/mockupPsd";
import { sceneKit } from "./Scenes";
import { FlatSvg, LAYOUTS, LayoutArt, autoLayout, brandVoice, type Voice } from "./MockupArt";
import { loadFonts } from "@/lib/design";
import { SvgView } from "../ui";
import { useLite, useSmall } from "./lazy";

/* Mockup fotográfico (PSD do mockups-design.com preparado pelo importador):
   foto com a área em preto (K) + arte da marca em perspectiva × mapa de luz (L), somados.
   Resultado = K + arte·L, o mesmo que o objeto inteligente do Photoshop faria. */

export type MockupSlot = { name: string; w: number; h: number; quad: number[]; light_url: string; art?: string };
export type Mockup = { id: string; title: string; category: string; width: number; height: number; base_url: string; thumb_url?: string; slots: MockupSlot[]; sort: number; active: boolean; source_url?: string };

export const ARTS: { k: string; l: string }[] = [
  { k: "auto", l: "Peça desenhada" },
  ...Object.entries(LAYOUTS).map(([k, x]) => ({ k, l: x.l })),
  { k: "claro", l: "Logo no claro" }, { k: "escuro", l: "Logo no escuro" }, { k: "primaria", l: "Logo na primária" },
  { k: "grafismo", l: "Grafismo" }, { k: "simbolo", l: "Símbolo grande" }, { k: "objeto", l: "Só o logo" }, { k: "post", l: "Post / tela" },
];
export const CATS: Record<string, string> = { cartao: "Cartão de visita", papelaria: "Papelaria", sacola: "Sacola e embalagem", fachada: "Fachada e placa", tela: "Telas", caneca: "Caneca", vestuario: "Vestuário", cartaz: "Cartaz e outdoor", parede: "Logo na parede", outros: "Outros" };
/** as categorias agrupadas em famílias, na ordem em que aparecem na biblioteca e no manual */
export const GROUPS: { k: string; l: string; d: string; cats: string[] }[] = [
  { k: "papelaria", l: "Papelaria", d: "Carta, envelope e cartão de visita", cats: ["papelaria", "cartao"] },
  { k: "digital", l: "Digital", d: "Celular e notebook", cats: ["tela"] },
  { k: "embalagem", l: "Embalagem", d: "Sacolas e caixas", cats: ["sacola"] },
  { k: "sinalizacao", l: "Sinalização", d: "Fachada, placa, bandeira e parede", cats: ["fachada", "parede"] },
  { k: "midia", l: "Mídia e cartazes", d: "Outdoor, citylight e quadros", cats: ["cartaz"] },
  { k: "objetos", l: "Objetos e vestuário", d: "Caneca, camiseta e brindes", cats: ["caneca", "vestuario", "outros"] },
];
export const groupOf = (cat: string) => GROUPS.find((g) => g.cats.includes(cat)) || GROUPS[GROUPS.length - 1];
/** a lista em ordem de família (e, dentro dela, a ordem da biblioteca) */
export function byGroup<T extends { category: string }>(list: T[]) {
  return GROUPS.map((g) => ({ g, items: list.filter((m) => groupOf(m.category).k === g.k) })).filter((x) => x.items.length);
}

let cache: Promise<Mockup[]> | null = null;
export function useMockups() {
  const [list, setList] = useState<Mockup[] | null>(null);
  useEffect(() => {
    cache = cache || Promise.resolve(createClient().from("design_mockups").select("*").eq("active", true).order("sort").order("created_at")).then(({ data }) => (data as Mockup[]) || []);
    cache.then(setList);
  }, []);
  return list;
}
export const refreshMockups = () => { cache = null; };

/** a arte que entra numa área do mockup, desenhada no tamanho do objeto inteligente */
function Art({ d, v, m, i, kind, w, h }: { d: any; v: Voice; m: Mockup; i: number; kind: string; w: number; h: number }) {
  if (kind === "auto" || !kind) { const a = autoLayout(m, i, v); return <LayoutArt v={v} kind={a.kind} n={a.n} w={w} h={h} />; }
  if (LAYOUTS[kind]) return <LayoutArt v={v} kind={kind} n={i} w={w} h={h} />;
  const k = sceneKit(d);
  const u = Math.min(w, h);
  const bg = kind === "escuro" ? k.ink : kind === "primaria" || kind === "simbolo" || kind === "post" ? k.acc : kind === "grafismo" ? k.acc : kind === "objeto" ? "#ffffff" : k.paper === "#ffffff" ? "#fbfbf9" : k.paper;
  const fg = kind === "objeto" ? k.ink : k.on(bg);
  const pat = kind === "grafismo" ? k.pat(k.acc, k.ink, Math.round(w), Math.round(h)) : "";
  const box: CSSProperties = { position: "absolute", left: 0, top: 0, width: w, height: h, background: bg, overflow: "hidden", display: "grid", placeItems: "center" };
  if (kind === "grafismo") return <div style={{ ...box, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover" }} />;
  if (kind === "simbolo") return <div style={box}><div style={{ width: u * .5, height: u * .5 }}><SvgView svg={k.mark(fg)} className="w-full h-full" /></div></div>;
  if (kind === "post") return (
    <div style={{ ...box, placeItems: "stretch", padding: u * .09, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ width: u * .42, height: u * .14 }}><SvgView svg={k.logo(fg)} className="w-full h-full" /></div>
      <p style={k.T({ color: fg, fontSize: u * .13, lineHeight: 1.02 })}>{k.slogan}</p>
      <div style={{ width: u * .12, height: u * .12, alignSelf: "flex-end" }}><SvgView svg={k.mark(fg)} className="w-full h-full" /></div>
    </div>
  );
  return <div style={box}><div style={{ width: w * .62, height: h * .42 }}><SvgView svg={k.logo(fg)} className="w-full h-full" /></div></div>;
}

/** o mockup inteiro, no tamanho nativo por fora; quem usa escala por fora.
   No celular, por dentro ele é desenhado em meia resolução (fotos reduzidas e camadas de luz
   menores), senão o Safari do iPhone fica sem memória e recarrega a página. */
export function MockupStage({ d, m, arts }: { d: any; m: Mockup; arts?: string[] }) {
  const v = useMemo(() => brandVoice(d), [d]);
  const t = d.type || {};
  useEffect(() => { loadFonts([t.title, t.body, t.accent].filter(Boolean)); }, [t.title, t.body, t.accent]);
  const lite = useLite();
  const r = lite ? .5 : 1;
  const maxW = lite ? Math.round(m.width * r) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: m.width, height: m.height, background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: m.width * r, height: m.height * r, isolation: "isolate", transformOrigin: "0 0", transform: r === 1 ? undefined : `scale(${1 / r})` }}>
        <Photo url={m.base_url} maxW={maxW} />
        {m.slots.map((s, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, mixBlendMode: "plus-lighter", isolation: "isolate" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: s.w, height: s.h, transformOrigin: "0 0", transform: quadMatrix(s.w, s.h, r === 1 ? s.quad : s.quad.map((q) => q * r)) }}>
              {m.category === "caneca"
                ? <Cylinder w={s.w} h={s.h} quad={s.quad}><Art d={d} v={v} m={m} i={i} kind={(arts && arts[i]) || "auto"} w={s.w} h={s.h} /></Cylinder>
                : <Art d={d} v={v} m={m} i={i} kind={(arts && arts[i]) || "auto"} w={s.w} h={s.h} />}
            </div>
            <Photo url={s.light_url} maxW={maxW} blend />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Caneca: o PSD guarda a arte da volta inteira (3000 px) e o importador só lê o retângulo onde
   ela cai na foto (~800 px), sem a deformação de cilindro do Photoshop. Colada reta, a arte
   ficava espremida na horizontal (o nome parecia condensado) e chapada sobre a curva.
   Aqui a arte é refeita em faixas verticais como se enrolasse num cilindro: no meio fica na
   proporção certa, nas laterais vai comprimindo, e as linhas horizontais acompanham a boca
   da caneca (sobem nas pontas, como vista um pouco de cima). */
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);
function cylinderAngle(w: number, h: number, q: number[]) {
  const qw = (dist(q[0], q[1], q[2], q[3]) + dist(q[6], q[7], q[4], q[5])) / 2;
  const qh = (dist(q[0], q[1], q[6], q[7]) + dist(q[2], q[3], q[4], q[5])) / 2;
  const need = (w / h) / Math.max(qw / qh, 1e-3); // quanto o meio precisa esticar
  if (need <= 1.02) return null;
  // θ / sen θ = need (busca binária em 0…1,5 rad)
  let lo = 0.01, hi = 1.5;
  for (let k = 0; k < 40; k++) { const t = (lo + hi) / 2; if (t / Math.sin(t) < need) lo = t; else hi = t; }
  const t = (lo + hi) / 2;
  // arte mais larga do que cabe na metade visível: o resto fica atrás da caneca (como na real)
  return { t, extra: Math.max(1, need / (t / Math.sin(t))) };
}
function Cylinder({ w, h, quad, children }: { w: number; h: number; quad: number[]; children: ReactNode }) {
  const cyl = useMemo(() => cylinderAngle(w, h, quad), [w, h, quad]);
  if (!cyl) return <>{children}</>;
  const { t: tmax, extra } = cyl;
  const N = 36; const half = w / 2; const sm = Math.sin(tmax);
  const lift = h * .1; // quanto as pontas sobem (vista levemente de cima)
  const strips = Array.from({ length: N }, (_, i) => {
    const x0 = (i / N) * w, x1 = ((i + 1) / N) * w;
    const uOf = (x: number) => { const t = Math.asin(Math.max(-1, Math.min(1, ((x - half) / half) * sm))); return half + (t / tmax) * (half / extra); };
    const u0 = uOf(x0), u1 = uOf(x1);
    const xm = (x0 + x1) / 2; const tm = Math.asin(((xm - half) / half) * sm);
    const dy = -lift * (1 - Math.cos(tm)) / (1 - Math.cos(tmax) || 1);
    return { x0, x1, u0, u1, dy };
  });
  // as faixas se sobrepõem uns pixels: borda com antisserrilhado deixava vazar a luz (linhas claras)
  const ov = Math.max(2, w / 60);
  const pass = (lifted: boolean) => strips.map((s, i) => {
    const k = (s.x1 - s.x0) / Math.max(s.u1 - s.u0, 1e-3);
    return (
      <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: s.x0 - ov, width: s.x1 - s.x0 + ov * 2, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", opacity: .999, transform: `translate(${ov}px, ${lifted ? s.dy : 0}px) scaleX(${k}) translateX(${-s.u0}px)` }}>{children}</div>
      </div>
    );
  });
  return (
    <FlatSvg.Provider value={true}>
    <div style={{ position: "absolute", inset: 0 }}>
      {/* embaixo, sem subir: só preenche a faixa que as pontas deixam vazia no pé da arte */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: lift + 2, overflow: "hidden" }}><div style={{ position: "absolute", left: 0, bottom: 0, width: w, height: h }}>{pass(false)}</div></div>
      {pass(true)}
    </div>
    </FlatSvg.Provider>
  );
}

function Photo({ url, maxW, blend }: { url: string; maxW: number; blend?: boolean }) {
  const src = useSmall(url, maxW);
  if (!src) return <div style={{ position: "absolute", inset: 0, background: blend ? "#000" : "#111" }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" crossOrigin={src.startsWith("blob:") ? undefined : "anonymous"} decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: blend ? "multiply" : undefined }} />;
}

/** encaixa o mockup numa caixa W×H cobrindo (como object-fit: cover) */
/** por que cada peça é assim (vai na legenda da página do manual) */
export function mockupWhy(d: any, m: Mockup, arts?: string[]) {
  const v = brandVoice(d);
  const kinds = Array.from(new Set(m.slots.map((_, i) => { const a = (arts && arts[i]) || "auto"; return a === "auto" ? autoLayout(m, i, v).kind : a; }).filter((k) => LAYOUTS[k])));
  return kinds.slice(0, 3).map((k) => LAYOUTS[k].why(v)).join(" ");
}

export function MockupCover({ d, m, arts, W, H, caption }: { d: any; m: Mockup; arts?: string[]; W: number; H: number; caption?: boolean }) {
  const s = Math.max(W / m.width, H / m.height);
  const t = d.type || {};
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", left: (W - m.width * s) / 2, top: (H - m.height * s) / 2, width: m.width, height: m.height, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <MockupStage d={d} m={m} arts={arts} />
      </div>
      {caption && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `${H * .12}px ${W * .035}px ${H * .045}px`, background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.62))", color: "#fff", fontFamily: `"${t.body || "Inter"}"` }}>
          <p style={{ fontSize: H * .018, letterSpacing: ".22em", textTransform: "uppercase", opacity: .75 }}>{groupOf(m.category).l} · {m.title.replace(/\s*\d+$/, "")}</p>
          <p style={{ fontSize: H * .024, lineHeight: 1.45, marginTop: H * .008, maxWidth: W * .62 }}>{mockupWhy(d, m, arts)}</p>
        </div>
      )}
    </div>
  );
}
