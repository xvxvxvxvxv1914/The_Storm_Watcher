import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// In-memory rate limit: 1 request per user per hour
const rateLimitMap = new Map<string, number>();

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  const jwt = authHeader.slice(7);

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: 1 request per user per hour
  const now = Date.now();
  const lastAttempt = rateLimitMap.get(user.id) ?? 0;
  if (now - lastAttempt < 60 * 60 * 1000) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  rateLimitMap.set(user.id, now);

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
