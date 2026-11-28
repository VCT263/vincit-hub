"use client";
import type { CSSProperties, ReactNode } from "react";

/* Páginas que mostram a lógica do manifesto antes do visual: como a marca pensa
   (crença e problema → método → fronteira → regras de ouro) e a direção de conteúdo
   (estrutura de cada peça, fechamento, ritmo e os sinais de que está funcionando).
   Leem os campos do manifesto em data.brief (src/lib/manifesto.ts). Sem dado, sem página. */

type X = { W: number; H: number; ink: string; paper: string; acc: string; name: string; T: (s?: CSSProperties) => CSSProperties; B: (s?: CSSProperties) => CSSProperties };

const arr = (v: any): string[] => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : typeof v === "string" && v.trim() ? [v.trim()] : []);
const txt = (v: any) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : Array.isArray(v) ? v.join("; ") : "");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);
/** fonte que encolhe com o tamanho do texto */
const fit = (s: string, big: number, small: number, from = 80, to = 360) => {
  const l = s.length;
  if (l <= from) return big;
  if (l >= to) return small;
  return Math.round(big - ((l - from) / (to - from)) * (big - small));
};

const Label = ({ x, children, style }: { x: X; children: ReactNode; style?: CSSProperties }) => (
  <p style={x.B({ fontSize: 12, letterSpacing: ".26em", textTransform: "uppercase", fontWeight: 600, opacity: .6, ...style })}>{children}</p>
);

/** camadas do método: "1 Direção (foco, critério) 2 Estrutura (...)" ou "A → B → C" */
export function camadas(framework: string): { t: string; d?: string }[] {
  const f = framework || "";
  const num = [...f.matchAll(/(?:^|\s)(\d)[.)]?\s+([A-ZÀ-Ú][\wÀ-ú ]{1,28}?)\s*(?:\(([^)]{0,120})\))?(?=\.|,|\s\d[.)]?\s|$)/g)].map((m) => ({ t: m[2].trim(), d: m[3]?.trim() }));
  if (num.length >= 3) return num.slice(0, 5);
  const seta = f.split(/\.\s/)[0].split(/\s*(?:→|->|>)\s*/).map((s) => s.replace(/^[^:]*:\s*/, "").trim()).filter((s) => s && s.length <= 40);
  if (seta.length >= 3) return seta.slice(0, 5).map((t) => ({ t }));
  return [];
}

/** nome do método, quando vem antes do primeiro ponto ("Camadas da Construção. ...") */
const nomeMetodo = (f: string) => { const n = (f || "").split(/[.:]/)[0].trim(); return n.length > 2 && n.length <= 40 && !/\d/.test(n) ? n : ""; };

export const temPensa = (b: any) => !!(txt(b?.problema) && (txt(b?.framework) || arr(b?.regras_ouro).length));
export const temConteudo = (b: any) => [txt(b?.estrutura), txt(b?.fechamento), txt(b?.ritmo)].filter(Boolean).length + (arr(b?.indicadores).length ? 1 : 0) >= 2;

