/** A bounded read, including the response body, with one retry for transient failures. */
export async function fetchText(url: string, valid: (text: string) => boolean, timeoutMs = 10000): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let retryable = true;
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        retryable = res.status >= 500 || res.status === 429;
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      const text = await res.text();
      if (!valid(text)) throw new Error(`Invalid forecast text from ${url}`);
      return text;
    } catch (error) {
      if (attempt >= 1 || !retryable) throw error;
    } finally {
      clearTimeout(timer);
    }
    await new Promise(resolve => setTimeout(resolve, 750));
  }
}
