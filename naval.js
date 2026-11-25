import {desktopElement,desktopQueryAll,onDesktopEvent,windowFrame,cancelWindowFrame} from './picture-in-picture.js';
import {beginGame,finishGame} from './account.js';
let accountRun=null;
import {BattleEffects} from './battle-effects.js';
import {NavalOnline} from './naval-net.js';
import {settings,storage,toast} from './app.js';
import {attachFullscreen} from './fullscreen.js';
import {FLEET,emptyBoard,randomBoard,cellsFor,canPlace,placeShip,fire,chooseTarget,coordinate} from './naval-core.js';
const $=id=>desktopElement(id),win=$('window-naval'),fx=$('naval-fx');
attachFullscreen(win,$('naval-fullscreen'));
const effects=new BattleEffects(win,fx,()=>settings);
let own,enemy,phase='setup',vertical=false,weapon='shot',salvo=1,sonar=2,busy=false,round=0,timer=0,audio=null,master=null;
let online=null,netState=null,netCooldown=0,netTimer=0,lastWin=storage.get('naval_result_key','');
const score=storage.get('naval_score',{wins:0,losses:0});
const nodes={own:[],enemy:[]},visible=()=>!win.hidden&&!win.classList.contains('inactive')&&!win.ownerDocument.hidden;
const music=new Audio('war.mp3');music.loop=true;music.preload='auto';
const impactSounds=Object.fromEntries([['hit','boom.mp3'],['sunk','big boom.mp3']].map(([kind,file])=>[kind,Array.from({length:3},()=>{const media=new Audio(file);media.preload='auto';return media;})]));
function syncAudio(){music.volume=Math.max(0,Math.min(1,settings.musicVolume));if(visible()&&settings.music&&music.volume>0){if(music.paused)music.play().catch(()=>{});}else music.pause();for(const pool of Object.values(impactSounds))for(const media of pool){media.volume=settings.sound?Math.max(0,Math.min(1,settings.effectsVolume)):0;if(!visible()){media.pause();media.currentTime=0;}}if(!visible())audio?.suspend().catch(()=>{});}
let impactStop=0;
function playImpact(kind){
 clearTimeout(impactStop);
 // A new impact cancels the tail of an old sinking sound, so a normal hit
 // cannot inherit the large explosion. Decorative victory bursts stay silent.
 for(const pool of Object.values(impactSounds))for(const media of pool){media.pause();media.currentTime=0;}
 const media=impactSounds[kind][0];media.volume=Math.max(0,Math.min(1,settings.effectsVolume))*(kind==='hit'?.38:.85);media.play().catch(()=>{});
 if(kind==='hit')impactStop=setTimeout(()=>{media.pause();media.currentTime=0;},480);
}
for(const event of ['windowfocus','windowhide','visibilitychange','settingschange'])document.addEventListener(event,syncAudio);
win.addEventListener('pointerdown',syncAudio,{passive:true});win.addEventListener('keydown',syncAudio);
syncAudio();

