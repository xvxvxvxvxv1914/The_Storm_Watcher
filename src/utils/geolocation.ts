import { Geolocation } from '@capacitor/geolocation';
import { isNative, isIos } from './platform';

export interface GeoPosition {
  coords: { latitude: number; longitude: number; accuracy: number };
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  if (isNative()) {
    // iOS requires explicit permission request before getCurrentPosition will work.
    // On Android the OS handles the runtime dialog automatically.
    if (isIos()) {
      const status = await Geolocation.checkPermissions();
      if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
        const result = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (result.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      } else if (status.location === 'denied') {
        throw new Error('Location permission denied');
      }
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return pos;
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}
