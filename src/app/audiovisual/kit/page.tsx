"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  CAMERA_LEVELS, DEFAULT_KIT, FONTS, FONTS_CSS, H, W, captionScreens, cameraAt, drawOverlays, mergeKit, speechCamera,
  type Kit, type Project,
} from "@/lib/editor/model";

type Row = { id?: string; name: string; account_id?: string | null; data: Kit };

const EMPTY: Row = { name: "", data: { ...structuredClone(DEFAULT_KIT), mogrts: { legenda: "", gancho: "", cta: "", lower_third: "" } } };

const ESTILOS = [
  ["impacto", "Impacto", "Caixa alta, palavra que está sendo dita em destaque"],
  ["caixa", "Caixa", "Caixa colorida atrás da palavra"],
  ["editorial", "Editorial", "Serifada e discreta"],
  ["documental", "Documental", "Faixa simples, ritmo calmo"],
];
const PESOS = ["", " Bold", " ExtraBold", " Black"];
const FONTS_LOAD = ['400 40px "Anton"', '900 40px "Inter"', '800 40px "Inter"', '700 40px "Inter"', '400 40px "Archivo Black"', 'italic 400 40px "Instrument Serif"', '400 40px "Bebas Neue"', '900 40px "Montserrat"', '900 40px "Poppins"', '800 40px "Bricolage Grotesque"'];

/* frase de exemplo da prévia, com tempo por palavra */
const SAMPLE = "Você está perdendo 70% das vendas! Sabe por quê? Porque ninguém explicou o produto direito.".split(" ");
const sampleWords = (() => {
  let t = 0.3;
  return SAMPLE.map((w, i) => {
    const d = 0.16 + w.length * 0.035;
    const out = { start: t, end: t + d, t: w, key: `s:${i}` };
    t += d + (/[!?.]$/.test(w) ? 0.55 : 0.06);
    return out;
  });
})();
const SAMPLE_LEN = sampleWords[sampleWords.length - 1].end + 0.8;

