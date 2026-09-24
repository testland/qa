# Three of our eleven integration customers cannot verify the signatures we send

## Problem Description

We ship order events to customer endpoints. Eleven customers are live. Since we
opened self-serve integration in July, three of them have filed the same ticket:
they dropped a stock verification library into their handler, pointed it at the
endpoint secret from their dashboard, and it rejects every delivery we send.

I spent Tuesday on a call with Northwind's engineer sharing a screen. We
regenerated the shared secret live and pasted it into their dashboard — same
result. Their library never gets as far as comparing anything. He pasted the raw
request their proxy logged, and the secret they hold, into the ticket; both are in
the repo. Kestrel Freight says the same thing in different words. Our own suite is
green, has been green for two years, and I no longer know what it is checking.

The only customer who reports no failures is Brightsail, who wrote their verifier
by hand in 2024 off a Slack thread with our old CTO. They are on a two-year
contract, they have never filed a ticket, and I do not want them finding out about
any of this from a 400.

There is also a proposal in the repo from @rkeeling that two other people have
+1'd, and I will be honest that I am inclined to take it — it is a week of work
instead of a quarter, and Marlow's security reviewer would get what he is asking
for. But I have been wrong about this area twice this month, so I want it argued
rather than rubber-stamped, and if it is the wrong answer I need to be able to say
why to three engineers who currently think it is the right one.

Repo is plain Node, no dependencies, `node --test`. The secret in `src/` is our
staging tenant's and is the same one Northwind was given.

## Output Specification

1. Find what is actually making off-the-shelf verifiers reject us and fix it in
   `src/`, keeping the repo dependency-free.
2. Tests under `test/` that fail against `src/` as it stands today and pass after
   your change.
3. `docs/webhook-signatures.md` — the customer-facing page, including a
   copy-pasteable Node verification function a customer can drop into an Express
   handler.
4. `docs/decision.md` — a straight answer on @rkeeling's proposal, and how the fix
   reaches customers without Brightsail finding out the hard way.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/support-tickets.md ===============
# Open integration tickets

## SUP-4412 — Northwind Logistics (2026-08-24)

> We're using the standard open-source verifier package for our platform. Every
> delivery from you fails with `No matching signature found`. We never get as far
> as a secret comparison. We have three other vendors wired through the same
> handler and they all work.

Shared secret regenerated live on a call 2026-09-08. No change. Raw request and
the endpoint secret they hold are attached — see `docs/northwind-capture.md`.

## SUP-4430 — Kestrel Freight (2026-08-29)

> Same library, same failure. Our platform team says they would have to fork it
> to accept what you send and they will not sign off on that.

## SUP-4451 — Marlow Retail (2026-09-02)

> Our security reviewer will not approve an integration where we write the
> verification ourselves. Do you publish anything that works with a maintained
> library?

## Not a ticket — Brightsail Group

Live since 2024-11. Verifier written in-house. Reports no failures, ever. Next
engineering window 2026-11.

=============== FILE: docs/northwind-capture.md ===============
# SUP-4412 attachment — raw request, logged at Northwind's edge proxy

Endpoint secret Northwind hold, copied out of their dashboard:

    whsec_bm9ydGh3aW5kLXN0YWdpbmctZW5kcG9pbnQta2V5LTE=

Request as received, 2026-09-08 09:20:04 UTC:

    POST /hooks/orders HTTP/1.1
    host: hooks.northwind-logistics.example
    content-type: application/json
    webhook-id: msg_7Qd2rP9xVn4L
    webhook-timestamp: 1788859204
    webhook-signature: v1,fzbzG1sjyXN1uwNVBX/SKOAvAtptIZUnVX11JZAxWw0=

    {"type":"order.created","data":{"id":9071,"total":"148.50","currency":"GBP"}}

Their handler's stack trace, trimmed:

    WebhookVerificationError: No matching signature found
        at Webhook.verify (/app/node_modules/.../webhook.js:88:13)
        at /app/routes/hooks.js:14:20

> To be clear, this is not us failing a comparison and returning 400. The library
> throws. Whatever it computes, nothing in your header matches it.

=============== FILE: docs/proposal-rkeeling.md ===============
# Proposal — publish our own verifier package instead of changing what we send

