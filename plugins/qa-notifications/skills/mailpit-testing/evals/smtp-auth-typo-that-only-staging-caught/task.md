# Staging rejected our mailer credentials and CI has been green on the same config for six weeks

## Problem Description

We moved off the old open relay onto an authenticated one six weeks ago. The
mailer grew a username and password, everything went green locally and in CI,
and it sat there until Wednesday's staging deploy, which fell over the first
time anything tried to send. The relay answers
`530 5.7.0 Authentication Required` and the deploy log has the SMTP transcript
in it — our platform engineer turned on protocol-level logging before rolling
back, so you can see the whole conversation.

I have diffed the config between CI and staging three times. The code is the
same file. The variable names are the same. I cannot see what is different, and
"it works on my machine and in CI" is doing a lot of work here.

What is bothering me more than the outage is that 41 CI runs and about 300 local
runs have exercised the send path since the auth change and not one of them went
red. Whatever is wrong has been wrong the entire time. The only other thing that
moved in that window is PR #1043, which changed the mail container in
`docker-compose.test.yml` to get local sends working again after the credentials
went in — the note is still in the file.

So: find it, fix it, and give me a test that fails when it is wrong. And to be
specific about what I mean by "when it is wrong" — we rotate that relay password
on a 90-day cycle, and the next rotation is in three weeks. If someone rotates
it and forgets to update the secret, I want the build to go red before the
deploy does, not after.

## Output Specification

1. Identify and fix the defect. Say in your answer which file and which line.
2. Change whatever is needed in `docker-compose.test.yml`, `.env.test`,
   `src/mailer-config.mjs` and the test files so that a wrong, missing or stale
   credential makes the suite fail.
3. Keep the two tests in `test/config.test.mjs` passing.
4. Write `docs/smtp-auth-gap.md`: why CI could be green for six weeks while the
   same code failed on the first authenticated relay it met, and what the suite
   now does differently.

## Input Files

Extract the following files before beginning.

=============== FILE: src/mailer-config.mjs ===============
export function smtpConfig(env = process.env) {
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASSWORD;

  return {
    host: env.SMTP_HOST ?? 'localhost',
    port: Number(env.SMTP_PORT ?? 1025),
    secure: false,
    // Local capture does not need credentials, so fall through when they are absent.
    auth: user && pass ? { user, pass } : undefined,
  };
}

=============== FILE: .env.test ===============
APP_URL=http://localhost:3000
MAIL_API=http://localhost:8025
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=devmail
SMTP_PASS=devmail-local-password

=============== FILE: scripts/load-env.mjs ===============
import { readFileSync } from 'node:fs';

// Minimal .env loader; we do not want a dependency for six lines.
export function loadEnv(path = '.env.test') {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
  }
}

=============== FILE: test/config.test.mjs ===============
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

=============== FILE: test/email/delivery.test.mjs ===============
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../../scripts/load-env.mjs';
import { smtpConfig } from '../../src/mailer-config.mjs';
import { sendPasswordReset } from '../../src/notifications.mjs';
import { createTransport } from '../../src/transport.mjs';

loadEnv();
const API = process.env.MAIL_API;

beforeEach(async () => {
  await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
});

async function waitForMessage(to, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages = [] } = await res.json();
    if (messages.length) {
      return (await fetch(`${API}/api/v1/message/${messages[0].ID}`)).json();
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`no mail for ${to} within ${timeoutMs}ms`);
}

test('password reset is delivered over the configured relay', async () => {
  const transport = createTransport(smtpConfig());
  await sendPasswordReset(transport, { id: 'u1', email: 'alice@example.com' }, 'tok-9931');
  const msg = await waitForMessage('alice@example.com');
  assert.equal(msg.Subject, 'Reset your password');
  assert.match(msg.Text, /\/reset\?token=/);
});

=============== FILE: docker-compose.test.yml ===============
services:
  mail:
    image: axllent/mailpit:v1.20.0
    environment:
      # PR #1043 (2026-07-29): after the mailer grew credentials, local sends
      # started failing with "must issue a STARTTLS command first". These two
      # cleared it and CI has been green since.
      MP_SMTP_AUTH_ACCEPT_ANY: '1'
      MP_SMTP_AUTH_ALLOW_INSECURE: '1'
    ports:
      - '1025:1025'
      - '8025:8025'

  app:
    build: .
    env_file: .env.test
    depends_on: [mail]

=============== FILE: deploy/staging-2026-09-09.log ===============
# staging deploy 2026-09-09T14:31Z — protocol logging enabled before rollback

14:31:02 app  starting, NODE_ENV=staging
14:31:02 app  smtp target relay.mailprovider.example:587
14:31:04 app  [smtp] C: EHLO harbour-staging
14:31:04 app  [smtp] S: 250-relay.mailprovider.example Hello
14:31:04 app  [smtp] S: 250-STARTTLS
14:31:04 app  [smtp] S: 250-AUTH PLAIN LOGIN
14:31:04 app  [smtp] S: 250 OK
14:31:04 app  [smtp] C: STARTTLS
14:31:04 app  [smtp] S: 220 Ready to start TLS
14:31:05 app  [smtp] C: EHLO harbour-staging
14:31:05 app  [smtp] S: 250-AUTH PLAIN LOGIN
14:31:05 app  [smtp] S: 250 OK
14:31:05 app  [smtp] C: MAIL FROM:<security@example.com>
14:31:05 app  [smtp] S: 530 5.7.0 Authentication Required
14:31:05 app  [smtp] C: QUIT
14:31:05 app  ERROR sendPasswordReset failed for u1: 530 5.7.0 Authentication Required
14:31:41 deploy  health check failed 3/3, rolling back to build 2891

# staging env, as rendered by the deploy (secret values redacted)
SMTP_HOST=relay.mailprovider.example
SMTP_PORT=587
SMTP_USER=harbour-staging
SMTP_PASS=***redacted***

=============== FILE: ci/email-tests.yml ===============
name: email

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: docker compose -f docker-compose.test.yml up -d mail
      - run: npm run app:start &
      - run: node --test test/
