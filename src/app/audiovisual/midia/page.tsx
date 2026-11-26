"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHead from "@/components/PageHead";
import Modal from "@/components/agency/Modal";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { KINDS } from "@/lib/drive";

type St = { configured: boolean; google: boolean; drive: boolean; needsScope?: boolean; email?: string; cfg?: any };
const AUDIO = (m?: string) => !!m && m.startsWith("audio/");
const VIDEO = (m?: string) => !!m && m.startsWith("video/");
const IMAGE = (m?: string) => !!m && m.startsWith("image/");
const kb = (n?: number | null) => (!n ? "" : n > 1e9 ? (n / 1e9).toFixed(1) + " GB" : n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
const dur = (ms?: number | null) => { if (!ms) return ""; const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const ago = (iso?: string) => { if (!iso) return "nunca"; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString("pt-BR"); };
const KCOLOR: Record<string, string> = { sfx: "chip-mint", trilha: "text-[#f5c84c] border-[#5c4a1a]", insercao: "text-[#7aa7ff] border-[#24365c]", imagem: "text-[#c084fc] border-[#4a2d5c]", lut: "", modelo: "", referencia: "", outro: "" };
const kl = (k: string) => KINDS.find((x) => x.k === k)?.l || k;

export default function MidiaPage() {
  const [st, setSt] = useState<St | null>(null);
  const [items, setItems] = useState<any[] | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [kind, setKind] = useState("tudo");
  const [q, setQ] = useState("");
  const [client, setClient] = useState("");
  const [sel, setSel] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [picker, setPicker] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const loadItems = useCallback(async () => {
    const s = createClient();
    const [{ data }, { data: cl }] = await Promise.all([
      s.from("av_media").select("*").eq("missing", false).order("folder").order("name").limit(5000),
      s.from("ag_clients").select("id,name").order("name"),
    ]);
    setItems(data || []); setClients(cl || []);
  }, []);

  const sync = useCallback(async (quiet = false) => {
    setSyncing(true); if (!quiet) setMsg(null);
    const r = await fetch("/api/av/drive/sync", { method: "POST" }).then((x) => x.json()).catch(() => ({ error: "Falha de conexão" }));
    setSyncing(false);
    if (r.error) setMsg({ t: r.error });
    else if (!quiet || r.added) setMsg({ t: `${r.files} arquivo(s) no Drive${r.added ? `, ${r.added} novo(s)` : ""}.${r.truncated ? " A pasta é muito grande; parte ficou de fora." : ""}`, ok: true });
    await loadItems();
    const ns = await fetch("/api/av/drive/status").then((x) => x.json()).catch(() => null);
    if (ns) setSt(ns);
  }, [loadItems]);

  useEffect(() => {
    (async () => {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("google_erro")) setMsg({ t: qs.get("google_erro")! });
      if (qs.get("google") || qs.get("google_erro")) window.history.replaceState(null, "", window.location.pathname);
      const s: St = await fetch("/api/av/drive/status").then((x) => x.json()).catch(() => ({ configured: false, google: false, drive: false }));
      setSt(s);
      await loadItems();
      // sincroniza sozinho ao abrir, se a última leitura tiver mais de 10 minutos
      if (s.drive && s.cfg?.drive_folder_id && (!s.cfg.last_sync_at || Date.now() - new Date(s.cfg.last_sync_at).getTime() > 10 * 60000)) sync(true);
      if (s.drive && !s.cfg?.drive_folder_id) setPicker(true);
    })();
  }, [loadItems, sync]);

  const counts = useMemo(() => { const c: Record<string, number> = {}; (items || []).forEach((i) => (c[i.kind] = (c[i.kind] || 0) + 1)); return c; }, [items]);
  const tags = useMemo(() => { const c: Record<string, number> = {}; (items || []).forEach((i) => (i.tags || []).forEach((t: string) => (c[t] = (c[t] || 0) + 1))); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t); }, [items]);
  const list = useMemo(() => {
    let l = items || [];
    if (kind !== "tudo") l = l.filter((i) => i.kind === kind);
    if (client) l = l.filter((i) => (client === "geral" ? !i.client_id : i.client_id === client));
    if (q.trim()) {
      const ws = q.toLowerCase().split(/[\s,]+/).filter(Boolean);
      l = l.filter((i) => { const h = `${i.name} ${i.folder || ""} ${(i.tags || []).join(" ")} ${i.notes || ""}`.toLowerCase(); return ws.every((w) => h.includes(w)); });
    }
    return l.slice(0, 400);
  }, [items, kind, q, client]);

  function toggleAudio(it: any) {
    if (!audio.current) audio.current = new Audio();
    const a = audio.current;
    if (playing === it.drive_id) { a.pause(); setPlaying(null); return; }
    a.src = `/api/av/drive/file/${it.drive_id}`;
    a.onended = () => setPlaying(null);
    a.play().then(() => setPlaying(it.drive_id)).catch(() => setPlaying(null));
  }
  useEffect(() => () => audio.current?.pause(), []);

  async function save(patch: any) {
    if (!sel) return;
    const n = { ...sel, ...patch };
    setSel(n);
    setItems((l) => (l || []).map((x) => (x.id === n.id ? n : x)));
    await createClient().from("av_media").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", sel.id);
  }

  const connect = () => (window.location.href = "/api/google/connect?drive=1&next=" + encodeURIComponent("/audiovisual/midia"));
  const ready = st?.drive && st.cfg?.drive_folder_id;

  return (
    <>
      <PageHead kicker="04 · ACERVO" title="Banco de mídia" desc="Sua pasta do Google Drive vira o banco da produtora: efeitos, trilhas, inserções, LUTs e modelos com etiquetas, cliente e licença.">
        {ready && <button onClick={() => setPicker(true)} className="btn btn-ghost"><I.folder className="w-4 h-4" />{st!.cfg.drive_folder_name}</button>}
        {ready && <button onClick={() => sync()} disabled={syncing} className="btn btn-mint"><I.refresh className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Lendo o Drive…" : "Sincronizar"}</button>}
      </PageHead>

      {msg && <p className={`text-sm mb-4 ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.t}</p>}

      {!st && <p className="text-sm text-fog">Carregando…</p>}

      {st && !st.drive && (
        <section className="card p-6 max-w-2xl">
          <span className="w-11 h-11 rounded-xl bg-panel2 grid place-items-center text-mint"><I.folder className="w-5 h-5" /></span>
          <h2 className="font-display font-bold text-xl mt-4">Conecte o seu Google Drive</h2>
          <p className="text-sm text-fog mt-2 leading-relaxed">
            Você escolhe uma pasta (por exemplo “VINCIT Mídia”, com subpastas Efeitos, Trilhas, Inserções, LUTs e Modelos). O HUB lê os arquivos, mostra a prévia e guarda as etiquetas. Os arquivos continuam no seu Drive: o que você colocar ou apagar lá aparece aqui na próxima sincronização.
          </p>
          {!st.configured ? (
            <p className="text-sm text-danger mt-4">A integração com o Google ainda não foi configurada pelo administrador.</p>
          ) : (
            <>
              <button onClick={connect} className="btn btn-mint mt-5">{st.google ? "Liberar acesso ao Drive" : "Conectar com o Google"}</button>
              <p className="text-xs text-fog mt-3">{st.google ? `Sua conta Google${st.email ? ` (${st.email})` : ""} já está conectada para a Agenda; falta permitir a leitura do Drive.` : "O HUB só lê os arquivos. Ele não altera nem apaga nada no seu Drive."}</p>
            </>
          )}
        </section>
      )}

      {st?.drive && !st.cfg?.drive_folder_id && (
        <section className="card p-6 max-w-2xl">
          <h2 className="font-display font-bold text-xl">Escolha a pasta do banco de mídia</h2>
          <p className="text-sm text-fog mt-2">Tudo o que estiver dentro dela, inclusive em subpastas, entra no HUB. O nome das subpastas ajuda a separar efeitos, trilhas e inserções.</p>
          <button onClick={() => setPicker(true)} className="btn btn-mint mt-5"><I.folder className="w-4 h-4" />Escolher pasta</button>
        </section>
      )}

      {ready && (
        <>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="flex gap-1 overflow-x-auto scroll-thin bg-panel border border-line rounded-xl p-1 text-[13px] font-semibold">
              {[["tudo", "Tudo", items?.length || 0] as const, ...KINDS.filter((k) => counts[k.k]).map((k) => [k.k, k.l, counts[k.k]] as const)].map(([k, l, n]) => (
                <button key={k} onClick={() => setKind(k)} className={`shrink-0 px-3 py-1.5 rounded-lg ${kind === k ? "bg-panel2 text-paper" : "text-fog hover:text-paper"}`}>{l} <span className="font-mono text-[11px] opacity-70">{n}</span></button>
              ))}
            </div>
            <div className="relative md:ml-auto md:w-64">
              <I.search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
              <input className="input pl-9" placeholder="whoosh, café, transição…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {tags.length > 0 && <span className="font-mono text-[10px] uppercase tracking-widest text-fog mr-1">Etiquetas</span>}
            {tags.map((t) => <button key={t} onClick={() => setQ(q === t ? "" : t)} className={`chip ${q === t ? "chip-mint" : "hover:text-paper"}`}>{t}</button>)}
            <select className="input !w-auto !py-1 !text-xs ml-auto" value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">Cliente: todos</option><option value="geral">Uso geral</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-fog mt-2">Última leitura do Drive {ago(st!.cfg.last_sync_at)}{st!.cfg.last_error ? ` · ${st!.cfg.last_error}` : ""}</p>

          {items && !list.length && <p className="text-sm text-fog py-12 text-center">{items.length ? "Nada com esses filtros." : "A pasta está vazia. Coloque arquivos nela pelo Drive e toque em Sincronizar."}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
            {list.map((it) => (
              <div key={it.id} className={`card p-2.5 cursor-pointer hover:border-fog transition-colors ${sel?.id === it.id ? "!border-mint-dim" : ""}`} onClick={() => setSel(it)}>
                <div className="relative h-28 rounded-xl bg-panel2 overflow-hidden grid place-items-center">
                  {AUDIO(it.mime) ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleAudio(it); }} className={`w-11 h-11 rounded-full grid place-items-center ${playing === it.drive_id ? "bg-mint text-[var(--color-on-mint,#06140e)]" : "border border-line text-paper"}`} aria-label="Ouvir">
                      {playing === it.drive_id ? <I.pause className="w-4 h-4" /> : <I.play className="w-4 h-4 ml-0.5" />}
                    </button>
                  ) : it.has_thumb ? (
                    <img src={`/api/av/drive/thumb/${it.drive_id}?s=400`} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-mono text-xs text-fog uppercase">.{(it.name.split(".").pop() || "").slice(0, 6)}</span>
                  )}
                  {(it.duration_ms || VIDEO(it.mime)) && <span className="absolute right-1.5 bottom-1.5 font-mono text-[10px] bg-black/70 rounded px-1.5 py-0.5">{dur(it.duration_ms) || "vídeo"}</span>}
                  {it.favorite && <span className="absolute left-1.5 top-1.5 text-mint text-sm">★</span>}
                </div>
                <p className="text-[13px] font-semibold mt-2 leading-snug line-clamp-2 break-words">{it.name}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className={`chip ${KCOLOR[it.kind] || ""}`}>{kl(it.kind)}</span>
                  {it.client_id && <span className="chip">{clients.find((c) => c.id === it.client_id)?.name}</span>}
                  {it.license_until && new Date(it.license_until) < new Date(Date.now() + 30 * 864e5) && <span className="chip text-danger">licença</span>}
                </div>
              </div>
            ))}
          </div>
          {list.length === 400 && <p className="text-xs text-fog text-center mt-4">Mostrando os 400 primeiros. Use a busca para achar o resto.</p>}
        </>
      )}

      <Modal open={!!sel} title={sel?.name || ""} onClose={() => setSel(null)} wide>
        {sel && <Detail it={sel} clients={clients} save={save} playing={playing === sel.drive_id} toggle={() => toggleAudio(sel)} />}
      </Modal>
      {picker && <FolderPicker onClose={() => setPicker(false)} onPick={async (f) => {
        setPicker(false);
        const r = await fetch("/api/av/drive/folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).then((x) => x.json());
        if (r.error) { setMsg({ t: r.error }); return; }
        setSt((s) => s && { ...s, cfg: { ...(s.cfg || {}), drive_folder_id: f.id, drive_folder_name: f.name } });
        sync();
      }} />}
    </>
  );
}

function Detail({ it, clients, save, playing, toggle }: { it: any; clients: any[]; save: (p: any) => void; playing: boolean; toggle: () => void }) {
  const [tag, setTag] = useState("");
  const [notes, setNotes] = useState(it.notes || "");
  const [src, setSrc] = useState(it.license_source || "");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setNotes(it.notes || ""); setSrc(it.license_source || ""); }, [it.id]); // eslint-disable-line
  const addTag = () => { const t = tag.trim().toLowerCase(); if (!t || (it.tags || []).includes(t)) return setTag(""); save({ tags: [...(it.tags || []), t] }); setTag(""); };
  return (
    <div className="grid md:grid-cols-[1.1fr_1fr] gap-5">
      <div>
        <div className="rounded-xl bg-black border border-line overflow-hidden grid place-items-center min-h-[200px]">
          {AUDIO(it.mime) ? (
            <div className="p-6 w-full flex flex-col items-center gap-3">
              <audio controls autoPlay={false} onPlay={() => playing && toggle()} preload="none" src={`/api/av/drive/file/${it.drive_id}`} className="w-full" />
            </div>
          ) : VIDEO(it.mime) ? (
            <iframe src={`https://drive.google.com/file/d/${it.drive_id}/preview`} className="w-full aspect-video" allow="autoplay" />
          ) : IMAGE(it.mime) ? (
            <img src={`/api/av/drive/file/${it.drive_id}`} alt="" className="max-h-[360px] object-contain" />
          ) : it.has_thumb ? (
            <img src={`/api/av/drive/thumb/${it.drive_id}?s=800`} alt="" className="max-h-[360px] object-contain" />
          ) : <span className="font-mono text-fog">.{it.name.split(".").pop()}</span>}
        </div>
        <p className="text-xs text-fog mt-2 break-all">{[it.folder || "pasta principal", kb(it.size), it.width && it.height ? `${it.width}×${it.height}` : "", dur(it.duration_ms)].filter(Boolean).join(" · ")}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <a href={`/api/av/drive/file/${it.drive_id}?download=1`} className="btn btn-mint btn-sm">Baixar</a>
          {it.web_link && <a href={it.web_link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir no Drive</a>}
          {it.web_link && <button onClick={() => { navigator.clipboard.writeText(it.web_link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn btn-ghost btn-sm">{copied ? "Copiado" : "Copiar link"}</button>}
          <button onClick={() => save({ favorite: !it.favorite })} className={`btn btn-ghost btn-sm ${it.favorite ? "text-mint" : ""}`}>{it.favorite ? "★ Favorito" : "☆ Favoritar"}</button>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={it.kind} onChange={(e) => save({ kind: e.target.value })}>{KINDS.map((k) => <option key={k.k} value={k.k}>{k.l}</option>)}</select>
        </div>
        <div>
          <label className="label">Etiquetas</label>
          <div className="flex flex-wrap gap-1.5 mb-2">{(it.tags || []).map((t: string) => <button key={t} onClick={() => save({ tags: it.tags.filter((x: string) => x !== t) })} className="chip hover:text-danger">{t} ×</button>)}</div>
          <input className="input" placeholder="whoosh, transição… e Enter" value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} onBlur={addTag} />
        </div>
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={it.client_id || ""} onChange={(e) => save({ client_id: e.target.value || null })}>
            <option value="">Uso geral</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Origem / licença</label><input className="input" placeholder="Artlist, Envato, próprio…" value={src} onChange={(e) => setSrc(e.target.value)} onBlur={() => src !== (it.license_source || "") && save({ license_source: src || null })} /></div>
          <div><label className="label">Licença válida até</label><input type="date" className="input" value={it.license_until || ""} onChange={(e) => save({ license_until: e.target.value || null })} /></div>
        </div>
        <div><label className="label">Notas</label><textarea className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (it.notes || "") && save({ notes: notes || null })} placeholder="Onde usar, crédito obrigatório…" /></div>
      </div>
    </div>
  );
}

function FolderPicker({ onClose, onPick }: { onClose: () => void; onPick: (f: { id: string; name: string }) => void }) {
  const [stack, setStack] = useState<{ id: string; name: string }[]>([{ id: "root", name: "Meu Drive" }]);
  const [data, setData] = useState<{ folders: any[]; error?: string } | null>(null);
  const top = stack[stack.length - 1];
  useEffect(() => {
    setData(null);
    fetch(`/api/av/drive/folders?parent=${encodeURIComponent(top.id)}`).then((x) => x.json()).then((r) => setData({ folders: r.folders || [], error: r.error })).catch(() => setData({ folders: [], error: "Falha de conexão" }));
  }, [top.id]);
  const real = top.id !== "root" && top.id !== "shared";
  return (
    <Modal open title="Pasta do banco de mídia" onClose={onClose}>
      <div className="flex gap-1 bg-panel2 rounded-xl p-1 mb-3 text-xs font-semibold">
        {[{ id: "root", name: "Meu Drive" }, { id: "shared", name: "Compartilhados comigo" }].map((r) => (
          <button key={r.id} onClick={() => setStack([r])} className={`flex-1 py-1.5 rounded-lg ${stack[0].id === r.id ? "bg-panel text-paper" : "text-fog"}`}>{r.name}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-fog mb-2">
        {stack.map((f, i) => (<span key={f.id + i} className="flex items-center gap-1">{i > 0 && "/"}<button onClick={() => setStack(stack.slice(0, i + 1))} className="hover:text-paper">{f.name}</button></span>))}
      </div>
      <div className="border border-line rounded-xl max-h-[46vh] overflow-y-auto scroll-thin divide-y divide-line">
        {!data && <p className="text-sm text-fog p-4">Carregando pastas…</p>}
        {data?.error && <p className="text-sm text-danger p-4">{data.error}</p>}
        {data && !data.error && !data.folders.length && <p className="text-sm text-fog p-4">Sem subpastas aqui.</p>}
        {data?.folders.map((f) => (
          <button key={f.id} onClick={() => setStack([...stack, f])} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-panel2">
            <I.folder className="w-4 h-4 text-fog" /><span className="flex-1 truncate">{f.name}</span><I.arrow className="w-3.5 h-3.5 text-fog" />
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4 gap-2">
        <p className="text-xs text-fog">Entre na pasta e toque em usar.</p>
        <button disabled={!real} onClick={() => onPick(top)} className="btn btn-mint btn-sm">Usar “{real ? top.name : "…"}”</button>
      </div>
    </Modal>
  );
}