@rkeeling, 2026-09-10. +1 @amorse, +1 @tstamatis

Changing what goes on the wire means re-onboarding eleven customers and a
breaking change for Brightsail, who have no engineering window until November.
Cheaper path:

1. Publish `@ourco/webhook-verify` — one function, `verify(secret, headers, body)`.
   It is `src/signer.js` turned inside out: same string, same key handling, about
   forty lines, zero dependencies.
2. Northwind, Kestrel and Marlow drop their library and use ours. Marlow's
   security reviewer gets a maintained, named package instead of hand-written
   code, which is the actual thing he objected to.
3. Add `test/contract.test.js`: sign an event with `buildRequest`, verify it with
   the published package, assert it passes. Sender and verifier can then never
   drift apart again, which is the real root cause here.

Nothing in `src/` changes, nothing Brightsail depends on moves, and we are done
this sprint.

=============== FILE: src/signer.js ===============
'use strict';

const crypto = require('node:crypto');

const SECRET =
  process.env.WEBHOOK_SECRET || 'whsec_bm9ydGh3aW5kLXN0YWdpbmctZW5kcG9pbnQta2V5LTE=';

function signingKey() {
  return Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
}

function newWebhookId() {
  return 'msg_' + crypto.randomBytes(9).toString('base64url');
}

function signPayload(id, timestamp, payload) {
  const signed = id + '.' + timestamp + '.' + payload;
  return crypto.createHmac('sha256', signingKey()).update(signed).digest('base64');
}

function buildRequest(event) {
  const payload = JSON.stringify(event);
  const timestamp = Date.now();
  const id = newWebhookId();

  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(timestamp / 1000)),
      'webhook-signature': 'v1,' + signPayload(id, timestamp, payload),
    },
    body: payload,
  };
}

module.exports = { SECRET, signingKey, newWebhookId, signPayload, buildRequest };

=============== FILE: src/events.js ===============
'use strict';

// created_at is epoch milliseconds; the ledger, the audit trail and the admin UI
// all read it that way.
function orderCreated(order) {
  return {
    type: 'order.created',
    created_at: Date.now(),
    data: { id: order.id, total: order.total, currency: order.currency },
  };
}

function orderCancelled(order) {
  return {
    type: 'order.cancelled',
    created_at: Date.now(),
    data: { id: order.id, reason: order.reason },
  };
}

module.exports = { orderCreated, orderCancelled };

=============== FILE: src/dispatch.js ===============
'use strict';

const { buildRequest } = require('./signer.js');

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

const { signPayload, buildRequest } = require('../src/signer.js');
const { orderCreated } = require('../src/events.js');

test('the signature is stable for the same inputs', () => {
  const a = signPayload('msg_1', 1788859204137, '{"a":1}');
  const b = signPayload('msg_1', 1788859204137, '{"a":1}');
  assert.equal(a, b);
});

test('the signature changes when the payload changes', () => {
  const a = signPayload('msg_1', 1788859204137, '{"a":1}');
  const b = signPayload('msg_1', 1788859204137, '{"a":2}');
  assert.notEqual(a, b);
});

test('the signature changes when the message id changes', () => {
  const a = signPayload('msg_1', 1788859204137, '{"a":1}');
  const b = signPayload('msg_2', 1788859204137, '{"a":1}');
  assert.notEqual(a, b);
});

test('an outbound request carries the three headers in the agreed shape', () => {
  const req = buildRequest(orderCreated({ id: 9071, total: '148.50', currency: 'GBP' }));
  assert.match(req.headers['webhook-id'], /^msg_/);
  assert.match(req.headers['webhook-timestamp'], /^[0-9]{10}$/);
  assert.match(req.headers['webhook-signature'], /^v1,[A-Za-z0-9+/]{43}=$/);
  assert.equal(req.headers['content-type'], 'application/json');
});

test('the body is the serialised event', () => {
  const event = orderCreated({ id: 9071, total: '148.50', currency: 'GBP' });
  const req = buildRequest(event);
  assert.equal(req.body, JSON.stringify(event));
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

test('every attempt of one delivery carries the same message id', async () => {
  const transport = transportReturning([503, 503, 200]);
  await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  const ids = transport.calls.map((r) => r.headers['webhook-id']);
  assert.equal(new Set(ids).size, 1);
});
