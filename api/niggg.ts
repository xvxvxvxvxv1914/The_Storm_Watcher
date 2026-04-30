import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = new URLSearchParams(req.body as Record<string, string>).toString();

  const upstream = await fetch('https://pagmag.ngic.bg/pagcal2.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await upstream.text();
  res.status(upstream.status).send(text);
}
