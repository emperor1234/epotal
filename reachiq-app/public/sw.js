// Minimal PWA service worker: no build-time precache list (Metro's output
// filenames are content-hashed per build, so a static manifest here would
// go stale immediately). Instead this caches everything as it's fetched
// and serves from cache when the network is unavailable — good enough for
// "installable + works offline for pages you've already visited," which is
// the bar for this internal tool.
const CACHE_NAME = 'reachiq-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Only ever handle plain http(s) requests this page itself made. Browser
  // extensions route their own chrome-extension:// requests through the
  // active tab's service worker scope, and the Cache API throws if you
  // try to `put()` those — this guard is what was crashing on that.
  if (!request.url.startsWith('http')) return;

  // API calls always go to the network — caching auth/contact data here
  // would mean stale or wrong-user data served while "offline".
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).catch(() => {}));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // A real Response here, not Response.error() — the latter is an
        // opaque network-error type that Chrome logs as "resulted in a
        // network error response" and can break the page entirely. A
        // normal failed response lets the app's own error handling run.
        return new Response('Offline and not cached', { status: 503, statusText: 'Offline' });
      }),
  );
});
