import axios from 'axios';

const DONKI_BASE = '/donki';

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
    const response = await axios.get(`${DONKI_BASE}/CME`, {
      params: { startDate: startDate(), endDate: endDate() },
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching donki cme:', error);
    return [];
  }
};

export const getDonkiFlares = async (): Promise<FlareEvent[]> => {
  try {
    const response = await axios.get(`${DONKI_BASE}/FLR`, {
      params: { startDate: startDate(), endDate: endDate() },
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching donki flares:', error);
    return [];
  }
};
