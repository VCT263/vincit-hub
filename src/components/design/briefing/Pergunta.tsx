"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { shrink, uid } from "@/lib/design";
import { CORES, EIXOS_CLIENTE, ESTILOS, TIPOS_LOGO, type Q, type RefImg } from "@/lib/briefing-cliente";

/* Campos do briefing público, em tema claro editorial (papel + tinta), feitos para o dedo no celular. */

const box = "w-full bg-white/70 border border-[#d9d4cb] rounded-xl px-4 py-3 text-[16px] text-[#151515] placeholder:text-[#a39d93] outline-none focus:border-[#151515] transition-colors";
const pill = (on: boolean) => `px-3.5 py-2 rounded-full border text-[14px] transition-colors ${on ? "bg-[#151515] border-[#151515] text-[#f4f2ee]" : "border-[#d0cabf] text-[#3a3733] hover:border-[#151515]"}`;

function Tags({ value, onChange, ph, sugest, max }: { value: string[]; onChange: (v: string[]) => void; ph?: string; sugest?: string[]; max?: number }) {
  const [t, setT] = useState("");
  const full = !!max && value.length >= max;
  const add = (raw: string) => { const v = raw.trim(); if (v && !value.includes(v) && !full) onChange([...value, v]); setT(""); };
  return (
    <div className="space-y-3">
      {!!sugest?.length && (
        <div className="flex flex-wrap gap-2">
          {sugest.map((s) => { const on = value.includes(s); return <button key={s} type="button" onClick={() => (on ? onChange(value.filter((x) => x !== s)) : add(s))} className={pill(on)} disabled={!on && full}>{s}</button>; })}
        </div>
      )}
      <div className={`${box} flex flex-wrap gap-2 items-center !py-2.5`}>
        {value.filter((v) => !sugest?.includes(v)).map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 bg-[#151515] text-[#f4f2ee] rounded-full pl-3 pr-2 py-1 text-[14px]">{v}<button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Tirar ${v}`} className="opacity-70 hover:opacity-100 px-1">×</button></span>
        ))}
        <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(t); } }} onBlur={() => add(t)}
          placeholder={full ? `Máximo de ${max}` : sugest?.length ? "Outra? Escreva e aperte Enter" : ph} disabled={full} className="flex-1 min-w-32 bg-transparent outline-none text-[16px] py-1" enterKeyHint="done" />
      </div>
      {!!max && <p className="text-[12px] text-[#8a847a]">{value.length} de {max}</p>}
    </div>
  );
}

