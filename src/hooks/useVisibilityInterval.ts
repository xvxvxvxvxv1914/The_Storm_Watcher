import { useEffect, useRef } from 'react';

/**
 * Like setInterval, but pauses automatically when the page is hidden
 * (tab in background / app backgrounded on mobile).
 */
export function useVisibilityInterval(callback: () => void, delayMs: number) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (delayMs <= 0) return;

    const tick = () => savedCallback.current();
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') tick();
    }, delayMs);

    return () => clearInterval(id);
  }, [delayMs]);
}
