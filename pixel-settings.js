/** App-specific paint and DOM alignment for the native Settings window. */
const extra={
'0':'75557','1':'26227','2':'71247','3':'71317','4':'55711','5':'74617','6':'74757','7':'71122','8':'75757','9':'75717',
'…':'00005','∨':'00052','/':'11244','→':'02720','×':'50500','?':'71202',B:'65656',F:'74644',G:'34553',H:'55755',I:'72227',L:'44447',Q:'25573',U:'55557',V:'55552',W:'55575',X:'55255',Y:'55222',Z:'71247','·':'00200','—':'00700','%':'51545','+':'02720','−':'00700',':':'02020',',':'00024',
'Ц':'55571','Щ':'55571','Э':'61216','Ю':'55755',
};
const fullExtra={
 '…':[0,0,0,0,0,0,21],'∨':[0,0,0,17,17,10,4],'/':[1,1,2,4,8,16,16],'→':[0,4,2,31,2,4,0],'×':[0,17,10,4,10,17,0],'?':[14,17,2,4,4,0,4],B:[30,17,17,30,17,17,30],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[31,4,4,4,4,4,31],L:[16,16,16,16,16,16,31],Q:[14,17,17,17,21,18,13],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],'·':[0,0,0,4,0,0,0],'—':[0,0,0,31,0,0,0],'0':[14,17,17,17,17,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],
 '3':[30,1,1,14,1,1,30],'4':[2,6,10,18,31,2,2],'5':[31,16,16,30,1,1,30],
 '6':[14,16,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],
 '9':[14,17,17,15,1,1,14],'%':[25,26,4,4,4,11,19],'+':[0,4,4,31,4,4,0],
 '−':[0,0,0,31,0,0,0],':':[0,0,4,0,0,4,0],',':[0,0,0,0,0,4,8],
 'Ц':[17,17,17,17,17,17,31,1],'Щ':[21,21,21,21,21,21,31,1],
 'Э':[30,1,1,15,1,1,30],'Ю':[18,21,21,29,21,21,18],
};
export function makeText(bitmap,ctx){
 const sprites=new Map();
 const textWidth=(s,small)=>(small?bitmap.compactWidth(s):bitmap.width(s))-1;
 const needsExtras=s=>[...s].some(letter=>letter in extra);
 function ink(value,x,y,color,small){
  const key=JSON.stringify([value,color,small]);
  let sprite=sprites.get(key);
  if(!sprite){
   sprite=document.createElement('canvas');sprite.width=Math.max(1,textWidth(value,small));sprite.height=small?5:8;
   const render=small?bitmap.drawCompact:bitmap.draw;
   if(!needsExtras(value))render(sprite,value,color);
   else{
    const g=sprite.getContext('2d'),cell=document.createElement('canvas');let dx=0;
    for(const letter of value){
     if(extra[letter]){
      const rows=small?[...extra[letter]].map(Number):fullExtra[letter],cols=small?3:5;
      g.fillStyle=color;
      rows.forEach((row,iy)=>{for(let ix=0;ix<cols;ix++)if(row&(1<<(cols-ix-1)))g.fillRect(dx+ix,iy,1,1);});
     }else if(letter!==' '){
      cell.width=Math.max(1,textWidth(letter,small));cell.height=small?5:8;render(cell,letter,color);g.drawImage(cell,dx,0);
     }
     dx+=small?bitmap.compactWidth(letter):bitmap.width(letter);
    }
   }
   if(sprites.size>=96)sprites.delete(sprites.keys().next().value);
   sprites.set(key,sprite);
  }
  ctx.drawImage(sprite,x,y);
 }
 function wrap(value,available,small){
  const lines=[];
  for(const input of value.split('\n')){
   let line='';
   for(const word of input.split(' ')){
    const next=line?line+' '+word:word;
    if(line&&textWidth(next,small)>available){lines.push(line);line=word;}
    else line=next;
   }
   if(line)lines.push(line);
  }
  return lines;
 }
 function text(value,b,{center=false,color='#9cdeb4',pad=0,flow=false,compact=false}={}){
  const available=Math.max(1,b.r-b.l-2*pad);
  let small=compact,lines=wrap(value,available,small);
  if(!small&&(lines.some(line=>textWidth(line,small)>available)||lines.length*9-1>b.b-b.t-2)){
   small=true;lines=wrap(value,available,true);
  }
  const step=small?7:9,actual=lines.length*step-(small?2:1);
  const start=flow?b.t+pad:Math.round((b.t+b.b-actual)/2);
  ctx.save();ctx.beginPath();ctx.rect(b.l,b.t,Math.max(0,b.r-b.l),Math.max(0,b.b-b.t));ctx.clip();
  lines.forEach((line,i)=>ink(line,center?Math.round((b.l+b.r-textWidth(line,small))/2):b.l+pad,start+i*step,color,small));
  ctx.restore();
 }
 return {text};
}
const SETTINGS_CSS=`
body.matrix-settings-active #window-settings{
 position:fixed!important;inset:var(--mx-top) 0 0!important;
 width:100%!important;height:calc(var(--viewport-height,100dvh) - var(--mx-top))!important;
 max-width:none!important;max-height:none!important;min-height:0!important;margin:0!important;
 border:0!important;box-shadow:none!important;overflow:hidden!important;background:#020704!important;
}
body.matrix-settings-active #window-settings>.titlebar{
 height:calc(16 * var(--mx))!important;min-height:calc(16 * var(--mx))!important;
 padding:0 calc(4 * var(--mx));border:0;
}
body.matrix-settings-active #window-settings .window-controls button{
 width:calc(15 * var(--mx));min-width:calc(15 * var(--mx))!important;
 height:calc(15 * var(--mx));min-height:calc(15 * var(--mx))!important;
}
body.matrix-settings-active #window-settings>.utility-body{
 display:flex;flex-direction:column;gap:0;max-width:calc(720px / var(--ui-scale,1));
 width:100%;margin-inline:auto;padding:calc(3 * var(--mx)) calc(4 * var(--mx)) calc(4 * var(--mx));
 scroll-padding:calc(2 * var(--mx));scrollbar-width:none;
}
body.matrix-settings-painted #window-settings>.utility-body{opacity:0!important}

body.matrix-settings-active #window-settings .screen-settings{display:block}
body.matrix-settings-active #window-settings .console-zoom{
 display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;
 gap:calc(2 * var(--mx));padding:0;
}
body.matrix-settings-active #window-settings .console-zoom>span{grid-column:auto}
body.matrix-settings-active #window-settings .console-zoom output{min-width:calc(24 * var(--mx));min-height:calc(10 * var(--mx));margin:0;text-align:center;display:grid;align-items:center}
body.matrix-settings-active #window-settings :is(.console-zoom,.settings-fullscreen,.setting){
 min-height:calc(18 * var(--mx));padding:0;margin:0;border:0;gap:calc(2 * var(--mx));
}
body.matrix-settings-active #window-settings :is(.setting,.settings-fullscreen){display:flex;align-items:center;justify-content:space-between}
body.matrix-settings-active #window-settings .setting input{
 width:calc(15 * var(--mx));height:calc(9 * var(--mx));min-width:0;min-height:0;
}
body.matrix-settings-active #window-settings .utility-body button,
body.matrix-settings-active #window-settings .utility-body summary{
 --ui-control-height:calc(15 * var(--mx));
 min-height:calc(15 * var(--mx))!important;padding-inline:calc(2 * var(--mx));
}
body.matrix-settings-active #window-settings :is(#zoom-in,#zoom-out){width:calc(15 * var(--mx));min-width:calc(15 * var(--mx))!important}
body.matrix-settings-active #window-settings #site-fullscreen{width:calc(22 * var(--mx));min-width:calc(22 * var(--mx))}
body.matrix-settings-active #window-settings .settings-footer{
 display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(2 * var(--mx));
 margin:0;padding:calc(3 * var(--mx)) 0 0;
}
body.matrix-settings-active #window-settings .console-input-help p{
 grid-column:1/-1;order:4;line-height:calc(7 * var(--mx))!important;
 --ui-text-min:calc(5 * var(--mx));margin:0;padding:calc(2 * var(--mx)) 0;min-height:calc(39 * var(--mx));
}
body.matrix-settings-active #window-settings .settings-footer :is(button,summary){width:100%;height:calc(16 * var(--mx));min-height:calc(16 * var(--mx))!important;justify-content:center}
@media (min-width:600px){
 body.matrix-settings-active #window-settings .screen-settings{
  display:grid;grid-template-columns:1.35fr 1fr;gap:calc(4 * var(--mx));
 }
}
@media (min-width:550px) and (orientation:landscape) and (max-height:500px){
 body.matrix-settings-active #window-settings>.utility-body{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  column-gap:calc(4 * var(--mx));align-content:start;
 }
 body.matrix-settings-active #window-settings .utility-body :is(.screen-settings,.settings-footer,.setting:last-of-type){
  grid-column:1/-1;
 }
}
`;
export function createSettingsSurface(bitmap,ctx){
 const win=document.querySelector('#window-settings'),pane=win?.querySelector(':scope>.utility-body');
 const workspace=document.querySelector('#console-shell');
 if(!win||!pane||!workspace)return null;
 const body=document.body,help=pane.querySelector('details'),zoom=pane.querySelector('#zoom-value');
 let previousInert;
 const sheet=document.createElement('style');sheet.textContent=SETTINGS_CSS;document.head.append(sheet);
 const labels=makeText(bitmap,ctx);
 const rgb={background:'#010503',surface:'#07120b',line:'#284b35',green:'#9cdeb4',bright:'#b9f5cf',muted:'#659777',button:'#102519',on:'#5ad38d'};
 function stop(){
  body.classList.remove('matrix-settings-active','matrix-settings-painted');
  if(previousInert!==undefined){workspace.inert=previousInert;previousInert=undefined;}
 }
 function paint({pitch,width:w,height:h,headerRows,active}){
  if(!active||win.hidden){stop();return false;}
  if(previousInert===undefined){previousInert=workspace.inert;workspace.inert=true;}
  const nativeScale=Number(body.style.zoom)||1;
  const cell=(pitch/nativeScale)+'px',top=(headerRows*pitch/nativeScale)+'px';
  if(win.style.getPropertyValue('--mx')!==cell)win.style.setProperty('--mx',cell);
  if(win.style.getPropertyValue('--mx-top')!==top)win.style.setProperty('--mx-top',top);
  body.classList.add('matrix-settings-active');
  const bounds=el=>{
   const r=el.getBoundingClientRect();
   return {l:Math.round(r.left/pitch),t:Math.round(r.top/pitch),r:Math.round(r.right/pitch),b:Math.round(r.bottom/pitch)};
  };
  const fill=(x,y,a,b,color)=>{if(a>x&&b>y){ctx.fillStyle=color;ctx.fillRect(x,y,a-x,b-y);}};
  const pb=bounds(pane),tb=bounds(win.querySelector('.titlebar'));
  if(pb.b<=pb.t||tb.b<=headerRows){stop();return false;}
  fill(0,headerRows,w,h,rgb.background);
  fill(0,headerRows,w,tb.b,rgb.surface);
  fill(0,tb.b-1,w,tb.b,rgb.line);
  const contentLeft=pb.l+4;
  const {text}=labels;
  function outline(b,edge=rgb.line,bg=rgb.button){
   fill(b.l,b.t,b.r,b.b,edge);fill(b.l+1,b.t+1,b.r-1,b.b-1,bg);
  }
  function button(el,title){
   const b=bounds(el),focus=el.matches(':focus-visible'),hover=el.matches(':hover');
   outline(b,focus?rgb.bright:rgb.line,hover?'#214832':rgb.button);
   text(title,b,{center:true,pad:1,color:el.disabled?rgb.muted:rgb.bright});
  }
  ctx.save();ctx.beginPath();ctx.rect(pb.l,pb.t,pb.r-pb.l,pb.b-pb.t);ctx.clip();
  fill(pb.l,pb.t,pb.r,pb.b,rgb.surface);
  const zr=bounds(pane.querySelector('.console-zoom')),fr=bounds(pane.querySelector('.settings-fullscreen'));
  text('МАСШТАБ',{...zr,l:contentLeft,r:bounds(pane.querySelector('#zoom-out')).l-1});
  button(pane.querySelector('#zoom-out'),'−');button(pane.querySelector('#zoom-in'),'+');
  text(zoom.textContent,bounds(zoom),{center:true,color:rgb.bright});
  const full=pane.querySelector('#site-fullscreen');
  text('ПОЛНЫЙ ЭКРАН',{...fr,r:bounds(full).l-1});
  button(full,full.getAttribute('aria-pressed')==='true'?'ВЫКЛ':'ВКЛ');
  const rowLabels=['ЗВУК','АНИМАЦИЯ','МЕНЬШЕ ЯРКОСТИ'];
  [...pane.querySelectorAll('label.setting')].forEach((row,i)=>{
   const b=bounds(row),input=row.querySelector('input'),p=bounds(input),checked=input.checked;
   fill(b.l,b.t,b.r,b.t+1,rgb.line);
   text(rowLabels[i],{...b,r:p.l-2});
   outline(p,input.matches(':focus-visible')?rgb.bright:rgb.line,checked?'#173a27':'#101e16');
   const tw=Math.floor((p.r-p.l-3)/2),x=checked?p.r-tw-2:p.l+2;
   fill(x,p.t+2,x+tw,p.b-2,checked?rgb.on:rgb.muted);
  });
  button(pane.querySelector('#reset-settings'),'СБРОС');
  button(help.querySelector('summary'),'КЛАВИШИ');
  if(help.open){const b=bounds(help.querySelector('summary'));fill(b.l,b.b-1,b.r,b.b,rgb.on);}
  if(help.open){
   text('СТРЕЛКИ: ВЫБОР\nENTER: ОТКРЫТЬ\nESC: НАЗАД   F6: КАТАЛОГ\nГЕЙМПАД: A ВЫБОР, B НАЗАД\nSTART: КАТАЛОГ',bounds(help.querySelector('p')),{pad:1,flow:true,compact:true,color:rgb.green});
  }
  const availableScroll=pane.scrollHeight-pane.clientHeight;
  if(availableScroll>1){
   const visible=pb.b-pb.t,m=Math.max(4,Math.floor(visible*pane.clientHeight/pane.scrollHeight));
   const y=pb.t+Math.round((visible-m)*pane.scrollTop/availableScroll);
   fill(pb.r-1,pb.t,pb.r,pb.b,rgb.line);fill(pb.r-1,y,pb.r,y+m,rgb.muted);
  }
  ctx.restore();
  body.classList.add('matrix-settings-painted');
  return true;
 }
 function watch(draw){
  const size=new ResizeObserver(draw);for(const node of [win,pane,help])size.observe(node);
  const changes=new MutationObserver(draw);changes.observe(win,{attributes:true,attributeFilter:['hidden']});
  changes.observe(zoom,{childList:true,characterData:true,subtree:true});
  for(const type of ['pointerover','pointerout','focusin','focusout','input','change','scroll','toggle'])win.addEventListener(type,draw,true);
  return ()=>{size.disconnect();changes.disconnect();for(const type of ['pointerover','pointerout','focusin','focusout','input','change','scroll','toggle'])win.removeEventListener(type,draw,true);};
 }
 return {paint,stop,watch};
}

