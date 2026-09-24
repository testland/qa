# The capture replay suite has been quietly green since someone widened a tolerance

## Problem Description

Our SOC 2 Type II surveillance window opens on 6 October and the auditor's
evidence request landed this morning. Two of the items are ours:

- Evidence that the payments endpoint rejects a payload that was altered after
  the sender signed it.
- Evidence that the endpoint rejects a delivery whose timestamp is outside the
  accepted window.

We have a replay suite built in March. Ravi pulled two real deliveries out of the
staging capture proxy, saved the body and the headers next to each other, and
wrote a loop that posts each one at the handler and asserts a 200. It has been
green ever since, which is the part I have started to distrust. In April it went
red for a week and the fix in the commit message is "relax window for captures" —
you can see what that did at the top of the replay test. Nobody has touched it
since.

There are sixty more captures sitting in a bucket that we were going to add to
the same folder before the audit, which now feels like adding sixty more of
whatever the problem is rather than more coverage. I would rather understand what
that suite is actually proving before we multiply it.

Two other things I want your eyes on while you are in there. First, those bodies
came out of the capture proxy verbatim and I am not comfortable with what is in
them sitting in a repo that every contractor clones. Second, the auditor is going
to run the suite himself on his own laptop in October, on a date I cannot predict,
and if the answer to "does this still pass in October" is "only if someone bumps
a number again" then we do not have evidence, we have a ritual.

Plain Node, no dependencies, `node --test` at the repo root. The staging secret in
the fixture is fine to keep in the repo, it is rotated out of production.

## Output Specification

1. Whatever changes the replay suite needs so it passes on an unknown future date
   without anyone adjusting a setting first, and so that what it asserts is worth
   showing an auditor.
2. Tests covering the two evidence items in the request. If the handler as it
   stands does not satisfy one of them, fix the handler too and say so.
3. Whatever you decide to do about the captured bodies themselves.
4. `docs/audit-evidence.md` — a short note the auditor can read alongside the
   suite: which test demonstrates which of the two evidence items, and anything
   you found that we need to disclose or remediate before 6 October.

## Input Files

Extract the following files before beginning.

=============== FILE: src/verify.js ===============
'use strict';

const crypto = require('node:crypto');

const STAGING_SECRET = 'whsec_cmVwbGF5LWNhcHR1cmUtc3RhZ2luZy1zZWNyZXQtMDE=';

function tolerance() {
  return Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
}

function verify(rawBody, headers, opts = {}) {
  const secret = opts.secret || process.env.WEBHOOK_SECRET || STAGING_SECRET;

  const id = headers['svix-id'];
  const timestamp = Number(headers['svix-timestamp']);
  const sigHeader = headers['svix-signature'];

  if (!id || !Number.isFinite(timestamp) || !sigHeader) {
    return { ok: false, reason: 'missing_headers' };
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > tolerance()) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([
    Buffer.from(id + '.' + timestamp + '.'),
    Buffer.from(rawBody),
  ]);
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const provided = sigHeader.startsWith('v1,') ? sigHeader.slice(3) : '';
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'signature_mismatch' };
  }

  return { ok: true };
}

module.exports = { verify, STAGING_SECRET, tolerance };

=============== FILE: src/handler.js ===============
'use strict';

const { verify } = require('./verify.js');

const processed = [];

function handle(rawBody, headers) {
  const result = verify(rawBody, headers);
  if (!result.ok) {
    return { status: 400, reason: result.reason };
  }

  const event = JSON.parse(rawBody);
  processed.push({ id: event.id, type: event.type });
  return { status: 200, id: event.id };
}

module.exports = { handle, processed };

=============== FILE: test/verify.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { verify, STAGING_SECRET } = require('../src/verify.js');

function sign(id, timestamp, body, secret = STAGING_SECRET) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([Buffer.from(id + '.' + timestamp + '.'), Buffer.from(body)]);
  return 'v1,' + crypto.createHmac('sha256', key).update(signed).digest('base64');
}

function headersFor(id, timestamp, body) {
  return {
    'svix-id': id,
    'svix-timestamp': String(timestamp),
    'svix-signature': sign(id, timestamp, body),
  };
}

test('a correctly signed delivery is accepted', () => {
  const body = '{"id":"evt_ok","type":"charge.succeeded"}';
  const now = Math.floor(Date.now() / 1000);
  assert.deepEqual(verify(body, headersFor('msg_ok', now, body)), { ok: true });
});

test('a wrong signature is rejected', () => {
  const body = '{"id":"evt_bad","type":"charge.succeeded"}';
  const now = Math.floor(Date.now() / 1000);
  const headers = headersFor('msg_bad', now, body);
  headers['svix-signature'] = 'v1,SEbCjXmgWOEcKWYkDaTBPQFlEpDrPCswAVzHGmRZKXo=';
  assert.equal(verify(body, headers).ok, false);
});

