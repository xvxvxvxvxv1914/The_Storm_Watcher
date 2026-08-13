/**
 * "Is a storm coming?" — the forecast half of the storm banner.
 *
 * The strip in Navigation only ever announced a storm already under way: Kp is
 * a retrospective 3-hour index, so by the time it crosses 5 the lead-up is
 * already spent. NOAA's 3-day forecast is the earliest public signal there is —
 * days ahead, where the Bz early warning buys 15-45 minutes — and the app has
 * been fetching it all along for /forecast and /calendar without ever showing
 * it to a visitor who does not open those pages.
 *
 * No React and no app imports, so this unit-tests on its own — the same reason
 * supabase/functions/send-kp-alerts/bz.ts is kept that way. The one import is a
 * sibling pure module.
 */

// NOAA's offset-less stamps read as local time unless corrected; see noaaTime.ts.
import { parseNoaaTime } from './noaaTime';

/** G1 — the band the gauge, both widgets and getStormStatus already call a storm. */
export const OUTLOOK_THRESHOLD = 5;

/** NOAA publishes exactly three days ahead; looking further asks for nothing. */
export const OUTLOOK_HORIZON_MS = 3 * 24 * 60 * 60 * 1000;

export interface ForecastRow {
  time_tag: string;
  kp_index: number;
}

export interface StormOutlook {
  /** The highest Kp predicted inside the horizon. */
  kp: number;
  /** Start of the 3-hour bin holding that peak. */
  at: Date;
}

/**
 * The strongest storm NOAA predicts inside the horizon, or null when the next
 * three days stay below G1.
 *
 * Rows are validated rather than trusted: the feed is a public JSON product
 * with no schema guarantee, and a single NaN once deleted a whole solar-wind
 * reading elsewhere in this app (f244299).
 */
export function peakOutlook(
  rows: ReadonlyArray<Partial<ForecastRow> | null | undefined> | null | undefined,
  nowMs: number = Date.now(),
): StormOutlook | null {
  let best: StormOutlook | null = null;

  for (const row of rows ?? []) {
    const kp = row?.kp_index;
    if (typeof kp !== 'number' || !Number.isFinite(kp)) continue;
    if (typeof row?.time_tag !== 'string') continue;

    const at = parseNoaaTime(row.time_tag);
    const t = at.getTime();
    if (Number.isNaN(t)) continue;
    // A bin that has already begun is the live Kp's business. Announcing one as
    // "expected" would be wrong by definition, and the two strips would then
    // describe the same three hours in contradictory tenses.
    if (t <= nowMs || t > nowMs + OUTLOOK_HORIZON_MS) continue;

    // Strictly greater keeps the *soonest* of equal peaks: a G2 tonight and a
    // G2 in three days are the same severity, and tonight is the actionable one.
    if (!best || kp > best.kp) best = { kp, at };
  }

  return best && best.kp >= OUTLOOK_THRESHOLD ? best : null;
}

/**
 * Identity of an outlook for the purpose of "I have already seen this".
 *
 * Keyed on the peak's time and its G level rather than its raw Kp: NOAA
 * reissues the forecast about three times a day and routinely nudges a value by
 * a third of a unit, which on a raw-Kp key would re-open a banner the visitor
 * had dismissed — several times a day, for the same storm. An upgrade that
 * crosses a G boundary is genuinely new information and does re-open it.
 */
export const outlookToken = (outlook: StormOutlook, gLevel: number): string =>
  `${outlook.at.toISOString()}|G${gLevel}`;
