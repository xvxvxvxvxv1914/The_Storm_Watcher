// North geomagnetic dipole pole position (IGRF approximation)
const POLE_LAT = 80.7 * (Math.PI / 180);
const POLE_LON = -72.2 * (Math.PI / 180);

/**
 * Calculate aurora visibility percentage for a geographic location.
 * Uses simplified dipole approximation for geomagnetic latitude,
 * then compares against the empirical aurora oval equatorward boundary.
 *
 * Boundary formula: ~67° geomagnetic at Kp=0, -5.3° per Kp unit.
 * Purely math — no external API call needed.
 *
 * **Both hemispheres.** The comparison is on |geomagnetic latitude|, because a
 * dipole is symmetric: the southern auroral oval sits at the same magnitude as
 * the northern one, and aurora australis is the same phenomenon.
 *
 * This was wrong until 2026-08-13 and the whole southern hemisphere paid for it.
 * `gmlat` is negative down there while `boundary` is always positive, so the
 * margin was hugely negative and every southern location returned **0% at every
 * Kp** — Hobart at Kp 9 read 0 while aurora australis was overhead. Worse than a
 * wrong number on a page: `send-kp-alerts` gates on `visibility > 0`, so no
 * southern user could ever receive a storm alert, and `useKpAlert` and
 * `useStormLiveActivity` skipped them too. The old test suite passed a southern
 * coordinate but only asserted the result was within [0, 100], which 0 is.
 */
export function calcAuroraVisibility(lat: number, lon: number, kp: number): number {
  const latR = lat * (Math.PI / 180);
  const lonR = lon * (Math.PI / 180);

  // Geomagnetic latitude via dipole approximation
  const sinGm =
    Math.sin(latR) * Math.sin(POLE_LAT) +
    Math.cos(latR) * Math.cos(POLE_LAT) * Math.cos(lonR - POLE_LON);
  const gmlat = Math.asin(Math.max(-1, Math.min(1, sinGm))) * (180 / Math.PI);

  // Equatorward boundary of the auroral oval (degrees geomagnetic latitude)
  const boundary = 67.0 - 5.3 * kp;

  // Smooth sigmoid-like chance: 0% well below boundary, 100% well above.
  // |gmlat| — see the hemisphere note above.
  const margin = Math.abs(gmlat) - boundary;
  return Math.round(Math.min(100, Math.max(0, (margin / 15) * 100)));
}
