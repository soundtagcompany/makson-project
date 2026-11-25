#!/usr/bin/env python3
"""Private, bounded asynchronous media jobs. Exposed only over a Unix socket."""
import http.server,socketserver,os,pathlib,json,hashlib,secrets,time,threading,queue,subprocess,signal,shutil,urllib.parse,re,collections
from catalog import GROUPS,NOTES,family,AUDIO
ROOT=pathlib.Path(os.environ.get('TOOLS_STATE','/var/lib/makson-tools'));ROOT.mkdir(parents=True,exist_ok=True)
BASE=pathlib.Path(__file__).resolve().parent;PYTHON=os.environ.get('TOOLS_PYTHON',str(BASE/'venv/bin/python'))
MAX=256*1024**2;MAX_RESULT=768*1024**2;TOTAL=4*1024**3;TTL=3600
jobs={};lock=threading.RLock();work=queue.Queue();rates={};uploading=0;reserved=0
class Problem(Exception):
 def __init__(self,message,status=400):super().__init__(message);self.status=status
def tree_size(root):
 total=0
 for f in root.rglob('*'):
  try:
   if f.is_file():total+=f.stat().st_size
  except OSError:pass
 return total
def usage():return tree_size(ROOT)
def public(job):
 return {k:v for k,v in job.items() if k in ['id','token','kind','name','status','phase','progress','error','info','outputs','result','created']}
def new_job(client,kind,name):
 with lock:
  now=time.time();times=[t for t in rates.get(client,[]) if t>now-600]
  if len(times)>=8:raise Problem('Лимит: 8 новых заданий за 10 минут. Попробуй позже.',429)
  if len(jobs)>=24 or work.qsize()>=8 or usage()+reserved> TOTAL:raise Problem('Очередь заполнена. Попробуй позже.',429)
  rates[client]=times+[now];id=secrets.token_hex(16);folder=ROOT/id;folder.mkdir(mode=0o700)
  job={'id':id,'token':secrets.token_hex(24),'kind':kind,'name':name[:180],'status':'uploading','phase':'Приём файла','progress':0,'created':now,'folder':folder,'client':client}
  jobs[id]=job;return job
def authenticated(id,token):
 with lock:
  job=jobs.get(id)
  if not job or not secrets.compare_digest(job['token'],str(token)):raise Problem('Файл не найден или срок хранения истёк.',404)
  return job
def update(job,**kw):
 with lock:
  if job['status']=='canceled':raise Problem('Задание отменено.')
  job.update(kw)
def sandbox(job,args,network=False):
 if os.environ.get('TOOLS_UNSANDBOXED')=='1':return args
 bubblewrap=BASE/'bwrap'
 executable=str(bubblewrap) if bubblewrap.exists() else shutil.which('bwrap')
 if not executable:raise Problem('Для обработки нужен bubblewrap.',503)
 cmd=[executable,'--die-with-parent','--new-session','--unshare-all']
 if network:cmd+=['--share-net']
 for p in ['/usr','/bin','/lib','/lib64']:
  if pathlib.Path(p).exists():cmd+=['--ro-bind',p,p]
 cmd+=['--ro-bind',str(BASE),str(BASE),'--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/etc']
 for p in ['/etc/alternatives','/etc/libreoffice','/etc/ssl','/etc/fonts','/etc/hosts','/etc/nsswitch.conf','/etc/ld.so.cache']:
  if pathlib.Path(p).exists():cmd+=['--ro-bind',p,p]
 cmd+=['--ro-bind',str(BASE/'resolv.conf'),'/etc/resolv.conf']
 cmd+=['--bind',str(job['folder']),str(job['folder']),'--chdir',str(job['folder']),'--setenv','HOME',str(job['folder']),'--setenv','TMPDIR','/tmp','--',*args]
 return cmd
