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

  const total = (cortes) => juntar(cortes).reduce((s, c) => s + (c.fim - c.inicio), 0);

  const api = { acharPausas, juntar, trechosQueFicam, pedacos, total };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CORTES = api;
})(typeof window !== "undefined" ? window : this);
