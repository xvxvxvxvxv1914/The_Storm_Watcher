import { describe, it, expect } from 'vitest';
import { sustainedBz, sustainedBzFromFeed, rankMagSources, RTSW_FRESH_MIN, BZ_SUSTAINED_MIN, type MagRow } from './bz.ts';
import { latestRtswSample, RTSW_FRESH_MIN as APP_FRESH_MIN } from '../../../src/utils/rtswSource';

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

// ── Several spacecraft in one feed (found live 2026-09-25) ──────────────────

const END = Date.parse('2026-09-25T11:28:00Z');
const tag = (ms: number) => new Date(ms).toISOString().slice(0, 19); // NOAA form: no offset

/** One spacecraft: `n` one-minute samples, newest `lagMin` before END, offset by `sec`. */
function craft(source: string, values: number[], { lagMin = 0, sec = 0, active = false } = {}): MagRow[] {
  return values.map((bz_gsm, i) => ({
    time_tag: tag(END - (lagMin + values.length - 1 - i) * 60000 + sec * 1000),
    bz_gsm, source, active,
  }));
}

describe('sustainedBzFromFeed', () => {
  it('never mixes spacecraft in one window', () => {
    // The live layout: ACE on :00, IMAP on :03, interleaved newest-first. The
    // old code took the last 15 rows of both — 7 minutes, two instruments — and
    // logged the result as the 15-minute sustained value.
    // IMAP turned north for a minute 10 minutes ago: inside a real 15-minute
    // window, outside the 7 minutes the mixed one covered.
    const ace = craft('ACE', [...flat(-12, 19), -1, ...flat(-12, 10)]);
    const imap = craft('IMAP', [...flat(-12, 19), -1, ...flat(-12, 10)], { sec: 3 });
    const feed = [...ace, ...imap].sort((a, b) => (a.time_tag < b.time_tag ? 1 : -1));

    // What production computed: "sustained -12 for 15 minutes" — false.
    expect(sustainedBz(feed)).toBe(-12);
    expect(sustainedBzFromFeed(feed)).toBe(-1);
  });

  it('prefers the active spacecraft while it is reporting', () => {
    const feed = [
      ...craft('SOLAR1', flat(-15), { active: true, lagMin: 2 }),
      ...craft('ACE', flat(-3)),
    ];
    expect(sustainedBzFromFeed(feed)).toBe(-15);
  });

  it('drops the active spacecraft once it has gone quiet', () => {
    // SOLAR1's mag was 46 minutes behind on 2026-09-25. Its old window is
    // complete, which is exactly why freshness has to be checked separately.
    const feed = [
      ...craft('SOLAR1', flat(-20), { active: true, lagMin: 46 }),
      ...craft('ACE', flat(-4)),
    ];
    expect(sustainedBzFromFeed(feed)).toBe(-4);
  });

  it('falls through to the next fresh spacecraft when the first has a gap', () => {
    const gappedImap = craft('IMAP', flat(-9, 8), { sec: 3 }); // not a full window
    const feed = [...gappedImap, ...craft('ACE', flat(-7))];
    expect(sustainedBzFromFeed(feed)).toBe(-7);
  });

  it('says nothing when only a stale spacecraft has a window', () => {
    const feed = [
      ...craft('SOLAR1', flat(-20), { active: true, lagMin: 46 }),
      ...craft('ACE', flat(-4, 5)),
    ];
    expect(sustainedBzFromFeed(feed)).toBeNull();
  });

  it('behaves as before on a feed without a source field', () => {
    const legacy = series(flat(-14));
    expect(sustainedBzFromFeed(legacy)).toBe(sustainedBz(legacy));
  });
});

// The app's Dashboard (latestRtswSample) and this alarm must read the same
// spacecraft, or the page and the push disagree about the field.
describe('rankMagSources matches the app', () => {
  const usable = (r: MagRow) => typeof r.bz_gsm === 'number' && Number.isFinite(r.bz_gsm);
  const cases: Record<string, MagRow[]> = {
    'fresh active': [...craft('SOLAR1', flat(-5), { active: true, lagMin: 2 }), ...craft('ACE', flat(-3))],
    'stale active': [...craft('SOLAR1', flat(-5), { active: true, lagMin: 46 }), ...craft('ACE', flat(-3)), ...craft('IMAP', flat(-2), { sec: 3 })],
    'edge of fresh': [...craft('SOLAR1', flat(-5), { active: true, lagMin: RTSW_FRESH_MIN }), ...craft('ACE', flat(-3))],
    'just past fresh': [...craft('SOLAR1', flat(-5), { active: true, lagMin: RTSW_FRESH_MIN + 1 }), ...craft('ACE', flat(-3))],
    'no active': [...craft('ACE', flat(-3), { lagMin: 1 }), ...craft('IMAP', flat(-2))],
  };
  it.each(Object.entries(cases))('%s', (_, rows) => {
    expect(rankMagSources(rows)[0]).toBe(latestRtswSample(rows, usable)?.source);
  });
  it('shares the freshness threshold', () => {
    expect(RTSW_FRESH_MIN).toBe(APP_FRESH_MIN);
  });
});
