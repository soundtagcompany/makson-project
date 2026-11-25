// One sampled screen surface and one moving focus frame per document.
// DOM, forms, live canvases and video remain native; no screenshots or DOM cloning.
export function attachConsoleEffects(settings){
 const reduced=()=>!settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 installPhosphor();
 installConsoleLife(settings);
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
 function installPixel(doc){
  if(doc.getElementById('console-screen-pixels'))return;
  const ns='http://www.w3.org/2000/svg',defs=doc.createElementNS(ns,'svg');defs.setAttribute('width','0');defs.setAttribute('height','0');defs.classList.add('console-pixel-defs');defs.setAttribute('aria-hidden','true');
  // Sample one point per 2 CSS pixels, including Retina screens. A two-physical-pixel
  // map interpolates on phones and leaves their text almost at native resolution.
  const density=Math.max(1,doc.defaultView.devicePixelRatio||1),size=Math.round(2*density);
  const tile=doc.createElement('canvas');tile.width=tile.height=size;const ctx=tile.getContext('2d'),data=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)data.data.set([Math.round(255*(.5+(Math.floor((size-1)/2)-x)/size)),Math.round(255*(.5+(Math.floor((size-1)/2)-y)/size)),128,255],(y*size+x)*4);ctx.putImageData(data,0,0);
  const map=tile.toDataURL(),average=density>1?'<feGaussianBlur in="SourceGraphic" stdDeviation=".45" result="averaged"/>':'<feConvolveMatrix in="SourceGraphic" order="2 2" kernelMatrix="1 1 1 1" divisor="4" targetX="1" targetY="1" result="averaged"/>'; 
  defs.innerHTML=`<defs><filter id="console-screen-pixels" x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${map}" x="0" y="0" width="2" height="2" preserveAspectRatio="none" result="sample-map"/><feTile in="sample-map" result="sample-grid"/>${average}<feDisplacementMap in="averaged" in2="sample-grid" scale="2" xChannelSelector="R" yChannelSelector="G" result="screen-sampled"/><feMerge result="screen-output"><feMergeNode in="screen-sampled"/></feMerge></filter></defs>`;
  defs.querySelector('feImage').setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',map);
  doc.body.append(defs);doc.documentElement.classList.add('console-pixel-screen');doc.documentElement.style.setProperty('filter','url("#console-screen-pixels")','important');
  // Composite the original pixels only inside explicitly marked media rectangles.
  // The screen filter still samples every UI control, including in fullscreen/PiP.
  const filter=defs.querySelector('filter'),merge=filter.querySelector('feMerge'),regions=[],observed=new WeakSet();let exemptFrame=0,settleUntil=0;
  const observer=new doc.defaultView.ResizeObserver(refreshExempt);
  function refreshExempt(){if(!exemptFrame&&!doc.hidden)exemptFrame=doc.defaultView.requestAnimationFrame(updateExempt);}
  function updateExempt(now){
   exemptFrame=0;const surface=doc.fullscreenElement||doc.webkitFullscreenElement||doc.querySelector('.window.fullscreen-fallback')||doc.documentElement;
   const base=surface===doc.documentElement?{x:0,y:0,width:0}:surface.getBoundingClientRect(),scale=surface===doc.documentElement?1:(base.width/surface.offsetWidth||1);
   const elements=[...doc.querySelectorAll('[data-pixel-exempt]')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length);
   for(let i=0;i<Math.max(elements.length,regions.length);i++){
    let region=regions[i];if(!region){const crop=doc.createElementNS(ns,'feOffset');crop.setAttribute('in','SourceGraphic');crop.setAttribute('dx','0');crop.setAttribute('dy','0');crop.setAttribute('result','pristine-media-'+i);filter.insertBefore(crop,merge);const node=doc.createElementNS(ns,'feMergeNode');node.setAttribute('in','pristine-media-'+i);merge.append(node);regions.push(region=crop);}
    const el=elements[i];if(el&&!observed.has(el)){observed.add(el);observer.observe(el);}
    const r=el?.getBoundingClientRect();const rect=r?{x:(r.x-base.x)/scale,y:(r.y-base.y)/scale,width:r.width/scale,height:r.height/scale}:{x:0,y:0,width:0,height:0};
    for(const [key,value]of Object.entries(rect)){const next=String(Math.max(key==='width'||key==='height'?0:-100000,value));if(region.getAttribute(key)!==next)region.setAttribute(key,next);}
   }
   if(now<settleUntil)refreshExempt();
  }
  const settle=()=>{settleUntil=doc.defaultView.performance.now()+550;refreshExempt();};
  for(const event of ['console-pixel-exempt-change','windowfocus','windowhide','desktopfullscreenchange','console-pip-ready'])doc.addEventListener(event,settle);
  doc.addEventListener('scroll',refreshExempt,true);doc.defaultView.addEventListener('resize',settle);doc.addEventListener('visibilitychange',refreshExempt);
  refreshExempt();

 }
 function setup(doc,{pixel=false}={}){
  if(docs.has(doc))return;docs.add(doc);if(pixel)installPixel(doc);
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
 setup(document,{pixel:true});
 document.addEventListener('console-pip-ready',e=>{setup(e.detail,{pixel:true});e.detail.defaultView.requestAnimationFrame(()=>e.detail.dispatchEvent(new Event('console-pixel-exempt-change')));});
 const board=document.getElementById('importopoly-frame');board?.addEventListener('load',()=>{try{setup(board.contentDocument);}catch{}});
 document.addEventListener('settingschange',()=>{if(!settings.sound&&audio?.state==='running')audio.suspend().catch(()=>{});});
 return {sound:kind=>{unlock();tickSound(kind);}};
}

// One tiny, deterministic texture is generated once; it never animates or runs a filter.
function installPhosphor(){
 if(document.documentElement.style.getPropertyValue('--phosphor-grain'))return;
 const tile=document.createElement('canvas');tile.width=tile.height=128;const ctx=tile.getContext('2d'),image=ctx.createImageData(128,128);let seed=479;
 for(let i=0;i<image.data.length;i+=4){seed=(seed*16807)%2147483647;image.data.set([15,100,53,Math.floor(seed/2147483647*24)],i);}
 ctx.putImageData(image,0,0);document.documentElement.style.setProperty('--phosphor-grain',`url("${tile.toDataURL()}")`);
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

