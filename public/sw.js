const CACHE_NAME = 'muelle-mosquera-v10';
const ASSETS = [
  '/', '/index.html', '/manifest.webmanifest',
  '/src/main.js?v=10', '/src/ui.js', '/src/balance.js', '/src/audio.js', '/src/save.js'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME && caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(r=>r || fetch(req).then(net=>{
      if (req.method==='GET' && new URL(req.url).origin===location.origin){
        const copy = net.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      }
      return net;
    }).catch(()=>r))
  );
});
