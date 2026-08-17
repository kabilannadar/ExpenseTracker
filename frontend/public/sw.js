// ─── ExpenseTracker Service Worker ───────────────────────────────────────────
// Strategy:
//  • /api/*           → Network-only (never cache live financial data)
//  • Static assets    → Cache-first  (JS/CSS/fonts - Vite hashes filenames)
//  • Navigations      → Network-first, fall back to cached index.html
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'et-shell-v2.3.3-bypass-dev';

// App shell — only the minimum needed for offline render
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.json?v=2.3.3',
  '/icon-192.png',
  '/icon-192.png?v=2.3.3',
  '/icon-512.png',
  '/icon-512.png?v=2.3.3',
  '/icon-192-maskable.png',
  '/icon-192-maskable.png?v=2.3.3',
  '/icon-512-maskable.png',
  '/icon-512-maskable.png?v=2.3.3',
  '/favicon.png',
  '/favicon.ico',
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  // Immediately take control — don't wait for old SW to die
  self.skipWaiting();
});

// ── Activate: evict stale caches from old versions ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Fetch: per-resource strategy ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass cache completely for local development environments
  if (
    url.hostname === 'localhost' || 
    url.hostname === '127.0.0.1' || 
    url.hostname.startsWith('192.168.') || 
    url.hostname.startsWith('10.') || 
    url.hostname.startsWith('172.')
  ) {
    return;
  }

  // 1. Never cache API calls or external OAuth — always live
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('google') ||
    url.hostname.includes('accounts')
  ) {
    return; // Let browser handle normally (no cache)
  }

  // 2. Cache ImageKit assets (receipts/uploads) with Stale-While-Revalidate
  if (url.hostname.includes('ik.imagekit.io')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => null);

        return cached || networkFetch;
      })
    );
    return;
  }

  // 2. Navigation requests → Network-first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Refresh the shell cache with the latest index.html
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(
            (cached) => cached || new Response('Offline', { status: 503 })
          )
        )
    );
    return;
  }

  // 3. Static assets (JS, CSS, fonts, images) → Cache-first
  //    Vite content-hashes JS/CSS filenames so stale data is not a risk.
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot|png|svg|ico|webp|jpg|jpeg)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // 4. Everything else → Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
