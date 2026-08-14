import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * "Is the app right in other countries?" — asked as a test rather than by hand.
 *
 * Twelve real Open-Meteo responses, recorded 2026-08-14 for places spanning
 * UTC+12:45 to UTC-10, replayed through the real services. Recorded rather than
 * invented, because the two things that broke here are properties of what the
 * API actually sends: timestamps on the *location's* clock with no offset, and
 * the offset delivered separately in `utc_offset_seconds`.
 *
 * The load-bearing assertion is not that the parse matches a formula — that
 * would only restate the implementation. It is that the sun is **on the horizon**
 * at the instants the app calls sunset and sunrise, checked with
 * `solarAltitude`, which is our own implementation of NOAA's algorithm and never
 * touches Open-Meteo. A window read in the wrong zone puts the sun tens of
 * degrees away, and no arithmetic slip survives that.
 *
 * Polar day and polar night are covered separately in skyApi.timezone.test.ts;
 * August gives none of these twelve a collapsed window.
 */

const fetchJson = vi.fn();
vi.mock('../utils/fetchJson', () => ({ fetchJson: (...a: unknown[]) => fetchJson(...a) }));
// Straight through: the module-level TTL cache would answer later cities with an
// earlier city's payload.
vi.mock('../utils/apiCache', () => ({
  cached: (_k: string, _ttl: number, fn: () => unknown) => fn(),
}));
vi.mock('../utils/logger', () => ({ logError: vi.fn(), logWarning: vi.fn() }));

import { getNightsCloudCover, getSkyVisibility } from './skyApi';
import { getUvIndex } from './uvApi';
import { solarAltitude } from '../utils/solarPosition';
import { WORLD, type CityFixture } from './worldMeteo.fixture';

const CITIES = Object.entries(WORLD);

/** Sunset and sunrise are defined at -0.833°, refraction included. */
const HORIZON = -0.833;

/** What the naive constructor would have made of a stamp, on this machine. */
const asDeviceLocal = (naive: string) => new Date(naive).getTime();

beforeEach(() => fetchJson.mockReset());

// The name is consumed by the '%s' title, not by the body.
describe.each(CITIES)('%s', (_name, city: CityFixture) => {
  it('puts the sun on the horizon at both ends of the night', async () => {
    fetchJson.mockResolvedValue(city);
    const [night] = await getNightsCloudCover(city.lat, city.lon);

    expect(night.noNight).toBe(false);
    const start = night.nightStart!;
    const end = night.nightEnd!;

    // A degree of slack: Open-Meteo reports to the minute and the two algorithms
    // are independent implementations, not the same code twice.
    expect(solarAltitude(city.lat, city.lon, start)).toBeCloseTo(HORIZON, 0);
    expect(solarAltitude(city.lat, city.lon, end)).toBeCloseTo(HORIZON, 0);
  });

  it('is genuinely dark in the middle of that window', async () => {
    fetchJson.mockResolvedValue(city);
    const [night] = await getNightsCloudCover(city.lat, city.lon);
    const mid = new Date((night.nightStart!.getTime() + night.nightEnd!.getTime()) / 2);

    expect(solarAltitude(city.lat, city.lon, mid)).toBeLessThan(0);
  });

  it('does not read the stamp in the device time zone', async () => {
    fetchJson.mockResolvedValue(city);
    const [night] = await getNightsCloudCover(city.lat, city.lon);

    // The regression, stated directly. Skipped only for a city that happens to
    // share the runner's offset, where the two readings legitimately coincide —
    // which is exactly the case that hid this bug for months.
    const naive = city.daily.sunset[0];
    const deviceOffsetSec = -new Date(`${naive}:00`).getTimezoneOffset() * 60;
    if (deviceOffsetSec !== city.utc_offset_seconds) {
      expect(night.nightStart!.getTime()).not.toBe(asDeviceLocal(naive));
    }
    // And it always equals the stamp corrected by the response's own offset.
    expect(night.nightStart!.getTime())
      .toBe(Date.parse(`${naive}Z`) - city.utc_offset_seconds * 1000);
  });

  it('labels the night hours on the local clock', async () => {
    fetchJson.mockResolvedValue(city);
    const sky = await getSkyVisibility(city.lat, city.lon, 5);

    for (const h of sky.nightHours) {
      expect(h.hour).toBeGreaterThanOrEqual(0);
      expect(h.hour).toBeLessThan(24);
      // The hour shown must be the hour at the location, so every night hour is
      // an evening or a small hour — never the middle of the local afternoon.
      expect(h.hour >= 16 || h.hour <= 9).toBe(true);
    }
  });

  it('prints sunrise and sunset on the location clock, not the device one', async () => {
    fetchJson.mockResolvedValue(city);
    const sky = await getSkyVisibility(city.lat, city.lon, 5);

    // Accept either the 24-hour or the 12-hour rendering — the locale decides
    // that, and the point here is the clock reading, not the format.
    const hhmm = city.daily.sunset[0].slice(11, 16);
    const [hh, mm] = hhmm.split(':').map(Number);
    const h12 = String(hh % 12 === 0 ? 12 : hh % 12).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    expect(sky.sunset).toMatch(new RegExp(`\\b${hh}:${mmStr}\\b|\\b${h12}:${mmStr}\\b`));
  });

  it('reads the UV index for the hour showing at the location', async () => {
    // Fixed instant, so "now" is the same everywhere the suite runs.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T12:00:00Z'));
    try {
      fetchJson.mockResolvedValue(city.uv);
      const uv = await getUvIndex(city.lat, city.lon);

      const localSec = 12 * 3600 + city.uv.utc_offset_seconds;
      const hour = Math.floor((((localSec % 86400) + 86400) % 86400) / 3600);
      expect(uv.current).toBe(city.uv.hourly.uv_index[hour] ?? 0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('the set itself', () => {
  it('spans the offsets that break naive arithmetic', () => {
    const offsets = CITIES.map(([, c]) => c.utc_offset_seconds / 3600);
    expect(Math.max(...offsets)).toBeGreaterThanOrEqual(12);
    expect(Math.min(...offsets)).toBeLessThanOrEqual(-10);
    // 45-minute zones are the ones hour-based maths gets wrong.
    expect(offsets.some(o => !Number.isInteger(o))).toBe(true);
    // Both hemispheres, so a sign error cannot pass unnoticed.
    expect(CITIES.some(([, c]) => c.lat > 0)).toBe(true);
    expect(CITIES.some(([, c]) => c.lat < 0)).toBe(true);
  });
});

afterEach(() => vi.useRealTimers());
