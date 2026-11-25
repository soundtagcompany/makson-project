"""Bounded single-clip editor, executed in the existing offline job sandbox."""
import json,math,pathlib,subprocess
root=pathlib.Path.cwd();r=json.loads((root/'edit-request.json').read_text());o=r['options']
def number(key,default,lo,hi):
 v=float(o.get(key,default))
 if not math.isfinite(v) or not lo<=v<=hi:raise ValueError('Invalid '+key)
 return v
start=number('start',0,0,7200);end=number('end',0,0,7200);duration=end-start
if not .1<=duration<=600:raise ValueError('Export must be 0.1–600 seconds')
target=o.get('target','mp4')
if target not in ['mp4','mp3','wav']:raise ValueError('Invalid format')
args=['ffmpeg','-hide_banner','-nostdin','-y','-threads','1','-filter_complex_threads','1','-filter_threads','1','-ss',str(start),'-protocol_whitelist','file,pipe','-i',r['source']]
filters=[];audio=[];index=1
if r.get('audio'):
 args+=['-threads','1','-ss',str(number('audioStart',0,0,7200)),'-protocol_whitelist','file,pipe','-i',r['audio']];extra=index;index+=1
if r.get('overlay') and target=='mp4':
 args+=['-loop','1','-threads','1','-protocol_whitelist','file,pipe','-i',r['overlay']];overlay=index
if target=='mp4':
 width=int(number('width',1280,2,1920))//2*2;height=int(number('height',720,2,1920))//2*2
 if width*height>1920*1080:raise ValueError('Too many pixels')
 filters+=[f'[0:v:0]setpts=PTS-STARTPTS,scale={width}:{height},setsar=1,fps=30[v]']
 if r.get('overlay'):filters+=[f'[{overlay}:v]scale={width}:{height},format=rgba[overlay]', '[v][overlay]overlay=0:0:shortest=1[outv]'];video='[outv]'
 else:video='[v]'
if r['hasAudio']:
 filters+=[f"[0:a:0]asetpts=PTS-STARTPTS,volume={number('originalVolume',1,0,1)},apad,atrim=duration={duration}[a0]"];audio+=['[a0]']
if r.get('audio'):
 delay=round(number('audioDelay',0,0,duration)*1000)
 filters+=[f"[{extra}:a:0]asetpts=PTS-STARTPTS,volume={number('audioVolume',1,0,1)},adelay={delay}:all=1,apad,atrim=duration={duration}[a1]"];audio+=['[a1]']
if len(audio)==2:filters+=[''.join(audio)+'amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:latency=1[a]'];sound='[a]'
elif audio:sound=audio[0]
else:sound=None
if not sound and target!='mp4':raise ValueError('No audio')
args+=['-filter_complex',';'.join(filters)]
if target=='mp4':args+=['-map',video,'-c:v','libx264','-preset','veryfast','-crf','23','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart']
if sound:
 args+=['-map',sound,'-c:a',{'mp4':'aac','mp3':'libmp3lame','wav':'pcm_s16le'}[target],'-ar','48000']
 if target!='wav':args+=['-b:a','192k']
args+=['-t',str(duration),'-progress','pipe:1','-nostats','result.'+target]
subprocess.run(args,check=True,timeout=540)
print('RESULT result.'+target,flush=True)
