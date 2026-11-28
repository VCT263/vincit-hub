/**
 * Painel da VINCIT dentro da conversa do Claude (MCP Apps).
 * A ferramenta comecar_no_hub aponta para PAINEL_URI; o Claude desenha este HTML num quadro
 * na conversa e entrega o resultado da ferramenta. O botão Atualizar chama comecar_no_hub de
 * novo (pelo próprio Claude da pessoa, sem API paga). Sem bibliotecas: o protocolo é JSON-RPC
 * por postMessage com o Claude (ui/initialize, tools/call, ui/message, ui/open-link).
 */

/** painel do HUB publicado como artifact no Claude (o mesmo da fila de IA) */
export const CLAUDE_PANEL_URL = "https://claude.ai/artifact/AWg3shE2RQH28mLQnnLQsx";
export const HUB_URL = "https://vincit-hub.vercel.app";
export const PAINEL_URI = "ui://vincit/painel.html";
export const PAINEL_MIME = "text/html;profile=mcp-app";

export const PAINEL_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Painel VINCIT</title>
<style>
:root{--bg:#fbfaf7;--card:#fff;--tx:#1d1b18;--mu:#6d675e;--ln:#e7e2d9;--ac:#b5562b;--ok:#2f7a4b;--wa:#a86a12}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#1b1a18;--card:#242220;--tx:#f1ede6;--mu:#a59e93;--ln:#3a3733;--ac:#e08a5c;--ok:#6cc08b;--wa:#e0a64b}}
:root[data-theme=dark]{--bg:#1b1a18;--card:#242220;--tx:#f1ede6;--mu:#a59e93;--ln:#3a3733;--ac:#e08a5c;--ok:#6cc08b;--wa:#e0a64b}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
.w{padding:14px 16px 16px;max-width:760px}
header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
h1{font-size:15px;margin:0;letter-spacing:.02em}h1 b{color:var(--ac)}
.sub{color:var(--mu);font-size:12px}
h2{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mu);margin:14px 0 6px;font-weight:600}
.card{background:var(--card);border:1px solid var(--ln);border-radius:10px;padding:10px 12px}
.row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--ln)}
.row:first-child{border-top:0}
.bar{height:5px;background:var(--ln);border-radius:9px;width:90px;overflow:hidden;flex:none}.bar i{display:block;height:100%;background:var(--ac)}
.tag{font-size:11px;border:1px solid var(--ln);border-radius:99px;padding:1px 7px;color:var(--mu);white-space:nowrap}
.tag.ok{color:var(--ok);border-color:currentColor}.tag.wa{color:var(--wa);border-color:currentColor}
.novo{background:var(--ac);color:#fff;border:0}
.nv{padding:8px 0;border-top:1px solid var(--ln)}.nv:first-child{border-top:0}.nv b{display:block;font-size:13px}.nv p{margin:2px 0 0;color:var(--mu);font-size:12.5px}
button{font:inherit;font-size:13px;border:1px solid var(--ln);background:var(--card);color:var(--tx);border-radius:8px;padding:6px 10px;cursor:pointer}
button:hover{border-color:var(--ac)}button.p{background:var(--ac);border-color:var(--ac);color:#fff}button:disabled{opacity:.6;cursor:wait}
.acts{display:flex;flex-wrap:wrap;gap:6px}
.muted{color:var(--mu)}.err{color:#c0392b;font-size:12.5px;margin-top:8px}
</style></head><body><div class="w" id="app"><p class="muted">Carregando o painel da VINCIT…</p></div>
<script>
(function(){
var HUB=${JSON.stringify(HUB_URL)}, PAINEL=${JSON.stringify(CLAUDE_PANEL_URL)};
var seq=0, wait={}, data=null, busy=false, erro="";
function send(m){ window.parent.postMessage(m,"*"); }
function req(method,params){ return new Promise(function(ok,no){ var id=++seq; wait[id]={ok:ok,no:no}; send({jsonrpc:"2.0",id:id,method:method,params:params||{}}); setTimeout(function(){ if(wait[id]){ delete wait[id]; no(new Error("sem resposta")); } },60000); }); }
function note(method,params){ send({jsonrpc:"2.0",method:method,params:params||{}}); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function tema(ctx){ if(ctx&&ctx.theme) document.documentElement.setAttribute("data-theme",ctx.theme); }
function fromResult(r){ if(!r) return null; if(r.structuredContent) return r.structuredContent; try{ var t=(r.content||[]).filter(function(c){return c.type==="text";})[0]; return t?JSON.parse(t.text):null; }catch(e){ return null; } }
window.addEventListener("message",function(ev){
  var m=ev.data; if(!m||m.jsonrpc!=="2.0") return;
  if(m.id!=null&&wait[m.id]&&!m.method){ var w=wait[m.id]; delete wait[m.id]; m.error?w.no(new Error(m.error.message||"erro")):w.ok(m.result); return; }
  if(m.method==="ui/notifications/tool-result"){ var d=fromResult(m.params); if(d){ data=d; draw(); } }
  else if(m.method==="ui/notifications/host-context-changed"){ tema(m.params); }
  else if(m.method==="ui/resource-teardown"&&m.id!=null){ send({jsonrpc:"2.0",id:m.id,result:{}}); }
  else if(m.id!=null&&m.method){ send({jsonrpc:"2.0",id:m.id,result:{}}); }
});
function atualizar(){ if(busy) return; busy=true; erro=""; draw();
  req("tools/call",{name:"comecar_no_hub",arguments:{}}).then(function(r){ var d=fromResult(r); if(d){ data=d; } }).catch(function(e){ erro="Não deu para atualizar agora ("+e.message+"). Peça ao Claude: Começar no HUB."; }).then(function(){ busy=false; draw(); });
}
function pedir(t){ req("ui/message",{role:"user",content:[{type:"text",text:t}]}).catch(function(){ erro="Copie e mande ao Claude: "+t; draw(); }); }
function abrir(u){ req("ui/open-link",{url:u}).catch(function(){ window.open(u,"_blank"); }); }
window.__v={atualizar:atualizar,pedir:pedir,abrir:abrir};
/* selo Novo também para o que saiu ontem ou hoje (a 1a chamada já marca como visto) */
function recente(d){ if(!d) return false; var t=new Date(); t.setDate(t.getDate()-1); return String(d)>=t.toISOString().slice(0,10); }
function draw(){
  var el=document.getElementById("app");
  if(!data){ el.innerHTML='<p class="muted">Carregando o painel da VINCIT…</p>'; return; }
  var c=data.conta||{}, p=data.perfis||[], pe=data.pendencias||{}, nv=data.novidades||[], ul=data.ultimas||[];
  var h='<header><div><h1><b>VINCIT</b> HUB</h1><div class="sub">'+esc(c.nome||c.email||"")+(c.plano?' · '+esc(c.plano):'')+' · versão '+esc(data.versao_ia||"")+'</div></div>'+
    '<button class="p" onclick="__v.atualizar()"'+(busy?' disabled':'')+'>'+(busy?'Atualizando…':'Atualizar')+'</button></header>';
  h+='<h2>Perfis</h2><div class="card">'+(p.length?p.map(function(x){ var pct=Math.max(0,Math.min(100,x.briefing_pronto_pct||0));
    return '<div class="row"><div><b>'+esc(x.perfil)+'</b> <span class="sub">'+esc(x.nicho||"")+'</span><div class="sub">Briefing '+pct+'%</div></div>'+
    '<div class="acts" style="align-items:center"><span class="bar"><i style="width:'+pct+'%"></i></span>'+
    '<span class="tag '+(x.manual_da_marca?'ok':'wa')+'">'+(x.manual_da_marca?'manual da marca':'sem manual')+'</span>'+
    '<span class="tag '+(x.instagram_conectado?'ok':'wa')+'">'+(x.instagram_conectado?'Instagram ligado':'Instagram desligado')+'</span></div></div>'; }).join(""):'<p class="muted">Nenhum perfil ainda.</p>')+'</div>';
  var ents=pe.entrevistas||[], fila=pe.pedidos_de_ia_na_fila||0;
  h+='<h2>Pendências</h2><div class="card">'+
    '<div class="row"><span>Pedidos de IA na fila</span><span class="acts" style="align-items:center"><span class="tag '+(fila?'wa':'ok')+'">'+fila+'</span>'+(fila?'<button onclick="__v.pedir(\\'Responda os pedidos de IA do HUB\\')">Responder</button>':'')+'</span></div>'+
    ents.map(function(e){ return '<div class="row"><span>Entrevista '+esc(e.perfil)+'</span><span class="tag wa">'+esc(e.status)+'</span></div>'; }).join("")+'</div>';
  var lista=nv.length?nv:ul;
  h+='<h2>Novidades de IA</h2><div class="card">'+(lista.length?lista.slice(0,4).map(function(n){ return '<div class="nv"><b>'+(nv.length||recente(n.data)?'<span class="tag novo">Novo</span> ':'')+esc(n.titulo)+'</b><p>'+esc(n.texto)+'</p></div>'; }).join(""):'<p class="muted">Sem novidades.</p>')+
    (nv.length?'':'<p class="sub" style="margin:6px 0 0">Nada novo desde a sua última visita.</p>')+'</div>';
  h+='<h2>O que fazer agora</h2><div class="acts">'+
    '<button onclick="__v.pedir(\\'Monte o pacote da semana\\')">Pacote da semana</button>'+
    '<button onclick="__v.pedir(\\'Quero fazer a entrevista de marca\\')">Entrevista de marca</button>'+
    '<button onclick="__v.pedir(\\'Faça a análise do perfil\\')">Análise do perfil</button>'+
    '<button onclick="__v.abrir(HUB)">Abrir o HUB</button>'+
    '<button onclick="__v.abrir(PAINEL)">Painel completo</button></div>';
  if(erro) h+='<p class="err">'+esc(erro)+'</p>';
  el.innerHTML=h; size();
}
function size(){ note("ui/notifications/size-changed",{height:Math.ceil(document.documentElement.scrollHeight)}); }
if(window.ResizeObserver) new ResizeObserver(size).observe(document.body);
req("ui/initialize",{appInfo:{name:"vincit-painel",version:"1"},appCapabilities:{},protocolVersion:"2026-01-26"})
  .then(function(r){ tema(r&&r.hostContext); note("ui/notifications/initialized",{}); })
  .catch(function(){ note("ui/notifications/initialized",{}); });
})();
</script></body></html>`;
