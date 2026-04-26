import { describe, it, expect } from 'vitest';
import { getUvLevel } from './uvApi';

describe('getUvLevel', () => {
  it.each([
    [0, 'uv.level.low.label'],
    [2.9, 'uv.level.low.label'],
    [3, 'uv.level.moderate.label'],
    [5.9, 'uv.level.moderate.label'],
    [6, 'uv.level.high.label'],
    [7.9, 'uv.level.high.label'],
    [8, 'uv.level.veryHigh.label'],
    [10.9, 'uv.level.veryHigh.label'],
    [11, 'uv.level.extreme.label'],
    [15, 'uv.level.extreme.label'],
  ])('uv=%s → %s', (uv, expectedKey) => {
    expect(getUvLevel(uv).labelKey).toBe(expectedKey);
  });

  it('returns a non-empty advice string for every level', () => {
    for (const uv of [0, 3, 6, 8, 11]) {
      const level = getUvLevel(uv);
      expect(level.advice.length).toBeGreaterThan(0);
      expect(level.adviceKey).toMatch(/^uv\.level\.\w+\.advice$/);
    }
  });
});
