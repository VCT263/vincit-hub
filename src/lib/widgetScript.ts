/**
 * Script do widget para o app Scriptable (iPhone; no Mac aparece pelos widgets do iPhone no macOS Sonoma ou mais novo).
 * A tela Minha conta gera o script já com a chave pessoal do usuário.
 */
export function widgetScript(url: string, accent = "#6eefb6") {
  return `// VINCIT HUB · Seu dia (widget para o app Scriptable)
// Tamanhos: pequeno, médio, grande e tela bloqueada. Toque no widget para abrir o HUB.
// A chave abaixo é pessoal: não compartilhe. Para trocar, gere uma nova em Minha conta.
const RESUMO = ${JSON.stringify(url)};

const C = { ink: new Color("#0c0c0d"), panel: new Color("#151517"), paper: new Color("#f1f1f1"), fog: new Color("#8a8f94"), red: new Color("#ff6b6b"), mint: new Color(${JSON.stringify(accent)}) };
const mono = (s) => Font.semiboldMonospacedSystemFont(s);
const bold = (s) => Font.heavySystemFont(s);
const reg = (s) => Font.systemFont(s);

async function carregar() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "vincit-resumo.json");
  try {
    const r = new Request(RESUMO);
    r.timeoutInterval = 15;
    const d = await r.loadJSON();
    if (d && d.ok) fm.writeString(cache, JSON.stringify(d));
    return d;
  } catch (e) {
    if (fm.fileExists(cache)) { const d = JSON.parse(fm.readString(cache)); d.offline = true; return d; }
    return { ok: false, error: "Sem conexão com o HUB" };
  }
}

const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
const quando = (p, hoje) => !p ? "" : (p.dia === hoje ? "" : ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(p.dia + "T12:00:00").getDay()] + " ") + p.hora.replace(":00", "h");

function txt(stack, s, font, color, lines) {
  const t = stack.addText(String(s));
  t.font = font; t.textColor = color || C.paper;
  if (lines) t.lineLimit = lines;
  t.minimumScaleFactor = 0.7;
  return t;
}

function kicker(stack, d) {
  const row = stack.addStack(); row.centerAlignContent();
  txt(row, "SEU DIA", mono(10), C.mint);
  row.addSpacer();
  if (d.avisos) txt(row, "● " + d.avisos, mono(10), C.mint);
  if (d.offline) txt(row, " offline", mono(9), C.fog);
}

function numeros(stack, d, grande) {
  const h = d.hoje;
  txt(stack, h.abertas, bold(grande ? 40 : 34), C.paper);
  txt(stack, h.abertas === 1 ? "tarefa aberta" : "tarefas abertas", reg(12), C.fog);
  if (h.atrasadas) txt(stack, plural(h.atrasadas, "atrasada", "atrasadas"), Font.semiboldSystemFont(12), C.red);
  else if (h.concluidas) txt(stack, plural(h.concluidas, "feita hoje", "feitas hoje"), Font.semiboldSystemFont(12), C.mint);
}

function proximo(stack, d) {
  const p = d.proximo;
  if (!p) { txt(stack, "Agenda livre", reg(11), C.fog); return; }
  const row = stack.addStack(); row.centerAlignContent();
  txt(row, quando(p, d.data) + "  ", mono(11), C.mint);
  txt(row, p.titulo, Font.semiboldSystemFont(11), C.paper, 1);
}

function semana(stack, d) {
  const s = d.semana;
  const row = stack.addStack(); row.centerAlignContent();
  txt(row, "SEMANA ", mono(9), C.fog);
  txt(row, s.pct == null ? plural(s.concluidas, "feita", "feitas") : s.pct + "%", mono(9), C.mint);
  if (s.publicados) txt(row, "  ·  " + plural(s.publicados, "post", "posts"), mono(9), C.fog);
}

function tarefas(stack, d, max) {
  const lista = d.tarefas.slice(0, max);
  if (!lista.length) { txt(stack, d.hoje.publicar ? "Nada pendente além das publicações" : "Tudo em dia por hoje", reg(12), C.fog); return; }
  for (const t of lista) {
    const row = stack.addStack(); row.centerAlignContent(); row.spacing = 6;
    txt(row, t.atrasada ? "!" : "○", mono(11), t.atrasada ? C.red : C.mint);
    txt(row, t.titulo, reg(12), C.paper, 1);
    row.addSpacer();
    if (t.hora) txt(row, t.hora, mono(10), C.fog);
    stack.addSpacer(3);
  }
  const resto = d.hoje.abertas - lista.length;
  if (resto > 0) txt(stack, "+ " + resto + " no HUB", mono(10), C.fog);
}

function erro(w, d) {
  txt(w, "VINCIT HUB", mono(10), C.mint);
  w.addSpacer(6);
  txt(w, d.error || "Não foi possível carregar", reg(12), C.paper, 3);
}

async function montar(fam) {
  const d = await carregar();
  const w = new ListWidget();
  w.backgroundColor = C.ink;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  w.url = (d && d.url) || RESUMO.split("/api/")[0];
  if (!d || !d.ok) { erro(w, d || {}); return w; }

  // tela bloqueada
  if (fam === "accessoryInline") {
    txt(w, (d.hoje.abertas ? plural(d.hoje.abertas, "tarefa", "tarefas") : "Tudo em dia") + (d.proximo ? " · " + quando(d.proximo, d.data) + " " + d.proximo.titulo : ""), reg(12));
    return w;
  }
  if (fam === "accessoryCircular") {
    w.addSpacer(); const s = w.addStack(); s.addSpacer(); txt(s, d.hoje.abertas, bold(22)); s.addSpacer();
    const s2 = w.addStack(); s2.addSpacer(); txt(s2, d.hoje.atrasadas ? d.hoje.atrasadas + " atr." : "hoje", reg(9)); s2.addSpacer(); w.addSpacer();
    return w;
  }
  if (fam === "accessoryRectangular") {
    txt(w, "VINCIT · " + (d.hoje.abertas ? plural(d.hoje.abertas, "tarefa", "tarefas") : "tudo em dia"), Font.semiboldSystemFont(13));
    if (d.hoje.atrasadas) txt(w, plural(d.hoje.atrasadas, "atrasada", "atrasadas"), reg(12));
    else if (d.tarefas[0]) txt(w, d.tarefas[0].titulo, reg(12), null, 1);
    if (d.proximo) txt(w, quando(d.proximo, d.data) + " " + d.proximo.titulo, reg(12), null, 1);
    return w;
  }

  w.setPadding(14, 14, 14, 14);
  if (fam === "small") {
    kicker(w, d); w.addSpacer(4); numeros(w, d); w.addSpacer(); proximo(w, d); w.addSpacer(4); semana(w, d);
    return w;
  }
  if (fam === "medium") {
    const row = w.addStack(); row.spacing = 14;
    const esq = row.addStack(); esq.layoutVertically(); esq.size = new Size(110, 0);
    kicker(esq, d); esq.addSpacer(4); numeros(esq, d); esq.addSpacer(); semana(esq, d);
    const dir = row.addStack(); dir.layoutVertically();
    txt(dir, "HOJE", mono(10), C.fog); dir.addSpacer(5); tarefas(dir, d, 4); dir.addSpacer(); proximo(dir, d);
    return w;
  }
  // grande (e Mac)
  kicker(w, d); w.addSpacer(2);
  txt(w, d.saudacao, bold(20), C.paper, 1); w.addSpacer(10);
  const nums = w.addStack(); nums.spacing = 18;
  const bloco = (n, l, cor) => { const b = nums.addStack(); b.layoutVertically(); txt(b, n, bold(24), cor || C.paper); txt(b, l, reg(10), C.fog); };
  bloco(d.hoje.abertas, "abertas"); bloco(d.hoje.atrasadas, "atrasadas", d.hoje.atrasadas ? C.red : null); bloco(d.hoje.concluidas, "feitas hoje", C.mint); if (d.hoje.publicar) bloco(d.hoje.publicar, "publicar");
  w.addSpacer(12);
  txt(w, "TAREFAS", mono(10), C.fog); w.addSpacer(5); tarefas(w, d, 5);
  w.addSpacer(10);
  txt(w, "AGENDA", mono(10), C.fog); w.addSpacer(5);
  if (!d.agenda.length) proximo(w, d);
  for (const a of d.agenda.slice(0, 3)) { const r = w.addStack(); r.spacing = 6; txt(r, a.hora, mono(11), C.mint); txt(r, a.titulo, reg(12), C.paper, 1); w.addSpacer(3); }
  w.addSpacer();
  const s = d.semana;
  txt(w, "SEMANA  " + (s.pct == null ? "" : s.pct + "% do previsto  ·  ") + plural(s.concluidas, "tarefa feita", "tarefas feitas") + (s.publicados ? "  ·  " + plural(s.publicados, "post publicado", "posts publicados") : ""), mono(9), C.mint, 1);
  return w;
}

const fam = config.widgetFamily || "medium";
const w = await montar(fam);
if (config.runsInWidget) Script.setWidget(w);
else if (fam === "small") await w.presentSmall();
else if (fam === "large") await w.presentLarge();
else await w.presentMedium();
Script.complete();
`;
}
