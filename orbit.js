import {settings} from './app.js';
// A small 2D buffer with one glow composite; no WebGL or readback. Motion sleeps when the scene is covered.
const stage=document.getElementById('sphere-stage'),canvas=document.getElementById('sphere-canvas'),ctx=canvas.getContext('2d',{alpha:false});
const sceneVisible=()=>!document.hidden&&!stage.hidden&&!document.body.classList.contains('game-fullscreen-on')&&!document.documentElement.classList.contains('console-scaling')&&!['waiting','folding'].includes(document.body.dataset.bootPhase);
const grid=document.createElement('canvas'),lines=grid.getContext('2d');
// Keep a distant numerical guard, without capping a normal fast gesture at 4.1 rev/s.
const TAU=Math.PI*2,MAX_SPIN=TAU*60;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
// Effects follow angular speed, never a timer or accumulated revolutions.
// The short response time only softens the visual change when speed changes.
export function sphereStressStep(current,speed,coherence,dt){
 const turns=speed/TAU,steady=smooth((coherence-.55)/.4);
 const target=10*smooth((turns-.75)/6.75)*steady;
 const response=1-Math.exp(-clamp(dt,0,.1)/.18);
 const next=current+(target-current)*response;
 return next<.001?0:clamp(next,0,10);
}
// Each travelled arc contributes torque. Repeating the same gesture adds to
// existing momentum instead of replacing it with the hand's instantaneous speed.
export function sphereSpinImpulse(arc,elapsed){
 const step=clamp(arc,-.35,.35),rate=Math.abs(step)/Math.max(.001,elapsed);
 return step*.33*(.75+.5*smooth(rate/(TAU*2)));
}
const speedHud=document.createElement('output');speedHud.id='sphere-speed';speedHud.hidden=true;speedHud.textContent='0.0 об/с';speedHud.setAttribute('aria-label','Скорость вращения сферы');speedHud.setAttribute('aria-live','off');stage.append(speedHud);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>settings.motion&&!reducedMotion.matches;
reducedMotion.addEventListener('change',()=>{tween=null;if(!motion())resetSpin();wake();});
const nodes=[...stage.querySelectorAll('[data-sphere-app]')].map((el,i,all)=>{const y=1-2*(i+.5)/all.length,a=i*2.39996323+.7,r=Math.sqrt(1-y*y);return {el,p:[Math.cos(a)*r,y,Math.sin(a)*r]};});
const curves=[];
for(let m=0;m<6;m++){const a=m*Math.PI/6,points=[];for(let i=0;i<=48;i++){const t=i/48*TAU;points.push([Math.cos(t)*Math.cos(a),Math.sin(t),Math.cos(t)*Math.sin(a)]);}curves.push(points);}
for(const y of [-.65,0,.65]){const r=Math.sqrt(1-y*y),points=[];for(let i=0;i<=48;i++){const t=i/48*TAU;points.push([Math.cos(t)*r,y,Math.sin(t)*r]);}curves.push(points);}
const stars=Array.from({length:110},(_,i)=>({x:((i*7919+1349)%10007)/10007,y:((i*3541+703)%9973)/9973,bright:i%7===0}));
let intro=null,velocity=0,velocityPitch=0,velocityRoll=0,activity=performance.now(),energy=0,energySent=-1,stress=0,travelX=0,travelY=0,travelRoll=0,travelTotal=0,lastImpulse=-Infinity,speedAt=-Infinity,spinStarted=false,starBoost=0,flightStars=false,sky=null,skyCtx=null;
const touchScene=()=>{activity=performance.now();wake();};
let w=1,h=1,cssW=1,cssH=1,yaw=.25,pitch=-.16,roll=0,rollCos=1,rollSin=0,selected='',frame=0,tween=null,drag=null,suppressClick=false,lastTick=0,starTime=0,hovered=false,offsetX=0,offsetY=0,targetX=0,targetY=0;
const project=(p,cy,sy,cp,sp)=>{const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cp-z*sp,depth=p[1]*sp+z*cp,k=3.6/(3.6-depth),r=Math.min(w*.34,h*.34);return {x:w/2+(x*rollCos+y*rollSin)*r*k,y:h/2-(-x*rollSin+y*rollCos)*r*k,z:depth};};
function draw(dt=1/60,now=performance.now()){
 const progress=intro?Math.min(1,Math.max(0,(now-intro.start)/intro.duration)):1;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
 ctx.globalAlpha=smooth(progress/.35);
 if(!flightStars)for(const star of stars){ctx.fillStyle=star.bright?'#b0a2ce':'#554268';ctx.fillRect(Math.floor(((star.x+starTime*(star.bright?.007:.003)+offsetX*(star.bright?.025:.01)+1)%1)*w),Math.floor(((star.y+starTime*.002+offsetY*(star.bright?.025:.01)+1)%1)*h),1+Math.floor(starBoost*9),1);}
 if(flightStars)drawSky();
 ctx.globalAlpha=1;lines.clearRect(0,0,w,h);
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);rollCos=Math.cos(roll);rollSin=Math.sin(roll);
 // Draw the silhouette first, then let a bright leading edge trace each wire.
 if(intro&&progress<1){
  const r=Math.min(w*.34,h*.34)*3.6/Math.sqrt(3.6*3.6-1),trace=smooth(progress/.6);
  lines.strokeStyle='#bd72f5';lines.globalAlpha=1-smooth((progress-.7)/.3);lines.lineWidth=1;lines.beginPath();lines.arc(w/2,h/2,r,-Math.PI/2,-Math.PI/2+TAU*trace);lines.stroke();lines.globalAlpha=1;
 }
 for(const [index,curve] of curves.entries()){
  const reveal=intro?smooth((progress-.16-index*.025)/.6):1,points=curve.map(p=>project(p,cy,sy,cp,sp)),end=reveal*(points.length-1);
  if(end<=0)continue;
  for(const front of [false,true]){
   lines.strokeStyle=front?'#ac53e8':'#3c1e59';lines.lineWidth=1;lines.beginPath();
   for(let i=1;i<points.length&&i-1<end;i++){
    const a=points[i-1],b=points[i],part=Math.min(1,end-(i-1));if((a.z+b.z>=0)!==front)continue;
    lines.moveTo(a.x,a.y);lines.lineTo(a.x+(b.x-a.x)*part,a.y+(b.y-a.y)*part);
   }
   lines.stroke();
  }
 }

 // One low-resolution glow composite, followed by the sharp pixel grid.
 ctx.save();ctx.shadowColor='#b64cff';ctx.shadowBlur=6;ctx.globalAlpha=.85;ctx.drawImage(grid,0,0);ctx.restore();ctx.drawImage(grid,0,0);
 for(const node of nodes){const p=project(node.p,cy,sy,cp,sp),chosen=node.el.dataset.sphereApp===selected;
  const x=p.x/w*cssW,y=p.y/h*cssH,target=chosen?1.65:.65+(p.z+1)*.14;node.scale=motion()?(node.scale??target)+(target-(node.scale??target))*(1-Math.exp(-dt/0.16)):target;const scale=node.scale;
  node.el.style.transform=`translate(${x.toFixed(2)}px,${y.toFixed(2)}px) translate(-50%,-50%) scale(${scale})`;
  const opacity=((chosen?1:.45+(p.z+1)*.23)*(intro?smooth((progress-.55-nodes.indexOf(node)*.02)/.24):1)).toFixed(2),layer=chosen?'90':String(10+Math.round((p.z+1)*20));if(node.opacity!==opacity){node.el.style.opacity=opacity;node.opacity=opacity;}if(node.layer!==layer){node.el.style.zIndex=layer;node.layer=layer;}if(node.chosen!==chosen){node.el.classList.toggle('node-selected',chosen);node.chosen=chosen;}
 }
}
function sendStress(){
 if(Math.abs(stress-energySent)>.025||(stress===0&&energySent!==0)){energySent=stress;document.dispatchEvent(new CustomEvent('sphere-energy',{detail:stress}));}
}
function showSpeed(now,force=false){
 if(!force&&now-speedAt<200)return;speedAt=now;
 const turns=motion()?energy/TAU:0,label=turns.toFixed(1)+' об/с';
 speedHud.hidden=!spinStarted||turns<.05;
 if(speedHud.textContent!==label)speedHud.textContent=label;speedHud.dataset.speed=turns.toFixed(3);
}
function resetSpin(){
 spinStarted=false;
 velocity=velocityPitch=velocityRoll=energy=stress=travelX=travelY=travelRoll=travelTotal=starBoost=0;lastImpulse=-Infinity;
 sendStress();showSpeed(performance.now(),true);
}
function limitSpin(){const speed=Math.hypot(velocity,velocityPitch,velocityRoll);if(speed>MAX_SPIN){velocity*=MAX_SPIN/speed;velocityPitch*=MAX_SPIN/speed;velocityRoll*=MAX_SPIN/speed;}}
function tick(now){
 frame=0;if(!sceneVisible()){lastTick=0;return;}
 if(lastTick&&now-lastTick<32&&!drag&&!tween&&!intro&&Math.hypot(velocity,velocityPitch,velocityRoll)<.1){wake();return;}
 const dt=lastTick?Math.min(.05,(now-lastTick)/1000):0;lastTick=now;
 let turnX=0,turnY=0,turnRoll=0;
 if(tween){const t=Math.min(1,(now-tween.start)/880),ease=t*t*t*(10+t*(-15+6*t));yaw=tween.yaw+(tween.toYaw-tween.yaw)*ease;pitch=tween.pitch+(tween.toPitch-tween.pitch)*ease;if(t===1)tween=null;}
 else if(motion()){
  const dx=velocity*dt,dy=velocityPitch*dt,dr=velocityRoll*dt;
  yaw+=dx;pitch+=dy;roll+=dr;turnX=dx;turnY=dy;turnRoll=dr;
  // Pausing a held grab brakes the flywheel. A moving hand keeps adding torque;
  // releasing leaves the accumulated momentum to coast with only light friction.
  const held=drag&&now-drag.time>250,driven=now-lastImpulse<250;
  const friction=held?3:(Math.hypot(velocity,velocityPitch,velocityRoll)>3||driven?.03:.7);
  const decay=Math.exp(-dt*friction);velocity*=decay;velocityPitch*=decay;velocityRoll*=decay;
  if(!driven&&!drag&&Math.hypot(velocity,velocityPitch,velocityRoll)<.015)velocity=velocityPitch=velocityRoll=0;
  if(!drag&&!hovered&&!selected&&now-activity<12000)yaw+=dt*.075*Math.max(0,1-(now-activity)/12000);
 }
 energy=motion()?Math.hypot(velocity,velocityPitch,velocityRoll):0;
 if(motion()){
  // A brief directional window rejects shaking without requiring a long spin.
  const forget=Math.exp(-dt/.18);travelX=travelX*forget+turnX;travelY=travelY*forget+turnY;travelRoll=travelRoll*forget+turnRoll;travelTotal=travelTotal*forget+Math.hypot(turnX,turnY,turnRoll);
  const coherence=travelTotal>.0001?clamp(Math.hypot(travelX,travelY,travelRoll)/travelTotal,0,1):0;
  stress=sphereStressStep(stress,energy,coherence,dt);
 }else if(energy||stress)resetSpin();
 starBoost=smooth(stress/10);sendStress();showSpeed(now);
 if(motion()){const ease=1-Math.exp(-dt*5);offsetX+=(targetX-offsetX)*ease;offsetY+=(targetY-offsetY)*ease;starTime+=dt*(1+starBoost*110);}else{offsetX=offsetY=targetX=targetY=0;}
 draw(dt,now);if(intro&&now-intro.start>=intro.duration)intro=null;
 if(tween||intro||motion()&&(drag||velocity||velocityPitch||velocityRoll||stress>0||now-activity<12000))wake();
}
function wake(){if(!frame&&sceneVisible())frame=requestAnimationFrame(tick);}
function select(id){activity=performance.now();resetSpin();selected=id;if(!id){tween=null;wake();return;}const n=nodes.find(n=>n.el.dataset.sphereApp===id);if(!n)return;const [x,y,z]=n.p,target=Math.atan2(-x,z),delta=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));tween={start:performance.now(),yaw,pitch,toYaw:yaw+delta,toPitch:Math.asin(y)};if(!motion()){yaw=tween.toYaw;pitch=tween.toPitch;tween=null;}wake();}
function resize(){const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;cssW=stage.clientWidth;cssH=stage.clientHeight;const scale=Math.min(.5,480/cssW,360/cssH);w=Math.max(1,Math.round(cssW*scale));h=Math.max(1,Math.round(cssH*scale));if(canvas.width!==w||canvas.height!==h){canvas.width=grid.width=w;canvas.height=grid.height=h;}wake();}
new ResizeObserver(resize).observe(stage);
document.addEventListener('console-scene-intro',e=>{if(!motion())return;intro={start:performance.now(),duration:Math.max(300,e.detail?.duration||1080)};wake();});
document.addEventListener('appselect',e=>select(e.detail));
for(const name of ['windowfocus','windowhide','visibilitychange','settingschange','desktopfullscreenchange','console-scale-change','console-boot-change'])document.addEventListener(name,()=>{
 if(!sceneVisible()){cancelAnimationFrame(frame);frame=0;lastTick=0;drag=null;resetSpin();}else{if(!motion())resetSpin();wake();}
});
stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,mode:null,time:performance.now()};tween=null;activity=performance.now();suppressClick=false;});
stage.addEventListener('pointermove',e=>{
 if(e.pointerType==='mouse'&&!drag&&motion()){const r=stage.getBoundingClientRect();targetX=clamp((e.clientX-r.left)/r.width*2-1,-1,1);targetY=clamp((e.clientY-r.top)/r.height*2-1,-1,1);}
 if(!drag||e.pointerId!==drag.id)return;
 if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){if(!drag.moved)document.dispatchEvent(new CustomEvent('sphere-deselect'));drag.moved=true;try{stage.setPointerCapture(e.pointerId);}catch{}}
 if(drag.moved){
  spinStarted=true;
  const now=performance.now(),elapsed=Math.max(.001,(now-drag.time)/1000),rect=stage.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,ax=drag.x-cx,ay=drag.y-cy,bx=e.clientX-cx,by=e.clientY-cy;
  const before=Math.hypot(ax,ay),after=Math.hypot(bx,by),radius=Math.min(rect.width,rect.height)*.34;
  const angle=before>radius*.22&&after>radius*.22?Math.atan2(ax*by-ay*bx,ax*bx+ay*by):0;
  if(!drag.mode){
   // A tangential movement grabs the sphere's rim. Straight swipes keep orbit control.
   drag.mode=Math.abs(angle)*(before+after)/2>Math.abs(after-before)*1.25?'roll':'orbit';
  }
  if(drag.mode==='roll'){
   velocityRoll+=sphereSpinImpulse(angle,elapsed);
  }else{
   const dx=(e.clientX-drag.x)*.009,dy=(e.clientY-drag.y)*.009,length=Math.hypot(dx,dy);
   const gain=length?sphereSpinImpulse(length,elapsed)/length:0;
   velocity+=dx*gain;velocityPitch+=dy*gain;
  }
  lastImpulse=now;
  limitSpin();drag.time=now;activity=now;wake();
 }
 drag.x=e.clientX;drag.y=e.clientY;
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,e=>{
 if(!drag||e.pointerId!==drag.id)return;
 suppressClick=drag.moved;
 // Releasing never replaces or discards the momentum gained by earlier turns.
 drag=null;wake();
});
stage.addEventListener('click',e=>{if(suppressClick){e.stopImmediatePropagation();e.preventDefault();suppressClick=false;}},true);
stage.addEventListener('pointerover',e=>{hovered=!!e.target.closest('[data-sphere-app]');});
stage.addEventListener('pointerleave',()=>{hovered=false;targetX=targetY=0;});
stage.addEventListener('wheel',e=>{
 if(!motion()||e.ctrlKey)return;e.preventDefault();tween=null;selected='';document.dispatchEvent(new CustomEvent('sphere-deselect'));
 const delta=(e.deltaY||e.deltaX)*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);
 if(delta)spinStarted=true;
 velocity+=clamp(delta*.003,-.6,.6);if(delta)lastImpulse=performance.now();limitSpin();touchScene();
},{passive:false});
document.addEventListener('sphere-reset',()=>{resetSpin();touchScene();});
stage.addEventListener('pointerenter',touchScene);
resize();

