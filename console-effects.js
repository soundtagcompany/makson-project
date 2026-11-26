// One moving focus frame per document. Text, forms and video render at native resolution.
// Only the decorative canvas and pixel icons provide low-resolution artwork.
export function attachConsoleEffects(settings){
 const reduced=()=>!settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 installConsoleLife(settings);
 // Keep experimental resampling disabled: it removes strokes from native text.
 let audio=null,noise=null,lastSwitch=-1,lastClick=-1;
 function unlock(){
  if(!settings.sound)return;
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audio||=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
 }
 function tickSound(kind){
  if(!settings.sound||!audio||audio.state!=='running')return;
  const t=audio.currentTime,volume=Math.max(0,Math.min(1,settings.effectsVolume));
  if(volume<=0)return;
  if(kind==='switch'){if(t-lastSwitch<.09)return;lastSwitch=t;}else{if(t-lastClick<.09)return;lastClick=t;}
  if(kind==='enter'||kind==='click'){
   // A soft rounded opening cue, with no noisy transient or abrupt attack.
   for(const [frequency,delay,level] of (kind==='click'?[[330,0,.038]]:[[294,0,.045],[440,.055,.022]])){
    const tone=audio.createOscillator(),amp=audio.createGain(),start=t+delay;
    tone.type='sine';tone.frequency.value=frequency;
    amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(volume*level,start+.045);
    amp.gain.exponentialRampToValueAtTime(.0001,start+.25);amp.gain.linearRampToValueAtTime(0,start+.28);
    tone.connect(amp).connect(audio.destination);tone.start(start);tone.stop(start+.29);
    tone.onended=()=>{tone.disconnect();amp.disconnect();};
   }
   return;
  }
  if(!noise){noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.035),audio.sampleRate);const data=noise.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647*2-1)*Math.exp(-i/(audio.sampleRate*.006));}}
  const tap=(delay,freq,gain,duration)=>{
   const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),amp=audio.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=.65;amp.gain.setValueAtTime(volume*gain,t+delay);amp.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);source.connect(filter).connect(amp).connect(audio.destination);source.start(t+delay);source.stop(t+delay+duration);source.onended=()=>{source.disconnect();filter.disconnect();amp.disconnect();};
  };
  if(kind==='switch')tap(0,1600,.065,.024);
  else{tap(0,1100,.27,.035);tap(.028,680,.13,.04);}
 }
 document.addEventListener('console-ui-sound',e=>{unlock();tickSound(e.detail);});
 const docs=new WeakSet();
 function setup(doc){
  if(docs.has(doc))return;docs.add(doc);
  const view=doc.defaultView,ring=doc.createElement('div');ring.className='console-focus-frame';ring.setAttribute('aria-hidden','true');doc.body.append(ring);
  // The embedded board has its own style sheet; its frame uses these same geometry rules.
  const style=doc.createElement('style');style.textContent='.console-focus-frame{position:fixed;left:0;top:0;z-index:2147483646;box-sizing:border-box;pointer-events:none!important;margin:0;border:1px solid currentColor;border-radius:2px!important;color:#45f293;opacity:0;background:#42ff9210;transition:opacity 260ms ease,color 280ms ease;box-shadow:0 0 9px #40ff9255,inset 0 0 10px #40ff920a!important;contain:strict;will-change:transform,opacity}.console-focus-frame.is-visible{opacity:.8}';doc.head.append(style);
  let target=null,current=null,frame=0,last=0,hideTimer=0,layoutUntil=0;
  const selector='button:not(:disabled),summary,a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[role="button"]';
  const velocity={x:0,y:0,w:0,h:0};
  function host(){const root=doc.fullscreenElement||doc.webkitFullscreenElement||doc.body;if(ring.parentElement!==root)root.append(ring);return root;}
  function hide(){target=null;ring.classList.remove('is-visible');view.cancelAnimationFrame(frame);frame=0;last=0;current=null;for(const k in velocity)velocity[k]=0;}
  function step(now){
   frame=0;if(!target?.isConnected||doc.hidden||target.closest('[hidden],[inert]')){hide();return;}
   const r=target.getBoundingClientRect();if(!r.width||!r.height){hide();return;}
   const root=host(),z=parseFloat(view.getComputedStyle(doc.body).zoom)||1,origin=root===doc.body?{x:0,y:0}:root.getBoundingClientRect();
   const to={x:(r.x-origin.x)/z-3,y:(r.y-origin.y)/z-3,w:r.width/z+6,h:r.height/z+6};
   const dt=(last?Math.min(50,now-last):16)/1000;last=now;
   if(!current)current={...to};let distance=0;
   for(const key of ['x','y','w','h']){
    if(reduced()){current[key]=to[key];velocity[key]=0;}else{
     const delta=current[key]-to[key],v=velocity[key],omega=20,decay=Math.exp(-omega*dt),c=v+omega*delta;
     current[key]=to[key]+(delta+c*dt)*decay;velocity[key]=(v-omega*c*dt)*decay;
    }
    distance+=Math.abs(to[key]-current[key])+Math.abs(velocity[key])*.02;
   }
   ring.style.transform=`translate3d(${current.x}px,${current.y}px,0)`;if(!ring._size||Math.abs(current.w-ring._size.w)>.02||Math.abs(current.h-ring._size.h)>.02){ring.style.width=current.w+'px';ring.style.height=current.h+'px';ring._size={w:current.w,h:current.h};}
   if(distance>.12||now<layoutUntil)frame=view.requestAnimationFrame(step);else last=0;
  }
  function wake(){if(target&&!frame&&!doc.hidden)frame=view.requestAnimationFrame(step);}
  function choose(el,feedback=true){
   if(!el||el.closest('[hidden],[inert],#console-boot'))return;
   clearTimeout(hideTimer);if(target===el){wake();return;}
   target=el;host();ring.style.color=view.getComputedStyle(el).color;ring.classList.add('is-visible');layoutUntil=performance.now()+650;wake();if(feedback)tickSound('switch');
  }
  doc.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=e.target.closest(selector);if(el)choose(el);else if(target){clearTimeout(hideTimer);hideTimer=setTimeout(hide,180);}},true);
  doc.addEventListener('focusin',e=>choose(e.target.closest(selector)),true);
  doc.addEventListener('pointerdown',e=>{unlock();if(e.pointerType==='touch')choose(e.target.closest(selector),false);},true);
  doc.addEventListener('keydown',unlock,true);
  doc.addEventListener('click',e=>{
   if(e.target.closest(selector)){
    const opening=e.target.closest('[data-select-app][aria-pressed="true"],.node-selected,[data-pip-app],.console-task button:first-child,#chat-launcher[aria-expanded="false"],#console-settings[aria-expanded="false"],[data-open]');
    unlock();tickSound(opening?'enter':'click');layoutUntil=performance.now()+650;wake();
   }
   if(!reduced()&&e.target.closest('[data-overview],[data-social=dialogs],[data-social=friends]'))view.requestAnimationFrame(()=>{
    const pane=[...doc.querySelectorAll('#svyaz-root,#svyaz-chat,.sv-contacts')].find(el=>!el.hidden&&el.getBoundingClientRect().height>0);
    if(pane){pane.getAnimations().forEach(a=>a.cancel());pane.animate([{opacity:.25,translate:'0 7px'},{opacity:1,translate:'0 0'}],{duration:300,easing:'cubic-bezier(.2,.75,.2,1)'});}
   });
  },true);
  doc.addEventListener('scroll',()=>{layoutUntil=performance.now()+150;wake();},true);view.addEventListener('resize',()=>{layoutUntil=performance.now()+500;wake();});
  for(const type of ['fullscreenchange','windowhide','windowfocus'])doc.addEventListener(type,()=>{layoutUntil=performance.now()+500;wake();});
  doc.addEventListener('desktopfullscreenchange',hide);
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)hide();});doc.documentElement.addEventListener('pointerleave',()=>{hideTimer=setTimeout(hide,130);});view.addEventListener('pagehide',hide);
  // Keep details semantically native while interpolating both expansion and collapse.
  const folds=new WeakMap();
  doc.addEventListener('click',e=>{
   const summary=e.target.closest('summary'),details=summary?.parentElement,content=details?.querySelector('.catalog-items,.game-menu-fold-body');if(!content||reduced())return;
   e.preventDefault();const old=folds.get(details),opening=old?!old.opening:!details.open,start=details.open?content.getBoundingClientRect().height/(parseFloat(view.getComputedStyle(doc.body).zoom)||1):0;
   old?.animation.cancel();details.open=true;content.style.overflow='hidden';const end=opening?content.scrollHeight:0;
   const animation=content.animate([{height:start+'px',opacity:opening?.25:1},{height:end+'px',opacity:opening?1:0}],{duration:340,easing:'cubic-bezier(.2,.75,.2,1)',fill:'both'});folds.set(details,{animation,opening});
   animation.finished.then(()=>{if(folds.get(details)?.animation!==animation)return;details.open=opening;animation.cancel();content.style.overflow='';folds.delete(details);layoutUntil=performance.now()+250;wake();}).catch(()=>{});
  },true);
 }
 setup(document);
 document.addEventListener('console-pip-ready',e=>setup(e.detail));
 const board=document.getElementById('importopoly-frame');board?.addEventListener('load',()=>{try{setup(board.contentDocument);}catch{}});
 document.addEventListener('settingschange',()=>{if(!settings.sound&&audio?.state==='running')audio.suspend().catch(()=>{});});
 return {sound:kind=>{unlock();tickSound(kind);}};
}

