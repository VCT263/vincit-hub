"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { processPsd } from "@/lib/mockupPsd";
import { layerPixels, maskPixels, prepareLayer, readPsd } from "@/lib/psdRead";
import { CATS, refreshMockups, type Mockup } from "@/components/design/brand/MockupView";

/* Biblioteca de mockups fotográficos. Importar: cola o link de um mockup grátis do mockups-design.com;
   o Supabase baixa o .zip (função mockup-fetch), o navegador lê cada PSD, separa foto e mapa de luz da área
   do design e sobe as imagens planas (o PSD nunca é guardado nem repassado, como pede a licença do site). */

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mockup-fetch`;

function zipList(zip: Uint8Array) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let e = zip.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("Zip inválido");
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const out: { name: string; method: number; csize: number; local: number }[] = [];
  for (let i = 0; i < n; i++) {
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    out.push({ name: new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nl)), method: v.getUint16(p + 10, true), csize: v.getUint32(p + 20, true), local: v.getUint32(p + 42, true) });
    p += 46 + nl + xl + cl;
  }
  return out.filter((f) => /\.ps[db]$/i.test(f.name) && !/__MACOSX/.test(f.name));
}
async function zipGet(zip: Uint8Array, f: { method: number; csize: number; local: number }) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const start = f.local + 30 + v.getUint16(f.local + 26, true) + v.getUint16(f.local + 28, true);
  const raw = zip.subarray(start, start + f.csize);
  if (f.method === 0) return raw.slice();
  return new Uint8Array(await new Response(new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
}
const jpeg = (rgba: Uint8ClampedArray, w: number, h: number, q: number, maxW?: number) => new Promise<Blob>((res) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d")!.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  let cv = c; if (maxW && w > maxW) { cv = document.createElement("canvas"); cv.width = maxW; cv.height = Math.round((h * maxW) / w); const x = cv.getContext("2d")!; x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, cv.width, cv.height); }
  cv.toBlob((b) => res(b!), "image/jpeg", q);
});

export default function MockupsPage() {
  const [rows, setRows] = useState<Mockup[] | null>(null);
  const [url, setUrl] = useState("");
  const [cat, setCat] = useState("outros");
  const [title, setTitle] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => createClient().from("design_mockups").select("*").order("category").order("sort").then(({ data }) => setRows((data as Mockup[]) || []));
  useEffect(() => { load(); }, []);
  const say = (m: string) => setLog((l) => [...l.slice(-12), m]);

  async function importar() {
    if (!/^https:\/\/mockups-design\.com\//.test(url)) return say("Use um link de mockups-design.com");
    setBusy(true); setLog([]);
    try {
      const s = createClient(); const { data: { session } } = await s.auth.getSession();
      say("Baixando o arquivo do site…");
      const r = await fetch(`${FN}?page=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `erro ${r.status}`);
      const name = decodeURIComponent(r.headers.get("x-mockup-title") || "") || "Mockup";
      const zip = new Uint8Array(await r.arrayBuffer());
      const psds = zipList(zip).slice(0, 4);
      say(`${psds.length} PSD no pacote.`);
      const slug = url.split("/").filter(Boolean).pop() || "mockup";
      for (let k = 0; k < psds.length; k++) {
        say(`Lendo ${psds[k].name.split("/").pop()}…`);
        const psd = readPsd(await zipGet(zip, psds[k]));
        for (const L of flatten(psd.children)) await prepareLayer(psd, L);
        const res = await processPsd(psd, { maxW: 1600, get: (l) => layerPixels(psd, l), mask: (l) => maskPixels(psd, l) });
        if (!res.slots.length) { say(`Sem área de design: ${res.log.join(" · ")}`); continue; }
        say(`Áreas: ${res.slots.map((x) => x.name).join(", ")}. Enviando…`);
        const v = Date.now().toString(36); const dir = `${slug}-${k + 1}`;
        const up = async (p: string, b: Blob) => { const { error } = await s.storage.from("design-mockups").upload(`${dir}/${p}-${v}.jpg`, b, { contentType: "image/jpeg" }); if (error) throw error; return s.storage.from("design-mockups").getPublicUrl(`${dir}/${p}-${v}.jpg`).data.publicUrl; };
        const base_url = await up("base", await jpeg(res.base, res.width, res.height, .86));
        const thumb_url = await up("thumb", await jpeg(res.thumb, res.width, res.height, .82, 640));
        const slots = [];
        for (let i = 0; i < res.slots.length; i++) slots.push({ ...res.slots[i], light_url: await up(`light${i}`, await jpeg(res.lights[i], res.width, res.height, .92)), art: "claro" });
        const { error } = await s.from("design_mockups").insert({ title: (title || name) + (psds.length > 1 ? ` ${k + 1}` : ""), category: cat, source_url: url, file: psds[k].name.split("/").pop(), width: res.width, height: res.height, base_url, thumb_url, slots, sort: 50 });
        if (error) throw error;
        say(`Pronto: ${title || name} ${k + 1}`);
      }
      refreshMockups(); load(); setUrl(""); setTitle("");
    } catch (e: any) { say(`Erro: ${e.message || e}`); }
    setBusy(false);
  }
  async function toggle(m: Mockup) { await createClient().from("design_mockups").update({ active: !m.active }).eq("id", m.id); refreshMockups(); load(); }
  async function recat(m: Mockup, c: string) { await createClient().from("design_mockups").update({ category: c }).eq("id", m.id); refreshMockups(); load(); }

  return (
    <>
      <PageHead kicker="Design · Mockups" title="Mockups fotográficos" desc="Fotos profissionais em que o logo, as cores e o grafismo de cada marca entram sozinhos, com a perspectiva, a luz e a sombra originais. Vêm dos PSD grátis do mockups-design.com." />
      <div className="card p-4 space-y-3 mb-6">
        <p className="font-semibold text-sm">Importar do mockups-design.com</p>
        <div className="flex flex-wrap gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mockups-design.com/…-mockup/" className="input flex-1 min-w-64 !py-1.5 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome (opcional)" className="input w-48 !py-1.5 text-sm" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="input w-44 !py-1.5 text-sm">{Object.entries(CATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <button onClick={importar} disabled={busy || !url} className="btn btn-mint !py-1.5 text-sm">{busy ? "Importando…" : "Importar"}</button>
        </div>
        <p className="text-[11px] text-fog">Leva de 20 segundos a 2 minutos por pacote (o arquivo tem de 50 a 300 MB e é processado aqui no navegador). Funciona melhor com mockups de objeto inteligente plano ou em perspectiva; efeitos 3D de camada (chanfro, relevo) não são lidos. Licença do site: uso comercial liberado; o PSD não é guardado nem repassado.</p>
        {!!log.length && <div className="font-mono text-[11px] text-fog space-y-0.5">{log.map((l, i) => <p key={i}>{l}</p>)}</div>}
      </div>
      {rows === null ? <div className="card h-40 animate-pulse" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rows.map((m) => (
            <div key={m.id} className={`card overflow-hidden ${m.active ? "" : "opacity-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumb_url || m.base_url} alt="" className="w-full aspect-[4/3] object-cover" />
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-semibold truncate">{m.title}</p>
                <p className="text-[11px] text-fog">{m.slots.length} {m.slots.length === 1 ? "área" : "áreas"} · {m.width}×{m.height}</p>
                <div className="flex gap-2 items-center">
                  <select value={m.category} onChange={(e) => recat(m, e.target.value)} className="input !py-0.5 text-xs flex-1">{Object.entries(CATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <button onClick={() => toggle(m)} className="text-xs text-fog hover:text-mint">{m.active ? "Ocultar" : "Mostrar"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function flatten(list: any[]): any[] { return list.flatMap((l) => (l.children ? [l, ...flatten(l.children)] : [l])); }
