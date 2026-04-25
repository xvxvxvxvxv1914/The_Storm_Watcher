import type React from 'react';

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov';

// In-memory TTL cache + single-flight dedup for NOAA endpoints.
// Multiple pages mount simultaneously (Navigation + Home + Dashboard etc.),
// and each has its own setInterval — without this cache we'd hit NOAA 5-6x
// per minute per user.
type CacheEntry<T> = { ts: number; data: T };
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const cached = async <T,>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { ts: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
};

const getJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
};

export interface KpIndexData {
  time_tag: string;
  kp_index: number;
  estimated_kp?: number;
}

export interface SolarWindData {
  time_tag: string;
  proton_speed: number;
  proton_density: number;
  active: boolean;
}

export interface MagFieldData {
  time_tag: string;
  bz_gsm: number;
  bt: number;
  active: boolean;
}

export interface XrayData {
  time_tag: string;
  flux: number;
  energy: string;
}

export interface Alert {
  issue_datetime: string;
  message: string;
  product_id: string;
}

// TTLs roughly match the publish cadence of each NOAA feed.
const TTL_1M = 60_000;      // 1-min feeds
const TTL_5M = 300_000;     // slower-changing data (history, alerts)
const TTL_FORECAST = 900_000; // 15 min — forecast updates every ~3 hours

export const getKpIndex = (): Promise<KpIndexData[]> =>
  cached('kp', TTL_1M, async () => {
    try {
      return await getJson<KpIndexData[]>(`${NOAA_BASE_URL}/json/planetary_k_index_1m.json`);
    } catch (error) {
      console.error('Error fetching data in getKpIndex:', error);
      return [];
    }
  });

export const getXrayFlux = (): Promise<XrayData[]> =>
  cached('xray', TTL_1M, async () => {
    try {
      return await getJson<XrayData[]>(`${NOAA_BASE_URL}/json/goes/primary/xrays-1-day.json`);
    } catch (error) {
      console.error('Error fetching data in getXrayFlux:', error);
      return [];
    }
  });

export const getSolarWind = (): Promise<SolarWindData[]> =>
  cached('wind', TTL_1M, async () => {
    try {
      return await getJson<SolarWindData[]>(`${NOAA_BASE_URL}/json/rtsw/rtsw_wind_1m.json`);
    } catch (error) {
      console.error('Error fetching data in getSolarWind:', error);
      return [];
    }
  });

export const getMagField = (): Promise<MagFieldData[]> =>
  cached('mag', TTL_1M, async () => {
    try {
      return await getJson<MagFieldData[]>(`${NOAA_BASE_URL}/json/rtsw/rtsw_mag_1m.json`);
    } catch (error) {
      console.error('Error fetching data in getMagField:', error);
      return [];
    }
  });

export const getAlerts = (): Promise<Alert[]> =>
  cached('alerts', TTL_5M, async () => {
    try {
      return await getJson<Alert[]>(`${NOAA_BASE_URL}/products/alerts.json`);
    } catch (error) {
      console.error('Error fetching data in getAlerts:', error);
      return [];
    }
  });

export const getKpForecast = (): Promise<KpIndexData[]> =>
  cached('kp-forecast', TTL_FORECAST, async () => {
    try {
      // NOAA retired /json/planetary_k_index_forecast.json — this endpoint is the
      // current one. Shape: { time_tag, kp, observed, noaa_scale }. We only need
      // the rows where observed === 'predicted' for a true forecast view.
      const data = await getJson<Array<{ time_tag: string; kp: number; observed: string }>>(
        `${NOAA_BASE_URL}/products/noaa-planetary-k-index-forecast.json`
      );
      return (data ?? [])
        .filter((row) => row.observed === 'predicted')
        .map((row) => ({
          time_tag: row.time_tag,
          kp_index: row.kp,
        }));
    } catch (error) {
      console.error('Error fetching data in getKpForecast:', error);
      return [];
    }
  });

export interface AuroraOvationPoint {
  lng: number;
  lat: number;
  intensity: number;
}

export const getAuroraModel = (): Promise<AuroraOvationPoint[]> =>
  cached('aurora', TTL_5M, async () => {
    try {
      const data = await getJson<{ coordinates?: [number, number, number][] }>(
        `${NOAA_BASE_URL}/json/ovation_aurora_latest.json`
      );
      if (data && data.coordinates) {
        // Only keep points with intensity > 0 to optimize Globe rendering
        return data.coordinates
          .filter((c) => c[2] > 0)
          .map((c) => {
            // Normalize longitude from 0-359 to -180 to 180 for react-globe.gl
            let lng = c[0];
            if (lng > 180) lng = lng - 360;
            return { lng, lat: c[1], intensity: c[2] };
          });
      }
      return [];
    } catch (error) {
      console.error('Error fetching aurora ovation model:', error);
      return [];
    }
  });

export const getKpHistory3Day = (): Promise<{ time_tag: string; Kp: number }[]> =>
  cached('kp-history-3d', TTL_5M, async () => {
    try {
      return await getJson<{ time_tag: string; Kp: number }[]>(
        `${NOAA_BASE_URL}/products/noaa-planetary-k-index.json`
      );
    } catch (error) {
      console.error('Error fetching data in getKpHistory3Day:', error);
      return [];
    }
  });

export const getKpGradientStyle = (kp: number): React.CSSProperties => ({
  backgroundImage:
    kp >= 7 ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
    kp >= 5 ? 'linear-gradient(135deg, #f97316, #ef4444)' :
    kp >= 4 ? 'linear-gradient(135deg, #eab308, #f97316)' :
    kp >= 2 ? 'linear-gradient(135deg, #10b981, #eab308)' :
    'linear-gradient(135deg, #10b981, #059669)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

export const getStormStatus = (kp: number): { statusKey: string; color: string; bgColor: string } => {
  if (kp < 4) return { statusKey: 'storm.quiet', color: 'text-green-400', bgColor: 'bg-green-500/20' };
  if (kp < 5) return { statusKey: 'storm.unsettled', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
  if (kp < 6) return { statusKey: 'storm.g1', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
  if (kp < 7) return { statusKey: 'storm.g2', color: 'text-orange-600', bgColor: 'bg-orange-600/20' };
  return { statusKey: 'storm.g3plus', color: 'text-red-500', bgColor: 'bg-red-500/20' };
};

export const getXrayClass = (flux: number): string => {
  if (flux < 1e-8) return 'A';
  if (flux < 1e-7) return 'B';
  if (flux < 1e-6) return 'C';
  if (flux < 1e-5) return 'M';
  return 'X';
};