// Temporary choreography: live nodes stay in place and all transforms are disposable.
function installConsoleLife(settings){
 const doc=document;
 let flightTimer,flight=[],shaking=false,flying=false;const savedInert=new Map();
 const allowed=()=>settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 doc.addEventListener('windowfocus',()=>{if(flying||shaking)reset();});
 const pieces=()=>[...doc.querySelectorAll('.desktop-header,#app-catalog,#catalog-toggle,#console-dock,.console-panel:not([hidden]),[data-sphere-app]')];
 function reset(){clearTimeout(flightTimer);flight.forEach(a=>a.cancel());flight=[];flying=false;shaking=false;doc.body.style.setProperty('--sphere-jitter','0px');doc.body.classList.remove('sphere-flight','sphere-shaking');doc.dispatchEvent(new CustomEvent('sphere-flight-change',{detail:false}));for(const [el,value] of savedInert)el.inert=value;savedInert.clear();doc.dispatchEvent(new Event('sphere-reset'));}
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(flying||shaking)){e.preventDefault();e.stopImmediatePropagation();reset();}},true);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&(flying||shaking))reset();});
 doc.addEventListener('settingschange',()=>{if(!allowed()&&(flying||shaking))reset();});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(!allowed())reset();});
 doc.addEventListener('sphere-energy',e=>{
  if(!allowed()||flying)return;const energy=e.detail;
  const ramp=Math.max(0,Math.min(1,(energy-4)/5)),smooth=ramp*ramp*(3-2*ramp);shaking=energy>=4;doc.body.style.setProperty('--sphere-jitter',(smooth*7).toFixed(3)+'px');doc.body.style.setProperty('--sphere-period',(300-smooth*160).toFixed(0)+'ms');doc.body.classList.toggle('sphere-shaking',shaking);
  if(energy<9)return;flying=true;doc.body.classList.remove('sphere-shaking');doc.body.classList.add('sphere-flight');doc.dispatchEvent(new CustomEvent('sphere-flight-change',{detail:true}));
  const nodes=pieces();nodes.forEach((el,i)=>{savedInert.set(el,el.inert);el.inert=true;const angle=i*2.399+.5,distance=Math.max(innerWidth,innerHeight)*1.4;const a=el.animate([{translate:'0 0',rotate:'0deg',opacity:1},{translate:`${Math.cos(angle)*12}px ${Math.sin(angle)*12}px`,rotate:(i%2?2:-2)+'deg',opacity:1,offset:.22},{translate:`${Math.cos(angle)*distance}px ${Math.sin(angle)*distance}px`,rotate:(i%2?35:-30)+'deg',opacity:0}],{duration:1800+i%3*120,delay:Math.min(i*45,400),easing:'cubic-bezier(.45,0,.75,.25)',fill:'forwards'});flight.push(a);});
  flightTimer=setTimeout(()=>{flight.forEach(a=>a.cancel());flight=[];for(const el of nodes){el.inert=savedInert.get(el)||false;flight.push(el.animate([{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'}));}doc.body.classList.remove('sphere-flight');doc.dispatchEvent(new CustomEvent('sphere-flight-change',{detail:false}));doc.dispatchEvent(new Event('sphere-reset'));flightTimer=setTimeout(reset,700);},6000);
 });
}


// Experimental native-control / low-resolution paint split. No inputs, chats or media are sampled.
function installRasterScreen(){
 const scope='.desktop-header,#app-catalog,.window>.titlebar,#window-svyaz .overview-tabs,#svyaz-root .sv-auth-wrap';
 const contrast=matchMedia('(forced-colors:active)'),surfaces=new Map();
 let frame=0;
 const style=document.createElement('style');style.textContent=`
 [data-screen-raster]{isolation:isolate}
 [data-screen-raster]:not(.sv-auth-wrap)>*:not(.screen-raster-canvas){opacity:0!important}
 [data-screen-raster].sv-auth-wrap{position:relative}
 [data-screen-raster-position]{position:relative!important}
 .desktop-header[data-screen-raster] #chat-launcher{min-width:108px}
 .desktop-header[data-screen-raster] #svyaz-signin-hint{min-width:66px}
 .overview-tabs[data-screen-raster]>button{min-width:64px}
 .titlebar[data-screen-raster]>span{flex:1;min-width:0}
 [data-screen-raster].sv-auth-wrap :is([data-raster-label],button,small,.sv-strip,.sv-wordmark,.sv-auth-note){opacity:0!important}
 [data-screen-raster].sv-auth-wrap :is(input,textarea,select){position:relative;z-index:50001;}
 [data-screen-raster]>.screen-raster-canvas{position:absolute;z-index:50000;inset:0 auto auto 0;
  pointer-events:none!important;image-rendering:pixelated!important;max-width:none!important;max-height:none!important;}
 @media(forced-colors:active){[data-screen-raster]>*:not(.screen-raster-canvas){opacity:revert!important}
  [data-screen-raster]>.screen-raster-canvas{display:none!important}}`;
 document.head.append(style);
 function enqueue(){if(!frame)frame=requestAnimationFrame(paint);}
 function unmount(el,s){s.canvas.remove();delete el.dataset.screenRaster;delete el.dataset.screenRasterPosition;surfaces.delete(el);resize.unobserve(el);}
 const resize=new ResizeObserver(enqueue);
 const parseMask=value=>{
  const data=value.match(/data:image\/svg\+xml,([^"')]+)/)?.[1];
  if(!data)return null;
  try{const svg=new DOMParser().parseFromString(decodeURIComponent(data),'image/svg+xml').documentElement;
   const cells=svg.getAttribute('viewBox').split(/\s+/).map(Number),d=svg.querySelector('path').getAttribute('d');
   const pixels=[...d.matchAll(/M(\d+) (\d+)h1v1h-1Z/g)].map(n=>[Number(n[1]),Number(n[2])]);
   return pixels.length?{cols:cells[2],rows:cells[3],pixels}:null;}catch{return null;}
 };
 const masks=new Map();
 // Original 5×7/8 terminal glyphs; each hex row is five binary screen cells.
 const romans={
  A:'0e11111f111111',B:'1e11111e11111e',C:'0f10101010100f',D:'1e11111111111e',E:'1f10101e10101f',F:'1f10101e101010',
  G:'0f10101711110f',H:'1111111f111111',I:'0e04040404040e',J:'0702020212120c',K:'11121418141211',L:'1010101010101f',
  M:'111b1515111111',N:'11191513111111',O:'0e11111111110e',P:'1e11111e101010',Q:'0e11111115120d',R:'1e11111e141211',
  S:'0f10100e01011e',T:'1f040404040404',U:'1111111111110e',V:'11111111110a04',W:'11111115151b11',X:'11110a040a1111',
  Y:'11110a04040404',Z:'1f01020408101f',
  '0':'0e11131519110e','1':'040c040404040e','2':'0e11010204081f','3':'1e01010601011e','4':'02060a121f0202',
  '5':'1f10101e01011e','6':'0e10101e11110e','7':'1f010204080808','8':'0e11110e11110e','9':'0e11110f01010e',
  ' ':'00000000000000','-':'0000001f000000','−':'0000001f000000','_':'0000000000001f','.':'00000000000c0c',',':'00000000000c08',
  '!':'04040404040004','?':'0e110102040004',':':'00040c00040c00','/':'01010204081010','+':'0004041f040400',
  '›':'00080402040800','>':'10080402040810','‹':'00020408040200','<':'01020408040201','→':'0004021f020400','←':'0004081f080400',
  '·':'00000004000000','(':'02040808080402',')':'08040202020408','%':'19190204081313','&':'0c12140815120d',
  '–':'0000001f000000','—':'0000001f000000','№':'090d0b09091700','«':'00050912090500','»':'00141209121400'
 };
 const russian={
  А:'A',В:'B',Е:'E',З:'3',К:'K',М:'M',Н:'H',О:'O',Р:'P',С:'C',Т:'T',У:'Y',Х:'X',
  Б:'1f10101e11111e',Г:'1f101010101010',Д:'060a0a0a0a1f1111',Ё:'0a001f101e101f00',Ж:'1515150e151515',
  И:'11131315191911',Й:'0a04111315191111',Л:'07090909090911',П:'1f111111111111',Ф:'041f1515151f04',
  Ц:'12121212121f01',Ч:'1111110f010101',Ш:'1515151515151f',Щ:'1515151515151f01',Ъ:'1810080e09090e',
  Ы:'11111119151519',Ь:'1010101e11111e',Э:'1e01010f01011e',Ю:'1215151d151512',Я:'0f11110f050911',
 };
 const glyphs=new Map();
 function glyph(character){
  const c=character.toLocaleUpperCase('ru');
  if(glyphs.has(c))return glyphs.get(c);
  const ref=russian[c],rows=(ref?.length===1?romans[ref]:ref)||romans[c]||romans['?'];
  const out=rows.match(/../g).map(n=>parseInt(n,16));glyphs.set(c,out);return out;
 }

 function paint(){
  frame=0;
  const hosts=[...document.querySelectorAll(scope)].filter(el=>!el.closest('[hidden]')&&el.getBoundingClientRect().width>0);
  for(const [el,s] of surfaces)if(!hosts.includes(el)||contrast.matches)unmount(el,s);
  if(contrast.matches)return;
  for(const el of hosts){
   let s=surfaces.get(el);
   if(!s){const canvas=document.createElement('canvas');canvas.className='screen-raster-canvas';canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');
    if(!ctx)continue;el.append(canvas);resize.observe(el);s={canvas,ctx};surfaces.set(el,s);}
   try{if(getComputedStyle(el).position==='static')el.dataset.screenRasterPosition='1';draw(el,s);el.dataset.screenRaster='1';}catch{unmount(el,s);}
  }
 }
 function draw(host,{canvas,ctx}){
  if(host.matches('.sv-auth-wrap'))for(const label of host.querySelectorAll('label')){
   for(const n of [...label.childNodes])if(n.nodeType===3&&n.data.trim()){
    const span=document.createElement('span');span.dataset.rasterLabel='';n.replaceWith(span);span.append(n);
   }
  }
  const hostStyle=getComputedStyle(host),zoom=Number(getComputedStyle(document.body).zoom)||1;
  const base=host.getBoundingClientRect(),vw=host.clientWidth,vh=host.clientHeight;
  const physical=(window.devicePixelRatio||1)*zoom,cell=Math.max(2,Math.round(2*physical))/physical;
  const cw=Math.floor(vw/cell),ch=Math.floor(vh/cell);
  if(cw<1||ch<1||cw*ch>1000000)throw Error('Unusable surface');
  if(canvas.width!==cw)canvas.width=cw;if(canvas.height!==ch)canvas.height=ch;
  canvas.style.width=cw*cell+'px';canvas.style.height=ch*cell+'px';
  canvas.style.top=host.scrollTop+'px';canvas.style.left=host.scrollLeft+'px';
  const slot=r=>({x:Math.round((r.left-base.left)/zoom/cell),y:Math.round((r.top-base.top)/zoom/cell),w:Math.round(r.width/zoom/cell),h:Math.round(r.height/zoom/cell)});
  ctx.clearRect(0,0,cw,ch);
  const clear=c=>!c||c==='transparent'||/rgba\([^)]*,\s*0\s*\)$/.test(c);
  function fill(color,x,y,w,h){if(w>0&&h>0&&!clear(color)){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}}
  function bevel(r,c,h=1){
   fill(c,r.x+1,r.y,r.w-2,h);fill(c,r.x+1,r.y+r.h-h,r.w-2,h);
   fill(c,r.x,r.y+1,h,r.h-2);fill(c,r.x+r.w-h,r.y+1,h,r.h-2);
  }
  ctx.imageSmoothingEnabled=false;
  fill(hostStyle.backgroundColor,0,0,cw,ch);
  if(clear(hostStyle.backgroundColor))fill('#060908',0,0,cw,ch);
  let seed=37;const amber=host.matches('.desktop-header');
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   seed=Math.imul(seed,1664525)+1013904223|0;
   if((seed>>>28)<5)fill(amber?'#8f446c0d':'#4294670e',x,y,1,1);
  }
  if(host.matches('.desktop-header,.titlebar'))fill(hostStyle.borderBottomColor,0,ch-2,cw,1);
  if(host.id==='app-catalog')fill(hostStyle.borderRightColor,cw-1,0,1,ch);
  function bitmapText(node,ps){
   if(!node.data.trim())return;
   const range=document.createRange();range.selectNodeContents(node);
   const boxes=[...range.getClientRects()].filter(r=>r.width&&r.height);
   if(!boxes.length)return;
   const element=node.parentElement;
   const chars=Array.from(node.data.trim());
   const wrapOwner=element.closest('.catalog-app-name')?.closest('button')||element.closest('#chat-launcher')||element;
   const bounds=slot(wrapOwner.getBoundingClientRect()),group=slot(boxes[0]);
   const catalog=!!element.closest('.catalog-app-name'),heading=element.matches('h1');
   const header=heading&&host.matches('.desktop-header');
   const chat=!!element.closest('#chat-launcher'),counter=element.matches('summary>span,.titlebar b');
   let left=group.x,end=Math.min(cw-1,bounds.x+bounds.w-(catalog?7:1));
   const center=header||element.matches('button')&&!element.id||element.matches('#svyaz-signin-hint');
   if(center)left=bounds.x+1;
   if(header){
    const gear=host.querySelector('#console-settings'),actions=host.querySelector('.console-actions');
    if(gear&&actions){const g=slot(gear.getBoundingClientRect()),a=slot(actions.getBoundingClientRect());left=g.x+g.w+3;end=a.x-3;}
   }
   if(chat&&wrapOwner.id==='chat-launcher'){left=Math.min(left,bounds.x+13);end=Math.min(cw-2,bounds.x+bounds.w-2);}
   if(counter){left=Math.max(1,group.x-2);end=Math.min(cw-2,group.x+7);}
   const avail=end-left;
   if(avail<3)return;
   const widths=chars.map(c=>c===' '?3:'!.,:·'.includes(c)?3:5);
   const desired=widths.reduce((a,b)=>a+b,0)+chars.length-1;
   const glyphWidth=desired<=avail?5:4;
   const spacing=widths.reduce((sum,w)=>sum+Math.min(w,glyphWidth)+1,-1)<=avail?1:0;
   const advance=widths.map(w=>Math.min(w,glyphWidth)+spacing);
   const total=advance.reduce((a,b)=>a+b,0)-spacing;
   const centered=header?Math.floor((cw-total)/2):Math.floor((left+end-total)/2);
   let x=center?Math.max(left,Math.min(end-total,centered)):left;
   const y=group.y+Math.floor((group.h-7)/2);
   for(let i=0;i<chars.length&&x<end;i++){
    const c=chars[i],rows=glyph(c);
    for(let j=0;j<rows.length;j++)for(let k=0;k<glyphWidth;k++){
     const col=glyphWidth===4?[0,1,3,4][k]:k;
     const ox=widths[i]===3?k-1:k;
     if(ox>=0&&ox<advance[i]&&x+ox<end&&(rows[j]&(16>>col)))fill(ps.color,x+ox,y+j,1,1);
    }
    x+=advance[i];
   }
  }
  function sprite(e,r){
   const before=getComputedStyle(e,'::before'),after=getComputedStyle(e,'::after');
   if(!masks.has(before.maskImage))masks.set(before.maskImage,parseMask(before.maskImage));
   const mask=masks.get(before.maskImage);
   if(mask){
    const dw=Math.round(parseFloat(before.width)/cell),dh=Math.round(parseFloat(before.height)/cell);
    const size=Math.max(1,Math.floor(Math.min(dw/mask.cols,dh/mask.rows)));
    const centered=e.matches('.catalog-app-icon,#console-settings,[data-action=maximize]');
    const x=(centered?r.x+Math.round((r.w-dw)/2):r.x+3)+Math.round((dw-size*mask.cols)/2);
    const y=r.y+Math.round((r.h-size*mask.rows)/2),color=getComputedStyle(e).color;
    for(const [dx,dy] of mask.pixels)fill(color,x+dx*size,y+dy*size,size,size);
   }else if(after.content!=='none'&&e.matches('[data-action=close],[data-action=minimize]')){
    const x=r.x+Math.round(r.w/2)-3,y=r.y+Math.round(r.h/2)-3,c=getComputedStyle(e).color;
    if(e.matches('[data-action=minimize]'))fill(c,x,y+4,7,1);
    else for(let i=0;i<7;i++){fill(c,x+i,y+i,1,1);fill(c,x+6-i,y+i,1,1);}
   }
  }
  function walk(e){
   if(e===canvas||e.matches('svg,input,textarea,select,video,img,canvas,iframe'))return;
   const ps=getComputedStyle(e),r=slot(e.getBoundingClientRect());
   if(ps.display==='none'||ps.visibility==='hidden'||r.y+r.h<0||r.y>ch)return;
   if(e.matches('.catalog-row,summary,button')){
    let bg=ps.backgroundColor;
    if(e.matches('.catalog-row:not(.selected)'))bg=e.matches(':hover,:focus-within')?'#143526':'#0b1a14';
    if(e.matches('button:focus-visible,summary:focus-visible'))bg='#19392b';
    fill(bg,r.x+1,r.y+1,r.w-2,r.h-2);
    const border=e.matches(':focus-visible')?ps.color:ps.borderTopColor;
    if(e.matches('.catalog-row')||parseFloat(ps.borderTopWidth)>0||e.matches(':focus-visible'))bevel(r,border);
    if(e.matches('.overview-tabs>button[aria-selected=true]'))fill(ps.color,r.x+2,r.y+r.h-2,r.w-4,1);
   }
   if(e.matches('summary')){
    const y=r.y+Math.round(r.h/2);fill(ps.color,r.x+2,y,4,1);
    if(!e.parentElement.open)fill(ps.color,r.x+4,y-2,1,5);
   }
   if(e.matches('[data-app-link],[data-action=pip],[data-pip-app]')){
    const pattern=e.matches('[data-app-link]')?['0011100','0100100','1001000','0010010','0100100','0101000','0110000']:['1111111','1000001','1000001','1001111','1001001','1001111','1111111'];
    const x=r.x+Math.round(r.w/2)-3,y=r.y+Math.round(r.h/2)-3;
    pattern.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')fill(ps.color,x+i,y+j,1,1);}));
   }
   if(e.matches('.catalog-caret')&&!e.closest('.selected')&&!e.closest('.catalog-row')?.matches(':hover,:focus-within'))return;
   sprite(e,r);
   for(const n of e.childNodes){
    if(n.nodeType===1)walk(n);
    else if(n.nodeType===3){
     if(e.matches('[data-action=close],[data-action=minimize],[data-action=maximize]'))continue;
     bitmapText(n,ps);
    }
   }
  }
  for(const root of host.children)walk(root);
 }
 const observer=new MutationObserver(records=>{
  if(records.some(r=>!r.target.closest?.('.screen-raster-canvas')&&r.attributeName!=='data-screen-raster'
   &&(r.target.closest?.(scope)||r.target===document.body||r.attributeName==='hidden'||r.type==='childList'&&r.target.closest?.('.window'))))enqueue();
 });
 observer.observe(document.body,{subtree:true,attributes:true,childList:true,characterData:true,attributeFilter:['class','hidden','open','aria-pressed','style','aria-expanded']});
 for(const event of ['scroll','pointerover','pointerout','focusin','focusout','windowfocus','windowhide','transitionend','animationend','toggle','console-scale-change','console-boot-change'])
  document.addEventListener(event,enqueue,true);
 window.addEventListener('resize',enqueue);contrast.addEventListener('change',enqueue);
 document.fonts?.ready.then(enqueue);enqueue();
}

// Treat the composited UI as one pixel screen. Each physical pixel in the
// repeating map samples the same coordinate within its logical screen cell.
// The explicit preview URL remains independent of the settings panel.
// Probe real SVG pixels rather than relying on CSS.supports or guessing
// from an iPhone label. Apple ports can choose a different rendering path.
async function chooseDisplacementEncoding(physical){
 const defaultEncoding=null, size=physical*12, height=physical*4;
 const tile=document.createElement("canvas");tile.width=tile.height=physical;
 const miniature=document.createElement("canvas");miniature.width=size;miniature.height=height;
 const tileContext=tile.getContext("2d"), output=miniature.getContext("2d",{willReadFrequently:true});
 if(!tileContext||!output)return defaultEncoding;
 const palette=["#f00","#00f","#0f0","#ff0","#000","#f0f","#0ff"];
 let stripes="";
 for(let x=0;x<size;x++)stripes+=`<rect x="${x}" width="1" height="${height}" fill="${palette[x%palette.length]}"/>`;
 const score=async neg=>{
  const data=tileContext.createImageData(physical,physical);
  fillDisplacementTile(data,physical,neg);
  tileContext.putImageData(data,0,0);
  const src=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}"><defs><filter id="probe" x="0" y="0" width="${size}" height="${height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${tile.toDataURL()}" x="0" y="0" width="${physical}" height="${physical}" result="matrix"/><feTile in="matrix" result="grid"/><feDisplacementMap in="SourceGraphic" in2="grid" scale="${physical}" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g style="filter:url(#probe)">${stripes}</g></svg>`;
  const img=new Image();
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(reject,900);
   img.onload=()=>{clearTimeout(timer);resolve();};
   img.onerror=()=>{clearTimeout(timer);reject();};
   img.src="data:image/svg+xml,"+encodeURIComponent(src);
  });
  output.clearRect(0,0,size,height);output.drawImage(img,0,0);
  const values=output.getImageData(0,physical*2,size,1).data;
  let uniform=0;const visible=new Set();
  for(let x=physical;x<size-physical;x+=physical){
   const k=x*4, sample=Array.from(values.slice(k,k+4)).join();
   if(values[k+3]!==255)continue;
   visible.add(sample);
   if(Array.from({length:physical},(_,i)=>sample===Array.from(values.slice(k+4*i,k+4*i+4)).join()).every(Boolean))uniform++;
  }
  return visible.size>2?uniform:0;
 };
 try{
  // The scratch canvas is reused sequentially; these images never enter the page.
  const standard=await score(false), signed=await score(true);
  if(Math.max(standard,signed)!==10||standard===signed)return defaultEncoding;
  return signed>standard;
 }catch{return defaultEncoding;}
}

function fillDisplacementTile(bytes,physical,negativeBias){
 const center=Math.floor(physical/2);
 const offset=i=>{
  const delta=center-i;
  const signed=negativeBias&&delta<0?delta-1:delta;
  return Math.round(255*(.5+signed/physical));
 };
 for(let y=0;y<physical;y++)for(let x=0;x<physical;x++){
  bytes.data.set([offset(x),offset(y),128,255],4*(y*physical+x));
 }
}

function installWholeScreenRaster(){
 const root=document.documentElement, ns="http://www.w3.org/2000/svg", step=2;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const chromium=/Chrom(?:e|ium)\/|Edg\/|OPR\//.test(navigator.userAgent);
 const mobileWebKit=ios&&!chromium;
 const forced=matchMedia("(forced-colors: active)"), contrast=matchMedia("(prefers-contrast: more)");
 if(!CSS.supports("filter","url(#makson-screen-raster)"))return;
 const create=(tag,attrs={})=>{
  const node=document.createElementNS(ns,tag);
  for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
  return node;
 };
 const svg=create("svg",{width:0,height:0,"aria-hidden":"true",focusable:"false",
  style:"position:absolute;width:0;height:0;overflow:hidden;pointer-events:none"});
 const filter=create("filter",{id:"makson-screen-raster",filterUnits:"userSpaceOnUse",
  x:0,y:0,"color-interpolation-filters":"sRGB"});
 const tile=create("feImage",{x:0,y:0,width:step,height:step,preserveAspectRatio:"none",result:"matrix"});
 const displacement=create("feDisplacementMap",{in:"videoSignal",in2:"grid",scale:step,xChannelSelector:"R",yChannelSelector:"G"});
 filter.append(create("feGaussianBlur",{in:"SourceGraphic",stdDeviation:".30",edgeMode:"duplicate",result:"videoSignal"}),tile,create("feTile",{in:"matrix",result:"grid"}),displacement);
 svg.append(filter);
 const surface=document.createElement("canvas"), ctx=surface.getContext("2d");
 if(!ctx)return;
 const style=document.createElement("style");
 style.textContent='html[data-makson-pixel-screen]{filter:url("#makson-screen-raster")}';
 document.head.append(style);document.body.append(svg);
 let factor=0, frame=0, pendingImage=null, densityWatch=null, usable=false;
 let negativeBias=mobileWebKit, calibrated=!mobileWebKit;
 const apply=()=>{
  if(usable&&!forced.matches&&!contrast.matches&&!document.fullscreenElement)
   root.setAttribute("data-makson-pixel-screen","");
  else root.removeAttribute("data-makson-pixel-screen");
 };
 const sync=()=>{
  frame=0;
  const dpr=window.devicePixelRatio||1;
  const physical=Math.max(2,Math.round(dpr*step)), pitch=physical/dpr;
  filter.setAttribute("width",Math.ceil(innerWidth/pitch)*pitch);
  filter.setAttribute("height",Math.ceil(innerHeight/pitch)*pitch);
  if(!calibrated)return;
  if(dpr===factor)return;
  factor=dpr;
  densityWatch?.removeEventListener("change",schedule);
  densityWatch=matchMedia(`(resolution: ${dpr}dppx)`);
  densityWatch.addEventListener("change",schedule,{once:true});
  surface.width=surface.height=physical;
  const bytes=ctx.createImageData(physical,physical);
  fillDisplacementTile(bytes,physical,negativeBias);
  ctx.putImageData(bytes,0,0);
  const url=surface.toDataURL();
  const image=new Image();pendingImage=image;
  image.onload=()=>{
   if(pendingImage!==image)return;
   usable=true;
   tile.setAttribute("width",pitch);tile.setAttribute("height",pitch);
   displacement.setAttribute("scale",pitch);
   tile.setAttribute("href",url);
   apply();
  };
  image.onerror=()=>{if(pendingImage===image){usable=false;apply();}};
  image.src=url;
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
 addEventListener("resize",schedule,{passive:true});
 document.addEventListener("fullscreenchange",apply);
 for(const preference of [forced,contrast])preference.addEventListener("change",apply);
 if(mobileWebKit){
  chooseDisplacementEncoding(Math.max(2,Math.round((window.devicePixelRatio||1)*step))).then(choice=>{
   if(choice!==null)negativeBias=choice;
   calibrated=true;schedule();
  });
 }else sync();
}
