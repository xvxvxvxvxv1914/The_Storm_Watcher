import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the native bridge before importing the unit under test.
const start = vi.fn();
const update = vi.fn();
const end = vi.fn();
vi.mock('../plugins/stormLiveActivity', () => ({
  StormLiveActivity: { start: (...a: unknown[]) => start(...a), update: (...a: unknown[]) => update(...a), end: (...a: unknown[]) => end(...a) },
}));

import { gLevel, syncLiveActivity } from './useStormLiveActivity';
import type { StormLiveActivityState } from '../plugins/stormLiveActivity';

const stormState = (kp: number): StormLiveActivityState => ({ kp, gLevel: gLevel(kp), auroraPct: 40 });

beforeEach(() => {
  start.mockReset();
  update.mockReset();
  end.mockReset();
  start.mockResolvedValue({ started: true });
  update.mockResolvedValue({ updated: true });
  end.mockResolvedValue(undefined);
});

describe('gLevel', () => {
  it.each([
    [0, 0], [4.9, 0],
    [5, 1], [5.9, 1],
    [6, 2], [7, 3], [8, 4],
    [9, 5], [9.3, 5],
  ])('Kp %s → G%s', (kp, g) => {
    expect(gLevel(kp)).toBe(g);
  });
});

describe('syncLiveActivity', () => {
  it('ends (does not start) when below the storm threshold', async () => {
    const live = await syncLiveActivity(stormState(4.9), false);
    expect(end).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
    expect(live).toBe(false);
  });

  it('ends an existing activity when Kp drops below threshold', async () => {
    const live = await syncLiveActivity(stormState(3), true);
    expect(end).toHaveBeenCalledTimes(1);
    expect(live).toBe(false);
  });

  it('starts a new activity when none is live and a storm is on', async () => {
    const live = await syncLiveActivity(stormState(6), false);
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    expect(live).toBe(true);
  });

  it('updates (without restarting) when an activity is already live', async () => {
    const live = await syncLiveActivity(stormState(7), true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
    expect(live).toBe(true);
  });

  it('RESTARTS when the live activity was dismissed (update reports updated:false)', async () => {
    update.mockResolvedValue({ updated: false }); // user swiped it away / system ended it
    const live = await syncLiveActivity(stormState(8), true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1); // the fix: don't silently no-op
    expect(live).toBe(true);
  });

  it('reflects a refused start (e.g. Live Activities disabled) as not-live', async () => {
    start.mockResolvedValue({ started: false, reason: 'disabled' });
    const live = await syncLiveActivity(stormState(6), false);
    expect(live).toBe(false);
  });

  it('retries start() when the bridge is not ready yet, then succeeds', async () => {
    vi.useFakeTimers();
    try {
      start.mockRejectedValueOnce(new Error('not implemented')).mockResolvedValueOnce({ started: true });
      const promise = syncLiveActivity(stormState(6), false);
      await vi.advanceTimersByTimeAsync(1500); // skip the retry backoff
      const live = await promise;
      expect(start).toHaveBeenCalledTimes(2);
      expect(live).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after 5 failed start attempts and reports not-live', async () => {
    vi.useFakeTimers();
    try {
      start.mockRejectedValue(new Error('not implemented'));
      const promise = syncLiveActivity(stormState(6), false);
      await vi.advanceTimersByTimeAsync(1500 * 4); // 4 backoffs between 5 attempts
      const live = await promise;
      expect(start).toHaveBeenCalledTimes(5);
      expect(live).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
