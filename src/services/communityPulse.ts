import { supabase } from '../lib/supabase';

export interface CommunityPulse { mood: string; symptom: string; count: number }

export async function getCommunityPulse(signal: AbortSignal): Promise<CommunityPulse | null> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    const ctrl = new AbortController();
    const cancel = () => ctrl.abort();
    signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 10000);
    try {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data, error, status } = await supabase.from('mood_entries')
        .select('mood_type, symptoms').gte('created_at', since).abortSignal(ctrl.signal);
      signal.throwIfAborted();
      if (error) {
        const transient = status === 0 || status >= 500 ||
          /Failed to fetch|Load failed|NetworkError|AbortError|TimeoutError/i.test(error.message);
        if (attempt === 0 && transient) continue;
        throw error;
      }
      if (!data?.length) return null;
      const moods: Record<string, number> = {};
      const symptoms: Record<string, number> = {};
      for (const entry of data) {
        moods[entry.mood_type] = (moods[entry.mood_type] ?? 0) + 1;
        for (const symptom of entry.symptoms ?? []) symptoms[symptom] = (symptoms[symptom] ?? 0) + 1;
      }
      const mostCommon = (counts: Record<string, number>) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      return { mood: mostCommon(moods) ?? 'neutral', symptom: mostCommon(symptoms) ?? '', count: data.length };
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    }
  }
}
