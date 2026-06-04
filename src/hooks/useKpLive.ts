import { useState, useEffect } from 'react';
import { getKpIndex } from '../services/noaaApi';

// Module-level singleton — one poll, shared across all consumers.
let value: number | null = null;
let started = false;
const listeners = new Set<(kp: number | null) => void>();

function notify(kp: number | null) {
  value = kp;
  listeners.forEach(fn => fn(kp));
}

async function poll() {
  if (document.visibilityState === 'hidden') return;
  try {
    const data = await getKpIndex();
    if (!data.length) { notify(null); return; }
    const latest = data.at(-1);
    const kp = latest?.kp_index ?? latest?.estimated_kp ?? null;
    notify(typeof kp === 'number' ? kp : null);
  } catch {
    // keep previous value on error
  }
}

function start() {
  if (started) return;
  started = true;
  poll();
  setInterval(poll, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') poll();
  });
  // Refresh when Capacitor app returns to foreground (native iOS/Android)
  window.addEventListener('app-foreground', poll);
}

export function useKpLive(): number | null {
  const [kp, setKp] = useState<number | null>(value);

  useEffect(() => {
    start();
    if (value !== null) setKp(value);
    listeners.add(setKp);
    return () => { listeners.delete(setKp); };
  }, []);

  return kp;
}
