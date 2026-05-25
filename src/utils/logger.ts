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
