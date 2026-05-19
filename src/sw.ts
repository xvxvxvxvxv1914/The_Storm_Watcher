/// <reference lib="webworker" />
import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

setCacheNameDetails({ prefix: 'tsw' });
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Filter out index.html from precache — we serve it NetworkFirst below so users
// always get the latest version with correct JS chunk hashes after a deploy.
const manifest = self.__WB_MANIFEST.filter(
  (entry) => typeof entry === 'string' ? entry !== '/index.html' : entry.url !== '/index.html'
);
precacheAndRoute(manifest);

// ───────────────────────────────────────────────────────────────
// Navigation requests (HTML pages) — ALWAYS prefer network.
// This is the critical fix: after a Vercel deploy the JS chunk hashes change,
// so we must serve the *latest* index.html from the server, not a stale cached
// copy that references non-existent old chunks (which causes MIME type errors).
// ───────────────────────────────────────────────────────────────
const navigationStrategy = new NetworkFirst({
  cacheName: 'tsw-navigations',
  networkTimeoutSeconds: 3,
  plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 86400 })],
});
const navRoute = new NavigationRoute(navigationStrategy, {
  // Don't intercept API routes or static assets
  denylist: [/^\/api\//, /^\/donki\//, /\.\w{2,5}$/],
});
registerRoute(navRoute);

// ───────────────────────────────────────────────────────────────
// API caching strategies
// ───────────────────────────────────────────────────────────────

// NOAA Space Weather APIs — serve from network, fall back to cache up to 5 min old
registerRoute(
  ({ url }) => /services\.swpc\.noaa\.gov/.test(url.href),
  new NetworkFirst({
    cacheName: 'noaa-api',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 300, maxEntries: 30 })],
  })
);

// NASA DONKI (proxied through Supabase Edge Function or Vite dev proxy)
registerRoute(
  ({ url }) => /ccmc\.gsfc\.nasa\.gov/.test(url.href) || url.pathname.startsWith('/donki'),
  new StaleWhileRevalidate({
    cacheName: 'donki-api',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 300, maxEntries: 10 })],
  })
);

// Open-Meteo (UV, Sky, Sun, Weather) — 10 min cache, serve stale while revalidating
registerRoute(
  ({ url }) => /api\.open-meteo\.com/.test(url.href),
  new StaleWhileRevalidate({
    cacheName: 'open-meteo-api',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 600, maxEntries: 20 })],
  })
);

// NIGGG geomagnetic data (Bulgarian institute proxy)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/niggg'),
  new NetworkFirst({
    cacheName: 'niggg-api',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 300, maxEntries: 5 })],
  })
);

// Offline fallback — navigation requests that miss the cache serve /offline.html
setCatchHandler(({ request }) => {
  if (request.destination === 'document') {
    return caches.match('/offline.html') as Promise<Response>;
  }
  return Response.error();
});

// ───────────────────────────────────────────────────────────────
// Chunk-loading error recovery
// When a lazy-loaded JS chunk 404s (stale HTML referencing old hashes), the
// main thread posts a message here. We force-update the SW and tell the client
// to reload so it picks up the new index.html with correct chunk references.
// ───────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CHUNK_LOAD_FAILED') {
    // Clear navigation cache so next load fetches fresh HTML
    caches.delete('tsw-navigations').catch(() => {});
    self.skipWaiting();
  }
});

// Push notification — payload: { title, body, url, kp }
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const {
    title = 'The Storm Watcher',
    body = 'Geomagnetic storm alert',
    url = '/dashboard',
  } = event.data.json() as { title?: string; body?: string; url?: string };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'kp-alert',
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string })?.url ?? '/dashboard';
  event.waitUntil(clients.openWindow(target));
});