// One temporary low-resolution overlay covers the viewport while the panels fly away.
function sizeSky(){
 if(!sky)return;const z=Number(document.body.style.zoom)||1;
 sky.style.width=innerWidth/z+'px';sky.style.height=innerHeight/z+'px';
 const scale=Math.min(.5,640/innerWidth,480/innerHeight);sky.width=Math.round(innerWidth*scale);sky.height=Math.round(innerHeight*scale);
}
function drawSky(){
 if(!skyCtx)return;const sw=sky.width,sh=sky.height;skyCtx.clearRect(0,0,sw,sh);
 for(const star of stars){skyCtx.fillStyle=star.bright?'#b0a2ce':'#554268';skyCtx.fillRect(Math.floor(((star.x+starTime*(star.bright?.007:.003)+1)%1)*sw),Math.floor(((star.y+starTime*.002+1)%1)*sh),1+Math.floor(starBoost*9),1);}
}
document.addEventListener('sphere-flight-change',e=>{
 flightStars=!!e.detail;if(flightStars&&!sky){sky=document.createElement('canvas');sky.id='sphere-flight-stars';sky.setAttribute('aria-hidden','true');sky.style.cssText='position:fixed;left:0;top:0;z-index:7000;pointer-events:none;image-rendering:pixelated';document.body.append(sky);skyCtx=sky.getContext('2d');}
 if(sky){sky.hidden=!flightStars;if(flightStars){sizeSky();drawSky();}else skyCtx.clearRect(0,0,sky.width,sky.height);}wake();
});
addEventListener('resize',()=>{if(flightStars){sizeSky();wake();}});
