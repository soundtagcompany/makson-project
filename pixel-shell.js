import {openWindow} from '/app.js';
import {setCatalogCollapsed} from '/console-shell.js';
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
body.preview-native-home .desktop-header,body.preview-native-home #sphere-stage{opacity:0!important}
body.preview-native-home #framebuffer-preview #controls button:focus-visible{outline-width:var(--preview-cell);outline-offset:calc(-1 * var(--preview-cell))}

#framebuffer-preview canvas{position:absolute;inset:0 auto auto 0;image-rendering:pixelated;pointer-events:none}
#framebuffer-preview #controls{position:absolute;inset:0;pointer-events:none}
#framebuffer-preview #controls button{position:absolute;pointer-events:auto;background:none!important;box-shadow:none!important;border:0!important;color:transparent!important;margin:0;padding:0;appearance:none;cursor:pointer}
#framebuffer-preview #controls button:focus-visible{outline:2px solid white!important;outline-offset:-2px}
/* Keep the original sphere and its touch controls in the visible work area. */
body.preview-native-home #console-shell{transition:none!important}
@media (orientation:portrait) and (max-width:950px){
 body.preview-native-home #console-shell{
  grid-template-rows:minmax(0,1fr) var(--pixel-home-drawer,0px)!important;
 }
}
`;
document.head.append(style);
const windows=[...document.querySelectorAll('.window[id^="window-"]')], allowed=new Set(windows.map(w=>w.id.slice(7)));
const dock=document.querySelector('#console-dock'),contrast=matchMedia('(forced-colors:active)'),previousInert=new Map();
let ready=false,didSchedule=false,restore=null,drawer=null,contrastReturn=null;
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
  if(!ready||active||dock?.childElementCount){hide();return}
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
function contrastChanged(){sync()}
contrast.addEventListener('change',contrastChanged);
const script=document.createElement('script');script.src='/pixel-layout.js';
script.onload=()=>{if(!window.MaksonPreviewBitmap){watcher.disconnect();hide();return;}ready=true;contrastChanged()};
script.onerror=()=>{watcher.disconnect();hide()};document.head.append(script);
