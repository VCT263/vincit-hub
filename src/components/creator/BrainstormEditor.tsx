"use client";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Excalidraw, MainMenu, WelcomeScreen, convertToExcalidrawElements, serializeAsJSON, exportToBlob,
  getSceneVersion, newElementWith, CaptureUpdateAction, restoreElements,
} from "@excalidraw/excalidraw";
import { createClient } from "@/lib/supabase/client";
import { I } from "@/components/icons";
import { BUCKET, CATEGORIES, FONT, STICKY, TEMPLATES, arrowBetween, sticky, templateByKey, uid } from "@/lib/brainstorm";
import { useContentStatuses } from "@/lib/content";

type Api = any; // ExcalidrawImperativeAPI
type FileMeta = Record<string, { path: string; mimeType: string; created: number }>;
type Save = "carregando" | "salvo" | "pendente" | "salvando" | "erro";

const THEME_KEY = "vincit:brainstorm:tema";
const CONTAINERS = ["rectangle", "ellipse", "diamond"];
/** links que viram prévia dentro do quadro, além dos que o Excalidraw já aceita (YouTube, Vimeo, Figma, X…) */
const EMBED_OK = [/^https:\/\/open\.spotify\.com\//, /^https:\/\/docs\.google\.com\//, /^https:\/\/(www\.)?canva\.com\/design\/.+\/view/, /^https:\/\/(www\.)?loom\.com\/(share|embed)\//, /^https:\/\/[\w-]+\.notion\.site\//, /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/embed/];

/** a fonte dos modelos precisa estar carregada antes de medir os textos, senão eles ficam cortados */
async function loadFont() {
  try {
    const timeout = new Promise((r) => setTimeout(r, 2500));
    const got = await Promise.race([document.fonts.load("20px Nunito"), timeout]);
    if (Array.isArray(got) && got.length) return;
    const face = new FontFace("Nunito", "url(/excalidraw/fonts/Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2)", { weight: "400" });
    document.fonts.add(face);
    await Promise.race([face.load(), timeout]);
  } catch {}
}

const toDataURL = (b: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.onerror = no; r.readAsDataURL(b); });

