import { describe, it, expect } from 'vitest';
import { peakOutlook, outlookToken, OUTLOOK_THRESHOLD } from './stormOutlook';

// A fixed "now" so the horizon maths is not a function of when the suite runs.
const NOW = Date.parse('2026-08-13T12:00:00Z');
const hoursOut = (h: number) => new Date(NOW + h * 3600_000).toISOString().replace('.000Z', '');

// parseNoaaTime moved to utils/noaaTime.ts when Forecast, Calendar and Dashboard
// started sharing it; its own tests live in noaaTime.test.ts.

describe('peakOutlook', () => {
  it('returns null on a quiet forecast', () => {
    const rows = [
      { time_tag: hoursOut(3), kp_index: 2 },
      { time_tag: hoursOut(6), kp_index: 4.67 },
    ];
    expect(peakOutlook(rows, NOW)).toBeNull();
  });

  it('fires exactly at the G1 threshold', () => {
    const rows = [{ time_tag: hoursOut(9), kp_index: OUTLOOK_THRESHOLD }];
    expect(peakOutlook(rows, NOW)?.kp).toBe(5);
  });

  it('reports the strongest bin in the window', () => {
    const rows = [
      { time_tag: hoursOut(3), kp_index: 5.33 },
      { time_tag: hoursOut(6), kp_index: 6.67 },
      { time_tag: hoursOut(9), kp_index: 5 },
    ];
    const out = peakOutlook(rows, NOW);
    expect(out?.kp).toBe(6.67);
    expect(out?.at.toISOString()).toBe(new Date(NOW + 6 * 3600_000).toISOString());
  });

  it('prefers the soonest of two equal peaks — that is the actionable one', () => {
    const rows = [
      { time_tag: hoursOut(6), kp_index: 6 },
      { time_tag: hoursOut(48), kp_index: 6 },
    ];
    expect(peakOutlook(rows, NOW)?.at.toISOString())
      .toBe(new Date(NOW + 6 * 3600_000).toISOString());
  });

  it('ignores bins that have already started — those belong to the live Kp', () => {
    const rows = [
      { time_tag: hoursOut(-3), kp_index: 8 },
      { time_tag: hoursOut(0), kp_index: 8 },
      { time_tag: hoursOut(6), kp_index: 5.33 },
    ];
    expect(peakOutlook(rows, NOW)?.kp).toBe(5.33);
  });

  it('ignores bins beyond the three-day horizon', () => {
    const rows = [{ time_tag: hoursOut(73), kp_index: 9 }];
    expect(peakOutlook(rows, NOW)).toBeNull();
  });

  it('skips malformed rows instead of letting one poison the whole forecast', () => {
    const rows = [
      null,
      undefined,
      {},
      { time_tag: hoursOut(3) },                     // no Kp
      { time_tag: hoursOut(3), kp_index: NaN },      // NOAA does emit bare NaN
      { time_tag: hoursOut(3), kp_index: Infinity },
      { time_tag: 'garbage', kp_index: 9 },
      { time_tag: 12345 as unknown as string, kp_index: 9 },
      { time_tag: hoursOut(12), kp_index: 6 },       // the only usable row
    ];
    expect(peakOutlook(rows, NOW)?.kp).toBe(6);
  });

  it('handles an empty or missing feed', () => {
    expect(peakOutlook([], NOW)).toBeNull();
    expect(peakOutlook(null, NOW)).toBeNull();
    expect(peakOutlook(undefined, NOW)).toBeNull();
  });

  it('treats a genuine Kp 0.0 as data, not as missing', () => {
    // The `||` trap that has bitten this codebase repeatedly: 0 is a real
    // ultra-quiet reading. It must be read and then rejected on severity, not
    // skipped as absent — otherwise a stronger later bin could never be masked.
    const rows = [
      { time_tag: hoursOut(3), kp_index: 0 },
      { time_tag: hoursOut(6), kp_index: 5.67 },
    ];
    expect(peakOutlook(rows, NOW)?.kp).toBe(5.67);
  });
});

describe('outlookToken', () => {
  const at = new Date('2026-08-15T18:00:00Z');

  it('is stable when NOAA nudges Kp inside the same G band', () => {
    // The forecast is reissued ~3x/day and routinely moves by a third of a unit.
    // A raw-Kp key would re-open a dismissed banner several times a day.
    expect(outlookToken({ kp: 5.33, at }, 1)).toBe(outlookToken({ kp: 5.67, at }, 1));
  });

  it('changes when the storm is upgraded across a G boundary', () => {
    expect(outlookToken({ kp: 5.67, at }, 1)).not.toBe(outlookToken({ kp: 7, at }, 3));
  });

  it('changes when the peak moves to a different bin', () => {
    const later = new Date('2026-08-15T21:00:00Z');
    expect(outlookToken({ kp: 6, at }, 2)).not.toBe(outlookToken({ kp: 6, at: later }, 2));
  });
});
