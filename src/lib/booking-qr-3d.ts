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
+'.bq3d .pg{position:absolute;inset:0;transform-style:preserve-3d}.bq3d .bl,.bq3d .pg{transition:transform .5s,visibility 0s}'
+'.bq3d.m .bl{transform:scale3d(.001,.001,.001);visibility:hidden;transition:transform 1s cubic-bezier(.65,0,.35,1),visibility 0s 1s}'
+'.bq3d.m .pg{transform:scale3d(.001,.001,.001);visibility:hidden;transition:transform .9s cubic-bezier(.65,0,.35,1),visibility 0s .9s}'
+'.bq3d .pt{position:absolute;top:-20px;width:10px;height:13px;border-radius:80% 0 80% 0;background:#d98a2b;opacity:0;pointer-events:none;animation:bqp 7s linear infinite}'
+'@keyframes bqp{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:.8}100%{transform:translate(60px,700px) rotate(540deg);opacity:0}}'
+'.bq3d .sheet{position:absolute;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:420px;margin:0 auto;padding:16px 18px 18px;border-radius:28px;background:rgba(255,252,246,.96);box-shadow:0 0 0 1px rgba(31,42,36,.1)}'
+'.bq3d h2{margin:2px 0 4px;font-size:28px;font-weight:800;letter-spacing:-.02em}.bq3d p{margin:0;font-size:14px;color:#6b6f66;overflow-wrap:anywhere}'
+'.bq3d .b{display:none}.bq3d.go .a{display:none}.bq3d.go .b{display:block}'
+'.bq3d .row{display:flex;gap:8px;margin-top:12px}.bq3d button{font:700 15px system-ui,sans-serif;flex:1;padding:12px;border:0;border-radius:16px;background:var(--r);color:#fff;cursor:pointer}'
+'.bq3d button.g{background:#e9e4d6;color:#1f2a24}.bq3d button:focus-visible{outline:3px solid var(--d);outline-offset:2px}'
+'.bq3d .x{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:14px;width:40px;height:40px;flex:none;padding:0 0 3px;border-radius:50%;background:rgba(255,255,255,.85);color:#1f2a24;font-size:26px;line-height:1;z-index:2}'
+'.bq3d .mr{position:absolute;left:16px;top:8px;width:34px;height:52px;border-radius:17px 17px 4px 4px;border:3px solid #f0c27a;background:linear-gradient(135deg,#fff,#cfe0f0)}'+'.bq3d .ch{position:absolute;left:18px;bottom:6px;width:30px;height:20px;border-radius:7px 7px 3px 3px;background:var(--r);box-shadow:0 5px 0 -1px #1f2a24}'+'.bq3d .gl em{position:absolute;left:4px;right:4px;top:16px;text-align:center;font:italic 700 13px/1.25 Georgia,serif;color:var(--d)}'+'.bq3d .dr s{position:absolute;top:10px;left:7px;right:7px;height:14px;border-radius:3px;background:#f4ead8;color:var(--d);font:700 8px/14px system-ui,sans-serif;text-align:center;text-decoration:none;letter-spacing:.1em}'+'.bq3d .po{background:repeating-linear-gradient(-45deg,#c0392b 0 6px,#fff 6px 12px,#2f5d9e 12px 18px,#fff 18px 24px);background-size:14px 34px;animation:bqs 1.1s linear infinite;border-radius:7px!important}'+'@keyframes bqs{to{background-position:0 34px}}'+'.bq3d .nb{overflow:hidden;background:var(--b)}'+'.bq3d .nw{position:absolute;left:12px;right:12px;top:14px;display:grid;gap:18px 14px}.bq3d .nw i{height:48px;border:4px solid rgba(255,255,255,.75);background:var(--gl,#a9c3d6)}'+'.bq3d .ns{position:absolute;left:0;right:0;bottom:0;height:96px;background:var(--s)}.bq3d .nt{font:700 10px/22px system-ui,sans-serif;color:#fff;text-align:center;letter-spacing:.18em}'+'.bq3d .ng{display:grid;grid-template-columns:1fr 34px 1fr;gap:6px;margin:0 10px;height:66px}.bq3d .ng i{background:linear-gradient(#fff3d6,#f1d9a8)}.bq3d .ng i:nth-child(2){background:rgba(40,30,25,.9)}'+'.bq3d .gr{left:-800px;top:-62px;width:1600px;height:124px;background:#cfc8b8;transform:translate3d(0,2px,-72px) rotateX(90deg)}'
+'.bq3d .fr::before{content:"";position:absolute;left:0;right:0;top:0;height:7px;background:repeating-linear-gradient(90deg,#f1e9da 0 7px,#d9cdb6 7px 14px)}'+'.bq3d .ns::before{content:"";position:absolute;left:0;right:0;top:-9px;height:9px;background:repeating-linear-gradient(90deg,#fff 0 14px,var(--s) 14px 28px)}'+'.bq3d .gl .dr::before{content:"";position:absolute;left:9px;right:9px;top:30px;height:9px;background:#f1d9a8;border-radius:5px 5px 0 0}'
+'.bq3d .ns::before{content:none}'
+'.bq3d .fr::after{content:"";position:absolute;inset:0;border-left:8px solid #f1e9da;border-right:8px solid #f1e9da;pointer-events:none}'+'.bq3d .rd{left:-800px;top:-60px;width:1600px;height:120px;background:#4d5258;border-top:8px solid #c9c1ae;transform:translate3d(0,1px,246px) rotateX(90deg)}'+'.bq3d .rd::after{content:"";position:absolute;left:0;right:0;top:54px;height:5px;background:repeating-linear-gradient(90deg,#f4ead8 0 28px,transparent 28px 56px)}'+'.bq3d .cw{left:-44px;top:-52px;width:88px;height:104px;background:repeating-linear-gradient(90deg,#f4ead8 0 11px,transparent 11px 22px);transform:translate3d(0,0,246px) rotateX(90deg)}'+'@keyframes bqc{from{transform:translate3d(var(--x0),var(--y),0)}to{transform:translate3d(var(--x1),var(--y),0)}}'+'.bq3d.m .car{animation-play-state:paused}@media (prefers-reduced-motion:reduce){.bq3d .car{animation:none}}'
+'.bq3d.dk{--p1:#2b322e;--p2:#242a27;--p3:#1d2220;background:linear-gradient(#0f1311,#1b211e)}'+'.bq3d.dk .sheet{color:#eef1f2}.bq3d.dk .sheet p{color:#9aa39d}.bq3d.dk:not(.go) .a{background:rgba(20,24,22,.9)}.bq3d.dk .x{background:rgba(40,46,43,.9);color:#eef1f2}'+'.bq3d:not(.nt) .lp{display:none}'+'.bq3d.nt{--p1:#39425f;--p2:#2e3652;--p3:#252b45;background:radial-gradient(circle at 84% 8%,#f4efe0 0 13px,transparent 14px),radial-gradient(circle at 16% 11%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 64% 6%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 38% 18%,#dfe6ff 0 1px,transparent 1.5px),radial-gradient(circle at 7% 26%,#dfe6ff 0 1px,transparent 1.5px),radial-gradient(circle at 93% 23%,#fff 0 1px,transparent 1.5px),linear-gradient(#060a1c,#1a2450 68%,#2c3a6b)}'+'.bq3d.nt .stg{filter:brightness(.66) saturate(.9) hue-rotate(-6deg)}'+'.bq3d.nt .wn i,.bq3d.nt .nw i{--gl:#ffd98a}.bq3d.nt .wn i:nth-child(3n+2),.bq3d.nt .nw i:nth-child(3n+1){--gl:#6f80ad}'+'.bq3d.nt .gr{background:#383e55}.bq3d.nt .rd{background:#222633;border-top-color:#454c66}.bq3d.nt .cw{opacity:.7}.bq3d.nt .sg{text-shadow:0 0 8px rgba(255,255,255,.9)}.bq3d.nt .cd{opacity:.05}'
+'.bq3d .pt:nth-child(3n){background:#b8532a}.bq3d .pt:nth-child(3n+1){background:#e2b04a}'
+'.bq3d .sheet{left:0;right:0;bottom:calc(30px + env(safe-area-inset-bottom,0px));max-width:none;margin:0;padding:0 20px;border-radius:0;background:none;box-shadow:none;text-align:center}'+'.bq3d .sheet h2{font-size:17px;font-weight:600;letter-spacing:0;margin:0 0 3px}.bq3d .sheet p{font-size:13px}.bq3d .a>p,.bq3d .b>p:first-child{display:none}'+'.bq3d:not(.go) .a{display:inline-block;padding:8px 16px;border-radius:999px;background:rgba(255,252,246,.92)}.bq3d .a h2{font-size:14px;margin:0}'+'.bq3d .row{justify-content:center;gap:24px;margin-top:12px}.bq3d button{flex:none;width:auto;background:none;color:inherit;padding:6px 4px;border-radius:0;font-weight:500;font-size:15px}'+'.bq3d button.g{background:none;color:inherit}.bq3d .cl{font-weight:700;box-shadow:inset 0 -1px 0 currentColor}'
+'.bq3d .cd{position:absolute;left:0;width:96px;height:26px;border-radius:26px;background:#fff;opacity:.8;animation:bqk 90s linear infinite;pointer-events:none}'+'.bq3d .cd::before,.bq3d .cd::after{content:"";position:absolute;border-radius:50%;background:#fff}.bq3d .cd::before{left:14px;top:-15px;width:40px;height:40px}.bq3d .cd::after{left:42px;top:-21px;width:32px;height:32px}'+'@keyframes bqk{from{transform:translateX(-170px)}to{transform:translateX(calc(100vw + 170px))}}.bq3d.dk .cd{opacity:.06}'+'.bq3d .rp{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(47,93,70,.55);opacity:0;transform:translateZ(1px)}.bq3d.m .rp{animation:bqr 2.2s ease-out 1.3s 2 both}'+'@keyframes bqr{0%{transform:translateZ(1px) scale(.55);opacity:.55}100%{transform:translateZ(1px) scale(1.25);opacity:0}}'+'.bq3d .sl{position:absolute;left:69px;top:69px;width:202px;height:3px;background:linear-gradient(90deg,transparent,#3fa66b 20%,#3fa66b 80%,transparent);opacity:0;transform:translateZ(3px)}.bq3d.m .sl{animation:bqsl 1.5s ease-in-out 2.4s 2 both}'+'@keyframes bqsl{0%{top:69px;opacity:0}12%{opacity:.9}88%{opacity:.9}100%{top:265px;opacity:0}}'+'@media (prefers-reduced-motion:reduce){.bq3d .cd{animation:none;left:55%}.bq3d .rp,.bq3d .sl{animation:none}}'
+'.bq3d.sq .sd.l{left:-140px;width:280px;transform:translate3d(-140px,0,-290px) rotateY(-90deg)}.bq3d.sq .sd.r{left:-140px;width:280px;transform:translate3d(140px,0,-290px) rotateY(90deg)}'+'.bq3d.sq .rf{left:-140px;top:-140px;width:280px;height:280px;transform:translate3d(0,-540px,-290px) rotateX(90deg)}'+'.bq3d.idle *{animation-play-state:paused!important}.bq3d.idle .pt{display:none}.bq3d.nt .cd{display:none}'
+'@media (prefers-reduced-motion:reduce){.bq3d .po{animation:none}}'
+'@media (prefers-reduced-motion:reduce){.bq3d .f,.bq3d .tp{transition-duration:.01s}.bq3d .pt{display:none}}';

