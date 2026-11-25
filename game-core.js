// Authoritative fixed-step physics, shared by solo and the room server.
export const FINISH = 20000;
export const TUNNEL_RADIUS=560,FLIGHT_RADIUS=TUNNEL_RADIUS-50;
export const COLORS = ['#9bffe0', '#ff95ce', '#ffe894'];
export const MODES = {
  sprint: { name:'ГИПНОРОЙДЕР', finish:20000, speed:610, turbo:1020, shields:3, spacing:290, density:.72, description:'20 км. Три щита. Огромные глыбы со всех сторон.' },
  overdrive: { name:'МЯСОРУБКА', finish:26000, speed:860, turbo:1380, shields:1, spacing:270, density:.88, description:'26 км. Один щит. Густое поле и безумная скорость.' },
  chill: { name:'БЕЗ ПАНИКИ', finish:16000, speed:400, turbo:760, shields:3, spacing:340, density:.5, description:'16 км. Бессмертие. Учись нырять между глыбами.' },
  endless: { name:'ДО ПОСЛЕДНЕГО ЩИТА', finish:0, speed:610, turbo:1020, shields:3, spacing:290, density:.72, description:'∞ км. Всё быстрее и теснее. Вдвоём — кто дольше выживет.' }
};
export const modeConfig = (mode,distance=0) => mode==='endless'?{...MODES.endless,speed:610+Math.min(370,distance/160),turbo:1020+Math.min(480,distance/160),density:.72+Math.min(.3,distance/180000)}:MODES[mode]||MODES.sprint;
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function random(seed) { let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;}; }
// Invisible winding escape path through the volume, shared by both pilots.
export function passage(seed,z) {
  const phase=(seed%97)/97*Math.PI*2;
  return {x:320+Math.sin(z/1050+phase)*185,y:240+Math.sin(z/880+phase*.7)*130};
}
export function course(seed,mode='sprint',chunk=0) {
  const endless=mode==='endless',start=endless?chunk*12000:0;
  const rng=random(seed^Math.imul(chunk,0x9e3779b9)),cfg=modeConfig(mode,start),items=[],end=endless?start+12000:cfg.finish;
  const add=o=>items.push({id:chunk*10000+items.length,spin:rng()*6,...o});
  const beginning=start+(chunk?0:1300),limit=end-(endless?0:400);
  const count=Math.ceil((limit-beginning)/cfg.spacing*14*cfg.density*1.34);
  for(let i=0;i<count;i++){
    const angle=rng()*Math.PI*2,spread=Math.sqrt(rng()),z=beginning+rng()*(limit-beginning),size=rng();
    const r=size<.25?22+rng()*24:size<.72?48+rng()*42:95+rng()*70;
    const radial=spread*(TUNNEL_RADIUS+r*.4),x=320+Math.cos(angle)*radial,y=240+Math.sin(angle)*radial;
    // Test the whole sphere against the escape path, including its near/far sides.
    let clear=true;
    for(let dz=-r-48;dz<=r+48;dz+=24){const gap=passage(seed,z+dz);if(Math.hypot(x-gap.x,y-gap.y,dz)<r+48){clear=false;break;}}
    if(clear)add({x,y,z,r,type:'rock'});
  }
  let pickup=0;
  for(let z=start+1650;z<end-500;z+=650+rng()*450){
    const gap=passage(seed,z),type=['shield','reactor','phase','nitro'][pickup++%4];
    add({x:gap.x+(rng()-.5)*28,y:gap.y+(rng()-.5)*28,z,r:27,type});
  }
  return items.sort((a,b)=>a.z-b.z);
}
// Keep only nearby chunks; both server and clients generate identical geometry.
export function syncCourse(r){
  if(r.mode!=='endless')return;
  const needed=new Set();
  for(const p of r.players.filter(p=>!p.dead))for(let n=Math.floor(Math.max(0,p.distance-600)/12000);n<=Math.floor((p.distance+6000)/12000);n++)needed.add(n);
  if(!needed.size)return;
  r.loadedChunks??=[0];
  if(r.loadedChunks.length===needed.size&&r.loadedChunks.every(n=>needed.has(n)))return;
  for(const n of needed)if(!r.loadedChunks.includes(n))r.track.push(...course(r.seed,r.mode,n));
  r.track=r.track.filter(item=>needed.has(Math.floor(item.id/10000)));r.loadedChunks=[...needed];
  for(const p of r.players){p.collected=p.collected.filter(id=>needed.has(Math.floor(id/10000)));p.dodged=p.dodged.filter(id=>needed.has(Math.floor(id/10000)));}
}
export function player(id,name,color=0,mode='sprint') {
  return {id,name,color,x:320,y:240,vx:0,vy:0,distance:0,speed:0,shield:modeConfig(mode).shields,boost:100,invincible:0,phase:0,reactor:0,hits:0,pickupCount:0,collected:[],dodged:[],nearMisses:0,combo:0,comboTimer:0,score:0,lastPickup:'',finished:false,dead:false,time:0};
}
// Distance to the entire movement segment, preventing tunnelling at high speed.
export function segmentDistance(a,b,o){const v=[b.x-a.x,b.y-a.y,b.z-a.z],w=[o.x-a.x,(o.y??240)-a.y,o.z-a.z],len=v[0]**2+v[1]**2+v[2]**2;const t=len?clamp((w[0]*v[0]+w[1]*v[1]+w[2]*v[2])/len,0,1):0;return Math.hypot(w[0]-v[0]*t,w[1]-v[1]*t,w[2]-v[2]*t);}
export function stepPlayer(p,input,dt,track,mode='sprint') {
  if(p.dead||p.finished)return;
  const cfg=modeConfig(mode,p.distance),old={x:p.x,y:p.y,z:p.distance};
  p.time+=dt;p.invincible=Math.max(0,p.invincible-dt);p.phase=Math.max(0,p.phase-dt);p.comboTimer=Math.max(0,p.comboTimer-dt);if(!p.comboTimer)p.combo=0;
  let dx=Number.isFinite(input.axisX)?clamp(input.axisX,-1,1):(input.right?1:0)-(input.left?1:0);
  let dy=Number.isFinite(input.axisY)?clamp(input.axisY,-1,1):(input.up?1:0)-(input.down?1:0);
  const length=Math.max(1,Math.hypot(dx,dy));dx/=length;dy/=length;
  p.vx+=(dx*440-p.vx)*Math.min(1,dt*17);p.vy+=(dy*440-p.vy)*Math.min(1,dt*17);
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  const offsetX=p.x-320,offsetY=p.y-240,radial=Math.hypot(offsetX,offsetY);
  if(radial>FLIGHT_RADIUS){const nx=offsetX/radial,ny=offsetY/radial;p.x=320+nx*FLIGHT_RADIUS;p.y=240+ny*FLIGHT_RADIUS;const outward=Math.max(0,p.vx*nx+p.vy*ny);p.vx-=nx*outward;p.vy-=ny*outward;}
  const boosting=input.boost&&p.boost>1;
  p.boost=clamp(p.boost+(boosting?-28:16+p.reactor*6)*dt,0,100);
  const target=boosting?cfg.turbo+p.reactor*70:cfg.speed;
  p.speed+=(target-p.speed)*Math.min(1,dt*4.5);p.distance=mode==='endless'?p.distance+p.speed*dt:Math.min(cfg.finish,p.distance+p.speed*dt);
  const next={x:p.x,y:p.y,z:p.distance};
  for(const item of track){
    if(item.z+item.r+50<old.z||item.z-item.r-50>next.z)continue;
    const d=segmentDistance(old,next,item),radius=item.r+13;
    if(item.type!=='rock'){
      if(d>radius+10||p.collected.includes(item.id))continue;
      p.collected.push(item.id);p.pickupCount++;p.lastPickup=item.type;p.score+=100;
      if(item.type==='shield')p.shield=Math.min(cfg.shields,p.shield+1);
      if(item.type==='nitro')p.boost=100;
      if(item.type==='reactor'){p.reactor=Math.min(3,p.reactor+1);p.boost=Math.min(100,p.boost+30);}
      if(item.type==='phase')p.phase=5;
    }else if(d<radius&&p.invincible===0&&p.phase===0){
      p.shield=mode==='chill'?cfg.shields:p.shield-1;p.hits++;p.speed*=.55;p.invincible=1.15;p.combo=0;
      if(p.shield<=0){p.dead=true;break;}
    }else if(d>=radius&&d<radius+28&&old.z<item.z&&next.z>=item.z&&!p.dodged.includes(item.id)){
      p.dodged.push(item.id);p.nearMisses++;p.combo=Math.min(9,p.combo+1);p.comboTimer=4;p.score+=50*p.combo;p.boost=Math.min(100,p.boost+7);
    }
  }
  if(mode!=='endless'&&p.distance>=cfg.finish&&!p.dead)p.finished=true;
}
export function race(seed,pilots,mode='sprint') {
  if(!Object.hasOwn(MODES,mode))mode='sprint';
  return {seed,mode,finish:modeConfig(mode).finish,track:course(seed,mode),players:pilots.map((p,i)=>({...player(p.id,p.name,p.color,mode),x:pilots.length>1?255+i*130:320})),elapsed:0,state:'countdown',countdown:3,winner:null,reason:''};
}
export function stepRace(r,inputs,dt) {
  if(r.state==='finished')return;
  if(r.state==='countdown'){r.countdown-=dt;if(r.countdown<=0)r.state='racing';return;}
  r.elapsed+=dt;
  syncCourse(r);
  for(const p of r.players)stepPlayer(p,inputs[p.id]||{},dt,r.track,r.mode);
  if(r.mode==='endless'){
    const alive=r.players.filter(p=>!p.dead);
    if(!alive.length||(r.players.length>1&&alive.length===1)){r.state='finished';r.winner=alive[0]?.id||null;r.reason='survived';}return;
  }
  const finishers=r.players.filter(p=>p.finished);
  if(finishers.length||r.players.every(p=>p.dead)||r.elapsed>180){r.state='finished';r.winner=finishers.length===1?finishers[0].id:null;r.reason=finishers.length>1?'draw':finishers.length?'finish':'crashed';}
}
