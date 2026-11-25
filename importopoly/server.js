import {nextBotAction} from './public/bot.js';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {resolve} from 'node:path';
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {randomInt,randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {expireAuction,createGame,act,actionContext,publicGame,PIECES,resumeGame} from './public/core.js';
const root=fileURLToPath(new URL('.',import.meta.url)),rooms=new Map(),limits=new Map();
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const random=()=>randomInt(0,0x100000000)/0x100000000;
await mkdir(root+'.data',{recursive:true});
try{for(const r of JSON.parse(await readFile(root+'.data/rooms.json','utf8')))if(Date.now()-r.updated<7*86400000){if(r.game)r.game=resumeGame(r.game);rooms.set(r.code,r);}}catch(e){if(e.code!=='ENOENT')console.error('Saved rooms could not be loaded:',e.message);}
let saving=Promise.resolve();
function persist(){const value=JSON.stringify([...rooms.values()]);saving=saving.catch(()=>{}).then(async()=>{await writeFile(root+'.data/rooms.tmp',value);await rename(root+'.data/rooms.tmp',root+'.data/rooms.json');});return saving;}
const error=(code,message)=>Object.assign(new Error(message),{status:code});
function snapshot(r){return {serverNow:Date.now(),code:r.code,host:r.host,members:r.members.map(({tokenHash,...p})=>p),game:r.game?publicGame(r.game):null};}
function member(data,r){return r.members.find(p=>p.tokenHash===hash(data.token))||(()=>{throw error(403,'Сессия не найдена. Войдите в комнату.');})();}
function newMember(data,r){const name=String(data.name||'Игрок').trim().slice(0,22)||'Игрок';let piece=Number(data.piece);if(!Number.isInteger(piece)||piece<0||piece>5)piece=0;if(r.members.some(p=>p.piece===piece))piece=[0,1,2,3,4,5].find(i=>!r.members.some(p=>p.piece===i));const token=randomBytes(24).toString('hex'),p={id:randomBytes(8).toString('hex'),name,piece,tokenHash:hash(token)};r.members.push(p);return {p,token};}
const files={'/bot.js':'public/bot.js','/':'public/index.html','/vendor/LICENSE.txt':'public/vendor/LICENSE.txt','/index.html':'public/index.html','/app.js':'public/app.js','/core.js':'public/core.js','/scene.js':'public/scene.js','/style.css':'public/style.css','/vendor/three.module.js':'public/vendor/three.module.js','/vendor/three.core.js':'public/vendor/three.core.js'};
export async function handleImportopoly(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/importopoly'){res.writeHead(302,{Location:'/importopoly/'});res.end();return;}url.pathname=url.pathname.replace(/^\/importopoly(?=\/)/,'');
 if(url.pathname==='/importopoly.mp3'){
  if(!['GET','HEAD'].includes(req.method))throw error(405,'Требуется GET.');
  const path=root+'public/importopoly.mp3',{size}=await stat(path),headers={'Content-Type':'audio/mpeg','Content-Length':size,'Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400'};
  let start=0,end=size-1,status=200;
  if(req.headers.range){const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!range||(!range[1]&&!range[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
   if(!range[1])start=Math.max(0,size-Number(range[2]));else{start=Number(range[1]);if(range[2])end=Math.min(end,Number(range[2]));}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
  }
  res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(path,{start,end});res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);return;
 }
 if(url.pathname==='/api/health')return send(200,{ok:true,game:'importopoly'});
 if(url.pathname.startsWith('/api/')){
  if(req.method!=='POST')throw error(405,'Требуется POST.');if(req.headers.origin&&![`http://${req.headers.host}`,`https://${req.headers.host}`].includes(req.headers.origin))throw error(403,'Запрос с другого сайта.');
  const peer=req.socket.remoteAddress,ip=process.env.TRUST_LOOPBACK_PROXY==='1'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)?req.headers['x-real-ip']||peer:peer,now=Date.now();let rate=limits.get(ip);if(!rate||now-rate.start>10000){rate={start:now,count:0};limits.set(ip,rate);}if(++rate.count>160)throw error(429,'Слишком много запросов.');
  let text='';for await(const chunk of req){text+=chunk;if(text.length>12000)throw error(413,'Слишком большой запрос.');}let d;try{d=JSON.parse(text||'{}');}catch{throw error(400,'Неверный JSON.');}
  if(url.pathname==='/api/create'){if(rooms.size>=500)throw error(503,'Сервер занят.');let code;do{code=String(randomInt(1000,10000));}while(rooms.has(code));const r={code,inviteId:randomBytes(16).toString('hex'),members:[],host:null,game:null,updated:now}, {p,token}=newMember(d,r);r.host=p.id;rooms.set(code,r);await persist();return send(201,{...snapshot(r),token,id:p.id});}
  const r=rooms.get(String(d.code));if(!r)throw error(404,'Комната не найдена. Проверьте четыре цифры.');
  if(url.pathname==='/api/join'){if(d.roomId&&d.roomId!==r.inviteId)throw error(410,'Приглашение устарело.');if(r.game)throw error(409,'Партия уже началась.');if(r.members.length>=6)throw error(409,'Все шесть мест заняты.');const {p,token}=newMember(d,r);r.updated=now;await persist();return send(200,{...snapshot(r),token,id:p.id});}
  const p=member(d,r);r.lastSeen=Date.now();if(r.game){const next=expireAuction(r.game);if(next!==r.game){r.game=next;r.updated=Date.now();await persist();}}
  if(url.pathname==='/api/invite'){if(r.game||r.members.length>=6)throw error(409,'Комната занята или партия уже началась.');if(!r.inviteId){r.inviteId=randomBytes(16).toString('hex');await persist();}return send(200,{roomId:r.inviteId});}
  if(url.pathname==='/api/state')return send(200,snapshot(r));
  if(url.pathname==='/api/add-bot'){if(r.game||r.host!==p.id)throw error(403,'Ботов добавляет хозяин до начала партии.');if(r.members.length>=6)throw error(409,'Все места заняты.');const {p:bot}=newMember({name:'БОТ '+(r.members.filter(m=>m.bot).length+1),piece:0},r);bot.bot=true;delete bot.tokenHash;}
  else if(url.pathname==='/api/start'){if(r.host!==p.id)throw error(403,'Начать может создатель комнаты.');if(r.game&&r.game.phase!=='finished')throw error(409,'Партия уже идёт.');r.game=createGame(r.members,random);r.game.gameId=randomBytes(12).toString("hex");}
  else if(url.pathname==='/api/action'){
   if(!r.game)throw error(409,'Игра ещё не началась.');
   const key=typeof d.requestId==='string'&&/^[\w-]{8,80}$/.test(d.requestId)?p.id+':'+d.requestId:null;
   const digest=hash(JSON.stringify([d.action,d.context,d.revision]));
   const receipt=key&&r.actionReceipts?.find(x=>x.key===key);
   if(receipt){if(receipt.digest!==digest)throw error(409,'Номер запроса уже использован.');await saving;return send(200,snapshot(r));}
   const matches=typeof d.context==='string'?d.context===actionContext(r.game,p.id,d.action||{}):d.revision===r.game.revision||(d.action?.kind==='bid'&&Number.isInteger(d.action.increment)&&d.action.auctionId===r.game.auction?.id);
   if(!matches)throw error(409,'Это действие уже недоступно. Данные обновлены.');
   r.game=act(r.game,p.id,d.action||{},random);
   if(key)r.actionReceipts=[...(r.actionReceipts||[]),{key,digest}].slice(-128);
  }
  else if(url.pathname==='/api/kick'){if(r.game||r.host!==p.id||d.id===p.id)throw error(403,'Удаление доступно хозяину до начала игры.');r.members=r.members.filter(m=>m.id!==d.id);}
  else throw error(404,'Неизвестный запрос.');
  r.updated=now;await persist();send(200,snapshot(r));
 }else{const path=files[url.pathname];if(!path)throw error(404,'Не найдено.');const data=await readFile(root+path);res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(data);}
 }catch(e){send(e.status||400,{error:e.message||'Ошибка сервера.'});}
}
setInterval(()=>{const cutoff=Date.now()-7*86400000;for(const [code,r] of rooms)if(r.updated<cutoff)rooms.delete(code);for(const [ip,r] of limits)if(Date.now()-r.start>60000)limits.delete(ip);},60000).unref();
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))http.createServer(handleImportopoly).listen(Number(process.env.PORT)||4180,process.env.HOST||'0.0.0.0',()=>console.log('СДВГПОЛИЯ: http://localhost:'+(process.env.PORT||4180)));

let botTickBusy=false;setInterval(async()=>{if(botTickBusy)return;botTickBusy=true;try{let changed=false;for(const room of rooms.values()){if(room.game){const expired=expireAuction(room.game);if(expired!==room.game){room.game=expired;room.updated=Date.now();changed=true;}}if(!room.game||Date.now()-(room.lastSeen||0)>60000||room.game.phase==='finished'||Date.now()<(room.game.actionReadyAt||0)+650||Date.now()<(room.botAt||0))continue;const next=nextBotAction(room.game);if(!next)continue;try{room.game=act(room.game,next.id,next.action,random);room.botAt=Date.now()+650;room.updated=Date.now();changed=true;}catch(error){room.botAt=Date.now()+5000;console.error('Bot action:',error.message);}}if(changed)await persist();}finally{botTickBusy=false;}},400).unref();

let auctionTickBusy=false;setInterval(async()=>{if(auctionTickBusy)return;auctionTickBusy=true;try{let changed=false;const now=Date.now();for(const r of rooms.values()){if(!r.game)continue;const next=expireAuction(r.game,now);if(next!==r.game){r.game=next;r.updated=now;changed=true;}}if(changed)await persist();}finally{auctionTickBusy=false;}},100).unref();
