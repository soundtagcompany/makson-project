// Geometry lives in unzoomed CSS pixels; pointer coordinates are converted once.
export function attachFloatingPanel(win){
 let rect=null,gesture=null,manual=false;
 const zoom=()=>Number(document.body.style.zoom)||1;
 const bounds=()=>({width:innerWidth/zoom(),height:(window.visualViewport?.height||innerHeight)/zoom(),top:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'))||42});
 function fit(){
  if(win.ownerDocument!==document)return;
  const b=bounds();
  const height=win.dataset.accountState==='guest'?(win.dataset.authMode==='login'?430:540):500;
  if(!rect||!manual)rect={x:b.width-380-8,y:b.top+8,w:380,h:height};
  rect.w=Math.max(Math.min(280/zoom(),b.width-16),Math.min(rect.w,b.width-16));rect.h=Math.max(Math.min(240/zoom(),b.height-b.top-16),Math.min(rect.h,b.height-b.top-16));
  rect.x=Math.max(8,Math.min(rect.x,b.width-rect.w-8));rect.y=Math.max(b.top+8,Math.min(rect.y,b.height-rect.h-8));
  for(const [name,value]of Object.entries(rect))win.style.setProperty('--panel-'+name,value+'px');
 }
 function begin(e,edge){
  if(e.button!==0||win.ownerDocument!==document||document.fullscreenElement===win||win.classList.contains('fullscreen-fallback'))return;
  if(!edge&&e.target.closest('button,input,select'))return;
  fit();manual=true;gesture={edge,x:e.clientX,y:e.clientY,...rect};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();win.classList.add('panel-dragging');
 }
 function move(e){
  if(!gesture)return;
  const g=gesture,dx=(e.clientX-g.x)/zoom(),dy=(e.clientY-g.y)/zoom(),b=bounds();
  if(!g.edge){rect.x=g.x0+dx;rect.y=g.y0+dy;}
  else{
   if(g.edge.includes('e'))rect.w=Math.max(280/zoom(),Math.min(g.w+dx,b.width-g.x0-8));
   if(g.edge.includes('s'))rect.h=Math.max(240/zoom(),Math.min(g.h+dy,b.height-g.y0-8));
   if(g.edge.includes('w')){rect.x=Math.max(8,Math.min(g.x0+dx,g.x0+g.w-280/zoom()));rect.w=g.x0+g.w-rect.x;}
   if(g.edge.includes('n')){rect.y=Math.max(b.top+8,Math.min(g.y0+dy,g.y0+g.h-240/zoom()));rect.h=g.y0+g.h-rect.y;}
  }
  fit();
 }
 // Keep pointer origins separate from the saved window coordinates.
 const start=(e,edge)=>{begin(e,edge);if(gesture){gesture.x=e.clientX;gesture.y=e.clientY;gesture.x0=rect.x;gesture.y0=rect.y;}};
 const stop=()=>{gesture=null;win.classList.remove('panel-dragging');};
 const title=win.querySelector('.titlebar');title.addEventListener('pointerdown',e=>start(e,''));
 for(const edge of ['n','ne','e','se','s','sw','w','nw']){const handle=document.createElement('div');handle.className='console-resize resize-'+edge;handle.dataset.edge=edge;handle.setAttribute('aria-hidden','true');handle.addEventListener('pointerdown',e=>start(e,edge));win.append(handle);}
 win.addEventListener('pointermove',move);for(const name of ['pointerup','pointercancel','lostpointercapture'])win.addEventListener(name,stop);
 title.tabIndex=0;title.setAttribute('aria-label','Переместить СВЯЗЬ: Alt и стрелки. Изменить размер: Alt Shift и стрелки.');
 title.addEventListener('keydown',e=>{if(!e.altKey||!e.key.startsWith('Arrow'))return;e.preventDefault();e.stopPropagation();fit();manual=true;const dx=e.key==='ArrowLeft'?-16:e.key==='ArrowRight'?16:0,dy=e.key==='ArrowUp'?-16:e.key==='ArrowDown'?16:0;if(e.shiftKey){rect.w+=dx;rect.h+=dy;}else{rect.x+=dx;rect.y+=dy;}fit();});
 const mode=()=>{win.dataset.wide=String(win.getBoundingClientRect().width>=620);};new ResizeObserver(mode).observe(win);
 addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('svyazlayout',fit);document.addEventListener('windowfocus',e=>{if(e.detail==='svyaz')fit();});fit();
}
