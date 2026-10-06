import { useEffect, useState } from 'react';
import { getCommunityPulse, type CommunityPulse } from '../services/communityPulse';
import { logWarning } from '../utils/logger';

export function useCommunityPulse(refreshKey = 0) {
  const [data, setData] = useState<CommunityPulse | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let request: AbortController | null = null;
    let disposed = false;
    const refresh = async () => {
      if (disposed || request) return;
      const ctrl = new AbortController();
      request = ctrl;
      try {
        const next = await getCommunityPulse(ctrl.signal);
        if (!ctrl.signal.aborted) { setData(next); setFetchedAt(Date.now()); setError(false); }
      } catch (err) {
        if (!ctrl.signal.aborted) { setError(true); logWarning('Error fetching pulse (non-critical):', err); }
      } finally {
        if (request === ctrl) request = null;
      }
    };
    void refresh();
    const poll = setInterval(() => { if (document.visibilityState !== 'hidden') void refresh(); }, 60000);
    window.addEventListener('online', refresh);
    return () => {
      disposed = true;
      request?.abort();
      clearInterval(poll);
      window.removeEventListener('online', refresh);
    };
  }, [refreshKey]);
  return { data, error, fetchedAt };
}
