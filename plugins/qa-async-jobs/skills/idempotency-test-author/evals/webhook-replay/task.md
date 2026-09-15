# Usage billing over-counted in August and the handler is supposed to be safe

## Problem Description

We receive `payment.succeeded` events from the payment provider, credit an
internal ledger, and meter the amount so usage-plan customers can be invoiced.

Hannah in revenue ops reconciled August and found the invoices were raised on a
usage figure well above what the ledger says we took. Three accounts so far, all
overbilled, all still customers as of this morning.

Marcus, who owns this service, has already replied on the ticket. His argument
is that the handler deduplicates on the provider's event id, that the ledger
totals are demonstrably correct, and that a discrepancy between two numbers
produced by a correct handler therefore has to be in the report. He has asked
for the report query to be corrected.

Before anyone edits a query that finance signs invoices off, work out which of
the two numbers is lying, and put the fix where it actually belongs.

The handler, the ledger and meter it writes to, the existing test, Hannah's
reconciliation, the report query and the provider's delivery guarantee are
attached.

## Output Specification

1. Change whichever file is actually wrong. `npm test` must be clean when you
   finish.
2. Add `test/payment-webhook.replay.test.js` with coverage that fails against
   the code as it stands today if your conclusion is that it is broken. Do not
   delete `test/payment-webhook.first.test.js`.
3. Write `docs/over-count-verdict.md` - the reply to Marcus and Hannah. Name
   which number is wrong and what produced it, and say what to do about the
   August invoices that already went out.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-ingest",
  "version": "2.7.3",
  "private": true,
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: src/billing.js ===============
'use strict';

function createLedger() {
  const balances = new Map();
  const applied = [];
  return {
    async credit(accountId, amountCents) {
      const next = (balances.get(accountId) || 0) + amountCents;
      balances.set(accountId, next);
      applied.push({ accountId, amountCents });
      return next;
    },
    balanceOf(accountId) { return balances.get(accountId) || 0; },
    appliedCount() { return applied.length; },
  };
}

function createMeter() {
  let deliveries = 0;
  const billed = new Map();
  return {
    recordDelivery() { deliveries += 1; },
    deliveryCount() { return deliveries; },
    addBilledUsage(accountId, amountCents) {
      billed.set(accountId, (billed.get(accountId) || 0) + amountCents);
    },
    billedUsageFor(accountId) { return billed.get(accountId) || 0; },
  };
}

// Called once per delivery from the webhook edge.
function observeDelivery(meter, event) {
  meter.recordDelivery();
  meter.addBilledUsage(event.accountId, event.amountCents);
}

module.exports = { createLedger, createMeter, observeDelivery };

=============== FILE: src/event-store.js ===============
'use strict';

function createEventStore() {
  const entries = new Map();
  return {
    async get(key) { return entries.has(key) ? entries.get(key) : null; },
    async setIfAbsent(key, value) {
      if (entries.has(key)) return false;
      entries.set(key, value);
      return true;
    },
    size() { return entries.size; },
  };
}

module.exports = { createEventStore };

=============== FILE: src/payment-webhook.js ===============
'use strict';

const { observeDelivery } = require('./billing');

function createHandler({ store, ledger, meter }) {
  return async function handle(event) {
    observeDelivery(meter, event);

    if (!event.eventId) {
      return { status: 'rejected', code: 'MISSING_EVENT_ID' };
    }

    const seen = await store.get(event.eventId);
    if (seen) {
      return seen;
    }

    const balance = await ledger.credit(event.accountId, event.amountCents);
    const response = { status: 'applied', balance };
    await store.setIfAbsent(event.eventId, response);
    return response;
  };
}

module.exports = { createHandler };

=============== FILE: test/payment-webhook.first.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../src/payment-webhook');
const { createEventStore } = require('../src/event-store');
const { createLedger, createMeter } = require('../src/billing');

test('a payment event credits the ledger and meters the usage', async () => {
  const ledger = createLedger();
  const meter = createMeter();
  const handle = createHandler({ store: createEventStore(), ledger, meter });

  const response = await handle({
    eventId: 'evt_1',
    accountId: 'acc_1',
    amountCents: 2500,
    currency: 'EUR',
  });

  assert.equal(response.status, 'applied');
  assert.equal(ledger.balanceOf('acc_1'), 2500);
  assert.equal(meter.billedUsageFor('acc_1'), 2500);
  assert.equal(meter.deliveryCount(), 1);
});

=============== FILE: docs/reconciliation-august.md ===============
# August reconciliation - acc_4102

Two numbers are produced for this account each month. The ledger is written when
a payment is applied. `billed_usage_cents` is written at the webhook edge; it was
added in May when usage plans launched.

| provider event_id | deliveries received | ledger credits | amount per event |
|---|---|---|---|
| evt_8801 | 1 | 1 | 2,400 |
| evt_8814 | 3 | 1 | 3,000 |
| evt_8822 | 1 | 1 | 2,000 |
| **total** | **5** | **3** | |

Ledger balance for the month: **7,400**. Billed usage recorded for the month:
**13,400**. The invoice went out on the billed-usage figure.

The delivery count of 5 is what ops reads on the ingest dashboard. It is meant
to count every delivery, redeliveries included, and 5 is the correct value for
August - we did receive five.

Two other accounts show the same shape.

=============== FILE: docs/provider-redelivery.md ===============
# Northwind Pay - event delivery

Extract from the provider integration guide, retrieved 2026-08-04.

> Events are delivered **at least once**. An event is redelivered when the
> endpoint does not return 2xx within 10 seconds, and may also be redelivered
> after a 2xx response when a delivery batch is retried. Up to 5 attempts are
> made over 3 days.
>
> Every attempt carries the same `event_id`. Consumers MUST treat `event_id` as
> the unit of work and MUST NOT assume an event is delivered exactly once.

Redelivery is not a fault condition, is not reported on the provider status
page, and is not something a consumer can opt out of.

=============== FILE: docs/usage-report.md ===============
# Monthly usage report

The query behind the invoice line, unchanged since May:

    SELECT account_id, SUM(billed_usage_cents) AS usage_cents
    FROM meter_billed_usage
    WHERE month = :month
    GROUP BY account_id;

`meter_billed_usage` receives one row per call to the meter's billed-usage entry
point. The report performs no deduplication of its own and never has - it sums
what the meter was told, and nothing else reads or writes that table.
