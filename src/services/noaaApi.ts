import type React from 'react';

import { fetchJson } from '../utils/fetchJson';
import { logWarning } from '../utils/logger';
import { persistGet, persistSet } from '../utils/offlineCache';
import { isNative } from '../utils/platform';

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov';

// In-memory TTL cache + single-flight dedup for NOAA endpoints.
// Multiple pages mount simultaneously (Navigation + Home + Dashboard etc.),
// and each has its own setInterval — without this cache we'd hit NOAA 5-6x
// per minute per user.
type CacheEntry<T> = { ts: number; data: T };
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

// `cacheIf` lets a caller refuse to cache a result (e.g. an empty array from a
// failed fetch). Without it, a single failed Kp fetch would freeze an empty
// result for the whole TTL (15 min for forecasts) and defeat any retry — one of
// the root causes of the homepage "Failed to load data" bug.
const cached = async <T,>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  cacheIf?: (data: T) => boolean,
): Promise<T> => {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      if (!cacheIf || cacheIf(data)) cache.set(key, { ts: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
};

const nonEmpty = (data: unknown): boolean => Array.isArray(data) && data.length > 0;

const getJson = <T,>(url: string, timeoutMs = 10000, retries = 1): Promise<T> =>
  fetchJson<T>(url, timeoutMs, retries);

export interface KpIndexData {
  time_tag: string;
  kp_index: number;
  estimated_kp?: number;
}

/**
 * The Kp value of a row: `kp_index` (the 3-hour bin, what GFZ publishes) first,
 * `estimated_kp` (NOAA's per-minute estimate) only as a backstop. See
 * `kpSource.contract.json` — this ordering is the contract the widgets and the
 * alert cron also follow.
 *
 * It exists because the same expression was written out at nine call sites in
 * three different forms, and two of them used `||`, which treats a real
 * ultra-quiet **Kp 0.0 as missing** and silently falls through to the estimate.
 * Returns null when the row carries neither field; callers that need a number
 * apply their own `?? 0`.
 */
export const resolveKp = (row?: Pick<KpIndexData, 'kp_index' | 'estimated_kp'> | null): number | null =>
  row?.kp_index ?? row?.estimated_kp ?? null;

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
// Native calls GFZ directly (CapacitorHttp bypasses WKWebView CORS).
// Web uses the /api/gfz serverless function — simple rewrite was blocked by GFZ.
const GFZ_BASE = isNative() ? 'https://kp.gfz.de/app/json/' : '/api/gfz';

interface GfzResponse {
  datetime: string[];
  // Trailing bins are null until GFZ publishes the period — see getKpIndex.
  Kp: (number | null)[];
  status: string[];
}

const toGfzDate = (d: Date) => d.toISOString().split('.')[0] + 'Z';

// Single shared fetch + cache for both getKpIndex and getKpHistory3Day.
// Fetches 7 days to cover the "Last 7 Days" bar chart in Dashboard.
const getGfzKp3Day = (): Promise<GfzResponse> =>
  cached('gfz-kp', TTL_FORECAST, async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url = `${GFZ_BASE}?start=${encodeURIComponent(toGfzDate(start))}&end=${encodeURIComponent(toGfzDate(end))}&index=Kp`;
    // Hard timeout so a cold-starting /api/gfz serverless function fails fast and
    // lets getKpIndex() fall back to NOAA, instead of hanging the homepage's Kp
    // poll indefinitely (a raw fetch has no timeout). The poll layer retries.
    return fetchJson<GfzResponse>(url, 8000);
  });

export const getKpIndex = (): Promise<KpIndexData[]> =>
  cached('kp', TTL_FORECAST, async () => {
    try {
      const data = await getGfzKp3Day();
      // Drop the bins GFZ has not published yet. They arrive as null, and
      // mapping them to 0 put a fake "Kp 0.0" at the end of the series —
      // indistinguishable from a genuine ultra-quiet reading, and disagreeing
      // with both widgets, which skip back to the last real bin (KpSource.swift
      // and KpSource.kt do exactly that).
      const result = (data.datetime ?? []).flatMap((dt, i) => {
        const kp = data.Kp?.[i];
        return typeof kp === 'number' && kp >= 0
          ? [{ time_tag: dt.replace('Z', ''), kp_index: kp }]
          : [];
      });
      persistSet('offline_kp', result).catch(() => {});
      return result;
    } catch {
      console.warn('GFZ Kp unavailable, falling back to NOAA');
      try {
        const result = await getJson<KpIndexData[]>(`${NOAA_BASE_URL}/json/planetary_k_index_1m.json`);
        persistSet('offline_kp', result).catch(() => {});
        return result;
      } catch (error) {
        logWarning('NOAA Kp fallback failed:', error);
        const cached_offline = await persistGet<KpIndexData[]>('offline_kp');
        return cached_offline ?? [];
      }
    }
  }, nonEmpty);

export const getXrayFlux = (): Promise<XrayData[]> =>
  cached('xray', TTL_1M, async () => {
    try {
      const result = await getJson<XrayData[]>(`${NOAA_BASE_URL}/json/goes/primary/xrays-1-day.json`);
      persistSet('offline_xray', result).catch(() => {});
      return result;
    } catch (error) {
      logWarning('Error fetching data in getXrayFlux:', error);
      const cached_offline = await persistGet<XrayData[]>('offline_xray');
      return cached_offline ?? [];
    }
  });

// NOAA's rtsw endpoints return points in descending order (newest first), unlike
// most other feeds. Sorting at the service boundary keeps every consumer simple:
// data[data.length - 1] is the latest point and lightweight-charts gets the
// ascending input it requires.
const ascByTime = <T extends { time_tag: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime());

export const getSolarWind = (): Promise<SolarWindData[]> =>
  cached('wind', TTL_1M, async () => {
    try {
      const data = await getJson<SolarWindData[]>(`${NOAA_BASE_URL}/json/rtsw/rtsw_wind_1m.json`);
      const result = ascByTime(data ?? []);
      persistSet('offline_wind', result).catch(() => {});
      return result;
    } catch (error) {
      logWarning('Error fetching data in getSolarWind:', error);
      const cached_offline = await persistGet<SolarWindData[]>('offline_wind');
      return cached_offline ?? [];
    }
  });

// Single source of truth for "current solar wind speed". The rtsw feed's
// trailing samples are frequently flagged active:false (not yet validated), so
// the newest *active* sample is the right one to show. Home and Dashboard MUST
// use this same selection or they display different numbers for the same feed
// (Home previously took the raw last sample → mismatched the Dashboard).
export const latestSolarWindSpeed = (data: SolarWindData[] | null | undefined): number => {
  if (!data || data.length === 0) return 0;
  // Newest active sample *that carries a reading*. Any sample can be missing a
  // speed — null in the feed, or the NaN repaired into one by fetchJson — and
  // stopping at the newest active row only to find it empty threw away the
  // 3589 good ones behind it. Falls back to the newest usable sample of any
  // kind, then to 0.
  const usable = (d: SolarWindData) => Number.isFinite(d.proton_speed) && d.proton_speed > 0;
  const row = data.findLast(d => d.active && usable(d)) ?? data.findLast(usable);
  return row?.proton_speed ?? 0;
};

export const getMagField = (): Promise<MagFieldData[]> =>
  cached('mag', TTL_1M, async () => {
    try {
      const data = await getJson<MagFieldData[]>(`${NOAA_BASE_URL}/json/rtsw/rtsw_mag_1m.json`);
      const result = ascByTime(data ?? []);
      persistSet('offline_mag', result).catch(() => {});
      return result;
    } catch (error) {
      logWarning('Error fetching data in getMagField:', error);
      const cached_offline = await persistGet<MagFieldData[]>('offline_mag');
      return cached_offline ?? [];
    }
  });

export const getAlerts = (): Promise<Alert[]> =>
  cached('alerts', TTL_5M, async () => {
    try {
      const result = await getJson<Alert[]>(`${NOAA_BASE_URL}/products/alerts.json`);
      persistSet('offline_alerts', result).catch(() => {});
      return result;
    } catch (error) {
      logWarning('Error fetching data in getAlerts:', error);
      const cached_offline = await persistGet<Alert[]>('offline_alerts');
      return cached_offline ?? [];
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
      const result = (data ?? [])
        .filter((row) => row.observed === 'predicted')
        .map((row) => ({
          time_tag: row.time_tag,
          kp_index: row.kp,
        }));
      persistSet('offline_kp_forecast', result).catch(() => {});
      return result;
    } catch (error) {
      logWarning('Error fetching data in getKpForecast:', error);
      const cached_offline = await persistGet<KpIndexData[]>('offline_kp_forecast');
      return cached_offline ?? [];
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
      logWarning('Error fetching aurora ovation model:', error);
      return [];
    }
  });

export const getKpHistory3Day = (): Promise<{ time_tag: string; Kp: number }[]> =>
  cached('kp-history-3d', TTL_FORECAST, async () => {
    try {
      const data = await getGfzKp3Day();
      return (data.datetime ?? []).map((dt: string, i: number) => ({
        time_tag: dt.replace('Z', ''),
        Kp: data.Kp[i] ?? 0,
      }));
    } catch {
      console.warn('GFZ Kp history unavailable, falling back to NOAA');
      try {
        return await getJson<{ time_tag: string; Kp: number }[]>(
          `${NOAA_BASE_URL}/products/noaa-planetary-k-index.json`
        );
      } catch (error) {
        logWarning('NOAA Kp history fallback failed:', error);
        return [];
      }
    }
  }, nonEmpty);

// Colour bands must mirror the KpGauge ZONES (the single source of truth):
// green <4 calm, yellow 4–5 active, orange 5–7 storm, red 7–9 severe.
export const getKpGradientStyle = (kp: number): React.CSSProperties => ({
  backgroundImage:
    kp >= 7 ? 'linear-gradient(135deg, #ef4444, #dc2626)' :   // G3–G5 severe
    kp >= 5 ? 'linear-gradient(135deg, #f97316, #ea580c)' :   // G1–G2 storm
    kp >= 4 ? 'linear-gradient(135deg, #eab308, #ca8a04)' :   // active
    'linear-gradient(135deg, #10b981, #059669)',              // calm
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

export interface WeatherData {
  cloudCover: number;
  temperature: number;
  weatherCode: number;
}

interface OpenMeteoCurrentResponse {
  current: {
    cloud_cover: number;
    temperature_2m: number;
    weather_code: number;
  };
}

export const getWeatherData = (lat: number, lon: number): Promise<WeatherData | null> =>
  cached(`weather-${lat}-${lon}`, TTL_5M, async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,weather_code&timezone=auto`;
      const data = await getJson<OpenMeteoCurrentResponse>(url);
      if (data && data.current) {
        return {
          cloudCover: data.current.cloud_cover,
          temperature: data.current.temperature_2m,
          weatherCode: data.current.weather_code,
        };
      }
      return null;
    } catch (error) {
      logWarning('Error fetching weather data:', error);
      return null;
    }
  });

export interface DayOutlook {
  date: Date;
  radioFlux: number;
  apIndex: number;
  largestKp: number;
}

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export const get27DayOutlook = (): Promise<DayOutlook[]> =>
  cached('outlook-27d', TTL_FORECAST, async () => {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/text/27-day-outlook.txt', { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return [];
      const text = await res.text();
      const rows: DayOutlook[] = [];
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || trimmed.startsWith('#')) continue;
        // Format: "2026 May 18     105          21          5"
        const m = trimmed.match(/^(\d{4})\s+(\w+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
        if (!m) continue;
        const year = parseInt(m[1], 10);
        const month = MONTH_MAP[m[2]];
        if (month === undefined) continue;
        const day = parseInt(m[3], 10);
        const date = new Date(year, month, day);
        rows.push({
          date,
          radioFlux: parseInt(m[4], 10),
          apIndex: parseInt(m[5], 10),
          largestKp: parseInt(m[6], 10),
        });
      }
      return rows;
    } catch (error) {
      logWarning('Error fetching 27-day outlook:', error);
      return [];
    }
  });

export interface SpaceWeatherOutlook {
  issuedAt: string;
  days: string[]; // e.g. ["May 14", "May 15", "May 16"]
  geomag: {
    rationale: string;
  };
  solarRad: {
    s1Pct: number[]; // % per day
    rationale: string;
  };
  radioBlackout: {
    r1r2Pct: number[]; // % per day
    r3Pct: number[];
    rationale: string;
  };
}

export const getSpaceWeatherOutlook = (): Promise<SpaceWeatherOutlook | null> =>
  cached('outlook', TTL_FORECAST, async () => {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/text/3-day-forecast.txt', { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const text = await res.text();

      // Issued timestamp
      const issuedMatch = text.match(/:Issued:\s*(.+)/);
      const issuedAt = issuedMatch ? issuedMatch[1].trim() : '';

      // Extract day headers from the Kp table (e.g. "May 14  May 15  May 16")
      const dayHeaderMatch = text.match(/(\w+ \d+)\s+(\w+ \d+)\s+(\w+ \d+)/);
      const days = dayHeaderMatch ? [dayHeaderMatch[1], dayHeaderMatch[2], dayHeaderMatch[3]] : [];

      // --- Section A: Geomagnetic rationale ---
      const geomagRationale = extractRationale(text, 'A.');

      // --- Section B: Solar Radiation ---
      const s1Match = text.match(/S1 or greater\s+([\d]+)%\s+([\d]+)%\s+([\d]+)%/);
      const s1Pct = s1Match ? [+s1Match[1], +s1Match[2], +s1Match[3]] : [0, 0, 0];
      const solarRationale = extractRationale(text, 'B.');

      // --- Section C: Radio Blackout ---
      const r1r2Match = text.match(/R1-R2\s+([\d]+)%\s+([\d]+)%\s+([\d]+)%/);
      const r3Match = text.match(/R3 or greater\s+([\d]+)%\s+([\d]+)%\s+([\d]+)%/);
      const r1r2Pct = r1r2Match ? [+r1r2Match[1], +r1r2Match[2], +r1r2Match[3]] : [0, 0, 0];
      const r3Pct = r3Match ? [+r3Match[1], +r3Match[2], +r3Match[3]] : [0, 0, 0];
      const radioRationale = extractRationale(text, 'C.');

      return {
        issuedAt,
        days,
        geomag: { rationale: geomagRationale },
        solarRad: { s1Pct, rationale: solarRationale },
        radioBlackout: { r1r2Pct, r3Pct, rationale: radioRationale },
      };
    } catch (error) {
      logWarning('Error fetching space weather outlook:', error);
      return null;
    }
  });

function extractRationale(text: string, section: string): string {
  // Find the section, then find "Rationale:" within it, up to the next section or end
  const sectionIdx = text.indexOf(`\n${section}`);
  if (sectionIdx === -1) return '';
  const nextSectionIdx = text.indexOf('\n' + String.fromCharCode(section.charCodeAt(0) + 1) + '.', sectionIdx + 1);
  const chunk = nextSectionIdx === -1 ? text.slice(sectionIdx) : text.slice(sectionIdx, nextSectionIdx);
  const rationaleMatch = chunk.match(/Rationale:\s*([\s\S]+?)(?:\n\n|\n[A-Z]\.|$)/);
  return rationaleMatch ? rationaleMatch[1].trim().replace(/\n/g, ' ') : '';
}
