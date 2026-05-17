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
