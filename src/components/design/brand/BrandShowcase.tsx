"use client";
import type { CSSProperties, ReactNode } from "react";
import { A, Avatar, Bg, Caps, Corners, GRAIN, LayoutArt, Lema, Logo, Phrase, Quote, Seal, Sizes, StatusBar, Stitch, Svg, mix, type Voice } from "./MockupArt";
import { SvgView } from "../ui";
import { grainBg } from "./grain";

/* A marca já em uso: protótipo do site (desktop e celular) e um feed de 9 posts do Instagram,
   montados com o mesmo sistema das aplicações (brandVoice). Entram no manual depois dos mockups. */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** o que a marca oferece, tirado do "o que faz" do briefing (lista entre parênteses ou depois dos dois-pontos) */
function offers(v: Voice): string[] {
  const o: string = v.b.oque || "";
  const src = o.match(/\(([^)]+,[^)]+)\)/)?.[1] || o.split(":")[1] || "";
  const list = src.replace(/\s+para\s[^,]*$/, "").replace(/\.$/, "").split(/,|\se\s/).map((x) => x.trim().replace(/\s+para\s.*$/, "").replace(/^(a|o)\s+nova\s+linha\s+/i, "").replace(/^(a|o)\s+/i, "")).filter((x) => x && x.length < 40);
  return (list.length >= 3 ? list : v.pilares).slice(0, 4).map(cap);
}
/** etapas de trabalho (produtora) ou valores (as outras) */
function steps(v: Voice): string[] {
  const dif: string = v.b.diferencial || "";
  const l = (dif.split(":")[1] || "").split(/,|\se\s/).map((x) => x.trim().replace(/\s+no\s.*$/, "").replace(/\.$/, "")).filter((x) => x && x.length < 30);
  return (l.length >= 3 ? l : (v.b.valores || v.pilares)).slice(0, 5).map(cap);
}
const ctaText = (v: Voice) => (v.biz === "moda" ? v.fala[2] || v.frase3 : "Vamos tirar a sua ideia do papel?");
const rules = (v: Voice): string[] => ((v.b.regras_ouro || []) as string[]).filter((r) => !/fundo|cor|luz|grão/i.test(r)).slice(0, 3);

/* ───────── Site (desktop, 1440 de largura) ───────── */
export const SITE_W = 1440;
const SEC = { hero: 900, manifesto: 760, ofertas: 860, processo: 600, insta: 620, cta: 520, rodape: 340 };
export const SITE_H = Object.values(SEC).reduce((a, b) => a + b, 0);

function Section({ h, bg, v, children, grain }: { h: number; bg: string; v: Voice; children: ReactNode; grain?: boolean }) {
  return <section style={{ position: "relative", height: h, overflow: "hidden" }}><Bg c={bg} v={v} grain={grain} />{children}</section>;
}

