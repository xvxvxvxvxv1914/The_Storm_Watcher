import type { VercelRequest, VercelResponse } from '@vercel/node';

const DATE_RE = /^\d{2}-\d{2}-\d{4}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = req.body as Record<string, unknown>;
  const chdate1 = typeof raw?.chdate1 === 'string' ? raw.chdate1 : '';
  const chdate2 = typeof raw?.chdate2 === 'string' ? raw.chdate2 : '';

  if (!DATE_RE.test(chdate1) || !DATE_RE.test(chdate2)) {
    return res.status(400).json({ error: 'Invalid date parameters' });
  }

  const body = new URLSearchParams({ chdate1, chdate2 }).toString();

  const upstream = await fetch('https://pagmag.ngic.bg/pagcal2.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await upstream.text();
  res.status(upstream.status).send(text);
}
