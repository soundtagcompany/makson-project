import {randomBytes,randomInt} from 'node:crypto';
import {createGame,act,viewGame,eliminate} from './pulse-core.js';
export function createPulseService({json,body,fail,clientIP}){
 const rooms=new Map(),rates=new Map();
 const player=()=>({token:randomBytes(24).toString('hex'),stream:null,seen:Date.now(),ready:false,left:false,lastRequest:null,lastRevision:null});
 const snapshot=(r,p)=>({code:r.code,round:r.round,me:r.players.indexOf(p),host:r.players.findIndex(x=>!x.left),connected:r.players.map(x=>!!x.stream&&!x.left),ready:r.players.map(x=>x.ready),state:r.game?viewGame(r.game,r.players.indexOf(p)):null});
 function broadcast(r){for(const p of r.players)if(!p.left&&p.stream&&!p.stream.destroyed){if(p.stream.writableLength>128*1024)p.stream.destroy();else p.stream.write('data: '+JSON.stringify(snapshot(r,p))+'\n\n');}}
 function find(data){const r=rooms.get(String(data.code));if(!r)throw fail(404,'Комната закрыта.');const p=r.players.find(x=>x.token===data.token&&!x.left);if(!p)throw fail(403,'Сессия закончилась.');return {r,p};}
 function start(r){const count=r.players.length;r.first=r.first===undefined?randomInt(count):(r.first+1)%count;r.game=createGame(randomInt(0x100000000),r.first,count);r.announced=true;r.touched=Date.now();for(const p of r.players){p.ready=false;p.lastRequest=null;}}
 const cleanup=setInterval(()=>{const now=Date.now();for(const [code,r]of rooms){if(now-r.touched>3600000||r.players.every(p=>p.left)){r.players.forEach(p=>p.stream?.end());rooms.delete(code);continue;}let changed=false;
  if(r.game?.phase==='playing'){for(const [i,p]of r.players.entries())if(!p.stream&&now-p.seen>60000&&r.game.players[i].hp>0){r.game=eliminate(r.game,i,now);changed=true;}}
  if(r.game&&r.announced&&now>=r.game.revealUntil){r.announced=false;changed=true;}
  if(changed)broadcast(r);for(const p of r.players)p.stream?.write(': heartbeat\n\n');
 }for(const [ip,b]of rates)if(now-b.start>60000)rates.delete(ip);},1000);cleanup.unref();
 return async(req,res,url)=>{
  const route=url.pathname.slice('/api/pulse/'.length);
  if(route==='events'&&req.method==='GET'){const {r,p}=find(Object.fromEntries(url.searchParams));p.stream?.end();p.stream=res;p.seen=Date.now();r.touched=Date.now();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');broadcast(r);res.on('close',()=>{if(p.stream===res){p.stream=null;p.seen=Date.now();broadcast(r);}});return;}
  if(req.method!=='POST')throw fail(405,'Метод не поддерживается.');const data=await body(req),now=Date.now(),ip=clientIP(req);let budget=rates.get(ip);if(!budget||now-budget.start>10000){budget={start:now,count:0};rates.set(ip,budget);}if(++budget.count>100)throw fail(429,'Подожди несколько секунд.');
  if(route==='create'){if(rooms.size>=200)throw fail(503,'Все комнаты заняты.');let code;do{code=String(randomInt(1000)).padStart(3,'0');}while(rooms.has(code));const p=player(),r={code,inviteId:randomBytes(16).toString('hex'),round:0,players:[p],game:null,touched:now};rooms.set(code,r);return json(res,201,{code,token:p.token});}
  if(route==='join'){const r=rooms.get(String(data.code));if(!r)throw fail(404,'Комната не найдена.');if(data.roomId&&data.roomId!==r.inviteId)throw fail(410,'Приглашение устарело.');if(r.game)throw fail(409,'Партия уже началась.');if(r.players.length>=4)throw fail(409,'Все четыре места заняты.');const p=player();r.players.push(p);r.touched=now;broadcast(r);return json(res,200,{code:r.code,token:p.token});}
  const {r,p}=find(data);p.seen=now;r.touched=now;
  if(route==='invite'){if(r.game||r.players.length>=4)throw fail(409,'Комната занята или партия уже идёт.');return json(res,200,{roomId:r.inviteId});}
  if(route==='state')return json(res,200,snapshot(r,p));
  if(route==='start'){if(r.players.find(x=>!x.left)!==p)throw fail(403,'Начать может создатель комнаты.');if(r.game)throw fail(409,'Партия уже идёт.');if(r.players.length<2||r.players.some(x=>!x.stream))throw fail(409,'Нужно хотя бы двое подключённых игроков.');start(r);broadcast(r);return json(res,200,{ok:true});}
  if(route==='action'){if(typeof data.requestId!=='string'||data.requestId.length>80)throw fail(400,'Нет номера действия.');if(p.lastRequest===data.requestId)return json(res,200,{ok:true,revision:p.lastRevision});if(!r.game||data.revision!==r.game.revision)throw fail(409,'Дождись обновления состояния.');try{r.game=act(r.game,r.players.indexOf(p),data.command||{});}catch(e){throw fail(400,e.message);}r.announced=Date.now()<r.game.revealUntil;p.lastRequest=data.requestId;p.lastRevision=r.game.revision;broadcast(r);return json(res,200,{ok:true,revision:r.game.revision});}
  if(route==='rematch'){if(r.game?.phase!=='finished')throw fail(409,'Партия ещё идёт.');p.ready=true;const staying=r.players.filter(x=>!x.left);if(staying.length>=2&&staying.every(x=>x.ready&&x.stream)){r.players=staying;r.round++;start(r);}broadcast(r);return json(res,200,{ok:true});}
  if(route==='leave'){const index=r.players.indexOf(p);if(r.game){r.game=eliminate(r.game,index);p.left=true;}else r.players.splice(index,1);p.stream?.end();p.stream=null;broadcast(r);if(!r.players.length||r.players.every(x=>x.left))rooms.delete(r.code);return json(res,200,{ok:true});}
  throw fail(404,'Неизвестная команда.');
 };
}