export function SitePage({ v }: { v: Voice }) {
  const { k } = v; const W = SITE_W; const m = 120; const bg = v.base; const fg = v.text; const hi = v.dark ? v.light : k.acc;
  const of = offers(v); const st = steps(v);
  const manif = ((v.b.manifesto as string) || "").split(/\n+/).filter(Boolean).slice(0, 6);
  const darkBand = v.dark ? v.soft : k.ink; const onBand = v.dark ? k.C["Claro"] : k.paper;
  return (
    <div style={{ width: W, height: SITE_H, position: "relative" }}>
      <div style={{ position: "relative", height: SEC.hero }}><LayoutArt v={v} kind="site" w={W} h={SEC.hero} /></div>
      {/* manifesto */}
      <Section h={SEC.manifesto} bg={v.dark ? mix(k.ink, "#ffffff", .04) : "#fffaf3"} v={v}>
        <div style={A({ left: m, top: 120, width: 560 })}>
          <Caps v={v} size={13} c={hi}>{v.biz === "moda" ? "Quem somos" : "Manifesto"}</Caps>
          {v.dark && <Quote v={v} size={180} c={hi} style={{ position: "relative", marginTop: 20 }} />}
          <Phrase v={v} text={v.frase} style={k.T({ fontSize: 64, color: fg, lineHeight: 1.04, marginTop: v.dark ? -40 : 30 })} />
          <div style={{ marginTop: 48 }}><Lema v={v} size={34} c={hi} tc={fg} /></div>
        </div>
        <div style={A({ left: 760, right: m, top: 150 })}>
          {(manif.length ? manif : [v.missao, v.dif]).map((t, i) => <p key={i} style={k.B({ fontSize: 19, lineHeight: 1.7, color: mix(fg, bg, .2), marginBottom: 18 })}>{t}</p>)}
          {v.stitch && <Stitch w={420} h={14} size={10} c={k.acc} frame={false} style={{ position: "relative", marginTop: 24 }} />}
        </div>
      </Section>
      {/* o que oferece */}
      <Section h={SEC.ofertas} bg={bg} v={v}>
        <div style={A({ left: m, right: m, top: 100, display: "flex", justifyContent: "space-between", alignItems: "flex-end" })}>
          <div><Caps v={v} size={13} c={hi}>{v.biz === "moda" ? "Coleções" : "O que fazemos"}</Caps><p style={k.T({ fontSize: 56, color: fg, marginTop: 14 })}>{v.biz === "moda" ? "Peça certa para cada dia" : v.pilares[0] || v.terrNome}</p></div>
          <span style={k.B({ fontSize: 15, color: fg, borderBottom: `1px solid ${fg}`, paddingBottom: 4 })}>{v.biz === "moda" ? "Ver a loja" : "Ver trabalhos"} →</span>
        </div>
        <div style={A({ left: m, right: m, top: 300, display: "grid", gridTemplateColumns: `repeat(${of.length}, 1fr)`, gap: 24 })}>
          {of.map((o, i) => {
            const tone = [k.acc, v.dark ? v.soft : k.ink, v.dark ? mix(k.ink, "#fff", .08) : mix(k.paper, k.acc, .15), k.acc][i % 4];
            const ink = tone === k.acc ? v.onAcc : tone === k.ink || tone === v.soft ? (v.dark ? v.light : k.paper) : fg;
            const pat = i === 3 ? k.pat(k.acc, v.dark ? mix(k.acc, k.ink, .3) : mix(k.acc, k.paper, .3), 300, 400) : "";
            return (
              <div key={o}>
                <div style={{ position: "relative", height: 420, background: tone, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover", overflow: "hidden" }}>
                  {v.dark && <div style={A({ inset: 0, backgroundImage: grainBg(GRAIN), opacity: .12, mixBlendMode: "screen" })} />}
                  {!pat && <Svg svg={k.mark(mix(ink, tone, .15))} style={{ right: -60, bottom: -60, width: 260, height: 260 }} />}
                  {v.corners && <Corners inset={18} len={26} th={2} c={mix(ink, tone, .4)} />}
                  <span style={k.B({ position: "absolute", left: 22, top: 20, fontSize: 13, letterSpacing: ".2em", color: ink })}>0{i + 1}</span>
                </div>
                <p style={k.T({ fontSize: 28, color: fg, marginTop: 18 })}>{o}</p>
                <p style={k.B({ fontSize: 14, color: mix(fg, bg, .4), marginTop: 6 })}>{v.biz === "moda" ? (v.sizes.length ? `Do ${v.sizes[0]} ao ${v.sizes[v.sizes.length - 1]}` : v.pilares[0]) : rules(v)[i % Math.max(1, rules(v).length)] || v.pilares[i % 3]}</p>
              </div>
            );
          })}
        </div>
      </Section>
      {/* processo ou valores */}
      <Section h={SEC.processo} bg={darkBand} v={v} grain={false}>
        <div style={A({ left: m, top: 100 })}><Caps v={v} size={13} c={v.dark ? v.light : mix(k.acc, k.paper, .4)}>{v.biz === "video" ? "Como trabalhamos" : "No que acreditamos"}</Caps><p style={k.T({ fontSize: 52, color: onBand, marginTop: 14, maxWidth: 760 })}>{v.biz === "video" ? v.mae : v.frase2}</p></div>
        <div style={A({ left: m, right: m, top: 360, display: "grid", gridTemplateColumns: `repeat(${st.length}, 1fr)`, gap: 20 })}>
          {st.map((s, i) => (
            <div key={s} style={{ borderTop: `1px solid ${mix(onBand, darkBand, .5)}`, paddingTop: 22, position: "relative" }}>
              <div style={{ position: "absolute", top: -7, left: 0, width: 13, height: 13 }}><SvgView svg={v.dot(v.dark ? v.light : k.acc)} className="w-full h-full" /></div>
              <span style={k.B({ fontSize: 13, color: mix(onBand, darkBand, .35), letterSpacing: ".2em" })}>0{i + 1}</span>
              <p style={k.T({ fontSize: 30, color: onBand, marginTop: 10 })}>{s}</p>
            </div>
          ))}
        </div>
      </Section>
      {/* Instagram */}
      <Section h={SEC.insta} bg={bg} v={v}>
        <div style={A({ left: m, top: 90, display: "flex", alignItems: "center", gap: 18 })}><Avatar v={v} size={58} /><div><p style={k.B({ fontSize: 20, fontWeight: 600, color: fg })}>{k.handle}</p><p style={k.B({ fontSize: 14, color: mix(fg, bg, .4) })}>No Instagram</p></div></div>
        <div style={A({ left: m, right: m, top: 200, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 })}>
          {[0, 1, 3, 4, 8].map((i) => <div key={i} style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden" }}><Scaled w={1080} h={1350} box={(SITE_W - 2 * m - 56) / 5}><Post9 v={v} i={i} /></Scaled></div>)}
        </div>
      </Section>
      {/* chamada */}
      <Section h={SEC.cta} bg={k.acc} v={v} grain={false}>
        {!v.dark && <div style={A({ inset: 0, backgroundImage: `url("${k.pat(k.acc, mix(k.acc, k.paper, .18), SITE_W, SEC.cta)}")`, backgroundSize: "cover", opacity: .5 })} />}
        <Svg svg={k.mark(v.dark ? mix(k.acc, k.ink, .18) : mix(k.acc, k.paper, .25))} style={{ right: -80, top: -120, width: 620, height: 620 }} />
        <div style={A({ left: m, top: 130, width: 820 })}>
          <p style={k.T({ fontSize: 64, color: v.onAcc, lineHeight: 1.05 })}>{ctaText(v)}</p>
          <span style={k.B({ display: "inline-block", marginTop: 40, padding: "18px 34px", borderRadius: 99, background: v.dark ? k.ink : k.paper, color: v.dark ? k.C["Claro"] : k.acc, fontSize: 17, fontWeight: 600 })}>{v.biz === "moda" ? "Chamar no WhatsApp" : "Fale com a gente"} →</span>
        </div>
      </Section>
      {/* rodapé */}
      <Section h={SEC.rodape} bg={k.ink} v={v}>
        <Logo svg={k.logo(v.dark ? k.C["Claro"] : k.paper)} h={52} style={{ left: m, top: 90 }} />
        <div style={A({ left: m, bottom: 70 })}><Lema v={v} size={26} c={v.dark ? v.light : mix(k.paper, k.ink, .2)} tc={mix(k.paper, k.ink, .3)} /></div>
        <div style={A({ right: m, top: 90, display: "grid", gridTemplateColumns: "repeat(2, 200px)", gap: 30 })}>
          <div><Caps v={v} size={11} c={mix(k.paper, k.ink, .45)}>Contato</Caps>{[k.handle, v.site, v.city].filter(Boolean).map((x) => <p key={x} style={k.B({ fontSize: 15, color: v.dark ? k.C["Claro"] : k.paper, marginTop: 10 })}>{x}</p>)}</div>
          <div><Caps v={v} size={11} c={mix(k.paper, k.ink, .45)}>{v.biz === "moda" ? "Loja" : "Navegue"}</Caps>{of.slice(0, 3).map((x) => <p key={x} style={k.B({ fontSize: 15, color: v.dark ? k.C["Claro"] : k.paper, marginTop: 10 })}>{x}</p>)}</div>
        </div>
      </Section>
    </div>
  );
}

/* ───────── Site no celular (390 de largura) ───────── */
export const MOB_W = 390;
export function SiteMobile({ v }: { v: Voice }) {
  const { k } = v; const bg = v.base; const fg = v.text; const hi = v.dark ? v.light : k.acc; const m = 24; const of = offers(v);
  return (
    <div style={{ width: MOB_W, position: "relative" }}>
      <section style={{ position: "relative", height: 844, overflow: "hidden" }}>
        <Bg c={bg} v={v} />
        <StatusBar v={v} w={MOB_W} c={fg} />
        <div style={A({ left: m, right: m, top: 62, display: "flex", justifyContent: "space-between", alignItems: "center" })}>
          <Logo svg={k.logo(fg)} h={24} style={{ position: "relative" }} />
          <span style={{ display: "grid", gap: 5 }}>{[0, 1, 2].map((i) => <i key={i} style={{ width: 22, height: 2, background: fg }} />)}</span>
        </div>
        {v.dark ? <Svg svg={k.mark(v.light)} style={{ right: -70, top: 120, width: 300, height: 300, filter: `drop-shadow(0 0 30px ${v.light}55)` }} />
          : <div style={A({ left: m, right: m, top: 120, height: 260, background: k.acc, backgroundImage: `url("${k.pat(k.acc, mix(k.acc, k.paper, .25), 342, 260)}")`, backgroundSize: "cover" })}><Seal v={v} size={120} c={k.acc} bg={k.paper} style={{ right: 14, bottom: 14 }} /></div>}
        <div style={A({ left: m, right: m, top: 420 })}>
          <Caps v={v} size={10} c={hi}>{v.terrNome}</Caps>
          <Phrase v={v} text={v.mae} style={k.T({ fontSize: 38, color: fg, lineHeight: 1.05, marginTop: 10 })} />
          <p style={k.B({ fontSize: 14, lineHeight: 1.6, color: mix(fg, bg, .3), marginTop: 16 })}>{v.missao.slice(0, 140)}{v.missao.length > 140 ? "…" : ""}</p>
          <span style={k.B({ display: "block", textAlign: "center", marginTop: 24, padding: "15px 0", borderRadius: 99, background: v.dark ? v.light : k.ink, color: v.dark ? k.ink : k.paper, fontSize: 15, fontWeight: 600 })}>{v.biz === "moda" ? "Ver coleção" : v.biz === "video" ? "Ver trabalhos" : "Conhecer"} →</span>
        </div>
      </section>
      <section style={{ position: "relative", height: 844, overflow: "hidden" }}>
        <Bg c={v.dark ? mix(k.ink, "#fff", .04) : "#fffaf3"} v={v} />
        <div style={A({ left: m, right: m, top: 50 })}>
          <Caps v={v} size={10} c={hi}>{v.biz === "moda" ? "Coleções" : "O que fazemos"}</Caps>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
            {of.map((o, i) => { const tone = i % 3 === 0 ? k.acc : v.dark ? v.soft : k.ink; const ink = tone === k.acc ? v.onAcc : v.dark ? v.light : k.paper; return (
              <div key={o}><div style={{ position: "relative", height: 150, background: tone, overflow: "hidden" }}><Svg svg={k.mark(mix(ink, tone, .2))} style={{ right: -30, bottom: -30, width: 130, height: 130 }} /></div><p style={k.T({ fontSize: 18, color: fg, marginTop: 8 })}>{o}</p></div>
            ); })}
          </div>
          {v.sizes.length > 0 && <><p style={k.B({ fontSize: 12, color: mix(fg, bg, .4), marginTop: 24 })}>Tamanhos</p><Sizes v={v} size={48} c={fg} fill={k.acc} pick={2} style={{ marginTop: 8 }} /></>}
        </div>
        <div style={A({ left: 0, right: 0, bottom: 0, height: 260, background: k.acc, padding: m })}>
          <p style={k.T({ fontSize: 28, color: v.onAcc, lineHeight: 1.1 })}>{ctaText(v)}</p>
          <span style={k.B({ display: "inline-block", marginTop: 18, padding: "12px 22px", borderRadius: 99, background: v.dark ? k.ink : k.paper, color: v.dark ? k.C["Claro"] : k.acc, fontSize: 14, fontWeight: 600 })}>{v.biz === "moda" ? "Chamar no WhatsApp" : "Fale com a gente"}</span>
        </div>
      </section>
    </div>
  );
}

/* ───────── Feed do Instagram: 9 posts 1080×1350 ───────── */
export function Post9({ v, i }: { v: Voice; i: number }) {
  const { k } = v; const W = 1080, H = 1350, m = 90; const hi = v.dark ? v.light : k.acc;
  const box: CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };
  const carousel = <div style={A({ right: 40, top: 40, width: 46, height: 46 })}><div style={A({ left: 10, top: 0, width: 36, height: 36, border: "4px solid #fff", borderRadius: 6, opacity: .9 })} /><div style={A({ left: 0, top: 10, width: 36, height: 36, border: "4px solid #fff", borderRadius: 6, background: "rgba(0,0,0,.15)" })} /></div>;
  switch (i % 9) {
    case 0: // manifesto: o sistema de posts da marca
      return <div style={box}><Bg c={v.base} v={v} />{v.dark ? <Quote v={v} size={360} c={hi} style={{ left: m, top: m }} /> : <Svg svg={v.dot(k.acc)} style={{ left: m, top: m + 20, width: 60, height: 60 }} />}<Phrase v={v} text={v.mae} style={k.T({ position: "absolute", left: m, right: m, top: 430, fontSize: 104, color: v.text, lineHeight: 1.03 })} /><Svg svg={v.stitch ? v.dot(hi) : k.mark(hi)} style={{ right: m, bottom: m, width: v.stitch ? 50 : 90, height: v.stitch ? 50 : 90 }} />{v.stitch && <Stitch w={W - 80} h={H - 80} size={16} c={k.acc} style={{ left: 40, top: 40 }} />}</div>;
    case 1: { // carrossel: pilar 01
      const fg = v.onAcc;
      return <div style={box}><Bg c={k.acc} v={v} grain={false} /><p style={k.T({ position: "absolute", left: m - 20, top: 30, fontSize: 560, color: v.dark ? mix(k.acc, k.ink, .18) : mix(k.acc, k.paper, .22), lineHeight: 1 })}>01</p><div style={A({ left: m, right: m, bottom: m * 1.4 })}><Caps v={v} size={26} c={fg}>Pilar 01</Caps><p style={k.T({ fontSize: 110, color: fg, lineHeight: 1.02, marginTop: 20 })}>{v.pilares[0] || v.terrNome}</p><Caps v={v} size={22} c={fg} style={{ marginTop: 40, opacity: .7 }}>Arraste →</Caps></div>{carousel}</div>;
    }
    case 2: { // grafismo + nome
      const pat = k.pat(v.dark ? k.ink : k.paper, hi, W, H);
      return <div style={{ ...box, background: v.base, backgroundImage: pat ? `url("${pat}")` : undefined, backgroundSize: "cover" }}><div style={A({ left: 200, right: 200, top: 520, height: 310, background: v.base, display: "grid", placeItems: "center" })}><Logo svg={k.logo(v.text)} h={110} style={{ position: "relative" }} /></div></div>;
    }
    case 3: // bastidor (produtora) ou grade de tamanhos (moda)
      if (v.biz === "video") return (
        <div style={box}>
          <div style={A({ inset: 0, background: `radial-gradient(70% 55% at 55% 45%, ${mix(v.soft, k.ink, .3)}, ${k.ink} 75%)` })} />
          <div style={A({ left: "-20%", top: "-10%", width: "60%", height: "130%", transform: "rotate(20deg)", background: `linear-gradient(90deg, transparent, ${v.light}22 45%, ${v.light}3a 50%, ${v.light}22 55%, transparent)`, filter: "blur(30px)" })} />
          <div style={A({ inset: 0, backgroundImage: grainBg(GRAIN), opacity: .2, mixBlendMode: "screen" })} />
          <Corners inset={70} len={90} th={6} c={v.light} />
          <span style={k.B({ position: "absolute", left: 110, top: 110, fontSize: 30, color: k.C["Claro"], letterSpacing: ".15em", display: "flex", alignItems: "center", gap: 14 })}><i style={{ width: 22, height: 22, borderRadius: 99, background: "#ff3b30" }} />REC</span>
          <Caps v={v} size={24} c={v.light} style={{ position: "absolute", left: 110, bottom: 300 }}>Bastidor</Caps>
          <Phrase v={v} text={v.frase2} style={k.T({ position: "absolute", left: 110, right: 110, bottom: 130, fontSize: 84, color: k.C["Claro"], lineHeight: 1.05 })} />
        </div>
      );
      return <div style={box}><Bg c={k.paper} v={v} grain={false} /><Caps v={v} size={26} c={k.acc} style={{ position: "absolute", left: m, top: m * 1.4 }}>{v.pilares[0] || "Tamanhos"}</Caps><p style={k.T({ position: "absolute", left: m, right: m, top: 260, fontSize: 104, color: k.ink, lineHeight: 1.04 })}>{v.frase2}</p>{v.sizes.length > 0 && <Sizes v={v} size={150} c={k.ink} fill={k.acc} pick={2} style={{ position: "absolute", left: m, bottom: m * 2.2 }} />}<Stitch w={W - 2 * m} h={20} size={14} c={k.acc} frame={false} style={{ left: m, bottom: m }} /></div>;
    case 4: { // palavra gigante cortada + microtexto
      const w = v.kw(v.frase);
      return <div style={box}><Bg c={v.base} v={v} /><p style={k.T({ position: "absolute", left: -40, top: 360, fontSize: 470, color: hi, lineHeight: .9, whiteSpace: "nowrap", letterSpacing: "-.03em" })}>{w}</p><p style={k.B({ position: "absolute", left: m, bottom: m * 1.3, width: 520, fontSize: 30, lineHeight: 1.45, color: v.text })}>{v.frase}</p><Caps v={v} size={20} c={mix(v.text, v.base, .4)} style={{ position: "absolute", right: m, bottom: m * 1.3 }}>{k.handle}</Caps></div>;
    }
    case 5: { // regras da casa
      const r = rules(v); const list = r.length ? r : v.pilares;
      return <div style={box}><Bg c={v.dark ? mix(k.ink, "#fff", .05) : "#fffaf3"} v={v} /><Caps v={v} size={26} c={hi} style={{ position: "absolute", left: m, top: m * 1.4 }}>{v.biz === "moda" ? "Do nosso jeito" : "Regras da casa"}</Caps><div style={A({ left: m, right: m, top: 300 })}>{list.slice(0, 3).map((x, j) => <div key={j} style={{ display: "flex", gap: 34, alignItems: "baseline", borderTop: `2px solid ${mix(v.text, v.base, .8)}`, padding: "40px 0" }}><span style={k.B({ fontSize: 30, color: hi, fontWeight: 600 })}>0{j + 1}</span><p style={k.T({ fontSize: 66, color: v.text, lineHeight: 1.06 })}>{x}</p></div>)}</div>{carousel}</div>;
    }
    case 6: { // segunda frase na cor de apoio
      const bg = v.dark ? v.soft : k.ink; const fg = v.dark ? v.light : k.paper;
      return <div style={box}><Bg c={bg} v={v} grain={false} />{v.dark && <div style={A({ inset: 0, backgroundImage: grainBg(GRAIN), opacity: .14, mixBlendMode: "screen" })} />}<p style={k.T({ position: "absolute", left: m, right: m, top: 420, fontSize: 84, color: fg, lineHeight: 1.08 })}>{v.b.proposito || v.frase3}</p><Logo svg={k.logo(fg)} h={50} style={{ left: m, bottom: m }} /></div>;
    }
    case 7: // lema + símbolo
      return <div style={box}><Bg c={v.base} v={v} /><Svg svg={k.mark(hi)} style={{ left: 330, right: 330, top: 220, height: 420 }} /><div style={A({ left: m, right: m, top: 760 })}><Lema v={v} size={100} c={v.text} tc={hi} align="center" /></div>{v.corners && <Corners inset={60} len={80} th={4} c={mix(v.text, v.base, .6)} />}</div>;
    default: { // chamada para ação
      return <div style={box}><Bg c={k.acc} v={v} grain={false} /><Svg svg={k.mark(v.dark ? mix(k.acc, k.ink, .15) : mix(k.acc, k.paper, .22))} style={{ right: -200, bottom: -160, width: 900, height: 900 }} /><p style={k.T({ position: "absolute", left: m, right: m * 2, top: 260, fontSize: 96, color: v.onAcc, lineHeight: 1.05 })}>{ctaText(v)}</p><span style={k.B({ position: "absolute", left: m, bottom: m * 1.6, padding: "28px 48px", borderRadius: 99, background: v.dark ? k.ink : k.paper, color: v.dark ? k.C["Claro"] : k.acc, fontSize: 34, fontWeight: 600 })}>{v.biz === "moda" ? "Chama no WhatsApp" : "Link na bio"} →</span></div>;
    }
  }
}

/** desenha um bloco de w×h encaixado na largura box */
export function Scaled({ w, h, box, children }: { w: number; h: number; box: number; children: ReactNode }) {
  const s = box / w;
  return <div style={{ position: "relative", width: box, height: h * s, overflow: "hidden" }}><div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: "0 0" }}>{children}</div></div>;
}

/* ───────── páginas do manual ───────── */
const browserBar = (v: Voice, w: number) => (
  <div style={{ height: 40, background: "#e9e9e7", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((c) => <i key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
    <span style={v.k.B({ marginLeft: 20, flex: 1, maxWidth: w * .45, background: "#fff", borderRadius: 8, fontSize: 13, color: "#555", padding: "5px 14px" })}>{v.site}</span>
  </div>
);

/** página do manual: o site na tela do computador, rolado até offset */
export function SiteDesktopSlide({ v, W, H, offset = 0, label }: { v: Voice; W: number; H: number; offset?: number; label: string }) {
  const bw = W * .78; const s = bw / SITE_W; const vh = (H * .8 - 40) / s;
  return (
    <div style={{ position: "absolute", inset: 0, background: v.dark ? "#0b0b0b" : mix(v.k.paper, "#000", .06), overflow: "hidden" }}>
      <div style={A({ left: (W - bw) / 2, top: H * .07, width: bw, borderRadius: 12, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,0,0,.35)" })}>
        {browserBar(v, bw)}
        <div style={{ position: "relative", height: vh * s, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: -offset * s, width: SITE_W, transform: `scale(${s})`, transformOrigin: "0 0" }}><SitePage v={v} /></div>
        </div>
      </div>
      <p style={v.k.B({ position: "absolute", left: W * .11, bottom: H * .035, fontSize: H * .018, letterSpacing: ".22em", textTransform: "uppercase", color: v.dark ? "#ffffff99" : "#00000088" })}>{label}</p>
    </div>
  );
}

/** página do manual: a página inteira de cima a baixo + o celular */
export function SiteFullSlide({ v, W, H }: { v: Voice; W: number; H: number }) {
  const ph = H * .86; const s = ph / SITE_H; const pw = SITE_W * s;
  const mob = H * .7; const ms = mob / 844; const mw = MOB_W * ms;
  return (
    <div style={{ position: "absolute", inset: 0, background: v.dark ? "#0b0b0b" : mix(v.k.paper, "#000", .06), overflow: "hidden" }}>
      <div style={A({ left: W * .08, top: H * .07, width: pw, height: ph, boxShadow: "0 30px 70px rgba(0,0,0,.3)", overflow: "hidden" })}><div style={{ width: SITE_W, transform: `scale(${s})`, transformOrigin: "0 0" }}><SitePage v={v} /></div></div>
      {[0, 1].map((j) => (
        <div key={j} style={A({ left: W * .08 + pw + W * .05 + j * (mw + W * .035), top: H * .07, width: mw + 16, height: mob + 16, borderRadius: 44 * ms + 8, background: "#111", padding: 8, boxShadow: "0 30px 60px rgba(0,0,0,.35)" })}>
          <div style={{ width: mw, height: mob, borderRadius: 44 * ms, overflow: "hidden", position: "relative" }}><div style={{ position: "absolute", top: -j * 844 * ms, width: MOB_W, transform: `scale(${ms})`, transformOrigin: "0 0" }}><SiteMobile v={v} /></div></div>
        </div>
      ))}
      <div style={A({ right: W * .05, bottom: H * .03, textAlign: "right", width: W * .42 })}>
        <p style={v.k.B({ fontSize: H * .018, letterSpacing: ".22em", textTransform: "uppercase", color: v.dark ? "#ffffff99" : "#00000088" })}>Site · página inicial e celular</p>
        <p style={v.k.B({ fontSize: H * .022, lineHeight: 1.45, marginTop: 6, color: v.dark ? "#ffffffcc" : "#000000aa" })}>Abre com a frase-mãe, mostra {v.biz === "moda" ? "as coleções e a grade de tamanhos" : "o que a marca faz e como trabalha"}, puxa o Instagram e fecha chamando para a conversa.</p>
      </div>
    </div>
  );
}

/** página do manual: perfil do Instagram com o feed de 9 posts */
export function FeedSlide({ v, W, H }: { v: Voice; W: number; H: number }) {
  const { k } = v; const gw = H * .84 * (3 * 4) / (3 * 5); const cell = (gw - 8) / 3; const bg = v.dark ? "#0b0b0b" : "#ffffff"; const fg = v.dark ? "#f2f2f2" : "#111";
  return (
    <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={A({ left: W * .07, top: H * .1, width: W * .3 })}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}><Avatar v={v} size={H * .12} /><div><p style={k.B({ fontSize: H * .028, fontWeight: 600, color: fg })}>{k.handle.slice(1)}</p><p style={k.B({ fontSize: H * .02, color: mix(fg, bg, .45), marginTop: 4 })}>9 publicações</p></div></div>
        <p style={k.B({ fontSize: H * .022, fontWeight: 600, color: fg, marginTop: H * .04 })}>{k.name}</p>
        <p style={k.B({ fontSize: H * .02, color: mix(fg, bg, .45) })}>{v.biz === "video" ? "Produtora audiovisual" : v.biz === "moda" ? "Loja de roupas femininas" : "Empresa"}</p>
        <p style={k.B({ fontSize: H * .021, lineHeight: 1.5, color: fg, marginTop: 8 })}>{v.mae}{v.city ? <><br />{v.city}</> : null}</p>
        <p style={k.B({ fontSize: H * .021, color: v.dark ? v.light : k.acc, marginTop: 4 })}>{v.site}</p>
        <div style={{ display: "flex", gap: H * .025, marginTop: H * .045 }}>
          {(v.pilares.length ? v.pilares : offers(v)).slice(0, 4).map((p, i) => (
            <div key={p} style={{ width: H * .085, textAlign: "center" }}>
              <div style={{ width: H * .085, height: H * .085, borderRadius: 99, border: `2px solid ${mix(fg, bg, .7)}`, padding: 4 }}><div style={{ width: "100%", height: "100%", borderRadius: 99, background: i % 2 ? (v.dark ? k.ink : k.paper) : k.acc, position: "relative" }}><Svg svg={i % 2 ? v.dot(v.dark ? v.light : k.acc) : k.mark(v.onAcc)} style={{ inset: "28%" }} /></div></div>
              <p style={k.B({ fontSize: H * .014, color: fg, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{p.split(" ")[0]}</p>
            </div>
          ))}
        </div>
        <p style={k.B({ fontSize: H * .018, letterSpacing: ".22em", textTransform: "uppercase", color: mix(fg, bg, .45), marginTop: H * .12 })}>Instagram · feed de lançamento</p>
        <p style={k.B({ fontSize: H * .021, lineHeight: 1.45, color: mix(fg, bg, .25), marginTop: 6 })}>Nove posts que alternam frase, pilar, grafismo, {v.biz === "video" ? "bastidor" : "tamanhos"}, palavra-chave, regras, lema e chamada, na proporção de cores do manual.</p>
      </div>
      <div style={A({ right: W * .07, top: H * .08, width: gw, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 })}>
        {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ position: "relative", overflow: "hidden" }}><Scaled w={1080} h={1350} box={cell}><Post9 v={v} i={i} /></Scaled></div>)}
      </div>
    </div>
  );
}

/** página do manual: três posts em tamanho real lado a lado */
export function PostsSlide({ v, W, H, ids = [0, 3, 8] }: { v: Voice; W: number; H: number; ids?: number[] }) {
  const pw = W * .27; const g = W * .03; const left = (W - (pw * 3 + g * 2)) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, background: v.dark ? "#0b0b0b" : mix(v.k.paper, "#000", .06), overflow: "hidden" }}>
      {ids.map((id, j) => <div key={id} style={A({ left: left + j * (pw + g), top: (H - pw * 1.25) / 2 - H * .03, boxShadow: "0 30px 60px rgba(0,0,0,.3)" })}><Scaled w={1080} h={1350} box={pw}><Post9 v={v} i={id} /></Scaled></div>)}
      <p style={v.k.B({ position: "absolute", left, bottom: H * .04, fontSize: H * .018, letterSpacing: ".22em", textTransform: "uppercase", color: v.dark ? "#ffffff99" : "#00000088" })}>Instagram · posts em 4:5</p>
    </div>
  );
}
