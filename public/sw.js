// CoEldery 85 Service Worker
// v4: no-store for navigation, force fresh /app always
const CACHE_NAME = 'coeldery85-v4';
const OFFLINE_URLS = [
  '/app'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => {
        // Non-fatal: cache what we can
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete ALL old caches (including v1, v2) so stale icons are gone
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Navigation: ALWAYS network, no cache, no fallback to stale HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        caches.match('/app').then((r) => r || caches.match('/'))
      )
    );
    return;
  }

  // Icons & manifest: NETWORK FIRST so updates are always picked up
  // Falls back to cache only if offline
  if (
    url.pathname === '/icon-192.png' ||
    url.pathname === '/icon-512.png' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      fetch(event.request).then((response) => {
        // Update cache with fresh copy
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
