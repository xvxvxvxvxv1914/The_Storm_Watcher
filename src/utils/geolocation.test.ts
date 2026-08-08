import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@capacitor/geolocation', () => ({ Geolocation: {} }));
vi.mock('./platform', () => ({ isNative: () => false, isIos: () => false }));

import { getApproxLocationByIP } from './geolocation';

// The 24h IP cache must start empty in every test, and `localStorage` is not a
// global binding under happy-dom — stub a minimal one we control.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
});

function jsonBody(payload: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
  } as unknown as Response);
}

/** Headers arrive, body never does — until the abort signal fires. */
function stallingBody(signal: AbortSignal) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => new Promise<string>((_, reject) => {
      signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')));
    }),
  } as unknown as Response);
}

describe('getApproxLocationByIP — provider fallback', () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('uses the first provider when it answers', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      jsonBody({ latitude: 42.7, longitude: 23.3, city: 'Sofia', country_name: 'Bulgaria' })));

    await expect(getApproxLocationByIP()).resolves.toEqual({
      lat: 42.7, lon: 23.3, name: 'Sofia, Bulgaria', source: 'ip',
    });
  });

  // The reason each provider needs its own timeout: ipapi.co throttles, and a
  // bare fetch() never gives up — so the geojs.io backstop was unreachable and
  // the single-flight promise stayed pending for the rest of the session.
  it('falls through to the second provider when the first stalls', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      call++;
      return call === 1
        ? stallingBody(init.signal!)
        : jsonBody({ latitude: '43.2', longitude: '27.9', city: 'Varna', country: 'Bulgaria' });
    }));

    const promise = getApproxLocationByIP();
    await vi.advanceTimersByTimeAsync(5001);

    await expect(promise).resolves.toEqual({
      lat: 43.2, lon: 27.9, name: 'Varna, Bulgaria', source: 'ip',
    });
  });

  it('resolves to null when every provider stalls', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => stallingBody(init.signal!)));

    const promise = getApproxLocationByIP();
    await vi.advanceTimersByTimeAsync(20000);

    await expect(promise).resolves.toBeNull();
  });
});
