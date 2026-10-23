// Sends email through Resend's API over HTTPS, from an address on the site's own domain.
// Used on hosts that block SMTP ports (Railway). See docs/deployment.md.
import config from '../config.js';

const SEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

/** @param {{ from: string, to: string, subject: string, text: string }} message */
export async function sendWithResend({ from, to, subject, text }) {
  const response = await fetch(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.mail.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    // Resend explains the problem (bad key, unverified domain…) in the body's "message".
    const body = await response.json().catch(() => ({}));
    throw new Error(`Resend refused the email (${response.status}): ${body.message || response.statusText}`);
  }
}
