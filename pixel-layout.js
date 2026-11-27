(() => {
const c=document.querySelector('#screen'),native=!!c.closest('[data-preview-native]'),nav=document.querySelector('#controls'),status=document.querySelector('#status');
let ctx=c.getContext('2d',{alpha:native});
const ink={bg:'#000000',star:'#6e508e',distant:'#242031',red:'#ff4b50',header:'#050303',rule:'#452025',catalog:'#020906',edge:'#203b27',green:'#96eeb3',mint:'#4bf89b',muted:'#72a285',front:'#ab52e7',back:'#46216a'};
const lists={root:[['Программы','folder','tools'],['Игры','folder','games']],
 tools:[['Монтажка','edit','editor'],['Конвертер','swap','convert'],['Загрузчик','down','download'],['Мемоинатор','photo','meme'],['Буфер','copy','buffer']],
 games:[['Гипноройдер','rocket','game'],['СДВГПОЛИЯ','board','importopoly'],['Пульс','pulse','pulse'],['Морская движуха','naval','naval']]};
const titles={root:['КАТАЛОГ','МЕНЮ'],tools:['ПРОГРАММЫ','СОФТ'],games:['ИГРЫ']};
const letters={
 'А':[14,17,17,31,17,17,17],'Б':[31,16,16,30,17,17,30],'В':[30,17,17,30,17,17,30],'Г':[31,16,16,16,16,16,16],
 'Д':[6,10,10,10,10,31,17,17],'Е':[31,16,16,30,16,16,31],'Ё':[10,0,31,16,30,16,16,31],'Ж':[21,21,21,14,21,21,21],'З':[30,1,1,14,1,1,30],
 'И':[17,19,21,21,25,17,17],'Й':[10,4,17,19,21,25,17,17],'К':[17,18,20,24,20,18,17],'Л':[7,9,9,9,9,9,17],
 'М':[17,27,21,21,17,17,17],'Н':[17,17,17,31,17,17,17],'О':[14,17,17,17,17,17,14],'П':[31,17,17,17,17,17,17],
 'Р':[30,17,17,30,16,16,16],'С':[15,16,16,16,16,16,15],'Т':[31,4,4,4,4,4,4],'У':[17,17,17,15,1,1,14],
 'Ф':[4,14,21,21,21,14,4],'Х':[17,17,10,4,10,17,17],'Ч':[17,17,17,15,1,1,1],'Ш':[21,21,21,21,21,21,31],
 'Ы':[17,17,17,29,21,21,29],'Ь':[16,16,16,30,17,17,30],'Я':[15,17,17,15,5,9,17],
 R:[30,17,17,30,20,18,17],'J':[7,2,2,2,18,18,12],'N':[17,25,25,21,19,19,17],'S':[15,16,16,14,1,1,30],
 '.':[0,0,0,0,0,12,12],' ':[]};
const alias={M:'М',A:'А',K:'К',O:'О',P:'Р',E:'Е',C:'С',T:'Т'};
const sprites={folder:[24,31,17,17,31],chat:[31,17,31,8,16],gear:[4,14,27,14,4],edit:[17,10,4,10,17],swap:[2,31,2,8,31,8],down:[4,21,21,31],photo:[31,17,21,27,31],copy:[15,9,29,21,31],rocket:[4,14,14,27,4],board:[31,21,31,21,31],pulse:[4,6,27,4],naval:[4,6,21,14]};
const settingsGear=[0b000110000,0b010110010,0b011111110,0b111000111,0b110000011,0b111000111,0b011111110,0b010110010,0b000110000];
function gearGlyph(x,y){
 settingsGear.forEach((row,j)=>{for(let i=0;i<9;i++)if(row&(256>>i))dot(x+i,y+j,ink.red)});
}
let W,H,n,folder='root',shown=true,page=0,cap=1,angle=0,tilt=.31,pointer=null,pending=0;
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x|0,y|0,w|0,h|0)}
function dot(x,y,color){rect(x,y,1,1,color)}
function stroke(a,b,x,y,col){a=Math.round(a);b=Math.round(b);x=Math.round(x);y=Math.round(y);let dx=Math.abs(x-a),dy=-Math.abs(y-b),sx=a<x?1:-1,sy=b<y?1:-1,e=dx+dy;while(true){dot(a,b,col);if(a===x&&b===y)break;const t=2*e;if(t>=dy){e+=dy;a+=sx}if(t<=dx){e+=dx;b+=sy}}}
function glyph(rows,x,y,col){rows.forEach((r,j)=>{for(let i=0;i<5;i++)if(r&(16>>i))dot(x+i,y+j,col)})}
function width(s){return [...s].reduce((w,k)=>w+(k===' '?3:k==='.'?3:6),0)}
function label(s,x,y,col){for(const k of s){glyph(letters[k]||letters[alias[k]]||[],x,y,col);x+=k===' '||k==='.'?3:6}}
function sphere(x,y,r){
 for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const q=(i*i+j*j)/(r*r);if(q<=1){const v=Math.round(10*(1-q));dot(x+i,y+j,`rgb(${8+v},${3+v/4|0},${22+v*2})`)}}
 const proj=(a,b)=>{const X=Math.cos(a+angle)*Math.sin(b),Y=Math.cos(b),Z=Math.sin(a+angle)*Math.sin(b);return [x+r*X,y-r*(Y*Math.cos(tilt)-Z*Math.sin(tilt)),Z*Math.cos(tilt)+Y*Math.sin(tilt)]};
 for(const face of [false,true])for(const axis of [0,1])for(let k=0;k<(axis?8:12);k++){
  let old=null;const v=axis?(k+1)*Math.PI/9:k*Math.PI/6;
  for(let t=0;t<=96;t++){const q=axis?proj(t*2*Math.PI/96,v):proj(v,t*Math.PI/96);if(old&&((old[2]+q[2]>0)===face))stroke(old[0],old[1],q[0],q[1],face?ink.front:ink.back);old=q}
 }
}
function edge(x,y,w,h,color){rect(x+1,y+1,w-2,h-2,color);rect(x+2,y,w-4,1,ink.edge);rect(x,y+2,1,h-4,ink.edge);rect(x+2,y+h-1,w-4,1,ink.edge);rect(x+w-1,y+2,1,h-4,ink.edge)}
function btn(key,name,x,y,w,h,cb){
 const node=document.createElement('button');node.dataset.key=key;node.textContent=name;node.type='button';
 Object.assign(node.style,{left:n*x+'px',top:n*y+'px',width:n*w+'px',height:n*h+'px'});
 node.onclick=()=>cb(node.matches(':focus-visible'));nav.append(node);
}
function focus(key){nav.querySelector('[data-key="'+key+'"]')?.focus({preventScroll:true})}
function setShown(next){shown=next;draw(true);if(native)document.dispatchEvent(new CustomEvent('makson-preview-visibility',{detail:shown}));}
function back(kbd){const old=folder;folder='root';page=0;draw(true);if(kbd)focus(old)}
function pick(name,key,kbd){
 if(key==='tools'||key==='games'){folder=key;page=0;draw(true);if(kbd)focus(lists[folder][0][2]);return}
 const notice=new CustomEvent('makson-preview-open',{cancelable:true,detail:{id:key,name,keyboard:kbd}});
 if(document.dispatchEvent(notice)){status.hidden=false;status.textContent=name+': подключается в рабочей версии.'}
}
nav.addEventListener('keydown',e=>{
 if(!shown||e.ctrlKey||e.metaKey||e.altKey)return;
 if((e.key==='Escape'||e.key==='ArrowLeft')&&folder!=='root'){e.preventDefault();back(true);return}
 if(e.key==='Escape'){e.preventDefault();setShown(false);focus('toggle');return}
 const list=lists[folder],i=list.findIndex(a=>a[2]===e.target.dataset.key);
 if(e.key==='ArrowRight'&&i>=0&&folder==='root'&&['tools','games'].includes(list[i][2])){e.preventDefault();pick(list[i][0],list[i][2],true);return}
 if(i<0||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
 e.preventDefault();const idx=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;
 if(Math.floor(idx/cap)!==page){page=Math.floor(idx/cap);draw(true)}focus(list[idx][2])
});
if(document.querySelector('#framebuffer-preview')){
 window.MaksonPreviewBitmap=Object.freeze({
  pitch:()=>innerWidth<490||(innerHeight<490&&matchMedia('(pointer:coarse)').matches)?3:4,
  width,compactWidth,
  drawDesktopHeader(target,pitch,cols,rows){
   const previous=[ctx,n,W];
   ctx=target;n=pitch;W=cols;
   try{drawHeader(rows);}finally{[ctx,n,W]=previous;}
  },
  drawCompact(target,text,color){
   const t=target.getContext('2d');t.fillStyle=color;
   let x=0;
   for(const k of text){
    if(k===' '){x+=2;continue;}
    const rows=tiny[k]||tiny[alias[k]]||'71202';
    [...rows].forEach((r,j)=>{for(let i=0;i<3;i++)if(Number(r)&(4>>i))t.fillRect(x+i,j,1,1)});
    x+=4;
   }
  },
  draw(target,text,color){
   const t=target.getContext('2d');
   let x=0;t.fillStyle=color;
   for(const k of text){
    const rows=letters[k]||letters[alias[k]]||[];
    rows.forEach((r,j)=>{for(let i=0;i<5;i++)if(r&(16>>i))t.fillRect(x+i,j,1,1)});
    x+=k===' '||k==='.'?3:6;
   }
  }
 });
}
const art=new Map();
if(native)for(const [key,source] of [
 ...[...document.querySelectorAll('[data-sphere-app]')].map(button=>[button.dataset.sphereApp,button.querySelector('svg')]),
 ['svyaz',document.querySelector('#chat-launcher svg')],
 ['settings',document.querySelector('#console-settings svg')],
]){
 if(!source)continue;
 function addImage() {
  const copy=source.cloneNode(true);const uses=[...copy.querySelectorAll('use')];
  for(const use of uses){const ref=use.getAttribute('href');if(ref?.startsWith('#')){const symbol=document.getElementById(ref.slice(1));if(symbol)use.replaceWith(...[...symbol.childNodes].map(n=>n.cloneNode(true)));}}
  copy.style.color=ink.green;copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  if(!copy.hasAttribute('viewBox'))copy.setAttribute('viewBox','0 0 24 24');
  const cssIcon=getComputedStyle(source.closest('button')||source).getPropertyValue('--pixel-sprite').trim();
  const svgIcon=cssIcon.match(/^url\(["']?(data:image\/svg\+xml[^"')]+)["']?\)$/)?.[1];
  const img=new Image();img.onload=()=>{
   const k=document.createElement('canvas');k.width=9;k.height=9;const x=k.getContext('2d');
   x.imageSmoothingEnabled=false;x.drawImage(img,0,0,svgIcon?8:9,svgIcon?8:9);const data=x.getImageData(0,0,9,9), pixels=[];
   for(let j=0;j<9;j++)for(let i=0;i<9;i++)if(data.data[(j*9+i)*4+3]>=65)pixels.push([i,j]);
   if(pixels.length){art.set(key,pixels);staticDirty=true;queue();}
  };img.src=svgIcon||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));
 }
 addImage();
}
function anchor(el){
 const r=el?.getBoundingClientRect();return r?{x:Math.round(r.x/n),y:Math.round(r.y/n),w:Math.round(r.width/n),h:Math.round(r.height/n)}:null;
}
function iconAt(key,x,y,color,fallback){
 const pixels=art.get(key);
 if(pixels?.length){for(const [i,j] of pixels)dot(x+i,y+j,color);}
 else if(fallback)glyph(sprites[fallback],x+2,y+2,color);
}
function drawHeader(top){
 rect(0,0,W,top,ink.header);rect(0,top-1,W,1,ink.rule);
 const gear=document.querySelector('#console-settings'),chat=document.querySelector('#chat-launcher');
 const g=anchor(gear),a=anchor(chat);
 const signin=document.querySelector('#svyaz-signin-hint'),hint=anchor(signin);
 const hintVisible=hint&&hint.w>=3&&hint.h>=3&&getComputedStyle(signin).visibility!=='hidden';
 const titleSpace=[g?g.x+g.w+1:3,hintVisible?hint.x-1:a?a.x-2:W-3];
 const mid=W/2,full='MAKSON PROJECT';
 const room=2*Math.min(mid-titleSpace[0],titleSpace[1]-mid);
 function centered(text,y){label(text,Math.round((W-width(text)+1)/2),y,ink.red);}
 if(width(full)<=room)centered(full,Math.max(1,Math.floor((top-7)/2)));
 else if(compactWidth(full)<=room||top<17)compact(full,Math.round((W-compactWidth(full)+1)/2),Math.max(1,Math.floor((top-5)/2)),ink.red);
 else {centered('MAKSON',Math.floor((top-15)/2));centered('PROJECT',Math.floor((top-15)/2)+8);}
 if(g){
  const hot=gear.getAttribute('aria-expanded')==='true'||gear.matches(':hover,:focus-visible');
  const gw=Math.min(g.w-2,14),gh=Math.min(g.h-2,13),gx=g.x+Math.floor((g.w-gw)/2),gy=g.y+Math.floor((g.h-gh)/2);
  if(gw>=9&&gh>=9){
   rect(gx,gy,gw,gh,hot?'#2b151a':'#12080b');
   rect(gx,gy,gw,1,hot?'#e87a80':'#602d35');
   rect(gx,gy+gh-1,gw,1,hot?'#b84b54':'#351a21');
   if(hot){rect(gx,gy,1,gh,'#b84b54');rect(gx+gw-1,gy,1,gh,'#b84b54');}
  }
  gearGlyph(g.x+Math.floor((g.w-9)/2),g.y+Math.floor((g.h-9)/2));
 }
 if(a){
  rect(a.x+1,a.y+1,a.w-2,a.h-2,chat.matches(':focus-visible')?'#482225':chat.getAttribute('aria-expanded')==='true'||chat.matches(':hover')?'#311317':'#190b0e');
  const text=compactWidth('СВЯЗЬ'),fullChat=a.w>=text+11,ix=fullChat?a.x+1:a.x+Math.round((a.w-9)/2);
  iconAt('svyaz',ix,a.y+Math.round((a.h-9)/2),ink.red,'chat');
  if(a.w>=width('СВЯЗЬ')+13)label('СВЯЗЬ',ix+10,a.y+Math.floor((a.h-7)/2),ink.red);
  else if(fullChat)compact('СВЯЗЬ',ix+9,a.y+Math.floor((a.h-5)/2),ink.red);
  const unread=chat.querySelector('b')?.textContent.trim();
  if(unread||chat.classList.contains('sv-call-active'))rect(a.x+a.w-4,a.y+2,2,2,chat.classList.contains('sv-call-active')?ink.mint:'#ff9296');
 }
 if(hintVisible){
  const len=compactWidth('ВОЙТИ'),right=hint.x+hint.w,cy=hint.y+Math.floor(hint.h/2);
  if(hint.w>=len+3)compact('ВОЙТИ',hint.x+1,cy-2,'#e58b8e');
  else {stroke(right-4,cy-2,right-2,cy,'#e58b8e');stroke(right-2,cy,right-4,cy+2,'#e58b8e');}
  if(signin.matches(':focus-visible'))edge(hint.x,hint.y,hint.w,hint.h,'#432025');
 }
}
const tiny={
 'А':'25755','Б':'74656','В':'65656','Г':'74444','Д':'25577','Е':'74647','Ё':'50767','Ж':'55755','З':'71617',
 'И':'55575','Й':'20575','К':'55655','Л':'35555','М':'57555','Н':'55755','О':'25552','П':'75555','Р':'65644',
 'С':'34443','Т':'72222','У':'55316','Ф':'27772','Х':'55255','Ц':'55571','Ч':'55311','Ш':'55557','Щ':'55571','Ы':'55755',
 'Ь':'44656','Э':'61216','Ю':'55755','Я':'35355',R:'65655',J:'31152',N:'57755',S:'34216','.':'00002','0':'75557','1':'26227','2':'71247','3':'71217','4':'55711','5':'74617','6':'74657','7':'71244','8':'75757','9':'75717','/':'11244'
};
function compactWidth(text){return [...text].reduce((x,k)=>x+(k===' '?2:4),0)}
function compact(text,x,y,col){
 for(const k of text){
  if(k===' '){x+=2;continue;}
  const rows=tiny[k]||tiny[alias[k]]||'71202';
  [...rows].forEach((r,j)=>{for(let i=0;i<3;i++)if(Number(r)&(4>>i))dot(x+i,y+j,col)});
  x+=4;
 }
}
const orbitNodes=[...document.querySelectorAll('#sphere-stage [data-sphere-app]')];
// Rasterize each exact 1-bit sprite once; moving it then costs one draw call,
// while the source stays on the same native framebuffer and pixel pitch.
const orbitIcons=new Map(), orbitCaptions=new Map();
function orbitIcon(id,color){
 const pixels=art.get(id);
 if(!pixels)return null;
 let entry=orbitIcons.get(id);
 if(entry?.pixels===pixels&&entry.color===color)return entry.canvas;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=9;
 const paint=canvas.getContext('2d');paint.fillStyle=color;
 for(const [x,y] of pixels)paint.fillRect(x,y,1,1);
 orbitIcons.set(id,{pixels,color,canvas});
 return canvas;
}
function orbitCaption(id,text,color){
 let entry=orbitCaptions.get(id);
 if(entry?.text===text&&entry.color===color)return entry.canvas;
 const canvas=document.createElement('canvas');canvas.width=compactWidth(text);canvas.height=5;
 if(!canvas.width)return canvas;
 window.MaksonPreviewBitmap.drawCompact(canvas,text,color);
 orbitCaptions.set(id,{text,color,canvas});
 return canvas;
}
function drawOrbitNodes(){
 for(const node of [...orbitNodes].sort((a,b)=>(Number(a.style.zIndex)||0)-(Number(b.style.zIndex)||0))){
  const bounds=anchor(node.querySelector('.node-symbol')),style=getComputedStyle(node);
  const opacity=Number(style.opacity);
  if(!bounds||bounds.w<2||opacity<.1||style.display==='none'||style.visibility==='hidden')continue;
  const id=node.dataset.sphereApp, color=node.style.getPropertyValue('--app-color')||'#d7b2ff';
  ctx.globalAlpha=opacity;
  const sprite=orbitIcon(id,color);
  if(sprite)ctx.drawImage(sprite,bounds.x+Math.round((bounds.w-9)/2),bounds.y+Math.round((bounds.h-9)/2));
  const caption=node.lastElementChild,r=anchor(caption),captionStyle=getComputedStyle(caption);
  if(r?.w&&r?.h&&captionStyle.display!=='none'&&captionStyle.visibility!=='hidden'){
   const names={meme:'МЕМОИНАТОР',game:'ГИПНОРОЙДЕР',naval:'МОРСКОЙ БОЙ'};
   const name=names[id]||caption.textContent.trim().toUpperCase();
   const span=compactWidth(name),xx=Math.max(1,Math.min(W-span-1,r.x+Math.round((r.w-span)/2)));
   const text=orbitCaption(id,name,color);
   if(text.width)ctx.drawImage(text,xx,r.y+Math.floor((r.h-5)/2));
  }
  ctx.globalAlpha=1;
 }
}
const grainTexture=document.createElement('canvas'),grainCtx=grainTexture.getContext('2d');
let grainKey='';
function sceneGrain(top,start,stop){
 // Draw stationary grain once per geometry; blend the entire tiny texture in one operation.
 const sx=Math.max(0,start),ex=Math.max(sx,stop),height=H-top,w=ex-sx;
 if(w<1||height<1)return;
 const key=w+':'+height;
 if(key!==grainKey){
  grainKey=key;grainTexture.width=w;grainTexture.height=height;
  grainCtx.globalCompositeOperation='lighten';
  const grain=['#100b16','#0b0810','#09060d','#15101c'];
  let seed=0x2bb954d;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
  for(let i=0,count=Math.min(375,Math.round(w*height*.011));i<count;i++){
   const x=random()%w,y=random()%height;
   grainCtx.fillStyle=grain[i%grain.length];grainCtx.fillRect(x,y,1,1);
  }
 }
 // Source-over is accelerated; a blend mode here can read back the full raster on desktop.
 ctx.globalAlpha=.72;
 ctx.drawImage(grainTexture,sx,top);
 ctx.globalAlpha=1;
}
function drawSpeed(scene){
 const value=window.MaksonSphereTelemetry?.read?.();
 const hud=document.querySelector('#sphere-speed');
 const speed=value?.turnsPerSecond??Number(hud?.dataset.speed||0);
 if(!scene||!Number.isFinite(speed)||speed<.05||(value?!value.spinning:hud?.hidden))return;
 const text=speed.toFixed(1)+' ОБ/С';
 const length=compactWidth(text),center=(scene.left+scene.right)/n/2;
 const x=Math.round(center-length/2),y=Math.floor(scene.bottom/n)-12;
 rect(x-4,y-3,length+7,11,'#0d0714');
 rect(x-4,y+7,length+7,1,'#46265a');
 compact(text,x,y,'#d9a1f4');
}
function drawDock(){
 const dock=document.querySelector('#console-dock:not([hidden])'),box=anchor(dock);
 if(!box||box.w<1||box.h<1)return;
 ctx.save();ctx.beginPath();ctx.rect(box.x,box.y,box.w,box.h);ctx.clip();
 rect(box.x,box.y,box.w,box.h,ink.catalog);
 rect(box.x,box.y,box.w,1,ink.edge);
 for(const item of dock.querySelectorAll('.console-task')){
  const [restore,close]=item.querySelectorAll('button');
  const a=anchor(restore),b=anchor(close);if(!a||!b)continue;
  const highlight=button=>button.matches(':hover,:focus-visible');
  const plate=(v,button)=>edge(v.x,v.y,v.w,v.h,highlight(button)?'#294b37':'#102519');
  plate(a,restore);plate(b,close);
  const key=item.dataset.task,name=(namesForDock.get(key)||restore.textContent.trim()).toUpperCase(),room=a.w-6;
  let labelText=name;
  if(compactWidth(labelText)>room){while(labelText&&compactWidth(labelText+'...')>room)labelText=labelText.slice(0,-1);labelText=labelText?labelText+'...':'';}
  if(labelText){
   if(width(labelText)<=room)label(labelText,a.x+Math.floor((a.w-width(labelText))/2),a.y+Math.floor((a.h-7)/2),ink.green);
   else compact(labelText,a.x+Math.floor((a.w-compactWidth(labelText))/2),a.y+Math.floor((a.h-5)/2),ink.green);
  }
  const x=b.x+Math.floor(b.w/2),y=b.y+Math.floor(b.h/2);
  stroke(x-2,y-2,x+2,y+2,ink.green);stroke(x+2,y-2,x-2,y+2,ink.green);
 }
 ctx.restore();
}
const namesForDock=new Map([...lists.tools,...lists.games].map(([name,icon,key])=>[key,name]));
const staticLayer=document.createElement('canvas'),staticCtx=staticLayer.getContext('2d');
let staticDirty=true,catalogNeedsLayout=false;
function draw(buttons,focusKey){
 n=innerWidth<490||(innerHeight<490&&matchMedia('(pointer:coarse)').matches)?3:4;
 W=Math.ceil(innerWidth/n);H=Math.ceil(innerHeight/n);
 if(c.width!==W||c.height!==H){c.width=W;c.height=H;c.style.width=W*n+'px';c.style.height=H*n+'px';c.parentElement.style.setProperty('--preview-cell',n+'px')}
 rect(0,0,W,H,ink.bg);
 const rnd=k=>{const p=Math.sin(k*913.131+31.4)*43758.5453;return p-Math.floor(p)};
 if(!native)for(let i=0;i<Math.min(170,W*H/96);i++)dot(rnd(i)*W,rnd(i+500)*H,i%7===0?ink.star:ink.distant);
 const nativeHeader=document.querySelector('.desktop-header');
 const top=native&&nativeHeader?Math.ceil(nativeHeader.getBoundingClientRect().bottom/n):18;
 const appFrame={ctx,pitch:n,width:W,height:H,headerRows:top},app=native&&window.MaksonPixelApp;
 const rasterApp=app?.paintApp?app.paintApp(appFrame):app?.paintSettings?.(appFrame)?'settings':'';
 if(rasterApp){
  if(buttons)catalogNeedsLayout=true;
  drawHeader(top);
  if(rasterApp!=='settings'){drawDock();return;}
  const win=document.querySelector('#window-settings');
  const title=anchor(win?.querySelector('.titlebar')),close=anchor(win?.querySelector('[data-action=close]'));
  if(title){
   const name='НАСТРОЙКИ',x=title.x+4,r=title.x+title.w-3,y=title.y+Math.floor((title.h-8)/2);
   if(width(name)<(close?.x||r)-x)label(name,x,y,ink.green);
   else compact(name,x,y+1,ink.green);
  }
  if(close){
   const real=win.querySelector('[data-action=close]'),hi=real.matches(':hover,:focus-visible');
   const x=close.x+Math.floor(close.w/2),y=close.y+Math.floor(close.h/2);
   edge(close.x+1,close.y+1,close.w-2,close.h-2,hi?'#294b37':'#102519');
   stroke(x-3,y-3,x+3,y+3,ink.green);stroke(x+3,y-3,x-3,y+3,ink.green);
  }
  return;
 }
 if(buttons||catalogNeedsLayout){buttons=true;catalogNeedsLayout=false;nav.replaceChildren();}
 const narrow=innerWidth<=950&&matchMedia('(orientation:portrait)').matches,list=lists[folder],head=16,length=head+list.length*15+4,side=Math.min(Math.floor(W*.54),112);
 const panel=narrow?Math.min(Math.floor(H*.55),length):native?Math.max(1,H-top):Math.min(H-top-8,length);
 const sidebar=Math.min(Math.floor((W-5)*.42),Math.max(Math.ceil(160/n),Math.min(Math.floor(W*.28),Math.floor(372/n))));
 const shell=document.querySelector('#console-shell');
 if(native&&shell){
  const zoom=Number(document.body.style.zoom)||1;
  const drawer=(narrow&&shown?(panel+2)*n/zoom:0)+'px';
  const sideWidth=(!narrow&&shown?sidebar*n/zoom:0)+'px';
  for(const [key,value] of [['--pixel-home-drawer',drawer],['--pixel-home-side',sideWidth]]){
   if(shell.style.getPropertyValue(key)!==value)shell.style.setProperty(key,value);
  }
 }
 if(native){
  const source=document.querySelector('#sphere-canvas'),stage=source?.getBoundingClientRect();
  if(stage)for(let i=0;i<Math.min(160,Math.ceil(W*H/130));i++){
   const x=Math.floor(rnd(i+177)*W),y=top+Math.floor(rnd(i+777)*Math.max(0,H-top));
   if(x*n>=stage.left&&x*n<stage.right&&y*n>=stage.top&&y*n<stage.bottom)continue;
   dot(x,y,i%7===0?'#b0a2ce':'#554268');
  }
  if(stage&&source.width&&source.height){
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(source,Math.round(stage.left/n),Math.round(stage.top/n),source.width,source.height);
   sceneGrain(top,!narrow&&shown?sidebar:0,W);
   drawOrbitNodes();
   drawSpeed(stage);
  }
 }

 const mainCtx=ctx;
 if(native){
  if(!buttons&&!staticDirty&&staticLayer.width===W&&staticLayer.height===H){
   ctx.drawImage(staticLayer,0,0);return;
  }
  if(staticLayer.width!==W||staticLayer.height!==H){staticLayer.width=W;staticLayer.height=H;}
  staticCtx.clearRect(0,0,W,H);
  ctx=staticCtx;drawHeader(top);
 }else {rect(0,0,W,top,ink.header);rect(0,top-1,W,1,ink.rule);const brand='MAKSON PROJECT';label(brand,Math.max(4,(W-width(brand))/2),5,ink.red);}
 const box=narrow?{x:3,y:H-panel-2,w:W-6,h:panel}:native?{x:0,y:top,w:sidebar,h:panel}:{x:3,y:22,w:side,h:panel};
 const sx=narrow?Math.floor(W/2):Math.floor((W+(shown?side+6:0))/2);
 const sy=Math.floor((top+H-(narrow&&shown?panel:0))/2);
 const r=Math.max(18,Math.floor(Math.min(narrow?W*.37:(W-(shown?side:0))*.31,(narrow&&shown?box.y-top-15:H-top-28)*.46)));
 if(!native)sphere(sx,sy,r);
 if(shown){
  if(native&&!narrow){
   rect(box.x,box.y,box.w,box.h,ink.catalog);
   rect(box.w-1,box.y,1,box.h,ink.edge);
  }else edge(box.x,box.y,box.w,box.h,ink.catalog);
  rect(box.x+3,box.y+15,box.w-6,1,ink.edge);
  if(folder!=='root'){
   stroke(box.x+24,box.y+5,box.x+21,box.y+8,ink.mint);stroke(box.x+21,box.y+8,box.x+24,box.y+11,ink.mint);
   if(buttons)btn('back','В каталог',box.x+16,box.y+1,15,15,back);
  }
  cap=Math.max(1,Math.floor((box.h-head-2)/15));const pages=Math.ceil(list.length/cap),i=list.findIndex(r=>r[2]===focusKey);
  if(i>=0)page=Math.floor(i/cap);page=Math.min(page,pages-1);
  const headingX=box.x+(folder==='root'?18:32),headingEnd=box.x+box.w-(pages>1?16:3);
  const heading=titles[folder].find(text=>compactWidth(text)<=headingEnd-headingX);
  if(heading){
   if(width(heading)<=headingEnd-headingX)label(heading,headingX,box.y+5,ink.muted);
   else compact(heading,headingX,box.y+6,ink.muted);
  }

  if(pages>1){
   const x=box.x+box.w-16;stroke(x+5,box.y+5,x+9,box.y+8,ink.mint);stroke(x+9,box.y+8,x+5,box.y+11,ink.mint);
   if(buttons)btn('next','Следующая страница каталога',x,box.y+1,15,15,kbd=>{page=(page+1)%pages;draw(true);if(kbd)focus(list[page*cap][2])})
  }
  list.slice(page*cap,(page+1)*cap).forEach(([name,icon,key],i)=>{
   const y=box.y+head+i*15;
   if(art.has(key)){for(const [ix,iy] of art.get(key))dot(box.x+5+ix,y+3+iy,ink.green);}
   else glyph(sprites[icon],box.x+7,y+5,ink.green);
   let nameOnScreen=name.toUpperCase(),limit=box.w-(icon==='folder'?22:17);
   if(width(nameOnScreen)>limit){
    if(compactWidth(nameOnScreen)>limit){while(nameOnScreen&&compactWidth(nameOnScreen+'...')>limit)nameOnScreen=nameOnScreen.slice(0,-1);nameOnScreen+='...'}
    compact(nameOnScreen,box.x+15,y+5,ink.green);
   }else label(nameOnScreen,box.x+15,y+4,ink.green);
   if(icon==='folder'){const q=box.x+box.w-7;stroke(q,y+5,q+3,y+8,ink.muted);stroke(q+3,y+8,q,y+11,ink.muted)}
   if(buttons)btn(key,name,box.x+3,y,box.w-6,15,kbd=>pick(name,key,kbd));
  });
 }
 const x=shown?box.x+1:2,y=shown?box.y+1:narrow?H-18:top+3;
 edge(x,y,15,15,'#090f0c');stroke(x+4,y+7,x+10,y+7,ink.mint);if(!shown)stroke(x+7,y+4,x+7,y+10,ink.mint);
 if(buttons)btn('toggle',shown?'Свернуть каталог':'Открыть каталог',x,y,15,15,kbd=>{setShown(!shown);if(kbd)focus('toggle')});
 if(native){
  drawDock();ctx=mainCtx;ctx.drawImage(staticLayer,0,0);staticDirty=false;
 }
}
function queue(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;if(!native||!c.parentElement.hidden)draw(false)})}
if(native){
 const refresh=()=>{staticDirty=true;queue()};
 document.addEventListener('makson-native-frame',queue);
 document.addEventListener('makson-pixel-repaint',queue);
 for(const e of ['makson-pixel-screen-change','focusin','focusout','accountchange','windowfocus','windowhide','console-boot-change'])document.addEventListener(e,refresh);
 for(const e of ['pointerover','pointerout'])document.addEventListener(e,event=>{
  if(event.target.closest?.('.desktop-header,#controls,#console-dock'))refresh();
 });
 const dock=document.querySelector('#console-dock');
 if(dock){dock.addEventListener('scroll',refresh,{passive:true});new MutationObserver(refresh).observe(dock,{childList:true,attributes:true,attributeFilter:['hidden']});}
 const header=document.querySelector('.desktop-header');
 if(header)new MutationObserver(refresh).observe(header,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-expanded','class','hidden']});
}

document.addEventListener('makson-preview-focus',e=>{
 const id=e.detail,dest=Object.keys(lists).find(k=>lists[k].some(row=>row[2]===id));
 if(!dest)return;
 if(folder!==dest||!shown||!nav.querySelector('[data-key="'+id+'"]')){folder=dest;shown=true;draw(true,id)}
 focus(id)
});
document.addEventListener('makson-preview-keyboard-home',()=>{
 if(!shown)setShown(true);
 focus(lists[folder][page*cap][2]);
});
c.onpointerdown=e=>{if(native||e.button!==0)return;pointer=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId)};
c.onpointermove=e=>{if(!pointer)return;angle+=(e.clientX-pointer[0])*.013;tilt=Math.max(-1,Math.min(1,tilt+(e.clientY-pointer[1])*.01));pointer=[e.clientX,e.clientY];queue()};
for(const e of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(e,()=>pointer=null);
addEventListener('resize',()=>{const key=document.activeElement?.dataset?.key;draw(true,key);if(key)focus(key)},{passive:true});draw(true);
})();
