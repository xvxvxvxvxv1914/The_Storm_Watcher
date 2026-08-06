import type { VercelRequest, VercelResponse } from '@vercel/node';

const DATE_RE = /^\d{2}-\d{2}-\d{4}$/;

function parseNigggDate(s: string): Date | null {
  if (!DATE_RE.test(s)) return null;
  const [dd, mm, yyyy] = s.split('-').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (isNaN(d.getTime()) || d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  const now = Date.now();
  if (d.getTime() < now - 100 * 365.25 * 86400e3 || d.getTime() > now + 2 * 86400e3) return null;
  return d;
}

// Per-IP rate limit: max 20 requests per minute per serverless instance
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 20;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const start = typeof req.query.start === 'string' ? req.query.start : '';
  const end   = typeof req.query.end   === 'string' ? req.query.end   : '';

  if (!parseNigggDate(start) || !parseNigggDate(end)) {
    return res.status(400).json({ error: 'Invalid date parameters' });
  }

  // Bounded upstream call — NIGGG is a single university host with no SLA, and
  // an unbounded fetch here pins the function open until Vercel's own limit.
  // AbortSignal.timeout covers the body read too, so `.text()` stays inside it.
  let upstream: Response;
  let text: string;
  try {
    upstream = await fetch(
      `https://pagmag.ngic.bg/assets/php/datacalendar26.php?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    text = await upstream.text();
  } catch {
    return res.status(504).json({ error: 'Upstream timeout' });
  }

  res.status(upstream.status).send(text);
}
