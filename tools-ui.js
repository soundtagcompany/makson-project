import {desktopElement} from './picture-in-picture.js';
const $=id=>desktopElement(id),bytes=n=>!n?'Размер неизвестен':n<1048576?(n/1024).toFixed(0)+' КБ':(n/1048576).toFixed(1)+' МБ';
const duration=s=>s?Math.floor(s/60)+' мин '+Math.round(s%60)+' с':'';
let capability;
async function api(path,{method='GET',body,signal}={}){const r=await fetch('/api/tools'+path,{method,signal,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'Ошибка сервера');return data;}
const state={convert:{},download:{}};
const kinds=['convert','download'];
function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
function status(kind,message,progress=null){const root=$(kind+'-tool'),label=root.querySelector('.tool-status'),bar=root.querySelector('progress');label.textContent=message;if(progress===null){bar.removeAttribute('value');bar.hidden=true;}else{bar.hidden=false;bar.value=progress;}}
function controls(kind,busy){const root=$(kind+'-tool');root.querySelectorAll('[data-lock]').forEach(e=>e.disabled=busy);root.querySelector('[data-cancel]').hidden=!busy;}
function remember(kind,job){state[kind].job=job;try{sessionStorage.setItem('makson_tool_'+kind,JSON.stringify({id:job.id,token:job.token}));}catch{}}
function showJob(kind,job){
 remember(kind,job);const root=$(kind+'-tool'),busy=['queued','working','uploading'].includes(job.status);controls(kind,busy);status(kind,job.error||job.phase,busy?job.progress:null);
 const result=root.querySelector('.tool-result');result.hidden=job.status!=='done';
 if(job.status==='done'){const a=result.querySelector('a');a.href=job.result.url;a.download=job.result.name;a.textContent='СКАЧАТЬ · '+bytes(job.result.size);result.querySelector('p').textContent=job.result.name;}
 if(job.outputs&&state[kind].signature!==JSON.stringify(job.outputs)){state[kind].signature=JSON.stringify(job.outputs);if(kind==='convert')converterOptions(job);else downloadOptions(job);}
 if(busy){clearTimeout(state[kind].timer);state[kind].timer=setTimeout(()=>poll(kind),document.hidden?4000:900);}
}
async function poll(kind){const s=state[kind];if(!s.job)return;const id=s.job.id;try{const job=await api('/jobs/'+id+'?token='+s.job.token);if(s.job?.id===id)showJob(kind,job);}catch(e){if(s.job?.id===id){status(kind,e.message);controls(kind,false);}}}
function reset(kind){const s=state[kind];clearTimeout(s.timer);s.signature=null;s.job=null;s.generation=(s.generation||0)+1;$(kind+'-tool').querySelector('.tool-result').hidden=true;try{sessionStorage.removeItem('makson_tool_'+kind);}catch{}}
function upload(file){
 if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(!Object.values(capability.groups).some(g=>g.input.includes(ext)))return status('convert','Этот формат пока не поддерживается. Список находится ниже.');
 if(file.size>capability.maxUpload)return status('convert','Максимум '+bytes(capability.maxUpload)+' на файл.');
 reset('convert');controls('convert',true);$('convert-name').textContent=file.name+' · '+bytes(file.size);$('convert-options').hidden=true;status('convert','Загружаем файл…',0);
 const xhr=new XMLHttpRequest();state.convert.upload=xhr;xhr.open('PUT','/api/tools/uploads?name='+encodeURIComponent(file.name));xhr.timeout=180000;
 xhr.upload.onprogress=e=>{if(e.lengthComputable)status('convert','Загружаем файл…',Math.round(e.loaded/e.total*100));};
 const fail=msg=>{state.convert.upload=null;controls('convert',false);status('convert',msg);};
 xhr.onerror=()=>fail('Загрузка прервалась. Проверь соединение.');xhr.ontimeout=()=>fail('Загрузка заняла слишком много времени.');xhr.onabort=()=>fail('Загрузка отменена.');
 xhr.onload=()=>{state.convert.upload=null;let data;try{data=JSON.parse(xhr.responseText);}catch{return fail('Сервер не принял файл. Попробуй файл меньшего размера.');}if(xhr.status>=400)return fail(data.error);showJob('convert',data);};xhr.send(file);
}
function converterOptions(job){
 const info=job.info,select=$('convert-format');select.replaceChildren();for(const ext of job.outputs){const o=document.createElement('option');o.value=ext;o.textContent=ext.toUpperCase();select.append(o);}
 $('convert-name').textContent=job.name+' · '+bytes(info.size)+(info.duration?' · '+duration(info.duration):'')+(info.width?' · '+info.width+'×'+info.height:'');$('convert-note').textContent=info.note;$('convert-options').hidden=false;
 const update=()=>{const out=select.value,audio=['mp3','m4a','wav','flac','ogg','opus','aac','aiff'].includes(out);for(const field of $('convert-options').querySelectorAll('[data-kind]'))field.hidden=!field.dataset.kind.split(' ').includes(info.family);$('convert-video-options').hidden=info.family!=='video'||audio;$('convert-audio-options').hidden=!['video','audio'].includes(info.family);$('convert-gif-note').hidden=out!=='gif'||info.family!=='video';};select.onchange=update;update();
}
function downloadOptions(job){
 $('download-title').textContent=job.name;$('download-meta').textContent=[job.info.author,duration(job.info.duration)].filter(Boolean).join(' · ');$('download-options').hidden=false;
 const select=$('download-format'),filter=$('download-type');
 const fill=()=>{select.replaceChildren();for(const choice of job.outputs.filter(o=>filter.value==='all'||o.type===filter.value)){const o=document.createElement('option');o.value=choice.id;o.textContent=choice.label+(choice.size?' · ≈'+bytes(choice.size):'');select.append(o);} $('download-submit').disabled=!select.options.length;};filter.onchange=fill;fill();
}
const mediaFields=`<div data-kind="video audio" class="tool-grid"><label>Начало, секунды<input name="start" type="number" min="0" max="7200" step="0.1" value="0"></label><label>Конец, секунды<input name="end" type="number" min="0" max="7200" step="0.1" value="0"><small>0 — до конца</small></label></div><div id="convert-video-options" class="tool-grid"><label>Разрешение<select name="height"><option value="original">Как в исходнике</option value="1080">До 1080p</option><option value="720">До 720p</option><option value="480">До 480p</option><option value="360">До 360p</option></select></label><label>Качество<select name="quality"><option value="balanced">Баланс</option><option value="high">Выше качество</option><option value="small">Меньше файл</option></select></label></div><div id="convert-audio-options" class="tool-grid"><label>Аудио, кбит/с<select name="bitrate">${[64,96,128,160,192,256,320].map(v=>`<option ${v===192?'selected':''}>${v}</option>`).join('')}</select></label><label>Частота<select name="sampleRate"><option value="original">Как в исходнике</option><option value="44100">44,1 кГц</option><option value="48000">48 кГц</option></select></label></div><div data-kind="image" class="tool-grid"><label>Макс. ширина<input name="width" type="number" value="0" min="0" max="8192"><small>0 — не менять</small></label><label>Макс. высота<input name="imageHeight" type="number" value="0" min="0" max="8192"></label><label>Качество JPG/WebP/AVIF<input name="imageQuality" type="range" min="10" max="100" value="88"></label><label>Фон без прозрачности<select name="background"><option value="white">Белый</option><option value="black">Чёрный</option></select></label></div><div data-kind="pdf" class="tool-grid"><label>Первые страницы<input name="pages" type="number" min="1" max="200" value="50"></label><label>Качество изображений<select name="dpi"><option value="120">120 DPI</option><option value="72">72 DPI</option><option value="200">200 DPI</option></select></label></div>`;
function common(){return '<div class="tool-progress"><p class="tool-status" role="status" aria-live="polite">Подключаемся…</p><progress max="100" hidden></progress><button type="button" data-cancel hidden>ОТМЕНИТЬ</button><button type="button" data-retry hidden>ПОВТОРИТЬ ПОДКЛЮЧЕНИЕ</button></div><div class="tool-result" hidden><p></p><a class="tool-primary">СКАЧАТЬ</a></div><p class="tool-retention">Файлы хранятся до часа. Обработка продолжается при сворачивании окна.</p>';}
async function connectTools(){
 const retries=kinds.map(kind=>$(kind+'-tool').querySelector('[data-retry]'));
 for(const retry of retries)retry.hidden=true;
 for(const kind of kinds)status(kind,'Подключаемся…');
 try{
  capability=await api('/capabilities');
 }catch(error){
  for(const kind of kinds)status(kind,error.message);
  for(const retry of retries)retry.hidden=false;
  return;
 }
 $('convert-file').disabled=false;
 $('download-link-form').querySelector('[type=submit]').disabled=false;
 $('download-paste').disabled=false;
 const list=$('tool-format-list');
 for(const group of Object.values(capability.groups)){
  const el=document.createElement('p');el.append(text('b',group.label),text('span',group.input.join(', ').toUpperCase()+' → '+group.output.join(', ').toUpperCase()));list.append(el);
 }
 for(const kind of kinds){
  status(kind,'Готово к работе');
  try{const job=JSON.parse(sessionStorage.getItem('makson_tool_'+kind));if(job){state[kind].job=job;poll(kind);}}catch{}
 }
}
export async function initTools(){
 $('convert-tool').innerHTML=`<h2>КОНВЕРТЕР</h2><p class="tool-lead">Видео в аудио, изображения, документы и другие форматы.</p><label class="tool-drop"><span>ВЫБРАТЬ ФАЙЛ</span><small>или перетащи сюда · до 256 МБ</small><input id="convert-file" type="file" data-lock disabled></label><p id="convert-name"></p><form id="convert-options" hidden><label>Формат<select id="convert-format" name="target" data-lock></select></label><p id="convert-note" class="tool-note"></p><p id="convert-gif-note" class="tool-note" hidden>GIF: до 30 секунд, 12 кадров/с, без звука.</p><button type="submit" class="tool-primary" data-lock>КОНВЕРТИРОВАТЬ →</button><details class="tool-details"><summary>ПАРАМЕТРЫ</summary>${mediaFields}</details></form>${common()}<details class="tool-details"><summary>ВСЕ ФОРМАТЫ</summary><div id="tool-format-list"></div></details>`;
 $('download-tool').innerHTML=`<h2>ЗАГРУЗЧИК</h2><p class="tool-lead">Видео и аудио из YouTube и TikTok.</p><form id="download-link-form"><label for="download-url">Ссылка на видео</label><div class="tool-link"><input id="download-url" type="url" placeholder="https://…" required data-lock><button type="button" id="download-paste" data-lock disabled>ВСТАВИТЬ ССЫЛКУ</button></div><button class="tool-primary" type="submit" data-lock disabled>НАЙТИ ВАРИАНТЫ →</button></form><form id="download-options" hidden><h3 id="download-title"></h3><p id="download-meta"></p><label>Показать<select id="download-type" data-lock><option value="all">Видео и аудио</option value="video">Только видео</option><option value="audio">Только аудио</option></select></label><label>Вариант<select id="download-format" data-lock></select></label><p class="tool-note">Показаны варианты, которые отдаёт площадка. Размер может быть приблизительным; при объединении дорожек он увеличится.</p><button id="download-submit" class="tool-primary" data-lock>ПОДГОТОВИТЬ ФАЙЛ →</button></form>${common()}<details class="tool-details"><summary>КАК ЭТО РАБОТАЕТ</summary><p>Вставь ссылку на один ролик. Выбери качество и формат видео либо аудио. Раздельные видео- и аудиодорожки объединяются на сервере.</p><p>Приватные ролики, прямые эфиры и ролики с ограниченным доступом недоступны. Иногда YouTube или TikTok временно ограничивают скачивание с сервера.</p><p>До 2 часов и до 768 МБ результата. MP3, M4A, WAV, FLAC, OGG, OPUS, AAC и AIFF доступны при наличии аудиодорожки.</p></details>`;
 for(const kind of kinds)$(kind+'-tool').querySelector('[data-retry]').onclick=connectTools;
 for(const kind of kinds)$(kind+'-tool').querySelector('[data-cancel]').onclick=async()=>{const s=state[kind];if(s.upload){s.upload.abort();return;}clearTimeout(s.timer);if(s.job)try{await api('/jobs/'+s.job.id+'?token='+s.job.token,{method:'DELETE'});}catch{}reset(kind);controls(kind,false);status(kind,'Задание отменено.');};
 $('convert-file').onchange=e=>{const input=e.currentTarget,file=input.files[0];input.value='';if(file)upload(file);};const drop=$('convert-tool').querySelector('.tool-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag-over');};drop.ondragleave=()=>drop.classList.remove('drag-over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag-over');if(capability&&!$('convert-file').disabled)upload(e.dataTransfer.files[0]);};
 $('convert-options').onsubmit=async e=>{e.preventDefault();if(!$('convert-options').reportValidity())return;const job=state.convert.job;if(!job)return;const opts=Object.fromEntries(new FormData(e.currentTarget));controls('convert',true);try{showJob('convert',await api('/jobs/'+job.id+'/convert',{method:'POST',body:{token:job.token,target:opts.target,options:opts}}));}catch(error){controls('convert',false);status('convert',error.message);}};
 const inspect=async()=>{if(!capability||!$('download-link-form').reportValidity())return;reset('download');const generation=state.download.generation;$('download-options').hidden=true;controls('download',true);status('download','Получаем варианты…',0);try{const job=await api('/inspect',{method:'POST',body:{url:$('download-url').value.trim()}});if(generation!==state.download.generation){api('/jobs/'+job.id+'?token='+job.token,{method:'DELETE'}).catch(()=>{});return;}showJob('download',job);}catch(e){if(generation===state.download.generation){controls('download',false);status('download',e.message);}}};
 $('download-link-form').onsubmit=e=>{e.preventDefault();inspect();};$('download-paste').onclick=async()=>{try{$('download-url').value=(await navigator.clipboard.readText()).trim();await inspect();}catch{$('download-url').focus();status('download','Браузер не разрешил читать буфер. Вставь ссылку в поле вручную.');}};
 $('download-options').onsubmit=async e=>{e.preventDefault();const job=state.download.job;if(!job)return;controls('download',true);try{showJob('download',await api('/jobs/'+job.id+'/download',{method:'POST',body:{token:job.token,choice:$('download-format').value}}));}catch(error){controls('download',false);status('download',error.message);}};
 await connectTools();
}
