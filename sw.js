// Simple cache-first SW
const CACHE_NAME = 'astillero-v4'; // subir versión para invalidar caché viejo
const ASSETS = [
  '/',
  '/public/index.html', // si sirves /public como raíz, deja solo '/'
  '/manifest.webmanifest',
  '/src/main.js',
  '/src/ui.js',
  '/src/balance.js',
  '/src/audio.js',
  '/src/save.js'
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
    caches.match(req).then(res=>res || fetch(req).then(net=>{
      // solo cachea GET del mismo origen
      if (req.method==='GET' && new URL(req.url).origin===location.origin) {
        const copy = net.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      }
      return net;
    }).catch(()=>res))
  );
});
