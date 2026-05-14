const UPSTREAM = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get';

const ALLOWED_ORIGINS = new Set([
  'https://thestormwatcher.com',
  'https://www.thestormwatcher.com',
  'capacitor://localhost',
  'http://localhost:5173',
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://thestormwatcher.com',
    'Access-Control-Allow-Headers': 'content-type, authorization',
  };
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(req.url);

  const path = url.pathname.replace(/^.*\/donki-proxy/, '') || '/';
  const upstreamUrl = `${UPSTREAM}${path}${url.search}`;

  try {
    const res = await fetch(upstreamUrl, { signal: AbortSignal.timeout(10000) });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        ...CORS,
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
