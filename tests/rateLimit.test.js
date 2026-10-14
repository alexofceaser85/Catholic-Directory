import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../server/middleware/rateLimit.js';

function fakeResponse() {
  return { headers: {}, set(name, value) { this.headers[name] = value; } };
}

test('allows up to `max` requests per IP, then blocks with 429', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2, message: 'Slow down' });
  const req = { ip: '1.2.3.4' };
  let passed = 0;
  const next = () => { passed += 1; };

  limiter(req, fakeResponse(), next);
  limiter(req, fakeResponse(), next);
  assert.equal(passed, 2);

  const res = fakeResponse();
  assert.throws(() => limiter(req, res, next), (error) => error.status === 429 && error.message === 'Slow down');
  assert.ok(Number(res.headers['Retry-After']) > 0);
});

test('counts each IP separately', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1, message: 'Slow down' });
  limiter({ ip: '1.1.1.1' }, fakeResponse(), () => {});
  assert.doesNotThrow(() => limiter({ ip: '2.2.2.2' }, fakeResponse(), () => {}));
});
