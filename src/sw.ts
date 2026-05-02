/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