function inject(){ if(document.getElementById('bq3d-css'))return; var s=document.createElement('style'); s.id='bq3d-css'; s.textContent=CSS; document.head.appendChild(s); }
function loadQR(){ return Promise.resolve(); }
function rgb(h){ return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]; }
var AC=null,MUTE=false;
function getAC(){ if(!AC){ var C=root.AudioContext||root.webkitAudioContext; if(C){ try{ AC=new C(); }catch(e){} } } return AC; }
function unlock(){ var a=getAC(); if(a&&a.state==='suspended')a.resume().catch(function(){}); }
if(typeof document!=='undefined'){ ['pointerdown','keydown','touchend'].forEach(function(e){ document.addEventListener(e,unlock,{once:true,passive:true}); }); }
function snd(ctx,t0,cells,end){ var out=ctx.createGain(),lp=ctx.createBiquadFilter(),cp=ctx.createDynamicsCompressor(); out.gain.value=.55; lp.type='lowpass'; lp.frequency.value=5200; out.connect(lp); lp.connect(cp); cp.connect(ctx.destination);
  function env(g,t,a,pk,dec){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+a+dec); }
  var pg=ctx.createGain(),pf=ctx.createBiquadFilter(); pf.type='lowpass'; pf.frequency.value=900; pg.connect(pf); pf.connect(out);
  pg.gain.setValueAtTime(.0001,t0); pg.gain.exponentialRampToValueAtTime(.07,t0+.7); pg.gain.setValueAtTime(.07,t0+end-.2); pg.gain.exponentialRampToValueAtTime(.0001,t0+end+.5);
  [[196,'sine',0],[196,'triangle',7]].forEach(function(o){ var os=ctx.createOscillator(); os.type=o[1]; os.detune.value=o[2]; os.frequency.setValueAtTime(o[0],t0); os.frequency.exponentialRampToValueAtTime(294,t0+end); os.connect(pg); os.start(t0); os.stop(t0+end+.6); });
  var B={},pent=[0,2,4,7,9],mx=0; cells.forEach(function(q){ var b=Math.floor(q.d/.05); B[b]=(B[b]||0)+1; if(b>mx)mx=b; });
  Object.keys(B).map(Number).sort(function(a,b){return a-b;}).forEach(function(b,i){ var step=pent[i%5]+12*Math.min(2,Math.floor(i/5)),f=523.25*Math.pow(2,step/12),t=t0+b*.05,g=ctx.createGain(),os=ctx.createOscillator(); os.type='sine'; os.frequency.value=f; env(g,t,.004,Math.min(.07,.012+B[b]*.0016),.16); os.connect(g); g.connect(out); os.start(t); os.stop(t+.25); });
  var te=t0+(mx+1)*.05+.55; [[1318.5,0],[1975.5,.09]].forEach(function(n){ var g=ctx.createGain(),os=ctx.createOscillator(); os.type='sine'; os.frequency.value=n[0]; env(g,te+n[1],.006,.09,.9); os.connect(g); g.connect(out); os.start(te+n[1]); os.stop(te+n[1]+1); }); }
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
  el.innerHTML='<button class="x" aria-label="Back">&lsaquo;</button><i class="cd" style="top:7%;animation-duration:90s;animation-delay:-10s;scale:1"></i><i class="cd" style="top:17%;animation-duration:120s;animation-delay:-70s;scale:.7"></i><i class="cd" style="top:26%;animation-duration:150s;animation-delay:-30s;scale:.85"></i><div class="stg"><div class="sc"><div class="w"><div class="dc"><div class="pz"></div><canvas></canvas><i class="rp"></i><i class="rp" style="animation-delay:2.6s"></i><i class="sl"></i></div><div class="bl">'
   +'<div class="f fr"><div class="wn"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><i class="lt" style="left:100px"></i><i class="lt" style="right:100px"></i></div><div class="f sp"><div class="sh"><div class="sg"></div><div class="gl"><i><b class="mr"></b><b class="ch"></b></i><i class="dr"><s>OPEN</s></i><i><em>Haircuts<br>&amp; shaves</em></i></div></div></div>'
   +'<div class="f sd l"></div><div class="f sd r"></div><div class="f rf"></div><div class="f co"></div><div class="f aw"></div></div></div></div></div>'
   +'<div class="sheet"><div class="a"><p>'+(o.readyText||'Booking link')+'</p><h2>'+(o.readyTitle||'Preparing your code')+'</h2></div>'
   +'<div class="b"><p>'+(o.hint||'Point a camera at the code')+'</p><h2>'+(o.title||'Scan to book')+'</h2><p class="u"></p><div class="row"><button class="g sh">'+(o.shareLabel||'Share link')+'</button><button class="g cp">'+(o.copyLabel||'Copy link')+'</button><button class="cl">'+(o.doneLabel||'Done')+'</button></div></div></div>';
  (o.container||document.body).appendChild(el);
  this.w=el.querySelector('.w'); this.dc=el.querySelector('.dc'); this.pg=document.createElement('div'); this.pg.className='pg'; this.dc.appendChild(this.pg); this.cv=el.querySelector('canvas'); if(o.roofQR){ this.cv.remove(); [].forEach.call(el.querySelectorAll('.rp,.sl'),function(n){n.remove();}); } this.sc=el.querySelector('.sc');
  el.querySelector('.sg').textContent=(o.name||'Barbershop').toUpperCase();
  this._tables(); this._row(); if(this.o.lamps)this._lamps(); this._tick(); this.setTheme(o.theme||'auto'); if(o.night)this.el.classList.add('nt'); if(o.squareRoof)this.el.classList.add('sq');
  var n=document.createDocumentFragment(); for(var i=0;i<6;i++){var p=document.createElement('i');p.className='pt';p.style.left=(Math.random()*100)+'%';p.style.animationDelay=(-Math.random()*7)+'s';p.style.animationDuration=(6+Math.random()*4)+'s';n.appendChild(p)} el.appendChild(n);
  this._onKey=function(ev){ if(ev.key==='Escape'&&t.isOpen)t.close(); };
  el.querySelector('.x').onclick=el.querySelector('.cl').onclick=function(){t.close()};
  el.querySelector('.cp').onclick=function(){ var b=this; (navigator.clipboard?navigator.clipboard.writeText(t.url):Promise.reject()).then(function(){b.textContent='Copied'; setTimeout(function(){b.textContent=o.copyLabel||'Copy link'},1500)}).catch(function(){}); };
  el.querySelector('.sh').onclick=function(){ var b=this,d={title:(o.shareTitle||'Booking link'),text:(o.shareText||('Book with '+(o.name||'us'))),url:t.url};
    if(navigator.share){ navigator.share(d).catch(function(){}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(t.url).then(function(){ b.textContent='Link copied'; setTimeout(function(){b.textContent=o.shareLabel||'Share link'},1500); }).catch(function(){}); } };
  if(root.ResizeObserver){ this.ro=new ResizeObserver(function(){t._fit()}); this.ro.observe(el); }
  this._fit(); this._apply(0); this.setUrl(this.url);
}
var P=BookingQR3D.prototype;
P._fit=function(){ var w=this.el.clientWidth||360,h=this.el.clientHeight||640; this.s=Math.max(.55,Math.min(1.3,Math.min(w/360,h/640))); this._apply(this.e); };
P._apply=function(k){ if(this.o.cam){ this.w.style.transform=this.o.cam(k,this.s||1); return; } var s=Math.sin(Math.PI*k),z=this.s||1;
  this.w.style.transform='rotateZ('+(2.4*s)+'deg) translate3d(0,'+(((150-(this.o.shift||0))*(1-k)+170*s)*z)+'px,'+((330-370*k-820*s)*z)+'px) rotateX('+(-90*k)+'deg) rotateY('+(-18*s)+'deg) scale3d('+z+','+z+','+z+')'; };
