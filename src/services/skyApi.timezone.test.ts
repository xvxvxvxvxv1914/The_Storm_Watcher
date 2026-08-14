import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The invariant these pin down: a night window describes the sky **above the
 * location**, so it must come out the same instant no matter where the device
 * asking is. Before this, `new Date("2026-08-14T21:56")` read Open-Meteo's
 * location-local stamps in the device's zone, and the window slid by
 * `deviceOffset − locationOffset` — nothing at all for a visitor in the same
 * zone, ten hours for one in Anchorage.
 *
 * That matters beyond the sky card: Calendar filters NOAA Kp bins, which are
 * real instants, against this window, so a slid window takes the night's peak
 * Kp and its aurora chance with it.
 */

const fetchJson = vi.fn();
vi.mock('../utils/fetchJson', () => ({ fetchJson: (...a: unknown[]) => fetchJson(...a) }));
// Straight through — the TTL cache would otherwise answer the second test with
// the first one's payload.
vi.mock('../utils/apiCache', () => ({
  cached: (_k: string, _ttl: number, fn: () => unknown) => fn(),
}));

import { getNightsCloudCover, getSkyVisibility } from './skyApi';

// Tromsø, 2026-08-14: sunset 21:56 and next sunrise 03:46 on the local clock,
// which CEST (+2) puts at 19:56Z and 01:46Z.
const TROMSO = {
  utc_offset_seconds: 7200,
  timezone: 'Europe/Oslo',
  daily: {
    time: ['2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17'],
    sunset: ['2026-08-14T21:56', '2026-08-15T21:50', '2026-08-16T21:44', '2026-08-17T21:38'],
    sunrise: ['2026-08-14T03:36', '2026-08-15T03:46', '2026-08-16T03:56', '2026-08-17T04:06'],
  },
  hourly: {
    time: ['2026-08-14T21:00', '2026-08-14T22:00', '2026-08-14T23:00', '2026-08-15T00:00'],
    cloud_cover: [10, 20, 30, 40],
    visibility: [24000, 24000, 24000, 24000],
    precipitation_probability: [0, 0, 0, 0],
  },
};

beforeEach(() => fetchJson.mockReset());

describe('getNightsCloudCover — the window belongs to the location', () => {
  it('reads sunset and sunrise as the location\'s clock, not the device\'s', async () => {
    fetchJson.mockResolvedValue(TROMSO);
    const nights = await getNightsCloudCover(69.65, 18.96);

    // Absolute instants: this assertion is the same sentence in every zone the
    // suite runs under, which is the whole point.
    expect(nights[0].nightStart?.toISOString()).toBe('2026-08-14T19:56:00.000Z');
    expect(nights[0].nightEnd?.toISOString()).toBe('2026-08-15T01:46:00.000Z');
  });

  it('keeps the date label on the day the API meant', async () => {
    fetchJson.mockResolvedValue(TROMSO);
    const nights = await getNightsCloudCover(69.65, 18.96);
    // Date-only stamps parse as UTC midnight, which renders as the 13th on any
    // device west of Greenwich.
    expect(nights[0].date.getDate()).toBe(14);
  });

  it('averages only the hours inside the corrected window', async () => {
    fetchJson.mockResolvedValue(TROMSO);
    const nights = await getNightsCloudCover(69.65, 18.96);
    // 22:00, 23:00 and 00:00 local fall after the 21:56 sunset; 21:00 does not.
    expect(nights[0].cloudCoverAvg).toBe(30);
  });

  it('still reports the midnight sun rather than a sky claim', async () => {
    fetchJson.mockResolvedValue({
      ...TROMSO,
      daily: {
        ...TROMSO.daily,
        // Open-Meteo signals polar day by collapsing the window, not with a flag.
        sunset: ['2026-06-20T00:00', '2026-06-21T00:00', '2026-06-22T00:00', '2026-06-23T00:00'],
        sunrise: ['2026-06-20T00:00', '2026-06-20T00:00', '2026-06-21T00:00', '2026-06-22T00:00'],
      },
    });
    const nights = await getNightsCloudCover(69.65, 18.96);
    expect(nights[0].noNight).toBe(true);
    expect(nights[0].cloudCoverAvg).toBeNull();
    expect(nights[0].nightStart).toBeNull();
  });
});

describe('getSkyVisibility — printed on the location\'s clock', () => {
  it('reports sunset and sunrise where the sky is, not where the phone is', async () => {
    fetchJson.mockResolvedValue(TROMSO);
    const sky = await getSkyVisibility(69.65, 18.96, 5);

    // Formatted through the location's IANA zone, so this holds in any device
    // zone. Locale decides 12h vs 24h, hence the two accepted shapes.
    expect(sky.sunset).toMatch(/\b09:56\s?PM\b|\b21:56\b/);
    expect(sky.sunrise).toMatch(/\b03:46\s?AM\b|\b03:46\b/);
  });

  it('labels each hour with the hour showing at the location', async () => {
    fetchJson.mockResolvedValue(TROMSO);
    const sky = await getSkyVisibility(69.65, 18.96, 5);
    expect(sky.nightHours.map(h => h.hour)).toEqual([22, 23, 0]);
  });

  /**
   * It used to answer verdict 'poor' with cloudCoverAvg 100 — a statement about
   * the sky assembled from a failed request, and the same mistake the polar-day
   * path was already fixed for. The page has an error card and a retry button,
   * and a plausible-looking verdict walked past both.
   */
  it('rejects instead of reporting a fabricated overcast sky', async () => {
    // An unusable payload rather than a rejected promise or a thrown mock: both
    // of those get attributed to the test as an unhandled error before the
    // assertion can consume them. Destructuring undefined throws inside the
    // service's own try, which is the path a real failure takes.
    fetchJson.mockResolvedValue(undefined);
    await expect(getSkyVisibility(69.65, 18.96, 5)).rejects.toThrow();
  });
});
