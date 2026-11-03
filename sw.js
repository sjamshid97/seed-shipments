/* Service Worker — سامانهٔ ارسال نمونه‌های آزمایشی (نسخه 1.1.0)
   هدف: باز شدن برنامه بدون اینترنت + دریافت نسخهٔ تازه با یک رفرش */
const CACHE = 'seedsend-v1.5.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if(d.type === 'SKIP_WAITING') self.skipWaiting();
  if(d.type === 'CLEAR_CACHE'){
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;      // درخواست‌های بیرونی (سرور نقشه/همگام‌سازی) دست‌نخورده
  if(req.mode === 'navigate'){
    e.respondWith((async () => {
      try{
        const fresh = await fetch(req, { cache:'no-store' });
        const c = await caches.open(CACHE);
        c.put('./index.html', fresh.clone());
        return fresh;
      }catch(err){
        const c = await caches.open(CACHE);
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if(hit) return hit;
    try{
      const r = await fetch(req);
      if(r && r.ok) c.put(req, r.clone());
      return r;
    }catch(err){ return hit || Response.error(); }
  })());
});
