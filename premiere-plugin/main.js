/* Tela do painel: login, sequência, etapas (transcrever, enviar ao Claude, aplicar) e o plano pronto.
   As listas são montadas com createElement: no UXP, <select> preenchido por innerHTML aparece vazio. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
  const say = (t, kind) => { const s = $("status"); s.textContent = t || ""; s.className = "msg" + (kind ? " " + kind : ""); };

  let current = null; // edição aberta (av_edit_sessions)
  let poll = null, seqPoll = null;
  let contents = [], kits = [];
  let contentId = "", kitId = "";
  const picked = {};

  const LABELS = { cortes: "Cortes (marcadores)", legendas: "Legendas", titulos: "Letterings", motion: "Motion", zooms: "Câmera (zooms)", insercoes: "Imagens de inserção", marcadores: "Notas e estilo" };

  function show() {
    const ok = HUB.loggedIn();
    $("login").hidden = ok;
    $("main").hidden = !ok;
    $("btnLogout").hidden = !ok;
    $("who").textContent = ok ? HUB.email || "" : "";
    if (ok) boot();
  }

  /* ---------- sequência ---------- */
  async function refreshSeq() {
    try {
      const tl = await PR.readTimeline();
      $("seqDot").className = "dot ok";
      $("seqName").textContent = tl.name || "Sequência";
      $("seqInfo").textContent = `${tl.duration}s · ${tl.fps || "?"} fps · ${tl.clips.length} clipes`;
      return true;
    } catch (e) {
      $("seqDot").className = "dot";
      $("seqName").textContent = /sequência/i.test(e.message) ? "Nenhuma sequência aberta" : "Nenhum projeto aberto";
      $("seqInfo").textContent = /sequência/i.test(e.message) ? "Abra uma sequência na timeline. O painel acha sozinho." : "Abra um projeto. O painel acha sozinho.";
      return false;
    }
  }
  function watchSeq() {
    clearInterval(seqPoll);
    refreshSeq().then((ok) => { if (!ok) seqPoll = setInterval(async () => { if (await refreshSeq()) clearInterval(seqPoll); }, 3000); });
  }

  /* ---------- listas ---------- */
  function renderContents() {
    const box = $("contentList");
    clear(box);
    const q = ($("contentSearch").value || "").trim().toLowerCase();
    const list = contents.filter((c) => !q || (c.title || "").toLowerCase().includes(q));
    const none = el("div", "opt" + (!contentId ? " on" : ""), "Nenhum conteúdo");
    none.addEventListener("click", () => { contentId = ""; renderContents(); });
    box.appendChild(none);
    if (!list.length && q) box.appendChild(el("div", "empty", "Nada com esse nome."));
    list.slice(0, 40).forEach((c) => {
      const o = el("div", "opt" + (c.id === contentId ? " on" : ""));
      o.appendChild(el("span", null, c.title || "Sem título"));
      if (c.format) o.appendChild(el("span", "fmt", c.format));
      o.addEventListener("click", () => { contentId = c.id; renderContents(); });
      box.appendChild(o);
    });
  }
  function renderKits() {
    const box = $("kitList");
    clear(box);
    const mk = (id, name) => {
      const c = el("div", "chip" + (kitId === id ? " on" : ""), name);
      c.addEventListener("click", () => { kitId = id; renderKits(); });
      box.appendChild(c);
    };
    mk("", "Sem kit");
    kits.forEach((k) => mk(k.id, k.name));
  }

  async function boot() {
    watchSeq();
    try {
      const [c, k] = await Promise.all([HUB.contents(), HUB.kits()]);
      contents = c || []; kits = k || [];
      if (!kitId && kits.length === 1) kitId = kits[0].id;
      renderContents(); renderKits();
      const open = await HUB.lastOpen();
      if (open) { current = open; follow(); }
    } catch (e) { say("Não consegui ler o HUB: " + e.message, "err"); renderContents(); renderKits(); }
  }

  /* ---------- plano ---------- */
  function follow() {
    clearInterval(poll);
    render();
    if (current && current.status === "aguardando_plano") {
      poll = setInterval(async () => {
        try {
          const s = await HUB.getSession(current.id);
          if (s && s.status !== current.status) { current = Object.assign(current, s); follow(); }
        } catch (e) { say(e.message, "err"); }
      }, 8000);
    }
  }

  function render() {
    const waiting = !!current && current.status === "aguardando_plano";
    $("waitBox").hidden = !waiting;
    const box = $("planBox");
    if (!current || current.status !== "plano_pronto" || !current.plan) { box.hidden = true; return; }
    const p = current.plan;
    box.hidden = false;
    $("planOrigin").textContent = p.origem === "editor_hub" ? "do Editor do HUB" : "do Claude";
    $("planSummary").textContent = [p.resumo, current.plan_note && current.plan_note !== "Montado no Editor do HUB" ? current.plan_note : ""].filter(Boolean).join(" · ");
    const items = $("planItems");
    clear(items);
    Object.keys(LABELS).filter((k) => (p[k] || []).length).forEach((k) => {
      if (picked[k] == null) picked[k] = true;
      const row = el("div", "item" + (picked[k] ? " on" : ""));
      row.appendChild(el("div", "check", picked[k] ? "✓" : ""));
      row.appendChild(el("span", null, LABELS[k]));
      row.appendChild(el("span", "n", String(p[k].length)));
      row.addEventListener("click", () => { picked[k] = !picked[k]; render(); });
      items.appendChild(row);
    });
  }

  /* ---------- ações ---------- */
  const labels = {};
  function busy(id, on, label) {
    const b = $(id);
    if (on) { labels[id] = b.textContent; b.textContent = label || "Aguarde…"; b.classList.add("off"); }
    else { b.textContent = labels[id] || b.textContent; b.classList.remove("off"); }
  }
  const isBusy = (id) => $(id).classList.contains("off");

  $("btnLogin").addEventListener("click", async () => {
    if (isBusy("btnLogin")) return;
    busy("btnLogin", true, "Entrando…");
    try { await HUB.login($("email").value.trim(), $("password").value); $("password").value = ""; $("loginMsg").textContent = ""; show(); }
    catch (e) { $("loginMsg").textContent = e.message; $("loginMsg").className = "msg err"; }
    busy("btnLogin", false);
  });
  $("btnLogout").addEventListener("click", () => { clearInterval(poll); clearInterval(seqPoll); HUB.logout(); current = null; show(); });
  $("btnRefresh").addEventListener("click", () => { watchSeq(); boot(); });
  $("contentSearch").addEventListener("input", renderContents);
  $("lnkHub").addEventListener("click", () => {
    try { require("uxp").shell.openExternal("https://vincit-hub.vercel.app/audiovisual/premiere"); } catch (e) { say("Abra vincit-hub.vercel.app/audiovisual/premiere no navegador."); }
  });

  $("btnTranscribe").addEventListener("click", async () => {
    if (isBusy("btnTranscribe")) return;
    busy("btnTranscribe", true, "Transcrevendo…");
    try {
      const tl = await PR.readTimeline();
      const n = await PR.transcribe(tl);
      say(n ? `Pedi a transcrição de ${n} clipe(s). Quando o Premiere terminar, envie ao Claude.` : "Os clipes de V1/A1 já estão transcritos.", "ok");
    } catch (e) { say(e.message, "err"); }
    busy("btnTranscribe", false);
  });

  $("btnSend").addEventListener("click", async () => {
    if (isBusy("btnSend")) return;
    busy("btnSend", true, "Enviando…");
    try {
      const tl = await PR.readTimeline();
      const transcript = await PR.readTranscript(tl);
      const row = {
        content_id: contentId || null,
        kit_id: kitId || null,
        project_name: tl.projectName || null,
        sequence_name: tl.name || null,
        fps: tl.fps, duration_sec: tl.duration,
        timeline: tl.clips.map(({ _c, ...c }) => c),
        transcript,
        request: $("request").value.trim() || null,
      };
      current = await HUB.createSession(row);
      say(transcript.length ? `Enviado: ${tl.clips.length} clipes e ${transcript.length} palavras.` : "Enviado sem transcrição. Para legendas, transcreva antes (etapa 1).", transcript.length ? "ok" : "");
      follow();
    } catch (e) { say(e.message, "err"); }
    busy("btnSend", false);
  });

  $("btnApply").addEventListener("click", async () => {
    if (!current || !current.plan || isBusy("btnApply")) return;
    const pick = {};
    Object.keys(LABELS).forEach((k) => { pick[k] = picked[k] !== false; });
    busy("btnApply", true, "Aplicando…");
    try {
      const kid = current.kit_id || kitId;
      const kit = kid ? await HUB.kit(kid) : null;
      const r = await PR.applyPlan(current.plan, kit, pick);
      await HUB.setStatus(current.id, "aplicado");
      current = null;
      render();
      const parts = [["marcadores", r.marcadores], ["legendas", r.legendas], ["letterings", r.titulos], ["motion", r.motion], ["zooms", r.zooms], ["inserções", r.insercoes]].filter((x) => x[1]).map((x) => `${x[1]} ${x[0]}`);
      say(`Aplicado: ${parts.join(", ") || "nada"}.${r.avisos.length ? " Avisos: " + r.avisos.slice(0, 3).join(" | ") : ""}`, "ok");
    } catch (e) { say(e.message, "err"); }
    busy("btnApply", false);
  });

  $("btnDiscard").addEventListener("click", async () => {
    if (!current) return;
    try { await HUB.setStatus(current.id, "cancelado"); current = null; render(); say("Plano descartado."); } catch (e) { say(e.message, "err"); }
  });

  show();
})();
