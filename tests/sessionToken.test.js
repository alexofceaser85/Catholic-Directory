import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, readSessionToken } from '../server/lib/sessionToken.js';
import { parseCookies } from '../server/lib/cookies.js';

const SECRET = 'a'.repeat(40);
const HOUR = 60 * 60 * 1000;

test('a fresh token reads back its email', () => {
  const token = createSessionToken('admin@example.com', SECRET, HOUR);
  assert.equal(readSessionToken(token, SECRET), 'admin@example.com');
});

test('an expired token is rejected', () => {
  const token = createSessionToken('admin@example.com', SECRET, HOUR, Date.now() - 2 * HOUR);
  assert.equal(readSessionToken(token, SECRET), null);
});

test('a token signed with another secret is rejected', () => {
  const token = createSessionToken('admin@example.com', 'b'.repeat(40), HOUR);
  assert.equal(readSessionToken(token, SECRET), null);
});

test('an edited payload is rejected', () => {
  const token = createSessionToken('admin@example.com', SECRET, HOUR);
  const [, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ email: 'attacker@example.com', expiresAt: Date.now() + HOUR }))
    .toString('base64url');
  assert.equal(readSessionToken(`${forged}.${signature}`, SECRET), null);
});

test('garbage tokens are rejected without throwing', () => {
  for (const token of [undefined, '', 'abc', 'a.b.c', '.']) {
    assert.equal(readSessionToken(token, SECRET), null);
  }
});

test('parseCookies reads multiple cookies and tolerates bad encoding', () => {
  assert.deepEqual(parseCookies('a=1; b=hello%20world; c=%E0%A4%A'), { a: '1', b: 'hello world', c: '%E0%A4%A' });
  assert.deepEqual(parseCookies(undefined), {});
});
