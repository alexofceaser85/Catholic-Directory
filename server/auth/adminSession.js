// Admin sign-in state, stored in a signed, HTTP-only cookie.
import config from '../config.js';
import { parseCookies } from '../lib/cookies.js';
import { createSessionToken, readSessionToken } from '../lib/sessionToken.js';

const COOKIE_NAME = 'clm_admin_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

const cookieOptions = {
  httpOnly: true, // JavaScript in the page can't read it.
  sameSite: 'strict', // Never sent on requests from other sites (blocks CSRF).
  secure: config.isProduction, // HTTPS only on the live site.
  path: '/',
};

export function isAdminEmail(email) {
  return Boolean(email) && config.adminEmails.includes(email.toLowerCase());
}

export function startSession(res, email) {
  const token = createSessionToken(email.toLowerCase(), config.sessionSecret, MAX_AGE_MS);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: MAX_AGE_MS });
}

export function endSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

/**
 * Returns the signed-in admin's email, or null.
 * The allowlist is re-checked on every request, so removing someone from
 * ADMIN_EMAILS locks them out immediately.
 */
export function getAdminEmail(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  const email = readSessionToken(token, config.sessionSecret);
  return isAdminEmail(email) ? email : null;
}
