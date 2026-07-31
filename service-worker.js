const CACHE_VERSION = 'leynor-shell-v3';
const OFFLINE_URL = '/offline.html';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/app.js',
  '/server-sync.js',
  '/api-connection.js',
  '/api-fetch-router.js',
  '/resolver-ui.js',
  '/leynor-brand.js',
  '/leynor-brand.css',
  '/leynor-logo.js',
  '/leynor-logo.css',
  '/leynor-assistant.js',
  '/leynor-assistant.css',
  '/leynor-conversation.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/icons/leynor-icon.svg',
  '/icons/leynor-maskable.svg',
  '/icons/leynor-laboratory-premium.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, OFFLINE_URL));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || caches.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}