export default function BrainstormEditor({ id }: { id: string }) {
  const router = useRouter();
  const { statuses } = useContentStatuses();
  const [api, setApi] = useState<Api>(null);
  const [board, setBoard] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Save>("carregando");
  const [sel, setSel] = useState({ shape: false, text: 0 });
  const [menu, setMenu] = useState<"" | "postit" | "modelos" | "ajuda">("");
  const [toast, setToast] = useState("");
  const [initial, setInitial] = useState<any>(null);
  const modelo = useRef(new URLSearchParams(location.search).get("modelo")); // lido uma vez só

  const uidRef = useRef<string>("");
  const filesMeta = useRef<FileMeta>({});
  const lastKey = useRef<string>("");
  const timer = useRef<any>(null);
  const saving = useRef<Promise<void> | null>(null);
  const lastPreview = useRef(0);
  const ready = useRef(false);

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3200); };

  /* 1. carrega o quadro */
  useEffect(() => {
    (async () => {
      const s = createClient();
      const [{ data: u }, { data, error }] = await Promise.all([s.auth.getUser(), s.from("brainstorm_boards").select("*").eq("id", id).maybeSingle()]);
      if (error || !data) { setNotFound(true); return; }
      await loadFont();
      uidRef.current = u.user?.id || "";
      filesMeta.current = data.files || {};
      setBoard(data); setTitle(data.title);
      let theme = "dark";
      try { theme = localStorage.getItem(THEME_KEY) || "dark"; } catch {}
      const sc = data.scene || {};
      // quadro novo criado a partir de um modelo: já abre com ele
      const t = templateByKey(modelo.current);
      const els = sc.elements?.length ? sc.elements : t ? convertToExcalidrawElements(t.build(0, 0) as any, { regenerateIds: false }) : [];
      if (t) history.replaceState(null, "", location.pathname);
      setInitial({
        elements: els,
        appState: { currentItemFontFamily: FONT, currentItemRoughness: 0, currentItemRoundness: "round", ...(sc.appState || {}), theme, name: data.title },
        scrollToContent: true,
      });
    })();
  }, [id]);

  /* 2. com a cena inicial aplicada: imagens do Storage */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!api || !board || !mounted) return;
    (async () => {
      const metas = Object.entries(filesMeta.current);
      if (metas.length) {
        const s = createClient();
        const loaded = await Promise.all(metas.map(async ([fid, m]) => {
          const { data } = await s.storage.from(BUCKET).download(m.path);
          return data ? { id: fid, mimeType: m.mimeType, created: m.created, dataURL: await toDataURL(data) } : null;
        }));
        api.addFiles(loaded.filter(Boolean));
      }
      if (!board.scene?.elements?.length && api.getSceneElements().length) await refit(api.getSceneElements());
      // modelo recém-aplicado ainda não está no banco: força o primeiro salvamento
      lastKey.current = board.scene?.elements?.length || !api.getSceneElements().length ? keyOf(api.getSceneElements(), api.getAppState(), api.getFiles()) : "";
      ready.current = true;
      setStatus("salvo");
      if (!lastKey.current) schedule();
    })();
  }, [api, board, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  const keyOf = (els: readonly any[], app: any, files: any) => `${getSceneVersion(els)}|${app.viewBackgroundColor}|${Object.keys(files || {}).length}`;

  /* 3. salvar (cena + imagens novas + miniatura) */
  const save = useCallback(async () => {
    if (!api || !ready.current) return;
    if (saving.current) await saving.current;
    const run = (async () => {
      setStatus("salvando");
      const s = createClient();
      try {
        const els = api.getSceneElements();
        const app = api.getAppState();
        const files = api.getFiles();
        const key = keyOf(els, app, files);
        // envia ao Storage as imagens que ainda não estão lá
        const used = new Set(els.filter((e: any) => e.type === "image" && e.fileId).map((e: any) => e.fileId));
        for (const fid of used) {
          const f = files[fid as string];
          if (!f || filesMeta.current[fid as string]) continue;
          const blob = await (await fetch(f.dataURL)).blob();
          const ext = (f.mimeType.split("/")[1] || "png").replace("svg+xml", "svg");
          const path = `${uidRef.current}/${id}/${fid}.${ext}`;
          const { error } = await s.storage.from(BUCKET).upload(path, blob, { contentType: f.mimeType, upsert: true });
          if (error) throw error;
          filesMeta.current = { ...filesMeta.current, [fid as string]: { path, mimeType: f.mimeType, created: f.created || Date.now() } };
        }
        const scene = JSON.parse(serializeAsJSON(els, app, {}, "database"));
        delete scene.files;
        const patch: any = { scene: { elements: scene.elements, appState: scene.appState }, files: filesMeta.current };
        if (Date.now() - lastPreview.current > 15000 || !board?.preview) {
          lastPreview.current = Date.now();
          patch.preview = els.length ? await thumb(els, app, files) : null;
        }
        const { error } = await s.from("brainstorm_boards").update(patch).eq("id", id);
        if (error) throw error;
        lastKey.current = key;
        setStatus(keyOf(api.getSceneElements(), api.getAppState(), api.getFiles()) === key ? "salvo" : "pendente");
      } catch {
        setStatus("erro");
      }
    })();
    saving.current = run;
    await run;
    saving.current = null;
  }, [api, id, board]);

  async function thumb(els: any[], app: any, files: any) {
    try {
      const blob = await exportToBlob({ elements: els, files, mimeType: "image/jpeg", quality: 0.7, maxWidthOrHeight: 560, exportPadding: 24, appState: { exportBackground: true, viewBackgroundColor: app.viewBackgroundColor, exportWithDarkMode: app.theme === "dark" } });
      return await toDataURL(blob);
    } catch { return null; }
  }

  const schedule = useCallback(() => {
    setStatus("pendente");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1200);
  }, [save]);

  function onChange(els: readonly any[], app: any, files: any) {
    // seleção: decide quais botões ficam ativos
    const ids = Object.keys(app.selectedElementIds || {});
    const chosen = els.filter((e) => ids.includes(e.id));
    const shape = chosen.some((e) => CONTAINERS.includes(e.type));
    const text = chosen.filter((e) => e.type === "text" || (CONTAINERS.includes(e.type) && e.boundElements?.some((b: any) => b.type === "text"))).length;
    if (shape !== sel.shape || text !== sel.text) setSel({ shape, text });
    try { localStorage.setItem(THEME_KEY, app.theme); } catch {}
    if (!mounted) setMounted(true);
    if (!ready.current) return;
    if (keyOf(els, app, files) !== lastKey.current) schedule();
  }

  // salva ao sair da página
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (status === "pendente" || status === "salvando") { save(); e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [status, save]);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function back() {
    clearTimeout(timer.current);
    if (status !== "salvo") await save();
    router.push("/creator/brainstorm");
  }

  async function rename(t: string) {
    const v = t.trim() || "Quadro sem título";
    setTitle(v);
    if (v !== board?.title) { await createClient().from("brainstorm_boards").update({ title: v }).eq("id", id); setBoard((b: any) => ({ ...b, title: v })); }
  }

  /* ---------- ações do quadro ---------- */
  function center() {
    const a = api.getAppState();
    return { x: -a.scrollX + a.width / 2 / a.zoom.value, y: -a.scrollY + a.height / 2 / a.zoom.value };
  }

  function insertSkeleton(skel: any[], select = true) {
    const made = convertToExcalidrawElements(skel, { regenerateIds: false });
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...made],
      appState: select ? { selectedElementIds: Object.fromEntries(made.filter((e: any) => e.type !== "text" || !e.containerId).map((e: any) => [e.id, true])) } : undefined,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    return made;
  }

  /** remede os textos depois que a fonte carrega (senão ficam cortados) e enquadra os elementos na tela */
  async function refit(target: readonly any[]) {
    const ids = new Set(target.map((e: any) => e.id));
    const all = api.getSceneElementsIncludingDeleted();
    const fixed = restoreElements(all.filter((e: any) => ids.has(e.id) && e.type === "text"), null, { refreshDimensions: true });
    const byId = new Map(fixed.map((e: any) => [e.id, e]));
    api.updateScene({
      elements: all.map((e: any) => { const f: any = byId.get(e.id); return f ? newElementWith(e, { width: f.width, height: f.height, x: f.x, y: f.y }) : e; }),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    api.scrollToContent(api.getSceneElements().filter((e: any) => ids.has(e.id)), { fitToViewport: true, viewportZoomFactor: 0.85, animate: false });
  }

  function addSticky(bg: string) {
    const c = center();
    const n = api.getSceneElements().filter((e: any) => e.type === "rectangle" && STICKY.some((s) => s.bg === e.backgroundColor)).length;
    insertSkeleton([sticky(c.x + (n % 5) * 16, c.y + (n % 5) * 16, "", bg)]);
    setMenu("");
    say("Post-it criado. Dê dois cliques para escrever.");
  }

  function addTemplate(k: string) {
    const t = templateByKey(k); if (!t) return;
    const c = center();
    refit(insertSkeleton(t.build(c.x, c.y), false));
    setMenu("");
  }

  /** cria uma ideia ligada à forma selecionada (mapa mental) */
  function addLinked() {
    const els = api.getSceneElements();
    const ids = Object.keys(api.getAppState().selectedElementIds || {});
    const parent = els.find((e: any) => ids.includes(e.id) && CONTAINERS.includes(e.type));
    if (!parent) { say("Selecione uma forma ou post-it para ligar uma nova ideia a ela."); return; }
    const kids = els.filter((e: any) => e.type === "arrow" && e.startBinding?.elementId === parent.id).length;
    const step = 110, off = kids === 0 ? 0 : (kids % 2 ? -1 : 1) * Math.ceil(kids / 2) * step;
    const w = 200, h = 80, nid = uid("n");
    const x = parent.x + parent.width + 140, y = parent.y + parent.height / 2 - h / 2 + off;
    const made = convertToExcalidrawElements([
      { type: parent.type, id: parent.id, x: parent.x, y: parent.y, width: parent.width, height: parent.height },
      { type: "rectangle", id: nid, x, y, width: w, height: h, backgroundColor: parent.backgroundColor === "transparent" ? "#a5d8ff" : parent.backgroundColor, fillStyle: "solid", strokeColor: parent.strokeColor === "transparent" ? "#1e1e1e" : parent.strokeColor, strokeWidth: 1, roughness: 0, roundness: { type: 3 }, label: { text: "Nova ideia", fontSize: 18, fontFamily: FONT } },
      arrowBetween(parent, { id: nid, x, y, width: w, height: h }),
    ] as any, { regenerateIds: false }).filter((e: any) => e.id !== parent.id);
    const ar = made.find((e: any) => e.type === "arrow");
    const p2 = newElementWith(parent, { boundElements: [...(parent.boundElements || []), { id: ar.id, type: "arrow" }] });
    api.updateScene({
      elements: api.getSceneElementsIncludingDeleted().map((e: any) => (e.id === parent.id ? p2 : e)).concat(made),
      appState: { selectedElementIds: { [nid]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }

  /** manda os textos selecionados para o Quadro de produção como ideias */
  async function toContent() {
    const els = api.getSceneElements();
    const ids = new Set(Object.keys(api.getAppState().selectedElementIds || {}));
    const texts = els.filter((e: any) => e.type === "text" && (ids.has(e.id) || (e.containerId && ids.has(e.containerId))));
    const titles = Array.from(new Set(texts.map((e: any) => (e.originalText || e.text || "").replace(/\s+/g, " ").trim()).filter((t: string) => t && t !== "Nova ideia" && t !== "Escreva aqui…" && !/^[\wÀ-ú ]{1,12}:$/.test(t))));
    if (!titles.length) { say("Selecione post-its ou textos com alguma ideia escrita."); return; }
    const { error } = await createClient().from("content_ideas").insert(titles.map((t: any) => ({ title: t.slice(0, 200), body: t.length > 200 ? t : null, kind: "ideia", status_id: statuses[0]?.id || null })));
    say(error ? "Não deu para enviar as ideias agora." : `${titles.length} ${titles.length === 1 ? "ideia enviada" : "ideias enviadas"} ao Quadro de produção.`);
  }

  async function exportPng() {
    const els = api.getSceneElements(); if (!els.length) return;
    const app = api.getAppState();
    const blob = await exportToBlob({ elements: els, files: api.getFiles(), mimeType: "image/png", exportPadding: 32, appState: { exportBackground: true, viewBackgroundColor: app.viewBackgroundColor, exportWithDarkMode: app.theme === "dark", exportScale: 2 } });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${title || "brainstorm"}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- tela ---------- */
  if (notFound) return (
    <div className="card p-10 text-center">
      <p className="font-display text-xl font-bold">Quadro não encontrado</p>
      <p className="text-fog text-sm mt-2">Ele pode ter sido apagado.</p>
      <Link href="/creator/brainstorm" className="btn btn-mint mt-5">Ver meus quadros</Link>
    </div>
  );

  const label = { carregando: "Carregando…", salvo: "Salvo", pendente: "Alterações…", salvando: "Salvando…", erro: "Erro ao salvar" }[status];

  return (
    <div className="brainstorm fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-ink">
      <div className="h-14 shrink-0 flex items-center gap-2 px-3 md:px-4 border-b border-line bg-panel">
        <button onClick={back} className="btn btn-ghost btn-sm !px-2" aria-label="Voltar para os quadros"><I.back className="w-4 h-4" /></button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={(e) => rename(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="bg-transparent font-display font-bold text-base md:text-lg outline-none min-w-0 w-28 sm:w-40 md:w-72 rounded-md px-1 focus:bg-panel2" aria-label="Nome do quadro" />
        <span className={`hidden sm:inline font-mono text-[10px] uppercase tracking-widest ${status === "erro" ? "text-danger" : status === "salvo" ? "text-mint" : "text-fog"}`}>{label}</span>
        {status === "erro" && <button onClick={save} className="text-xs underline text-danger">tentar de novo</button>}

        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto scroll-thin">
          <div className="relative">
            <button disabled={!api} onClick={() => setMenu(menu === "postit" ? "" : "postit")} className="btn btn-ghost btn-sm"><span className="w-3 h-3 rounded-sm" style={{ background: STICKY[0].bg }} /> Post-it</button>
          </div>
          <button disabled={!api} onClick={addLinked} className={`btn btn-ghost btn-sm ${sel.shape ? "" : "opacity-60"}`} title="Selecione uma forma e crie uma ideia ligada (Ctrl/⌘ + seta também funciona)"><I.arrow className="w-4 h-4" /> Ideia ligada</button>
          <button disabled={!api} onClick={() => api.setActiveTool({ type: "embeddable" })} className="btn btn-ghost btn-sm" title="Desenhe a área e cole o link: YouTube, Figma, Spotify, Google Docs…"><I.link className="w-4 h-4" /> Link / vídeo</button>
          <button disabled={!api} onClick={() => setMenu(menu === "modelos" ? "" : "modelos")} className="btn btn-ghost btn-sm"><I.grid className="w-4 h-4" /> Modelos</button>
          {sel.text > 0 && <button onClick={toContent} className="btn btn-mint btn-sm" title="Cria uma ideia no Quadro de produção para cada texto selecionado"><I.board className="w-4 h-4" /> Virar conteúdo</button>}
          <button disabled={!api} onClick={exportPng} className="btn btn-ghost btn-sm hidden md:inline-flex">Exportar PNG</button>
          <button onClick={() => setMenu(menu === "ajuda" ? "" : "ajuda")} className="btn btn-ghost btn-sm !px-2.5" aria-label="Atalhos">?</button>
        </div>
      </div>

      {menu && <div className="fixed inset-0 z-40" onClick={() => setMenu("")} />}
      {menu === "postit" && (
        <div className="absolute right-3 top-14 mt-2 z-50 card p-3 w-64 rise">
          <p className="text-xs text-fog mb-2">Cor do post-it</p>
          <div className="grid grid-cols-6 gap-2">
            {STICKY.map((s) => <button key={s.bg} onClick={() => addSticky(s.bg)} className="w-8 h-8 rounded-md hover:scale-110 transition-transform" style={{ background: s.bg }} aria-label={s.name} title={s.name} />)}
          </div>
        </div>
      )}
      {menu === "modelos" && (
        <div className="absolute right-3 top-14 mt-2 z-50 card p-2 w-80 max-h-[70vh] overflow-y-auto scroll-thin rise">
          <p className="text-xs text-fog px-2 pt-1 pb-1">Inserir no centro da tela</p>
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="font-mono text-[10px] text-mint tracking-widest uppercase px-3 pt-3 pb-1">{cat}</p>
              {TEMPLATES.filter((t) => t.cat === cat).map((t) => (
                <button key={t.key} onClick={() => addTemplate(t.key)} className="w-full text-left rounded-[10px] px-3 py-2 hover:bg-panel2">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-fog">{t.desc}</p>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {menu === "ajuda" && (
        <div className="absolute right-3 top-14 mt-2 z-50 card p-4 w-80 rise text-sm space-y-2">
          <p className="font-semibold">Atalhos úteis</p>
          {[
            ["Texto em qualquer lugar", "dois cliques no quadro"],
            ["Ideia ligada à forma", "Ctrl/⌘ + seta"],
            ["Colar imagem ou link", "Ctrl/⌘ + V"],
            ["Link num elemento", "Ctrl/⌘ + K"],
            ["Mover a tela", "espaço + arrastar"],
            ["Zoom", "Ctrl/⌘ + rolagem"],
            ["Ferramentas", "R retângulo · O elipse · A seta · T texto · P lápis · 9 imagem"],
            ["Desfazer", "Ctrl/⌘ + Z"],
          ].map(([a, b]) => <div key={a} className="flex justify-between gap-3"><span className="text-fog">{a}</span><span className="text-right font-mono text-[11px]">{b}</span></div>)}
          <p className="text-xs text-fog pt-1">Arraste imagens do computador direto para o quadro.</p>
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        {initial ? (
          <Excalidraw
            excalidrawAPI={(a: Api) => setApi(a)}
            initialData={initial}
            onChange={onChange}
            langCode="pt-BR"
            name={title}
            UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: true, export: { saveFileToDisk: true } } }}
            validateEmbeddable={(link: string) => (EMBED_OK.some((r) => r.test(link)) ? true : undefined)}
            onLinkOpen={(el: any, ev: any) => { const l = el.link; if (l && /^https?:\/\//.test(l)) { ev.preventDefault(); window.open(l, "_blank", "noopener"); } }}
          >
            <MainMenu>
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.SearchMenu />
              <MainMenu.DefaultItems.Help />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
            <WelcomeScreen>
              <WelcomeScreen.Hints.ToolbarHint />
              <WelcomeScreen.Hints.MenuHint />
              <WelcomeScreen.Hints.HelpHint />
              <WelcomeScreen.Center>
                <WelcomeScreen.Center.Heading>Quadro em branco. Pense livre.</WelcomeScreen.Center.Heading>
                <WelcomeScreen.Center.Menu>
                  <WelcomeScreen.Center.MenuItem onSelect={() => addSticky(STICKY[0].bg)}>Adicionar um post-it</WelcomeScreen.Center.MenuItem>
                  <WelcomeScreen.Center.MenuItem onSelect={() => addTemplate("mapa")}>Começar um mapa mental</WelcomeScreen.Center.MenuItem>
                  <WelcomeScreen.Center.MenuItemHelp />
                </WelcomeScreen.Center.Menu>
              </WelcomeScreen.Center>
            </WelcomeScreen>
          </Excalidraw>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-fog text-sm">Abrindo o quadro…</div>
        )}
        {toast && <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 bg-panel border border-line rounded-[10px] px-4 py-2 text-sm shadow-xl rise">{toast}</div>}
      </div>
    </div>
  );
}
