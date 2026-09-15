# Tomas wants the dedup keys kept forever so nothing can slip past the window

## Problem Description

Card charges are submitted through `src/charge-client.js`. A submission that
comes back retryable stays on the pending queue, and `src/daily-batch.js`
submits it again the next day, for up to three days.

We have had three duplicate-charge tickets in six weeks. In each one the
duplicate posted between two and five days after the original.

Tomas owns the client and has a change ready: drop the expiry from the key store
so entries never fall out. His argument is that the duplicates are landing
outside our retention window, that an entry is about sixty bytes, and that an
unbounded store of sixty-byte entries is cheaper than another refund and another
apology. He wants it in Friday's release.

He knows the expiry was added after an outage. His read is that the outage was
about what we stored per entry rather than how long we stored it, and that it
does not apply any more.

Work out what actually produced those three duplicates and implement the fix. If
the retention window should change, say what number the new value comes from.

The client, the batch, the gateway and its key store, the current tests, the
gateway request log from the most recent ticket and two older write-ups are
attached.

## Output Specification

1. Edit `src/charge-client.js`, `src/daily-batch.js` or `src/dedup-store.js` as
   your decision requires. `npm test` must be clean when you finish.
2. Add `test/charges.duplicate.test.js` reproducing the ticket: a charge whose
   response is lost, picked up by the next day's batch. It must fail against the
   code as it stands today and pass against what you deliver. Do not delete
   `test/charges.basic.test.js`.
3. Write `docs/duplicate-verdict.md` - the reply to Tomas. Say what caused the
   three duplicates, whether the expiry moves, and what number any new value is
   derived from.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "charges-submitter",
  "version": "4.1.0",
  "private": true,
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: src/dedup-store.js ===============
'use strict';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createDedupStore({ ttlMs = SEVEN_DAYS_MS, now }) {
  const entries = new Map();
  const stale = (entry, at) => at - entry.storedAt >= ttlMs;

  return {
    putIfAbsent(key, value) {
      const at = now();
      const existing = entries.get(key);
      if (existing && !stale(existing, at)) return false;
      entries.set(key, { value, storedAt: at });
      return true;
    },

    get(key) {
      const at = now();
      const entry = entries.get(key);
      if (!entry) return null;
      if (stale(entry, at)) { entries.delete(key); return null; }
      return entry.value;
    },

    sweep() {
      const at = now();
      let removed = 0;
      for (const [key, entry] of entries) {
        if (stale(entry, at)) { entries.delete(key); removed += 1; }
      }
      return removed;
    },

    size() { return entries.size; },
    ttlMs,
  };
}

module.exports = { createDedupStore, SEVEN_DAYS_MS };

=============== FILE: src/gateway.js ===============
'use strict';

function createGateway({ store, loseResponses = 0 }) {
  const charged = [];
  let remainingLosses = loseResponses;

  return {
    charge(envelope) {
      if (!envelope.idempotencyKey) {
        return { status: 'rejected', code: 'MISSING_KEY' };
      }
      const accepted = store.putIfAbsent(envelope.idempotencyKey, {
        customerId: envelope.customerId,
        amountCents: envelope.amountCents,
      });
      if (!accepted) {
        return { status: 'duplicate', amountCents: envelope.amountCents };
      }
      charged.push({ customerId: envelope.customerId, amountCents: envelope.amountCents });
      if (remainingLosses > 0) {
        remainingLosses -= 1;
        // The charge stands; only our side lost the answer.
        return { status: 'retryable', reason: 'response_lost' };
      }
      return { status: 'charged', amountCents: envelope.amountCents };
    },

    chargedCount() { return charged.length; },
    totalFor(customerId) {
      return charged
        .filter((c) => c.customerId === customerId)
        .reduce((sum, c) => sum + c.amountCents, 0);
    },
  };
}

module.exports = { createGateway };

=============== FILE: src/charge-client.js ===============
'use strict';

const { randomUUID } = require('node:crypto');

