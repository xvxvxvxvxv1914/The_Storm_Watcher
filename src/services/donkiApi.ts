import { logError } from '../utils/logger';

const DONKI_BASE = import.meta.env.VITE_DONKI_BASE_URL ?? '/donki';

const fetchJson = async <T,>(url: string, timeoutMs = 10000): Promise<T> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
};

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
