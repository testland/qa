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
  clear-and-capture window at the same time. Whoever wrote it ran the job twenty
  times and put the numbers in the patch note.

I have attached the two spec files, the shared helper they both use, the CI
workflow, that patch, the raw job log from run #4471, and the mail container's
own log covering the same minutes. Nobody has correlated the two logs. The job
log is grouped by worker the way the test reporter emits it, so the timestamps
are the only thing tying it to the container's log. Run #4471 is representative
— it is the run we kept because it went red more than once.

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
4. Write `docs/email-suite-parallel-fix.md`: account for every failure in run
   #4471, and answer each of the three proposals directly.

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
          MAIL_DEBUG: '1'
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

Twenty runs on this branch: 19 green, 1 red. Wall clock across the twenty ran
between 9m02s and 11m48s, median 10m14s.

=============== FILE: reports/failure-rates.md ===============
# Email test failure rates, 120 runs before the concurrency change vs 86 after

| test                                               | serial (120) | 4 workers (86) |
|----------------------------------------------------|--------------|----------------|
| password reset email contains a reset link         | 0.0%         | 31.4%          |
| password reset email is addressed to the requester | 0.0%         | 29.1%          |
| welcome email greets the new user                  | 0.0%         | 26.7%          |
| welcome email is sent from the no-reply address    | 0.0%         | 34.9%          |

Wall clock for the whole job: 22m04s serial, 6m11s at four workers.

Across those 86 runs `welcome email is sent from the no-reply address` also
ended with `TypeError: Cannot read properties of undefined (reading 'From')`
seven times instead of an assertion failure.

## What a search result looks like on this container

Captured by hand against the same image, one welcome message in the mailbox,
pretty-printed:

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

=============== FILE: reports/run-4471-job.log ===============
# integration run #4471 — node --test --test-concurrency=4, MAIL_DEBUG=1
# grouped per worker, in the order the reporter flushed each file.
# tests/email/ holds four files; digest.test.mjs and invite.test.mjs are not
# failing and are not attached, but they use the same helper and appear here.

--- w1  tests/email/digest.test.mjs ---
14:02:19.884  DELETE /api/v1/messages                                    -> 200
14:02:19.888  POST   /_test/trigger-digest weekly@example.com            -> 202
14:02:20.140  GET    /api/v1/search?query=to%3Aweekly%40example.com      -> 200  1 message
14:02:20.143  PASS   digest lists this week's items                      (259ms)

--- w2  tests/email/password-reset.test.mjs ---
14:02:11.101  DELETE /api/v1/messages                                    -> 200
14:02:11.104  POST   /_test/trigger-password-reset qa@example.com        -> 202
14:02:11.311  GET    /api/v1/search?query=to%3Aqa%40example.com          -> 200  1 message  ID=8f2c1ad4-...
14:02:11.407  GET    /api/v1/message/8f2c1ad4-...                        -> 404
14:02:11.408  FAIL   password reset email contains a reset link
                     Error: fetch 8f2c1ad4-... failed: 404
                         at openMessage (tests/email/mailbox.mjs:26:21)
14:02:11.430  DELETE /api/v1/messages                                    -> 200
14:02:11.433  POST   /_test/trigger-password-reset qa@example.com        -> 202
14:02:11.640  GET    /api/v1/search?query=to%3Aqa%40example.com          -> 200  1 message
14:02:11.642  PASS   password reset email is addressed to the requester  (212ms)

--- w3  tests/email/invite.test.mjs ---
14:02:11.401  DELETE /api/v1/messages                                    -> 200
14:02:11.404  POST   /_test/trigger-invite teammate@example.com          -> 202
14:02:11.610  GET    /api/v1/search?query=to%3Ateammate%40example.com    -> 200  1 message
14:02:11.613  PASS   invite email links to the workspace                 (212ms)
14:02:25.010  DELETE /api/v1/messages                                    -> 200
14:02:25.014  POST   /_test/trigger-invite teammate@example.com          -> 202
14:02:25.240  GET    /api/v1/search?query=to%3Ateammate%40example.com    -> 200  1 message
14:02:25.243  PASS   invite email names the inviter                      (233ms)

--- w4  tests/email/welcome.test.mjs ---
14:02:19.877  DELETE /api/v1/messages                                    -> 200
14:02:19.880  POST   /_test/trigger-welcome newuser@example.com          -> 202
14:02:19.982  GET    /api/v1/search?query=to%3Anewuser%40example.com     -> 200  0 messages
14:02:20.083  GET    /api/v1/search?query=to%3Anewuser%40example.com     -> 200  0 messages
              ... 46 further polls, all 0 messages ...
14:02:24.887  FAIL   welcome email greets the new user
                     Error: timed out after 5000ms waiting for mail to newuser@example.com
14:02:24.920  DELETE /api/v1/messages                                    -> 200
14:02:24.923  POST   /_test/trigger-welcome newuser@example.com          -> 202
14:02:25.173  GET    /api/v1/messages                                    -> 200  2 messages
14:02:25.174  FAIL   welcome email is sent from the no-reply address
                     AssertionError: expected 'noreply@example.com', got 'invites@example.com'

# 3 failed, 9 passed, 12 total — 1m58s

=============== FILE: reports/run-4471-mail.log ===============
# mail container log, run #4471, 14:02:10 - 14:02:33

14:02:10.988  [smtp] connection from 127.0.0.1
14:02:11.240  [smtp] message from <security@example.com> to <qa@example.com> accepted (3.1 kB)
14:02:11.520  [smtp] message from <invites@example.com> to <teammate@example.com> accepted (2.7 kB)
14:02:11.562  [smtp] message from <security@example.com> to <qa@example.com> accepted (3.1 kB)
14:02:19.883  [smtp] message from <noreply@example.com> to <newuser@example.com> accepted (4.4 kB)
14:02:20.012  [smtp] message from <digest@example.com> to <weekly@example.com> accepted (6.2 kB)
14:02:25.050  [smtp] message from <noreply@example.com> to <newuser@example.com> accepted (4.4 kB)
14:02:25.160  [smtp] message from <invites@example.com> to <teammate@example.com> accepted (2.7 kB)
