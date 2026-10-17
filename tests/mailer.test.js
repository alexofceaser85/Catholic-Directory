import './testEnv.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { default: config } = await import('../server/config.js');
const { mailMethod } = await import('../server/lib/mailer.js');
const { toRawMessage } = await import('../server/lib/gmailApi.js');

function withMailSettings({ host = '', refreshToken = '' }, check) {
  const saved = { host: config.mail.host, refreshToken: config.mail.gmail.refreshToken };
  Object.assign(config.mail, { host });
  Object.assign(config.mail.gmail, { refreshToken });
  try {
    check();
  } finally {
    Object.assign(config.mail, { host: saved.host });
    Object.assign(config.mail.gmail, { refreshToken: saved.refreshToken });
  }
}

test('with no mail settings, nothing is sent', () => {
  withMailSettings({}, () => assert.equal(mailMethod(), null));
});

test('SMTP is used when only MAIL_HOST is set', () => {
  withMailSettings({ host: 'smtp.example.org' }, () => assert.equal(mailMethod(), 'smtp'));
});

test('the Gmail API wins when its refresh token is set, since SMTP may be blocked', () => {
  withMailSettings({ host: 'smtp.example.org', refreshToken: 'token' }, () => assert.equal(mailMethod(), 'gmail-api'));
});

test('the Gmail API message is the whole email, base64url-encoded', async () => {
  const raw = await toRawMessage({
    from: 'Directory <directory@example.org>',
    to: 'poster@example.com',
    subject: 'We got your post',
    text: 'Use this link: https://directory.example.org/manage#token=abc',
  });
  assert.doesNotMatch(raw, /[+/=]/, 'base64url has no +, / or = characters');
  const email = Buffer.from(raw, 'base64url').toString();
  assert.match(email, /^To: poster@example\.com$/m);
  assert.match(email, /^Subject: We got your post$/m);
  assert.match(email, /manage#token=abc/);
});
