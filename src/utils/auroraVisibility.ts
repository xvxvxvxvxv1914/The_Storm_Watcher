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

  // Smooth sigmoid-like chance: 0% well below boundary, 100% well above
  const margin = gmlat - boundary;
  return Math.round(Math.min(100, Math.max(0, (margin / 15) * 100)));
}
