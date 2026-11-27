import {openWindow} from '/app.js';
import {setCatalogCollapsed} from '/console-shell.js';
const appModule=import('/pixel-settings.js').catch(()=>null);
const params=new URLSearchParams(location.search);
if(params.has('app')||params.get('pixel')==='0')throw Error('Only mount the shared pixel scene on home');
const root=document.createElement('section');
root.id='framebuffer-preview';root.dataset.previewNative='1';root.hidden=true;root.setAttribute('aria-label','Пиксельный макет MAKSON PROJECT');
root.innerHTML='<canvas id="screen" aria-hidden="true"></canvas><nav id="controls" aria-label="Пиксельный каталог" data-native-keys></nav><p id="status" role="status" hidden></p>';
document.body.append(root);
const style=document.createElement('style');
style.textContent=`
#framebuffer-preview{position:fixed;inset:0;z-index:2147483640;overflow:hidden;background:transparent;pointer-events:none;zoom:calc(1 / var(--ui-scale,1))}
#framebuffer-preview[hidden]{display:none!important}
body.preview-native-home #app-catalog,body.preview-native-home #catalog-toggle{visibility:hidden!important}
body.preview-native-home .desktop-header,body.preview-native-home #sphere-stage,body.preview-native-home #console-dock{opacity:0!important}
body.pixel-app-dock #console-dock .console-task{animation:none!important}
body.pixel-app-dock #console-dock:not([hidden]){
 --pixel-dock-size:max(48px,calc(46px / var(--ui-scale,1)));
 position:fixed!important;inset:calc(var(--viewport-height,100dvh) - var(--pixel-dock-size)) 0 auto!important;
 height:var(--pixel-dock-size)!important;min-height:0!important;
}
body.matrix-settings-painted>.console-focus-frame{z-index:2147482499!important}
body.preview-native-home #framebuffer-preview #controls button:focus-visible{outline-width:var(--preview-cell);outline-offset:calc(-1 * var(--preview-cell))}

#framebuffer-preview canvas{position:absolute;inset:0 auto auto 0;image-rendering:pixelated;pointer-events:none}
#framebuffer-preview #controls{position:absolute;inset:0;pointer-events:none}
#framebuffer-preview #controls button{position:absolute;pointer-events:auto;background:none!important;box-shadow:none!important;border:0!important;color:transparent!important;margin:0;padding:0;appearance:none;cursor:pointer;overflow:hidden;font-size:0!important;line-height:0!important;white-space:nowrap;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#framebuffer-preview #controls button:focus-visible{outline:2px solid white!important;outline-offset:-2px}
/* Keep the original sphere and its touch controls in the visible work area. */
body.preview-native-home #console-shell{transition:none!important}
@media (max-width:420px){
 /* The chat button is the same sign-in entry point; keep the title clear of a duplicate hint. */
 body.preview-native-home #svyaz-signin-hint{display:none!important}
}
@media (min-width:951px), (orientation:landscape){
 body.console-desktop.preview-native-home #console-shell{
  grid-template-columns:var(--pixel-home-side,32%) minmax(0,1fr)!important;
  grid-template-rows:minmax(0,1fr)!important;
 }
 body.console-desktop.preview-native-home #console-shell>#app-workspace{
  grid-column:2!important;grid-row:1!important;
 }
}
@media (orientation:portrait) and (max-width:950px){
 body.preview-native-home #console-shell{
  grid-template-rows:minmax(0,1fr) var(--pixel-home-drawer,0px)!important;
 }
}
`;
document.head.append(style);
const windows=[...document.querySelectorAll('.window[id^="window-"]')], allowed=new Set(windows.map(w=>w.id.slice(7)));
const dock=document.querySelector('#console-dock'),contrast=matchMedia('(forced-colors:active)'),previousInert=new Map();
const motion=matchMedia('(prefers-reduced-motion:reduce)');
const settingsWin=document.querySelector('#window-settings'),bufferWin=document.querySelector('#window-buffer'),nav=root.querySelector('nav');
let painter=null,buffer=null,tools={},activeSurface=null,revealStart=0,revealFrame=0;
function leaveSurface(){
 if(!activeSurface)return;
 const prior=activeSurface;activeSurface=null;nav.hidden=false;
 document.body.classList.remove('pixel-app-cover','pixel-app-dock');
 document.body.style.removeProperty('--matrix-dock-reserve');
 document.dispatchEvent(new Event('makson-sphere-cover-change'));
 cancelAnimationFrame(revealFrame);revealFrame=0;prior.stop();
}
window.MaksonPixelApp=Object.freeze({
 hasSettings:()=>!!painter&&!contrast.matches,
 hasBuffer:()=>!!buffer&&!contrast.matches,
 hasTools:id=>!!tools[id]&&!contrast.matches,
 paintSettings(frame){return activeSurface===painter&&painter&&this.paintApp(frame)==='settings';},
 paintApp(frame){
  if(!activeSurface)return '';
  const {ctx,width,headerRows,pitch}=frame;
  const docked=dock&&!dock.hidden&&activeSurface!==painter;
  document.body.classList.toggle('pixel-app-dock',!!docked);
  const dockBox=docked?dock.getBoundingClientRect():null;
  const height=dockBox?Math.floor(dockBox.top/pitch):frame.height;
  const scale=Number(document.body.style.zoom)||1;
  const view=window.visualViewport;
  const viewportHeight=view?.scale===1?Math.min(innerHeight,view.height):innerHeight;
  const reserve=dockBox?(Math.max(0,viewportHeight-height*pitch)/scale)+'px':'0px';
  if(document.body.style.getPropertyValue('--matrix-dock-reserve')!==reserve)document.body.style.setProperty('--matrix-dock-reserve',reserve);
  if(height<=headerRows){hide();return '';}
  const progress=revealStart?Math.min(1,(performance.now()-revealStart)/235):1;
  const opened=Math.ceil((height-headerRows)*(1-(1-progress)**3));
  ctx.save();ctx.beginPath();ctx.rect(0,headerRows,width,opened);ctx.clip();
  let painted=false;
  try{painted=activeSurface.paint({pitch,width,height,headerRows,active:true})}
  catch(error){console.warn('Pixel app fallback',error);}
  finally{ctx.restore()}
  if(!painted){hide();return '';}
  if(progress<1&&!revealFrame)revealFrame=requestAnimationFrame(()=>{revealFrame=0;repaint()});
  return activeSurface===painter?'settings':'buffer';
 }
});
function repaint(){document.dispatchEvent(new Event('makson-pixel-repaint'));}
window.visualViewport?.addEventListener('resize',()=>{if(activeSurface)repaint();},{passive:true});
let ready=false,didSchedule=false,restore=null,drawer=null,contrastReturn=null;
function hide(){leaveSurface();if(root.hidden)return;root.hidden=true;document.body.classList.remove('preview-native-home');document.dispatchEvent(new Event('makson-pixel-screen-change'));for(const [el,old] of previousInert)el.inert=old;previousInert.clear();}
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
  const active=windows.filter(w=>w.isConnected&&!w.hidden);
  // Only an app's own fullscreen needs the native window. The site root still contains the pixel surface.
  const fullscreen=document.fullscreenElement||document.webkitFullscreenElement;
  const appFullscreen=fullscreen&&fullscreen!==document.documentElement;
  const inPage=active.filter(win=>win.ownerDocument===document);
  const top=inPage.includes(settingsWin)?settingsWin:active.length===1?inPage[0]:null;
  // Settings is modal over the workspace. It keeps its pixel frame even with a
  // suspended task underneath, but does not expose that task until it closes.
  const target=top&&!appFullscreen&&!top.classList.contains('fullscreen-fallback')&&
   !dock?.querySelector('[data-task="'+top.id.slice(7)+'"]')?(top===settingsWin?painter:top===bufferWin?buffer:tools[top.id.slice(7)]):null;
  if(ready&&target&&!contrast.matches){
   show();
   if(activeSurface!==target){
    leaveSurface();activeSurface=target;nav.hidden=true;
    document.body.classList.add('pixel-app-cover');
    document.dispatchEvent(new Event('makson-sphere-cover-change'));
    revealStart=motion.matches||document.body.classList.contains('reduced-motion')?0:performance.now();
    if(target===painter&&document.querySelector('#console-settings:focus-visible')){
     settingsWin.querySelector('[data-action=close]')?.focus({preventScroll:true});
    }
   }
   repaint();return;
  }
  leaveSurface();
  if(!ready||active.length){hide();return}
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
  // On close the browser may drop focus to the document. A different,
  // minimized app must not prevent returning to the catalog entry.
  if(restore&&(!dock?.childElementCount||document.activeElement===document.body||document.activeElement?.closest(".window[hidden]"))){
   const id=restore;restore=null;
   document.dispatchEvent(new CustomEvent('makson-preview-focus',{detail:id}));
  }
 });
}
function open(evt){
 const {id,keyboard}=evt.detail;
 if(root.hidden||!allowed.has(id))return;
 evt.preventDefault();restore=id;
 if(drawer===null)drawer=document.body.classList.contains('catalog-collapsed');
 if(!drawer)setCatalogCollapsed(true);
 openWindow(id);
 if(keyboard)document.querySelector('#window-'+id+' .titlebar [data-action=close]')?.focus({preventScroll:true});
 sync();
}
document.addEventListener('makson-preview-open',open);
document.addEventListener('makson-preview-visibility',e=>{if(!root.hidden&&!activeSurface)setCatalogCollapsed(!e.detail)});
window.addEventListener('keydown',e=>{
 if(e.key!=='F6'||root.hidden||activeSurface||contrast.matches)return;
 e.preventDefault();e.stopImmediatePropagation();
 document.dispatchEvent(new Event('makson-preview-keyboard-home'));
},true);

