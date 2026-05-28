const BASE_URL = 'https://www.thestormwatcher.com';

function base(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>The Storm Watcher</title>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
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
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;color:#475569;font-size:12px;line-height:1.9;">
              © 2026 The Storm Watcher &nbsp;·&nbsp;
              <a href="${BASE_URL}" style="color:#475569;text-decoration:underline;">thestormwatcher.com</a>
              <br>
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

function btn(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#059669,#10b981);border-radius:12px;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
    <tr><td style="border-top:1px solid #1e293b;"></td></tr>
  </table>`;
}

function badge(emoji: string, label: string, color = '#10b981'): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
    <tr>
      <td style="background-color:${color}1a;border:1px solid ${color}33;border-radius:100px;padding:6px 16px;">
        <span style="color:${color};font-size:13px;font-weight:600;">${emoji}&nbsp; ${label}</span>
      </td>
    </tr>
  </table>`;
}

// ── Auth templates (for Supabase Dashboard — use {{ .ConfirmationURL }} etc.) ──

export function confirmationEmail(): string {
  const content = `
    ${badge('🌌', 'Welcome to The Storm Watcher')}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      Confirm your email
    </h1>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      You're one step away from tracking real-time geomagnetic storms, aurora forecasts, and space weather alerts.
    </p>
    ${btn('Confirm Email Address', '{{ .ConfirmationURL }}')}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      This link expires in <strong style="color:#94a3b8;">24 hours</strong>.<br>
      If you didn't create an account, you can safely ignore this email.
    </p>`;

  return base(content, 'Confirm your email to start tracking space weather.');
}

export function resetEmail(): string {
  const content = `
    ${badge('🔐', 'Password Reset', '#f59e0b')}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      Reset your password
    </h1>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      We received a request to reset the password for your account.<br>Click the button below to choose a new password.
    </p>
    ${btn('Reset Password', '{{ .ConfirmationURL }}')}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      This link expires in <strong style="color:#94a3b8;">1 hour</strong>.<br>
      If you didn't request a password reset, you can safely ignore this email.
    </p>`;

  return base(content, 'Reset your Storm Watcher password.');
}

export function emailChangeEmail(): string {
  const content = `
    ${badge('✉️', 'Email Change', '#6366f1')}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      Confirm your new email
    </h1>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      Click the button below to confirm this is your new email address for The Storm Watcher.
    </p>
    ${btn('Confirm New Email', '{{ .ConfirmationURL }}')}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      This link expires in <strong style="color:#94a3b8;">24 hours</strong>.<br>
      If you didn't request this change, please contact us immediately.
    </p>`;

  return base(content, 'Confirm your new email address.');
}

// ── Transactional emails (sent via Resend from webhook) ──

export function proActivatedEmail(plan: 'pro' | 'premium'): string {
  const isPremium = plan === 'premium';
  const planLabel = isPremium ? 'Premium' : 'Pro';
  const planColor = isPremium ? '#f59e0b' : '#10b981';
  const features = isPremium
    ? ['Everything in Pro', 'Unlimited saved locations', 'Custom Kp alert thresholds (3–9)', 'CSV data export', 'Priority email support', 'Early beta access']
    : ['Extended 7-day Kp forecast', '3D Aurora Globe', 'Push storm notifications', 'Aurora visibility % by location', 'Up to 10 saved locations'];

  const featureRows = features.map(f =>
    `<tr><td style="padding:5px 0;color:#94a3b8;font-size:14px;">
      <span style="color:${planColor};margin-right:8px;">✓</span>${f}
    </td></tr>`
  ).join('');

  const content = `
    ${badge(isPremium ? '⭐' : '🚀', `${planLabel} Plan Activated`, planColor)}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      Welcome to ${planLabel}!
    </h1>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      Your subscription is active. Here's what you now have access to:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e293b;border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${featureRows}
        </table>
      </td></tr>
    </table>
    ${btn('Open The Storm Watcher', BASE_URL)}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      Manage your subscription anytime in your
      <a href="${BASE_URL}/profile" style="color:#10b981;text-decoration:none;">Profile</a>.<br>
      Thank you for supporting The Storm Watcher 🌌
    </p>`;

  return base(content, `Your ${planLabel} plan is now active.`);
}

export function paymentFailedEmail(): string {
  const content = `
    ${badge('⚠️', 'Payment Failed', '#ef4444')}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      We couldn't process your payment
    </h1>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      Your subscription payment failed. Please update your payment method to keep your plan active.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a0a0a;border:1px solid #3f1515;border-radius:12px;padding:18px 24px;margin-bottom:8px;">
      <tr>
        <td style="color:#fca5a5;font-size:14px;line-height:1.7;">
          Your account will be downgraded to the <strong>Free plan</strong> if payment isn't resolved within 7 days. Your data will remain safe.
        </td>
      </tr>
    </table>
    ${btn('Update Payment Method', `${BASE_URL}/profile`)}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      Need help? Reply to this email or visit our
      <a href="${BASE_URL}/faq" style="color:#10b981;text-decoration:none;">FAQ</a>.
    </p>`;

  return base(content, 'Action required — your payment could not be processed.');
}

export function trialEndingEmail(daysLeft: number): string {
  const content = `
    ${badge('⏰', 'Trial Ending Soon', '#f59e0b')}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
    </h1>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      Add a payment method now to keep your Pro features uninterrupted. No charge until your trial ends.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e293b;border-radius:12px;padding:18px 24px;margin-bottom:8px;">
      <tr>
        <td style="color:#94a3b8;font-size:14px;line-height:1.7;">
          After the trial, your account moves to the <strong style="color:#f1f5f9;">Free plan</strong> if no payment method is added. Your sightings and data remain safe.
        </td>
      </tr>
    </table>
    ${btn('Add Payment Method', `${BASE_URL}/profile`)}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      Questions? Reply to this email — we're happy to help.
    </p>`;

  return base(content, `Your Storm Watcher trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`);
}

export function subscriptionCancelledEmail(): string {
  const content = `
    ${badge('💔', 'Subscription Cancelled', '#64748b')}
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:24px;font-weight:700;text-align:center;line-height:1.3;">
      Your subscription has ended
    </h1>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;text-align:center;line-height:1.6;">
      Your plan has been cancelled and your account has been moved to the Free plan. Your data and sightings are safe.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e293b;border-radius:12px;padding:18px 24px;margin-bottom:8px;">
      <tr>
        <td style="color:#94a3b8;font-size:14px;line-height:1.7;">
          You still have access to the free features — real-time Kp index, solar wind, UV, ISS tracker, and more. We hope to see you back! 🌌
        </td>
      </tr>
    </table>
    ${btn('Reactivate Plan', `${BASE_URL}/pricing`)}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.7;">
      Thank you for being part of The Storm Watcher community.<br>
      If you have feedback, we'd love to hear it — just reply to this email.
    </p>`;

  return base(content, 'Your Storm Watcher subscription has ended.');
}
