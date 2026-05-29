import * as Sentry from '@sentry/react';

export const logError = (msg: string, err?: unknown) => {
  // AbortErrors are expected when the user navigates away before a fetch completes — not a real error.
  if (err instanceof Error && err.name === 'AbortError') return;

  if (import.meta.env.DEV) {
    console.error(msg, err);
    return;
  }
  // Sentry.init is gated on VITE_SENTRY_DSN — if missing, these calls are no-ops.
  if (err instanceof Error) {
    Sentry.captureException(err, { extra: { msg } });
  } else {
    Sentry.captureMessage(msg, { level: 'error', extra: { err } });
  }
};

// For expected, self-healing failures (e.g. a transient NOAA fetch that falls back
// to cached/empty data). Reported at warning level so it doesn't drown out real
// errors or trip alerting — see Sentry JAVASCRIPT-REACT-J.
export const logWarning = (msg: string, err?: unknown) => {
  if (err instanceof Error && err.name === 'AbortError') return;

  if (import.meta.env.DEV) {
    console.warn(msg, err);
    return;
  }
  if (err instanceof Error) {
    Sentry.captureException(err, { level: 'warning', extra: { msg } });
  } else {
    Sentry.captureMessage(msg, { level: 'warning', extra: { err } });
  }
};
