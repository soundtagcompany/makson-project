// The catalog and the sphere share one selection; applications keep their live DOM.
const apps=[
 {id:'editor',color:'#9de1da',name:'МОНТАЖКА',group:'programs',glyph:'✂'},
 {id:'convert',color:'#ffc17b',name:'КОНВЕРТЕР',group:'programs',glyph:'⇄'},
 {id:'download',color:'#7bc8ff',name:'ЗАГРУЗЧИК',group:'programs',glyph:'↓'},
 {id:'meme',color:'#ffaece',name:'МЕМОИНАТОР',group:'programs',glyph:'▧'},
 {id:'buffer',color:'#8cf5ba',name:'БУФЕР',group:'programs',glyph:'▤'},
 {id:'game',color:'#bd8aff',name:'ГИПНОРОЙДЕР',group:'games',glyph:'↑'},
 {id:'importopoly',color:'#ffd56c',name:'СДВГПОЛИЯ',group:'games',glyph:'▦'},
 {id:'pulse',color:'#ff7585',name:'ПУЛЬС',group:'games',glyph:'ϟ'},
 {id:'naval',color:'#75d9ff',name:'МОРСКАЯ ДВИЖУХА',group:'games',glyph:'≋'},
];
// Shared square-grid pictograms keep the catalog and sphere visually consistent.
const iconPaths={
 editor:'M2 4h20v18H2zM7 4v18M17 4v18M2 10h5m-5 6h5M17 10h5m-5 6h5M10 9l4 4-4 4z',
 convert:'M3 6h15m-4-4 4 4-4 4M21 18H6m4-4-4 4 4 4',
 download:'M12 2v13m-5-5 5 5 5-5M3 16v6h18v-6',
 meme:'M3 3h18v19H3zM7 8h3m4 0h3M7 14v3h10v-3M9 17v2m6-2v2',
 buffer:'M7 4H3v18h18V4h-4M8 2h8v5H8zM7 12h10M7 17h7',
 game:'m12 2 5 7v9H7V9zM7 12l-4 5v4h4m10-9 4 5v4h-4M10 11h4v4h-4zM10 21v3m4-3v3',
 importopoly:'M3 3h18v18H3zM3 8h18M8 3v18M16 3v18M3 16h18M10 10h4v4h-4z',
 pulse:'M2 3h20v18H2zM4 12h4l2-5 4 10 2-5h4',
 naval:'M2 15h20l-4 6H6zM7 15V8h10v7M12 8V2m0 3h7M2 24h20',
 kart:'M4 9h16v9H4zM7 9V4h10v5M2 12v9m20-9v9'
};
const appIcon=id=>`<svg class="app-pixel-icon" viewBox="0 0 24 26" aria-hidden="true"><path d="${iconPaths[id]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>`;
let callbacks,selected='',zoom=1;
const $=id=>document.getElementById(id);
export function mountConsole(){
 document.documentElement.classList.remove('desktop-boot','intro-running');
 document.querySelector('.desktop-header').innerHTML=`<div class="console-zoom"><button id="zoom-in" aria-label="Увеличить интерфейс">+</button><button id="zoom-out" aria-label="Уменьшить интерфейс">−</button></div><h1>MAKSON PROJECT</h1><div class="console-actions"><button id="svyaz-signin-hint" aria-label="Войти в аккаунт СВЯЗЬ" hidden>ВОЙТИ &gt;</button><button id="chat-launcher" aria-expanded="false" aria-controls="window-svyaz"><svg class="svyaz-app-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 3h16v11H9l-5 4v-4H2zM5 7h10M5 10h6" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>СВЯЗЬ</span><b></b></button><button id="console-settings" aria-label="Настройки" aria-expanded="false" aria-controls="window-settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v4h3V4h2v5h2v6h-4v3h2v2h-5v2H9v-4H6v2H4v-5H2V9h4V6H4V4h5Z"/><path d="M9 9h6v6H9Z"/></svg></button></div>`;
 const header=document.querySelector('.desktop-header'),zoomControls=header.querySelector('.console-zoom');
 header.prepend($('console-settings'));zoomControls.remove();
 zoomControls.insertAdjacentHTML('afterbegin','<span>МАСШТАБ</span>');
 zoomControls.querySelector('#zoom-out').after(Object.assign(document.createElement('output'),{id:'zoom-value'}));
 zoomControls.append(zoomControls.querySelector('#zoom-out'),zoomControls.querySelector('#zoom-value'),zoomControls.querySelector('#zoom-in'));
 const screenControls=document.createElement('div');screenControls.className='screen-settings';screenControls.append(zoomControls);
 $('window-settings').querySelector('.utility-body').prepend(screenControls);
 const shell=document.createElement('div');shell.id='console-shell';shell.innerHTML=`<aside id="app-catalog" aria-label="Каталог приложений"><div id="catalog-groups"></div></aside><button id="catalog-toggle" aria-label="Свернуть каталог" aria-expanded="true" aria-controls="app-catalog">‹</button><main id="app-workspace" aria-label="Рабочая область"></main>`;
 document.querySelector('.desktop-header').after(shell);
 const workspace=$('app-workspace');workspace.append($('sphere-stage'));const dock=document.createElement('nav');dock.id='console-dock';dock.setAttribute('aria-label','Свёрнутые приложения');dock.hidden=true;workspace.append(dock);
 for(const win of document.querySelectorAll('.window')){if(['window-svyaz','window-settings'].includes(win.id)){win.classList.add('console-panel');document.body.append(win);}else workspace.append(win);}
 $('sphere-stage').querySelector('.desktop-icons').innerHTML=apps.map(a=>`<button class="desktop-icon" data-sphere-app="${a.id}" style="--app-color:${a.color}" aria-label="Открыть ${a.name}"><span class="node-symbol" aria-hidden="true">${appIcon(a.id)}</span><span>${a.name}</span></button>`).join('');
 for(const app of apps){const win=$('window-'+app.id);if(win){win.style.setProperty('--app-color',app.color);win.classList.add('console-colored-app');}}
 for(const [id,title] of [['programs','ПРОГРАММЫ'],['games','ИГРЫ']]){
  const group=document.createElement('details');group.className='catalog-group';group.open=true;group.innerHTML=`<summary>${title}<span>${apps.filter(a=>a.group===id).length}</span></summary><div class="catalog-items">${apps.filter(a=>a.group===id).map(a=>`<div class="catalog-row" data-app="${a.id}"><button data-select-app="${a.id}" aria-pressed="false"><span class="catalog-app-icon">${appIcon(a.id)}</span><span class="catalog-app-name">${a.name}</span><span class="catalog-caret" aria-hidden="true">›</span></button><button class="catalog-pip" data-pip-app="${a.id}" title="Системная картинка в картинке" aria-label="Картинка в картинке: ${a.name}" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h20v16H2Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12h8v6h-8Z" fill="currentColor"/></svg></button></div>`).join('')}</div>`;$('catalog-groups').append(group);
 }
 const tabs=$('overview-tabs');tabs.innerHTML='<button data-overview="chat" aria-selected="true">ЧАТЫ</button><button data-overview="account" id="overview-account" aria-selected="false">ПРОФИЛЬ</button>';
 $('window-svyaz').querySelector('.titlebar').after(tabs);tabs.after($('svyaz-root'));
 const chatIcon=$('chat-launcher').querySelector('svg').cloneNode(true);$('window-svyaz').querySelector('.titlebar>span>svg').replaceWith(chatIcon);
 for(const panel of document.querySelectorAll('.console-panel'))panel.querySelector('[data-action=close]').innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 $('window-svyaz').querySelector('[data-action=minimize]').innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 11h12" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
 for(const row of $('window-settings').querySelectorAll('.volume-setting'))row.remove();
 $('window-settings').querySelector('h2').remove();
 $('window-settings').querySelector('.titlebar>span').textContent='НАСТРОЙКИ';
 $('window-settings').querySelectorAll('.subtle,.window-status,.setting small').forEach(el=>el.remove());
 $('setting-sound').closest('label').querySelector('b').textContent='Звуки интерфейса';
 const footer=document.createElement('div');footer.className='settings-footer';
 $('reset-settings').textContent='Сбросить';footer.append($('reset-settings'));
 const hint=document.createElement('details');hint.className='console-input-help';hint.innerHTML='<summary>Управление</summary><p>Стрелки — выбор<br>Enter — открыть · Esc — назад<br>F6 — каталог<br>Геймпад: стик / крестовина, A — выбрать, B — назад, Start — каталог.</p>';footer.append(hint);$('window-settings').querySelector('.utility-body').append(footer);
 const full=document.createElement('button');full.id='site-fullscreen';full.className='xp-button';full.setAttribute('aria-label','Сайт на весь экран устройства');full.textContent='Вкл.';const fullRow=document.createElement('div');fullRow.className='settings-fullscreen';fullRow.innerHTML='<span>Полный экран</span>';fullRow.append(full);screenControls.append(fullRow);
 const syncToggle=()=>{const portrait=matchMedia('(max-width:700px), (max-width:950px) and (pointer:coarse)').matches&&matchMedia('(orientation:portrait)').matches,collapsed=document.body.classList.contains('catalog-collapsed');$('catalog-toggle').textContent=portrait?(collapsed?'⌃':'⌄'):(collapsed?'›':'‹');};
 addEventListener('resize',syncToggle);document.addEventListener('catalogchange',syncToggle);syncToggle();
}
let catalogMotion=null;
export function setCatalogCollapsed(value){
 const catalog=$('app-catalog'),workspace=$('app-workspace'),toggle=$('catalog-toggle'),shell=$('console-shell');
 const changed=document.body.classList.contains('catalog-collapsed')!==value;
 const moving=changed&&callbacks?.storage.get('settings',{}).motion!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const before=moving?[catalog,workspace,toggle].map(el=>el.getBoundingClientRect()):null;
 catalogMotion?.();catalogMotion=null;
 document.body.classList.toggle('catalog-collapsed',value);catalog.inert=value;
 toggle.setAttribute('aria-expanded',String(!value));toggle.setAttribute('aria-label',value?'Раскрыть каталог':'Свернуть каталог');toggle.textContent=value?'›':'‹';
 if(moving){
  // Commit the pane layout once. Only compositor motion follows, so the sphere canvas
  // and live games are not resized and repainted on every animation frame.
  const after=[catalog,workspace,toggle].map(el=>el.getBoundingClientRect()),z=Number(document.body.style.zoom)||1;
  const phone=matchMedia('(max-width:700px), (max-width:950px) and (pointer:coarse)').matches&&matchMedia('(orientation:portrait)').matches,box=value?before[0]:after[0],shellBox=shell.getBoundingClientRect();
  const saved=catalog.style.cssText;
  catalog.style.cssText+=`;position:absolute;left:${(box.x-shellBox.x)/z}px;top:${(box.y-shellBox.y)/z}px;width:${box.width/z}px;height:${box.height/z}px;padding:${phone?'14px 20px 18px':'28px 26px 20px'};visibility:visible;box-sizing:border-box;z-index:2`;
  shell.classList.add('catalog-in-motion');
  const slide=phone?`0 ${box.height/z}px`:`${-box.width/z}px 0`,ease='cubic-bezier(.22,1,.36,1)',options={duration:560,easing:ease};
  const animations=[catalog.animate([{translate:value?'0 0':slide,opacity:value?1:0},{translate:value?slide:'0 0',opacity:value?0:1}],options)];
  const from=before[1],to=after[1],right=Math.max(0,(to.width-from.width)/z),bottom=Math.max(0,(to.height-from.height)/z);
  animations.push(workspace.animate([{translate:`${(from.x-to.x)/z}px ${(from.y-to.y)/z}px`,clipPath:`inset(0 ${right}px ${bottom}px 0)`},{translate:'0 0',clipPath:'inset(0 0 0 0)'}],options));
  animations.push(toggle.animate([{translate:`${(before[2].x-after[2].x)/z}px ${(before[2].y-after[2].y)/z}px`},{translate:'0 0'}],options));
  const cleanup=()=>{animations.forEach(a=>a.cancel());catalog.style.cssText=saved;shell.classList.remove('catalog-in-motion');};
  catalogMotion=cleanup;Promise.all(animations.map(a=>a.finished)).then(()=>{if(catalogMotion===cleanup){cleanup();catalogMotion=null;}}).catch(()=>{});
 }
 document.dispatchEvent(new CustomEvent('catalogchange',{detail:value}));dispatchEvent(new Event('resize'));
}

