import { Geolocation } from '@capacitor/geolocation';
import { isNative } from './platform';

export interface GeoPosition {
  coords: { latitude: number; longitude: number; accuracy: number };
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  if (isNative()) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return pos;
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}