function Imagens({ value, onChange }: { value: RefImg[]; onChange: (v: RefImg[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function add(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    const novas: RefImg[] = [];
    for (const f of Array.from(files).filter((x) => x.type.startsWith("image/")).slice(0, Math.max(0, 16 - value.length))) {
      try { novas.push({ id: uid(), img: await shrink(f, 900, .78), tipo: "gosto" }); } catch {}
    }
    onChange([...value, ...novas]); setBusy(false);
  }
  const up = (r: RefImg, p: Partial<RefImg>) => onChange(value.map((x) => (x.id === r.id ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy || value.length >= 16}
        className="w-full border border-dashed border-[#bdb6aa] rounded-2xl py-8 text-center hover:border-[#151515] transition-colors">
        <span className="block font-medium text-[15px]">{busy ? "Preparando as imagens…" : "Escolher imagens"}</span>
        <span className="block text-[13px] text-[#8a847a] mt-1">Prints do Instagram, Pinterest, fotos. Até 16.</span>
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {value.map((r) => (
          <div key={r.id} className="bg-white/70 border border-[#d9d4cb] rounded-2xl overflow-hidden">
            <div className="relative bg-[#e9e5de]">
              <img src={r.img} alt="" className="w-full max-h-64 object-contain" />
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== r.id))} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-[#151515]/80 text-white text-lg leading-none" aria-label="Tirar imagem">×</button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => up(r, { tipo: "gosto" })} className={`${pill(r.tipo === "gosto")} !rounded-xl`}>Gosto</button>
                <button type="button" onClick={() => up(r, { tipo: "evitar" })} className={`${pill(r.tipo === "evitar")} !rounded-xl ${r.tipo === "evitar" ? "!bg-[#9b2c1f] !border-[#9b2c1f]" : ""}`}>Não gosto</button>
              </div>
              <input value={r.note || ""} onChange={(e) => up(r, { note: e.target.value })} placeholder={r.tipo === "gosto" ? "O que você gosta aqui?" : "O que incomoda aqui?"} className={`${box} !py-2.5 !text-[15px]`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cores({ value, onChange, other }: { value: string[]; onChange: (v: string[]) => void; other?: string[] }) {
  const [t, setT] = useState("");
  const tog = (n: string) => onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);
  const livres = value.filter((v) => !CORES.some((c) => c.n === v));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {CORES.map((c) => { const on = value.includes(c.n); const dis = other?.includes(c.n); return (
          <button key={c.n} type="button" onClick={() => tog(c.n)} disabled={dis} className={`rounded-xl p-1.5 text-left border transition-all ${on ? "border-[#151515] ring-1 ring-[#151515]" : "border-transparent"} ${dis ? "opacity-25" : ""}`} aria-pressed={on}>
            <span className="block h-11 rounded-lg border border-black/10" style={{ background: c.h }} />
            <span className="block text-[11.5px] mt-1 leading-tight text-[#3a3733]">{c.n}</span>
          </button>
        ); })}
      </div>
      <div className={`${box} flex flex-wrap gap-2 items-center !py-2.5`}>
        {livres.map((v) => <span key={v} className="inline-flex items-center gap-1.5 bg-[#151515] text-[#f4f2ee] rounded-full pl-3 pr-2 py-1 text-[14px]">{v}<button type="button" onClick={() => tog(v)} className="px-1 opacity-70">×</button></span>)}
        <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (t.trim()) tog(t.trim()); setT(""); } }} onBlur={() => { if (t.trim()) tog(t.trim()); setT(""); }} placeholder="Outra cor ou tom? Escreva" className="flex-1 min-w-32 bg-transparent outline-none text-[16px] py-1" />
      </div>
    </div>
  );
}

export default function Pergunta({ q, v, set, all }: { q: Q; v: any; set: (v: any) => void; all: any }) {
  const t = q.type || "text";
  return (
    <div>
      <label className="block text-[19px] md:text-[21px] leading-snug text-[#151515] font-medium">{q.l}{q.req && <span className="text-[#9b2c1f]"> *</span>}</label>
      {q.help && <p className="text-[14px] text-[#7a746a] mt-1.5 leading-relaxed">{q.help}</p>}
      <div className="mt-4">
        {t === "text" && <input value={v || ""} onChange={(e) => set(e.target.value)} placeholder={q.ph} className={box} />}
        {t === "textarea" && <textarea value={v || ""} onChange={(e) => set(e.target.value)} placeholder={q.ph} rows={4} className={`${box} resize-y leading-relaxed`} />}
        {t === "chips" && <Tags value={v || []} onChange={set} ph={q.ph} sugest={q.sugest} max={q.max} />}
        {t === "multi" && (
          <div className="flex flex-wrap gap-2">{q.options!.map((o) => { const on = (v || []).includes(o); return <button key={o} type="button" onClick={() => set(on ? v.filter((x: string) => x !== o) : [...(v || []), o])} className={pill(on)}>{o}</button>; })}</div>
        )}
        {t === "single" && (
          <div className="grid gap-2">{q.options!.map((o) => <button key={o} type="button" onClick={() => set(v === o ? "" : o)} className={`${pill(v === o)} !rounded-xl text-left !py-3.5 !px-4`}>{o}</button>)}</div>
        )}
        {t === "eixos" && (
          <div className="space-y-6">
            {Object.entries(EIXOS_CLIENTE).map(([k, [a, z]]) => { const n = v?.[k] ?? 50; return (
              <div key={k}>
                <div className="flex justify-between gap-4 text-[14px] mb-2"><span className={n < 40 ? "text-[#151515] font-semibold" : "text-[#8a847a]"}>{a}</span><span className={`text-right ${n > 60 ? "text-[#151515] font-semibold" : "text-[#8a847a]"}`}>{z}</span></div>
                <input type="range" min={0} max={100} value={n} onChange={(e) => set({ ...(v || {}), [k]: +e.target.value })} className="w-full h-8 accent-[#151515]" aria-label={`${a} ou ${z}`} />
              </div>
            ); })}
          </div>
        )}
        {t === "estilos" && (
          <div className="grid grid-cols-2 gap-2.5">
            {ESTILOS.map((e) => { const on = (v || []).includes(e.k); return (
              <button key={e.k} type="button" onClick={() => set(on ? v.filter((x: string) => x !== e.k) : [...(v || []), e.k])} aria-pressed={on}
                className={`rounded-2xl overflow-hidden text-left border-2 transition-all ${on ? "border-[#151515]" : "border-transparent"}`}>
                <span className="block h-24 relative px-3 pt-3" style={{ background: e.bg, color: e.fg }}>
                  <span className="block text-[26px] leading-none" style={{ fontFamily: `"${e.font}"`, fontWeight: e.w, fontStyle: e.it ? "italic" : "normal", textTransform: e.up ? "uppercase" : "none", letterSpacing: e.up ? ".04em" : "-.01em" }}>Marca</span>
                  <span className="absolute left-3 bottom-3 w-7 h-1.5 rounded-full" style={{ background: e.ac }} />
                  {on && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#151515] text-white grid place-items-center text-[13px]">✓</span>}
                </span>
                <span className="block bg-white/70 px-3 py-2"><span className="block text-[14px] font-medium text-[#151515]">{e.l}</span><span className="block text-[12px] text-[#8a847a]">{e.d}</span></span>
              </button>
            ); })}
          </div>
        )}
        {t === "logo" && (
          <div className="grid gap-2">
            {TIPOS_LOGO.map((o) => { const on = (v || []).includes(o.k); return (
              <button key={o.k} type="button" onClick={() => set(on ? v.filter((x: string) => x !== o.k) : [...(v || []), o.k])} className={`${pill(on)} !rounded-xl text-left !py-3 !px-4 flex items-center gap-4`}>
                <LogoIcon k={o.k} on={on} />
                <span><span className="block font-medium">{o.l}</span><span className={`block text-[12.5px] ${on ? "text-[#d6d1c8]" : "text-[#8a847a]"}`}>{o.d}</span></span>
              </button>
            ); })}
          </div>
        )}
        {t === "cores" && <Cores value={v || []} onChange={set} other={q.k === "cores_evita" ? all.cores_gosta : q.k === "cores_gosta" ? all.cores_evita : undefined} />}
        {t === "imagens" && <Imagens value={v || []} onChange={set} />}
      </div>
    </div>
  );
}

function LogoIcon({ k, on }: { k: string; on: boolean }) {
  const c = on ? "#f4f2ee" : "#151515";
  return (
    <svg viewBox="0 0 48 32" className="w-12 h-8 shrink-0" fill="none" stroke={c} strokeWidth="1.6">
      {k === "nome" && <text x="24" y="21" textAnchor="middle" fill={c} stroke="none" fontSize="13" fontFamily="Georgia, serif" fontStyle="italic">Nome</text>}
      {k === "simbolo" && <><circle cx="10" cy="16" r="6" /><path d="M21 13h20M21 19h14" /></>}
      {k === "iniciais" && <text x="24" y="23" textAnchor="middle" fill={c} stroke="none" fontSize="18" fontFamily="Georgia, serif">AG</text>}
      {k === "selo" && <><circle cx="24" cy="16" r="12" /><circle cx="24" cy="16" r="8.5" strokeDasharray="2 2" /></>}
      {k === "aberto" && <text x="24" y="22" textAnchor="middle" fill={c} stroke="none" fontSize="16">?</text>}
    </svg>
  );
}
