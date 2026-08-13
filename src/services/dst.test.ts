import { describe, it, expect } from 'vitest';
import { classifyDst, latestDst, getDstStatus, type DstData } from './noaaApi';

describe('classifyDst', () => {
  it.each([
    [12, 'quiet'],      // Dst runs slightly positive during compression
    [0, 'quiet'],
    [-29, 'quiet'],
    [-30, 'weak'],
    [-49, 'weak'],
    [-50, 'moderate'],
    [-99, 'moderate'],
    [-100, 'intense'],
    [-249, 'intense'],
    [-250, 'extreme'],
    [-589, 'extreme'],  // Carrington-class; the March 1989 storm hit -589
  ])('Dst %i nT → %s', (dst, level) => {
    expect(classifyDst(dst)).toBe(level);
  });

  it('puts each boundary in the more severe band', () => {
    // The convention in the literature: exactly -50 already counts as moderate.
    // Off-by-one here would under-report every storm sitting on a threshold.
    expect(classifyDst(-50)).toBe('moderate');
    expect(classifyDst(-50.0001)).toBe('moderate');
    expect(classifyDst(-49.9999)).toBe('weak');
  });
});

describe('getDstStatus', () => {
  it('climbs green → yellow → orange → red as the storm deepens', () => {
    const colours = [-10, -35, -70, -150, -300].map(d => getDstStatus(d).color);
    expect(new Set(colours).size).toBe(5); // no two bands share a colour
    expect(getDstStatus(-10).color).toContain('10b981');   // quiet, aurora green
    expect(getDstStatus(-300).color).toContain('b91c1c');  // superstorm, deep red
  });

  it('names a translation key, never a literal', () => {
    expect(getDstStatus(-70).statusKey).toBe('dst.moderate');
  });
});

describe('latestDst', () => {
  const row = (time_tag: string, dst: number): DstData => ({ time_tag, dst });

  it('takes the newest reading', () => {
    expect(latestDst([
      row('2026-08-13T07:00:00', -12),
      row('2026-08-13T08:00:00', -30),
      row('2026-08-13T09:00:00', -48),
    ])).toBe(-48);
  });

  it('treats a genuine 0 as data, not as missing', () => {
    // The trap that has bitten the Kp side twice: 0 is a real quiet reading.
    // Reading it as absent would make the card fall back to an older, deeper
    // value and claim a storm that has already passed.
    expect(latestDst([row('2026-08-13T08:00:00', -40), row('2026-08-13T09:00:00', 0)])).toBe(0);
  });

  it('skips back over gaps rather than reporting them as quiet', () => {
    expect(latestDst([
      row('2026-08-13T07:00:00', -95),
      row('2026-08-13T08:00:00', null as unknown as number),
      row('2026-08-13T09:00:00', NaN),
    ])).toBe(-95);
  });

  it('returns null when nothing usable is left', () => {
    expect(latestDst([])).toBeNull();
    expect(latestDst(null)).toBeNull();
    expect(latestDst(undefined)).toBeNull();
    expect(latestDst([row('2026-08-13T09:00:00', NaN)])).toBeNull();
  });
});
