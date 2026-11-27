import {openWindow} from '/app.js';
import {setCatalogCollapsed} from '/console-shell.js';
const params=new URLSearchParams(location.search);
if(params.get('pixel')!=='1')throw Error('The shared pixel screen is opt-in');
const root=document.createElement('section');
root.id='framebuffer-preview';root.dataset.previewNative='1';root.hidden=true;root.setAttribute('aria-label','Пиксельный макет MAKSON PROJECT');
root.innerHTML='<canvas id="screen" aria-hidden="true"></canvas><nav id="controls" aria-label="Пиксельный каталог" data-native-keys></nav><p id="status" role="status" hidden></p>';
document.body.append(root);
const style=document.createElement('style');
style.textContent=`
#framebuffer-preview{position:fixed;inset:0;z-index:2147483640;overflow:hidden;background:transparent;pointer-events:none;zoom:calc(1 / var(--ui-scale,1))}
#framebuffer-preview[hidden]{display:none!important}
body.preview-native-home #app-catalog,body.preview-native-home #catalog-toggle{visibility:hidden!important}
body.preview-native-home .desktop-header,body.preview-app-header .desktop-header,body.preview-native-home #sphere-stage{opacity:0!important}
body.preview-native-home #framebuffer-preview #controls button:focus-visible{outline-width:var(--preview-cell);outline-offset:calc(-1 * var(--preview-cell))}

#framebuffer-preview canvas{position:absolute;inset:0 auto auto 0;image-rendering:pixelated;pointer-events:none}
#framebuffer-preview #controls{position:absolute;inset:0;pointer-events:none}
#framebuffer-preview #controls button{position:absolute;pointer-events:auto;background:none!important;box-shadow:none!important;border:0!important;color:transparent!important;margin:0;padding:0;appearance:none;cursor:pointer}
#framebuffer-preview #controls button:focus-visible{outline:2px solid white!important;outline-offset:-2px}
body.preview-chrome .window[id^='window-']>.titlebar{background:#020906!important;background-image:none!important;box-shadow:none!important;text-shadow:none!important}
body.preview-chrome .window[id^='window-']>.titlebar>.window-controls button{background:#090f0c!important;border-radius:0!important;box-shadow:none!important;text-shadow:none!important}
#preview-window-grid{position:fixed;left:0;top:0;z-index:2147482500;pointer-events:none;image-rendering:pixelated;zoom:calc(1 / var(--ui-scale,1))}
#preview-window-grid[hidden]{display:none!important}
body.preview-app-header>.console-focus-frame{z-index:2147482499!important}
body.preview-chrome .window>.titlebar>span[data-preview-grid-ink]{opacity:0!important}
body.preview-chrome :is(#console-shell .window,#window-svyaz,#window-settings)>.titlebar>.window-controls button[data-preview-grid-control]{color:transparent!important;text-shadow:none!important}
body.preview-chrome :is(#console-shell .window,#window-svyaz,#window-settings)>.titlebar>.window-controls button[data-preview-grid-control]>svg{visibility:hidden!important}
@media (orientation:portrait) and (min-width:350px) and (max-width:420px){
 body.preview-chrome #console-shell #app-workspace #window-importopoly:not(:fullscreen):not(.fullscreen-fallback)>.titlebar{
  height:auto!important;min-height:0;flex-wrap:wrap;row-gap:calc(3px / var(--ui-scale,1));
 }
 body.preview-chrome #console-shell #app-workspace #window-importopoly:not(:fullscreen):not(.fullscreen-fallback)>.titlebar>span{flex:1 0 100%}
 body.preview-chrome #console-shell #app-workspace #window-importopoly:not(:fullscreen):not(.fullscreen-fallback)>.titlebar>.window-controls{flex:1 0 100%;justify-content:flex-end}
}
@media (orientation:portrait) and (max-width:430px) and (pointer:coarse){
 body.preview-chrome #window-buffer>.utility-body[data-preview-writing]>.field-heading{margin:0 0 calc(6px / var(--ui-scale,1))}
 body.preview-chrome #window-buffer>.utility-body[data-preview-writing]>#buffer-text{
  min-height:calc(112px / var(--ui-scale,1));height:calc(clamp(124px,22dvh,188px) / var(--ui-scale,1));
  line-height:1.45;scroll-margin-block:calc(8px / var(--ui-scale,1));
 }
 body.preview-chrome #window-buffer>.utility-body[data-preview-writing]>.utility-intro{
  margin-block:calc(16px / var(--ui-scale,1)) calc(8px / var(--ui-scale,1));
  padding-block-start:calc(10px / var(--ui-scale,1));border-block-start:1px solid var(--console-rule,#26472e);
 }
 body.preview-chrome #window-buffer>.utility-body[data-preview-writing]>.field-heading>label{
  color:var(--console-green,#96eeb3);letter-spacing:.02em;
 }
}
/* Keep at least one conversation on-screen on a short portrait phone at large UI scale. */
@media (orientation:portrait) and (max-width:370px) and (max-height:680px) and (pointer:coarse){
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback){
  --preview-sv-hit:calc(44px / var(--ui-scale,1));--preview-sv-gap:calc(4px / var(--ui-scale,1));
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback)>.titlebar{
  height:auto!important;min-height:var(--preview-sv-hit)!important;
  gap:var(--preview-sv-gap);padding:var(--preview-sv-gap);flex-wrap:nowrap;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback)>.titlebar>span{
  flex:1 1 0;min-width:0;min-height:0;padding-inline-end:0;white-space:nowrap;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback)>.titlebar>.window-controls{
  display:flex;position:static;flex:0 0 auto;flex-wrap:nowrap;gap:var(--preview-sv-gap);
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback)>.titlebar>.window-controls>button{
  position:static!important;inset:auto;width:var(--preview-sv-hit);height:var(--preview-sv-hit);
  min-width:var(--preview-sv-hit)!important;min-height:var(--preview-sv-hit)!important;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #overview-tabs{
  height:auto!important;min-height:0!important;padding-block:0;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #overview-tabs>button{
  --ui-control-height:var(--preview-sv-hit);--ui-text-min:calc(17px / var(--ui-scale,1));
  height:var(--preview-sv-hit);min-height:var(--preview-sv-hit)!important;padding-block:0;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat :is(.sv-topline,.sv-search,.social-tabs){
  --ui-text-min:calc(13px / var(--ui-scale,1));min-height:0;padding:var(--preview-sv-gap) calc(10px / var(--ui-scale,1));gap:var(--preview-sv-gap);
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .social-toolbar{padding:0;gap:var(--preview-sv-gap)}
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat :is(.social-tabs,.sv-search,.sv-topline) :is(button,input){
  --ui-control-height:var(--preview-sv-hit);--ui-text-min:calc(16px / var(--ui-scale,1));
  min-height:var(--preview-sv-hit)!important;padding-block:0;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-topline .sv-identity{
  flex:1;max-width:none;min-width:0;gap:calc(6px / var(--ui-scale,1));
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-identity .sv-avatar{
  width:calc(32px / var(--ui-scale,1));height:calc(32px / var(--ui-scale,1));flex:0 0 auto;
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-identity small{--ui-text-min:calc(12px / var(--ui-scale,1))}
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-contact{
  --ui-control-height:calc(62px / var(--ui-scale,1));--ui-text-min:calc(15px / var(--ui-scale,1));
  gap:calc(8px / var(--ui-scale,1));padding:calc(8px / var(--ui-scale,1));
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-contact .sv-contact-avatar{
  width:calc(34px / var(--ui-scale,1));height:calc(34px / var(--ui-scale,1));
 }
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-contact :is(time,small,.sv-contact-meta b){--ui-text-min:calc(12px / var(--ui-scale,1))}
 body.preview-chrome #window-svyaz[data-account-state=member]:not(:fullscreen):not(.fullscreen-fallback) #svyaz-chat .sv-bottom{
  --ui-text-min:calc(13px / var(--ui-scale,1));min-height:0;padding:var(--preview-sv-gap) calc(10px / var(--ui-scale,1));
 }
}
body.preview-matrix-settings #window-settings{
 position:fixed!important;inset:var(--mx-top) 0 0!important;
 width:100%!important;height:calc(var(--viewport-height,100dvh) - var(--mx-top))!important;
 max-width:none!important;max-height:none!important;min-height:0!important;margin:0!important;
 border:0!important;box-shadow:none!important;overflow:hidden!important;background:#020704!important;
}
body.preview-matrix-settings #window-settings>.titlebar{
 height:calc(16 * var(--mx))!important;min-height:calc(16 * var(--mx))!important;
 padding:0 calc(4 * var(--mx));border:0;
}
body.preview-matrix-settings #window-settings .window-controls button{
 width:calc(15 * var(--mx));min-width:calc(15 * var(--mx))!important;
 height:calc(15 * var(--mx));min-height:calc(15 * var(--mx))!important;
}
body.preview-matrix-settings #window-settings>.utility-body{
 display:flex;flex-direction:column;gap:0;max-width:calc(720px / var(--ui-scale,1));
 width:100%;margin-inline:auto;padding:calc(3 * var(--mx)) calc(4 * var(--mx)) calc(4 * var(--mx));
 scroll-padding:calc(2 * var(--mx));scrollbar-width:none;
}
body.preview-matrix-painted #window-settings>.utility-body{opacity:0!important}
body.preview-matrix-painted>.console-focus-frame{z-index:2147482499!important}
body.preview-matrix-settings #window-settings .screen-settings{display:block}
body.preview-matrix-settings #window-settings .console-zoom{
 display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;
 gap:calc(2 * var(--mx));padding:0;
}
body.preview-matrix-settings #window-settings .console-zoom>span{grid-column:auto}
body.preview-matrix-settings #window-settings .console-zoom output{min-width:calc(24 * var(--mx));margin:0;text-align:center}
body.preview-matrix-settings #window-settings :is(.console-zoom,.settings-fullscreen,.setting){
 min-height:calc(18 * var(--mx));padding:0;margin:0;border:0;gap:calc(2 * var(--mx));
}
body.preview-matrix-settings #window-settings :is(.setting,.settings-fullscreen){display:flex;align-items:center;justify-content:space-between}
body.preview-matrix-settings #window-settings .setting input{
 width:calc(15 * var(--mx));height:calc(9 * var(--mx));min-width:0;min-height:0;
}
body.preview-matrix-settings #window-settings .utility-body button,
body.preview-matrix-settings #window-settings .utility-body summary{
 --ui-control-height:calc(15 * var(--mx));
 min-height:calc(15 * var(--mx))!important;padding-inline:calc(2 * var(--mx));
}
body.preview-matrix-settings #window-settings :is(#zoom-in,#zoom-out){width:calc(15 * var(--mx));min-width:calc(15 * var(--mx))!important}
body.preview-matrix-settings #window-settings #site-fullscreen{width:calc(18 * var(--mx));min-width:calc(18 * var(--mx))}
body.preview-matrix-settings #window-settings .settings-footer{
 display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(2 * var(--mx));
 margin:0;padding:calc(3 * var(--mx)) 0 0;
}
body.preview-matrix-settings #window-settings .console-input-help p{
 grid-column:1/-1;order:4;line-height:calc(7 * var(--mx))!important;
 --ui-text-min:calc(5 * var(--mx));margin:0;padding:calc(2 * var(--mx)) 0;min-height:calc(39 * var(--mx));
}
body.preview-matrix-settings #window-settings .settings-footer :is(button,summary){width:100%;justify-content:center}
@media (min-width:600px){
 body.preview-matrix-settings #window-settings .screen-settings{
  display:grid;grid-template-columns:1.35fr 1fr;gap:calc(4 * var(--mx));
 }
}
@media (min-width:550px) and (orientation:landscape) and (max-height:500px){
 body.preview-matrix-settings #window-settings>.utility-body{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  column-gap:calc(4 * var(--mx));align-content:start;
 }
 body.preview-matrix-settings #window-settings .utility-body :is(.screen-settings,.settings-footer,.setting:last-of-type){
  grid-column:1/-1;
 }
}
@media(forced-colors:active){#preview-window-grid{display:none!important}}

`;
document.head.append(style);
const windows=[...document.querySelectorAll('.window[id^="window-"]')], allowed=new Set(windows.map(w=>w.id.slice(7)));
const dock=document.querySelector('#console-dock'),contrast=matchMedia('(forced-colors:active)'),previousInert=new Map();
let direct=allowed.has(params.get('app'))&&params.get('app')!=='settings',ready=false,didSchedule=false,restore=null,drawer=null,contrastReturn=null;
function hide(){if(root.hidden)return;root.hidden=true;document.body.classList.remove('preview-native-home');document.dispatchEvent(new Event('makson-pixel-screen-change'));for(const [el,old] of previousInert)el.inert=old;previousInert.clear();}
function show(){
 if(!root.hidden)return;
 for(const el of [document.querySelector('#app-catalog'),document.querySelector('#catalog-toggle')]){
  if(!el)continue;previousInert.set(el,el.inert);el.inert=true;
 }
 document.body.classList.add('preview-native-home');
 root.hidden=false;document.dispatchEvent(new Event('makson-pixel-screen-change'));
}
function sync(){
 if(didSchedule)return;
 didSchedule=true;queueMicrotask(()=>{
  didSchedule=false;
  const active=windows.some(w=>w.isConnected&&!w.hidden);
  if(active)direct=false;
  if(!ready||active||direct||dock?.childElementCount){hide();return}
  if(drawer!==null){setCatalogCollapsed(drawer);drawer=null}
  if(contrast.matches){
   const focused=document.activeElement;
   if(!root.hidden&&root.contains(focused))contrastReturn=focused.dataset.key||null;
   hide();
   if(contrastReturn&&root.contains(focused)){
    const native=document.querySelector('#console-settings');
    native?.focus({preventScroll:true});
   }
   return;
  }
  const nativeFocused=document.activeElement?.id==='console-settings';
  show();
  if(contrastReturn&&nativeFocused){
   [...root.querySelectorAll('#controls button')].find(el=>el.dataset.key===contrastReturn)?.focus({preventScroll:true});
  }
  contrastReturn=null;
  if(restore){document.dispatchEvent(new CustomEvent('makson-preview-focus',{detail:restore}));restore=null}
 });
}
function open(evt){
 const {id,keyboard}=evt.detail;
 if(root.hidden||!allowed.has(id))return;
 evt.preventDefault();hide();restore=id;
 if(drawer===null)drawer=document.body.classList.contains('catalog-collapsed');
 if(!drawer)setCatalogCollapsed(true);
 openWindow(id);
 if(keyboard)document.querySelector('#window-'+id+' .titlebar [data-action=close]')?.focus({preventScroll:true});
 sync();
}
document.addEventListener('makson-preview-open',open);
document.addEventListener('makson-preview-visibility',e=>{if(!root.hidden)setCatalogCollapsed(!e.detail)});
window.addEventListener('keydown',e=>{
 if(e.key!=='F6'||root.hidden||contrast.matches)return;
 e.preventDefault();e.stopImmediatePropagation();
 document.dispatchEvent(new Event('makson-preview-keyboard-home'));
},true);

