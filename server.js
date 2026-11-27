import {restoreAudioAssets} from './cloud/assets.js';
import {proxyTools} from './tools-proxy.js';
import {createBufferService} from './buffer-server.js';
import http from 'node:http';
import {handleImportopoly} from './importopoly/server.js';
import { proxySvyaz } from './svyaz-proxy.js';
import { readFile,stat } from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { isIP } from 'node:net';
import { race, stepRace, MODES, clamp } from './game-core.js';
import { createNavalService } from './naval-server.js';
import { createPulseService } from './pulse-server.js';

const root=fileURLToPath(new URL('.',import.meta.url)),rooms=new Map(),limits=new Map();
const port=Number(process.env.PORT||process.env.SERVICE_PORT)||4173;
const host=process.env.HOST||'0.0.0.0';
function clientIP(req){
  const peer=req.socket.remoteAddress;
  const forwarded=req.headers['x-real-ip'];
  return process.env.TRUST_LOOPBACK_PROXY==='1'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:peer;
}
const publicFiles=new Set(['pixel-shell.js','pixel-layout.js','editor.js','editor-timeline.js','editor.css','app-links.js','meme.js','meme-render.js','meme.css','tools-ui.js','fonts/IBMPlexMono-Medium.ttf','fonts/ibmplexmono-OFL.txt','console-effects.js','console-windows.js','console-input.js','console.css','console-shell.js','fonts/PixelifySans.ttf','fonts/pixelify-OFL.txt','svyaz-photos.js','voice.js','importopoly-bridge.js','picture-in-picture.js','sw.js','manifest.webmanifest','social.js','account.js','svyaz.js','svyaz.css','pulse-motion.js','pulse-renderer.js','pulse-music/track-1.mp3','pulse-music/track-2.mp3','pulse-music/track-3.mp3','pulse-music/track-4.mp3','pulse-music/track-5.mp3','pulse.js','pulse-core.js','pulse-art.js','pulse-net.js','pulse.css','war.mp3','boom.mp3','big boom.mp3','fullscreen.js','naval-net.js','battle-effects.js','naval.js','naval-core.js','naval.css','index.html','styles.css','app.js','game.js','game-core.js','renderer.js','asteroid-illusion.png','buffer.js','audio.js','orbit.js','sphere-bloom.js','orbit.css','cursor.svg','stars.svg','fonts/RussoOne-Regular.ttf','fonts/Jura.ttf','fonts/russoone-OFL.txt','fonts/jura-OFL.txt','asteroid 1.mp3','asteroid 2.mp3','asteroid menu.mp3','favicon.svg','wallpaper.jpeg','click.mp3','error.mp3','tada.mp3']);
const mime={webmanifest:'application/manifest+json',html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',svg:'image/svg+xml',jpeg:'image/jpeg',mp3:'audio/mpeg',ttf:'font/ttf',txt:'text/plain; charset=utf-8'};
const fail=(status,message)=>Object.assign(new Error(message),{status});
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let data='',size=0;for await(const chunk of req){size+=chunk.length;if(size>2048)throw fail(413,'Слишком большой запрос.');data+=chunk;}try{return JSON.parse(data||'{}');}catch{throw fail(400,'Некорректный JSON.');}}
function newPilot(data){return {id:randomBytes(8).toString('hex'),token:randomBytes(24).toString('hex'),name:String(data.name||'Космонавт').trim().slice(0,16)||'Космонавт',color:[0,1,2].includes(data.color)?data.color:0,ready:false,input:{},inputAt:0,stream:null,lastSeen:Date.now()};}
function snapshot(room){return {code:room.code,mode:room.mode,players:room.players.map(({id,name,color,ready,stream})=>({id,name,color,ready,connected:!!stream})),race:room.race?{...room.race,track:undefined}:null};}
function broadcast(room){const msg='data: '+JSON.stringify(snapshot(room))+'\n\n';for(const p of room.players)if(p.stream&&!p.stream.destroyed){if(p.stream.writableLength>128*1024){p.stream.destroy();continue;}p.stream.write(msg);}}
function finishDisconnected(room,p){if(room.race&&room.race.state!=='finished'){room.race.state='finished';room.race.winner=room.players.find(other=>other.id!==p.id)?.id||null;room.race.reason='disconnect';}room.players=room.players.filter(other=>other!==p);p.stream?.end();broadcast(room);}
const navalService=createNavalService({json,body,fail,clientIP});
const pulseService=createPulseService({json,body,fail,clientIP});
const bufferService=createBufferService({json,fail});
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/importopoly'||url.pathname.startsWith('/importopoly/'))return await handleImportopoly(req,res);
    if(url.pathname.startsWith('/api/')){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)throw fail(403,'Запрос с другого сайта отклонён.');
      if(url.pathname.startsWith('/api/buffer/'))return await bufferService(req,res,url);
      if(url.pathname.startsWith('/api/tools/'))return proxyTools(req,res,clientIP);
      if(url.pathname.startsWith('/api/svyaz/'))return proxySvyaz(req,res,clientIP);
      if(url.pathname.startsWith('/api/pulse/'))return await pulseService(req,res,url);
      if(url.pathname.startsWith('/api/naval/'))return await navalService(req,res,url);
      if(url.pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true});
      if(url.pathname==='/api/events'&&req.method==='GET'){
        const room=rooms.get(url.searchParams.get('code')),p=room?.players.find(p=>p.token===url.searchParams.get('token'));
        if(!p)throw fail(404,'Комната закрыта. Создай новую.');
        p.stream?.end();p.stream=res;p.lastSeen=Date.now();room.touched=Date.now();
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1000\n\n');broadcast(room);
        res.on('close',()=>{if(p.stream===res){p.stream=null;p.lastSeen=Date.now();p.input={};broadcast(room);}});return;
      }
      if(req.method!=='POST')throw fail(405,'Метод не поддерживается.');
      const data=await body(req),ip=clientIP(req),now=Date.now();
      let budget=limits.get(ip);if(!budget||now-budget.start>1000){budget={start:now,n:0};limits.set(ip,budget);}if(++budget.n>90)throw fail(429,'Слишком много запросов. Подожди секунду.');
      if(url.pathname==='/api/create'){
        if(rooms.size>=200)throw fail(503,'Сервер занят. Попробуй немного позже.');
        let code;do{code=String(randomInt(1000)).padStart(3,'0');}while(rooms.has(code));
        const p=newPilot(data),room={code,inviteId:randomBytes(16).toString('hex'),mode:Object.hasOwn(MODES,data.mode)?data.mode:'sprint',players:[p],race:null,touched:now};rooms.set(code,room);return json(res,201,{code,token:p.token,id:p.id});
      }
      const room=rooms.get(String(data.code||'').toUpperCase());if(!room)throw fail(404,'Комната не найдена. Проверь код или создай новую.');
      if(url.pathname==='/api/join'){
        if(data.roomId&&data.roomId!==room.inviteId)throw fail(410,'Приглашение устарело.');
        if(room.players.length>=2)throw fail(409,'В этой комнате уже два пилота.');
        if(room.race&&room.race.state!=='finished')throw fail(409,'Заезд уже начался.');
        const p=newPilot(data);if(p.color===room.players[0]?.color)p.color=(p.color+1)%3;room.players.push(p);room.race=null;for(const pilot of room.players)pilot.ready=false;room.touched=now;broadcast(room);return json(res,200,{code:room.code,token:p.token,id:p.id});
      }
      const p=room.players.find(p=>p.token===data.token);if(!p)throw fail(403,'Сессия закончилась. Войди в комнату заново.');
      room.touched=now;p.lastSeen=now;
      if(url.pathname==='/api/invite'){if(room.players.length>=2||room.race&&room.race.state!=='finished')throw fail(409,'Комната занята или игра уже идёт.');return json(res,200,{roomId:room.inviteId});}
      if(url.pathname==='/api/input'){if(Number.isInteger(data.seq)&&(p.seq===undefined||data.seq>p.seq)){p.seq=data.seq;p.input={left:data.left===true,right:data.right===true,up:data.up===true,down:data.down===true,axisX:Number.isFinite(data.axisX)?clamp(data.axisX,-1,1):undefined,axisY:Number.isFinite(data.axisY)?clamp(data.axisY,-1,1):undefined,boost:data.boost===true};p.inputAt=now;}return json(res,200,{ok:true});}
      if(url.pathname==='/api/ready'){
        if(room.race&&room.race.state!=='finished')throw fail(409,'Заезд уже идёт.');
        p.ready=!p.ready;
        if(room.players.length===2&&room.players.every(p=>p.ready&&p.stream)){
          room.race=race(randomBytes(4).readUInt32LE(),room.players,room.mode);for(const pilot of room.players){pilot.ready=false;pilot.input={};}
        }
        broadcast(room);return json(res,200,{ok:true});
      }
      if(url.pathname==='/api/leave'){finishDisconnected(room,p);if(!room.players.length)rooms.delete(room.code);return json(res,200,{ok:true});}
      throw fail(404,'Неизвестная команда.');
    }
    if(req.method!=='GET'&&req.method!=='HEAD')throw fail(405,'Метод не поддерживается.');
    const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(!publicFiles.has(name))throw fail(404,'Файл не найден.');
    if(name.endsWith('.mp3')){const {size}=await stat(root+name),headers={'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400'};let start=0,end=size-1,status=200;if(req.headers.range&&req.method==='GET'){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;}res.writeHead(status,{...headers,'Content-Length':end-start+1});if(req.method==='HEAD')return res.end();const stream=createReadStream(root+name,{start,end});res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);return;}
    const file=await readFile(root+name),headers={'Content-Type':mime[name.split('.').pop()]||'application/octet-stream','Cache-Control':name.endsWith('.jpeg')||name.endsWith('.mp3')?'public, max-age=86400':'no-cache','Accept-Ranges':'bytes','Content-Length':file.length};
    // Seeking and seamless MP3 repeats need byte ranges, including on mobile Safari.
    const range=req.method==='GET'&&req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if(range&&(range[1]||range[2])){
      const start=range[1]?Number(range[1]):Math.max(0,file.length-Number(range[2]));
      const end=range[1]&&range[2]?Math.min(file.length-1,Number(range[2])):file.length-1;
      if(start>end||start>=file.length){res.writeHead(416,{'Content-Range':`bytes */${file.length}`});return res.end();}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${file.length}`});return res.end(file.subarray(start,end+1));
    }
    res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:file);
  }catch(e){if(!res.headersSent)json(res,e.status||(e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'Файл не найден.':'Ошибка сервера. Попробуй ещё раз.'});else res.end();}
});
let last=performance.now(),accumulator=0,tick=0;
setInterval(()=>{
  const now=performance.now();accumulator+=Math.min((now-last)/1000,.25);last=now;
  while(accumulator>=1/60){for(const room of rooms.values())if(room.race&&room.race.state!=='finished'){const inputs={};for(const p of room.players)inputs[p.id]=Date.now()-p.inputAt<900?p.input:{};stepRace(room.race,inputs,1/60);}accumulator-=1/60;}
  if(++tick%2===0)for(const room of rooms.values())if(room.race&&(room.race.state!=='finished'||room.lastBroadcastState!==room.race.state)){broadcast(room);room.lastBroadcastState=room.race.state;}
},1000/60).unref();
setInterval(()=>{
  const now=Date.now();for(const room of rooms.values()){
    for(const p of [...room.players])if(!p.stream&&now-p.lastSeen>15000)finishDisconnected(room,p);
    if(!room.players.length||now-room.touched>3600000){for(const p of room.players)p.stream?.end();rooms.delete(room.code);}
    else if(!room.race)for(const p of room.players)p.stream?.write(': heartbeat\n\n');
  }for(const [ip,v]of limits)if(now-v.start>60000)limits.delete(ip);
},1000).unref();
await restoreAudioAssets();
server.listen(port,host,()=>{
  console.log(`Максон: http://localhost:${port}`);
  if(host!=='0.0.0.0')return;
  let interfaces;
  // LAN hints are optional: some sandboxes allow listening but not interface enumeration.
  try{interfaces=networkInterfaces();}catch{return;}
  for(const list of Object.values(interfaces))for(const n of list||[])
    if(n.family==='IPv4'&&!n.internal)console.log(`Телефон в том же Wi-Fi: http://${n.address}:${port}`);
});
