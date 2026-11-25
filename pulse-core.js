import {INJECTION_MS,ITEM_ANIMATION_MS,DISPENSER_MS,itemDuration} from './pulse-motion.js';
// The server owns the deck. Public views deliberately omit remaining composition.
export const TYPES={sterile:'СТЕРИЛЬНЫЙ',necrosis:'НЕКРОЗ',dirty:'МОРФИЙ'};
export const REVEAL_MS=DISPENSER_MS,ACTION_MS=INJECTION_MS,ITEM_MS=ITEM_ANIMATION_MS;
export const RULES={normal:{name:'ОБЫЧНАЯ ПАРТИЯ',hint:'Ход по кругу. Любой укол себе сохраняет ход, пока ты жив. Морфий защищает от одного повреждения.'},scarce:{name:'ДЕФИЦИТ',hint:'В этой партии аппарат не пополняет аптечки.'},reverse:{name:'ОБРАТНЫЙ КРУГ',hint:'Очередь движется в обратную сторону. Морфий не меняет порядок ходов.'}};
export const ITEMS={
 lighter:{name:'ЗАЖИГАЛКА',hint:'Нагрей иглу: пар, тёмный дым или красноватые капли. Реакцию видишь только ты.'},
 wipe:{name:'ОЧИСТИТЕЛЬ',hint:'Морфий становится стерильным. Остальные составы не меняются. Результат видят все.'},
 tourniquet:{name:'БЛИСТЕР',hint:'Одна оставшаяся таблетка. Возвращает один пик кардиограммы, максимум четыре. При полном пульсе не расходуется.'},
 scalpel:{name:'СКАЛЬПЕЛЬ',hint:'Забери выбранный предмет соперника без потери пульса. Украденный предмет можно сразу использовать.'},
 catheter:{name:'КАТЕТЕР',hint:'Сливает ближайший шприц, раскрывая состав. Ход сохраняется. Полезен, чтобы лишить следующего игрока известного шприца.'},
 defib:{name:'ДЕФИБРИЛЛЯТОР',hint:'Заменяет партию без выдачи предметов и передаёт ход следующему живому игроку. Здоровье и защита морфия сохраняются.'}
};
const check=(ok,message)=>{if(!ok)throw Error(message);};
function random(s){let n=s.rng|0;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/4294967296;}
function drawItem(s,p){const pool=['lighter','lighter','lighter','lighter','wipe','wipe','wipe','tourniquet','tourniquet','tourniquet','catheter','catheter','catheter','scalpel','scalpel','defib'].filter(k=>!p.items.includes(k));const options=pool.length?pool:['lighter','wipe','catheter'];return options[Math.floor(random(s)*options.length)];}
function refill(s,now,award=true){s.batch++;const choices=Object.keys(RULES).filter(k=>k!==s.rule);s.rule=s.batch===1?'normal':choices[Math.floor(random(s)*choices.length)];s.direction=s.rule==='reverse'?-1:1;const alive=s.players.filter(p=>p.hp>0).length,size=Math.min(14,Math.max(4,s.players.length+2)+s.batch-1),dirty=1+Math.floor(random(s)*Math.max(1,Math.floor(size*.16))),harmMin=Math.max(1,Math.floor(size*.4)),harmMax=Math.min(size-dirty-1,Math.floor(size*.6)),harm=harmMin+Math.floor(random(s)*(harmMax-harmMin+1));s.deck=[...Array(harm).fill('necrosis'),...Array(dirty).fill('dirty')];while(s.deck.length<size)s.deck.push('sterile');for(let i=s.deck.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[s.deck[i],s.deck[j]]=[s.deck[j],s.deck[i]];}s.opening={sterile:0,necrosis:0,dirty:0};s.deck.forEach(k=>s.opening[k]++);s.revealStart=now;s.revealUntil=now+REVEAL_MS;s.availableAt=s.revealUntil;for(const p of s.players){p.peek=null;if(award&&p.hp>0&&s.rule!=='scarce'){const k=drawItem(s,p);if(p.items.length<4)p.items.push(k);else p.offer=k;}}}
export function createGame(seed=Date.now(),first=0,count=2,now=Date.now()){check(Number.isInteger(count)&&count>=2&&count<=4,'За столом от двух до четырёх игроков.');const s={rng:(seed>>>0)||1,revision:0,batch:0,deck:[],turn:first%count,phase:'playing',winner:null,used:0,availableAt:now,players:Array.from({length:count},()=>({hp:4,items:[],offer:null,shield:false,bonus:false,morphine:false,peek:null,guard:false,locked:-1})),event:null};for(const p of s.players)p.items.push(drawItem(s,p));refill(s,now);return s;}
const nextAlive=(s,from)=>{for(let n=1;n<=s.players.length;n++){const i=(from+n*(s.direction||1)+s.players.length*4)%s.players.length;if(s.players[i].hp>0)return i;}return from;};
function finish(s){const alive=s.players.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0);if(alive.length<=1){s.phase='finished';s.winner=alive[0]??null;return true;}return false;}
function clearPeeks(s){for(const p of s.players)p.peek=null;}
function pass(s,index){s.turn=index;s.players[index].guard=false;}
export function eliminate(state,index,now=Date.now()){
 const s=structuredClone(state);if(s.phase!=='playing'||!s.players[index]||s.players[index].hp<=0)return s;s.players[index].hp=0;s.players[index].offer=null;s.players[index].bonus=false;s.players[index].guard=false;
 if(!finish(s)&&s.turn===index){pass(s,nextAlive(s,index));s.used=0;}s.revision++;s.event={kind:'disconnect',actor:index,target:index,id:s.revision};s.availableAt=Math.max(s.availableAt,now+ITEM_MS);return s;
}
export function act(state,actor,command,now=Date.now()){
 check(state.phase==='playing','Партия завершена.');check(actor===state.turn&&state.players[actor].hp>0,'Сейчас не твой ход.');check(now>=state.availableAt,'Дождись окончания действия.');
 const s=structuredClone(state),p=s.players[actor];let event={actor,kind:command.kind};
 if(command.kind==='offer'){check(!!p.offer,'Нового предмета нет.');if(command.index!==-1){check(Number.isInteger(command.index)&&command.index>=0&&command.index<p.items.length,'Выбери предмет для замены.');p.items[command.index]=p.offer;if(p.locked===command.index)p.locked=-1;}p.offer=null;s.availableAt=now;}
 else{
  check(!p.offer,'Сначала освободи место в аптечке.');
  if(command.kind==='item'){
   check(Number.isInteger(command.index)&&command.index>=0&&command.index<p.items.length,'Предмета уже нет.');const item=p.items[command.index];
   event.item=item;
   const target=command.target??nextAlive(s,actor),victim=s.players[target];
   if(item==='scalpel')check(target!==actor&&victim?.hp>0&&Number.isInteger(command.steal)&&command.steal>=0&&command.steal<victim.items.length,'Выбери предмет живого соперника.');
   if(item==='tourniquet')check(p.hp<4,'Пульс полный. Таблетка пока не нужна.');
   p.items.splice(command.index,1);if(p.locked>command.index)p.locked--;s.used++;
   if(item==='lighter')p.peek=s.deck[0];
   if(item==='wipe'){event.cleaned=s.deck[0]==='dirty';if(event.cleaned){s.deck[0]='sterile';clearPeeks(s);}}
   if(item==='tourniquet'){p.hp++;event.heal=1;}
   if(item==='scalpel'){event.stolen=victim.items.splice(command.steal,1)[0];if(victim.locked===command.steal)victim.locked=-1;else if(victim.locked>command.steal)victim.locked--;p.items.push(event.stolen);p.locked=-1;event.victim=target;event.steal=command.steal;}
   if(item==='catheter'){event.type=s.deck.shift();clearPeeks(s);}
   s.availableAt=now+itemDuration(item);
   if(item==='defib'){p.bonus=false;pass(s,nextAlive(s,actor));s.used=0;refill(s,now+itemDuration(item),false);event.refill=true;}
  }else if(command.kind==='inject'){
   check(Number.isInteger(command.target)&&s.players[command.target]?.hp>0,'Выбери живого игрока.');const target=command.target,self=target===actor,type=s.deck.shift(),victim=s.players[target];
   const guarded=!self&&victim.guard,blocked=type==='necrosis'&&(victim.morphine||guarded);event={...event,target,type,damage:type==='necrosis'&&!blocked?1:0,blocked,morphineBefore:victim.morphine};
   if(type==='necrosis'&&victim.morphine&&!guarded)victim.morphine=false;
   if(type==='dirty')victim.morphine=true;
   victim.hp-=event.damage;if(!self&&event.damage&&s.players.length>2)victim.guard=true;
   p.locked=-1;clearPeeks(s);s.used=0;s.availableAt=now+ACTION_MS;
   if(victim.hp===0){victim.offer=null;victim.bonus=false;victim.guard=false;victim.morphine=false;}
   if(!finish(s)&&!(self&&p.hp>0))pass(s,nextAlive(s,actor));
  }else throw Error('Неизвестное действие.');
  if(s.phase==='playing'&&!s.deck.length){refill(s,now+(command.kind==='inject'?ACTION_MS:itemDuration(event.item)));event.refill=true;}
 }
 s.revision++;s.event={...event,id:s.revision};return s;
}
export function viewGame(s,me,now=Date.now()){
 return {revision:s.revision,batch:s.batch,phase:s.phase,winner:s.winner,turn:s.turn,used:s.used,rule:s.rule,direction:s.direction,total:s.deck.length,me,availableIn:Math.max(0,s.availableAt-now),revealDelay:Math.max(0,s.revealStart-now),revealIn:Math.max(0,s.revealUntil-now),announcement:now<s.revealUntil?{...s.opening}:null,
 players:s.players.map((p,i)=>({hp:p.hp,items:[...p.items],offer:i===me?p.offer:null,shield:p.shield,bonus:p.bonus,morphine:p.morphine,guard:p.guard,locked:i===me?p.locked:-1,peek:i===me?p.peek:null})),event:s.event?{...s.event}:null};
}
// AI memory is built exclusively from the same announcements and actions as humans.
export function remember(memory,v){
 if(memory.batch!==v.batch){memory.batch=v.batch;memory.counts=v.announcement?{...v.announcement}:null;memory.event=v.event?.id??0;return;}
 if(v.announcement)memory.counts={...v.announcement};
 const e=v.event;if(!e||memory.event===e.id)return;memory.event=e.id;
 if(memory.counts){if(e.type&&(e.kind==='inject'||e.item==='catheter'))memory.counts[e.type]=Math.max(0,memory.counts[e.type]-1);if(e.item==='wipe'&&e.cleaned){memory.counts.dirty--;memory.counts.sterile++;}}
}
export function chooseAction(v,memory={}){
 const p=v.players[v.me],counts=memory.counts||{sterile:1,necrosis:1,dirty:1},total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
 const opponents=v.players.map((p,i)=>({p,i})).filter(x=>x.i!==v.me&&x.p.hp>0).sort((a,b)=>(a.p.guard?8:0)+(a.p.morphine?3:0)+a.p.hp-((b.p.guard?8:0)+(b.p.morphine?3:0)+b.p.hp)),target=opponents[0].i,enemy=opponents[0].p;
 const certain=p.peek||Object.keys(counts).find(k=>counts[k]===total),item=k=>({kind:'item',index:p.items.findIndex((x,i)=>x===k)}),usable=k=>item(k).index>=0;
 const value=(k,owner=p)=>({lighter:certain?3:8,wipe:counts.dirty?4:2,tourniquet:owner.hp<4?9:3,catheter:5,scalpel:4,defib:2})[k];
 if(p.offer){let index=0;p.items.forEach((k,i)=>{if(value(k)<value(p.items[index]))index=i;});return {kind:'offer',index:value(p.offer)>value(p.items[index])?index:-1};}
 if(certain==='necrosis'&&enemy.hp===1&&!enemy.guard&&!enemy.morphine)return {kind:'inject',target};
 if(p.hp<4&&usable('tourniquet'))return item('tourniquet');
 if(!certain&&usable('lighter'))return item('lighter');
 if(certain==='dirty'&&p.morphine&&usable('wipe'))return item('wipe');
 if(usable('scalpel')){const loot=opponents.flatMap(o=>o.p.items.map((k,i)=>({target:o.i,steal:i,score:value(k,o.p)+value(k)*.4-(p.items.includes(k)?3:0)}))).sort((a,b)=>b.score-a.score)[0];if(loot&&loot.score>=9)return {...item('scalpel'),target:loot.target,steal:loot.steal};}
 if(certain==='sterile')return {kind:'inject',target:v.me};
 if(certain==='dirty')return {kind:'inject',target:v.me};
 if(certain==='necrosis')return {kind:'inject',target};
 if(p.hp===1&&!p.morphine&&counts.necrosis/total<.4&&usable('defib'))return item('defib');
 return {kind:'inject',target:(counts.sterile+(!p.morphine?counts.dirty:0))/total>.6&&(p.hp>1||p.morphine)?v.me:target};
}
