import { Geolocation } from '@capacitor/geolocation';
import { isNative, isIos } from './platform';

export interface GeoPosition {
  coords: { latitude: number; longitude: number; accuracy: number };
}

export interface GeoOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const DEFAULT_OPTIONS: GeoOptions = { enableHighAccuracy: true, timeout: 10000 };

export async function getCurrentPosition(options: GeoOptions = DEFAULT_OPTIONS): Promise<GeoPosition> {
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
    const pos = await Geolocation.getCurrentPosition(options);
    return pos;
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// True only when the OS-level permission is already granted, so a position read
// will NOT show a prompt. Used by the silent auto-refresh — background location
// updates must never surprise the user with a permission dialog.
export async function isLocationPermissionGranted(): Promise<boolean> {
  try {
    if (isNative()) {
      const status = await Geolocation.checkPermissions();
      return status.location === 'granted';
    }
    if (!navigator.permissions?.query) return false;
    const p = await navigator.permissions.query({ name: 'geolocation' });
    return p.state === 'granted';
  } catch {
    return false;
  }
}
