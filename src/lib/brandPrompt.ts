/* Direcionamento da marca para a IA: um texto só, montado a partir da marca criada no Design,
   que vai junto de todo pedido de post, legenda, roteiro e edição de vídeo (fila do HUB e conector do Claude).
   Sem React: roda no navegador, nas rotas de API e no conector MCP. */

const arr = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : v ? String(v).split(/\n+/).filter(Boolean) : []);
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const line = (label: string, v: any) => { const t = Array.isArray(v) ? v.filter(Boolean).join("; ") : (v || "").toString().trim(); return t ? `- ${label}: ${t}` : ""; };
const block = (title: string, lines: (string | false | undefined | null)[]) => { const l = lines.filter(Boolean) as string[]; return l.length ? `## ${title}\n${l.join("\n")}` : ""; };

/** fundo principal: a cor que lidera a proporção da paleta (ex.: "Preto 70%") */
function leadColor(d: any) {
  const pal: any[] = d.palette || [];
  const first = norm(d.brief?.proporcao || "").trim().split(/[\s,]+/)[0] || "";
  return pal.find((p) => first && norm(p.name || "").startsWith(first)) || pal.find((p) => p.role === "Claro");
}

/** o kit de edição de vídeo que nasce da marca (formato do av_style_kits.data) */
export function brandVideoKit(d: any) {
  const pal: any[] = d.palette || [];
  const C = (r: string) => pal.find((p) => p.role === r)?.hex;
  const lead = leadColor(d);
  const dark = lead && lead.role === "Escuro";
  const t = d.type || {};
  const serif = /bodoni|playfair|serif|garamond|cormorant|didot|fraunces|gloock|dm serif/i.test(t.title || "");
  const tom = norm(d.brief?.matriz_tom || "");
  const voz = tom + " " + norm((d.brief?.palavras || []).join(" "));
  const conta = (re: RegExp) => (voz.match(re) || []).length;
  // ritmo de edição pelo tom da marca: elegante e acolhedora = calmo; direta e provocadora = rápido
  const calmo = conta(/eleg|sofistic|acolhe|leve|calm|delica|suave/g) > conta(/diret|firme|provoca|ousad|rapid|energ|intens|cinemat/g);
  return {
    cores: { destaque: C("Primária") || "#F5C84C", texto: dark ? C("Claro") || "#FFFFFF" : C("Escuro") || "#111111", fundo: dark ? C("Escuro") || "#000000" : C("Claro") || "#FFFFFF" },
    fontes: { titulo: t.title || "Anton", legenda: `${t.body || "Inter"} ${serif ? "Bold" : "Black"}` },
    legenda: { estilo: serif ? (calmo ? "editorial" : "serifa") : "impacto", palavras_por_tela: calmo ? 4 : 3, caixa_alta: !serif, altura: 0.64 },
    regras: { corte_max_s: calmo ? 5 : 3.5, silencio_ms: calmo ? 450 : 300, trilha_db: -18 },
    camera: { intensidade: calmo ? 1 : 2, movimentos: calmo ? ["push"] : ["punch", "push", "tremida"] },
    lettering: { tipos: serif ? ["gancho", "frase", "palavra", "cta"] : ["gancho", "palavra", "vazado", "riscado", "frase", "cta"], frequencia: calmo ? "pouco" : "medio" },
    insercao: { modo: calmo ? "pagina" : "cheia", frequencia: "medio" },
    motion: { tipos: ["numero", "checklist", "progresso"], frequencia: calmo ? "pouco" : "medio" },
  };
}

