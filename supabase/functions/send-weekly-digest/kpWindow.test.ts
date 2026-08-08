import { describe, it, expect } from 'vitest';
import { parseGfzBins, parseNoaaBins, countStormEpisodes } from './kpWindow';

describe('parseGfzBins', () => {
  it('keeps published bins in order', () => {
    expect(parseGfzBins({ Kp: [0.667, 1, 0.333], datetime: [] })).toEqual([0.667, 1, 0.333]);
  });

  it('drops the trailing nulls GFZ sends before a period closes', () => {
    expect(parseGfzBins({ Kp: [2, 3, null, null], datetime: [] })).toEqual([2, 3]);
  });

  it('keeps a genuine Kp 0.0 — it is a real ultra-quiet reading, not missing data', () => {
    expect(parseGfzBins({ Kp: [0, null], datetime: [] })).toEqual([0]);
  });

  it('returns nothing rather than throwing on an empty or malformed payload', () => {
    expect(parseGfzBins(null)).toEqual([]);
    expect(parseGfzBins({ Kp: [], datetime: [] })).toEqual([]);
  });
});

describe('parseNoaaBins', () => {
  // The endpoint returns objects, not [time, kp, ...] rows. Reading row[1] made
  // every value NaN, so peak Kp collapsed to the current reading and the storm
  // count was permanently 0.
  it('reads the Kp field of NOAA 7-day product objects', () => {
    const raw = [
      { time_tag: '2026-07-31T00:00:00', Kp: 1.33 },
      { time_tag: '2026-07-31T03:00:00', Kp: 5.67 },
    ];
    expect(parseNoaaBins(raw)).toEqual([1.33, 5.67]);
  });

  it('has no header row to skip — the first entry is real data', () => {
    const raw = [{ time_tag: '2026-07-31T00:00:00', Kp: 1.33 }];
    expect(parseNoaaBins(raw)).toEqual([1.33]);
  });

  it('skips entries with a non-numeric Kp', () => {
    const raw = [
      { time_tag: 'a', Kp: 2 },
      { time_tag: 'b', Kp: '3' as unknown as number },
      { time_tag: 'c', Kp: 4 },
    ];
    expect(parseNoaaBins(raw)).toEqual([2, 4]);
  });

  it('returns nothing on a malformed payload', () => {
    expect(parseNoaaBins(null)).toEqual([]);
    expect(parseNoaaBins([] as never)).toEqual([]);
  });
});

describe('countStormEpisodes', () => {
  it('counts one continuous storm once, not once per 3-hour bin', () => {
    // 12 hours above G1 is one storm, not four events.
    expect(countStormEpisodes([2, 5, 5.33, 6, 5, 3])).toBe(1);
  });

  it('counts separate storms separately', () => {
    expect(countStormEpisodes([5, 2, 5.67, 1, 6])).toBe(3);
  });

  it('counts a storm still running at the end of the window', () => {
    expect(countStormEpisodes([1, 2, 5, 6])).toBe(1);
  });

  it('is 0 for a quiet week', () => {
    expect(countStormEpisodes([0, 1, 2, 4.67])).toBe(0);
  });

  it('is 0 for an empty window', () => {
    expect(countStormEpisodes([])).toBe(0);
  });
});
