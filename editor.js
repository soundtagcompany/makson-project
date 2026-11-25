import {desktopElement} from './picture-in-picture.js';
import {createTimeline} from './editor-timeline.js';
let mounted=false;
const $=id=>desktopElement(id),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function initEditor(){
 if(mounted)return;mounted=true;
 const root=$('editor-root');
 root.innerHTML=`
 <div class="edit-work">
  <section class="edit-preview" aria-label="Предпросмотр">
   <header class="edit-panel-head"><span id="edit-name">Предпросмотр</span><button id="edit-replace" type="button" title="Заменить исходник" hidden>Открыть</button></header>
   <div class="edit-stage" id="edit-stage">
    <div id="edit-empty"><svg viewBox="0 0 48 40" aria-hidden="true"><path d="M3 3h42v34H3zM12 3v34M36 3v34M3 13h9M3 26h9M36 13h9M36 26h9m-17-8 9 6-9 6z" fill="none" stroke="currentColor" stroke-width="2"/></svg><button id="edit-open" type="button">Открыть видео или аудио</button><p>или перетащите файл сюда</p><span>До 256 МБ · фрагмент до 10 минут</span></div>
    <div id="edit-frame" data-pixel-exempt hidden><video id="edit-video" playsinline preload="metadata"></video><canvas id="edit-overlay"></canvas></div>
    <div id="edit-audio-preview" hidden><svg viewBox="0 0 48 40" aria-hidden="true"><path d="M19 28V8l19-4v20M19 11l19-4M19 28c0 9-15 9-15 1s15-9 15-1Zm19-4c0 9-15 9-15 1s15-9 15-1Z" fill="none" stroke="currentColor" stroke-width="2"/></svg><p id="edit-audio-source-name"></p><span>Аудиодорожка</span></div>
    <div id="edit-stage-busy" hidden><span id="edit-stage-message" role="status">Загрузка…</span><progress id="edit-stage-progress" max="100"></progress><button id="edit-stage-cancel" type="button">Отменить</button></div>
    <div class="edit-drop-hint" aria-hidden="true">Отпустите видео или аудио</div>
    <audio id="edit-source-audio" preload="metadata"></audio><audio id="edit-extra" preload="metadata"></audio>
   </div>
   <div class="edit-transport"><button id="edit-to-start" type="button" aria-label="К началу фрагмента" title="К началу фрагмента" disabled>↤</button><button id="edit-play" type="button" aria-label="Воспроизвести фрагмент" disabled>▶</button><output id="edit-clock">00:00.0</output><span>/</span><output id="edit-total">00:00.0</output></div>
   <input id="edit-file" type="file" accept="video/*,audio/*,.mkv,.flac" hidden>
  </section>
  <aside class="edit-inspector">
   <div class="edit-tabs" role="tablist" aria-label="Параметры слоя">${[['clip','Клип'],['audio','Звук'],['photo','Фото'],['text','Текст']].map(([id,label])=>`<button type="button" role="tab" id="edit-tab-${id}" data-edit-tab="${id}" aria-controls="edit-panel-${id}" aria-selected="${id==='clip'}">${label}</button>`).join('')}</div>
   <div class="edit-properties">
    <fieldset id="edit-options" disabled>
     <section role="tabpanel" id="edit-panel-clip" aria-labelledby="edit-tab-clip"><p id="edit-source-info">Откройте исходник в окне предпросмотра.</p><p class="edit-property-heading">Границы фрагмента</p><div class="edit-grid"><label>Начало, с<input id="edit-start" type="number" min="0" step=".1" value="0"></label><label>Конец, с<input id="edit-end" type="number" min=".1" step=".1" value="0"></label></div><div class="edit-grid"><button id="edit-set-start" type="button" title="Начать фрагмент с текущего кадра">Начало здесь</button><button id="edit-set-end" type="button" title="Закончить фрагмент текущим кадром">Конец здесь</button></div><button id="edit-reset-trim" type="button">Сбросить обрезку</button><p class="edit-help">Потяните края выделения на ленте кадров. Клик по ленте перемещает указатель.</p></section>
     <section role="tabpanel" id="edit-panel-audio" aria-labelledby="edit-tab-audio" hidden><label>Исходный звук<input id="edit-volume" type="range" min="0" max="100" value="100"></label><button class="edit-import" id="edit-add-audio" type="button">+ Аудиодорожка</button><input id="edit-audio-file" type="file" accept="audio/*" hidden><div id="edit-audio-options" hidden><p class="edit-asset-name" id="edit-audio-name"></p><label>Громкость дорожки<input id="edit-extra-volume" type="range" min="0" max="100" value="100"></label><div class="edit-grid"><label>Начать с, с<input id="edit-audio-start" type="number" min="0" step=".1" value="0"></label><label>Задержка, с<input id="edit-audio-delay" type="number" min="0" step=".1" value="0"></label></div><button id="edit-remove-audio" type="button">Убрать дорожку</button></div></section>
     <section role="tabpanel" id="edit-panel-photo" aria-labelledby="edit-tab-photo" hidden><button class="edit-import" id="edit-add-photo" type="button">+ Изображение</button><input id="edit-photo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden><div id="edit-photo-options" hidden><label>Ширина, %<input id="edit-photo-size" type="range" min="5" max="100" value="30"></label><label>Слева<input id="edit-photo-x" type="range" min="0" max="100" value="10"></label><label>Сверху<input id="edit-photo-y" type="range" min="0" max="100" value="10"></label><button id="edit-remove-photo" type="button">Убрать фото</button></div><p class="edit-help">Изображение накладывается на выбранный фрагмент.</p></section>
     <section role="tabpanel" id="edit-panel-text" aria-labelledby="edit-tab-text" hidden><label>Текст<textarea id="edit-text" maxlength="240" rows="3" placeholder="Текст поверх видео"></textarea></label><label>Размер<input id="edit-text-size" type="range" min="2" max="15" value="6"></label><label>По высоте<input id="edit-text-y" type="range" min="0" max="100" value="80"></label><label class="edit-color-label">Цвет<input id="edit-text-color" type="color" value="#ffffff"></label></section>
    </fieldset>
   </div>
  </aside>
 </div>
 <section class="edit-timeline-panel" aria-label="Монтажный стол">
  <header class="edit-panel-head"><span>Монтажный стол</span><output id="edit-duration">Выберите файл</output></header>
  <div class="edit-track-main"><span class="edit-track-label" id="edit-main-label">Клип</span><div id="edit-timeline" data-native-keys></div></div>
  <button class="edit-track" type="button" data-edit-tab="audio" id="edit-audio-track" disabled><span class="edit-track-label">Звук</span><span class="edit-track-lane"><span class="edit-track-empty" id="edit-audio-empty">+ Аудио</span><span id="edit-audio-clip" hidden></span></span></button>
  <button class="edit-track" type="button" data-edit-tab="text" id="edit-overlay-track" disabled><span class="edit-track-label">Слои</span><span class="edit-track-lane"><span class="edit-track-empty" id="edit-overlay-empty">+ Фото / текст</span><span id="edit-overlay-clip" hidden></span></span></button>
 </section>
 <form id="edit-export"><label><span>Формат</span><select id="edit-format" aria-label="Формат экспорта"><option value="mp4">MP4</option><option value="mp3">MP3</option><option value="wav">WAV</option></select></label><label id="edit-resolution-label"><span>Размер</span><select id="edit-resolution" aria-label="Разрешение экспорта"><option value="720">720p</option><option value="1080">1080p</option><option value="480">480p</option></select></label><button id="edit-submit" type="submit" disabled>Экспорт</button><button id="edit-cancel" type="button" hidden>Отменить</button><a id="edit-result" hidden>Скачать</a></form>
 <div class="edit-status"><p id="edit-status" role="status">Файлы хранятся до часа. Экспорт — до 10 минут.</p><progress id="edit-progress" max="100" hidden></progress></div>`;
 let source=null,extra=null,photo=null,media=$('edit-video'),job=null,busy=false,canceled=false,uploadRequest=null,loadIntent='',selectedTab='clip';
 const urls=new Set(),objectURL=file=>{const url=URL.createObjectURL(file);urls.add(url);return url;};
 const val=id=>Number($(id).value),clock=n=>{n=Math.max(0,Number(n)||0);return Math.floor(n/60).toString().padStart(2,'0')+':'+(Math.floor(n%60)).toString().padStart(2,'0')+'.'+Math.floor(n*10%10);};
 const timeline=createTimeline({root:$('edit-timeline'),onTrim(start,end,{edge}={}){stop();$('edit-start').value=start.toFixed(3);$('edit-end').value=end.toFixed(3);seek(edge==='end'?Math.max(start,end-.04):start);update();},onSeek:seconds=>{stop();seek(seconds);}});
 timeline.setDisabled(true);root.querySelector('.edit-timeline-filmstrip').dataset.pixelExempt='';document.dispatchEvent(new Event('console-pixel-exempt-change'));
 function tab(id){selectedTab=id;for(const button of root.querySelectorAll('[role=tab]')){const active=button.dataset.editTab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}for(const panel of root.querySelectorAll('[role=tabpanel]'))panel.hidden=panel.id!=='edit-panel-'+id;}
 for(const button of root.querySelectorAll('[data-edit-tab]'))button.onclick=()=>tab(button.dataset.editTab);
 root.querySelector('.edit-tabs').onkeydown=e=>{const tabs=[...root.querySelectorAll('[role=tab]:not(:disabled)')],index=tabs.indexOf(e.target);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tab(tabs[next].dataset.editTab);tabs[next].focus();};
 root.querySelector('.edit-tabs').dataset.nativeKeys='';
 function message(text,progress){$('edit-status').textContent=text;$('edit-progress').hidden=progress===undefined;if(progress!==undefined)$('edit-progress').value=progress;if(loadIntent==='source'){$('edit-stage-message').textContent=text;$('edit-stage-progress').value=progress||0;}}
 function lock(value){busy=value;root.classList.toggle('edit-busy',value);for(const id of ['edit-file','edit-open','edit-replace','edit-format','edit-resolution'])$(id).disabled=value;$('edit-options').disabled=value||!source;for(const id of ['edit-submit','edit-play','edit-to-start','edit-audio-track','edit-overlay-track'])$(id).disabled=value||!source;timeline.setDisabled(value||!source);$('edit-cancel').hidden=!value;$('edit-stage-busy').hidden=!(value&&loadIntent==='source');}
 function stop(){media.pause();$('edit-extra').pause();$('edit-play').textContent='▶';$('edit-play').setAttribute('aria-label','Воспроизвести фрагмент');}
 function time(){if(!source)return;timeline.setTime(media.currentTime);$('edit-clock').value=clock(media.currentTime);}
 function seek(seconds){if(!source)return;try{media.currentTime=clamp(seconds,0,source.duration);}catch{}timeline.setTime(seconds);$('edit-clock').value=clock(seconds);syncExtra(true);}
 function sizes(){const h=val('edit-resolution'),scale=Math.min(1,h/Math.min(source.width||1280,source.height||720),1920/Math.max(source.width||1280,source.height||720));return {width:Math.max(2,Math.floor((source.width||1280)*scale/2)*2),height:Math.max(2,Math.floor((source.height||720)*scale/2)*2)};}
 function paint(canvas=$('edit-overlay')){
  if(!source?.width)return;const {width,height}=sizes();canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');
  if(photo){const w=width*val('edit-photo-size')/100,h=w*photo.height/photo.width;c.drawImage(photo,width*val('edit-photo-x')/100,height*val('edit-photo-y')/100,w,h);}
  const text=$('edit-text').value.trim();if(text){const size=height*val('edit-text-size')/100;c.font=`bold ${size}px Arial`;c.textAlign='center';c.textBaseline='top';c.lineJoin='round';c.lineWidth=Math.max(2,size*.1);c.strokeStyle='#000';c.fillStyle=$('edit-text-color').value;let y=(height-size)*val('edit-text-y')/100;for(const line of text.split('\n')){c.strokeText(line,width/2,y,width*.94);c.fillText(line,width/2,y,width*.94);y+=size*1.2;}}
 }
 function update(){
  if(!source)return;const start=val('edit-start'),end=val('edit-end'),duration=Math.max(0,end-start),total=source.duration;
  $('edit-duration').value=clock(duration);$('edit-total').value=clock(total);timeline.setTrim(start,end);time();media.volume=val('edit-volume')/100;$('edit-extra').volume=val('edit-extra-volume')/100;$('edit-resolution-label').hidden=$('edit-format').value!=='mp4';
  const audioClip=$('edit-audio-clip');audioClip.hidden=!extra;$('edit-audio-empty').hidden=!!extra;
  if(extra){const offset=val('edit-audio-delay'),length=Math.max(0,Math.min(duration-offset,extra.job.info.duration-val('edit-audio-start')));audioClip.style.left=100*(start+offset)/total+'%';audioClip.style.width=100*length/total+'%';audioClip.textContent=extra.file.name;}
  const layers=[photo?'Фото':'',$('edit-text').value.trim()?'Текст':''].filter(Boolean);$('edit-overlay-clip').hidden=!layers.length;$('edit-overlay-empty').hidden=!!layers.length;$('edit-overlay-clip').style.left=100*start/total+'%';$('edit-overlay-clip').style.width=100*duration/total+'%';$('edit-overlay-clip').textContent=layers.join(' + ');
 }
 function trim(edge,value){if(!source)return;stop();const min=Math.min(.1,source.duration),other=val(edge==='start'?'edit-end':'edit-start'),next=edge==='start'?clamp(value,Math.max(0,other-600),other-min):clamp(value,other+min,Math.min(source.duration,other+600));$('edit-'+edge).value=next.toFixed(3);seek(edge==='end'?Math.max(val('edit-start'),next-.04):next);update();}
 function syncExtra(seeked=false){if(!extra)return;const audio=$('edit-extra'),t=media.currentTime-val('edit-start')-val('edit-audio-delay')+val('edit-audio-start');if(t<val('edit-audio-start')||t>=audio.duration||media.paused){audio.pause();return;}if(seeked||Math.abs(audio.currentTime-t)>.3)audio.currentTime=t;audio.play().catch(()=>{});}
 for(const el of [$('edit-video'),$('edit-source-audio')]){el.addEventListener('timeupdate',()=>{if(el!==media||!source)return;if(!media.paused&&media.currentTime>=val('edit-end')){stop();seek(val('edit-end'));}time();syncExtra();});el.addEventListener('ended',stop);el.addEventListener('loadedmetadata',()=>{if(el===media&&source)seek(val('edit-start'));});}
 $('edit-play').onclick=async()=>{if(!media.paused)return stop();if(media.currentTime<val('edit-start')||media.currentTime>=val('edit-end')-.05)seek(val('edit-start'));try{await media.play();$('edit-play').textContent='Ⅱ';$('edit-play').setAttribute('aria-label','Пауза');syncExtra(true);}catch{message('Браузер не воспроизводит этот формат. Границы и экспорт доступны.');}};
 $('edit-to-start').onclick=()=>{stop();seek(val('edit-start'));};
 for(const edge of ['start','end'])$('edit-'+edge).onchange=()=>trim(edge,val('edit-'+edge));
 $('edit-set-start').onclick=()=>trim('start',media.currentTime);$('edit-set-end').onclick=()=>trim('end',media.currentTime);
 $('edit-reset-trim').onclick=()=>{if(!source)return;stop();$('edit-start').value=0;$('edit-end').value=Math.min(source.duration,600);seek(0);update();};
 for(const id of ['edit-volume','edit-extra-volume','edit-audio-start','edit-audio-delay','edit-format'])$(id).oninput=update;
 for(const id of ['edit-photo-size','edit-photo-x','edit-photo-y','edit-text','edit-text-size','edit-text-y','edit-text-color','edit-resolution'])$(id).oninput=()=>{update();paint();};
 async function api(path,body){const response=await fetch('/api/tools'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка обработки');return data;}
 async function waitJob(current){while(['queued','working','uploading'].includes(current.status)){if(canceled)throw Error('Отменено');await delay(900);current=await api('/jobs/'+current.id+'?token='+current.token);message(current.phase,current.progress);}if(canceled||['error','canceled'].includes(current.status))throw Error(current.error||'Отменено');return current;}
 async function upload(file){if(file.size>256*1024**2)throw Error('Максимум 256 МБ на файл.');if(canceled)throw Error('Отменено');const current=await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();uploadRequest=xhr;xhr.open('PUT','/api/tools/uploads?name='+encodeURIComponent(file.name));xhr.timeout=180000;xhr.upload.onprogress=e=>message('Загрузка: '+file.name,e.lengthComputable?e.loaded/e.total*100:0);xhr.onload=()=>{uploadRequest=null;try{const data=JSON.parse(xhr.responseText);xhr.status>=400?reject(Error(data.error)):resolve(data);}catch{reject(Error('Сервер не принял файл.'));}};xhr.onerror=xhr.ontimeout=()=>{uploadRequest=null;reject(Error('Не удалось загрузить файл.'));};xhr.onabort=()=>{uploadRequest=null;reject(Error('Отменено'));};xhr.send(file);});job=current;return await waitJob(current);}
 async function openSource(file){
  if(!file||busy)return;stop();canceled=false;loadIntent='source';lock(true);message('Загрузка: '+file.name,0);
  try{
   const uploaded=await upload(file);if(!['video','audio'].includes(uploaded.info.family)||!uploaded.info.duration)throw Error('Нужен видео- или аудиофайл с известной длительностью.');
   for(const el of [$('edit-video'),$('edit-source-audio'),$('edit-extra')]){el.pause();el.removeAttribute('src');el.load();}for(const url of urls)URL.revokeObjectURL(url);urls.clear();
   source={file,job:uploaded,...uploaded.info};root.classList.toggle('is-portrait',!!source.width&&source.height>source.width);extra=null;photo=null;$('edit-result').hidden=true;$('edit-audio-options').hidden=true;$('edit-photo-options').hidden=true;
   for(const id of ['edit-text','edit-audio-file','edit-photo-file'])$(id).value='';for(const id of ['edit-audio-start','edit-audio-delay'])$(id).value=0;
   media=source.width?$('edit-video'):$('edit-source-audio');media.src=objectURL(file);$('edit-frame').hidden=!source.width;$('edit-empty').hidden=true;$('edit-audio-preview').hidden=!!source.width;$('edit-audio-source-name').textContent=file.name;
   for(const id of ['photo','text'])$('edit-tab-'+id).disabled=!source.width;if(!source.width&&['photo','text'].includes(selectedTab))tab('clip');
   $('edit-format').querySelector('[value=mp4]').disabled=!source.width;$('edit-format').value=source.width?'mp4':'mp3';$('edit-start').value=0;$('edit-end').value=Math.min(source.duration,600).toFixed(3);$('edit-end').max=source.duration;$('edit-start').max=source.duration;$('edit-name').textContent=file.name;$('edit-name').title=file.name;$('edit-replace').hidden=false;
   $('edit-source-info').textContent=[source.width?source.width+' × '+source.height:'Аудио',clock(source.duration),(file.size/1048576).toFixed(1)+' МБ'].join(' · ');$('edit-main-label').textContent=source.width?'Видео':'Аудио';
   $('edit-frame').style.setProperty('--edit-ratio',(source.width||16)/(source.height||9));timeline.setSource({duration:source.duration,file,isVideo:!!source.width});update();paint();document.dispatchEvent(new Event('console-pixel-exempt-change'));message('Потяните края ленты, чтобы обрезать фрагмент.');
  }catch(error){message(error.message);}finally{job=null;loadIntent='';lock(false);$('edit-stage-busy').hidden=true;}
 }
 $('edit-file').onchange=e=>{openSource(e.target.files[0]);e.target.value='';};for(const id of ['edit-open','edit-replace'])$(id).onclick=()=>$('edit-file').click();
 for(const [kind,id] of [['audio','edit-add-audio'],['photo','edit-add-photo']])$(id).onclick=()=>$('edit-'+kind+'-file').click();
 async function addAudio(file){if(!file||busy)return;stop();canceled=false;lock(true);try{const uploaded=await upload(file);if(!uploaded.info.audio)throw Error('В файле нет аудио.');extra={file,job:uploaded};$('edit-extra').pause();$('edit-extra').src=objectURL(file);$('edit-audio-options').hidden=false;$('edit-audio-name').textContent=file.name;$('edit-audio-start').max=uploaded.info.duration;$('edit-audio-start').value=0;$('edit-audio-delay').value=0;update();message('Звуковая дорожка добавлена.');}catch(error){message(error.message);}finally{job=null;lock(false);}}
 $('edit-audio-file').onchange=e=>{addAudio(e.target.files[0]);e.target.value='';};
 $('edit-remove-audio').onclick=()=>{extra=null;$('edit-extra').pause();$('edit-extra').removeAttribute('src');$('edit-audio-options').hidden=true;update();};
 async function addPhoto(file){if(!file||busy||!source?.width)return;if(file.size>20*1024**2){message('Фото — до 20 МБ.');return;}try{const image=new Image();image.src=objectURL(file);await image.decode();photo=image;$('edit-photo-options').hidden=false;update();paint();}catch{message('Не удалось прочитать фото.');}}
 $('edit-photo-file').onchange=e=>{addPhoto(e.target.files[0]);e.target.value='';};
 $('edit-remove-photo').onclick=()=>{photo=null;$('edit-photo-options').hidden=true;update();paint();};
 let dragDepth=0;const stage=$('edit-stage');stage.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types.includes('Files')||busy)return;e.preventDefault();dragDepth++;stage.classList.add('edit-drag-over');});stage.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy';}});stage.addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;stage.classList.remove('edit-drag-over');}});stage.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dragDepth=0;stage.classList.remove('edit-drag-over');openSource(e.dataTransfer.files[0]);});
 for(const [id,load] of [['edit-panel-audio',addAudio],['edit-panel-photo',addPhoto]]){$(id).addEventListener('dragover',e=>{if(source&&e.dataTransfer?.types.includes('Files'))e.preventDefault();});$(id).addEventListener('drop',e=>{if(!source)return;e.preventDefault();e.stopPropagation();load(e.dataTransfer.files[0]);});}
 $('edit-export').onsubmit=async e=>{
  e.preventDefault();if(!source||busy)return;stop();canceled=false;const start=val('edit-start'),end=val('edit-end'),duration=end-start;
  if(!Number.isFinite(start+end)||start<0||end>source.duration+.05||duration<.1||duration>600)return message('Выберите фрагмент от 0,1 секунды до 10 минут внутри исходника.');
  if(extra&&(val('edit-audio-start')>=extra.job.info.duration||val('edit-audio-delay')>=duration))return message('Начало звука должно быть внутри аудиофайла, а задержка — короче фрагмента.');
  lock(true);$('edit-result').hidden=true;
  try{
   if(!source.job)source.job=await upload(source.file);let overlay=null;
   if(source.width&&$('edit-format').value==='mp4'&&(photo||$('edit-text').value.trim())){const canvas=document.createElement('canvas');paint(canvas);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Не удалось подготовить слой.');overlay=await upload(new File([blob],'overlay.png',{type:'image/png'}));}
   if(canceled)throw Error('Отменено');job=source.job;job=await api('/jobs/'+source.job.id+'/edit',{token:source.job.token,options:{start,end,target:$('edit-format').value,...sizes(),originalVolume:val('edit-volume')/100,audioVolume:val('edit-extra-volume')/100,audioStart:val('edit-audio-start'),audioDelay:val('edit-audio-delay')},audio:extra?{id:extra.job.id,token:extra.job.token}:null,overlay:overlay?{id:overlay.id,token:overlay.token}:null});
   const done=await waitJob(job);$('edit-result').href=done.result.url;$('edit-result').download=done.result.name;$('edit-result').textContent='Скачать';$('edit-result').title='Скачать · '+(done.result.size/1048576).toFixed(1)+' МБ';$('edit-result').hidden=false;message('Экспорт завершён. Можно скачать файл.');
  }catch(error){message(error.message);}finally{job=null;lock(false);}
 };
 function cancel(){canceled=true;uploadRequest?.abort();if(job){if(source?.job?.id===job.id)source.job=null;fetch('/api/tools/jobs/'+job.id+'?token='+job.token,{method:'DELETE'}).catch(()=>{});}message('Отмена…');}
 $('edit-cancel').onclick=cancel;$('edit-stage-cancel').onclick=cancel;
 document.addEventListener('windowhide',e=>{if(e.detail==='editor'){stop();dragDepth=0;stage.classList.remove('edit-drag-over');}});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
}
