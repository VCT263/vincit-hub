/**
 * Estilos de texto por nome (28/11), para pôr por cima do vídeo de quem fala.
 * Referência: o catálogo "20 estilos de texto animado que o Claude faz" do @fernanndods. A pessoa pede o estilo pelo nome,
 * troca o texto e exporta em WebM transparente, que cai em cima do vídeo no Editor, no Premiere ou no CapCut.
 * Ficaram de fora "texto atrás" e "número atrás" (precisam recortar a pessoa do fundo) e "máquina de escrever" (está no "nunca" do brief).
 * Atenção: o código das composições não usa "${" (os estilos ficam dentro de template strings).
 */
import type { ModeloHtml } from "./modelos-html";

const POS = { id: "posicao", type: "select", label: "Altura na tela", default: "meio", options: ["topo", "meio", "base"] };

const vars = (extra: object[]) => JSON.stringify(extra).replace(/'/g, "&#39;");

const doc = (o: { titulo: string; dur: number; variaveis: object[]; css: string; corpo: string; script: string; fundo?: boolean }) => `<!doctype html>
<html lang="pt-BR" data-composition-variables='${vars(o.variaveis)}'>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<title>${o.titulo}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400;1,500&family=Caveat:wght@600;700&family=Anton&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:transparent;font-family:Poppins,sans-serif;color:var(--tinta)}
.clip{position:absolute;inset:0}
#pos{position:absolute;left:0;right:0;top:860px;display:flex;justify-content:center}
.rv{overflow:hidden;display:inline-block}
.rv>div{display:inline-block}
.sh{text-shadow:0 4px 24px rgba(0,0,0,.35)}
${o.css}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${o.dur}" data-width="1080" data-height="1920">
<div class="clip" data-start="0" data-duration="${o.dur}">
${o.corpo}
</div>
</div>
<script>
var V=(window.__hyperframes&&window.__hyperframes.getVariables)?window.__hyperframes.getVariables():{};
function v(k,d){return V[k]!=null&&V[k]!==""?V[k]:d}
var R=document.documentElement.style;R.setProperty('--tinta',v('tinta','#FFFFFF'));R.setProperty('--cor',v('cor','#E8242B'));
var P={topo:420,meio:860,base:1220};var pe=document.getElementById('pos');if(pe)pe.style.top=(P[v('posicao','meio')]||860)+'px';
function txt(sel,k,d){var e=document.querySelector(sel);if(e)e.textContent=v(k,d);return e}
function partes(sel,k,d,por){var e=document.querySelector(sel);if(!e)return[];e.textContent='';var arr=por==='letra'?String(v(k,d)).split(''):String(v(k,d)).split(/\\s+/);return arr.map(function(p,i){var s=document.createElement('span');s.style.display='inline-block';s.textContent=por==='letra'?(p===' '?'\\u00a0':p):p;e.appendChild(s);if(por!=='letra'&&i<arr.length-1)e.appendChild(document.createTextNode(' '));return s})}
function caber(el,max,larg){var n=String(el.textContent).length||1;el.style.fontSize=Math.min(max,Math.floor(larg/(n*0.62)))+'px'}
function abre(w,t,d,e){tl.fromTo(w,{xPercent:-100},{xPercent:0,duration:d,ease:e||'power3.inOut'},t);tl.fromTo(w.firstElementChild,{xPercent:100},{xPercent:0,duration:d,ease:e||'power3.inOut'},t)}
var tl=gsap.timeline({paused:true});var D=${o.dur};
${o.script}
window.__timelines=window.__timelines||{};window.__timelines["main"]=tl;tl.seek(0);
</script>
</body>
</html>`;

/* 1 · Palavra gigante: entra passando do ponto, respira e sai crescendo */
const gigante = doc({
  titulo: "Palavra gigante", dur: 2.2,
  variaveis: [{ id: "texto", type: "string", label: "Palavra", default: "GIGANTE" }, POS, { id: "tinta", type: "color", label: "Cor do texto", default: "#FFFFFF" }],
  css: `#g{font-weight:800;font-size:220px;line-height:1;letter-spacing:-.02em;text-transform:uppercase;white-space:nowrap}`,
  corpo: `<div id="pos"><div id="g" class="sh"></div></div>`,
  script: `var g=txt('#g','texto','GIGANTE');caber(g,240,1000);
tl.fromTo(g,{scale:.55,opacity:0},{scale:1.07,opacity:1,duration:.2,ease:'power3.out'},0);
tl.to(g,{scale:1,duration:.16,ease:'power2.inOut'},.2);
tl.to(g,{scale:1.04,duration:D-.6,ease:'none'},.36);
tl.to(g,{scale:1.3,opacity:0,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 2 · Texto vazado: contorno que entra letra a letra e se enche de cor da esquerda para a direita */
const vazado = doc({
  titulo: "Texto vazado", dur: 2.5,
  variaveis: [{ id: "texto", type: "string", label: "Palavra", default: "VAZADO" }, POS, { id: "tinta", type: "color", label: "Contorno", default: "#FFFFFF" }, { id: "cor", type: "color", label: "Preenchimento", default: "#E8242B" }],
  css: `.w{position:relative;font-weight:800;font-size:200px;line-height:1;text-transform:uppercase;white-space:nowrap}
#o{color:transparent;-webkit-text-stroke:5px var(--tinta)}
#f{position:absolute;left:0;top:0}#f>div{color:var(--cor)}`,
  corpo: `<div id="pos"><div class="w"><div id="o"></div><div id="f" class="rv"><div></div></div></div></div>`,
  script: `var L=partes('#o','texto','VAZADO','letra');var o=document.getElementById('o');caber(o,210,980);document.querySelector('.w').style.fontSize=o.style.fontSize;
document.querySelector('#f>div').textContent=v('texto','VAZADO');document.querySelector('#f>div').style.fontSize=o.style.fontSize;
tl.fromTo(L,{yPercent:60,opacity:0},{yPercent:0,opacity:1,duration:.35,ease:'power3.out',stagger:.04},0);
abre(document.getElementById('f'),.75,.6);
tl.to('.w',{y:-30,opacity:0,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 3 · Texto de vidro: cartão translúcido com borda clara */
const vidro = doc({
  titulo: "Texto de vidro", dur: 2.5,
  variaveis: [{ id: "texto", type: "string", label: "Texto", default: "Texto de vidro" }, POS, { id: "tinta", type: "color", label: "Cor do texto", default: "#FFFFFF" }],
  css: `#c{padding:26px 44px;border-radius:30px;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.55);box-shadow:0 12px 40px rgba(0,0,0,.18);font-weight:600;font-size:66px;white-space:nowrap}`,
  corpo: `<div id="pos"><div id="c" class="sh"></div></div>`,
  script: `txt('#c','texto','Texto de vidro');
tl.fromTo('#c',{y:50,scale:.9,opacity:0},{y:0,scale:1,opacity:1,duration:.45,ease:'back.out(2)'},0);
tl.to('#c',{y:-6,duration:D-.7,ease:'sine.inOut'},.45);
tl.to('#c',{y:-40,opacity:0,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 4 · Texto em arco: texto que gira em círculo em volta de um ponto */
const arco = doc({
  titulo: "Texto em arco", dur: 3,
  variaveis: [{ id: "texto", type: "string", label: "Texto (repete em volta)", default: "TEXTO EM ARCO" }, POS, { id: "tinta", type: "color", label: "Cor do texto", default: "#FFFFFF" }, { id: "cor", type: "color", label: "Ponto do meio", default: "#E8242B" }],
  css: `#a{position:relative;width:560px;height:560px}#rg{position:absolute;inset:0}
#rg span{position:absolute;left:50%;top:50%;width:40px;margin-left:-20px;height:52px;margin-top:-26px;text-align:center;font-weight:700;font-size:44px;line-height:52px;color:var(--tinta)}
#pt{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:var(--cor)}`,
  corpo: `<div id="pos"><div id="a" class="sh"><div id="rg"></div><div id="pt"></div></div></div>`,
  script: `var t=String(v('texto','TEXTO EM ARCO')).toUpperCase()+' • ';var n=t.length*Math.max(1,Math.round(2*Math.PI*240/33/t.length));var rg=document.getElementById('rg');
for(var i=0;i<n;i++){var c=t.charAt(i%t.length);var e=document.createElement('span');e.textContent=c===' '?'\u00a0':c;e.style.transform='rotate('+(i*360/n)+'deg) translateY(-240px)';rg.appendChild(e)}
tl.fromTo('#rg',{scale:.6,opacity:0},{scale:1,opacity:1,duration:.45,ease:'back.out(1.8)'},0);
tl.fromTo('#pt',{scale:0},{scale:1,duration:.35,ease:'back.out(3)'},.12);
tl.fromTo('#rg',{rotation:-40},{rotation:80,duration:D,ease:'none'},0);
tl.to('#a',{scale:1.15,opacity:0,duration:.22,ease:'power3.in'},D-.24);`,
});

/* 5 · Manuscrita: letra de mão que se escreve da esquerda para a direita, com sublinhado */
const manuscrita = doc({
  titulo: "Manuscrita", dur: 2.6,
  variaveis: [{ id: "texto", type: "string", label: "Texto", default: "do seu jeito" }, POS, { id: "tinta", type: "color", label: "Cor do texto", default: "#FFFFFF" }, { id: "cor", type: "color", label: "Sublinhado", default: "#E8242B" }],
  css: `#m{position:relative;font-family:Caveat,cursive;font-weight:700;font-size:150px;line-height:1.05;white-space:nowrap}
#u{position:absolute;left:4%;right:4%;bottom:-6px;height:12px;border-radius:6px;background:var(--cor);transform-origin:0 50%;transform:rotate(-1.5deg) scaleX(0)}`,
  corpo: `<div id="pos"><div id="m" class="sh"><div class="rv"><div id="t"></div></div><div id="u"></div></div></div>`,
  script: `txt('#t','texto','do seu jeito');
abre(document.querySelector('#m .rv'),0,.9,'power2.inOut');
tl.fromTo('#u',{scaleX:0,rotation:-1.5},{scaleX:1,rotation:-1.5,duration:.4,ease:'power2.out'},.85);
tl.to('#m',{y:-30,opacity:0,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 6 · Seta com nota: seta desenhada à mão apontando para algo, com a nota na ponta */
const seta = doc({
  titulo: "Seta com nota", dur: 2.8,
  variaveis: [{ id: "texto", type: "string", label: "Nota", default: "olha isso" }, POS, { id: "lado", type: "select", label: "A seta aponta para", default: "esquerda", options: ["esquerda", "direita"] }, { id: "tinta", type: "color", label: "Cor", default: "#FFFFFF" }],
  css: `#s{position:relative;width:1080px;height:360px}#s svg{position:absolute;left:250px;top:40px;width:420px;height:300px;overflow:visible}
#n{position:absolute;right:70px;bottom:300px;max-width:560px;text-align:right;font-family:Caveat,cursive;font-weight:700;font-size:92px;line-height:.95}`,
  corpo: `<div id="pos"><div id="s"><svg viewBox="0 0 420 300"><path id="p" d="M400,30 C300,20 180,60 120,170 C100,205 90,235 70,270" fill="none" stroke="var(--tinta)" stroke-width="9" stroke-linecap="round"/><path id="h" d="M40,225 L70,272 L118,248" fill="none" stroke="var(--tinta)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg><div id="n" class="sh"></div></div></div>`,
  script: `txt('#n','texto','olha isso');var n=document.getElementById('n');if(String(n.textContent).length>16)n.style.fontSize='76px';if(v('lado','esquerda')==='direita'){var sv=document.querySelector('#s svg');sv.style.transform='scaleX(-1)';sv.style.left='410px';n.style.right='auto';n.style.left='70px';n.style.textAlign='left'}
var p=document.getElementById('p'),h=document.getElementById('h');[p,h].forEach(function(e){var l=e.getTotalLength();e.style.strokeDasharray=l;e.style.strokeDashoffset=l});
tl.fromTo('#n',{y:30,opacity:0,rotation:-6},{y:0,opacity:1,rotation:-3,duration:.35,ease:'back.out(2.2)'},0);
tl.to(p,{strokeDashoffset:0,duration:.5,ease:'power2.inOut'},.2);
tl.to(h,{strokeDashoffset:0,duration:.18,ease:'power2.out'},.68);
tl.to('#s',{opacity:0,y:-20,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 7 · Intertítulo: "Passo 1." em serifa itálica + frase em sans, sobe por máscara */
const intertitulo = doc({
  titulo: "Intertítulo (passo)", dur: 2.6,
  variaveis: [{ id: "numero", type: "string", label: "Número", default: "Passo 1." }, { id: "texto", type: "string", label: "Frase", default: "Monta o ambiente" }, POS, { id: "tinta", type: "color", label: "Cor do texto", default: "#FFFFFF" }],
  css: `#it{display:flex;gap:22px;align-items:baseline;white-space:nowrap}
.k{overflow:hidden;padding-bottom:12px}.k>div{display:inline-block}
#n{font-family:"Playfair Display",serif;font-style:italic;font-weight:500;font-size:80px}
#t{font-weight:700;font-size:76px}`,
  corpo: `<div id="pos"><div id="it" class="sh"><div class="k"><div id="n"></div></div><div class="k"><div id="t"></div></div></div></div>`,
  script: `txt('#n','numero','Passo 1.');txt('#t','texto','Monta o ambiente');
tl.fromTo(['#n','#t'],{yPercent:110},{yPercent:0,duration:.55,ease:'expo.out',stagger:.12},0);
tl.to('#it',{y:-8,duration:D-.8,ease:'none'},.6);
tl.to(['#n','#t'],{yPercent:-110,duration:.24,ease:'power3.in',stagger:.05},D-.3);`,
});

/* 8 · Manchetes: duas faixas inclinadas correndo em sentidos opostos */
const manchetes = doc({
  titulo: "Manchetes", dur: 3,
  variaveis: [{ id: "texto", type: "string", label: "Faixa de cima", default: "MANCHETE" }, { id: "apoio", type: "string", label: "Faixa de baixo", default: "VINCIT HUB" }, POS, { id: "tinta", type: "color", label: "Faixa clara", default: "#FFFFFF" }, { id: "cor", type: "color", label: "Faixa de cor", default: "#E8242B" }],
  css: `#mc{position:relative;width:1080px;height:300px;transform:rotate(-6deg)}
.b{position:absolute;left:-200px;width:1480px;height:120px;overflow:hidden;display:flex;align-items:center}
.b>div{white-space:nowrap;font-weight:800;font-size:84px;letter-spacing:.02em}
#b1{top:20px;background:var(--tinta)}#b1>div{color:#111}
#b2{top:150px;background:var(--cor)}#b2>div{color:#fff}`,
  corpo: `<div id="pos"><div id="mc"><div class="b" id="b1"><div id="t1"></div></div><div class="b" id="b2"><div id="t2"></div></div></div></div>`,
  script: `var a=String(v('texto','MANCHETE')).toUpperCase(),b=String(v('apoio','VINCIT HUB')).toUpperCase();document.getElementById('t1').textContent=(a+'  •  ').repeat(12);document.getElementById('t2').textContent=(b+'  •  ').repeat(12);
tl.fromTo('#b1',{xPercent:-110},{xPercent:0,duration:.4,ease:'power4.out'},0);
tl.fromTo('#b2',{xPercent:110},{xPercent:0,duration:.4,ease:'power4.out'},.08);
tl.fromTo('#t1',{x:0},{x:-700,duration:D,ease:'none'},0);
tl.fromTo('#t2',{x:-700},{x:0,duration:D,ease:'none'},0);
tl.to('#b1',{xPercent:110,duration:.25,ease:'power3.in'},D-.27);tl.to('#b2',{xPercent:-110,duration:.25,ease:'power3.in'},D-.27);`,
});

/* 9 · Título no topo: título fixo no alto, com um traço que desce até quem fala */
const topo = doc({
  titulo: "Título no topo", dur: 3,
  variaveis: [{ id: "texto", type: "string", label: "Título", default: "O título fica no topo" }, { id: "tinta", type: "color", label: "Cor", default: "#FFFFFF" }],
  css: `#tt{position:absolute;left:90px;right:90px;top:300px;text-align:center}
#tt .k{overflow:hidden;display:inline-block;padding-bottom:10px}#tt .k>div{display:inline-block;font-weight:700;font-size:74px;line-height:1.1}
#tt svg{display:block;margin:6px auto 0;width:120px;height:240px;overflow:visible}`,
  corpo: `<div id="tt" class="sh"><div class="k"><div id="t"></div></div><svg viewBox="0 0 120 240"><path id="ln" d="M60,6 C70,70 30,130 64,232" fill="none" stroke="var(--tinta)" stroke-width="5" stroke-linecap="round"/></svg></div>`,
  script: `txt('#t','texto','O título fica no topo');var ln=document.getElementById('ln');var l=ln.getTotalLength();ln.style.strokeDasharray=l;ln.style.strokeDashoffset=l;
tl.fromTo('#t',{yPercent:110},{yPercent:0,duration:.55,ease:'expo.out'},0);
tl.to(ln,{strokeDashoffset:0,duration:.5,ease:'power2.inOut'},.35);
tl.to('#tt',{opacity:0,y:-24,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 10 · Citação: aspas grandes na cor da marca e a frase em serifa itálica */
const citacao = doc({
  titulo: "Citação", dur: 3,
  variaveis: [{ id: "texto", type: "string", label: "Frase", default: "Crie do seu jeito." }, POS, { id: "tinta", type: "color", label: "Cor da frase", default: "#FFFFFF" }, { id: "cor", type: "color", label: "Aspas", default: "#E8242B" }],
  css: `#q{position:relative;max-width:900px;text-align:left}
#as{position:absolute;left:-14px;top:-230px;font-family:"Playfair Display",serif;font-weight:700;font-size:380px;line-height:1;color:var(--cor)}
#q .k{overflow:hidden;padding-bottom:14px}#q .k>div{font-family:"Playfair Display",serif;font-style:italic;font-weight:500;font-size:92px;line-height:1.08}`,
  corpo: `<div id="pos"><div id="q" class="sh"><div id="as">“</div><div class="k"><div id="t"></div></div></div></div>`,
  script: `txt('#t','texto','Crie do seu jeito.');
tl.fromTo('#as',{scale:.3,opacity:0,rotation:-20},{scale:1,opacity:1,rotation:0,duration:.4,ease:'back.out(2.4)'},0);
tl.fromTo('#t',{yPercent:110},{yPercent:0,duration:.6,ease:'expo.out'},.15);
tl.to('#q',{opacity:0,y:-24,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 11 · Carimbo: bate na tela inclinado e treme */
const carimbo = doc({
  titulo: "Carimbo", dur: 2.2,
  variaveis: [{ id: "texto", type: "string", label: "Palavra", default: "APROVADO" }, POS, { id: "cor", type: "color", label: "Cor do carimbo", default: "#FFFFFF" }],
  css: `#cb{padding:16px 40px;border:9px solid var(--cor);border-radius:18px;color:var(--cor);font-weight:800;font-size:118px;line-height:1;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;transform:rotate(-8deg)}`,
  corpo: `<div id="pos"><div id="cb" class="sh"></div></div>`,
  script: `txt('#cb','texto','APROVADO');
tl.fromTo('#cb',{scale:1.9,opacity:0,rotation:-14},{scale:1,opacity:1,rotation:-8,duration:.16,ease:'power4.in'},0);
tl.to('#cb',{x:10,duration:.04,ease:'none',yoyo:true,repeat:3},.16);
tl.to('#cb',{opacity:0,scale:1.08,duration:.18,ease:'power3.in'},D-.2);`,
});

/* 12 · Etiqueta de nome: caixa branca com o nome e uma pílula de cor com o cargo */
const etiqueta = doc({
  titulo: "Etiqueta de nome", dur: 3,
  variaveis: [{ id: "texto", type: "string", label: "Nome", default: "Alanis Gomes" }, { id: "apoio", type: "string", label: "Cargo ou assunto", default: "fundadora da ISYS" }, { id: "posicao", type: "select", label: "Altura na tela", default: "base", options: ["topo", "meio", "base"] }, { id: "cor", type: "color", label: "Pílula", default: "#E8242B" }],
  css: `#pos{justify-content:flex-start;padding-left:90px}
#et{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
#nm{background:#fff;color:#111;border-radius:16px;padding:14px 28px;font-weight:700;font-size:62px;white-space:nowrap}
#cg{background:var(--cor);color:#fff;border-radius:999px;padding:8px 24px;font-weight:500;font-size:36px;white-space:nowrap}`,
  corpo: `<div id="pos"><div id="et"><div id="nm"></div><div id="cg"></div></div></div>`,
  script: `txt('#nm','texto','Alanis Gomes');txt('#cg','apoio','fundadora da ISYS');
tl.fromTo(['#nm','#cg'],{x:-60,opacity:0},{x:0,opacity:1,duration:.4,ease:'power3.out',stagger:.1},0);
tl.to(['#nm','#cg'],{x:-60,opacity:0,duration:.2,ease:'power3.in',stagger:.05},D-.27);`,
});

/* 13 · Contador: o número conta até o valor, com rótulo e linha de progresso */
const contador = doc({
  titulo: "Contador", dur: 2.6,
  variaveis: [{ id: "numero", type: "string", label: "Número", default: "19" }, { id: "texto", type: "string", label: "Rótulo", default: "ESTILOS" }, POS, { id: "tinta", type: "color", label: "Cor do número", default: "#FFFFFF" }, { id: "cor", type: "color", label: "Linha", default: "#E8242B" }],
  css: `#ct{display:flex;flex-direction:column;align-items:center}
#nu{font-weight:800;font-size:300px;line-height:.95;font-variant-numeric:tabular-nums;white-space:nowrap}
#rt{font-weight:500;font-size:34px;letter-spacing:.4em;margin-top:6px}
#ln{width:420px;height:8px;background:rgba(255,255,255,.25);margin-top:22px;border-radius:4px;overflow:hidden}#ln>div{width:100%;height:100%;background:var(--cor);transform-origin:0 50%}`,
  corpo: `<div id="pos"><div id="ct" class="sh"><div id="nu"></div><div id="rt"></div><div id="ln"><div></div></div></div></div>`,
  script: `txt('#rt','texto','ESTILOS');var raw=String(v('numero','19'));var m=raw.match(/\\d[\\d.]*/);var nu=document.getElementById('nu');nu.textContent=raw;caber(nu,300,1000);
if(m&&raw.indexOf(',')<0){var alvo=parseInt(m[0].replace(/\\./g,''),10),pre=raw.slice(0,m.index),pos=raw.slice(m.index+m[0].length),o={n:0};
var mostra=function(){nu.textContent=pre+Math.round(o.n).toLocaleString('pt-BR')+pos};mostra();tl.to(o,{n:alvo,duration:1.1,ease:'power2.out',onUpdate:mostra},.1)}
tl.fromTo('#ct',{y:40,opacity:0},{y:0,opacity:1,duration:.3,ease:'power3.out'},0);
tl.fromTo('#ln>div',{scaleX:0},{scaleX:1,duration:1.1,ease:'power2.out'},.1);
tl.to('#ct',{y:-30,opacity:0,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 14 · Marcação: marca-texto que passa por trás da frase */
const marcacao = doc({
  titulo: "Marcação", dur: 2.5,
  variaveis: [{ id: "texto", type: "string", label: "Frase", default: "isso muda tudo" }, POS, { id: "tinta", type: "color", label: "Cor do texto", default: "#111111" }, { id: "cor", type: "color", label: "Marca-texto", default: "#FFE14D" }],
  css: `#mk{position:relative;padding:6px 22px;transform:rotate(-1.5deg)}
#bg{position:absolute;inset:0;background:var(--cor);border-radius:6px;transform-origin:0 50%}
#t{position:relative;font-weight:700;font-size:92px;white-space:nowrap}`,
  corpo: `<div id="pos"><div id="mk"><div id="bg"></div><div id="t"></div></div></div>`,
  script: `txt('#t','texto','isso muda tudo');
tl.fromTo('#bg',{scaleX:0},{scaleX:1,duration:.4,ease:'power3.inOut'},0);
tl.fromTo('#t',{opacity:0,y:12},{opacity:1,y:0,duration:.25,ease:'power3.out'},.18);
tl.to('#mk',{opacity:0,y:-20,duration:.2,ease:'power3.in'},D-.22);`,
});

/* 15 · Legenda amarela: até 3 palavras, uma de cada vez, com pulo */
const legenda = doc({
  titulo: "Legenda amarela", dur: 2,
  variaveis: [{ id: "texto", type: "string", label: "Palavras (até 3)", default: "ISSO É LEGENDA" }, POS, { id: "tinta", type: "color", label: "Cor", default: "#FFD400" }],
  css: `#lg{font-weight:800;font-size:104px;line-height:1;text-transform:uppercase;white-space:nowrap;text-shadow:0 5px 0 rgba(0,0,0,.55),0 0 30px rgba(0,0,0,.35)}`,
  corpo: `<div id="pos"><div id="lg"></div></div>`,
  script: `var W=partes('#lg','texto','ISSO É LEGENDA','palavra');caber(document.getElementById('lg'),110,980);
tl.fromTo(W,{scale:.7,opacity:0},{scale:1,opacity:1,duration:.22,ease:'back.out(3)',stagger:.16},0);
tl.to('#lg',{opacity:0,duration:.12,ease:'none'},D-.14);`,
});

/* 16 · Tela dividida: papel quadriculado em cima com passo e objeto, rosto embaixo (a metade de baixo fica transparente) */
const dividida = doc({
  titulo: "Tela dividida", dur: 3,
  variaveis: [{ id: "numero", type: "string", label: "Número", default: "Passo 1." }, { id: "texto", type: "string", label: "Frase", default: "Monta o ambiente" }, { id: "objeto", type: "string", label: "Objeto (emoji ou palavra)", default: "📁" }, { id: "legenda", type: "string", label: "Nome do objeto", default: "Editor de vídeo" }, { id: "fundo", type: "color", label: "Papel", default: "#F4F1EA" }, { id: "tinta", type: "color", label: "Texto", default: "#1A1A1A" }],
  css: `#pp{position:absolute;left:0;top:0;width:1080px;height:960px;background-color:var(--fundo);background-image:linear-gradient(rgba(0,0,0,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.06) 1px,transparent 1px);background-size:36px 36px}
#hd{position:absolute;left:0;right:0;top:260px;display:flex;justify-content:center;gap:18px;align-items:baseline;white-space:nowrap}
#hd .k{overflow:hidden;padding-bottom:10px}#hd .k>div{display:inline-block}
#n{font-family:"Playfair Display",serif;font-style:italic;font-weight:500;font-size:64px}#t{font-weight:700;font-size:62px}
#ob{position:absolute;left:0;right:0;top:420px;display:flex;flex-direction:column;align-items:center;gap:16px}
#ic{width:240px;height:240px;border-radius:52px;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;font-size:140px;font-weight:800}
#lb{font-weight:600;font-size:34px}`,
  corpo: `<div id="pp"><div id="hd"><div class="k"><div id="n"></div></div><div class="k"><div id="t"></div></div></div><div id="ob"><div id="ic"></div><div id="lb"></div></div></div>`,
  script: `document.getElementById('pp').style.setProperty('--fundo',v('fundo','#F4F1EA'));txt('#n','numero','Passo 1.');txt('#t','texto','Monta o ambiente');txt('#lb','legenda','Editor de vídeo');
var ic=txt('#ic','objeto','📁');if(String(ic.textContent).length>3){ic.style.fontSize='54px';ic.style.width='auto';ic.style.padding='0 48px'}
tl.fromTo(['#n','#t'],{yPercent:110},{yPercent:0,duration:.5,ease:'expo.out',stagger:.1},0);
tl.fromTo('#ic',{scale:0,rotation:-10},{scale:1,rotation:0,duration:.45,ease:'back.out(2.2)'},.25);
tl.fromTo('#lb',{opacity:0,y:12},{opacity:1,y:0,duration:.25,ease:'power3.out'},.5);
tl.to('#ic',{y:-10,duration:D-1,ease:'sine.inOut'},.7);`,
});


/* 17 · Título empilhado: palavras pequenas à mão em volta de uma palavra enorme e condensada (referência: Revisor, @midtrack.co) */
const empilhado = doc({
  titulo: "Título empilhado", dur: 2.6,
  variaveis: [{ id: "antes", type: "string", label: "Antes (à mão)", default: "o seu" }, { id: "texto", type: "string", label: "Palavra grande", default: "CLAUDE" }, { id: "depois", type: "string", label: "Depois (à mão)", default: "em um editor" }, POS, { id: "cor", type: "color", label: "Palavra grande", default: "#F2C230" }, { id: "tinta", type: "color", label: "Palavras à mão", default: "#FFFFFF" }],
  css: `#ep{position:relative;display:flex;flex-direction:column;align-items:center}
#big{font-family:Anton,Impact,sans-serif;font-size:250px;line-height:.9;color:var(--cor);text-transform:uppercase;white-space:nowrap;text-shadow:0 8px 30px rgba(0,0,0,.35)}
.hw{position:relative;z-index:2;font-family:Caveat,cursive;font-weight:700;font-size:78px;line-height:1;white-space:nowrap}
#a1{margin-bottom:-40px;margin-left:200px;transform:rotate(-4deg)}#a2{margin-top:-34px;margin-left:-160px;transform:rotate(-3deg)}`,
  corpo: `<div id="pos"><div id="ep"><div id="a1" class="hw sh"></div><div id="big"></div><div id="a2" class="hw sh"></div></div></div>`,
  script: `txt('#a1','antes','o seu');txt('#a2','depois','em um editor');var L=partes('#big','texto','CLAUDE','letra');caber(document.getElementById('big'),260,1150);
tl.fromTo(L,{yPercent:40,scale:1.25,opacity:0},{yPercent:0,scale:1,opacity:1,duration:.4,ease:'expo.out',stagger:.035},0);
tl.fromTo('#a1',{opacity:0,x:-30},{opacity:1,x:0,duration:.3,ease:'power3.out'},.2);
tl.fromTo('#a2',{opacity:0,x:30},{opacity:1,x:0,duration:.3,ease:'power3.out'},.42);
tl.to('#ep',{scale:1.04,duration:D-.7,ease:'none'},.4);
tl.to('#ep',{opacity:0,y:-30,duration:.2,ease:'power3.in'},D-.22);`,
});

const E = (id: string, nome: string, desc: string, duracao: number, html: string): ModeloHtml => ({ id: `texto-${id}`, nome, desc, marca: "Texto", duracao, html });

/** Estilos de texto por nome, em fundo transparente, para pôr por cima de quem fala. */
export const ESTILOS_TEXTO: ModeloHtml[] = [
  E("gigante", "Palavra gigante", "Uma palavra enorme que entra passando do ponto. Para o gancho.", 2.2, gigante),
  E("vazado", "Texto vazado", "Contorno que entra letra a letra e se enche de cor.", 2.5, vazado),
  E("vidro", "Texto de vidro", "Cartão translúcido com borda clara.", 2.5, vidro),
  E("arco", "Texto em arco", "Texto girando em círculo em volta de um ponto.", 3, arco),
  E("manuscrita", "Manuscrita", "Letra de mão que se escreve, com sublinhado.", 2.6, manuscrita),
  E("seta", "Seta com nota", "Seta desenhada apontando para algo, com a nota na ponta.", 2.8, seta),
  E("intertitulo", "Intertítulo (passo)", "\"Passo 1.\" em serifa itálica e a frase em sans.", 2.6, intertitulo),
  E("manchetes", "Manchetes", "Duas faixas inclinadas correndo em sentidos opostos.", 3, manchetes),
  E("topo", "Título no topo", "Título fixo no alto com um traço que desce até quem fala.", 3, topo),
  E("citacao", "Citação", "Aspas grandes e a frase em serifa itálica.", 3, citacao),
  E("carimbo", "Carimbo", "Bate inclinado na tela e treme. Para um veredito.", 2.2, carimbo),
  E("etiqueta", "Etiqueta de nome", "Nome em caixa branca e cargo numa pílula de cor.", 3, etiqueta),
  E("contador", "Contador", "O número conta até o valor, com rótulo e linha.", 2.6, contador),
  E("marcacao", "Marcação", "Marca-texto que passa por trás da frase.", 2.5, marcacao),
  E("legenda", "Legenda amarela", "Até 3 palavras, uma de cada vez, com pulo.", 2, legenda),
  E("empilhado", "Título empilhado", "Palavra enorme e condensada com palavras pequenas à mão em volta.", 2.6, empilhado),
  E("dividida", "Tela dividida", "Papel quadriculado em cima com passo e objeto; a metade de baixo fica livre para o rosto.", 3, dividida),
];

/** Nomes para o brief (o Claude escolhe um por cena quando o texto vai por cima do vídeo). */
export const NOMES_ESTILOS = ESTILOS_TEXTO.map((e) => e.nome);
