"use client";
import { useEffect } from "react";
import { loadFonts } from "@/lib/design";
import { archetypeOf, TONE_AXES } from "@/lib/brand-strategy";

/**
 * Resumo da marca na ficha do perfil (28/11, pedido do Vinícius): leitura rápida do manual
 * para lembrar o cliente de como a marca fala. Só LÊ design_projects.data (brief, verbal, strategy,
 * palette, type); nada é copiado. Para mudar, edita-se o manual no Design.
 */

const arr = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : v ? String(v).split(/\n+/).filter(Boolean) : []);

/** "40% amiga que atende (próxima, ...)" → { p: 40, nome: "amiga que atende", sub: "próxima, ..." } */
function mistura(txt?: string) {
  return arr(txt).map((l) => {
    const m = l.match(/^\s*(\d{1,3})\s*%\s*([^(]+?)\s*(?:\((.*)\))?\s*$/);
    return m ? { p: Number(m[1]), nome: m[2].trim(), sub: (m[3] || "").trim() } : null;
  }).filter(Boolean) as { p: number; nome: string; sub: string }[];
}

function Secao({ titulo, children, className = "" }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 md:p-5 min-w-0 ${className}`}>
      <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-3">{titulo}</p>
      {children}
    </section>
  );
}

export default function ResumoMarca({ d, nome }: { d: any; nome: string }) {
  const b = d.brief || {};
  const v = d.verbal || {};
  const s = d.strategy || {};
  const pal: any[] = d.palette || [];
  const cor = (r: string) => pal.find((p) => p.role === r)?.hex;
  const destaque = cor("Primária") || "var(--color-mint)";
  const claro = cor("Claro") || "#f1f1f1";
  const escuro = cor("Escuro") || "#151517";
  const fTitulo = d.type?.title as string | undefined;
  useEffect(() => { if (fTitulo) loadFonts([fTitulo]); }, [fTitulo]);

  const mix = mistura(b.matriz_tom);
  const tons = v.tom ? TONE_AXES.filter(([k]) => typeof v.tom[k] === "number") : [];
  const arqs: string[] = s.arquetipos || [];
  const pesos: number[] = s.pesos || [];
  const somos: any[] = v.somos || [];
  const usamos = arr(v.usamos).length ? arr(v.usamos) : arr(b.palavras);
  const evitamos = Array.from(new Set([...arr(v.evitamos), ...(arr(v.evitamos).length ? [] : arr(b.nunca))]));
  const trocas: any[] = (v.trocas || []).slice(0, 4);
  const regras = arr(b.regras_ouro);
  const pilares = arr(b.pilares);
  const canais: any[] = v.canais || [];
  const frase = b.frase_mae || v.posicionamento?.categoria || b.slogan;
  const tem = frase || mix.length || tons.length || arqs.length || usamos.length || regras.length;
  if (!tem) return null;

  // tons de opacidade da cor de destaque para separar as fatias da mistura
  const fatia = (i: number) => `color-mix(in srgb, ${destaque} ${[100, 72, 48, 28, 16][i] ?? 16}%, ${escuro})`;

  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] text-mint tracking-widest uppercase mb-2">Como a {nome} se comunica</p>

      {/* cartão nas cores da marca: a frase que resume tudo */}
      {frase && (
        <div className="rounded-2xl p-5 md:p-7 mb-2" style={{ background: claro, color: escuro }}>
          <p className="text-[22px] md:text-[30px] leading-[1.15] font-bold" style={{ fontFamily: fTitulo ? `"${fTitulo}", serif` : undefined }}>{frase}</p>
          {b.slogan && b.slogan !== frase && <p className="mt-2 text-sm italic opacity-80">{b.slogan}</p>}
          {arr(b.palavras).length > 0 && (
            <p className="mt-4 text-[13px] font-semibold flex flex-wrap gap-x-3 gap-y-1">
              {arr(b.palavras).map((p) => <span key={p} className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rotate-45" style={{ background: destaque }} />{p}</span>)}
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-2">
        {(tons.length > 0 || mix.length > 0) && (
          <Secao titulo="Tom de voz">
            {mix.length > 0 && (
              <div className="mb-4">
                <div className="flex h-3 rounded-full overflow-hidden" role="img" aria-label={mix.map((m) => `${m.p}% ${m.nome}`).join(", ")}>
                  {mix.map((m, i) => <span key={i} style={{ width: `${m.p}%`, background: fatia(i) }} />)}
                </div>
                <ul className="mt-3 space-y-2">
                  {mix.map((m, i) => (
                    <li key={i} className="flex gap-2.5 text-sm min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm mt-1 shrink-0" style={{ background: fatia(i) }} />
                      <span className="min-w-0"><span className="font-mono text-xs text-fog mr-1.5">{m.p}%</span><span className="font-semibold first-letter:uppercase inline-block">{m.nome}</span>{m.sub && <span className="block text-xs text-fog">{m.sub}</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tons.length > 0 && (
              <div className="space-y-3">
                {tons.map(([k, a, z]) => {
                  const x = Math.max(0, Math.min(100, v.tom[k]));
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs"><span className={x <= 50 ? "text-paper font-semibold" : "text-fog"}>{a}</span><span className={x > 50 ? "text-paper font-semibold" : "text-fog"}>{z}</span></div>
                      <div className="relative h-1.5 bg-panel2 rounded-full mt-1.5">
                        <span className="absolute top-1/2 w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 ring-2 ring-[var(--color-panel)]" style={{ left: `${x}%`, background: destaque }} />
                      </div>
                      {v.tom_porque?.[k] && <p className="text-xs text-fog mt-1.5">{v.tom_porque[k]}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Secao>
        )}

        {(arqs.length > 0 || somos.length > 0) && (
          <Secao titulo="Personalidade">
            {arqs.length > 0 && (
              <div className="space-y-3 mb-4">
                {arqs.map((k, i) => {
                  const p = pesos[i];
                  return (
                    <div key={k}>
                      <div className="flex items-baseline justify-between gap-2"><span className="font-semibold text-sm">{archetypeOf(k)?.l || k}</span>{typeof p === "number" && <span className="font-mono text-xs text-fog">{p}%</span>}</div>
                      {typeof p === "number" && <div className="h-1.5 bg-panel2 rounded-full mt-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p}%`, background: fatia(i) }} /></div>}
                      {v.arquetipos?.[k] && <p className="text-xs text-fog mt-1.5 line-clamp-2">{v.arquetipos[k]}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {somos.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {somos.map((r, i) => (
                  <li key={i} className="py-2 flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold">{r.somos}</span><span className="text-xs text-fog text-right">mas não {r.nao}</span></li>
                ))}
              </ul>
            )}
          </Secao>
        )}

        {(usamos.length > 0 || evitamos.length > 0 || trocas.length > 0) && (
          <Secao titulo="Diga e evite">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs text-mint mb-1.5">Usamos</p>
                <div className="flex flex-wrap gap-1">{usamos.map((w) => <span key={w} className="chip text-paper">{w}</span>)}</div>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-danger mb-1.5">Evitamos</p>
                <div className="flex flex-wrap gap-1">{evitamos.map((w) => <span key={w} className="chip line-through decoration-danger/60">{w}</span>)}</div>
              </div>
            </div>
            {trocas.length > 0 && (
              <ul className="space-y-2.5 border-t border-line pt-3">
                {trocas.map((t, i) => (
                  <li key={i} className="text-sm">
                    <span className="block text-xs text-fog line-through">{t.em_vez}</span>
                    <span className="block">{t.dizemos}</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        )}

        {(regras.length > 0 || pilares.length > 0 || canais.length > 0) && (
          <Secao titulo="Como a marca funciona">
            {regras.length > 0 && (
              <ol className="space-y-2 mb-4">
                {regras.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm"><span className="font-mono text-xs mt-0.5 w-4 shrink-0" style={{ color: destaque }}>{i + 1}</span><span>{r}</span></li>
                ))}
              </ol>
            )}
            {pilares.length > 0 && <p className="text-xs text-fog mb-3">Pilares: <span className="text-paper">{pilares.join(" · ")}</span></p>}
            {canais.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {canais.map((c, i) => (
                  <li key={i} className="py-2 text-sm"><span className="font-semibold">{c.canal}</span><span className="block text-xs text-fog mt-0.5">{c.como}</span></li>
                ))}
              </ul>
            )}
          </Secao>
        )}
      </div>
    </div>
  );
}
