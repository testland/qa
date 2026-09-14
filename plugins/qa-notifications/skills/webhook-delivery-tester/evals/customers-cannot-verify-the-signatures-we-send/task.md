# Three of our eleven integration customers cannot verify the signatures we send

## Problem Description

We ship order events to customer endpoints. Eleven customers are live. Since we
opened self-serve integration in July, three of them have filed the same ticket:
they dropped a stock verification library into their handler, pointed it at the
endpoint secret we gave them, and it rejects every single delivery we send.

Our own suite is green. It has been green for two years. The one customer who
says verification works for them is Brightsail, who hand-wrote their verifier in
2024 against a Slack thread with our old CTO, so I would not treat that as
evidence of anything.

I spent Tuesday on a call with Northwind's engineer sharing a screen. Their
library reads the request, does something with the headers, and throws before it
gets anywhere near our secret. It is not a secret-mismatch problem — we
regenerated the secret on the call, pasted it into their dashboard, same result.
Kestrel Freight's ticket says the same thing in different words. So I think the
format we send is simply not the format anybody's library expects, and we have
been getting away with it because our tests check our signer against our signer.

What I need is for us to send the format the off-the-shelf libraries already
know how to read, so a customer can integrate without talking to us. Along with
that, a page I can put in the docs that a customer implements against without a
support call, including a verification function they can paste into a Node
handler. Ticket 4 also asks a question I do not want to answer myself.

Constraints: Brightsail is on a two-year contract and their handler must keep
working while they schedule the change — they have told us their next engineering
window is in November. And whatever we change, I want tests that would have
caught this, meaning tests that fail against what is in `src/` today. The repo is
plain Node, no dependencies, `node --test`.

The secret in the fixture is a throwaway from our staging tenant.

## Output Specification

1. Change the signing and headers in `src/` so a standard off-the-shelf verifier
   accepts our deliveries. Keep the repo dependency-free and runnable with
   `node --test`.
2. Tests under `test/` that prove the new format and that fail against the
   signing code as it stands today.
3. `docs/webhook-signatures.md` — the customer-facing page, including a
   copy-pasteable Node verification function a customer can drop into their
   handler.
4. `docs/rollout.md` — how we get from here to there without breaking Brightsail
   before November, plus a direct answer to the question in ticket 4.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/support-tickets.md ===============
# Open integration tickets

## SUP-4412 — Northwind Logistics (2026-08-24)

> We're using the standard open-source verifier package for our platform. Every
> delivery from you fails with `No matching signature found`. We never get as far
> as a secret comparison. We have three other vendors wired through the same
> handler and they all work.

Regenerated the shared secret live on a call 2026-09-08. No change.

## SUP-4430 — Kestrel Freight (2026-08-29)

> The library expects to find a versioned signature and can't parse what arrives
> in your header. Our platform team says they'd have to fork the library to
> accept your format and they won't sign off on that.

## SUP-4451 — Marlow Retail (2026-09-02)

> Our security reviewer will not approve an integration where we write the
> verification ourselves. Do you publish anything that works with a maintained
> library?

## SUP-4462 — Pennine Foods (2026-09-05)

> Our handler sits behind a fixed egress and our platform team would rather just
> allowlist your sender IPs and skip the signature check entirely — it's one less
> secret for us to rotate. Can you send us the IP ranges you send from and confirm
> that's a supported way to integrate?

## Not a ticket — Brightsail Group

Live since 2024-11. Verifier written in-house. Reports no failures, ever. Next
engineering window 2026-11.

=============== FILE: src/signer.js ===============
'use strict';

const crypto = require('node:crypto');

// Staging tenant secret. Production comes from the vault.
const SECRET = process.env.WEBHOOK_SECRET || 'whsec_c2hhcmVkc2VjcmV0Zm9yc3RhZ2luZ3RlbmFudA==';

function newWebhookId() {
  return 'msg_' + crypto.randomBytes(12).toString('hex');
}

function signPayload(payload, timestamp) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

function buildRequest(event) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const id = newWebhookId();

  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Webhook-Id': id,
      'X-Webhook-Timestamp': String(timestamp),
      'X-Webhook-Signature': signPayload(payload, timestamp),
    },
    body: payload,
  };
}

module.exports = { SECRET, newWebhookId, signPayload, buildRequest };

=============== FILE: src/dispatch.js ===============
'use strict';

const { buildRequest } = require('./signer.js');

// Attempt delays in seconds. Tuned during the 2025 incident, leave alone.
const DELAYS = [0, 5, 300, 1800, 7200, 18000, 36000];

async function dispatch(endpointUrl, event, transport) {
  const req = buildRequest(event);

  for (let attempt = 0; attempt < DELAYS.length; attempt++) {
    if (DELAYS[attempt] > 0) await transport.sleep(DELAYS[attempt] * 1000);

    const res = await transport.post(endpointUrl, req);
    if (res.status >= 200 && res.status < 300) {
      return { delivered: true, attempts: attempt + 1 };
    }
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return { delivered: false, attempts: attempt + 1, permanent: true };
    }
  }

  return { delivered: false, attempts: DELAYS.length, deadLettered: true };
}

module.exports = { dispatch, DELAYS };

=============== FILE: test/signer.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { SECRET, signPayload, buildRequest } = require('../src/signer.js');

test('signature is stable for the same payload', () => {
  const a = signPayload('{"a":1}', 1755600000);
  const b = signPayload('{"a":1}', 1755600000);
  assert.equal(a, b);
});

test('signature is an HMAC-SHA256 over the payload', () => {
  const expected = crypto.createHmac('sha256', SECRET).update('{"a":1}').digest('hex');
  assert.equal(signPayload('{"a":1}', 1755600000), expected);
});

test('signature changes when the payload changes', () => {
  const a = signPayload('{"a":1}', 1755600000);
  const b = signPayload('{"a":2}', 1755600000);
  assert.notEqual(a, b);
});

test('outbound request carries id, timestamp and signature headers', () => {
  const req = buildRequest({ type: 'order.created', data: { id: 42 } });
  assert.ok(req.headers['X-Webhook-Id'].startsWith('msg_'));
  assert.match(req.headers['X-Webhook-Timestamp'], /^[0-9]{10}$/);
  assert.equal(req.headers['X-Webhook-Signature'].length, 64);
  assert.equal(req.body, '{"type":"order.created","data":{"id":42}}');
});

=============== FILE: test/dispatch.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { dispatch } = require('../src/dispatch.js');

function transportReturning(statuses) {
  const calls = [];
  return {
    calls,
    async sleep() {},
    async post(url, req) {
      calls.push(req);
      return { status: statuses[calls.length - 1] ?? statuses[statuses.length - 1] };
    },
  };
}

test('a 200 on the first attempt delivers once', async () => {
  const transport = transportReturning([200]);
  const result = await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  assert.deepEqual(result, { delivered: true, attempts: 1 });
  assert.equal(transport.calls.length, 1);
});

test('a 5xx is retried and can still succeed', async () => {
  const transport = transportReturning([503, 503, 200]);
  const result = await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  assert.equal(result.delivered, true);
  assert.equal(result.attempts, 3);
});

test('a 410 stops immediately', async () => {
  const transport = transportReturning([410]);
  const result = await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  assert.equal(result.permanent, true);
  assert.equal(transport.calls.length, 1);
});
