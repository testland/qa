# The transfer mismatch is already written up as a rendering defect

## Problem Description

Sofia R. rang Tier 1 on Monday: she moved money between two of her own Northfield
accounts and the amount that landed was not the amount she sent, and her balance no
longer adds up. Ravi Menon on payments picked the ticket up yesterday, wrote it up in
the tracker as BANK-3318, and has a one-line fix in review.

His reading is not unreasonable. The two figures the agent captured in the chat are
1,250.00 sent and 1,205.00 on the statement line - the 5 and the 0 swapped, which is
exactly what a minor-unit formatting defect looks like. He filed it Minor severity, P3,
"cosmetic, goes out with the next release train", and asked support to tell Sofia her
money is where it should be.

I would rather not tell a customer her money is fine and find out on Thursday that it
is not. She leaves for two weeks tomorrow and we get one reply to her today, so
anything we still need from her has to go out in that reply.

Attached are Ravi's write-up, the ticket he read, the payment service's ledger export
for those two mornings, and the code that prints statement lines. Decide whether
BANK-3318 goes to triage as it stands.

## Output Specification

1. Write `reports/transfer-amount-mismatch.md` - the report the on-call payments
   engineer picks up cold, with no access to the ticket thread and no way to phone
   anyone. Every statement in it must be traceable to one of the attached files.
2. Add a test to `test/ledger.test.js` that settles the question either way. The suite
   must run clean under `npm test`.
3. Write `docs/review-note.md` - the reply to Ravi: whether his fix ships, and what the
   conclusion rests on.
4. The outstanding questions for today's single reply to Sofia must be in the report,
   in a form support can lift straight out.

Out of scope: diagnosing why the ledger looks the way it does, editing anything under
`src/`, or contacting the customer yourself.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "northfield-ledger",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: src/ledger.js ===============
'use strict';

// A transfer leaves the customer whole when its customer-visible postings sum to zero.
function transfer(exportDoc, ref) {
  return exportDoc.transfers.find((t) => t.ref === ref);
}

function customerDelta(t) {
  return t.postings
    .filter((p) => p.kind === 'customer')
    .reduce((sum, p) => sum + p.minorUnits, 0);
}

function unreleasedHolds(t) {
  return t.postings.filter((p) => p.kind === 'clearing' && p.released === false);
}

function reconcile(t) {
  const delta = customerDelta(t);
  return { ref: t.ref, route: t.route, delta, balanced: delta === 0, holds: unreleasedHolds(t) };
}

module.exports = { transfer, customerDelta, unreleasedHolds, reconcile };

=============== FILE: src/statement-renderer.js ===============
'use strict';

