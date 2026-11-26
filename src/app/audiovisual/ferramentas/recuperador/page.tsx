"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { RESOLUTIONS, buildMoov, fileSource, guessResolution, readReference, repairWav, scanAndCopy, sniff, type RefParams } from "@/lib/recovery";

type Kind = "video" | "wav" | "desconhecido";
type Result = { name: string; lines: [string, string][]; warn?: string };

const gb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1).replace(".", ",")} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`);
const hms = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`; };
const outName = (n: string, ext: string) => n.replace(/\.[^.]+$/, "") + "_RECUPERADO." + ext;

export default function Recuperador() {
  const [supported, setSupported] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [ref, setRef] = useState<RefParams | null>(null);
  const [refErr, setRefErr] = useState<string | null>(null);
  const [res, setRes] = useState("auto");
  const [manual, setManual] = useState({ rate: 48000, ch: 2, bits: 24 });
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<{ done: number; total: number; frames?: number; phase: string; t0: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { setSupported(typeof window !== "undefined" && "showSaveFilePicker" in window); }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (busy) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  async function pickBroken(f?: File | null) {
    setFile(f || null); setKind(null); setResult(null); setErr(null);
    if (!f) return;
    setKind(await sniff(fileSource(f)));
  }
  async function pickRef(f?: File | null) {
    setRefFile(f || null); setRef(null); setRefErr(null);
    if (!f) return;
    if (kind === "wav") return;
    try { setRef(await readReference(fileSource(f))); } catch (e: any) { setRefErr(e.message || String(e)); }
  }

  async function run() {
    if (!file || !kind) return;
    setErr(null); setResult(null);
    const ext = kind === "wav" ? "WAV" : "MOV";
    let handle: any;
    try {
      handle = await (window as any).showSaveFilePicker({ suggestedName: outName(file.name, ext), types: [{ description: kind === "wav" ? "Áudio WAV" : "Vídeo QuickTime", accept: kind === "wav" ? { "audio/wav": [".wav"] } : { "video/quicktime": [".mov"] } }] });
    } catch { return; }
    const ac = new AbortController(); abort.current = ac;
    const writable = await handle.createWritable();
    const sink = { write: async (b: Uint8Array) => { if (ac.signal.aborted) throw new Error("Cancelado."); await writable.write(b); } };
    const t0 = performance.now();
    const onProgress = (p: any) => setProg({ ...p, t0 });
    setBusy(true); setProg({ done: 0, total: file.size, phase: "copiando", t0 });
    try {
      if (kind === "wav") {
        const info = await repairWav(fileSource(file), sink, refFile ? fileSource(refFile) : null, manual, onProgress);
        await writable.close();
        setResult({ name: handle.name, lines: [["Duração", hms(info.seconds)], ["Formato", `${info.ch} canais · ${info.rate / 1000} kHz · ${info.bits} bits`], ["Áudio recuperado", gb(info.bytes)], ["Tipo", info.rf64 ? "RF64 (acima de 4 GB)" : "WAV padrão"]] });
      } else {
        if (!ref) throw new Error("Escolha o clipe de referência antes.");
        const ix = await scanAndCopy(fileSource(file), sink, ref.l2fn, ref.l2poc, onProgress, ac.signal);
        if (!ix.frames.length) throw new Error("Não encontrei quadros de vídeo válidos no arquivo.");
        let wh: [number, number] | null = res === "auto" ? guessResolution(ix.firstMbs, ref) : (RESOLUTIONS.find((r) => `${r[0]}x${r[1]}` === res)!.slice(0, 2) as [number, number]);
        let warn: string | undefined;
        if (!wh) { wh = [ref.refW, ref.refH]; warn = "Não consegui confirmar a resolução: usei a do clipe de referência. Se o vídeo não abrir, rode de novo escolhendo a resolução."; }
        const m = buildMoov(ix, ref, wh[0], wh[1]);
        await writable.write(m.moov); await writable.close();
        const fps = ref.timescale / ref.delta;
        setResult({
          name: handle.name, warn,
          lines: [
            ["Duração", hms(m.seconds)],
            ["Quadros", ix.frames.length.toLocaleString("pt-BR")],
            ["Vídeo", `${wh[0]}×${wh[1]} · ${fps.toFixed(2).replace(".", ",")} fps · H.264`],
            ["Áudio", ref.audio && ix.audio.length ? `${hms(m.audioSeconds)} · ${ref.audio.ch} canais · ${ref.audio.rate / 1000} kHz` : "não encontrado"],
            ["Perdido no fim", ix.tail ? gb(ix.tail) + " (o trecho que a câmera não fechou)" : "nada"],
          ],
        });
      }
    } catch (e: any) {
      try { await writable.abort(); } catch {}
      setErr(e?.message === "Cancelado." ? "Recuperação cancelada. O arquivo parcial foi descartado." : `Não deu certo: ${e?.message || e}`);
    } finally { setBusy(false); abort.current = null; }
  }

  const pct = prog ? Math.min(100, (prog.done / prog.total) * 100) : 0;
  const elapsed = prog ? (performance.now() - prog.t0) / 1000 : 0;
  const speed = prog && elapsed > 1 ? prog.done / elapsed : 0;
  const eta = speed ? (prog!.total - prog!.done) / speed : 0;
  const ready = !!file && (kind === "wav" || (kind === "video" && !!ref)) && supported && !busy;

  return (
    <>
      <PageHead kicker="FERRAMENTAS" title="Recuperador de arquivos" desc="Traz de volta vídeo Sony .RSV ou MP4 que não abre e áudio WAV cortado. Tudo roda no seu computador: o arquivo não é enviado para lugar nenhum.">
        <Link href="/audiovisual/ferramentas" className="btn btn-ghost"><I.back className="w-4 h-4" />Ferramentas</Link>
      </PageHead>

      {!supported && (
        <div className="card p-4 mb-4 border-[var(--color-danger)]/40 text-sm">
          <b>Abra esta página no Google Chrome ou no Microsoft Edge, no computador.</b>
          <p className="text-fog mt-1">Este navegador não deixa gravar arquivos grandes direto no disco, e a recuperação precisa disso.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
        <section className="card p-5 space-y-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">1 · Arquivo corrompido</p>
            <label className={`flex items-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-colors ${file ? "border-mint-dim" : "border-slate hover:border-mint"}`}>
              <I.folder className="w-5 h-5 text-fog shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{file ? file.name : "Escolher .RSV, .MP4 ou .WAV"}</p>
                <p className="text-xs text-fog">{file ? `${gb(file.size)} · ${kind === "video" ? "vídeo H.264 sem índice" : kind === "wav" ? "áudio WAV" : kind ? "formato não reconhecido" : "analisando…"}` : "Use uma cópia do cartão, nunca o cartão direto"}</p>
              </div>
              {kind && <span className={`chip ${kind === "desconhecido" ? "" : "chip-mint"}`}>{kind === "video" ? "Vídeo Sony" : kind === "wav" ? "WAV" : "?"}</span>}
              <input type="file" className="hidden" disabled={busy} onChange={(e) => pickBroken(e.target.files?.[0])} />
            </label>
            {kind === "desconhecido" && <p className="text-xs text-[var(--color-danger)] mt-2">Não achei vídeo H.264 nem áudio WAV nesse arquivo. Pode ser H.265 (XAVC HS) ou de outra marca, que ainda não são suportados.</p>}
          </div>

          {kind === "video" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">2 · Clipe de referência</p>
              <label className={`flex items-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-colors ${ref ? "border-mint-dim" : "border-slate hover:border-mint"}`}>
                <I.video className="w-5 h-5 text-fog shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{refFile ? refFile.name : "Escolher um MP4 bom da mesma câmera"}</p>
                  <p className="text-xs text-fog">{ref ? `${ref.refW}×${ref.refH} · ${(ref.timescale / ref.delta).toFixed(2).replace(".", ",")} fps${ref.audio ? ` · áudio ${ref.audio.rate / 1000} kHz` : ""}` : "10 segundos gravados agora, de preferência com as mesmas configurações"}</p>
                </div>
                {ref && <span className="chip chip-mint">ok</span>}
                <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" className="hidden" disabled={busy} onChange={(e) => pickRef(e.target.files?.[0])} />
              </label>
              {refErr && <p className="text-xs text-[var(--color-danger)] mt-2">{refErr}</p>}
              <div className="mt-3 max-w-xs">
                <label className="label">Resolução do arquivo quebrado</label>
                <select className="input" value={res} disabled={busy} onChange={(e) => setRes(e.target.value)}>
                  <option value="auto">Descobrir sozinho</option>
                  {RESOLUTIONS.map(([w, h, l]) => <option key={l} value={`${w}x${h}`}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {kind === "wav" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">2 · Se o cabeçalho sumiu (opcional)</p>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate hover:border-mint cursor-pointer">
                <I.mic className="w-5 h-5 text-fog shrink-0" />
                <p className="text-sm flex-1 truncate">{refFile ? refFile.name : "WAV bom do mesmo gravador"}</p>
                <input type="file" accept="audio/wav,.wav" className="hidden" disabled={busy} onChange={(e) => pickRef(e.target.files?.[0])} />
              </label>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div><label className="label">Taxa</label><select className="input" value={manual.rate} onChange={(e) => setManual({ ...manual, rate: +e.target.value })}>{[44100, 48000, 96000].map((v) => <option key={v} value={v}>{v / 1000} kHz</option>)}</select></div>
                <div><label className="label">Canais</label><select className="input" value={manual.ch} onChange={(e) => setManual({ ...manual, ch: +e.target.value })}>{[1, 2, 4].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                <div><label className="label">Bits</label><select className="input" value={manual.bits} onChange={(e) => setManual({ ...manual, bits: +e.target.value })}>{[16, 24, 32].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              </div>
              <p className="text-xs text-fog mt-2">Só é usado se o arquivo não tiver cabeçalho e você não escolher um WAV de referência.</p>
            </div>
          )}

          <div className="pt-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">{kind === "video" ? "3" : "2"} · Recuperar</p>
            {!busy ? (
              <button className="btn btn-mint w-full sm:w-auto" disabled={!ready} onClick={run}><I.refresh className="w-4 h-4" />Escolher onde salvar e recuperar</button>
            ) : (
              <button className="btn btn-ghost" onClick={() => abort.current?.abort()}>Cancelar</button>
            )}
            {file && <p className="text-xs text-fog mt-2">Precisa de uns {gb(file.size)} livres no disco de destino.</p>}
          </div>

          {prog && busy && (
            <div className="rounded-xl bg-panel2 border border-line p-4">
              <div className="flex justify-between text-sm mb-2"><b>{pct.toFixed(0)}%</b><span className="text-fog tabular-nums">{gb(prog.done)} de {gb(prog.total)}{speed ? ` · ${Math.round(speed / 1e6)} MB/s · falta ${hms(eta)}` : ""}</span></div>
              <div className="h-2 rounded-full bg-ink overflow-hidden"><div className="h-full bg-mint transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
              {prog.frames !== undefined && <p className="text-xs text-fog mt-2 tabular-nums">{prog.frames.toLocaleString("pt-BR")} quadros encontrados. Não feche esta aba.</p>}
            </div>
          )}

          {err && <p className="text-sm text-[var(--color-danger)]">{err}</p>}

          {result && (
            <div className="rounded-xl border border-mint-dim bg-mint/5 p-4 rise">
              <p className="text-mint font-semibold flex items-center gap-2"><I.spark className="w-4 h-4" />Recuperado: {result.name}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mt-3 text-sm">
                {result.lines.map(([k, v]) => (<div key={k} className="contents"><dt className="text-fog">{k}</dt><dd className="tabular-nums">{v}</dd></div>))}
              </dl>
              {result.warn && <p className="text-xs text-[var(--color-amber,#f5c84c)] mt-3">{result.warn}</p>}
              <p className="text-xs text-fog mt-3">Abra no QuickTime ou importe no Premiere. Guarde o original até conferir o vídeo inteiro.</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Antes de começar</p>
            <ol className="space-y-3 text-sm text-[#d6d7d8]">
              {[
                "Copie o cartão inteiro para o computador ou um SSD. Trabalhe sempre na cópia.",
                "Coloque o cartão de volta na câmera e ligue: muitas Sony recuperam o .RSV sozinhas.",
                "Grave 10 segundos na mesma câmera, sem mudar as configurações. Esse é o clipe de referência.",
                "Deixe o computador ligado na tomada e esta aba aberta até terminar.",
              ].map((t, i) => (<li key={i} className="flex gap-3"><span className="font-mono text-mint text-xs mt-0.5">{i + 1}</span><span>{t}</span></li>))}
            </ol>
          </section>
          <section className="card p-5 text-sm">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">O que funciona</p>
            <div className="space-y-3">
              <div className="flex justify-between gap-3"><span><b>Sony .RSV / MP4 sem índice</b><br /><span className="text-fog text-xs">a6500, a7, FX3, FX30, ZV · XAVC S (H.264)</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>WAV cortado</b><br /><span className="text-fog text-xs">Zoom, Tascam e outros gravadores</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>XAVC HS (H.265) e outras marcas</b><br /><span className="text-fog text-xs">Canon, Panasonic, DJI, iPhone</span></span><span className="chip h-fit">em breve</span></div>
            </div>
          </section>
          <p className="text-xs text-fog px-1">Por que a referência? A Sony usa tabelas de compressão próprias. Sem elas, a imagem volta com faixas horizontais nas áreas lisas.</p>
        </aside>
      </div>
    </>
  );
}