function createClient({ gateway }) {
  return {
    submit(request) {
      return gateway.charge({ ...request, idempotencyKey: randomUUID() });
    },
  };
}

module.exports = { createClient };

=============== FILE: src/daily-batch.js ===============
'use strict';

const MAX_DAYS = 3;

function runDailyBatch({ pending, client }) {
  const stillPending = [];
  for (const item of pending) {
    const result = client.submit(item.request);
    item.attempts += 1;
    if (result.status === 'retryable' && item.attempts < MAX_DAYS) {
      stillPending.push(item);
    }
  }
  return stillPending;
}

module.exports = { runDailyBatch, MAX_DAYS };

=============== FILE: test/charges.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDedupStore, SEVEN_DAYS_MS } = require('../src/dedup-store');
const { createGateway } = require('../src/gateway');

function build() {
  const clock = { t: 0 };
  const store = createDedupStore({ now: () => clock.t });
  return { clock, gateway: createGateway({ store }), store };
}

test('the same key submitted twice charges once', () => {
  const { gateway } = build();
  const envelope = { idempotencyKey: 'k1', customerId: 'cus_1', amountCents: 500 };

  gateway.charge(envelope);
  const second = gateway.charge(envelope);

  assert.equal(second.status, 'duplicate');
  assert.equal(gateway.chargedCount(), 1);
});

test('a key stops suppressing once the retention window has passed', () => {
  const { clock, gateway } = build();
  const envelope = { idempotencyKey: 'k1', customerId: 'cus_1', amountCents: 500 };

  gateway.charge(envelope);
  clock.t = SEVEN_DAYS_MS;

  assert.equal(gateway.charge(envelope).status, 'charged');
  assert.equal(gateway.chargedCount(), 2);
});

=============== FILE: docs/ticket-4416.md ===============
# Ticket 4416 - customer charged twice, four days apart

Gateway request log, filtered to customer `cus_71f2`. Amounts in cents.

| received | amount | Idempotency-Key | gateway result |
|---|---|---|---|
| 2026-07-02 09:14:06 | 1999 | 6f1c9a02-3f7d-4a11-9c2e-0b5d21ac77e1 | accepted; our HTTP client timed out waiting for the body |
| 2026-07-06 03:10:41 | 1999 | b84e37dd-19a5-4c83-a0f7-6e41d9b2c015 | accepted |

Both rows are the same logical charge. The 07-02 submission was recorded as
retryable after the timeout and the pending item sat in the queue while the
gateway was unreachable, so the batch re-submitted it on 07-06.

The two earlier tickets have the same shape. Key pairs as recorded in their
ticket bodies:

- 4318, two days apart: `1d40b7c6-8b2a-4d6f-9e30-72ff10c8a5b3` then
  `9ac21e58-6d14-42b7-b8c1-f0a934e27d86`
- 4377, five days apart: `c2e7f0b4-5a19-4f28-8d63-11be72c4900a` then
  `40db6a19-7c52-4e90-95ab-3d7f6021ec48`

=============== FILE: docs/INC-3310.md ===============
# INC-3310 - payments pod OOM, 2026-02-11

**Impact:** charge submissions failed for 26 minutes.

The dedup map had no expiry. It had been running since the previous deploy nine
days earlier and held 41 million entries when the pod was killed.

Entry size was not the problem - the entries were small then and are the same
size now. The problem was that nothing removed them, so the map grew for as long
as the process stayed up, and the only thing that had ever bounded it was a
deploy landing.

**Action taken:** a seven-day expiry with a periodic sweep, plus an alert on
entry count. Seven days was chosen to cover the three-day batch window with
margin.

=============== FILE: docs/support-2199.md ===============
# Support 2199 - "my second top-up never went through", 2025-11-20

A customer bought the same 4.99 top-up twice within ninety seconds and only the
first was charged.

At the time the key was derived from a hash of the request body, so the second
purchase was indistinguishable from a retry of the first and was suppressed.

**Action taken:** the key stopped being derived from the request body. Two
purchases that happen to look alike are two purchases, and nothing about the
payload can tell them apart.
