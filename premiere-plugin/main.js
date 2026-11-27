/* Tela do painel 0.5 (modelo do IPM Studio): abas Editar / Revisar / Histórico, claquete da sequência aberta,
   listas como linhas de trilha, Conferir um a um (clica e o Premiere vai ao ponto), cortes para aprovar,
   Detalhes recolhidos com contador e a ação principal fixa no rodapé, que muda com a aba.
   As listas são montadas com createElement: no UXP, <select> preenchido por innerHTML aparece vazio. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
  const fmtT = (s) => { s = +s || 0; const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`; };
  const dm = (d) => { d = new Date(d); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const hhmm = (d) => { d = d ? new Date(d) : new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  /* ---------- mensagens: a última no rodapé, todas em Detalhes ---------- */
  const logs = [];
  function say(t, kind) {
    const s = $("status");
    s.textContent = t || "";
    s.className = "msg" + (kind ? " " + kind : "");
    if (!t) return;
    logs.unshift({ t, at: new Date() });
    logs.length = Math.min(logs.length, 40);
    renderLog();
  }
  function renderLog() {
    const b = $("detBody");
    clear(b);
    logs.forEach((l) => { const r = el("div", "log"); r.appendChild(el("span", "tc", hhmm(l.at))); r.appendChild(el("span", null, l.t)); b.appendChild(r); });
    $("detCount").hidden = !logs.length;
    $("detCount").textContent = String(logs.length);
  }
  $("detToggle").addEventListener("click", () => { const b = $("detBody"); b.hidden = !b.hidden; $("detArrow").textContent = b.hidden ? "›" : "⌄"; });

  /* ---------- estado ---------- */
  let current = null; // edição aberta (av_edit_sessions)
  let poll = null, seqPoll = null, waitTimer = null;
  let contents = [], kits = [];
  let contentId = "", kitId = "", ritmo = "";
  let view = "editar";
  const picked = {};
  const conferidos = new Set();

  const LABELS = { cortes: "Cortes", legendas: "Legendas", titulos: "Letterings", motion: "Motion", zooms: "Câmera (zooms)", insercoes: "Imagens de inserção", marcadores: "Notas e estilo" };
  const RITMOS = [["", "Livre"], ["calmo", "Calmo"], ["no ritmo", "No ritmo"], ["energético", "Energético"]];

  /* ---------- login ---------- */
  function luzHub(ok) {
    $("luzHub").className = "luz" + (ok ? " ok" : "");
    $("luzTxt").textContent = ok ? "HUB" : "Offline";
  }
  function show() {
    const ok = HUB.loggedIn();
    $("login").hidden = ok;
    $("main").hidden = !ok;
    $("btnLogout").hidden = !ok;
    luzHub(ok);
    if (ok) boot();
  }

  /* ---------- abas: a ação do rodapé muda com elas ---------- */
  function setView(v) {
    view = v;
    Array.from(document.querySelectorAll(".tab")).forEach((t) => t.classList.toggle("on", t.getAttribute("data-view") === v));
    ["editar", "revisar", "historico"].forEach((k) => { $("v-" + k).hidden = k !== v; });
    if (v === "historico") loadHistory();
    renderMain();
  }
  Array.from(document.querySelectorAll(".tab")).forEach((t) => t.addEventListener("click", () => setView(t.getAttribute("data-view"))));

  function mainAction() {
    if (view === "editar") return { label: "Enviar ao Claude", run: send };
    if (view === "revisar") {
      const on = cuts.filter((c) => c.on);
      if (current && current.status === "plano_pronto" && current.plan) return { label: "Aplicar o plano no Premiere", run: apply };
      if (on.length) return { label: `Cortar numa sequência nova (${on.length})`, run: cutNow };
      return { label: "Achar pausas", run: find };
    }
    return { label: "Atualizar o histórico", run: loadHistory };
  }
  function renderMain() { $("btnMain").textContent = mainAction().label; }
  $("btnMain").addEventListener("click", () => { if (!isBusy("btnMain")) mainAction().run(); });

  /* ---------- ajuda: um "?" por cartão ---------- */
  Array.from(document.querySelectorAll(".help")).forEach((h) => h.addEventListener("click", () => {
    const t = $(h.getAttribute("data-help"));
    t.hidden = !t.hidden;
    h.classList.toggle("on", !t.hidden);
  }));

  /* ---------- claquete: a sequência aberta ---------- */
  async function refreshSeq() {
    try {
      const tl = await PR.readTimeline();
      $("claq").className = "claq ok";
      $("seqLuz").className = "luz ok";
      $("seqLuzTxt").textContent = "Aberta";
      $("seqName").textContent = tl.name || "Sequência";
      $("seqTc").textContent = fmtT(tl.duration);
      const v1 = tl.clips.filter((c) => c.faixa === "V1").length;
      $("seqInfo").textContent = `${tl.fps || "?"} fps · ${tl.clips.length} clipes, ${v1} em V1${tl.projectName ? " · " + tl.projectName : ""}`;
      return true;
    } catch (e) {
      const semSeq = /sequência/i.test(e.message);
      $("claq").className = "claq";
      $("seqLuz").className = "luz amber";
      $("seqLuzTxt").textContent = "Esperando";
      $("seqTc").textContent = "";
      $("seqName").textContent = semSeq ? "Nenhuma sequência aberta" : "Nenhum projeto aberto";
      $("seqInfo").textContent = semSeq ? "Abra uma sequência na timeline. O painel acha sozinho." : "Abra um projeto. O painel acha sozinho.";
      return false;
    }
  }
  function watchSeq() {
    clearInterval(seqPoll);
    refreshSeq().then((ok) => { if (!ok) seqPoll = setInterval(async () => { if (await refreshSeq()) clearInterval(seqPoll); }, 3000); });
  }

  async function checkTranscript() {
    try {
      const tl = await PR.readTimeline();
      const w = await PR.readTranscript(tl);
      $("transInfo").textContent = w.length ? `${w.length} palavras prontas.` : "Sem transcrição ainda.";
      return w.length;
    } catch (e) { $("transInfo").textContent = "Abra uma sequência para conferir."; return 0; }
  }

  /* ---------- conteúdo, kit e ritmo ---------- */
  function renderContents() {
    const box = $("contentList");
    clear(box);
    const q = ($("contentSearch").value || "").trim().toLowerCase();
    const list = contents.filter((c) => !q || (c.title || "").toLowerCase().includes(q));
    const row = (id, title, fmt) => {
      const r = el("div", "tr" + (id === contentId ? " on" : ""));
      r.appendChild(el("span", "txt", title));
      if (fmt) r.appendChild(el("span", "fmt", fmt));
      r.addEventListener("click", () => { contentId = id; renderContents(); });
      box.appendChild(r);
    };
    row("", "Nenhum conteúdo");
    if (!list.length && q) box.appendChild(el("div", "empty", "Nada com esse nome."));
    list.slice(0, 40).forEach((c) => row(c.id, c.title || "Sem título", c.format));
  }
  function pills(boxId, items, cur, pick) {
    const box = $(boxId);
    clear(box);
    items.forEach(([id, name]) => {
      const p = el("div", "pill" + (cur === id ? " on" : ""), name);
      p.addEventListener("click", () => pick(id));
      box.appendChild(p);
    });
  }
  function renderKits() { pills("kitList", [["", "Sem kit"]].concat(kits.map((k) => [k.id, k.name])), kitId, (id) => { kitId = id; renderKits(); kitPausa(); }); }
  function renderRitmo() { pills("ritmoList", RITMOS, ritmo, (id) => { ritmo = id; renderRitmo(); }); }

  /** a pausa mínima padrão vem do kit escolhido (regras.silencio_ms) */
  function kitPausa() {
    const k = kits.find((x) => x.id === kitId);
    const ms = k && k.data && k.data.regras && +k.data.regras.silencio_ms;
    if (ms) $("pausaMin").value = String(Math.round(ms) / 1000);
  }

  /* ---------- cortes para aprovar ---------- */
  let cuts = [];
  function renderCuts() {
    $("cutBox").hidden = !cuts.length;
    $("cutAll").hidden = !cuts.length;
    const list = $("cutList");
    clear(list);
    cuts.forEach((c) => {
      const r = el("div", "tr" + (c.on ? " picked" : ""));
      r.appendChild(el("div", "check", c.on ? "✓" : ""));
      r.appendChild(el("span", "t", `${fmtT(c.inicio)}–${fmtT(c.fim)}`));
      r.appendChild(el("span", "txt", c.motivo || "Corte"));
      r.appendChild(el("span", "n", `${(c.fim - c.inicio).toFixed(1).replace(".", ",")} s`));
      r.addEventListener("click", () => { c.on = !c.on; renderCuts(); });
      list.appendChild(r);
    });
    const on = cuts.filter((c) => c.on);
    const s = $("cutSum");
    clear(s);
    s.appendChild(el("b", null, String(on.length)));
    s.appendChild(el("span", null, ` de ${cuts.length} cortes marcados · tira `));
    s.appendChild(el("b", null, `${CORTES.total(on).toFixed(1).replace(".", ",")} s`));
    $("cutAll").textContent = on.length ? "Desmarcar tudo" : "Marcar tudo";
    renderMain();
  }
  function loadCuts(list) { cuts = CORTES.juntar(list).map((c) => Object.assign({}, c, { on: true })); renderCuts(); }

  /* ---------- plano ---------- */
  function itemText(k, x) {
    if (k === "cortes") return x.motivo || "Corte";
    if (k === "zooms") return `${x.tipo === "tremida" ? "Tremida" : "Zoom"} ${x.escala || 110}%`;
    if (k === "insercoes") return x.midia || "Inserção";
    return x.texto || x.nome || LABELS[k];
  }
  function planRows(p) {
    const out = [];
    Object.keys(LABELS).forEach((k) => (p[k] || []).forEach((x, i) => out.push({ k, key: `${k}:${i}`, ini: +x.inicio || 0, fim: x.fim != null ? +x.fim : null, txt: itemText(k, x) })));
    return out.sort((a, b) => a.ini - b.ini);
  }

  function follow() {
    clearInterval(poll);
    render();
    if (current && current.status === "aguardando_plano") {
      poll = setInterval(async () => {
        try {
          const s = await HUB.getSession(current.id);
          if (s && s.status !== current.status) {
            current = Object.assign(current, s);
            if (s.status === "plano_pronto") { say("O plano chegou. Confira em Revisar.", "ok"); setView("revisar"); }
            follow();
          }
        } catch (e) { say(e.message, "err"); }
      }, 8000);
    }
  }

  function render() {
    const waiting = !!current && current.status === "aguardando_plano";
    $("waitBox").hidden = !waiting;
    clearInterval(waitTimer);
    if (waiting) {
      const t0 = current.created_at ? new Date(current.created_at).getTime() : Date.now();
      const tick = () => { const s = Math.max(0, Math.round((Date.now() - t0) / 1000)); $("waitClock").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
      tick(); waitTimer = setInterval(tick, 1000);
    }
    const ready = !!current && current.status === "plano_pronto" && !!current.plan;
    $("planBox").hidden = !ready;
    $("noPlan").hidden = ready;
    $("revCount").hidden = !ready;
    if (!ready) { renderMain(); return; }
    const p = current.plan;
    const rows = planRows(p);
    $("revCount").textContent = String(rows.length);
    $("btnPlanCuts").hidden = !(p.cortes || []).length;
    $("planOrigin").textContent = p.origem === "editor_hub" ? "Editor do HUB" : "Claude";
    $("planSummary").textContent = [p.resumo, current.plan_note && current.plan_note !== "Montado no Editor do HUB" ? current.plan_note : ""].filter(Boolean).join(" · ") || "Plano sem resumo.";

    // tipos: marcar o que entra
    const items = $("planItems");
    clear(items);
    Object.keys(LABELS).filter((k) => (p[k] || []).length).forEach((k) => {
      if (picked[k] == null) picked[k] = true;
      const r = el("div", "tr" + (picked[k] ? " picked" : ""));
      r.appendChild(el("div", "check", picked[k] ? "✓" : ""));
      r.appendChild(el("div", "sw " + k));
      r.appendChild(el("span", "txt", LABELS[k] + (k === "cortes" ? " (viram marcadores)" : "")));
      r.appendChild(el("span", "n", String(p[k].length)));
      r.addEventListener("click", () => { picked[k] = !picked[k]; render(); });
      items.appendChild(r);
    });

    // conferir um a um: clica e o Premiere vai ao ponto; conferido fica apagado
    const conf = $("confList");
    clear(conf);
    rows.filter((r) => picked[r.k]).forEach((r) => {
      const tr = el("div", "tr" + (conferidos.has(r.key) ? " done" : ""));
      tr.appendChild(el("div", "sw " + r.k));
      tr.appendChild(el("span", "t", fmtT(r.ini)));
      tr.appendChild(el("span", "txt", r.txt));
      tr.addEventListener("click", async () => {
        conferidos.add(r.key);
        render();
        try { await PR.seek(r.ini); } catch (e) { say("Não consegui levar o Premiere até " + fmtT(r.ini) + ": " + e.message, "err"); }
      });
      conf.appendChild(tr);
    });
    const vis = rows.filter((r) => picked[r.k]);
    $("confCount").textContent = `${vis.filter((r) => conferidos.has(r.key)).length} de ${vis.length} vistos`;
    renderMain();
  }

  /* ---------- histórico ---------- */
  const ST = { aguardando_plano: ["Esperando o Claude", "amber"], plano_pronto: ["Plano pronto", "ok"], aplicado: ["Aplicado", "ok"], cancelado: ["Descartado", ""] };
  async function loadHistory() {
    const box = $("histList");
    try {
      const list = await HUB.history();
      clear(box);
      if (!list.length) { box.appendChild(el("div", "empty", "Nenhuma edição enviada ainda.")); return; }
      list.forEach((s) => {
        const [lbl, cor] = ST[s.status] || [s.status, ""];
        const r = el("div", "tr");
        const d = el("div", "luz-dot " + cor);
        d.style.marginRight = "10px";
        r.appendChild(d);
        r.appendChild(el("span", "txt", s.sequence_name || s.project_name || "Sequência"));
        r.appendChild(el("span", "fmt", lbl));
        r.appendChild(el("span", "n", dm(s.created_at) + " " + hhmm(s.created_at)));
        if (s.status === "plano_pronto") r.addEventListener("click", async () => { current = await HUB.getSession(s.id); follow(); setView("revisar"); });
        box.appendChild(r);
      });
    } catch (e) { say("Não consegui ler o histórico: " + e.message, "err"); }
  }

  /* ---------- ações ---------- */
  const labels = {};
  function busy(id, on, label) {
    const b = $(id);
    if (on) { labels[id] = b.textContent; b.textContent = label || "Aguarde…"; b.classList.add("off"); }
    else { b.textContent = labels[id] || b.textContent; b.classList.remove("off"); if (id === "btnMain") renderMain(); }
  }
  const isBusy = (id) => $(id).classList.contains("off");

  async function boot() {
    watchSeq();
    renderRitmo();
    checkTranscript();
    try {
      const [c, k] = await Promise.all([HUB.contents(), HUB.kits()]);
      contents = c || []; kits = k || [];
      if (!kitId && kits.length === 1) kitId = kits[0].id;
      renderContents(); renderKits(); kitPausa();
      const open = await HUB.lastOpen();
      if (open) { current = open; follow(); if (open.status === "plano_pronto") setView("revisar"); }
      luzHub(true);
    } catch (e) { luzHub(false); say("Não consegui ler o HUB: " + e.message, "err"); renderContents(); renderKits(); }
    render();
  }

  async function send() {
    busy("btnMain", true, "Enviando…");
    try {
      const tl = await PR.readTimeline();
      const transcript = await PR.readTranscript(tl);
      const pedido = [ritmo ? `Ritmo: ${ritmo}.` : "", $("request").value.trim()].filter(Boolean).join(" ");
      const row = {
        content_id: contentId || null,
        kit_id: kitId || null,
        project_name: tl.projectName || null,
        sequence_name: tl.name || null,
        fps: tl.fps, duration_sec: tl.duration,
        timeline: tl.clips.map(({ _c, ...c }) => c),
        transcript,
        request: pedido || null,
      };
      current = await HUB.createSession(row);
      conferidos.clear();
      Object.keys(picked).forEach((k) => delete picked[k]);
      say(transcript.length ? `Enviado: ${tl.clips.length} clipes e ${transcript.length} palavras.` : "Enviado sem transcrição. Para legendas, transcreva antes.", transcript.length ? "ok" : "");
      follow();
    } catch (e) { say(e.message, "err"); }
    busy("btnMain", false);
  }

  async function apply() {
    if (!current || !current.plan) return;
    const pick = {};
    Object.keys(LABELS).forEach((k) => { pick[k] = picked[k] !== false; });
    busy("btnMain", true, "Aplicando…");
    const t0 = Date.now();
    try {
      const kid = current.kit_id || kitId;
      const kit = kid ? await HUB.kit(kid) : null;
      const r = await PR.applyPlan(current.plan, kit, pick);
      await HUB.setStatus(current.id, "aplicado");
      current = null;
      render();
      const parts = [["marcadores", r.marcadores], ["legendas", r.legendas], ["letterings", r.titulos], ["motion", r.motion], ["zooms", r.zooms], ["inserções", r.insercoes]].filter((x) => x[1]).map((x) => `${x[1]} ${x[0]}`);
      say(`Aplicado em ${((Date.now() - t0) / 1000).toFixed(1).replace(".", ",")} s: ${parts.join(", ") || "nada"}. Cmd+Z desfaz tudo.${r.avisos.length ? " Avisos: " + r.avisos.slice(0, 3).join(" | ") : ""}`, "ok");
    } catch (e) { say(e.message, "err"); }
    busy("btnMain", false);
  }

  async function find() {
    busy("btnMain", true, "Procurando…");
    try {
      const tl = await PR.readTimeline();
      const words = await PR.readTranscript(tl);
      if (!words.length) throw new Error("A sequência não tem transcrição. Transcreva em Editar e espere o Premiere terminar.");
      const pausa = Math.max(0.1, parseFloat($("pausaMin").value) || 0.35);
      const folga = Math.max(0, parseFloat($("folga").value) || 0);
      loadCuts(CORTES.acharPausas(words, tl.duration, pausa, folga));
      say(cuts.length ? "Confira a lista: clique para tirar um corte." : "Nenhuma pausa desse tamanho.", cuts.length ? "" : "ok");
    } catch (e) { say(e.message, "err"); }
    busy("btnMain", false);
  }

  async function cutNow() {
    const on = cuts.filter((c) => c.on);
    if (!on.length) return;
    busy("btnMain", true, "Cortando…");
    const t0 = Date.now();
    try {
      const r = await PR.cutSequence(on);
      cuts = []; renderCuts();
      say(`Pronto em ${((Date.now() - t0) / 1000).toFixed(1).replace(".", ",")} s: "${r.nome}" com ${r.pedacos} pedaços, de ${fmtT(r.antes)} para ${fmtT(r.depois)}. A original não mudou.${r.avisos.length ? " " + r.avisos.slice(0, 3).join(" ") : ""}`, "ok");
      watchSeq();
    } catch (e) { say(e.message, "err"); }
    busy("btnMain", false);
  }

  $("btnLogin").addEventListener("click", async () => {
    if (isBusy("btnLogin")) return;
    busy("btnLogin", true, "Entrando…");
    try { await HUB.login($("email").value.trim(), $("password").value); $("password").value = ""; $("loginMsg").textContent = ""; show(); }
    catch (e) { $("loginMsg").textContent = e.message; $("loginMsg").className = "msg err"; }
    busy("btnLogin", false);
  });
  $("btnLogout").addEventListener("click", () => { clearInterval(poll); clearInterval(seqPoll); clearInterval(waitTimer); HUB.logout(); current = null; show(); });
  $("btnRefresh").addEventListener("click", () => { watchSeq(); checkTranscript(); boot(); });
  $("btnHist").addEventListener("click", loadHistory);
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
      $("transInfo").textContent = n ? `Transcrevendo ${n} clipe(s)…` : "Os clipes de V1/A1 já estão transcritos.";
      say(n ? `Pedi a transcrição de ${n} clipe(s). Quando o Premiere terminar, toque em Ler de novo.` : "Os clipes de V1/A1 já estão transcritos.", "ok");
      if (!n) checkTranscript();
    } catch (e) { say(e.message, "err"); }
    busy("btnTranscribe", false);
  });

  $("btnFind").addEventListener("click", () => { if (!isBusy("btnMain")) find(); });
  $("cutAll").addEventListener("click", () => { const any = cuts.some((c) => c.on); cuts.forEach((c) => { c.on = !any; }); renderCuts(); });
  $("btnPlanCuts").addEventListener("click", () => {
    if (!current || !current.plan) return;
    loadCuts((current.plan.cortes || []).map((c) => ({ inicio: +c.inicio, fim: +c.fim, motivo: c.motivo || "Corte do plano" })));
    picked.cortes = false; render();
    say("Os cortes do plano estão em Cortes para aprovar. Aplique o plano e depois corte numa sequência nova.");
  });
  $("btnDiscard").addEventListener("click", async () => {
    if (!current) return;
    try { await HUB.setStatus(current.id, "cancelado"); current = null; render(); say("Plano descartado."); } catch (e) { say(e.message, "err"); }
  });

  show();
})();
