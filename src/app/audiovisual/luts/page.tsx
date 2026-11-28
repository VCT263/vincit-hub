"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { applyTable, buildLut, buildToLog, parseCube } from "@/lib/luts/core";
import { LOGS, MARCAS, type Lut } from "@/lib/luts/catalog";

/* Biblioteca de LUTs: só a prévia de como cada LUT deixa o vídeo, separada por marca.
 * O HUB não hospeda os arquivos: cada LUT leva ao site oficial, e a LUT baixada pode ser testada aqui. */

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const FOTOS = ["De9sLhLx4cR", "Dc9KD-UiXYv", "DfVHDGRpYci", "DfnAO7gCXGW", "DgDiG6Pj_3i", "DfC1VppkYs8"].map((c) => `${SUPA}/storage/v1/object/public/design-mockups/brand/isys/ig/${c}.jpg`);
const MAXW = 900;
const NOME_LOG = Object.fromEntries(LOGS);

type Quadro = { img: ImageData; nome: string; doUsuario: boolean };
type Externa = { nome: string; n: number; data: Float32Array };

/** cartela de teste: pele, cinzas e cores fortes, para quando nenhuma foto carregar */
function cartela(): ImageData {
  const w = 720, h = 900;
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#000"); grad.addColorStop(1, "#fff");
  g.fillStyle = grad; g.fillRect(0, 0, w, 120);
  ["#f3d2bd", "#e0ac8a", "#c68863", "#8d5a3b", "#5b3a29", "#3a261c"].forEach((s, i) => { g.fillStyle = s; g.fillRect((i * w) / 6, 120, w / 6 + 1, 220); });
  ["#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#16a085", "#2980b9", "#8e44ad", "#d35400", "#7f8c8d", "#2c3e50", "#a3313b", "#5a7d3a"].forEach((s, i) => { g.fillStyle = s; g.fillRect((i % 6) * (w / 6), 340 + Math.floor(i / 6) * 200, w / 6 + 1, 200); });
  g.fillStyle = "#808080"; g.fillRect(0, 740, w, 160);
  g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.fillText("Cartela de teste VINCIT", 30, 830);
  return g.getImageData(0, 0, w, h);
}
const copia = (img: ImageData) => new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
function desenhar(cv: HTMLCanvasElement | null, img: ImageData | null) {
  if (!cv || !img) return;
  cv.width = img.width; cv.height = img.height;
  cv.getContext("2d")!.putImageData(img, 0, 0);
}
function reduzir(img: ImageData, w: number): ImageData {
  const s = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
  s.getContext("2d")!.putImageData(img, 0, 0);
  const h = Math.round((img.height * w) / img.width);
  const d = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = d.getContext("2d")!; g.drawImage(s, 0, 0, w, h);
  return g.getImageData(0, 0, w, h);
}
function deImagem(el: HTMLImageElement | HTMLVideoElement, w0: number, h0: number): ImageData {
  const w = Math.min(MAXW, w0), h = Math.round((h0 * w) / w0);
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d")!; g.drawImage(el, 0, 0, w, h);
  return g.getImageData(0, 0, w, h);
}

/** quadro "antes" que a LUT espera: o log da câmera dela (simulado a partir da foto) ou o vídeo normal */
function antesPara(lut: Lut, base: ImageData, meuLog: string) {
  const img = copia(base);
  if (meuLog) { // quadro do usuário gravado em log
    if (lut.entrada === meuLog) return img;
    applyTable(img, buildLut({ log: meuLog }), 33); // vira Rec.709
  }
  if (lut.entrada) applyTable(img, buildToLog(lut.entrada), 33);
  return img;
}

