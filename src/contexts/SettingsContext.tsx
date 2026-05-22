/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { reverseGeocode } from '../utils/reverseGeocode';

export interface UserSettings {
  kpThreshold: number;
  unitSystem: 'metric' | 'imperial';
  preferredLat: number | null;
  preferredLon: number | null;
  preferredLocationName: string;
}

const DEFAULTS: UserSettings = {
  kpThreshold: 5,
  unitSystem: 'metric',
  preferredLat: null,
  preferredLon: null,
  preferredLocationName: '',
};

const STORAGE_KEY = 'tsw_settings';

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
