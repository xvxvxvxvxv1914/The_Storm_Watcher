import { useEffect, useRef } from 'react';
import { useKpLive } from './useKpLive';
import { useSettings } from '../contexts/SettingsContext';
import { isNative, isIos } from '../utils/platform';
import { calcAuroraVisibility } from '../utils/auroraVisibility';
import { StormLiveActivity, type StormLiveActivityState } from '../plugins/stormLiveActivity';

const STORM_THRESHOLD = 5; // Kp ≥ 5 = G1, the point a storm becomes "watchable"

export function gLevel(kp: number): number {
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  if (kp >= 5) return 1;
  return 0;
}

/** One transition of the Live Activity towards the given state. Returns the new
 *  "is an activity live" flag. Pure of React — exported for testing. */
export async function syncLiveActivity(
  state: StormLiveActivityState,
  wasActive: boolean,
): Promise<boolean> {
  if (state.gLevel < gLevel(STORM_THRESHOLD)) {
    // Below threshold — end any running (or stale) activity.
    await StormLiveActivity.end();
    return false;
  }

  if (wasActive) {
    // The user (or the system, after its max duration) may have dismissed it.
    // `updated: false` means nothing is live, so fall through and restart.
    const { updated } = await StormLiveActivity.update(state);
    if (updated) return true;
  }

  // The native plugin can register slightly after a cold launch, so retry
  // start() a few times if the bridge isn't ready yet.
  for (let i = 0; i < 5; i++) {
    try {
      const res = await StormLiveActivity.start(state);
      return res.started;
    } catch {
      if (i < 4) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return false;
}

/**
 * Drives the iOS storm Live Activity from the live Kp feed (Phase A, app-driven).
 * Starts when Kp crosses G1, updates as it changes, ends when it drops below
 * (also clears any stale activity left from a previous storm on launch).
 * No-op on web/Android — the lock-screen UI is native iOS only.
 */
export function useStormLiveActivity() {
  const kp = useKpLive();
  const { settings } = useSettings();
  const active = useRef(false);
  // Serialize transitions: a slow start()-retry must not overlap the next Kp
  // update (which would race on `active` and could create duplicate activities).
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (kp === null || !isNative() || !isIos()) return;

    // Round once and derive everything from the rounded value, so the displayed
    // Kp, the G-level badge, and the start/stop threshold can never disagree.
    const rounded = Math.round(kp * 10) / 10;
    const lat = settings.preferredLat ?? undefined;
    const lon = settings.preferredLon ?? undefined;
    const auroraPct = lat !== undefined && lon !== undefined
      ? calcAuroraVisibility(lat, lon, rounded)
      : undefined;
    const state: StormLiveActivityState = { kp: rounded, gLevel: gLevel(rounded), auroraPct };

    queue.current = queue.current
      .then(async () => { active.current = await syncLiveActivity(state, active.current); })
      .catch(() => { /* plugin unavailable / older iOS / permission off — skip */ });
  }, [kp, settings.preferredLat, settings.preferredLon]);
}
