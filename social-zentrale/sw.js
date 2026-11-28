const CACHE="gastropilot-social-shell-v2";
const CACHE_PREFIX="gastropilot-social-shell-";
const SHELL=["./","./index.html","./app.mjs","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(url.origin===self.location.origin&&event.request.method==="GET"){event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));}});