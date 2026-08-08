import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('logError', () => {
  it('calls console.error in DEV mode', async () => {
    vi.stubEnv('DEV', true);
    vi.resetModules();
    const { logError } = await import('./logger');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('test message', new Error('boom'));
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith('test message', expect.any(Error));
  });

  it('suppresses console.error in PROD mode', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { logError } = await import('./logger');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('test message', new Error('boom'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('works without an error argument', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { logError } = await import('./logger');
    expect(() => logError('no error arg')).not.toThrow();
  });

  it('suppresses AbortError (user navigated away mid-fetch)', async () => {
    vi.stubEnv('DEV', true);
    vi.resetModules();
    const { logError } = await import('./logger');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    logError('cancelled', abort);
    expect(spy).not.toHaveBeenCalled();
  });

  it('suppresses Safari DOMException SYNTAX_ERR (code 12) from failed fetch', async () => {
    vi.stubEnv('DEV', true);
    vi.resetModules();
    const { logError } = await import('./logger');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Safari surfaces a failed network request as this DOMException — not a real error.
    logError('xray fetch failed', new DOMException('The string did not match the expected pattern.', 'SyntaxError'));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('logWarning — Sentry grouping', () => {
  const loadWithSpy = async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const captureException = vi.fn();
    vi.doMock('./sentryLazy', () => ({
      captureException,
      captureMessage: vi.fn(),
    }));
    const { logWarning } = await import('./logger');
    return { logWarning, captureException };
  };

  // NOAA answering 200-with-empty-body opened five separate Sentry issues on
  // 2026-08-05 — one per endpoint, none affecting a user. The endpoint stays in
  // the message; only the grouping key drops it.
  it('groups every endpoint of one upstream under one fingerprint', async () => {
    const { logWarning, captureException } = await loadWithSpy();

    logWarning('getMagField', new Error('Empty body from https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json'));
    logWarning('getMagField', new Error('Empty body from https://services.swpc.noaa.gov/products/alerts.json'));

    const [a, b] = captureException.mock.calls.map(c => c[1].fingerprint);
    expect(a).toEqual(b);
    expect(a).toEqual(['upstream-fetch', 'Empty body', 'https://services.swpc.noaa.gov', 'getMagField']);
  });

  it('keeps different failure kinds and different upstreams apart', async () => {
    const { logWarning, captureException } = await loadWithSpy();

    logWarning('a', new Error('Empty body from https://services.swpc.noaa.gov/x.json'));
    logWarning('a', new Error('HTTP 503 from https://services.swpc.noaa.gov/x.json'));
    logWarning('a', new Error('Empty body from https://kp.gfz.de/app/json/'));

    const prints = captureException.mock.calls.map(c => JSON.stringify(c[1].fingerprint));
    expect(new Set(prints).size).toBe(3);
  });

  it('leaves unrelated errors on Sentry default grouping', async () => {
    const { logWarning, captureException } = await loadWithSpy();

    logWarning('render failed', new Error('Cannot read properties of undefined'));

    expect(captureException.mock.calls[0][1].fingerprint).toBeUndefined();
  });

  it('still names the endpoint in the message itself', async () => {
    const { logWarning, captureException } = await loadWithSpy();

    const err = new Error('Empty body from https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json');
    logWarning('getSolarWind', err);

    expect(captureException.mock.calls[0][0].message).toContain('rtsw_wind_1m.json');
  });
});
