"""Serve a read-only comparison on loopback; no service keys, writes, or external upstreams."""
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from urllib.request import build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.error import URLError, HTTPError
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
d=Path(__file__).resolve().parent
release=Path(os.environ.get('MAKSON_RELEASE_DIR',d.parents[1]/'makson-release')).resolve()
live=d.parent/'live' if (d.parent/'live').is_dir() else d/'live'
montage_mode=os.environ.get('MAKSON_PREVIEW_MONTAGE','0')
montage_variant={'0':None,'1':'montage','latest':'montage-photo'}.get(montage_mode)
if montage_mode not in ('0','1','latest'):
 raise SystemExit('Use MAKSON_PREVIEW_MONTAGE=0, 1 or latest.')
montage=None
if montage_variant:
 montage=next((p for p in (d.parent/montage_variant,d/montage_variant) if (p/'editor.css').is_file() and (p/'editor.js').is_file()),None)
 if not montage:raise SystemExit('Montage candidate is missing; restore both files or choose a different mode.')
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=build_opener(ProxyHandler({}),NoRedirect())
class Handler(BaseHTTPRequestHandler):
 def respond(self,data,mime,status=200):
  self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers()
  self.wfile.write(data)
 def do_POST(self):self.respond(b'{"error":"Preview is read-only"}','application/json',405)
 do_PUT=do_DELETE=do_PATCH=do_POST
 def do_GET(self):
  u=urlsplit(self.path)
  if u.scheme or u.netloc or not u.path.startswith('/') or u.path.startswith('//'):
   return self.respond(b'Invalid path','text/plain',400)
  if u.path=='/':
   body=(release/'index.html').read_text()
   if parse_qs(u.query).get('framebuffer')==['1']:
    body=body.replace('</body>','<script type="module" src="/__preview/bridge.js"></script></body>')
   return self.respond(body.encode(),'text/html; charset=utf-8')
  if u.path in ('/__preview/bridge.js','/__preview/prototype.js'):
   shell=d
   if os.environ.get('MAKSON_PREVIEW_SHELL')=='native':
    shell=next((p for p in (d.parent/'framebuffer-native',d/'framebuffer-native') if p.is_dir()),d)
   return self.respond((shell/u.path.split('/')[-1]).read_bytes(),'text/javascript')
  if u.path.startswith('/api/'):
   if u.path=='/api/svyaz/session':return self.respond(b'{"user":null,"csrf":"preview"}','application/json')
   if u.path=='/api/tools/capabilities':return self.respond(b'{"groups":{},"maxUpload":0}','application/json')
   return self.respond(b'{"error":"Unavailable in preview"}','application/json',503)
  if montage is not None and u.path in ('/editor.css','/editor.js'):
   asset=montage/u.path[1:]
   return self.respond(asset.read_bytes(),'text/javascript' if asset.suffix=='.js' else 'text/css')
  asset=live/u.path.removeprefix('/')
  if asset.parent==live and asset.name in {'console.css','console-effects.js','console-shell.js','app.js','orbit.js','tools-ui.js','game-core.js','meme.css','meme.js','editor.js','editor.css'}:
   return self.respond(asset.read_bytes(),'text/javascript' if asset.suffix=='.js' else 'text/css')
  try:
   with opener.open('http://127.0.0.1:4357'+u.path+('?' + u.query if u.query else ''),timeout=8) as r:
    self.respond(r.read(),r.headers.get('Content-Type','application/octet-stream'),r.status)
  except HTTPError as e:self.respond(b'Asset unavailable','text/plain',e.code)
  except (URLError,TimeoutError):self.respond(b'Local application unavailable','text/plain',503)
ThreadingHTTPServer(('127.0.0.1',4356),Handler).serve_forever()
