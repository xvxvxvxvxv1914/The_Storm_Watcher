import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { LanguageProvider } from './contexts/LanguageContext';

// Service worker is only useful for web/PWA — skip on native Capacitor (files are local)
if (!('Capacitor' in window)) {
  registerSW({ immediate: true });
}

// ── Chunk-load error recovery ──────────────────────────────────
// After a new Vercel deploy, old cached index.html may reference JS chunks with
// hashes that no longer exist. Vite's lazy import() will fail with a TypeError.
// We detect this, tell the SW to drop its navigation cache, and reload once so
// the browser picks up the fresh index.html with correct chunk references.
const RELOAD_KEY = 'tsw_chunk_reload';
window.addEventListener('error', (e) => {
  // Vite wraps dynamic import failures in a regular Error with a recognisable message
  if (
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('Importing a module script failed') ||
    e.message?.includes('error loading dynamically imported module')
  ) {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      // Ask SW to clear its HTML cache
      navigator.serviceWorker?.controller?.postMessage({ type: 'CHUNK_LOAD_FAILED' });
      window.location.reload();
    }
  }
});
// Clear the reload guard on successful load so future deploys can trigger it again
window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_KEY));

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true,
      mask: ['.sentry-mask'],
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        u.search = '';
        event.request.url = u.toString();
      } catch { /* URL parse failure — keep original */ }
    }
    return event;
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
