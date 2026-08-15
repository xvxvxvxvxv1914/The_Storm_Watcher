import { describe, it, expect } from 'vitest';
import {
  solarAltitude,
  darknessFactor,
  NAUTICAL_TWILIGHT,
  ASTRONOMICAL_TWILIGHT,
} from './solarPosition';

/**
 * Ground truth is Open-Meteo's own sunrise/sunset for these places, queried live
 * on 2026-08-13 and converted to UTC by hand. At the moment a feed calls sunrise
 * or sunset the geometric altitude should be about -0.833° (refraction plus the
 * solar radius). Open-Meteo reports to the minute, so half a degree of slack
 * covers the rounding.
 */
describe('solarAltitude — against real sunrise/sunset', () => {
  it.each([
    ['Tromsø sunrise', 69.6, 18.9, '2026-08-13T01:36:00Z'],
    ['Tromsø sunset', 69.6, 18.9, '2026-08-13T20:01:00Z'],
    ['Hobart sunrise', -42.9, 147.3, '2026-08-12T21:07:00Z'],
    ['Hobart sunset', -42.9, 147.3, '2026-08-13T07:24:00Z'],
  ])('%s puts the sun on the horizon', (_name, lat, lon, iso) => {
    expect(solarAltitude(lat, lon, new Date(iso))).toBeCloseTo(-0.83, 0);
  });

  it('gives the equator its expected midday altitude in August', () => {
    // Solar declination is about +14° in mid-August, so noon at the equator is
    // roughly 90 - 14 degrees.
    const alt = solarAltitude(0, 0, new Date('2026-08-13T12:00:00Z'));
    expect(alt).toBeGreaterThan(73);
    expect(alt).toBeLessThan(78);
  });

  it('keeps the sun up all night during the midnight sun', () => {
    // Tromsø at the June solstice, local midnight.
    expect(solarAltitude(69.6, 18.9, new Date('2026-06-21T22:00:00Z'))).toBeGreaterThan(0);
  });

  it('keeps the sun down all day during the polar night', () => {
    for (const hour of [0, 6, 11, 18]) {
      const at = new Date(`2026-12-21T${String(hour).padStart(2, '0')}:00:00Z`);
      expect(solarAltitude(78.2, 15.6, at), `hour ${hour}`).toBeLessThan(0); // Svalbard
    }
  });

  it('handles western longitudes', () => {
    // Anchorage sunrise, 2026-08-13 06:07 AKDT = 14:07 UTC (from Open-Meteo).
    expect(solarAltitude(61.2, -149.9, new Date('2026-08-13T14:07:00Z'))).toBeLessThan(5);
  });
});

describe('darknessFactor', () => {
  it('is 0 in daylight', () => {
    expect(darknessFactor(0, 0, new Date('2026-08-13T12:00:00Z'))).toBe(0);
  });

  it('is 0 through the midnight sun and 1 in the polar night', () => {
    expect(darknessFactor(69.6, 18.9, new Date('2026-06-21T22:00:00Z'))).toBe(0);
    expect(darknessFactor(78.2, 15.6, new Date('2026-12-21T23:00:00Z'))).toBe(1);
  });

  it('ramps rather than switching, between the two twilights', () => {
    // Sofia through an evening: the factor must climb, never jump to 1 at once.
    const samples = ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
      .map(t => darknessFactor(42.7, 23.3, new Date(`2026-08-13T${t}:00Z`)));
    expect(samples).toEqual([...samples].sort((a, b) => a - b));
    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBe(1);
    expect(samples.some(s => s > 0 && s < 1)).toBe(true);
  });

  it('stays within [0, 1] everywhere it is asked', () => {
    for (const lat of [-80, -40, 0, 40, 80]) {
      for (const hour of [0, 4, 8, 12, 16, 20]) {
        const f = darknessFactor(lat, 0, new Date(`2026-03-15T${String(hour).padStart(2, '0')}:00:00Z`));
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses the documented twilight thresholds', () => {
    expect(NAUTICAL_TWILIGHT).toBe(-12);
    expect(ASTRONOMICAL_TWILIGHT).toBe(-18);
  });
});
