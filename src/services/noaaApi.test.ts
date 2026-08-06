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

  // Mirrors a real Response: the services read the body with text() so the
  // abort timer still covers the download (see utils/fetchJson).
  const okJson = (data: unknown) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
    json: async () => data,
  });

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

    // TTL_FORECAST = 900_000 ms
    await vi.advanceTimersByTimeAsync(900_001);
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

  it('returns [] but does NOT cache the failure — a retry within TTL can recover', async () => {
    // Drop offline_kp persisted (via Preferences) by earlier tests. Node 22+
    // exposes a localStorage global that is undefined without
    // --localstorage-file, so guard the access.
    globalThis.localStorage?.clear?.();
    mockFetch.mockRejectedValue(new Error('network down'));
    const { getKpIndex } = await import('./noaaApi');

    // All sources fail → [] is returned but, thanks to the `cacheIf` guard, the
    // empty result is NOT stored. With fake timers we advance past the in-flight
    // NOAA-fallback retry delay.
    const p1 = getKpIndex();
    await vi.advanceTimersByTimeAsync(3500); // covers the NOAA fallback retry delay
    expect(await p1).toEqual([]);

    // A second call *within the same TTL window* must re-fetch (the empty result
    // was not frozen) and recover. This is what lets the homepage poll retry out
    // of a transient cold-start instead of being stuck on "Failed to load data".
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(new Error('gfz still down')); // GFZ fails again
    mockFetch.mockResolvedValueOnce(okJson([{ time_tag: 't', kp_index: 4 }])); // NOAA recovers

    const p2 = getKpIndex();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await p2).toEqual([{ time_tag: 't', kp_index: 4 }]);
    expect(mockFetch).toHaveBeenCalledTimes(2); // proves a genuine re-fetch happened
  });

  it('rtsw wind/mag endpoints are sorted ascending by time_tag', async () => {
    // NOAA returns rtsw feeds newest-first; service must reverse so charts
    // render and `[length-1]` is the latest sample.
    mockFetch.mockResolvedValueOnce(okJson([
      { time_tag: '2026-04-26T12:00:00', proton_speed: 500, active: true },
      { time_tag: '2026-04-26T11:00:00', proton_speed: 480, active: true },
      { time_tag: '2026-04-26T10:00:00', proton_speed: 460, active: true },
    ]));
    const { getSolarWind } = await import('./noaaApi');

    const wind = await getSolarWind();
    expect(wind.map(w => w.time_tag)).toEqual([
      '2026-04-26T10:00:00',
      '2026-04-26T11:00:00',
      '2026-04-26T12:00:00',
    ]);
    expect(wind[wind.length - 1].proton_speed).toBe(500);
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

  // GFZ returns null for 3-hour bins it has not published yet. Mapping those to
  // 0 appended a fake "Kp 0.0" — and because Kp 0.0 is a real ultra-quiet
  // reading, nothing downstream could tell the two apart. Both widgets skip back
  // to the last real bin (KpSource.swift / KpSource.kt), so the app was showing
  // a different number than the widget on the same phone.
  it('drops GFZ bins that have not been published yet', async () => {
    mockFetch.mockResolvedValue(
      okJson({
        datetime: ['2026-08-06T00:00:00Z', '2026-08-06T03:00:00Z', '2026-08-06T06:00:00Z'],
        Kp: [1.667, 2.333, null],
        status: ['def', 'def', 'def'],
      })
    );
    const { getKpIndex } = await import('./noaaApi');

    const rows = await getKpIndex();
    expect(rows).toEqual([
      { time_tag: '2026-08-06T00:00:00', kp_index: 1.667 },
      { time_tag: '2026-08-06T03:00:00', kp_index: 2.333 },
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
