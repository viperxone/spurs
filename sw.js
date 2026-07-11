// THFC Dashboard service worker.
// Strategy: cache-first for the app shell (index.html, manifest — the bundle
// is inlined into index.html so it's covered automatically), network-first
// for anything else (so news/data always tries fresh before falling back).
// CACHE_NAME is auto-versioned by build.js on every build (see mrgg1ujy
// below) — this used to be a static string that never changed, meaning the
// browser could never detect a new deploy and kept serving old cached
// index.html indefinitely. Now every `node build.js` run bakes in a fresh
// timestamp, so returning visitors always pick up the latest build.
const CACHE_NAME = 'thfc-dashboard-mrgg1ujy';
const SHELL_FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // App shell: cache-first (instant load, works offline)
  if (SHELL_FILES.some((f) => request.url.endsWith(f.replace('./', '')) || request.url.endsWith('/'))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Everything else (news feeds, future API calls): network-first, cache as fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
