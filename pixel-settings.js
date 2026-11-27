/** App-specific paint and DOM alignment for the native Settings window. */
const extra={
'0':'75557','1':'26227','2':'71247','3':'71317','4':'55711','5':'74617','6':'74757','7':'71122','8':'75757','9':'75717',
'…':'00005','∨':'00052','/':'11244','→':'02720','×':'50500','?':'71202',B:'65656',F:'74644',G:'34553',H:'55755',I:'72227',L:'44447',Q:'25573',U:'55557',V:'55552',W:'55575',X:'55255',Y:'55222',Z:'71247','·':'00200','—':'00700','%':'51545','+':'02720','−':'00700',':':'02020',',':'00024',
'∞':'02520','°':'25200','Ц':'55571','Щ':'55571','Э':'61216','Ю':'55755',
};
const fullExtra={
 '…':[0,0,0,0,0,0,21],'∨':[0,0,0,17,17,10,4],'/':[1,1,2,4,8,16,16],'→':[0,4,2,31,2,4,0],'×':[0,17,10,4,10,17,0],'?':[14,17,2,4,4,0,4],B:[30,17,17,30,17,17,30],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[31,4,4,4,4,4,31],L:[16,16,16,16,16,16,31],Q:[14,17,17,17,21,18,13],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],'·':[0,0,0,4,0,0,0],'—':[0,0,0,31,0,0,0],'0':[14,17,17,17,17,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],
 '3':[30,1,1,14,1,1,30],'4':[2,6,10,18,31,2,2],'5':[31,16,16,30,1,1,30],
 '6':[14,16,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],
 '9':[14,17,17,15,1,1,14],'%':[25,26,4,4,4,11,19],'+':[0,4,4,31,4,4,0],
 '−':[0,0,0,31,0,0,0],':':[0,0,4,0,0,4,0],',':[0,0,0,0,0,4,8],
 '∞':[0,0,10,21,10,0,0],'°':[4,10,4,0,0,0,0],'Ц':[17,17,17,17,17,17,31,1],'Щ':[21,21,21,21,21,21,31,1],
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
 function wrap(value,available,small,breakWords=false){
  const lines=[];
  for(const input of value.split('\n')){
   let line='';
   for(const word of input.split(' ')){
    if(breakWords&&textWidth(word,small)>available){
     if(line){lines.push(line);line='';}
     for(const letter of word){
      if(line&&textWidth(line+letter,small)>available){lines.push(line);line='';}
      line+=letter;
     }
     continue;
    }
    const next=line?line+' '+word:word;
    if(line&&textWidth(next,small)>available){lines.push(line);line=word;}
    else line=next;
   }
   if(line)lines.push(line);
  }
  return lines;
 }
 function text(value,b,{center=false,color='#9cdeb4',pad=0,flow=false,compact=false,breakWords=false}={}){
  const available=Math.max(1,b.r-b.l-2*pad);
  let small=compact,lines=wrap(value,available,small,breakWords);
  if(!small&&(lines.some(line=>textWidth(line,small)>available)||lines.length*9-1>b.b-b.t-2)){
   small=true;lines=wrap(value,available,true,breakWords);
  }
  const step=small?7:9,actual=lines.length*step-(small?2:1);
  const start=flow?b.t+pad:Math.round((b.t+b.b-actual)/2);
  ctx.save();ctx.beginPath();ctx.rect(b.l,b.t,Math.max(0,b.r-b.l),Math.max(0,b.b-b.t));ctx.clip();
  lines.forEach((line,i)=>ink(line,center?Math.round((b.l+b.r-textWidth(line,small))/2):b.l+pad,start+i*step,color,small));
  ctx.restore();
 }
 const compactHeight=(value,available)=>Math.max(0,wrap(value,Math.max(1,available),true,true).length*7-2);
 return {text,compactHeight};
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
 position:fixed!important;inset:var(--buffer-top) 0 var(--matrix-dock-reserve,0px)!important;margin:0!important;transform:none!important;translate:none!important;
 width:100%!important;height:calc(var(--viewport-height,100dvh) - var(--buffer-top) - var(--matrix-dock-reserve,0px))!important;max-width:none!important;max-height:none!important;
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
body.matrix-tool #console-shell #app-workspace :is(.tools-window,.meme-window,.editor-window,.svyaz-window,.game-window,.naval-window,.pulse-window,.importopoly-window).matrix-tool-window{
 position:fixed!important;inset:var(--mtop) 0 var(--matrix-dock-reserve,0px)!important;width:100%!important;max-width:none!important;
 height:calc(var(--viewport-height,100dvh) - var(--mtop) - var(--matrix-dock-reserve,0px))!important;max-height:none!important;
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
 margin:0 0 calc(3 * var(--mt))!important;min-height:var(--matrix-copy-min,calc(9 * var(--mt)));font:500 calc(5 * var(--mt)) / calc(8 * var(--mt)) ConsoleMono,monospace!important;
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
body.matrix-tool #console-shell #app-workspace :is(.tools-window,.meme-window,.editor-window,.svyaz-window,.game-window,.naval-window).matrix-tool-window .tools-body [hidden][hidden],
body.matrix-tool #console-shell #app-workspace :is(.tools-window,.meme-window,.editor-window,.svyaz-window,.game-window,.naval-window).matrix-tool-window .tools-body :is(p:empty,details:not([open])>:not(summary)){
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
 position:fixed!important;inset:var(--mtop) 0 var(--matrix-dock-reserve,0px)!important;width:100%!important;max-width:none!important;
 height:calc(var(--viewport-height,100dvh) - var(--mtop) - var(--matrix-dock-reserve,0px))!important;max-height:none!important;
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
body.console-desktop.matrix-tool #console-shell #app-workspace #window-game.matrix-tool-window{
 inset:var(--mtop) 0 var(--matrix-dock-reserve,0px)!important;height:calc(var(--viewport-height,100dvh) - var(--mtop) - var(--matrix-dock-reserve,0px))!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window>.titlebar,
