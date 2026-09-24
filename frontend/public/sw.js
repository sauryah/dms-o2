const CACHE_NAME = 'dms-static-v4';
const API_CACHE_NAME = 'dms-api-v2';

const STATIC_ASSETS = [
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Exclude requests that should never be intercepted or handled by ServiceWorker:
  // - Non-GET requests (POST, PUT, DELETE, etc.)
  // - Vite dev server internals (@vite, @fs, etc.)
  // - Real-time Server-Sent Events (/api/events/ or text/event-stream)
  // - Authentication & session endpoints (/api/v1/auth/*, /api/auth/*)
  // - Database backups & restore binary streams (/api/v1/backups/*, /api/backups/*)
  if (
    request.method !== 'GET' ||
    url.pathname.includes('@vite') ||
    url.pathname.startsWith('/api/events') ||
    url.pathname.includes('/events/') ||
    request.headers.get('Accept')?.includes('text/event-stream') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/v1/auth') ||
    url.pathname.startsWith('/api/backups') ||
    url.pathname.startsWith('/api/v1/backups')
  ) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const contentType = response.headers.get('Content-Type') || '';
            if (!contentType.includes('text/event-stream')) {
              const responseClone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(JSON.stringify({ results: [], count: 0, error: 'Offline mode: data not cached' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // HTML navigations: network-first so redeployed index.html is never stale
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Hashed static assets (JS/CSS/images with content hashes): cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.status === 200 && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff'))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
