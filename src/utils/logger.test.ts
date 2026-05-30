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