body.console-desktop.matrix-tool #window-game.matrix-tool-window .game-toolbar{
 min-height:max(calc(16 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
 flex:0 0 auto!important;padding-inline:calc(3 * var(--mt))!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .game-toolbar button{
 min-height:calc(44px / var(--ui-scale,1))!important;min-width:calc(24 * var(--mt));
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window>.titlebar button{
 min-width:calc(44px / var(--ui-scale,1))!important;min-height:calc(44px / var(--ui-scale,1))!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .game-layout{
 flex:1 1 0%;min-height:0!important;max-height:none!important;scrollbar-width:none;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window:not(.racing) :is(.game-overlay,.race-sidebar){
 width:min(100%,calc(232 * var(--mt)))!important;max-width:none!important;margin-inline:auto!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window:not(.racing) .game-overlay{
 padding:calc(6 * var(--mt)) calc(4 * var(--mt))!important;gap:calc(3 * var(--mt));
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window:not(.racing) .game-overlay h2{
 min-height:calc(12 * var(--mt));inline-size:100%!important;block-size:auto!important;margin:0!important;
 position:static!important;clip-path:none!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window:not(.racing) .game-overlay p{
 min-height:calc(17 * var(--mt));width:100%;font:500 calc(5 * var(--mt)) / calc(8 * var(--mt)) ConsoleMono,monospace!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .race-sidebar{
 padding:calc(3 * var(--mt)) calc(4 * var(--mt))!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .race-sidebar :is(summary,button,input,select){
 min-height:max(calc(15 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .race-sidebar input{
 color:#eee0ff!important;background:#1e132d!important;border-radius:0!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .race-sidebar :is(p,label){
 min-height:calc(10 * var(--mt));font:500 calc(5 * var(--mt)) / calc(8 * var(--mt)) ConsoleMono,monospace!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window.racing #race-canvas[data-matrix-width]{
 position:absolute!important;inset:var(--matrix-race-top) auto auto var(--matrix-race-left)!important;
 width:var(--matrix-race-width)!important;height:var(--matrix-race-height)!important;
 max-width:none!important;max-height:none!important;image-rendering:pixelated!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .game-hud>div{
 min-width:calc(22 * var(--mt));padding-inline:calc(2 * var(--mt))!important;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .game-hud b{
 white-space:nowrap;
}
body.console-desktop.matrix-tool #window-game.matrix-tool-window .lobby-ship{display:none}
body.console-desktop.matrix-tool #window-game.matrix-tool-window>.window-status:empty{display:none}
@media (orientation:landscape) and (max-height:480px) and (pointer:coarse){
 body.console-desktop.matrix-tool #window-game.matrix-tool-window.racing :is(.titlebar,.game-toolbar){
  min-height:calc(44px / var(--ui-scale,1))!important;height:calc(44px / var(--ui-scale,1))!important;
 }
}
body.console-desktop.matrix-tool #console-shell #app-workspace #window-naval.matrix-tool-window{
 inset:var(--mtop) 0 var(--matrix-dock-reserve,0px)!important;height:calc(var(--viewport-height,100dvh) - var(--mtop) - var(--matrix-dock-reserve,0px))!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window :is(.titlebar,.naval-toolbar){
 min-height:max(calc(16 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
 flex:0 0 auto!important;padding-inline:calc(3 * var(--mt))!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window>.titlebar button{
 min-width:calc(44px / var(--ui-scale,1))!important;min-height:calc(44px / var(--ui-scale,1))!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-content{
 flex:1 1 0%!important;min-height:0!important;max-height:none!important;overflow:auto!important;scrollbar-width:none;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-content :is(button:not(.naval-cell),input,summary){
 min-height:max(calc(15 * var(--mt)),calc(44px / var(--ui-scale,1)))!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-content input{
 color:#d8f4ff!important;background:#0f2435!important;border-radius:0!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-content :is(.naval-orders,.naval-toolbar,.naval-setup,.naval-weapons,.naval-online,.naval-log){
 max-width:min(100%,calc(228 * var(--mt)))!important;margin-inline:auto!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-menu-heading{
 width:min(100%,calc(228 * var(--mt)));margin-inline:auto;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-menu-heading h2{
 position:static!important;inline-size:100%!important;block-size:auto!important;clip-path:none!important;min-height:calc(12 * var(--mt));
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-ocean{
 display:none!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-axis span{
 min-height:calc(8 * var(--mt));
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-board-panel>header{
 min-height:calc(12 * var(--mt));
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-chart{
 grid-template-columns:calc(11 * var(--mt)) minmax(0,1fr)!important;
 grid-template-rows:calc(9 * var(--mt)) minmax(0,1fr)!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window :is(.naval-grid,.naval-axis-x){
 width:100%;width:round(down,100%,calc(10 * var(--mt)))!important;
 padding:0!important;border:0!important;gap:0!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-axis-y{
 height:100%;padding:0!important;align-self:start;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-toolbar{
 flex-wrap:nowrap!important;justify-content:space-between!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-toolbar>b{
 min-width:0;flex:1 1 auto;margin:0;white-space:nowrap;overflow:hidden;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-toolbar button{flex:0 0 auto}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window>.window-status{
 min-height:calc(9 * var(--mt))!important;height:calc(9 * var(--mt))!important;
 flex:0 0 calc(9 * var(--mt))!important;padding:0!important;position:static!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window[data-phase=setup] .naval-menu-heading{
 position:static!important;inline-size:min(100%,calc(228 * var(--mt)))!important;block-size:auto!important;
 padding:calc(3 * var(--mt))!important;margin:0 auto!important;clip-path:none!important;
}
body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-menu-heading p{display:none}

@media (orientation:landscape) and (max-height:480px) and (pointer:coarse){
 body.console-desktop.matrix-tool #window-naval.matrix-tool-window{--ui-control-height:calc(44px / var(--ui-scale,1))}
 body.console-desktop.matrix-tool #window-naval.matrix-tool-window .naval-toolbar button{
  min-height:var(--ui-control-height)!important;
 }
}
body.matrix-tool #window-pulse.matrix-tool-window>.titlebar,
body.matrix-tool #window-pulse.matrix-tool-window .pulse-world :is(button,summary,h2,small,strong,p,#pulse-connection,#pulse-turn-status,#pulse-caption,#pulse-seats,#pulse-theft>span,.pulse-inspect-ecg,.pulse-menu-art,.pulse-end-trace,.pulse-reward){
 opacity:0!important;
}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-world{
 min-height:0;background:transparent;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-canvas{
 filter:none!important;transform:none!important;image-rendering:pixelated;opacity:0;
}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-world :is(.pulse-grain,#pulse-red,#pulse-veins,#pulse-morphine,#pulse-low-health,#pulse-announcement){
 visibility:hidden;
}
body.matrix-tool #window-pulse.matrix-tool-window :is(#pulse-menu,#pulse-result,#pulse-theft,#pulse-inspect,#pulse-offer,.pulse-access){
 background:transparent!important;box-shadow:none!important;filter:none!important;animation:none!important;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu{
 align-items:start;overscroll-behavior:contain;scrollbar-width:none;
 padding:calc(6 * var(--mt)) clamp(calc(4 * var(--mt)),5vw,calc(18 * var(--mt)));
}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-front-inner{
 width:min(100%,calc(144 * var(--mt)));max-height:none;margin:0;
 font-family:ConsoleMono,monospace;
}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-front-inner :is(p,small,#pulse-seats){
 display:block;font:500 calc(6 * var(--mt)) / calc(9 * var(--mt)) ConsoleMono,monospace;
 max-width:none!important;margin:0 0 calc(3 * var(--mt));min-height:calc(10 * var(--mt));
}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-front-inner :is(#pulse-error:empty,[hidden]){
 display:none!important;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu h2{
 margin:calc(2 * var(--mt)) 0 calc(3 * var(--mt))!important;height:calc(14 * var(--mt));font-size:calc(10 * var(--mt));
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu :is(button,summary){
 --ui-control-height:max(calc(15 * var(--mt)),calc(44px / var(--ui-scale,1)));
 min-height:var(--ui-control-height)!important;margin:0 0 calc(2 * var(--mt))!important;padding:0 calc(3 * var(--mt))!important;
 width:100%;border:0!important;box-shadow:none!important;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu summary{
 display:flex;align-items:center;cursor:pointer;list-style:none;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu details{
 padding:0;margin:calc(2 * var(--mt)) 0 0;border:0;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu #pulse-code{
 background:#20241e;color:#eee7ce;border:0;box-shadow:none;border-radius:0;
 min-height:max(calc(15 * var(--mt)),calc(44px / var(--ui-scale,1)));
 font:500 max(16px,calc(7 * var(--mt))) / 1 ConsoleMono,monospace;min-width:0;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu .pulse-join{
 display:flex;align-items:stretch;margin:0;gap:calc(2 * var(--mt));
}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-join button{width:auto!important;margin:0!important}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu-toggle{min-width:calc(15 * var(--mt));min-height:calc(15 * var(--mt))}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-world:has(:is(#pulse-menu,#pulse-result):not([hidden])) .pulse-top{
 visibility:hidden!important;
}
body.matrix-tool #window-pulse.matrix-tool-window :is(.pulse-world button,.pulse-world summary){
 -webkit-tap-highlight-color:transparent;
}
@media(orientation:landscape) and (max-height:500px){
 body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu{
  padding:calc(3 * var(--mt)) calc(7 * var(--mt));
 }
 body.matrix-tool #window-pulse.matrix-tool-window .pulse-front-inner{
  display:grid!important;grid-template-columns:1fr 1fr;align-items:start;column-gap:calc(4 * var(--mt));
  width:min(100%,calc(210 * var(--mt)));padding:0;
 }
 body.matrix-tool #window-pulse.matrix-tool-window .pulse-front-inner>:not([data-game-invite],[data-share-session]){
  grid-column:1/-1;
 }
 body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu :is(.pulse-menu-kicker,#pulse-menu-description){
  display:none!important;
 }
 body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu h2{
  margin:0!important;height:calc(10 * var(--mt));min-height:0!important;
 }
 body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu #pulse-connect{
  display:grid!important;grid-template-columns:1fr 1fr;align-items:start;gap:calc(4 * var(--mt));
 }
 body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu #pulse-connect details{margin:0}
}

body.matrix-tool #window-pulse.matrix-tool-window .pulse-access{scrollbar-width:none;max-height:70%;overflow:auto}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-canvas{opacity:0!important}
body.matrix-tool #window-pulse.matrix-tool-window .pulse-world :is(#pulse-theft,#pulse-offer) button{
 min-width:calc(22 * var(--mt));
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu details .game-menu-fold-body{
 display:grid;gap:calc(2 * var(--mt));padding:calc(2 * var(--mt)) 0;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-code:focus-visible{outline-offset:-2px}
@media (pointer:coarse){
 body.matrix-tool #window-pulse.matrix-tool-window #pulse-menu-toggle{min-width:calc(44px / var(--ui-scale,1));min-height:calc(44px / var(--ui-scale,1))}
}

body.matrix-tool #window-pulse.matrix-tool-window #pulse-inspect :is(strong,p){
 display:block;font:500 calc(6 * var(--mt)) / calc(9 * var(--mt)) ConsoleMono,monospace;
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-inspect strong{min-height:calc(10 * var(--mt))}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-inspect{width:min(calc(142 * var(--mt)),calc(100% - 12px))}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-result{padding:calc(6 * var(--mt))!important;gap:calc(3 * var(--mt));justify-content:center!important}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-result :is(.pulse-end-trace,small,strong){
 flex:0 0 auto;margin:0!important;text-align:center;min-height:calc(11 * var(--mt));
}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-result .pulse-end-trace{height:calc(18 * var(--mt));width:min(75%,calc(112 * var(--mt)))}
body.matrix-tool #window-pulse.matrix-tool-window #pulse-result button{min-height:max(calc(15 * var(--mt)),calc(44px / var(--ui-scale,1)));width:min(90%,calc(81 * var(--mt)))}
body.matrix-tool #window-importopoly.matrix-tool-window>.titlebar{opacity:0!important}
body.matrix-tool #window-importopoly.matrix-tool-window>#importopoly-frame{
 flex:1 1 0%!important;display:block;width:100%!important;height:100%!important;min-height:0!important;border:0!important;
}
@media (max-width:360px) and (pointer:coarse){
 body.matrix-tool.console-desktop #console-shell #app-workspace .matrix-tool-window:not(.svyaz-window)>.titlebar{
  height:calc(27 * var(--mt))!important;min-height:calc(27 * var(--mt))!important;
  flex:0 0 calc(27 * var(--mt))!important;display:grid!important;grid-template-columns:minmax(0,1fr);
  grid-template-rows:calc(10 * var(--mt)) calc(15 * var(--mt));align-content:center;justify-items:start;
  gap:0!important;padding:0 calc(3 * var(--mt))!important;
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace .matrix-tool-window:not(.svyaz-window)>.titlebar>span{
  min-height:0!important;width:100%;height:100%;padding:0!important;overflow:hidden;
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace .matrix-tool-window:not(.svyaz-window)>.titlebar>.window-controls{
  position:static!important;display:flex!important;align-items:center;justify-content:flex-start;
  flex-wrap:nowrap!important;gap:0!important;padding:0!important;width:auto!important;margin:0!important;
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace .matrix-tool-window:not(.svyaz-window)>.titlebar .window-controls button{
  position:static!important;inset:auto!important;
  width:calc(15 * var(--mt))!important;min-width:calc(15 * var(--mt))!important;
  height:calc(15 * var(--mt))!important;min-height:calc(15 * var(--mt))!important;
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace #window-pulse.matrix-tool-window #pulse-menu{
  padding:calc(4 * var(--mt));
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace #window-pulse.matrix-tool-window #pulse-menu .pulse-front-inner{
  gap:calc(1 * var(--mt));margin:0;padding:0;
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace #window-pulse.matrix-tool-window #pulse-menu :is(.pulse-menu-kicker,#pulse-menu-description){
  display:none!important;
 }
 body.matrix-tool.console-desktop #console-shell #app-workspace #window-pulse.matrix-tool-window #pulse-menu h2{
  min-height:0!important;height:calc(12 * var(--mt));margin:0 0 calc(2 * var(--mt))!important;
 }
}
`;
 document.head.append(style);
 const toolsColors={page:'#020704',surface:'#08130d',input:'#0b1c12',edge:'#2d5840',text:'#b5eccc',muted:'#80ae91',on:'#76e6a7'};
 const font=makeText(bitmap,ctx);
 return Object.fromEntries(['convert','download','meme','editor','svyaz','game','naval','pulse','importopoly'].map(id=>{
  const media=id==='meme',editor=id==='editor',chat=id==='svyaz',race=id==='game',naval=id==='naval',pulse=id==='pulse',board=id==='importopoly';
  const colors=media?{page:'#090609',surface:'#170e16',input:'#241421',edge:'#673951',text:'#f6c2df',muted:'#bd8aa6',on:'#fd9fca'}:editor?{page:'#040a09',surface:'#0c1a15',input:'#13271e',edge:'#34604d',text:'#cbf5e2',muted:'#93b9a8',on:'#b6e777'}:chat?{page:'#050a09',surface:'#0a1713',input:'#10251b',edge:'#305a48',text:'#d1f3de',muted:'#91b5a5',on:'#8ce4b8'}:race?{page:'#090711',surface:'#151022',input:'#201630',edge:'#514067',text:'#edddff',muted:'#b8a7cb',on:'#bd9df8'}:naval?{page:'#070e17',surface:'#0d1b2a',input:'#12263a',edge:'#28465b',text:'#d5f3ff',muted:'#96b6c8',on:'#83dce8'}:pulse?{page:'#0e110e',surface:'#161b16',input:'#20241e',edge:'#515949',text:'#eee7ce',muted:'#b0b59e',on:'#d6c58e'}:board?{page:'#090d09',surface:'#161e15',input:'#20291d',edge:'#53604b',text:'#f1dfae',muted:'#bdc3a4',on:'#e4c87e'}:toolsColors;
  const win=document.getElementById('window-'+id),pane=chat||race||naval?win:document.getElementById(media?'meme-root':editor?'editor-root':pulse?'pulse-content':board?'importopoly-frame':id+'-tool'),title=win?.querySelector('.titlebar');
  if(!win||!pane||!title)return [id,null];
  let boardPitch=0;
  function sendBoardPitch(value){
   if(!board||!pane.hasAttribute('src'))return;
   pane.contentWindow?.postMessage({type:'importopoly-matrix',pitch:value},location.origin);
  }
  if(board)pane.addEventListener('load',()=>sendBoardPitch(boardPitch));
  let pulseLayer=null,pulseSource=null,pulseFrame=null,detachPulse=null;
  if(pulse){pulseLayer=document.createElement('canvas');pulseLayer.id='matrix-pulse-scene';
   pulseLayer.hidden=true;pulseLayer.setAttribute('aria-hidden','true');ctx.canvas.before(pulseLayer);}
  const field=race?win.querySelector('#race-canvas'):null;
  const effectSource=naval?win.querySelector('#naval-fx'):null;
  let effectLayer=null,effectContext=null,effectFrame=null;
  if(effectSource){
   effectLayer=document.createElement('canvas');effectLayer.hidden=true;
   effectLayer.id='matrix-naval-effects';effectLayer.setAttribute('aria-hidden','true');
   effectContext=effectLayer.getContext('2d');ctx.canvas.after(effectLayer);
   effectSource.addEventListener('makson-naval-fx-frame',()=>{
    if(!effectFrame||effectLayer.hidden||!effectContext)return;
    const {w,h,pitch,top}=effectFrame,r=effectSource.getBoundingClientRect();
    effectContext.clearRect(0,0,w,h);
    if(!r.width||!r.height)return;
    const x=Math.round(r.left/pitch),y=Math.round(r.top/pitch);
    const cols=Math.round(r.right/pitch)-x,rows=Math.round(r.bottom/pitch)-y;
    if(cols<=0||rows<=0)return;
    effectContext.save();effectContext.beginPath();effectContext.rect(0,top,w,h-top);effectContext.clip();
    effectContext.imageSmoothingEnabled=false;
    effectContext.drawImage(effectSource,x,y,cols,rows);effectContext.restore();
   });
  }
  const clearRaceGrid=()=>{if(field){delete field.dataset.matrixWidth;delete field.dataset.matrixHeight;}};
  const stop=()=>{win.classList.remove('matrix-tool-window');body.classList.remove('matrix-tool');if(race)clearRaceGrid();if(board&&boardPitch){boardPitch=0;sendBoardPitch(0);}if(pulseLayer){pulseLayer.hidden=true;pulseFrame=null;detachPulse?.();pulseSource=null;detachPulse=null;}if(effectLayer){effectLayer.hidden=true;effectFrame=null;effectContext?.clearRect(0,0,effectLayer.width,effectLayer.height);}};
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
   function words(value,b,{primary=false,center=false,full=false,quiet=false,breakWords=false}={}){
    let name=value.trim().replace(/[\u00a0\u202f]/g,' ').toUpperCase(),max=b.r-b.l-2;
    if(primary&&bitmap.compactWidth(name)>max){
     let s='';for(const ch of name){if(bitmap.compactWidth(s+ch+'…')>max)break;s+=ch;}
     name=s+'…';
    }
    font.text(name,b,{center,pad:1,compact:!full,breakWords,color:quiet?colors.muted:colors.text});
   }
   if(id==='download'||id==='convert'){
    // The invisible DOM reserves space and scrolls, but its font wraps at a
    // different column than the bitmap. Measure the actual rendered copy.
    const layout=[];
    for(const el of pane.querySelectorAll('p:not(.tool-lead)')){
     if(el.closest('[hidden],details:not([open])')||!el.getClientRects().length)continue;
     const b=bounds(el);
     const value=el.textContent.trim().replace(/[\u00a0\u202f]/g,' ').toUpperCase();
     const height=Math.max(9,font.compactHeight(value,b.r-b.l-2)+2)*pitch/zoom+'px';
     if(el.style.getPropertyValue('--matrix-copy-min')!==height)layout.push([el,height]);
    }
    for(const [el,height] of layout)el.style.setProperty('--matrix-copy-min',height);
   }
   const tb=bounds(title),pb=chat||race||naval?{...bounds(pane),t:tb.b}:bounds(pane);
   if(pb.b<=pb.t||tb.b<=top){stop();return false;}
   fill({l:0,t:top,r:w,b:h},colors.page);
   fill({l:0,t:top,r:w,b:tb.b},colors.surface);
   fill({l:0,t:tb.b-1,r:w,b:tb.b},colors.edge);
   const control=bounds(title.querySelector('.window-controls'));
   const stacked=!chat&&control.t>=tb.t+9&&control.r>control.l;
   const titleBox=stacked?{l:3,r:w-3,t:tb.t,b:control.t}:{l:3,r:control.l-1,t:tb.t,b:tb.b};
   const titleText=race?'ГИПНОРОЙДЕР':win.dataset.title;
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
   }else if(race||naval||board){
    const room=titleBox;
    words(bitmap.compactWidth(titleText.toUpperCase())+3<=room.r-room.l?titleText:naval?'ФЛОТ':board?'ПОЛЕ':'ПОЛЁТ',room,{primary:true,full:true});
   }else words(titleText,titleBox,{full:true});
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
   if(board){
    const popup=win.querySelector('.app-link-panel');
    const frameScale=pane.clientWidth?pane.getBoundingClientRect().width/pane.clientWidth:1;
    const bp=pitch/(frameScale||1);
    if(boardPitch!==bp){boardPitch=bp;sendBoardPitch(bp);}
    // Preserve the live, focusable iframe, with only the outer chrome painted here.
    ctx.clearRect(pb.l,pb.t,pb.r-pb.l,pb.b-pb.t);
    if(popup){const b=bounds(popup);ctx.clearRect(b.l,b.t,b.r-b.l,b.b-b.t);}
    return true;
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
    if(pulse){
     const root=pane,front=root.querySelector('#pulse-menu'),result=root.querySelector('#pulse-result'),source=root.querySelector('#pulse-canvas');
     const visible=el=>!!el&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
     const menu=visible(front),done=visible(result);
     const get=sel=>root.querySelector(sel);
     function withClip(b,painter){
      ctx.save();ctx.beginPath();ctx.rect(b.l,b.t,b.r-b.l,b.b-b.t);ctx.clip();painter();ctx.restore();
     }
     function trace(b,peaks,color){
      const y=Math.round((b.t+b.b)/2),width=b.r-b.l;
      const n=Math.max(0,Math.min(4,peaks)),stride=Math.round(width/(n+1));
      let x=b.l;
      for(let i=1;i<=n;i++){
       const p=b.l+i*stride,a=Math.min(7,Math.floor((b.b-b.t)/2)-1);
       fill({l:x,r:p-2,t:y,b:y+1},color);
       for(const [dx,dy,hh] of [[-2,0,2],[-1,0,3],[0,-a,a+4],[1,-a+2,a+2],[2,-1,2]])fill({l:p+dx,r:p+dx+1,t:y+dy,b:y+dy+hh},color);
       x=p+3;
      }
      fill({l:x,r:b.r,t:y,b:y+1},color);
     }
     function ui(el){
      if(!visible(el)||[...root.querySelectorAll('details:not([open])')].some(d=>d.contains(el)&&!d.querySelector(':scope>summary')?.contains(el)))return;
      const b=bounds(el);if(b.b<=pb.t||b.t>=pb.b||b.r<=b.l)return;
      let value=el.tagName==='SUMMARY'?(el.parentElement.open?'−  ': '+  ')+el.textContent:el.textContent;
      if(el.matches('#pulse-menu-toggle'))value='';else if(el.matches('[data-replace]:not([data-replace="-1"])'))value=el.title;
      value=value.trim().replace(/[●○]/g,c=>c==='●'?'■':'□');
      if(el.matches('button,summary')){
       const selected=el.getAttribute('aria-pressed')==='true'||el.matches('#pulse-solo,#pulse-resume');
       box(b,hot(el)||selected?colors.on:colors.edge,el.disabled?colors.surface:selected?'#2b2e23':colors.input);
       if(el.id==='pulse-menu-toggle'){
        const x=Math.floor((b.l+b.r)/2),y=Math.floor((b.t+b.b)/2);
        for(const dy of [-3,0,3])fill({l:x-4,r:x+5,t:y+dy,b:y+dy+1},colors.text);
       }else words(value.replace(/s*→$/,''),inset(b,1),{center:true,quiet:el.disabled});
      }else if(el.id==='pulse-code'){
       box(b,hot(el)?colors.on:colors.edge,colors.input);const s=inset(b,1);
       ctx.clearRect(s.l,s.t,s.r-s.l,s.b-s.t);
      }else if(el.matches('.pulse-inspect-ecg,.pulse-end-trace')){
       const n=el.matches('.pulse-end-trace')?Number(result.classList.contains('survived')):((el.querySelector('path')?.getAttribute('d')||'').match(/l5 /g)||[]).length;
       trace(inset(b,2),n,colors.on);
      }else if(el.matches('#pulse-turn-status,#pulse-caption,#pulse-connection')){
       if(!value||(el.id==='pulse-caption'&&!el.classList.contains('shown')))return;
       const wide=Math.min(b.r-b.l,bitmap.compactWidth(value.toUpperCase())+8),cx=Math.floor((b.l+b.r)/2);
       const r={...b,l:cx-Math.floor(wide/2),r:cx+Math.ceil(wide/2)};
       box(r,colors.edge,colors.page);words(value,r,{center:true});
      }else words(value,b,{quiet:el.matches('small,p:not(#pulse-error)'),full:el.matches('h2,#pulse-result-title'),center:!!el.closest('#pulse-result,#pulse-theft,#pulse-offer')});
     }
     const sceneVisible=!!source&&!menu&&!done;
     if(sceneVisible){
      const sb=bounds(source),cols=sb.r-sb.l,rows=sb.b-sb.t;
      if(cols>0&&rows>0){
       if(source.dataset.matrixWidth!==String(cols))source.dataset.matrixWidth=cols;
       if(source.dataset.matrixHeight!==String(rows))source.dataset.matrixHeight=rows;
       if(pulseSource!==source){
        detachPulse?.();pulseSource=source;
        const present=({detail}={})=>{
         if(!pulseFrame||!pulseLayer||pulseLayer.hidden)return;
         const {b,w,h}=pulseFrame,draw=pulseLayer.getContext('2d');
         draw.clearRect(0,0,w,h);draw.imageSmoothingEnabled=false;
         draw.drawImage(source,b.l,b.t,b.r-b.l,b.b-b.t);
         const health=root.classList.contains('pulse-critical')?2:root.classList.contains('pulse-low')?1:0;
         const mood=health?'#61141b':root.classList.contains('pulse-morphed')?'#76608d':null;
         if(mood||detail?.pain){
          draw.fillStyle=detail?.pain?'#79282e':mood;
          for(let j=0;j<8;j++){draw.globalAlpha=Math.max((.09+.008*j)*(mood?(health||1):0), (detail?.pain||0)*(.21-.016*j));
           draw.fillRect(b.l+j,b.t+j,b.r-b.l-2*j,1);draw.fillRect(b.l+j,b.b-j-1,b.r-b.l-2*j,1);
           draw.fillRect(b.l+j,b.t+j,1,b.b-b.t-2*j);draw.fillRect(b.r-j-1,b.t+j,1,b.b-b.t-2*j);
          }
          draw.globalAlpha=1;
         }
        };
        source.addEventListener('makson-pulse-frame',present);
        detachPulse=()=>{source.removeEventListener('makson-pulse-frame',present);delete source.dataset.matrixWidth;delete source.dataset.matrixHeight;};
       }
       if(pulseLayer.width!==w)pulseLayer.width=w;
       if(pulseLayer.height!==h)pulseLayer.height=h;
       if(pulseLayer.style.width!==w*pitch+'px')pulseLayer.style.width=w*pitch+'px';
       if(pulseLayer.style.height!==h*pitch+'px')pulseLayer.style.height=h*pitch+'px';
       pulseLayer.hidden=false;pulseFrame={b:sb,w,h};
       ctx.clearRect(sb.l,sb.t,cols,rows);
      }
     }else{
      pulseFrame=null;pulseLayer.hidden=true;
      if(pulseSource){delete pulseSource.dataset.matrixWidth;delete pulseSource.dataset.matrixHeight;}
     }
     if(menu){
      fill(pb,colors.page);
      const panel=bounds(front.querySelector('.pulse-front-inner')),heading=bounds(front.querySelector('h2'));
      if((pb.r-panel.r<=55||pb.b-pb.t<=105)&&heading.b>heading.t){
       const titleEnd=heading.l+bitmap.width('ПУЛЬС')+8;
       if(heading.t>=pb.t&&heading.r-titleEnd>28)trace({...heading,l:titleEnd,r:heading.r-1},2,colors.edge);
      }
      if(pb.r-panel.r>55&&pb.b-pb.t>105){
       const x=panel.r+8,r=pb.r-10,y=Math.round((pb.t+pb.b)/2);
       trace({l:x,r,t:y-12,b:y+12},2,colors.edge);
       for(let i=0;i<3;i++){
        const l=x+4+i*Math.floor((r-x-8)/3),t=y-34+i*3;
        box({l,r:l+12,t,b:y-15},colors.edge,colors.input);
        fill({l:l+3,r:l+9,t:t+4,b:y-17},['#393a32','#4a4330','#492c28'][i]);
       }
      }
      withClip({...bounds(front),t:Math.max(pb.t,bounds(front).t)},()=>{
       for(const el of front.querySelectorAll('h2,small,strong,p,button,summary,input,#pulse-seats'))ui(el);
      });
     }else if(done){
      fill(pb,colors.page);
      if(result.classList.contains('survived')){
       const wide=w>=210,b=wide?{l:Math.floor(w*.18),r:Math.floor(w*.18)+10,t:pb.t+24,b:pb.t+68}:null;
       if(b&&b.b<pb.b-8){
        box(b,colors.edge,colors.input);
        fill({...b,l:b.l+2,r:b.r-2,t:b.t+14,b:b.b-2},colors.on);
        fill({l:b.l+4,r:b.r-4,t:b.b,b:b.b+11},colors.muted);
        fill({l:b.l-2,r:b.r+2,t:b.t-1,b:b.t+1},colors.edge);
       }
      }
      for(const el of result.querySelectorAll('small,strong,button,.pulse-end-trace'))ui(el);
     }else{
      if(source?.matches(':focus-visible')){
       const b=bounds(source),t=Math.max(b.t,pb.t);
       fill({l:b.l,r:b.r,t,b:t+1},colors.on);fill({l:b.l,r:b.r,t:b.b-1,b:b.b},colors.on);
       fill({l:b.l,r:b.l+1,t,b:b.b},colors.on);fill({l:b.r-1,r:b.r,t,b:b.b},colors.on);
      }
      for(const el of root.querySelectorAll('.pulse-top>*,#pulse-turn-status,#pulse-caption'))ui(el);
      for(const sel of ['#pulse-inspect','#pulse-theft','#pulse-offer','.pulse-access:focus-within']){
       const el=get(sel);
       if(!visible(el))continue;
       const b=bounds(el);box(b,colors.edge,colors.page);
       for(const child of el.querySelectorAll('strong,p,small,button,.pulse-inspect-ecg,#pulse-theft>span'))ui(child);
      }
      if(!source)words(root.textContent.trim(),pb,{center:true});
     }
    }
    if(naval){
     if(effectLayer){
      if(effectLayer.width!==w)effectLayer.width=w;
      if(effectLayer.height!==h)effectLayer.height=h;
      const width=w*pitch+'px',height=h*pitch+'px';
      if(effectLayer.style.width!==width)effectLayer.style.width=width;
      if(effectLayer.style.height!==height)effectLayer.style.height=height;
      effectLayer.hidden=false;effectFrame={w,h,pitch,top:tb.b};
     }
     const visible=el=>!!el&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
     const get=sel=>pane.querySelector(sel);
     const show=(sel,fn)=>{const el=get(sel);if(visible(el))fn(el,bounds(el));};
     const clipping=(b,fn)=>{
      if(b.r<=b.l||b.b<=b.t)return;ctx.save();try{ctx.beginPath();ctx.rect(b.l,b.t,b.r-b.l,b.b-b.t);ctx.clip();fn()}finally{ctx.restore();}
     };
     const textOf=el=>el.innerText?.trim()||el.textContent.trim();
     function drawNaval(el,b){
      if(b.b<=pb.t||b.t>=pb.b||b.r<=b.l||b.t>=b.b)return;
      const tag=el.localName;
      if(el.matches('button,summary')){
       const primary=el.matches('#naval-start,[aria-pressed=true]');
       const active=primary&&!el.matches(':disabled');
       box(b,active||hot(el)?colors.on:colors.edge,active?'#174354':colors.input);
       const text=el.id==='naval-clear'?'СВОЙ ФЛОТ':textOf(el).replace(/^[↻↔↕]+\s*/, '').replace(/\s*→$/, '');
       words(el.localName==='summary'?(el.parentElement.open?'− ':'+ ')+text:text,{...b,l:b.l+1},{primary:true,center:tag==='button',quiet:el.matches(':disabled')});
      }else if(tag==='input'){
       box(b,hot(el)?colors.on:colors.edge,colors.input);const a=inset(b,1);
       ctx.clearRect(a.l,a.t,Math.max(0,a.r-a.l),Math.max(0,a.b-a.t));
      }else words(textOf(el),b,{full:tag==='h2',primary:!el.matches('p,.naval-orders>span'),center:el.matches('h2,.naval-axis>span,.naval-result'),quiet:el.matches('p,small,.naval-orders>span')});
     }
     show('.naval-toolbar',(bar,b)=>{
      fill(b,colors.surface);fill({...b,t:b.b-1},colors.edge);
      const reset=bar.querySelector('button');
      if(visible(reset))drawNaval(reset,bounds(reset));
      const state=get('#naval-phase').textContent;words(w<125?state.replace('Расстановка флота','РАССТАНОВКА'):state,{...b,l:b.l+4,r:visible(reset)?bounds(reset).l-3:b.r-2},{primary:true});
     });
     show('.naval-content',(content,cb)=>clipping(cb,()=>{
      fill(cb,colors.page);
      for(const sel of ['.naval-orders','.naval-setup','.naval-weapons','.naval-online','.naval-log','.naval-board-panel']){
       for(const zone of content.querySelectorAll(sel)){
        if(!visible(zone))continue;
        const b=bounds(zone);
        if(b.b<=cb.t||b.t>=cb.b)continue;
        box(b,colors.edge,colors.surface);
       }
      }
      for(const el of content.querySelectorAll('h2,.naval-menu-heading p,.naval-orders strong,.naval-orders span,summary,button:not(.naval-cell),input,#naval-room>b,#naval-players,#naval-connection,#naval-weapon-hint,.naval-board-panel>header>* , .naval-axis>span,.naval-log>li')){
       if(!visible(el))continue;
       const details=el.closest('details');
       if(details&&!details.open&&!el.matches('summary'))continue;
       const b=bounds(el);
       if(b.b<=cb.t||b.t>=cb.b)continue;
       const head=el.closest('.naval-board-panel>header');
       if(head&&el.localName==='b'){const hb=bounds(head),ending=head.querySelector('span');b.l=hb.l+2;b.r=visible(ending)?bounds(ending).l-2:hb.r-2;}
       if(el.id==='naval-message'&&b.r-b.l<115){
        const short=textOf(el).replace(/Флот готов. Можно начинать./i,'ФЛОТ ГОТОВ').replace(/Твой ход. Выбирай цель./i,'ВЫБИРАЙ ЦЕЛЬ');
        words(short,{...b,l:b.l+1},{primary:true});continue;
       }
       drawNaval(el,b);
      }
      for(const board of content.querySelectorAll('.naval-grid')){
       if(!visible(board))continue;
       const bb=bounds(board);if(bb.b<=cb.t||bb.t>=cb.b)continue;
       fill(bb,colors.edge);
       for(const cell of board.querySelectorAll('.naval-cell')){
        const b=bounds(cell),w=b.r-b.l,h=b.b-b.t;
        if(b.b<=cb.t||b.t>=cb.b||w<2||h<2)continue;
        const x=Math.round((b.l+b.r)/2),y=Math.round((b.t+b.b)/2);
        const hit=cell.matches('.hit,.sunk'),water=cell.matches('.miss,.water'),ship=cell.classList.contains('ship');
        const scanning=cell.classList.contains('scanned'),valid=cell.classList.contains('preview'),invalid=cell.classList.contains('invalid');
        const hovering=!cell.disabled&&hot(cell);
        const tint=hit?'#4d2630':invalid?'#422530':valid?'#17534d':scanning?'#134e49':ship?'#1a3d55':'#102236';
        const edge=hovering?colors.on:scanning?'#55c9b4':hit?'#a05756':'#2a465d';
        if(hovering||scanning||hit)box(b,edge,tint);
        else{fill(b,edge);fill({...b,l:b.l+1,t:b.t+1},tint);}
        if(hit){
         const hue=cell.classList.contains('sunk')?'#ffa88f':'#ffe09b',len=Math.max(1,Math.min(2,Math.floor(Math.min(w,h)/2)-1));
         for(let j=-len;j<=len;j++){
          fill({l:x+j,r:x+j+1,t:y+j,b:y+j+1},hue);fill({l:x-j,r:x-j+1,t:y+j,b:y+j+1},hue);
         }
        }else if(water)fill({l:x,r:x+1,t:y,b:y+1},'#7db5d0');
        else if(ship){
         const a=inset(b,Math.min(2,Math.floor((Math.min(w,h)-1)/2)));
         fill(a,'#5793a9');fill({...a,t:a.t+1},'#376780');
        }
       }
      }
      show('.naval-result',(el,b)=>{box(b,colors.on,colors.input);drawNaval(el,b)});
     }));
     show('.window-status',(_,b)=>{
      fill(b,colors.surface);fill({...b,b:b.t+1},colors.edge);
      const score=get('#naval-score'),status=get('#naval-status');
      const duel=/^одиночная/i.test(textOf(status))?'ОДИНОЧНАЯ ИГРА':textOf(status);
      const tally=(textOf(score).match(/[0-9]+/g)||[]).join(' : ');
      words(duel,{...b,l:b.l+3,r:b.r-34},{primary:true});
      words(tally,{...b,l:b.r-33,r:b.r-2},{primary:true,center:true,quiet:true});
     });
    }
    if(race){
     const visible=el=>!!el&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
     const get=sel=>pane.querySelector(sel);
     const show=(sel,fn)=>{const el=get(sel);if(visible(el))fn(el,bounds(el));};
     const clipping=(b,fn)=>{
      if(b.r<=b.l||b.b<=b.t)return;ctx.save();try{ctx.beginPath();ctx.rect(b.l,b.t,b.r-b.l,b.b-b.t);ctx.clip();fn()}finally{ctx.restore();}
     };
     const cut=(b,n=0)=>{const a=inset(b,n);ctx.clearRect(a.l,a.t,Math.max(0,a.r-a.l),Math.max(0,a.b-a.t))};
     const textOf=el=>el.innerText?.trim()||el.textContent.trim();
     const draw=(el,b,options={})=>{
      if(b.b<=pb.t||b.t>=pb.b)return;
      if(el.matches('button,summary')){
       const active=el.matches('.launch-button,[aria-pressed=true],.selected');
       const blocked=el.matches(':disabled');
       box(b,active||hot(el)?colors.on:colors.edge,active&&!blocked?'#36224d':colors.input);
       if(el.matches('.pilot-colors button')){fill(inset(b,2),el.style.getPropertyValue('--ship-color'));return}
       const clean=textOf(el).replace(/^[✚Ⅱ▶]+\s*/, '').replace(/\s*→$/,'');
       const line=el.localName==='summary'?(el.parentElement.open?'− ':'+ ')+clean:clean;
       words(line,b,{primary:true,center:el.localName!=='summary',quiet:blocked});return;
      }
      if(el.matches('input,select')){
       box(b,hot(el)?colors.on:colors.edge,colors.input);
       if(el.localName==='input')cut(b,1);
       else{words(el.selectedOptions[0]?.textContent||'',{...b,r:b.r-6},{primary:true});
        const x=b.r-4,y=Math.floor((b.t+b.b)/2);
        fill({l:x-1,r:x+2,t:y-1,b:y},colors.on);fill({l:x,r:x+1,t:y,b:y+1},colors.on);}
       return;
      }
      words(textOf(el),b,options);
     };
     show('.game-toolbar',(bar,b)=>{
      fill(b,colors.surface);fill({...b,t:b.b-1},colors.edge);
      for(const button of bar.querySelectorAll('button'))if(visible(button))draw(button,bounds(button));
      const room=bounds(bar.lastElementChild);
      words(get('#game-mode').textContent,{...b,l:b.l+3,r:Math.max(4,room.l-1)},{primary:true});
     });
     show('.game-layout',(_,lb)=>clipping(lb,()=>{
      if(win.classList.contains('racing')){
       // Each WebGL output pixel maps to one physical screen cell on supported viewport sizes.
       show('.game-screen',(stage,b)=>{
        const rect=stage.getBoundingClientRect();
        const l=Math.ceil(rect.left/pitch),t=Math.ceil(rect.top/pitch);
        const r=Math.floor(rect.right/pitch),bottom=Math.floor(rect.bottom/pitch),cols=r-l,rows=bottom-t;
        if(field&&cols>=1&&rows>=1&&cols<=640&&cols*rows<=230400){
         const set=(prop,physical)=>{const value=physical/zoom+'px';if(field.style.getPropertyValue(prop)!==value)field.style.setProperty(prop,value)};
         set('--matrix-race-left',l*pitch-rect.left);set('--matrix-race-top',t*pitch-rect.top);
         set('--matrix-race-width',cols*pitch);set('--matrix-race-height',rows*pitch);
         if(field.dataset.matrixWidth!==String(cols))field.dataset.matrixWidth=cols;
         if(field.dataset.matrixHeight!==String(rows))field.dataset.matrixHeight=rows;
        }else clearRaceGrid();
        cut(b);
       });
       for(const el of pane.querySelectorAll('.game-hud>div,.flight-stats>span')){
        if(!visible(el))continue;
        const b=bounds(el);box(b,colors.edge,colors.page);
        const small=el.querySelector('small'),strong=el.querySelector('b');
        if(small&&strong&&strong.id==='hud-shield'){
         draw(small,{...bounds(small),l:b.l,r:b.r},{center:true,quiet:true});
         const y=Math.floor((bounds(strong).t+bounds(strong).b)/2);
         const value=strong.textContent.trim();
         if(value==='∞')words('∞',{...bounds(strong),l:b.l,r:b.r},{center:true});
         else [...value].filter(v=>v==='◆'||v==='◇').forEach((v,i,all)=>{
          const x=Math.floor((b.l+b.r)/2)-Math.floor((all.length-1)*3)+i*6;
          box({l:x-2,r:x+3,t:y-2,b:y+3},colors.on,v==='◆'?colors.on:colors.page);
         });
        }else if(small&&strong){
         draw(small,{...bounds(small),l:b.l,r:b.r},{primary:true,center:true,quiet:true});
         draw(strong,{...bounds(strong),l:b.l,r:b.r},{primary:true,center:true});
        }else{
         const value=el.id==='hud-speed'?textOf(el).replace(/\s*м\/с$/i,'М/С'):textOf(el);
         if(el.id==='hud-upgrades'&&bitmap.compactWidth(value)>b.r-b.l-2){
          const short=value.replace('РЕАКТОР','РКТ');words(short,b,{primary:true,center:true});
         }else words(value,b,{primary:true,center:true});
        }
       }
       show('.boost-meter',(bar,b)=>{
        box(b,colors.edge,colors.page);
        const track=bar.querySelector('div'),level=bar.querySelector('#boost-fill');
        if(!track||!level)return;
        const a={l:b.l+25,r:b.r-2,t:b.t+2,b:b.b-2},unit=Number(level.style.transform.match(/scaleX\(([^)]+)\)/)?.[1]??1);
        box(a,colors.edge,colors.input);
        const max=Math.max(0,a.r-a.l-2);
        fill({l:a.l+1,r:a.l+1+Math.round(Math.min(1,Math.max(0,unit))*max),t:a.t+1,b:a.b-1},colors.on);
        words('НИТРО',{...b,l:b.l+1,r:a.l},{primary:true,center:true});
       });
      }else clearRaceGrid();
      show('#game-overlay',(overlay,b)=>{
       box(b,colors.edge,colors.page);
       for(const el of overlay.querySelectorAll('h2,p,button')){
        if(visible(el))draw(el,bounds(el),{center:true,full:el.localName==='h2',quiet:el.localName==='p'});
       }
      });
      show('.race-sidebar',(side,b)=>{
       fill(b,colors.page);
       for(const el of side.querySelectorAll('button,summary,input,select,label,small,p,.race-record,#room-code-display,#room-players')){
        if(!visible(el))continue;
        const fold=el.closest('details');if(fold&&!fold.open&&el.localName!=='summary')continue;
        const a=bounds(el);
        draw(el,a,{primary:!el.matches('p'),quiet:el.matches('p,label,small')});
       }
      });
     }));
     show('.window-status',(bar,b)=>{
      fill(b,colors.surface);fill({...b,b:b.t+1},colors.edge);
      const status=bar.querySelector('#race-status');
      if(visible(status))draw(status,{...b,l:b.l+3,r:Math.round(b.r*.72)},{primary:true,quiet:true});
     });
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
        }else if(el.id==='edit-open'&&bitmap.compactWidth(el.textContent.toUpperCase())>b.r-b.l-2){
         words('ОТКРЫТЬ ФАЙЛ',b,{primary:true,center:true,quiet:disabled});
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
       }else if(el.matches('#edit-empty>p')){
        words('ИЛИ ПЕРЕТАЩИ ФАЙЛ',b,{center:true,quiet:true});
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
    const nodes=editor||chat||race||naval||pulse?[]:pane.querySelectorAll('p,h3,summary,label,button,select,input,progress,a.tool-primary'+(media?',h2,b,output,textarea,.meme-file-name,.meme-empty small':''));
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
      words(value,b,{center:media&&tag==='h2',breakWords:tag==='p'&&!el.matches('.tool-lead')&&(id==='download'||id==='convert'),full:['h3','h2','b','output'].includes(tag),quiet:!el.matches('.tool-status,h3'),primary:el.id==='convert-name'||el.matches('.tool-lead,.meme-file-name,#meme-status,output')});
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
   if(chat||race||naval)for(const region of pane.querySelectorAll(chat?'.sv-surface,.overview-tabs,.sv-voice-panel':naval?'.naval-content,.naval-toolbar,.naval-boards':'.game-toolbar,.game-layout,.race-sidebar,.game-overlay'))resize.observe(region);
   let raceTimer=0,lastRacePaint=0;
   const observer=new MutationObserver(records=>{
    if(!race||!win.classList.contains('racing'))return draw();
    const hudOnly=records.every(({target})=>(target.nodeType===1?target:target.parentElement)?.closest('.game-hud,.flight-stats,#race-status,#countdown'));
    if(!hudOnly)return draw();
    if(raceTimer)return;
    raceTimer=setTimeout(()=>{raceTimer=0;lastRacePaint=performance.now();draw();},Math.max(0,85-(performance.now()-lastRacePaint)));
   });
   for(const region of chat||race||naval?pane.querySelectorAll(chat?'.sv-surface,.overview-tabs,.sv-voice-panel':naval?'.naval-toolbar,.naval-content,.window-status':'.game-toolbar,.game-layout,.window-status'):[pane]){
    observer.observe(region,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open','disabled','value','class','aria-selected','aria-current','aria-pressed']});
   }
   if(editor){
    // Observe timeline geometry only; ordinary playback/pointer changes coalesce in the shared frame scheduler.
    const timeline=new MutationObserver(records=>{if(records.some(({target})=>target.matches('.edit-timeline,[id$="-clip"]')))draw()});
    timeline.observe(pane,{subtree:true,attributes:true,attributeFilter:['style']});
   }
   observer.observe(title,{subtree:true,childList:true});
   observer.observe(win,{childList:true});
   if(race){
    const state=new MutationObserver(draw);state.observe(win,{attributes:true,attributeFilter:['class']});
   }
   for(const event of ['scroll','pointerover','pointerout','focusin','focusout','input','change','toggle'])win.addEventListener(event,draw,true);
  }
  return [id,{paint,stop,watch}];
 }));
}
