import type React from 'react';
import axios from 'axios';

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov';

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

export const getKpIndex = async (): Promise<KpIndexData[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/json/planetary_k_index_1m.json`);
  return response.data;
};

export const getXrayFlux = async (): Promise<XrayData[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/json/goes/primary/xrays-1-day.json`);
  return response.data;
};

export const getSolarWind = async (): Promise<SolarWindData[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/json/rtsw/rtsw_wind_1m.json`);
  return response.data;
};

export const getMagField = async (): Promise<MagFieldData[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/json/rtsw/rtsw_mag_1m.json`);
  return response.data;
};

export const getAlerts = async (): Promise<Alert[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/products/alerts.json`);
  return response.data;
};

export const getKpForecast = async (): Promise<KpIndexData[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/json/planetary_k_index_forecast.json`);
  return response.data;
};

export const getKpHistory3Day = async (): Promise<{ time_tag: string; Kp: number }[]> => {
  const response = await axios.get(`${NOAA_BASE_URL}/products/noaa-planetary-k-index.json`);
  return response.data;
};

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
