import './testEnv.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildWelcomeEmail, buildLinksEmail, buildCheckInEmail, manageUrl } = await import('../server/services/posterEmails.js');

const token = 'A'.repeat(43);
const post = { title: 'Fence building', email: 'fencing@example.com', postType: 'offering_services', durationDays: 45 };

test('the manage link keeps the token after "#", so it never reaches server logs', () => {
  assert.equal(manageUrl(token), `https://directory.example.org/manage#token=${token}`);
});

test('the welcome email has the link, the shelf life and a warning not to share it', () => {
  const email = buildWelcomeEmail(post, token);
  assert.equal(email.to, 'fencing@example.com');
  assert.match(email.text, new RegExp(`manage#token=${token}`));
  assert.match(email.text, /45 days/);
  assert.match(email.text, /don't share it/);
});

test('businesses are told they stay up instead of a shelf life', () => {
  assert.match(buildWelcomeEmail({ ...post, postType: 'business' }, token).text, /stay up/);
});

test('the lost-link email lists a link per post', () => {
  const email = buildLinksEmail('a@example.com', [{ post: { title: 'One' }, token }, { post: { title: 'Two' }, token: 'B'.repeat(43) }]);
  assert.match(email.text, /One\n.*#token=A{43}/);
  assert.match(email.text, /Two\n.*#token=B{43}/);
});

test('check-ins ask businesses to confirm and other posts to renew', () => {
  assert.match(buildCheckInEmail({ ...post, postType: 'business' }, token).text, /confirm it/);
  assert.match(buildCheckInEmail(post, token).text, /renew it/);
});

test('emails never include the submitter name', () => {
  const withNames = { ...post, submitterFirstName: 'Mary', submitterLastName: 'Jones' };
  for (const email of [buildWelcomeEmail(withNames, token), buildCheckInEmail(withNames, token)]) {
    assert.doesNotMatch(`${email.subject} ${email.text}`, /Mary|Jones/);
  }
});
