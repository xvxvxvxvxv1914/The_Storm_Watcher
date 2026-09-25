import { describe, it, expect } from 'vitest';
import { latestRtswSample, RTSW_FRESH_MIN, type RtswRow } from './rtswSource';

interface Row extends RtswRow { v: number | null }

const END = Date.parse('2026-09-25T11:28:00Z');
const row = (source: string | undefined, minAgo: number, v: number | null, active = false): Row => ({
  time_tag: new Date(END - minAgo * 60000).toISOString().slice(0, 19), // NOAA form: no offset
  source, active, v,
});
const usable = (r: Row) => r.v !== null;
const pick = (rows: Row[]) => latestRtswSample(rows, usable);

describe('latestRtswSample', () => {
  // The state of rtsw_wind_1m.json on 2026-09-25: NOAA's active spacecraft had
  // not reported wind for 8.5 hours while two others reported every minute.
  it('does not show a silent active spacecraft as live', () => {
    const rows = [row('SOLAR1', 510, 444, true), row('ACE', 1, 454), row('IMAP', 0, 445)];
    expect(pick(rows)?.source).toBe('IMAP');
  });

  it('prefers the active spacecraft while it keeps up', () => {
    const rows = [row('SOLAR1', 3, 500, true), row('ACE', 0, 454)];
    expect(pick(rows)?.v).toBe(500);
  });

  it('draws the line at RTSW_FRESH_MIN', () => {
    expect(pick([row('SOLAR1', RTSW_FRESH_MIN, 1, true), row('ACE', 0, 2)])?.v).toBe(1);
    expect(pick([row('SOLAR1', RTSW_FRESH_MIN + 1, 1, true), row('ACE', 0, 2)])?.v).toBe(2);
  });

  it('skips samples without a reading before judging freshness', () => {
    // An empty newest active row must not make the spacecraft look fresh.
    const rows = [row('SOLAR1', 0, null, true), row('SOLAR1', 60, 400, true), row('ACE', 0, 454)];
    expect(pick(rows)?.v).toBe(454);
  });

  it('keeps the single-spacecraft behaviour: newest active over trailing unvalidated rows', () => {
    const rows = [row(undefined, 2, 423, true), row(undefined, 0, 999, false)];
    expect(pick(rows)?.v).toBe(423);
  });

  it('does not depend on the order the feed arrives in', () => {
    const rows = [row('SOLAR1', 510, 444, true), row('ACE', 1, 454), row('IMAP', 0, 445)];
    expect(pick([...rows].reverse())).toEqual(pick(rows));
  });

  it('returns null, not a fabricated reading, when nothing is usable', () => {
    expect(pick([])).toBeNull();
    expect(latestRtswSample(null, usable)).toBeNull();
    expect(pick([row('ACE', 0, null, true)])).toBeNull();
  });
});

it('uses the threshold the Swift, Kotlin and Deno copies read from the contract', async () => {
  const contract = (await import('../services/kpSource.contract.json')).default;
  expect(RTSW_FRESH_MIN).toBe(contract.sampleSelection.freshMinutes);
});
