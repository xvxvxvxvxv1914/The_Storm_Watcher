import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// When a new version is deployed, the hashed chunk filenames in a user's cached
// index.html no longer exist on the server. The dynamic import then resolves to a
// 404 HTML page, throwing "'text/html' is not a valid JavaScript MIME type" (see
// Sentry JAVASCRIPT-REACT-G). We recover by reloading once to pick up the fresh
// index.html. A sessionStorage guard prevents an infinite reload loop if the chunk
// is genuinely missing for another reason.
const RELOAD_KEY = 'chunk_reload_attempted';

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const component = await factory();
      window.sessionStorage.removeItem(RELOAD_KEY);
      return component;
    } catch (error) {
      const alreadyReloaded = window.sessionStorage.getItem(RELOAD_KEY) === 'true';
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(RELOAD_KEY, 'true');
        window.location.reload();
        // Never resolve — the reload is in flight, so we don't want React to
        // surface an error boundary before the page navigates away.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
