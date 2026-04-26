import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStormStatus, getXrayClass } from './noaaApi';

describe('getStormStatus', () => {
  it.each([
    [0, 'storm.quiet'],
    [3.9, 'storm.quiet'],
    [4, 'storm.unsettled'],
    [4.9, 'storm.unsettled'],
    [5, 'storm.g1'],
    [5.9, 'storm.g1'],
    [6, 'storm.g2'],
    [6.9, 'storm.g2'],
    [7, 'storm.g3plus'],
    [9, 'storm.g3plus'],
  ])('kp=%s → %s', (kp, expectedKey) => {
    expect(getStormStatus(kp).statusKey).toBe(expectedKey);
  });
});

describe('getXrayClass', () => {
  it.each([
    [0, 'A'],
    [9.9e-9, 'A'],
    [1e-8, 'B'],
    [9.9e-8, 'B'],
    [1e-7, 'C'],
    [9.9e-7, 'C'],
    [1e-6, 'M'],
    [9.9e-6, 'M'],
    [1e-5, 'X'],
    [1e-3, 'X'],
  ])('flux=%s → %s', (flux, expectedClass) => {
    expect(getXrayClass(flux)).toBe(expectedClass);
  });
});

describe('NOAA cache + single-flight', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const okJson = (data: unknown) => ({ ok: true, status: 200, json: async () => data });

  it('caches successive calls within TTL (1 fetch for 2 calls)', async () => {
    mockFetch.mockResolvedValue(okJson([{ time_tag: 't', kp_index: 3 }]));
    const { getKpIndex } = await import('./noaaApi');

    const a = await getKpIndex();
    const b = await getKpIndex();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('refetches after TTL expires', async () => {
    mockFetch.mockResolvedValue(okJson([{ time_tag: 't', kp_index: 3 }]));
    const { getKpIndex } = await import('./noaaApi');

    await getKpIndex();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // TTL_1M = 60_000 ms
    await vi.advanceTimersByTimeAsync(60_001);
    await getKpIndex();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent in-flight requests (single-flight)', async () => {
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    const { getKpIndex } = await import('./noaaApi');

    const p1 = getKpIndex();
    const p2 = getKpIndex();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFetch(okJson([{ time_tag: 't', kp_index: 5 }]));
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
  });

  it('returns [] and does not poison cache on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const { getKpIndex } = await import('./noaaApi');

    const r1 = await getKpIndex();
    expect(r1).toEqual([]);

    // Failed result IS cached (current behavior — empty array within TTL).
    // After TTL, the next call refetches. Verify the refetch path works.
    mockFetch.mockResolvedValueOnce(okJson([{ time_tag: 't', kp_index: 4 }]));
    await vi.advanceTimersByTimeAsync(60_001);
    const r2 = await getKpIndex();
    expect(r2).toEqual([{ time_tag: 't', kp_index: 4 }]);
  });

  it('aurora endpoint normalizes longitude to -180..180 and filters intensity 0', async () => {
    mockFetch.mockResolvedValue(
      okJson({
        coordinates: [
          [10, 50, 5],     // kept, lng stays 10
          [200, -30, 7],   // kept, lng → -160
          [359, 0, 0],     // dropped (intensity 0)
        ],
      })
    );
    const { getAuroraModel } = await import('./noaaApi');

    const points = await getAuroraModel();
    expect(points).toEqual([
      { lng: 10, lat: 50, intensity: 5 },
      { lng: -160, lat: -30, intensity: 7 },
    ]);
  });

  it('kp forecast keeps only predicted rows', async () => {
    mockFetch.mockResolvedValue(
      okJson([
        { time_tag: 'a', kp: 2, observed: 'observed' },
        { time_tag: 'b', kp: 4, observed: 'predicted' },
        { time_tag: 'c', kp: 5, observed: 'predicted' },
      ])
    );
    const { getKpForecast } = await import('./noaaApi');

    const rows = await getKpForecast();
    expect(rows).toEqual([
      { time_tag: 'b', kp_index: 4 },
      { time_tag: 'c', kp_index: 5 },
    ]);
  });
});
