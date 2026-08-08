/**
 * Pure Kp-window helpers for the weekly digest.
 *
 * Kept free of Deno/npm imports so vitest can cover them (same arrangement as
 * send-kp-alerts/bz.ts) — the rest of the edge function is not testable here.
 */

export interface GfzResponse { Kp: (number | null)[]; datetime: string[] }

/** NOAA's 7-day product: one object per 3-hour bin, no header row. */
export interface NoaaKpBin { time_tag: string; Kp: number }

/**
 * Published GFZ bins, oldest first.
 *
 * Trailing bins are null until the period closes and are dropped, never read as
 * 0 — Kp 0.0 is a real ultra-quiet reading, so a substituted 0 would be
 * indistinguishable from a genuine one.
 */
export function parseGfzBins(data: GfzResponse | null | undefined): number[] {
  return (data?.Kp ?? []).filter((k): k is number => typeof k === 'number' && k >= 0);
}

/**
 * Published NOAA bins, oldest first.
 *
 * The endpoint returns objects (`{ time_tag, Kp }`) with no header row. The
 * digest read it as an array of arrays and took `row[1]`, so every value parsed
 * to NaN and was skipped: peak Kp silently collapsed to the current reading and
 * the storm count was always 0. The week of 2026-07-31 peaked at Kp 5.67 and
 * would still have been reported as "no major storms".
 */
export function parseNoaaBins(raw: NoaaKpBin[] | null | undefined): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(r => (typeof r?.Kp === 'number' ? r.Kp : NaN))
    .filter(k => !isNaN(k));
}

/**
 * Storm *episodes*, not 3-hour bins above the threshold. Counting bins turned a
 * single 12-hour G1 into "4 geomagnetic storm events" in the email.
 */
export function countStormEpisodes(bins: number[], threshold = 5): number {
  let episodes = 0;
  let inStorm = false;
  for (const kp of bins) {
    if (kp >= threshold) {
      if (!inStorm) episodes++;
      inStorm = true;
    } else {
      inStorm = false;
    }
  }
  return episodes;
}
