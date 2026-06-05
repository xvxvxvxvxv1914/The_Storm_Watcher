import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NOAA_KP_URL  = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const NOAA_LIVE_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const BASE_URL = 'https://www.thestormwatcher.com';
const FROM = 'The Storm Watcher <hello@thestormwatcher.com>';

interface KpHistEntry { kp_index?: number; estimated_kp?: number }

function stormLevel(kp: number): string {
  if (kp >= 9) return 'G5 — Extreme';
  if (kp >= 8) return 'G4 — Severe';
  if (kp >= 7) return 'G3 — Strong';
  if (kp >= 6) return 'G2 — Moderate';
  if (kp >= 5) return 'G1 — Minor';
  return 'Quiet';
}

function kpColor(kp: number): string {
  if (kp >= 7) return '#ef4444';
  if (kp >= 5) return '#f97316';
  if (kp >= 3) return '#eab308';
  return '#10b981';
}

async function sendEmail(to: string, subject: string, html: string, resendKey: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

function buildEmail(
  email: string,
  currentKp: number,
  maxKp: number,
  stormCount: number,
  weekLabel: string,
): string {
  const color = kpColor(maxKp);
  const level = stormLevel(maxKp);
  const quietWeek = maxKp < 3;

  const summaryText = quietWeek
    ? 'Quiet week — the geomagnetic field was calm with no significant activity.'
    : stormCount > 0
      ? `${stormCount} geomagnetic storm event${stormCount > 1 ? 's' : ''} were detected (Kp ≥ 5) this week.`
      : 'Low-level geomagnetic activity — no major storms this week.';

  const unsubUrl = `${BASE_URL}/settings`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Space Weather Digest</title>
  <div style="display:none;max-height:0;overflow:hidden;">Weekly space weather summary — Max Kp: ${maxKp.toFixed(1)}&nbsp;&zwnj;&nbsp;&zwnj;</div>
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#030712;">
    <tr>
      <td align="center" style="padding:48px 20px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <a href="${BASE_URL}" style="text-decoration:none;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#064e3b,#0f172a);border:1px solid #065f46;border-radius:14px;padding:14px 20px;">
                      <span style="font-size:22px;vertical-align:middle;">🌌</span>&nbsp;
                      <span style="color:#10b981;font-size:17px;font-weight:700;letter-spacing:0.3px;vertical-align:middle;">The Storm Watcher</span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:40px 36px;">

              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#f1f5f9;">
                Weekly Space Weather Digest
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">${weekLabel}</p>

              <!-- Stats row -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td width="48%" style="background:#0f1a2e;border:1px solid #1e293b;border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:11px;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Current Kp</div>
                    <div style="font-size:28px;font-weight:800;color:${kpColor(currentKp)};">${currentKp.toFixed(1)}</div>
                    <div style="font-size:11px;color:#475569;margin-top:4px;">${stormLevel(currentKp)}</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#0f1a2e;border:1px solid #1e293b;border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:11px;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Peak Kp (3 days)</div>
                    <div style="font-size:28px;font-weight:800;color:${color};">${maxKp.toFixed(1)}</div>
                    <div style="font-size:11px;color:#475569;margin-top:4px;">${level}</div>
                  </td>
                </tr>
              </table>

              <!-- Storm events -->
              ${stormCount > 0 ? `
              <div style="background:#1a0a00;border:1px solid #f97316/30;border-color:rgba(249,115,22,0.3);border-radius:10px;padding:12px 16px;margin-bottom:20px;">
                <span style="font-size:13px;color:#f97316;font-weight:600;">⚡ ${stormCount} storm event${stormCount > 1 ? 's' : ''} this week (Kp ≥ 5)</span>
              </div>` : ''}

              <!-- Summary -->
              <p style="font-size:15px;color:#94a3b8;line-height:1.6;margin:0 0 24px;">${summaryText}</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:10px;padding:1px;">
                    <a href="${BASE_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:9px;color:#fff;font-weight:700;font-size:14px;text-decoration:none;">
                      Open Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #1e293b;margin:0 0 20px;">
              <p style="font-size:12px;color:#475569;margin:0;line-height:1.7;">
                You're receiving this because you opted in to weekly digests.<br>
                <a href="${unsubUrl}" style="color:#475569;text-decoration:underline;">Unsubscribe in Settings</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;color:#475569;font-size:12px;line-height:1.9;">
              © 2026 The Storm Watcher &nbsp;·&nbsp;
              <a href="${BASE_URL}" style="color:#475569;text-decoration:underline;">thestormwatcher.com</a><br>
              <a href="${BASE_URL}/privacy" style="color:#475569;text-decoration:underline;">Privacy Policy</a>
              &nbsp;·&nbsp;
              <a href="${BASE_URL}/terms" style="color:#475569;text-decoration:underline;">Terms of Service</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Fetch live Kp
  let currentKp = 0;
  try {
    const res = await fetch(NOAA_LIVE_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data: KpHistEntry[] = await res.json();
      if (data.length > 0) {
        const latest = data[data.length - 1];
        currentKp = latest.kp_index ?? latest.estimated_kp ?? 0;
      }
    }
  } catch { /* non-fatal */ }

  // 2. Fetch 3-day Kp history for max/storm count
  let maxKp = currentKp;
  let stormCount = 0;
  try {
    const res = await fetch(NOAA_KP_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const raw: unknown[][] = await res.json();
      // Skip header row (index 0)
      for (let i = 1; i < raw.length; i++) {
        const kp = parseFloat(String(raw[i][1]));
        if (!isNaN(kp)) {
          if (kp > maxKp) maxKp = kp;
          if (kp >= 5) stormCount++;
        }
      }
    }
  } catch { /* non-fatal */ }

  // 3. Build week label
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekLabel = `${fmt(weekStart)} – ${fmt(now)}, ${now.getFullYear()}`;

  // 4. Query opted-in users
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('weekly_digest', true);

  if (error) {
    console.error('DB query failed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ sent: 0, kp: currentKp }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. Send emails
  let sent = 0;
  let failed = 0;
  const subject = `Space Weather Digest — ${fmt(weekStart)}`;

  await Promise.allSettled(
    users.map(async (u: { id: string; email: string }) => {
      try {
        const html = buildEmail(u.email, currentKp, maxKp, stormCount, weekLabel);
        await sendEmail(u.email, subject, html, resendKey);
        sent++;
      } catch (err) {
        console.error(`Email failed for ${u.id}:`, err);
        failed++;
      }
    })
  );

  console.log(`Digest sent=${sent} failed=${failed} kp=${currentKp.toFixed(1)} maxKp=${maxKp.toFixed(1)} storms=${stormCount}`);
  return new Response(
    JSON.stringify({ sent, failed, kp: currentKp, maxKp, stormCount }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