function selectApp(id){
 selected=id;
 for(const row of document.querySelectorAll('.catalog-row')){const chosen=row.dataset.app===id;row.classList.toggle('selected',chosen);row.querySelector('[data-select-app]').setAttribute('aria-pressed',String(chosen));row.querySelector('[data-pip-app]').hidden=!chosen;}
 document.dispatchEvent(new CustomEvent('appselect',{detail:id}));
}
export function bindConsole(api){
 callbacks=api;
 document.addEventListener('sphere-deselect',()=>{if(selected)selectApp('');});
 $('catalog-groups').addEventListener('click',e=>{
  const pip=e.target.closest('[data-pip-app]');if(pip){api.open(pip.dataset.pipApp);api.pip($('window-'+pip.dataset.pipApp));return;}
  const button=e.target.closest('[data-select-app]');if(!button)return;const id=button.dataset.selectApp;
  if(selected===id)api.open(id);else{api.preview();selectApp(id);}
 });
 $('sphere-stage').addEventListener('click',e=>{const b=e.target.closest('[data-sphere-app]');if(b){const id=b.dataset.sphereApp;if(selected===id)api.open(id);else selectApp(id);}});
 document.addEventListener('desktopfullscreenchange',()=>{if(document.body.classList.contains('game-fullscreen-on')){catalogMotion?.();catalogMotion=null;}});
 $('catalog-toggle').onclick=()=>setCatalogCollapsed(!document.body.classList.contains('catalog-collapsed'));
 document.addEventListener('click',e=>{
  if(selected&&!e.target.closest('[data-select-app],[data-sphere-app],[data-pip-app]'))selectApp('');
 });
 document.addEventListener('windowhide',e=>{if(e.detail===selected)selectApp('');});
 document.querySelector('.desktop-header h1').setAttribute('data-logo','MAKSON PROJECT');
 $('svyaz-signin-hint').onclick=()=>api.open('home');
 document.addEventListener('accountchange',e=>{const guest=!e.detail.user;$('svyaz-signin-hint').hidden=!guest;document.querySelector('.desktop-header').classList.toggle('has-login-hint',guest);});
 $('chat-launcher').onclick=()=>api.toggle('svyaz');$('console-settings').onclick=()=>api.toggle('settings');
 const sync=()=>{for(const [button,id]of [['chat-launcher','svyaz'],['console-settings','settings']])$(button).setAttribute('aria-expanded',String(!document.getElementById('window-'+id)?.hidden));};
 for(const event of ['windowfocus','windowhide'])document.addEventListener(event,sync);
 let appliedZoom=0,scaleTimer=0,scaleFrame=0;
 const commitScale=()=>{
  scaleFrame=0;const next=zoom;if(next===appliedZoom)return;
  document.documentElement.style.setProperty('--ui-scale',next);document.documentElement.style.fontSize='18px';document.body.style.zoom=next;appliedZoom=next;
  api.storage.set(matchMedia('(max-width:700px), (max-width:950px) and (pointer:coarse)').matches?'mobile_ui_scale':'ui_scale',next);dispatchEvent(new Event('resize'));
 };
 const scale=(animated=false)=>{
  zoom=Math.max(.8,Math.min(1.8,Math.round(zoom*10)/10));$('zoom-value').textContent=Math.round(zoom*100)+'%';$('zoom-in').disabled=zoom>=1.8;$('zoom-out').disabled=zoom<=.8;
  // A burst changes the live layout once per frame; never allocate full-screen snapshots.
  if(!animated){commitScale();return;}
  if(!scaleFrame)scaleFrame=requestAnimationFrame(commitScale);
  document.documentElement.classList.add('console-scaling');document.dispatchEvent(new Event('console-scale-change'));clearTimeout(scaleTimer);
  scaleTimer=setTimeout(()=>{document.documentElement.classList.remove('console-scaling');document.dispatchEvent(new Event('console-scale-change'));},180);
 };
 const mobile=matchMedia('(max-width:700px), (max-width:950px) and (pointer:coarse)').matches;const initialZoom=mobile?1:1.3;const savedZoom=Number(api.storage.get(mobile?'mobile_ui_scale':'ui_scale',initialZoom));zoom=savedZoom||initialZoom;if(!api.storage.get('large_ui_default',false)){if(savedZoom===1)zoom=initialZoom;api.storage.set('large_ui_default',true);}scale();$('zoom-in').onclick=()=>{zoom+=.1;scale(true);};$('zoom-out').onclick=()=>{zoom-=.1;scale(true);};
 document.addEventListener('catalogfullscreen',e=>setCatalogCollapsed(e.detail));
 try{localStorage.removeItem('makson_catalog_collapsed');}catch{}
 setCatalogCollapsed(false);
}

