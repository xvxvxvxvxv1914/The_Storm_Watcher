/**
 * Which sample of NOAA's real-time solar wind feeds is "now".
 *
 * `rtsw_wind_1m.json` and `rtsw_mag_1m.json` carry several spacecraft
 * interleaved in one array — seen live on 2026-09-25: ACE, IMAP and SOLAR1,
 * each with its own `source`, and only SOLAR1's rows flagged `active`. The
 * active one is NOAA's operational choice, but it is not always the one that is
 * reporting: that day SOLAR1's last wind sample was 8.5 hours old while ACE and
 * IMAP were a minute old, and "newest active sample" put the 8.5-hour-old speed
 * on the Dashboard under a LIVE badge.
 *
 * The rule, shared with the Swift and Kotlin widgets and the Bz early warning
 * (see `sampleSelection` in src/services/kpSource.contract.json):
 *  1. only samples that carry a usable reading count;
 *  2. the newest *active* sample wins if it is no more than RTSW_FRESH_MIN
 *     behind the newest sample of any source;
 *  3. otherwise the newest sample of any source wins.
 *
 * Freshness is measured against the feed itself, not the wall clock, so a
 * visitor with a wrong clock sees the same choice as everyone else.
 *
 * Import-free apart from noaaTime so it unit-tests on its own.
 */
import { parseNoaaTime } from './noaaTime';

/** How far the active spacecraft may lag the freshest one and still be preferred. */
export const RTSW_FRESH_MIN = 10;

export interface RtswRow {
  time_tag: string;
  active?: boolean;
  source?: string;
}

export function latestRtswSample<T extends RtswRow>(
  rows: readonly T[] | null | undefined,
  usable: (row: T) => boolean,
): T | null {
  let newest: T | null = null;
  let newestActive: T | null = null;
  let newestT = -Infinity;
  let newestActiveT = -Infinity;

  for (const row of rows ?? []) {
    if (!usable(row)) continue;
    const t = parseNoaaTime(row.time_tag).getTime();
    if (!Number.isFinite(t)) continue;
    if (t > newestT) { newest = row; newestT = t; }
    if (row.active && t > newestActiveT) { newestActive = row; newestActiveT = t; }
  }

  if (newestActive && newestT - newestActiveT <= RTSW_FRESH_MIN * 60000) return newestActive;
  return newest;
}
