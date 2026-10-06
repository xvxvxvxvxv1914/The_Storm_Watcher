import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommunityPulse } from './useCommunityPulse';
const mocks = vi.hoisted(() => ({ query: vi.fn(), warning: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: {
  from: () => ({ select: () => ({ gte: () => ({ abortSignal: mocks.query }) }) }),
} }));
vi.mock('../utils/logger', () => ({ logWarning: mocks.warning }));
const ok = { data: [{ mood_type: 'happy', symptoms: ['energized'] }], error: null, status: 200 };
const offline = { data: null, error: { message: 'TypeError: Failed to fetch' }, status: 0 };
beforeEach(() => { vi.useFakeTimers(); mocks.query.mockReset(); mocks.warning.mockReset(); });
afterEach(() => vi.useRealTimers());

describe('community pulse resilience', () => {
  it('recovers a transient read without logging a warning', async () => {
    mocks.query.mockResolvedValueOnce(offline).mockResolvedValueOnce(ok);
    const { result } = renderHook(() => useCommunityPulse());
    await act(async () => {});
    expect(result.current.data).toEqual({ mood: 'happy', symptom: 'energized', count: 1 });
    expect(result.current.error).toBe(false);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.warning).not.toHaveBeenCalled();
  });
  it('preserves the previous result on failure and refreshes it on reconnect', async () => {
    mocks.query.mockResolvedValue(ok);
    const { result } = renderHook(() => useCommunityPulse());
    await act(async () => {});
    const first = result.current.fetchedAt;
    mocks.query.mockResolvedValue(offline);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(result.current).toMatchObject({ error: true, fetchedAt: first, data: { mood: 'happy' } });
    mocks.query.mockResolvedValue({ data: [], error: null, status: 200 });
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(false);
  });
  it('does not retry permission errors', async () => {
    mocks.query.mockResolvedValue({ data: null, error: { message: 'permission denied' }, status: 403 });
    const { result } = renderHook(() => useCommunityPulse());
    await act(async () => {});
    expect(result.current.error).toBe(true);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it('aborts a hanging request after ten seconds and retries it', async () => {
    mocks.query.mockImplementationOnce((signal: AbortSignal) => new Promise(resolve => signal.addEventListener('abort', () => resolve(offline))))
      .mockResolvedValueOnce(ok);
    const { result } = renderHook(() => useCommunityPulse());
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(result.current.data?.count).toBe(1);
  });
  it('cancels in-flight work and removes the reconnect handler on unmount', async () => {
    let signal!: AbortSignal;
    let resolve!: (value: unknown) => void;
    mocks.query.mockImplementation((input: AbortSignal) => { signal = input; return new Promise(r => { resolve = r; }); });
    const { unmount } = renderHook(() => useCommunityPulse());
    await act(async () => {});
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(ok); window.dispatchEvent(new Event('online')); });
    expect(mocks.warning).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
