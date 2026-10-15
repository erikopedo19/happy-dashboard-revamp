// @ts-nocheck
/* 3D QR reveal scene ported from the attached BookingQR3D snippet. */
import QRCode from "qrcode";

const __root = window;
(function (root) {
'use strict';
var CSS = '.bq3d{--r:#2f5d46;--d:#1f2a24;--p1:#e9e4d8;--p2:#d6cfbf;--p3:#c9c1ae;position:fixed;inset:0;z-index:9999;overflow:hidden;background:linear-gradient(#bcd9ee,#f3efe4 70%);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;opacity:.01;pointer-events:none;transition:opacity .35s;color:#1f2a24}'
+'.bq3d.in{position:absolute}.bq3d.on{opacity:1;pointer-events:auto}.bq3d.m .pz{clip-path:none}'
+'.bq3d *{box-sizing:border-box}.bq3d .stg{position:absolute;inset:0;transition:filter .6s}.bq3d .sc{position:absolute;inset:0;perspective:900px;perspective-origin:50% 40%}'
+'.bq3d .w{position:absolute;left:50%;top:42%;width:0;height:0;transform-style:preserve-3d}'
+'.bq3d .bl,.bq3d .dc{position:absolute;left:0;top:0;transform-style:preserve-3d}'
+'.bq3d .f,.bq3d .tp{position:absolute;outline:1px solid transparent;transition:opacity .6s}.bq3d .tp{left:50%;top:50%}'
+'.bq3d .fr{left:-140px;top:-540px;width:280px;height:428px;transform:translateZ(-150px);background:#b9694e;overflow:hidden}'
+'.bq3d .sd{left:-60px;top:-540px;width:120px;height:540px;background:#a05840}'
+'.bq3d .l{transform:translate3d(-140px,0,-210px) rotateY(-90deg)}.bq3d .r{transform:translate3d(140px,0,-210px) rotateY(90deg);background:#ad6247}'
+'.bq3d .rf{left:-140px;top:-60px;width:280px;height:120px;background:#5f666e;transform:translate3d(0,-540px,-210px) rotateX(90deg)}'
+'.bq3d .co{left:-148px;top:-8px;width:296px;height:16px;background:#f1e9da;transform:translate3d(0,-536px,-142px) rotateX(90deg)}'
+'.bq3d .aw{left:-140px;top:-20px;width:280px;height:40px;background:repeating-linear-gradient(90deg,#c0392b 0 28px,#f4ead8 28px 56px);transform:translate3d(0,-127px,-131px) rotateX(70deg);border-bottom:5px solid rgba(31,42,36,.25)}'
+'.bq3d .wn{position:absolute;left:0;right:0;top:8px;display:grid;grid-template-columns:repeat(3,50px);justify-content:space-around;row-gap:18px}'
+'.bq3d .wn i{position:relative;height:58px;border:5px solid #f1e9da;background:linear-gradient(90deg,transparent 47%,#f1e9da 47% 53%,transparent 53%),linear-gradient(transparent 47%,#f1e9da 47% 53%,transparent 53%),var(--gl,#a9c3d6)}'
+'.bq3d .wn i::after{content:"";position:absolute;left:-7px;right:-7px;bottom:-12px;height:8px;border-radius:3px;background:radial-gradient(circle,#c0392b 0 2px,transparent 2.6px) 0 0/8px 8px,#5f8c5a}'
+'.bq3d .sp{left:-140px;top:-112px;width:280px;height:112px;transform:translateZ(-150px);overflow:hidden}.bq3d .sh{position:absolute;left:0;right:0;bottom:0;height:112px;background:var(--r)}'
+'.bq3d .sg{height:26px;color:#fff;text-align:center;letter-spacing:.2em;font:700 11px/26px system-ui,sans-serif}'
+'.bq3d .gl{display:grid;grid-template-columns:1fr 54px 1fr;gap:6px;padding:0 10px;height:86px}.bq3d .gl i{background:linear-gradient(#fff3d6,#f1d9a8);position:relative}'
+'.bq3d .gl .dr{background:var(--d)}.bq3d .gl .dr::after{content:"";position:absolute;right:7px;top:44px;width:4px;height:10px;border-radius:2px;background:#f0c27a}'
+'.bq3d .lt{position:absolute;top:340px;width:8px;height:12px;border-radius:4px;background:#e9dcc0;box-shadow:inset 0 0 0 2px #cdbf9f}'
+'.bq3d .dc{left:-170px;top:-170px;width:340px;height:340px;transform:rotateX(90deg)}'
+'.bq3d .pz{position:absolute;inset:0;clip-path:inset(22px 0 0 0);border-radius:50%;background:radial-gradient(circle,var(--p1) 0 58%,var(--p2) 59% 100%);box-shadow:0 0 0 10px var(--p3)}'
+'.bq3d canvas{position:absolute;left:55px;top:55px;width:230px;height:230px;transform:translateZ(2px)}'
+'.bq3d.m .f,.bq3d.m .tp{opacity:0}'
+'.bq3d .pt{position:absolute;top:-20px;width:10px;height:13px;border-radius:80% 0 80% 0;background:#d98a2b;opacity:0;pointer-events:none;animation:bqp 7s linear infinite}'
+'@keyframes bqp{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:.8}100%{transform:translate(60px,700px) rotate(540deg);opacity:0}}'
+'.bq3d .sheet{position:absolute;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:420px;margin:0 auto;padding:16px 18px 18px;border-radius:28px;background:rgba(255,252,246,.96);box-shadow:0 0 0 1px rgba(31,42,36,.1)}'
+'.bq3d h2{margin:2px 0 4px;font-size:28px;font-weight:800;letter-spacing:-.02em}.bq3d p{margin:0;font-size:14px;color:#6b6f66;overflow-wrap:anywhere}'
+'.bq3d .b{display:none}.bq3d.go .a{display:none}.bq3d.go .b{display:block}'
+'.bq3d .row{display:flex;gap:8px;margin-top:12px}.bq3d button{font:700 15px system-ui,sans-serif;flex:1;padding:12px;border:0;border-radius:16px;background:var(--r);color:#fff;cursor:pointer}'
+'.bq3d button.g{background:#e9e4d6;color:#1f2a24}.bq3d button:focus-visible{outline:3px solid var(--d);outline-offset:2px}'
+'.bq3d .x{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:14px;width:40px;height:40px;flex:none;padding:0;border-radius:50%;background:rgba(255,255,255,.85);color:#1f2a24;font-size:20px;z-index:2}'
+'.bq3d .mr{position:absolute;left:16px;top:8px;width:34px;height:52px;border-radius:17px 17px 4px 4px;border:3px solid #f0c27a;background:linear-gradient(135deg,#fff,#cfe0f0)}'+'.bq3d .ch{position:absolute;left:18px;bottom:6px;width:30px;height:20px;border-radius:7px 7px 3px 3px;background:var(--r);box-shadow:0 5px 0 -1px #1f2a24}'+'.bq3d .gl em{position:absolute;left:4px;right:4px;top:16px;text-align:center;font:italic 700 13px/1.25 Georgia,serif;color:var(--d)}'+'.bq3d .dr s{position:absolute;top:10px;left:7px;right:7px;height:14px;border-radius:3px;background:#f4ead8;color:var(--d);font:700 8px/14px system-ui,sans-serif;text-align:center;text-decoration:none;letter-spacing:.1em}'+'.bq3d .po{background:repeating-linear-gradient(-45deg,#c0392b 0 6px,#fff 6px 12px,#2f5d9e 12px 18px,#fff 18px 24px);background-size:14px 34px;animation:bqs 1.1s linear infinite;border-radius:7px!important}'+'@keyframes bqs{to{background-position:0 34px}}'+'.bq3d .nb{overflow:hidden;background:var(--b)}'+'.bq3d .nw{position:absolute;left:12px;right:12px;top:14px;display:grid;gap:18px 14px}.bq3d .nw i{height:48px;border:4px solid rgba(255,255,255,.75);background:var(--gl,#a9c3d6)}'+'.bq3d .ns{position:absolute;left:0;right:0;bottom:0;height:96px;background:var(--s)}.bq3d .nt{font:700 10px/22px system-ui,sans-serif;color:#fff;text-align:center;letter-spacing:.18em}'+'.bq3d .ng{display:grid;grid-template-columns:1fr 34px 1fr;gap:6px;margin:0 10px;height:66px}.bq3d .ng i{background:linear-gradient(#fff3d6,#f1d9a8)}.bq3d .ng i:nth-child(2){background:rgba(40,30,25,.9)}'+'.bq3d .gr{left:-1300px;top:-62px;width:2600px;height:124px;background:#cfc8b8;transform:translate3d(0,2px,-72px) rotateX(90deg)}'
+'.bq3d .fr::before{content:"";position:absolute;left:0;right:0;top:0;height:7px;background:repeating-linear-gradient(90deg,#f1e9da 0 7px,#d9cdb6 7px 14px)}'+'.bq3d .ns::before{content:"";position:absolute;left:0;right:0;top:-9px;height:9px;background:repeating-linear-gradient(90deg,#fff 0 14px,var(--s) 14px 28px)}'+'.bq3d .gl .dr::before{content:"";position:absolute;left:9px;right:9px;top:30px;height:9px;background:#f1d9a8;border-radius:5px 5px 0 0}'
+'.bq3d .ns::before{content:none}'
+'.bq3d .fr::after{content:"";position:absolute;inset:0;border-left:8px solid #f1e9da;border-right:8px solid #f1e9da;pointer-events:none}'+'.bq3d .rd{left:-1700px;top:-60px;width:3400px;height:120px;background:#4d5258;border-top:8px solid #c9c1ae;transform:translate3d(0,1px,246px) rotateX(90deg)}'+'.bq3d .rd::after{content:"";position:absolute;left:0;right:0;top:54px;height:5px;background:repeating-linear-gradient(90deg,#f4ead8 0 28px,transparent 28px 56px)}'+'.bq3d .cw{left:-44px;top:-52px;width:88px;height:104px;background:repeating-linear-gradient(90deg,#f4ead8 0 11px,transparent 11px 22px);transform:translate3d(0,0,246px) rotateX(90deg)}'+'@keyframes bqc{from{transform:translate3d(-900px,232px,0)}to{transform:translate3d(900px,232px,0)}}'+'.bq3d.m .car{animation-play-state:paused}@media (prefers-reduced-motion:reduce){.bq3d .car{animation:none}}'
+'.bq3d.dk{--p1:#2b322e;--p2:#242a27;--p3:#1d2220;background:linear-gradient(#0f1311,#1b211e)}'+'.bq3d.dk .sheet{color:#eef1f2}.bq3d.dk .sheet p{color:#9aa39d}.bq3d.dk:not(.go) .a{background:rgba(20,24,22,.9)}.bq3d.dk .x{background:rgba(40,46,43,.9);color:#eef1f2}'
+'.bq3d .pt:nth-child(3n){background:#b8532a}.bq3d .pt:nth-child(3n+1){background:#e2b04a}'
+'.bq3d .sheet{left:0;right:0;bottom:calc(30px + env(safe-area-inset-bottom,0px));max-width:none;margin:0;padding:0 20px;border-radius:0;background:none;box-shadow:none;text-align:center}'+'.bq3d .sheet h2{font-size:17px;font-weight:600;letter-spacing:0;margin:0 0 3px}.bq3d .sheet p{font-size:13px}.bq3d .a>p,.bq3d .b>p:first-child{display:none}'+'.bq3d:not(.go) .a{display:inline-block;padding:8px 16px;border-radius:999px;background:rgba(255,252,246,.92)}.bq3d .a h2{font-size:14px;margin:0}'+'.bq3d .row{justify-content:center;gap:24px;margin-top:12px}.bq3d button{flex:none;width:auto;background:none;color:inherit;padding:6px 4px;border-radius:0;font-weight:500;font-size:15px}'+'.bq3d button.g{background:none;color:inherit}.bq3d .cl{font-weight:700;box-shadow:inset 0 -1px 0 currentColor}'
+'@media (prefers-reduced-motion:reduce){.bq3d .po{animation:none}}'
+'@media (prefers-reduced-motion:reduce){.bq3d .f,.bq3d .tp{transition-duration:.01s}.bq3d .pt{display:none}}';

function inject(){ if(document.getElementById('bq3d-css'))return; var s=document.createElement('style'); s.id='bq3d-css'; s.textContent=CSS; document.head.appendChild(s); }
function loadQR(){ return Promise.resolve(); }
function rgb(h){ return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]; }
var TX={};
function tex(hex,f){ var k=hex+f; if(TX[k])return TX[k]; var c=document.createElement('canvas'),g=c.getContext('2d'),b=rgb(hex);
  c.width=144;c.height=72; function m(v,x){return Math.max(0,Math.min(255,Math.round(v*x)))}
  g.fillStyle='rgb('+b.map(function(v){return m(v,f*1.07)+6}).join()+')'; g.fillRect(0,0,144,72);
  for(var r=0;r<6;r++)for(var i=-1;i<7;i++){ var x=(.9+Math.random()*.13)*f; g.fillStyle='rgb('+b.map(function(v){return m(v,x)}).join()+')'; g.fillRect(i*24+(r%2)*12+1,r*12+1,22,10); }
  return TX[k]=c.toDataURL(); }
var TONES=['#2f5d46','#b9694e','#5f666e','#e8c9a0'].map(rgb), DEEP=rgb('#1f2a24');

function BookingQR3D(o){
  o=o||{}; inject(); this.o=o; this.url=o.url||'https://example.com'; this.e=0; this.melted=false; this.cells=[];
  var t=this, el=this.el=document.createElement('div');
  el.className='bq3d'+(o.container?' in':''); el.setAttribute('role','dialog'); el.setAttribute('aria-hidden','true'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label',o.title||'Scan to book');
  el.innerHTML='<button class="x" aria-label="Close">&times;</button><div class="stg"><div class="sc"><div class="w"><div class="dc"><div class="pz"></div><canvas></canvas></div><div class="bl">'
   +'<div class="f fr"><div class="wn"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><i class="lt" style="left:100px"></i><i class="lt" style="right:100px"></i></div><div class="f sp"><div class="sh"><div class="sg"></div><div class="gl"><i><b class="mr"></b><b class="ch"></b></i><i class="dr"><s>OPEN</s></i><i><em>Haircuts<br>&amp; shaves</em></i></div></div></div>'
   +'<div class="f sd l"></div><div class="f sd r"></div><div class="f rf"></div><div class="f co"></div><div class="f aw"></div></div></div></div></div>'
   +'<div class="sheet"><div class="a"><p>'+(o.readyText||'Booking link')+'</p><h2>'+(o.readyTitle||'Preparing your code')+'</h2></div>'
   +'<div class="b"><p>'+(o.hint||'Point a camera at the code')+'</p><h2>'+(o.title||'Scan to book')+'</h2><p class="u"></p><div class="row"><button class="g cp">'+(o.copyLabel||'Copy link')+'</button><button class="cl">'+(o.doneLabel||'Done')+'</button></div></div></div>';
  (o.container||document.body).appendChild(el);
  this.w=el.querySelector('.w'); this.dc=el.querySelector('.dc'); this.cv=el.querySelector('canvas'); this.sc=el.querySelector('.sc');
  el.querySelector('.sg').textContent=(o.name||'Barbershop').toUpperCase();
  this._tables(); this._row(); this.setTheme(o.theme||'auto');
  var n=document.createDocumentFragment(); for(var i=0;i<6;i++){var p=document.createElement('i');p.className='pt';p.style.left=(Math.random()*100)+'%';p.style.animationDelay=(-Math.random()*7)+'s';p.style.animationDuration=(6+Math.random()*4)+'s';n.appendChild(p)} el.appendChild(n);
  this._onKey=function(ev){ if(ev.key==='Escape'&&t.isOpen)t.close(); };
  el.querySelector('.x').onclick=el.querySelector('.cl').onclick=function(){t.close()};
  el.querySelector('.cp').onclick=function(){ var b=this; (navigator.clipboard?navigator.clipboard.writeText(t.url):Promise.reject()).then(function(){b.textContent='Copied'; setTimeout(function(){b.textContent=o.copyLabel||'Copy link'},1500)}).catch(function(){}); };
  if(root.ResizeObserver){ this.ro=new ResizeObserver(function(){t._fit()}); this.ro.observe(el); }
  this._fit(); this._apply(0); this.setUrl(this.url);
}
var P=BookingQR3D.prototype;
P._fit=function(){ var w=this.el.clientWidth||360,h=this.el.clientHeight||640; this.s=Math.max(.55,Math.min(1.3,Math.min(w/360,h/640))); this._apply(this.e); };
P._apply=function(k){ var s=Math.sin(Math.PI*k),z=this.s||1;
  this.w.style.transform='translate3d(0,'+((150*(1-k)+170*s)*z)+'px,'+((330-370*k-820*s)*z)+'px) rotateX('+(-90*k)+'deg) rotateY('+(-18*s)+'deg) scale3d('+z+','+z+','+z+')'; };
P._part=function(w,x,y,z,bg,ex){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:'+w+'px;height:'+w+'px;margin:'+(-w/2)+'px 0 0 '+(-w/2)+'px;border-radius:50%;background:'+bg+';transform:translate3d('+x+'px,'+y+'px,'+z+'px);'+(ex||''); this.dc.appendChild(d); };
P._leg=function(x,y,h,c){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:6px;height:'+h+'px;margin:'+(-h/2)+'px 0 0 -3px;border-radius:3px;background:'+(c||'#6d5a48')+';transform:translate3d('+x+'px,'+y+'px,'+h/2+'px) rotateX(90deg)'; this.dc.appendChild(d); };
P._pl=function(w,h,tf,bg,ex){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:'+w+'px;height:'+h+'px;margin:'+(-h/2)+'px 0 0 '+(-w/2)+'px;background:'+bg+';transform:'+tf+';'+(ex||''); this.dc.appendChild(d); };
P._tables=function(){ var t=this;
  function umb(x,y,c1,c2){ t._part(108,x,y,1,'rgba(31,42,36,.14)'); t._part(16,x,y,2,'#25282b'); t._leg(x,y,72,'#6b6f66');
    [[98,66],[78,72],[56,77],[32,81]].forEach(function(r,i){ t._part(r[0],x,y,r[1],'repeating-conic-gradient(from '+(i*7)+'deg,'+c1+' 0 15deg,'+c2+' 15deg 30deg)','box-shadow:0 0 0 '+(i?0:2)+'px '+c1); });
    for(var a=0;a<12;a++){ t._part(15,x+47*Math.cos(a*Math.PI/6),y+47*Math.sin(a*Math.PI/6),65,a%2?c2:c1,'box-shadow:0 0 0 1px '+c1); }
    [0,90].forEach(function(r){ t._pl(98,30,'translate3d('+x+'px,'+y+'px,81px) rotateZ('+r+'deg) rotateX(90deg)','repeating-linear-gradient(90deg,'+c1+' 0 13px,'+c2+' 13px 26px)','border-radius:0 0 49px 49px/0 0 30px 30px'); });
    t._part(9,x,y,85,'#f0c27a'); }
  function table(x,y,ch,u){ t._part(64,x,y,1,'rgba(31,42,36,.18)');
    ch.forEach(function(a){var cx=x+44*Math.cos(a),cy=y+44*Math.sin(a); t._part(26,cx,cy,1,'rgba(31,42,36,.15)'); t._leg(cx,cy,14); t._part(22,cx,cy,15,'#c0392b','box-shadow:inset 0 0 0 3px #e8c9a0')});
    t._leg(x,y,32); t._part(54,x,y,33,'#f4efe4','box-shadow:0 0 0 4px #c9b79a'); t._part(12,x+10,y-6,36,'#c0392b');
    if(u)umb(x,y,u[0],u[1]); }
  this._pole(-46,-138); this._pole(46,-138); table(-118,34,[2.6,3.7],false); table(118,52,[-.4,.8],false); table(-84,-104,[.5,1.6],false);
  [[-96,-128],[96,-128]].forEach(function(p){ t._part(34,p[0],p[1],1,'rgba(40,20,30,.2)'); t._leg(p[0],p[1],10);
    t._part(36,p[0],p[1],22,'radial-gradient(circle at 30% 30%,#e8c9a0 0 5px,transparent 6px),radial-gradient(circle at 70% 60%,#e8c9a0 0 5px,transparent 6px),radial-gradient(circle,#5f8c5a,#4d7a4a)'); });
  [[-150,-20],[150,-20]].forEach(function(p){ t._part(22,p[0],p[1],1,'rgba(40,20,30,.2)'); t._leg(p[0],p[1],86,'#25282b'); t._part(16,p[0],p[1],90,'#f4ead8','box-shadow:0 0 0 3px #cfc8b8'); }); };
P._pole=function(x,y){ var d=document.createElement('i'); d.className='tp po'; d.style.cssText='width:14px;height:74px;margin:-37px 0 0 -7px;transform:translate3d('+x+'px,'+y+'px,37px) rotateX(90deg)'; this.dc.appendChild(d);
  this._part(22,x,y,1,'rgba(40,20,30,.2)'); this._part(18,x,y,2,'#f0c27a'); this._part(18,x,y,76,'#f0c27a','box-shadow:0 0 0 2px #c9a05a'); this._part(9,x,y,80,'#ffe9a8'); };
P._row=function(){ var t=this,bl=this.el.querySelector('.bl'),q=this.el;
  var add=this._add=function(c,st,h){ var d=document.createElement('div'); d.className='f '+c; d.style.cssText=st; if(h)d.innerHTML=h; bl.appendChild(d); return d; };
  function bg(hex,f){ return 'background-image:url('+tex(hex,f)+');background-size:96px 48px;'; }
  var ROOF='background-color:#5f666e;background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 3px,transparent 3px 16px);';
  [['.fr','#b9694e'],['.sd.l','#a05840'],['.sd.r','#ad6247']].forEach(function(a){ var e=q.querySelector(a[0]); e.style.backgroundColor=a[1]; var sh=a[0]==='.fr'?'linear-gradient(180deg,rgba(255,255,255,.16),rgba(20,25,20,.15)),':''; e.style.backgroundImage=sh+'url('+tex(a[1],1)+')'; e.style.backgroundSize=(sh?'100% 100%,':'')+'96px 48px'; });
  add('gr',''); add('rd',''); add('cw',''); this._car();
  add('','left:-1300px;top:-7px;width:2600px;height:14px;background:rgba(31,42,36,.14);transform:translate3d(0,1px,-143px) rotateX(90deg)');
  [[-152,-85,1],[152,-85,1],[-270,-92,1.05],[270,-92,1.05],[-410,-92,1],[410,-92,1.1],[-560,-92,1.05],[560,-92,1]].forEach(function(a){ t._tree(a[0],a[1],a[2]); });
  var mt=document.createElement('i'); mt.className='tp'; mt.style.cssText='width:50px;height:26px;margin:-13px 0 0 -25px;border-radius:4px;background:#1f2a24;box-shadow:inset 0 0 0 3px #c0392b;transform:translate3d(0px,-116px,1px)'; this.dc.appendChild(mt);
  var HZ=['#c9d6e0','#d4dde3','#bfcfda','#d7dde0'];
  for(var i=0;i<9;i++){ var hw=170+(i*37)%60,hh=520+(i*83)%260,hx=-980+i*245;
    add('','left:'+hx+'px;top:'+(-hh)+'px;width:'+hw+'px;height:'+hh+'px;transform:translateZ(-440px);background:repeating-linear-gradient(0deg,rgba(255,255,255,.22) 0 14px,transparent 14px 34px),'+HZ[i%4]); }
  var N=['BAKERY','BOOKS','CAFE','FLOWERS','TAILOR','DELI','GALLERY','TEA','VINYL','PHARMACY'],W=[150,130,170,140,160,135,155,145,165,140],H=[340,430,370,300,400,350,450,320,380,420],
  BC=['#e6d8bf','#a95c46','#d9c3a0','#bfc0b8','#cdb892','#9fb0bc','#d8b878','#c9a98f','#b9c4a8','#d9b9a2'],
  SC=['#2f5d46','#7a4a35','#3a5a7a','#8a3b32','#4f6b3a','#6b4a2f','#2f4a5f','#7a5a2f','#4a3a5a','#3a6b6b'],
  SD=['#c9a58f','#a98bb6','#d4a58c','#a7b8c4','#c4a4a0','#a8b8b0','#c4a890','#b0a8c0','#c8a0a8','#a0b8a8'];
  [-1,1].forEach(function(side){ var edge=140;
    for(var i=0;i<8;i++){ var k=(i*3+(side>0?4:0))%10,w=W[k],h=H[k],x0=side<0?-(edge+w):edge,n=Math.round(w/70),rows=Math.floor((h-110)/66),wi=''; edge+=w;
      for(var j=0;j<n*rows;j++)wi+='<i></i>';
      add('nb','left:'+x0+'px;top:'+(-h)+'px;width:'+w+'px;height:'+h+'px;transform:translateZ(-150px);--b:'+BC[k]+';--s:'+SC[k]+';background-image:linear-gradient(180deg,rgba(255,255,255,.16),rgba(20,25,20,.15)),url('+tex(BC[k],1)+');background-size:100% 100%,96px 48px;',
        '<div class="nw" style="grid-template-columns:repeat('+n+',1fr)">'+wi+'</div><div class="ns"><div class="nt">'+N[k]+'</div><div class="ng"><i></i><i></i><i></i></div></div>');
      [-1,1].forEach(function(e){ add('sd','left:-60px;top:'+(-h)+'px;width:120px;height:'+h+'px;'+bg(BC[k],e>0?.8:.72)+'background-color:'+BC[k]+';transform:translate3d('+(e<0?x0:x0+w)+'px,0,-210px) rotateY('+(e<0?-90:90)+'deg)'); });
      add('rf','left:'+x0+'px;top:-60px;width:'+w+'px;height:120px;'+ROOF+'transform:translate3d(0,'+(-h)+'px,-210px) rotateX(90deg)');
      add('','left:'+(x0-4)+'px;top:-8px;width:'+(w+8)+'px;height:16px;background:#f1e9da;transform:translate3d(0,'+(-h+4)+'px,-142px) rotateX(90deg)');
      add('','left:'+x0+'px;top:-15px;width:'+w+'px;height:30px;background:repeating-linear-gradient(90deg,'+SC[k]+' 0 14px,#f4ead8 14px 28px);border-bottom:4px solid rgba(31,42,36,.22);transform:translate3d(0,-102px,-137px) rotateX(70deg)');
    } });
  var RL='border-top:3px solid #f1e9da;background:repeating-linear-gradient(90deg,#f1e9da 0 2px,transparent 2px 8px);';
  [-93,0,93].forEach(function(cx){ [-398,-246].forEach(function(y){
    add('','left:-33px;top:-13px;width:66px;height:26px;background:#f1e9da;box-shadow:inset 0 0 0 2px #d9cdb6;transform:translate3d('+cx+'px,'+y+'px,-137px) rotateX(90deg)');
    add('','left:-33px;top:-8px;width:66px;height:16px;'+RL+'transform:translate3d('+cx+'px,'+(y-8)+'px,-124px)');
    [-1,1].forEach(function(e){ add('','left:-13px;top:-8px;width:26px;height:16px;'+RL+'transform:translate3d('+(cx+e*33)+'px,'+(y-8)+'px,-137px) rotateY(90deg)'); }); }); });
  [[70,-220,46],[-80,-250,38]].forEach(function(c){ var x=c[0],z=c[1],h=c[2],B=bg('#a0563f',.92)+'background-color:#a0563f;';
    [-1,1].forEach(function(e){ add('','left:-14px;top:'+(-h)+'px;width:28px;height:'+h+'px;'+B+'transform:translate3d('+x+'px,-540px,'+(z+e*14)+'px)');
      add('','left:-14px;top:'+(-h)+'px;width:28px;height:'+h+'px;'+B+'transform:translate3d('+(x+e*14)+'px,-540px,'+z+'px) rotateY(90deg)'); });
    add('','left:-17px;top:-17px;width:34px;height:34px;background:#4b3a35;transform:translate3d('+x+'px,'+(-540-h)+'px,'+z+'px) rotateX(90deg)'); }); };
P._car=function(){ var c=document.createElement('div'),B='#2f6f7a',G='#a9c1e0',D='#25282b';
  c.className='car'; c.style.cssText='position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;animation:bqc 12s linear infinite';
  function pl(w,h,tf,bg){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:'+w+'px;height:'+h+'px;margin:'+(-h/2)+'px 0 0 '+(-w/2)+'px;background:'+bg+';transform:'+tf; c.appendChild(d); }
  var L=76,W=36,H=20;
  pl(L+6,W+6,'translate3d(0,0,1px)','rgba(31,42,36,.18)');
  pl(L,W,'translate3d(0,0,'+H+'px)','linear-gradient(90deg,'+B+' 0 24%,'+G+' 24% 66%,'+B+' 66%)');
  [-1,1].forEach(function(k){ pl(L,H,'translate3d(0,'+k*W/2+'px,'+H/2+'px) rotateX(90deg)','linear-gradient('+D+' 0 28%,'+B+' 28% 70%,'+G+' 70%)');
    pl(H,W,'translate3d('+k*L/2+'px,0,'+H/2+'px) rotateY(90deg)','linear-gradient(270deg,'+D+' 0 28%,'+B+' 28%)'); });
  this.dc.appendChild(c); };
P.setTheme=function(t){ var me=this,mq=root.matchMedia&&matchMedia('(prefers-color-scheme:dark)'); this.theme=t;
  function ap(){ me.el.classList.toggle('dk',me.theme==='dark'||(me.theme==='auto'&&!!mq&&mq.matches)); }
  ap(); if(mq&&!this._mq){ this._mq=mq; (mq.addEventListener?mq.addEventListener('change',ap):mq.addListener(ap)); } };
P._tree=function(x,y,k){ var t=this,G=['#4d7a4a','#5f8c5a','#76a468']; this._part(74*k,x,y,1,'rgba(31,42,36,.16)'); this._leg(x,y,46*k,'#6d5238');
  [[86,52,0],[68,62,1],[48,72,0]].forEach(function(r){ t._part(r[0]*k,x,y,r[1]*k,'radial-gradient(circle at 40% 35%,'+G[2]+','+G[r[2]]+')'); });
  [0,90].forEach(function(a){ t._pl(80*k,66*k,'translate3d('+x+'px,'+y+'px,'+(64*k)+'px) rotateZ('+a+'deg) rotateX(90deg)','radial-gradient(circle at 40% 30%,'+G[2]+','+G[1]+' 55%,'+G[0]+')','border-radius:50%'); }); };
P.setUrl=function(url){ var t=this; this.url=url; this.el.querySelector('.u').textContent=url.replace(/^https?:\/\//,'');
  loadQR().then(function(){ var q=QRCode.create(url,{errorCorrectionLevel:'M'}); var n=q.modules.size; t.n=n; t.cells=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++) if(q.modules.get(r,c)) t.cells.push({r:r,c:c,d:r*.013+Math.random()*.22,k:TONES[(r+c)%4]});
    var dpr=Math.min(root.devicePixelRatio||1,3); t.cv.width=t.cv.height=230*dpr; t.dpr=dpr; t._draw(t.melted?99:-1); }).catch(function(){}); };
P._draw=function(sec){ var cv=this.cv,g=cv.getContext('2d'),S=230*this.dpr; g.clearRect(0,0,S,S); if(sec<0||!this.n)return;
  var pad=14*this.dpr,m=(S-pad*2)/this.n,a=Math.min(1,sec/.5);
  g.fillStyle='rgba(255,255,255,'+a+')'; g.beginPath(); (g.roundRect?g.roundRect(0,0,S,S,14*this.dpr):g.rect(0,0,S,S)); g.fill();
  for(var i=0;i<this.cells.length;i++){ var q=this.cells[i],p=Math.max(0,Math.min(1,(sec-q.d)/.65)); if(p<=0)continue;
    var e=1-Math.pow(1-p,3),sz=m*(1+(1-e)*1.4),cx=pad+(q.c+.5)*m,cy=pad+(q.r+.5)*m,u=Math.min(1,p*1.4);
    g.globalAlpha=Math.min(1,p*2.5); g.fillStyle='rgb('+Math.round(q.k[0]+(DEEP[0]-q.k[0])*u)+','+Math.round(q.k[1]+(DEEP[1]-q.k[1])*u)+','+Math.round(q.k[2]+(DEEP[2]-q.k[2])*u)+')';
    g.fillRect(cx-sz/2,cy-sz/2,sz,sz); } g.globalAlpha=1; };
P._melt=function(){ var t=this,t0=performance.now(); this.melted=true; this.el.classList.add('m'); this.o.onMelt&&this.o.onMelt();
  (function f(now){ var s=(now-t0)/1000; t._draw(s); if(s<1.8&&t.melted)t.mr=requestAnimationFrame(f); else if(t.melted)t._draw(99); })(t0); };
P._go=function(target,dur){ var t=this,s=this.e,t0=performance.now(),reduce=root.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches,d=reduce?1:dur*Math.abs(target-s);
  cancelAnimationFrame(this.raf);
  (function f(now){ var p=Math.min(1,(now-t0)/d),k=p*p*p*(p*(6*p-15)+10); t.e=s+(target-s)*k; t._apply(t.e);
    if(target===1){ if(t.e>.5)t.el.classList.add('go'); if(t.e>.5&&!t.melted)t._melt(); }
    if(p<1)t.raf=requestAnimationFrame(f); else if(target===1&&t.o.onDone)t.o.onDone(); else if(target===0){t.el.classList.remove('on');t.el.setAttribute('aria-hidden','true');} })(t0); };
P.open=function(){ var t=this; if(this.isOpen)return; this.isOpen=true; this.lastFocus=document.activeElement; document.addEventListener('keydown',this._onKey);
  this.el.classList.remove('go','m'); this.melted=false; cancelAnimationFrame(this.mr); this._draw(-1); this.e=0; this._apply(0);
  this.el.classList.add('on'); this.el.removeAttribute('aria-hidden'); this.el.querySelector('.cl').focus&&setTimeout(function(){t.el.querySelector('.x').focus()},50);
  setTimeout(function(){ t._go(1,3500); },250); };
P.close=function(){ if(!this.isOpen)return; this.isOpen=false; document.removeEventListener('keydown',this._onKey); this.melted=false; cancelAnimationFrame(this.mr);
  this.el.classList.remove('m','go'); this._draw(-1); this._go(0,1700); if(this.lastFocus&&this.lastFocus.focus)this.lastFocus.focus(); this.o.onClose&&this.o.onClose(); };
P.destroy=function(){ cancelAnimationFrame(this.raf); cancelAnimationFrame(this.mr); document.removeEventListener('keydown',this._onKey); this.ro&&this.ro.disconnect(); this.el.remove(); };
root.BookingQR3D=BookingQR3D;
if(typeof module!=='undefined')module.exports=BookingQR3D;
})(typeof window!=='undefined'?window:this);

export default __root.BookingQR3D as any;
