"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { applyTable, buildLut, buildToLog, parseCube, toCube, type LutSpec } from "@/lib/luts/core";
import { CAMERAS, ESTILOS, PACOTES } from "@/lib/luts/catalog";

/* Biblioteca de LUTs: converte o log de cada câmera para Rec.709 e aplica estilos, com prévia num quadro real.
 * A prévia, o .cube e a cor do Editor saem do mesmo cálculo (src/lib/luts/core.ts). */

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const FOTOS = ["De9sLhLx4cR", "Dc9KD-UiXYv", "DfVHDGRpYci", "DfnAO7gCXGW", "DgDiG6Pj_3i", "DfC1VppkYs8"].map((c) => `${SUPA}/storage/v1/object/public/design-mockups/brand/isys/ig/${c}.jpg`);
const MAXW = 900;

type Quadro = { img: ImageData; nome: string; jaLog: boolean };
type Externa = { nome: string; n: number; data: Float32Array };

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");

/** cartela de teste: pele, cinzas e cores fortes, para quando nenhuma foto carregar */
function cartela(): ImageData {
  const w = 720, h = 900;
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#000"); grad.addColorStop(1, "#fff");
  g.fillStyle = grad; g.fillRect(0, 0, w, 120);
  const sw = ["#f3d2bd", "#e0ac8a", "#c68863", "#8d5a3b", "#5b3a29", "#3a261c"];
  sw.forEach((s, i) => { g.fillStyle = s; g.fillRect((i * w) / 6, 120, w / 6 + 1, 220); });
  const cores = ["#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#16a085", "#2980b9", "#8e44ad", "#d35400", "#7f8c8d", "#2c3e50", "#a3313b", "#5a7d3a"];
  cores.forEach((s, i) => { g.fillStyle = s; g.fillRect((i % 6) * (w / 6), 340 + Math.floor(i / 6) * 200, w / 6 + 1, 200); });
  g.fillStyle = "#808080"; g.fillRect(0, 740, w, 160);
  g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.fillText("Cartela de teste VINCIT", 30, 830);
  return g.getImageData(0, 0, w, h);
}

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

