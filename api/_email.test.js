import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMailer } from './_email.js';

test('sendAlert posts to Resend with bearer auth and a json body', async () => {
  process.env.RESEND_API_KEY  = 'test_key';
  process.env.ALERT_EMAIL_FROM = 'from@example.com';
  process.env.ALERT_EMAIL_TO   = 'to@example.com';

  const calls = [];
  const fakeFetch = async (url, opts) => { calls.push({ url, opts }); return { ok: true, async text() { return ''; } }; };

  const mailer = makeMailer(fakeFetch);
  await mailer.sendAlert('Subj', 'Body');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer test_key');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.subject, 'Subj');
  assert.equal(body.to, 'to@example.com');
  assert.equal(body.from, 'from@example.com');
});

test('sendAlert is a no-op (no throw) when RESEND_API_KEY is missing', async () => {
  delete process.env.RESEND_API_KEY;
  let called = false;
  const mailer = makeMailer(async () => { called = true; return { ok: true, async text() { return ''; } }; });
  await mailer.sendAlert('S', 'B');
  assert.equal(called, false);
});
