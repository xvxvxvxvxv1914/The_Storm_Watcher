type CacheEntry<T> = { ts: number; data: T };
const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const cached = async <T,>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = fetcher()
    .then((data) => { store.set(key, { ts: Date.now(), data }); return data; })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
};
