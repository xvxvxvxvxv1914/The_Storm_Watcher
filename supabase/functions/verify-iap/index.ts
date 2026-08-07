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

const PLANS = new Set<string>(['pro', 'premium']);
const BILLINGS = new Set<string>(['monthly', 'yearly']);

/**
 * What a store told us. `purchaseId` is the store's own stable identifier for
 * the subscription — Apple's original_transaction_id, Google's purchase token —
 * and is what stops one receipt upgrading a second account.
 */
interface VerifiedPurchase {
  plan: Plan;
  productId: string;
  purchaseId: string;
  expiresAt: string | null;
}

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

  // plan and billing are interpolated into the Play API URL, so they are checked
  // against the allowed values rather than trusted as strings from the client.
  if (!PLANS.has(plan) || (platform === 'android' && !BILLINGS.has(body.billing))) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: corsHeaders(req) });
  }

  let verified: VerifiedPurchase | null = null;

  if (platform === 'ios') {
    verified = await verifyAppleReceipt(receipt);
  } else if (platform === 'android') {
    verified = await verifyGoogleReceipt(receipt, plan, body.billing);
  }

  if (!verified) {
    return new Response(JSON.stringify({ error: 'Receipt validation failed' }), { status: 402, headers: corsHeaders(req) });
  }

  // Claim the purchase. A receipt stays valid no matter who presents it, so
  // without this one real subscription could upgrade any number of accounts —
  // every one of them getting a truthful "valid" answer from the store.
  //
  // Deliberately not an upsert on (platform, purchase_id): that would let a
  // second account overwrite the first account's claim and be upgraded, which is
  // the exact thing being prevented. Insert, and on the unique violation look at
  // who already owns it — the same user re-verifying is fine, anyone else is not.
  const claim = {
    user_id: user.id,
    platform,
    purchase_id: verified.purchaseId,
    product_id: verified.productId,
    plan: verified.plan,
    expires_at: verified.expiresAt,
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase.from('iap_purchases').insert(claim);

  if (insertError) {
    if (insertError.code !== '23505') {
      console.error('IAP claim failed:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to record purchase' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const { data: owner } = await supabase
      .from('iap_purchases')
      .select('user_id')
      .eq('platform', platform)
      .eq('purchase_id', verified.purchaseId)
      .maybeSingle();

    if (!owner || owner.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'This purchase is already linked to another account' }), {
        status: 409,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Same user re-verifying — refresh the stored expiry and carry on.
    await supabase.from('iap_purchases').update(claim)
      .eq('platform', platform).eq('purchase_id', verified.purchaseId);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: verified.plan,
      subscription_status: 'active',
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Profile update failed:', updateError);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500, headers: corsHeaders(req) });
  }

  return new Response(JSON.stringify({ plan: verified.plan }), {
    status: 200,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
});

// ── Apple receipt validation ─────────────────────────────────────────────────

async function verifyAppleReceipt(receiptData: string): Promise<VerifiedPurchase | null> {
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
      latest_receipt_info?: Array<{
        product_id: string;
        expires_date_ms: string;
        original_transaction_id: string;
      }>;
    };

    if (data.status === 21007) continue; // sandbox receipt sent to prod — retry with sandbox URL

    if (data.status !== 0) return null;

    const now = Date.now();
    const activeSub = (data.latest_receipt_info ?? [])
      .filter(t => parseInt(t.expires_date_ms) > now)
      .sort((a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms))[0];

    if (!activeSub) return null;
    const plan = PRODUCT_TO_PLAN[activeSub.product_id];
    if (!plan) return null;

    return {
      plan,
      productId: activeSub.product_id,
      // Stable across renewals, unlike the transaction id — this is the identity
      // of the subscription itself, which is what the claim is keyed on.
      purchaseId: activeSub.original_transaction_id,
      expiresAt: new Date(parseInt(activeSub.expires_date_ms)).toISOString(),
    };
  }
  return null;
}

// ── Google Play receipt validation ───────────────────────────────────────────

async function verifyGoogleReceipt(purchaseToken: string, plan: Plan, billing: Billing): Promise<VerifiedPurchase | null> {
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
    // 0 = payment pending, 1 = received, 2 = free trial, 3 = deferred upgrade
    paymentState?: number;
    cancelReason?: number;
    expiryTimeMillis: string;
  };

  if (parseInt(sub.expiryTimeMillis) < Date.now()) return null;

  // Only a received payment or an active free trial earns the plan. The previous
  // condition only rejected when a cancelReason was *also* present, so
  // paymentState 0 — payment pending, i.e. not paid — passed straight through
  // and granted the subscription. Deferred (3) has not started yet either.
  if (sub.paymentState !== 1 && sub.paymentState !== 2) return null;

  const planForProduct = PRODUCT_TO_PLAN[productId];
  if (!planForProduct) return null;

  return {
    plan: planForProduct,
    productId,
    // Google's token identifies this subscription; it is what the claim is keyed on.
    purchaseId: purchaseToken,
    expiresAt: new Date(parseInt(sub.expiryTimeMillis)).toISOString(),
  };
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
