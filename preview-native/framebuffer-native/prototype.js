(() => {
const c=document.querySelector('#screen'),native=!!c.closest('[data-preview-native]'),ctx=c.getContext('2d',{alpha:native}),nav=document.querySelector('#controls'),status=document.querySelector('#status');
const ink={bg:'#000000',star:'#6e508e',distant:'#242031',red:'#ff4b50',header:'#050303',rule:'#452025',catalog:'#020906',edge:'#203b27',green:'#96eeb3',mint:'#4bf89b',muted:'#72a285',front:'#ab52e7',back:'#46216a'};
const lists={root:[['Программы','folder','tools'],['Игры','folder','games'],['Связь','chat','svyaz'],['Настройки','gear','settings']],
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
function back(kbd){const old=folder;folder='root';page=0;draw(true);if(kbd)focus(old)}
function pick(name,key,kbd){
 if(key==='tools'||key==='games'){folder=key;page=0;draw(true);if(kbd)focus(lists[folder][0][2]);return}
 const notice=new CustomEvent('makson-preview-open',{cancelable:true,detail:{id:key,name,keyboard:kbd}});
 if(document.dispatchEvent(notice)){status.hidden=false;status.textContent=name+': подключается в рабочей версии.'}
}
nav.addEventListener('keydown',e=>{
 if(!shown||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Escape'&&folder!=='root'){e.preventDefault();back(true);return}
 const list=lists[folder],i=list.findIndex(a=>a[2]===e.target.dataset.key);
 if(i<0||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
 e.preventDefault();const idx=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;
 if(Math.floor(idx/cap)!==page){page=Math.floor(idx/cap);draw(true)}focus(list[idx][2])
});
if(document.querySelector('#framebuffer-preview')){
 window.MaksonPreviewBitmap=Object.freeze({
  pitch:()=>innerWidth<490||(innerHeight<490&&matchMedia('(pointer:coarse)').matches)?3:4,
  width,
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
  const img=new Image();img.onload=()=>{
   const k=document.createElement('canvas');k.width=9;k.height=9;const x=k.getContext('2d');
   x.drawImage(img,0,0,9,9);const data=x.getImageData(0,0,9,9), pixels=[];
   for(let j=0;j<9;j++)for(let i=0;i<9;i++)if(data.data[(j*9+i)*4+3]>=65)pixels.push([i,j]);
   if(pixels.length){art.set(key,pixels);queue();}
  };img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));
 }
 addImage();
}
function draw(buttons,anchor){
 if(buttons)nav.replaceChildren();
 n=innerWidth<490||(innerHeight<490&&matchMedia('(pointer:coarse)').matches)?3:4;
 W=Math.floor(innerWidth/n);H=Math.floor(innerHeight/n);
 if(c.width!==W||c.height!==H){c.width=W;c.height=H;c.style.width=W*n+'px';c.style.height=H*n+'px'}
 if(native)ctx.clearRect(0,0,W,H);else rect(0,0,W,H,ink.bg);
 const rnd=k=>{const p=Math.sin(k*913.131+31.4)*43758.5453;return p-Math.floor(p)};
 if(!native)for(let i=0;i<Math.min(170,W*H/96);i++)dot(rnd(i)*W,rnd(i+500)*H,i%7===0?ink.star:ink.distant);
 const nativeHeader=document.querySelector('.desktop-header');
 const top=native&&nativeHeader?Math.ceil(nativeHeader.getBoundingClientRect().bottom/n):18;
 if(native){
  const stage=document.querySelector('#sphere-canvas')?.getBoundingClientRect();
  if(stage)for(let i=0;i<Math.min(160,Math.ceil(W*H/130));i++){
   const x=Math.floor(rnd(i+177)*W),y=top+Math.floor(rnd(i+777)*Math.max(0,H-top));
   if(x*n>=stage.left&&x*n<stage.right&&y*n>=stage.top&&y*n<stage.bottom)continue;
   dot(x,y,i%7===0?'#b0a2ce':'#554268');
  }
 }

 if(!native){rect(0,0,W,top,ink.header);rect(0,top-1,W,1,ink.rule);
 const brand='MAKSON PROJECT';label(brand,Math.max(4,(W-width(brand))/2),5,ink.red);}

 const narrow=innerWidth<560,list=lists[folder],head=16,length=head+list.length*15+4,side=Math.min(Math.floor(W*.54),112);
 const panel=narrow?Math.min(Math.floor(H*.58),length):Math.min(H-top-8,length);
 const left=document.querySelector('#app-catalog')?.getBoundingClientRect();
 const nativeSide=native&&left?Math.max(76,Math.floor(left.width/n)-5):side;
 const box=narrow?{x:3,y:H-panel-2,w:W-6,h:panel}:{x:3,y:native?top+2:22,w:nativeSide,h:panel};
 const sx=narrow?Math.floor(W/2):Math.floor((W+(shown?side+6:0))/2);
 const sy=Math.floor((top+H-(narrow&&shown?panel:0))/2);
 const r=Math.max(18,Math.floor(Math.min(narrow?W*.37:(W-(shown?side:0))*.31,(narrow&&shown?box.y-top-15:H-top-28)*.46)));
 if(!native)sphere(sx,sy,r);
 if(shown){
  edge(box.x,box.y,box.w,box.h,ink.catalog);
  if(folder!=='root'){
   stroke(box.x+8,box.y+5,box.x+5,box.y+8,ink.mint);stroke(box.x+5,box.y+8,box.x+8,box.y+11,ink.mint);
   if(buttons)btn('back','В каталог',box.x,box.y+1,15,15,back);
  }
  cap=Math.max(1,Math.floor((box.h-head-2)/15));const pages=Math.ceil(list.length/cap),i=list.findIndex(r=>r[2]===anchor);
  if(i>=0)page=Math.floor(i/cap);page=Math.min(page,pages-1);
  const headingX=box.x+(folder==='root'?5:16);
  const headingEnd=box.x+box.w-(pages>1?31:16)-1;
  const heading=titles[folder].find(text=>width(text)<=headingEnd-headingX);
  if(heading)label(heading,headingX,box.y+5,ink.muted);

  if(pages>1){
   const x=box.x+box.w-31;stroke(x+5,box.y+5,x+9,box.y+8,ink.mint);stroke(x+9,box.y+8,x+5,box.y+11,ink.mint);
   if(buttons)btn('next','Следующая страница каталога',x,box.y+1,15,15,kbd=>{page=(page+1)%pages;draw(true);if(kbd)focus(list[page*cap][2])})
  }
  list.slice(page*cap,(page+1)*cap).forEach(([name,icon,key],i)=>{
   const y=box.y+head+i*15;
   if(art.has(key)){for(const [ix,iy] of art.get(key))dot(box.x+5+ix,y+3+iy,ink.green);}
   else glyph(sprites[icon],box.x+7,y+5,ink.green);
   let nameOnScreen=name.toUpperCase(),limit=box.w-(icon==='folder'?22:17);
   if(width(nameOnScreen)>limit){while(nameOnScreen&&width(nameOnScreen+'...')>limit)nameOnScreen=nameOnScreen.slice(0,-1);nameOnScreen+='...'}
   label(nameOnScreen,box.x+15,y+4,ink.green);
   if(icon==='folder'){const q=box.x+box.w-7;stroke(q,y+5,q+3,y+8,ink.muted);stroke(q+3,y+8,q,y+11,ink.muted)}
   if(buttons)btn(key,name,box.x+3,y,box.w-6,15,kbd=>pick(name,key,kbd));
  });
 }
 const x=shown?box.x+box.w-16:W-19,y=shown?box.y+1:top+3;
 edge(x,y,15,15,'#090f0c');stroke(x+4,y+7,x+10,y+7,ink.mint);if(!shown)stroke(x+7,y+4,x+7,y+10,ink.mint);
 if(buttons)btn('toggle',shown?'Свернуть каталог':'Открыть каталог',x,y,15,15,kbd=>{shown=!shown;draw(true);if(native)document.dispatchEvent(new CustomEvent('makson-preview-visibility',{detail:shown}));if(kbd)focus('toggle')});
}
function queue(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;draw(false)})}
document.addEventListener('makson-preview-focus',e=>{
 const id=e.detail,dest=Object.keys(lists).find(k=>lists[k].some(row=>row[2]===id));
 if(!dest)return;
 if(folder!==dest||!shown||!nav.querySelector('[data-key="'+id+'"]')){folder=dest;shown=true;draw(true,id)}
 focus(id)
});
c.onpointerdown=e=>{if(native||e.button!==0)return;pointer=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId)};
c.onpointermove=e=>{if(!pointer)return;angle+=(e.clientX-pointer[0])*.013;tilt=Math.max(-1,Math.min(1,tilt+(e.clientY-pointer[1])*.01));pointer=[e.clientX,e.clientY];queue()};
for(const e of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(e,()=>pointer=null);
addEventListener('resize',()=>{const key=document.activeElement?.dataset?.key;draw(true,key);if(key)focus(key)},{passive:true});draw(true);
})();
