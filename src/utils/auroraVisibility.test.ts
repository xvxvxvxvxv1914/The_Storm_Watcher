import { describe, it, expect } from 'vitest';
import { calcAuroraVisibility, auroraViewingChance } from './auroraVisibility';

/**
 * The model's two constants come from NOAA SWPC's own viewing guidance — oval
 * edge 66° at Kp 0, moving 2° per Kp, still visible ~1000 km (≈9°) equatorward
 * of that edge. https://www.spaceweather.gov/content/tips-viewing-aurora
 *
 * The cases below are the calibration: places and storm levels where it is
 * publicly documented whether aurora was or was not visible. They are the reason
 * to trust the numbers, so they are asserted as ranges rather than exact values —
 * a refinement that keeps reality is welcome, one that loses it is not.
 */

describe('calcAuroraVisibility — invariants', () => {
  it('always returns an integer in [0, 100]', () => {
    const cases: [number, number, number][] = [
      [0, 0, 0], [0, 0, 9], [90, 0, 0], [90, 0, 9],
      [-90, 0, 5], [70, 20, 3], [55, 37, 7], [-42.9, 147.3, 9],
    ];
    for (const [lat, lon, kp] of cases) {
      const v = calcAuroraVisibility(lat, lon, kp);
      expect(Number.isInteger(v), `lat=${lat} lon=${lon} kp=${kp}`).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('never puts aurora over the tropics, at any Kp', () => {
    // The old slope of 5.3°/Kp placed the oval edge at 19.3° at Kp 9.
    for (const kp of [0, 5, 9]) {
      expect(calcAuroraVisibility(0, 0, kp)).toBe(0);        // equator
      expect(calcAuroraVisibility(-22.9, -43.2, kp)).toBe(0); // Rio de Janeiro
      expect(calcAuroraVisibility(25.8, -80.2, kp)).toBe(0);  // Miami
    }
  });

  it('rises monotonically with Kp', () => {
    for (const [lat, lon] of [[56, 37], [-42.9, 147.3], [51.5, -0.1]] as const) {
      const steps = [0, 2, 4, 6, 8, 9].map(kp => calcAuroraVisibility(lat, lon, kp));
      expect(steps, `${lat},${lon}`).toEqual([...steps].sort((a, b) => a - b));
    }
  });

  it('is symmetric about the geomagnetic equator', () => {
    // A dipole is symmetric; aurora australis is the same phenomenon.
    for (const kp of [5, 9]) {
      expect(calcAuroraVisibility(-90, 0, kp)).toBe(calcAuroraVisibility(90, 0, kp));
    }
  });
});

describe('calcAuroraVisibility — calibration against documented events', () => {
  // Directly under the oval: aurora on most clear dark nights, even when quiet.
  it('Tromsø is a near-certainty even at Kp 0', () => {
    expect(calcAuroraVisibility(69.6, 18.9, 0)).toBe(100);
  });

  it('Reykjavík likewise', () => {
    expect(calcAuroraVisibility(64.1, -21.9, 0)).toBeGreaterThanOrEqual(90);
  });

  // Northern Scotland sits essentially on the oval edge during moderate storms.
  it('Scotland is a good bet at Kp 5 and a long shot when quiet', () => {
    expect(calcAuroraVisibility(57.5, -4.2, 5)).toBeGreaterThanOrEqual(90);
    expect(calcAuroraVisibility(57.5, -4.2, 0)).toBeLessThan(20);
  });

  // May 2024 (G5, Kp 9) reached Bulgaria, Germany and northern Italy. October
  // 2024 (G4, Kp ~8.7) reached Germany but not Bulgaria in any real way.
  it('Sofia: nothing at Kp 6, a slim chance at Kp 9', () => {
    expect(calcAuroraVisibility(42.7, 23.3, 6)).toBe(0);
    const kp9 = calcAuroraVisibility(42.7, 23.3, 9);
    expect(kp9).toBeGreaterThan(0);
    expect(kp9).toBeLessThan(50);
  });

  it('Berlin: plausible at Kp 7, certain-ish at Kp 9', () => {
    expect(calcAuroraVisibility(52.5, 13.4, 7)).toBeGreaterThan(30);
    expect(calcAuroraVisibility(52.5, 13.4, 9)).toBe(100);
  });

  it('Moscow needs a strong storm — its longitude costs it', () => {
    // Same geographic latitude as southern Scandinavia, but magnetically far
    // from the pole, which sits over northern Canada.
    expect(calcAuroraVisibility(55.8, 37.6, 3)).toBeLessThan(5);
    expect(calcAuroraVisibility(55.8, 37.6, 8)).toBeGreaterThan(20);
  });
});

describe('calcAuroraVisibility — southern hemisphere', () => {
  it('Tasmania: a chance at Kp 5, a big display at Kp 8', () => {
    expect(calcAuroraVisibility(-42.9, 147.3, 5)).toBeGreaterThan(5);
    expect(calcAuroraVisibility(-42.9, 147.3, 8)).toBeGreaterThan(80);
  });

  it.each([
    ['Invercargill, NZ', -46.4, 168.4],
    ['Ushuaia, Argentina', -54.8, -68.3],
    ['McMurdo, Antarctica', -77.8, 166.7],
  ])('%s sees aurora australis during a severe storm', (_n, lat, lon) => {
    expect(calcAuroraVisibility(lat, lon, 9)).toBeGreaterThan(0);
  });

  it('but a southern tropical city still does not', () => {
    expect(calcAuroraVisibility(-33.9, 18.4, 9)).toBe(0); // Cape Town
  });
});

describe('auroraViewingChance — darkness', () => {
  // 2026-06-21, Tromsø: the midnight sun. Local midnight is 22:00 UTC.
  const midnightSunTromso = new Date('2026-06-21T22:00:00Z');
  // 2026-12-21, Tromsø: polar night, taken at local midnight. Not midday — even
  // inside the polar night the sun climbs to a few degrees below the horizon at
  // noon, and that twilight is bright enough to hide an aurora. The model gets
  // that right; an earlier version of this test did not.
  const polarNightTromso = new Date('2026-12-21T23:00:00Z');

  it('is zero through the midnight sun, however strong the storm', () => {
    expect(calcAuroraVisibility(69.6, 18.9, 9)).toBe(100); // geomagnetically certain
    expect(auroraViewingChance(69.6, 18.9, 9, midnightSunTromso)).toBe(0);
  });

  it('is unimpeded in the polar night', () => {
    expect(auroraViewingChance(69.6, 18.9, 5, polarNightTromso)).toBe(100);
  });

  it('is zero at local noon anywhere', () => {
    // Sofia, midday: geomagnetically it would be a slim chance at Kp 9.
    expect(auroraViewingChance(42.7, 23.3, 9, new Date('2026-08-13T09:00:00Z'))).toBe(0);
  });

  it('never exceeds the geomagnetic chance', () => {
    const at = new Date('2026-01-15T23:00:00Z');
    for (const [lat, lon] of [[69.6, 18.9], [42.7, 23.3], [-42.9, 147.3]] as const) {
      expect(auroraViewingChance(lat, lon, 7, at)).toBeLessThanOrEqual(
        calcAuroraVisibility(lat, lon, 7));
    }
  });
});
