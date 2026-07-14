// Lazy facade over @sentry/react so the SDK (~75 KB, ~400 ms mobile CPU) stays
// off the critical path. Nothing imports '@sentry/react' statically — the SDK
// chunk loads only when main.tsx calls loadSentry() (after window load), and
// calls made before that are queued and flushed once it arrives.

type SentrySDK = typeof import('@sentry/react');

let sdk: SentrySDK | null = null;
let enabled = true;
let queue: Array<(s: SentrySDK) => void> = [];

const run = (fn: (s: SentrySDK) => void): void => {
  if (!enabled) return;
  if (sdk) fn(sdk);
  else queue.push(fn);
};

export const captureException = (
  err: unknown,
  ctx?: Parameters<SentrySDK['captureException']>[1],
): void => run((s) => s.captureException(err, ctx));

export const captureMessage = (
  msg: string,
  ctx?: Parameters<SentrySDK['captureMessage']>[1],
): void => run((s) => s.captureMessage(msg, ctx));

export const setSentryUser = (
  user: Parameters<SentrySDK['setUser']>[0],
): void => run((s) => s.setUser(user));

/** Call once at startup when Sentry should stay off (dev / DSN missing) so queued calls don't accumulate. */
export const disableSentry = (): void => {
  enabled = false;
  queue = [];
};

/** Import the SDK, hand it to `init` (which must call Sentry.init), then flush queued calls. */
export const loadSentry = (init: (s: SentrySDK) => void): void => {
  import('@sentry/react')
    .then((s) => {
      init(s);
      sdk = s;
      const pending = queue;
      queue = [];
      pending.forEach((fn) => fn(s));
    })
    .catch(() => {
      // SDK failed to load (offline, blocked) — drop silently, nothing to report to.
      disableSentry();
    });
};
