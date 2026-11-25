import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=22000+Math.floor(Math.random()*5000),base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
const ready=new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>{if(code)reject(Error('server exited '+code));});});
const post=async(path,data)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
async function stream(session){const abort=new AbortController(),response=await fetch(base+'/api/events?code='+session.code+'&token='+session.token,{signal:abort.signal}),reader=response.body.getReader(),decoder=new TextDecoder();const holder={last:null,abort};let buffer='';(async()=>{try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,end);buffer=buffer.slice(end+2);const line=message.split('\n').find(l=>l.startsWith('data: '));if(line)holder.last=JSON.parse(line.slice(6));}}}catch{}})();return holder;}
async function until(fn,ms=6000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('Timed out waiting for server state');await delay(30);}}
test('real HTTP server: rooms, authoritative state, reconnect, finish, rematch, errors',async t=>{await ready;const streams=[];try{
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);
 const audioRange=await fetch(base+'/asteroid%201.mp3',{headers:{Range:'bytes=0-127'}});assert.equal(audioRange.status,206);assert.equal((await audioRange.arrayBuffer()).byteLength,128);assert.match(audioRange.headers.get('content-range'),/^bytes 0-127\/\d+$/);
 assert.equal((await fetch(base+'/asteroid%202.mp3',{method:'HEAD'})).status,200);
 assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/index.original.html')).status,404);
 assert.equal((await post('join',{code:'MISSING'})).status,404);
 const created=await post('create',{name:'Alice',color:0,mode:'chill'});assert.equal(created.status,201);const a=created.data;assert.match(a.code,/^\d{3}$/);let sa=await stream(a);streams.push(sa);
 const joined=await post('join',{code:a.code,name:'Bob',color:0});assert.equal(joined.status,200);const b=joined.data,sb=await stream(b);streams.push(sb);
 assert.equal((await post('join',{code:a.code,name:'Third'})).status,409);
 assert.equal((await post('ready',{code:a.code,token:'wrong'})).status,403);
 await until(()=>sa.last?.players.length===2&&sb.last?.players.length===2);assert.notEqual(sa.last.players[0].color,sa.last.players[1].color);
 await post('ready',a);await post('ready',b);await until(()=>sa.last?.race?.state==='countdown'&&sb.last?.race?.state==='countdown');assert.equal(sa.last.race.mode,'chill');assert.equal(sa.last.race.seed,sb.last.race.seed);assert.deepEqual(sa.last.race.players.map(p=>p.distance),[0,0]);
 assert.equal((await post('ready',a)).status,409);
 await until(()=>sa.last?.race?.state==='racing');
 await post('input',{...a,seq:2,right:true,up:true,boost:true,distance:8000,shield:99});await post('input',{...a,seq:1,left:true});await delay(250);
 const pa=sa.last.race.players.find(p=>p.id===a.id);assert.ok(pa.x>255);assert.ok(pa.y>240);assert.ok(pa.distance<1000);assert.ok(pa.shield<=3);assert.ok(pa.boost<100);
 sa.abort.abort();await delay(200);sa=await stream(a);streams.push(sa);await until(()=>sa.last?.players.every(p=>p.connected));assert.equal(sa.last.race.state,'racing');
 // Disconnect is scored by the server, never by a client's claimed result.
 await post('leave',b);await until(()=>sa.last?.race?.state==='finished');assert.equal(sa.last.race.reason,'disconnect');assert.equal(sa.last.race.winner,a.id);
 const c=(await post('join',{code:a.code,name:'New pilot'})).data,sc=await stream(c);streams.push(sc);await until(()=>sa.last?.race===null&&sc.last?.players.length===2);await post('ready',a);await post('ready',c);await until(()=>sa.last?.race?.state==='countdown');
 // Reconnect grace expires without a slot remaining permanently occupied.
 sc.abort.abort();await until(()=>sa.last?.race?.reason==='disconnect',18000);assert.equal(sa.last.players.length,1);assert.equal(sa.last.race.winner,a.id);
 assert.equal((await fetch(base+'/api/create',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/create',{method:'POST',body:'{' })).status,400);
 }finally{for(const s of streams)s.abort.abort();child.kill();}});