export default function Luts() {
  const [cam, setCam] = useState("slog3");
  const [estilo, setEstilo] = useState("teal-laranja");
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [externa, setExterna] = useState<Externa | null>(null);
  const [corte, setCorte] = useState(50);
  const [aviso, setAviso] = useState("");
  const antesRef = useRef<HTMLCanvasElement>(null);
  const depoisRef = useRef<HTMLCanvasElement>(null);
  const thumbs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const camera = CAMERAS.find((c) => c.id === cam);
  const est = ESTILOS.find((e) => e.id === estilo);

  // carrega uma foto da ISYS como quadro de exemplo
  const carregarFoto = useCallback((i: number) => {
    setFotoIdx(i);
    if (i < 0 || !SUPA) { setQuadro({ img: cartela(), nome: "Cartela de teste", jaLog: false }); return; }
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => { setAviso(""); setQuadro({ img: deImagem(el, el.naturalWidth, el.naturalHeight), nome: `Foto ISYS ${i + 1}`, jaLog: false }); };
    el.onerror = () => { setAviso("A foto não carregou; usando a cartela de teste."); setQuadro({ img: cartela(), nome: "Cartela de teste", jaLog: false }); };
    el.src = FOTOS[i];
  }, []);
  useEffect(() => { carregarFoto(0); }, [carregarFoto]);

  // quadro do próprio vídeo (ou foto) do computador; nada sai do navegador
  const abrirArquivo = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFotoIdx(-2);
    if (f.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
      v.onseeked = () => { setAviso(""); setQuadro({ img: deImagem(v, v.videoWidth, v.videoHeight), nome: f.name, jaLog: !!cam }); URL.revokeObjectURL(url); };
      v.onerror = () => setAviso("O navegador não abriu esse vídeo (alguns ProRes e BRAW não abrem). Exporte um quadro em PNG e envie.");
    } else {
      const el = new Image();
      el.onload = () => { setAviso(""); setQuadro({ img: deImagem(el, el.naturalWidth, el.naturalHeight), nome: f.name, jaLog: !!cam }); URL.revokeObjectURL(url); };
      el.src = url;
    }
  };
  const abrirCube = async (f: File | undefined) => {
    if (!f) return;
    const r = parseCube(await f.text());
    if (!r) { setAviso("Esse arquivo não parece uma LUT 3D .cube."); return; }
    setAviso(""); setExterna({ nome: f.name, ...r });
  };

  // antes = quadro em log (simulado a partir da foto, ou o quadro real do usuário); depois = com a LUT
  const antes = useMemo(() => {
    if (!quadro) return null;
    const img = new ImageData(new Uint8ClampedArray(quadro.img.data), quadro.img.width, quadro.img.height);
    if (cam && !quadro.jaLog) applyTable(img, buildToLog(cam), 33);
    return img;
  }, [quadro, cam]);
  const spec: LutSpec = useMemo(() => ({ log: cam || undefined, look: estilo || undefined }), [cam, estilo]);
  const depois = useMemo(() => {
    if (!antes) return null;
    const img = new ImageData(new Uint8ClampedArray(antes.data), antes.width, antes.height);
    if (externa) {
      if (cam) applyTable(img, buildLut({ log: cam }), 33);
      applyTable(img, externa.data, externa.n);
    } else applyTable(img, buildLut(spec), 33);
    return img;
  }, [antes, spec, externa, cam]);
  useEffect(() => { desenhar(antesRef.current, antes); desenhar(depoisRef.current, depois); }, [antes, depois]);

  // miniaturas de cada estilo sobre o quadro já convertido
  useEffect(() => {
    if (!antes) return;
    const peq = reduzir(antes, 220);
    const base = new ImageData(new Uint8ClampedArray(peq.data), peq.width, peq.height);
    if (cam) applyTable(base, buildLut({ log: cam }), 33);
    let i = 0;
    const todos = [{ id: "" }, ...ESTILOS];
    const passo = () => {
      const e = todos[i++];
      if (!e) return;
      const img = new ImageData(new Uint8ClampedArray(peq.data), peq.width, peq.height);
      applyTable(img, buildLut({ log: cam || undefined, look: e.id || undefined }), 33);
      desenhar(thumbs.current[e.id || "_"] || null, e.id ? img : base);
      requestAnimationFrame(passo);
    };
    passo();
  }, [antes, cam]);

  const nomeCam = camera ? `${camera.marca} ${camera.perfil.split(" · ")[0]}` : "";
  const baixarConversao = (id: string) => {
    const c = CAMERAS.find((x) => x.id === id)!;
    const n = `${c.marca} ${c.perfil.split(" · ")[0]} para Rec709`;
    baixar(`VINCIT_${slug(n)}.cube`, toCube({ log: id }, n));
  };
  const baixarEstilo = (id: string) => {
    const e = ESTILOS.find((x) => x.id === id)!;
    baixar(`VINCIT_${slug(e.nome)}.cube`, toCube({ look: id }, `VINCIT ${e.nome}`));
  };
  const baixarJunto = () => {
    if (!camera || !est) return;
    const n = `${nomeCam} + ${est.nome}`;
    baixar(`VINCIT_${slug(n)}.cube`, toCube(spec, n));
  };

  return (
    <>
      <PageHead kicker="AUDIOVISUAL · ACERVO" title="Biblioteca de LUTs"
        desc="Para vídeo gravado em log: primeiro a conversão da câmera para cor normal (Rec.709), depois um estilo. Veja antes e depois num quadro real, baixe o .cube para o Premiere ou use direto no Editor.">
        <Link href="/audiovisual/editor" className="chip"><I.video className="w-3.5 h-3.5" />Usar no Editor</Link>
      </PageHead>

      {/* ---------- prévia ---------- */}
      <section className="card p-4 sm:p-5">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5">
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-xl bg-black select-none mx-auto" style={{ aspectRatio: antes ? `${antes.width}/${antes.height}` : "4/5", width: `min(100%, calc(70vh * ${antes ? antes.width / antes.height : 0.8}))` }}>
              {!antes && <p className="absolute inset-0 grid place-items-center text-sm text-fog">Carregando o quadro…</p>}
              <canvas ref={depoisRef} className="absolute inset-0 w-full h-full object-contain" />
              <canvas ref={antesRef} className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none" style={{ left: `${corte}%` }} />
              <span className="absolute top-2 left-2 chip !bg-black/60 !text-white text-[11px]">Antes{cam ? " · log" : ""}</span>
              <span className="absolute top-2 right-2 chip !bg-black/60 !text-white text-[11px]">Depois</span>
              <input type="range" min={0} max={100} value={corte} onChange={(e) => setCorte(+e.target.value)} aria-label="Comparar antes e depois" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
            </div>
            <p className="text-xs text-fog mt-2">
              Arraste sobre a imagem para comparar. {quadro && !quadro.jaLog && cam ? "O \"antes\" é a foto convertida para o log da câmera escolhida, para você ver como o vídeo sai lavado e como fica depois. Com um quadro do seu vídeo em log, o antes é o arquivo de verdade." : ""}
            </p>
          </div>

          <div className="space-y-4 min-w-0">
            <label className="block text-xs text-fog">1 · Câmera / perfil de log
              <select value={cam} onChange={(e) => { setCam(e.target.value); setExterna(null); }} className="input mt-1 text-sm">
                <option value="">Vídeo normal (já está em Rec.709)</option>
                {CAMERAS.filter((c) => c.id).map((c) => <option key={c.id} value={c.id}>{c.marca} · {c.perfil}</option>)}
              </select>
            </label>
            {camera?.dica && <p className="text-xs text-amber-300 -mt-2">{camera.dica}</p>}

            <div>
              <p className="text-xs text-fog">2 · Estilo</p>
              <p className="text-sm font-semibold mt-1">{externa ? externa.nome : est ? est.nome : "Só a conversão"}</p>
              {!externa && est && <p className="text-xs text-fog mt-0.5">{est.desc} <span className="text-paper">Bom para: {est.uso}.</span></p>}
              {externa && <button onClick={() => setExterna(null)} className="chip mt-1 text-xs">Tirar a LUT de fora</button>}
            </div>

            <div>
              <p className="text-xs text-fog">Quadro da prévia</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {FOTOS.map((_, i) => <button key={i} onClick={() => carregarFoto(i)} className={`chip text-xs ${fotoIdx === i ? "!border-mint !text-mint" : ""}`}>ISYS {i + 1}</button>)}
                <button onClick={() => carregarFoto(-1)} className={`chip text-xs ${fotoIdx === -1 ? "!border-mint !text-mint" : ""}`}>Cartela</button>
              </div>
              <label className="chip text-xs mt-2 cursor-pointer w-full justify-center"><I.video className="w-3.5 h-3.5" />Quadro do meu vídeo
                <input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => abrirArquivo(e.target.files?.[0])} />
              </label>
              {quadro && fotoIdx === -2 && (
                <label className="flex items-center gap-1.5 text-xs mt-2"><input type="checkbox" checked={quadro.jaLog} onChange={(e) => setQuadro({ ...quadro, jaLog: e.target.checked })} />Esse arquivo foi gravado em log</label>
              )}
              <label className="chip text-xs mt-2 cursor-pointer w-full justify-center"><I.palette className="w-3.5 h-3.5" />Testar uma LUT .cube de fora
                <input type="file" accept=".cube" className="hidden" onChange={(e) => abrirCube(e.target.files?.[0])} />
              </label>
              {aviso && <p className="text-xs text-amber-300 mt-2">{aviso}</p>}
            </div>

            <div className="space-y-2 pt-1 border-t border-line">
              <p className="text-xs text-fog pt-3">Baixar para o Premiere (.cube, 33 pontos)</p>
              {cam && <button onClick={() => baixarConversao(cam)} className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-line"><I.download className="w-4 h-4" />Conversão {nomeCam} → Rec.709</button>}
              {est && <button onClick={() => baixarEstilo(est.id)} className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-line"><I.download className="w-4 h-4" />Estilo {est.nome}</button>}
              {cam && est && !externa && <button onClick={baixarJunto} className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-mint text-ink"><I.download className="w-4 h-4" />Tudo em um arquivo</button>}
            </div>
          </div>
        </div>

        {/* ---------- estilos ---------- */}
        <div className="mt-6">
          <p className="font-display text-lg font-extrabold">Estilos</p>
          <p className="text-sm text-fog">Clique para ver na prévia. Os da VINCIT foram feitos para a marca; os do Editor são os mesmos looks do Editor do HUB, para a cor bater no Premiere.</p>
          {(["VINCIT", "Editor"] as const).map((g) => (
            <div key={g} className="mt-3">
              <p className="font-mono text-[11px] text-mint tracking-widest uppercase">{g === "VINCIT" ? "Estilos VINCIT" : "Looks do Editor"}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
                {g === "VINCIT" && (
                  <button onClick={() => { setEstilo(""); setExterna(null); }} className={`text-left rounded-xl border p-1.5 ${!estilo && !externa ? "border-mint" : "border-line"}`}>
                    <canvas ref={(el) => { thumbs.current._ = el; }} className="w-full aspect-[4/5] object-cover rounded-lg bg-black" />
                    <p className="text-[11px] font-semibold mt-1 leading-tight">Só a conversão</p>
                  </button>
                )}
                {ESTILOS.filter((e) => e.grupo === g).map((e) => (
                  <button key={e.id} onClick={() => { setEstilo(e.id); setExterna(null); }} className={`text-left rounded-xl border p-1.5 ${estilo === e.id && !externa ? "border-mint" : "border-line"}`}>
                    <canvas ref={(el) => { thumbs.current[e.id] = el; }} className="w-full aspect-[4/5] object-cover rounded-lg bg-black" />
                    <p className="text-[11px] font-semibold mt-1 leading-tight">{e.nome}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- câmeras ---------- */}
      <section className="card p-4 sm:p-5 mt-4">
        <p className="font-display text-lg font-extrabold">Conversão por câmera</p>
        <p className="text-sm text-fog">A conversão do HUB é feita com a curva e o gamut que cada fabricante publica, com um tom de cinema suave nas altas luzes. É nossa: pode baixar, usar em trabalho pago e repassar. A LUT oficial do fabricante continua sendo a referência; quando a licença não deixa hospedar, fica o link.</p>
        <div className="mt-3 divide-y divide-line">
          {CAMERAS.map((c) => (
            <div key={c.marca + c.perfil} className="py-3 grid md:grid-cols-[1fr_auto] gap-2 items-start">
              <div className="min-w-0">
                <p className="font-semibold">{c.marca} <span className="text-fog font-normal">· {c.perfil}</span></p>
                <p className="text-xs text-fog">{c.cameras}</p>
                {c.oficial && <p className="text-xs mt-1"><a href={c.oficial.url} target="_blank" rel="noreferrer" className="text-mint underline">{c.oficial.label}</a> <span className="text-fog">· {c.oficial.nota}</span></p>}
              </div>
              <div className="flex gap-2 flex-wrap md:justify-end">
                {c.id ? (
                  <>
                    <button onClick={() => { setCam(c.id); setExterna(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="chip text-xs">Ver na prévia</button>
                    <button onClick={() => baixarConversao(c.id)} className="chip text-xs"><I.download className="w-3.5 h-3.5" />Baixar do HUB</button>
                  </>
                ) : <span className="chip text-xs text-fog">Só a oficial</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- pacotes grátis ---------- */}
      <section className="card p-4 sm:p-5 mt-4">
        <p className="font-display text-lg font-extrabold">Pacotes grátis de fora</p>
        <p className="text-sm text-fog">Todos liberam uso em trabalho pago. Baixe no site de quem fez e teste aqui com &quot;Testar uma LUT .cube de fora&quot;. Estilos de fora entram depois da conversão (Rec.709).</p>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {PACOTES.map((p) => (
            <a key={p.nome} href={p.url} target="_blank" rel="noreferrer" className="rounded-xl border border-line p-3 hover:border-mint block">
              <p className="font-semibold flex items-center gap-2">{p.nome}<I.link className="w-3.5 h-3.5 text-fog" /></p>
              <p className="text-xs text-fog mt-0.5">{p.conteudo}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="chip text-[11px]">{p.licenca}</span>
                <span className="chip text-[11px] text-mint border-mint/40">Uso comercial</span>
                <span className="chip text-[11px]">Repasse: {p.repasse}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- instalação ---------- */}
      <section className="card p-4 sm:p-5 mt-4 grid md:grid-cols-2 gap-5">
        <div>
          <p className="font-display text-lg font-extrabold">No Premiere (Lumetri)</p>
          <ol className="text-sm text-fog mt-2 space-y-2 list-decimal pl-4">
            <li>Selecione o clipe e abra <b className="text-paper">Janela › Cor Lumetri</b>.</li>
            <li>Em <b className="text-paper">Correção básica › LUT de entrada</b>, clique em Procurar e escolha a <b className="text-paper">conversão</b> da sua câmera.</li>
            <li>Em <b className="text-paper">Criativo › Look</b>, escolha o <b className="text-paper">estilo</b>. A barra Intensidade dosa o estilo.</li>
            <li>Ou use só o arquivo &quot;Tudo em um&quot; na LUT de entrada.</li>
            <li>Premiere 25 em diante pode reconhecer o log sozinho (Gerenciamento de cor automático). Se a imagem já aparecer com cor normal, pule a conversão e use só o estilo.</li>
          </ol>
        </div>
        <div>
          <p className="font-display text-lg font-extrabold">Deixar sempre na lista</p>
          <p className="text-sm text-fog mt-2">Copie os arquivos para estas pastas e reabra o Premiere. Eles aparecem direto no menu, sem Procurar.</p>
          <ul className="text-xs mt-2 space-y-1.5 font-mono break-all">
            <li><span className="text-fog font-sans">Mac, conversões:</span> /Library/Application Support/Adobe/Common/LUTs/Technical</li>
            <li><span className="text-fog font-sans">Mac, estilos:</span> /Library/Application Support/Adobe/Common/LUTs/Creative</li>
            <li><span className="text-fog font-sans">Windows:</span> C:\Program Files\Adobe\Common\LUTs\Technical e \Creative</li>
          </ul>
          <p className="text-sm text-fog mt-3">No <Link href="/audiovisual/editor" className="text-mint underline">Editor do HUB</Link>, escolha &quot;Gravado em log&quot; e &quot;LUT da biblioteca&quot; na aba de estilo. Guarde os .cube na pasta LUT do <Link href="/audiovisual/midia" className="text-mint underline">Banco de mídia</Link> para ter tudo no Drive.</p>
        </div>
      </section>
    </>
  );
}
