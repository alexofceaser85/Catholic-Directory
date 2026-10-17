// Sends email through the Gmail API over HTTPS. Used on hosts that block SMTP ports (Railway).
// The refresh token comes from `node tools/gmail-authorize.js`; see docs/deployment.md.
import { OAuth2Client } from 'google-auth-library';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import config from '../config.js';

const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const TIMEOUT_MS = 10_000;

let client = null;

/** The client swaps the long-lived refresh token for short-lived access tokens as needed. */
function getClient() {
  if (!client) {
    const { clientId, clientSecret, refreshToken } = config.mail.gmail;
    client = new OAuth2Client(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
  }
  return client;
}

/** Gmail wants the whole email (headers and body) as one base64url string. */
export async function toRawMessage(message) {
  const mime = await new MailComposer(message).compile().build();
  return mime.toString('base64url');
}

/** @param {{ from: string, to: string, subject: string, text: string }} message */
export async function sendWithGmailApi(message) {
  const raw = await toRawMessage(message);
  await getClient().request({ url: SEND_URL, method: 'POST', data: { raw }, timeout: TIMEOUT_MS });
}
