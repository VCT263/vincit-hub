/**
 * Modelos de marca em HTML (HyperFrames) — 27/11. Cada modelo é uma composição pronta com variáveis
 * (textos e cores), como um MOGRT: a tela troca o texto e a cor sem mexer na animação.
 * Os cinco primeiros nascem da identidade da ISYS (pesponto pontilhado, losango, monograma "is",
 * Playfair com itálico vermelho, grade de tamanhos 38 a 46). Novas peças sob medida vêm do pedido ao Claude.
 * Atenção: o código das composições não usa "${" (os modelos ficam dentro de template strings).
 */

export type ModeloHtml = { id: string; nome: string; desc: string; marca: string; duracao: number; html: string };

const ISYS = { fundo: "#FFEDD9", tinta: "#4F000B", cor: "#CC261B" };

const vars = (extra: object[]) => JSON.stringify([
  ...extra,
  { id: "fundo", type: "color", label: "Fundo", default: ISYS.fundo },
  { id: "tinta", type: "color", label: "Texto", default: ISYS.tinta },
  { id: "cor", type: "color", label: "Destaque", default: ISYS.cor },
]).replace(/'/g, "&#39;");

const head = (titulo: string, css: string) => `<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<title>${titulo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--fundo:${ISYS.fundo};--tinta:${ISYS.tinta};--cor:${ISYS.cor}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--fundo)}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--fundo);font-family:"Playfair Display",Georgia,serif;color:var(--tinta)}
.clip{position:absolute;inset:0}
.grain{position:absolute;inset:-50%;opacity:.07;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence baseFrequency='.9' numOctaves='2' seed='4'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.dot{position:absolute;width:12px;height:12px;border-radius:50%;background:var(--cor);transform:translate(-50%,-50%) scale(0)}
.diam{position:absolute;width:44px;height:44px;background:var(--cor);transform:translate(-50%,-50%) rotate(45deg) scale(0)}
.mask{overflow:hidden;padding:0 24px 22px 6px;margin-left:-6px}
.mask>div{transform:translateY(130%)}
.kick{font-family:Poppins,sans-serif;font-weight:500;font-size:30px;letter-spacing:.42em;color:var(--cor)}
.kick span{display:inline-block;opacity:0}
${css}
</style>
</head>`;

/** script comum: lê variáveis, aplica cores, costura de pontos e helpers */
const comum = `
var V=(window.__hyperframes&&window.__hyperframes.getVariables)?window.__hyperframes.getVariables():{};
function v(k,d){return V[k]!=null&&V[k]!==""?V[k]:d}
var R=document.documentElement.style;R.setProperty('--fundo',v('fundo','${ISYS.fundo}'));R.setProperty('--tinta',v('tinta','${ISYS.tinta}'));R.setProperty('--cor',v('cor','${ISYS.cor}'));
function txt(sel,k,d){var e=document.querySelector(sel);if(e)e.textContent=v(k,d);return e}
function letras(sel,k,d){var e=document.querySelector(sel);if(!e)return[];e.textContent='';return String(v(k,d)).split('').map(function(ch){var s=document.createElement('span');s.textContent=ch===' '?'\\u00a0':ch;e.appendChild(s);return s})}
function costura(box,W,H,step){var dots=[],per=2*(W+H),n=Math.floor(per/step);for(var i=0;i<n;i++){var d=i*step,x,y;if(d<W){x=d;y=0}else if(d<W+H){x=W;y=d-W}else if(d<2*W+H){x=W-(d-W-H);y=H}else{x=0;y=H-(d-2*W-H)}var e=document.createElement('div');e.className='dot';e.style.left=x+'px';e.style.top=y+'px';box.appendChild(e);dots.push(e)}return dots}
function losango(box,x,y){var e=document.createElement('div');e.className='diam';e.style.left=x+'px';e.style.top=y+'px';box.appendChild(e);return e}
var tl=gsap.timeline({paused:true});
`;
const fim = `window.__timelines=window.__timelines||{};window.__timelines["main"]=tl;tl.seek(0);`;

const doc = (o: { titulo: string; dur: number; variaveis: object[]; css: string; corpo: string; script: string }) => `<!doctype html>
<html lang="pt-BR" data-composition-variables='${vars(o.variaveis)}'>
${head(o.titulo, o.css)}
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${o.dur}" data-width="1080" data-height="1920">
${o.corpo}
</div>
<script>${comum}${o.script}${fim}</script>
</body>
</html>`;

/* 1 · Abertura: a costura corre a moldura, o título sobe por máscara, a grade de tamanhos marca um, a cortina fecha na marca */
const abertura = doc({
  titulo: "Abertura com costura", dur: 5,
  variaveis: [
    { id: "chamada", type: "string", label: "Chamada", default: "COLEÇÃO DE NATAL" },
    { id: "l1", type: "string", label: "Linha 1", default: "Um Natal" },
    { id: "l2", type: "string", label: "Linha 2", default: "do seu" },
    { id: "destaque", type: "string", label: "Palavra em destaque", default: "tamanho." },
    { id: "apoio", type: "string", label: "Frase de apoio", default: "A gente separa o seu." },
    { id: "tamanho", type: "string", label: "Tamanho marcado", default: "42" },
    { id: "marca", type: "string", label: "Marca", default: "ISYS" },
    { id: "perfil", type: "string", label: "Perfil", default: "@ISYSOFICIAL_" },
  ],
  css: `#stage{transform-origin:50% 55%}
#frame{position:absolute;left:70px;top:70px;width:940px;height:1780px}
#mono{position:absolute;right:-120px;bottom:-160px;font-size:1150px;line-height:1;font-style:italic;color:var(--cor);opacity:0;letter-spacing:-.06em}
#kick{position:absolute;left:150px;top:560px}
.ln{position:absolute;left:146px;font-size:150px;line-height:1.02;letter-spacing:-.02em}
#L1{top:640px}#L2{top:800px}#L3{top:960px}#L3 div{font-style:italic;color:var(--cor)}
#sizes{position:absolute;left:150px;top:1300px;display:flex;gap:26px}
.sz{width:128px;height:128px;border-radius:50%;border:3px solid var(--tinta);display:flex;align-items:center;justify-content:center;font-family:Poppins,sans-serif;font-size:40px;opacity:0;position:relative;overflow:hidden}
.sz i{position:absolute;inset:0;background:var(--cor);border-radius:50%;transform:scale(0)}.sz b{position:relative;font-weight:400}
#apoio{position:absolute;left:150px;top:1490px;font-family:Poppins,sans-serif;font-size:40px;opacity:0}
#wipe{background:var(--cor)}
#fim{display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--fundo);opacity:0}
#fim .w{font-size:230px;letter-spacing:.06em;font-weight:500}#fim .w span{display:inline-block}
#fim .s{font-family:Poppins,sans-serif;font-size:30px;letter-spacing:.5em;margin-top:10px}`,
  corpo: `<div id="stage" class="clip" data-start="0" data-duration="5">
  <div id="mono">is</div><div id="frame"></div>
  <div id="kick" class="kick"></div>
  <div class="ln mask" id="L1"><div></div></div><div class="ln mask" id="L2"><div></div></div><div class="ln mask" id="L3"><div></div></div>
  <div id="sizes"></div><div id="apoio"></div><div class="grain"></div>
</div>
<div id="wipe" class="clip" data-start="0" data-duration="5"></div>
<div id="fim" class="clip" data-start="0" data-duration="5"><div class="w"></div><div class="s"></div></div>`,
  script: `
txt('#L1 div','l1','Um Natal');txt('#L2 div','l2','do seu');txt('#L3 div','destaque','tamanho.');txt('#apoio','apoio','A gente separa o seu.');txt('#fim .s','perfil','@ISYSOFICIAL_');
var kick=letras('#kick','chamada','COLEÇÃO DE NATAL');var wl=letras('#fim .w','marca','ISYS');
var F=document.getElementById('frame');var dots=costura(F,940,1780,34);var dA=losango(F,70,70),dB=losango(F,870,1710);
var S=document.getElementById('sizes');var marc=String(v('tamanho','42'));var sel=null;
['38','40','42','44','46'].forEach(function(t){var e=document.createElement('div');e.className='sz';e.innerHTML='<i></i><b>'+t+'</b>';S.appendChild(e);if(t===marc)sel=e});
var sz=[].slice.call(S.children);sel=sel||sz[2];
tl.to(dots,{scale:1,duration:.25,ease:"back.out(3)",stagger:{each:1/dots.length}},0.05);
tl.to(dA,{scale:1,rotation:225,duration:.7,ease:"expo.out"},0.15);tl.to(dB,{scale:1,rotation:225,duration:.7,ease:"expo.out"},0.95);
tl.fromTo("#mono",{opacity:0,y:220},{opacity:.09,y:0,duration:1.6,ease:"power3.out"},0.2);
tl.to(kick,{opacity:1,duration:.3,stagger:.025,ease:"none"},0.45);
tl.to(["#L1 div","#L2 div","#L3 div"],{y:"0%",duration:.9,ease:"expo.out",stagger:.13},0.7);
tl.fromTo("#L3 div",{x:-18},{x:0,duration:1.2,ease:"power2.out"},0.96);
tl.fromTo(sz,{opacity:0,y:40},{opacity:1,y:0,duration:.55,ease:"power3.out",stagger:.07},1.75);
tl.to(sel.querySelector('i'),{scale:1,duration:.45,ease:"expo.out"},2.55);
tl.to(sel,{color:v('fundo','${ISYS.fundo}'),borderColor:v('cor','${ISYS.cor}'),duration:.2},2.6);
tl.fromTo(sel,{scale:1},{scale:1.12,duration:.18,ease:"power2.out",yoyo:true,repeat:1},2.55);
tl.fromTo("#apoio",{opacity:0,y:20},{opacity:1,y:0,duration:.5,ease:"power2.out"},2.75);
tl.fromTo("#stage",{scale:1},{scale:1.045,duration:4,ease:"none"},0);
tl.fromTo("#wipe",{yPercent:100},{yPercent:0,duration:.5,ease:"expo.inOut"},3.85);
tl.to("#stage",{y:-260,duration:.5,ease:"expo.inOut"},3.85);
tl.fromTo("#fim",{opacity:0},{opacity:1,duration:.01},4.2);
tl.fromTo(wl,{y:70,x:function(i){return (i-(wl.length-1)/2)*70},opacity:0},{y:0,x:0,opacity:1,duration:.75,ease:"expo.out",stagger:.04},4.2);
tl.fromTo("#fim .s",{opacity:0},{opacity:1,duration:.4},4.45);
`,
});

/* 2 · CTA: fundo vermelho, frase em serifa sobe linha a linha, botão entra e é "apertado", monograma sobe */
const cta = doc({
  titulo: "Chamada final", dur: 4,
  variaveis: [
    { id: "l1", type: "string", label: "Linha 1", default: "Chama no" },
    { id: "l2", type: "string", label: "Linha 2", default: "WhatsApp que" },
    { id: "l3", type: "string", label: "Linha 3", default: "a gente separa" },
    { id: "destaque", type: "string", label: "Linha final (em destaque)", default: "o seu tamanho." },
    { id: "botao", type: "string", label: "Botão", default: "Chama no WhatsApp →" },
    { id: "perfil", type: "string", label: "Perfil", default: "@isysoficial_" },
  ],
  css: `#bg{background:var(--cor);transform-origin:50% 50%}
#mono{position:absolute;right:-90px;bottom:-220px;font-size:1250px;line-height:1;font-style:italic;color:var(--fundo);opacity:0;letter-spacing:-.06em}
#txt{position:absolute;left:110px;top:520px;color:var(--fundo)}
#txt .mask{font-size:116px;line-height:1.06;letter-spacing:-.02em;white-space:nowrap}
#txt .em div{font-style:italic}
#btn{position:absolute;left:110px;top:1300px;background:var(--fundo);color:var(--cor);font-family:Poppins,sans-serif;font-weight:600;font-size:40px;padding:30px 52px;border-radius:999px;opacity:0}
#perf{position:absolute;left:110px;top:1450px;font-family:Poppins,sans-serif;font-size:30px;letter-spacing:.3em;color:var(--fundo);opacity:0}
.dotrow{position:absolute;left:110px;right:110px;top:1220px;height:12px}`,
  corpo: `<div id="bg" class="clip" data-start="0" data-duration="4">
  <div id="mono">is</div>
  <div id="txt"><div class="mask"><div id="a"></div></div><div class="mask"><div id="b"></div></div><div class="mask"><div id="c"></div></div><div class="mask em"><div id="d"></div></div></div>
  <div class="dotrow" id="row"></div>
  <div id="btn"></div><div id="perf"></div><div class="grain"></div>
</div>`,
  script: `
txt('#a','l1','Chama no');txt('#b','l2','WhatsApp que');txt('#c','l3','a gente separa');txt('#d','destaque','o seu tamanho.');txt('#btn','botao','Chama no WhatsApp →');txt('#perf','perfil','@isysoficial_');
var row=document.getElementById('row');var pts=[];for(var i=0;i<24;i++){var p=document.createElement('div');p.className='dot';p.style.background='var(--fundo)';p.style.left=(i*36.5)+'px';p.style.top='6px';row.appendChild(p);pts.push(p)}
tl.fromTo("#bg",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:.55,ease:"expo.out"},0);
tl.fromTo("#mono",{opacity:0,y:260},{opacity:.14,y:0,duration:1.8,ease:"power3.out"},0.1);
tl.to(["#a","#b","#c","#d"],{y:"0%",duration:.85,ease:"expo.out",stagger:.1},0.25);
tl.to(pts,{scale:1,duration:.22,ease:"back.out(3)",stagger:.018},1.0);
tl.fromTo("#btn",{opacity:0,y:50,scale:.9},{opacity:1,y:0,scale:1,duration:.6,ease:"expo.out"},1.35);
tl.to("#btn",{scale:.93,duration:.12,ease:"power2.in"},2.35);tl.to("#btn",{scale:1,duration:.35,ease:"back.out(3)"},2.47);
tl.fromTo("#perf",{opacity:0},{opacity:.85,duration:.5},1.9);
tl.fromTo("#bg",{scale:1},{scale:1.04,duration:4,ease:"none"},0);
`,
});

/* 3 · Página editorial: papel com costura, chamada, título serifado com palavra em itálico e linha que se desenha (entra entre falas) */
const editorial = doc({
  titulo: "Página editorial", dur: 3.5,
  variaveis: [
    { id: "chamada", type: "string", label: "Chamada", default: "PEÇA CERTA" },
    { id: "l1", type: "string", label: "Linha 1", default: "Algodão com" },
    { id: "destaque", type: "string", label: "Palavra em destaque", default: "elastano" },
    { id: "l3", type: "string", label: "Linha 3", default: "que não laceia." },
  ],
  css: `#pg{transform-origin:50% 40%}
#frame{position:absolute;left:70px;top:70px;width:940px;height:1780px}
#kick{position:absolute;left:150px;top:640px}
#rule{position:absolute;left:150px;right:150px;top:710px;height:2px;background:var(--tinta);transform-origin:0 50%;transform:scaleX(0)}
.ln{position:absolute;left:144px;font-size:120px;line-height:1.02;letter-spacing:-.02em;white-space:nowrap}
#A{top:760px}#B{top:895px}#B div{font-style:italic;color:var(--cor)}#C{top:1030px}`,
  corpo: `<div id="pg" class="clip" data-start="0" data-duration="3.5">
  <div id="frame"></div><div id="kick" class="kick"></div><div id="rule"></div>
  <div class="ln mask" id="A"><div></div></div><div class="ln mask" id="B"><div></div></div><div class="ln mask" id="C"><div></div></div><div class="grain"></div>
</div>`,
  script: `
txt('#A div','l1','Algodão com');txt('#B div','destaque','elastano');txt('#C div','l3','que não laceia.');var kick=letras('#kick','chamada','PEÇA CERTA');
var F=document.getElementById('frame');var dots=costura(F,940,1780,34);var dA=losango(F,70,70);
tl.fromTo("#pg",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:.45,ease:"expo.out"},0);
tl.to(dots,{scale:1,duration:.2,ease:"back.out(3)",stagger:{each:.7/dots.length}},0.05);
tl.to(dA,{scale:1,rotation:225,duration:.6,ease:"expo.out"},0.1);
tl.to(kick,{opacity:1,duration:.25,stagger:.02,ease:"none"},0.25);
tl.to("#rule",{scaleX:1,duration:.7,ease:"expo.out"},0.3);
tl.to(["#A div","#B div","#C div"],{y:"0%",duration:.8,ease:"expo.out",stagger:.14},0.45);
tl.fromTo("#B div",{x:-16},{x:0,duration:1.1,ease:"power2.out"},0.6);
tl.fromTo("#pg",{scale:1},{scale:1.035,duration:3.5,ease:"none"},0);
`,
});

/* 4 · Lista: título e itens que entram cada um na hora da fala (t1, t2, t3), com losango que gira e assenta */
const lista = doc({
  titulo: "Lista na fala", dur: 5,
  variaveis: [
    { id: "titulo", type: "string", label: "Título", default: "3 jeitos de usar" },
    { id: "i1", type: "string", label: "Item 1", default: "Com tênis" },
    { id: "i2", type: "string", label: "Item 2", default: "Com bota" },
    { id: "i3", type: "string", label: "Item 3", default: "Com sandália" },
    { id: "t1", type: "string", label: "Item 1 entra em (s)", default: "1.0" },
    { id: "t2", type: "string", label: "Item 2 entra em (s)", default: "2.0" },
    { id: "t3", type: "string", label: "Item 3 entra em (s)", default: "3.0" },
  ],
  css: `#ls{transform-origin:50% 50%}
#tt{position:absolute;left:144px;top:560px;font-size:120px;letter-spacing:-.02em}
#tt div{font-style:italic;color:var(--cor)}
#rule{position:absolute;left:150px;right:150px;top:740px;height:2px;background:var(--tinta);transform-origin:0 50%;transform:scaleX(0)}
.it{position:absolute;left:150px;display:flex;align-items:center;gap:44px;font-size:104px;opacity:0}
.it .diam{position:relative;transform:rotate(45deg) scale(0);left:auto;top:auto;flex:none;width:34px;height:34px}
#I1{top:820px}#I2{top:1000px}#I3{top:1180px}`,
  corpo: `<div id="ls" class="clip" data-start="0" data-duration="5">
  <div class="mask" id="tt"><div></div></div><div id="rule"></div>
  <div class="it" id="I1"><i class="diam"></i><span></span></div><div class="it" id="I2"><i class="diam"></i><span></span></div><div class="it" id="I3"><i class="diam"></i><span></span></div>
  <div class="grain"></div>
</div>`,
  script: `
txt('#tt div','titulo','3 jeitos de usar');txt('#I1 span','i1','Com tênis');txt('#I2 span','i2','Com bota');txt('#I3 span','i3','Com sandália');
var T=[+v('t1','1.0')||1,+v('t2','2.0')||2,+v('t3','3.0')||3];
tl.to("#tt div",{y:"0%",duration:.8,ease:"expo.out"},0.05);
tl.to("#rule",{scaleX:1,duration:.7,ease:"expo.out"},0.2);
['#I1','#I2','#I3'].forEach(function(s,i){
  tl.fromTo(s,{opacity:0,x:-60},{opacity:1,x:0,duration:.6,ease:"expo.out"},T[i]);
  tl.fromTo(s+' .diam',{scale:0,rotation:-90},{scale:1,rotation:45,duration:.55,ease:"back.out(2.5)"},T[i]);
  if(i>0) tl.to(['#I1','#I2','#I3'].slice(0,i),{opacity:.38,duration:.3},T[i]);
});
tl.fromTo("#ls",{scale:1},{scale:1.04,duration:5,ease:"none"},0);
`,
});

/* 5 · Tamanhos: a frase da grade e um marcador que passa do 38 ao 46 e para no tamanho da peça */
const tamanhos = doc({
  titulo: "Grade de tamanhos", dur: 4,
  variaveis: [
    { id: "chamada", type: "string", label: "Chamada", default: "PEÇA CERTA" },
    { id: "l1", type: "string", label: "Linha 1", default: "Do 38 ao 46," },
    { id: "l2", type: "string", label: "Linha 2", default: "do jeito que" },
    { id: "destaque", type: "string", label: "Palavra em destaque", default: "você é." },
    { id: "tamanho", type: "string", label: "Tamanho que fica marcado", default: "42" },
  ],
  css: `#gd{transform-origin:50% 50%}
#kick{position:absolute;left:150px;top:520px}
.ln{position:absolute;left:144px;font-size:132px;line-height:1.02;letter-spacing:-.02em}
#A{top:590px}#B{top:735px}#C{top:880px}#C div{font-style:italic;color:var(--cor)}
#row{position:absolute;left:150px;top:1180px;display:flex;gap:24px}
.sz{position:relative;width:140px;height:140px;border-radius:50%;border:3px solid var(--tinta);display:flex;align-items:center;justify-content:center;font-family:Poppins,sans-serif;font-size:44px;opacity:0;z-index:1}
#pin{position:absolute;left:150px;top:1180px;width:140px;height:140px;border-radius:50%;background:var(--cor);opacity:0;z-index:0}
#dots{position:absolute;left:150px;right:150px;top:1400px;height:12px}`,
  corpo: `<div id="gd" class="clip" data-start="0" data-duration="4">
  <div id="kick" class="kick"></div>
  <div class="ln mask" id="A"><div></div></div><div class="ln mask" id="B"><div></div></div><div class="ln mask" id="C"><div></div></div>
  <div id="pin"></div><div id="row"></div><div id="dots"></div><div class="grain"></div>
</div>`,
  script: `
txt('#A div','l1','Do 38 ao 46,');txt('#B div','l2','do jeito que');txt('#C div','destaque','você é.');var kick=letras('#kick','chamada','PEÇA CERTA');
var R=document.getElementById('row');var lista=['38','40','42','44','46'];var alvo=Math.max(0,lista.indexOf(String(v('tamanho','42'))));
lista.forEach(function(t){var e=document.createElement('div');e.className='sz';e.textContent=t;R.appendChild(e)});var sz=[].slice.call(R.children);
var D=document.getElementById('dots');var pts=[];for(var i=0;i<22;i++){var p=document.createElement('div');p.className='dot';p.style.left=(i*37.5)+'px';p.style.top='6px';D.appendChild(p);pts.push(p)}
tl.to(kick,{opacity:1,duration:.25,stagger:.02,ease:"none"},0.1);
tl.to(["#A div","#B div","#C div"],{y:"0%",duration:.85,ease:"expo.out",stagger:.12},0.25);
tl.fromTo(sz,{opacity:0,y:40},{opacity:1,y:0,duration:.5,ease:"power3.out",stagger:.06},1.0);
tl.fromTo("#pin",{opacity:0,x:0,scale:.6},{opacity:1,scale:1,duration:.3,ease:"expo.out"},1.5);
for(var k=1;k<=4;k++){tl.to("#pin",{x:k*164,duration:.22,ease:"power2.inOut"},1.62+k*.2)}
tl.to("#pin",{x:alvo*164,duration:.45,ease:"expo.out"},2.5);
tl.to(sz[alvo],{color:v('fundo','${ISYS.fundo}'),borderColor:v('cor','${ISYS.cor}'),duration:.2},2.7);
tl.fromTo(sz[alvo],{scale:1},{scale:1.1,duration:.16,ease:"power2.out",yoyo:true,repeat:1},2.7);
tl.to(pts,{scale:1,duration:.2,ease:"back.out(3)",stagger:.02},2.6);
tl.fromTo("#gd",{scale:1},{scale:1.04,duration:4,ease:"none"},0);
`,
});

export const MODELOS_HTML: ModeloHtml[] = [
  { id: "isys-abertura", nome: "Abertura com costura", desc: "A costura pontilhada corre a moldura, o título sobe, a grade marca um tamanho e a cortina fecha na marca. 5 s.", marca: "ISYS", duracao: 5, html: abertura },
  { id: "isys-cta", nome: "Chamada final", desc: "Fundo vermelho, frase em serifa e botão que é apertado. Para o fim do vídeo. 4 s.", marca: "ISYS", duracao: 4, html: cta },
  { id: "isys-editorial", nome: "Página editorial", desc: "Papel com costura e título serifado com palavra em itálico. Entra entre falas. 3,5 s.", marca: "ISYS", duracao: 3.5, html: editorial },
  { id: "isys-lista", nome: "Lista na fala", desc: "Título e três itens; cada item entra no segundo da fala que você marcar. 5 s.", marca: "ISYS", duracao: 5, html: lista },
  { id: "isys-tamanhos", nome: "Grade de tamanhos", desc: "Do 38 ao 46: o marcador passa pela grade e para no tamanho da peça. 4 s.", marca: "ISYS", duracao: 4, html: tamanhos },
];