// Prints integer minor units as a statement amount; no posting is read or written here.
function renderAmount(minorUnits) {
  const negative = minorUnits < 0;
  const abs = Math.abs(minorUnits);
  const major = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const minor = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}GBP ${major}.${minor}`;
}

module.exports = { renderAmount };

=============== FILE: test/ledger.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { transfer, reconcile } = require('../src/ledger');
const { renderAmount } = require('../src/statement-renderer');

const ledger = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'data', 'ledger-export.json'), 'utf8'),
);

test('an instant-route transfer leaves the customer whole', () => {
  const r = reconcile(transfer(ledger, 'TRF-90b02'));
  assert.strictEqual(r.balanced, true);
  assert.strictEqual(r.delta, 0);
});

test('the statement renderer prints minor units faithfully', () => {
  assert.strictEqual(renderAmount(125000), 'GBP 1,250.00');
  assert.strictEqual(renderAmount(120500), 'GBP 1,205.00');
});

=============== FILE: data/ledger-export.json ===============
{
  "service": "pay-svc",
  "version": "4.19.2",
  "commit": "8f2ad10",
  "exportedAt": "2026-08-13T07:02:11Z",
  "note": "A screened transfer posts the source account pending-authorisation reserve to a clearing account. The matching HOLD_RELEASED posting normally follows within seconds of screening completing, and the destination is credited the full amount.",
  "transfers": [
    {
      "ref": "TRF-90c41",
      "createdAt": "2026-08-11T08:41:03Z",
      "route": "screened",
      "customerRef": "CUST-30188",
      "sourcePendingAuth": 4500,
      "postings": [
        { "account": "ACC-EVERYDAY-7741", "kind": "customer", "minorUnits": -125000, "code": "TRANSFER_OUT" },
        { "account": "ACC-SAVINGS-2210", "kind": "customer", "minorUnits": 120500, "code": "TRANSFER_IN" },
        { "account": "CLR-HOLD-014", "kind": "clearing", "minorUnits": 4500, "code": "HOLD_PENDING_REVIEW", "released": false }
      ]
    },
    {
      "ref": "TRF-90b02",
      "createdAt": "2026-08-11T08:44:50Z",
      "route": "instant",
      "customerRef": "CUST-51002",
      "sourcePendingAuth": 0,
      "postings": [
        { "account": "ACC-CURRENT-1180", "kind": "customer", "minorUnits": -80000, "code": "TRANSFER_OUT" },
        { "account": "ACC-SAVINGS-9014", "kind": "customer", "minorUnits": 80000, "code": "TRANSFER_IN" }
      ]
    },
    {
      "ref": "TRF-90d77",
      "createdAt": "2026-08-11T09:12:38Z",
      "route": "screened",
      "customerRef": "CUST-44219",
      "sourcePendingAuth": 11000,
      "postings": [
        { "account": "ACC-EVERYDAY-3325", "kind": "customer", "minorUnits": -300000, "code": "TRANSFER_OUT" },
        { "account": "ACC-SAVER-7702", "kind": "customer", "minorUnits": 289000, "code": "TRANSFER_IN" },
        { "account": "CLR-HOLD-014", "kind": "clearing", "minorUnits": 11000, "code": "HOLD_PENDING_REVIEW", "released": false }
      ]
    },
    {
      "ref": "TRF-90e19",
      "createdAt": "2026-08-12T07:58:02Z",
      "route": "instant",
      "customerRef": "CUST-20551",
      "sourcePendingAuth": 0,
      "postings": [
        { "account": "ACC-CURRENT-6640", "kind": "customer", "minorUnits": -15075, "code": "TRANSFER_OUT" },
        { "account": "ACC-SAVINGS-6641", "kind": "customer", "minorUnits": 15075, "code": "TRANSFER_IN" }
      ]
    },
    {
      "ref": "TRF-90f03",
      "createdAt": "2026-08-12T12:20:04Z",
      "route": "screened",
      "customerRef": "CUST-30188",
      "sourcePendingAuth": 2500,
      "postings": [
        { "account": "ACC-EVERYDAY-7741", "kind": "customer", "minorUnits": -50000, "code": "TRANSFER_OUT" },
        { "account": "ACC-SAVINGS-2210", "kind": "customer", "minorUnits": 50000, "code": "TRANSFER_IN" },
        { "account": "CLR-HOLD-014", "kind": "clearing", "minorUnits": 2500, "code": "HOLD_PENDING_REVIEW", "released": true },
        { "account": "CLR-HOLD-014", "kind": "clearing", "minorUnits": -2500, "code": "HOLD_RELEASED", "released": true }
      ]
    }
  ]
}

=============== FILE: inbox/ticket-4471.md ===============
Ticket:   SUP-4471
Queue:    Payments (escalated from Tier 1)
Opened:   2026-08-11 09:14 (agent local time)
Reporter: Sofia R. - identity verified by phone, customer ref CUST-30188
Product:  Northfield personal banking
Occurrences reported: 1

--- customer message, pasted from the chat window ---

hi, i moved money from my everyday account over to my savings this morning and the
amount that showed up afterwards is not the amount i sent. the number on the
confirmation screen looked right i think, but then the line on my statement says
something different, and now my balance doesn't add up either.

this happens every single time i move money between my own accounts, it's been like
that for a while now. my husband says he has the same thing on his login.

can you just fix the balance please, i'm away from tomorrow

--- agent notes (Marcus, Tier 1) ---

- customer was "on the computer", said "the usual browser", did not want to be walked
  through checking which one
- she said "the app" once later in the call - unclear whether she also tried the phone
  app or was just calling the website "the app"
- got the two figures out of her eventually: sent 1,250.00, statement line 1,205.00.
  No transfer reference captured - she could not find one on the screen.
- she has "a few accounts"; did not say which product each one is
- husband login not checked, he was not on the call, no ticket from him
- escalating because balance arithmetic is involved and I can't verify it here

=============== FILE: inbox/bank-3318.md ===============
BANK-3318 - filed 2026-08-12 17:40 by Ravi Menon (payments)
Linked ticket: SUP-4471

## Statement line shows a transposed amount on internal transfers

**Severity:** Minor
**Priority:** P3
**Reproducibility:** Once

### Environment

- **App / Build:** Production
- **OS / Browser:** customer machine, not established

### Steps to reproduce

1. Move money between two accounts held by the same customer.
2. Open the statement for the destination account.
3. Compare the statement line against the confirmation screen.

### Expected

The statement line shows the amount that was sent.

### Actual

Confirmation screen shows 1,250.00; statement line shows 1,205.00.

### Notes

1250 -> 1205 is the 5 and the 0 swapped, i.e. a minor-unit formatting defect in the
statement line, not a money movement problem. I have a one-line fix up for review
against the renderer. Cosmetic, so it can ride the next release train. Told support to
reassure the customer that her balance is correct and that the display will be fixed.
