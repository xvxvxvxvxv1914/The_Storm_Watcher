import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchJson = vi.hoisted(() => vi.fn());
const logWarning = vi.hoisted(() => vi.fn());
const isNative = vi.hoisted(() => vi.fn(() => false));
vi.mock('../utils/fetchJson', () => ({ fetchJson }));
vi.mock('../utils/logger', () => ({ logWarning }));
vi.mock('../utils/platform', () => ({ isNative }));

beforeEach(() => {
  vi.resetModules();
  fetchJson.mockReset();
  logWarning.mockReset();
  isNative.mockReturnValue(false);
  vi.stubEnv('VITE_DONKI_BASE_URL', undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe('DONKI feeds', () => {
  it('uses the migrated NASA API on native and returns its events', async () => {
    isNative.mockReturnValue(true);
    const events = [{ activityID: 'cme-1' }];
    fetchJson.mockResolvedValue(events);
    const { getDonkiCme } = await import('./donkiApi');
    expect(await getDonkiCme()).toEqual(events);
    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringContaining('https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME?'), 10000, 1,
    );
  });

  it('uses the same-origin proxy on web', async () => {
    fetchJson.mockResolvedValue([]);
    const { getDonkiFlares } = await import('./donkiApi');
    expect(await getDonkiFlares()).toEqual([]);
    expect(fetchJson).toHaveBeenCalledWith(expect.stringMatching(/^\/donki\/FLR\?/), 10000, 1);
  });

  it.each(['getDonkiCme', 'getDonkiFlares'] as const)('propagates %s failures instead of claiming an empty feed', async (name) => {
    const error = new TypeError('Response served by service worker is an error');
    fetchJson.mockRejectedValue(error);
    const service = await import('./donkiApi');
    await expect(service[name]()).rejects.toBe(error);
    expect(logWarning).toHaveBeenCalledWith(expect.any(String), error);
  });

  it('rejects unexpected response objects', async () => {
    fetchJson.mockResolvedValue({ error: 'unavailable' });
    const { getDonkiCme } = await import('./donkiApi');
    await expect(getDonkiCme()).rejects.toThrow('Unexpected DONKI response');
  });

  it('accepts a null no-events response', async () => {
    fetchJson.mockResolvedValue(null);
    const { getDonkiFlares } = await import('./donkiApi');
    expect(await getDonkiFlares()).toEqual([]);
  });
});