P._part=function(w,x,y,z,bg,ex){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:'+w+'px;height:'+w+'px;margin:'+(-w/2)+'px 0 0 '+(-w/2)+'px;border-radius:50%;background:'+bg+';transform:translate3d('+x+'px,'+y+'px,'+z+'px);'+(ex||''); this.pg.appendChild(d); };
P._leg=function(x,y,h,c){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:6px;height:'+h+'px;margin:'+(-h/2)+'px 0 0 -3px;border-radius:3px;background:'+(c||'#6d5a48')+';transform:translate3d('+x+'px,'+y+'px,'+h/2+'px) rotateX(90deg)'; this.pg.appendChild(d); };
P._pl=function(w,h,tf,bg,ex){ var d=document.createElement('i'); d.className='tp'; d.style.cssText='width:'+w+'px;height:'+h+'px;margin:'+(-h/2)+'px 0 0 '+(-w/2)+'px;background:'+bg+';transform:'+tf+';'+(ex||''); this.pg.appendChild(d); };
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
  this._pole(-46,-138); this._pole(46,-138); if(!this.o.noProps)table(-118,34,[2.6,3.7],false); if(!this.o.noProps)table(118,52,[-.4,.8],false); if(!this.o.noProps)table(-84,-104,[.5,1.6],false);
  (this.o.noProps?[]:[[-96,-128],[96,-128]]).forEach(function(p){ t._part(34,p[0],p[1],1,'rgba(40,20,30,.2)'); t._leg(p[0],p[1],10);
    t._part(36,p[0],p[1],22,'radial-gradient(circle at 30% 30%,#e8c9a0 0 5px,transparent 6px),radial-gradient(circle at 70% 60%,#e8c9a0 0 5px,transparent 6px),radial-gradient(circle,#5f8c5a,#4d7a4a)'); });
  (this.o.noProps?[]:[[-150,-20],[150,-20]]).forEach(function(p){ t._part(22,p[0],p[1],1,'rgba(40,20,30,.2)'); t._leg(p[0],p[1],86,'#25282b'); t._part(16,p[0],p[1],90,'#f4ead8','box-shadow:0 0 0 3px #cfc8b8'); }); };
P._pole=function(x,y){ var d=document.createElement('i'); d.className='tp po'; d.style.cssText='width:14px;height:74px;margin:-37px 0 0 -7px;transform:translate3d('+x+'px,'+y+'px,37px) rotateX(90deg)'; this.pg.appendChild(d);
  this._part(22,x,y,1,'rgba(40,20,30,.2)'); this._part(18,x,y,2,'#f0c27a'); this._part(18,x,y,76,'#f0c27a','box-shadow:0 0 0 2px #c9a05a'); this._part(9,x,y,80,'#ffe9a8'); };
P._row=function(){ var t=this,bl=this.el.querySelector('.bl'),q=this.el;
  var add=this._add=function(c,st,h){ var d=document.createElement('div'); d.className='f '+c; d.style.cssText=st; if(h)d.innerHTML=h; bl.appendChild(d); return d; };
  function bg(hex,f){ return 'background-image:url('+tex(hex,f)+');background-size:96px 48px;'; }
  var ROOF='background-color:#5f666e;background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 3px,transparent 3px 16px);';
  [['.fr','#b9694e'],['.sd.l','#a05840'],['.sd.r','#ad6247']].forEach(function(a){ var e=q.querySelector(a[0]); e.style.backgroundColor=a[1]; var sh=a[0]==='.fr'?'linear-gradient(180deg,rgba(255,255,255,.16),rgba(20,25,20,.15)),':''; e.style.backgroundImage=sh+'url('+tex(a[1],1)+')'; e.style.backgroundSize=(sh?'100% 100%,':'')+'96px 48px'; });
  if(this.o.roofQR){ this.rd=Math.min(root.devicePixelRatio||1,2); var cq=this.rq=document.createElement('canvas'); cq.className='f'; cq.width=cq.height=280*this.rd; cq.style.cssText='left:-140px;top:-140px;width:280px;height:280px;transform:translate3d(0,-541px,-290px) rotateX(90deg)'; bl.appendChild(cq); this._rq(-1); }
  add('gr',''); add('rd',''); add('cw',''); this._car(222,1,'#2f6f7a',12,0);
  add('','left:-800px;top:-7px;width:1600px;height:14px;background:rgba(31,42,36,.14);transform:translate3d(0,1px,-143px) rotateX(90deg)');
  var FC=['#c0392b','#f4ead8','#2f5d46','#d8b878'],by=function(x){var u=x/260; return -262+70*(1-u*u)};
  for(var i=0;i<14;i++){ var fx=-260+i*40; add('','left:-9px;top:0;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:17px solid '+FC[i%4]+';transform:translate3d('+fx+'px,'+by(fx)+'px,-112px)');
    if(i<13){ var mx=fx+20,ang=Math.atan2(by(fx+40)-by(fx),40)*180/Math.PI; add('','left:-21px;top:-1px;width:42px;height:2px;background:#6d5a48;transform:translate3d('+mx+'px,'+by(mx)+'px,-112px) rotateZ('+ang+'deg)'); } }
  var mt=document.createElement('i'); mt.className='tp'; mt.style.cssText='width:50px;height:26px;margin:-13px 0 0 -25px;border-radius:4px;background:#1f2a24;box-shadow:inset 0 0 0 3px #c0392b;transform:translate3d(0px,-116px,1px)'; this.pg.appendChild(mt);
  var HZ=['#c9d6e0','#d4dde3','#bfcfda','#d7dde0'];
  for(var i=0;i<(this.o.noHaze?0:9);i++){ var hw=170+(i*37)%60,hh=520+(i*83)%260,hx=-980+i*245;
    add('','left:'+hx+'px;top:'+(-hh)+'px;width:'+hw+'px;height:'+hh+'px;transform:translateZ(-440px);background:repeating-linear-gradient(0deg,rgba(255,255,255,.22) 0 14px,transparent 14px 34px),'+HZ[i%4]); }
  var N=['BAKERY','BOOKS','CAFE','FLOWERS','TAILOR','DELI','GALLERY','TEA','VINYL','PHARMACY'],W=[150,130,170,140,160,135,155,145,165,140],H=[340,430,370,300,400,350,450,320,380,420],
  BC=['#e6d8bf','#a95c46','#d9c3a0','#bfc0b8','#cdb892','#9fb0bc','#d8b878','#c9a98f','#b9c4a8','#d9b9a2'],
  SC=['#2f5d46','#7a4a35','#3a5a7a','#8a3b32','#4f6b3a','#6b4a2f','#2f4a5f','#7a5a2f','#4a3a5a','#3a6b6b'],
  SD=['#c9a58f','#a98bb6','#d4a58c','#a7b8c4','#c4a4a0','#a8b8b0','#c4a890','#b0a8c0','#c8a0a8','#a0b8a8'];
  [-1,1].forEach(function(side){ var edge=140;
    for(var i=0;i<(t.o.nb||8);i++){ var k=(i*3+(side>0?4:0))%10,w=W[k],h=H[k],x0=side<0?-(edge+w):edge,n=Math.round(w/70),rows=Math.floor((h-110)/66),wi=''; edge+=w;
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
    add('','left:-33px;top:-8px;width:66px;height:16px;'+RL+'transform:translate3d('+(cx)+'px,'+(y-8)+'px,-124px)');
    [-1,1].forEach(function(e){ add('','left:-13px;top:-8px;width:26px;height:16px;'+RL+'transform:translate3d('+(cx+e*33)+'px,'+(y-8)+'px,-137px) rotateY(90deg)'); }); }); });
  (t.o.squareRoof?[]:[[70,-220,46],[-80,-250,38]]).forEach(function(c){ var x=c[0],z=c[1],h=c[2],B=bg('#a0563f',.92)+'background-color:#a0563f;';
    [-1,1].forEach(function(e){ add('','left:-14px;top:'+(-h)+'px;width:28px;height:'+h+'px;'+B+'transform:translate3d('+x+'px,-540px,'+(z+e*14)+'px)');
      add('','left:-14px;top:'+(-h)+'px;width:28px;height:'+h+'px;'+B+'transform:translate3d('+(x+e*14)+'px,-540px,'+z+'px) rotateY(90deg)'); });
    add('','left:-17px;top:-17px;width:34px;height:34px;background:#4b3a35;transform:translate3d('+x+'px,'+(-540-h)+'px,'+z+'px) rotateX(90deg)'); }); };
