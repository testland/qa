# Email tests went from never-red to red a third of the time the day we parallelised CI

## Problem Description

Our CI run was 22 minutes and people had stopped waiting for it, so on 3 August
we moved the integration job from one runner to four parallel workers. Total
wall time dropped to 6 minutes, which is what we wanted. The four email
integration tests, which had not gone red once in the previous 120 serial runs,
now fail somewhere between a quarter and a third of the time. Nothing about the
mailer changed that week — the only commit touching CI is the worker-count bump.

Everything else in the suite is fine at four workers. It is only the email
tests.

Three proposals are on the table and I would like this settled with evidence
rather than volume:

- Raise the five-second wait to thirty seconds. SMTP is async, four jobs share
  the runner, the runner is slower, so wait longer.
- Pin the email tests to a lane of their own so they always run alone, and
  accept the couple of minutes that costs.
- The third is already written and is attached as a patch. It puts a
  cross-process lock around the mailbox so two workers can never be inside the
  clear-and-capture window at the same time. Whoever wrote it ran the job
  twenty times and put the numbers in the patch note.

I have attached the two spec files, the shared helper they both use, the CI
workflow, that patch, and the annotated log from run #4471, which is a
representative failure — our platform engineer interleaved the four workers'
output and the mail container's own log by timestamp so you can see the
ordering. There are three distinct failures in that run and I do not think they
all have the same cause, which is partly why the three camps keep talking past
each other.

While you are in the welcome test: our support lead has been asking for months
for a check that the plain-text part of the welcome email actually contains the
person's name and the full sign-in URL, because corporate gateways strip the
HTML part and a blank email is what those users see. Add it.

## Output Specification

1. Rewrite `tests/email/mailbox.mjs`, `tests/email/password-reset.test.mjs` and
   `tests/email/welcome.test.mjs` so the four existing tests are correct under
   four concurrent workers. Do not delete a test and do not weaken an assertion.
2. Add the plain-text check the support lead asked for to
   `tests/email/welcome.test.mjs`.
3. Edit `ci/workflow.yml` only if your fix requires it. The job must not get
   slower than it is now.
4. Write `docs/email-suite-parallel-fix.md`: for each of the three failures in
   run #4471, name its cause, and answer each of the three proposals directly.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/email/mailbox.mjs ===============
const API = process.env.MAIL_API ?? 'http://localhost:8025';
const APP = process.env.APP_URL ?? 'http://localhost:3000';

export async function clearInbox() {
  const res = await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`clear failed: ${res.status}`);
}

export async function trigger(path, email) {
  const res = await fetch(`${APP}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`trigger ${path} failed: ${res.status}`);
}

export async function waitForMessage(to, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages = [] } = await res.json();
    if (messages.length) return messages[0];
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for mail to ${to}`);
}

