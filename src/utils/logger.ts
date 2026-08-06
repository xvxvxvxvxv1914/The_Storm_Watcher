import { captureException, captureMessage } from './sentryLazy';

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
  // Queued through the lazy facade — no-ops when Sentry is disabled (no DSN).
  if (err instanceof Error) {
    captureException(err, { extra: { msg } });
  } else {
    captureMessage(msg, { level: 'error', extra: { err } });
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
    captureException(err, { level: 'warning', fingerprint: upstreamFingerprint(err, msg), extra: { msg } });
  } else {
    captureMessage(msg, { level: 'warning', extra: { err } });
  }
};

/**
 * Groups upstream-fetch failures by *kind* rather than by URL.
 *
 * fetchJson names the endpoint in the message ("Empty body from
 * https://…/rtsw_mag_1m.json") so a single report says which feed broke. The
 * cost is that Sentry groups on that message: one NOAA outage opened five
 * separate issues on 2026-08-05, none of them affecting a user, which is how a
 * real error gets lost. The URL stays in the message and the breadcrumb; only
 * the grouping key drops it, so one outage is now one issue.
 */
const UPSTREAM_FAILURE = /^(Empty body|Malformed JSON|HTTP \d+) from (https?:\/\/[^/]+)/;

const upstreamFingerprint = (err: Error, msg: string): string[] | undefined => {
  const match = UPSTREAM_FAILURE.exec(err.message);
  if (!match) return undefined;
  const [, kind, origin] = match;
  return ['upstream-fetch', kind, origin, msg];
};