P._car=function(y,d,B,dur,dl){ var c=document.createElement('div'),G='#9db8d6',D='#1e2024',T='#3f8693';
  c.className='car'; c.style.cssText='position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d';
  function pl(w,h,tf,bg,ex,cls){ var e=document.createElement('i'); e.className='tp'+(cls?' '+cls:''); e.style.cssText='width:'+w+'px;height:'+h+'px;margin:'+(-h/2)+'px 0 0 '+(-w/2)+'px;background:'+bg+';transform:'+tf+';'+(ex||''); c.appendChild(e); }
  var L=80,W=36,H=13,CL=44,CW=30,CH=11,CX=-5;
  pl(L+10,W+8,'translate3d(0,0,1px)','rgba(0,0,0,.3)','border-radius:16px');
  [-26,26].forEach(function(x){ [-1,1].forEach(function(s){ pl(15,15,'translate3d('+x+'px,'+s*(W/2+.6)+'px,7.5px) rotateX(90deg)','radial-gradient(circle,#b9bec6 0 24%,#2a2d33 26% 56%,#14161a 58%)','border-radius:50%'); }); });
  pl(L,W,'translate3d(0,0,'+H+'px)','linear-gradient(90deg,'+B+' 0 72%,'+T+' 72%)','border-radius:10px');
  [-1,1].forEach(function(s){ pl(L,H,'translate3d(0,'+s*W/2+'px,'+H/2+'px) rotateX(90deg)','linear-gradient('+D+' 0 22%,'+B+' 22%)');
    pl(H,W,'translate3d('+s*L/2+'px,0,'+H/2+'px) rotateY(90deg)','linear-gradient(270deg,'+D+' 0 22%,'+B+' 22%)');
    pl(CL,CH,'translate3d('+CX+'px,'+s*CW/2+'px,'+(H+CH/2)+'px) rotateX(90deg)','linear-gradient(90deg,'+B+' 0 8%,transparent 8% 47%,'+B+' 47% 53%,transparent 53% 92%,'+B+' 92%),linear-gradient('+B+' 0 14%,'+G+' 14% 88%,'+B+' 88%)');
    pl(CH,CW,'translate3d('+(CX+s*CL/2)+'px,0,'+(H+CH/2)+'px) rotateY(90deg)','linear-gradient(270deg,'+B+' 0 14%,'+G+' 14% 90%,'+B+' 90%)');
    [-11,11].forEach(function(yy){ pl(4,9,'translate3d('+(s*(L/2+.4))+'px,'+yy+'px,'+(H-4)+'px) rotateY(90deg)',s>0?'#fff3c0':'#ff3b3b'); }); });
  pl(CL,CW,'translate3d('+CX+'px,0,'+(H+CH)+'px)',T,'border-radius:9px');
  pl(96,48,'translate3d('+(L/2+42)+'px,0,1.6px)','radial-gradient(ellipse,rgba(255,236,170,.6),rgba(255,236,170,0) 70%)','','lp');
  pl(30,34,'translate3d('+(-L/2-12)+'px,0,1.6px)','radial-gradient(ellipse,rgba(255,60,60,.4),rgba(255,60,60,0) 70%)','','lp');
  (this.cars=this.cars||[]).push({c:c,y:y,d:d,dur:dur,dl:dl}); this.pg.appendChild(c); };
