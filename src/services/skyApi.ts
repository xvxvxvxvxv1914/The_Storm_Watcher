import { logError } from '../utils/logger';
import { cached } from '../utils/apiCache';
import { fetchJson } from '../utils/fetchJson';
import {
  parseOpenMeteoTime, parseOpenMeteoDay, formatOpenMeteoTime, openMeteoHour,
} from '../utils/openMeteoTime';

const TTL_SKY = 30 * 60 * 1000; // 30 min

export interface NightForecast {
  label: 'tonight' | 'tomorrow' | 'nightAfter';
  date: Date;
  /**
   * null when NOAA has published no bin covering this night — which is a real
   * state, not a quiet one. Rendering it as 0.0 made the app assert "quiet"
   * about a night nobody had forecast yet; same trap as a fabricated Kp 0 from a
   * GFZ null bin, or Dst 0, both of which this codebase has already paid for.
   */
  maxKp: number | null;
  cloudCoverAvg: number | null; // null if location unknown
  isBest: boolean;
}

export interface SkyHour {
  time: string;
  isoTime: string;
  hour: number;
  cloudCover: number;
  visibility: number;
  precipProb: number;
  isNight: boolean;
}

export interface SkyData {
  verdict: 'excellent' | 'good' | 'fair' | 'poor';
  score: number; // 0-100
  cloudCoverAvg: number;
  visibilityAvg: number;
  kp: number;
  auroraChance: string;
  nightHours: SkyHour[];
  sunset: string;
  sunrise: string;
}

export interface NightWindow {
  date: Date;
  /** Mean cloud cover across the dark hours, or null when it cannot be stated. */
  cloudCoverAvg: number | null;
  /** True when the sun never sets — the reason there is no cloud figure. */
  noNight: boolean;
  /** The actual darkness window, for callers that bucket other data by it. */
  nightStart: Date | null;
  nightEnd: Date | null;
}

/**
 * The next three nights: when darkness actually falls, and how cloudy it is
 * while it lasts.
 *
 * Open-Meteo hides the polar cases inside the ordinary sunrise/sunset fields,
 * which is why they are easy to miss. Both confirmed against the live API:
 *
 *   polar day   (Tromsø, 20 Jun)     rise = D 00:00, set = D+1 00:00  → 24h day
 *   polar night (McMurdo, 13 Aug)    rise = D 00:00, set = D   00:00  →  0h day
 *
 * Taking the window as `sunset[i] → sunrise[i+1]` covers both with no special
 * case: polar night widens it to a full 24 hours, which is correct because it is
 * dark throughout, while polar day collapses it to zero length.
 *
 * That collapse used to fall through to a `100` default, which told a Tromsø
 * visitor in June the sky was **fully overcast** — when the truth was that there
 * was no night at all and the sky might be perfectly clear. It now reports null
 * with `noNight` set, so the caller can say the true thing instead.
 */
export function getNightsCloudCover(
  lat: number,
  lon: number,
): Promise<NightWindow[]> {
  return cached(`nights-cloud-${lat.toFixed(1)}-${lon.toFixed(1)}`, TTL_SKY, async () => {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'cloud_cover',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: '4',
  });
  // utc_offset_seconds is what makes these stamps readable: timezone=auto means
  // they are in the *location's* time and carry no offset, so the naked Date
  // constructor would read them in the device's zone instead. nightStart and
  // nightEnd leave this function and get compared against NOAA Kp bins, which
  // are real instants — see src/utils/openMeteoTime.ts.
  const { hourly, daily, utc_offset_seconds: tz } = await fetchJson<{
    hourly: { time: string[]; cloud_cover: number[] };
    daily: { sunrise: string[]; sunset: string[]; time: string[] };
    utc_offset_seconds: number;
  }>(`https://api.open-meteo.com/v1/forecast?${params}`);

  const nights: NightWindow[] = [];
  // Process first 3 nights: sunset[i] → sunrise[i+1]
  for (let i = 0; i < 3 && i < daily.sunset.length - 1; i++) {
    const sunset = parseOpenMeteoTime(daily.sunset[i], tz);
    const sunrise = parseOpenMeteoTime(daily.sunrise[i + 1], tz);
    const known = Number.isFinite(sunset.getTime()) && Number.isFinite(sunrise.getTime());
    // Zero-length (or inverted) window = the sun never set. Distinct from a
    // window we simply could not read, which stays "unknown" rather than
    // becoming a claim about the sky.
    const noNight = known && sunrise.getTime() <= sunset.getTime();

    const nightHours = known && !noNight
      ? hourly.time
          .map((t, idx) => ({ date: parseOpenMeteoTime(t, tz), cover: hourly.cloud_cover[idx] }))
          .filter(h => h.date >= sunset && h.date <= sunrise && Number.isFinite(h.cover))
      : [];

    nights.push({
      date: parseOpenMeteoDay(daily.time[i]),
      cloudCoverAvg: nightHours.length
        ? Math.round(nightHours.reduce((s, h) => s + h.cover, 0) / nightHours.length)
        : null,
      noNight,
      nightStart: known && !noNight ? sunset : null,
      nightEnd: known && !noNight ? sunrise : null,
    });
  }
  return nights;
  });
}

