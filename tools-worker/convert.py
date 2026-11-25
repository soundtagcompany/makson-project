"""Runs inside a per-job filesystem and network sandbox. Arguments are JSON, never shell."""
import json,sys,subprocess,pathlib,os,zipfile,math,shutil
from catalog import AUDIO,family
root=pathlib.Path.cwd()
request=json.loads((root/'request.json').read_text());source=root/request['source'];target=request['target'];options=request.get('options',{});kind=family(source.suffix[1:].lower())
def run(args):
 subprocess.run(args,check=True,stdin=subprocess.DEVNULL,stdout=sys.stdout,stderr=sys.stderr,timeout=540)
def number(key,default,low,high):
 try:v=float(options.get(key,default))
 except (ValueError,TypeError):raise ValueError('Некорректное значение '+key)
 if not math.isfinite(v) or not low<=v<=high:raise ValueError('Значение вне диапазона '+key)
 return v
output=root/('result.'+target)
if kind in ['video','audio']:
 start=number('start',0,0,7200);end=number('end',0,0,7200)
 if end and end<=start:raise ValueError('Конец должен быть позже начала')
 args=['ffmpeg','-hide_banner','-nostdin','-y','-threads','1','-filter_threads','1','-protocol_whitelist','file,pipe','-i',str(source)]
 if start:args+=['-ss',str(start)]
 if end:args+=['-t',str(end-start)]
 bitrate=str(int(number('bitrate',192,32,320)))+'k'
 if target in AUDIO:
  args+=['-map','0:a:0','-vn'];codecs={'mp3':'libmp3lame','m4a':'aac','aac':'aac','wav':'pcm_s16le','flac':'flac','ogg':'libvorbis','opus':'libopus','aiff':'pcm_s16be'}
  args+=['-c:a',codecs[target]]
  if target in ['mp3','m4a','aac','ogg','opus']:args+=['-b:a',bitrate]
  rate=options.get('sampleRate','original')
  if rate in ['44100','48000']:args+=['-ar',rate]
  if target=='opus':args+=['-ar','48000']
 elif target=='gif':
  height=min(720,int(number('height',480,120,1080))) if options.get('height') not in [None,'original'] else 480
  args+=['-an','-vf',f'fps=12,scale=-2:{height}:flags=lanczos','-t',str(min(30,end-start if end else 30))]
 else:
  codec={'mp4':'libx264','mov':'libx264','mkv':'libx264','webm':'libvpx-vp9','avi':'mpeg4'}[target]
  args+=['-map','0:v:0','-map','0:a:0?','-c:v',codec,'-threads','1','-pix_fmt','yuv420p']
  if target in ['mp4','mov','mkv']:args+=['-preset','veryfast','-crf',{'high':'20','balanced':'25','small':'30'}.get(options.get('quality'),'25')]
  if target=='webm':args+=['-deadline','realtime','-cpu-used','6','-crf','34','-b:v','0']
  if target=='avi':args+=['-q:v','5']
  h=options.get('height','original')
  args+=['-vf',f"scale=-2:'trunc(min({int(h)},ih)/2)*2'" if h in ['360','480','720','1080'] else 'scale=trunc(iw/2)*2:trunc(ih/2)*2']
  args+=['-c:a','libopus' if target=='webm' else 'libmp3lame' if target=='avi' else 'aac','-b:a',bitrate]
  if target in ['mp4','mov']:args+=['-movflags','+faststart']
 args+=['-max_muxing_queue_size','512','-progress','pipe:1','-nostats',str(output)];run(args)
elif kind=='image':
 from PIL import Image,ImageOps,ImageSequence
 Image.MAX_IMAGE_PIXELS=40000000
 import warnings
 warnings.simplefilter('error',Image.DecompressionBombWarning)
 try:
  import pillow_heif;pillow_heif.register_heif_opener()
 except ImportError:pass
 if source.suffix=='.svg':
  import cairosvg
  cairosvg.svg2png(url=str(source),write_to=str(root/'raster.png'),output_width=2048)
  source=root/'raster.png'
 im=Image.open(source);im=ImageOps.exif_transpose(im)
 width=int(number('width',0,0,8192));height=int(number('imageHeight',0,0,8192))
 if width or height:im.thumbnail((width or 8192,height or 8192),Image.Resampling.LANCZOS)
 bg=options.get('background','white');bg='black' if bg=='black' else 'white'
 if target in ['jpg','pdf','bmp']:
  canvas=Image.new('RGB',im.size,bg)
  if im.mode in ['RGBA','LA'] or 'transparency' in im.info:canvas.paste(im.convert('RGBA'),mask=im.convert('RGBA').getchannel('A'))
  else:canvas.paste(im.convert('RGB'))
  im=canvas
 params={};quality=int(number('imageQuality',88,10,100))
 if target in ['jpg','webp','avif']:params['quality']=quality
 if target=='ico':im.thumbnail((256,256));params['sizes']=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]
 im.save(output,format={'jpg':'JPEG','tiff':'TIFF'}.get(target,target.upper()),**params)
elif kind=='pdf':
 if target=='txt':run(['pdftotext','-layout',str(source),str(output)])
 else:
  last=int(number('pages',50,1,200));dpi=str(int(number('dpi',120,72,200)))
  run(['pdftoppm','-f','1','-l',str(last),'-scale-to','2400','-r',dpi,'-png' if target=='png' else '-jpeg',str(source),str(root/'page')])
  output=root/'result.zip'
  with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
   for file in sorted(root.glob('page-*')):
    archive.write(file,file.name);file.unlink()
elif kind=='text':
 fmt={'txt':'plain','md':'markdown'}.get(target,target)
 # The outer bwrap sandbox denies networking and exposes only this job plus read-only tools.
 run(['pandoc',str(source),'-t',fmt,'-o',str(output)])
else:
 profile=root/'profile';profile.mkdir(exist_ok=True)
 (profile/'user').mkdir(exist_ok=True)
 (profile/'user/registrymodifications.xcu').write_text('''<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>''')
 formats={'document':{'pdf':'pdf:writer_pdf_Export','docx':'docx:Office Open XML Text','odt':'odt','rtf':'rtf','txt':'txt:Text (encoded):UTF8','html':'html'},'spreadsheet':{'pdf':'pdf:calc_pdf_Export','xlsx':'xlsx:Calc MS Excel 2007 XML','ods':'ods','csv':'csv:Text - txt - csv (StarCalc):44,34,76,1','tsv':'csv:Text - txt - csv (StarCalc):9,34,76,1'},'presentation':{'pdf':'pdf:impress_pdf_Export','pptx':'pptx:Impress MS PowerPoint 2007 XML','odp':'odp'}}
 dest=root/'out';shutil.rmtree(dest,ignore_errors=True);dest.mkdir()
 run(['libreoffice','-env:UserInstallation='+profile.as_uri(),'--headless','--nologo','--nodefault','--norestore','--convert-to',formats[kind][target],'--outdir',str(dest),str(source)])
 files=list(dest.iterdir())
 if not files:raise ValueError('Не удалось преобразовать документ')
 if target=='html' and len(files)>1:
  output=root/'result.zip'
  with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
   for file in dest.rglob('*'):
    if file.is_file():archive.write(file,file.relative_to(dest))
 else:files[0].replace(output)
if not output.is_file() or not output.stat().st_size:raise ValueError('Результат пуст')
print('RESULT '+output.name,flush=True)
