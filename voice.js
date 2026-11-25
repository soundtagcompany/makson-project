import {openWindow,settings,sound} from './app.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={invited:'ЗВОНИМ…',declined:'ОТКЛОНЁН',missed:'НЕ ОТВЕТИЛ',left:'ВЫШЕЛ'};

// A call belongs to the account, not the currently opened conversation/window.
export function setupVoice({api,getUser,getPeer,root,chatWindow}){
 const panel=document.createElement('section');panel.className='sv-voice-panel';panel.hidden=true;chatWindow.append(panel);
 const floating=document.createElement('aside');floating.className='sv-voice-floating';floating.hidden=true;document.body.append(floating);
 const audioHost=document.createElement('div');audioHost.hidden=true;document.body.append(audioHost);
 let call=null,session='',stream=null,config=null,muted=false,deafened=false,volume=1,cursor=0,epoch=0,busy=false,polling=false,timer,status='',incoming=[],picker=false,friends=[],audioBlocked=false,lastGood=0,accountId=null;
 let expanded=false;
 let ctx=null,meterTimer=null,selfMeter=null,lastPaint='',ringId='';
 const peers=new Map();
 const report=e=>{status=typeof e==='string'?e:e.message;paint();};
 const fields=()=>({call:call.id,session});
 function draw(){
  root.querySelectorAll('.sv-voice-launch,[data-voice="direct"]').forEach(el=>el.remove());
  if(!getUser())return;
  const bar=document.createElement('div');bar.className='sv-voice-launch';
  bar.innerHTML='<button data-voice="friends" title="Групповой звонок" aria-label="Групповой звонок" class="sv-icon-button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21v-2a8 8 0 0 1 16 0v2M19 3v6m-3-3h6"/></svg></button>';
  (root.querySelector('.sv-tools')||root).append(bar);
  if(getPeer()){const b=document.createElement('button');b.dataset.voice='direct';b.className='sv-icon-button';b.title=b.ariaLabel='Позвонить';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 4 4-2 3a17 17 0 0 0 7 7l3-2 4 4-2 3C9 22 2 15 2 5l3-2Z"/></svg>';root.querySelector('.sv-peer-actions')?.prepend(b);}paint();
 }
 const icon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${({mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v3m-3 0h6"/>',audio:'<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 13h3v7H4zm13 0h3v7h-3z"/>',end:'<path d="M3 12q9-8 18 0v5l-5-1v-4H8v4l-5 1z"/>'})[kind]}${kind==='mic'&&(muted||deafened)||kind==='audio'&&deafened?'<path d="m3 3 18 18"/>':''}</svg>`;
 function paint(){
  panel.hidden=!call&&!picker&&!status;panel.classList.toggle('sv-voice-expanded',expanded);panel.classList.toggle('sv-voice-connected',!!call);
  const members=call?.members||[];
  const markup=`${call?`<div class="sv-voice-heading"><strong>☎ ЗВОНОК</strong><small>${members.filter(m=>m.state==='joined').length}/6</small></div><div class="sv-voice-members">${members.map(m=>`<div class="sv-voice-person" data-voice-person="${m.id}"><i>${esc(m.name[0]?.toUpperCase())}</i><span>${esc(m.name)}<small>${m.state!=='joined'?labels[m.state]||m.state:m.deafened?'БЕЗ ЗВУКА':m.muted?'МИКРОФОН ВЫКЛ.':m.id===getUser()?.id?'ТЫ':peers.get(m.id)?.pc.connectionState==='connected'?'В СЕТИ':'СОЕДИНЕНИЕ…'}</small></span></div>`).join('')}</div><div class="sv-voice-controls"><button data-voice="mute" aria-pressed="${muted||deafened}" title="Микрофон" aria-label="Переключить микрофон">${icon('mic')}</button><button data-voice="deafen" aria-pressed="${deafened}" title="Звук звонка" aria-label="Переключить звук звонка">${icon('audio')}</button><button data-voice="friends" title="Пригласить друзей">＋</button><button data-voice="details" aria-expanded="${expanded}" title="Участники и громкость" aria-label="Участники и громкость">${expanded?'⌃':'⌄'}</button><button class="sv-voice-end" data-voice="leave" title="Завершить звонок" aria-label="Завершить звонок">${icon('end')}</button></div><label class="sv-voice-volume">ГРОМКОСТЬ <input type="range" data-voice-volume min="0" max="100" value="${Math.round(volume*100)}" aria-label="Громкость собеседников"></label>`:''}${picker?`<div class="sv-voice-picker"><strong>${call?'ПРИГЛАСИТЬ В ЗВОНОК':'СОЗДАТЬ ГРУППОВОЙ ЗВОНОК'}</strong><form data-voice-form>${friends.length?friends.map(p=>`<label><input type="checkbox" name="voiceFriend" value="${p.id}" ${members.some(m=>m.id===p.id&&['joined','invited'].includes(m.state))?'disabled':''}>${esc(p.name)}</label>`).join(''):'<p>Добавь друзей в «СВЯЗИ». Из личного диалога можно позвонить напрямую.</p>'}<div><button ${busy?'disabled':''}>${call?'ПРИГЛАСИТЬ':'ПОЗВОНИТЬ'}</button><button type="button" data-voice="close-picker">ЗАКРЫТЬ</button></div></form></div>`:''}${audioBlocked?'<button data-voice="audio">ВКЛЮЧИТЬ ЗВУК ЗВОНКА</button>':''}${status?`<p role="status" class="sv-voice-status">${esc(status)} ${!call?'<button data-voice="dismiss" aria-label="Закрыть">×</button>':''}</p>`:''}`;
  // Preserve checkbox selections, sliders and focus during heartbeat updates.
  if(markup!==lastPaint){const selected=[...panel.querySelectorAll('input[name=voiceFriend]:checked')].map(n=>n.value);panel.innerHTML=markup;for(const n of panel.querySelectorAll('input[name=voiceFriend]'))n.checked=selected.includes(n.value);lastPaint=markup;}
  const pending=incoming[0];floating.hidden=!call&&!pending;
  const bar=document.querySelector('.taskbar'),docked=!!call&&!!bar&&!document.body.classList.contains('game-fullscreen-on');
  floating.classList.toggle('sv-voice-docked',docked);floating.classList.toggle('sv-voice-active',!!call);
  document.body.classList.toggle('sv-in-call',!!call);
  const parent=docked?bar:document.body;if(floating.parentElement!==parent){if(docked)bar.insertBefore(floating,bar.querySelector('.system-tray'));else parent.append(floating);}
  const launcher=document.getElementById('chat-launcher');if(launcher){launcher.classList.toggle('sv-call-active',!!call);launcher.title=call?'Идёт звонок · открыть управление':'Открыть СВЯЗЬ';const label=launcher.querySelector('.chat-launcher-label');if(label)label.textContent=call?'СВЯЗЬ · '+members.filter(m=>m.state==='joined').length:'СВЯЗЬ';}

  const floatMarkup=call?`<button data-voice="show">☎ ${members.filter(m=>m.state==='joined').length}</button><button data-voice="mute" title="Микрофон" aria-label="Переключить микрофон" aria-pressed="${muted||deafened}">${icon('mic')}</button><button class="sv-voice-end" data-voice="leave" title="Завершить звонок" aria-label="Завершить звонок">${icon('end')}</button>`:pending?`<strong>☎ ${esc(pending.members.find(m=>m.id===pending.creator)?.name||'СВЯЗЬ')}</strong><small>${pending.members.length>2?'ГРУППОВОЙ':'ВХОДЯЩИЙ'} ЗВОНОК</small><div><button data-voice="accept" ${busy?'disabled':''}>ОТВЕТИТЬ</button><button data-voice="decline">ОТКЛОНИТЬ</button></div>`:'';
  if(floating.innerHTML!==floatMarkup)floating.innerHTML=floatMarkup;
 }
 function audioContext(){if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)ctx=new Audio();}ctx?.resume().catch(()=>{});return ctx;}
 function meter(media){if(!ctx)return null;const source=ctx.createMediaStreamSource(media),analyser=ctx.createAnalyser();analyser.fftSize=256;source.connect(analyser);return {source,analyser,data:new Uint8Array(256)};}
 function speaking(m){if(!m)return false;m.analyser.getByteTimeDomainData(m.data);let energy=0;for(const b of m.data)energy+=(b-128)**2;return energy/m.data.length>16;}
 function meterStart(){clearInterval(meterTimer);selfMeter=meter(stream);meterTimer=setInterval(()=>{for(const m of call?.members||[]){const talk=m.id===getUser()?.id?!muted&&!deafened&&speaking(selfMeter):!m.muted&&!m.deafened&&speaking(peers.get(m.id)?.meter);panel.querySelector(`[data-voice-person="${m.id}"]`)?.classList.toggle('is-speaking',talk);}},180);}
 function closePeer(p){p.pc.onicecandidate=p.pc.ontrack=p.pc.onconnectionstatechange=null;p.pc.close();p.audio?.pause();if(p.audio)p.audio.srcObject=null;p.audio?.remove();p.meter?.source.disconnect();}
 function cleanup(message=''){
  epoch++;for(const p of peers.values())closePeer(p);peers.clear();stream?.getTracks().forEach(t=>t.stop());stream=null;clearInterval(meterTimer);selfMeter?.source.disconnect();selfMeter=null;ctx?.close().catch(()=>{});ctx=null;
  call=null;session='';cursor=0;muted=deafened=false;picker=false;audioBlocked=false;status=message;paint();schedule(1000);
 }
 async function leave(){const old=call&&fields();cleanup();if(old)try{await api('voice-leave',old);}catch{/* The lease also expires if connectivity is lost. */}}
 function applyAudio(){stream?.getAudioTracks().forEach(t=>t.enabled=!muted&&!deafened);for(const p of peers.values())if(p.audio){p.audio.muted=deafened;p.audio.volume=volume;}paint();schedule(20);}
 async function prepare(){
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw Error('Звонки доступны через HTTPS в современном браузере.');
  audioContext();const version=epoch;config=await api('voice-config',{});
  const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(version!==epoch){media.getTracks().forEach(t=>t.stop());throw Error('Звонок отменён.');}stream=media;
  media.getAudioTracks()[0].onended=()=>{if(call)void leave();};
 }
 async function begin(users,joining){
  if(busy)return;busy=true;status='ПОДКЛЮЧАЕМ МИКРОФОН…';paint();const owner=getUser()?.id,version=epoch;let result;
  try{await prepare();if(owner!==getUser()?.id||version!==epoch)throw Error('Звонок отменён.');result=await api(joining?'voice-join':'voice-create',joining?{call:joining}:{users});
   if(owner!==getUser()?.id||version!==epoch){await api('voice-leave',{call:result.call.id,session:result.session});return;}
   call=result.call;session=result.session;incoming=[];cursor=0;status='';picker=false;lastGood=Date.now();openWindow('svyaz');await syncPeers();meterStart();paint();schedule(0);
  }catch(e){if(version===epoch)cleanup(e.name==='NotAllowedError'?'Разреши доступ к микрофону в настройках браузера.':e.name==='NotFoundError'?'Микрофон не найден.':e.message);}
  finally{busy=false;paint();}
 }
 async function send(p,payload){if(!call||peers.get(p.id)!==p)return;await api('voice-signal',{...fields(),to:p.id,targetSession:p.session,payload});}
 async function offer(p,restart=false){if(p.offering||p.pc.signalingState!=='stable')return;p.offering=true;try{await p.pc.setLocalDescription(await p.pc.createOffer({iceRestart:restart}));await send(p,{type:'offer',sdp:p.pc.localDescription.sdp});}finally{p.offering=false;}}
 function addPeer(m){
  const pc=new RTCPeerConnection({iceServers:config.iceServers,bundlePolicy:'max-bundle'}),p={id:m.id,session:m.session,pc,ice:[],audio:null,meter:null,restarts:0,offering:false};peers.set(m.id,p);
  for(const track of stream.getTracks())pc.addTrack(track,stream);
  pc.onicecandidate=e=>{if(e.candidate)send(p,{type:'ice',candidate:e.candidate.toJSON()}).catch(()=>{});};
  pc.ontrack=e=>{if(peers.get(p.id)!==p)return;const media=e.streams[0]||new MediaStream([e.track]);if(!p.audio){p.audio=document.createElement('audio');p.audio.autoplay=true;p.audio.setAttribute('playsinline','');audioHost.append(p.audio);}p.audio.srcObject=media;p.audio.muted=deafened;p.audio.volume=volume;p.meter?.source.disconnect();p.meter=meter(media);p.audio.play().catch(()=>{audioBlocked=true;paint();});};
  pc.onconnectionstatechange=()=>{paint();if(pc.connectionState==='failed'&&getUser()?.id<p.id&&p.restarts++<2)offer(p,true).catch(report);};
  return p;
 }
 async function syncPeers(){
  const version=epoch;
  const members=call.members.filter(m=>m.state==='joined'&&m.id!==getUser()?.id);
  for(const [id,p]of peers)if(!members.some(m=>m.id===id&&m.session===p.session)){closePeer(p);peers.delete(id);}
  for(const m of members){if(version!==epoch)return;if(peers.has(m.id))continue;const p=addPeer(m);if(getUser().id<m.id)await offer(p);}
 }
 async function receive(signal){
  const p=peers.get(signal.from);if(!p||p.session!==signal.session)return;const data=signal.payload;
  if(data.type==='ice'){if(p.pc.remoteDescription)await p.pc.addIceCandidate(data.candidate);else p.ice.push(data.candidate);return;}
  await p.pc.setRemoteDescription({type:data.type,sdp:data.sdp});
  for(const candidate of p.ice.splice(0))await p.pc.addIceCandidate(candidate);
  if(data.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());await send(p,{type:'answer',sdp:p.pc.localDescription.sdp});}
 }
 function schedule(delay=call?850:4000){clearTimeout(timer);timer=setTimeout(poll,delay);}
 async function poll(){
  if(polling||busy){schedule();return;}if(!getUser()){schedule();return;}polling=true;const version=epoch;
  try{const result=await api('voice-state',call?{...fields(),after:cursor,muted:muted||deafened,deafened}:{});if(version!==epoch)return;lastGood=Date.now();
   if(call){call=result.call;await syncPeers();for(const signal of result.signals||[]){if(version!==epoch)return;try{await receive(signal);}catch{/* Ignore stale negotiation from a peer that has just left. */}cursor=Math.max(cursor,signal.id);}if(version!==epoch)return;if(status==='ВОССТАНАВЛИВАЕМ СОЕДИНЕНИЕ…')status='';
    if(!call.members.some(m=>m.id!==getUser().id&&['invited','joined'].includes(m.state))){const reason=call.members.some(m=>m.state==='declined')?'ЗВОНОК ОТКЛОНЁН':'ЗВОНОК ЗАВЕРШЁН';await leave();status=reason;}
   }else{incoming=result.incoming||[];if(incoming[0]&&ringId!==incoming[0].id){ringId=incoming[0].id;if(settings.sound)sound('tada');}}paint();
  }catch(e){if(version!==epoch)return;if(call){if([401,403,404,409,410].includes(e.status)||Date.now()-lastGood>40000)cleanup(e.status===410?'ЗВОНОК ЗАВЕРШЁН':e.message);else report('ВОССТАНАВЛИВАЕМ СОЕДИНЕНИЕ…');}}
  finally{polling=false;schedule();}
 }
 async function showFriends(){openWindow('svyaz');const r=await api('social');friends=r.friends.filter(f=>f.state==='accepted').map(f=>f.peer);picker=true;status='';paint();}
 async function action(e){const button=e.target.closest('[data-voice]');if(!button)return;e.preventDefault();e.stopPropagation();const a=button.dataset.voice;
  try{
   if(a==='direct'){if(call)await api('voice-invite',{...fields(),users:[getPeer().id]});else await begin([getPeer().id]);}
   if(a==='friends')await showFriends();
   if(a==='close-picker'){picker=false;paint();}
   if(a==='dismiss'){status='';paint();}
   if(a==='show')openWindow('svyaz');
   if(a==='details'){expanded=!expanded;paint();}
   if(a==='leave')await leave();
   if(a==='mute'){if(deafened){deafened=false;muted=false;}else muted=!muted;applyAudio();}
   if(a==='deafen'){deafened=!deafened;applyAudio();}
   if(a==='accept'&&incoming[0])await begin(null,incoming[0].id);
   if(a==='decline'&&incoming[0]){await api('voice-leave',{call:incoming[0].id});incoming.shift();paint();}
   if(a==='audio'){audioContext();await Promise.all([...peers.values()].filter(p=>p.audio).map(p=>p.audio.play()));audioBlocked=false;paint();}
  }catch(e){report(e);}
 }
 for(const el of [root,panel,floating])el.addEventListener('click',action);
 panel.addEventListener('input',e=>{if(e.target.matches('[data-voice-volume]')){volume=Number(e.target.value)/100;for(const p of peers.values())if(p.audio)p.audio.volume=volume;}});
 panel.addEventListener('submit',async e=>{if(!e.target.matches('[data-voice-form]'))return;e.preventDefault();const users=[...e.target.querySelectorAll('input:checked')].map(n=>Number(n.value));if(!users.length)return report('ВЫБЕРИ СОБЕСЕДНИКОВ.');if(users.length>5)return report('МАКСИМУМ 5 СОБЕСЕДНИКОВ.');try{if(call){const r=await api('voice-invite',{...fields(),users});call=r.call;picker=false;paint();}else await begin(users);}catch(error){report(error);}});
 document.addEventListener('accountchange',()=>{const id=getUser()?.id;if(id!==accountId){accountId=id;incoming=[];cleanup();}draw();schedule(50);});
 document.addEventListener('desktopfullscreenchange',paint);
 window.addEventListener('online',()=>schedule(0));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(0);});
 window.addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());});
 schedule();return {draw};
}
