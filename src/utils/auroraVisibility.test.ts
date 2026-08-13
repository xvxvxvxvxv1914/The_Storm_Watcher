import { describe, it, expect } from 'vitest';
import { calcAuroraVisibility } from './auroraVisibility';

describe('calcAuroraVisibility', () => {
  it('always returns a value in [0, 100]', () => {
    const cases = [
      [0, 0, 0], [0, 0, 9], [90, 0, 0], [90, 0, 9],
      [-90, 0, 5], [70, 20, 3], [55, 37, 7],
    ] as [number, number, number][];
    for (const [lat, lon, kp] of cases) {
      const v = calcAuroraVisibility(lat, lon, kp);
      expect(v, `lat=${lat} lon=${lon} kp=${kp}`).toBeGreaterThanOrEqual(0);
      expect(v, `lat=${lat} lon=${lon} kp=${kp}`).toBeLessThanOrEqual(100);
    }
  });

  it('equator always returns 0 regardless of Kp', () => {
    for (const kp of [0, 3, 5, 9]) {
      expect(calcAuroraVisibility(0, 0, kp)).toBe(0);
    }
  });

  it('geographic North Pole returns 100 for Kp ≥ 5', () => {
    expect(calcAuroraVisibility(90, 0, 5)).toBe(100);
    expect(calcAuroraVisibility(90, 0, 9)).toBe(100);
  });

  it('higher Kp increases visibility at mid-latitudes', () => {
    // Moscow (~56°N) — visibility should rise as Kp increases
    const low = calcAuroraVisibility(56, 37, 2);
    const mid = calcAuroraVisibility(56, 37, 5);
    const high = calcAuroraVisibility(56, 37, 8);
    expect(mid).toBeGreaterThanOrEqual(low);
    expect(high).toBeGreaterThanOrEqual(mid);
  });

  it('higher latitude gives higher visibility at same Kp', () => {
    const kp = 5;
    const mid = calcAuroraVisibility(50, 25, kp);
    const north = calcAuroraVisibility(70, 25, kp);
    expect(north).toBeGreaterThan(mid);
  });

  it('Tromsø (70°N) has ≥80% at Kp=5 and 0% at Kp=0', () => {
    expect(calcAuroraVisibility(69.6, 18.9, 5)).toBeGreaterThanOrEqual(80);
    expect(calcAuroraVisibility(69.6, 18.9, 0)).toBeLessThan(20);
  });

  it('returns integer (rounded)', () => {
    const v = calcAuroraVisibility(65, 25, 4);
    expect(Number.isInteger(v)).toBe(true);
  });
});

describe('calcAuroraVisibility — southern hemisphere', () => {
  // Until 2026-08-13 every one of these read 0 at every Kp: gmlat is negative
  // south of the geomagnetic equator and the boundary is always positive, so the
  // margin could never come out above zero. The suite missed it because the only
  // southern case it carried asserted nothing but "within [0, 100]".
  //
  // This is not cosmetic: send-kp-alerts, useKpAlert and useStormLiveActivity
  // all gate on visibility > 0, so a southern user received no storm alerts at
  // all.
  const SOUTH: [string, number, number][] = [
    ['Hobart, Tasmania', -42.9, 147.3],
    ['Invercargill, NZ', -46.4, 168.4],
    ['Ushuaia, Argentina', -54.8, -68.3],
    ['McMurdo, Antarctica', -77.8, 166.7],
  ];

  it.each(SOUTH)('%s sees aurora australis during a severe storm', (_name, lat, lon) => {
    expect(calcAuroraVisibility(lat, lon, 9)).toBeGreaterThan(0);
  });

  it('Hobart is certain at Kp 9 and unlikely when quiet', () => {
    expect(calcAuroraVisibility(-42.9, 147.3, 9)).toBe(100);
    expect(calcAuroraVisibility(-42.9, 147.3, 0)).toBe(0);
  });

  it('rises with Kp, exactly as the north does', () => {
    const steps = [0, 3, 6, 9].map(kp => calcAuroraVisibility(-42.9, 147.3, kp));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(steps.at(-1)).toBeGreaterThan(steps[0]);
  });

  it('geographic South Pole matches the North Pole', () => {
    // A dipole is symmetric; the two poles must not disagree.
    for (const kp of [5, 9]) {
      expect(calcAuroraVisibility(-90, 0, kp)).toBe(calcAuroraVisibility(90, 0, kp));
    }
  });

  it('leaves the equator at zero — the fix must not simply inflate everything', () => {
    for (const kp of [0, 5, 9]) expect(calcAuroraVisibility(0, 0, kp)).toBe(0);
    // A tropical southern city stays out of it too.
    expect(calcAuroraVisibility(-22.9, -43.2, 9)).toBe(0); // Rio de Janeiro
  });

  it('does not change any northern result', () => {
    // Regression guard on the values the app already showed north of the equator.
    expect(calcAuroraVisibility(69.6, 18.9, 5)).toBe(100); // Tromsø
    expect(calcAuroraVisibility(42.7, 23.3, 9)).toBe(100); // Sofia
    expect(calcAuroraVisibility(42.7, 23.3, 3)).toBe(0);
  });
});
