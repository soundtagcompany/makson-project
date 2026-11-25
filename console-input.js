import {onDesktopEvent} from './picture-in-picture.js';
// One spatial navigator for the shell, live application panels and the board iframe.
export function attachConsoleInput(api){
 const selector='button:not(:disabled),summary,input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]';
 let padFrame=0,lastDirection='',repeatAt=0,pressed=new Set(),highlight=null;
 const editing=e=>e?.matches('input,textarea,select,[contenteditable="true"]');
 const visible=e=>{const r=e.getBoundingClientRect(),s=e.ownerDocument.defaultView.getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!e.closest('[hidden],[inert]')&&(!e.closest('details:not([open])')||e.closest('summary'))&&!!e.getClientRects().length;};
 function currentDoc(){const pip=window.documentPictureInPicture?.window;if(pip?.document.hasFocus())return pip.document;const e=document.activeElement;return e?.tagName==='IFRAME'&&e.contentDocument?e.contentDocument:document;}
 function scope(doc){return doc.querySelector('.app-link-panel')||doc.fullscreenElement||[...doc.querySelectorAll('.console-panel:not([hidden]),.overlay:not([hidden])')].filter(visible).at(-1)||doc;}
 function candidates(doc){return [...scope(doc).querySelectorAll(selector)].filter(e=>visible(e)&&!e.matches('canvas,iframe')&&!e.closest('.console-resize'));}
 function focus(e){if(!e)return;highlight?.classList.remove('console-nav-focus');highlight=e;e.classList.add('console-nav-focus');e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 function navigate(direction,doc=currentDoc()){
  const list=candidates(doc),from=doc.activeElement;
  if(!list.includes(from)){focus(list.find(e=>e.matches('summary'))||list[0]);return;}
  const r=from.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,horizontal=direction==='left'||direction==='right',sign=direction==='left'||direction==='up'?-1:1;
  let best=null,score=Infinity;
  for(const el of list){if(el===from)continue;const b=el.getBoundingClientRect(),dx=b.x+b.width/2-x,dy=b.y+b.height/2-y,forward=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);if(forward<2)continue;const value=forward+cross*3;if(value<score){score=value;best=el;}}
  if(best)focus(best);
 }
 function home(){if(document.fullscreenElement?.classList.contains('window')){document.exitFullscreen().then(()=>home()).catch(()=>{});return;}document.activeElement?.blur();api.home();focus(document.querySelector('#app-catalog:not([inert]) summary')||document.getElementById('chat-launcher'));}
 function gameOwnsKeys(doc){const el=doc.activeElement;if(el?.closest('#app-catalog,.desktop-header,#console-dock,.console-panel,.titlebar,.app-link-panel'))return false;return !!doc.querySelector('#window-game:not([hidden]) #game-overlay[hidden],#window-kart:not([hidden]) .kart-play:not([hidden])')||el?.matches('canvas');}
 function activate(doc=currentDoc()){
  const el=doc.activeElement;
  if(!el||el===doc.body){navigate('down',doc);return;}
  if(el.matches('summary')){el.click();return;}
  if(el.matches('input[type=range]'))return;
  if(el.matches('select')){try{el.showPicker();}catch{}return;}
  if(!editing(el)||el.matches('input[type=checkbox],input[type=radio]'))el.click();else el.focus();
 }
 function key(e){
  if(e.key==='F6'){e.preventDefault();e.stopImmediatePropagation();home();return;}
  if(e.altKey||e.ctrlKey||e.metaKey||editing(e.target))return;
  if(e.target.closest('[data-native-keys]'))return;
  if(e.key==='Escape'&&(e.target.closest('.game-sound-control')||e.target.ownerDocument.querySelector('.app-link-panel')))return;
  const doc=e.target.ownerDocument||document;
  if(gameOwnsKeys(doc))return;
  const directions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if(directions[e.key]){e.preventDefault();e.stopImmediatePropagation();navigate(directions[e.key],doc);}
  else if(e.key==='Escape'){
   if(doc!==document||e.target.closest('.pulse-theft'))return;
   if(document.fullscreenElement||document.querySelector('.fullscreen-fallback'))return;
   e.preventDefault();e.stopImmediatePropagation();api.back();home();
  }
 }
 onDesktopEvent('keydown',key,true);
 const frame=document.getElementById('importopoly-frame');frame?.addEventListener('load',()=>{try{frame.contentDocument.addEventListener('keydown',key,true);}catch{}});
 document.addEventListener('pointerdown',()=>{highlight?.classList.remove('console-nav-focus');highlight=null;},true);
 function poll(now){
  padFrame=0;if(document.hidden)return;
  const pads=[...(navigator.getGamepads?.()||[])].filter(Boolean);if(!pads.length){pressed.clear();return;}
  const pad=pads[0],down=new Set(pad.buttons.map((b,i)=>b.pressed?i:-1).filter(i=>i>=0)),doc=currentDoc();
  if(down.has(9)&&!pressed.has(9))home();
  else if(!gameOwnsKeys(doc)){
   const direction=down.has(14)||pad.axes[0]<-.55?'left':down.has(15)||pad.axes[0]>.55?'right':down.has(12)||pad.axes[1]<-.55?'up':down.has(13)||pad.axes[1]>.55?'down':'';
   if(direction&&(direction!==lastDirection||now>=repeatAt)){
    const el=doc.activeElement;
    if(el?.matches('input[type=range]')){direction==='left'||direction==='down'?el.stepDown():el.stepUp();el.dispatchEvent(new Event('input',{bubbles:true}));}
    else if(el?.matches('select')){el.selectedIndex=Math.max(0,Math.min(el.options.length-1,el.selectedIndex+(direction==='left'||direction==='up'?-1:1)));el.dispatchEvent(new Event('change',{bubbles:true}));}
    else if(!editing(el))navigate(direction,doc);
    repeatAt=now+(direction===lastDirection?140:350);
   }
   lastDirection=direction;
   if(down.has(0)&&!pressed.has(0))activate(doc);
   if(down.has(1)&&!pressed.has(1)){if(editing(doc.activeElement))doc.activeElement.blur();else{api.back();home();}}
   if((down.has(4)&&!pressed.has(4))||(down.has(5)&&!pressed.has(5))){const list=candidates(doc),i=list.indexOf(doc.activeElement),delta=down.has(4)?-1:1;focus(list[(i+delta+list.length)%list.length]);}
  }
  pressed=down;padFrame=requestAnimationFrame(poll);
 }
 const wake=()=>{if(!padFrame&&!document.hidden)padFrame=requestAnimationFrame(poll);};
 addEventListener('gamepadconnected',wake);addEventListener('gamepaddisconnected',()=>{pressed.clear();lastDirection='';});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(padFrame);padFrame=0;}else wake();});wake();
}
