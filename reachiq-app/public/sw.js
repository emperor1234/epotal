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

  // API calls always go to the network — caching auth/contact data here
  // would mean stale or wrong-user data served while "offline".
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});
