/* Lê a sequência ativa e aplica o plano do Claude usando a API UXP do Premiere Pro (25.6 ou mais novo). */
(function () {
  const ppro = require("premierepro");
  const TPS = 254016000000; // ticks por segundo no Premiere
  const T = (s) => ppro.TickTime.createWithSeconds(Math.max(0, +s || 0));
  const r2 = (n) => Math.round(n * 100) / 100;

  async function ctx() {
    const project = await ppro.Project.getActiveProject();
    if (!project) throw new Error("Abra um projeto no Premiere.");
    const seq = await project.getActiveSequence();
    if (!seq) throw new Error("Abra uma sequência na timeline.");
    return { project, seq };
  }

  /** roda ações numa transação só (vira um único Desfazer) */
  function run(project, actions, label) {
    if (!actions.length) return true;
    let ok = false;
    project.lockedAccess(() => {
      ok = project.executeTransaction((ca) => { actions.forEach((a) => a && ca.addAction(a)); }, label || "VINCIT HUB");
    });
    return ok;
  }

  async function trackItems(track) {
    const list = track.getTrackItems(1, false) || []; // 1 = clipes
    const out = [];
    for (const it of list) {
      const [start, end, inPt, name, pi] = await Promise.all([it.getStartTime(), it.getEndTime(), it.getInPoint(), it.getName(), it.getProjectItem()]);
      out.push({ item: it, start: start.seconds, end: end.seconds, inPoint: inPt.seconds, name, projectItem: pi });
    }
    return out;
  }

  async function readTimeline() {
    const { project, seq } = await ctx();
    const tb = Number(await seq.getTimebase()) || 0;
    const fps = tb ? r2(TPS / tb) : null;
    const end = (await seq.getEndTime()).seconds;
    const clips = [];
    const vCount = await seq.getVideoTrackCount();
    for (let i = 0; i < vCount; i++) {
      for (const c of await trackItems(await seq.getVideoTrack(i))) clips.push({ faixa: `V${i + 1}`, nome: c.name, inicio: r2(c.start), fim: r2(c.end), entrada: r2(c.inPoint), _c: c });
    }
    const aCount = await seq.getAudioTrackCount();
    for (let i = 0; i < aCount; i++) {
      for (const c of await trackItems(await seq.getAudioTrack(i))) clips.push({ faixa: `A${i + 1}`, nome: c.name, inicio: r2(c.start), fim: r2(c.end), entrada: r2(c.inPoint), _c: c });
    }
    return { project, seq, name: seq.name, projectName: project.name, fps, duration: r2(end), clips };
  }

  /* ---------- transcrição ---------- */

  // O JSON da transcrição do Premiere não tem formato documentado: procuramos palavras/trechos com texto e tempo.
  function collectWords(node, out) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach((n) => collectWords(n, out)); return; }
    const text = node.text != null ? node.text : node.word != null ? node.word : null;
    const st = node.start != null ? node.start : node.startTime != null ? node.startTime : node.start_time != null ? node.start_time : node.offset;
    const hasKids = Object.values(node).some((v) => Array.isArray(v) && v.length && typeof v[0] === "object");
    if (typeof text === "string" && st != null && !hasKids) {
      const dur = node.duration != null ? +node.duration : null;
      const en = node.end != null ? +node.end : node.endTime != null ? +node.endTime : dur != null ? +st + dur : null;
      out.push({ s: +st, e: en, t: text });
      return;
    }
    Object.values(node).forEach((v) => collectWords(v, out));
  }

  function normalize(words, clipLen) {
    const max = Math.max(0, ...words.map((w) => w.s));
    const div = max > 1e8 ? TPS : max > Math.max(clipLen * 5, 600) ? 1000 : 1; // ticks, ms ou segundos
    return words.map((w) => ({ s: w.s / div, e: w.e != null ? w.e / div : null, t: w.t }));
  }

  /** transcrição em segundos da sequência, a partir dos clipes de V1/A1 que já foram transcritos */
  async function readTranscript(tl) {
    const seen = new Set();
    const out = [];
    const base = tl.clips.filter((c) => c.faixa === "A1" || c.faixa === "V1");
    for (const c of base) {
      const pi = c._c.projectItem;
      if (!pi) continue;
      let clip;
      try { clip = ppro.ClipProjectItem.cast(pi); } catch (e) { continue; }
      if (!clip || !ppro.Transcript.hasTranscript(clip)) continue;
      const key = `${pi.name}|${c.inicio}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let json;
      try { json = JSON.parse(await ppro.Transcript.exportToJSON(clip)); } catch (e) { continue; }
      const words = [];
      collectWords(json, words);
      for (const w of normalize(words, c.fim - c.inicio + c.entrada)) {
        if (w.s < c.entrada - 0.05 || w.s > c.entrada + (c.fim - c.inicio)) continue; // fora do trecho usado
        const s = c.inicio + (w.s - c.entrada);
        out.push({ inicio: r2(s), fim: w.e != null ? r2(c.inicio + (w.e - c.entrada)) : null, texto: w.t.trim() });
      }
    }
    out.sort((a, b) => a.inicio - b.inicio);
    const uniq = out.filter((w, i) => w.texto && !(i && out[i - 1].inicio === w.inicio && out[i - 1].texto === w.texto));
    return uniq.slice(0, 6000);
  }

  async function transcribe(tl) {
    const langs = ppro.Transcript.querySupportedLanguages() || [];
    const pt = langs.find((l) => /^pt/i.test(l.languageCode || l.locale || ""));
    const language = pt ? pt.languageCode : undefined;
    const done = new Set();
    let n = 0;
    for (const c of tl.clips.filter((c) => c.faixa === "A1" || c.faixa === "V1")) {
      const pi = c._c.projectItem;
      if (!pi || done.has(pi.name)) continue;
      done.add(pi.name);
      let clip;
      try { clip = ppro.ClipProjectItem.cast(pi); } catch (e) { continue; }
      if (!clip || ppro.Transcript.hasTranscript(clip)) continue;
      if (await ppro.Transcript.transcribeClipProjectItem(clip, language ? { language } : undefined)) n++;
    }
    return n;
  }

  /* ---------- aplicar o plano ---------- */

  async function findProjectItem(project, query) {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return null;
    const root = await project.getRootItem();
    const stack = [root];
    let best = null;
    while (stack.length) {
      const folder = stack.pop();
      const items = (await folder.getItems()) || [];
      for (const it of items) {
        if (it.type === ppro.ProjectItem.TYPE_BIN) { stack.push(ppro.FolderItem.cast(it)); continue; }
        const n = String(it.name || "").toLowerCase();
        if (n === q) return it;
        if (!best && (n.includes(q) || q.includes(n.replace(/\.[a-z0-9]+$/, "")))) best = it;
      }
    }
    return best;
  }

  async function setMogrtText(item, text) {
    const chain = await item.getComponentChain();
    for (let i = 0; i < chain.getComponentCount(); i++) {
      const comp = chain.getComponentAtIndex(i);
      for (let j = 0; j < comp.getParamCount(); j++) {
        const p = comp.getParam(j);
        let v;
        try { v = await p.getStartValue(); } catch (e) { continue; }
        if (v && typeof v.setText === "function") {
          v.setText(text);
          return p.createSetValueAction(p.createKeyframe(v), true);
        }
      }
    }
    return null;
  }

  async function zoomActions(c, z) {
    const chain = await c.item.getComponentChain();
    for (let i = 0; i < chain.getComponentCount(); i++) {
      const comp = chain.getComponentAtIndex(i);
      const mn = await comp.getMatchName();
      if (!/motion/i.test(mn)) continue;
      let scale = null;
      for (let j = 0; j < comp.getParamCount(); j++) {
        const p = comp.getParam(j);
        if (/^(scale|escala)$/i.test(p.displayName || "")) { scale = p; break; }
      }
      if (!scale) scale = comp.getParam(1);
      const toMedia = (s) => c.inPoint + (s - c.start); // tempo do keyframe no clipe
      const kf = (t, v) => { const k = scale.createKeyframe(v); k.position = T(toMedia(t)); return scale.createAddKeyframeAction(k); };
      const val = +z.escala || 110;
      const ini = Math.max(c.start, +z.inicio), fim = Math.min(c.end, z.fim != null ? +z.fim : +z.inicio + 1.5);
      const acts = [];
      if (!scale.isTimeVarying()) acts.push(scale.createSetTimeVaryingAction(true));
      // tipo do movimento (vem do Editor do HUB): punch entra seco, push aproxima devagar, pull afasta devagar, chicote passa rápido
      const tipo = z.tipo || "punch";
      if (tipo === "push") acts.push(kf(ini, 100), kf(fim, val), kf(Math.min(c.end, fim + 0.04), 100));
      else if (tipo === "pull") acts.push(kf(Math.max(c.start, ini - 0.04), 100), kf(ini, val), kf(fim, 100));
      else if (tipo === "chicote") acts.push(kf(ini, 100), kf(Math.min(fim, ini + 0.12), val), kf(fim, 100));
      else acts.push(kf(Math.max(c.start, ini - 0.04), 100), kf(ini, val), kf(fim, val), kf(Math.min(c.end, fim + 0.04), 100));
      return acts;
    }
    return null;
  }

  const fmt = (s) => { s = +s || 0; const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`; };

  /**
   * Aplica as partes escolhidas do plano.
   * Cortes viram marcadores (o editor confere e corta). Legendas e títulos usam os MOGRTs do kit, ou viram marcadores.
   */
  async function applyPlan(plan, kit, pick, log) {
    const tl = await readTimeline();
    const { project, seq } = tl;
    const markers = await ppro.Markers.getMarkers(seq);
    const mk = [];
    const marker = (name, ini, fim, note) => mk.push(markers.createAddMarkerAction(String(name).slice(0, 120), "Comment", T(ini), T(Math.max(0, (fim != null ? fim : ini) - ini)), note || ""));
    const mogrts = (kit && kit.data && kit.data.mogrts) || {};
    const res = { marcadores: 0, legendas: 0, titulos: 0, motion: 0, zooms: 0, insercoes: 0, avisos: [] };

    if (pick.cortes) (plan.cortes || []).forEach((c) => marker(`✂ Cortar ${fmt(c.inicio)}–${fmt(c.fim)}`, c.inicio, c.fim, c.motivo));
    if (pick.marcadores) (plan.marcadores || []).forEach((m) => marker(m.texto || "Nota do Claude", m.inicio, m.fim, m.texto));

    // legendas e títulos: MOGRT do kit numa faixa nova acima de tudo
    const editor = ppro.SequenceEditor.getEditor(seq);
    async function placeMogrts(list, pathFor, label, key) {
      const queue = [];
      for (const x of list) {
        const path = pathFor(x);
        if (!path) { marker(`${x.nome || label}: ${x.texto}${x.linha ? " · " + x.linha : ""}`, x.inicio, x.fim, [x.nome || label, x.texto, x.linha].filter(Boolean).join(" | ")); continue; }
        queue.push({ x, path });
      }
      if (!queue.length) return;
      const track = await seq.getVideoTrackCount(); // índice novo = cria faixa
      const placed = [];
      project.lockedAccess(() => {
        for (const q of queue) {
          try {
            const items = editor.insertMogrtFromPath(q.path, T(q.x.inicio), track, 0) || [];
            const v = items[0]; // o primeiro item é o vídeo do MOGRT
            if (v) placed.push({ v, x: q.x });
          } catch (e) { res.avisos.push(`${label}: não consegui inserir ${q.path}`); }
        }
      });
      const acts = [];
      for (const p of placed) {
        if (p.x.fim != null) acts.push(p.v.createSetEndAction(T(p.x.fim)));
        try {
          const caixa = kit && kit.data && kit.data.legenda && kit.data.legenda.caixa_alta;
          const a = await setMogrtText(p.v, caixa ? String(p.x.texto).toUpperCase() : p.x.texto);
          if (a) acts.push(a); else res.avisos.push(`${label}: o MOGRT não tem campo de texto editável`);
        } catch (e) { res.avisos.push(`${label}: texto não aplicado (${e.message})`); }
      }
      run(project, acts, `VINCIT: ${label}`);
      res[key] += placed.length;
    }
    if (pick.legendas) await placeMogrts(plan.legendas || [], () => mogrts.legenda, "Legenda", "legendas");
    if (pick.titulos) await placeMogrts(plan.titulos || [], (t) => mogrts[t.tipo] || mogrts.gancho, "Título", "titulos");
    // motion (número, gráfico, checklist…): só com o MOGRT do próprio tipo; sem ele, marcador com a instrução
    if (pick.motion) await placeMogrts(plan.motion || [], (t) => mogrts[t.tipo], "Motion", "motion");
    if (pick.zooms) (plan.zooms || []).filter((z) => z.tipo === "tremida").forEach((z) => marker(`Tremida (impacto) ${z.escala || 108}%`, z.inicio, z.fim, "Adicione um shake curto neste trecho"));

    // zoom: keyframes de Escala no clipe de V1 que cobre o trecho
    if (pick.zooms && (plan.zooms || []).length) {
      const v1 = tl.clips.filter((c) => c.faixa === "V1").map((c) => c._c);
      const acts = [];
      for (const z of plan.zooms) {
        const c = v1.find((c) => +z.inicio >= c.start && +z.inicio < c.end);
        let a = null;
        try { a = c ? await zoomActions(c, z) : null; } catch (e) { a = null; }
        if (a) { acts.push(...a); res.zooms++; } else marker(`Zoom ${z.escala || 110}%`, z.inicio, z.fim);
      }
      if (!run(project, acts, "VINCIT: zooms") && acts.length) res.avisos.push("Zoom: o Premiere recusou os keyframes; ficaram como marcadores.");
    }

    // inserções: se o arquivo existe no projeto, entra em V2; senão vira marcador
    if (pick.insercoes && (plan.insercoes || []).length) {
      const aCount = await seq.getAudioTrackCount(); // áudio do B-roll numa faixa nova, sem cobrir a voz
      const vIdx = 1; // V2
      for (const ins of plan.insercoes) {
        const pi = await findProjectItem(project, ins.midia);
        if (!pi) { marker(`B-roll: ${ins.midia}${ins.modo && ins.modo !== "cheia" ? " (" + ins.modo + ")" : ""}`, ins.inicio, ins.fim, ins.motivo); continue; }
        const dur = ins.fim != null ? Math.max(0.2, +ins.fim - +ins.inicio) : 3;
        let clip = null;
        try { clip = ppro.ClipProjectItem.cast(pi); } catch (e) {}
        if (clip) run(project, [clip.createSetInPointAction(T(0)), clip.createSetOutPointAction(T(dur))], "VINCIT: duração do B-roll");
        if (run(project, [editor.createOverwriteItemAction(pi, T(ins.inicio), vIdx, aCount)], "VINCIT: B-roll")) res.insercoes++;
        else marker(`B-roll: ${ins.midia}`, ins.inicio, ins.fim, ins.motivo);
      }
    }

    run(project, mk, "VINCIT: marcadores do plano");
    res.marcadores = mk.length;
    if (log) log(res);
    return res;
  }

  /* ---------- cortar de verdade (pausas e cortes do plano) ---------- */

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gid = (s) => String(s && s.guid);

  /** itens de todas as faixas (ou só das que passam no filtro) */
  async function itemsOf(seq, keepVideo, keepAudio) {
    const out = [];
    const vc = await seq.getVideoTrackCount();
    for (let i = 0; i < vc; i++) if (keepVideo(i)) out.push(...(await trackItems(await seq.getVideoTrack(i))));
    const ac = await seq.getAudioTrackCount();
    for (let i = 0; i < ac; i++) out.push(...(await trackItems(await seq.getAudioTrack(i))).filter((c) => keepAudio(i, c)));
    return out;
  }

  function removeItems(project, seq, items) {
    if (!items.length) return true;
    const editor = ppro.SequenceEditor.getEditor(seq);
    let ok = false;
    ppro.TrackItemSelection.createEmptySelection((sel) => {
      items.forEach((c) => sel.addItem(c.item, true));
      ok = run(project, [editor.createRemoveItemsAction(sel, false, ppro.Constants.MediaType.ANY, false)], "VINCIT: limpar a sequência nova");
    });
    return ok;
  }

  /**
   * Monta uma sequência nova só com o que fica (a original não muda).
   * cortes: [{inicio, fim}] em segundos da sequência ativa, já aprovados pela pessoa.
   */
  async function cutSequence(cortes) {
    const tl = await readTimeline();
    const { project, seq } = tl;
    const v1 = tl.clips.filter((c) => c.faixa === "V1").map((c) => c._c).filter((c) => c.projectItem);
    if (!v1.length) throw new Error("Não há clipes em V1 para cortar.");
    const trechos = CORTES.trechosQueFicam(cortes, tl.duration);
    const peds = CORTES.pedacos(trechos, v1.map((c) => ({ start: c.start, end: c.end, inPoint: c.inPoint, ref: c.projectItem })));
    if (!peds.length) throw new Error("Os cortes tiram o vídeo inteiro.");
    const avisos = [];
    const fala = new Set(v1.map((c) => c.name));
    const outras = tl.clips.filter((c) => c.faixa !== "V1" && !(c.faixa[0] === "A" && fala.has(c.nome)));
    if (outras.length) avisos.push(`${outras.length} clipe(s) fora de V1 ficaram de fora: entre com eles depois dos cortes.`);

    // 1. sequência nova com as mesmas configurações: clona a ativa (ou cria a partir da mídia, se o clone falhar)
    const antes = new Set((await project.getSequences()).map(gid));
    run(project, [seq.createCloneAction()], "VINCIT: copiar a sequência");
    let novo = null;
    for (let i = 0; i < 10 && !novo; i++) {
      novo = (await project.getSequences()).find((s) => !antes.has(gid(s))) || null;
      if (!novo) await wait(300);
    }
    let soFala = true;
    if (!novo) {
      const clip = ppro.ClipProjectItem.cast(v1[0].projectItem);
      novo = await project.createSequenceFromMedia(`${seq.name} · sem pausas`, [clip]);
      soFala = false;
      if (!novo) throw new Error("O Premiere não criou a sequência nova.");
    }
    const nome = `${seq.name} · sem pausas`;
    try { const pi = await novo.getProjectItem(); run(project, [pi.createSetNameAction(nome)], "VINCIT: nome da sequência"); } catch (e) {}

    // 2. tira a fala antiga da cópia (V1 e o áudio dos mesmos arquivos); o resto fica no tempo antigo
    const velhos = await itemsOf(novo, (i) => !soFala || i === 0, (i, c) => !soFala || fala.has(c.name));
    if (!removeItems(project, novo, velhos)) throw new Error("Não consegui limpar a sequência nova.");
    if (soFala && outras.length) {
      const resto = await itemsOf(novo, (i) => i > 0, (i, c) => !fala.has(c.name));
      removeItems(project, novo, resto);
    }

    // 3. põe os pedaços um depois do outro, a partir do 0
    const editor = ppro.SequenceEditor.getEditor(novo);
    const AUD = ppro.Constants.MediaType.AUDIO, VID = ppro.Constants.MediaType.VIDEO;
    const marcas = new Map(); // entrada e saída originais de cada arquivo, para devolver no fim
    let t = 0, n = 0;
    for (const p of peds) {
      let clip;
      try { clip = ppro.ClipProjectItem.cast(p.ref); } catch (e) { clip = null; }
      if (!clip) { avisos.push(`Pedaço de ${fmt(p.de)} pulado: arquivo não encontrado.`); continue; }
      const key = p.ref.name;
      if (!marcas.has(key)) {
        try { marcas.set(key, { clip, i: await clip.getInPoint(VID), o: await clip.getOutPoint(VID) }); } catch (e) { try { marcas.set(key, { clip, i: await clip.getInPoint(AUD), o: await clip.getOutPoint(AUD) }); } catch (e2) { marcas.set(key, { clip }); } }
      }
      const ok = run(project, [clip.createSetInPointAction(T(p.de)), clip.createSetOutPointAction(T(p.ate))], "VINCIT: trecho")
        && run(project, [editor.createOverwriteItemAction(p.ref, T(t), 0, 0)], "VINCIT: montar sem pausas");
      if (ok) { t += p.ate - p.de; n++; } else avisos.push(`O Premiere recusou o pedaço de ${fmt(p.de)}.`);
    }
    for (const m of marcas.values()) {
      if (m.i && m.o) run(project, [m.clip.createSetInPointAction(m.i), m.clip.createSetOutPointAction(m.o)], "VINCIT: devolver entrada e saída");
      else run(project, [m.clip.createClearInOutPointsAction()], "VINCIT: devolver entrada e saída");
    }

    try { await project.openSequence(novo); await project.setActiveSequence(novo); } catch (e) {}
    return { nome, pedacos: n, antes: tl.duration, depois: r2(t), avisos };
  }

  window.PR = { readTimeline, readTranscript, transcribe, applyPlan, cutSequence };
})();
