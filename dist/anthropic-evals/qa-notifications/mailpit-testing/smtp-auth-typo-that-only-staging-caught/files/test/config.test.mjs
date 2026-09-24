import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smtpConfig } from '../src/mailer-config.mjs';

test('defaults to the local capture host and port', () => {
  const c = smtpConfig({});
  assert.equal(c.host, 'localhost');
  assert.equal(c.port, 1025);
  assert.equal(c.secure, false);
});

test('builds an auth block when both credentials are present', () => {
  const c = smtpConfig({ SMTP_USER: 'devmail', SMTP_PASSWORD: 's3cret' });
  assert.deepEqual(c.auth, { user: 'devmail', pass: 's3cret' });
});