/** Buffer controls and status share the shell raster; real editable fields and native dialogs stay live. */
export function createBufferSurface(bitmap,ctx){
 const win=document.querySelector('#window-buffer'),pane=win?.querySelector('.utility-body'),desktop=document.querySelector('#console-shell');
 if(!win||!pane||!desktop)return null;
 const labels=makeText(bitmap,ctx);
 const $=selector=>win.querySelector(selector);
 const code=$('#buffer-code'),draft=$('#buffer-text'),status=$('#buffer-status'),files=$('#file-status'),header=$('.titlebar');
 const body=document.body;
 const colors={black:'#020704',panel:'#08130d',input:'#0b1c12',edge:'#2d5840',green:'#b5eccc',muted:'#78a88b',accent:'#76e6a7',focus:'#d3ffe6'};
 const style=document.createElement('style');
 style.textContent=`
body.matrix-buffer #console-shell #window-buffer{
 position:fixed!important;inset:var(--buffer-top) 0 0!important;margin:0!important;transform:none!important;translate:none!important;
 width:100%!important;height:calc(var(--viewport-height,100dvh) - var(--buffer-top))!important;max-width:none!important;max-height:none!important;
 min-height:0!important;border:0!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;
 overflow:hidden!important;background:#08130d!important;
}
body.matrix-buffer #console-shell #window-buffer>.titlebar{
 min-height:calc(16 * var(--bp))!important;max-height:none!important;
 flex:0 0 calc(16 * var(--bp))!important;padding:0 calc(4 * var(--bp))!important;
 display:flex!important;flex-wrap:nowrap!important;justify-content:space-between!important;gap:0!important;
}
body.matrix-buffer #console-shell #window-buffer>.titlebar>span,
body.matrix-buffer #console-shell #window-buffer>.titlebar>.window-controls{flex:initial!important;min-height:0!important}
body.matrix-buffer #console-shell #window-buffer>.titlebar>.window-controls>button{
 position:static!important;min-width:0!important;min-height:0!important;
 width:calc(15 * var(--bp))!important;height:calc(14 * var(--bp))!important;
}
body.matrix-buffer #console-shell #window-buffer>.utility-body{
 display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:none!important;
 align-content:start!important;flex:1 1 auto!important;overscroll-behavior:contain;overflow:auto!important;scrollbar-width:none;
 box-sizing:border-box;width:100%;max-width:calc(200 * var(--bp));margin-inline:auto;
 gap:calc(3 * var(--bp))!important;padding:calc(4 * var(--bp))!important;
}
body.matrix-buffer #console-shell #window-buffer>.utility-body>*{grid-area:auto!important;order:0!important;margin:0!important;min-width:0}
body.matrix-buffer #console-shell #window-buffer>.utility-body>.utility-intro,
body.matrix-buffer #console-shell #window-buffer>.utility-body>.subtle{display:none!important}
body.matrix-buffer #console-shell #window-buffer .field-heading{order:-2!important;display:flex!important;justify-content:space-between}
body.matrix-buffer #console-shell #window-buffer #buffer-text{
 order:-1!important;box-sizing:border-box;margin:0!important;resize:none!important;min-height:0!important;
 height:calc(44 * var(--bp))!important;width:100%!important;max-width:none!important;
}
body.matrix-buffer #console-shell #window-buffer .buffer-connect{
 display:grid!important;grid-template-columns:minmax(0,.65fr) minmax(0,1.45fr) minmax(0,.7fr)!important;
 align-items:end!important;gap:calc(2 * var(--bp))!important;
}
body.matrix-buffer #console-shell #window-buffer .buffer-connect label{
 display:grid!important;grid-column:auto!important;grid-template-columns:minmax(0,1fr)!important;gap:0!important;font-size:calc(5 * var(--bp))!important;
 line-height:calc(8 * var(--bp))!important;min-width:0!important;
}
body.matrix-buffer #console-shell #window-buffer :is(#buffer-code,.utility-body button,.upload-zone){
 min-height:calc(15 * var(--bp))!important;height:calc(15 * var(--bp))!important;
 min-width:0!important;max-width:none!important;box-sizing:border-box;
}
body.matrix-buffer #console-shell #window-buffer .upload-zone{display:grid!important;place-items:center!important}
body.matrix-buffer #console-shell #window-buffer .upload-zone small{display:none}
body.matrix-buffer #console-shell #window-buffer #file-status{display:block!important;min-height:calc(10 * var(--bp))}
body.matrix-buffer #console-shell #window-buffer #file-status a{
 min-height:calc(16 * var(--bp));display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:calc(2 * var(--bp));align-items:center;
}
body.matrix-buffer #console-shell #window-buffer #file-status .buffer-file-glyph{display:none}
body.matrix-buffer #console-shell #window-buffer #buffer-status{
 flex:0 0 calc(11 * var(--bp))!important;min-height:0!important;box-sizing:border-box;padding:0 calc(4 * var(--bp))!important;
}
body.matrix-buffer #console-shell #window-buffer :is(#buffer-code,#buffer-text){
 appearance:none!important;border:0!important;border-radius:0!important;background:#0b1c12!important;box-shadow:none!important;
 color:#b5eccc!important;font:500 calc(5 * var(--bp)) / calc(7 * var(--bp)) ConsoleMono,monospace!important;
 padding:calc(2 * var(--bp))!important;outline-offset:calc(-1 * var(--bp));
}
body.matrix-buffer #console-shell #window-buffer :is(#buffer-code,#buffer-text)::placeholder{color:#78a88b!important}
body.matrix-buffer>#toast{z-index:2147483642!important}
body.matrix-buffer>.console-focus-frame{z-index:2147482499!important}
@media(max-width:370px){
 body.matrix-buffer #console-shell #window-buffer>.titlebar>.window-controls>button{width:calc(12 * var(--bp))!important}
}
@media(min-width:600px) and (max-height:500px) and (orientation:landscape){
 body.matrix-buffer #console-shell #window-buffer>.utility-body{
  grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)!important;max-width:calc(275 * var(--bp));
  gap:calc(2 * var(--bp))!important;padding-block:calc(2 * var(--bp))!important;
 }
 body.matrix-buffer #console-shell #window-buffer>.utility-body>.field-heading{grid-area:1/1!important}
 body.matrix-buffer #console-shell #window-buffer>.utility-body>#buffer-text{grid-area:2/1/6/2!important;height:100%!important;min-height:calc(28 * var(--bp))!important}
 body.matrix-buffer #console-shell #window-buffer>.utility-body>.buffer-connect{
  display:grid!important;grid-area:1/2/3/3!important;grid-template-columns:minmax(0,.62fr) minmax(0,1.45fr) minmax(0,.75fr)!important;
 }
 body.matrix-buffer #console-shell #window-buffer>.utility-body>[data-share-session=buffer]{grid-area:3/2!important}
 body.matrix-buffer #console-shell #window-buffer>.utility-body>.upload-zone{grid-area:4/2!important}
 body.matrix-buffer #console-shell #window-buffer>.utility-body>#file-status{grid-area:5/2!important}
}
`;
 document.head.append(style);
 // Place the edit entry point first in both sequences, without replacing the real textarea.
 const heading=$('.field-heading'),oldNext=draft.nextSibling;
 function arrange(active){
  if(active===(pane.firstElementChild===heading))return;
  const focused=document.activeElement;
  const selection=focused===draft?[draft.selectionStart,draft.selectionEnd,draft.selectionDirection]:null;
  if(active){pane.prepend(heading,draft);}
  else{pane.insertBefore(heading,oldNext);pane.insertBefore(draft,oldNext);}
  if((focused===draft||heading.contains(focused))&&document.activeElement!==focused){
   focused.focus({preventScroll:true});if(selection)draft.setSelectionRange(...selection);
  }
 }
 function stop(){
  if(!body.classList.contains('matrix-buffer'))return;
  body.classList.remove('matrix-buffer');arrange(false);
 }
 function paint({pitch,width:w,height:h,headerRows:top,active}){
  if(!active||win.hidden||win.ownerDocument!==document){stop();return false;}
  const zoom=Number(body.style.zoom)||1;
  win.style.setProperty('--bp',pitch/zoom+'px');win.style.setProperty('--buffer-top',top*pitch/zoom+'px');
  if(!body.classList.contains('matrix-buffer')){arrange(true);body.classList.add('matrix-buffer');}
  function bounds(el,inset=0){
   const r=el.getBoundingClientRect();
   return {l:Math.round(r.left/pitch)+inset,t:Math.round(r.top/pitch)+inset,r:Math.round(r.right/pitch)-inset,b:Math.round(r.bottom/pitch)-inset};
  }
  const {text}=labels;
  const fill=(l,t,r,b,color)=>{if(l<r&&t<b){ctx.fillStyle=color;ctx.fillRect(l,t,r-l,b-t);}};
  const box=(b,edge,bg)=>{fill(b.l,b.t,b.r,b.b,edge);fill(b.l+1,b.t+1,b.r-1,b.b-1,bg)};
  const isHot=el=>el.matches(':hover,:focus-visible,:focus-within');
  const pb=bounds(pane),tb=bounds(header),sb=bounds(status);
  if(pb.b<=pb.t||tb.b<=top||sb.b<=sb.t){stop();return false;}
  function single(value,b,options={}){
   let s=String(value).toUpperCase(), available=b.r-b.l-2;
   if(bitmap.compactWidth(s)>available){
    let shorter='';
    for(const c of s){if(bitmap.compactWidth(shorter+c+'…')>available)break;shorter+=c;}
    s=shorter+'…';
   }
   text(s,b,{compact:true,pad:1,color:colors.green,...options});
  }
  function button(el,value){
   const b=bounds(el),hot=isHot(el);
   box(b,hot?colors.accent:colors.edge,hot?'#173c29':colors.input);
   single(value??el.textContent.trim(),b,{center:true,color:el.disabled?colors.muted:colors.green});
  }
  function field(el){
   const b=bounds(el);
   box(b,isHot(el)?colors.accent:colors.edge,colors.input);
   ctx.clearRect(b.l+1,b.t+1,Math.max(0,b.r-b.l-2),Math.max(0,b.b-b.t-2));
  }
  fill(0,top,w,h,colors.black);
  fill(0,top,w,tb.b,colors.panel);
  fill(0,tb.b-1,w,tb.b,colors.edge);
  const controls=header.querySelector('.window-controls'),titleRight=bounds(controls).l-2;
  text('БУФЕР',{l:4,t:tb.t,r:titleRight,b:tb.b},{color:colors.green,compact:titleRight-4<bitmap.width('БУФЕР')});
  for(const el of header.querySelectorAll('button')){
   const b=bounds(el),x=Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2),color=colors.green;
   box(b,isHot(el)?colors.accent:colors.edge,colors.input);
   if(el.hasAttribute('data-app-link')){
    fill(x-3,y-2,x+3,y-1,color);fill(x-3,y+2,x+3,y+3,color);
    fill(x-4,y-1,x-3,y+2,color);fill(x+3,y-1,x+4,y+2,color);fill(x-1,y,x+2,y+1,color);
   }else if(el.dataset.action==='pip'){
    fill(x-3,y-2,x+4,y-1,color);fill(x-3,y-1,x-2,y+2,color);fill(x+3,y-1,x+4,y+2,color);
    fill(x-3,y+2,x+4,y+3,color);fill(x,y,x+3,y+2,color);
   }else if(el.dataset.action==='close'){
    for(let i=-2;i<3;i++){fill(x+i,y+i,x+i+1,y+i+1,color);fill(x-i,y+i,x-i+1,y+i+1,color);}
   }else{fill(x-3,y+2,x+4,y+3,color);
    if(el.dataset.action==='maximize'){
     fill(x-3,y-2,x+4,y-1,color);fill(x-3,y-1,x-2,y+2,color);fill(x+3,y-1,x+4,y+2,color);
    }
   }
  }
  ctx.save();ctx.beginPath();ctx.rect(pb.l,pb.t,pb.r-pb.l,pb.b-pb.t);ctx.clip();
  fill(pb.l,pb.t,pb.r,pb.b,colors.panel);
  const row=bounds(heading),copy=$('#copy-buffer'),copyBounds=bounds(copy);
  const textBox={...row,r:copyBounds.l-1};
  text(textBox.r-textBox.l>=bitmap.width('ОБЩИЙ ТЕКСТ')?'ОБЩИЙ ТЕКСТ':'ТЕКСТ',textBox,{pad:0,color:colors.accent});
  button(copy,copyBounds.r-copyBounds.l>=bitmap.compactWidth('КОПИРОВАТЬ')+2?'КОПИРОВАТЬ':'КОПИЯ');
  field(draft);
  const cb=bounds(code),caption=bounds(code.closest('label'));caption.b=cb.t;
  single(caption.r-caption.l>bitmap.compactWidth('КОД СВЯЗИ')+2?'КОД СВЯЗИ':'КОД',caption,{color:colors.muted});
  field(code);
  button($('#buffer-connect'));button($('#buffer-new'));button($('[data-share-session=buffer]'));
  const upload=$('.upload-zone');
  button(upload,bounds(upload).r-bounds(upload).l>=bitmap.compactWidth('ВЫБРАТЬ ФАЙЛЫ · ДО 20 МБ')+2?'ВЫБРАТЬ ФАЙЛЫ · ДО 20 МБ':'ВЫБРАТЬ ФАЙЛЫ');
  const links=files.querySelectorAll('a');
  if(links.length){
   for(const a of links){
    const r=bounds(a); if(r.b<=pb.t||r.t>=pb.b)continue;
    box(r,isHot(a)?colors.accent:colors.edge,colors.input);
    single(a.querySelector('.buffer-file-name')?.textContent||'',bounds(a.querySelector('.buffer-file-name')));
    single(a.querySelector('small')?.textContent||'',bounds(a.querySelector('small')),{color:colors.muted});
   }
  }else single(files.textContent,bounds(files),{color:colors.muted});
  ctx.restore();
  fill(0,sb.t,w,h,colors.panel);fill(0,sb.t,w,sb.t+1,colors.edge);
  const statusText=status.textContent.startsWith('Локальный черновик')?'Локальный черновик':status.textContent;
  single(statusText,{l:3,t:sb.t,r:w-3,b:sb.b},{color:colors.muted});
  const dialog=win.querySelector('.app-link-panel');
  if(dialog){
   const r=bounds(dialog);ctx.clearRect(r.l,r.t,r.r-r.l,r.b-r.t);
  }
  if(win.classList.contains('buffer-drag-over')){
   const r={l:4,t:top+4,r:w-4,b:h-4};box(r,colors.accent,colors.panel);
   text('ОТПУСТИ ФАЙЛЫ',r,{center:true,pad:2,color:colors.focus});
  }
  return true;
 }
 function watch(repaint){
  const rerender=()=>{if(!win.hidden)repaint();};
  const size=new ResizeObserver(rerender);for(const el of [win,pane,files,draft])size.observe(el);
  const changes=new MutationObserver(rerender);
  for(const el of [pane,status])changes.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled']});
  changes.observe(win,{childList:true,attributes:true,attributeFilter:['class']});
  changes.observe(header,{subtree:true,childList:true});
  for(const event of ['pointerover','pointerout','focusin','focusout','scroll','input','change'])win.addEventListener(event,rerender,true);
 }
 return {paint,stop,watch};
}

