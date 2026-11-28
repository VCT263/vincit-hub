/**
 * Design · Páginas e sites. O Claude escreve o código (cada tela é um HTML completo), o HUB guarda
 * as versões como dado e mostra a prévia isolada num iframe sem acesso ao HUB. Nada aqui chama IA.
 */

export type Tela = { slug: string; nome: string; html: string };
export type Versao = { n: number; nota?: string; em: string; por?: string; telas: Tela[] };
export type Comentario = { id: string; v: number; tela: string; x: number; y: number; modo: "phone" | "desk"; texto: string; nome: string; de: "cliente" | "equipe" | "claude"; em: string; resolvido?: boolean };
export type Pagina = {
  id: string; title: string; tipo: Tipo; account_id: string | null; brand_id: string | null; briefing: Briefing;
  status: Status; pedido: string | null; versions: Versao[]; comments: Comentario[]; approved: any; share_token: string;
  archived_at: string | null; created_at: string; updated_at: string;
};
export type Tipo = "landing" | "site" | "loja" | "pagina";
export type Status = "rascunho" | "pedido" | "revisao" | "aprovado" | "entregue";
export type Briefing = { objetivo?: string; publico?: string; oferta?: string; secoes?: string; referencias?: string; destino?: string; observacoes?: string; fotos?: string[] };

export const TIPOS: { k: Tipo; l: string; d: string }[] = [
  { k: "landing", l: "Landing page", d: "Uma página, uma oferta: campanha, lançamento, captação" },
  { k: "loja", l: "Loja / catálogo", d: "Início, coleção, produto e institucional de e-commerce" },
  { k: "site", l: "Site institucional", d: "Várias telas: início, serviços, sobre, contato" },
  { k: "pagina", l: "Página avulsa", d: "Sobre, guia de medidas, lookbook, link da bio" },
];

export const DESTINOS = [
  { k: "nuvemshop", l: "Nuvemshop (novo editor, tema Ipanema)" },
  { k: "nuvemshop-conteudo", l: "Nuvemshop (página de conteúdo)" },
  { k: "estatico", l: "Site estático (domínio do cliente, Netlify, GitHub Pages)" },
  { k: "outro", l: "Ainda não sei" },
];

export const STATUS: Record<Status, { l: string; tone: "fog" | "warn" | "mint" }> = {
  rascunho: { l: "Briefing", tone: "fog" },
  pedido: { l: "Com o Claude", tone: "warn" },
  revisao: { l: "Em revisão", tone: "warn" },
  aprovado: { l: "Aprovada", tone: "mint" },
  entregue: { l: "Entregue", tone: "mint" },
};

export const atual = (p: Pick<Pagina, "versions">): Versao | null => (p.versions?.length ? p.versions[p.versions.length - 1] : null);

export const slugify = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "tela";

/** pedido em texto para o Claude (copiar e colar no chat, com o conector VINCIT HUB ligado) */
export function pedidoParaClaude(p: Pick<Pagina, "id" | "title" | "status">, ajuste?: boolean) {
  return ajuste
    ? `Ajuste a página "${p.title}" do VINCIT HUB (id ${p.id}). Chame paginas_pendentes com esse id, leia os comentários abertos e o pedido, e grave a nova versão com salvar_pagina.`
    : `Crie a página "${p.title}" do VINCIT HUB (id ${p.id}). Chame paginas_pendentes com esse id, siga a skill Criar páginas que vem no resultado e grave as telas com salvar_pagina.`;
}

/** pedido para montar no editor da Nuvemshop (Claude com o conector da Nuvemshop) */
export function pedidoNuvemshop(p: Pick<Pagina, "id" | "title">) {
  return `Monte a página "${p.title}" (VINCIT HUB, id ${p.id}, versão aprovada) num rascunho do tema Ipanema da Nuvemshop. Use paginas_pendentes com esse id para ler as telas, reproduza com as seções e blocos do novo editor (banners, vitrines de produtos com os produtos reais da loja, texto, newsletter) e me mande o link de prévia do rascunho. Não publique: eu publico no Admin.`;
}

/**
 * Ponte injetada em cada tela da prévia: links "#tela-<slug>" trocam de tela, os pinos de comentário
 * ficam no documento (acompanham a rolagem) e, no modo comentário, o toque vira {x%, y px}.
 * Roda dentro do iframe sandbox (sem allow-same-origin): não enxerga o HUB.
 */