for(const evt of ['windowfocus','windowhide','desktopfullscreenchange','fullscreenchange'])document.addEventListener(evt,sync);
const watcher=new MutationObserver(sync);windows.forEach(el=>watcher.observe(el,{attributes:true,attributeFilter:['hidden']}));
if(dock)watcher.observe(dock,{childList:true});
// In portrait, put the draft first in both visual order and keyboard order.
function contrastChanged(){sync()}
contrast.addEventListener('change',contrastChanged);
const script=document.createElement('script');script.src='/pixel-layout.js';
script.onload=()=>{
 if(!window.MaksonPreviewBitmap){watcher.disconnect();hide();return;}
 ready=true;contrastChanged();
 appModule.then(mod=>{
  if(!mod)return;
  try{
   const bitmap=window.MaksonPreviewBitmap,ctx=root.querySelector('canvas').getContext('2d');
   painter=mod.createSettingsSurface(bitmap,ctx);painter?.watch(repaint);
   buffer=mod.createBufferSurface?.(bitmap,ctx);buffer?.watch(repaint);
   tools=mod.createToolSurfaces?.(bitmap,ctx)??{};
   for(const tool of Object.values(tools))tool?.watch(repaint);
  }
  catch(error){console.warn('Settings module unavailable',error);}
  sync();
 });
};
script.onerror=()=>{watcher.disconnect();hide()};document.head.append(script);
