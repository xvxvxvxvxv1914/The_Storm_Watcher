import { useEffect, useState } from 'react';
import { getKpForecast } from '../services/noaaApi';
import { gLevel } from './useStormLiveActivity';
import { peakOutlook, outlookToken, type StormOutlook } from '../utils/stormOutlook';

/**
 * Live view of "a storm is coming", shared by the banner that renders it and by
 * App.tsx, which has to reserve the same strip of screen for it.
 *
 * A module-level singleton rather than a per-component fetch, for the reason
 * useKpLive is one: two consumers means two intervals otherwise, and the
 * dismissal has to be the *same* dismissal in both — a visitor closing the
 * banner while `<main>` keeps its top padding would leave a bare gap.
 */

const POLL_MS = 30 * 60 * 1000; // NOAA reissues ~3x/day; getKpForecast caches 15 min
const DISMISS_KEY = 'tsw_outlook_dismissed';

export interface StormOutlookState {
  /** The forecast peak, or null when the next three days stay below G1. */
  outlook: StormOutlook | null;
  /** True once the visitor has dismissed *this* outlook (see outlookToken). */
  dismissed: boolean;
  /** What the UI should act on: there is a warning and it has not been waved off. */
  visible: boolean;
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null; // private mode — the banner simply cannot be remembered as dismissed
  }
}

let outlook: StormOutlook | null = null;
let dismissedToken: string | null = readDismissed();
let started = false;

const listeners = new Set<(s: StormOutlookState) => void>();

const tokenOf = (o: StormOutlook | null): string | null =>
  o ? outlookToken(o, gLevel(o.kp)) : null;

function snapshot(): StormOutlookState {
  const token = tokenOf(outlook);
  const dismissed = token !== null && token === dismissedToken;
  return { outlook, dismissed, visible: outlook !== null && !dismissed };
}

function notify() {
  const s = snapshot();
  listeners.forEach(fn => fn(s));
}

async function poll() {
  if (document.visibilityState === 'hidden') return;
  const rows = await getKpForecast();
  // getKpForecast swallows its own errors and returns [] — and its TTL cache
  // does not exclude empties, so a single NOAA outage would otherwise blank a
  // live warning for 15 minutes. No rows is no news: keep what we last knew.
  if (rows.length === 0) return;

  const next = peakOutlook(rows);
  // Compare by token so an unchanged re-fetch does not re-render every consumer
  // (the object identity differs on every poll — `at` is a fresh Date).
  if (tokenOf(next) === tokenOf(outlook)) return;
  outlook = next;
  notify();
}

function start() {
  if (started) return;
  started = true;
  poll();
  setInterval(poll, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') poll();
  });
  window.addEventListener('app-foreground', poll);
}

/** Wave off the current outlook. Persisted, so it survives a reload. */
export function dismissOutlook() {
  const token = tokenOf(outlook);
  if (!token) return;
  dismissedToken = token;
  try {
    localStorage.setItem(DISMISS_KEY, token);
  } catch {
    // private mode / quota — the dismissal holds for this session only
  }
  notify();
}

export function useStormOutlook(): StormOutlookState {
  const [state, setState] = useState<StormOutlookState>(snapshot);

  useEffect(() => {
    start();
    setState(snapshot());
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  return state;
}
