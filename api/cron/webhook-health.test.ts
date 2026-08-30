// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// The handler only needs to get past module load; every test here stops at the
// auth guard, so the Stripe call is never reached on the rejection paths.
const mockEventsList = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe(this: unknown) {
    return { events: { list: mockEventsList } };
  }),
}));

vi.mock('../lib/resend.js', () => ({ sendEmail: mockSendEmail }));

import handler from './webhook-health';

function makeReq(opts: { authorization?: string; secret?: string } = {}) {
  return {
    method: 'GET',
    headers: opts.authorization ? { authorization: opts.authorization } : {},
    query: opts.secret === undefined ? {} : { secret: opts.secret },
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

const SECRET = 'test-cron-secret';

describe('webhook-health auth guard', () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventsList.mockResolvedValue({ data: [] });
    mockSendEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  // The one that matters. Comparing against process.env.CRON_SECRET directly
  // fails OPEN when the variable is missing: an unauthenticated request also has
  // no bearer and no query secret, `undefined !== undefined` is false, and the
  // caller reaches the Stripe query and the alert email. Missing configuration
  // must lock the door, not unlock it.
  it('rejects when CRON_SECRET is not configured, even with no credentials sent', async () => {
    delete process.env.CRON_SECRET;
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(401);
    expect(mockEventsList).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('rejects an empty CRON_SECRET the same way', async () => {
    process.env.CRON_SECRET = '';
    const res = makeRes();
    await handler(makeReq({ secret: '' }), res);
    expect(res._status).toBe(401);
    expect(mockEventsList).not.toHaveBeenCalled();
  });

  it('rejects a request with no credentials', async () => {
    process.env.CRON_SECRET = SECRET;
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(401);
  });

  it('rejects a wrong secret, by header or by query', async () => {
    process.env.CRON_SECRET = SECRET;
    for (const req of [makeReq({ authorization: 'Bearer nope' }), makeReq({ secret: 'nope' })]) {
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(401);
    }
    expect(mockEventsList).not.toHaveBeenCalled();
  });

  it('accepts the correct secret as a bearer token', async () => {
    process.env.CRON_SECRET = SECRET;
    const res = makeRes();
    await handler(makeReq({ authorization: `Bearer ${SECRET}` }), res);
    expect(res._status).toBe(200);
    expect(mockEventsList).toHaveBeenCalled();
  });

  it('accepts the correct secret as a query parameter', async () => {
    process.env.CRON_SECRET = SECRET;
    const res = makeRes();
    await handler(makeReq({ secret: SECRET }), res);
    expect(res._status).toBe(200);
    expect(mockEventsList).toHaveBeenCalled();
  });

  it('stays quiet when Stripe reports no failed deliveries', async () => {
    process.env.CRON_SECRET = SECRET;
    const res = makeRes();
    await handler(makeReq({ secret: SECRET }), res);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
