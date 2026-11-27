"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { quadMatrix } from "@/lib/mockupPsd";
import { sceneKit } from "./Scenes";
import { LAYOUTS, LayoutArt, autoLayout, brandVoice, type Voice } from "./MockupArt";
import { loadFonts } from "@/lib/design";
import { SvgView } from "../ui";

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

/** o mockup inteiro, desenhado em pixels nativos; quem usa escala por fora */
export function MockupStage({ d, m, arts }: { d: any; m: Mockup; arts?: string[] }) {
  const v = useMemo(() => brandVoice(d), [d]);
  const t = d.type || {};
  useEffect(() => { loadFonts([t.title, t.body, t.accent].filter(Boolean)); }, [t.title, t.body, t.accent]);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: m.width, height: m.height, isolation: "isolate", background: "#000" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.base_url} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {m.slots.map((s, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, mixBlendMode: "plus-lighter", isolation: "isolate" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: s.w, height: s.h, transformOrigin: "0 0", transform: quadMatrix(s.w, s.h, s.quad) }}>
            <Art d={d} v={v} m={m} i={i} kind={(arts && arts[i]) || "auto"} w={s.w} h={s.h} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.light_url} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply" }} />
        </div>
      ))}
    </div>
  );
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
