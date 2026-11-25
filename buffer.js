import {desktopElement,onDesktopEvent} from './picture-in-picture.js';
import {storage,toast,copy} from './app.js';
const $=id=>desktopElement(id),win=$('window-buffer'),text=$('buffer-text'),status=$('buffer-status');
const randomCode=()=>String(crypto.getRandomValues(new Uint32Array(1))[0]%1000).padStart(3,'0'),writer=crypto.randomUUID();
$('buffer-code').value=storage.get('buffer_code','')||randomCode();text.value=storage.get('draft','');$('buffer-file').disabled=false;$('buffer-file').multiple=true;
let room='',source,timer,epoch=0,dirty=false,revision=-1,posting=Promise.resolve(),queue=Promise.resolve(),activeUpload,poll;
async function request(action,options={}){const response=await fetch('/api/buffer/'+action,options);const data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка передачи');return data;}
const types={image:['png','jpg','jpeg','webp','gif','avif','svg','heic','bmp'],video:['mp4','mov','webm','mkv','avi'],audio:['mp3','wav','flac','ogg','m4a','aac','opus'],archive:['zip','rar','7z','tar','gz'],sheet:['csv','xls','xlsx','ods'],code:['js','ts','py','html','css','json','sh'],document:['txt','md','doc','docx','odt','rtf','pdf']};
const marks={image:'M4 13 8 8l3 3 2-2 3 4M5 5h2v2H5z',video:'m7 5 7 4-7 4z',audio:'M8 5v8H5v-3h3m0-5 6-1v7h-3V8h3',archive:'M9 3h3v2H9v2h3v2H9v2h3v3H9z',sheet:'M4 5h12v9H4zM4 8h12M8 5v9M12 5v9',code:'m7 5-4 4 4 4m6-8 4 4-4 4',document:'M5 5h8M5 8h10M5 11h10M5 14h7',file:'M5 6h8M5 10h10'};
function fileIcon(file){
 const ext=file.name.includes('.')?file.name.split('.').pop().toLowerCase():'file',kind=Object.keys(types).find(key=>types[key].includes(ext))||'file';
 const glyph=document.createElement('span');glyph.className='buffer-file-glyph';glyph.dataset.kind=kind;glyph.setAttribute('aria-hidden','true');
 glyph.innerHTML='<svg viewBox="0 0 24 30"><path d="M2 1h13l7 7v21H2zM15 1v8h7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="'+marks[kind]+'" transform="translate(2 7)" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
 const badge=document.createElement('b');badge.textContent=ext.slice(0,5).toUpperCase();glyph.append(badge);return glyph;
}
function receive(data){
 if(data.code!==room)return;if(!dirty&&data.textRevision!==revision){text.value=data.text;storage.set('draft',text.value);}revision=data.textRevision;
 const list=$('file-status');list.replaceChildren();
 for(const f of data.files.slice().reverse()){
  const a=document.createElement('a');a.href=f.url;a.download=f.name;a.title='Скачать '+f.name;
  const name=document.createElement('span');name.className='buffer-file-name';name.textContent=f.name;
  const size=document.createElement('small');size.textContent=f.size<1048576?Math.ceil(f.size/1024)+' КБ':(f.size/1048576).toFixed(1)+' МБ';
  a.append(fileIcon(f),name,size);list.append(a);
 }
 if(!data.files.length)list.textContent='Файлов пока нет.';
}
function disconnect(){epoch++;clearTimeout(timer);clearInterval(poll);source?.close();source=null;activeUpload?.abort();room='';revision=-1;$('buffer-connect').textContent='Подключить';status.textContent='Локальный черновик';}
async function connect(roomId){const code=$('buffer-code').value.trim();if(!/^\d{3}$/.test(code))throw Error('Код буфера — три цифры.');disconnect();room=code;dirty=false;storage.set('buffer_code',code);const e=epoch;$('buffer-connect').textContent='Отключить';status.textContent='Подключение…';try{const suffix='&session='+encodeURIComponent(typeof roomId==='string'?roomId:'');const data=await request('state?code='+code+suffix);if(e!==epoch)return;receive(data);source=new EventSource('/api/buffer/events?code='+code+suffix);source.onmessage=event=>{if(e!==epoch)return;try{receive(JSON.parse(event.data));}catch{}};source.onopen=()=>{if(e===epoch){clearInterval(poll);status.textContent='НА СВЯЗИ · '+code;document.dispatchEvent(new CustomEvent('console-activity',{detail:'Буфер подключён: '+code}));}};source.onerror=()=>{if(e!==epoch)return;status.textContent='Восстанавливаем связь…';clearInterval(poll);poll=setInterval(async()=>{if(document.hidden)return;try{const d=await request('state?code='+code+suffix);if(e===epoch)receive(d);}catch{}},5000);};return code;}catch(error){if(e===epoch)disconnect();throw error;}}
$('buffer-connect').onclick=()=>room?disconnect():connect().catch(e=>toast(e.message));$('buffer-new').onclick=()=>{disconnect();$('buffer-code').value=randomCode();$('file-status').textContent='Файлов пока нет.';};$('copy-buffer').onclick=()=>copy(text.value);
text.addEventListener('input',()=>{dirty=true;storage.set('draft',text.value);clearTimeout(timer);if(!room)return;const e=epoch,code=room;timer=setTimeout(()=>{const value=text.value;posting=posting.then(async()=>{if(e!==epoch)return;try{status.textContent='Отправляем текст…';const d=await request('text?code='+code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value,writer})});if(e!==epoch)return;if(text.value===value)dirty=false;receive(d);status.textContent='Текст отправлен · '+code;}catch(error){if(e===epoch)status.textContent=error.message+' · черновик сохранён';}});},450);});
function upload(file,code,e){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();activeUpload=xhr;xhr.open('PUT','/api/buffer/upload?code='+code+'&name='+encodeURIComponent(file.name));xhr.timeout=120000;xhr.upload.onprogress=p=>{if(e===epoch)status.textContent=file.name+' · '+Math.round(p.loaded/(p.total||file.size||1)*100)+'%';};xhr.onload=()=>{activeUpload=null;let d;try{d=JSON.parse(xhr.responseText);}catch{return reject(Error('Сервер отклонил файл.'));}if(xhr.status>=400)return reject(Error(d.error||'Файл не отправлен.'));if(e===epoch){receive(d);status.textContent='Файл отправлен · '+code;document.dispatchEvent(new CustomEvent('console-activity',{detail:'Файл принят: '+file.name}));}resolve();};xhr.onerror=xhr.ontimeout=()=>{activeUpload=null;reject(Error('Передача прервалась. Попробуй снова.'));};xhr.onabort=()=>{activeUpload=null;resolve();};xhr.send(file);});}
function enqueue(files){const list=[...files],requestedCode=$('buffer-code').value.trim();queue=queue.then(async()=>{if($('buffer-code').value.trim()!==requestedCode)return;if(!room||room!==requestedCode)await connect();const e=epoch,code=room;for(const file of list){if(e!==epoch)return;if(file.size>20*1024*1024){toast(file.name+': больше 20 МБ');continue;}await upload(file,code,e);}}).catch(error=>{status.textContent=error.message;toast(error.message);});}
$('buffer-file').onchange=e=>{enqueue(e.target.files);e.target.value='';};
let depth=0;const isFile=e=>[...(e.dataTransfer?.types||[])].includes('Files');
const overlay=document.createElement('div');overlay.className='buffer-drop-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<b>ОТПУСТИ ФАЙЛЫ</b><span>Весь буфер — зона загрузки</span>';win.append(overlay);
const dragState=on=>win.classList.toggle('buffer-drag-over',on);
onDesktopEvent('dragover',e=>{if(!isFile(e))return;e.preventDefault();e.dataTransfer.dropEffect=e.target.closest('#window-buffer')?'copy':'none';});
win.addEventListener('dragenter',e=>{if(!isFile(e))return;e.preventDefault();depth++;dragState(true);});
win.addEventListener('dragover',e=>{if(isFile(e)){e.preventDefault();dragState(true);e.dataTransfer.dropEffect='copy';}});
win.addEventListener('dragleave',()=>{if(--depth<=0){depth=0;dragState(false);}});
onDesktopEvent('drop',e=>{if(!isFile(e))return;e.preventDefault();depth=0;dragState(false);if(e.target.closest('#window-buffer'))enqueue(e.dataTransfer.files);});
for(const event of ['dragend','windowhide'])document.addEventListener(event,()=>{depth=0;dragState(false);});
onDesktopEvent('paste',e=>{if(!e.target.closest('#window-buffer')||!e.clipboardData?.files.length)return;e.preventDefault();enqueue(e.clipboardData.files);});

export async function prepareInvite(){
 if(!room)throw Error('Сначала подключите буфер по коду. Затем можно поделиться этой сессией.');
 const code=room,e=epoch;clearTimeout(timer);await posting;await queue;
 if(e!==epoch||room!==code)throw Error('Буфер отключён. Подключитесь снова.');
 if(dirty){const value=text.value;const data=await request('text?code='+code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value,writer})});if(e!==epoch)throw Error('Буфер отключён.');if(text.value===value)dirty=false;receive(data);}
 const data=await request('invite?code='+code,{method:'POST'});return {code,roomId:data.roomId};
}
export async function joinInvitation(code,roomId){
 if(room&&room!==code)throw Error('Сначала отключитесь от текущего буфера.');
 // Validate before disconnecting, so an expired link cannot discard the current session.
 await request('state?code='+encodeURIComponent(code)+'&session='+encodeURIComponent(roomId));
 if(room===code)return;$('buffer-code').value=code;await connect(roomId);
}