P.wipe=function(ms){ var t=this,el=this.el; if(!this.rq||!this.n||this.wiped)return Promise.resolve(); this.wiped=true;
  var rc=this.rq.getBoundingClientRect(),pc=el.getBoundingClientRect(),d=Math.min(root.devicePixelRatio||1,3),w=rc.width,h=rc.height,cv=document.createElement('canvas'),S;
  cv.width=cv.height=S=Math.round(w*d); cv.style.cssText='position:absolute;z-index:6;left:'+(rc.left-pc.left)+'px;top:'+(rc.top-pc.top)+'px;width:'+w+'px;height:'+h+'px;opacity:0';
  var g=cv.getContext('2d'),pad=S*34/280,m=(S-pad*2)/this.n; g.fillStyle='#fff'; g.beginPath(); (g.roundRect?g.roundRect(0,0,S,S,S*.05):g.rect(0,0,S,S)); g.fill(); g.fillStyle='#000';
  this.cells.forEach(function(q){ var x0=Math.round(pad+q.c*m),y0=Math.round(pad+q.r*m); g.fillRect(x0,y0,Math.round(pad+(q.c+1)*m)-x0,Math.round(pad+(q.r+1)*m)-y0); });
  var bk=document.createElement('div'); bk.style.cssText='position:absolute;z-index:5;left:0;right:0;top:0;height:calc(100% + 240px);background:linear-gradient(to bottom,rgba(5,6,7,0) 0,#050607 240px);transform:translateY(100%);pointer-events:none';
  el.appendChild(bk); el.appendChild(cv);
  cv.animate([{opacity:0},{opacity:1}],{duration:Math.min(500,ms),fill:'forwards'});
  return bk.animate([{transform:'translateY(100%)'},{transform:'translateY(-240px)'}],{duration:ms,easing:'cubic-bezier(.6,0,.3,1)',fill:'forwards'}).finished.then(function(){ t._dispose(); }).catch(function(){}); };
