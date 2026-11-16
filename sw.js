// Shared production worker: retain index.html support and keep test caches separate.
const CACHE='patrol-v6';
const REQUIRED=['index-v2.html'];
const OPTIONAL=['./','index.html','manifest.json','wallpaper.jpg','logo.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(REQUIRED);
    await Promise.all(OPTIONAL.map(async file=>{try{await cache.add(file)}catch(error){}}));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    // Only remove older caches owned by the production patrol worker.
    await Promise.all(names.filter(name=>/^patrol-v\d+$/.test(name)&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||
     !url.pathname.startsWith(new URL('./',self.location.href).pathname))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(req);
      if(response.ok){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));
        return response;
      }
      return (await caches.match(req))||response;
    }catch(error){
      const cached=await caches.match(req);
      if(cached)return cached;
      throw error;
    }
  })());
});
