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
/**
 * Rewrites the non-standard numeric literals NOAA emits into `null`.
 *
 * `rtsw_wind_1m.json` carries bare `NaN` for dropped samples:
 *
 *     {"time_tag": "...", "active": true, "proton_speed": NaN, ...}
 *
 * RFC 8259 has no NaN, so `JSON.parse` rejects the **whole document** — one bad
 * sample among 3590 rows and the entire solar-wind reading is gone. Measured
 * live on 2026-08-11: 8 occurrences, parse aborting at byte 2593196 of 2662008.
 * (Python accepts NaN by default, which is why inspecting the feed with a script
 * shows nothing wrong. Swift's JSONSerialization rejects it exactly as JS does —
 * `KpSource.repairingNaN` is the same repair for the widgets and the watch.)
 *
 * `null` is the honest replacement: the feed already uses it for "no sample",
 * and every reader here treats it as missing.
 *
 * Only applied after a parse has already failed, so well-formed payloads never
 * pay for it. The tradeoff of a textual repair is that a *string* containing
 * `: NaN,` would be rewritten too; these feeds are numeric telemetry whose only
 * strings are timestamps and source names, and the alternative is no data.
 */
export const repairNonStandardJson = (text: string): string =>
  text.replace(/:\s*(?:NaN|-?Infinity)(?=\s*[,}\]])/g, ': null');

export const fetchJson = async <T,>(
  url: string,
  timeoutMs = 10000,
  retries = 0,
  headers?: Record<string, string>,
): Promise<T> => {
  const attempt = async (): Promise<T> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const text = await res.text();
      if (!text.trim()) throw new Error(`Empty body from ${url}`);
      try {
        return JSON.parse(text) as T;
      } catch (first) {
        // Second chance for upstreams that emit NaN/Infinity (see above). If the
        // repair does not produce valid JSON either, the payload is genuinely
        // broken — report the original failure, naming the endpoint.
        try {
          return JSON.parse(repairNonStandardJson(text)) as T;
        } catch {
          // Carry the parser's own words. Without them every failure looked
          // alike in Sentry and there was no way to tell a body cut mid-stream
          // ("Unexpected end of JSON input") from a genuinely malformed one —
          // which left five real reports in August undiagnosable. The tail is
          // included because a truncated payload ends mid-token and that is
          // visible at a glance.
          const why = first instanceof Error ? first.message : String(first);
          const tail = JSON.stringify(text.slice(-40));
          throw new Error(
            `Malformed JSON from ${url} (${text.length} bytes): ${why} — ends ${tail}`,
          );
        }
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
