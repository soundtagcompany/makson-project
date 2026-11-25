import http from 'node:http';
import {isIP} from 'node:net';
import {createHash,randomBytes} from 'node:crypto';
const salt=randomBytes(32);
export function proxyTools(req,res,clientIP){
 const path=req.url.replace(/^\/api\/tools/,'');
 const peer=req.socket.remoteAddress,forwarded=req.headers['x-real-ip'];
 const identity=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:clientIP(req);
 const headers={'content-type':req.headers['content-type']||'application/json','x-tools-client':createHash('sha256').update(salt).update(String(identity)).digest('hex')};
 if(req.headers['content-length'])headers['content-length']=req.headers['content-length'];
 const upstream=http.request({socketPath:process.env.MAKSON_TOOLS_SOCKET||'/run/makson-tools/worker.sock',path,method:req.method,headers},reply=>{
  res.writeHead(reply.statusCode,{'Content-Type':reply.headers['content-type']||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(reply.headers['content-length']?{'Content-Length':reply.headers['content-length']}:{}),...(reply.headers['content-disposition']?{'Content-Disposition':reply.headers['content-disposition']}:{})});reply.pipe(res);reply.on('error',()=>res.destroy());
 });
 upstream.setTimeout(130000,()=>upstream.destroy());
 upstream.on('error',()=>{if(res.headersSent)return res.destroy();res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Обработчик файлов временно недоступен. Попробуй немного позже.'}));});
 req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
}
