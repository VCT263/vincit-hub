/* Tela do painel: login, envio da sequência ao Claude, espera do plano e aplicação. */
(function () {
  const $ = (id) => document.getElementById(id);
  const say = (t) => { $("status").textContent = t || ""; };
  let current = null; // edição aberta (av_edit_sessions)
  let poll = null;

  const LABELS = { cortes: "Cortes (marcadores)", legendas: "Legendas", titulos: "Letterings", motion: "Motion", zooms: "Câmera (zooms)", insercoes: "Inserções de B-roll", marcadores: "Notas" };

  function show() {
    const ok = HUB.loggedIn();
    $("login").hidden = ok;
    $("main").hidden = !ok;
    $("who").textContent = ok ? HUB.email || "" : "";
    if (ok) boot();
  }

  async function refreshSeq() {
    try {
      const tl = await PR.readTimeline();
      $("seqName").textContent = tl.name || "Sequência";
      $("seqInfo").textContent = `${tl.duration}s · ${tl.fps || "?"} fps · ${tl.clips.length} clipes`;
    } catch (e) {
      $("seqName").textContent = "—";
      $("seqInfo").textContent = e.message;
    }
  }

  async function boot() {
    refreshSeq();
    try {
      const [contents, kits] = await Promise.all([HUB.contents(), HUB.kits()]);
      $("content").innerHTML = '<option value="">Nenhum</option>' + contents.map((c) => `<option value="${c.id}">${esc(c.title || "Sem título")}${c.format ? " · " + esc(c.format) : ""}</option>`).join("");
      $("kit").innerHTML = '<option value="">Sem kit</option>' + kits.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join("");
      const open = await HUB.lastOpen();
      if (open) { current = open; follow(); }
    } catch (e) { say(e.message); }
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function follow() {
    clearInterval(poll);
    render();
    if (current && current.status === "aguardando_plano") {
      say("Esperando o plano do Claude. No Claude, peça: \"faça o plano da edição do Premiere\".");
      poll = setInterval(async () => {
        try {
          const s = await HUB.getSession(current.id);
          if (s && s.status !== current.status) { current = s; follow(); }
        } catch (e) { say(e.message); }
      }, 8000);
    }
  }

  function render() {
    const box = $("planBox");
    if (!current || current.status !== "plano_pronto" || !current.plan) { box.hidden = true; return; }
    const p = current.plan;
    box.hidden = false;
    say("O plano chegou. Escolha o que aplicar.");
    $("planSummary").textContent = [p.resumo, current.plan_note].filter(Boolean).join(" · ");
    $("planItems").innerHTML = Object.keys(LABELS).filter((k) => (p[k] || []).length).map((k) =>
      `<div class="item"><input type="checkbox" id="pk-${k}" checked><span>${LABELS[k]}</span><span class="n">${p[k].length}</span></div>`).join("");
  }

  $("btnLogin").addEventListener("click", async () => {
    try { await HUB.login($("email").value.trim(), $("password").value); $("password").value = ""; show(); }
    catch (e) { alertBox(e.message); }
  });
  $("btnLogout").addEventListener("click", () => { clearInterval(poll); HUB.logout(); show(); });

  $("btnTranscribe").addEventListener("click", async () => {
    try {
      say("Transcrevendo no Premiere…");
      const tl = await PR.readTimeline();
      const n = await PR.transcribe(tl);
      say(n ? `Pedi a transcrição de ${n} clipe(s). Quando o Premiere terminar, clique em Enviar ao Claude.` : "Os clipes de V1/A1 já estão transcritos.");
    } catch (e) { say(e.message); }
  });

  $("btnSend").addEventListener("click", async () => {
    const btn = $("btnSend");
    btn.disabled = true;
    try {
      say("Lendo a sequência…");
      const tl = await PR.readTimeline();
      const transcript = await PR.readTranscript(tl);
      const row = {
        content_id: $("content").value || null,
        kit_id: $("kit").value || null,
        project_name: tl.projectName || null,
        sequence_name: tl.name || null,
        fps: tl.fps, duration_sec: tl.duration,
        timeline: tl.clips.map(({ _c, ...c }) => c),
        transcript,
        request: $("request").value.trim() || null,
      };
      current = await HUB.createSession(row);
      say(transcript.length ? `Enviado: ${tl.clips.length} clipes e ${transcript.length} palavras.` : "Enviado sem transcrição. Para legendas, use Transcrever clipes antes.");
      follow();
    } catch (e) { say(e.message); }
    btn.disabled = false;
  });

  $("btnApply").addEventListener("click", async () => {
    if (!current || !current.plan) return;
    const pick = {};
    Object.keys(LABELS).forEach((k) => { const el = $("pk-" + k); pick[k] = !!(el && el.checked); });
    $("btnApply").disabled = true;
    try {
      say("Aplicando…");
      const kitId = current.kit_id || $("kit").value;
      const kit = kitId ? await HUB.kit(kitId) : null;
      const r = await PR.applyPlan(current.plan, kit, pick);
      await HUB.setStatus(current.id, "aplicado");
      current.status = "aplicado";
      render();
      const parts = [["marcadores", r.marcadores], ["legendas", r.legendas], ["letterings", r.titulos], ["motion", r.motion], ["zooms", r.zooms], ["inserções", r.insercoes]].filter((x) => x[1]).map((x) => `${x[1]} ${x[0]}`);
      say(`Aplicado: ${parts.join(", ") || "nada"}.${r.avisos.length ? " Avisos: " + r.avisos.slice(0, 3).join(" | ") : ""}`);
    } catch (e) { say(e.message); }
    $("btnApply").disabled = false;
  });

  $("btnDiscard").addEventListener("click", async () => {
    if (!current) return;
    try { await HUB.setStatus(current.id, "cancelado"); current = null; render(); say("Plano descartado."); } catch (e) { say(e.message); }
  });

  function alertBox(t) { say(t); const l = $("login").querySelector(".muted"); if (l) l.textContent = t; }

  show();
})();
