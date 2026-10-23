// Sends plain-text email through Resend, the Gmail API or any SMTP provider (Gmail, Brevo, Mailpit…).
// Settings come from RESEND_API_KEY, GMAIL_* and MAIL_* in .env; see docs/deployment.md.
import nodemailer from 'nodemailer';
import config from '../config.js';
import { sendWithGmailApi } from './gmailApi.js';
import { sendWithResend } from './resendApi.js';

// Give up on an unreachable mail server quickly instead of nodemailer's 2-minute default.
const SMTP_TIMEOUT_MS = 10_000;

let transport = null;

/** 'resend', 'gmail-api', 'smtp', or null when no mail settings are present. */
export function mailMethod() {
  if (config.mail.resendApiKey) return 'resend';
  if (config.mail.gmail.refreshToken) return 'gmail-api';
  if (config.mail.host) return 'smtp';
  return null;
}

function getTransport() {
  transport ??= nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  return transport;
}

/** Without mail settings: prints the email in development (so you can click the links), skips it in production. */
function reportUnsentEmail({ to, subject, text }) {
  if (config.isProduction) {
    console.warn(`Email to ${to} not sent: no mail settings (RESEND_API_KEY, GMAIL_* or MAIL_HOST).`);
    return;
  }
  console.log(`\n----- Email (not sent: no mail settings) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----\n`);
}

/** @param {{ to: string, subject: string, text: string }} message */
export async function sendEmail(message) {
  const email = { from: config.mail.from, ...message };
  switch (mailMethod()) {
    case 'resend':
      return sendWithResend(email);
    case 'gmail-api':
      return sendWithGmailApi(email);
    case 'smtp':
      return getTransport().sendMail(email);
    default:
      return reportUnsentEmail(message);
  }
}
