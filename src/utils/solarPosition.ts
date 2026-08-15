/**
 * Solar altitude for a place and an instant — pure math, no API.
 *
 * The aurora model needed a darkness term and had none, so it happily reported
 * a high chance at local noon and through the midnight sun. Sunrise/sunset from
 * the sky feed cannot answer it: twilight, not sunset, is what decides whether
 * an aurora is visible, and above the polar circles there are days with neither
 * a sunrise nor a sunset to anchor to.
 *
 * This is the NOAA solar-position algorithm (the one behind their published
 * calculator). It is accurate to well under a tenth of a degree for dates near
 * the present, which is an order of magnitude better than the twilight bands
 * below need.
 *
 * Deliberately import-free so it unit-tests on its own.
 */

const DEG = Math.PI / 180;
const rad = (d: number) => d * DEG;
const deg = (r: number) => r / DEG;

/** Days since the J2000.0 epoch, as a fractional Julian century. */
function julianCentury(date: Date): number {
  // 2440587.5 is the Julian day of the Unix epoch; 36525 days to the century.
  const julianDay = date.getTime() / 86400000 + 2440587.5;
  return (julianDay - 2451545.0) / 36525;
}

/** Solar declination and the equation of time, the two slow-moving quantities. */
function sunPosition(t: number): { declination: number; eqOfTime: number } {
  const meanLong = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnom = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const centre =
    Math.sin(rad(meanAnom)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(rad(2 * meanAnom)) * (0.019993 - 0.000101 * t) +
    Math.sin(rad(3 * meanAnom)) * 0.000289;

  const trueLong = meanLong + centre;
  // Nutation and aberration, via the Moon's ascending node.
  const omega = 125.04 - 1934.136 * t;
  const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));

  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(rad(omega));

  const declination = deg(Math.asin(Math.sin(rad(obliquity)) * Math.sin(rad(apparentLong))));

  const y = Math.tan(rad(obliquity / 2)) ** 2;
  const eqOfTime = 4 * deg(
    y * Math.sin(2 * rad(meanLong)) -
    2 * eccentricity * Math.sin(rad(meanAnom)) +
    4 * eccentricity * y * Math.sin(rad(meanAnom)) * Math.cos(2 * rad(meanLong)) -
    0.5 * y * y * Math.sin(4 * rad(meanLong)) -
    1.25 * eccentricity * eccentricity * Math.sin(2 * rad(meanAnom))
  );

  return { declination, eqOfTime };
}

/**
 * The sun's altitude above the horizon, in degrees. Negative below it.
 *
 * Geometric — no refraction correction — so at the moment a feed calls sunrise
 * this returns about -0.83°, which is the standard definition (refraction plus
 * the solar radius). The twilight thresholds below are geometric too, so the
 * two are consistent.
 *
 * @param lon degrees east of Greenwich; western longitudes are negative.
 */
export function solarAltitude(lat: number, lon: number, at: Date): number {
  const t = julianCentury(at);
  const { declination, eqOfTime } = sunPosition(t);

  const minutesUtc = (at.getTime() / 60000) % 1440;
  // True solar time at this longitude, in minutes past local solar midnight.
  const trueSolarTime = (((minutesUtc + eqOfTime + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 - 180;

  const sinAlt =
    Math.sin(rad(lat)) * Math.sin(rad(declination)) +
    Math.cos(rad(lat)) * Math.cos(rad(declination)) * Math.cos(rad(hourAngle));

  return deg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
}

/**
 * Twilight thresholds, in degrees of solar altitude.
 *
 * Aurora is drowned by scattered sunlight well before the sky looks dark to the
 * eye. Nautical twilight is the practical cutoff for seeing anything at all;
 * astronomical twilight is where the sky is properly dark and a faint display
 * stands a chance. Between them the odds climb rather than switch.
 */
export const NAUTICAL_TWILIGHT = -12;
export const ASTRONOMICAL_TWILIGHT = -18;

/**
 * How much of an aurora's visibility survives the current sky brightness:
 * 0 in daylight and early twilight, 1 once the sky is astronomically dark, and
 * a linear climb between the two.
 *
 * A hard switch at one threshold would make the number jump by its full value
 * from one minute to the next; the ramp is what makes a dusk read like a dusk.
 */
export function darknessFactor(lat: number, lon: number, at: Date): number {
  const altitude = solarAltitude(lat, lon, at);
  if (altitude >= NAUTICAL_TWILIGHT) return 0;
  if (altitude <= ASTRONOMICAL_TWILIGHT) return 1;
  return (NAUTICAL_TWILIGHT - altitude) / (NAUTICAL_TWILIGHT - ASTRONOMICAL_TWILIGHT);
}
