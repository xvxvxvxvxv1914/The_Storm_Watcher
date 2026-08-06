import type { VercelRequest, VercelResponse } from '@vercel/node';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// The map only ever grew: an entry per IP, never removed, for the whole life of
// a warm lambda instance. Sweep expired entries when it gets large — the window
// is 60s, so anything past resetAt is dead weight, and the check is O(n) only on
// the rare call that crosses the threshold.
const RATE_LIMIT_SWEEP_AT = 5_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (rateLimitMap.size > RATE_LIMIT_SWEEP_AT) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 30;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const start = typeof req.query.start === 'string' ? req.query.start : '';
  const end   = typeof req.query.end   === 'string' ? req.query.end   : '';
  const index = typeof req.query.index === 'string' ? req.query.index : 'Kp';

  if (!ISO_DATE_RE.test(start) || !ISO_DATE_RE.test(end)) {
    return res.status(400).json({ error: 'Invalid date parameters' });
  }

  if (!/^[A-Za-z0-9_-]+$/.test(index)) {
    return res.status(400).json({ error: 'Invalid index parameter' });
  }

  const url = `https://kp.gfz.de/app/json/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&index=${encodeURIComponent(index)}`;

  // Bounded upstream call. Without it a slow GFZ pins this function open until
  // Vercel's own limit kills it — the caller in noaaApi.ts already carries a
  // client-side timeout precisely because this endpoint could hang, and a proxy
  // that outlives its own client is only burning execution time.
  // AbortSignal.timeout covers the body read too, so `.text()` stays inside it.
  let upstream: Response;
  let text: string;
  try {
    upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    text = await upstream.text();
  } catch {
    return res.status(504).json({ error: 'Upstream timeout' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(upstream.status).send(text);
}
