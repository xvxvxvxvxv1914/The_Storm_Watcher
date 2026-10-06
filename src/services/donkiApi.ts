import { fetchJson } from '../utils/fetchJson';
import { logWarning } from '../utils/logger';
import { isNative } from '../utils/platform';

// NASA moved the public API on September 30, 2026; the old host returns HTML.
// `/donki` is a Vercel rewrite, so it only exists on the web. On native it
// resolved against the Capacitor origin (capacitor://localhost/donki) and 404'd
// on every call — CME and flare lists were silently empty on iOS and Android.
// CapacitorHttp bypasses CORS there, so go straight to the upstream, the same
// way nigggApi does.
const DONKI_UPSTREAM = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';

const DONKI_BASE = import.meta.env.VITE_DONKI_BASE_URL
  ?? (isNative() ? DONKI_UPSTREAM : '/donki');

export interface CmeAnalysis {
  isMostAccurate: boolean;
  speed: number;
  type: string;
  enlilList?: {
    isEarthGB: boolean;
    estimatedShockArrivalTime: string | null;
    kp_90: number | null;
    kp_135: number | null;
    kp_180: number | null;
  }[];
}

export interface CmeEvent {
  activityID: string;
  startTime: string;
  sourceLocation: string;
  note: string;
  link: string;
  cmeAnalyses: CmeAnalysis[] | null;
}

export interface FlareEvent {
  flrID: string;
  beginTime: string;
  peakTime: string;
  classType: string;
  sourceLocation: string;
  note: string;
  link: string;
}

const startDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
};

const endDate = () => new Date().toISOString().split('T')[0];

// A 200 HTML redirect or an unexpected object is a failed feed, not an empty one.
const fetchDonki = async <T,>(url: string): Promise<T[]> => {
  const data = await fetchJson<unknown>(url, 10000, 1);
  if (data === null) return []; // DONKI can return null when there are no events.
  if (!Array.isArray(data)) throw new Error(`Unexpected DONKI response from ${url}`);
  return data as T[];
};

export const getDonkiCme = async (): Promise<CmeEvent[]> => {
  try {
    const params = new URLSearchParams({ startDate: startDate(), endDate: endDate() });
    return await fetchDonki<CmeEvent>(`${DONKI_BASE}/CME?${params}`);
  } catch (error) {
    logWarning('Error fetching donki cme:', error);
    throw error;
  }
};

export const getDonkiFlares = async (): Promise<FlareEvent[]> => {
  try {
    const params = new URLSearchParams({ startDate: startDate(), endDate: endDate() });
    return await fetchDonki<FlareEvent>(`${DONKI_BASE}/FLR?${params}`);
  } catch (error) {
    logWarning('Error fetching donki flares:', error);
    throw error;
  }
};
