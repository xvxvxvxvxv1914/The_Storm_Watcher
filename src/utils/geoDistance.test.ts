import { describe, it, expect } from 'vitest';
import { distanceKm } from './geoDistance';

describe('distanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(distanceKm(42.7, 23.3, 42.7, 23.3)).toBe(0);
  });

  it('Sofia → Athens is ~525 km', () => {
    const d = distanceKm(42.6977, 23.3219, 37.9838, 23.7275);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(550);
  });

  it('small move within a city stays under the 25 km travel threshold', () => {
    // Two points ~5 km apart in Sofia
    const d = distanceKm(42.6977, 23.3219, 42.65, 23.35);
    expect(d).toBeLessThan(25);
  });

  it('handles the antimeridian', () => {
    const d = distanceKm(0, 179.5, 0, -179.5);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});
