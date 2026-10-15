/* HistoPráctica · motor de movimiento (GSAP + ScrollTrigger).
   No toca la lógica de la app: observa #app y anima lo que se pinta. Sin GSAP o con "reducir movimiento", no hace nada. */
(function(){"use strict";
var g=window.gsap;if(!g)return;
var app=document.getElementById("app"),RM=matchMedia("(prefers-reduced-motion: reduce)"),EZ="power3.out",ctx=null,rctx=null,
$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))},
ST=window.ScrollTrigger,DS=window.DrawSVGPlugin,ok=function(){return!RM.matches&&!document.hidden};
try{g.registerPlugin.apply(g,[ST,DS].filter(Boolean))}catch(e){}
var fx=document.createElement("div");fx.className="hp-fx";fx.setAttribute("aria-hidden","true");document.body.appendChild(fx);
var rm=function(e){return function(){e.remove()}},vib=function(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* Efectos: partículas, confeti, +XP y avisos de racha */
function burst(x,y,n,cols){for(var i=0;i<n;i++){var d=document.createElement("i"),a=Math.random()*6.283,s=40+Math.random()*80,z=6+Math.random()*6;d.style.cssText="left:"+x+"px;top:"+y+"px;width:"+z+"px;height:"+z+"px;background:"+cols[i%cols.length];fx.appendChild(d);g.to(d,{x:Math.cos(a)*s,y:Math.sin(a)*s-30,opacity:0,scale:.3,duration:.7+Math.random()*.4,ease:"power2.out",onComplete:rm(d)})}}
function confetti(){var c=["#58cc02","#1cb0f6","#ffc800","#ff9600","#ffffff"],w=innerWidth;for(var i=0;i<64;i++){var d=document.createElement("i");d.className="cf";d.style.background=c[i%c.length];fx.appendChild(d);g.fromTo(d,{x:Math.random()*w,y:-20,rotation:Math.random()*180,opacity:1},{y:innerHeight+30,x:"+="+((Math.random()-.5)*220),rotation:"+=540",duration:2+Math.random()*1.4,delay:Math.random()*.5,ease:"power1.in",onComplete:rm(d)})}}
function xp(t){var r=t.getBoundingClientRect(),e=document.createElement("b");e.className="hp-xp";e.textContent="+10 XP";e.style.left=r.left+r.width/2+"px";e.style.top=r.top-6+"px";fx.appendChild(e);g.set(e,{xPercent:-50});g.timeline({onComplete:rm(e)}).fromTo(e,{y:10,opacity:0,scale:.7},{y:-22,opacity:1,scale:1,duration:.35,ease:"back.out(2)"}).to(e,{y:-64,opacity:0,duration:.6,ease:"power1.in"},"+=.25")}
function pill(t){var e=document.createElement("div");e.className="hp-pill2";e.textContent=t;fx.appendChild(e);g.timeline({onComplete:rm(e)}).fromTo(e,{y:-30,opacity:0,scale:.8},{y:0,opacity:1,scale:1,duration:.5,ease:"back.out(2)"}).to(e,{y:-18,opacity:0,duration:.4},"+=1.5")}

/* Respuesta correcta / incorrecta y selección de opción */
function fb(t,win){if(!ok())return;var o=$(".opt.ok"),r=(o||t).getBoundingClientRect(),sk=$(".sk");
 if(win){burst(r.right-34,r.top+r.height/2,14,["#58cc02","#1cb0f6","#ffc800","#ff9600"]);xp(t);vib(14);if(sk)g.fromTo(sk,{scale:1.5},{scale:1,duration:.7,ease:"elastic.out(1,.4)"});
  var n=typeof S!=="undefined"&&S?S.streak:0;if(n>0&&n%5===0)pill("🔥 ¡Racha de "+n+"!")}
 else{vib([30,50,30]);if(sk)g.fromTo(sk,{x:-5},{x:0,duration:.5,ease:"elastic.out(1,.2)"})}}
function attr(m){var t=m.target,c=t.classList,o=m.oldValue||"";
 if(c.contains("sheet")&&/\b(ok|no)\b/.test(t.className)&&!/\b(ok|no)\b/.test(o))fb(t,c.contains("ok"));
 else if(c.contains("opt")&&c.contains("sel")&&!/\bsel\b/.test(o)&&ok())g.fromTo(t,{scale:.975},{scale:1,duration:.45,ease:"back.out(3)",clearProps:"transform"})}

/* Utilidades de entrada */
function counts(root){$$("[data-count]",root).forEach(function(el){var n=+el.dataset.count||0,o={v:0};g.to(o,{v:n,duration:1.1,ease:"power2.out",delay:.3,onUpdate:function(){el.textContent=Math.round(o.v)}})})}
function bars(root){$$(".pb i",root).forEach(function(i,k){var w=i.style.width;if(w)g.fromTo(i,{width:"0%"},{width:w,duration:1,ease:EZ,delay:.4+Math.min(k,10)*.04})})}
function list(root){var els=$$(".rr,.wrong-q,.ab",root);if(!els.length||!ST)return;g.set(els,{opacity:0,y:22});ST.batch(els,{start:"top 94%",once:true,onEnter:function(b){g.to(b,{opacity:1,y:0,duration:.55,ease:EZ,stagger:.06,overwrite:true,clearProps:"transform,opacity"})}})}
function draw(sel,d){if(DS)g.from($$(sel),{drawSVG:0,duration:d||1,ease:"power2.inOut",stagger:.07})}

var V={
 gen:function(){var root=app.children.length===1&&app.firstElementChild.children.length>1?app.firstElementChild:app,
  k=[].slice.call(root.children).filter(function(e){return e.tagName!=="SCRIPT"&&getComputedStyle(e).position!=="fixed"&&!e.classList.contains("rr")&&!e.classList.contains("wrong-q")});
  g.from(k,{y:18,opacity:0,duration:.5,ease:EZ,stagger:{amount:Math.min(.45,k.length*.05)},clearProps:"transform,opacity"});list(root);counts(root);bars(root)},
 landing:function(){var h=document.documentElement,P=[".lp-title",".lp-fig",".lp-copy",".lp-bar"].map(function(s){return $(s)}).filter(Boolean);
  g.set(P,{opacity:0,y:26});h.classList.remove("hpm");draw(".lp-name .ic path,.lp-name .ic circle",1);
  g.to(P,{opacity:1,y:0,duration:.7,ease:EZ,stagger:.14,delay:.1,clearProps:"opacity,transform"});
  g.from(".lp-box",{clipPath:"inset(14% 14% 14% 14% round 22px)",duration:1.1,ease:EZ,delay:.2,clearProps:"clipPath"});
  var im=$("#lp-img");if(im)im.addEventListener("load",function(){g.fromTo(im,{scale:1.1,filter:"blur(8px)"},{scale:1,filter:"blur(0px)",duration:1.2,ease:EZ,clearProps:"filter,transform"})},{once:true})},
 load:function(){draw(".startup-loading path,.startup-loading circle",1.1)},
 auth:function(){draw(".auth-brand .ic path,.auth-brand .ic circle",.9);V.gen()},
 home:function(){var tl=g.timeline({defaults:{ease:EZ}});
  tl.from(".top,.header-meta",{y:-12,opacity:0,duration:.4,stagger:.05,clearProps:"transform,opacity"})
    .from(".hb",{y:22,opacity:0,duration:.6,clearProps:"transform,opacity"},0.05)
    .from(".hb .c",{scale:0,duration:.9,ease:"back.out(1.6)",stagger:.1},.15)
    .from(".hb .hero,.hb p,.hb-st span",{y:14,opacity:0,duration:.5,stagger:.07,clearProps:"transform,opacity"},.2)
    .from(".hm-sec>summary",{opacity:0,x:-10,duration:.4,stagger:.1,clearProps:"transform,opacity"},.3)
    .from(".tc",{y:26,opacity:0,scale:.96,duration:.55,ease:"back.out(1.3)",stagger:.045,clearProps:"transform,opacity"},.3)
    .from(".hm-foot",{opacity:0,duration:.5},.7);
  counts(app);bars(app);
  if(ST&&$(".hb"))g.to(".hb .c",{y:function(i){return-26*(i+1)},ease:"none",scrollTrigger:{trigger:".hb",start:"top top",end:"bottom top",scrub:true}})},
 quiz:function(){var tl=g.timeline({defaults:{ease:EZ}});
  tl.from(".xt",{y:-14,opacity:0,duration:.4,clearProps:"transform,opacity"})
    .from(".qv>h2",{y:14,opacity:0,duration:.45,clearProps:"transform,opacity"},.05)
    .from(".img",{opacity:0,scale:.97,duration:.55,clearProps:"transform,opacity"},.1)
    .from("#ph",{scale:1.06,duration:.9,clearProps:"transform"},.1)
    .from(".opt",{y:18,opacity:0,duration:.45,stagger:.06,clearProps:"transform,opacity"},.3)
    .from(".hint,#sh",{opacity:0,duration:.4,clearProps:"opacity"},.4)},
 res:function(){var v=$(".rg .v"),tl=g.timeline({defaults:{ease:EZ}});
  if(v){var L=2*Math.PI*52,p=+v.dataset.p||0;v.style.strokeDasharray=L;tl.fromTo(v,{strokeDashoffset:L},{strokeDashoffset:L*(1-p/100),duration:1.3,ease:"power3.out"},.2);if(p>=80)g.delayedCall(.9,confetti)}
  tl.from(".big .pop",{scale:0,rotation:-25,duration:.7,ease:"back.out(2.2)"},.35)
    .from(".big .mu",{y:10,opacity:0,duration:.5,clearProps:"transform,opacity"},.6)
    .from(".card,.sub,.tl,.btn,.wrong-list,#finish-status",{y:16,opacity:0,duration:.45,stagger:.04,clearProps:"transform,opacity"},.7);
  counts(app);bars(app);list(app)},
 prof:function(){V.gen();g.from("#perfil .av",{scale:.4,rotation:-12,duration:.7,ease:"back.out(2)",delay:.15,clearProps:"transform"});
  g.from("#perfil .tgrid>.card",{y:20,scale:.94,opacity:0,duration:.5,ease:"back.out(1.4)",stagger:.06,delay:.2,clearProps:"transform,opacity"});
  g.from(".ab:not(.lock) .ai",{scale:.5,rotation:-15,duration:.6,ease:"back.out(2.4)",stagger:.05,delay:.5,clearProps:"transform"})},
 rank:function(){V.gen()}
};
function kind(){return $("#landing")?"landing":$(".auth-wrap")?"auth":$(".startup-loading")?"load":$(".qv")?"quiz":$(".big")?"res":$("#perfil")?"prof":$("#rk")?"rank":$(".hb")?"home":"gen"}
function enter(){if(ctx)ctx.revert();ctx=null;if(!ok())return;ctx=g.context(function(){(V[kind()]||V.gen)()},app)}
function pod(rk){if(rctx)rctx.revert();rctx=null;if(!ok()||!$(".pod,.rl",rk))return;rctx=g.context(function(){
 g.from($$(".pc",rk),{y:36,opacity:0,scale:.92,duration:.6,ease:"back.out(1.4)",stagger:.12,clearProps:"transform,opacity"});
 g.from($$(".md",rk),{scale:0,rotation:-90,duration:.6,ease:"back.out(2)",stagger:.12,delay:.2,clearProps:"transform"});list(rk)},rk)}

/* Salida: la vista anterior se desvanece mientras entra la nueva (sin retrasar ninguna acción) */
var D=Object.getOwnPropertyDescriptor(Element.prototype,"innerHTML");
function ghost(){if(!ok()||!app.firstElementChild||$(".startup-loading",app))return;var r=app.getBoundingClientRect();if(r.top<-4)return;
 var gh=document.createElement("div"),cs=getComputedStyle(app);gh.className="hp-ghost";gh.setAttribute("aria-hidden","true");gh.inert=true;
 gh.style.cssText="left:"+r.left+"px;top:"+r.top+"px;width:"+r.width+"px;height:"+Math.min(r.height,innerHeight-r.top)+"px;padding:"+cs.padding;
 gh.innerHTML=D.get.call(app);$$("[id]",gh).forEach(function(e){e.removeAttribute("id")});document.body.appendChild(gh);
 g.to(gh,{opacity:0,duration:.22,ease:"none",onComplete:rm(gh)})}
Object.defineProperty(app,"innerHTML",{configurable:true,get:function(){return D.get.call(this)},set:function(v){try{ghost()}catch(e){}D.set.call(this,v)}});

new MutationObserver(function(ms){var view=false;
 ms.forEach(function(m){if(m.type==="attributes")attr(m);else if(m.target===app)view=true;else if(m.target.id==="rk")pod(m.target)});
 if(view)enter()}).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:["class"],attributeOldValue:true});

function boot(){if(!ok())document.documentElement.classList.remove("hpm");enter()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.HPM={confetti:confetti,burst:burst}
})();
