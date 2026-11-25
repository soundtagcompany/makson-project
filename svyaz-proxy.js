import http from 'node:http';

// Only the loopback account service receives credentials. It is not a public proxy.
export function proxySvyaz(req,res,clientIP){
  const publicSite=process.env.MAKSON_SITE_URL ? new URL(process.env.MAKSON_SITE_URL) : null;
  const proto=publicSite?.host===req.headers.host ? publicSite.protocol.slice(0,-1) : req.headers.host?.split(':')[0]==='makson.sndtag.ru'?'https':'http';
  const upstream=http.request({host:'127.0.0.1',port:Number(process.env.SVYAZ_PORT)||3180,path:req.url,method:req.method,headers:{host:req.headers.host,'content-type':req.headers['content-type']||'application/json',cookie:req.headers.cookie||'',origin:req.headers.origin||'',referer:req.headers.referer||'','x-csrftoken':req.headers['x-csrftoken']||'','x-real-ip':clientIP(req),'x-forwarded-proto':proto}},reply=>{
    res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);
  });
  const failure=()=>{if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'СВЯЗЬ временно недоступна. Попробуй чуть позже.'}));}else res.end();};
  upstream.setTimeout(20000,()=>upstream.destroy());upstream.on('error',failure);
  const maxSize=req.method==='POST'&&req.url.split('?')[0]==='/api/svyaz/send-photo'?12*1024*1024+16384:16384;
  let size=0;
  req.on('data',chunk=>{size+=chunk.length;if(size>maxSize){if(!res.headersSent){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Слишком большой запрос.'}));}upstream.destroy();}});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
}
