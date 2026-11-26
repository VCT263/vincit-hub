"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { RESOLUTIONS, buildMoov, fileSource, guessResolution, readReference, repairWav, scanAndCopy, sniff, type RefParams, type Sink } from "@/lib/recovery";
import { buildGenericMoov, readGenericReference, scanGeneric, type GenRef } from "@/lib/recovery-nal";

type Kind = "video" | "wav";
type Result = { name: string; lines: [string, string][]; warn?: string; url?: string; ok: boolean };
/** Sony H.264 (XAVC S) usa o motor próprio, que refaz o SPS; o resto usa o motor genérico de NAL */
type Engine = { sony: RefParams | null; gen: GenRef | null };

const gb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1).replace(".", ",")} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`);
const hms = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`; };
const outName = (n: string, ext: string) => n.replace(/\.[^.]+$/, "") + "_RECUPERADO." + ext;
const fps = (ts: number, d: number) => (ts / d).toFixed(2).replace(".", ",");

export default function Recuperador() {
  const [supported, setSupported] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<Kind | null>(null);
  const [mixed, setMixed] = useState(false);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [eng, setEng] = useState<Engine | null>(null);
  const [refErr, setRefErr] = useState<string | null>(null);
  const [res, setRes] = useState("auto");
  const [withAudio, setWithAudio] = useState(true);
  const [manual, setManual] = useState({ rate: 48000, ch: 2, bits: 24 });
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<{ done: number; total: number; frames?: number; phase: string; t0: number; i: number } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { setSupported(typeof window !== "undefined" && "showSaveFilePicker" in window); }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (busy) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  const clearResults = () => setResults((r) => { r.forEach((x) => x.url && URL.revokeObjectURL(x.url)); return []; });
  useEffect(() => () => clearResults(), []);

  async function pickBroken(list?: FileList | null) {
    const fs = Array.from(list || []);
    setFiles(fs); setKind(null); setMixed(false); clearResults(); setErr(null);
    if (!fs.length) return;
    const ks = await Promise.all(fs.map(async (f) => ((await sniff(fileSource(f))) === "wav" ? "wav" : "video") as Kind));
    setMixed(ks.some((k) => k !== ks[0]));
    setKind(ks[0]);
    if (ks[0] === "wav") { setEng(null); }
  }
  async function pickRef(f?: File | null) {
    setRefFile(f || null); setEng(null); setRefErr(null);
    if (!f || kind === "wav") return;
    let gen: GenRef | null = null, sony: RefParams | null = null, e1: any = null;
    try { gen = await readGenericReference(fileSource(f)); } catch (e) { e1 = e; }
    if (!gen || (gen.codec === "avc" && gen.xavc)) { try { sony = await readReference(fileSource(f)); } catch { /* fica no genérico */ } }
    if (!gen && !sony) { setRefErr(e1?.message || String(e1)); return; }
    setEng({ gen, sony });
  }

  async function recoverVideo(file: File, sink: Sink, ac: AbortController, onProgress: (p: any) => void): Promise<Omit<Result, "name" | "url" | "ok">> {
    const src = fileSource(file);
    if (eng?.sony) {
      const ref = eng.sony;
      const ix = await scanAndCopy(src, sink, ref.l2fn, ref.l2poc, onProgress, ac.signal);
      if (!ix.frames.length) throw new Error("Não encontrei quadros de vídeo válidos no arquivo.");
      if (!withAudio) ix.audio = [];
      let wh: [number, number] | null = res === "auto" ? guessResolution(ix.firstMbs, ref) : (RESOLUTIONS.find((r) => `${r[0]}x${r[1]}` === res)!.slice(0, 2) as [number, number]);
      let warn: string | undefined;
      if (!wh) { wh = [ref.refW, ref.refH]; warn = "Não consegui confirmar a resolução: usei a do clipe de referência. Se o vídeo não abrir, rode de novo escolhendo a resolução."; }
      const m = buildMoov(ix, ref, wh[0], wh[1]);
      await sink.write(m.moov);
      return {
        warn,
        lines: [
          ["Duração", hms(m.seconds)],
          ["Quadros", ix.frames.length.toLocaleString("pt-BR")],
          ["Vídeo", `${wh[0]}×${wh[1]} · ${fps(ref.timescale, ref.delta)} fps · H.264 · Sony XAVC S`],
          ["Áudio", !withAudio ? "desligado" : ref.audio && ix.audio.length ? `${hms(m.audioSeconds)} · ${ref.audio.ch} canais · ${ref.audio.rate / 1000} kHz` : "não encontrado"],
          ["Perdido no fim", ix.tail ? gb(ix.tail) + " (o trecho que a câmera não fechou)" : "nada"],
        ],
      };
    }
    const r = eng!.gen!;
    const ix = await scanGeneric(src, sink, r, withAudio, onProgress, ac.signal);
    if (!ix.frames.length) throw new Error("Não encontrei quadros de vídeo válidos no arquivo.");
    const m = buildGenericMoov(ix, r);
    await sink.write(m.moov);
    const aac = !!r.audio && !r.audio.pcm;
    const warns: string[] = [];
    if (withAudio && aac) warns.push(`Essa câmera grava o som em ${r.audio!.fourcc.trim().toUpperCase()} (compactado), que não dá para separar do vídeo sem o índice. O vídeo volta sem som: use o áudio de um gravador externo, se tiver.`);
    if (ix.dropped > 1) warns.push(`${ix.dropped} quadros do começo ficaram de fora porque vinham antes do primeiro quadro completo.`);
    return {
      warn: warns.join(" ") || undefined,
      lines: [
        ["Duração", hms(m.seconds)],
        ["Quadros", ix.frames.length.toLocaleString("pt-BR")],
        ["Vídeo", `${r.w}×${r.h} · ${fps(r.vTimescale, r.vDelta)} fps · ${r.label}`],
        ["Áudio", !withAudio ? "desligado" : aac ? "não recuperável (compactado)" : r.audio && ix.audio.length ? `${hms(m.audioSeconds)} · ${r.audio.ch} canais · ${r.audio.rate / 1000} kHz` : "não encontrado"],
        ["Perdido no fim", ix.tail ? gb(ix.tail) + " (o trecho que a câmera não fechou)" : "nada"],
      ],
    };
  }

  async function run() {
    if (!files.length || !kind) return;
    setErr(null); clearResults();
    const ext = kind === "wav" ? "WAV" : eng?.sony || eng?.gen?.brandQt ? "MOV" : "MP4";
    const types = [{ description: kind === "wav" ? "Áudio WAV" : "Vídeo", accept: kind === "wav" ? { "audio/wav": [".wav"] } : ext === "MOV" ? { "video/quicktime": [".mov"] } : { "video/mp4": [".mp4"] } }];
    // um arquivo: escolhe onde salvar; vários: escolhe a pasta
    let handles: any[] = [];
    try {
      if (files.length === 1) handles = [await (window as any).showSaveFilePicker({ suggestedName: outName(files[0].name, ext), types })];
      else {
        const dir = await (window as any).showDirectoryPicker({ mode: "readwrite" });
        for (const f of files) handles.push(await dir.getFileHandle(outName(f.name, ext), { create: true }));
      }
    } catch { return; }
    const ac = new AbortController(); abort.current = ac;
    setBusy(true);
    const out: Result[] = [];
    for (let i = 0; i < files.length; i++) {
      if (ac.signal.aborted) break;
      const file = files[i], handle = handles[i];
      const t0 = performance.now();
      const onProgress = (p: any) => setProg({ ...p, t0, i });
      setProg({ done: 0, total: file.size, phase: "copiando", t0, i });
      const writable = await handle.createWritable();
      const sink = { write: async (b: Uint8Array) => { if (ac.signal.aborted) throw new Error("Cancelado."); await writable.write(b); } };
      try {
        let body: Omit<Result, "name" | "url" | "ok">;
        if (kind === "wav") {
          const info = await repairWav(fileSource(file), sink, refFile ? fileSource(refFile) : null, manual, onProgress);
          body = { lines: [["Duração", hms(info.seconds)], ["Formato", `${info.ch} canais · ${info.rate / 1000} kHz · ${info.bits} bits`], ["Áudio recuperado", gb(info.bytes)], ["Tipo", info.rf64 ? "RF64 (acima de 4 GB)" : "WAV padrão"]] };
        } else {
          if (!eng) throw new Error("Escolha o clipe de referência antes.");
          body = await recoverVideo(file, sink, ac, onProgress);
        }
        await writable.close();
        let url: string | undefined;
        try { url = URL.createObjectURL(await handle.getFile()); } catch { /* sem prévia */ }
        out.push({ name: handle.name, ok: true, url, ...body });
      } catch (e: any) {
        try { await writable.abort(); } catch {}
        const msg = e?.message === "Cancelado." ? "Recuperação cancelada. O arquivo parcial foi descartado." : `Não deu certo: ${e?.message || e}`;
        if (files.length === 1) setErr(msg); else out.push({ name: file.name, ok: false, lines: [], warn: msg });
      }
      setResults([...out]);
    }
    setBusy(false); abort.current = null;
  }

  const pct = prog ? Math.min(100, (prog.done / prog.total) * 100) : 0;
  const elapsed = prog ? (performance.now() - prog.t0) / 1000 : 0;
  const speed = prog && elapsed > 1 ? prog.done / elapsed : 0;
  const eta = speed ? (prog!.total - prog!.done) / speed : 0;
  const total = files.reduce((s, f) => s + f.size, 0);
  const ready = !!files.length && !mixed && (kind === "wav" || (kind === "video" && !!eng)) && supported && !busy;
  const engLabel = eng?.sony ? "Sony XAVC S · H.264" : eng?.gen?.label;
  const multi = files.length > 1;

  return (
    <>
      <PageHead kicker="FERRAMENTAS" title="Recuperador de arquivos" desc="Traz de volta vídeo que não abre (Sony, Canon, Panasonic, DJI, iPhone, em H.264 ou H.265) e áudio WAV cortado. Tudo roda no seu computador: o arquivo não é enviado para lugar nenhum.">
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
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">1 · Arquivos corrompidos</p>
            <label className={`flex items-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-colors ${files.length ? "border-mint-dim" : "border-slate hover:border-mint"}`}>
              <I.folder className="w-5 h-5 text-fog shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{multi ? `${files.length} arquivos` : files[0] ? files[0].name : "Escolher .RSV, .MP4, .MOV ou .WAV"}</p>
                <p className="text-xs text-fog">{files.length ? `${gb(total)} · ${kind === "video" ? "vídeo sem índice" : kind === "wav" ? "áudio WAV" : "analisando…"}` : "Pode escolher vários da mesma câmera. Use uma cópia do cartão, nunca o cartão direto"}</p>
              </div>
              {kind && <span className="chip chip-mint">{kind === "video" ? "Vídeo" : "WAV"}</span>}
              <input type="file" multiple className="hidden" disabled={busy} onChange={(e) => pickBroken(e.target.files)} />
            </label>
            {multi && <p className="text-xs text-fog mt-2 truncate">{files.map((f) => f.name).join(" · ")}</p>}
            {mixed && <p className="text-xs text-[var(--color-danger)] mt-2">Misturou vídeo e WAV. Recupere um tipo de cada vez.</p>}
          </div>

          {kind === "video" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">2 · Clipe de referência</p>
              <label className={`flex items-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-colors ${eng ? "border-mint-dim" : "border-slate hover:border-mint"}`}>
                <I.video className="w-5 h-5 text-fog shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{refFile ? refFile.name : "Escolher um vídeo bom da mesma câmera"}</p>
                  <p className="text-xs text-fog">
                    {eng?.sony ? `${eng.sony.refW}×${eng.sony.refH} · ${fps(eng.sony.timescale, eng.sony.delta)} fps${eng.sony.audio ? ` · áudio ${eng.sony.audio.rate / 1000} kHz` : ""}`
                      : eng?.gen ? `${eng.gen.w}×${eng.gen.h} · ${fps(eng.gen.vTimescale, eng.gen.vDelta)} fps${eng.gen.audio ? ` · áudio ${eng.gen.audio.pcm ? `${eng.gen.audio.rate / 1000} kHz` : "compactado"}` : ""}`
                      : "10 segundos gravados agora, com as mesmas configurações (resolução, fps, codec)"}
                  </p>
                </div>
                {engLabel && <span className="chip chip-mint">{engLabel}</span>}
                <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" className="hidden" disabled={busy} onChange={(e) => pickRef(e.target.files?.[0])} />
              </label>
              {refErr && <p className="text-xs text-[var(--color-danger)] mt-2">{refErr}</p>}
              <div className="mt-3 flex flex-wrap items-end gap-4">
                {eng?.sony && (
                  <div className="max-w-xs flex-1 min-w-[12rem]">
                    <label className="label">Resolução do arquivo quebrado</label>
                    <select className="input" value={res} disabled={busy} onChange={(e) => setRes(e.target.value)}>
                      <option value="auto">Descobrir sozinho</option>
                      {RESOLUTIONS.map(([w, h, l]) => <option key={l} value={`${w}x${h}`}>{l}</option>)}
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                  <input type="checkbox" checked={withAudio} disabled={busy} onChange={(e) => setWithAudio(e.target.checked)} className="accent-[var(--color-mint)]" />
                  Recuperar o áudio também
                </label>
              </div>
              {eng?.gen && !eng.sony && eng.gen.audio && !eng.gen.audio.pcm && (
                <p className="text-xs text-fog mt-2">Essa câmera grava som compactado ({eng.gen.audio.fourcc.trim().toUpperCase()}). O vídeo volta, mas sem som.</p>
              )}
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
              <button className="btn btn-mint w-full sm:w-auto" disabled={!ready} onClick={run}><I.refresh className="w-4 h-4" />{multi ? "Escolher a pasta e recuperar todos" : "Escolher onde salvar e recuperar"}</button>
            ) : (
              <button className="btn btn-ghost" onClick={() => abort.current?.abort()}>Cancelar</button>
            )}
            {!!files.length && <p className="text-xs text-fog mt-2">Precisa de uns {gb(total)} livres no disco de destino.</p>}
          </div>

          {prog && busy && (
            <div className="rounded-xl bg-panel2 border border-line p-4">
              {multi && <p className="text-xs text-fog mb-2 truncate">Arquivo {prog.i + 1} de {files.length} · {files[prog.i]?.name}</p>}
              <div className="flex justify-between text-sm mb-2"><b>{pct.toFixed(0)}%</b><span className="text-fog tabular-nums">{gb(prog.done)} de {gb(prog.total)}{speed ? ` · ${Math.round(speed / 1e6)} MB/s · falta ${hms(eta)}` : ""}</span></div>
              <div className="h-2 rounded-full bg-ink overflow-hidden"><div className="h-full bg-mint transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
              {prog.frames !== undefined && <p className="text-xs text-fog mt-2 tabular-nums">{prog.frames.toLocaleString("pt-BR")} quadros encontrados. Não feche esta aba.</p>}
            </div>
          )}

          {err && <p className="text-sm text-[var(--color-danger)]">{err}</p>}

          {results.map((r) => (
            <div key={r.name} className={`rounded-xl border p-4 rise ${r.ok ? "border-mint-dim bg-mint/5" : "border-[var(--color-danger)]/40"}`}>
              <p className={`font-semibold flex items-center gap-2 ${r.ok ? "text-mint" : "text-[var(--color-danger)]"}`}><I.spark className="w-4 h-4" />{r.ok ? "Recuperado" : "Falhou"}: {r.name}</p>
              {!!r.lines.length && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mt-3 text-sm">
                  {r.lines.map(([k, v]) => (<div key={k} className="contents"><dt className="text-fog">{k}</dt><dd className="tabular-nums">{v}</dd></div>))}
                </dl>
              )}
              {r.warn && <p className={`text-xs mt-3 ${r.ok ? "text-[var(--color-amber,#f5c84c)]" : "text-[var(--color-danger)]"}`}>{r.warn}</p>}
              {r.url && kind === "video" && (
                <div className="mt-3">
                  <video src={r.url} controls preload="metadata" className="w-full rounded-lg bg-black max-h-80" />
                  <p className="text-[11px] text-fog mt-1">Prévia. Se não tocar aqui (H.265 e som PCM nem sempre tocam no navegador), abra no QuickTime, VLC ou Premiere.</p>
                </div>
              )}
              {r.url && kind === "wav" && <audio src={r.url} controls className="w-full mt-3" />}
              {r.ok && <p className="text-xs text-fog mt-3">Guarde o original até conferir o arquivo inteiro.</p>}
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">Antes de começar</p>
            <ol className="space-y-3 text-sm text-[#d6d7d8]">
              {[
                "Copie o cartão inteiro para o computador ou um SSD. Trabalhe sempre na cópia.",
                "Coloque o cartão de volta na câmera e ligue: muitas câmeras recuperam o arquivo sozinhas.",
                "Grave 10 segundos na mesma câmera, sem mudar as configurações. Esse é o clipe de referência.",
                "Deixe o computador ligado na tomada e esta aba aberta até terminar.",
              ].map((t, i) => (<li key={i} className="flex gap-3"><span className="font-mono text-mint text-xs mt-0.5">{i + 1}</span><span>{t}</span></li>))}
            </ol>
          </section>
          <section className="card p-5 text-sm">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-3">O que funciona</p>
            <div className="space-y-3">
              <div className="flex justify-between gap-3"><span><b>Sony .RSV / MP4 sem índice</b><br /><span className="text-fog text-xs">a6500, a7, FX3, FX30, ZV · XAVC S (H.264) e XAVC HS (H.265)</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>Outras câmeras em H.264 ou H.265</b><br /><span className="text-fog text-xs">Canon, Panasonic, Fujifilm, DJI, GoPro, iPhone · MP4 e MOV</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>Som junto do vídeo</b><br /><span className="text-fog text-xs">Volta quando a câmera grava PCM (sem compressão). Com AAC, o vídeo volta sem som.</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>WAV cortado</b><br /><span className="text-fog text-xs">Zoom, Tascam e outros gravadores</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>Vários arquivos de uma vez</b><br /><span className="text-fog text-xs">Escolha todos do mesmo cartão e uma pasta de destino</span></span><span className="chip chip-mint h-fit">pronto</span></div>
              <div className="flex justify-between gap-3"><span><b>ProRes, BRAW e RAW</b><br /><span className="text-fog text-xs">Blackmagic, Atomos, cinema</span></span><span className="chip h-fit">ainda não</span></div>
            </div>
          </section>
          <p className="text-xs text-fog px-1">Por que a referência? O arquivo quebrado perdeu o índice e as configurações do vídeo. O clipe bom da mesma câmera devolve essas informações, e o resto o Recuperador encontra dentro do arquivo.</p>
        </aside>
      </div>
    </>
  );
}