/** Two tools use one painter for the original form, progress and result elements. */
export function createToolSurfaces(bitmap,ctx){
 const body=document.body,style=document.createElement('style');
 style.textContent=`
body.matrix-tool #console-shell #app-workspace :is(.tools-window,.meme-window,.editor-window,.svyaz-window).matrix-tool-window{
 position:fixed!important;inset:var(--mtop) 0 0!important;width:100%!important;max-width:none!important;
 height:calc(var(--viewport-height,100dvh) - var(--mtop))!important;max-height:none!important;
 min-height:0!important;margin:0!important;border:0!important;box-shadow:none!important;
 background:#08130d!important;transform:none!important;translate:none!important;overflow:hidden!important;
 display:flex!important;flex-direction:column!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window>.titlebar{
 display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;
 min-height:calc(16 * var(--mt))!important;flex:0 0 calc(16 * var(--mt))!important;
 gap:0!important;padding:0 calc(3 * var(--mt))!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window>.titlebar :is(span,.window-controls){flex:initial!important;min-height:0!important}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window>.titlebar button{
 position:static!important;width:calc(14 * var(--mt))!important;min-width:0!important;
 height:calc(14 * var(--mt))!important;min-height:0!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window>.tools-body{
 flex:1 1 0%;display:block!important;align-content:start;overflow:auto!important;overscroll-behavior:contain;
 scrollbar-width:none;width:100%;max-width:calc(225 * var(--mt));margin:0 auto!important;
 padding:calc(3 * var(--mt)) calc(4 * var(--mt))!important;box-sizing:border-box;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body > h2{display:none!important}

body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body :is(form,details,.tool-result,.tool-progress,.tool-link,.tool-drop,.tool-grid){
 box-shadow:none!important;grid-area:auto!important;min-width:0!important;
 padding:0;margin:0 0 calc(3 * var(--mt))!important;border:0;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body p{
 margin:0 0 calc(3 * var(--mt))!important;min-height:calc(9 * var(--mt));font:500 calc(5 * var(--mt)) / calc(8 * var(--mt)) ConsoleMono,monospace!important;
 overflow-wrap:anywhere;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body .tool-drop{
 min-height:calc(22 * var(--mt))!important;height:calc(22 * var(--mt))!important;
 display:block!important;position:relative;cursor:pointer;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body .tool-drop>input{
 position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-width:0;opacity:0;cursor:pointer;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body :is(form,.tool-grid){
 display:grid!important;grid-template-columns:minmax(0,1fr)!important;
 gap:calc(2 * var(--mt))!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body .tool-grid{
 grid-template-columns:repeat(2,minmax(0,1fr))!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body label:not(.tool-drop){
 display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:0!important;
 grid-column:1/-1!important;font:500 calc(5 * var(--mt)) / calc(9 * var(--mt)) ConsoleMono,monospace!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body .tool-grid label{grid-column:auto!important}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body :is(button,a.tool-primary,select,summary,input:not([type=file])){
 display:block!important;min-height:calc(15 * var(--mt))!important;width:100%;min-width:0!important;
 padding:calc(2 * var(--mt))!important;box-sizing:border-box!important;font:500 calc(5 * var(--mt)) / calc(8 * var(--mt)) ConsoleMono,monospace!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body :is(input:not([type=file]),select){
 color:#b5eccc!important;background:#0b1c12!important;box-shadow:none!important;border-radius:0!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body .tool-link{
 display:grid;grid-template-columns:minmax(0,1fr) minmax(calc(20 * var(--mt)),.55fr);
 gap:calc(2 * var(--mt));align-items:center;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body .tool-progress progress{
 display:block;width:100%;height:calc(4 * var(--mt));margin:0 0 calc(2 * var(--mt));
}
body.matrix-tool #console-shell #app-workspace :is(.tools-window,.meme-window,.editor-window,.svyaz-window).matrix-tool-window .tools-body [hidden][hidden],
body.matrix-tool #console-shell #app-workspace :is(.tools-window,.meme-window,.editor-window,.svyaz-window).matrix-tool-window .tools-body :is(p:empty,details:not([open])>:not(summary)){
 display:none!important;
}
body.matrix-tool #console-shell #app-workspace .matrix-tool-window .tools-body form>:is(.tool-note,.tool-details,h3,p){
 grid-column:1/-1!important;
}
body.matrix-tool>.console-focus-frame{z-index:2147482499!important}
body.matrix-tool>#toast{z-index:2147483642!important}
@media(max-width:470px){
 body.matrix-tool #console-shell #app-workspace .matrix-tool-window>.titlebar button{width:calc(11 * var(--mt))!important}
 body.matrix-tool #console-shell #app-workspace .matrix-tool-window>.titlebar .window-controls{gap:0!important;padding:0!important}
}

body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window>.meme-root{
 flex:1 1 0%;min-height:0;overflow:auto;background:#130b11;
}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-stage{background:#090609!important}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root :is(.meme-toolbar,.meme-footer,.meme-controls,.meme-stage){
 padding-inline:calc(4 * var(--mt))!important;
}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root :is(button,summary,textarea,select,label.meme-file-button){
 min-height:calc(15 * var(--mt))!important;min-width:0;
}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root .meme-empty{
 padding:calc(3 * var(--mt))!important;
}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root .meme-empty svg{display:none}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root .meme-empty h2{width:100%;min-height:calc(10 * var(--mt));line-height:calc(10 * var(--mt))}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root [data-meme=crop]{min-width:calc(37 * var(--mt))!important}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root textarea{
 resize:none!important;
 background:#1c1019!important;color:#f7c9df!important;box-shadow:none!important;
 font:500 calc(5 * var(--mt)) / calc(7 * var(--mt)) ConsoleMono,monospace!important;
}
body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window .meme-root [hidden]{display:none!important}
@media(max-width:470px){
 body.matrix-tool #console-shell #app-workspace #window-meme.matrix-tool-window>.titlebar button{width:calc(10 * var(--mt))!important}
}
body.matrix-tool #window-editor.matrix-tool-window .editor-root {
 zoom:1;overflow:auto;overscroll-behavior:contain;scrollbar-width:none;
 font:500 calc(5 * var(--mt)) / calc(8 * var(--mt)) ConsoleMono,monospace!important;
}
body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(button,select,input:not([type=file]),textarea,a) {
 font:inherit!important;min-height:max(44px,calc(14 * var(--mt)));border-radius:0;
}
body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(input:not([type=range]):not([type=color]),textarea) {
 color:#d4f6e5;background:#13271e;border:0;opacity:1;
}
body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(.edit-panel-head,.edit-transport,.edit-status,#edit-export,.edit-properties) {
 padding-inline:calc(4 * var(--mt));
}
body.matrix-tool #window-editor.matrix-tool-window .edit-panel-head{min-height:calc(16 * var(--mt));height:auto}
body.matrix-tool #window-editor.matrix-tool-window .edit-transport button{min-width:44px}
body.matrix-tool #window-editor.matrix-tool-window .editor-root .edit-timeline-handle{
 min-height:0;width:max(22px,calc(7 * var(--mt)))!important
}
body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(#edit-empty,#edit-audio-preview) svg{display:none}
body.matrix-tool #window-editor.matrix-tool-window .editor-root #edit-stage-busy{padding:calc(3 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(.edit-status p,#edit-source-info,.edit-help){min-height:calc(15 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window .editor-root .edit-track-label{padding-inline:calc(2 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(.edit-timeline-ruler span,.edit-timeline-labels span,.edit-panel-head output){min-width:calc(36 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window  .editor-root .edit-transport>span{flex:0 0 calc(5 * var(--mt));text-align:center}
body.matrix-tool #window-editor.matrix-tool-window .editor-root #edit-replace{min-width:calc(28 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window .editor-root #edit-export :is(button,a){min-width:calc(36 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window .editor-root #edit-export label>span{min-width:calc(27 * var(--mt))}
body.matrix-tool #window-editor.matrix-tool-window .editor-root #edit-export select{min-width:calc(24 * var(--mt))}


@container(max-width:740px){
 body.matrix-tool #window-editor.matrix-tool-window .editor-root :is(#edit-export,.edit-tabs){position:static}
 body.matrix-tool #window-editor.matrix-tool-window .edit-transport button{width:44px}
}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window:not([hidden]){
 position:fixed!important;inset:var(--mtop) 0 0!important;width:100%!important;max-width:none!important;
 height:calc(var(--viewport-height,100dvh) - var(--mtop))!important;max-height:none!important;
 min-height:0!important;margin:0!important;border:0!important;box-shadow:none!important;
 transform:none!important;translate:none!important;overflow:hidden!important;
 display:flex!important;flex-direction:column!important;background:#050a09!important;
}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>.titlebar{
 display:flex!important;flex-wrap:nowrap!important;flex-direction:row!important;
 gap:0!important;margin:0!important;padding:0 calc(3 * var(--mt))!important;
}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>.titlebar>.window-controls{
 display:flex!important;position:static!important;flex:0 0 auto!important;gap:0;
}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window .console-resize{display:none!important}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window .sv-contact-meta{min-width:calc(22 * var(--mt))}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window .sv-contact-meta time{white-space:nowrap}
@media(min-width:951px){
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window[data-wide=true] .sv-shell{
  grid-template-columns:clamp(calc(75 * var(--mt)),27%,calc(110 * var(--mt))) minmax(0,1fr);
 }
}

body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>.titlebar>.window-controls>button{
 width:max(calc(13 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
 height:max(calc(13 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
 min-width:0!important;min-height:0!important;
}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>.titlebar{
 min-height:max(calc(16 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
 flex-basis:max(calc(16 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
}
body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>#overview-tabs{
 position:static;inset:auto;flex-shrink:0;padding-inline:calc(3 * var(--mt));
}
body.matrix-tool #window-svyaz.matrix-tool-window .sv-surface:not([hidden]){
 min-height:0;min-width:0;flex:1 1 0%;
}
body.matrix-tool #window-svyaz.matrix-tool-window #svyaz-root .sv-auth-wrap{
 width:100%;max-width:calc(218 * var(--mt));margin:0 auto;
}
body.matrix-tool #window-svyaz.matrix-tool-window #svyaz-root :is(.sv-auth-card,.sv-auth-wrap){
 box-shadow:none!important;border-radius:0!important;outline:none!important;
}
body.matrix-tool #window-svyaz.matrix-tool-window :is(.sv-form input,.sv-search input,.sv-compose textarea){
 color:#d1f3de!important;background:#10251b!important;text-shadow:none!important;
 box-shadow:none!important;border-radius:0!important;
}
body.matrix-tool #window-svyaz.matrix-tool-window :is(.sv-form input,.sv-search input,.sv-compose textarea)::placeholder{
 color:#86ae99!important;
}
body.matrix-tool #window-svyaz.matrix-tool-window .sv-auth-links{gap:calc(2 * var(--mt))}
body.matrix-tool #window-svyaz.matrix-tool-window .sv-auth-links button{
 flex:1 1 50%;min-width:0;min-height:calc(15 * var(--mt));padding:0!important;
}
body.matrix-tool #window-svyaz.matrix-tool-window #svyaz-root :is(.sv-form label,.sv-form button,.sv-error,.sv-strip){
 line-height:calc(8 * var(--mt))!important;
}
body.matrix-tool #window-svyaz.matrix-tool-window .sv-contact{min-height:calc(21 * var(--mt))}
body.matrix-tool #window-svyaz.matrix-tool-window .sv-contact-list{scrollbar-width:none}
body.matrix-tool #window-svyaz.matrix-tool-window[data-account-state=guest] #overview-tabs{display:none}
body.matrix-tool #window-svyaz.matrix-tool-window #overview-tabs button{min-width:calc(34 * var(--mt));padding:0 calc(3 * var(--mt))}
body.matrix-tool :is(.social-picker,.sv-voice-floating,.sv-photo-viewer){z-index:2147483642!important}

@media (orientation:landscape) and (max-height:480px) and (pointer:coarse){
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window{
  --sv-compact-hit:calc(44px / var(--ui-scale,1));
  --ui-control-height:var(--sv-compact-hit);
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>#overview-tabs:not([hidden]){
  min-height:0;height:var(--sv-compact-hit);padding-block:0;align-items:stretch;
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>#overview-tabs button{
  height:var(--sv-compact-hit)!important;min-height:0!important;align-self:center!important;
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window #svyaz-chat :is(.sv-topline,.sv-search,.social-tabs){
  min-height:var(--sv-compact-hit)!important;height:var(--sv-compact-hit)!important;
  max-height:var(--sv-compact-hit)!important;flex:0 0 var(--sv-compact-hit)!important;padding-block:0!important;align-items:center;
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window #svyaz-chat :is(.sv-search input,.sv-search button,.social-tabs button,.sv-identity,.sv-tools button){
  min-height:0!important;height:var(--sv-compact-hit)!important;max-height:var(--sv-compact-hit)!important;
  padding-block:0!important;line-height:1!important;
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window #svyaz-chat :is(.sv-identity small,.sv-topline .sv-avatar){display:none}
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window #svyaz-chat .sv-contact{
  min-height:var(--sv-compact-hit)!important;padding-block:0!important;
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window>#overview-tabs button{
  margin:0!important;top:0!important;transform:none!important;box-sizing:border-box;
 }
 body.console-desktop.matrix-tool #window-svyaz.matrix-tool-window #svyaz-chat .sv-bottom{display:none}
}
`;
 document.head.append(style);
 const toolsColors={page:'#020704',surface:'#08130d',input:'#0b1c12',edge:'#2d5840',text:'#b5eccc',muted:'#80ae91',on:'#76e6a7'};
 const font=makeText(bitmap,ctx);
 return Object.fromEntries(['convert','download','meme','editor','svyaz'].map(id=>{
  const media=id==='meme',editor=id==='editor',chat=id==='svyaz';
  const colors=media?{page:'#090609',surface:'#170e16',input:'#241421',edge:'#673951',text:'#f6c2df',muted:'#bd8aa6',on:'#fd9fca'}:editor?{page:'#040a09',surface:'#0c1a15',input:'#13271e',edge:'#34604d',text:'#cbf5e2',muted:'#93b9a8',on:'#b6e777'}:chat?{page:'#050a09',surface:'#0a1713',input:'#10251b',edge:'#305a48',text:'#d1f3de',muted:'#91b5a5',on:'#8ce4b8'}:toolsColors;
  const win=document.getElementById('window-'+id),pane=chat?win:document.getElementById(media?'meme-root':editor?'editor-root':id+'-tool'),title=win?.querySelector('.titlebar');
  if(!win||!pane||!title)return [id,null];
  const stop=()=>{win.classList.remove('matrix-tool-window');body.classList.remove('matrix-tool');};
  function paint({pitch,width:w,height:h,headerRows:top,active}){
   if(!active||win.hidden||win.ownerDocument!==document){stop();return false;}
   const zoom=Number(body.style.zoom)||1,cell=pitch/zoom+'px',offset=top*pitch/zoom+'px';
   if(win.style.getPropertyValue('--mt')!==cell)win.style.setProperty('--mt',cell);
   if(win.style.getPropertyValue('--mtop')!==offset)win.style.setProperty('--mtop',offset);
   body.classList.add('matrix-tool');win.classList.add('matrix-tool-window');
   const bounds=el=>{const r=el.getBoundingClientRect();return {l:Math.round(r.left/pitch),r:Math.round(r.right/pitch),t:Math.round(r.top/pitch),b:Math.round(r.bottom/pitch)}};
   const fill=(b,color)=>{if(b.r>b.l&&b.b>b.t){ctx.fillStyle=color;ctx.fillRect(b.l,b.t,b.r-b.l,b.b-b.t)}};
   const inset=(b,n)=>({l:b.l+n,t:b.t+n,r:b.r-n,b:b.b-n});
   const box=(b,edge,fillColor)=>{fill(b,edge);fill(inset(b,1),fillColor)};
   const hot=el=>el.matches(':hover,:focus-within');
   const elText=el=>[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
   function words(value,b,{primary=false,center=false,full=false,quiet=false}={}){
    let name=value.trim().toUpperCase(),max=b.r-b.l-2;
    if(primary&&bitmap.compactWidth(name)>max){
     let s='';for(const ch of name){if(bitmap.compactWidth(s+ch+'…')>max)break;s+=ch;}
     name=s+'…';
    }
    font.text(name,b,{center,pad:1,compact:!full,color:quiet?colors.muted:colors.text});
   }
   const tb=bounds(title),pb=chat?{...bounds(pane),t:tb.b}:bounds(pane);
   if(pb.b<=pb.t||tb.b<=top){stop();return false;}
   fill({l:0,t:top,r:w,b:h},colors.page);
   fill({l:0,t:top,r:w,b:tb.b},colors.surface);
   fill({l:0,t:tb.b-1,r:w,b:tb.b},colors.edge);
   const control=bounds(title.querySelector('.window-controls'));
   const titleText=win.dataset.title;
   if(chat){
    const textBounds={l:3,r:control.l-1,t:tb.t,b:tb.b};
    words('СВЯЗЬ',textBounds,{full:control.l>=58,primary:true});
    const unread=title.querySelector('#svyaz-unread')?.textContent?.match(/[0-9]+/)?.[0];
    if(unread&&control.l>=39){
     const n=Number(unread)>99?'99+':unread;
     const r=control.l-2,l=r-Math.max(9,bitmap.compactWidth(n)+2);
     const y=Math.floor((tb.t+tb.b)/2);
     if(l>=24){const b={l,r,t:y-4,b:y+4};box(b,colors.on,colors.input);words(n,b,{center:true});}
    }
   }else words(titleText,{l:3,r:control.l-1,t:tb.t,b:tb.b},{full:true});
   for(const el of title.querySelectorAll('button')){
    const b=bounds(el),x=Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2);
    const square=(l,t,r,b)=>fill({l,t,r,b},colors.text);
    box(b,hot(el)?colors.on:colors.edge,colors.input);
    if(el.dataset.action==='close'){
     for(let i=-2;i<=2;i++){square(x+i,y+i,x+i+1,y+i+1);square(x-i,y+i,x-i+1,y+i+1);}
    }else if(el.dataset.action==='minimize')square(x-3,y+2,x+4,y+3);
    else{
     square(x-3,y-2,x+4,y-1);square(x-3,y+2,x+4,y+3);
     square(x-3,y-1,x-2,y+2);square(x+3,y-1,x+4,y+2);
     if(el.dataset.action==='pip')square(x,y,x+3,y+2);else if(el.hasAttribute('data-app-link'))square(x-1,y,x+2,y+1);
    }
   }
   ctx.save();
   try{
    ctx.beginPath();ctx.rect(pb.l,pb.t,pb.r-pb.l,pb.b-pb.t);ctx.clip();
    fill(pb,colors.surface);
    if(media){
     for(const [sel,color] of [['.meme-toolbar',colors.surface],['.meme-stage',colors.page],['.meme-controls',colors.surface],['.meme-footer',colors.surface]]){
      const region=pane.querySelector(sel);
      if(region?.getClientRects().length){const rb=bounds(region);fill(rb,color);fill({...rb,b:rb.t+1},colors.edge);}
     }
     const bitmap=pane.querySelector('.meme-image-wrap:not([hidden])');
     if(bitmap?.getClientRects().length){
      const image=bounds(bitmap);box({l:image.l-1,r:image.r+1,t:image.t-1,b:image.b+1},colors.edge,colors.page);
      ctx.clearRect(image.l,image.t,image.r-image.l,image.b-image.t);
     }
    }
    if(chat){
     const visible=el=>!!el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
     const pick=(sel,fn)=>{const el=pane.querySelector(sel);if(visible(el))fn(el,bounds(el))};
     const cut=(b,pad=0)=>{const {l,r,t,b:bt}=inset(b,pad);ctx.clearRect(l,t,Math.max(0,r-l),Math.max(0,bt-t))};
     const clampBox=(b,s)=>({l:Math.max(b.l,s.l),r:Math.min(b.r,s.r),t:Math.max(b.t,s.t),b:Math.min(b.b,s.b)});
     const clip=(b,fn)=>{
      const a=clampBox(b,pb);if(a.l>=a.r||a.t>=a.b)return;
      ctx.save();try{ctx.beginPath();ctx.rect(a.l,a.t,a.r-a.l,a.b-a.t);ctx.clip();fn()}finally{ctx.restore()}
     };
     const label=(el,b,opts={})=>words(typeof el==='string'?el:el.textContent,b,{primary:true,...opts});
     const button=(el,b,value=el.textContent)=>{
      const current=el.matches('.sv-primary,[aria-selected=true],[aria-current=true],[aria-pressed=true]'),focus=hot(el);
      box(b,current||focus?colors.on:colors.edge,current?'#183b2c':colors.input);
      if(el.matches('.sv-back,.sv-send,.sv-attach,.sv-search button')||value.trim().endsWith('→')){
       const withLabel=value.trim().endsWith('→')&&!el.matches('.sv-send');
       const x=withLabel?b.r-7:Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2),c=el.matches(':disabled')?colors.muted:colors.text;
       if(withLabel)label(value.replace(/→\s*$/,''),{...b,r:b.r-13},{center:true});
       const line=(l,t,r,bt)=>fill({l,r,t,b:bt},c);
       if(el.matches('.sv-back,.sv-send')||withLabel){
        const d=el.matches('.sv-back')?-1:1;
        line(x-3,y,x+4,y+1);
        for(let i=0;i<3;i++){line(x+(3-i)*d,y-i,x+(3-i)*d+1,y-i+1);line(x+(3-i)*d,y+i,x+(3-i)*d+1,y+i+1);}
       }else if(el.matches('.sv-attach')){line(x-3,y,x+4,y+1);line(x,y-3,x+1,y+4);}
       else for(let i=-2;i<=2;i++){line(x+i,y+i,x+i+1,y+i+1);line(x-i,y+i,x-i+1,y+i+1);}
      }else label(value,b,{center:true,quiet:el.matches(':disabled')});
     };
     const field=(el,b)=>{box(b,hot(el)?colors.on:colors.edge,colors.input);cut(b,1)};
     pick('.overview-tabs',(el,b)=>{
      fill(b,colors.surface);fill({...b,t:b.b-1},colors.edge);
      for(const tab of el.querySelectorAll('button'))if(visible(tab))button(tab,clampBox(bounds(tab),b));
     });
     pick('#svyaz-root',(root,rb)=>clip(rb,()=>{
      fill(rb,colors.page);
      for(const card of root.querySelectorAll('.sv-auth-card')){
       const cb=bounds(card);box(cb,colors.edge,colors.surface);
       for(const el of card.querySelectorAll('button,summary,input,label,small,.sv-strip,.sv-error,.sv-profile-identity b,.sv-profile-identity span,.sv-stats-body strong,.sv-stats-body p,.console-achievements span')){
        if(!visible(el))continue;
        const b=bounds(el);
        if(el.matches('button,summary'))button(el,b);
        else if(el.localName==='input')field(el,b);
        else if(el.localName==='label'){
         const input=el.querySelector('input');
         if(input&&visible(input))label(elText(el),{...b,l:b.l+2,b:bounds(input).t},{quiet:true});
        }else if(el.matches('.sv-error')){
         words(el.textContent,{...b,l:b.l+2},{quiet:false});
        }else if(el.matches('.sv-strip')){fill(b,'#14291f');label(el,{...b,l:b.l+3},{quiet:true});}
        else label(el,b,{quiet:el.matches('small,span')});
       }
      }
     }));
     pick('#svyaz-chat',(root,rb)=>clip(rb,()=>{
      fill(rb,colors.page);
      for(const sel of ['.sv-topline','.sv-contacts','.sv-chat-head','.sv-compose','.sv-bottom']){
       const el=root.querySelector(sel);if(!visible(el))continue;
       const b=bounds(el);fill(b,colors.surface);fill({...b,t:b.b-1},colors.edge);
      }
      for(const sel of ['.sv-tools','.sv-peer-actions','.sv-log','.sv-photo-preview','.social-friends']){
       const el=root.querySelector(sel);if(!visible(el))continue;
       // Attachments, user messages, keyboard, call controls and receipt states remain real DOM.
       cut(bounds(el));
      }
      for(const el of root.querySelectorAll('.sv-back,.sv-attach,.sv-send,.sv-options>summary,.sv-search button,.sv-empty button,.social-tabs button')){
       if(!visible(el)||el.closest('.sv-view-ghost'))continue;
       const b=bounds(el);
       const value=el.matches('.sv-back')?'‹':el.matches('.sv-attach')?'+':el.matches('.sv-send')?'→':el.matches('.sv-options>summary')?'…':el.textContent;
       button(el,b,value);
      }
      for(const el of root.querySelectorAll('.sv-search input,.sv-compose textarea'))if(visible(el)&&!el.closest('.sv-view-ghost'))field(el,bounds(el));
      for(const el of root.querySelectorAll('.sv-empty b,.sv-empty p,.sv-error,.sv-bottom span')){
       if(!visible(el)||el.closest('.sv-view-ghost'))continue;
       words(el.textContent.replace(/^●\s*/,'').replace('ПОДКЛЮЧЕНО','НА СВЯЗИ'),bounds(el),{center:el.closest('.sv-empty')!==null,quiet:el.matches('p,.sv-bottom span'),full:el.matches('b')});
      }
      for(const el of root.querySelectorAll('.sv-peer,.sv-peer-avatar,.sv-identity'))if(visible(el)&&!el.closest('.sv-view-ghost'))cut(bounds(el));
      const list=root.querySelector('.sv-contact-list');
      if(visible(list))clip(bounds(list),()=>{
       for(const el of list.querySelectorAll('.sv-contact')){
        const b=bounds(el);if(b.b<=pb.t||b.t>=pb.b)continue;
        const selected=el.matches('[aria-current=true]');
        box(b,selected||hot(el)?colors.on:colors.edge,selected?'#173528':colors.input);
        const icon=el.querySelector('.sv-contact-avatar'),meta=el.querySelector('.sv-contact-meta');
        if(visible(icon)){const a=bounds(icon);box(a,icon.matches('.online')?colors.on:colors.edge,colors.page);label(icon,a,{center:true});}
        const left=visible(icon)?bounds(icon).r+2:b.l+2,right=visible(meta)?Math.max(left,bounds(meta).l-2):b.r-2;
        for(const e of el.querySelectorAll('strong,small')){
         if(visible(e))label(e,{...bounds(e),l:left,r:right},{quiet:e.localName==='small'});
        }
        if(visible(meta)){
         const badge=meta.querySelector('b'),time=meta.querySelector('time'),mb=bounds(meta);
         if(visible(time))label(time,{...bounds(time),l:mb.l,r:b.r-2},{quiet:true});
         if(visible(badge)){const bb=inset(bounds(badge),-1);box(bb,colors.on,'#224b38');label(badge,bb,{center:true});}
        }
       }
       const empty=list.querySelector('p,.sv-list-empty');
       if(visible(empty))words(empty.textContent,bounds(empty),{quiet:true});
      });
      // Popup UI intentionally stays native above the canvas and its hit targets.
      for(const popup of pane.querySelectorAll('.sv-options[open]>div,.social-feed:not([hidden]),.sv-voice-panel:not([hidden])')){
       if(visible(popup))cut(bounds(popup));
      }
     }));
    }
    if(editor){
     const visible=el=>!!el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
     const get=sel=>pane.querySelector(sel);
     const show=(sel,fn)=>{const el=get(sel);if(visible(el))fn(bounds(el),el)};
     const clip=(b,fn)=>{
      if(b.b<=pb.t||b.t>=pb.b||b.l>=b.r||b.t>=b.b)return;
      ctx.save();try{ctx.beginPath();ctx.rect(b.l,b.t,b.r-b.l,b.b-b.t);ctx.clip();fn()}finally{ctx.restore()}
     };
     const cut=b=>ctx.clearRect(b.l,b.t,Math.max(0,b.r-b.l),Math.max(0,b.b-b.t));
     const drawLabel=(el,b,options={})=>words(el.textContent,b,{primary:true,...options});
     function editNodes(root,selector){
      for(const el of root.querySelectorAll(selector)){
       if(!visible(el))continue;
       const b=bounds(el);if(b.b<=pb.t||b.t>=pb.b)continue;
       const tag=el.localName,disabled=el.matches(':disabled');
       if(tag==='button'||tag==='a'){
        const primary=el.matches('#edit-open,#edit-submit,#edit-result,[aria-selected=true]');
        box(b,hot(el)||primary&&!disabled?colors.on:colors.edge,primary&&!disabled?'#203b2c':colors.input);
        if(el.id==='edit-play'){
         const x=Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2),color=disabled?colors.muted:colors.text;
         if(el.textContent==='Ⅱ'){fill({l:x-2,r:x-1,t:y-3,b:y+4},color);fill({l:x+1,r:x+2,t:y-3,b:y+4},color)}
         else for(let j=0;j<5;j++)fill({l:x-2+j,r:x-1+j,t:y-3+Math.floor(j/1.5),b:y+4-Math.floor(j/1.5)},color);
        }else if(el.id==='edit-to-start'){
         const x=Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2),color=disabled?colors.muted:colors.text;
         fill({l:x-4,r:x-3,t:y-3,b:y+4},color);fill({l:x-2,r:x+4,t:y,b:y+1},color);
         for(let j=0;j<3;j++)fill({l:x-2+j,r:x-1+j,t:y-j,b:y+j+1},color);
        }else drawLabel(el,b,{center:true,quiet:disabled});
       }else if(tag==='select'){
        box(b,hot(el)?colors.on:colors.edge,colors.input);
        words(el.selectedOptions[0]?.textContent||'',{...b,r:b.r-3},{primary:true,quiet:disabled});
        const x=b.r-3,y=Math.floor((b.t+b.b)/2);
        fill({l:x-1,r:x+2,t:y-1,b:y},colors.muted);fill({l:x,r:x+1,t:y,b:y+1},colors.muted);
       }else if(tag==='textarea'||tag==='input'){
        if(el.type==='file')continue;
        box(b,hot(el)?colors.on:colors.edge,colors.input);
        if(el.type==='range'){
         const x=b.l+3,r=b.r-3,y=Math.floor((b.t+b.b)/2),current=Math.round(x+(r-x)*(+el.value- +el.min)/(+el.max- +el.min||1));
         fill({l:x,r,t:y,b:y+1},colors.edge);fill({l:x,r:current,t:y,b:y+1},colors.on);
         fill({l:current-1,r:current+2,t:y-2,b:y+3},disabled?colors.muted:colors.on);
        }else if(el.type==='color') fill(inset(b,3),el.value);
        else cut(inset(b,1));
       }else if(tag==='progress'){
        box(b,colors.edge,colors.input);
        fill({l:b.l+1,r:b.l+1+Math.round((b.r-b.l-2)*Math.max(0,el.position)),t:b.t+1,b:b.b-1},colors.on);
       }else if(tag==='label'){
        const field=el.querySelector('input,textarea');
        if(field&&visible(field))words(elText(el),{...b,b:field.type==='color'?b.b:bounds(field).t,r:field.type==='color'?bounds(field).l:b.r},{primary:true,quiet:true});
       }else if(el.matches('.edit-status p,#edit-source-info,.edit-help')){
        words(el.textContent,b,{quiet:true});
       }else if(el.matches('#edit-empty>span')){
        words('ДО 256 МБ · ДО 10 МИН',b,{center:true,quiet:true});
       }else if(el.id==='edit-main-label'){
        words(el.textContent==='Видео'?'КЛИП':el.textContent,b,{quiet:true});
       }else if(el.matches('.edit-transport>span')){
        const x=Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2);
        fill({l:x,r:x+1,t:y-1,b:y+1},colors.muted);
       }else drawLabel(el,b,{quiet:!el.matches('output,#edit-name,.edit-property-heading')});
      }
     }
     for(const [sel,color] of [['.edit-preview',colors.page],['.edit-panel-head',colors.surface],['.edit-inspector',colors.surface],['.edit-timeline-panel',colors.surface],['.edit-transport',colors.surface],['#edit-export',colors.surface]]) {
      for(const region of pane.querySelectorAll(sel))if(visible(region)){const rb=bounds(region);fill(rb,color);fill({...rb,b:rb.t+1},colors.edge);}
     }
     show('#edit-frame',b=>cut(b));
     if(visible(get('.edit-drag-over .edit-drop-hint'))){
      show('.edit-drop-hint',(b,el)=>{box(b,colors.on,colors.input);drawLabel(el,b,{center:true})});
     }else if(visible(get('#edit-stage-busy'))){
      show('#edit-stage-busy',(b,el)=>{fill(b,colors.page);clip(b,()=>editNodes(el,'span,progress,button'))});
     }else{
      for(const sel of ['#edit-empty','#edit-audio-preview'])show(sel,(b,el)=>clip(b,()=>editNodes(el,'span,p,button')));
     }
     show('.edit-preview',(_,el)=>editNodes(el,'.edit-panel-head span,#edit-replace,.edit-transport button'));
     show('.edit-transport',b=>{
      const last=get('#edit-play'),now=get('#edit-clock'),total=get('#edit-total');
      if(last&&now&&total)words(now.value+' / '+total.value,{...b,l:bounds(last).r+3,r:b.r-3},{center:true,primary:true});
     });
     show('.edit-tabs',(_,el)=>editNodes(el,'button'));
     show('.edit-properties',(b,el)=>clip(b,()=>editNodes(el,'label,textarea,button,input,p')));
     show('#edit-export',(_,el)=>editNodes(el,'label>span,button,select,a'));
     show('.edit-status',(_,el)=>editNodes(el,'p,progress'));
     show('.edit-timeline-panel',(_,el)=>editNodes(el,'.edit-panel-head span,output,.edit-track-label,.edit-timeline-ruler span,.edit-timeline-labels span'));
     show('.edit-timeline-track',(b,track)=>{
      box(b,colors.edge,colors.input);
      if(track.querySelector('.edit-timeline-filmstrip canvas'))cut(inset(b,1));
      if(!track.parentElement.classList.contains('has-source')){
       words('КЛИП ПОЯВИТСЯ ЗДЕСЬ',b,{center:true,quiet:true,primary:true});return;
      }
      clip({...b,t:b.t-1,b:b.b+1},()=>{
       for(const sel of ['.edit-timeline-shade-before','.edit-timeline-shade-after'])show(sel,sb=>fill(sb,'#010905ad'));
       show('.edit-timeline-selection',sb=>{fill({...sb,b:sb.t+1},colors.on);fill({...sb,t:sb.b-1},colors.on)});
       for(const handle of track.querySelectorAll('.edit-timeline-handle')){
        const hb=bounds(handle),x=Math.floor((hb.l+hb.r)/2),y=Math.floor((hb.t+hb.b)/2);
        box(hb,hot(handle)?colors.text:colors.edge,colors.on);
        for(const offset of [-1,1])fill({l:x+offset,r:x+offset+1,t:y-2,b:y+3},colors.page);
       }
       show('.edit-timeline-playhead',ph=>fill({...ph,r:ph.l+1},colors.text));
      });
     });
     for(const lane of pane.querySelectorAll('.edit-track-lane')){
      if(!visible(lane))continue;
      const lb=bounds(lane);box(lb,colors.edge,colors.input);
      clip(lb,()=>{for(const el of lane.children){
       if(!visible(el))continue;
       const b=bounds(el);if(el.id.endsWith('-clip'))box(b,colors.edge,'#254a38');
       drawLabel(el,el.id.endsWith('-clip')?b:{...lb,l:lb.l+2},{quiet:!el.id.endsWith('-clip')});
      }});
     }
    }
    const nodes=editor||chat?[]:pane.querySelectorAll('p,h3,summary,label,button,select,input,progress,a.tool-primary'+(media?',h2,b,output,textarea,.meme-file-name,.meme-empty small':''));
    for(const el of nodes){
     if(el.closest('[hidden]')||!el.getClientRects().length)continue;
     const fold=el.closest('details');if(fold&&!fold.open&&el!==fold.querySelector('summary'))continue;
     const b=bounds(el),region=media&&el.closest('.meme-controls');
     if(region){
      const room=bounds(region);
      if(b.b<=room.t||b.t>=room.b)continue;
     }
     if(b.b<=pb.t||b.t>=pb.b||b.r<=b.l||b.b<=b.t)continue;
     const tag=el.localName,room=region&&bounds(region);
     if(room){ctx.save();ctx.beginPath();ctx.rect(room.l,room.t,room.r-room.l,room.b-room.t);ctx.clip();}
     try{
     if(tag==='input'||tag==='textarea'){
      if(el.type==='file')continue;
      box(b,hot(el)?colors.on:colors.edge,colors.input);
      if(el.type==='checkbox'){
       if(el.checked)fill(inset(b,2),colors.on);
      }else if(el.type==='color')fill(inset(b,1),el.value);
      else if(el.type==='range'){
       const x=b.l+2,y=Math.floor((b.t+b.b)/2),right=b.r-2,p=(+el.value- +el.min)/(+el.max- +el.min||1),position=Math.round(x+(right-x)*p);
       fill({l:x,r:right,t:y,b:y+1},colors.muted);fill({l:position-1,r:position+2,t:y-2,b:y+3},colors.on);
      }else ctx.clearRect(b.l+1,b.t+1,Math.max(0,b.r-b.l-2),Math.max(0,b.b-b.t-2));
     }else if(tag==='progress'){
      box(b,colors.edge,colors.input);fill({l:b.l+1,t:b.t+1,r:b.l+1+Math.round((b.r-b.l-2)*el.position),b:b.b-1},colors.on);
     }else if(tag==='select'){
      box(b,hot(el)?colors.on:colors.edge,colors.input);
      words(el.selectedOptions[0]?.textContent||'',{...b,r:b.r-7},{primary:true});
      const x=b.r-5,y=Math.floor((b.t+b.b)/2);
      fill({l:x-2,r:x-1,t:y-1,b:y},colors.text);fill({l:x+2,r:x+3,t:y-1,b:y},colors.text);
      fill({l:x-1,r:x+2,t:y,b:y+1},colors.text);fill({l:x,r:x+1,t:y+1,b:y+2},colors.text);
     }else if(el.matches('button,summary,a.tool-primary,.tool-drop,.meme-file-button')){
      let name=tag==='summary'?(el.parentElement.open?'− ':'+ ')+elText(el):el.matches('.tool-drop')?(id==='convert'?'ВЫБРАТЬ ФАЙЛ':'ВЫБРАТЬ'):el.textContent.trim().replace(/\s+[→↓]$/,'');
      if(media&&el.matches('.meme-file-button'))name='ОТКРЫТЬ';
      if(el.id==='download-paste')name='ВСТАВИТЬ';
      const selected=el.matches('.tool-primary,.tool-drop,.meme-primary,[data-meme=save]');
     if(el.matches('.tool-drop')){
      box(b,hot(el)||el.classList.contains('drag-over')?colors.on:colors.edge,colors.input);
      const mid=Math.floor((b.t+b.b)/2);
      words(name,{...b,b:mid+1},{center:true,primary:true});
      words('ДО 256 МБ',{...b,t:mid+2},{center:true,quiet:true});
      continue;
     }
      box(b,hot(el)||selected?colors.on:colors.edge,hot(el)?(media?'#44223a':'#17412c'):colors.input);
      words(name,b,{primary:true,center:true,quiet:el.disabled});
     }else if(tag==='label'){
      const input=el.querySelector('input,select,textarea');const value=elText(el);
      if(value){
       const labelBox=input?(input.type==='checkbox'?{...b,l:bounds(input).r+1}:{...b,b:bounds(input).t,r:el.querySelector('output')?bounds(el.querySelector('output')).l-1:b.r}):b;
       words(value,labelBox,{primary:true,quiet:true});
      }
      if(input&&el.querySelector('small'))words(el.querySelector('small').textContent,{...b,t:bounds(input).b},{quiet:true});
     }else{
      const value=el.matches('.tool-lead')?(id==='convert'?'ФАЙЛ В НОВЫЙ ФОРМАТ':'ВИДЕО И АУДИО · YOUTUBE И TIKTOK'):
       media&&el.id==='meme-status'&&el.textContent.startsWith('Открой изображение')?'ФОТО ДО 20 МБ':el.textContent;
      words(value,b,{center:media&&tag==='h2',full:['h3','h2','b','output'].includes(tag),quiet:!el.matches('.tool-status,h3'),primary:el.id==='convert-name'||el.matches('.tool-lead,.meme-file-name,#meme-status,output')});
     }
     }finally{if(room)ctx.restore();}
    }
   }finally{ctx.restore();}
   const popup=win.querySelector('.app-link-panel');
   if(popup){const b=bounds(popup);ctx.clearRect(b.l,b.t,b.r-b.l,b.b-b.t);}
   return true;
  }
  function watch(repaint){
   const draw=()=>{if(!win.hidden)repaint()};
   const resize=new ResizeObserver(draw);resize.observe(win);if(pane!==win)resize.observe(pane);
   if(chat){for(const region of pane.querySelectorAll('.sv-surface,.overview-tabs,.sv-voice-panel'))resize.observe(region);}
   const observer=new MutationObserver(draw);
   for(const region of chat?pane.querySelectorAll('.sv-surface,.overview-tabs,.sv-voice-panel'):[pane]){
    observer.observe(region,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open','disabled','value','class','aria-selected','aria-current']});
   }
   if(editor){
    // Observe timeline geometry only; ordinary playback/pointer changes coalesce in the shared frame scheduler.
    const timeline=new MutationObserver(records=>{if(records.some(({target})=>target.matches('.edit-timeline,[id$="-clip"]')))draw()});
    timeline.observe(pane,{subtree:true,attributes:true,attributeFilter:['style']});
   }
   observer.observe(title,{subtree:true,childList:true});
   observer.observe(win,{childList:true});
   for(const event of ['scroll','pointerover','pointerout','focusin','focusout','input','change','toggle'])win.addEventListener(event,draw,true);
  }
  return [id,{paint,stop,watch}];
 }));
}
