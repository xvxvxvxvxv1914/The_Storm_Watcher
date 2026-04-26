import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tsw-onboarding-seen';

const readSeen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
};

export const useOnboarding = () => {
  const [seen, setSeenState] = useState<boolean>(readSeen);

  // Cross-tab sync — if Settings clears the flag in another tab, this tab
  // should pick up the change without a reload.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSeenState(readSeen());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* localStorage disabled — accept the loss */ }
    setSeenState(true);
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* same */ }
    setSeenState(false);
  }, []);

  return { seen, markSeen, reset };
};
