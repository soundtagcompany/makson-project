// One site identity for games and messenger. Game rendering never waits for HTTP.
let identity=null,loaded=false,loading=null,flushing=false;
const queueKey='makson_account_results_v1';
let queue=[];try{queue=JSON.parse(localStorage.getItem(queueKey)||'[]');if(!Array.isArray(queue))queue=[];}catch{}
async function session(){if(!loading)loading=fetch('/api/svyaz/session',{credentials:'same-origin',signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw Error();const s=await r.json();identity=s.user;loaded=true;return s;}).finally(()=>loading=null);return loading;}
async function post(action,data,owner){const s=await session();if(!s.user||s.user.id!==owner)throw Error('account-changed');const r=await fetch('/api/svyaz/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':s.csrf},body:JSON.stringify(data),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(String(r.status));return r.json();}
function persist(){try{localStorage.setItem(queueKey,JSON.stringify(queue.slice(-200)));}catch{}}
export function beginGame(game,mode='classic',network=false,key=crypto.randomUUID?.()||Date.now()+'-'+Math.random()){
 const started=performance.now(),known=loaded?identity:undefined;
 const ready=(async()=>{
  const s=known===undefined?await session():{user:known};if(!s.user)return null;
  const owner=s.user.id,hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(key)));
  const runKey=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const r=await post('record-start',{game,mode,network,key:runKey},owner);return {run:r.run,owner};
 })().catch(()=>null);
 return {started,ready};
}
export async function finishGame(handle,result){if(!handle||handle.finished)return;handle.finished=true;const info=await handle.ready;if(!info)return;const data={duration:(performance.now()-handle.started)/1000,...result,run:info.run};if(!queue.some(q=>q.owner===info.owner&&q.data.run===info.run)){queue.push({owner:info.owner,data});queue=queue.slice(-200);persist();}flush();}
async function flush(){if(flushing||!queue.length)return;flushing=true;try{const s=await session();if(!s.user)return;for(const item of [...queue])if(item.owner===s.user.id){await post('record-finish',item.data,item.owner);queue=queue.filter(q=>q!==item);persist();document.dispatchEvent(new Event('recordschange'));}}catch{}finally{flushing=false;}}
document.addEventListener('accountchange',e=>{identity=e.detail.user;loaded=true;flush();});addEventListener('online',flush);
setInterval(()=>{if(!document.hidden)flush();},30000);
