// Image processing is event driven. Preview and export share the same pipeline.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function surface(width,height){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(width));c.height=Math.max(1,Math.round(height));return c;}
export const blobFrom=(canvas,type='image/png',quality=.92)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Не удалось сохранить картинку.')),type,quality));
export async function decode(blob){
 if(typeof createImageBitmap==='function')try{return await createImageBitmap(blob);}catch{}
 const url=URL.createObjectURL(blob),image=new Image();
 try{image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}
}
function linesFor(ctx,text,width){
 const lines=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   if(ctx.measureText((line?line+' ':'')+word).width<=width){line+=(line?' ':'')+word;continue;}
   if(line){lines.push(line);line='';}
   for(const letter of word){if(line&&ctx.measureText(line+letter).width>width){lines.push(line);line='';}line+=letter;}
  }
  lines.push(line);
 }
 return lines;
}
function caption(ctx,text,at,width,height,options){
 if(!text.trim())return;
 const margin=Math.max(5,width*.025),maxWidth=width-2*margin;
 let size=Math.max(8,width*options.size/100),lines;
 const font=()=>{ctx.font=`900 ${size}px Impact, MemeCaption, sans-serif`;};
 font();lines=linesFor(ctx,options.caps?text.toLocaleUpperCase('ru'):text,maxWidth);
 while((lines.length*size*1.08>height*.39)&&size>6){size*=.92;font();lines=linesFor(ctx,options.caps?text.toLocaleUpperCase('ru'):text,maxWidth);}
 ctx.textAlign='center';ctx.textBaseline='top';ctx.lineJoin='round';ctx.miterLimit=2;
 ctx.fillStyle=options.ink;ctx.strokeStyle=options.outline;ctx.lineWidth=size*options.stroke/100;
 const start=at==='top'?margin:height-margin-lines.length*size*1.08;
 for(const [i,line]of lines.entries()){const y=start+i*size*1.08;if(options.stroke>0)ctx.strokeText(line,width/2,y,maxWidth);ctx.fillText(line,width/2,y,maxWidth);}
}
export async function renderMeme(source,options,maxSide=2048,current=()=>true){
 const crop=options.crop,sw=Math.max(1,source.width*crop.w),sh=Math.max(1,source.height*crop.h),scale=Math.min(1,maxSide/Math.max(sw,sh));
 const result=surface(sw*scale,sh*scale),ctx=result.getContext('2d');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,source.width*crop.x,source.height*crop.y,sw,sh,0,0,result.width,result.height);
 caption(ctx,options.top,'top',result.width,result.height,options);caption(ctx,options.bottom,'bottom',result.width,result.height,options);
 if(options.shakal>0){
  const intensity=options.shakal/100,divisor=1+intensity*14,small=surface(result.width/divisor,result.height/divisor),s=small.getContext('2d');
  s.fillStyle='#fff';s.fillRect(0,0,small.width,small.height);s.drawImage(result,0,0,small.width,small.height);
  const quality=Math.max(.015,.48*(1-intensity)**3),passes=1+Math.floor(intensity*3);
  for(let i=0;i<passes;i++){
   if(!current())throw new DOMException('Устаревший кадр','AbortError');
   const compressed=await decode(await blobFrom(small,'image/jpeg',quality));
   // A fractional resample between generations produces actual recompression damage.
   s.drawImage(compressed,i%2?.4:0,i%2?.3:0,small.width,small.height);compressed.close?.();
  }
  ctx.clearRect(0,0,result.width,result.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,0,0,result.width,result.height);
  small.width=small.height=1;
 }
 if(options.pixel>1){
  // Size is defined in the export coordinate space, so preview and export agree.
  const block=Math.max(1,options.pixel*scale),small=surface(result.width/block,result.height/block),s=small.getContext('2d');
  s.imageSmoothingEnabled=true;s.imageSmoothingQuality='high';s.drawImage(result,0,0,small.width,small.height);
  ctx.clearRect(0,0,result.width,result.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,result.width,result.height);small.width=small.height=1;
 }
 return result;
}
