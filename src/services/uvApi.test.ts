import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUvLevel, getUvIndex } from './uvApi';

vi.mock('../utils/logger', () => ({ logError: vi.fn() }));

describe('getUvIndex when the request fails', () => {
  // Throws rather than returning a rejected promise: an unconsumed rejection is
  // reported by vitest as an unhandled error and fails the test for the wrong
  // reason. fetchJson awaits inside a try, so the path is identical.
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => { throw new Error('offline'); })));
  afterEach(() => vi.unstubAllGlobals());

  /**
   * It used to answer `{ current: 0, ... }`, which the page renders as
   * "Low — no protection needed": a sun-safety claim manufactured from a failed
   * request. UV.tsx already had a try/catch and an ErrorCard with a retry, and a
   * successful-looking object walked straight past both.
   */
  it('rejects instead of reporting UV 0', async () => {
    // Distinct coordinates per run: apiCache is module-level and a fulfilled
    // entry from another test would answer before the stubbed fetch is reached.
    await expect(getUvIndex(11.11, 22.22)).rejects.toThrow();
  });
});

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
