/* Tabela de prévia de uma LUT do catálogo, usada pela Biblioteca de LUTs e pelo editor de Fotos.
 * Se a LUT tem `tabela` (arquivo original reduzido a 17³, em /public/luts-previa), carrega o arquivo;
 * senão monta a aproximação do HUB (conversão do log + look). */
import { applyTable, buildLut, buildToLog } from "./core";
import type { Lut } from "./catalog";

export type Tabela = { n: number; data: Float32Array };
const cache = new Map<string, Promise<Tabela>>();

export function tabelaDe(lut: Lut): Promise<Tabela> {
  if (!lut.tabela) return Promise.resolve({ n: 33, data: buildLut({ log: lut.entrada || undefined, look: lut.look }, 33) });
  const url = lut.tabela;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error("Prévia não carregou");
      const b = new Uint8Array(await r.arrayBuffer());
      const n = Math.round(Math.cbrt(b.length / 3));
      const data = new Float32Array(b.length);
      for (let i = 0; i < b.length; i++) data[i] = b[i] / 255;
      return { n, data };
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** LUT que muda o visual de uma foto comum (as conversões puras deixariam a foto igual) */
export const temVisual = (l: Lut) => l.tipo !== "Conversão" && !!(l.look || l.tabela);

/** aplica a LUT numa foto comum (Rec.709), no lugar. Se a LUT espera log, a foto é levada para esse log antes.
 *  forca 0..100 mistura com a foto sem a LUT. */
export function aplicarNaFoto(img: ImageData, lut: Lut, t: Tabela, forca = 100) {
  const orig = forca < 100 ? new Uint8ClampedArray(img.data) : null;
  if (lut.entrada) applyTable(img, buildToLog(lut.entrada), 33);
  applyTable(img, t.data, t.n);
  if (orig) {
    const k = Math.max(0, forca) / 100, d = img.data;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = orig[i + c] + (d[i + c] - orig[i + c]) * k;
  }
}
