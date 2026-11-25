export function setupPhotos({root,getDialog,canAttach,notice}){
 const pending=new Map();let reading=false;
 function clear(id,key){const item=pending.get(id);if(item&&(!key||item.key===key)){URL.revokeObjectURL(item.url);pending.delete(id);}}
 function draw(){const box=root.querySelector('.sv-photo-preview'),item=pending.get(getDialog());if(!box)return;box.hidden=!item;box.replaceChildren();if(!item)return;const img=document.createElement('img');img.src=item.url;img.alt='Фото перед отправкой';const text=document.createElement('span');text.textContent='ФОТО';const close=document.createElement('button');close.type='button';close.dataset.photo='remove';close.setAttribute('aria-label','Убрать фото');close.textContent='×';box.append(img,text,close);}
 async function attach(file){if(!file||!canAttach()||reading)return;const id=getDialog();if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))return notice('Выбери JPG, PNG или WebP.');if(file.size>12*1024*1024)return notice('Фото должно быть меньше 12 МБ.');reading=true;notice('Подготовка фото…');let url;
  try{url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();if(img.naturalWidth*img.naturalHeight>24000000)throw Error('Фото слишком большое: до 24 мегапикселей.');const ratio=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);let blob;for(const quality of [.86,.72,.55,.38]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob?.size<850000)break;}if(!blob||blob.size>=850000)throw Error('Не удалось уменьшить фото. Попробуй другой снимок.');clear(id);pending.set(id,{file:blob,url:URL.createObjectURL(blob),key:crypto.randomUUID()});if(id===getDialog()){draw();notice('');}}
  catch(e){notice(e.message||'Фото не открылось.');}finally{if(url)URL.revokeObjectURL(url);reading=false;}
 }
 const viewer=document.createElement('dialog');viewer.className='sv-photo-viewer';viewer.innerHTML='<button type="button" aria-label="Закрыть фото">×</button><img alt="Фото из переписки">';root.append(viewer);
 function open(source){if(!viewer.isConnected)root.append(viewer);viewer.querySelector('img').src=source;viewer.showModal();}
 viewer.addEventListener('click',e=>{if(e.target===viewer||e.target.closest('button'))viewer.close();});
 root.addEventListener('click',e=>{const action=e.target.closest('[data-photo]')?.dataset.photo;if(action==='choose')root.querySelector('.sv-photo-input')?.click();if(action==='remove'){clear(getDialog());draw();}const photo=e.target.closest('[data-photo-open]');if(photo)open(photo.querySelector('img').src);});
 root.addEventListener('change',e=>{if(e.target.matches('.sv-photo-input')){attach(e.target.files[0]);e.target.value='';}});
 root.addEventListener('paste',e=>{const file=[...(e.clipboardData?.items||[])].find(i=>i.kind==='file'&&i.type.startsWith('image/'))?.getAsFile();if(file&&canAttach()){e.preventDefault();attach(file);}});
 root.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect=canAttach()?'copy':'none';root.classList.toggle('sv-drop',canAttach());}});
 root.addEventListener('dragleave',e=>{if(!root.contains(e.relatedTarget))root.classList.remove('sv-drop');});
 root.addEventListener('drop',e=>{root.classList.remove('sv-drop');if(e.dataTransfer?.files.length){e.preventDefault();attach(e.dataTransfer.files[0]);}});
 return {draw,get:id=>pending.get(id),clear,clearAll(){for(const id of pending.keys())clear(id);if(viewer.open)viewer.close();}};
}
