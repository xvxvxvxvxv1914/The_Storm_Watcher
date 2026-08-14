/**
 * Reading Open-Meteo's timestamps. The same trap as `noaaTime.ts`, from the
 * other direction — and this one is worse, because it hides until the visitor
 * and the place they are looking at are in different time zones.
 *
 * Every Open-Meteo call here passes `timezone=auto`, so the API answers in the
 * **location's** local time and stamps it without an offset:
 *
 *     "sunset": ["2026-08-14T21:56"]   with   "utc_offset_seconds": 7200
 *
 * `new Date("2026-08-14T21:56")` reads that as the **device's** local time, so
 * the instant it produces is wrong by `deviceOffset − locationOffset`. Measured
 * against the live API for Tromsø: 0 on a device in Oslo, −1 h in Sofia, +10 h
 * in Anchorage, −10 h in Auckland.
 *
 * Comparing two Open-Meteo values with each other still worked, since both were
 * shifted by the same amount — which is exactly why this survived. It breaks
 * where a shifted value meets a real instant: `Date.now()`, or a NOAA Kp bin
 * read through `parseNoaaTime`. That is the night window in Calendar, which
 * decides which Kp bins count as "tonight", and with them the night's peak Kp
 * and its aurora chance.
 *
 * `utc_offset_seconds` is in every response already; it just was not read.
 */

/** The real instant of an Open-Meteo stamp, given the response's own offset. */
export const parseOpenMeteoTime = (t: string, utcOffsetSeconds: number): Date =>
  new Date(Date.parse(`${t}Z`) - utcOffsetSeconds * 1000);

/**
 * The hour on the clock **at the location**, taken straight from the stamp.
 *
 * `getHours()` on a parsed Date answers in the device's zone, which is a
 * different question — "21:00 in Tromsø" is what a night window means, not
 * "whatever o'clock it is where the phone is".
 */
export const openMeteoHour = (t: string): number => Number(t.slice(11, 13));

/**
 * The hour it is at the location right now — for picking "the current hour" out
 * of an hourly array that is indexed in the location's own time.
 */
export const locationHourNow = (utcOffsetSeconds: number, nowMs: number = Date.now()): number =>
  Math.floor(((((nowMs / 1000 + utcOffsetSeconds) % 86400) + 86400) % 86400) / 3600);

/**
 * Format an instant on the location's clock, keeping the visitor's locale
 * conventions (12h/24h). Slicing the raw stamp would be simpler but would show
 * a US visitor "21:56" where the rest of the app says "9:56 PM".
 */
export const formatOpenMeteoTime = (
  d: Date,
  timeZone: string,
  locale?: string,
): string => {
  try {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone });
  } catch {
    // An unknown IANA name would throw and take the whole card with it.
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
};

/**
 * A `daily.time` entry ("2026-08-14") as that calendar day at the location.
 *
 * Date-only strings are parsed as **UTC** midnight by ECMAScript, so a device
 * west of Greenwich renders them as the day before. Building the parts locally
 * keeps the label on the day the API meant.
 */
export const parseOpenMeteoDay = (t: string): Date => {
  const [y, m, d] = t.split('-').map(Number);
  return new Date(y, m - 1, d);
};
