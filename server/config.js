// Reads settings from environment variables (and the .env file) in one place,
// so the rest of the code never touches process.env directly.
import 'dotenv/config';

// Secure by default: anything other than an explicit NODE_ENV=development is treated
// as production (HTTPS-only cookies, no email-only test sign-in).
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = !isDevelopment;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

function readEmailList(name) {
  return (process.env[name] || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function readSessionSecret() {
  const secret = requireEnv('SESSION_SECRET');
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long.');
  }
  return secret;
}

function readMaxPostDays() {
  const days = Number(process.env.MAX_POST_DAYS || 90);
  if (!Number.isInteger(days) || days < 4 || days > 365) {
    throw new Error('MAX_POST_DAYS must be a whole number of days from 4 to 365.');
  }
  return days;
}

function readPosterEmailLimitHours() {
  const hours = Number(process.env.POSTER_EMAIL_LIMIT_HOURS ?? 24);
  if (!Number.isInteger(hours) || hours < 0 || hours > 720) {
    throw new Error('POSTER_EMAIL_LIMIT_HOURS must be a whole number of hours from 0 (no limit) to 720.');
  }
  return hours;
}

const port = Number(process.env.PORT || 3000);

const config = {
  port,
  isProduction,
  trustProxy: process.env.TRUST_PROXY === 'true',

  db: {
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: requireEnv('DB_NAME'),
  },

  sessionSecret: readSessionSecret(),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  adminEmails: readEmailList('ADMIN_EMAILS'),
  devAdminLogin: isDevelopment && process.env.DEV_ADMIN_LOGIN === 'true',

  reverifyAfterDays: Number(process.env.REVERIFY_AFTER_DAYS || 90),
  // The longest a services or help-wanted post can show. Posters pick a quarter, half,
  // three quarters or all of it, or a date within it.
  maxPostDays: readMaxPostDays(),
  // Each email address can post once, and ask for its links once, per this many hours. Keeps
  // the site well inside the mail provider's sending limit. 0 turns the limit off.
  posterEmailLimitHours: readPosterEmailLimitHours(),

  // The address people type to reach the site. Used to build the "manage your post" links in emails.
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, ''),

  // Outgoing email, first match wins: Resend (RESEND_API_KEY), the Gmail API (GMAIL_REFRESH_TOKEN),
  // then SMTP (MAIL_HOST). Resend and the Gmail API go over HTTPS, so they work where SMTP is blocked.
  // With neither, emails are printed to the console in development and skipped (with a warning)
  // in production.
  mail: {
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT || 587),
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    from: process.env.MAIL_FROM || 'Local Catholic Bulletin <no-reply@example.com>',
    resendApiKey: process.env.RESEND_API_KEY || '',
    gmail: {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    },
  },
};

export default config;