P._dispose=function(){ [].forEach.call(this.el.querySelectorAll('.stg,.cd,.pt'),function(n){ n.remove(); }); this.el.style.background='#050607'; this.cars=[]; this.rq=null; TX={}; if(this.ro)this.ro.disconnect(); };

P.setTheme=function(t){ var me=this,mq=root.matchMedia&&matchMedia('(prefers-color-scheme:dark)'); this.theme=t;
  function ap(){ me.el.classList.toggle('dk',me.theme==='dark'||(me.theme==='auto'&&!!mq&&mq.matches)); }
  ap(); if(mq&&!this._mq){ this._mq=mq; (mq.addEventListener?mq.addEventListener('change',ap):mq.addListener(ap)); } };
P._tick=function(){ var t=this; cancelAnimationFrame(this.dr);
  (function f(now){ var sec=now/1000; if(!t.melted)(t.cars||[]).forEach(function(k){ var u=(((sec-k.dl)/k.dur)%1+1)%1,x=k.d>0?-700+1400*u:700-1400*u; k.c.style.transform='translate3d('+x+'px,'+k.y+'px,0)'; });
    if(t.isOpen)t.dr=requestAnimationFrame(f); })(performance.now()); };
P._lamps=function(){ var add=this._add,H=150;
  [[-112,-64],[112,-64],[-250,-70],[250,-70],[-390,-70],[390,-70]].forEach(function(p){ var x=p[0],z=p[1],M='background:linear-gradient(90deg,#262a36,#515769 50%,#262a36);';
    [0,90].forEach(function(r){ add('','left:-3px;top:-'+H+'px;width:6px;height:'+H+'px;'+M+'transform:translate3d('+x+'px,0,'+z+'px) rotateY('+r+'deg)'); });
    add('','left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:#262a36;transform:translate3d('+x+'px,-1px,'+z+'px) rotateX(90deg)');
    add('','left:-2px;top:-15px;width:4px;height:30px;background:#3a3f50;transform:translate3d('+x+'px,-'+H+'px,'+(z+15)+'px) rotateX(90deg)');
    [0,90].forEach(function(r){ add('','left:-12px;top:-5px;width:24px;height:9px;border-radius:7px 7px 2px 2px;background:#262a36;transform:translate3d('+x+'px,-'+(H+2)+'px,'+(z+30)+'px) rotateY('+r+'deg)');
      add('lp','left:-58px;top:-58px;width:116px;height:116px;border-radius:50%;background:radial-gradient(circle,#fffbe6 0 12%,rgba(255,226,150,.85) 26%,rgba(255,226,150,0) 66%);transform:translate3d('+x+'px,-'+(H-8)+'px,'+(z+30)+'px) rotateY('+r+'deg)'); });
    add('lp','left:-130px;top:-130px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,226,150,.7),rgba(255,226,150,.25) 50%,rgba(255,226,150,0) 72%);transform:translate3d('+x+'px,-2px,'+(z+30)+'px) rotateX(90deg)'); });
  add('lp','left:-150px;top:-65px;width:300px;height:130px;background:radial-gradient(ellipse,rgba(255,214,140,.5),rgba(255,214,140,0) 70%);transform:translate3d(0,-2px,-95px) rotateX(90deg)'); };
