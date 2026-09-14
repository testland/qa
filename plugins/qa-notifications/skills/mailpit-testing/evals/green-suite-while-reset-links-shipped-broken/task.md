# Eleven days of dead password-reset links and the email suite stayed green the whole time

## Problem Description

INC-2214 closed yesterday. Between 14 and 25 August every password-reset email
we sent carried a link with no token in it — 4,102 of them — and the six
integration tests we have covering that exact email passed on every one of the
41 CI runs in that window. Support found it, not us. That is the part I care
about; the code fix is already merged.

The suite was written in 2023 against the capture container we used then. That
container stopped getting releases, so in September last year we swapped it for
the one we run now, and PR #1188 went through the test helper and moved the API
calls onto the new server's paths. CI was green before that PR and green after
it, so it was reviewed in about four minutes and nobody has looked at it since.

Our platform engineer spent Tuesday morning poking at the running container by
hand while we wrote the postmortem, and pasted what she found into the incident
doc along with the timeline.

AI-1 on the postmortem is mine: establish why the suite could not fail, and hand
back a suite I would be willing to gate a release on. I am not going to accept
"tests updated" as an answer. I want to be told what was wrong and in which
file, and how you know the same thing is not true of the version you hand back.

## Output Specification

1. Repair `tests/email/mailbox.mjs` and `tests/email/password-reset.test.mjs`.
   All six behaviours the file currently names must still be covered.
2. Add a regression test for INC-2214 to `tests/email/password-reset.test.mjs`.
3. Write `docs/inc-2214-test-gap.md`: what was wrong and where, why it left the
   suite incapable of failing, and what you did to establish that the version
   you are handing back can fail.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/email/mailbox.mjs ===============
const API = process.env.MAIL_API ?? 'http://localhost:8025';

export async function search(to) {
  const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
  if (!res.ok) return [];
  const body = await res.json();
  return body.messages ?? [];
}

export async function firstMatch(to, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await search(to);
    if (found.length) return found[0];
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export async function fullMessage(id) {
  const res = await fetch(`${API}/api/v1/messages/${id}`);
  return res.ok ? res.json() : {};
}

export function headersOf(msg) {
  return msg.Content?.Headers ?? {};
}

export function bodiesOf(msg) {
  return [msg.Content?.Body].filter(Boolean);
}

export function linksIn(msg) {
  const body = msg.Content?.Body ?? '';
  return [...body.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0]);
}

export async function clearAll() {
  await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
}

export async function requestReset(email) {
  const res = await fetch(`${process.env.APP_URL ?? 'http://localhost:3000'}/_test/password-reset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`trigger failed: ${res.status}`);
}

=============== FILE: tests/email/password-reset.test.mjs ===============
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAll,
  requestReset,
  firstMatch,
  fullMessage,
  headersOf,
  bodiesOf,
  linksIn,
} from './mailbox.mjs';

// Seeded by scripts/seed-mailbox.sh during CI bootstrap.
const SEEDED_ID = 'FVc8jL2qkQ3mHnPz9RtWbX';

const EXPECTED_HEADERS = {
  Subject: 'Reset your password',
  From: 'security@example.com',
  To: 'alice@example.com',
};

beforeEach(clearAll);

async function capture(email = 'alice@example.com') {
  await requestReset(email);
  const summary = await firstMatch(email);
  return fullMessage(summary.ID);
}

test('reset email carries the headers we expect', async () => {
  const msg = await capture();
  for (const [name, values] of Object.entries(headersOf(msg))) {
    if (name in EXPECTED_HEADERS) assert.equal(values[0], EXPECTED_HEADERS[name]);
  }
});

test('reset email is addressed to the requester', async () => {
  const msg = await capture();
  for (const addr of headersOf(msg).To ?? []) {
    assert.equal(addr, 'alice@example.com');
  }
});

test('reset email mentions the expiry window', async () => {
  const msg = await capture();
  for (const part of bodiesOf(msg)) {
    assert.ok(part.includes('expires in 30 minutes'));
  }
});

test('every link in the reset email points at our app', async () => {
  const msg = await capture();
  for (const link of linksIn(msg)) {
    assert.ok(link.startsWith('http://app:3000/'));
  }
});

test('the reset link carries a token', async () => {
  const msg = await capture();
  for (const link of linksIn(msg).filter((l) => l.includes('/reset'))) {
    assert.match(link, /token=[A-Za-z0-9_-]{16,}/);
  }
});

test('the seeded fixture message is readable', async () => {
  const msg = await fullMessage(SEEDED_ID);
  for (const [name, values] of Object.entries(headersOf(msg))) {
    if (name === 'Subject') assert.equal(values[0], 'Seed message');
  }
});

=============== FILE: docker-compose.ci.yml ===============
services:
  app:
    build: .
    environment:
      SMTP_HOST: mail
      SMTP_PORT: '1025'
      RESET_URL_BASE: http://app:3000
    depends_on: [mail]

  mail:
    # swapped 2025-09-11, the old image had not been released since 2020
    image: axllent/mailpit:v1.20.0
    ports:
      - '1025:1025'
      - '8025:8025'

=============== FILE: incident/INC-2214.md ===============
# INC-2214 — password-reset links shipped without a token

**Severity** S2 · **Window** 2026-08-14 09:20 UTC → 2026-08-25 16:05 UTC
**Affected** 4,102 password-reset emails · 611 support contacts

## What happened

A refactor moved token generation behind a feature flag that was never enabled
in production. `resetUrl()` kept building `${RESET_URL_BASE}/reset?token=${token}`
with `token` undefined, so every link in production read:

```
http://app.example.com/reset?token=undefined
```

Clicking it landed users on "This reset link is no longer valid."

## Why CI did not catch it

Unknown at the time of writing — this is what the postmortem action item asks
us to establish. The six tests in `tests/email/password-reset.test.mjs` ran on
all 41 CI runs in the window and reported 6 passed, 0 failed, every time.

## Poking at the container by hand (platform eng, 2026-08-26)

```
$ docker compose -f docker-compose.ci.yml up -d mail
$ docker compose logs mail | tail -2
mail  | accepting connections on [::]:1025
mail  | [smtp] message from <security@example.com> to <alice@example.com> accepted (2.1 kB)
$ curl -s -o /dev/null -w '%{http_code}\n' -X DELETE 'http://localhost:8025/api/v1/messages'
200
```

So the mail is arriving and the clear works. The web UI on :8025 shows the
password-reset message with its body and headers within a second of a trigger,
and clicking through to it shows the token missing exactly as production had it.

One further note she left: the container has an interactive API browser on
`http://localhost:8025/api/v1/` which nobody on this team has ever opened.

## Action items

- AI-1 (open) Establish why the suite could not fail and fix it.
- AI-2 (done) Enable the token flag in production.
