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
});
