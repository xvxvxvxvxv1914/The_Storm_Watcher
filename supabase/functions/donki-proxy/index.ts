const UPSTREAM = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(req.url);

  // Strip everything up to and including "donki-proxy" from the path.
  // e.g. /functions/v1/donki-proxy/CME?startDate=... → /CME?startDate=...
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
