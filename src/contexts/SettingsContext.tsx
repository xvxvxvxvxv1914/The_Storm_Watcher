/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { reverseGeocode } from '../utils/reverseGeocode';
import { getCurrentPosition, isLocationPermissionGranted } from '../utils/geolocation';
import { distanceKm } from '../utils/geoDistance';

export interface UserSettings {
  kpThreshold: number;
  unitSystem: 'metric' | 'imperial';
  preferredLat: number | null;
  preferredLon: number | null;
  preferredLocationName: string;
  // 'auto'   — follow the device: silently re-read GPS on app open/foreground and
  //            update the location when the user has moved (travel).
  // 'manual' — the user pinned a location in Settings; never override it.
  locationMode: 'auto' | 'manual';
  // Bz early warning — a *forecast* alert, off unless the user asks for it.
  // Kp alerts report a storm already under way; a sustained southward Bz
  // precedes the Kp rise by roughly 15-45 minutes.
  bzAlertsEnabled: boolean;
  // nT, always negative — southward is what matters. -10 is the value the FAQ
  // quotes as the point where a lead time is worth acting on.
  bzThreshold: number;
}

const DEFAULTS: UserSettings = {
  kpThreshold: 5,
  unitSystem: 'metric',
  preferredLat: null,
  preferredLon: null,
  preferredLocationName: '',
  locationMode: 'auto',
  bzAlertsEnabled: false,
  bzThreshold: -10,
};

const STORAGE_KEY = 'tsw_settings';

// Moving less than this is normal in-city movement — don't churn the location
// (and the reverse-geocode call) for it.
const TRAVEL_THRESHOLD_KM = 25;
// Don't re-check GPS more often than this on foreground events.
const REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const COORD_RE = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* storage full */ }
  }, [settings]);

  // Fix legacy coordinate-style location names (e.g. "43.23, 27.89")
  useEffect(() => {
    if (
      settings.preferredLat !== null &&
      settings.preferredLon !== null &&
      COORD_RE.test(settings.preferredLocationName.trim())
    ) {
      reverseGeocode(settings.preferredLat, settings.preferredLon).then(name => {
        setSettings(prev => ({ ...prev, preferredLocationName: name }));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-follow location: on app open and on return to foreground, silently
  // re-read GPS and move the preferred location when the user has travelled.
  // Runs only in 'auto' mode and only when the OS permission is already
  // granted (never triggers a permission prompt). Failures keep the cached
  // location — pages always render immediately with the last known coords.
  useEffect(() => {
    let cancelled = false;
    let lastCheck = 0;

    const refresh = async () => {
      if (settingsRef.current.locationMode !== 'auto') return;
      if (Date.now() - lastCheck < REFRESH_MIN_INTERVAL_MS) return;
      lastCheck = Date.now();
      try {
        if (!(await isLocationPermissionGranted())) return;
        // Low accuracy is plenty for a 25 km threshold and is faster + kinder
        // to the battery; accept a recent cached fix.
        const pos = await getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: REFRESH_MIN_INTERVAL_MS,
        });
        if (cancelled) return;
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        const cur = settingsRef.current;
        const moved =
          cur.preferredLat === null ||
          cur.preferredLon === null ||
          distanceKm(cur.preferredLat, cur.preferredLon, lat, lon) > TRAVEL_THRESHOLD_KM;
        if (!moved || cur.locationMode !== 'auto') return;
        const name = await reverseGeocode(lat, lon);
        if (cancelled || settingsRef.current.locationMode !== 'auto') return;
        setSettings(prev => ({
          ...prev,
          preferredLat: lat,
          preferredLon: lon,
          preferredLocationName: name,
        }));
      } catch { /* silent — keep the cached location */ }
    };

    refresh();
    window.addEventListener('app-foreground', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('app-foreground', refresh);
    };
  }, []);

  const updateSettings = (patch: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
