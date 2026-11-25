self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{e.waitUntil((async()=>{let data={};try{data=e.data.json();}catch{}await self.registration.showNotification('MAKSON PROJECT / СВЯЗЬ',{body:data.body||'Новое уведомление',tag:data.tag||'svyaz',icon:'/favicon.svg',data:{url:'/?notifications=1'}});})());});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});const tab=clients.find(c=>new URL(c.url).origin===self.location.origin);if(tab){await tab.focus();tab.postMessage({type:'open-social'});}else await self.clients.openWindow('/?notifications=1');})());});
