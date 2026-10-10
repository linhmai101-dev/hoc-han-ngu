// Offline support. Network first (so updates on GitHub show up), but if the network is slow the saved copy is used
// after 2.5 s for the app page itself, so the app never hangs on a weak connection. Offline → saved copy.
const CACHE = 'hanngu-v3';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE && k !== CACHE + '-hw') { const old = await caches.open(k), mine = await caches.open(CACHE);
    for (const req of await old.keys()) { const r = await old.match(req); if (r) await mine.put(req, r); } await caches.delete(k); }
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // the handwriting library and stroke data: keep a copy so characters already seen can be practised offline
  if (e.request.method === 'GET' && u.hostname === 'cdn.jsdelivr.net' && /\/npm\/hanzi-writer(-data)?@/.test(u.pathname)) {
    e.respondWith((async () => { const c = await caches.open(CACHE + '-hw'), hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request); if (r && r.ok) c.put(e.request, r.clone()); return r; })()); return;
  }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/am-thanh/')) return;            // voice packs are stored by the app itself
  const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; });
  const isPage = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  if (!isPage) { e.respondWith(net.catch(() => caches.match(e.request, { ignoreSearch: true }))); return; }
  e.respondWith((async () => {
    const saved = await caches.match(e.request, { ignoreSearch: true });
    if (!saved) return net;
    const timer = new Promise(res => setTimeout(() => res(saved), 2500));
    return Promise.race([net.catch(() => saved), timer]);
  })());
});
