import { logWarning } from '../utils/logger';
import { isNative as getNative } from '../utils/platform';
import { persistGet, persistSet } from '../utils/offlineCache';
import { cached } from '../utils/apiCache';

export interface NigggDataPoint {
  time: number;
  value: number;
}

export interface NigggDataSet {
  hComponent: NigggDataPoint[];
  fComponent: NigggDataPoint[];
}

export interface NigggStormStatus {
  label: 'CALM' | 'DISTURBED' | 'STORM';
  color: string;
  bg: string;
  descKey: string;
  detailKey: string;
  humanEffectKey: string;
  minDelta: number;
}

export const toDeltaSeries = (pts: NigggDataPoint[]): NigggDataPoint[] => {
  if (pts.length === 0) return [];
  // H component is highest during quiet conditions and drops during storms.
  // Use the 90th percentile as baseline so past storm data doesn't pull
  // the mean down and cause false positives.
  const sorted = [...pts].sort((a, b) => b.value - a.value);
  const baseline = sorted[Math.floor(sorted.length * 0.10)]?.value
    ?? (pts.reduce((s, p) => s + p.value, 0) / pts.length);
  return pts.map(p => ({ time: p.time, value: Number((p.value - baseline).toFixed(2)) }));
};

export const getNigggStormStatus = (minDelta: number): NigggStormStatus => {
  if (minDelta < -100) return {
    label: 'STORM', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/30',
    descKey: 'niggg.storm.desc',
    detailKey: 'niggg.storm.detail',
    humanEffectKey: 'niggg.storm.humanEffect',
    minDelta,
  };
  if (minDelta < -30) return {
    label: 'DISTURBED', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/30',
    descKey: 'niggg.disturbed.desc',
    detailKey: 'niggg.disturbed.detail',
    humanEffectKey: 'niggg.disturbed.humanEffect',
    minDelta,
  };
  return {
    label: 'CALM', color: '#10b981', bg: 'bg-emerald-500/10 border-emerald-500/30',
    descKey: 'niggg.calm.desc',
    detailKey: 'niggg.calm.detail',
    humanEffectKey: 'niggg.calm.humanEffect',
    minDelta,
  };
};


// On native (Capacitor iOS/Android) CapacitorHttp bypasses CORS so we can call
// the endpoint directly. On web we go through the Vercel serverless proxy.
const NIGGG_BASE = getNative()
  ? 'https://pagmag.ngic.bg/assets/php/datacalendar26.php'
  : '/api/niggg';

const TTL_NIGGG = 10 * 60 * 1000; // 10 min

export const fetchNigggData = (): Promise<NigggDataSet> =>
  cached('niggg', TTL_NIGGG, async () => {
  try {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const formatDate = (date: Date) => {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    };

    const start = formatDate(threeDaysAgo);
    const end   = formatDate(today);

    const url = `${NIGGG_BASE}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`NIGGG fetch failed: ${res.status}`);
    }

    const text = await res.text();
    if (!text.trim()) return { hComponent: [], fComponent: [] };

    const json = JSON.parse(text) as {
      x: string[];
      h: number[];
      f: number[];
      start: string;
      end: string;
    };

    if (!json.h || !json.f || !json.start) return { hComponent: [], fComponent: [] };

    // Parse start date (DD-MM-YYYY) to get base UTC midnight timestamp
    const [dd, mm, yyyy] = json.start.split('-').map(Number);
    const baseTs = Math.floor(Date.UTC(yyyy, mm - 1, dd) / 1000);

    const INVALID = 1e300;
    const hComponent: NigggDataPoint[] = [];
    const fComponent: NigggDataPoint[] = [];

    // Data is 1440 points per day (one per minute).
    // Each day starts at UTC midnight of (baseDate + dayIndex).
    json.h.forEach((hVal, i) => {
      const dayIdx = Math.floor(i / 1440);
      const minuteOfDay = i % 1440;
      const timestamp = baseTs + dayIdx * 86400 + minuteOfDay * 60;

      if (hVal !== null && hVal !== undefined && Math.abs(hVal) < INVALID) {
        hComponent.push({ time: timestamp, value: Number(hVal.toFixed(2)) });
      }

      const fVal = json.f[i];
      if (fVal !== null && fVal !== undefined && Math.abs(fVal) < INVALID) {
        fComponent.push({ time: timestamp, value: Number(fVal.toFixed(2)) });
      }
    });

    const result = { hComponent, fComponent };
    persistSet('offline_niggg', result).catch(() => {});
    return result;
  } catch (error) {
    // External NIGGG endpoint is intermittently flaky (404/timeout); this is
    // handled (falls back to cached/empty) so report at warning level, not error.
    logWarning('Error fetching NIGGG data:', error);
    const offline = await persistGet<NigggDataSet>('offline_niggg');
    return offline ?? { hComponent: [], fComponent: [] };
  }
});