export const getSkyVisibility = (lat: number, lon: number, kp: number): Promise<SkyData> =>
  cached(`sky-${lat.toFixed(1)}-${lon.toFixed(1)}`, TTL_SKY, async () => {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly: 'cloud_cover,visibility,precipitation_probability',
      daily: 'sunrise,sunset',
      timezone: 'auto',
      forecast_days: '2',
    });
    const { hourly, daily, timezone, utc_offset_seconds: tz } = await fetchJson<{
      hourly: { time: string[]; cloud_cover: number[]; visibility: number[]; precipitation_probability: number[] };
      daily: { sunrise: string[]; sunset: string[] };
      timezone: string;
      utc_offset_seconds: number;
    }>(`https://api.open-meteo.com/v1/forecast?${params}`);

    const sunset = parseOpenMeteoTime(daily.sunset[0], tz);
    const sunrise = parseOpenMeteoTime(daily.sunrise[1], tz);

    // Get night hours (sunset today → sunrise tomorrow)
    const nightHours: SkyHour[] = hourly.time
      .map((t, i) => {
        const date = parseOpenMeteoTime(t, tz);
        const isNight = date >= sunset && date <= sunrise;
        return {
          // Both on the sky's own clock: a visitor asking about Tromsø wants
          // Tromsø's 02:00, not what their phone reads at that instant.
          time: formatOpenMeteoTime(date, timezone),
          isoTime: date.toISOString(),
          hour: openMeteoHour(t),
          cloudCover: hourly.cloud_cover[i],
          visibility: Math.round(hourly.visibility[i] / 1000), // km
          precipProb: hourly.precipitation_probability[i],
          isNight,
        };
      })
      .filter((h) => h.isNight);

    const cloudCoverAvg = nightHours.length
      ? Math.round(nightHours.reduce((s, h) => s + h.cloudCover, 0) / nightHours.length)
      : 100;

    const visibilityAvg = nightHours.length
      ? Math.round(nightHours.reduce((s, h) => s + h.visibility, 0) / nightHours.length)
      : 0;

    // Score: cloud cover weighs 60%, visibility 25%, precipitation 15%
    const cloudScore = Math.max(0, 100 - cloudCoverAvg);
    const visScore = Math.min(100, (visibilityAvg / 20) * 100);
    const precipScore = nightHours.length
      ? Math.max(0, 100 - nightHours.reduce((s, h) => s + h.precipProb, 0) / nightHours.length)
      : 0;

    const score = Math.round(cloudScore * 0.6 + visScore * 0.25 + precipScore * 0.15);

    const verdict: SkyData['verdict'] =
      score >= 75 ? 'excellent' :
      score >= 50 ? 'good' :
      score >= 25 ? 'fair' : 'poor';

    const auroraChance =
      kp >= 7 ? 'Very High' :
      kp >= 5 ? 'High' :
      kp >= 4 ? 'Moderate' :
      kp >= 3 ? 'Low' : 'Very Low';

    const fmtTime = (d: Date) => formatOpenMeteoTime(d, timezone);

    return {
      verdict,
      score,
      cloudCoverAvg,
      visibilityAvg,
      kp,
      auroraChance,
      nightHours,
      sunset: fmtTime(sunset),
      sunrise: fmtTime(sunrise),
    };
  } catch (error) {
    logError('Error fetching Sky Visibility:', error);
    return {
      verdict: 'poor',
      score: 0,
      cloudCoverAvg: 100,
      visibilityAvg: 0,
      kp,
      auroraChance: '-',
      nightHours: [],
      sunset: '-',
      sunrise: '-',
    };
  }
});
