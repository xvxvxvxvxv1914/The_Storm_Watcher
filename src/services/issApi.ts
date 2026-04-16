import axios from 'axios';
import * as satellite from 'satellite.js';

export interface IssPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
}

export interface IssPass {
  date: string;
  time: string;
  duration: number; // seconds
  maxElevation: number; // degrees
  timestamp: number;
}

export const getIssPosition = async (): Promise<IssPosition> => {
  try {
    const res = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
    return {
      latitude: res.data.latitude,
      longitude: res.data.longitude,
      altitude: res.data.altitude,
      velocity: res.data.velocity,
      visibility: res.data.visibility,
    };
  } catch (error) {
    console.error('Error fetching ISS position:', error);
    return { latitude: 0, longitude: 0, altitude: 0, velocity: 0, visibility: 'unknown' };
  }
};

const getTle = async (): Promise<{ line1: string; line2: string }> => {
  try {
    const res = await axios.get('https://tle.ivanstanojevic.me/api/tle/25544');
    return { line1: res.data.line1, line2: res.data.line2 };
  } catch (error) {
    console.error('Error fetching ISS TLE:', error);
    // Return a dummy TLE or empty string. Since satellite logic will fail if it's broken anyway:
    return { line1: '', line2: '' };
  }
};

const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const getIssPasses = async (lat: number, lon: number, altMeters = 0): Promise<IssPass[]> => {
  try {
    const { line1, line2 } = await getTle();
    if (!line1 || !line2) return [];

    const satrec = satellite.twoline2satrec(line1, line2);

    const passes: IssPass[] = [];
    const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // next 7 days
  const obsGd = {
    longitude: satellite.degreesToRadians(lon),
    latitude: satellite.degreesToRadians(lat),
    height: altMeters / 1000,
  };

  const MIN_ELEVATION = 10; // degrees
  const step = 10; // seconds

  let inPass = false;
  let passStart: Date | null = null;
  let maxEl = 0;
  let passStartTimestamp = 0;

  let t = new Date(now.getTime());

  while (t < end && passes.length < 5) {
    const posVel = satellite.propagate(satrec, t);
    if (posVel.position && typeof posVel.position !== 'boolean') {
      const gmst = satellite.gstime(t);
      const lookAngles = satellite.ecfToLookAngles(
        obsGd,
        satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst)
      );
      const elDeg = toDeg(lookAngles.elevation);

      if (elDeg >= MIN_ELEVATION) {
        if (!inPass) {
          inPass = true;
          passStart = new Date(t);
          passStartTimestamp = t.getTime();
          maxEl = elDeg;
        } else {
          maxEl = Math.max(maxEl, elDeg);
        }
      } else if (inPass) {
        inPass = false;
        const duration = Math.round((t.getTime() - passStartTimestamp) / 1000);
        if (passStart && duration > 30) {
          passes.push({
            date: passStart.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            time: passStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            duration,
            maxElevation: Math.round(maxEl),
            timestamp: passStartTimestamp,
          });
        }
        maxEl = 0;
        passStart = null;
      }
    }
    t = new Date(t.getTime() + step * 1000);
  }

  return passes;
  } catch (error) {
    console.error('Error fetching ISS passes:', error);
    return [];
  }
};
