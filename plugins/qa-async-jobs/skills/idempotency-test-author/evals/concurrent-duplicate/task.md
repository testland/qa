# The double-refund race was closed in June and it happened again in July

## Problem Description

Refunds are processed from a queue that delivers at least once. In June two
workers picked up the same job and we issued two refunds against one charge.

Ravi fixed it that week. He added a test that starts two deliveries of the same
job and asserts one refund comes out. It passes, and the ticket was closed on
the strength of it.

Three weeks later, during a broker failover, it happened six more times. Ravi's
test is still green on the current code, so his read is that our side is fine and
the broker is duplicating underneath us. He wants to raise it with the vendor
before anyone touches our code again.

I would rather not spend two weeks in a vendor queue if the answer is in our own
repo. Work out whether the race is actually closed, and implement whatever you
conclude is correct.

The handler, the reservation store it writes to, both existing tests, the store's
operation notes and the July incident write-up are attached.

## Output Specification

1. Edit `src/refund-handler.js` if your conclusion requires it. `npm test` must
   be clean when you finish.
2. Add `test/refund-concurrency.test.js` with coverage that fails against the
   code as it stands today if your conclusion is that it is broken. You may
   correct `test/refund-race.test.js`; do not delete
   `test/refund-redelivery.test.js`.
3. Write `docs/race-verdict.md` - the reply to Ravi. Say whether the race is
   closed, what in this repo settles it, and whether to open the vendor ticket.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "refunds-worker",
  "version": "1.5.2",
  "private": true,
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: src/reservation-store.js ===============
'use strict';

function createReservationStore() {
  const entries = new Map();

  return {
    async read(key) {
      const entry = entries.get(key);
      return entry && entry.state === 'done' ? entry.response : null;
    },

    async write(key, response) {
      entries.set(key, { state: 'done', response, joined: Promise.resolve(response) });
    },

    // Test-and-insert in one step: nothing awaits between the lookup and the insert.
    async claim(key) {
      const entry = entries.get(key);
      if (entry) return { acquired: false, joined: entry.joined };
      let settle;
      const joined = new Promise((resolve) => { settle = resolve; });
      entries.set(key, { state: 'pending', response: null, joined, settle });
      return { acquired: true, joined };
    },

    settle(key, response) {
      const entry = entries.get(key);
      entry.state = 'done';
      entry.response = response;
      entry.settle(response);
    },

    size() { return entries.size; },
  };
}

module.exports = { createReservationStore };

=============== FILE: src/refund-gateway.js ===============
'use strict';

function createGateway() {
  const issued = [];
  return {
    async issueRefund(chargeId, amountCents) {
      await new Promise((resolve) => setImmediate(resolve));
      issued.push({ chargeId, amountCents });
      return { refundId: `re_${issued.length}`, amountCents };
    },
    issuedCount() { return issued.length; },
    issued() { return issued.slice(); },
  };
}

module.exports = { createGateway };

=============== FILE: src/refund-handler.js ===============
'use strict';

function createRefundHandler({ store, gateway }) {
  return async function handleRefund(job) {
    const existing = await store.read(job.jobId);
    if (existing) return existing;

    const refund = await gateway.issueRefund(job.chargeId, job.amountCents);
    const response = {
      status: 'refunded',
      refundId: refund.refundId,
      amountCents: refund.amountCents,
    };
    await store.write(job.jobId, response);
    return response;
  };
}

module.exports = { createRefundHandler };

=============== FILE: test/refund-redelivery.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRefundHandler } = require('../src/refund-handler');
const { createReservationStore } = require('../src/reservation-store');
const { createGateway } = require('../src/refund-gateway');

test('a job redelivered after it completed is not refunded twice', async () => {
  const gateway = createGateway();
  const handle = createRefundHandler({ store: createReservationStore(), gateway });
  const job = { jobId: 'job_1', chargeId: 'ch_1', amountCents: 500 };

  const first = await handle(job);
  const second = await handle(job);

  assert.equal(gateway.issuedCount(), 1);
  assert.equal(second.refundId, first.refundId);
});

=============== FILE: test/refund-race.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRefundHandler } = require('../src/refund-handler');
const { createReservationStore } = require('../src/reservation-store');
const { createGateway } = require('../src/refund-gateway');

// Added on INC-2104: two workers taking the same job must produce one refund.
test('two workers racing the same job issue one refund', async () => {
  const gateway = createGateway();
  const handle = createRefundHandler({ store: createReservationStore(), gateway });
  const job = { jobId: 'job_2', chargeId: 'ch_2', amountCents: 1200 };

  const [a, b] = await Promise.all([await handle(job), await handle(job)]);

  assert.equal(gateway.issuedCount(), 1);
  assert.equal(a.refundId, b.refundId);
});

=============== FILE: docs/store-notes.md ===============
# Reservation store - operation notes

The store is backed by Redis in production; the in-repo version keeps the same
contract.

| call | round trips | exclusion between concurrent callers |
|---|---|---|
| `read(key)` | 1 | none |
| `write(key, value)` | 1 | none, last write wins |
| `claim(key)` | 1 | yes - compiles to `SET key <token> NX`, so exactly one caller gets `acquired: true` |
| `settle(key, value)` | 1 | n/a, only the holder of the claim calls it |

A `read` followed by a `write` is two independent round trips. Nothing stops a
second caller reading in the gap between them.

`claim` returns `{ acquired, joined }`. A caller that did not acquire gets
`joined`, a promise resolving to whatever the holder passes to `settle`, so the
loser of a race returns the winner's result rather than issuing a second refund.

=============== FILE: docs/INC-2291.md ===============
# INC-2291 - six duplicate refunds during broker failover, 2026-07-19

**Impact:** 6 customers refunded twice, 2,840 EUR over-refunded.

**Sequence.** The broker failed over at 14:02. Messages whose acknowledgement was
in flight were redelivered, which is the documented behaviour of this queue at
its delivery class: the same `message_id` reappears with `delivery_attempt`
incremented. Nothing in the broker logs shows a message produced twice. In all
six cases the pair is one `message_id` carrying `delivery_attempt` 1 and 2, and
the vendor's delivery report for the window lists zero anomalies.

**What our workers logged.** For every one of the six, two workers logged
`no stored result for job_...` within 12ms of each other, and both then logged
`issued refund re_...`. The reservation store ended up holding the second
worker's write.

**June.** INC-2104, the first double refund, was closed after a fix and a test.
The log pair above - two workers, neither finding a stored result, both
refunding - is the same pair INC-2104 recorded.
