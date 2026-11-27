import { NextResponse } from "next/server";
import { callClaude, extractJson, withAIQueue } from "@/lib/ai";
import { normalizeSpec } from "@/lib/motion/engine";

export const maxDuration = 60;

/* Pacote de cenas a partir do roteiro (27/11, referência de reel do Vinícius): o Editor manda a fala com os tempos,
   o roteiro e a lista de fotos do projeto; o Claude devolve uma cena editorial (ou número, lista, citação) para cada
   ideia forte da fala, com o momento em que entra. O Editor põe cada cena na timeline, nas cores do kit.
   Vai pela fila do Claude (sem API paga). Nada é gravado no banco: o resultado volta para a tela. */
const TIPOS = ["editorial", "numero", "lista", "citacao", "palavras"] as const;

async function handle(req: Request) {
  try {
    const { fala, roteiro, fotos, formato, quantidade, duracao } = await req.json();
    const frases: { inicio: number; fim: number; texto: string }[] = (Array.isArray(fala) ? fala : []).slice(0, 400)
      .map((f: any) => ({ inicio: +f.inicio || 0, fim: +f.fim || 0, texto: String(f.texto || "").slice(0, 400) })).filter((f: any) => f.texto.trim());
    if (!frases.length) return NextResponse.json({ error: "Gere a legenda primeiro: as cenas saem da fala." }, { status: 400 });
    const lista: { id: string; nome: string }[] = (Array.isArray(fotos) ? fotos : []).slice(0, 40).map((f: any) => ({ id: String(f.id), nome: String(f.nome || "").slice(0, 80) }));
    const total = +duracao || frases[frases.length - 1].fim;
    const n = Math.max(2, Math.min(20, +quantidade || Math.round(total / 6)));

    const text = await callClaude({
      maxTokens: 3500,
      prompt: `Vídeo ${formato || "9:16"} de ${Math.round(total)} s no Editor do VINCIT HUB. Monte o pacote de cenas que entram por cima da fala, em tela cheia, no estilo de vídeo explicativo editorial: papel claro, chamada pequena, título serifado com a palavra forte destacada e foto em cartão.

Fala com tempos (segundos na saída editada):
${frases.map((f) => `[${f.inicio.toFixed(1)}–${f.fim.toFixed(1)}] ${f.texto}`).join("\n")}
${roteiro ? `\nRoteiro aprovado (contexto):\n"""${String(roteiro).slice(0, 3000)}"""\n` : ""}
${lista.length ? `Fotos disponíveis no projeto (use o id em "foto"; cada foto no máximo uma vez):\n${lista.map((f) => `- ${f.id}: ${f.nome}`).join("\n")}\n` : "Sem fotos no projeto: deixe \"foto\" vazio.\n"}
Tipos de cena:
- editorial: página de papel. "sub" = chamada pequena (até 5 palavras, ex.: "Essa decisão ajudou a"); "texto" = título serifado (até 6 palavras), marque a palavra forte com *asteriscos*. Uma palavra de até 3 letras em "texto" vira letra gigante (use para termos técnicos curtos, com "sub" explicando).
- numero: "valor" (só número dito na fala), "prefixo"/"sufixo" (R$, %, mil), "texto" = o que o número mede.
- lista: "texto" = título curto, "itens" = até 4 itens de até 3 palavras.
- citacao: "texto" = frase dita, "sub" = quem disse.
- palavras: "texto" = frase curta que entra palavra por palavra, *palavra* em destaque.

Regras: cerca de ${n} cenas, a primeira não antes de 1,5 s (o gancho fica com a pessoa), nunca duas seguidas sem pelo menos 3 s de fala entre elas, nenhuma depois de ${Math.max(0, total - 2).toFixed(1)} s. "inicio" = o momento exato em que a ideia é dita. "dur" entre 1,8 e 3,5 s. Prefira editorial (pelo menos metade). Textos tirados da fala, em português do Brasil, sem clichês de IA e sem números que não foram ditos.
Responda SOMENTE com JSON:
{"cenas":[{"inicio":4.2,"dur":2.6,"tipo":"editorial","sub":"...","texto":"...","itens":[],"valor":0,"prefixo":"","sufixo":"","foto":""}]}`,
    });
    const j = extractJson(text);
    const ids = new Set(lista.map((f) => f.id));
    const cenas = (Array.isArray(j?.cenas) ? j.cenas : []).slice(0, 24).map((c: any) => {
      const tipo = (TIPOS as readonly string[]).includes(c?.tipo) ? c.tipo : "editorial";
      const spec = normalizeSpec({ cenas: [{ ...c, tipo, dur: Math.max(1.5, Math.min(4, +c?.dur || 2.6)) }] });
      return { inicio: Math.max(0, Math.min(total, +c?.inicio || 0)), cena: spec.cenas[0], foto: c?.foto && ids.has(String(c.foto)) ? String(c.foto) : null };
    }).filter((c: any) => c.cena).sort((a: any, b: any) => a.inicio - b.inicio);
    if (!cenas.length) return NextResponse.json({ error: "O Claude não mandou cenas. Tente de novo." }, { status: 500 });
    return NextResponse.json({ cenas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro nas cenas" }, { status: 500 });
  }
}

export const POST = withAIQueue("/api/av/cenas", handle);
