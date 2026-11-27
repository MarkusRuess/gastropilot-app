const CACHE="gastropilot-social-shell-v1";
const SHELL=["./","./index.html","./app.mjs","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(url.origin===self.location.origin&&event.request.method==="GET"){event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));}});
