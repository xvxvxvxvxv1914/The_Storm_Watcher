import { fetchJson } from '../utils/fetchJson';
import { logError } from '../utils/logger';
import { isNative } from '../utils/platform';

// `/donki` is a Vercel rewrite, so it only exists on the web. On native it
// resolved against the Capacitor origin (capacitor://localhost/donki) and 404'd
// on every call — CME and flare lists were silently empty on iOS and Android.
// CapacitorHttp bypasses CORS there, so go straight to the upstream, the same
// way nigggApi does.
const DONKI_UPSTREAM = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get';

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

export const getDonkiCme = async (): Promise<CmeEvent[]> => {
  try {
    const params = new URLSearchParams({ startDate: startDate(), endDate: endDate() });
    return await fetchJson<CmeEvent[]>(`${DONKI_BASE}/CME?${params}`) || [];
  } catch (error) {
    logError('Error fetching donki cme:', error);
    return [];
  }
};

export const getDonkiFlares = async (): Promise<FlareEvent[]> => {
  try {
    const params = new URLSearchParams({ startDate: startDate(), endDate: endDate() });
    return await fetchJson<FlareEvent[]>(`${DONKI_BASE}/FLR?${params}`) || [];
  } catch (error) {
    logError('Error fetching donki flares:', error);
    return [];
  }
};