for(const side of ['own','enemy'])for(let i=0;i<100;i++){const button=document.createElement('button');button.className='naval-cell';button.dataset.index=i;button.innerHTML='<small class="naval-coordinate">'+coordinate(i)+'</small><span></span>';button.addEventListener('click',()=>side==='own'?place(i):shoot(i));if(side==='own'){button.addEventListener('pointerenter',()=>preview(i));button.addEventListener('pointerleave',clearPreview);}$("naval-"+side).append(button);nodes[side].push(button);}
const onlineDrawer=win.querySelector('.naval-online'),onlineSummary=onlineDrawer.querySelector('summary');
// Coordinate rulers belong to the board, so they scroll with its hit effects.
for(const side of ['own','enemy']){const grid=$('naval-'+side),chart=document.createElement('div');chart.className='naval-chart';grid.before(chart);const letters=document.createElement('div');letters.className='naval-axis naval-axis-x';letters.setAttribute('aria-hidden','true');letters.innerHTML=Array.from({length:10},(_,i)=>'<span>'+coordinate(i)[0]+'</span>').join('');const numbers=document.createElement('div');numbers.className='naval-axis naval-axis-y';numbers.setAttribute('aria-hidden','true');numbers.innerHTML=Array.from({length:10},(_,i)=>'<span>'+(i+1)+'</span>').join('');chart.append(letters,numbers,grid);}
function message(main,detail){$('naval-message').textContent=main;if(detail!==undefined)$('naval-detail').textContent=detail;}
function log(text){const li=document.createElement('li');li.textContent=text;$('naval-log').prepend(li);while($('naval-log').children.length>5)$('naval-log').lastChild.remove();}
function render(){
 const connected=!!online?.session,locked=connected&&(!online.connected||performance.now()<netCooldown);
 onlineSummary.textContent=online?.session?'ОНЛАЙН · КОМНАТА '+online.session.code:'С ДРУГОМ ПО СЕТИ';win.dataset.phase=phase;$('naval-phase').textContent={setup:'Расстановка флота',player:'Твой ход',computer:'Ход противника',finished:'Бой завершён'}[phase];
 // The fleet layout changes only on placement; avoid rebuilding all 200 cell
 // labels and text nodes on every turn or SSE status update.
 for(const [side,board]of [['own',own],['enemy',enemy]]){
  const occupied=new Set(board.ships.flatMap(ship=>ship.cells));
  for(let i=0;i<100;i++){
   const cell=nodes[side][i],state=board.shots[i],ship=occupied.has(i);
   const className='naval-cell'+(ship&&(side==='own'||phase==='finished')?' ship':'')+(state?' '+state:'');
   if(cell.className!==className)cell.className=className;
   const symbol=state==='hit'||state==='sunk'?'✕':state==='miss'?'•':state==='water'?'·':'';
   if(cell.lastElementChild.textContent!==symbol)cell.lastElementChild.textContent=symbol;
   const disabled=!!(side==='own'?phase!=='setup'||own.ships.length===10||(online?.session&&netState?.self.ready):phase!=='player'||busy||locked||state!==null);
   if(cell.disabled!==disabled)cell.disabled=disabled;
   const label=coordinate(i)+': '+({hit:'попадание',sunk:'потоплен',miss:'мимо',water:'вода'}[state]||(ship&&side==='own'?'корабль':'не проверено'));
   if(cell.getAttribute('aria-label')!==label)cell.setAttribute('aria-label',label);
  }
 }

 $('naval-own-count').textContent=own.ships.filter(s=>!s.sunk).length+' / 10';$('naval-enemy-count').textContent=(enemy.remaining??enemy.ships.filter(s=>!s.sunk).length)+' / 10';
 $('naval-setup').hidden=phase!=='setup';$('naval-weapons').hidden=phase==='setup'||phase==='finished';$('naval-start').disabled=own.ships.length!==10||busy||(connected&&(!online.connected||netState?.self.ready));$('naval-start').textContent=connected?(netState?.self.ready?'ОЖИДАЕМ СОПЕРНИКА':'ФЛОТ ГОТОВ →'):'ИГРАТЬ С КОМПЬЮТЕРОМ →';for(const id of ['naval-random','naval-clear','naval-rotate'])$(id).disabled=connected&&!!netState?.self.ready;$('naval-rotate').hidden=own.ships.length===10;
 for(const b of win.querySelectorAll('[data-naval-weapon]')){const w=b.dataset.navalWeapon;b.disabled=phase!=='player'||busy||locked||(w==='salvo'&&!salvo)||(w==='sonar'&&!sonar);b.classList.toggle('active',w===weapon);b.setAttribute('aria-pressed',String(w===weapon));b.textContent=w==='shot'?'Снаряд':w==='salvo'?'Залп ×'+salvo:'Сонар ×'+sonar;}
 $('naval-connect').hidden=connected;$('naval-room').hidden=!connected;if(connected){$('naval-room-code').textContent=online.session.code;$('naval-players').textContent=netState?.players.map(p=>p.name+(p.ready?' ✓':'')+(!p.connected?' (нет связи)':'')).join(' / ')||'Ждём подключения';}$('naval-status').textContent=connected?'Онлайн · комната '+online.session.code:'Одиночная игра · против компьютера';
 $('naval-score').textContent=score.wins+' побед · '+score.losses+' поражений';
}
function reset(){round++;clearTimeout(timer);busy=false;own=randomBoard();enemy=randomBoard();phase='setup';weapon='shot';salvo=1;sonar=2;vertical=false;effects.clear();$('naval-log').replaceChildren();$('naval-result').hidden=true;win.querySelector('.naval-content').scrollTo(0,0);$('naval-rotate').textContent='↔ Горизонтально';message('Флот готов. Можно начинать.','Перемешай корабли или расставь сам. После попадания — ещё один ход.');render();}
function clearPreview(){nodes.own.forEach(n=>n.classList.remove('preview','invalid'));}
function preview(i){clearPreview();if(phase!=='setup'||own.ships.length===10||(online?.session&&netState?.self.ready))return;const cells=cellsFor(i,FLEET[own.ships.length],vertical),valid=canPlace(own,cells);for(const c of cells.length?cells:[i])nodes.own[c].classList.add(valid?'preview':'invalid');}
function placementHint(){const next=FLEET[own.ships.length];message(next?'Размести корабль: '+next+' '+(next===1?'палуба':next<5?'палубы':'палуб'):'Все корабли на позициях.',next?'Нажми начальную клетку. Корабли не должны соприкасаться даже углами.':'Нажми «Начать бой».');render();}
function place(i){if(phase!=='setup'||own.ships.length===10||(online?.session&&netState?.self.ready))return;if(!placeShip(own,i,FLEET[own.ships.length],vertical)){message('Здесь корабль не помещается.','Оставь одну клетку между кораблями или поверни корабль.');return;}tone('place');placementHint();}
$('naval-random').onclick=()=>{own=randomBoard();message('Флот готов. Можно начинать.');render();};
$('naval-clear').onclick=()=>{own=emptyBoard();placementHint();};
$('naval-rotate').onclick=()=>{vertical=!vertical;$('naval-rotate').textContent=vertical?'↕ Вертикально':'↔ Горизонтально';clearPreview();};
$('naval-reset').onclick=()=>{if(online?.session){if(netState?.phase==='finished')onlineCommand('rematch');else message('Бой в онлайн-комнате.','Для новой комнаты нажми «Выйти». После боя здесь будет реванш.');return;}if(phase==='player'||phase==='computer'){const b=$('naval-reset');if(b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent='Сбросить бой?';setTimeout(()=>{b.dataset.confirm='';b.textContent='Новая игра';},3000);return;}}$('naval-reset').dataset.confirm='';$('naval-reset').textContent='Новая игра';reset();};
$('naval-start').onclick=()=>{if(own.ships.length!==10)return;if(online?.session){onlineCommand('ready',{fleet:own.ships.map(s=>s.cells)});return;}tone('sonar');accountRun=beginGame('naval');phase='player';message('Твой ход. Выбирай цель.','Попадание — ещё один выстрел. Залп и сонар расходуют ход.');render();};
for(const b of win.querySelectorAll('[data-naval-weapon]'))b.onclick=()=>{weapon=b.dataset.navalWeapon;$('naval-weapon-hint').textContent={shot:'Нажми клетку противника.',salvo:'Три клетки по горизонтали. Один залп за бой.',sonar:'Проверка области 3×3: число целых палуб. Две попытки.'}[weapon];render();};
function audioInit(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!audio){audio=new C();master=audio.createGain();master.connect(audio.destination);}audio.resume().catch(()=>{});master.gain.value=settings.sound?Math.max(0,Math.min(1,settings.effectsVolume))*.56:0;return audio;}
function tone(kind){if(!visible()||!settings.sound)return;if(impactSounds[kind]){playImpact(kind);return;}try{const c=audioInit();if(!c)return;const now=c.currentTime,osc=c.createOscillator(),gain=c.createGain(),dur=kind==='sunk'?1.8:kind==='hit'?1.1:kind==='shot'?.28:kind==='sonar'?.65:.18;osc.type=kind==='sonar'||kind==='place'?'sine':'triangle';osc.frequency.setValueAtTime(kind==='sonar'?1100:kind==='shot'?200:kind==='place'?620:95,now);osc.frequency.exponentialRampToValueAtTime(kind==='sonar'?680:kind==='place'?850:25,now+dur);gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.65,now+.015);gain.gain.exponentialRampToValueAtTime(.001,now+dur);osc.connect(gain).connect(master);osc.start(now);osc.stop(now+dur);osc.onended=()=>{osc.disconnect();gain.disconnect();};if(['hit','sunk','miss'].includes(kind)){const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*dur),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const noise=c.createBufferSource(),filter=c.createBiquadFilter(),ng=c.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='miss'?1600:650;ng.gain.value=kind==='sunk'?1:.65;noise.connect(filter).connect(ng).connect(master);noise.start();noise.onended=()=>{noise.disconnect();filter.disconnect();ng.disconnect();};}}catch{/* Sound is optional on locked mobile audio contexts. */}}
document.addEventListener('settingschange',()=>{if(master)master.gain.value=settings.sound?Math.max(0,Math.min(1,settings.effectsVolume))*.56:0;});
function center(side,i){return effects.point(nodes[side][i]);}
function burst(side,i,kind){if(!visible())return;tone(kind);effects.impact(center(side,i),kind);}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function strike(side,i,generation){tone('shot');if(settings.motion&&visible()){const target=center(side,i),from={x:side==='enemy'?win.clientWidth*.85:win.clientWidth*.15,y:75};effects.launch(from,target);}await delay(settings.motion?360:60);if(generation!==round)return null;const result=fire(side==='enemy'?enemy:own,i);if(!result)return null;render();burst(side,i,result.sunk?'sunk':result.hit?'hit':'miss');const label=result.sunk?'ПОТОПЛЕН':result.hit?'ПОПАДАНИЕ':'МИМО';message((side==='enemy'?'Твой выстрел · ':'Противник · ')+coordinate(i)+' · '+label);log((side==='enemy'?'ТЫ':'ПК')+' / '+coordinate(i)+' / '+label);await delay(settings.motion?(result.sunk?800:400):100);if(generation!==round)return null;if(result.won)finish(side==='enemy');return result;}
function finish(won){finishGame(accountRun,{outcome:won?'win':'loss',completed:true});phase='finished';busy=false;won?score.wins++:score.losses++;storage.set('naval_score',score);$('naval-result').hidden=false;$('naval-result').textContent=won?'ПОБЕДА':'ФЛОТ ПОТЕРЯН';message(won?'Флот противника уничтожен.':'Твой флот уничтожен.','Нажми «Новая игра», чтобы сыграть ещё раз.');render();if(won&&visible()){effects.impact(center('enemy',44),'sunk');effects.impact(center('enemy',66),'sunk');}}
function computerSoon(){clearTimeout(timer);timer=setTimeout(computer,700);}
async function computer(){if(online?.session)return;if(phase!=='computer'||busy||!visible())return;busy=true;render();const generation=round,index=chooseTarget(own.shots);if(index===null){busy=false;return;}const result=await strike('own',index,generation);if(generation!==round||!result||phase==='finished')return;busy=false;if(result.hit){phase='computer';render();computerSoon();}else{phase='player';message('Твой ход. Выбирай цель.','Попадание — ещё один выстрел. Залп и сонар расходуют ход.');render();}}
async function shoot(i){if(online?.session){if(phase==='player'&&!busy&&online.connected&&performance.now()>=netCooldown&&enemy.shots[i]===null)onlineCommand('fire',{index:i,weapon});return;}if(phase!=='player'||busy||enemy.shots[i]!==null)return;busy=true;const generation=round,selected=weapon;render();let result;
 if(selected==='sonar'&&sonar){sonar--;const area=[];for(let n=0;n<100;n++)if(Math.abs(n%10-i%10)<=1&&Math.abs(Math.floor(n/10)-Math.floor(i/10))<=1)area.push(n);const count=enemy.ships.flatMap(s=>s.cells).filter(c=>area.includes(c)&&enemy.shots[c]===null).length;tone('sonar');message('СОНАР · '+coordinate(i)+' · целых палуб: '+count,'Проверена область 3×3 вокруг выбранной клетки. Ход противника.');log('СОНАР / '+coordinate(i)+' / '+count+' ПАЛУБ');const p=center('enemy',i);if(settings.motion){effects.sonar(p);}render();area.forEach(c=>nodes.enemy[c].classList.add('scanned'));await delay(1200);
 }else if(selected==='salvo'&&salvo){salvo--;for(const n of [i-1,i,i+1])if(n>=0&&n<100&&Math.floor(n/10)===Math.floor(i/10)&&enemy.shots[n]===null){result=await strike('enemy',n,generation);if(generation!==round||phase==='finished')return;}}
 else result=await strike('enemy',i,generation);
 if(generation!==round||phase==='finished')return;busy=false;weapon='shot';$('naval-weapon-hint').textContent='Нажми клетку противника.';phase=selected==='shot'&&result?.hit?'player':'computer';render();if(phase==='computer')computerSoon();else message('Попадание! Стреляй ещё.');
}
for(const event of ['windowfocus','visibilitychange'])document.addEventListener(event,()=>{if(visible()&&phase==='computer'&&!busy)computerSoon();});
document.addEventListener('windowhide',e=>{if(e.detail==='naval'){clearTimeout(timer);effects.clear();audio?.suspend().catch(()=>{});}});
reset();

