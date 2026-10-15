import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManageToken, hashManageToken, isWellFormedToken } from '../server/lib/manageToken.js';

test('tokens are random, well formed, and stored only as a hash', () => {
  const first = createManageToken();
  const second = createManageToken();
  assert.notEqual(first.token, second.token);
  assert.ok(isWellFormedToken(first.token));
  assert.match(first.hash, /^[0-9a-f]{64}$/);
  assert.equal(hashManageToken(first.token), first.hash);
  assert.ok(!first.hash.includes(first.token));
});

test('rejects anything that is not a token', () => {
  for (const value of [null, 42, '', 'short', 'a'.repeat(43) + '!', 'a b'.repeat(15)]) {
    assert.equal(isWellFormedToken(value), false);
  }
});
