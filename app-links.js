import {desktopElement,onDesktopEvent,onDesktopWindowEvent} from './picture-in-picture.js';
const apps=new Set(['editor','game','naval','pulse','importopoly','buffer','meme','convert','download','svyaz']);
const modules={game:()=>import('./game.js'),naval:()=>import('./naval.js'),pulse:()=>import('./pulse.js'),importopoly:()=>import('./importopoly-bridge.js'),buffer:()=>import('./buffer.js')};
export function appURL(id,session){
 const url=new URL('/',location.origin);url.searchParams.set('app',id);
 if(session){url.searchParams.set('room',session.code);url.searchParams.set('session',session.roomId);}
 return url.href;
}
export function initAppLinks({open,collapse,copy,toast}){
 let popup=null,returnFocus=null;const pending=new Set();
 function close(){popup?.remove();popup=null;returnFocus?.focus({preventScroll:true});returnFocus=null;}
 function show(id,url,session=false,trigger){
  close();const win=desktopElement('window-'+id);returnFocus=trigger;
  const panel=win.ownerDocument.createElement('section');popup=panel;panel.dataset.session=session?'true':'';panel.className='app-link-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',session?'Ссылка на сессию':'Ссылка на приложение');
  panel.innerHTML='<div class="app-link-heading"><strong></strong><button type="button" aria-label="Закрыть ссылку">×</button></div><label>Адрес<input readonly data-native-keys aria-label="Адрес ссылки"></label><p></p><div class="app-link-actions"><button type="button">Копировать</button><a target="_blank" rel="noopener">Открыть</a></div><span role="status"></span>';
  panel.querySelector('strong').textContent=session?'Сессия · '+win.dataset.title:win.dataset.title;
  const input=panel.querySelector('input');input.value=url;input.onclick=()=>input.select();
  panel.querySelector('p').textContent=session?(id==='buffer'?'Текст и файлы будут доступны по этой ссылке.':'Ссылка приглашает в эту комнату. Подключение доступно, пока есть свободные места и игра не началась.'):'Приложение откроется с закрытым каталогом.';
  panel.querySelector('.app-link-heading button').onclick=close;
  panel.querySelector('.app-link-actions button').onclick=async()=>{panel.querySelector('[role=status]').textContent=await copy(url)?'Ссылка скопирована.':'Выделите и скопируйте адрес.';};
  panel.querySelector('a').href=url;
  win.append(panel);input.focus({preventScroll:true});input.select();
 }
 async function shareSession(id,trigger){
  if(!modules[id]||pending.has(id))return;pending.add(id);if(trigger)trigger.disabled=true;
  try{
   const module=await modules[id](),session=await module.prepareInvite();let roomId=session.roomId;
   if(!roomId){const endpoint=id==='game'?'/api/invite':'/api/'+id+'/invite';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(session)});const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось создать приглашение.');roomId=data.roomId;}
   if(!/^[a-f0-9]{32}$/.test(roomId||''))throw Error('Не удалось получить ссылку на комнату.');
   show(id,appURL(id,{code:session.code,roomId}),true,trigger);
  }catch(error){toast(error.message);}finally{pending.delete(id);if(trigger)trigger.disabled=false;}
 }
 for(const id of apps){
  const win=desktopElement('window-'+id);if(!win)continue;
  const button=document.createElement('button');button.type='button';button.dataset.appLink=id;button.title='Открыть страницу приложения';button.setAttribute('aria-label',button.title);button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 12 4-4M7 7l2-2a4 4 0 0 1 6 6l-2 2M13 13l-2 2a4 4 0 0 1-6-6l2-2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  button.onclick=e=>{e.stopPropagation();window.open(appURL(id),'_blank','noopener');};win.querySelector('.window-controls').prepend(button);
 }
 onDesktopEvent('click',e=>{const button=e.target.closest('[data-share-session]');if(button)shareSession(button.dataset.shareSession,button);});
 document.addEventListener('share-app-session',e=>shareSession(e.detail));
 onDesktopWindowEvent('message',e=>{const frame=desktopElement('importopoly-frame');if(e.origin===location.origin&&e.source===frame?.contentWindow&&e.data?.type==='importopoly-share-session')shareSession('importopoly');});
 onDesktopEvent('pointerdown',e=>{if(popup&&!popup.contains(e.target)&&!e.target.closest('[data-app-link],[data-share-session]'))close();});
 onDesktopEvent('keydown',e=>{if(!popup)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.key==='Tab'){const items=[...popup.querySelectorAll('button,input,a')],first=items[0],last=items.at(-1);if(e.shiftKey&&e.target===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first.focus();}}},true);
 document.addEventListener('windowhide',close);
 const params=new URL(location.href).searchParams,id=params.get('app');
 if(!apps.has(id))return;
 collapse(true);open(id);document.title=desktopElement('window-'+id).dataset.title+' · MAKSON PROJECT';
 const code=params.get('room'),roomId=params.get('session');if(!code&&!roomId)return;
 if(!modules[id]||!(id==='importopoly'?/^\d{4}$/:/^\d{3}$/).test(code||'')||!/^[a-f0-9]{32}$/.test(roomId||'')){toast('Некорректная ссылка на сессию.');return;}
 const win=desktopElement('window-'+id),banner=document.createElement('div');banner.className='session-invitation';banner.innerHTML='<span></span><button type="button">Присоединиться</button><button type="button" aria-label="Закрыть приглашение">×</button>';
 const label=banner.querySelector('span');label.textContent='Приглашение · '+code;
 const [join,dismiss]=banner.querySelectorAll('button');dismiss.onclick=()=>banner.remove();
 join.onclick=async()=>{join.disabled=true;label.textContent='Подключение…';try{const module=await modules[id]();await module.joinInvitation(code,roomId);banner.remove();toast('Подключено к комнате '+code+'.');}catch(error){label.textContent=error.message;join.disabled=false;}};
 win.querySelector('.titlebar').after(banner);
}
