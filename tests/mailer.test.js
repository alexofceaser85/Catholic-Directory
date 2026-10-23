import './testEnv.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { default: config } = await import('../server/config.js');
const { mailMethod } = await import('../server/lib/mailer.js');
const { toRawMessage } = await import('../server/lib/gmailApi.js');

function withMailSettings({ host = '', refreshToken = '', resendApiKey = '' }, check) {
  const saved = { host: config.mail.host, refreshToken: config.mail.gmail.refreshToken, resendApiKey: config.mail.resendApiKey };
  Object.assign(config.mail, { host, resendApiKey });
  Object.assign(config.mail.gmail, { refreshToken });
  try {
    check();
  } finally {
    Object.assign(config.mail, { host: saved.host, resendApiKey: saved.resendApiKey });
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

test('Resend wins over the Gmail API and SMTP when its API key is set', () => {
  withMailSettings({ host: 'smtp.example.org', refreshToken: 'token', resendApiKey: 're_key' }, () =>
    assert.equal(mailMethod(), 'resend'));
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

test('Resend gets the email as JSON, and its error message is passed on', async () => {
  const { sendWithResend } = await import('../server/lib/resendApi.js');
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ message: 'The domain is not verified' }), { status: 403 });
  };
  try {
    const message = { from: 'Bulletin <hello@example.org>', to: 'poster@example.com', subject: 'Hi', text: 'Body' };
    await assert.rejects(sendWithResend(message), /403.*The domain is not verified/);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.deepEqual(JSON.parse(calls[0].options.body), message);
  } finally {
    globalThis.fetch = realFetch;
  }
});
