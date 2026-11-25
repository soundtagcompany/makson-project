import {desktopElement,desktopQueryAll,onDesktopEvent,windowFrame,cancelWindowFrame} from './picture-in-picture.js';
import {openWindow,settings} from './app.js';
import './account.js';
import {setupSocial} from './social.js';
import {setupVoice} from './voice.js';
import {setupPhotos} from './svyaz-photos.js';
const accountRoot=desktopElement('svyaz-root'),chatWindow=desktopElement('window-svyaz'),root=desktopElement('svyaz-chat'),tabs=desktopElement('overview-tabs');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user=null,csrf='',page='chat',authMode='login',dialog=null,peer=null,dialogs=[],messages=[],blocked=false,peerRead=0,hasOlder=false,busy=false,polling=false,timer,searchTimer,searchVersion=0,viewVersion=0,pendingSend=null,openRequest=0,listReturn=null;
const social=setupSocial({api,getUser:()=>user,getPeer:()=>peer,root,openChat:async id=>{openWindow('svyaz');selectPage('chat');await openContact(id);}});
const drafts=new Map();
const photos=setupPhotos({root,getDialog:()=>dialog,canAttach:()=>!!dialog&&!blocked&&!busy,notice});
const voice=setupVoice({api,getUser:()=>user,getPeer:()=>peer,root,chatWindow});
let verificationEmail='';try{verificationEmail=sessionStorage.getItem('makson_pending_email')||'';}catch{}
function pendingEmail(value){verificationEmail=value;try{if(value)sessionStorage.setItem('makson_pending_email',value);else sessionStorage.removeItem('makson_pending_email');}catch{}}
let accountStats=null,statsOwner=null,statsVersion=0;
const gameNames={asteroid:'ГИПНОРОЙДЕР',naval:'МОРСКАЯ ДВИЖУХА',pulse:'ПУЛЬС',importopoly:'СДВГПОЛИЯ'};
const modeNames={sprint:'20 КМ',overdrive:'МЯСОРУБКА',chill:'БЕЗ ПАНИКИ',endless:'БЕСКОНЕЧНЫЙ',classic:''};
const timeText=s=>Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0');
async function loadStats(){
 if(!user)return;const owner=user.id,version=++statsVersion;
 try{const stats=await api('stats');if(user?.id!==owner||version!==statsVersion)return;accountStats=stats;statsOwner=owner;renderStats();}
 catch(e){const box=accountRoot.querySelector('.sv-stats');if(box)box.textContent='Результаты пока не загрузились. Открой профиль ещё раз.';}
}
function renderStats(){
 const box=accountRoot.querySelector('.sv-stats');if(!box||!user)return;
 if(!accountStats||statsOwner!==user.id){box.textContent='ЗАГРУЗКА РЕЗУЛЬТАТОВ…';return;}
 const totals=accountStats.totals.filter(t=>gameNames[t.game]),recent=accountStats.recent.filter(t=>gameNames[t.game]);
 const played=totals.reduce((n,t)=>n+t.played,0),wins=totals.reduce((n,t)=>n+t.wins,0);
 const achievements=[['ПЕРВЫЙ ЗАПУСК',played>=1],['ПЕРВАЯ ПОБЕДА',wins>=1],['ДЕСЯТЬ ПОБЕД',wins>=10],['ВСЕ ИГРЫ',Object.keys(gameNames).every(game=>totals.some(t=>t.game===game&&t.played>0))]];
 const badges='<div class="sv-strip">ДОСТИЖЕНИЯ</div><div class="console-achievements">'+achievements.map(([name,done])=>'<span class="'+(done?'earned':'locked')+'">'+(done?'[+] ':'[ ] ')+name+'</span>').join('')+'</div>';

 box.innerHTML=badges+`<div class="sv-strip">ИГРОВЫЕ РЕЗУЛЬТАТЫ</div><div class="sv-stats-body">${totals.length?totals.map(t=>`<article><strong>${gameNames[t.game]} ${modeNames[t.mode]||''}</strong><small>${t.network?'ОНЛАЙН':'ОДИНОЧНАЯ'} · ${t.played} ИГР · ${t.wins} ПОБЕД · ${t.losses} ПОРАЖЕНИЙ</small>${t.game==='asteroid'?`<p>${t.mode==='endless'?'ВЫЖИВАНИЕ '+timeText(t.longest):'ЛУЧШЕЕ ВРЕМЯ '+(t.bestTime?timeText(t.bestTime):'—')}<br>${t.bestScore.toLocaleString('ru')} ОЧКОВ · ${t.distance.toLocaleString('ru')} М</p>`:`<p>${Math.round(t.wins/t.played*100)}% ПОБЕД${t.game==='pulse'?' · ДО '+t.maxRounds+' ПАРТИИ':''}</p>`}</article>`).join(''):'<p>Пока нет результатов. Сыграй в любую игру, чтобы здесь появились рекорды. Результаты гостя остаются на устройстве.</p>'}${recent.length?`<details><summary>ПОСЛЕДНИЕ ИГРЫ</summary>${recent.map(r=>`<div class="sv-history"><span>${gameNames[r.game]}<small>${new Date(r.finished_at).toLocaleString('ru',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${r.network?'ОНЛАЙН':'ОДИНОЧНАЯ'} ${modeNames[r.mode]||''}</small></span><b>${{win:'ПОБЕДА',loss:'ПОРАЖЕНИЕ',draw:'НИЧЬЯ'}[r.outcome]}</b></div>`).join('')}</details>`:''}</div>`;
}
let link=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
if(!['verify','reset'].includes(link.svyaz))link=null;
const visible=()=>page==='chat'&&!chatWindow.hidden&&!chatWindow.ownerDocument.hidden;
async function api(action,data){
 const multipart=data instanceof FormData,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),multipart?60000:22000);
 try{const response=await fetch('/api/svyaz/'+action,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{...(!multipart?{'Content-Type':'application/json'}:{}),'X-CSRFToken':csrf}:{},body:data?(multipart?data:JSON.stringify(data)):undefined,signal:controller.signal});const result=await response.json();if(!response.ok){const error=Error(result.error||'Не удалось выполнить запрос.');error.status=response.status;throw error;}if(result.csrf)csrf=result.csrf;return result;}catch(e){if(e.name==='AbortError')throw Error('Сервер не отвечает. Попробуй ещё раз.');throw e;}finally{clearTimeout(timeout);}
}
function notice(text='',container=root){const box=container.querySelector('.sv-error');if(box)box.textContent=text;}
function selectPage(next){
 openRequest++;saveDraft();const previous=page;page=!user||next==='account'?'account':'chat';
 tabs.querySelectorAll('[data-overview]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.overview===page)));
 accountRoot.hidden=page!=='account';root.hidden=page!=='chat';
 if(page==='account'){if(user||previous!=='account'||!accountRoot.firstElementChild)renderAccount();}else render();schedule();
}
document.addEventListener('svyazpage',e=>selectPage(e.detail));
function accountLabel(){if(statsOwner!==user?.id){accountStats=null;statsOwner=null;}desktopElement('overview-account').textContent=user?'ПРОФИЛЬ':'ВХОД';chatWindow.dataset.accountState=user?'member':'guest';document.dispatchEvent(new Event('svyazlayout'));document.dispatchEvent(new CustomEvent('accountchange',{detail:{user}}));}
function saveDraft(){const field=root.querySelector('[name=message]');if(field&&dialog)drafts.set(dialog,field.value);}
function render(){
 if(!user){root.innerHTML='<div class="sv-empty"><b>СВЯЗЬ</b><p>Войди в аккаунт, чтобы написать сообщение.</p><button data-sv="account">ВОЙТИ / РЕГИСТРАЦИЯ</button></div><p class="sv-error" role="status"></p>';return;}
 root.innerHTML=`<div class="sv-topline"><button class="sv-identity" data-sv="account" title="Мой аккаунт"><span class="sv-avatar">${esc(user.name[0]?.toUpperCase())}</span><span>${esc(user.name)}<small>@${esc(user.username)}</small></span></button><div class="sv-tools"></div></div><div class="sv-shell ${dialog?'sv-has-dialog':''}"><aside class="sv-contacts"><form class="sv-search"><input name="search" aria-label="Поиск по нику" placeholder="Найти @ник" maxlength="24" autocomplete="off"><button aria-label="Очистить поиск" type="button" data-sv="clear-search">×</button></form><div class="sv-contact-list"></div></aside><section class="sv-chat">${dialog?`<header class="sv-chat-head"><button class="sv-back" data-sv="back" aria-label="Назад к диалогам">←</button><span class="sv-avatar sv-peer-avatar">${esc(peer?.name[0]?.toUpperCase())}</span><div class="sv-peer"><strong>${esc(peer?.name)}</strong><small></small></div><div class="sv-peer-actions"></div><details class="sv-options"><summary aria-label="Действия с собеседником" title="Действия">⋯</summary><div><button data-sv="block">${blocked?'Разблокировать':'Блокировать'}</button></div></details></header><div class="sv-log" aria-label="Переписка"><button class="sv-older" data-sv="older" ${hasOlder?'':'hidden'}>РАНЬШЕ ↑</button><div class="sv-messages"></div></div><form class="sv-compose"><div class="sv-photo-preview" hidden></div><div class="sv-compose-row"><button type="button" class="sv-attach" data-photo="choose" aria-label="Прикрепить фото" title="Прикрепить фото" ${blocked?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9M6 14l8-8"/></svg></button><input type="file" class="sv-photo-input" accept="image/jpeg,image/png,image/webp,image/gif" hidden><textarea name="message" maxlength="4000" rows="1" aria-label="Сообщение" placeholder="Написать…" ${blocked?'disabled':''}></textarea><button class="sv-send" type="submit" aria-label="Отправить сообщение" title="Отправить" ${blocked?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14"/></svg></button></div></form>`:`<div class="sv-empty"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 12h44v31H29L10 54V12Zm11 11h22M21 32h15"/></svg><b>НА СВЯЗИ</b><p>Выбери диалог или найди друга по нику.</p><button data-sv="find">НАЙТИ ДРУГА</button></div>`}</section></div><p class="sv-error" role="status"></p><div class="sv-bottom"><span id="sv-connection">● ПОДКЛЮЧЕНО</span><span>MAKSON PROJECT</span></div>`;
 social.draw();voice.draw();renderContacts();if(dialog){root.querySelector('[name=message]').value=drafts.get(dialog)||'';renderMessages(true);updatePeer();photos.draw();}
}
function renderAccount(){
 const profile=!!user&&!(link&&['verify','reset'].includes(authMode));
 const modes={login:'ВХОД В АККАУНТ',register:'РЕГИСТРАЦИЯ',recover:'ВОССТАНОВЛЕНИЕ',resend:'ПОДТВЕРЖДЕНИЕ ПОЧТЫ',verify:'ПОДТВЕРЖДЕНИЕ ПОЧТЫ','verify-code':'КОД ИЗ ПИСЬМА',reset:'НОВЫЙ ПАРОЛЬ'};
 let content;
 if(profile){content=`<div class="sv-profile-identity"><b>${esc(user.name)}</b><span>@${esc(user.username)}</span></div><details class="sv-profile-edit"><summary>Изменить имя</summary><form class="sv-form" data-form="profile"><label>ИМЯ НА САЙТЕ<input name="name" maxlength="40" required value="${esc(user.name)}" autocomplete="nickname"></label><button class="sv-primary">СОХРАНИТЬ ИМЯ</button></form></details><button class="sv-logout" type="button" data-sv="logout">Выйти из аккаунта</button>`;}
 else{
 const passwordFields=`<label>ПАРОЛЬ<input name="password" type="password" required minlength="10" maxlength="256" autocomplete="new-password"></label><label>ПОВТОРИ ПАРОЛЬ<input name="password2" type="password" required minlength="10" maxlength="256" autocomplete="new-password"></label>`;
 const fields=authMode==='login'?`<label>НИК ИЛИ ПОЧТА<input name="identity" required maxlength="254" autocomplete="username" autocapitalize="none"></label><label>ПАРОЛЬ<input name="password" type="password" required maxlength="256" autocomplete="current-password"></label>`:authMode==='register'?`<label>НИК<input name="username" required pattern="[A-Za-z0-9_]{3,24}" maxlength="24" autocomplete="username" autocapitalize="none"><small>3–24 латинские буквы, цифры или _</small></label><label>ПОЧТА<input name="email" type="email" required maxlength="254" autocomplete="email"></label>${passwordFields}<small>Не менее 10 символов. Аккаунт активируется письмом.</small>`:authMode==='verify-code'?`<label>ПОЧТА<input name="email" type="email" required maxlength="254" autocomplete="email" value="${esc(verificationEmail)}"></label><label>КОД ИЗ ПИСЬМА<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000"></label><small class="sv-code-hint">Код действует 10 минут. При повторной отправке используй код из последнего письма.</small>`:authMode==='reset'?passwordFields:authMode==='verify'?'<p>Подтверди почту для своего аккаунта на MAKSON PROJECT.</p>':'<label>ПОЧТА<input name="email" type="email" required maxlength="254" autocomplete="email"></label>';
 const button={login:'ВОЙТИ →',register:'СОЗДАТЬ АККАУНТ',recover:'ОТПРАВИТЬ ССЫЛКУ',resend:'ОТПРАВИТЬ ПОВТОРНО',verify:'ПОДТВЕРДИТЬ','verify-code':'ПОДТВЕРДИТЬ ПОЧТУ',reset:'СОХРАНИТЬ ПАРОЛЬ'}[authMode];
 content=`<form class="sv-form" data-form="${authMode}">${fields}<button class="sv-primary">${button}</button><div class="sv-auth-links">${authMode!=='login'?'<button type="button" data-auth="login">УЖЕ ЕСТЬ АККАУНТ</button>':'<button type="button" data-auth="register">РЕГИСТРАЦИЯ</button><button type="button" data-auth="recover">ЗАБЫЛ ПАРОЛЬ?</button>'}</div>${authMode==='verify-code'?'<button type="button" data-sv="resend-code">ОТПРАВИТЬ НОВЫЙ КОД</button>':''}${authMode==='resend'?'<button type="button" data-auth="verify-code">У МЕНЯ УЖЕ ЕСТЬ КОД</button>':''}${authMode==='recover'?'<button type="button" data-auth="resend">Отправить письмо повторно</button>':''}</form>`;
 }
 accountRoot.innerHTML=`<div class="sv-auth-wrap"><section class="sv-auth-card">${!profile&&authMode!=='login'?'<div class="sv-strip">'+modes[authMode]+'</div>':''}${content}<p class="sv-error" role="status"></p></section>${profile?'<section class="sv-stats sv-auth-card" aria-label="Результаты игр"></section>':''}</div>`;
 chatWindow.dataset.authMode=authMode;document.dispatchEvent(new Event('svyazlayout'));
 if(profile){renderStats();loadStats();}
}
function renderContacts(results){
 const list=root.querySelector('.sv-contact-list');if(!list)return;
 const rows=results?results.map(p=>({peer:p})):dialogs;
 const signature=JSON.stringify([rows,dialog,!!results]);if(list.dataset.signature===signature)return;list.dataset.signature=signature;
 list.innerHTML=rows.length?rows.map(d=>`<button class="sv-contact" data-user="${d.peer.id}" ${d.id?'data-dialog="'+d.id+'"':''} aria-current="${d.id===dialog}"><i class="sv-contact-avatar ${d.peer.online?'online':''}">${esc(d.peer.name[0]?.toUpperCase())}</i><span><strong>${esc(d.peer.name)}</strong><small>${results?'@'+esc(d.peer.username):esc(d.last||'Начать разговор')}</small></span><span class="sv-contact-meta">${d.at?'<time>'+new Date(d.at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})+'</time>':''}${d.unread?'<b>'+d.unread+'</b>':''}</span></button>`).join(''):`<p class="sv-list-note">${results?'Никто не найден.':'Пока нет диалогов.<br>Найди друга по нику.'}</p>`;
}
function updatePeer(){const label=root.querySelector('.sv-peer small');if(label)label.textContent='@'+peer.username+' · '+(peer.online?'В СЕТИ':'НЕ В СЕТИ');}
function renderMessages(toBottom=false){
 const box=root.querySelector('.sv-messages'),log=root.querySelector('.sv-log');if(!box)return;
 const signature=[dialog,messages.length,messages[0]?.id,messages.at(-1)?.id,peerRead,hasOlder,user.name,peer?.name,messages.filter(m=>m.invite).map(m=>m.invite.status).join(',')].join('|');if(box.dataset.signature===signature){if(toBottom)log.scrollTop=log.scrollHeight;return;}box.dataset.signature=signature;const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<70,oldHeight=log.scrollHeight,oldTop=log.scrollTop;
 const oldNodes=new Map([...box.querySelectorAll('[data-message]')].map(n=>[n.dataset.message,n])),oldMax=Math.max(0,...[...oldNodes.keys()].map(Number)),template=document.createElement('template');
 template.innerHTML=messages.map((m,i)=>{const mine=m.author===user.id,date=new Date(m.at).toLocaleDateString('ru',{day:'numeric',month:'long'}),previous=messages[i-1],day=!previous||new Date(previous.at).toDateString()!==new Date(m.at).toDateString();return `${day?'<div class="sv-date">'+date+'</div>':''}<article class="sv-message ${mine?'mine':''}" data-message="${m.id}"><header class="sv-message-from"><strong>${esc(mine?user.name:peer.name)}</strong></header>${m.photo?`<button type="button" class="sv-photo" data-photo-open="${m.id}" aria-label="Открыть фото"><img src="${esc(m.photo.url)}" width="${m.photo.width}" height="${m.photo.height}" loading="lazy" alt="Фото от ${esc(mine?user.name:peer.name)}"></button>`:''}${m.invite?`<div class="sv-invite-card"><small>${mine?'ТЫ ПРИГЛАСИЛ':esc(peer.name)+' ПРИГЛАШАЕТ'}</small><b>${gameNames[m.invite.game]||'ИГРА'}</b><span>${({pending:'ЖДЁМ ОТВЕТА',accepted:'ПРИГЛАШЕНИЕ ПРИНЯТО',declined:'ПРИГЛАШЕНИЕ ОТКЛОНЕНО',expired:'СРОК ИСТЁК',cancelled:'ПРИГЛАШЕНИЕ ОТМЕНЕНО'})[m.invite.status]||''}</span>${!mine&&['pending','accepted'].includes(m.invite.status)?`<div><button data-social="join" data-id="${m.invite.id}">ВОЙТИ →</button>${m.invite.status==='pending'?`<button data-social="decline-invite" data-id="${m.invite.id}">НЕ СЕЙЧАС</button>`:''}</div>`:''}</div>`:m.body?'<p>'+esc(m.body)+'</p>':''}<footer><time>${new Date(m.at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</time>${mine?`<span class="sv-receipt ${m.id<=peerRead?'read':''}" title="${m.id<=peerRead?'Прочитано':'Отправлено'}" aria-label="${m.id<=peerRead?'Прочитано':'Отправлено'}">${m.id<=peerRead?'✓✓':'✓'}</span>`:''}</footer></article>`;}).join('');
 const fresh=[];let cursor=box.firstChild;
 for(const incoming of [...template.content.children]){const key=incoming.dataset.message,old=oldNodes.get(key);let node=incoming;
  if(old&&old.outerHTML===incoming.outerHTML)node=old;
  if(node!==cursor)box.insertBefore(node,cursor);else cursor=cursor.nextSibling;
  if(key&&!old&&(Number(key)>oldMax||!oldNodes.size))fresh.push(node);
 }
 while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden&&!chatWindow.hidden){for(const [i,node] of fresh.slice(-8).entries())node.animate([{opacity:0,transform:`translate(${node.classList.contains('mine')?14:-14}px, 9px) scale(.97)`},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:260,delay:oldNodes.size?0:i*22,easing:'cubic-bezier(.16,1,.3,1)'});}
 root.querySelector('.sv-older').hidden=!hasOlder;
 if(toBottom||nearBottom)log.scrollTop=log.scrollHeight;else log.scrollTop=oldTop+Math.max(0,log.scrollHeight-oldHeight);
 if(toBottom||nearBottom){let lastTop=log.scrollTop;for(const img of box.querySelectorAll('img'))img.addEventListener('load',()=>{if(Math.abs(log.scrollTop-lastTop)<70){log.scrollTop=log.scrollHeight;lastTop=log.scrollTop;}},{once:true});}
}
async function readCurrent(){if(!visible()||chatWindow.classList.contains('inactive')||!dialog||!messages.length)return;await api('read',{dialog,last:messages.at(-1).id});}
let navigationAnimations=[];
function changeChatView(back,change){
 for(const animation of navigationAnimations)animation.cancel();navigationAnimations=[];
 root.querySelectorAll('.sv-view-ghost').forEach(node=>node.remove());
 const win=root.ownerDocument.defaultView,contacts=root.querySelector('.sv-contacts');
 const mobile=contacts&&win.getComputedStyle(contacts).display==='none'||root.clientWidth<=500;
 const previous=mobile&&!dialog?contacts:root.querySelector('.sv-chat');
 const animate=previous&&!chatWindow.hidden&&!win.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let ghost,rect,base,sx=1,sy=1;
 if(animate){rect=previous.getBoundingClientRect();base=root.getBoundingClientRect();sx=root.offsetWidth/base.width;sy=root.offsetHeight/base.height;ghost=previous.cloneNode(true);ghost.classList.add('sv-view-ghost');ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));const log=previous.querySelector('.sv-log');if(log)ghost.querySelector('.sv-log').dataset.scroll=log.scrollTop;}
 change();render();
 if(!ghost)return;
 Object.assign(ghost.style,{left:(rect.left-base.left)*sx+'px',top:(rect.top-base.top)*sy+'px',width:rect.width*sx+'px',height:rect.height*sy+'px'});root.append(ghost);
 const log=ghost.querySelector('.sv-log');if(log)log.scrollTop=Number(log.dataset.scroll);
 const target=mobile&&back?root.querySelector('.sv-contacts'):root.querySelector('.sv-chat'),direction=back?-1:1;
 const outgoing=ghost.animate([{opacity:1,transform:'translateX(0) scale(1)'},{opacity:0,transform:`translateX(${-direction*42}px) scale(.97)`}],{duration:240,easing:'ease-in',fill:'forwards'});
 const incoming=target?.animate([{opacity:0,transform:`translateX(${direction*64}px) scale(.98)`},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'});
 navigationAnimations=[outgoing,incoming].filter(Boolean);outgoing.finished.then(()=>ghost.remove(),()=>ghost.remove());
}
async function openContact(id,position=null){
 const request=++openRequest,owner=user?.id;
 let result;
 try{result=await api('open',{user:id});}
 catch(error){if(request===openRequest&&user?.id===owner&&page==='chat')throw error;return;}
 if(request!==openRequest||user?.id!==owner||page!=='chat')return;
 listReturn=position;await loadDialog(result.dialog,result.peer);
}
function backToContacts(){
 openRequest++;saveDraft();const position=listReturn;listReturn=null;
 changeChatView(true,()=>{dialog=null;peer=null;messages=[];viewVersion++;});
 const list=root.querySelector('.sv-contact-list'),search=root.querySelector('[name=search]');
 if(!list)return;
 const target=position&&list.querySelector('.sv-contact[data-user="'+position.id+'"]');
 if(position&&!position.filtered)list.scrollTop=position.top;
 (target||search)?.focus({preventScroll:true});
 if(target){const row=target.getBoundingClientRect(),box=list.getBoundingClientRect();
  if(row.top<box.top||row.bottom>box.bottom)target.scrollIntoView({block:'nearest'});}
}
async function loadDialog(id,p){saveDraft();changeChatView(false,()=>{dialog=id;peer=p;messages=[];peerRead=0;blocked=false;hasOlder=false;viewVersion++;});const version=viewVersion;try{const r=await api('messages?dialog='+id);if(version!==viewVersion||dialog!==id)return;messages=r.messages;peer=r.peer;peerRead=r.peerRead;hasOlder=r.more;blocked=r.blocked;renderMessages(true);updatePeer();root.querySelector('.sv-peer strong').textContent=peer.name;root.querySelectorAll('.sv-compose textarea,.sv-attach,.sv-send').forEach(n=>n.disabled=blocked);photos.draw();await readCurrent();await refreshDialogs();}catch(e){if(version===viewVersion)notice(e.message);}}
let dialogsSignature='';async function refreshDialogs(){const r=await api('dialogs'),signature=JSON.stringify(r.dialogs);if(signature===dialogsSignature)return;dialogsSignature=signature;dialogs=r.dialogs;const count=dialogs.reduce((n,d)=>n+d.unread,0);desktopElement('svyaz-unread').textContent=count?' · '+count:'';const badge=desktopElement('chat-launcher')?.querySelector('b');if(badge)badge.textContent=count?String(count):'';chatWindow.dataset.title=count?'СВЯЗЬ ('+count+')':'СВЯЗЬ';if(!root.querySelector('[name=search]')?.value)renderContacts();}
async function poll(){
 if(polling||!user||!visible())return;
 polling=true;
 try{await refreshDialogs();if(dialog){const id=dialog,version=viewVersion;let more=true;for(let n=0;n<4&&more;n++){const r=await api('messages?dialog='+id+'&after='+(messages.at(-1)?.id||0));if(dialog!==id||version!==viewVersion)return;more=r.more;peer=r.peer;peerRead=r.peerRead;for(const inv of r.invites||[]){const m=messages.find(m=>m.invite?.id===inv.id);if(m)m.invite=inv;}if(blocked!==r.blocked){blocked=r.blocked;saveDraft();render();}if(r.messages.length){const known=new Set(messages.map(m=>m.id));messages.push(...r.messages.filter(m=>!known.has(m.id)));}renderMessages();updatePeer();}await readCurrent();}const status=root.querySelector('#sv-connection');if(status)status.textContent='● ПОДКЛЮЧЕНО';}catch(e){const status=root.querySelector('#sv-connection');if(status)status.textContent='○ ПЕРЕПОДКЛЮЧЕНИЕ…';if(e.status===401){saveDraft();user=null;dialog=null;messages=[];drafts.clear();accountLabel();selectPage('account');notice('Сессия закончилась. Войди заново.',accountRoot);}}finally{polling=false;}}
function schedule(){clearInterval(timer);accountRoot.classList.toggle('svyaz-idle',chatWindow.hidden||chatWindow.ownerDocument.hidden||page!=='account');if(user&&visible()){poll();timer=setInterval(poll,5000);}}
tabs.addEventListener('click',e=>{const b=e.target.closest('[data-overview]');if(b)selectPage(b.dataset.overview);});
async function submit(e){
 e.preventDefault();if(busy)return;const form=e.target,container=accountRoot.contains(form)?accountRoot:root;if(form.classList.contains('sv-search'))return;
 busy=true;notice('',container);const button=form.querySelector('button[type=submit],button:not([type])');if(button)button.disabled=true;
 try{
 if(!csrf){const s=await api('session');csrf=s.csrf;}
 if(form.classList.contains('sv-compose')){
 const field=form.elements.message,text=field.value.trim(),id=dialog,photo=photos.get(id);if(!text&&!photo)return;
 if(!pendingSend||pendingSend.dialog!==id||pendingSend.body!==text||pendingSend.photoKey!==photo?.key)pendingSend={dialog:id,body:text,nonce:crypto.randomUUID(),photoKey:photo?.key};
 let payload=pendingSend;if(photo){payload=new FormData();payload.set('dialog',id);payload.set('body',text);payload.set('nonce',pendingSend.nonce);payload.set('photo',photo.file,'photo.jpg');}
 form.classList.add('sv-sending');const result=await api(photo?'send-photo':'send',payload);pendingSend=null;photos.clear(id,photo?.key);drafts.delete(id);
 if(dialog===id){field.value='';field.style.height='';if(!messages.some(m=>m.id===result.message.id))messages.push(result.message);renderMessages(true);photos.draw();field.focus();}await refreshDialogs();
 }else{
 const kind=form.dataset.form,data=Object.fromEntries(new FormData(form));
 if(['verify','reset'].includes(kind))Object.assign(data,{uid:link?.uid,token:link?.token});
 const result=await api(kind,data);
 if(['register','resend','verify-code'].includes(kind))pendingEmail(data.email);
 if(kind==='reset'){user=null;accountLabel();render();}
 if(result.user){user=result.user;accountLabel();if(kind==='profile'){saveDraft();render();accountRoot.querySelector('.sv-profile-identity b').textContent=user.name;notice('Имя сохранено.',accountRoot);}else{renderAccount();selectPage('chat');await refreshDialogs();}}
 else{if(kind==='logout')user=null;if(['register','resend','verify-code','verify','reset'].includes(kind)){authMode=['register','resend'].includes(kind)?'verify-code':'login';if(['verify-code','verify'].includes(kind))pendingEmail('');if(!['register','resend'].includes(kind)){link=null;history.replaceState(null,'',location.pathname+location.search);}renderAccount();}notice(result.message||'Готово.',accountRoot);}
 }
 }catch(e){if(form.dataset.form==='register'&&e.status===503){pendingEmail(form.elements.email.value);authMode='verify-code';renderAccount();}notice(e.message,container);}finally{busy=false;form.classList.remove('sv-sending');if(button?.isConnected)button.disabled=false;}
}
root.addEventListener('submit',submit);accountRoot.addEventListener('submit',submit);
async function clicked(e){
 const auth=e.target.closest('[data-auth]');if(auth){authMode=auth.dataset.auth;renderAccount();return;}
 const contact=e.target.closest('.sv-contact[data-user]');if(contact){
  const id=Number(contact.dataset.user),list=contact.closest('.sv-contact-list');
  try{await openContact(id,{id,top:list?.scrollTop||0,filtered:!!root.querySelector('[name=search]')?.value});}
  catch(e){notice(e.message);}return;
 }
 const action=e.target.closest('[data-sv]')?.dataset.sv;if(!action)return;
 try{
 if(action==='resend-code'){const email=accountRoot.querySelector('[name=email]')?.value||verificationEmail;pendingEmail(email);const result=await api('resend',{email});notice(result.message,accountRoot);}
 if(action==='find')root.querySelector('[name=search]')?.focus();
 if(action==='chat')selectPage('chat');
 if(action==='account')selectPage('account');
 if(action==='back')backToContacts();
 if(action==='clear-search'){root.querySelector('[name=search]').value='';searchVersion++;renderContacts();}
 if(action==='logout'){openRequest++;listReturn=null;await api('logout',{});user=null;dialog=null;messages=[];dialogs=[];drafts.clear();photos.clearAll();pendingSend=null;viewVersion++;accountLabel();desktopElement('svyaz-unread').textContent='';authMode='login';selectPage('account');render();schedule();}
 if(action==='block'){await api('block',{dialog,blocked:!blocked});blocked=!blocked;saveDraft();render();}
 if(action==='older'){const id=dialog,version=viewVersion,log=root.querySelector('.sv-log'),oldHeight=log.scrollHeight,oldTop=log.scrollTop;const r=await api('messages?dialog='+id+'&before='+messages[0].id);if(id!==dialog||version!==viewVersion)return;messages=[...r.messages,...messages];hasOlder=r.more;renderMessages();log.scrollTop=oldTop+log.scrollHeight-oldHeight;}
 }catch(error){notice(error.message,accountRoot.contains(e.target)?accountRoot:root);}
}
root.addEventListener('click',clicked);accountRoot.addEventListener('click',clicked);
root.addEventListener('input',e=>{if(e.target.name==='message'){saveDraft();e.target.style.height='auto';e.target.style.height=Math.min(100,e.target.scrollHeight)+'px';}if(e.target.name==='search'){clearTimeout(searchTimer);const q=e.target.value.replace(/^@/,'').trim(),version=++searchVersion;if(q.length<2){renderContacts();return;}searchTimer=setTimeout(async()=>{try{const r=await api('search?q='+encodeURIComponent(q));if(version===searchVersion)renderContacts(r.users);}catch(e){notice(e.message);}},350);}});
root.addEventListener('keydown',e=>{if(e.target.name==='message'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(pointer:fine)').matches){e.preventDefault();e.target.form.requestSubmit();}});
for(const event of ['windowfocus','windowhide','visibilitychange','settingschange'])document.addEventListener(event,schedule);
document.addEventListener('recordschange',()=>{if(user)loadStats();});
addEventListener('online',schedule);
root.innerHTML='<div class="sv-empty" role="status">Подключение…</div>';
try{const s=await api('session');user=s.user;accountLabel();}catch(e){accountRoot.dataset.startError=e.message;}
if(!user&&verificationEmail)authMode='verify-code';
social.schedule();selectPage(user?'chat':'account');
if(link){authMode=link.svyaz;openWindow('svyaz');selectPage('account');}
schedule();

root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled||matchMedia('(prefers-reduced-motion: reduce)').matches)return;button.animate([{transform:'scale(.94)'},{transform:'scale(1.025)',offset:.65},{transform:'scale(1)'}],{duration:210,easing:'ease-out'});});
