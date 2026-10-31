// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const mocks = vi.hoisted(() => ({
  freeAccess: true,
  getUser: vi.fn(),
  profile: vi.fn(),
  createCustomer: vi.fn(),
  createCheckout: vi.fn(),
  createClient: vi.fn(),
  stripe: vi.fn(),
}));

vi.mock('../../supabase/functions/_shared/accessPolicy', () => ({
  get FREE_ACCESS_ENABLED() { return mocks.freeAccess; },
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('stripe', () => ({ default: mocks.stripe }));

import handler from './create-checkout-session';

const PRO_PRICE = 'price_1TSKUBLh5QwxSql30JIjhhn1';

function request(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    headers: { origin: 'https://www.thestormwatcher.com', authorization: 'Bearer valid-token' },
    body: { priceId: PRO_PRICE },
    ...overrides,
  } as VercelRequest;
}

function response() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    end() { return this; },
  };
  return res as typeof res & VercelResponse;
}

describe('new Stripe checkouts during free access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.freeAccess = true;
    mocks.getUser.mockResolvedValue({ data: { user: { id: crypto.randomUUID(), email: 'user@example.com' } }, error: null });
    mocks.profile.mockResolvedValue({ data: { stripe_customer_id: 'cus_existing', referred_by: null } });
    mocks.createClient.mockReturnValue({
      auth: { getUser: mocks.getUser },
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mocks.profile })) })),
      })),
    });
    mocks.createCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' });
    mocks.stripe.mockImplementation(function () {
      return {
        customers: { create: mocks.createCustomer },
        checkout: { sessions: { create: mocks.createCheckout } },
      };
    });
  });

  it('blocks a direct purchase request before touching billing or account services', async () => {
    const res = response();
    await handler(request(), res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual(expect.objectContaining({ code: 'FREE_ACCESS_ENABLED' }));
    expect(mocks.stripe).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createCustomer).not.toHaveBeenCalled();
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it('boots the emitted ESM handler under Node without a TypeScript loader or billing credentials', () => {
    // Vercel emits separate .js files; Vite's permissive import resolution in
    // the other tests would hide an extensionless import that fails in Node.
    const runtimeRoot = mkdtempSync(join(tmpdir(), 'tsw-checkout-esm-'));
    try {
      const apiDir = join(runtimeRoot, 'api/stripe');
      const policyDir = join(runtimeRoot, 'supabase/functions/_shared');
      mkdirSync(apiDir, { recursive: true });
      mkdirSync(policyDir, { recursive: true });
      writeFileSync(join(runtimeRoot, 'package.json'), JSON.stringify({ type: 'module' }));
      symlinkSync(fileURLToPath(new URL('../../node_modules', import.meta.url)), join(runtimeRoot, 'node_modules'), 'dir');
      const source = readFileSync(new URL('./create-checkout-session.ts', import.meta.url), 'utf8');
      const emitted = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
      });
      const handlerPath = join(apiDir, 'create-checkout-session.js');
      writeFileSync(handlerPath, emitted.outputText);
      // Keep this runtime-resolution test independent of future rollout dates.
      writeFileSync(join(policyDir, 'accessPolicy.js'), 'export const FREE_ACCESS_ENABLED = true;');
      const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
        const { default: handler } = await import(${JSON.stringify(pathToFileURL(handlerPath).href)});
        const res = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(body) { this.body = body; return this; },
        };
        await handler({ method: 'POST', headers: { origin: 'https://www.thestormwatcher.com' } }, res);
        if (res.statusCode !== 409 || res.body.code !== 'FREE_ACCESS_ENABLED') throw new Error('Checkout was not disabled');
        console.log('free-checkout-ready');
      `], {
        encoding: 'utf8', timeout: 10000,
        env: { PATH: process.env.PATH, NODE_NO_WARNINGS: '1' },
      });
      expect(result.trim()).toBe('free-checkout-ready');
    } finally {
      rmSync(runtimeRoot, { recursive: true, force: true });
    }
  });

  it('restores an authenticated Pro checkout and trial when free access is switched off', async () => {
    mocks.freeAccess = false;
    const res = response();
    await handler(request(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ url: 'https://checkout.stripe.com/test-session' });
    expect(mocks.getUser).toHaveBeenCalledWith('valid-token');
    expect(mocks.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing',
      line_items: [{ price: PRO_PRICE, quantity: 1 }],
      subscription_data: expect.objectContaining({ trial_period_days: 14 }),
    }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
  });

  it('keeps the longer referred trial when paid access is restored', async () => {
    mocks.freeAccess = false;
    mocks.profile.mockResolvedValue({ data: { stripe_customer_id: 'cus_existing', referred_by: 'referrer-id' } });
    const res = response();
    await handler(request(), res);

    expect(res.statusCode).toBe(200);
    expect(mocks.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      subscription_data: expect.objectContaining({ trial_period_days: 30 }),
    }), expect.anything());
  });

  it('still requires authentication when paid access is restored', async () => {
    mocks.freeAccess = false;
    const res = response();
    await handler(request({ headers: { origin: 'https://www.thestormwatcher.com' } }), res);

    expect(res.statusCode).toBe(401);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it('keeps the origin allowlist in both modes', async () => {
    for (const freeAccess of [true, false]) {
      mocks.freeAccess = freeAccess;
      const res = response();
      await handler(request({ headers: { origin: 'https://untrusted.example', authorization: 'Bearer valid-token' } }), res);
      expect(res.statusCode).toBe(403);
    }
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it('rejects an unknown price when paid access is restored', async () => {
    mocks.freeAccess = false;
    const res = response();
    await handler(request({ body: { priceId: 'unlisted-price' } }), res);

    expect(res.statusCode).toBe(400);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });
});
