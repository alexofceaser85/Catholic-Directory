// Tiny signed-token helper for admin sessions.
// A token looks like "<payload>.<signature>". The payload is base64url JSON
// ({ email, expiresAt }); the signature is an HMAC so it can't be forged or edited.
// No session table needed: the server only has to know SESSION_SECRET.
import crypto from 'node:crypto';

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function signaturesMatch(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

export function createSessionToken(email, secret, maxAgeMs, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt: now + maxAgeMs })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the email inside a valid, unexpired token, or null. */
export function readSessionToken(token, secret, now = Date.now()) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || !signaturesMatch(signature, sign(payload, secret))) {
    return null;
  }
  try {
    const { email, expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof email === 'string' && expiresAt > now ? email : null;
  } catch {
    return null;
  }
}
