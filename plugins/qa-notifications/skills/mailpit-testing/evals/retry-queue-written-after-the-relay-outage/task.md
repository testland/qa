# We lost 2,840 password-reset emails in a relay wobble and the dashboards said 100% sent

## Problem Description

INC-3301 is written up and the postmortem is Tuesday. Short version: on
6 September our relay started answering `421 4.7.0 Too many concurrent
connections` for 38 minutes. Our mailer retried, ran out of attempts, logged a
warning nobody was watching, and returned. The caller carried on and marked
every one of those users as having been sent their password reset. 2,840 people
did not get one, and our send dashboard was flat green through the whole
incident because it counts what the caller marked, not what the relay accepted.

The same 38 minutes also produced 190 `550 5.1.1 user unknown` responses for
addresses that will never be valid. Each one was retried five times. That is
950 pointless connections into a relay that was already telling us it had too
many.

The mailer is `src/mailer.mjs`, the caller is `src/notifications.mjs`, and the
SMTP client they both go through is `src/transport.mjs`. All three are
attached, along with the incident write-up and the CI job as it stands today,
which runs the unit tests and nothing else.

Our backend dev has scoped the fix at half a day: branch on the response code,
add two more unit tests using the same transport stub the existing tests use,
and put a counter on the dashboard. It is cheap, it is in a language everyone
here reads, and I am inclined to take it — but I have to stand up on Tuesday
and say this exact failure is now covered, so tell me if there is something
wrong with it before I sign it off.

One more thing, from our PM, quoting verbatim: "while you're in there, use the
same failure-injection trick to cover the bounce handler — a 550 is a bounce,
isn't it?" The handler she means is `src/webhooks/bounces.mjs`, which has never
had a test. I would like a straight answer on that in writing, because she is
going to ask again in the postmortem.

## Output Specification

1. Fix `src/mailer.mjs` and `src/notifications.mjs` so the incident cannot
   repeat in the same shape.
2. Add tests for the failure paths. The two existing tests in
   `test/mailer.test.mjs` must still exist and still pass.
3. Update `ci/email-tests.yml` if your approach needs it.
4. Write `docs/inc-3301-coverage.md`: what is now covered and by which test,
   whether the half-day plan is sound, and a direct answer to the PM's question
   about the bounce handler.

## Input Files

Extract the following files before beginning.

=============== FILE: src/mailer.mjs ===============
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const deadLetters = [];

export async function sendWithRetry(transport, message, opts = {}) {
  const attempts = opts.attempts ?? 5;
  const delayMs = opts.delayMs ?? 200;
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await transport.send(message);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await sleep(delayMs);
    }
  }

  console.warn(`mailer: giving up on ${message.to}: ${lastError?.message}`);
  return { ok: false };
}

=============== FILE: src/transport.mjs ===============
import nodemailer from 'nodemailer';

export function createTransport(config) {
  const inner = nodemailer.createTransport(config);
  return {
    async send(message) {
      try {
        return await inner.sendMail(message);
      } catch (cause) {
        throw smtpError(cause);
      }
    },
  };
}

// Normalised in 2024 so callers never have to know which library raised.
function smtpError(cause) {
  const reply = String(cause.response ?? cause.message ?? '').trim();
  const err = new Error(reply || 'smtp failure');
  err.status = Number(reply.slice(0, 3)) || 0;
  err.smtpReply = reply;
  err.cause = cause;
  return err;
}

=============== FILE: src/notifications.mjs ===============
import { sendWithRetry } from './mailer.mjs';
import { users } from './store.mjs';

export async function sendPasswordReset(transport, user, token) {
  const message = {
    from: 'security@example.com',
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password: https://app.example.com/reset?token=${token}`,
  };

  const result = await sendWithRetry(transport, message);
  users.update(user.id, { lastResetSentAt: new Date().toISOString() });
  return result;
}

=============== FILE: src/store.mjs ===============
const rows = new Map();

export const users = {
  put(u) {
    rows.set(u.id, { emailStatus: 'ok', ...u });
    return rows.get(u.id);
  },
  byId(id) {
    return rows.get(id);
  },
  byEmail(email) {
    return [...rows.values()].find((u) => u.email === email);
  },
  update(id, patch) {
    const cur = rows.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    rows.set(id, next);
    return next;
  },
  reset() {
    rows.clear();
  },
};

=============== FILE: src/webhooks/bounces.mjs ===============
import { users } from '../store.mjs';

// POST /webhooks/email-events
export async function handleDeliveryEvent(payload) {
  if (payload.RecordType === 'Bounce' && payload.Type === 'HardBounce') {
    const user = users.byEmail(payload.Email);
    if (user) users.update(user.id, { emailStatus: 'bounced' });
  }
  return { ok: true };
}

=============== FILE: test/mailer.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendWithRetry } from '../src/mailer.mjs';

function transportThatSucceeds() {
  const sent = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
      return { accepted: [message.to], messageId: `m-${sent.length}` };
    },
  };
}

const message = { from: 'security@example.com', to: 'alice@example.com', subject: 'Reset your password', text: 'hi' };

test('returns the transport result on the first attempt', async () => {
  const transport = transportThatSucceeds();
  const result = await sendWithRetry(transport, message);
  assert.deepEqual(result.accepted, ['alice@example.com']);
  assert.equal(transport.sent.length, 1);
});

test('retries once after a transient failure and then succeeds', async () => {
  let calls = 0;
  const transport = {
    async send(m) {
      calls += 1;
      if (calls === 1) {
        const err = new Error('421 4.7.0 Too many concurrent connections');
        err.responseCode = 421;
        throw err;
      }
      return { accepted: [m.to], messageId: 'm-2' };
    },
  };
  const result = await sendWithRetry(transport, message, { delayMs: 1 });
  assert.deepEqual(result.accepted, ['alice@example.com']);
  assert.equal(calls, 2);
});

=============== FILE: ci/email-tests.yml ===============
name: email

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: node --test test/

=============== FILE: incident/INC-3301.md ===============
# INC-3301 — password-reset sends dropped during a relay throttle

**Severity** S1 · **Window** 2026-09-06 08:12 → 08:50 UTC

## Timeline

| Time (UTC) | Event |
|---|---|
| 08:12 | Relay begins answering `421 4.7.0 Too many concurrent connections` |
| 08:12 | Mailer starts retrying; 5 attempts, 200ms apart, per message |
| 08:14 | Send dashboard still reports 100% sent (counts `lastResetSentAt`) |
| 08:50 | Relay recovers on its own after the provider scales their pool |
| 11:40 | Support escalates 61 "I never got the email" tickets |
| 12:05 | Cause identified from application logs (`mailer: giving up on ...`) |

## Numbers

- 2,840 password-reset messages never accepted by the relay.
- 0 of them recorded anywhere except a `console.warn` line, which our log
  pipeline samples at 1%.
- 190 messages rejected `550 5.1.1 user unknown` during the same window; each
  was retried 5 times, for 950 connections to an already-throttled relay.
- Every one of the 2,840 users has a `lastResetSentAt` timestamp inside the
  window.

## Relay replies seen during the window, as logged by the transport

```
08:14:02  421 4.7.0 Too many concurrent connections from this IP
08:14:02  550 5.1.1 <j.mcgrath@oldco.example> user unknown
08:19:44  451 4.3.0 Temporary system problem, try again later
08:31:07  552 5.3.4 Message size exceeds fixed maximum message size
```

## Postmortem

Tuesday 10:00. Actions to be agreed there; nothing is decided yet.
