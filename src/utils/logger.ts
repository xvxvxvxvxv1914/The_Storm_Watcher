import * as Sentry from '@sentry/react';

// Transient failures we never want to report — they're expected and self-healing:
//  • AbortError — the user navigated away before a fetch completed.
//  • Safari DOMException SYNTAX_ERR (code 12) "The string did not match the
//    expected pattern." — Safari's misleading way of surfacing a failed/aborted
//    network request. It is NOT a code syntax error. See Sentry JAVASCRIPT-REACT-J.
const isExpectedTransientError = (err: unknown): boolean => {
  if (err instanceof Error && err.name === 'AbortError') return true;
  // Safari surfaces a failed/aborted network request as a DOMException SYNTAX_ERR
  // (code 12) with this exact message. Match the MESSAGE, not just the name/code —
  // genuine DOM misuse (invalid querySelector, bad atob input) also throws a
  // DOMException named 'SyntaxError', and those must still be reported.
  if (typeof DOMException !== 'undefined' && err instanceof DOMException
      && (err.code === 12 || err.name === 'SyntaxError')
      && err.message.includes('did not match the expected pattern')) return true;
  return false;
};

export const logError = (msg: string, err?: unknown) => {
  if (isExpectedTransientError(err)) return;

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
  if (isExpectedTransientError(err)) return;

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
