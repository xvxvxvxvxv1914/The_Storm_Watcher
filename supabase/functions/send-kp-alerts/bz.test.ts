import { describe, it, expect } from 'vitest';
import { sustainedBz, BZ_SUSTAINED_MIN, type MagRow } from './bz.ts';

/** N samples one minute apart, newest last, ending `endOffsetMin` ago. */
function series(values: (number | null)[], { gapAfter = -1, endOffsetMin = 0 } = {}): MagRow[] {
  const base = Date.parse('2026-08-06T12:00:00Z') - endOffsetMin * 60000;
  return values.map((v, i) => {
    // A gap pushes every sample before `gapAfter` further into the past.
    const extra = gapAfter >= 0 && i <= gapAfter ? 60 : 0;
    return {
      time_tag: new Date(base - (values.length - 1 - i + extra) * 60000).toISOString(),
      bz_gsm: v,
    };
  });
}

const flat = (v: number, n = BZ_SUSTAINED_MIN) => Array.from({ length: n }, () => v);

describe('sustainedBz', () => {
  it('returns the weakest sample in the window, not the strongest', () => {
    // -12 for most of the window but one minute only reached -8: not sustained
    // below -10, and the returned value must say so.
    const rows = series([...flat(-12, BZ_SUSTAINED_MIN - 1), -8]);
    expect(sustainedBz(rows)).toBe(-8);
  });

  it('reports a steady southward field', () => {
    expect(sustainedBz(series(flat(-14)))).toBe(-14);
  });

  it('needs a full window before saying anything', () => {
    expect(sustainedBz(series(flat(-20, BZ_SUSTAINED_MIN - 1)))).toBeNull();
    expect(sustainedBz([])).toBeNull();
  });

  it('ignores nulls in the feed but still requires enough real samples', () => {
    const withNulls: MagRow[] = series([...flat(-11, BZ_SUSTAINED_MIN), null, null]);
    expect(sustainedBz(withNulls)).toBe(-11);

    const mostlyNull = series([...flat(-11, 5), ...Array(20).fill(null)]);
    expect(sustainedBz(mostlyNull)).toBeNull();
  });

  // The check that stops a stale signal being sold as a 15-minute lead time.
  it('rejects a window stretched by a gap in the feed', () => {
    const gapped = series(flat(-13), { gapAfter: 5 });
    expect(sustainedBz(gapped)).toBeNull();
  });

  it('sorts newest-last regardless of the order NOAA sends', () => {
    const ascending = series([...flat(-12, BZ_SUSTAINED_MIN - 1), -6]);
    const descending = [...ascending].reverse();
    expect(sustainedBz(descending)).toBe(sustainedBz(ascending));
    expect(sustainedBz(descending)).toBe(-6);
  });

  it('does not treat a northward field as an alert-worthy value', () => {
    // Callers compare against a negative threshold, so a positive result can
    // never fire — but it must be a real number, not a null that hides data.
    expect(sustainedBz(series(flat(3)))).toBe(3);
  });

  it('uses only the most recent window, ignoring older excursions', () => {
    const rows = series([...flat(-25, 30), ...flat(-2, BZ_SUSTAINED_MIN)]);
    expect(sustainedBz(rows)).toBe(-2);
  });
});
