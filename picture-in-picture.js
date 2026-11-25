// A single native PiP surface can host several existing desktop windows.
// Move the live nodes so inputs, event handlers and game sessions survive.
let pip=null,pending=false,onChange=()=>{},notify=()=>{},observer=null;
const entries=new Map(),listeners=[],windowListeners=[];
export const isPictureInPicture=win=>entries.has(win);
export const desktopElement=id=>document.getElementById(id)||pip?.document.getElementById(id);
export const desktopQuery=selector=>document.querySelector(selector)||pip?.document.querySelector(selector);
export const desktopQueryAll=selector=>[...document.querySelectorAll(selector),...(pip?.document.querySelectorAll(selector)||[])];
export function onDesktopEvent(type,handler,options){
 listeners.push({type,handler,options});document.addEventListener(type,handler,options);pip?.document.addEventListener(type,handler,options);
}
export function onDesktopWindowEvent(type,handler,options){
 windowListeners.push({type,handler,options});window.addEventListener(type,handler,options);pip?.addEventListener(type,handler,options);
}
// Frame requests follow their element when it moves to another document.
const frames=new Set();
export function windowFrame(element,callback){
 const frame={element,callback,view:element.ownerDocument.defaultView,id:0};
 frame.run=()=>{frames.delete(frame);callback(performance.now());};
 frame.id=frame.view.requestAnimationFrame(frame.run);frames.add(frame);return frame;
}
export function cancelWindowFrame(frame){if(!frame)return;frame.view.cancelAnimationFrame(frame.id);frames.delete(frame);}
function migrateFrames(){for(const frame of frames){const view=frame.element.ownerDocument.defaultView;if(view!==frame.view){frame.view.cancelAnimationFrame(frame.id);frame.view=view;frame.id=view.requestAnimationFrame(frame.run);}}}
function updateButton(win,on){const button=win.querySelector('[data-action="pip"]');button.title=on?'Вернуть на рабочий стол':'Картинка в картинке';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(on));}
function syncTheme(){
 if(!pip)return;
 pip.document.body.className='pip-desktop '+['crt-on','exposure-off','blur-off','night','reduced-motion'].filter(c=>document.body.classList.contains(c)).join(' ');
 pip.document.body.style.cssText=document.body.style.cssText;
}
function layout(){if(!pip)return;pip.document.querySelector('.pip-workspace').classList.toggle('pip-single',entries.size===1);pip.document.title=entries.size===1?[...entries.keys()][0].dataset.title+' · MAKSON PROJECT':'Картинка в картинке · MAKSON PROJECT';}
export function pictureInPictureToast(text){
 if(!pip)return;const status=pip.document.querySelector('.pip-toast');status.textContent=text;status.hidden=false;status.onclick=()=>{status.hidden=true;clearTimeout(status._timer);};
 clearTimeout(status._timer);status._timer=setTimeout(()=>status.hidden=true,5500);
}
export function restorePictureInPicture(win,{focus=true,closeEmpty=true}={}){
 const entry=entries.get(win);if(!entry)return;
 entries.delete(win);entry.marker.replaceWith(win);win.classList.remove('window-pip');updateButton(win,false);migrateFrames();layout();onChange(win,focus);
 if(closeEmpty&&!entries.size&&pip)pip.close();
}
function setup(surface){
 pip=surface;const doc=pip.document;
 doc.documentElement.lang=document.documentElement.lang;
 const base=doc.createElement('base');base.href=document.baseURI;doc.head.append(base);
 for(const source of document.querySelectorAll('link[rel="stylesheet"],style'))doc.head.append(source.cloneNode(true));
 const library=document.querySelector('.svg-library');if(library)doc.body.append(library.cloneNode(true));
 const workspace=doc.createElement('main');workspace.className='pip-workspace';doc.body.append(workspace);
 const status=doc.createElement('div');status.className='pip-toast';status.setAttribute('role','status');status.hidden=true;doc.body.append(status);
 for(const {type,handler,options}of listeners)doc.addEventListener(type,handler,options);
 for(const {type,handler,options}of windowListeners)pip.addEventListener(type,handler,options);
 syncTheme();document.dispatchEvent(new CustomEvent('console-pip-ready',{detail:doc}));observer=new MutationObserver(syncTheme);observer.observe(document.body,{attributes:true,attributeFilter:['class','style']});
 const visibility=()=>document.dispatchEvent(new Event('visibilitychange'));
 doc.addEventListener('visibilitychange',visibility);
 pip.addEventListener('focus',visibility);
 pip.addEventListener('blur',()=>document.dispatchEvent(new Event('desktopwindowblur')));
 pip.addEventListener('pagehide',()=>{
  observer?.disconnect();observer=null;
  // Clear the surface first: restoring the last node must not close it recursively.
  pip=null;
  for(const win of [...entries.keys()])restorePictureInPicture(win,{focus:false,closeEmpty:false});
  for(const {type,handler,options}of listeners)doc.removeEventListener(type,handler,options);
  for(const {type,handler,options}of windowListeners)surface.removeEventListener(type,handler,options);
  visibility();
 },{once:true});
}
export async function togglePictureInPicture(win){
 if(entries.has(win)){restorePictureInPicture(win);return;}
 if(!window.documentPictureInPicture?.requestWindow){notify('Картинка в картинке недоступна. Открой сайт в Chrome или Edge на компьютере через HTTPS или localhost.');return;}
 if(pending)return;
 // Fullscreen and PiP have separate native surfaces; exit fullscreen first.
 if(document.fullscreenElement||document.body.classList.contains('fullscreen-on')){notify('Сначала выйди из полноэкранного режима, затем включи картинку в картинке.');return;}
 try{
  pending=true;
  if(!pip||pip.closed){const r=win.getBoundingClientRect();setup(await window.documentPictureInPicture.requestWindow({width:Math.round(Math.max(360,Math.min(960,r.width))),height:Math.round(Math.max(300,Math.min(720,r.height)))}));}
  if(win.hidden){if(!entries.size)pip.close();return;}
  const marker=document.createComment('PiP: '+win.id);win.before(marker);entries.set(win,{marker});
  win.getAnimations().forEach(animation=>animation.cancel());win.classList.add('window-pip');
  pip.document.querySelector('.pip-workspace').append(win);updateButton(win,true);migrateFrames();layout();onChange(win,true);pip.focus();
 }catch(error){
  if(entries.has(win))restorePictureInPicture(win,{focus:false});
  if(pip&&!entries.size)pip.close();
  notify('Не удалось открыть картинку в картинке. Попробуй ещё раз.');
 }finally{pending=false;}
}
export function attachPictureInPicture(windows,options){
 onChange=options.onChange;notify=options.notify;
 for(const win of windows){const button=document.createElement('button');button.dataset.action='pip';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="12" y="11" width="7" height="6" fill="currentColor"/></svg>';win.querySelector('.window-controls').prepend(button);updateButton(win,false);}
}
