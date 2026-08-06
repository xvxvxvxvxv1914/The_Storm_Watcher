import { fetchJson } from './fetchJson';

const FALLBACK_NAME = 'My Location';

type NominatimReverse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
};

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    // Nominatim is a free, rate-limited public service — a bare fetch() here had
    // no timeout at all, so a stalled response left the promise pending forever.
    const geo = await fetchJson<NominatimReverse>(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      8000,
      1,
      { 'Accept-Language': 'en' },
    );
    const city =
      geo.address?.city ||
      geo.address?.town ||
      geo.address?.village ||
      geo.address?.municipality ||
      '';
    const country = geo.address?.country || '';
    const name = [city, country].filter(Boolean).join(', ');
    // An empty name is not a transient failure — the same query returns the same
    // answer, so there is nothing to retry.
    if (name) return name;
  } catch { /* network/parse failure — fall through to the generic label */ }
  return FALLBACK_NAME;
}
