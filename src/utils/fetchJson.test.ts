import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson } from './fetchJson';

/** A fetch that resolves headers immediately but never finishes the body. */
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

function jsonBody(payload: string) {
  return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(payload) } as unknown as Response);
}

describe('fetchJson', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // The regression this helper exists for: the timeout used to be cleared the
  // moment `res.json()` was returned, so it only ever guarded the headers and a
  // response that stalled mid-body hung forever.
  it('aborts when the body stalls past the timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => stallingBody(init.signal!)));
    const promise = fetchJson('https://example.test/slow', 5000);
    // Specifically an abort — anything else would mean the request failed for an
    // unrelated reason and the timeout still is not covering the body.
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });

  it('names the endpoint when the body is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonBody('')));
    await expect(fetchJson('https://example.test/empty')).rejects.toThrow(
      'Empty body from https://example.test/empty');
  });

  it('names the endpoint when the JSON is truncated', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonBody('{"a":')));
    await expect(fetchJson('https://example.test/cut')).rejects.toThrow(
      'Malformed JSON from https://example.test/cut');
  });

  it('surfaces a non-ok status with the endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 503 } as unknown as Response)));
    await expect(fetchJson('https://example.test/down')).rejects.toThrow(
      'HTTP 503 from https://example.test/down');
  });

  it('passes request headers through', async () => {
    let sent: HeadersInit | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      sent = init.headers;
      return jsonBody('{"ok":true}');
    }));
    await fetchJson('https://example.test/h', 5000, 0, { 'Accept-Language': 'en' });
    expect(sent).toEqual({ 'Accept-Language': 'en' });
  });

  it('retries the requested number of times, then rethrows', async () => {
    const mock = vi.fn(() => jsonBody(''));
    vi.stubGlobal('fetch', mock);
    const promise = fetchJson('https://example.test/flaky', 5000, 2);
    const assertion = expect(promise).rejects.toThrow('Empty body');
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('returns the parsed payload on success', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonBody('{"kp":4.33}')));
    await expect(fetchJson<{ kp: number }>('https://example.test/ok')).resolves.toEqual({ kp: 4.33 });
  });
});