P._rq=function(sec){ if(!this.rq)return; var d=this.rd,S=this.rq.width,g=this.rq.getContext('2d'); g.fillStyle='#f4efe3'; g.fillRect(0,0,S,S); g.strokeStyle='#cfc7b2'; g.lineWidth=8*d; g.strokeRect(4*d,4*d,S-8*d,S-8*d);
  if(sec<0||!this.n)return; var pad=34*d,n=this.n,m=(S-pad*2)/n,C=this.cells,fin=sec>=50;
  for(var i=0;i<C.length;i++){ var q=C[i],u=Math.max(0,Math.min(1,(sec-q.d)/.55)); if(u<=0)continue;
    if(u<.4){ g.fillStyle='#ff2d55'; var z=m*(1.7-.7*(u/.4)),cx=pad+(q.c+.5)*m,cy=pad+(q.r+.5)*m; g.fillRect(cx-z/2,cy-z/2,z,z); }
    else { var v=(u-.4)/.6,w=1-v; g.fillStyle='rgb('+Math.round(255*w)+','+Math.round(45*w)+','+Math.round(85*w)+')'; var x0=Math.round(pad+q.c*m),y0=Math.round(pad+q.r*m); g.fillRect(x0,y0,Math.round(pad+(q.c+1)*m)-x0,Math.round(pad+(q.r+1)*m)-y0); } } };
P.formQR=function(done){ var t=this; if(!this.cells||!this.cells.length){ setTimeout(function(){ t.formQR(done); },80); return; }
  var hc=this.n/2,reduce=root.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches,t0=performance.now();
  this.cells.forEach(function(q){ q.d=Math.hypot(q.r-hc,q.c-hc)/(hc*1.42)*1.0+Math.random()*.22; }); cancelAnimationFrame(this.fr); this.melted=true;
  if(!reduce&&this.o.sound!==false&&!MUTE){ var ac=getAC(),ts=performance.now(),go=function(){ snd(ac,ac.currentTime+.03,t.cells,1.9); }; if(ac){ if(ac.state==='running')go(); else if(ac.resume)ac.resume().then(function(){ if(ac.state==='running'&&performance.now()-ts<250)go(); }).catch(function(){}); } }
  (function f(now){ var s=(now-t0)/1000; t._rq(reduce?99:s); if(!reduce&&s<1.9)t.fr=requestAnimationFrame(f); else{ t._rq(99); if(done)done(); } })(t0); };
P.idle=function(){ if(AC&&AC.state==='running')AC.suspend().catch(function(){}); cancelAnimationFrame(this.dr); cancelAnimationFrame(this.raf); cancelAnimationFrame(this.fr); this.el.classList.add('idle'); };
P.setUrl=function(url){ var t=this; this.url=url; this.el.querySelector('.u').textContent=url.replace(/^https?:\/\//,'');
  loadQR().then(function(){ var q=QRCode.create(url,{errorCorrectionLevel:'M'}); var n=q.modules.size; t.n=n; t.cells=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++) if(q.modules.get(r,c)) t.cells.push({r:r,c:c,d:r*.013+Math.random()*.22,k:TONES[(r+c)%4]});
    if(t.o.roofQR){ t._rq(t.melted?99:-1); return; } var dpr=Math.min(root.devicePixelRatio||1,3); t.cv.width=t.cv.height=230*dpr; t.dpr=dpr; t._build(); t._draw(t.melted?99:-1); }).catch(function(){}); };
