import { darknessFactor } from './solarPosition';

// North geomagnetic dipole pole position (IGRF approximation, epoch ~2020).
// A centred dipole is a coarse stand-in for AACGM: it is off by several degrees
// at Siberian longitudes and near the South Atlantic Anomaly. Good enough for a
// consumer percentage, and the single largest remaining source of error here.
const POLE_LAT = 80.7 * (Math.PI / 180);
const POLE_LON = -72.2 * (Math.PI / 180);

/**
 * Equatorward edge of the auroral oval, in degrees of geomagnetic latitude.
 *
 * NOAA SWPC states it directly: "At Kp = 0, the equatorward edge of the auroral
 * oval is approximately 66 degrees. And it moves equatorward about 2 degrees for
 * each level of Kp." — https://www.spaceweather.gov/content/tips-viewing-aurora
 *
 * The previous constants were 67.0 and **5.3** degrees per Kp, which is not a
 * misprint of anything published: it put the oval's edge at 40.5° at Kp 5 and
 * 19.3° — the tropics — at Kp 9. Sofia read a 40% chance at Kp 6, where the real
 * answer is none.
 */
const OVAL_EDGE_KP0 = 66.0;
const OVAL_DEG_PER_KP = 2.0;

/**
 * How far equatorward of the oval an aurora can still be seen, low on the
 * horizon. Also NOAA, same page: "a person can see aurora even when it is
 * 1000 km further north" — 1000 km is close enough to 9° of latitude.
 *
 * This is the half of the model the old code did not have at all. It clamped
 * everything below the boundary to zero, so the only way for a mid-latitude
 * location to ever light up was an absurdly steep slope. Fixing the slope alone
 * would have swung the app from over-promising to never firing: Scotland sees
 * aurora at Kp 5 while sitting ~3° *equatorward* of the oval edge.
 */
const HORIZON_REACH = 9.0;

/** Geomagnetic latitude via the centred-dipole approximation. */
function geomagneticLatitude(lat: number, lon: number): number {
  const latR = lat * (Math.PI / 180);
  const lonR = lon * (Math.PI / 180);
  const sinGm =
    Math.sin(latR) * Math.sin(POLE_LAT) +
    Math.cos(latR) * Math.cos(POLE_LAT) * Math.cos(lonR - POLE_LON);
  return Math.asin(Math.max(-1, Math.min(1, sinGm))) * (180 / Math.PI);
}

/**
 * Aurora visibility percentage for a location and a Kp — the geomagnetic term
 * only. Says nothing about whether it is dark; see `auroraViewingChance`.
 *
 * 100% means the oval is overhead or poleward of you. Below that the number is
 * how far into the horizon-visibility band you are, reaching 0 at 1000 km
 * equatorward of the oval edge.
 *
 * **Both hemispheres.** The comparison is on |geomagnetic latitude|, because a
 * dipole is symmetric: the southern oval sits at the same magnitude, and aurora
 * australis is the same phenomenon. Until 2026-08-13 this used the signed value
 * and returned 0 for all of Australasia and southern South America at every Kp.
 *
 * Known limitation: no magnetic local time, so the oval is treated as a circle
 * when it is really offset toward the nightside, and no poleward boundary, so
 * the polar cap saturates at 100% when the oval is really a ring around it.
 */
export function calcAuroraVisibility(lat: number, lon: number, kp: number): number {
  const gmlat = Math.abs(geomagneticLatitude(lat, lon));
  const boundary = OVAL_EDGE_KP0 - OVAL_DEG_PER_KP * kp;
  const margin = gmlat - boundary;
  if (margin >= 0) return 100; // the oval is overhead or poleward of you

  // Squared, not linear. NOAA gives the *reach* (1000 km) but not the shape, and
  // a straight line put Scotland at 54% during a Kp 1 and Berlin at 58% during a
  // Kp 5 — both far too generous against what those places actually report.
  // Falling faster than linearly has a physical reading: the further equatorward
  // you stand, the lower the aurora sits, so it covers less sky and is seen
  // through more atmosphere. **The exponent is our choice, not a published fit —
  // it is the least-supported number in this file.**
  const reach = Math.max(0, (margin + HORIZON_REACH) / HORIZON_REACH);
  return Math.round(reach * reach * 100);
}

/**
 * What the user actually asked: can I see it, here, now.
 *
 * The geomagnetic chance scaled by how dark the sky is. Without this the app
 * reported up to 100% at local noon, and straight through the midnight sun —
 * Tromsø has no astronomical night from roughly late April to late August, which
 * is most of the season people plan trips around.
 *
 * Deliberately **not** used to gate storm alerts. Those answer "is a storm
 * running", and a notification at four in the afternoon is how someone learns to
 * go out after dark; suppressing it would mean daytime storms went unannounced.
 */
export function auroraViewingChance(
  lat: number,
  lon: number,
  kp: number,
  at: Date = new Date(),
): number {
  return Math.round(calcAuroraVisibility(lat, lon, kp) * darknessFactor(lat, lon, at));
}
