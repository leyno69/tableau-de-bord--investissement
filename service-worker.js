const CACHE_VERSION = 'leynor-shell-v17';
const OFFLINE_URL = '/offline.html';
const APP_SHELL = [
  '/', '/index.html', '/offline.html', '/style.css', '/app.js',
  '/assistant-ui.js', '/assistant-memory.js', '/portfolio-assistant.js',
  '/server-sync.js', '/api-connection.js', '/api-fetch-router.js',
  '/profile-menu.js', '/profile-menu.css', '/resolver-ui.js',
  '/guided-tour.js', '/guided-tour.css',
  '/trends.html', '/market-trends.js', '/probability-assessment.js',
  '/opportunity-radar.js', '/opportunity-radar-ui.js',
  '/simulator.html', '/simulator-ui.js', '/simulation-presets.js',
  '/simulation-preset-insights-ui.js', '/portfolio-simulator.js',
  '/leynor-lab.html', '/leynor-lab-ui.js', '/leynor-premium-lab.js',
  '/leynor-premium-lab-advanced.js', '/leynor-lab-regimes.js',
  '/leynor-brand.js', '/leynor-brand.css', '/leynor-logo.js',
  '/leynor-logo.css', '/leynor-assistant.js', '/leynor-assistant.css',
  '/leynor-conversation.js', '/browser-voice.js', '/pwa.js',
  '/manifest.webmanifest', '/icons/leynor-icon.svg',
  '/icons/leynor-maskable.svg', '/icons/leynor-laboratory-premium.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') return event.respondWith(networkFirst(request, OFFLINE_URL));
  if (request.destination === 'script' || request.destination === 'style') return event.respondWith(networkFirst(request));
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackUrl = null) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await (await caches.open(CACHE_VERSION)).put(request, response.clone());
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
  const network = fetch(request).then(async response => {
    if (response.ok) await (await caches.open(CACHE_VERSION)).put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}
