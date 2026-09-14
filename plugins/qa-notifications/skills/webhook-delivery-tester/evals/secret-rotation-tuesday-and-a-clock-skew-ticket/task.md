# Rotating the payments endpoint secret on Tuesday, and an open ticket asking us to widen a check

## Problem Description

Halcyon Pay is forcing every merchant onto a new endpoint secret and our slot is
Tuesday 22 September, 09:00 UTC. I want to walk into that with the receiver
already able to survive it and a runbook I can hand to whoever is on call,
because the last rotation is still being talked about.

That was 4 February. We swapped the secret in the vault at the agreed minute and
the endpoint rejected everything Halcyon sent for twenty-two minutes, 1,106
deliveries, until someone thought to look at a raw request. The postmortem is in
the repo. I never understood the conclusion and the person who wrote it has left,
so treat it as raw material rather than an answer.

Separately there is ticket 4471, which I have bounced twice. On 19 August we
rejected 341 deliveries in a forty-minute window with `timestamp_out_of_tolerance`
and Halcyon's dashboard shows those as permanently failed — their retry budget ran
out during the same window, so nothing came back on its own. Our on-call proposal,
which two people have now +1'd, is to set the tolerance to 86400 and close the
ticket, on the grounds that a day is still finite and this cannot keep happening
during a payments incident. I am not comfortable signing that off but I cannot
articulate why well enough to overrule two engineers, so I would like it argued
properly one way or the other, using the attachments on the ticket rather than
first principles. If the answer is that we hold the line, then I also need to know
what happens to the 341.

Repo is plain Node, no dependencies, `node --test`. `src/verify.js` is the only
thing between Halcyon and our ledger, so I would rather it changed as little as
it has to and that whatever changes is covered.

## Output Specification

1. Whatever changes `src/verify.js` needs so Tuesday's rotation does not repeat
   4 February, with tests under `test/` covering the states the endpoint passes
   through during a rotation.
2. `docs/rotation-runbook.md` — the sequence for Tuesday, timed, including when
   each secret becomes live and when the one being replaced stops being accepted.
3. `docs/ticket-4471.md` — the decision on the tolerance proposal, argued from
   the attachments, plus what we do about the 341 deliveries.

## Input Files

Extract the following files before beginning.

=============== FILE: src/verify.js ===============
'use strict';

const crypto = require('node:crypto');

function currentSecret() {
  return process.env.HALCYON_WEBHOOK_SECRET || 'whsec_aGFsY3lvbi1wYXktZW5kcG9pbnQtc2VjcmV0LTQ=';
}

function tolerance() {
  return Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
}

function computeSignature(secret, id, timestamp, rawBody) {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([
    Buffer.from(id + '.' + timestamp + '.'),
    Buffer.from(rawBody),
  ]);
  return crypto.createHmac('sha256', key).update(signed).digest('base64');
}

function equal(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verify(rawBody, headers) {
  const id = headers['webhook-id'];
  const timestamp = Number(headers['webhook-timestamp']);
  const sigHeader = headers['webhook-signature'];

  if (!id || !Number.isFinite(timestamp) || !sigHeader) {
    return { ok: false, reason: 'missing_headers' };
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance()) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const provided = sigHeader.startsWith('v1,') ? sigHeader.slice(3) : '';
  const expected = computeSignature(currentSecret(), id, timestamp, rawBody);

  if (!equal(provided, expected)) {
    return { ok: false, reason: 'signature_mismatch' };
  }

  return { ok: true };
}

module.exports = { verify, computeSignature, currentSecret, tolerance };

=============== FILE: test/verify.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { verify, computeSignature, currentSecret } = require('../src/verify.js');

function headersFor(body, { id = 'msg_test', secret = currentSecret(), at = null } = {}) {
  const timestamp = at ?? Math.floor(Date.now() / 1000);
  return {
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': 'v1,' + computeSignature(secret, id, timestamp, body),
    'content-type': 'application/json',
  };
}

test('a delivery signed with the live secret is accepted', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_001"}}';
  assert.deepEqual(verify(body, headersFor(body)), { ok: true });
});

test('a delivery signed with an unknown secret is rejected', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_002"}}';
  const headers = headersFor(body, { secret: 'whsec_bm90LXRoZS1yaWdodC1zZWNyZXQtYXQtYWxsIQ==' });
  assert.equal(verify(body, headers).reason, 'signature_mismatch');
});

