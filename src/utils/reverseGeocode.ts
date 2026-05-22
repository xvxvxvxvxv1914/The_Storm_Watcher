const FALLBACK_NAME = 'My Location';

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) throw new Error('non-ok');
      const geo = await res.json();
      const city =
        geo.address?.city ||
        geo.address?.town ||
        geo.address?.village ||
        geo.address?.municipality ||
        '';
      const country = geo.address?.country || '';
      const name = [city, country].filter(Boolean).join(', ');
      if (name) return name;
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 800));
    }
  }
  return FALLBACK_NAME;
}