export default function Luts() {
  const [marcaId, setMarcaId] = useState("blackmagic");
  const [lutId, setLutId] = useState("bmd-video");
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [meuLog, setMeuLog] = useState("");
  const [fotoIdx, setFotoIdx] = useState(0);
  const [externa, setExterna] = useState<Externa | null>(null);
  const [corte, setCorte] = useState(50);
  const [aviso, setAviso] = useState("");
  const antesRef = useRef<HTMLCanvasElement>(null);
  const depoisRef = useRef<HTMLCanvasElement>(null);
  const thumbs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const marca = MARCAS.find((m) => m.id === marcaId) || MARCAS[0];
  const lut = marca.luts.find((l) => l.id === lutId) || marca.luts[0];

  const escolherMarca = (id: string) => { const m = MARCAS.find((x) => x.id === id)!; setMarcaId(id); setLutId(m.luts[0].id); setExterna(null); };

  const carregarFoto = useCallback((i: number) => {
    setFotoIdx(i); setMeuLog("");
    if (i < 0 || !SUPA) { setQuadro({ img: cartela(), nome: "Cartela de teste", doUsuario: false }); return; }
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => { setAviso(""); setQuadro({ img: deImagem(el, el.naturalWidth, el.naturalHeight), nome: `Foto ISYS ${i + 1}`, doUsuario: false }); };
    el.onerror = () => { setAviso("A foto não carregou; usando a cartela de teste."); setQuadro({ img: cartela(), nome: "Cartela de teste", doUsuario: false }); };
    el.src = FOTOS[i];
  }, []);
  useEffect(() => { carregarFoto(0); }, [carregarFoto]);

  // quadro do próprio vídeo (ou foto) do computador; nada sai do navegador
  const abrirArquivo = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFotoIdx(-2);
    const pronto = (el: HTMLImageElement | HTMLVideoElement, w: number, h: number) => { setAviso(""); setQuadro({ img: deImagem(el, w, h), nome: f.name, doUsuario: true }); URL.revokeObjectURL(url); };
    if (f.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
      v.onseeked = () => pronto(v, v.videoWidth, v.videoHeight);
      v.onerror = () => setAviso("O navegador não abriu esse vídeo (alguns ProRes e BRAW não abrem). Exporte um quadro em PNG ou JPG e envie.");
    } else {
      const el = new Image();
      el.onload = () => pronto(el, el.naturalWidth, el.naturalHeight);
      el.src = url;
    }
  };
  const abrirCube = async (f: File | undefined) => {
    if (!f) return;
    const r = parseCube(await f.text());
    if (!r) { setAviso("Esse arquivo não parece uma LUT 3D .cube."); return; }
    setAviso(""); setExterna({ nome: f.name, ...r });
  };

  const antes = useMemo(() => (quadro ? antesPara(lut, quadro.img, meuLog) : null), [quadro, lut, meuLog]);
  const depois = useMemo(() => {
    if (!antes) return null;
    const img = copia(antes);
    if (externa) applyTable(img, externa.data, externa.n);
    else applyTable(img, buildLut({ log: lut.entrada || undefined, look: lut.look }), 33);
    return img;
  }, [antes, lut, externa]);
  useEffect(() => { desenhar(antesRef.current, antes); desenhar(depoisRef.current, depois); }, [antes, depois]);

  // miniaturas das LUTs da marca escolhida
  useEffect(() => {
    if (!quadro) return;
    const peq = reduzir(quadro.img, 220);
    let i = 0, vivo = true;
    const passo = () => {
      const l = marca.luts[i++];
      if (!l || !vivo) return;
      const img = antesPara(l, peq, meuLog);
      applyTable(img, buildLut({ log: l.entrada || undefined, look: l.look }), 33);
      desenhar(thumbs.current[l.id] || null, img);
      requestAnimationFrame(passo);
    };
    passo();
    return () => { vivo = false; };
  }, [quadro, marca, meuLog]);

  const rotuloAntes = lut.entrada && !(meuLog && meuLog === lut.entrada) ? `Antes · ${NOME_LOG[lut.entrada]} (simulado)` : lut.entrada ? `Antes · ${NOME_LOG[lut.entrada]}` : "Antes · Rec.709";

  return (
    <>
      <PageHead kicker="AUDIOVISUAL · ACERVO" title="Biblioteca de LUTs"
        desc="Veja como cada LUT deixa o vídeo antes de baixar. Separadas por marca; o arquivo original você baixa grátis no site oficial, pelo link de cada uma.">
        <Link href="/audiovisual/editor" className="chip"><I.video className="w-3.5 h-3.5" />Usar no Editor</Link>
      </PageHead>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {MARCAS.map((m) => (
          <button key={m.id} onClick={() => escolherMarca(m.id)} className={`chip shrink-0 ${marca.id === m.id ? "!border-mint !text-mint" : ""}`}>{m.nome}</button>
        ))}
      </div>

      <section className="card p-4 sm:p-5 mt-3">
        <p className="text-sm text-fog">{marca.resumo}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-3">
          {marca.luts.map((l) => (
            <button key={l.id} onClick={() => { setLutId(l.id); setExterna(null); }} className={`text-left rounded-xl border p-1.5 ${lut.id === l.id && !externa ? "border-mint" : "border-line"}`}>
              <canvas ref={(el) => { thumbs.current[l.id] = el; }} className="w-full aspect-[4/5] object-cover rounded-lg bg-black" />
              <p className="text-[11px] font-semibold mt-1 leading-tight">{l.nome}</p>
              <p className="text-[10px] text-fog leading-tight">{l.tipo}</p>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 mt-5">
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-xl bg-black select-none mx-auto" style={{ aspectRatio: antes ? `${antes.width}/${antes.height}` : "4/5", width: `min(100%, calc(70vh * ${antes ? antes.width / antes.height : 0.8}))` }}>
              {!antes && <p className="absolute inset-0 grid place-items-center text-sm text-fog">Carregando o quadro…</p>}
              <canvas ref={depoisRef} className="absolute inset-0 w-full h-full" />
              <canvas ref={antesRef} className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none" style={{ left: `${corte}%` }} />
              <span className="absolute top-2 left-2 chip !bg-black/60 !text-white text-[11px]">{rotuloAntes}</span>
              <span className="absolute top-2 right-2 chip !bg-black/60 !text-white text-[11px]">{externa ? "Sua LUT" : "Prévia"}</span>
              <input type="range" min={0} max={100} value={corte} onChange={(e) => setCorte(+e.target.value)} aria-label="Comparar antes e depois" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
            </div>
            <p className="text-xs text-fog mt-2">Arraste sobre a imagem para comparar. A prévia é uma aproximação feita pelo HUB; a original pode variar um pouco. Para ver a original de verdade, baixe e use &quot;Testar a LUT que baixei&quot;.</p>
          </div>

          <div className="space-y-4 min-w-0">
            <div>
              <p className="font-mono text-[11px] text-mint tracking-widest uppercase">{marca.nome} · {lut.tipo}</p>
              <p className="font-display text-xl font-extrabold mt-1">{externa ? externa.nome : lut.nome}</p>
              <p className="text-sm text-fog mt-1">{lut.desc}</p>
              <p className="text-xs mt-2"><span className="text-fog">Entra:</span> {lut.entrada ? NOME_LOG[lut.entrada] : "vídeo já convertido (Rec.709)"}</p>
              <a href={lut.onde.url} target="_blank" rel="noreferrer" className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-mint text-ink"><I.link className="w-4 h-4" />Baixar em {lut.onde.label}</a>
              <p className="text-xs text-fog mt-1.5">{lut.passo}</p>
            </div>

            <div className="pt-3 border-t border-line">
              <p className="text-xs text-fog">Quadro da prévia</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {FOTOS.map((_, i) => <button key={i} onClick={() => carregarFoto(i)} className={`chip text-xs ${fotoIdx === i ? "!border-mint !text-mint" : ""}`}>ISYS {i + 1}</button>)}
                <button onClick={() => carregarFoto(-1)} className={`chip text-xs ${fotoIdx === -1 ? "!border-mint !text-mint" : ""}`}>Cartela</button>
              </div>
              <label className="chip text-xs mt-2 cursor-pointer w-full justify-center"><I.video className="w-3.5 h-3.5" />Quadro do meu vídeo
                <input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => abrirArquivo(e.target.files?.[0])} />
              </label>
              {quadro?.doUsuario && (
                <label className="block text-xs text-fog mt-2">Esse vídeo foi gravado em
                  <select value={meuLog} onChange={(e) => setMeuLog(e.target.value)} className="input !py-1 text-xs mt-1">
                    <option value="">Cor normal (sem log)</option>
                    {LOGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                  </select>
                </label>
              )}
              {quadro?.doUsuario && meuLog && lut.entrada && lut.entrada !== meuLog && <p className="text-xs text-amber-300 mt-1">Essa LUT é para {NOME_LOG[lut.entrada]}; seu quadro foi convertido para simular.</p>}
              <label className="chip text-xs mt-2 cursor-pointer w-full justify-center"><I.palette className="w-3.5 h-3.5" />Testar a LUT que baixei (.cube)
                <input type="file" accept=".cube" className="hidden" onChange={(e) => abrirCube(e.target.files?.[0])} />
              </label>
              {externa && <button onClick={() => setExterna(null)} className="chip text-xs mt-2 w-full justify-center">Voltar para a prévia do HUB</button>}
              {aviso && <p className="text-xs text-amber-300 mt-2">{aviso}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-5 mt-4 grid md:grid-cols-2 gap-5">
        <div>
          <p className="font-display text-lg font-extrabold">Depois de baixar, no Premiere</p>
          <ol className="text-sm text-fog mt-2 space-y-2 list-decimal pl-4">
            <li>Selecione o clipe e abra <b className="text-paper">Janela › Cor Lumetri</b>.</li>
            <li><b className="text-paper">Conversão</b> (log para cor normal): em <b className="text-paper">Correção básica › LUT de entrada</b>, clique em Procurar.</li>
            <li><b className="text-paper">Filme ou estilo</b>: em <b className="text-paper">Criativo › Look</b>. A barra Intensidade dosa.</li>
            <li>Vídeo em log com estilo de filme: use os dois, a conversão primeiro e o estilo depois.</li>
            <li>No Premiere 25 em diante, o Gerenciamento de cor automático pode converter o log sozinho. Se a imagem já abrir com cor normal, use só o estilo.</li>
          </ol>
        </div>
        <div>
          <p className="font-display text-lg font-extrabold">Deixar sempre na lista</p>
          <p className="text-sm text-fog mt-2">Copie os arquivos para estas pastas e reabra o Premiere:</p>
          <ul className="text-xs mt-2 space-y-1.5 font-mono break-all">
            <li><span className="text-fog font-sans">Mac, conversões:</span> /Library/Application Support/Adobe/Common/LUTs/Technical</li>
            <li><span className="text-fog font-sans">Mac, estilos:</span> /Library/Application Support/Adobe/Common/LUTs/Creative</li>
            <li><span className="text-fog font-sans">Windows:</span> C:\Program Files\Adobe\Common\LUTs\Technical e \Creative</li>
          </ul>
          <p className="text-sm text-fog mt-3">Guarde os .cube na pasta LUT do <Link href="/audiovisual/midia" className="text-mint underline">Banco de mídia</Link> para ter tudo no Drive. No <Link href="/audiovisual/editor" className="text-mint underline">Editor do HUB</Link>, escolha &quot;Gravado em log&quot; e a LUT para ver a mesma prévia no vídeo.</p>
        </div>
      </section>
    </>
  );
}
