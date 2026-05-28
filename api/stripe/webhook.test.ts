// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Hoist mocks so they're available inside vi.mock() factories ──────────────
const mockConstructEvent = vi.hoisted(() => vi.fn());
const mockSubRetrieve = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockProfileSelect = vi.hoisted(() => vi.fn());
const mockGetUserById = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe(this: unknown) {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      subscriptions: { retrieve: mockSubRetrieve },
    };
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'stripe_processed_events') {
        return { insert: mockInsert };
      }
      return {
        update: mockUpdate,
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: mockProfileSelect })),
        })),
      };
    }),
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));

vi.mock('../lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../emails/templates', () => ({
  proActivatedEmail: vi.fn(() => '<html>pro</html>'),
  paymentFailedEmail: vi.fn(() => '<html>failed</html>'),
  subscriptionCancelledEmail: vi.fn(() => '<html>cancelled</html>'),
  trialEndingEmail: vi.fn(() => '<html>trial</html>'),
}));

import handler from './webhook';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeReq(rawBody: Buffer, sig = 'valid-sig'): VercelRequest {
  return {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    on(event: string, cb: (chunk?: Buffer) => void) {
      if (event === 'data') cb(rawBody);
      if (event === 'end') cb();
      return this as never;
    },
  } as unknown as VercelRequest;
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null as unknown,
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
    end() { return this; },
  };
  return res as unknown as VercelResponse & { _status: number; _body: unknown };
}

function makeEvent(type: string, data: object) {
  return { id: `evt_${Math.random().toString(36).slice(2)}`, type, data: { object: data } };
}

const RAW = Buffer.from('{}');

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockGetUserById.mockResolvedValue({ data: { user: { email: null } } });
  });

  it('returns 405 for non-POST requests', async () => {
    const req = { method: 'GET', headers: {} } as unknown as VercelRequest;
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 when Stripe signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Bad sig'); });
    const res = makeRes();
    await handler(makeReq(RAW), res);
    expect(res._status).toBe(400);
  });

  it('returns 200 and skips DB update for duplicate event (error code 23505)', async () => {
    const event = makeEvent('checkout.session.completed', {});
    mockConstructEvent.mockReturnValue(event);
    mockInsert.mockResolvedValue({ error: { code: '23505' } });

    const res = makeRes();
    await handler(makeReq(RAW), res);

    expect(res._status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 413 when payload exceeds 1 MB', async () => {
    const bigChunk = Buffer.alloc(1_048_577);
    const req = {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      on(event: string, cb: (chunk?: Buffer) => void) {
        if (event === 'data') cb(bigChunk);
        if (event === 'end') cb();
        return this as never;
      },
    } as unknown as VercelRequest;

    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(413);
  });

  describe('checkout.session.completed', () => {
    it('updates profile plan to pro for pro price', async () => {
      const sub = {
        id: 'sub_pro',
        status: 'active',
        items: { data: [{ price: { id: 'price_1TSJBmLqQEtEOCx4utzZ07gf' }, current_period_end: 1_800_000_000 }] },
      };
      const event = makeEvent('checkout.session.completed', {
        subscription: 'sub_pro',
        metadata: { supabase_user_id: 'user-123' },
      });
      mockConstructEvent.mockReturnValue(event);
      mockSubRetrieve.mockResolvedValue(sub);
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro' }));
      expect(res._status).toBe(200);
    });

    it('updates profile plan to premium for premium price', async () => {
      const sub = {
        id: 'sub_prem',
        status: 'active',
        items: { data: [{ price: { id: 'price_1TSJHYLqQEtEOCx43ks9UAAc' }, current_period_end: 1_800_000_000 }] },
      };
      const event = makeEvent('checkout.session.completed', {
        subscription: 'sub_prem',
        metadata: { supabase_user_id: 'user-123' },
      });
      mockConstructEvent.mockReturnValue(event);
      mockSubRetrieve.mockResolvedValue(sub);
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'premium' }));
    });
  });

  describe('customer.subscription.updated', () => {
    it('keeps pro plan when status is trialing', async () => {
      const sub = {
        id: 'sub_trial',
        status: 'trialing',
        metadata: { supabase_user_id: 'user-456' },
        items: { data: [{ price: { id: 'price_1TSJBmLqQEtEOCx4utzZ07gf' }, current_period_end: 1_800_000_000 }] },
      };
      const event = makeEvent('customer.subscription.updated', sub);
      mockConstructEvent.mockReturnValue(event);
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro', subscription_status: 'trialing' }));
    });

    it('downgrades to free when status is canceled', async () => {
      const sub = {
        id: 'sub_canceled',
        status: 'canceled',
        metadata: { supabase_user_id: 'user-456' },
        items: { data: [{ price: { id: 'price_1TSJBmLqQEtEOCx4utzZ07gf' }, current_period_end: 1_800_000_000 }] },
      };
      const event = makeEvent('customer.subscription.updated', sub);
      mockConstructEvent.mockReturnValue(event);
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'free' }));
    });
  });

  describe('customer.subscription.deleted', () => {
    it('downgrades to free when subscription matches current', async () => {
      const sub = { id: 'sub_del', metadata: { supabase_user_id: 'user-789' } };
      const event = makeEvent('customer.subscription.deleted', sub);
      mockConstructEvent.mockReturnValue(event);
      mockProfileSelect.mockResolvedValue({ data: { subscription_id: 'sub_del' } });
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'free', subscription_id: null }));
    });

    it('does NOT downgrade when a different (newer) subscription is active', async () => {
      const sub = { id: 'sub_old', metadata: { supabase_user_id: 'user-789' } };
      const event = makeEvent('customer.subscription.deleted', sub);
      mockConstructEvent.mockReturnValue(event);
      mockProfileSelect.mockResolvedValue({ data: { subscription_id: 'sub_new' } });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_failed', () => {
    it('updates subscription_status to past_due', async () => {
      const sub = {
        id: 'sub_pastdue',
        status: 'past_due',
        metadata: { supabase_user_id: 'user-101' },
        items: { data: [{ price: { id: 'price_1TSJBmLqQEtEOCx4utzZ07gf' } }] },
      };
      const event = makeEvent('invoice.payment_failed', { subscription: 'sub_pastdue' });
      mockConstructEvent.mockReturnValue(event);
      mockSubRetrieve.mockResolvedValue(sub);
      const eq = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq });

      const res = makeRes();
      await handler(makeReq(RAW), res);

      expect(mockUpdate).toHaveBeenCalledWith({ subscription_status: 'past_due' });
    });
  });
});
