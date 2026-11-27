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
function contrastChanged(){document.body.classList.toggle('preview-chrome',ready&&!contrast.matches);sync()}
contrast.addEventListener('change',contrastChanged);
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
 const scope=':scope>.titlebar>.window-controls button';
 const buttonGroups=labels.map(({win})=>({win,strip:win.querySelector(':scope>.titlebar>.window-controls')})).filter(({strip})=>strip);
 const screen=document.createElement('canvas');screen.id='preview-window-grid';screen.setAttribute('aria-hidden','true');screen.hidden=true;
 document.body.append(screen);
 const ctx=screen.getContext('2d'),header=document.querySelector('.desktop-header');
 let pending=false;
 function draw(){
  if(pending)return;
  pending=true;requestAnimationFrame(()=>{
   pending=false;
   const pitch=bitmap.pitch(),w=Math.floor(innerWidth/pitch),h=Math.floor(innerHeight/pitch);
   if(screen.width!==w||screen.height!==h){screen.width=w;screen.height=h;screen.style.width=w*pitch+'px';screen.style.height=h*pitch+'px';}
   ctx.clearRect(0,0,w,h);
   const playing=document.fullscreenElement||document.webkitFullscreenElement||document.querySelector('.fullscreen-fallback');
   const moving=new Set(labels.map(({win})=>win).filter(win=>!win.hidden&&win.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime))));
   let rendered=false;
   const bounds=header?.getBoundingClientRect(),rows=Math.ceil((bounds?.bottom||0)/pitch);
   const headerVisible=bitmap.drawDesktopHeader&&root.hidden&&!playing&&!contrast.matches&&bounds
    &&Math.abs(bounds.left)<1&&Math.abs(bounds.top)<1&&bounds.width>=w*pitch-pitch&&rows>2&&rows<h
    &&[2,Math.floor(bounds.right/2),Math.floor(bounds.right)-2].every(x=>header.contains(document.elementFromPoint(x,bounds.bottom/2)));
   if(headerVisible){bitmap.drawDesktopHeader(ctx,pitch,w,rows);rendered=true;}
   document.body.classList.toggle('preview-app-header',!!headerVisible);
   for(const {win,title,text,canvas} of labels){
    const r=title.getBoundingClientRect(),bar=title.parentElement.getBoundingClientRect();
    const gx=Math.max(0,Math.ceil((r.left+1)/pitch)),end=Math.min(w,Math.floor((r.right-2)/pitch));
    const compact=gx+bitmap.width(text)>end || r.height<8*pitch;
    const size=compact?bitmap.compactWidth(text):bitmap.width(text),rows=compact?5:8;
    const gy=Math.floor((r.top+(r.height-rows*pitch)/2)/pitch);
    const room=gy*pitch>=bar.top&&((gy+rows)*pitch)<=bar.bottom&&gx+size<=end;
    const onTop=room&&[gx+1,gx+Math.floor(size/2),gx+size-1].every(x=>
     title.parentElement.contains(document.elementFromPoint(x*pitch+pitch/2,(gy+Math.floor(rows/2))*pitch)));
    const paint=!contrast.matches&&root.hidden&&!playing&&!moving.has(win)&&!win.hidden&&win.ownerDocument===document&&r.width>0&&room&&onTop
      &&gy>=0&&gy+rows<=h;
    title.toggleAttribute('data-preview-grid-ink',paint);
    if(!paint)continue;
    const color=getComputedStyle(title).getPropertyValue('--app-color').trim()||'#96eeb3';
    canvas.width=size;canvas.height=rows;
    (compact?bitmap.drawCompact:bitmap.draw)(canvas,text,color);ctx.drawImage(canvas,gx,gy);rendered=true;
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
 const mo=new MutationObserver(draw);labels.forEach(({win})=>mo.observe(win,{attributes:true,attributeFilter:['hidden','style','class']}));
 if(header){
  ro.observe(header);for(const button of header.querySelectorAll('button'))ro.observe(button);
  const headerChanges=new MutationObserver(draw);
  headerChanges.observe(header,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-expanded','hidden','class']});
 }
 const controls=new MutationObserver(draw);
 buttonGroups.forEach(({strip})=>{ro.observe(strip);controls.observe(strip,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed','hidden','style','class']});});
 for(const e of ['focusin','focusout','pointerover','pointerout','click','beforetoggle','toggle'])document.addEventListener(e,draw,true);
 contrast.addEventListener('change',draw);
 for(const e of ['windowfocus','windowhide','fullscreenchange','desktopfullscreenchange','windowresize','console-scale-change','makson-pixel-screen-change','accountchange'])document.addEventListener(e,draw);
 document.addEventListener('scroll',draw,true);
 addEventListener('resize',draw,{passive:true});draw();
}
const script=document.createElement('script');script.src='/pixel-layout.js';
script.onload=()=>{if(!window.MaksonPreviewBitmap){watcher.disconnect();hide();return;}ready=true;setupBitmapTitles();contrastChanged()};
script.onerror=()=>{watcher.disconnect();hide()};document.head.append(script);
