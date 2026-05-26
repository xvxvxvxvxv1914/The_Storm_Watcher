const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM = 'The Storm Watcher <hello@thestormwatcher.com>';

export async function sendEmail({
  to,
  subject,
  html,
  from = FROM,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
