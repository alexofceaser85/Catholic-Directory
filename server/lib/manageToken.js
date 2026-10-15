// The secret in a poster's "manage your post" link (/manage#token=...).
// The token is 32 random bytes, so it can't be guessed. The database only stores its
// SHA-256 hash: someone who reads the database still can't build a working link.
import crypto from 'node:crypto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 bytes in base64url

export function hashManageToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** @returns {{ token: string, hash: string }} The token goes in the email, the hash in the database. */
export function createManageToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashManageToken(token) };
}

export function isWellFormedToken(token) {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}
