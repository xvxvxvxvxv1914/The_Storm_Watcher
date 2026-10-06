import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchText } from './fetchText';
const fetchMock = vi.fn();
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const valid = (text: string) => text === 'forecast';
const ok = (text: string) => ({ ok: true, status: 200, text: async () => text });

describe('text forecast recovery', () => {
  it('retries a 503 and reads the replacement response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce(ok('forecast'));
    const result = fetchText('https://noaa.test/forecast', valid);
    await vi.advanceTimersByTimeAsync(750);
    expect(await result).toBe('forecast');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('retries a truncated or HTML body instead of accepting it', async () => {
    fetchMock.mockResolvedValueOnce(ok('<html>Unavailable</html>')).mockResolvedValueOnce(ok('forecast'));
    const result = fetchText('https://noaa.test/forecast', valid);
    await vi.advanceTimersByTimeAsync(750);
    expect(await result).toBe('forecast');
  });
  it('keeps the timeout active during body download and retries after abort', async () => {
    fetchMock.mockImplementationOnce((_url, { signal }: { signal: AbortSignal }) => ({
      ok: true, status: 200,
      text: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))),
    })).mockResolvedValueOnce(ok('forecast'));
    const result = fetchText('https://noaa.test/forecast', valid, 1000);
    await vi.advanceTimersByTimeAsync(1750);
    expect(await result).toBe('forecast');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not retry a 404', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchText('https://noaa.test/missing', valid)).rejects.toThrow('HTTP 404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
