import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../utils/offlineCache', () => ({
  persistGet: async (key: string) => storage.get(key) ?? null,
  persistSet: async (key: string, value: unknown) => { storage.set(key, JSON.parse(JSON.stringify(value))); },
}));
vi.mock('../utils/logger', () => ({ logWarning: vi.fn() }));
const fetchMock = vi.fn();
const short = ':Product: 3-Day Forecast\n:Issued: 2026 Oct 06 0030 UTC\nNOAA Kp index breakdown Oct 06-Oct 08 2026\n\nOct 06  Oct 07  Oct 08\nA. Geomagnetic\nRationale: Calm.\n\nB. Solar radiation\nS1 or greater 1% 2% 3%\nRationale: Low.\n\nC. Radio blackout\nR1-R2 10% 20% 30%\nR3 or greater 1% 2% 3%\nRationale: Quiet.\n';
const long = ':Product: 27-day Space Weather Outlook Table\n' + Array.from({ length: 27 }, (_, i) => `2026 Oct ${i + 1} 100 10 3`).join('\n');
const ok = (text: string) => ({ ok: true, status: 200, text: async () => text });

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T08:00:00Z')); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); storage.clear(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('NOAA forecast snapshots', () => {
  it('uses a bounded saved forecast after failure and keeps its original fetch time', async () => {
    fetchMock.mockResolvedValueOnce(ok(short));
    const { getSpaceWeatherOutlook } = await import('./noaaApi');
    const fresh = await getSpaceWeatherOutlook();
    expect(fresh).toMatchObject({ stale: false, days: ['Oct 06', 'Oct 07', 'Oct 08'] });
    await vi.advanceTimersByTimeAsync(16 * 60000);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const pending = getSpaceWeatherOutlook();
    await vi.advanceTimersByTimeAsync(750);
    const cached = await pending;
    expect(cached).toMatchObject({ stale: true, fetchedAt: fresh?.fetchedAt, issuedAt: fresh?.issuedAt });
    // A failed fallback must not be cached as a new successful read for 15 minutes.
    fetchMock.mockResolvedValue(ok(short));
    expect(await getSpaceWeatherOutlook()).toMatchObject({ stale: false });
  });
  it('restores 27-day dates from serialized storage', async () => {
    fetchMock.mockResolvedValueOnce(ok(long));
    const { get27DayOutlookSnapshot } = await import('./noaaApi');
    const fresh = await get27DayOutlookSnapshot();
    expect(fresh?.data).toHaveLength(27);
    await vi.advanceTimersByTimeAsync(16 * 60000);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const pending = get27DayOutlookSnapshot();
    await vi.advanceTimersByTimeAsync(750);
    const cached = await pending;
    expect(cached?.stale).toBe(true);
    expect(cached?.data[0].date).toBeInstanceOf(Date);
    expect(cached?.data[0].date.getTime()).toBe(fresh?.data[0].date.getTime());
  });
  it('does not freeze an unavailable forecast and rejects data older than four hours', async () => {
    const { getSpaceWeatherOutlook } = await import('./noaaApi');
    storage.set('offline_outlook', { data: { issuedAt: 'old', days: ['a', 'b', 'c'] }, fetchedAt: Date.now() - 5 * 3600000 });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const pending = getSpaceWeatherOutlook();
    await vi.advanceTimersByTimeAsync(750);
    expect(await pending).toBeNull();
    fetchMock.mockResolvedValue(ok(short));
    expect(await getSpaceWeatherOutlook()).toMatchObject({ stale: false });
  });
  it('does not replace valid cached data with a truncated forecast', async () => {
    fetchMock.mockResolvedValueOnce(ok(short));
    const { getSpaceWeatherOutlook } = await import('./noaaApi');
    const fresh = await getSpaceWeatherOutlook();
    await vi.advanceTimersByTimeAsync(16 * 60000);
    fetchMock.mockResolvedValue(ok(short.slice(0, 150)));
    const pending = getSpaceWeatherOutlook();
    await vi.advanceTimersByTimeAsync(750);
    expect(await pending).toMatchObject({ stale: true, fetchedAt: fresh?.fetchedAt });
  });
});