for(const evt of ['windowfocus','windowhide'])document.addEventListener(evt,sync);
const watcher=new MutationObserver(sync);windows.forEach(el=>watcher.observe(el,{attributes:true,attributeFilter:['hidden']}));
if(dock)watcher.observe(dock,{childList:true});
// In portrait, put the draft first in both visual order and keyboard order.
function setupWritingPane(){
 const win=document.querySelector('#window-buffer'),body=win?.querySelector(':scope>.utility-body');
 const heading=body?.querySelector(':scope>.field-heading'),field=body?.querySelector(':scope>#buffer-text');
 if(!heading||!field)return;
 const originalNext=field.nextSibling;
 const narrow=matchMedia('(orientation:portrait) and (max-width:430px) and (pointer:coarse)');
 function arrange(){
  if(win.ownerDocument!==document)return;
  const writing=narrow.matches&&!contrast.matches,active=document.activeElement;
  if(writing===body.hasAttribute('data-preview-writing'))return;
  if(writing){
   body.prepend(heading,field);
  }else{
   body.insertBefore(heading,originalNext);
   body.insertBefore(field,originalNext);
  }
  body.toggleAttribute('data-preview-writing',writing);
  if(active?.isConnected&&(active===field||heading.contains(active)))active.focus({preventScroll:true});
 }
 narrow.addEventListener('change',arrange);contrast.addEventListener('change',arrange);
 document.addEventListener('windowfocus',e=>{if(e.detail==='buffer')arrange()});
 arrange();
}
function contrastChanged(){document.body.classList.toggle('preview-chrome',ready&&!contrast.matches);sync()}
contrast.addEventListener('change',contrastChanged);
function settingsSurface(bitmap,ctx){
 if(params.get('matrix')!=='settings')return null;
 const win=document.querySelector('#window-settings'),pane=win?.querySelector(':scope>.utility-body');
 const workspace=document.querySelector('#console-shell');
 if(!win||!pane||!workspace)return null;
 const body=document.body,help=pane.querySelector('details'),zoom=pane.querySelector('#zoom-value');
 let previousInert;
 const rgb={background:'#010503',surface:'#07120b',line:'#284b35',green:'#9cdeb4',bright:'#b9f5cf',muted:'#659777',button:'#102519',on:'#5ad38d'};
 function stop(){
  body.classList.remove('preview-matrix-settings','preview-matrix-painted');
  if(previousInert!==undefined){workspace.inert=previousInert;previousInert=undefined;}
 }
 function paint(pitch,w,h,headerRows,playing,available){
  if(!available||win.hidden||playing||contrast.matches||windows.some(other=>other!==win&&!other.hidden)||dock?.childElementCount){stop();return false;}
  if(previousInert===undefined){previousInert=workspace.inert;workspace.inert=true;}
  const nativeScale=Number(body.style.zoom)||1;
  const cell=(pitch/nativeScale)+'px',top=(headerRows*pitch/nativeScale)+'px';
  if(win.style.getPropertyValue('--mx')!==cell)win.style.setProperty('--mx',cell);
  if(win.style.getPropertyValue('--mx-top')!==top)win.style.setProperty('--mx-top',top);
  body.classList.add('preview-matrix-settings');
  const bounds=el=>{
   const r=el.getBoundingClientRect();
   return {l:Math.round(r.left/pitch),t:Math.round(r.top/pitch),r:Math.round(r.right/pitch),b:Math.round(r.bottom/pitch)};
  };
  const fill=(x,y,a,b,color)=>{if(a>x&&b>y){ctx.fillStyle=color;ctx.fillRect(x,y,a-x,b-y);}};
  const pb=bounds(pane),tb=bounds(win.querySelector('.titlebar'));
  if(pb.b<=pb.t||tb.b<=headerRows){stop();return false;}
  fill(0,headerRows,w,h,rgb.background);
  fill(0,headerRows,w,tb.b,rgb.surface);
  fill(0,tb.b-1,w,tb.b,rgb.line);
  const contentLeft=pb.l+4;
  const labelCanvas=document.createElement('canvas');
  const width=(value,small)=> (small?bitmap.compactWidth(value):bitmap.width(value))-1;
  const ink=(value,x,y,color,small)=>{
   if(!value)return;
   labelCanvas.width=Math.max(1,width(value,small));labelCanvas.height=small?5:8;
   (small?bitmap.drawCompact:bitmap.draw)(labelCanvas,value,color);
   ctx.drawImage(labelCanvas,x,y);
  };
  function wrap(value,available,small){
   const lines=[];
   for(const input of value.split('\n')){
    let line='';
    for(const word of input.split(' ')){
     const next=line?line+' '+word:word;
     if(line&&width(next,small)>available){lines.push(line);line=word;}
     else line=next;
    }
    if(line)lines.push(line);
   }
   return lines;
  }
  function text(value,b,{center=false,color=rgb.green,pad=0,flow=false,compact=false}={}){
   const available=Math.max(1,b.r-b.l-2*pad);
   let small=compact,lines=wrap(value,available,small);
   if(!small&&(lines.some(line=>width(line,small)>available)||lines.length*9-1>b.b-b.t-2)){
    small=true;lines=wrap(value,available,true);
   }
   const step=small?7:9,actual=lines.length*step-(small?2:1);
   const start=flow?b.t+pad:Math.round((b.t+b.b-actual)/2);
   lines.forEach((line,i)=>ink(line,center?Math.round((b.l+b.r-width(line,small))/2):b.l+pad,start+i*step,color,small));
  }
  function outline(b,edge=rgb.line,bg=rgb.button){
   fill(b.l,b.t,b.r,b.b,edge);fill(b.l+1,b.t+1,b.r-1,b.b-1,bg);
  }
  function button(el,title){
   const b=bounds(el),focus=el.matches(':focus-visible'),hover=el.matches(':hover');
   outline(b,focus?rgb.bright:rgb.line,hover?'#214832':rgb.button);
   text(title,b,{center:true,pad:1,color:el.disabled?rgb.muted:rgb.bright});
  }
  ctx.save();ctx.beginPath();ctx.rect(pb.l,pb.t,pb.r-pb.l,pb.b-pb.t);ctx.clip();
  fill(pb.l,pb.t,pb.r,pb.b,rgb.surface);
  const zr=bounds(pane.querySelector('.console-zoom')),fr=bounds(pane.querySelector('.settings-fullscreen'));
  text('МАСШТАБ',{...zr,l:contentLeft,r:bounds(pane.querySelector('#zoom-out')).l-1});
  button(pane.querySelector('#zoom-out'),'−');button(pane.querySelector('#zoom-in'),'+');
  text(zoom.textContent,bounds(zoom),{center:true,color:rgb.bright});
  const full=pane.querySelector('#site-fullscreen');
  text('ПОЛНЫЙ ЭКРАН',{...fr,r:bounds(full).l-1});
  button(full,full.getAttribute('aria-pressed')==='true'?'ВЫКЛ':'ВКЛ');
  const labels=['ЗВУК ИНТЕРФЕЙСА','АНИМАЦИЯ','МЕНЬШЕ ЯРКОСТИ'];
  [...pane.querySelectorAll('label.setting')].forEach((row,i)=>{
   const b=bounds(row),input=row.querySelector('input'),p=bounds(input),checked=input.checked;
   fill(b.l,b.t,b.r,b.t+1,rgb.line);
   text(labels[i],{...b,r:p.l-2});
   outline(p,input.matches(':focus-visible')?rgb.bright:rgb.line,checked?'#173a27':'#101e16');
   const tw=Math.floor((p.r-p.l-3)/2),x=checked?p.r-tw-2:p.l+2;
   fill(x,p.t+2,x+tw,p.b-2,checked?rgb.on:rgb.muted);
  });
  button(pane.querySelector('#reset-settings'),'СБРОС');
  button(help.querySelector('summary'),'КЛАВИШИ');
  if(help.open){const b=bounds(help.querySelector('summary'));fill(b.l,b.b-1,b.r,b.b,rgb.on);}
  if(help.open){
   text('СТРЕЛКИ: ВЫБОР\nENTER: ОТКРЫТЬ\nESC: НАЗАД   F6: КАТАЛОГ\nГЕЙМПАД: A ВЫБОР, B НАЗАД\nSTART: КАТАЛОГ',bounds(help.querySelector('p')),{pad:1,flow:true,compact:true,color:rgb.green});
  }
  const availableScroll=pane.scrollHeight-pane.clientHeight;
  if(availableScroll>1){
   const visible=pb.b-pb.t,m=Math.max(4,Math.floor(visible*pane.clientHeight/pane.scrollHeight));
   const y=pb.t+Math.round((visible-m)*pane.scrollTop/availableScroll);
   fill(pb.r-1,pb.t,pb.r,pb.b,rgb.line);fill(pb.r-1,y,pb.r,y+m,rgb.muted);
  }
  ctx.restore();
  body.classList.add('preview-matrix-painted');
  return true;
 }
 return {paint,watched:[win,pane,help],zoom};
}
function setupBitmapTitles(){
 const bitmap=window.MaksonPreviewBitmap;
 if(!bitmap)return;
 const titles=new Map([['editor','МОНТАЖКА'],['download','ЗАГРУЗЧИК'],['convert','КОНВЕРТЕР'],['buffer','БУФЕР'],
  ['meme','МЕМОИНАТОР'],['game','ГИПНОРОЙДЕР'],['importopoly','СДВГПОЛИЯ'],['pulse','ПУЛЬС'],
  ['naval','МОРСКОЙ БОЙ'],['svyaz','СВЯЗЬ'],['settings','НАСТРОЙКИ']]);
 const labels=[];
 for(const [id,text] of titles){
  const win=document.querySelector('#window-'+id), title=win?.querySelector(':scope>.titlebar>span');
  if(title)labels.push({win,title,text,canvas:document.createElement('canvas')});
 }
 const symbols={
  close:['10001','01010','00100','01010','10001'],
  minimize:['00000','00000','00000','00000','11111'],
  restore:['01111','01001','11101','10111','11100'],
  fullscreen:['11011','10001','00000','10001','11011'],
  link:['00111','00011','00101','11000','11100'],
  pip:['11111','10001','10111','10111','11111'],
 };
 const digits={
  0:'75557',1:'26227',2:'71247',3:'71317',4:'55711',5:'74617',
  6:'74757',7:'71122',8:'75757',9:'75717','+':'02720'
 };
 const unreadLabel=document.querySelector('#svyaz-unread');
 const scope=':scope>.titlebar>.window-controls button';
 const buttonGroups=labels.map(({win})=>({win,strip:win.querySelector(':scope>.titlebar>.window-controls')})).filter(({strip})=>strip);
 const screen=document.createElement('canvas');screen.id='preview-window-grid';screen.setAttribute('aria-hidden','true');screen.hidden=true;
 document.body.append(screen);
 const ctx=screen.getContext('2d'),header=document.querySelector('.desktop-header');
 const matrix=settingsSurface(bitmap,ctx);
 let pending=false;
 function draw(){
  if(pending)return;
  pending=true;requestAnimationFrame(()=>{
   pending=false;
   const pitch=bitmap.pitch(),round=matrix?Math.ceil:Math.floor,w=round(innerWidth/pitch),h=round(innerHeight/pitch);
   if(screen.width!==w||screen.height!==h){screen.width=w;screen.height=h;screen.style.width=w*pitch+'px';screen.style.height=h*pitch+'px';}
   ctx.clearRect(0,0,w,h);
   const playing=document.fullscreenElement||document.webkitFullscreenElement||document.querySelector('.fullscreen-fallback');
   const moving=new Set(labels.map(({win})=>win).filter(win=>!win.hidden&&win.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime))));
   let rendered=false;
   const bounds=header?.getBoundingClientRect(),rows=Math.ceil((bounds?.bottom||0)/pitch);
   const headerVisible=bitmap.drawDesktopHeader&&root.hidden&&!playing&&!contrast.matches&&bounds
    &&Math.abs(bounds.left)<1&&Math.abs(bounds.top)<1&&bounds.width>=w*pitch-pitch*(matrix?2:1)&&rows>2&&rows<h
    &&[2,Math.floor(bounds.right/2),Math.floor(bounds.right)-2].every(x=>header.contains(document.elementFromPoint(x,bounds.bottom/2)));
   matrix?.paint(pitch,w,h,rows,playing,headerVisible);
   if(headerVisible){bitmap.drawDesktopHeader(ctx,pitch,w,rows);rendered=true;}
   document.body.classList.toggle('preview-app-header',!!headerVisible);
   for(const {win,title,text,canvas} of labels){
    const active=!contrast.matches&&root.hidden&&!playing&&!moving.has(win)&&!win.hidden&&win.ownerDocument===document;
    if(!active){
     title.removeAttribute('data-preview-grid-ink');
     if(title.contains(unreadLabel))unreadLabel.removeAttribute('data-preview-grid-badge');
     continue;
    }
    const barEl=title.parentElement, r=title.getBoundingClientRect(),bar=barEl.getBoundingClientRect();
    const gx=Math.max(0,Math.ceil((r.left+1)/pitch));
    const blockers=[...win.querySelectorAll(scope)].map(btn=>btn.getBoundingClientRect()).filter(b=>b.width&&b.height);
    function clear(x,y,width,rows){
     const top=y*pitch,bottom=(y+rows)*pitch;
     const limit=Math.min(bar.right-2,w*pitch,...blockers.filter(b=>b.bottom>top&&b.top<bottom).map(b=>b.left-2));
     if(!r.width||!r.height||y<0||y+rows>h||top<bar.top||bottom>bar.bottom||(x+width)*pitch>limit)return false;
     for(const yy of [y,y+rows-1])for(const xx of [x,x+Math.floor(width/2),x+width-1]){
      const hit=document.elementFromPoint((xx+.5)*pitch,(yy+.5)*pitch);
      if(!barEl.contains(hit)||hit?.closest('button, a, input, select, [role=button], [role=menu]'))return false;
     }
     return true;
    }
    function fit(compact,forceY=null){
     const width=compact?bitmap.compactWidth(text):bitmap.width(text),rows=compact?5:8;
     if(forceY===null&&r.height+1<rows*pitch)return null;
     const gy=forceY??Math.floor((r.top+(r.height-rows*pitch)/2)/pitch);
     return clear(gx,gy,width,rows)?{compact,width,rows,gy}:null;
    }
    const large=fit(false),small=fit(true);
    let layout=large||small,badge=null;
    const unread=title.contains(unreadLabel)?Number(unreadLabel.textContent.match(/\d+/)?.[0]):0;
    if(unread>0){
     const value=unread>99?'99+':String(unread),width=value.length*4-1;
     for(const candidate of [large,small]){
      if(!candidate)continue;
      const x=gx+candidate.width+1,y=candidate.gy+Math.floor((candidate.rows-5)/2);
      if(clear(x,y,width,5)){layout=candidate;badge={value,x,y};break;}
     }
     if(!badge){
      const y=Math.round((bar.top+(bar.height-11*pitch)/2)/pitch);
      const stacked=fit(true,y);
      if(stacked&&clear(gx,y+6,width,5)){layout=stacked;badge={value,x:gx,y:y+6};}
      else layout=null; // Keep the native title and unread number together if the bitmap would lose data.
     }
    }
    if(title.contains(unreadLabel))unreadLabel.toggleAttribute('data-preview-grid-badge',!!badge);
    title.toggleAttribute('data-preview-grid-ink',!!layout);
    if(!layout)continue;
    const {compact,width:size,rows,gy}=layout;
    const color=getComputedStyle(title).getPropertyValue('--app-color').trim()||'#96eeb3';
    canvas.width=size;canvas.height=rows;
    (compact?bitmap.drawCompact:bitmap.draw)(canvas,text,color);ctx.drawImage(canvas,gx,gy);rendered=true;
    if(badge){
     ctx.fillStyle='#c8ff95';
     [...badge.value].forEach((digit,i)=>[...digits[digit]].forEach((row,j)=>{
      for(let k=0;k<3;k++)if(Number(row)&(4>>k))ctx.fillRect(badge.x+i*4+k,badge.y+j,1,1);
     }));
    }
   }
   // Replace ink only: the original button still owns sizing, hit targets, focus and actions.
   for(const {win} of buttonGroups)for(const button of win.querySelectorAll(scope)){
    const r=button.getBoundingClientRect(), action=button.dataset.action, pressed=button.getAttribute('aria-pressed')==='true';
    const kind=button.hasAttribute('data-app-link')?'link':action==='close'||action==='minimize'||action==='pip'?action
     :(button.id.endsWith('-fullscreen')||action==='maximize')?(pressed?'restore':'fullscreen'):null;
    const x=Math.round(((r.left+r.right)/2-2.5*pitch)/pitch);
    const y=Math.round(((r.top+r.bottom)/2-2.5*pitch)/pitch);
    const pattern=symbols[kind];
    const room=x>=0&&y>=0&&x+5<=w&&y+5<=h&&x*pitch>=r.left+1&&y*pitch>=r.top+1
     &&(x+5)*pitch<=r.right-1&&(y+5)*pitch<=r.bottom-1;
    const paint=!contrast.matches&&root.hidden&&!playing&&!moving.has(win)&&!win.hidden&&win.ownerDocument===document
     &&room&&pattern&&pattern.every((row,j)=>[...row].every((v,i)=>v==='0'||
      button.contains(document.elementFromPoint((x+i+.5)*pitch,(y+j+.5)*pitch))));
    if(!paint){button.removeAttribute('data-preview-grid-control');continue;}
    button.removeAttribute('data-preview-grid-control');
    ctx.fillStyle=getComputedStyle(button).color;
    button.setAttribute('data-preview-grid-control',kind);
    pattern.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')ctx.fillRect(x+i,y+j,1,1)}));
    rendered=true;
   }
   screen.hidden=!rendered;
   if(moving.size)draw();
  });
 }
 const ro=new ResizeObserver(draw);labels.forEach(({title,win})=>{ro.observe(title);ro.observe(win)});
 if(matrix){matrix.watched.forEach(el=>ro.observe(el));new MutationObserver(draw).observe(matrix.zoom,{childList:true,characterData:true,subtree:true});}
 const mo=new MutationObserver(draw);labels.forEach(({win})=>mo.observe(win,{attributes:true,attributeFilter:['hidden','style','class']}));
 if(header){
  ro.observe(header);for(const button of header.querySelectorAll('button'))ro.observe(button);
  const headerChanges=new MutationObserver(draw);
  headerChanges.observe(header,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-expanded','hidden','class']});
 }
 if(unreadLabel)new MutationObserver(draw).observe(unreadLabel,{childList:true,subtree:true,characterData:true});
 const controls=new MutationObserver(draw);
 buttonGroups.forEach(({strip})=>{ro.observe(strip);controls.observe(strip,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed','hidden','style','class']});});
 for(const e of ['focusin','focusout','pointerover','pointerout','click','beforetoggle','toggle'])document.addEventListener(e,draw,true);
 contrast.addEventListener('change',draw);
 for(const e of ['settingschange','windowfocus','windowhide','fullscreenchange','desktopfullscreenchange','windowresize','console-scale-change','makson-pixel-screen-change','accountchange'])document.addEventListener(e,draw);
 document.addEventListener('scroll',draw,true);
 addEventListener('resize',draw,{passive:true});draw();
}
const script=document.createElement('script');script.src='/pixel-layout.js';
script.onload=()=>{if(!window.MaksonPreviewBitmap){watcher.disconnect();hide();return;}ready=true;setupBitmapTitles();setupWritingPane();contrastChanged();if(params.get('matrix')==='settings'&&!allowed.has(params.get('app')))openWindow('settings')};
script.onerror=()=>{watcher.disconnect();hide()};document.head.append(script);