// The same controls stay attached to each live window, including native PiP.
export function attachGameControls(settings,save){
 const panels=[];
 for(const id of ['game','naval','pulse','importopoly']){
  const win=$('window-'+id),host=document.createElement('div');host.className='game-sound-control';
  host.innerHTML=`<button class="game-sound-button" aria-label="Музыка и звуки" aria-expanded="false" aria-controls="${id}-sound-panel"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 7h4l5-4v14l-5-4H2zM14 7v6M17 5v10" fill="none" stroke="currentColor" stroke-width="2"/></svg></button><div id="${id}-sound-panel" class="game-sound-panel" hidden><b>ЗВУК</b>${[['music','Музыка'],['effects','Звуки']].map(([key,label])=>`<label for="${id}-${key}"><span>${label}</span><output for="${id}-${key}"></output><input id="${id}-${key}" data-game-volume="${key}" type="range" min="0" max="100" step="1"></label>`).join('')}</div>`;
  win.querySelector('.window-controls').prepend(host);const button=host.querySelector('button'),panel=host.querySelector('.game-sound-panel');
  const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');};
  const fit=()=>{if(panel.hidden)return;panel.style.right='0px';const view=host.ownerDocument.defaultView,r=panel.getBoundingClientRect(),zoom=parseFloat(view.getComputedStyle(host.ownerDocument.body).zoom)||1;panel.style.right=(Math.min(0,r.left-8)+Math.max(0,r.right-view.innerWidth+8))/zoom+'px';};
  panels.push({host,panel,button,close,fit});
  button.addEventListener('click',e=>{e.stopPropagation();const open=panel.hidden;panels.forEach(p=>p.close());panel.hidden=!open;button.setAttribute('aria-expanded',String(open));fit();if(open&&settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)panel.animate([{opacity:0,translate:'0 -6px'},{opacity:1,translate:'0 0'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});});
  host.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();e.stopPropagation();close();button.focus();}});
  host.addEventListener('input',e=>{const key=e.target.dataset.gameVolume;if(!key)return;settings[key+'Volume']=Number(e.target.value)/100;if(key==='music')settings.music=true;else if(settings.effectsVolume>0)settings.sound=true;save();});
 }
 const sync=()=>{for(const {host} of panels)for(const input of host.querySelectorAll('input')){const value=Math.round(Math.max(0,Math.min(1,settings[input.dataset.gameVolume+'Volume']))*100);input.value=value;input.previousElementSibling.value=value+'%';}};
 const bind=doc=>{doc.addEventListener('pointerdown',e=>{for(const item of panels)if(!item.host.contains(e.target))item.close();},true);doc.addEventListener('focusin',e=>{for(const item of panels)if(!item.host.contains(e.target))item.close();});doc.defaultView.addEventListener('resize',()=>panels.forEach(p=>p.fit()));};
 bind(document);document.addEventListener('console-pip-ready',e=>bind(e.detail));
 document.addEventListener('settingschange',sync);document.addEventListener('windowhide',()=>panels.forEach(p=>p.close()));sync();
}
const gameLoads=new Map();
export function loadGame(id,work,settings){
 if(gameLoads.has(id))return gameLoads.get(id);
 const win=$('window-'+id),cover=document.createElement('div');cover.className='game-loading';cover.setAttribute('role','status');
 cover.innerHTML='<span class="loading-symbol" aria-hidden="true">▥</span><b></b><span class="loading-label">ЗАГРУЗКА</span><div class="loading-track" aria-hidden="true"><i></i></div>';
 cover.querySelector('b').textContent=win.dataset.title;win.append(cover);win.setAttribute('aria-busy','true');win.classList.add('game-is-loading');
 const motion=()=>settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const finish=()=>{win.removeAttribute('aria-busy');win.classList.remove('game-is-loading');};
 const task=(async()=>{
  try{
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   await work();
   const show=target=>{if(!target||win.hidden||!motion())return;target.animate([{opacity:.35},{opacity:1}],{duration:300,easing:'ease-out'});};
   for(const target of win.querySelectorAll('#game-overlay,#pulse-menu')){let hidden=target.hidden;new MutationObserver(()=>{if(hidden===target.hidden)return;hidden=target.hidden;show(hidden?win.querySelector('canvas'):target);}).observe(target,{attributes:true,attributeFilter:['hidden']});}
   if(id==='naval'){let setup=win.dataset.phase==='setup';new MutationObserver(()=>{const next=win.dataset.phase==='setup';if(next!==setup)show(win.querySelector('.naval-boards'));setup=next;}).observe(win,{attributes:true,attributeFilter:['data-phase']});}
   await new Promise(resolve=>requestAnimationFrame(resolve));finish();
   if(motion()&&!win.hidden){const animation=cover.animate([{opacity:1},{opacity:0}],{duration:380,easing:'ease-out'});await animation.finished.catch(()=>{});}
   cover.remove();
  }catch(error){
   finish();gameLoads.delete(id);cover.classList.add('load-failed');cover.querySelector('.loading-label').textContent='Не удалось загрузить игру';cover.querySelector('.loading-track').remove();
   const retry=document.createElement('button');retry.textContent='ПОВТОРИТЬ';retry.onclick=()=>{cover.remove();loadGame(id,work,settings);};cover.append(retry);
   console.error('Game load failed:',id,error);
  }
 })();gameLoads.set(id,task);return task;
}
