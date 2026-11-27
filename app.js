import {attachConsoleEffects} from './console-effects.js';
import {attachFloatingPanel} from './console-windows.js';
import {attachConsoleInput} from './console-input.js';
import {mountConsole,bindConsole,setCatalogCollapsed,attachGameControls,loadGame} from './console-shell.js';
import {desktopElement,desktopQuery,desktopQueryAll,onDesktopEvent,onDesktopWindowEvent,attachPictureInPicture,togglePictureInPicture,restorePictureInPicture,isPictureInPicture,pictureInPictureToast} from './picture-in-picture.js';
import {attachFullscreen,attachSiteFullscreen,toggleFullscreen} from './fullscreen.js';
const $=id=>desktopElement(id);
export const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem('makson_'+key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem('makson_'+key,JSON.stringify(value));return true;}catch{return false;}}};
const defaults={sound:true,crt:false,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,night:false,exposure:false,blur:false,music:true,wildEffects:false};
export const settings={effectsVolume:.65,musicVolume:.45,...defaults,...storage.get('settings',{}),crt:false,blur:false,exposure:false,blurAmount:0,exposureAmount:0,wildEffects:false,pixelated:true};
mountConsole();
const clampVolume=v=>Math.max(0,Math.min(1,Number(v)||0));
const sounds=Object.fromEntries(['error','tada'].map(name=>[name,new Audio(name+'.mp3')]));
for(const a of Object.values(sounds)){a.preload='none';a.volume=.25;}
export function sound(name){if(!settings.sound)return;if(name==='click'){document.dispatchEvent(new CustomEvent('console-ui-sound',{detail:'click'}));return;}const a=sounds[name];if(a){a.volume=clampVolume(settings.effectsVolume)*.4;a.currentTime=0;a.play().catch(()=>{});}}
let toastTimer;
export function toast(text){pictureInPictureToast(text);$('toast-text').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
export async function copy(text){try{if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(text);}else{const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;left:-9999px';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error();}toast('Скопировано.');return true;}catch{toast('Не удалось скопировать. Выдели текст и скопируй вручную.');return false;}}
const windows=[...desktopQueryAll('.window')],openTasks=new Set(),docking=new Set();
let active='',gameModule,navalModule,pulseModule;
const panelIds=new Set(['svyaz','settings']);
function fitWindow(){dispatchEvent(new Event('resize'));}
function fitWorkspace(){const view=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',((view&&view.scale===1?Math.min(innerHeight,view.height):innerHeight)/(Number(document.body.style.zoom)||1))+'px');}
addEventListener('resize',fitWorkspace);window.visualViewport?.addEventListener('resize',fitWorkspace);fitWorkspace();
attachFullscreen($('window-game'),$('game-fullscreen'));
attachSiteFullscreen($('site-fullscreen'));
attachFullscreen($('window-svyaz'),$('window-svyaz').querySelector('[data-action=maximize]'));
function desktopState(){
 const occupied=windows.some(w=>!w.hidden&&!isPictureInPicture(w)&&!panelIds.has(w.id.slice(7)));
 document.body.classList.toggle('has-open-windows',occupied);
 document.body.classList.toggle('game-active',active==='game'&&!$('window-game').hidden);
 const sphere=$('sphere-stage'),wasHidden=sphere.hidden;sphere.hidden=occupied;if(wasHidden&&!occupied&&motionEnabled())sphere.animate([{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
}
function focusWindow(win){
 const id=win.id.slice(7);
 if(!panelIds.has(id)){
  for(const other of windows){if(other===win||other.hidden||isPictureInPicture(other)||panelIds.has(other.id.slice(7)))continue;cancelDock(other);other.hidden=true;document.dispatchEvent(new CustomEvent('windowhide',{detail:other.id.slice(7)}));}
  active=id;
 }
 win.classList.remove('inactive');desktopState();renderTasks();
 document.dispatchEvent(new CustomEvent('windowfocus',{detail:id}));
}
function motionEnabled(){return settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function cancelDock(win){win._hideToken=null;win.classList.remove('dock-transition');win.inert=false;docking.delete(win.id.slice(7));win.getAnimations().forEach(a=>a.cancel());}
function dockRect(id){const task=$('console-dock').querySelector(`[data-task="${id}"]`);if(!task)return null;task.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return task.getBoundingClientRect();}
function animateDock(win,from,to,restoring=false){
 const base=win.getBoundingClientRect(),z=Number(document.body.style.zoom)||1;
 if(!base.width||!base.height)return null;
 const at=r=>({translate:`${(r.x-base.x)/z}px ${(r.y-base.y)/z}px`,scale:`${Math.max(.01,r.width/base.width)} ${Math.max(.01,r.height/base.height)}`});
 win.classList.add('dock-transition');win.inert=true;
 return win.animate([{...at(from),opacity:restoring?.3:1},{...at(to),opacity:restoring?1:.2}],{duration:restoring?480:420,easing:'cubic-bezier(.22,1,.36,1)'});
}
function reveal(win,origin){
 if(!motionEnabled()||isPictureInPicture(win))return;
 win.getAnimations().forEach(a=>a.cancel());const panel=panelIds.has(win.id.slice(7));
 if(document.body.classList.contains('preview-native-home')){
  if((win.id==='window-settings'&&window.MaksonPixelApp?.hasSettings?.())||(win.id==='window-buffer'&&window.MaksonPixelApp?.hasBuffer?.())||window.MaksonPixelApp?.hasTools?.(win.id.slice(7)))return;
  win.classList.add('window-opening');
  const wipe=win.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],
   {duration:230,easing:'cubic-bezier(.24,.81,.27,1)'});
  wipe.finished.then(()=>win.classList.remove('window-opening'),()=>win.classList.remove('window-opening'));
  return;
 }
 win.classList.add('window-opening');
 const box=win.getBoundingClientRect(),z=Number(document.body.style.zoom)||1;const travel=origin&&!panel?`${(origin.x+origin.width/2-box.x-box.width/2)/z}px ${(origin.y+origin.height/2-box.y-box.height/2)/z}px`:'0 8px';
 const animation=win.animate([{scale:panel?'.985':'.88',translate:panel?(win.id==='window-settings'?'-8px -6px':'8px -6px'):travel,opacity:0},{scale:'1',translate:'0 0',opacity:1}],{duration:panel?250:440,easing:'cubic-bezier(.22,1,.36,1)'});
 animation.finished.then(()=>win.classList.remove('window-opening'),()=>win.classList.remove('window-opening'));
}
export function openWindow(id){
 if(id==='notes'||id==='shabash')return;
 if(id==='home'){id='svyaz';document.dispatchEvent(new CustomEvent('svyazpage',{detail:'account'}));}
 const win=$('window-'+id);if(!win)return;
 if(panelIds.has(id))for(const other of panelIds)if(other!==id)hideWindow($('window-'+other));
 const source=document.querySelector(`[data-sphere-app="${id}"]`);const launchOrigin=!$('sphere-stage').hidden&&source?source.getBoundingClientRect():null;
 const origin=win.hidden?dockRect(id):null;cancelDock(win);const wasHidden=win.hidden;win.hidden=false;openTasks.add(id);focusWindow(win);
 if(isPictureInPicture(win))win.ownerDocument.defaultView.focus();else if(wasHidden){
  if(origin&&motionEnabled()&&win.ownerDocument===document&&!document.fullscreenElement){
   const token={};win._hideToken=token;const animation=animateDock(win,origin,win.getBoundingClientRect(),true);
   if(animation)animation.finished.then(()=>{if(win._hideToken===token)cancelDock(win);}).catch(()=>{});else cancelDock(win);
  }else reveal(win,launchOrigin);
 }
 if(id==='editor')ensureEditor();if(id==='meme')ensureMeme();if(id==='convert'||id==='download')ensureTools();if(id==='game')ensureGame();if(id==='naval')ensureNaval();if(id==='pulse')ensurePulse();if(id==='importopoly')ensureImportopoly();
}
function hideWindow(win,close=false,animate=false){
 if(animate&&!close&&win&&!win.hidden&&win.id!=='window-settings'&&motionEnabled()&&!isPictureInPicture(win)&&win.ownerDocument===document&&!document.fullscreenElement&&!win.classList.contains('fullscreen-fallback')){
  if(docking.has(win.id.slice(7)))return;
  cancelDock(win);const from=win.getBoundingClientRect(),id=win.id.slice(7);docking.add(id);renderTasks();const target=dockRect(id);
  if(target){const token={};win._hideToken=token;const animation=animateDock(win,from,target);
   if(animation){animation.finished.then(()=>{if(win._hideToken===token)hideWindow(win,false);}).catch(()=>{});return;}
   hideWindow(win,false);return;
  }
  docking.delete(id);
 }

 if(animate&&win&&!win.hidden&&motionEnabled()&&!isPictureInPicture(win)){
  const token={};win._hideToken=token;win.getAnimations().forEach(a=>a.cancel());
  win.animate([{opacity:1,translate:'0 0'},{opacity:0,translate:'0 12px'}],{duration:230,easing:'cubic-bezier(.4,0,.7,.2)'}).finished.then(()=>{if(win._hideToken===token){win._hideToken=null;hideWindow(win,close);}}).catch(()=>{});return;
 }

 if(!win)return;cancelDock(win);if(win.hidden){if(close){openTasks.delete(win.id.slice(7));renderTasks();}return;}
 win.dataset.closing='true';restorePictureInPicture(win,{focus:false});delete win.dataset.closing;win.getAnimations().forEach(a=>a.cancel());win.hidden=true;
 const id=win.id.slice(7);if(close)openTasks.delete(id);if(active===id)active='';if(id==='settings')$('console-settings').focus({preventScroll:true});
 document.dispatchEvent(new CustomEvent('windowhide',{detail:id}));desktopState();renderTasks();document.dispatchEvent(new CustomEvent('windowfocus',{detail:active}));
}
function renderTasks(){
 for(const button of document.querySelectorAll('[data-select-app]')){const id=button.dataset.selectApp;button.dataset.running=String(openTasks.has(id));button.setAttribute('aria-current',String(active===id&&!$('window-'+id)?.hidden));}
 const dock=$('console-dock'),ids=[...openTasks].filter(id=>id!=='settings'&&($('window-'+id)?.hidden||docking.has(id)));
 for(const item of [...dock.children])if(!ids.includes(item.dataset.task))item.remove();
 for(const id of ids){if(dock.querySelector(`[data-task="${id}"]`))continue;const win=$('window-'+id),item=document.createElement('div');item.className='console-task';item.dataset.task=id;item.style.setProperty('--app-color',win.style.getPropertyValue('--app-color')||'#71ef8b');const restore=document.createElement('button');restore.textContent=win.dataset.title||id;restore.setAttribute('aria-label','Восстановить '+restore.textContent);restore.onclick=()=>openWindow(id);const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Закрыть '+restore.textContent);close.onclick=()=>hideWindow(win,true);item.append(restore,close);dock.append(item);}
 dock.hidden=!ids.length;$('app-workspace').classList.toggle('has-docked-apps',!!ids.length);
}
function windowAction(button){const win=button.closest('.window');if(!win)return;if(button.dataset.action==='pip')togglePictureInPicture(win);else if(button.dataset.action==='maximize'){if(!button.onclick)toggleFullscreen(win);}else if(['minimize','close'].includes(button.dataset.action))hideWindow(win,button.dataset.action==='close',true);}
onDesktopEvent('click',e=>{
 const open=e.target.closest('[data-open]');if(open)openWindow(open.dataset.open);
 const action=e.target.closest('.window-controls [data-action]');if(action)windowAction(action);

});
function showDesktop(){windows.filter(w=>!w.hidden&&!isPictureInPicture(w)&&!panelIds.has(w.id.slice(7))).forEach(w=>hideWindow(w));}
bindConsole({open:openWindow,preview:showDesktop,pip:win=>togglePictureInPicture(win),toggle:id=>{const win=$('window-'+id);if(win.hidden)openWindow(id);else hideWindow(win,false,true);},storage});
$('toast').onclick=()=>{$('toast').hidden=true;clearTimeout(toastTimer);};$('toast').tabIndex=0;$('toast').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('toast').hidden=true;clearTimeout(toastTimer);}};
document.addEventListener('console-notice',e=>toast(e.detail));
attachFloatingPanel($('window-svyaz'));
document.addEventListener('pointerdown',e=>{const panel=$('window-settings');if(!panel.hidden&&!e.target.closest('#window-settings,#console-settings'))hideWindow(panel);});
attachConsoleInput({back:()=>{const panel=[...panelIds].find(id=>!$('window-'+id).hidden);if(panel)hideWindow($('window-'+panel));else if(active)hideWindow($('window-'+active));$('toast').hidden=true;},home:()=>{for(const id of panelIds)hideWindow($('window-'+id));document.querySelector('#app-catalog summary')?.focus();}});
function applySettings(){
 Object.assign(settings,{blur:false,exposure:false,blurAmount:0,exposureAmount:0,crt:false,pixelated:true,wildEffects:false});
 document.body.classList.remove('crt-on');document.body.classList.add('exposure-off','blur-off');
 document.body.classList.toggle('night',settings.night);document.body.classList.toggle('reduced-motion',!settings.motion);
 for(const key of ['sound','motion','night'])$('setting-'+key).checked=!!settings[key];
 storage.set('settings',Object.fromEntries(['sound','motion','night','music','musicVolume','effectsVolume'].map(key=>[key,settings[key]])));document.dispatchEvent(new Event('settingschange'));
}
for(const key of ['sound','motion','night'])$('setting-'+key).onchange=e=>{settings[key]=e.target.checked;applySettings();};
$('reset-settings').onclick=()=>{Object.assign(settings,defaults,{effectsVolume:.65,musicVolume:.45});syncVolumes();applySettings();toast('Параметры восстановлены.');};
applySettings();
function syncVolumes(){}
attachGameControls(settings,applySettings);
function ensurePulse(){return loadGame('pulse',async()=>{const module=await import('./pulse.js');},settings);}
function ensureNaval(){return loadGame('naval',async()=>{const module=await import('./naval.js');},settings);}
function ensureGame(){return loadGame('game',async()=>{const module=await import('./game.js');module.wake();},settings);}
const best=storage.get('best_v4_sprint',null);if(best){$('race-record').textContent=formatTime(best);}
export function formatTime(time){return Math.floor(time/60)+':'+(time%60).toFixed(1).padStart(4,'0');}
export function saveRecord(time,mode='sprint'){const old=storage.get('best_v4_'+mode,null);if(old===null||(mode==='endless'?time>old:time<old)){storage.set('best_v4_'+mode,time);document.dispatchEvent(new CustomEvent('console-activity',{detail:'Новый рекорд: '+formatTime(time)}));$('race-record').textContent=formatTime(time);return true;}return false;}
attachPictureInPicture(windows.filter(win=>win.id!=='window-settings'),{notify:toast,onChange:(win,focus)=>{if(win.dataset.closing)return;fitWindow(win);if(focus||win.ownerDocument===document&&!win.hidden)focusWindow(win);else{desktopState();renderTasks();document.dispatchEvent(new Event('visibilitychange'));}}});
renderTasks();desktopState();
attachConsoleEffects(settings);
const bootScene=import('./orbit.js').catch(()=>toast('Не удалось загрузить сферу. Приложения доступны в каталоге.'));
Promise.allSettled([bootScene,document.fonts.load('16px ConsoleMono')]).then(()=>window.maksonBoot?.ready());
import('./buffer.js').catch(()=>toast('Буфер не загрузился. Обнови страницу.'));
const invite=new URL(location.href).searchParams.get('room');if(!new URL(location.href).searchParams.has('app')&&invite&&/^\d{3}$/.test(invite)){$('race-code').value=invite.toUpperCase();openWindow('game');toast('Приглашение найдено. Введи позывной и нажми «Войти».');}

import('./svyaz.js').catch(()=>toast('СВЯЗЬ не загрузилась. Обнови страницу.'));

// Embedded board game keeps one live session while the desktop window is resized.
attachFullscreen($('window-importopoly'),$('importopoly-fullscreen'));
function importopolySettings(){const frame=$('importopoly-frame');if(!frame?.hasAttribute('src'))return;frame.contentWindow?.postMessage({type:'importopoly-settings',blur:0,exposure:0,motion:settings.motion,sound:settings.sound,music:settings.music,musicVolume:settings.musicVolume,effectsVolume:settings.effectsVolume,visible:!$('window-importopoly').hidden&&!$('window-importopoly').classList.contains('inactive')&&!$('window-importopoly').ownerDocument.hidden},location.origin);}
function ensureImportopoly(){return loadGame('importopoly',()=>new Promise((resolve,reject)=>{
 const frame=$('importopoly-frame');let timer;
 const ready=e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.type!=='importopoly-ready')return;cleanup();importopolySettings();resolve();};
 const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',ready);};
 window.addEventListener('message',ready);timer=setTimeout(()=>{cleanup();reject(Error('Игра не ответила'));},20000);
 frame.src=frame.dataset.src;
}),settings);}

$('importopoly-frame').addEventListener('load',importopolySettings);
for(const type of ['settingschange','windowhide','windowfocus','visibilitychange'])document.addEventListener(type,importopolySettings);
onDesktopWindowEvent('message',e=>{const frame=$('importopoly-frame');if(e.origin!==location.origin||e.source!==frame?.contentWindow)return;if(e.data?.type==='importopoly-ready')importopolySettings();if(e.data?.type==='importopoly-invite')document.dispatchEvent(new CustomEvent('gameinvite',{detail:{game:'importopoly'}}));if(e.data?.type==='importopoly-fullscreen')$('importopoly-fullscreen').click();if(e.data?.type==='importopoly-focus'&&active!=='importopoly')focusWindow($('window-importopoly'));});

onDesktopEvent('click',e=>{const button=e.target.closest('[data-game-invite]');if(button)document.dispatchEvent(new CustomEvent('gameinvite',{detail:{game:button.dataset.gameInvite}}));});
// Bind the floating toolbar directly so moving the window to PiP keeps controls live.
$('window-svyaz').querySelector('.window-controls').addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;e.stopPropagation();windowAction(button);});



let toolsModule;
function ensureTools(){toolsModule||=import('./tools-ui.js').then(m=>m.initTools()).catch(()=>{toolsModule=null;toast('Не удалось загрузить программы. Попробуй ещё раз.');});}
for(const id of ['convert','download'])attachFullscreen($('window-'+id),$(id+'-fullscreen'));
let memeModule;
function ensureMeme(){memeModule||=import('./meme.js').then(m=>m.initMeme()).catch(()=>{memeModule=null;toast('Мемоинатор не загрузился. Открой его ещё раз.');});}
attachFullscreen($('window-meme'),$('meme-fullscreen'));

// Register every app control, including applications whose content loads later.
for(const win of windows){if(win.id==='window-settings')continue;let button=win.querySelector('[data-action=maximize],button[id$="-fullscreen"]');if(!button){button=document.createElement('button');button.dataset.action='maximize';win.querySelector('[data-action=close]').before(button);}attachFullscreen(win,button);}
import('./app-links.js').then(m=>m.initAppLinks({open:openWindow,collapse:setCatalogCollapsed,copy,toast})).catch(()=>toast('Ссылки приложений не загрузились. Обнови страницу.'));

let editorModule;
function ensureEditor(){editorModule||=import('./editor.js').then(m=>m.initEditor()).catch(()=>{editorModule=null;toast('Монтажка не загрузилась. Открой её ещё раз.');});}
