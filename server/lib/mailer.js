// Sends plain-text email through SMTP (any provider: Gmail, Brevo, Mailgun, Postmark…).
// Settings come from MAIL_* in .env; see docs/deployment.md.
import nodemailer from 'nodemailer';
import config from '../config.js';

let transport = null;

function getTransport() {
  transport ??= nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
  });
  return transport;
}

/** Without MAIL_HOST: prints the email in development (so you can click the links), skips it in production. */
function reportUnsentEmail({ to, subject, text }) {
  if (config.isProduction) {
    console.warn(`Email to ${to} not sent: MAIL_HOST is not set.`);
    return;
  }
  console.log(`\n----- Email (not sent: MAIL_HOST is empty) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----\n`);
}

/** @param {{ to: string, subject: string, text: string }} message */
export async function sendEmail(message) {
  if (!config.mail.host) {
    reportUnsentEmail(message);
    return;
  }
  await getTransport().sendMail({ from: config.mail.from, ...message });
}
