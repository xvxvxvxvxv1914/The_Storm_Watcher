/**
 * One way to read a NOAA timestamp.
 *
 * NOAA stamps its rows `2026-08-15T18:00:00` (and sometimes
 * `2026-08-15 18:00:00`) — ISO-shaped, but with **no offset**. ECMAScript reads
 * that form as *local* time, while the feed is UTC. A visitor in UTC+3 is
 * therefore told every reading happened three hours later than it did.
 *
 * The codebase already knew this: four call sites wrote
 * `new Date(t.replace(' ', 'T') + 'Z')` by hand. Three others did not, and
 * those carried the skew — Calendar grouped its "nights" three hours off, and
 * Forecast labelled the wrong hour on its x-axis. Same class of drift as the
 * nine hand-written copies of the Kp field priority that became `resolveKp`.
 *
 * Deliberately import-free: consumed by pure modules that must unit-test on
 * their own.
 */
export function parseNoaaTime(tag: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(tag);
  return new Date(hasZone ? tag : `${tag.trim().replace(' ', 'T')}Z`);
}

/** Seconds since the epoch, for the chart libraries that want that. */
export const noaaTimeSeconds = (tag: string): number =>
  Math.floor(parseNoaaTime(tag).getTime() / 1000);
