import { describe, it, expect } from 'vitest';
import { parseNoaaTime, noaaTimeSeconds } from './noaaTime';

describe('parseNoaaTime', () => {
  it('reads an offset-less NOAA stamp as UTC, not local time', () => {
    // The whole point: `new Date('2026-08-15T18:00:00')` is *local* per spec,
    // which skewed Calendar's night grouping and Forecast's x-axis by the
    // visitor's UTC offset — three hours in Bulgaria.
    expect(parseNoaaTime('2026-08-15T18:00:00').toISOString()).toBe('2026-08-15T18:00:00.000Z');
  });

  it('accepts the space-separated variant NOAA also emits', () => {
    expect(parseNoaaTime('2026-08-15 18:00:00').toISOString()).toBe('2026-08-15T18:00:00.000Z');
  });

  it('leaves an explicit zone alone', () => {
    expect(parseNoaaTime('2026-08-15T18:00:00Z').toISOString()).toBe('2026-08-15T18:00:00.000Z');
    expect(parseNoaaTime('2026-08-15T21:00:00+03:00').toISOString()).toBe('2026-08-15T18:00:00.000Z');
    expect(parseNoaaTime('2026-08-15T13:00:00-0500').toISOString()).toBe('2026-08-15T18:00:00.000Z');
  });

  it('matches what the four hand-written call sites used to do', () => {
    // Those wrote `new Date(t.replace(' ', 'T') + 'Z')`. Replacing them must not
    // move a single chart point.
    for (const tag of ['2026-08-15 18:00:00', '2026-08-01T00:00:00', '2026-12-31 23:59:59']) {
      expect(parseNoaaTime(tag).getTime())
        .toBe(new Date(tag.replace(' ', 'T') + 'Z').getTime());
    }
  });

  it('yields an invalid date for junk rather than throwing', () => {
    expect(Number.isNaN(parseNoaaTime('not a time').getTime())).toBe(true);
    expect(Number.isNaN(parseNoaaTime('').getTime())).toBe(true);
  });
});

describe('noaaTimeSeconds', () => {
  it('returns whole epoch seconds', () => {
    expect(noaaTimeSeconds('2026-08-15T18:00:00')).toBe(Date.UTC(2026, 7, 15, 18) / 1000);
  });

  it('is the same instant parseNoaaTime reports', () => {
    const tag = '2026-08-15 21:00:00';
    expect(noaaTimeSeconds(tag)).toBe(Math.floor(parseNoaaTime(tag).getTime() / 1000));
  });
});
