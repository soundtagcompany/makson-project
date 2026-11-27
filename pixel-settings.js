/** App-specific paint and DOM alignment for the native Settings window. */
const extra={
'0':'75557','1':'26227','2':'71247','3':'71317','4':'55711','5':'74617','6':'74757','7':'71122','8':'75757','9':'75717',
'%':'51545','+':'02720','−':'00700',':':'02020',',':'00024',
'Ц':'55571','Щ':'55571','Э':'61216','Ю':'55755',
};
const fullExtra={
 '0':[14,17,17,17,17,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],
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
  for(const type of ['focusin','focusout','input','change','scroll','toggle'])win.addEventListener(type,draw,true);
  return ()=>{size.disconnect();changes.disconnect();for(const type of ['focusin','focusout','input','change','scroll','toggle'])win.removeEventListener(type,draw,true);};
 }
 return {paint,stop,watch};
}
