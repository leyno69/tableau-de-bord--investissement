const CACHE_VERSION = 'leynor-shell-v4';
const OFFLINE_URL = '/offline.html';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/app.js',
  '/assistant-ui.js',
  '/assistant-memory.js',
  '/portfolio-assistant.js',
  '/server-sync.js',
  '/api-connection.js',
  '/api-fetch-router.js',
  '/resolver-ui.js',
  '/market-trends.js',
  '/probability-assessment.js',
  '/opportunity-radar.js',
  '/opportunity-radar-ui.js',
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

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackUrl = null) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    return new Response('Ressource indisponible hors connexion.', { status: 503 });
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
