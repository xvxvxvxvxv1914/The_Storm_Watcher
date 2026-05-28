/**
 * verify-iap — Supabase Edge Function
 *
 * Validates an Apple App Store or Google Play receipt and updates
 * the user's profile.plan in Supabase.
 *
 * Required environment variables (set in Supabase dashboard → Edge Functions → Secrets):
 *   APPLE_SHARED_SECRET     — App Store Connect shared secret (for sandbox + prod validation)
 *   GOOGLE_SERVICE_ACCOUNT  — JSON string of Google service account with Play Developer API access
 *
 * Deploy:
 *   supabase functions deploy verify-iap --project-ref srzfoxlmhxyulrgkchjr
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://thestormwatcher.com',
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

type Platform = 'ios' | 'android';
type Plan = 'pro' | 'premium';
type Billing = 'monthly' | 'yearly';

// Maps native product IDs → plan tier
const PRODUCT_TO_PLAN: Record<string, Plan> = {
  'com.stormwatcher.app.pro.monthly':     'pro',
  'com.stormwatcher.app.pro.yearly':      'pro',
  'com.stormwatcher.app.premium.monthly': 'premium',
  'com.stormwatcher.app.premium.yearly':  'premium',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders(req) });
  }

  // Auth
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(req) });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(req) });

  const body = await req.json() as {
    platform: Platform;
    receipt: string;
    plan: Plan;
    billing: Billing;
  };

  const { platform, receipt, plan } = body;
  if (!platform || !receipt || !plan) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders(req) });
  }

  let verifiedPlan: Plan | null = null;

  if (platform === 'ios') {
    verifiedPlan = await verifyAppleReceipt(receipt);
  } else if (platform === 'android') {
    verifiedPlan = await verifyGoogleReceipt(receipt, plan, body.billing);
  }

  if (!verifiedPlan) {
    return new Response(JSON.stringify({ error: 'Receipt validation failed' }), { status: 402, headers: corsHeaders(req) });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: verifiedPlan,
      subscription_status: 'active',
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Profile update failed:', updateError);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500, headers: corsHeaders(req) });
  }

  return new Response(JSON.stringify({ plan: verifiedPlan }), {
    status: 200,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
});

// ── Apple receipt validation ─────────────────────────────────────────────────

async function verifyAppleReceipt(receiptData: string): Promise<Plan | null> {
  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');
  if (!sharedSecret) throw new Error('APPLE_SHARED_SECRET not configured');

  // Try production first, then sandbox (handles TestFlight receipts automatically)
  for (const url of [
    'https://buy.itunes.apple.com/verifyReceipt',
    'https://sandbox.itunes.apple.com/verifyReceipt',
  ]) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'receipt-data': receiptData, 'password': sharedSecret, 'exclude-old-transactions': true }),
    });
    const data = await res.json() as {
      status: number;
      latest_receipt_info?: Array<{ product_id: string; expires_date_ms: string }>;
    };

    if (data.status === 21007) continue; // sandbox receipt sent to prod — retry with sandbox URL

    if (data.status !== 0) return null;

    const now = Date.now();
    const activeSub = (data.latest_receipt_info ?? [])
      .filter(t => parseInt(t.expires_date_ms) > now)
      .sort((a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms))[0];

    if (!activeSub) return null;
    return PRODUCT_TO_PLAN[activeSub.product_id] ?? null;
  }
  return null;
}

// ── Google Play receipt validation ───────────────────────────────────────────

async function verifyGoogleReceipt(purchaseToken: string, plan: Plan, billing: Billing): Promise<Plan | null> {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
  if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT not configured');

  const productId = `com.stormwatcher.app.${plan}.${billing}`;
  const packageName = 'com.stormwatcher.app';

  // Get OAuth2 access token using service account JWT
  const accessToken = await getGoogleAccessToken(JSON.parse(serviceAccountJson));

  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;

  const sub = await res.json() as {
    paymentState: number;       // 1 = received, 2 = free trial
    cancelReason?: number;
    expiryTimeMillis: string;
  };

  const expired = parseInt(sub.expiryTimeMillis) < Date.now();
  if (expired || (sub.cancelReason !== undefined && sub.paymentState !== 1)) return null;

  return PRODUCT_TO_PLAN[productId] ?? null;
}

async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import PEM private key
  const pemBody = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json() as { access_token: string };
  return tokenData.access_token;
}
