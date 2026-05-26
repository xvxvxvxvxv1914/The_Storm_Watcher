import { Preferences } from '@capacitor/preferences';

const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function persistGet<T>(key: string): Promise<T | null> {
  try {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    const parsed = JSON.parse(value) as { ts: number; data: T };
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function persistSet<T>(key: string, data: T): Promise<void> {
  try {
    await Preferences.set({ key, value: JSON.stringify({ ts: Date.now(), data }) });
  } catch {
    // storage quota exceeded or unavailable — silently ignore
  }
}
