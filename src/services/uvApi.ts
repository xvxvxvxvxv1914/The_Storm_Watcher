import axios from 'axios';

export interface UvHourlyData {
  time: string;
  uv_index: number;
}

export interface UvData {
  current: number;
  max: number;
  hourly: UvHourlyData[];
  timezone: string;
}

export const getUvIndex = async (lat: number, lon: number): Promise<UvData> => {
  try {
  const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: lat,
      longitude: lon,
      hourly: 'uv_index',
      daily: 'uv_index_max',
      timezone: 'auto',
      forecast_days: 1,
    },
  });

  const data = response.data;
  const now = new Date();
  const currentHour = now.getHours();

  const hourly: UvHourlyData[] = data.hourly.time.map((t: string, i: number) => ({
    time: new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    uv_index: Math.round(data.hourly.uv_index[i] * 10) / 10,
  }));

  return {
    current: data.hourly.uv_index[currentHour] ?? 0,
    max: data.daily.uv_index_max[0] ?? 0,
    hourly,
    timezone: data.timezone,
  };
  } catch (error) {
    console.error('Error fetching UV Index:', error);
    return { current: 0, max: 0, hourly: [], timezone: 'UTC' };
  }
};

export interface SunDay {
  date: string;
  sunrise: string;
  sunset: string;
  daylightSeconds: number;
  goldenMorningEnd: string;
  goldenEveningStart: string;
}

export const getSunData = async (lat: number, lon: number): Promise<SunDay[]> => {
  try {
  const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: lat,
      longitude: lon,
      daily: 'sunrise,sunset,daylight_duration',
      timezone: 'auto',
      forecast_days: 3,
    },
  });

  const { daily } = response.data;

  return daily.time.map((_: string, i: number) => {
    const sunrise = new Date(daily.sunrise[i]);
    const sunset = new Date(daily.sunset[i]);

    const goldenMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);
    const goldenEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000);

    const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return {
      date: daily.time[i],
      sunrise: fmt(sunrise),
      sunset: fmt(sunset),
      daylightSeconds: daily.daylight_duration[i],
      goldenMorningEnd: fmt(goldenMorningEnd),
      goldenEveningStart: fmt(goldenEveningStart),
    };
  });
  } catch (error) {
    console.error('Error fetching Sun Data:', error);
    return [];
  }
};

export const getUvLevel = (uv: number): { label: string; color: string; bg: string; advice: string } => {
  if (uv < 3) return { label: 'Low', color: '#10b981', bg: 'from-[#10b981] to-[#059669]', advice: 'No protection needed. Safe to be outside.' };
  if (uv < 6) return { label: 'Moderate', color: '#eab308', bg: 'from-[#eab308] to-[#ca8a04]', advice: 'Wear sunscreen SPF 30+. Seek shade during midday.' };
  if (uv < 8) return { label: 'High', color: '#f97316', bg: 'from-[#f97316] to-[#ea580c]', advice: 'Sunscreen SPF 50+, hat and sunglasses required. Limit time outdoors.' };
  if (uv < 11) return { label: 'Very High', color: '#ef4444', bg: 'from-[#ef4444] to-[#dc2626]', advice: 'Extra protection needed. Avoid sun between 10am–4pm.' };
  return { label: 'Extreme', color: '#7c3aed', bg: 'from-[#7c3aed] to-[#6d28d9]', advice: 'Stay indoors during midday. Full protection mandatory if outside.' };
};