async function onlineCommand(action,data={}){busy=true;render();try{await online.request(action,data);}catch(e){message(e.message);if([403,404].includes(e.status)){await online.leave();netState=null;reset();$('naval-connection').textContent=e.message;}}finally{busy=false;render();}}
function onlineState(state){
 const previous=netState;if((state.phase==='battle'||state.phase==='finished')&&(!previous||previous.phase==='setup'||previous.round!==state.round))accountRun=beginGame('naval','classic',true,state.self.id+':'+state.round);netState=state;round++;clearTimeout(timer);busy=false;
 if(previous&&previous.round!==state.round){own=randomBoard();$('naval-result').hidden=true;$('naval-log').replaceChildren();}
 if(state.self.ready)own=state.self.board;
 enemy=state.enemy||{...emptyBoard(),remaining:10};salvo=state.self.salvo;sonar=state.self.sonar;
 phase=state.phase==='battle'?(state.turn===state.self.id?'player':'computer'):state.phase;
 $('naval-reset').textContent=state.phase==='finished'?'Реванш':'Новая игра';
 if(phase==='setup')message(state.self.ready?'Твой флот готов. Ждём соперника.':'Расставь флот и нажми «Флот готов».',state.players.length<2?'Передай другу код '+state.code+'.':'Бой начнётся, когда оба подтвердят флот.');
 else if(phase!=='finished')message(phase==='player'?'Твой ход. Выбирай цель.':'Ход соперника.',state.players.some(p=>!p.connected)?'Игрок переподключается. Комната ждёт 60 секунд.':'Попадание даёт ещё один ход.');
 const action=state.action,isNew=action&&previous&&(action.id!==previous.action?.id||state.round!==previous.round);
 if(isNew){const side=action.actor===state.self.id?'enemy':'own';netCooldown=performance.now()+(action.weapon==='salvo'?1600:900);clearTimeout(netTimer);netTimer=setTimeout(render,action.weapon==='salvo'?1660:960);weapon='shot';
  if(action.weapon==='sonar'){tone('sonar');if(action.actor===state.self.id){message('СОНАР · '+coordinate(action.index)+' · '+action.count+' целых палуб','Область 3×3. Ход противника.');log('СОНАР / '+action.count+' ПАЛУБ');effects.sonar(center('enemy',action.index));}}
  else{for(const [n,result]of action.results.entries()){setTimeout(()=>{if(netState?.round!==state.round||!online?.session)return;const target=center(side,result.index);tone('shot');effects.launch({x:win.clientWidth*(side==='enemy'?.85:.15),y:75},target);setTimeout(()=>{if(netState?.round===state.round&&online?.session)burst(side,result.index,result.sunk?'sunk':result.hit?'hit':'miss');},350);},n*260);log((side==='enemy'?'ТЫ':'СОПЕРНИК')+' / '+coordinate(result.index)+' / '+(result.sunk?'ПОТОПЛЕН':result.hit?'ПОПАДАНИЕ':'МИМО'));}}
 }
 if(phase==='finished'){const won=state.winner===state.self.id,key=state.self.id+':'+state.round;finishGame(accountRun,{outcome:won?'win':'loss',completed:true});message(won?'ПОБЕДА. Флот противника остановлен.':'Бой завершён.',state.reason==='fleet'?'Можно сыграть реванш.':'Соперник покинул бой или не восстановил связь.');$('naval-result').hidden=false;$('naval-result').textContent=won?'ПОБЕДА':'ПОРАЖЕНИЕ';if(lastWin!==key){lastWin=key;storage.set('naval_result_key',key);won?score.wins++:score.losses++;storage.set('naval_score',score);}}
 render();
}
online=new NavalOnline(onlineState,(text)=>{$('naval-connection').textContent=text;render();});
$('naval-name').value=storage.get('naval_name','');
async function enterOnline(action,roomId){if(busy)return;const code=$('naval-code').value.trim();if(action==='join'&&!/^\d{3}$/.test(code)){message('Введи три цифры комнаты.');return;}const name=$('naval-name').value.trim()||'Игрок';storage.set('naval_name',name);round++;clearTimeout(timer);busy=true;netState=null;render();for(const id of ['naval-create','naval-join'])$(id).disabled=true;try{await online.enter(action,{code,name,roomId});}catch(e){message(e.message);}finally{busy=false;for(const id of ['naval-create','naval-join'])$(id).disabled=false;render();}}
$('naval-create').onclick=()=>enterOnline('create');$('naval-join').onclick=()=>enterOnline('join');
$('naval-leave').onclick=async()=>{await online.leave();netState=null;netCooldown=0;reset();$('naval-connection').textContent='Ты вышел из комнаты. Можно играть соло или создать новую.';};
render();

export async function prepareInvite(){if(!online.session&&['player','computer'].includes(phase))throw Error('Сначала закончи текущий бой.');if(!online.session)await enterOnline('create');if(!online.session)throw Error('Не удалось создать комнату.');return online.session;}
export async function joinInvitation(code,roomId){if(online.session){if(online.session.code===code)return;throw Error('Сначала выйди из текущей комнаты.');}if(['player','computer'].includes(phase))throw Error('Сначала закончи текущий бой.');$('naval-code').value=code;await enterOnline('join',roomId);if(!online.session)throw Error('Не удалось войти. Комната закрыта или занята.');}
