// Native fullscreen is independent of the catalog and of device fullscreen.
const bindings=new Map();let siteButton=null,busy=false,fallback=null;
const suspended=new Map();
const native=()=>document.fullscreenElement||document.webkitFullscreenElement;
function sync(){
 const current=native()||fallback;
 document.body.classList.toggle('site-fullscreen',current===document.documentElement);
 document.body.classList.toggle('fullscreen-on',!!current);
 document.body.classList.toggle('game-fullscreen-on',!!current?.classList.contains('window'));
 const appFullscreen=!!current?.classList.contains('window');
 if(document.documentElement.classList.contains('console-pixel-screen'))document.documentElement.style.setProperty('filter',appFullscreen?'none':'url("#console-screen-pixels")','important');
 if(appFullscreen){
  if(suspended.has(current)){current.inert=suspended.get(current);suspended.delete(current);}
  for(const el of document.querySelectorAll('.desktop-header,#app-catalog,#catalog-toggle,#console-dock,.console-panel'))if(el!==current&&!suspended.has(el)){suspended.set(el,el.inert);el.inert=true;}
 }else{for(const [el,inert]of suspended)el.inert=inert;suspended.clear();}
 for(const [win,button]of bindings){const active=current===win;win.classList.toggle('game-fullscreen',active);button.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="'+(active?'M5 5h9v9H5zM2 11V2h9':'M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5')+'" fill="none" stroke="currentColor" stroke-width="2"/></svg>';button.title=active?'Выйти из полного экрана':'Полный экран';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(active));}
 if(siteButton){const active=current===document.documentElement;siteButton.textContent=active?'Выкл.':'Вкл.';siteButton.setAttribute('aria-label',active?'Выйти из полного экрана':'Сайт на весь экран устройства');siteButton.setAttribute('aria-pressed',String(active));}
 document.dispatchEvent(new Event('desktopfullscreenchange'));dispatchEvent(new Event('resize'));
}
export async function toggleFullscreen(target){
 if(busy||target.ownerDocument!==document)return;
 busy=true;
 try{
  if(fallback){fallback.classList.remove('fullscreen-fallback');const previous=fallback;fallback=null;if(previous===target)return;}
  if(native()===target){await (document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
  const request=target.requestFullscreen||target.webkitRequestFullscreen;
  if(request)await request.call(target);
  else if(target.classList.contains('window')){fallback=target;target.classList.add('fullscreen-fallback');}
 }catch{document.dispatchEvent(new CustomEvent('console-notice',{detail:'Браузер не разрешил полный экран. Можно открыть приложение в отдельном окне.'}));}
 finally{busy=false;sync();}
}
export function attachFullscreen(win,button){if(!button)return;bindings.set(win,button);button.onclick=()=>toggleFullscreen(win);sync();}
export function attachSiteFullscreen(button){siteButton=button;button.onclick=()=>toggleFullscreen(document.documentElement);sync();}
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,sync);
document.addEventListener('windowhide',e=>{const win=document.getElementById('window-'+e.detail);if(native()===win)(document.exitFullscreen||document.webkitExitFullscreen).call(document).catch(()=>{});if(fallback===win){fallback.classList.remove('fullscreen-fallback');fallback=null;sync();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fallback){fallback.classList.remove('fullscreen-fallback');fallback=null;sync();}});
