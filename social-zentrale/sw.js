const CACHE="gastropilot-social-shell-v3";
const CACHE_PREFIX="gastropilot-social-shell-";
const SHELL=["./","./index.html","./app.mjs","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||event.request.method!=="GET")return;
  const base=new URL("./",self.location.href).pathname;
  const shell=url.pathname===base||url.pathname===base+"index.html"||url.pathname===base+"app.mjs";
  if(shell){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const response=await fetch(event.request,{cache:"no-store"});
        if(response.ok)await cache.put(event.request,response.clone());
        return response;
      }catch(error){
        const cached=await cache.match(event.request);
        if(cached)return cached;
        if(url.pathname===base){const index=await cache.match(new URL("./index.html",self.location.href).href);if(index)return index;}
        throw error;
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});