export interface SkyHour {
  time: string;
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

export const getSkyVisibility = async (lat: number, lon: number, kp: number): Promise<SkyData> => {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly: 'cloud_cover,visibility,precipitation_probability',
      daily: 'sunrise,sunset',
      timezone: 'auto',
      forecast_days: '2',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { hourly, daily } = await res.json();

    const sunset = new Date(daily.sunset[0]);
    const sunrise = new Date(daily.sunrise[1]);

    // Get night hours (sunset today → sunrise tomorrow)
    const nightHours: SkyHour[] = hourly.time
      .map((t: string, i: number) => {
        const date = new Date(t);
        const isNight = date >= sunset && date <= sunrise;
        return {
          time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          hour: date.getHours(),
          cloudCover: hourly.cloud_cover[i],
          visibility: Math.round(hourly.visibility[i] / 1000), // km
          precipProb: hourly.precipitation_probability[i],
          isNight,
        };
      })
      .filter((h: SkyHour) => h.isNight);

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

    const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

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
    console.error('Error fetching Sky Visibility:', error);
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
};
