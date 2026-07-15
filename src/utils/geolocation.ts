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

export interface ResolvedLocation {
  lat: number;
  lon: number;
  // Human-readable "City, Country" for IP results; null for GPS results —
  // callers reverse-geocode precise coords themselves.
  name: string | null;
  source: 'gps' | 'ip';
}

// Approximate city-level location from the visitor's IP. Needs no permission.
// Cached for 24h — an IP's geolocation rarely changes and the providers
// rate-limit per source IP.
const IP_CACHE_KEY = 'tsw_ip_location';
const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Providers tried in order; both are free, HTTPS, CORS-enabled, key-less.
// ipapi.co throttles aggressively per source IP, geojs.io is the backstop
// (it returns lat/lon as strings, hence the Number() normalisation).
const IP_PROVIDERS: { url: string; parse: (j: Record<string, unknown>) => ResolvedLocation | null }[] = [
  {
    url: 'https://ipapi.co/json/',
    parse: (j) => {
      const lat = Number(j.latitude);
      const lon = Number(j.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const name = [j.city, j.country_name].filter(Boolean).join(', ');
      return { lat, lon, name: name || null, source: 'ip' };
    },
  },
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    parse: (j) => {
      const lat = Number(j.latitude);
      const lon = Number(j.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const name = [j.city, j.country].filter(Boolean).join(', ');
      return { lat, lon, name: name || null, source: 'ip' };
    },
  },
];

// Single-flight: several pages resolve on mount simultaneously — one lookup
// serves them all (the providers rate-limit per source IP).
let ipLookupInFlight: Promise<ResolvedLocation | null> | null = null;

export async function getApproxLocationByIP(): Promise<ResolvedLocation | null> {
  try {
    const raw = localStorage.getItem(IP_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { at: number; loc: ResolvedLocation };
      if (Date.now() - cached.at < IP_CACHE_TTL_MS && typeof cached.loc?.lat === 'number') {
        return cached.loc;
      }
    }
  } catch { /* corrupt cache — refetch */ }
  if (ipLookupInFlight) return ipLookupInFlight;
  ipLookupInFlight = (async () => {
    for (const provider of IP_PROVIDERS) {
      try {
        const res = await fetch(provider.url);
        if (!res.ok) continue;
        const loc = provider.parse(await res.json());
        if (!loc) continue;
        try { localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ at: Date.now(), loc })); } catch { /* full */ }
        return loc;
      } catch { /* try next provider */ }
    }
    return null;
  })().finally(() => { ipLookupInFlight = null; });
  return ipLookupInFlight;
}

// Silent position read: resolves only when the OS permission is already
// granted, null otherwise. Can never surprise the user with a dialog.
export async function getPositionIfGranted(options?: GeoOptions): Promise<GeoPosition | null> {
  if (!(await isLocationPermissionGranted())) return null;
  try {
    return await getCurrentPosition(options);
  } catch {
    return null;
  }
}

// Best location available WITHOUT prompting: precise GPS when permission is
// already granted, otherwise the approximate IP city. Pages call this when no
// preferred location is saved — the OS/browser permission dialog is reserved
// for explicit user actions (the LocationPrompt primer or the Settings page).
export async function resolveLocation(): Promise<ResolvedLocation | null> {
  const pos = await getPositionIfGranted();
  if (pos) {
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, name: null, source: 'gps' };
  }
  return getApproxLocationByIP();
}
