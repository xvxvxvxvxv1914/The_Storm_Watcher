import { describe, it, expect } from 'vitest';
import { toDeltaSeries, getNigggStormStatus } from './nigggApi';

describe('toDeltaSeries', () => {
  it('returns [] for empty input', () => {
    expect(toDeltaSeries([])).toEqual([]);
  });

  it('returns delta relative to 90th-percentile baseline', () => {
    // 10 points; 90th-percentile = sorted desc → index 1 (top 10%) = value 100
    const pts = Array.from({ length: 10 }, (_, i) => ({ time: i, value: 100 - i }));
    // sorted desc: [100,99,98,...,91]; index 1 = 99 → baseline
    const result = toDeltaSeries(pts);
    // first point: value=100, delta = 100 - 99 = 1
    expect(result[0].value).toBeCloseTo(1, 2);
    // preserves time
    expect(result[0].time).toBe(0);
    expect(result.length).toBe(10);
  });

  it('baseline from single-point array', () => {
    const result = toDeltaSeries([{ time: 0, value: 50 }]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(0, 2);
  });

  it('does not mutate the original array', () => {
    const pts = [{ time: 0, value: 100 }, { time: 1, value: 90 }];
    const copy = pts.map(p => ({ ...p }));
    toDeltaSeries(pts);
    expect(pts).toEqual(copy);
  });
});

describe('getNigggStormStatus', () => {
  it.each([
    [-150, 'STORM', '#ef4444'],
    [-101, 'STORM', '#ef4444'],
    [-100, 'DISTURBED', '#f97316'], // boundary: < -100 is STORM, so -100 itself is DISTURBED
    [-99, 'DISTURBED', '#f97316'],
    [-31, 'DISTURBED', '#f97316'],
    [-30, 'CALM', '#10b981'],       // boundary: < -30 is DISTURBED, so -30 itself is CALM
    [-29, 'CALM', '#10b981'],
    [0, 'CALM', '#10b981'],
    [50, 'CALM', '#10b981'],
  ])('minDelta=%s → label=%s', (minDelta, expectedLabel, expectedColor) => {
    const s = getNigggStormStatus(minDelta);
    expect(s.label).toBe(expectedLabel);
    expect(s.color).toBe(expectedColor);
    expect(s.minDelta).toBe(minDelta);
  });

  it('each status has non-empty i18n keys', () => {
    for (const delta of [-150, -50, 0]) {
      const s = getNigggStormStatus(delta);
      expect(s.descKey).toMatch(/^niggg\./);
      expect(s.detailKey).toMatch(/^niggg\./);
      expect(s.humanEffectKey).toMatch(/^niggg\./);
    }
  });
});