P._build=function(){ var S=230*this.dpr,pad=14*this.dpr,m=(S-pad*2)/this.n,oc=document.createElement('canvas'),g=oc.getContext('2d'),r=14*this.dpr;
  oc.width=oc.height=S; g.fillStyle='#fff'; g.beginPath(); (g.roundRect?g.roundRect(0,0,S,S,r):g.rect(0,0,S,S)); g.fill();
  g.fillStyle=this.o.qrColor||('rgb('+DEEP.join()+')');
  for(var i=0;i<this.cells.length;i++){ var q=this.cells[i],x0=Math.round(pad+q.c*m),y0=Math.round(pad+q.r*m); g.fillRect(x0,y0,Math.round(pad+(q.c+1)*m)-x0,Math.round(pad+(q.r+1)*m)-y0); }
  var mips=[oc],z=S; while(z>8){ z=Math.round(z/2); var c=document.createElement('canvas'),cg=c.getContext('2d'); c.width=c.height=z; cg.imageSmoothingQuality='high'; cg.drawImage(mips[mips.length-1],0,0,z,z); mips.push(c); }
  this.oc=oc; this.mips=mips; this.sm=document.createElement('canvas'); };
P._draw=function(sec){ var cv=this.cv,g=cv.getContext('2d'),S=230*this.dpr; g.clearRect(0,0,S,S); if(sec<0||!this.oc)return;
  var p=Math.max(0,Math.min(1,(sec-.1)/1.9)),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
  if(p>=1){ g.drawImage(this.oc,0,0); return; }
  var B=Math.round(Math.pow(2,Math.log2(5)+(Math.log2(130)-Math.log2(5))*e)),k=0; while(k<this.mips.length-1&&this.mips[k+1].width>=B)k++;
  var sm=this.sm,sg; sm.width=sm.height=B; sg=sm.getContext('2d'); sg.imageSmoothingEnabled=true; sg.imageSmoothingQuality='high'; sg.drawImage(this.mips[k],0,0,B,B);
  g.imageSmoothingEnabled=false; g.globalAlpha=Math.min(1,p*5); g.drawImage(sm,0,0,B,B,0,0,S,S);
  if(p>.82){ g.globalAlpha=(p-.82)/.18; g.drawImage(this.oc,0,0); } g.globalAlpha=1; };
P._melt=function(){ var t=this,t0=performance.now(); this.melted=true; this.el.classList.add('m'); this.o.onMelt&&this.o.onMelt();
  (function f(now){ var s=(now-t0)/1000; t._draw(s); if(s<2.2&&t.melted)t.mr=requestAnimationFrame(f); else if(t.melted)t._draw(99); })(t0); };
P._go=function(target,dur){ var t=this,s=this.e,t0=performance.now(),reduce=root.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches,d=reduce?1:dur*Math.abs(target-s);
  cancelAnimationFrame(this.raf);
  (function f(now){ var p=Math.min(1,(now-t0)/d),k=p*p*p*(p*(6*p-15)+10); t.e=s+(target-s)*k; t._apply(t.e); if(t.o.onFrame)t.o.onFrame(t.e);
    if(target===1){ if(t.e>.5)t.el.classList.add('go'); if(t.e>.55&&!t.melted&&!t.o.noMelt)t._melt(); }
    if(p<1)t.raf=requestAnimationFrame(f); else if(target===1&&t.o.onDone)t.o.onDone(); else if(target===0){t.el.classList.remove('on');t.el.setAttribute('aria-hidden','true');} })(t0); };
P.open=function(dur){ var t=this; if(this.isOpen)return; this.isOpen=true; this._tick(); this.lastFocus=document.activeElement; document.addEventListener('keydown',this._onKey);
  this.el.classList.remove('go','m'); this.melted=false; cancelAnimationFrame(this.mr); this._draw(-1); this.e=0; this._apply(0);
  this.el.classList.add('on'); this.el.removeAttribute('aria-hidden'); this.el.querySelector('.cl').focus&&setTimeout(function(){t.el.querySelector('.x').focus()},50);
  setTimeout(function(){ t._go(1,dur||4300); },250); };
/** Opens already finished: camera landed, QR fully formed, no replay of the reveal. */
P.showFinal=function(){ var t=this; if(this.isOpen)return; this.isOpen=true; this._tick(); this.lastFocus=document.activeElement; document.addEventListener('keydown',this._onKey);
  cancelAnimationFrame(this.raf); cancelAnimationFrame(this.mr); this.melted=true; this.e=1; this._apply(1);
  if(this.o.roofQR){ this._rq(99); } else { this._draw(99); }
  this.el.classList.add('on','go','m'); this.el.removeAttribute('aria-hidden');
  setTimeout(function(){var x=t.el.querySelector('.x'); x&&x.focus&&x.focus()},50); };
P.close=function(){ if(!this.isOpen)return; this.isOpen=false; document.removeEventListener('keydown',this._onKey); this.melted=false; cancelAnimationFrame(this.mr);
  this.el.classList.remove('m','go'); this._draw(-1); this._go(0,2200); if(this.lastFocus&&this.lastFocus.focus)this.lastFocus.focus(); this.o.onClose&&this.o.onClose(); };
P.destroy=function(){ cancelAnimationFrame(this.raf); cancelAnimationFrame(this.mr); cancelAnimationFrame(this.dr); document.removeEventListener('keydown',this._onKey); this.ro&&this.ro.disconnect(); this.el.remove(); };
BookingQR3D.setMuted=function(b){ MUTE=!!b; }; BookingQR3D._snd=snd;
root.BookingQR3D=BookingQR3D;
if(typeof module!=='undefined')module.exports=BookingQR3D;
})(typeof window!=='undefined'?window:this);

export default __root.BookingQR3D as any;