test('a delivery signed ten minutes ago is rejected', () => {
  const body = '{"id":"evt_old","type":"charge.succeeded"}';
  const stale = Math.floor(Date.now() / 1000) - 600;
  assert.equal(verify(body, headersFor('msg_old', stale, body)).reason, 'timestamp_out_of_tolerance');
});

test('a delivery with no signature header is rejected', () => {
  const body = '{"id":"evt_none","type":"charge.succeeded"}';
  const now = Math.floor(Date.now() / 1000);
  const headers = headersFor('msg_none', now, body);
  delete headers['svix-signature'];
  assert.equal(verify(body, headers).reason, 'missing_headers');
});

=============== FILE: test/replay/replay.test.js ===============
'use strict';

// Captures were taken on 2026-03-18 in staging and carry that day's timestamps,
// so the default window rejects all of them. Relax window for captures.
process.env.WEBHOOK_TOLERANCE_SECONDS = '31536000';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const { handle } = require('../../src/handler.js');

const dir = path.join(__dirname, 'fixtures');
const bodies = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.headers.json'));

for (const name of bodies) {
  test('replays capture ' + name, () => {
    const body = readFileSync(path.join(dir, name), 'utf8').trimEnd();
    const headers = JSON.parse(
      readFileSync(path.join(dir, name.replace(/\.json$/, '.headers.json')), 'utf8'),
    );
    const res = handle(body, headers);
    assert.equal(res.status, 200, 'capture ' + name + ' was rejected: ' + res.reason);
  });
}

=============== FILE: test/replay/fixtures/charge-succeeded.json ===============
{"id":"evt_1PkR2nJk9QbTzL0x","type":"charge.succeeded","created":1774180800,"data":{"object":{"id":"ch_3PkR2nJk9QbTzL0x1a2B3c4D","amount":4990,"currency":"gbp","receipt_email":"hannah.whitfield@gmail.com","billing_details":{"name":"Hannah Whitfield","phone":"+44 7700 900412","address":{"line1":"14 Marlborough Buildings","city":"Bath","postal_code":"BA1 2LY","country":"GB"}},"payment_method_details":{"card":{"brand":"visa","last4":"4242","exp_month":11,"exp_year":2029,"fingerprint":"Xt5EWLLDS9FSKzym"}},"metadata":{"order_id":"ord_88412","customer_ref":"CUS-44190"}}}}

=============== FILE: test/replay/fixtures/charge-succeeded.headers.json ===============
{
  "svix-id": "msg_2eXaRk9pQ1mVtB7sN4uZcL",
  "svix-timestamp": "1773835200",
  "svix-signature": "v1,i2ChjJm5uq0pNBv1p5v0ZsZI3FKBAOkJX71IECx/ZjE=",
  "content-type": "application/json"
}

=============== FILE: test/replay/fixtures/charge-refunded.json ===============
{"id":"evt_1PkR5aJk9QbTzL0x","type":"charge.refunded","created":1774181051,"data":{"object":{"id":"ch_3PkR2nJk9QbTzL0x1a2B3c4D","amount":4990,"amount_refunded":4990,"currency":"gbp","receipt_email":"hannah.whitfield@gmail.com","billing_details":{"name":"Hannah Whitfield","phone":"+44 7700 900412"},"metadata":{"order_id":"ord_88412","refund_reason":"customer complaint - see ticket 91204"}}}}

=============== FILE: test/replay/fixtures/charge-refunded.headers.json ===============
{
  "svix-id": "msg_7pQwLm3RkTz9YbN2sVcXdF",
  "svix-timestamp": "1773835451",
  "svix-signature": "v1,Y22Gt47461cxmXGDo28r3wKDN9DXafuy346v4zNDL3E=",
  "content-type": "application/json"
}

=============== FILE: docs/capture-proxy.md ===============
# Staging capture proxy

Runs in front of the staging payments endpoint. Writes every inbound delivery to
`s3://pay-captures-staging/<date>/<svix-id>/` as two files:

- `body` — the request body, byte for byte as received
- `headers.json` — the full inbound header set

Retention 90 days. Access is granted to the whole engineering group.

The March pull that seeded `test/replay/fixtures/` was two deliveries from
2026-03-18. There are sixty more from 2026-08-11 in the same bucket, taken during
the load test, that we intended to add before the audit.

Nothing in this pipeline alters the bodies. What the customer sent is what lands
in the bucket and what lands in the bucket is what Ravi copied into the repo.
