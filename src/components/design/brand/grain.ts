/* Grão de papel em SVG (feTurbulence). No PDF o Chrome rasteriza o filtro do tamanho da página
   em cada slide e o arquivo passava de 70 MB. Aqui o mesmo SVG vira um PNG uma vez só (no navegador)
   e o PDF guarda um único ladrilho que se repete. Enquanto o PNG não fica pronto, usa o SVG. */
const ready = new Map<string, string>();
const started = new Map<string, Promise<void>>();

function raster(url: string) {
  if (started.has(url) || typeof window === "undefined") return;
  started.set(url, new Promise<void>((done) => {
  try {
    const src = url.slice(5, -2); // tira url(" e ")
    const size = Number(/width="(\d+)"/.exec(decodeURIComponent(src))?.[1]) || 220;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const g = c.getContext("2d"); if (!g) return;
        g.drawImage(img, 0, 0, size, size);
        ready.set(url, `url("${c.toDataURL("image/png")}")`);
      } catch { /* fica no SVG */ }
      done();
    };
    img.onerror = () => done();
    img.src = src;
  } catch { done(); /* fica no SVG */ }
  }));
}

/** começa a preparar o PNG assim que o módulo carrega, bem antes de alguém pedir o PDF */
export function warmGrain(url: string) { raster(url); }

/** espera os grãos ficarem prontos (no máximo 1,5 s) antes de imprimir */
export function grainsReady() {
  return Promise.race([Promise.all(started.values()), new Promise((r) => setTimeout(r, 1500))]);
}

/** Devolve o grão já como PNG quando possível; senão o SVG original. */
export function grainBg(url: string): string {
  const png = ready.get(url);
  if (png) return png;
  raster(url);
  return url;
}
