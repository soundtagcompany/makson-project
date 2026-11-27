import {openWindow} from '/app.js';
import {setCatalogCollapsed} from '/console-shell.js';
const params=new URLSearchParams(location.search);
if(location.hostname!=='127.0.0.1'||params.get('framebuffer')!=='1')throw Error('Local preview only');
const root=document.createElement('section');
root.id='framebuffer-preview';root.dataset.previewNative='1';root.hidden=true;root.setAttribute('aria-label','Пиксельный макет MAKSON PROJECT');
root.innerHTML='<canvas id="screen" aria-hidden="true"></canvas><nav id="controls" aria-label="Пиксельный каталог" data-native-keys></nav><p id="status" role="status" hidden></p>';
document.body.append(root);
const style=document.createElement('style');
style.textContent=`
#framebuffer-preview{position:fixed;inset:0;z-index:2147483640;overflow:hidden;background:transparent;pointer-events:none;zoom:calc(1 / var(--ui-scale,1))}
#framebuffer-preview[hidden]{display:none!important}
body.preview-native-home #app-catalog,body.preview-native-home #catalog-toggle{visibility:hidden!important}
#framebuffer-preview canvas{position:absolute;inset:0 auto auto 0;image-rendering:pixelated;pointer-events:none}
#framebuffer-preview #controls{position:absolute;inset:0;pointer-events:none}
#framebuffer-preview #controls button{position:absolute;pointer-events:auto;background:none!important;box-shadow:none!important;border:0!important;color:transparent!important;margin:0;padding:0;appearance:none;cursor:pointer}
#framebuffer-preview #controls button:focus-visible{outline:2px solid white!important;outline-offset:-2px}
body.preview-chrome .window[id^='window-']>.titlebar{background:#020906!important;background-image:none!important;box-shadow:none!important;text-shadow:none!important}
body.preview-chrome .window[id^='window-']>.titlebar>.window-controls button{background:#090f0c!important;border-radius:0!important;box-shadow:none!important;text-shadow:none!important}
body.preview-chrome .preview-bitmap-label{position:relative;min-height:var(--preview-title-min,0px);flex:1 1 0;min-width:0}
body.preview-chrome .preview-bitmap-label>.preview-native-text{display:contents}
body.preview-chrome .preview-bitmap-label:not([data-native-label])>.preview-native-text{color:transparent!important;text-shadow:none!important}
body.preview-chrome .preview-bitmap-label:not([data-native-label])>.preview-native-text svg{opacity:0!important}
body.preview-chrome .preview-bitmap-label canvas{position:absolute;visibility:visible;inset:calc((100% - var(--preview-title-min)) / 2) auto auto 0;translate:none;image-rendering:pixelated!important;pointer-events:none}
body.preview-chrome .preview-bitmap-label[data-native-label] canvas{display:none}
`;
document.head.append(style);
const windows=[...document.querySelectorAll('.window[id^="window-"]')], allowed=new Set(windows.map(w=>w.id.slice(7)));
const dock=document.querySelector('#console-dock'),contrast=matchMedia('(forced-colors:active)'),previousInert=new Map();
let direct=allowed.has(params.get('app'))&&params.get('app')!=='settings',ready=false,didSchedule=false,restore=null,drawer=null,contrastReturn=null;
function hide(){if(root.hidden)return;root.hidden=true;document.body.classList.remove('preview-native-home');for(const [el,old] of previousInert)el.inert=old;previousInert.clear();}
function show(){
 if(!root.hidden)return;
 for(const el of [document.querySelector('#app-catalog'),document.querySelector('#catalog-toggle')]){
  if(!el)continue;previousInert.set(el,el.inert);el.inert=true;
 }
 document.body.classList.add('preview-native-home');
 root.hidden=false;
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
 const titles=new Map([['editor','МОНТАЖКА'],['download','ЗАГРУЗЧИК'],['convert','КОНВЕРТЕР'],['buffer','БУФЕР']]);
 const labels=[];
 for(const [id,text] of titles){
  const title=document.querySelector('#window-'+id+'>.titlebar>span');
  if(!title)continue;
  const c=document.createElement('canvas');c.setAttribute('aria-hidden','true');c.dataset.pixelExempt='';
  const native=document.createElement('span');native.className='preview-native-text';
  native.append(...title.childNodes);title.append(native,c);
  title.classList.add('preview-bitmap-label');title.dataset.nativeLabel='';
  labels.push({title,text,c});
 }
 let pending=false;
 function draw(){
  if(pending)return;
  pending=true;requestAnimationFrame(()=>{
   pending=false;
   for(const {title,text,c} of labels){
    const pitch=bitmap.pitch(),size=bitmap.width(text);
    const bar=title.parentElement;
    const zoom=bar.offsetWidth?bar.getBoundingClientRect().width/bar.offsetWidth:1;
    if(zoom)title.style.setProperty('--preview-title-min',pitch*8/zoom+'px');
    const bounds=title.getBoundingClientRect();
    const fallback=contrast.matches||!bounds.width||pitch*size>bounds.width-1||pitch*8>bounds.height+.1;
    if(title.hasAttribute('data-native-label')!==fallback)title.toggleAttribute('data-native-label',fallback);
    if(fallback)continue;
    c.width=size;c.height=8;c.style.width=pitch*size/zoom+'px';c.style.height=8*pitch/zoom+'px';
    const color=getComputedStyle(title).getPropertyValue('--app-color').trim()||'#96eeb3';
    bitmap.draw(c,text,color);
   }
  });
 }
 const ro=new ResizeObserver(draw);labels.forEach(({title})=>ro.observe(title));
 contrast.addEventListener('change',draw);document.addEventListener('windowfocus',draw);
 addEventListener('resize',draw,{passive:true});draw();
}
const script=document.createElement('script');script.src='/__preview/prototype.js';
script.onload=()=>{ready=true;setupBitmapTitles();contrastChanged()};
script.onerror=()=>{watcher.disconnect();hide()};document.head.append(script);
