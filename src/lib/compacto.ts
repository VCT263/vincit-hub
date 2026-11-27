/* Celular compacto: a tela de celular em pé desenha o HUB numa largura maior
   (largura real / ESCALA) e o navegador encolhe tudo para caber. Resultado: textos,
   chips e cards uns 20% menores e a página usando a largura toda, como no print
   que o Vinícius aprovou em 27/11. Fica de fora o que precisa de leitura grande
   (teleprompter) e os links públicos dos clientes. */
export const ESCALA = 0.8;
export const FORA = ["/audiovisual/teleprompter", "/m/", "/p/", "/r/", "/c/", "/b/", "/g/", "/login", "/privacidade", "/oauth"];

/* Script que roda antes da primeira pintura e de novo a cada troca de rota/orientação */
export const scriptCompacto = `(function(){
var S=${ESCALA},F=${JSON.stringify(FORA)};
function run(){try{
var ms=document.querySelectorAll('meta[name="viewport"]');if(!ms.length){var m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);ms=[m];}
var p=location.pathname,fora=false;for(var i=0;i<F.length;i++){var f=F[i];if(p===f.replace(/\\/$/,'')||p.indexOf(f)===0){fora=true;break;}}
var sw=Math.min(screen.width,screen.height),retrato=window.matchMedia('(orientation: portrait)').matches;
var ios=/iPhone|iPod/.test(navigator.userAgent);
var c='width=device-width, initial-scale=1';
if(!fora&&retrato&&sw<600){var w=Math.round(sw/S);c='width='+w+', initial-scale='+S+(ios?', maximum-scale='+S:'');}
for(var j=0;j<ms.length;j++)if(ms[j].getAttribute('content')!==c)ms[j].setAttribute('content',c);
document.documentElement.classList.toggle('compacto',c.indexOf('device-width')<0);
}catch(e){}}
window.__compacto=run;run();document.addEventListener('DOMContentLoaded',run);
window.addEventListener('orientationchange',function(){setTimeout(run,60)});
window.matchMedia('(orientation: portrait)').addEventListener&&window.matchMedia('(orientation: portrait)').addEventListener('change',run);
})();`;