/** Plataforma · como a marca pensa */
export function ThinkSlide({ x, b }: { x: X; b: any }) {
  const tall = x.H > x.W;
  const frase = txt(b.frase_mae);
  const problema = clip(txt(b.problema), tall ? 260 : 320);
  const fw = txt(b.framework);
  const cam = camadas(fw);
  const nome = nomeMetodo(fw);
  const nao = arr(b.nao_e).slice(0, 6);
  const regras = arr(b.regras_ouro).slice(0, 5);
  const col = (l: string, body: ReactNode) => (
    <div style={{ borderTop: `2px solid ${x.ink}`, paddingTop: 14, minWidth: 0 }}>
      <Label x={x} style={{ marginBottom: 10 }}>{l}</Label>
      {body}
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: tall ? 22 : 28 }}>
      <div>
        <Label x={x}>Como a {x.name} pensa</Label>
        {frase && <h2 style={x.T({ fontSize: fit(frase, tall ? 52 : 60, tall ? 34 : 40, 40, 120), lineHeight: 1.02, marginTop: 12, maxWidth: tall ? "100%" : "80%" })}>{frase.replace(/\s*\(proposta\)\s*$/i, "")}</h2>}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: tall ? "1fr" : "1fr 1.25fr 1fr", gap: tall ? 18 : 40 }}>
        {problema && col("O que o mercado erra", <p style={x.B({ fontSize: fit(problema, 19, 15, 120, 320), lineHeight: 1.45 })}>{problema}</p>)}
        {(cam.length || fw) && col(nome ? `O método · ${nome}` : "O método", cam.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cam.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, alignItems: "baseline", borderBottom: `1px solid ${x.ink}22`, paddingBottom: 7 }}>
                <span style={x.T({ fontSize: 22, color: x.acc })}>{String(i + 1).padStart(2, "0")}</span>
                <div><p style={x.T({ fontSize: 22, lineHeight: 1.1 })}>{c.t}</p>{c.d && !tall && <p style={x.B({ fontSize: 13, opacity: .65, marginTop: 2 })}>{clip(c.d, 70)}</p>}</div>
              </div>
            ))}
          </div>
        ) : <p style={x.B({ fontSize: 16, lineHeight: 1.45 })}>{clip(fw, 260)}</p>)}
        {(nao.length || regras.length) > 0 && col(regras.length ? "Regras de ouro" : "O que a marca não é", (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {regras.map((r, i) => <p key={i} style={x.B({ fontSize: 16, lineHeight: 1.35, display: "flex", gap: 8 })}><span style={{ color: x.acc }}>—</span>{clip(r, 80)}</p>)}
            {nao.length > 0 && (
              <div style={{ marginTop: regras.length ? 8 : 0 }}>
                {regras.length > 0 && <Label x={x} style={{ marginBottom: 8, fontSize: 10 }}>Nunca vira</Label>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {nao.map((n) => <span key={n} style={x.B({ fontSize: 12, padding: "4px 10px", borderRadius: 99, border: `1px solid ${x.ink}40`, textDecoration: "line-through", opacity: .75 })}>{clip(n, 34)}</span>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Direção de conteúdo: estrutura de cada peça, fechamento, ritmo e sinais */
export function ContentDirSlide({ x, b }: { x: X; b: any }) {
  const tall = x.H > x.W;
  const est = txt(b.estrutura);
  const passos = est.split(/\.\s/)[0].split(/\s*(?:→|->)\s*/).map((s) => s.replace(/^\d+\s*/, "").trim()).filter(Boolean);
  const resto = est.includes(".") ? clip(est.slice(est.indexOf(".") + 1).trim(), 160) : "";
  const fech = clip(txt(b.fechamento), 220);
  const ritmo = clip(txt(b.ritmo), tall ? 260 : 340);
  const ind = arr(b.indicadores).slice(0, 6);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: tall ? 20 : 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", borderBottom: `2px solid ${x.ink}`, paddingBottom: 14 }}>
        <h2 style={x.T({ fontSize: tall ? 48 : 60, textTransform: "uppercase", lineHeight: .95 })}>Direção de conteúdo</h2>
        {!tall && <p style={x.B({ fontSize: 13, opacity: .6, textAlign: "right", maxWidth: 320 })}>Toda peça da {x.name} segue o mesmo caminho e é medida pelos mesmos sinais.</p>}
      </div>
      {passos.length >= 3 ? (
        <div>
          <Label x={x} style={{ marginBottom: 12 }}>Estrutura de cada peça</Label>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${tall ? Math.min(passos.length, 3) : passos.length}, 1fr)`, gap: 10 }}>
            {passos.slice(0, 6).map((p, i) => (
              <div key={i} style={{ background: i === passos.length - 1 ? x.ink : `${x.ink}0d`, color: i === passos.length - 1 ? x.paper : x.ink, borderRadius: 10, padding: "14px 14px 16px" }}>
                <p style={x.T({ fontSize: 18, color: i === passos.length - 1 ? x.paper : x.acc })}>{String(i + 1).padStart(2, "0")}</p>
                <p style={x.B({ fontSize: fit(p, 17, 13, 20, 60), lineHeight: 1.3, marginTop: 6, color: "inherit" })}>{clip(p, 60)}</p>
              </div>
            ))}
          </div>
          {resto && <p style={x.B({ fontSize: 14, opacity: .65, marginTop: 10 })}>{resto}</p>}
        </div>
      ) : est ? <div><Label x={x} style={{ marginBottom: 8 }}>Estrutura de cada peça</Label><p style={x.B({ fontSize: 17, lineHeight: 1.45 })}>{clip(est, 260)}</p></div> : null}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: tall ? "1fr" : "1fr 1.3fr 1fr", gap: tall ? 16 : 36 }}>
        {fech && <div style={{ borderTop: `1px solid ${x.ink}30`, paddingTop: 12 }}><Label x={x} style={{ marginBottom: 8 }}>Como fecha</Label><p style={x.T({ fontSize: fit(fech, 24, 17, 60, 220), lineHeight: 1.2 })}>{fech}</p></div>}
        {ritmo && <div style={{ borderTop: `1px solid ${x.ink}30`, paddingTop: 12 }}><Label x={x} style={{ marginBottom: 8 }}>Ritmo</Label><p style={x.B({ fontSize: fit(ritmo, 17, 13, 120, 340), lineHeight: 1.45 })}>{ritmo}</p></div>}
        {ind.length > 0 && (
          <div style={{ borderTop: `1px solid ${x.ink}30`, paddingTop: 12 }}>
            <Label x={x} style={{ marginBottom: 10 }}>Sinais de que funciona</Label>
            {ind.map((t, i) => <p key={t} style={x.T({ fontSize: 22, lineHeight: 1.15, padding: "6px 0", borderBottom: `1px solid ${x.ink}1f`, color: i === 0 ? x.acc : x.ink })}>{clip(t, 40)}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}
