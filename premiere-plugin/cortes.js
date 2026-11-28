/* Corte de pausas: contas puras (sem Premiere), para dar para testar fora do painel.
   A pausa vem da transcrição: o espaço entre o fim de uma palavra e o início da próxima.
   O UXP do Premiere não lê o volume do áudio, então não há limite em dB: o "limite" é a pausa mínima. */
(function (root) {
  const r2 = (n) => Math.round(n * 100) / 100;

  /**
   * Acha as pausas da fala.
   * words: [{inicio, fim, texto}] em segundos da sequência; duracao: fim da sequência.
   * pausaMin e folga em segundos. A folga fica antes e depois de cada fala (respiro).
   */
  function acharPausas(words, duracao, pausaMin, folga) {
    const ws = (words || []).filter((w) => w && w.texto && w.inicio != null).map((w) => ({ s: +w.inicio, e: w.fim != null ? +w.fim : +w.inicio + 0.3 })).sort((a, b) => a.s - b.s);
    if (!ws.length) return [];
    const out = [];
    const add = (ini, fim, motivo) => { ini = Math.max(0, ini); fim = Math.min(duracao, fim); if (fim - ini >= 0.15) out.push({ inicio: r2(ini), fim: r2(fim), motivo }); };
    // antes da primeira palavra
    if (ws[0].s - folga > 0 && ws[0].s >= pausaMin) add(0, ws[0].s - folga, "Silêncio no começo");
    let fimFala = ws[0].e;
    for (let i = 1; i < ws.length; i++) {
      const gap = ws[i].s - fimFala;
      if (gap >= pausaMin) add(fimFala + folga, ws[i].s - folga, `Pausa de ${gap.toFixed(1).replace(".", ",")} s`);
      fimFala = Math.max(fimFala, ws[i].e);
    }
    // depois da última palavra
    if (duracao - fimFala >= pausaMin) add(fimFala + folga, duracao, "Silêncio no fim");
    return out;
  }

  /** junta cortes que se encostam ou se sobrepõem */
  function juntar(cortes) {
    const cs = (cortes || []).map((c) => ({ ...c, inicio: +c.inicio, fim: +c.fim })).filter((c) => c.fim > c.inicio).sort((a, b) => a.inicio - b.inicio);
    const out = [];
    for (const c of cs) {
      const last = out[out.length - 1];
      if (last && c.inicio <= last.fim + 0.02) { last.fim = Math.max(last.fim, c.fim); if (c.motivo && !String(last.motivo || "").includes(c.motivo)) last.motivo = [last.motivo, c.motivo].filter(Boolean).join(" + "); }
      else out.push(c);
    }
    return out;
  }

  /** trechos que ficam, em tempo da sequência: o que sobra de [0, duracao] tirando os cortes */
  function trechosQueFicam(cortes, duracao) {
    const out = [];
    let t = 0;
    for (const c of juntar(cortes)) {
      if (c.inicio > t) out.push({ inicio: t, fim: Math.min(c.inicio, duracao) });
      t = Math.max(t, c.fim);
    }
    if (t < duracao) out.push({ inicio: t, fim: duracao });
    return out.filter((k) => k.fim - k.inicio >= 0.04);
  }

  /**
   * Converte os trechos que ficam em pedaços de arquivo, cruzando com os clipes de V1.
   * clips: [{start, end, inPoint, ref}] (tempo da sequência e ponto de entrada no arquivo).
   * Devolve [{ref, de, ate}] em segundos do arquivo, na ordem em que entram na sequência nova.
   */
  function pedacos(trechos, clips) {
    const cs = (clips || []).slice().sort((a, b) => a.start - b.start);
    const out = [];
    for (const k of trechos) {
      for (const c of cs) {
        const ini = Math.max(k.inicio, c.start), fim = Math.min(k.fim, c.end);
        if (fim - ini < 0.04) continue;
        out.push({ ref: c.ref, de: c.inPoint + (ini - c.start), ate: c.inPoint + (fim - c.start) });
      }
    }
    return out;
  }

  /* ---------- tropeços: gaguejo, vício e tomada repetida (ideia do cut-mistakes do herk-edit-kit, MIT) ---------- */
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  const VICIOS = ["e", "ee", "eh", "ah", "ha", "ahn", "hum", "hmm", "uhm", "tipo", "ne"];

  /** frases: blocos de fala separados por pausa de pelo menos `gap` segundos ou por ponto final */
  function frases(ws, gap) {
    const out = [];
    let cur = [];
    ws.forEach((w, i) => {
      if (cur.length && (w.s - ws[i - 1].e >= gap)) { out.push(cur); cur = []; }
      cur.push(w);
      if (/[.!?]$/.test(w.t)) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out.map((f) => ({ s: f[0].s, e: f[f.length - 1].e, ws: f, set: new Set(f.map((w) => norm(w.t)).filter(Boolean)), txt: f.map((w) => w.t.trim()).join(" ") }));
  }
  const jaccard = (a, b) => { let n = 0; a.forEach((x) => { if (b.has(x)) n++; }); return n / Math.max(1, a.size + b.size - n); };
  const curto = (t, n) => { const p = String(t).split(/\s+/); return p.slice(0, n).join(" ") + (p.length > n ? "…" : ""); };

  /**
   * Acha tropeços na fala. Tudo vira sugestão: a pessoa desmarca o que é ênfase de propósito ("nunca, nunca").
   * vicios: lista do kit; silMin: silêncio mínimo dos dois lados para tirar um vício.
   */
  function acharTropecos(words, vicios, silMin) {
    const ws = (words || []).filter((w) => w && w.texto && w.inicio != null)
      .map((w) => ({ s: +w.inicio, e: w.fim != null ? +w.fim : +w.inicio + 0.3, t: String(w.texto) })).sort((a, b) => a.s - b.s);
    const out = [];
    const sil = silMin != null ? silMin : 0.15;
    const vs = new Set((vicios && vicios.length ? vicios : VICIOS).map(norm));
    // gaguejo: a mesma palavra duas vezes seguidas, colada
    for (let i = 0; i + 1 < ws.length; i++) {
      const a = norm(ws[i].t), b = norm(ws[i + 1].t);
      if (a && a === b && a.length <= 12 && ws[i + 1].s - ws[i].e < 0.6) out.push({ inicio: r2(ws[i].s), fim: r2(ws[i + 1].s), motivo: `Gaguejo: "${ws[i].t.trim()} ${ws[i + 1].t.trim()}"`, tipo: "gaguejo" });
    }
    // vício: só com silêncio dos dois lados, para não cortar palavra no meio da frase
    ws.forEach((w, i) => {
      if (!vs.has(norm(w.t))) return;
      const antes = i ? w.s - ws[i - 1].e : 1, depois = i + 1 < ws.length ? ws[i + 1].s - w.e : 1;
      if (antes >= sil && depois >= sil) out.push({ inicio: r2(w.s), fim: r2(w.e), motivo: `Vício: "${w.t.trim()}"`, tipo: "vicio" });
    });
    // tomada repetida e falso começo: frase que volta a ser dita logo depois; fica a última
    const fs = frases(ws, 0.45);
    let ate = -1;
    for (let i = 0; i < fs.length; i++) {
      if (i <= ate) continue;
      for (let j = i + 1; j <= Math.min(fs.length - 1, i + 3); j++) {
        const a = fs[i], b = fs[j];
        const sim = jaccard(a.set, b.set);
        const falso = a.ws.length <= 4 && b.ws.length > a.ws.length && norm(a.ws[0].t) === norm(b.ws[0].t);
        if ((a.ws.length >= 3 && sim >= 0.55) || falso) {
          out.push({ inicio: r2(a.s), fim: r2(b.s), motivo: `${falso ? "Falso começo" : "Tomada repetida"}: "${curto(a.txt, 6)}"`, tipo: falso ? "falso" : "tomada" });
          ate = j - 1;
          break;
        }
      }
    }
    return out.sort((a, b) => a.inicio - b.inicio);
  }

  const total = (cortes) => juntar(cortes).reduce((s, c) => s + (c.fim - c.inicio), 0);

  const api = { acharPausas, acharTropecos, juntar, trechosQueFicam, pedacos, total };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CORTES = api;
})(typeof window !== "undefined" ? window : this);