test('a body altered after signing is rejected', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_003","amount":1000}}';
  const headers = headersFor(body);
  const tampered = body.replace('1000', '100000');
  assert.equal(verify(tampered, headers).reason, 'signature_mismatch');
});

test('a delivery timestamped an hour ago is rejected', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_004"}}';
  const at = Math.floor(Date.now() / 1000) - 3600;
  assert.equal(verify(body, headersFor(body, { at })).reason, 'timestamp_out_of_tolerance');
});

=============== FILE: docs/postmortem-2026-02-04.md ===============
# Postmortem — 22 minutes of rejected Halcyon deliveries, 2026-02-04

**Impact:** 1,106 deliveries rejected with `signature_mismatch` between 09:00 and
09:22 UTC. All were redelivered after the fix; no ledger impact.

**What we did:** at 09:00:00 we replaced `HALCYON_WEBHOOK_SECRET` in the vault
with the new value from the Halcyon dashboard and rolled the pods.

**What happened:** every delivery from 09:00 onwards was rejected. At 09:14 we
reverted to the old secret and deliveries were *still* rejected. At 09:22 we set
the new secret again and rejections stopped on their own about a minute later.

**Raw request captured at 09:07 by @tstamatis** (endpoint returned 400,
`signature_mismatch`):

```
POST /webhooks/halcyon HTTP/1.1
content-type: application/json
webhook-id: msg_29PbVxKq4ZnR7LdT
webhook-timestamp: 1770195   (truncated in the paste, sorry)
webhook-signature: v1,sJ1xvKQ7xwTLmrz0S2N9pQ6UbYy3fH8EkDcVAoZ1tGI= v1,Kd7ZpMfR4sXnQb0LyT2wE9uH1vJ6cA3gN8iOrS5xYkU=

{"type":"payment.captured","data":{"id":"pay_88fd12"}}
```

**Halcyon support, ticket HP-77120, 2026-02-05:**

> Nothing was wrong on our side during your window. When a merchant secret is
> rotated we treat both the outgoing and the incoming secret as active for a
> fixed overlap and every delivery in that period is signed for each active key.
> You saw the overlap end at 09:23, which is when we stopped signing with the old
> key.

**Conclusion (@tstamatis):** looks like a propagation delay between the Halcyon
dashboard and their senders. Recommend scheduling the next rotation during a
quiet window and accepting ~20 minutes of rejections.

**Action items:** none taken.

=============== FILE: docs/ticket-4471.md ===============
# TICKET-4471 — Raise the webhook timestamp tolerance to 24 hours

**Opened** 2026-08-20 by @on-call · **Status** open, bounced twice

## Request

On 2026-08-19 between 03:12 and 03:53 UTC the endpoint rejected 341 Halcyon
deliveries with `timestamp_out_of_tolerance`. Halcyon's dashboard shows all 341
as permanently failed — their retry budget expired inside the same window.

Proposal: set `WEBHOOK_TOLERANCE_SECONDS=86400`. A day is still a finite window,
and this must not recur during a payments incident. +1 @rkeeling, +1 @amorse.

## Attachment 1 — chrony report, receiver host pay-hook-03

```
2026-08-19T03:08:41Z  chronyd: Can't synchronise: no selectable sources
2026-08-19T03:12:02Z  System clock wrong by -3180.442 seconds
2026-08-19T03:53:20Z  System clock wrong by -3180.219 seconds
2026-08-19T03:53:21Z  chronyd: Selected source 169.254.169.123
2026-08-19T03:53:21Z  System clock was stepped by +3180.331 seconds
```

Host was running without a selectable time source for 44 minutes. The other five
receiver hosts were synchronised throughout and served normally.

## Attachment 2 — rejection counts, August

| Day range              | Deliveries | `timestamp_out_of_tolerance` |
|------------------------|-----------:|-----------------------------:|
| 2026-08-01 – 2026-08-18|  2,410,883 |                            0 |
| 2026-08-19             |    138,240 |                          341 |
| 2026-08-20 – 2026-08-31|  1,597,004 |                            0 |

## Attachment 3 — Halcyon delivery semantics, from their integration guide

> Failed deliveries are retried on a fixed schedule for up to six hours. After
> the final attempt the delivery is marked permanently failed. Merchants can
> re-send any delivery from the dashboard or the API for 30 days after the
> original attempt.
