// Bz early-warning maths, kept free of Deno/npm imports so it can be unit
// tested by vitest alongside the rest of the app (bz.test.ts). The rest of
// send-kp-alerts cannot be — it imports from esm.sh and npm: specifiers.

/** Minutes of sustained southward Bz required. One noisy sample is not an event. */
export const BZ_SUSTAINED_MIN = 15;

export interface MagRow {
  time_tag: string;
  bz_gsm: number | null;
}

/**
 * The least-southward Bz over the last `BZ_SUSTAINED_MIN` minutes, or null when
 * the window cannot be trusted.
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
