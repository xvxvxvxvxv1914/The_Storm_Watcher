/**
 * JSON fetch with a hard timeout that also covers the body download.
 *
 * Every data service had its own copy of this helper, and each copy ended with
 * `return res.json()` inside a `try/finally`. That clears the abort timer the
 * instant the promise is handed back — the timeout only ever guarded the
 * *headers*, so a response that stalled mid-body hung forever. Reading the body
 * with `await` keeps it inside the timeout window.
 *
 * Parse failures are rewritten too: a bare "Unexpected end of JSON input"
 * names no endpoint, which made upstreams answering 200 with a truncated
 * payload (NOAA does this, and lossy mobile networks cut responses mid-stream)
 * indistinguishable from each other in Sentry.
 */
export const fetchJson = async <T,>(url: string, timeoutMs = 10000, retries = 0): Promise<T> => {
  const attempt = async (): Promise<T> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const text = await res.text();
      if (!text.trim()) throw new Error(`Empty body from ${url}`);
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`Malformed JSON from ${url} (${text.length} bytes)`);
      }
    } finally {
      clearTimeout(timer);
    }
  };

  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastErr;
};