/** o direcionamento completo, em texto, para colar em qualquer IA ou mandar junto dos pedidos */
export function brandPrompt(d: any): string {
  const b = d.brief || {};
  const name = b.nome || "a marca";
  const terr = (d.territories || []).find((t: any) => t.id === d.territory_id) || {};
  const pal: any[] = d.palette || [];
  const t = d.type || {};
  const lead = leadColor(d);
  const kit = brandVideoKit(d);
  const fala = arr(b.fala);
  const nunca = Array.from(new Set([...arr(b.nunca), ...arr(b.proibido)]));
  const pilares = arr(b.pilares);
  const role: Record<string, string> = { Primária: "destaque", Apoio: "apoio", Destaque: "realce", Escuro: "escuro / texto", Claro: "claro / fundo" };

  return [
    `# Direcionamento da marca ${name}`,
    `Use este direcionamento em toda criação para ${name} (post, carrossel, legenda, roteiro, story, edição de vídeo). Ele vem do manual da marca no VINCIT HUB e vale mais que qualquer gosto genérico.`,
    block("Quem é", [
      line("O que faz", b.oque), line("Para quem", b.publico), line("Persona", b.persona),
      line("Frase-mãe", b.frase_mae), line("Propósito", b.proposito), line("Diferencial", b.diferencial),
      line("Arquétipo", b.arquetipo), line("Não é", arr(b.nao_e)),
    ]),
    block(`Território: ${terr.nome || b.territorio || ""}`.trim(), [
      line("Ideia", terr.ideia || b.territorio), line("Metáfora", terr.metafora), line("Palavras do território", arr(terr.palavras)),
    ]),
    block("Voz", [
      line("Tom", (b.matriz_tom || "").replace(/\n/g, "; ")),
      line("Palavras que a marca usa", arr(b.palavras)),
      fala.length ? `- Frases da marca (use como referência de ritmo, não copie sempre):\n${fala.map((f) => `  - "${f}"`).join("\n")}` : "",
      line("Slogan", b.slogan), line("Pilares de conteúdo", pilares), line("Valores", arr(b.valores)),
    ]),
    block("Nunca", [nunca.length ? nunca.map((n) => `- ${n}`).join("\n") : "", "- Clichês de IA: 'O resultado?', 'Não é X, é Y', trios em sequência, 'jornada', 'elevar', 'potencializar', anúncio de sinceridade."]),
    block("Regras de ouro", arr(b.regras_ouro).map((r) => `- ${r}`)),
    block("Visual", [
      pal.length ? `- Paleta:\n${pal.map((p) => `  - ${p.name || p.role} ${String(p.hex).toUpperCase()} (${role[p.role] || p.role})`).join("\n")}` : "",
      line("Proporção", b.proporcao), lead ? `- Fundo principal: ${lead.name} ${String(lead.hex).toUpperCase()}` : "",
      line("Títulos", t.title && `${t.title}${t.tw ? ` ${t.tw}` : ""}`), line("Texto", t.body), line("Gesto (usar pouco, só em assinatura ou selo)", t.accent),
      line("Uso das letras", terr.tipo), line("Grafismo", [terr.forma, d.pattern?.nome].filter(Boolean).map((x: string) => x.replace(/\.$/, "")).join("; ")),
      line("Cor no território", terr.cor), line("Regras visuais", arr(b.regras_visuais)), line("Elementos recorrentes", arr(b.elementos)),
    ]),
    block("Posts e carrosséis", [
      "- Um post, uma ideia. A primeira frase responde uma pergunta clara (busca do Instagram e das IAs).",
      `- Títulos em ${t.title || "fonte de título"}, texto em ${t.body || "fonte de texto"}, palavra-chave na cor de destaque${/degrade/.test(norm(terr.cor || "")) ? " (em degradê)" : ""}.`,
      lead ? `- Fundo em ${lead.name}; destaque só onde o manual manda.` : "",
      pilares.length ? `- Distribua a pauta entre os pilares: ${pilares.join(", ")}.` : "",
      "- Legenda: primeira linha com até 125 caracteres, no máximo 5 hashtags, fecho com pedido de ação específico (salvar, mandar para alguém).",
      "- Prefira número exato com referência, nome real e detalhe concreto; se faltar, pergunte em vez de inventar.",
    ]),
    block("Vídeo e edição", [
      `- Cores: destaque ${kit.cores.destaque}, texto ${kit.cores.texto}, fundo ${kit.cores.fundo}.`,
      `- Letras: título em ${kit.fontes.titulo}, legenda em ${kit.fontes.legenda}${kit.legenda.caixa_alta ? " em caixa alta" : ""}, ${kit.legenda.palavras_por_tela} palavras por tela.`,
      `- Ritmo: cortes de até ${kit.regras.corte_max_s} s, ${kit.camera.intensidade === 1 ? "câmera calma (só aproximação lenta)" : "câmera com punch e aproximação nos pontos fortes"}, lettering ${kit.lettering.frequencia === "pouco" ? "pontual" : "frequente"}.`,
      "- Gancho falado nos 2 primeiros segundos; um CTA só no fim.",
      line("Regras de ouro na edição", arr(b.regras_ouro).filter((r) => /camera|roteiro|ideia|corpo|nome|grav/i.test(norm(r)))),
    ]),
    block("Antes de entregar, confira", [
      "- Soa como as frases da marca? Usa alguma palavra da lista Nunca?",
      "- Cores e letras são as do manual, na proporção certa?",
      "- Tem uma ideia só e um pedido de ação claro?",
    ]),
  ].filter(Boolean).join("\n\n");
}