def execute(job,args,timeout=540,network=False,progress=False):
 logs=[];size=[0];started=time.monotonic();proc=subprocess.Popen(sandbox(job,args,network),cwd=job['folder'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,start_new_session=True,env={**os.environ,'HOME':str(job['folder']),'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','SAL_USE_VCLPLUGIN':'svp','LANG':'C.UTF-8'})
 with lock:job['process']=proc
 def read():
  for line in iter(proc.stdout.readline,b''):
   size[0]+=len(line)
   if size[0]>8*1024**2:stop();break
   text=line.decode('utf-8','replace');logs.append(text)
   if progress:
    m=re.search(r'out_time_us=(\d+)',text)
    if m and job.get('duration'):job['progress']=min(97,round(int(m[1])/1e6/job['duration']*100))
    m=re.search(r'\[download\]\s+([\d.]+)%',text)
    if m:job['progress']=min(95,round(float(m[1])))
 def stop():
  try:os.killpg(proc.pid,signal.SIGKILL)
  except ProcessLookupError:pass
 reader=threading.Thread(target=read,daemon=True);reader.start();reason=None
 try:
  while proc.poll() is None:
   if job['status']=='canceled':reason='Задание отменено.'
   elif time.monotonic()-started>timeout:reason='Обработка заняла слишком много времени. Уменьши файл или качество.'
   elif tree_size(job['folder'])>MAX_RESULT*2:reason='Результат слишком большой. Выбери меньшее разрешение.'
   if reason:stop();break
   time.sleep(.2)
  proc.wait();reader.join(2)
 finally:
  if proc.poll() is None:stop();proc.wait()
  with lock:job.pop('process',None)
 if reason:raise Problem(reason)
 text=''.join(logs)
 if proc.returncode:
  print('PROCESS FAILED:',text[:1800]+'\n…\n'+text[-1800:],flush=True)
  if 'video is unavailable' in text.lower():raise Problem('Этот ролик недоступен. Проверь ссылку или выбери другой публичный ролик.')
  if any(s in text.lower() for s in ['sign in','bot','login','private video','not available','403','captcha']):raise Problem('Площадка ограничила доступ к этому видео с сервера. Попробуй другой публичный ролик позже.')
  raise Problem('Не удалось обработать файл или ссылку. Проверь формат и попробуй другой вариант.')
 return text
YTDLP=[PYTHON,'-m','yt_dlp','--ignore-config','--no-plugin-dirs','--no-playlist','--no-warnings','--socket-timeout','20','--retries','1','--fragment-retries','1','--no-cache-dir','--no-check-formats','--js-runtimes','node:'+os.environ.get('TOOLS_NODE','/usr/local/bin/node'),'--extractor-args','youtube:player_client=default','--max-filesize',str(MAX_RESULT),'--match-filter','!is_live & duration <= 7200']
def clean_url(raw):
 try:u=urllib.parse.urlsplit(str(raw).strip())
 except ValueError:raise Problem('Некорректная ссылка.')
 if u.scheme not in ['https','http'] or u.username or u.password or u.port not in [None,80,443]:raise Problem('Нужна обычная ссылка YouTube или TikTok.')
 host=(u.hostname or '').lower();query=urllib.parse.parse_qs(u.query)
 if host in ['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be']:
  id=u.path.strip('/') if host.endswith('youtu.be') else query.get('v',[''])[0] if u.path=='/watch' else u.path.split('/')[2] if re.match(r'^/(shorts|live|embed)/[^/]+/?$',u.path) else ''
  if not re.fullmatch(r'[A-Za-z0-9_-]{11}',id):raise Problem('Вставь ссылку на один ролик YouTube, не на канал или плейлист.')
  return 'https://www.youtube.com/watch?v='+id
 if host in ['www.tiktok.com','tiktok.com','m.tiktok.com'] and re.fullmatch(r'/@[\w.\-]+/video/\d{10,25}/?',u.path):return 'https://www.tiktok.com'+u.path
 if host in ['vm.tiktok.com','vt.tiktok.com'] and re.fullmatch(r'/[A-Za-z0-9]+/?',u.path):return 'https://'+host+u.path
 if host in ['www.tiktok.com','tiktok.com'] and re.fullmatch(r'/t/[A-Za-z0-9]+/?',u.path):return 'https://www.tiktok.com'+u.path
 raise Problem('Поддерживаются ссылки на отдельные видео YouTube и TikTok.')
def inspect_file(job):
 source=job['folder']/job['source'];ext=source.suffix[1:];kind=family(ext);info={'family':kind,'label':GROUPS[kind]['label'],'size':source.stat().st_size,'note':NOTES[kind]};outputs=list(GROUPS[kind]['output'])
 if kind in ['video','audio']:
  text=execute(job,['ffprobe','-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',str(source)],timeout=30)
  data=json.loads(text);streams=data.get('streams',[]);audio=any(s.get('codec_type')=='audio' for s in streams);video=next((s for s in streams if s.get('codec_type')=='video' and not s.get('disposition',{}).get('attached_pic')),None)
  duration=float(data.get('format',{}).get('duration',0));info.update(duration=duration,audio=audio,width=video.get('width') if video else None,height=video.get('height') if video else None)
  if duration>7200:raise Problem('Максимальная длительность — 2 часа.')
  if not audio:outputs=[f for f in outputs if f not in AUDIO]
  if not video:outputs=[f for f in outputs if f in AUDIO]
  if not outputs:raise Problem('В файле не найдены поддерживаемые видео- или аудиодорожки.')
  job['duration']=duration
 update(job,status='ready',phase='Выбери формат',progress=100,info=info,outputs=outputs)
def inspect_url(job):
 text=execute(job,YTDLP+['--dump-single-json','--skip-download','--',job['url']],timeout=90,network=True);data=json.loads(text)
 if data.get('_type') in ['playlist','multi_video'] or data.get('is_live') or float(data.get('duration') or 0)>7200:raise Problem('Нужен отдельный завершённый ролик длительностью до двух часов.')
 formats=[f for f in data.get('formats',[]) if not f.get('has_drm') and f.get('protocol') in ['https','http','http_dash_segments','m3u8_native','m3u8'] and re.fullmatch(r'[A-Za-z0-9_.-]+',str(f.get('format_id','')))];audio=[f for f in formats if f.get('acodec') not in [None,'none'] and f.get('vcodec') in [None,'none']]
 best_audio=max(audio,key=lambda f:f.get('abr') or f.get('tbr') or 0,default=None);choices=[];plans={}
 def add(label,plan,**kw):
  key=str(len(choices));choices.append({'id':key,'label':label,**kw});plans[key]=plan
 for f in sorted(formats,key=lambda f:(f.get('height') or 0,f.get('fps') or 0,f.get('tbr') or 0),reverse=True)[:160]:
  video=f.get('vcodec') not in [None,'none'];has_audio=f.get('acodec') not in [None,'none'];ext=f.get('ext','mkv')
  if not video and not has_audio:continue
  select=str(f['format_id']);merged=ext
  if video and not has_audio:
   compatible=[a for a in audio if a.get('ext')==('m4a' if ext=='mp4' else 'webm')];a=max(compatible,key=lambda a:a.get('abr') or 0,default=best_audio)
   if a:select+='+'+str(a['format_id']);has_audio=True;merged=ext if compatible else 'mkv'
  label=(str(f.get('height') or '?')+'p · '+str(round(f.get('fps') or 0))+' fps · ' if video else 'Аудио · ')+merged.upper()+' · '+str(f.get('vcodec') if video else f.get('acodec'))
  if not has_audio:label+=' · без звука'
  if f.get('language'):label+=' · '+f['language']
  if not video:label+=' · '+str(round(f.get('abr') or f.get('tbr') or 0))+' кбит/с'
  add(label,{'select':select,'merge':merged,'audio':None},type='video' if video else 'audio',size=f.get('filesize') or f.get('filesize_approx'),height=f.get('height'),note=f.get('format_note'))
 if not choices:raise Problem('Площадка не предоставила доступных вариантов скачивания.')
 source=str(best_audio['format_id']) if best_audio else next((str(f['format_id']) for f in formats if f.get('acodec') not in [None,'none']),None)
 if source:
  for ext in AUDIO:add('Аудио → '+ext.upper(),{'select':source,'audio':ext},type='audio',size=None)
 job['plans']=plans;job['duration']=float(data.get('duration') or 0)
 update(job,status='ready',phase='Выбери вариант скачивания',progress=100,name=str(data.get('title') or 'Видео')[:180],info={'title':str(data.get('title') or 'Видео')[:180],'duration':data.get('duration'),'author':str(data.get('uploader') or '')[:100],'platform':data.get('extractor_key')},outputs=choices)
def result(job,path):
 if not path.is_file() or path.stat().st_size==0 or path.stat().st_size>MAX_RESULT:raise Problem('Результат слишком большой или пустой.')
 name=re.sub(r'[\x00-\x1f/\\<>:"|?*]','_',pathlib.Path(job['name']).stem)[:120]+path.suffix
 job['output']=path
 update(job,status='done',phase='Готово',progress=100,result={'name':name,'size':path.stat().st_size,'url':'/api/tools/jobs/'+job['id']+'/file?token='+job['token']})
def convert(job):
 for old in job['folder'].glob('result.*'):old.unlink()
 req={'source':job['source'],'target':job['target'],'options':job.get('options',{})};(job['folder']/'request.json').write_text(json.dumps(req))
 text=execute(job,[PYTHON,str(BASE/'convert.py')],progress=True);matches=re.findall(r'^RESULT (result\.\w+)$',text,re.M)
 if not matches:raise Problem('Конвертер не вернул результат.')
 result(job,job['folder']/matches[-1])
def edit(job):
 req={'source':job['source'],'hasAudio':job['info'].get('audio',False),'options':job['editOptions'],'audio':job.get('editAudio'),'overlay':job.get('editOverlay')}
 (job['folder']/'edit-request.json').write_text(json.dumps(req))
 execute(job,[PYTHON,str(BASE/'edit.py')],progress=True)
 result(job,job['folder']/('result.'+job['editOptions']['target']))
def download(job):
 plan=job['plans'][job['choice']];folder=job['folder']
 for pattern in ['media*','result.*']:
  for p in folder.glob(pattern):
   if p.is_file():p.unlink()
 cmd=YTDLP+['--newline','--no-part','--concurrent-fragments','1','--ffmpeg-location','/usr/bin','--postprocessor-args','ffmpeg:-threads 1','-f',plan['select'],'-o',str(folder/'media.%(ext)s')]
 if not plan.get('audio') and plan.get('merge') in ['mp4','webm','mkv','mov','avi']:cmd+=['--merge-output-format',plan['merge']]
 execute(job,cmd+['--',job['url']],timeout=600,network=True,progress=True)
 files=[p for p in folder.glob('media.*') if p.is_file() and p.suffix not in ['.part','.ytdl']]
 if len(files)!=1:raise Problem('Не удалось собрать итоговый файл.')
 if plan.get('audio'):
  update(job,phase='Преобразуем аудио',progress=0)
  job.update(source=files[0].name,target=plan['audio'],options={'bitrate':'192'});convert(job)
 else:result(job,files[0])
def worker():
 while True:
  job,operation=work.get()
  try:
   update(job,status='working',phase={'probe':'Читаем файл','inspect':'Получаем варианты','convert':'Конвертируем','download':'Скачиваем и собираем файл','edit':'Собираем монтаж'}[operation],progress=0)
   {'probe':inspect_file,'inspect':inspect_url,'convert':convert,'download':download,'edit':edit}[operation](job)
  except Exception as e:
   with lock:
    if job['status']!='canceled':job.update(status='error',phase='Не получилось',error=str(e) if isinstance(e,Problem) else 'Не удалось прочитать этот файл. Проверь исходник и формат.')
  finally:work.task_done()
def enqueue(job,operation):
 update(job,status='queued',phase='В очереди',progress=0,error=None);work.put((job,operation))
threading.Thread(target=worker,daemon=True).start()
def cleanup():
 while True:
  time.sleep(60)
  with lock:
   for id,job in list(jobs.items()):
    if job['status'] not in ['working','queued','uploading'] and time.time()-job['created']>TTL:jobs.pop(id);shutil.rmtree(job['folder'],ignore_errors=True)
   for client in list(rates):
    rates[client]=[t for t in rates[client] if time.time()-t<600]
    if not rates[client]:rates.pop(client)
threading.Thread(target=cleanup,daemon=True).start()
class Handler(http.server.BaseHTTPRequestHandler):
 protocol_version='HTTP/1.1'
 def log_message(self,*args):pass
 def send(self,status,data):
  self.close_connection=True
  encoded=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Connection','close');self.send_header('Content-Length',len(encoded));self.end_headers();self.wfile.write(encoded)
 def data(self):
  size=int(self.headers.get('Content-Length',0))
  if size<0 or size>8192:raise Problem('Слишком большой запрос.',413)
  try:return json.loads(self.rfile.read(size) or b'{}')
  except Exception:raise Problem('Некорректные данные.')
 def do_GET(self):self.handle_request()
 def do_POST(self):self.handle_request()
 def do_PUT(self):self.handle_request()
 def do_DELETE(self):self.handle_request()
 def handle_request(self):
  global uploading,reserved
  try:
   self.connection.settimeout(120);url=urllib.parse.urlsplit(self.path);parts=url.path.strip('/').split('/');query=urllib.parse.parse_qs(url.query);client=self.headers.get('X-Tools-Client','local')[:100]
   if parts==['capabilities'] and self.command=='GET':return self.send(200,{'groups':GROUPS,'notes':NOTES,'maxUpload':MAX,'maxResult':MAX_RESULT,'ttl':TTL})
   if parts==['uploads'] and self.command=='PUT':
    name=query.get('name',['file'])[0];ext=pathlib.Path(name).suffix[1:].lower()
    if not family(ext):raise Problem('Этот формат пока не поддерживается.')
    size=int(self.headers.get('Content-Length',0))
    if not 0<size<=MAX:raise Problem('Максимальный размер — 256 МБ.',413)
    with lock:
     if uploading>=2 or usage()+reserved+size>TOTAL:raise Problem('Сервер занят. Попробуй позже.',429)
     uploading+=1;reserved+=size
    job=None
    try:
     job=new_job(client,'convert',pathlib.Path(name).name);job['source']='source.'+ext;remaining=size
     with (job['folder']/job['source']).open('xb') as f:
      while remaining:
       chunk=self.rfile.read(min(65536,remaining))
       if not chunk:raise Problem('Загрузка прервалась.')
       f.write(chunk);remaining-=len(chunk)
     enqueue(job,'probe');return self.send(201,public(job))
    except Exception:
     if job:jobs.pop(job['id'],None);shutil.rmtree(job['folder'],ignore_errors=True)
     raise
    finally:
     with lock:uploading-=1;reserved-=size
   if parts==['inspect'] and self.command=='POST':
    data=self.data();link=clean_url(data.get('url'));job=new_job(client,'download','Видео');job['url']=link;enqueue(job,'inspect');return self.send(201,public(job))
   if len(parts)>=2 and parts[0]=='jobs':
    data=self.data() if self.command=='POST' else {};job=authenticated(parts[1],data.get('token') or query.get('token',[''])[0])
    if len(parts)==2 and self.command=='GET':return self.send(200,public(job))
    if len(parts)==2 and self.command=='DELETE':
     with lock:
      job['status']='canceled';proc=job.get('process')
      if proc:
       try:os.killpg(proc.pid,signal.SIGKILL)
       except ProcessLookupError:pass
     return self.send(200,{'ok':True})
    if len(parts)==3 and parts[2]=='file' and self.command=='GET':
     path=job.get('output')
     if job['status']!='done' or not path or not path.is_file():raise Problem('Файл ещё не готов.',409)
     self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',path.stat().st_size);self.send_header('Content-Disposition',"attachment; filename=download; filename*=UTF-8''"+urllib.parse.quote(job['result']['name'],safe=''));self.send_header('Cache-Control','no-store');self.end_headers()
     with path.open('rb') as f:shutil.copyfileobj(f,self.wfile)
     return
    if len(parts)==3 and parts[2]=='edit' and self.command=='POST':
     with lock:
      if job['kind']!='convert' or job['status'] not in ['ready','done','error'] or job.get('info',{}).get('family') not in ['video','audio']:raise Problem('Сначала загрузите видео или аудио.',409)
      if work.qsize()>=8 or job.get('attempts',0)>=20:raise Problem('Очередь или лимит обработок заполнены.',429)
      options=data.get('options',{})
      if not isinstance(options,dict):raise Problem('Некорректные параметры.')
      try:start=float(options['start']);end=float(options['end'])
      except (KeyError,ValueError,TypeError):raise Problem('Укажите начало и конец фрагмента.')
      if not 0<=start<end<=job['info']['duration']+.05 or not .1<=end-start<=600:raise Problem('Фрагмент должен быть от 0,1 секунды до 10 минут и находиться внутри исходника.')
      target=options.get('target')
      if target not in ['mp4','mp3','wav'] or target=='mp4' and not job['info'].get('width'):raise Problem('Неподдерживаемый формат результата.')
      assets={}
      for key,field in [('audio','editAudio'),('overlay','editOverlay')]:
       ref=data.get(key)
       if not ref:assets[field]=None;continue
       if not isinstance(ref,dict):raise Problem('Некорректное вложение.')
       asset=authenticated(ref.get('id'),ref.get('token'))
       if asset['status'] not in ['ready','done'] or asset.get('kind')!='convert':raise Problem('Вложение ещё не готово.')
       if key=='audio' and not asset.get('info',{}).get('audio'):raise Problem('В файле нет звуковой дорожки.')
       if key=='overlay' and pathlib.Path(asset['source']).suffix!='.png':raise Problem('Наложение должно быть PNG.')
       assets[field]=asset
      extra=sum((a['folder']/a['source']).stat().st_size for a in assets.values() if a)
      if usage()+reserved+extra>TOTAL:raise Problem('Недостаточно места. Попробуйте позже.',429)
      for field,asset in assets.items():
       if asset:
        name=field+pathlib.Path(asset['source']).suffix;shutil.copyfile(asset['folder']/asset['source'],job['folder']/name);job[field]=name
       else:job[field]=None
      job['editOptions']=options;job['duration']=end-start;job['attempts']=job.get('attempts',0)+1;job.pop('result',None);enqueue(job,'edit')
     return self.send(202,public(job))
    if len(parts)==3 and parts[2] in ['convert','download'] and self.command=='POST':
     with lock:
      if work.qsize()>=8:raise Problem('Очередь заполнена.',429)
      if job.get('attempts',0)>=20:raise Problem('Лимит повторных обработок. Загрузи файл заново позже.',429)
      job['attempts']=job.get('attempts',0)+1
      if job['status'] not in ['ready','done','error'] or not job.get('outputs'):raise Problem('Дождись окончания текущей обработки.',409)
      if parts[2]=='convert':
       if job['kind']!='convert' or data.get('target') not in job['outputs']:raise Problem('Неподдерживаемый формат.')
       if not isinstance(data.get('options',{}),dict):raise Problem('Некорректные параметры.')
       job['target']=data['target'];job['options']=data.get('options',{})
      else:
       if job['kind']!='download' or str(data.get('choice')) not in job.get('plans',{}):raise Problem('Выбери доступный вариант.')
       job['choice']=str(data['choice'])
      job.pop('result',None);enqueue(job,parts[2])
     return self.send(202,public(job))
   raise Problem('Неизвестная команда.',404)
  except (BrokenPipeError,ConnectionResetError):pass
  except Exception as e:
   try:self.send(e.status if isinstance(e,Problem) else 500,{'error':str(e) if isinstance(e,Problem) else 'Ошибка обработки. Попробуй ещё раз.'})
   except (BrokenPipeError,ConnectionResetError):pass
class UnixServer(socketserver.ThreadingMixIn,http.server.HTTPServer):
 address_family=__import__('socket').AF_UNIX;daemon_threads=True
 def server_bind(self):socketserver.TCPServer.server_bind(self);self.server_name='localhost';self.server_port=0
if __name__=='__main__':
 # Previous in-memory jobs cannot be resumed; only our dedicated temporary directory is cleaned.
 for folder in ROOT.iterdir():
  if folder.is_dir() and re.fullmatch(r'[0-9a-f]{32}',folder.name):shutil.rmtree(folder,ignore_errors=True)
 socket=os.environ.get('TOOLS_SOCKET','/run/makson-tools/worker.sock')
 pathlib.Path(socket).parent.mkdir(parents=True,exist_ok=True)
 try:os.unlink(socket)
 except FileNotFoundError:pass
 server=UnixServer(socket,Handler);os.chmod(socket,0o660);server.serve_forever()
