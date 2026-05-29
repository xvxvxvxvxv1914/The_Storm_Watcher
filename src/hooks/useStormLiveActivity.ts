import { useEffect, useRef } from 'react';
import { useKpLive } from './useKpLive';
import { useSettings } from '../contexts/SettingsContext';
import { isNative, isIos } from '../utils/platform';
import { calcAuroraVisibility } from '../utils/auroraVisibility';
import { StormLiveActivity } from '../plugins/stormLiveActivity';

const STORM_THRESHOLD = 5; // Kp ≥ 5 = G1, the point a storm becomes "watchable"

function gLevel(kp: number): number {
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  if (kp >= 5) return 1;
  return 0;
}

/**
 * Drives the iOS storm Live Activity from the live Kp feed (Phase A, app-driven).
 * Starts when Kp crosses G1, updates as it changes, ends when it drops below.
 * No-op on web/Android — the lock-screen UI is native iOS only.
 */
export function useStormLiveActivity() {
  const kp = useKpLive();
  const { settings } = useSettings();
  const active = useRef(false);

  useEffect(() => {
    if (kp === null || !isNative() || !isIos()) return;

    const lat = settings.preferredLat ?? undefined;
    const lon = settings.preferredLon ?? undefined;
    const auroraPct = lat !== undefined && lon !== undefined
      ? calcAuroraVisibility(lat, lon, kp)
      : undefined;
    const state = { kp: Math.round(kp * 10) / 10, gLevel: gLevel(kp), auroraPct };

    (async () => {
      try {
        if (kp >= STORM_THRESHOLD) {
          if (active.current) {
            await StormLiveActivity.update(state);
          } else {
            const res = await StormLiveActivity.start(state);
            active.current = res.started;
          }
        } else if (active.current) {
          await StormLiveActivity.end();
          active.current = false;
        }
      } catch {
        /* plugin unavailable / older iOS / permission off — silently skip */
      }
    })();
  }, [kp, settings.preferredLat, settings.preferredLon]);
}
