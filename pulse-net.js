export class PulseOnline{
 constructor(onState,onStatus){this.onState=onState;this.onStatus=onStatus;this.connected=false;this.session=null;this.generation=0;this.pending=null;try{const saved=JSON.parse(sessionStorage.getItem('makson_pulse_room'));if(saved?.token&&/^\d{3}$/.test(saved.code))this.session=saved;}catch{}}
 async request(route,data={}){const response=await fetch('/api/pulse/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...this.session,...data}),signal:AbortSignal.timeout(8000)});const value=await response.json();if(!response.ok){const error=Error(value.error||'Сервер не ответил.');error.status=response.status;throw error;}return value;}
 save(){try{if(this.session)sessionStorage.setItem('makson_pulse_room',JSON.stringify(this.session));else sessionStorage.removeItem('makson_pulse_room');}catch{}}
 async enter(route,code,roomId){if(this.session)throw Error('Сначала выйди из текущей комнаты.');this.session=await this.request(route,{code,roomId});this.save();this.connect();}
 connect(){this.source?.close();const generation=++this.generation;this.connected=false;this.onStatus('ПОДКЛЮЧЕНИЕ…');const stream=this.source=new EventSource('/api/pulse/events?'+new URLSearchParams(this.session));
  stream.onmessage=e=>{if(generation!==this.generation)return;this.connected=true;this.onState(JSON.parse(e.data));this.onStatus('НА СВЯЗИ');};
  stream.onerror=async()=>{if(generation!==this.generation)return;this.connected=false;this.onStatus('ВОССТАНАВЛИВАЕМ СВЯЗЬ…');try{await this.request('state');}catch(e){if(generation===this.generation&&(e.status===404||e.status===403)){stream.close();this.onStatus('КОМНАТА ЗАКРЫТА. ВЫЙДИ В МЕНЮ.');}}};
 }
 async action(command,revision){
  // A retry uses the same id: lost HTTP responses must not apply a turn twice.
  const payload={command,revision,requestId:crypto.randomUUID?.()||Date.now()+'-'+Math.random()};
  try{return await this.request('action',payload);}catch(e){if(e.status)throw e;return await this.request('action',payload);}
 }
 async leave(){const old=this.session;this.generation++;this.source?.close();this.connected=false;this.session=null;this.save();if(old)try{await this.request('leave',old);}catch{}}
}
