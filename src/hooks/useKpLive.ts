import { useState, useEffect } from 'react';
import { getKpIndex } from '../services/noaaApi';

// Status of the live Kp poll, so the UI can tell "still loading" apart from
// "genuinely failed". The old hook only exposed `number | null`, which forced
// the homepage to infer failure from an *unrelated* loading flag — that race is
// what produced the spurious "Failed to load data" card on first paint.
export type KpStatus = 'loading' | 'ready' | 'error';

export interface KpLiveState {
  kp: number | null;
  status: KpStatus;
  /** True when the shown value comes from cache and hasn't been confirmed by a
   *  live fetch yet (drives the subtle "data may be delayed" hint). */
  stale: boolean;
}

// Last-known Kp persisted to localStorage so a cold load can paint a real number
// immediately instead of a blank screen while the (sometimes cold-starting) GFZ
// serverless function responds. We read it *synchronously* at module load —
// Capacitor Preferences (used by the offline cache) is async and would miss the
// very first render, which is exactly the frame the bug showed.
const LS_KEY = 'tsw_last_kp';
const SEED_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h — Kp updates every ~3h

interface PersistedKp { kp: number; ts: number }

function readPersisted(): PersistedKp | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedKp;
    if (typeof parsed.kp !== 'number' || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > SEED_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(kp: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ kp, ts: Date.now() }));
  } catch {
    // private mode / quota exceeded — non-critical
  }
}

const seed = readPersisted();

// Module-level singleton — one poll, shared across all consumers.
let value: number | null = seed?.kp ?? null;
let status: KpStatus = seed ? 'ready' : 'loading';
let stale = seed !== null; // a seeded value is unconfirmed until the first live fetch
let started = false;

const listeners = new Set<(s: KpLiveState) => void>();

function snapshot(): KpLiveState {
  return { kp: value, status, stale };
}

function notify() {
  const s = snapshot();
  listeners.forEach(fn => fn(s));
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function poll() {
  if (document.visibilityState === 'hidden') return;

  // While we have nothing to show, reflect the in-flight fetch as loading so the
  // UI renders a skeleton — and a manual retry clears any prior error state.
  if (value === null && status !== 'loading') {
    status = 'loading';
    notify();
  }

  // Automatic retry with exponential backoff (≈0.5s → 1s → 2s) BEFORE we ever
  // surface an error. getKpIndex() already falls back GFZ → NOAA → offline and
  // no longer caches empty failures, so each attempt is a genuine re-fetch.
  // The common failure here is a Vercel cold-start of /api/gfz that the very
  // next attempt clears — so the user never sees the error card for it.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await getKpIndex();
      const latest = data.at(-1);
      const kp = latest?.kp_index ?? latest?.estimated_kp ?? null;
      if (typeof kp === 'number') {
        value = kp;
        status = 'ready';
        stale = false;
        writePersisted(kp);
        notify();
        return;
      }
      // Empty/invalid payload — treat as a failed attempt and retry.
    } catch {
      // network/timeout — fall through to backoff
    }
    if (attempt < 2) await sleep(500 * 2 ** attempt);
  }

  // Every retry failed. Prefer keeping a cached value (flagged stale) over
  // blanking the UI; only report a hard error when we have nothing to show.
  if (value !== null) {
    stale = true;
    status = 'ready';
  } else {
    status = 'error';
  }
  notify();
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

/** Force an immediate re-poll (e.g. the homepage "Retry" button). */
export function refreshKp() {
  poll();
}

/** Full live-Kp state (value + loading/error status + staleness). */
export function useKpLiveState(): KpLiveState {
  const [state, setState] = useState<KpLiveState>(snapshot);

  useEffect(() => {
    start();
    setState(snapshot());
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  return state;
}

/** Back-compat: just the current Kp value (null until first successful fetch). */
export function useKpLive(): number | null {
  return useKpLiveState().kp;
}
