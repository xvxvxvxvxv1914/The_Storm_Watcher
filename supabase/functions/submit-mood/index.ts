import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

const VALID_MOODS = ['great', 'good', 'okay', 'bad', 'terrible'] as const;
type MoodType = typeof VALID_MOODS[number];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body: { session_id?: unknown; mood_type?: unknown; symptoms?: unknown; kp_index?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { session_id, mood_type, symptoms, kp_index } = body;

  // Input validation
  if (typeof session_id !== 'string' || !/^[0-9a-f-]{36}$/.test(session_id)) {
    return new Response(JSON.stringify({ error: 'Invalid session_id' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  if (!VALID_MOODS.includes(mood_type as MoodType)) {
    return new Response(JSON.stringify({ error: 'Invalid mood_type' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  const safeSymptoms = Array.isArray(symptoms)
    ? (symptoms as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 20)
    : [];
  const safeKp = typeof kp_index === 'number' && isFinite(kp_index)
    ? Math.max(0, Math.min(9, kp_index))
    : 0;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Rate limit: one entry per session per calendar day (UTC)
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('mood_entries')
    .select('id')
    .eq('user_session_id', session_id)
    .gte('created_at', todayMidnight.toISOString())
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'already_submitted' }), {
      status: 429,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase.from('mood_entries').insert({
    user_session_id: session_id,
    mood_type: mood_type as MoodType,
    symptoms: safeSymptoms,
    kp_index: safeKp,
  });

  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
