// Bz early-warning maths, kept free of Deno/npm imports so it can be unit
// tested by vitest alongside the rest of the app (bz.test.ts). The rest of
// send-kp-alerts cannot be — it imports from esm.sh and npm: specifiers.

/** Minutes of sustained southward Bz required. One noisy sample is not an event. */
export const BZ_SUSTAINED_MIN = 15;

/**
 * Rewrites the bare `NaN` / `Infinity` literals NOAA emits into `null`.
 *
 * Not valid JSON (RFC 8259 has none of them), so `res.json()` rejects the
 * **whole document** — one dropped sample and the entire Bz window is gone,
 * which here means the early-warning alert silently never fires. Confirmed
 * present in `rtsw_wind_1m.json` on 2026-08-11 (8 occurrences); the mag feed
 * was clean that day, but it is the same feed family and the same risk.
 *
 * `null` is what the feed already uses for a missing sample and what
 * `sustainedBz` already skips, so the repair needs no other change.
 *
 * The web app has the same repair in src/utils/fetchJson.ts and the Apple
 * targets in KpSource.swift; Kotlin gets it for free through optDouble.
 */
export function repairNonStandardJson(text: string): string {
  return text.replace(/:\s*(?:NaN|-?Infinity)(?=\s*[,}\]])/g, ': null');
}

export interface MagRow {
  time_tag: string;
  bz_gsm: number | null;
  /** Spacecraft. The feed interleaves several — ACE, IMAP, SOLAR1 on 2026-09-25. */
  source?: string;
  active?: boolean;
}

/** Mirrors RTSW_FRESH_MIN in src/utils/rtswSource.ts — bz.test.ts pins the two together. */
export const RTSW_FRESH_MIN = 10;

// NOAA stamps carry no offset and are UTC. Same reading as src/utils/noaaTime.ts,
// copied because this file must stay import-free.
const stampMs = (tag: string): number =>
  new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(tag) ? tag : `${tag.trim().replace(' ', 'T')}Z`).getTime();

/**
 * Spacecraft worth reading, best first.
 *
 * The mag feed interleaves several spacecraft in one array. Taking the last 15
 * rows regardless of source — what this function's caller did until
 * 2026-09-25 — alternated ACE and IMAP samples, so the "15-minute" window
 * spanned 7 minutes across two instruments.
 *
 * Only a source whose newest sample is within RTSW_FRESH_MIN of the newest of
 * any source qualifies: a spacecraft that went quiet 45 minutes ago can still
 * hold a complete window, and an alert built on it would announce a field
 * that has since moved on. First comes NOAA's active spacecraft if it
 * qualifies, then the rest by freshness — the same choice as
 * `latestRtswSample` in the app, so the alarm and the Dashboard read one
 * spacecraft.
 */
export function rankMagSources(rows: MagRow[]): (string | undefined)[] {
  const newestBySource = new Map<string | undefined, number>();
  let newest = -Infinity;
  let active: { t: number; source?: string } | null = null;

  for (const r of rows) {
    if (typeof r.bz_gsm !== 'number' || !Number.isFinite(r.bz_gsm)) continue;
    const t = stampMs(r.time_tag);
    if (!Number.isFinite(t)) continue;
    newest = Math.max(newest, t);
    if (t > (newestBySource.get(r.source) ?? -Infinity)) newestBySource.set(r.source, t);
    if (r.active && (!active || t > active.t)) active = { t, source: r.source };
  }

  const cutoff = newest - RTSW_FRESH_MIN * 60000;
  const fresh = [...newestBySource]
    .filter(([, t]) => t >= cutoff)
    .sort((a, b) => b[1] - a[1])
    .map(([source]) => source);

  if (active && active.t >= cutoff) {
    const first = active.source;
    return [first, ...fresh.filter(s => s !== first)];
  }
  return fresh;
}

/**
 * Sustained Bz from one spacecraft: the best-ranked one with a complete
 * window. Falling through to the next is what keeps a gap in one instrument
 * from silencing the only alarm that runs ahead of the storm.
 */
export function sustainedBzFromFeed(rows: MagRow[]): number | null {
  for (const source of rankMagSources(rows)) {
    const value = sustainedBz(rows.filter(r => r.source === source));
    if (value !== null) return value;
  }
  return null;
}

/**
 * The least-southward Bz over the last `BZ_SUSTAINED_MIN` minutes, or null when
 * the window cannot be trusted. Expects rows from ONE spacecraft — the raw feed
 * goes through `sustainedBzFromFeed`.
 *
 * Returning the *weakest* sample in the window is what makes a single
 * comparison answer "has Bz been at or below X for the whole window": if the
 * weakest sample clears the threshold, every sample did. Bz flickers minute to
 * minute and a lone dip is not a storm signal.
 *
 * Two things force a null rather than a number:
 *  - fewer than BZ_SUSTAINED_MIN usable samples, so there is no window yet;
 *  - a window whose samples span far more than BZ_SUSTAINED_MIN minutes, which
 *    means the feed has gaps. Without that check "sustained for 15 minutes"
 *    quietly degrades into "sustained at some point in the last hour", and the
 *    alert would claim a lead time it does not have.
 *
 * NOAA's rtsw feeds arrive newest-first, so rows are sorted rather than sliced
 * off whichever end happens to be current.
 */
export function sustainedBz(rows: MagRow[]): number | null {
  const usable = rows
    .filter(r => typeof r.bz_gsm === 'number' && Number.isFinite(r.bz_gsm))
    .sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime());

  if (usable.length < BZ_SUSTAINED_MIN) return null;

  const window = usable.slice(-BZ_SUSTAINED_MIN);

  const spanMin = (new Date(window[window.length - 1].time_tag).getTime()
    - new Date(window[0].time_tag).getTime()) / 60000;
  if (!Number.isFinite(spanMin) || spanMin > BZ_SUSTAINED_MIN * 2) return null;

  return Math.max(...window.map(r => r.bz_gsm as number));
}