const PONTE = `<script>(function(){
var cm=false,pins=[];
function send(m){parent.postMessage(Object.assign({hubPagina:1},m),"*")}
function draw(){var o=document.getElementById("__hubpins");if(!o){o=document.createElement("div");o.id="__hubpins";o.setAttribute("style","position:absolute;left:0;top:0;width:100%;height:0;z-index:2147483646;pointer-events:none");document.body.appendChild(o)}
o.innerHTML="";pins.forEach(function(p,i){var d=document.createElement("div");d.textContent=p.l||String(i+1);d.title=p.t||"";
d.setAttribute("style","position:absolute;left:calc("+p.x+"% - 2px);top:"+(p.y-26)+"px;width:26px;height:26px;border-radius:50% 50% 50% 2px;background:"+(p.c||"#6eefb6")+";color:#06281a;font:700 12px/26px ui-monospace,monospace;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.45);pointer-events:auto;cursor:pointer");
d.onclick=function(e){e.stopPropagation();e.preventDefault();send({pin:p.id})};o.appendChild(d)})}
document.addEventListener("click",function(e){
 if(cm){e.preventDefault();e.stopPropagation();send({clique:{x:Math.round(e.pageX/document.documentElement.clientWidth*1000)/10,y:Math.round(e.pageY)}});return}
 var a=e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href")||"";
 if(h.indexOf("#tela-")===0){e.preventDefault();send({tela:h.slice(6)});return}
 if(/^(https?:|mailto:|tel:|\\/\\/)/i.test(h)){e.preventDefault();send({externo:h})}
},true);
document.addEventListener("submit",function(e){e.preventDefault()},true);
addEventListener("message",function(e){var d=e.data||{};if(d.pins){pins=d.pins;draw()}if("cm" in d){cm=!!d.cm;document.documentElement.style.cursor=cm?"crosshair":""}if(d.rolar!=null){scrollTo({top:Math.max(0,d.rolar-120),behavior:"smooth"})}});
if(document.readyState!=="loading")send({pronto:1});else document.addEventListener("DOMContentLoaded",function(){send({pronto:1})});
})();<\/script>`;

export function docDaPrevia(html: string) {
  const h = String(html || "");
  if (/<\/body>/i.test(h)) return h.replace(/<\/body>(?![\s\S]*<\/body>)/i, PONTE + "</body>");
  return h + PONTE;
}

/** HTML para baixar: todas as telas num .html só, com um menu simples entre elas */
export function htmlUnico(title: string, telas: Tela[]) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body>
<iframe id="f"></iframe><script>
var T=${JSON.stringify(telas.map((t) => ({ slug: t.slug, html: t.html }))).replace(/<\//g, "<\\/")};
function show(s){var t=T.find(function(x){return x.slug===s})||T[0];document.getElementById("f").srcdoc=t.html;location.hash=t.slug}
document.getElementById("f").addEventListener("load",function(){try{var d=this.contentDocument;d.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href^='#tela-']");if(a){e.preventDefault();show(a.getAttribute("href").slice(6))}},true)}catch(e){}});
show(location.hash.slice(1));
<\/script></body></html>`;
}

/**
 * Skill "Criar páginas" do HUB (vai no resultado de paginas_pendentes). Junta o frontend-design da
 * Anthropic, o ui-ux-pro-max (regras de e-commerce e moda) e o acabamento do unslop, com as regras do HUB.
 */
export const SKILL_PAGINAS = {
  processo: [
    "1. Leia briefing, perfil (nicho, público, voz), direcionamento_marca e as fotos. Se faltar algo essencial (oferta, público), pergunte antes de escrever código.",
    "2. Escreva a ficha da página em 6 linhas e mostre à pessoa: objetivo único, público, oferta e prova, seções em ordem, tom, destino. Só siga com o ok.",
    "3. Escolha uma direção visual tirada da marca (cores, letras, grafismo do manual) e do mundo do cliente. Uma ousadia só, o resto quieto.",
    "4. Escreva cada tela como um HTML completo, celular primeiro (390 px), que também funciona em 1280 px.",
    "5. Revise como cliente: texto sem vício de IA, contraste, toque de 44 px, nada estourando a largura. Depois grave com salvar_pagina.",
  ],
  tecnico: [
    "Cada tela é um documento HTML completo (<!doctype html>…</html>), com CSS no <style> e JS pequeno inline. Sem build, sem framework.",
    "Fontes só do Google Fonts (<link>), sempre com fonte reserva. Fotos: use as URLs de fotos (Storage do HUB) ou https públicas; nunca o CDN do Instagram (expira).",
    "Link entre telas: href=\"#tela-<slug>\" (o HUB troca de tela na prévia e no arquivo baixado). Âncoras internas comuns continuam funcionando.",
    "Formulários e botões de compra são de mentira na prévia; não envie dados para lugar nenhum.",
    "Até 8 telas por versão e até 300 KB por tela. Não cole imagens em base64 grandes.",
    "Loja na Nuvemshop: carrinho, checkout, frete e estoque são da Nuvemshop. O site do HUB mostra a experiência; preços e produtos de exemplo levam o selo 'Produtos de exemplo'.",
  ],
  design: [
    "Siga o manual da marca à risca: cores com nome, par tipográfico, grafismo, voz, frases e palavras proibidas.",
    "Evite o visual genérico de IA: degradê roxo-azul, tudo centralizado, cards iguais com sombra, emoji como ícone, creme + serifa + terracota sem motivo.",
    "Hierarquia clara: um título por dobra, 1 chamada principal por tela, texto em até 65 caracteres por linha.",
    "E-commerce de moda: foto grande da peça, grade de tamanhos visível, preço e parcelamento juntos, prova (cliente real, tecido, caimento), WhatsApp como atendimento.",
    "Texto: frases curtas, número com referência, nome real. Sem 'eleve', 'jornada', 'potencialize', 'Não é X, é Y'.",
  ],
  entrega: [
    "Nuvemshop (tema Ipanema): depois de aprovada, o Claude com o conector da Nuvemshop reproduz as seções num rascunho e manda o link; a pessoa publica no Admin.",
    "Nuvemshop página de conteúdo: só HTML simples (sem script, sem <style>, CSS no atributo style; iframes só YouTube, Maps, Forms).",
    "Site estático: o HUB baixa um .html com todas as telas.",
  ],
};
