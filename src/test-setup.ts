import '@testing-library/jest-dom';

// Payments are ON by default in tests; override with vi.stubEnv('VITE_PAYMENTS_ENABLED', 'false') per test.
Object.assign(import.meta.env, { VITE_PAYMENTS_ENABLED: 'true' });

/**
 * Guarantee a working `localStorage` global whatever Node the suite runs on.
 *
 * Node 22+ ships its own `localStorage` global, and it is `undefined` unless the
 * process was started with `--localstorage-file`. That binding **shadows the one
 * happy-dom provides**, so `localStorage.clear()` throws
 * "Cannot read properties of undefined" on a modern Node while passing on the
 * Node 20 that CI uses — the suite silently depended on the runtime version.
 * Measured on Node 26.7: `typeof localStorage === 'undefined'` in the test
 * environment, while happy-dom's own `window.localStorage` is a real object.
 *
 * Installing one here rather than pinning Node alone means a contributor on any
 * version sees the same result as CI. Tests that need to control storage still
 * override this with `vi.stubGlobal`, as `geolocation.test.ts` does.
 */
function installStorage(name: 'localStorage' | 'sessionStorage') {
  const existing = (globalThis as Record<string, unknown>)[name];
  if (existing && typeof (existing as Storage).getItem === 'function') return;

  const map = new Map<string, string>();
  const storage: Storage = {
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(String(k)) ?? null,
    setItem: (k: string, v: string) => { map.set(String(k), String(v)); },
    removeItem: (k: string) => { map.delete(String(k)); },
    clear: () => { map.clear(); },
  };
  Object.defineProperty(globalThis, name, {
    value: storage, writable: true, configurable: true,
  });
}

installStorage('localStorage');
installStorage('sessionStorage');
