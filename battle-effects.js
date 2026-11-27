import {windowFrame,cancelWindowFrame} from './picture-in-picture.js';

// The backing surface is intentionally small. Every mark is an integer pixel;
// the browser enlarges it with nearest-neighbour sampling, including native PiP.
export class BattleEffects{
 constructor(win,canvas,settings){
  this.win=win;this.canvas=canvas;this.ctx=canvas.getContext('2d');this.settings=settings;
  this.items=[];this.frame=0;this.shake=null;this.sprites={};
  for(const type of ['fire','smoke']){
   const sprite=canvas.ownerDocument.createElement('canvas');sprite.width=sprite.height=16;
   const g=sprite.getContext('2d');
   const palette=type==='fire'?['#fff7bd','#ffdc65','#ff9b32','#e74d24','#872b25']:['#69646a','#504c58','#393845','#282c38','#202632'];
   for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const dx=x-7.5,dy=y-7.5,r=Math.sqrt(dx*dx+dy*dy),edge=6.8+((x*13+y*7)%5-2)*.35;
    if(r>edge)continue;
    g.fillStyle=palette[Math.min(4,Math.floor(r/1.5))];g.fillRect(x,y,1,1);
   }
   this.sprites[type]=sprite;
  }
  canvas.style.imageRendering='pixelated';
 }
 visible(){return !this.win.hidden&&!this.win.classList.contains('inactive')&&!this.win.ownerDocument.hidden;}
 publish(){if(this.win.classList.contains('matrix-tool-window'))this.canvas.dispatchEvent(new Event('makson-naval-fx-frame'));}
 motion(){return this.settings().motion&&!this.win.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;}
 clear(){this.items=[];cancelWindowFrame(this.frame);this.frame=0;this.shake?.cancel();this.shake=null;this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.publish();}
 add(p){this.items.push({...p,age:0});if(this.items.length>160)this.items.splice(0,this.items.length-160);this.wake();}
 wake(){if(!this.frame){this.last=performance.now();this.frame=windowFrame(this.canvas,t=>this.draw(t));}}
 point(element){
  const r=element.getBoundingClientRect(),c=this.canvas.getBoundingClientRect();
  return {x:(r.left+r.width/2-c.left)*this.canvas.clientWidth/(c.width||1),y:(r.top+r.height/2-c.top)*this.canvas.clientHeight/(c.height||1),element};
 }
 recoil(power){
  if(!this.motion())return;this.shake?.cancel();
  const frames=[[0,0],[-1,.35],[.8,-.6],[-.55,.4],[.3,-.2],[-.12,.08],[0,0]].map(([x,y])=>({translate:`${x*power}px ${y*power}px`}));
  // Add to opening/minimizing translations instead of overriding the window transform.
  const animation=this.win.animate(frames,{duration:power>4?390:270,easing:'ease-out',composite:'add'});this.shake=animation;
  animation.finished.then(()=>{if(this.shake===animation)this.shake=null;}).catch(()=>{});
 }
 impact(point,kind='hit'){
  if(!this.visible()||!this.motion())return;
  const big=kind==='sunk',hit=kind!=='miss';
  const emit=p=>this.add({...p,anchor:point.element,originX:point.x,originY:point.y});
  this.recoil(big?7:hit?4:1);
  if(hit){
   emit({type:'flash',x:0,y:0,size:big?54:32,life:.15});
   emit({type:'fire',x:0,y:0,size:big?70:42,growth:18,life:big?.65:.48});
   for(let i=0;i<(big?6:3);i++){
    const a=i*2.4,r=big?14:7;
    emit({type:'fire',x:Math.cos(a)*r,y:Math.sin(a)*r,size:18+i*3,life:.35+i*.04,delay:i*.025,vx:Math.cos(a)*12,vy:-10});
    emit({type:'smoke',x:Math.cos(a)*r,y:Math.sin(a)*r,size:23+i*3,growth:18,life:.85+i*.07,delay:.14+i*.035,vx:Math.cos(a)*6,vy:-17});
   }
  }
  for(let i=0;i<(big?18:hit?10:9);i++){
   const a=i*2.39996,s=28+Math.random()*(big?80:hit?55:34);
   emit({type:hit?'spark':'water',x:0,y:0,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(hit?22:42),size:hit?3:2,life:.4+Math.random()*.35,color:hit?(i%3?'#ffb24c':'#fff1a1'):'#8adff5'});
  }
  emit({type:'ring',x:0,y:0,size:5,growth:big?90:hit?65:38,life:big?.5:.38,color:hit?'#ffce72':'#83d9f3'});
 }
 launch(from,to){if(this.visible()&&this.motion())this.add({...from,type:'shell',target:to.element,tx:to.x,ty:to.y,life:.36});}
 sonar(point){if(this.visible()&&this.motion())this.add({type:'ring',x:0,y:0,anchor:point.element,originX:point.x,originY:point.y,size:3,growth:100,life:1.2,color:'#6bffe0'});}
 draw(now){
  this.frame=0;if(!this.visible()||!this.motion()){this.clear();return;}
  const dt=Math.max(0,Math.min(.05,(now-this.last)/1000));this.last=now;
  const c=this.canvas,w=Math.max(1,c.clientWidth),h=Math.max(1,c.clientHeight),bw=Math.ceil(w/2),bh=Math.ceil(h/2);
  if(c.width!==bw||c.height!==bh){c.width=bw;c.height=bh;}
  const g=this.ctx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,bw,bh);g.imageSmoothingEnabled=false;
  const r=c.getBoundingClientRect();if(!r.width||!r.height){this.clear();return;}
  const sx=bw/r.width,sy=bh/r.height,localX=bw/w,localY=bh/h,anchors=new Map();
  const locate=el=>{
   if(!anchors.has(el)){const a=el.getBoundingClientRect();anchors.set(el,{x:(a.left+a.width/2-r.left)*sx,y:(a.top+a.height/2-r.top)*sy,unit:a.width*sx/32});}
   return anchors.get(el);
  };
  const block=(x,y,size=1)=>{const s=Math.max(1,Math.round(size));g.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s);};
  const line=(x0,y0,x1,y1,size=1)=>{
   x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
   const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),ax=x0<x1?1:-1,ay=y0<y1?1:-1;let error=dx+dy;
   for(let n=0;n<1200;n++){block(x0,y0,size);if(x0===x1&&y0===y1)break;const twice=2*error;if(twice>=dy){error+=dy;x0+=ax;}if(twice<=dx){error+=dx;y0+=ay;}}
  };
  g.save();const port=this.win.querySelector('.naval-content');
  if(port){const p=port.getBoundingClientRect();g.beginPath();g.rect(Math.ceil((p.left-r.left)*sx),Math.ceil((p.top-r.top)*sy),Math.floor(p.width*sx),Math.floor(p.height*sy));g.clip();}
  for(const p of this.items){
   p.age+=dt;const age=p.age-(p.delay||0);if(age<0||age>=p.life)continue;
   if(p.anchor&&!p.anchor.isConnected||p.target&&!p.target.isConnected)continue;
   const t=age/p.life,at=p.anchor?locate(p.anchor):null,unit=at?.unit||localX;
   p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;
   const x=at?at.x+p.x*unit:(p.x+(p.originX||0))*localX,y=at?at.y+p.y*unit:(p.y+(p.originY||0))*localY,size=Math.max(1,Math.round((p.size+(p.growth||0)*age)*unit));
   g.globalAlpha=Math.min(1,(1-t)*2);g.globalCompositeOperation='source-over';
   if(this.sprites[p.type]){
    g.globalAlpha=p.type==='smoke'?Math.sin(t*Math.PI)*.7:Math.min(1,(1-t)*3);
    g.drawImage(this.sprites[p.type],Math.round(x-size/2),Math.round(y-size/2),size,size);
   }else if(p.type==='flash'){
    g.fillStyle='#fff5bd';block(x,y,size*.55);g.fillStyle='#ffcd67';block(x-size*.4,y,Math.max(1,size*.2));block(x+size*.4,y,Math.max(1,size*.2));block(x,y-size*.4,Math.max(1,size*.2));block(x,y+size*.4,Math.max(1,size*.2));
   }else if(p.type==='ring'){
    g.fillStyle=p.color;g.globalAlpha=(1-t)*.7;
    for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;line(x+Math.cos(a)*size,y+Math.sin(a)*size*.65,x+Math.cos(b)*size,y+Math.sin(b)*size*.65);}
   }else if(p.type==='shell'){
    const target=p.target?locate(p.target):{x:p.tx*localX,y:p.ty*localY};
    const px=x+(target.x-x)*t,py=y+(target.y-y)*t-Math.sin(t*Math.PI)*25*localY;
    g.fillStyle='#cd8a48';line(px-(target.x-x)*.09,py-(target.y-y)*.09,px,py);g.fillStyle='#fff1a1';block(px,py,3*localX);
   }else{
    p.vy+=(p.type==='water'?140:100)*dt;g.fillStyle=p.color;line(x,y,x-p.vx*.035*unit,y-p.vy*.035*unit,size);
   }
  }
  g.restore();g.globalAlpha=1;
  this.publish();
  this.items=this.items.filter(p=>p.age<p.life+(p.delay||0));
  if(this.items.length)this.frame=windowFrame(c,t=>this.draw(t));
 }
}
