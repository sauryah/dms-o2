const CACHE_NAME = 'dms-static-v1';
const API_CACHE_NAME = 'dms-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/vite.svg',
  '/manifest.json'
];

// Install event: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
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

// Fetch event: serve cached assets or fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests, hot-reloading (Vite Dev Server), or login/logout/backup routes
  if (request.method !== 'GET' || 
      url.pathname.includes('@vite') || 
      url.pathname.includes('/api/auth/login') ||
      url.pathname.includes('/api/v1/auth/login') ||
      url.pathname.includes('/api/auth/logout') ||
      url.pathname.includes('/api/v1/auth/logout') ||
      url.pathname.includes('/api/backups') ||
      url.pathname.includes('/api/v1/backups')) {
    return;
  }

  // Handle API Requests (Network First, fallback to cache)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/go/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If response is valid, cache a clone of it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to serve from dynamic cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return custom empty fallback JSON if no cache
            return new Response(JSON.stringify({ results: [], count: 0, error: 'Offline mode: data not cached' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle Static Asset Requests (Cache First, fallback to network)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Dynamically cache any other successful static requests (JS, CSS, images)
        if (response.status === 200 && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png'))) {
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
