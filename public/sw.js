const CACHE_NAME = 'varadero-mosquera-v15';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest',
  '/src/main.js?v=15', '/src/ui.js', '/src/balance.js', '/src/audio.js', '/src/save.js'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>n!==CACHE_NAME&&caches.delete(n)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const r=e.request;
  e.respondWith(
    caches.match(r).then(m=>m||fetch(r).then(n=>{
      if(r.method==='GET' && new URL(r.url).origin===location.origin){
        const cp=n.clone(); caches.open(CACHE_NAME).then(c=>c.put(r,cp));
      }
      return n;
    }).catch(()=>m))
  );
});
