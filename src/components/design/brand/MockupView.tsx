"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { quadMatrix } from "@/lib/mockupPsd";
import { sceneKit } from "./Scenes";
import { SvgView } from "../ui";

/* Mockup fotográfico (PSD do mockups-design.com preparado pelo importador):
   foto com a área em preto (K) + arte da marca em perspectiva × mapa de luz (L), somados.
   Resultado = K + arte·L, o mesmo que o objeto inteligente do Photoshop faria. */

export type MockupSlot = { name: string; w: number; h: number; quad: number[]; light_url: string; art?: string };
export type Mockup = { id: string; title: string; category: string; width: number; height: number; base_url: string; thumb_url?: string; slots: MockupSlot[]; sort: number; active: boolean; source_url?: string };

export const ARTS: { k: string; l: string }[] = [
  { k: "claro", l: "Logo no claro" }, { k: "escuro", l: "Logo no escuro" }, { k: "primaria", l: "Logo na primária" },
  { k: "grafismo", l: "Grafismo" }, { k: "simbolo", l: "Símbolo grande" }, { k: "objeto", l: "Só o logo" }, { k: "post", l: "Post / tela" },
];
export const CATS: Record<string, string> = { cartao: "Cartão de visita", papelaria: "Papelaria", sacola: "Sacola e embalagem", fachada: "Fachada e placa", tela: "Telas", caneca: "Caneca", vestuario: "Vestuário", cartaz: "Cartaz e outdoor", parede: "Logo na parede", outros: "Outros" };

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
function Art({ d, kind, w, h }: { d: any; kind: string; w: number; h: number }) {
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
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: m.width, height: m.height, isolation: "isolate", background: "#000" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.base_url} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {m.slots.map((s, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, mixBlendMode: "plus-lighter", isolation: "isolate" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: s.w, height: s.h, transformOrigin: "0 0", transform: quadMatrix(s.w, s.h, s.quad) }}>
            <Art d={d} kind={(arts && arts[i]) || s.art || "claro"} w={s.w} h={s.h} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.light_url} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply" }} />
        </div>
      ))}
    </div>
  );
}

/** encaixa o mockup numa caixa W×H cobrindo (como object-fit: cover) */
export function MockupCover({ d, m, arts, W, H }: { d: any; m: Mockup; arts?: string[]; W: number; H: number }) {
  const s = Math.max(W / m.width, H / m.height);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", left: (W - m.width * s) / 2, top: (H - m.height * s) / 2, width: m.width, height: m.height, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <MockupStage d={d} m={m} arts={arts} />
      </div>
    </div>
  );
}
