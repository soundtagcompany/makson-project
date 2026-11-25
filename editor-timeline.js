// One source, one bounded selection. Only thumbnail decoding creates background work.
const MIN_SPAN=.1,MAX_SPAN=600;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const time=value=>{const total=Math.max(0,finite(value)),minutes=Math.floor(total/60),seconds=(total%60).toFixed(1).padStart(4,'0');return minutes+':'+seconds;};

export function createTimeline({root,onTrim=()=>{},onSeek=()=>{}}){
 const doc=root.ownerDocument;
 root.classList.add('edit-timeline');root.dataset.nativeKeys='';
 root.innerHTML=`<div class="edit-timeline-ruler" aria-hidden="true"></div><div class="edit-timeline-track"><div class="edit-timeline-filmstrip" aria-hidden="true"></div><div class="edit-timeline-shade-before" aria-hidden="true"></div><div class="edit-timeline-shade-after" aria-hidden="true"></div><div class="edit-timeline-selection"><button type="button" class="edit-timeline-handle" data-edge="start" role="slider" aria-label="Начало фрагмента" aria-orientation="horizontal"><i aria-hidden="true"></i></button><button type="button" class="edit-timeline-handle" data-edge="end" role="slider" aria-label="Конец фрагмента" aria-orientation="horizontal"><i aria-hidden="true"></i></button></div><div class="edit-timeline-playhead" aria-hidden="true"></div></div><div class="edit-timeline-labels" aria-hidden="true"><span class="edit-timeline-start-label">0:00.0</span><span class="edit-timeline-end-label">0:00.0</span></div>`;
 const track=root.querySelector('.edit-timeline-track'),strip=root.querySelector('.edit-timeline-filmstrip'),ruler=root.querySelector('.edit-timeline-ruler');
 const handles=[...root.querySelectorAll('.edit-timeline-handle')],labels=[root.querySelector('.edit-timeline-start-label'),root.querySelector('.edit-timeline-end-label')];
 let duration=0,start=0,end=0,position=0,disabled=false,drag=null,preview=null,destroyed=false;
 const active=()=>!destroyed&&!disabled&&duration>=MIN_SPAN;
 function percent(value){return (duration?clamp(value/duration*100,0,100):0)+'%';}
 function bounds(edge){
  if(edge==='start')return {min:Math.max(0,end-MAX_SPAN),max:Math.max(0,end-MIN_SPAN)};
  return {min:Math.min(duration,start+MIN_SPAN),max:Math.min(duration,start+MAX_SPAN)};
 }
 function render(){
  root.style.setProperty('--trim-start',percent(start));root.style.setProperty('--trim-end',percent(end));root.style.setProperty('--playhead',percent(position));
  root.classList.toggle('is-disabled',!active());root.classList.toggle('has-source',duration>=MIN_SPAN);
  labels[0].textContent=time(start);labels[1].textContent=time(end);
  for(const handle of handles){const edge=handle.dataset.edge,b=duration>=MIN_SPAN?bounds(edge):{min:0,max:0},value=edge==='start'?start:end;
   handle.disabled=!active();handle.setAttribute('aria-disabled',String(!active()));handle.setAttribute('aria-valuemin',String(b.min));handle.setAttribute('aria-valuemax',String(b.max));handle.setAttribute('aria-valuenow',String(value));handle.setAttribute('aria-valuetext',time(value));
  }
 }
 function buildRuler(){
  ruler.replaceChildren();const count=4;
  for(let i=0;i<=count;i++){const tick=doc.createElement('span');tick.style.left=i/count*100+'%';tick.textContent=time(duration*i/count);ruler.append(tick);}
 }
 function setTrim(nextStart,nextEnd){
  if(duration<MIN_SPAN){start=0;end=duration;render();return;}
  start=clamp(finite(nextStart),0,duration-MIN_SPAN);
  end=clamp(finite(nextEnd,start+MIN_SPAN),start+MIN_SPAN,Math.min(duration,start+MAX_SPAN));render();
 }
 function setTime(value){position=clamp(finite(value),0,duration);root.style.setProperty('--playhead',percent(position));}
 function pointTime(event){const rect=track.getBoundingClientRect();return clamp((event.clientX-rect.left)/Math.max(1,rect.width)*duration,0,duration);}
 function changeEdge(edge,value){
  const b=bounds(edge),next=clamp(Math.round(value*1000)/1000,b.min,b.max);
  if(edge==='start'){if(next===start)return;start=next;}else{if(next===end)return;end=next;}
  render();onTrim(start,end,{edge});
 }
 function move(event){
  if(!drag||event.pointerId!==drag.id||!active())return;
  event.preventDefault();const value=pointTime(event);
  if(drag.edge)changeEdge(drag.edge,value+drag.offset);else{setTime(value);onSeek(value);}
 }
 function finish(event){
  if(!drag||event&&event.pointerId!==drag.id)return;
  const current=drag;drag=null;root.classList.remove('is-dragging');
  try{if(current.target.hasPointerCapture(current.id))current.target.releasePointerCapture(current.id);}catch{}
 }
 function down(event){
  if(!active()||event.button!==0||drag)return;
  const handle=event.target.closest('.edit-timeline-handle');
  const edge=handle?.dataset.edge||null,target=handle||track,value=pointTime(event);
  event.preventDefault();event.stopPropagation();
  drag={id:event.pointerId,target,edge,offset:edge?(edge==='start'?start:end)-value:0};
  root.classList.add('is-dragging');
  if(handle)handle.focus({preventScroll:true});else{setTime(value);onSeek(value);}
  try{target.setPointerCapture(event.pointerId);}catch{}
 }
 function key(event){
  const handle=event.target.closest('.edit-timeline-handle');if(!handle||!active())return;
  const edge=handle.dataset.edge,current=edge==='start'?start:end,step=event.shiftKey?1:.1,b=bounds(edge);
  let value;
  if(event.key==='ArrowLeft'||event.key==='ArrowDown')value=current-step;
  else if(event.key==='ArrowRight'||event.key==='ArrowUp')value=current+step;
  else if(event.key==='Home')value=b.min;
  else if(event.key==='End')value=b.max;
  else return;
  event.preventDefault();event.stopPropagation();changeEdge(edge,value);
 }
 track.addEventListener('pointerdown',down);
 track.addEventListener('pointermove',move);
 track.addEventListener('pointerup',finish);
 track.addEventListener('pointercancel',finish);
 track.addEventListener('lostpointercapture',finish);
 track.addEventListener('keydown',key);
 function releasePreview(current){
  if(!current||current.released)return;current.released=true;current.controller.abort();current.video.pause();current.video.removeAttribute('src');
  try{current.video.load();}catch{}
  URL.revokeObjectURL(current.url);if(preview===current)preview=null;
 }
 function waitFor(video,event,signal,timeout=3000){
  return new Promise((resolve,reject)=>{
   if(signal.aborted){reject(Error('Aborted'));return;}
   let timer;const cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,ready);video.removeEventListener('error',failed);signal.removeEventListener('abort',failed);};
   const ready=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('Preview unavailable'));};
   video.addEventListener(event,ready,{once:true});video.addEventListener('error',failed,{once:true});signal.addEventListener('abort',failed,{once:true});timer=setTimeout(failed,timeout);
  });
 }
 async function thumbnails(file){
  if(!file||destroyed)return;
  const video=doc.createElement('video'),url=URL.createObjectURL(file),controller=new AbortController(),current={video,url,controller};preview=current;
  video.muted=true;video.playsInline=true;video.preload='auto';
  try{
   const metadata=waitFor(video,'loadedmetadata',controller.signal);video.src=url;video.load();await metadata;
   if(!video.videoWidth||!video.videoHeight||!Number.isFinite(video.duration)||video.duration<=0)return;
   const count=clamp(Math.ceil(track.getBoundingClientRect().width/80),4,10),frames=[];
   for(let i=0;i<count;i++){const canvas=doc.createElement('canvas');canvas.width=96;canvas.height=54;canvas.style.width=100/count+'%';frames.push(canvas);}
   strip.replaceChildren(...frames);
   for(let i=0;i<count;i++){
    if(controller.signal.aborted||destroyed)break;
    const target=Math.min(video.duration-.001,video.duration*(i+.5)/count);
    if(Math.abs(video.currentTime-target)>.001){const seek=waitFor(video,'seeked',controller.signal,2500);video.currentTime=target;await seek;}
    if(controller.signal.aborted||destroyed)break;
    const canvas=frames[i],context=canvas.getContext('2d'),scale=Math.max(canvas.width/video.videoWidth,canvas.height/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;
    context.drawImage(video,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
   }
  }catch{/* Unsupported codecs keep a usable flat trim strip. */}
  finally{releasePreview(current);}
 }
 function setSource({duration:nextDuration,file,isVideo=false}={}){
  finish();releasePreview(preview);strip.replaceChildren();duration=Math.max(0,finite(nextDuration));start=0;end=Math.min(duration,MAX_SPAN);position=0;
  root.dataset.media=isVideo?'video':'audio';buildRuler();render();
  if(isVideo&&duration>=MIN_SPAN)void thumbnails(file);
 }
 function setDisabled(value){disabled=!!value;if(disabled)finish();render();}
 function destroy(){
  if(destroyed)return;destroyed=true;finish();releasePreview(preview);
  track.removeEventListener('pointerdown',down);track.removeEventListener('pointermove',move);track.removeEventListener('pointerup',finish);track.removeEventListener('pointercancel',finish);track.removeEventListener('lostpointercapture',finish);track.removeEventListener('keydown',key);
 }
 buildRuler();render();
 return {setSource,setTrim,setTime,setDisabled,destroy};
}