export default function KitPage() {
  const [kits, setKits] = useState<Row[] | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; username: string }[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState<"gancho" | "cta" | "lower_third">("gancho");

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: k }, { data: p }] = await Promise.all([
      s.from("av_style_kits").select("id,name,account_id,data").order("updated_at", { ascending: false }),
      s.from("ig_accounts").select("id,username"),
    ]);
    setKits((k as Row[]) || []);
    setProfiles(p || []);
  }, []);
  useEffect(() => {
    load();
    if (document.fonts) FONTS_LOAD.forEach((f) => document.fonts.load(f).catch(() => {}));
  }, [load]);

  async function save() {
    if (!edit) return;
    if (!edit.name.trim()) { setMsg("Dê um nome ao kit."); return; }
    const s = createClient();
    const row = { name: edit.name.trim(), account_id: edit.account_id || null, data: edit.data, updated_at: new Date().toISOString() };
    const { data, error } = edit.id ? await s.from("av_style_kits").update(row).eq("id", edit.id).select("id").single() : await s.from("av_style_kits").insert(row).select("id").single();
    if (error) { setMsg(error.message); return; }
    setEdit({ ...edit, id: data?.id || edit.id });
    setMsg("Kit salvo. Ele já aparece no Editor, no Premiere e para o Claude.");
    load();
  }
  async function del(id: string) {
    if (!confirm("Apagar este kit?")) return;
    await createClient().from("av_style_kits").delete().eq("id", id);
    setEdit(null); load();
  }
  const set = (path: string[], v: any) => setEdit((e) => {
    if (!e) return e;
    const data: any = structuredClone(e.data || {});
    let o = data;
    for (const k of path.slice(0, -1)) o = o[k] = o[k] || {};
    o[path[path.length - 1]] = v;
    return { ...e, data };
  });
  const open = (k: Row) => { setMsg(null); setEdit(structuredClone({ ...k, data: { ...mergeKit(k.data), mogrts: { ...EMPTY.data.mogrts, ...(k.data?.mogrts || {}) } } })); };
  const d = edit ? mergeKit(edit.data) : null;

  return (
    <>
      <link rel="stylesheet" href={FONTS_CSS} />
      <PageHead kicker="AUDIOVISUAL · ACERVO" title="Kit de estilo"
        desc="A identidade de edição de cada cliente: cores, fontes, legenda, ritmo de corte e câmera. O Editor, o Premiere e o Claude seguem o kit." />

      {msg && <p className="text-sm text-mint mb-4">{msg}</p>}

      {!edit && (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-display text-lg font-extrabold">Kits</p>
            <button onClick={() => open(structuredClone(EMPTY))} className="chip"><I.plus className="w-3.5 h-3.5" />Novo kit</button>
          </div>
          {!kits ? <p className="text-sm text-fog mt-4">Carregando…</p> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {kits.map((k) => (
                <button key={k.id} onClick={() => open(k)} className="text-left rounded-xl border border-line p-4 hover:border-mint-dim">
                  <KitThumb kit={mergeKit(k.data)} />
                  <p className="font-semibold mt-3">{k.name}</p>
                  <p className="text-xs text-fog mt-0.5">{k.data?.fontes?.titulo} · {k.data?.fontes?.legenda} · {k.data?.legenda?.estilo} · câmera {CAMERA_LEVELS[mergeKit(k.data).camera?.intensidade ?? 0].toLowerCase()}</p>
                  {k.account_id && <p className="text-xs text-mint mt-1">@{profiles.find((p) => p.id === k.account_id)?.username}</p>}
                </button>
              ))}
              {!kits.length && <p className="text-sm text-fog">Nenhum kit ainda. Crie aqui ou peça ao Claude: &quot;crie o kit de estilo da ISYS&quot;.</p>}
            </div>
          )}
        </section>
      )}

      {edit && d && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <section className="card p-5 space-y-5 min-w-0">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome do kit"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="ISYS · Impacto amarelo" /></Field>
              <Field label="Perfil">
                <select className="input" value={edit.account_id || ""} onChange={(e) => setEdit({ ...edit, account_id: e.target.value || null })}>
                  <option value="">Nenhum</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
                </select>
              </Field>
            </div>

            <Group title="Cores">
              <div className="grid grid-cols-3 gap-3">
                {([["destaque", "Destaque"], ["texto", "Texto"], ["fundo", "Fundo"]] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 rounded-xl border border-line p-2">
                    <input type="color" className="w-9 h-9 rounded-lg bg-transparent shrink-0" value={(d.cores as any)?.[k] || "#000000"} onChange={(e) => set(["cores", k], e.target.value)} />
                    <span className="min-w-0"><span className="block text-xs text-fog">{l}</span><span className="block font-mono text-xs uppercase">{(d.cores as any)?.[k]}</span></span>
                  </label>
                ))}
              </div>
            </Group>

            <Group title="Tipografia">
              <div className="grid sm:grid-cols-2 gap-3">
                <FontPick label="Títulos e gancho" value={d.fontes?.titulo || "Anton"} onChange={(v) => set(["fontes", "titulo"], v)} />
                <FontPick label="Legenda" value={d.fontes?.legenda || "Inter Black"} onChange={(v) => set(["fontes", "legenda"], v)} />
              </div>
            </Group>

            <Group title="Legenda">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ESTILOS.map(([v, l, h]) => (
                  <button key={v} onClick={() => set(["legenda", "estilo"], v)} className={`text-left rounded-xl border p-2.5 ${d.legenda?.estilo === v ? "border-mint bg-mint/5" : "border-line"}`}>
                    <p className="text-sm font-semibold">{l}</p><p className="text-[11px] text-fog leading-snug mt-0.5">{h}</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <Field label={`Palavras por tela: ${d.legenda?.palavras_por_tela}`}><input type="range" min={1} max={6} value={d.legenda?.palavras_por_tela ?? 3} onChange={(e) => set(["legenda", "palavras_por_tela"], +e.target.value)} className="w-full accent-[var(--color-mint)]" /></Field>
                <Field label={`Altura: ${Math.round((d.legenda?.altura ?? 0.64) * 100)}%`}><input type="range" min={0.4} max={0.85} step={0.01} value={d.legenda?.altura ?? 0.64} onChange={(e) => set(["legenda", "altura"], +e.target.value)} className="w-full accent-[var(--color-mint)]" /></Field>
                <Field label="Caixa alta"><select className="input" value={d.legenda?.caixa_alta ? "1" : "0"} onChange={(e) => set(["legenda", "caixa_alta"], e.target.value === "1")}><option value="1">Sim</option><option value="0">Não</option></select></Field>
              </div>
            </Group>

            <Group title="Ritmo e câmera">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Corte máx. (s)"><input type="number" className="input" value={d.regras?.corte_max_s ?? 4} onChange={(e) => set(["regras", "corte_max_s"], +e.target.value)} /></Field>
                <Field label="Silêncio que corta (ms)"><input type="number" step={50} className="input" value={d.regras?.silencio_ms ?? 350} onChange={(e) => set(["regras", "silencio_ms"], +e.target.value)} /></Field>
                <Field label="Trilha (dB)"><input type="number" className="input" value={d.regras?.trilha_db ?? -18} onChange={(e) => set(["regras", "trilha_db"], +e.target.value)} /></Field>
              </div>
              <p className="text-xs text-fog mt-3">Câmera que acompanha a fala (zoom in e out a cada frase, toque nas palavras fortes)</p>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {CAMERA_LEVELS.map((l, i) => (
                  <button key={l} onClick={() => set(["camera", "intensidade"], i)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${(d.camera?.intensidade ?? 0) === i ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>
                ))}
              </div>
            </Group>

            <details className="rounded-xl border border-line p-3">
              <summary className="text-sm font-semibold cursor-pointer">MOGRTs para o Premiere (opcional)</summary>
              <p className="text-xs text-fog mt-2">Caminho dos arquivos no computador de quem edita. Sem MOGRT, legendas e títulos entram como marcadores.</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {[["legenda", "Legenda"], ["gancho", "Gancho"], ["cta", "CTA"], ["lower_third", "Lower-third"]].map(([k, l]) => (
                  <Field key={k} label={l}><input className="input font-mono text-xs" value={edit.data.mogrts?.[k] || ""} onChange={(e) => set(["mogrts", k], e.target.value)} placeholder="/Users/…/arquivo.mogrt" /></Field>
                ))}
              </div>
            </details>

            <div className="flex gap-2">
              <button onClick={save} className="px-4 py-2 rounded-xl bg-mint text-ink font-semibold text-sm">Salvar kit</button>
              <button onClick={() => { setEdit(null); setMsg(null); }} className="px-4 py-2 rounded-xl border border-line text-sm">Voltar</button>
              {edit.id && <Link href="/audiovisual/editor" className="px-4 py-2 rounded-xl border border-line text-sm">Abrir o Editor</Link>}
              {edit.id && <button onClick={() => del(edit.id!)} className="ml-auto px-3 py-2 rounded-xl text-sm text-red-400" title="Apagar kit"><I.trash className="w-4 h-4" /></button>}
            </div>
          </section>

          <aside className="card p-4 lg:sticky lg:top-4 self-start">
            <p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase">Prévia ao vivo</p>
            <Preview kit={d} title={title} />
            <div className="grid grid-cols-3 gap-1 mt-2">
              {([["gancho", "Gancho"], ["cta", "CTA"], ["lower_third", "Lower-third"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setTitle(v)} className={`rounded-lg border px-1 py-1.5 text-[11px] font-semibold ${title === v ? "border-mint text-mint" : "border-line text-fog"}`}>{l}</button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/** prévia 9:16 animada: fundo com o gradiente do kit, título, legenda e a câmera da fala */
function Preview({ kit, title }: { kit: Kit; title: "gancho" | "cta" | "lower_third" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const screens = captionScreens(sampleWords, kit.legenda?.palavras_por_tela || 3);
    const cam = speechCamera(sampleWords, kit.camera?.intensidade ?? 0);
    const text = title === "gancho" ? "O erro que trava suas vendas" : title === "cta" ? "Comenta EU QUERO" : "Vinícius · VINCIT";
    const p: Project = { segments: [], titles: [{ id: "t", start: 0, end: SAMPLE_LEN, text, kind: title }], zooms: [], captionsOn: true, edits: {} };
    let raf = 0;
    const t0 = performance.now();
    const frame = () => {
      const t = ((performance.now() - t0) / 1000) % SAMPLE_LEN;
      const z = cameraAt(cam, t);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#3a3f44"); g.addColorStop(1, kit.cores?.fundo || "#0c0c0d");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // silhueta de quem fala, só para a câmera ter referência
      ctx.fillStyle = "rgba(255,255,255,.07)";
      ctx.beginPath(); ctx.arc(W / 2, H * 0.4, 190, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W / 2, H * 0.78, 420, 360, 0, Math.PI, 0); ctx.fill();
      ctx.restore();
      drawOverlays(ctx, p, screens, t, kit);
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = '500 30px "JetBrains Mono", monospace'; ctx.textBaseline = "top";
      ctx.fillText(`câmera ${Math.round(z * 100)}%`, 40, 40);
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [kit, title]);
  return <canvas ref={ref} width={W} height={H} className="w-full aspect-[9/16] rounded-xl mt-2 bg-ink" />;
}

function KitThumb({ kit }: { kit: Kit }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">{(["destaque", "texto", "fundo"] as const).map((c) => <span key={c} className="w-5 h-5 rounded-md border border-line" style={{ background: kit.cores?.[c] }} />)}</div>
      <span className="text-lg leading-none" style={{ fontFamily: `"${(kit.fontes?.titulo || "Anton").replace(/\s+(Black|ExtraBold|Bold)$/i, "")}"`, color: kit.cores?.destaque }}>Aa</span>
    </div>
  );
}

function FontPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const m = value.match(/^(.*?)(\s+(?:Bold|ExtraBold|Black))?$/i);
  const fam = FONTS.find((f) => f.toLowerCase() === (m?.[1] || "").toLowerCase()) || m?.[1] || "Inter";
  const peso = m?.[2] || "";
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs text-fog">{label}</p>
      <p className="text-2xl mt-1 truncate" style={{ fontFamily: `"${fam}"`, fontWeight: /black/i.test(peso) ? 900 : /extrabold/i.test(peso) ? 800 : /bold/i.test(peso) ? 700 : undefined }}>Venda mais 70%</p>
      <div className="grid grid-cols-[1fr_auto] gap-2 mt-2">
        <select className="input" value={fam} onChange={(e) => onChange(e.target.value + peso)}>
          {!FONTS.includes(fam) && <option value={fam}>{fam}</option>}
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="input !w-auto" value={peso} onChange={(e) => onChange(fam + e.target.value)}>
          {PESOS.map((p) => <option key={p} value={p}>{p.trim() || "Normal"}</option>)}
        </select>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="font-mono text-[10px] tracking-[.14em] text-fog uppercase mb-2">{title}</p>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-fog">{label}</span><div className="mt-1">{children}</div></label>;
}
