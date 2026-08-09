import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import './styles/material.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { loadSentry, disableSentry, captureException } from './utils/sentryLazy';
import { applyPlatformClass, isNative } from './utils/platform';
import { installRipple } from './utils/ripple';
import { languageRedirectPath } from './utils/langUrl';

// Before createRoot, not in an effect: the Material skin has to be on the html
// element for the first paint, or the iOS chrome renders for a frame and swaps.
applyPlatformClass();
if (document.documentElement.classList.contains('md3')) installRipple();

// URL and language must agree before anything renders: an unprefixed URL is
// canonical English, so a visitor whose language resolves to another locale is
// moved to the prefixed URL instead of silently getting translated content on
// the English one (duplicate content across two URLs — see langUrl.ts). Native
// has no URL prefixes, so the check is web-only — and the guard must be
// isNative(), not `'Capacitor' in window`: @capacitor/core defines the global
// on web too. Crawlers fetch with English locales and never trigger this,
// keeping the prerendered canonical intact.
if (!isNative()) {
  let saved: string | null = null;
  try { saved = localStorage.getItem('language'); } catch { /* storage may be blocked */ }
  const target = languageRedirectPath(
    window.location.pathname,
    saved,
    navigator.language || navigator.languages?.[0] || 'en',
  );
  if (target) {
    window.location.replace(target + window.location.search + window.location.hash);
  }
}

// Service worker is only useful for web/PWA — skip on native Capacitor (files
// are local). isNative(), not `'Capacitor' in window`: @capacitor/core defines
// the global on web too, so that check disabled the SW for every web visitor
// from 2026-05-26 (edca150) until it was caught on 2026-08-09.
if (!isNative()) {
  registerSW({ immediate: true });
} else {
  // Native app: disable pinch-zoom of the whole UI (standard app behavior;
  // system-level zoom remains available for accessibility). Web keeps zoom —
  // WCAG requires it there.
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
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
    e.message?.includes('error loading dynamically imported module') ||
    // Service worker serving stale HTML for a JS chunk after a new deploy
    e.message?.includes('is not a valid JavaScript MIME type')
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

// ── Deferred Sentry ────────────────────────────────────────────
// The SDK is not part of the entry bundle (see utils/sentryLazy.ts) — it loads
// after the window 'load' event so it never competes with first paint. Uncaught
// errors thrown before then are buffered here and replayed into Sentry once it
// is up (beforeSend still filters them as usual).
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  const earlyErrors: unknown[] = [];
  const onEarlyError = (e: ErrorEvent) => { if (e.error) earlyErrors.push(e.error); };
  const onEarlyRejection = (e: PromiseRejectionEvent) => { earlyErrors.push(e.reason); };
  window.addEventListener('error', onEarlyError);
  window.addEventListener('unhandledrejection', onEarlyRejection);

  const initSentry = () => loadSentry((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      // Replay used to be added on 'load' to spare the initial parse; init itself
      // now runs after 'load', so it can be part of init directly.
      integrations: [Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      })],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        const err = hint?.originalException;
        // Drop plain network failures — user offline or upstream (NOAA/GFZ) hiccup.
        // 'Load failed' is Safari's wording, 'Failed to fetch' is Chrome/Edge's.
        if (
          err instanceof Error &&
          (err.name === 'AbortError' || err.message === 'Load failed' || err.message.startsWith('Failed to fetch'))
        ) {
          return null;
        }
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
    window.removeEventListener('error', onEarlyError);
    window.removeEventListener('unhandledrejection', onEarlyRejection);
    earlyErrors.forEach((err) => captureException(err, { extra: { earlyError: true } }));
    earlyErrors.length = 0;
  });

  if (document.readyState === 'complete') initSentry();
  else window.addEventListener('load', initSentry, { once: true });
} else {
  disableSentry();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