export async function openMessage(id) {
  const res = await fetch(`${API}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`fetch ${id} failed: ${res.status}`);
  return res.json();
}

export async function latestMessage() {
  const res = await fetch(`${API}/api/v1/messages`);
  const { messages = [] } = await res.json();
  return messages[0];
}

=============== FILE: tests/email/password-reset.test.mjs ===============
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearInbox, trigger, waitForMessage, openMessage } from './mailbox.mjs';

beforeEach(clearInbox);

test('password reset email contains a reset link', async () => {
  await trigger('/_test/trigger-password-reset', 'qa@example.com');
  const found = await waitForMessage('qa@example.com');
  const msg = await openMessage(found.ID);
  assert.match(msg.Text, /\/reset\?token=[A-Za-z0-9_-]{20,}/);
});

test('password reset email is addressed to the requester', async () => {
  await trigger('/_test/trigger-password-reset', 'qa@example.com');
  const found = await waitForMessage('qa@example.com');
  assert.equal(found.To[0].Address, 'qa@example.com');
  assert.equal(found.Subject, 'Reset your password');
});

=============== FILE: tests/email/welcome.test.mjs ===============
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearInbox, trigger, waitForMessage, latestMessage } from './mailbox.mjs';

beforeEach(clearInbox);

test('welcome email greets the new user', async () => {
  await trigger('/_test/trigger-welcome', 'newuser@example.com');
  const found = await waitForMessage('newuser@example.com');
  assert.ok(found.Snippet.includes('Welcome to Harbour'));
});

test('welcome email is sent from the no-reply address', async () => {
  await trigger('/_test/trigger-welcome', 'newuser@example.com');
  await new Promise((r) => setTimeout(r, 250));
  const msg = await latestMessage();
  assert.equal(msg.From.Address, 'noreply@example.com');
});

=============== FILE: ci/workflow.yml ===============
name: integration

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      mail:
        image: axllent/mailpit:v1.20.0
        ports: ['1025:1025', '8025:8025']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run app:start &
      # 2026-08-03: was --test-concurrency=1, 22 min -> 6 min at 4
      - run: node --test --test-concurrency=4 tests/
        env:
          MAIL_API: http://localhost:8025
          APP_URL: http://localhost:3000
          SMTP_HOST: localhost
          SMTP_PORT: '1025'

=============== FILE: patches/0003-lock-the-mailbox.md ===============
# Proposed: cross-process lock around clear-and-capture

Two workers can be inside the clear-and-capture window at the same time. This
patch takes an exclusive lock on `.ci/mailbox.lock` before the clear and holds
it until that worker's message has been found, so the window is never shared.

```diff
 export async function clearInbox() {
+  await acquire('.ci/mailbox.lock');
   const res = await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
   if (!res.ok) throw new Error(`clear failed: ${res.status}`);
 }

 export async function waitForMessage(to, timeoutMs = 5000) {
   const deadline = Date.now() + timeoutMs;
   while (Date.now() < deadline) {
     const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
     const { messages = [] } = await res.json();
-    if (messages.length) return messages[0];
+    if (messages.length) {
+      await release('.ci/mailbox.lock');
+      return messages[0];
+    }
     await new Promise((r) => setTimeout(r, 100));
   }
+  await release('.ci/mailbox.lock');
   throw new Error(`timed out after ${timeoutMs}ms waiting for mail to ${to}`);
 }
```

Twenty runs on this branch: 19 green, 1 red (the no-reply test). Wall clock
across the twenty ran between 9m02s and 11m48s, median 10m14s.

=============== FILE: reports/ci-run-4471.md ===============
# integration run #4471 — four workers, worker output and mail-container log interleaved by timestamp

Failure rate by test, 120 runs before the concurrency change vs 86 runs after:

| test                                             | serial (120) | 4 workers (86) |
|--------------------------------------------------|--------------|----------------|
| password reset email contains a reset link        | 0.0%         | 31.4%          |
| password reset email is addressed to the requester | 0.0%        | 29.1%          |
| welcome email greets the new user                 | 0.0%         | 26.7%          |
| welcome email is sent from the no-reply address   | 0.0%         | 34.9%          |

Wall clock for the whole job: 22m04s serial, 6m11s at four workers.

Across those 86 runs the no-reply test also produced
`TypeError: Cannot read properties of undefined (reading 'From')` seven times.

## Failure 1 — "password reset email contains a reset link" (worker 2)

```
14:02:11.104 w2    POST /_test/trigger-password-reset  qa@example.com        -> 202
14:02:11.109 w1    DELETE /api/v1/messages                                   -> 200
14:02:11.240 mail  [smtp] message from <security@example.com> to <qa@example.com> accepted (3.1 kB)
14:02:11.311 w2    GET /api/v1/search?query=to%3Aqa%40example.com            -> 200  1 message  ID=8f2c1ad4-...
14:02:11.404 w3    DELETE /api/v1/messages                                   -> 200
14:02:11.407 w2    GET /api/v1/message/8f2c1ad4-...                          -> 404
14:02:11.408 w2    FAIL  Error: fetch 8f2c1ad4-... failed: 404
```

## Failure 2 — "welcome email greets the new user" (worker 4)

```
14:02:19.880 w4    POST /_test/trigger-welcome  newuser@example.com          -> 202
14:02:19.883 mail  [smtp] message from <noreply@example.com> to <newuser@example.com> accepted (4.4 kB)
14:02:19.884 w1    DELETE /api/v1/messages                                   -> 200
14:02:19.982 w4    GET /api/v1/search?query=to%3Anewuser%40example.com       -> 200  0 messages
14:02:20.083 w4    GET /api/v1/search?query=to%3Anewuser%40example.com       -> 200  0 messages
     ... 46 more polls, all 0 messages ...
14:02:24.887 w4    FAIL  Error: timed out after 5000ms waiting for mail to newuser@example.com
```

## Failure 3 — "welcome email is sent from the no-reply address" (worker 4)

```
14:02:31.550 w4    POST /_test/trigger-welcome  newuser@example.com          -> 202
14:02:31.640 w2    POST /_test/trigger-password-reset  qa@example.com        -> 202
14:02:31.701 mail  [smtp] message from <noreply@example.com> to <newuser@example.com> accepted (4.4 kB)
14:02:31.744 mail  [smtp] message from <security@example.com> to <qa@example.com> accepted (3.1 kB)
14:02:31.800 w4    GET /api/v1/messages                                      -> 200  2 messages
14:02:31.801 w4    FAIL  AssertionError: expected 'noreply@example.com', got 'security@example.com'
```

## What a search result actually looks like

Captured by hand against the same container image, one welcome message in the
mailbox, pretty-printed:

```
$ curl -s 'http://localhost:8025/api/v1/search?query=to%3Anewuser%40example.com' | jq '.messages[0]'
{
  "ID": "3c91e7be-5a11-4f2d-9a70-1d0e2f4b88c1",
  "MessageID": "20260803140219.2f1a@harbour",
  "Read": false,
  "From": { "Name": "Harbour", "Address": "noreply@example.com" },
  "To": [ { "Name": "Nadia Okonjo", "Address": "newuser@example.com" } ],
  "Cc": [],
  "Bcc": [],
  "Subject": "Welcome to Harbour",
  "Created": "2026-08-03T14:02:19.883Z",
  "Tags": [],
  "Size": 4438,
  "Attachments": 0,
  "Snippet": "Welcome to Harbour, Nadia. Your workspace is ready and your teammates Ivo and Priya are already in it. There is nothing to install. When you are ready to pick up where the tour left off, sign in h…"
}
```

The sign-in URL the support lead wants checked sits a further two paragraphs
down in the plain-text part. It is not in what is printed above.
