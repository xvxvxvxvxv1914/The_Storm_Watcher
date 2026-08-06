import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The Kp lookup exists four times (TS, Swift, Kotlin, Deno) and drifted twice in
 * a single day on 2026-08-06 — once in both widgets, once in the alert cron.
 * Code cannot be shared across those runtimes; kpSource.contract.json is shared
 * instead. This pins the TypeScript implementation to it, so at least one of the
 * four can never drift silently and the file stays honest as a reference for the
 * hand-checked three.
 */

const contract = JSON.parse(
  readFileSync(join(__dirname, 'kpSource.contract.json'), 'utf-8'),
) as {
  primary: { url: string; nullHandling: string };
  fallback: { url: string; fieldPriority: string[] };
};

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(data),
});

describe('getKpIndex honours kpSource.contract.json', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('asks the contract primary first', async () => {
    mockFetch.mockResolvedValue(okJson({ datetime: ['2026-08-06T00:00:00Z'], Kp: [2.333] }));
    const { getKpIndex } = await import('./noaaApi');
    await getKpIndex();

    const firstUrl = String(mockFetch.mock.calls[0][0]);
    // The browser build proxies GFZ through /api/gfz; both must point at the
    // same upstream host the contract names.
    const host = new URL(contract.primary.url).host;
    expect(firstUrl.includes(host) || firstUrl.includes('/api/gfz')).toBe(true);
  });

  it('skips unpublished null bins instead of reading them as 0', async () => {
    expect(contract.primary.nullHandling).toBe('SKIP_BACK');
    mockFetch.mockResolvedValue(okJson({
      datetime: ['2026-08-06T00:00:00Z', '2026-08-06T03:00:00Z'],
      Kp: [2.333, null],
    }));
    const { getKpIndex } = await import('./noaaApi');

    const rows = await getKpIndex();
    expect(rows.at(-1)?.kp_index).toBe(2.333);
    expect(rows.some(r => r.kp_index === 0)).toBe(false);
  });

  it('falls back to the contract fallback when the primary fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue(okJson([{ time_tag: 't', kp_index: 4, estimated_kp: 4.67 }]));
    const { getKpIndex } = await import('./noaaApi');
    await getKpIndex();

    const urls = mockFetch.mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes(new URL(contract.fallback.url).pathname))).toBe(true);
  });

  // The 2026-08-06 widget bug: estimated_kp read ahead of kp_index.
  it('reads the fallback fields in the contract order', async () => {
    expect(contract.fallback.fieldPriority).toEqual(['kp_index', 'estimated_kp']);

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue(okJson([{ time_tag: 't', kp_index: 4, estimated_kp: 4.67 }]));
    const { getKpIndex, resolveKp } = await import('./noaaApi');

    const rows = await getKpIndex();
    // Through the app's own resolver, not a copy of the rule written here.
    expect(resolveKp(rows.at(-1))).toBe(4);
  });
});

/**
 * resolveKp only helps if everyone calls it. The field priority was spelled out
 * by hand at ten call sites; nine were converted and the tenth (useKpAlert) was
 * missed because the sweep that found them scanned too narrow a set of paths.
 * A grep is a blunt instrument, but it is the only thing that catches the
 * eleventh — a type cannot express "do not write this expression".
 */
describe('no hand-rolled Kp field resolution outside noaaApi', () => {
  it('every consumer goes through resolveKp', async () => {
    const { readdirSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) return walk(full);
        return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
      });

    const src = join(__dirname, '..');
    const offenders = walk(src).filter((file) => {
      if (file.endsWith(join('services', 'noaaApi.ts'))) return false; // defines it
      return /\bkp_index\s*(\?\?|\|\|)|\bestimated_kp\b/.test(readFileSync(file, 'utf-8'));
    });

    expect(
      offenders.map(f => f.slice(src.length + 1)),
      'these files pick the Kp field by hand — use resolveKp() from noaaApi',
    ).toEqual([]);
  });
});

describe('resolveKp', () => {
  it('prefers kp_index over estimated_kp', async () => {
    const { resolveKp } = await import('./noaaApi');
    expect(resolveKp({ kp_index: 4, estimated_kp: 4.67 })).toBe(4);
  });

  // Why the helper exists: Calendar and Mood used `||`, which treats a genuine
  // ultra-quiet reading as missing and shows the estimate instead.
  it('treats Kp 0.0 as a real reading, not a missing one', async () => {
    const { resolveKp } = await import('./noaaApi');
    expect(resolveKp({ kp_index: 0, estimated_kp: 0.67 })).toBe(0);
  });

  it('falls back to estimated_kp only when kp_index is absent', async () => {
    const { resolveKp } = await import('./noaaApi');
    expect(resolveKp({ estimated_kp: 3.33 } as never)).toBe(3.33);
  });

  it('returns null for a missing row or empty fields', async () => {
    const { resolveKp } = await import('./noaaApi');
    expect(resolveKp(undefined)).toBeNull();
    expect(resolveKp({} as never)).toBeNull();
  });
});
