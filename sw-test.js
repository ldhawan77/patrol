// Isolated service worker for index-v2-test.html only. Do not replace sw.js.
const CACHE = 'checkpoint-test-v1';
const PREFIX = 'checkpoint-test-';
const PAGE = new URL('./index-v2-test.html', self.location.href).href;
const OPTIONAL = ['manifest.json', 'wallpaper.jpg', 'logo.png'];
const ALLOWED = new Set([PAGE, ...OPTIONAL.map(f => new URL('./' + f, self.location.href).href)]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // The actual test scanner is mandatory. Missing artwork must not block installation.
    await cache.add(PAGE);
    await Promise.all(OPTIONAL.map(async f => {
      try { await cache.add(new URL('./' + f, self.location.href).href); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith(PREFIX) && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !ALLOWED.has(req.url)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {}));
        return response;
      }
      return (await caches.match(req)) || response;
    } catch (error) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw error;
    }
  })());
});
