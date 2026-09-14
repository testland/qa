# Reorg took half the quarter's test hours and Priya wants the expensive line gone

## Problem Description

Split payments v2 goes into build on Monday. Priya owns the risk register for it
and she has just had her allocation cut: the reorg pulled Tom onto the ledger
migration for six weeks, so the 3 engineer-weeks we had for test work on this
feature is now 1.5, all of it Lena's. The revised capacity note is attached
along with the register and the tooling inventory.

Priya's mail to me this morning, more or less verbatim:

> Two things. First, cut the duplicate-capture line. It is the single most
> expensive item on that register and in four years we have never had a double
> capture reach a customer - I am not spending half of what I have left on a
> thing that has never happened. Second, keep the CSV export column-order check.
> A board member pulled a payout file last month, the columns had moved, and I
> had to sit in a meeting and explain it. It is cheap and it is visible.
>
> And please: 1.5 weeks is the number. Do not send me a plan that needs three.
> I have had two of those this year and both of them just quietly ran over.

The repo is attached too. `npm test` is green today. Last quarter we
planned 80 hours against an 80-hour allocation and closed the books at 103,
which is the thing Priya is actually reacting to.

I want something she can take to Sasha in product on Monday morning. If any part
of this needs a decision above her pay grade, say so plainly and say who has to
make it - do not just bury it.

## Output Specification

1. Write `docs/test-plans/2026-Q4-split-payments.md` - the plan for the quarter,
   costed against the capacity that actually exists, with a named owner against
   every line of work.
2. Write `docs/test-plans/2026-Q4-capacity-reply.md` - the reply to Priya,
   answering each of her two asks separately and stating what happens next.
3. Do not add or modify any test in this pass, and do not edit the register.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/risk-matrices/2026-Q4-split-payments.md ===============
# Risk matrix - Split payments v2 (2026-Q4)

**Date:** 2026-09-29   **Owner:** Priya Nandakumar   **Reviewers:** Tom Osei, Lena Brandt
**Scale:** impact 1-5 x likelihood 1-5   **Block threshold:** 15

| ID  | Risk                                                                   | Category   | Impact | Likelihood | Score | Mitigation                                          | Owner            |
|-----|------------------------------------------------------------------------|------------|-------:|-----------:|------:|-----------------------------------------------------|------------------|
| R-1 | Retried charge reuses the idempotency key and captures twice            | Technical  |   5    |     4      |  20   | Idempotency ledger + fault injection on retry        | Tom Osei         |
| R-2 | Three-way split rounding loses a cent on odd totals                     | Business   |   4    |     4      |  16   | Property-based rounding tests + finance UAT          | Lena Brandt      |
| R-3 | Payout released to a seller suspended for sanctions review              | Regulatory |   5    |     3      |  15   | Compliance review + UAT with the sanctions team      | Priya Nandakumar |
| R-8 | Split payout webhook accepted without verifying the provider signature  | Security   |   5    |     3      |  15   | Threat model session + signature verification tests  | Tom Osei         |
| R-4 | Ledger reconciliation drifts across timezone boundaries                 | Technical  |   4    |     3      |  12   | Integration test on the nightly reconcile job        | Tom Osei         |
| R-5 | Split dashboard mislabels the currency on mixed-currency splits         | UX         |   3    |     2      |   6   | Visual regression baseline                            | Lena Brandt      |
| R-7 | Seller onboarding form loses state on browser back                      | UX         |   2    |     2      |   4   | Manual exploratory pass                               | Lena Brandt      |
| R-6 | Payout CSV export changes column order between releases                 | UX         |   1    |     3      |   3   | Snapshot test on the export header                    | Lena Brandt      |

Retired 2026-08-14: R-9 legacy per-seller payout page (page removed in v6.2).

=============== FILE: docs/2026-Q4-capacity.md ===============
# Payments squad - Q4 test capacity

Original allocation for Split payments v2: **3 engineer-weeks (120 hours)**.

Revised 2026-09-28 after the platform reorg pulled Tom onto the ledger migration
for six weeks: **1.5 engineer-weeks (60 hours)**, all of it Lena's. Tom is
available for review and for booking a security-guild slot, not for build.

One engineer-week is counted as 40 hours here.

For reference, 2026-Q3: we planned 80 hours of test work against an 80-hour
allocation and closed at 103 hours actual. The overrun was two production
incidents mid-quarter and one round of retests after the compliance review came
back with findings. Nothing in that 80 was padding - there was none.

=============== FILE: docs/tooling-inventory.md ===============
# Payments squad - tooling inventory (reviewed 2026-09-15)

| Layer                   | Tool                                          | Status |
|-------------------------|-----------------------------------------------|--------|
| Unit                     | node --test (built in)                        | In use |
| Property-based           | fast-check 3.x                                | In use, added 2026-06 |
| Integration              | node --test + Testcontainers (MariaDB)        | In use |
| Contract                 | -                                             | **None.** The provider is external and publishes no broker; no consumer-driven contract tooling is installed and none is budgeted for FY27. |
| E2E                      | Playwright                                     | In use |
| Load                     | k6 Cloud, 2 seats                              | In use |
| Chaos / fault injection  | -                                             | **None.** The vendor trial ended 2026-07-31 and procurement declined the renewal for FY27. No approved substitute. |
| Visual regression        | Playwright toHaveScreenshot                    | In use |
| Manual / UAT             | Finance team (Lena books slots); sanctions team via compliance | In use |
| Threat modelling         | Security guild, one session per quarter, bookable | In use |

=============== FILE: src/idempotency.js ===============
export function createLedger() {
  return new Map();
}

export function capture(ledger, key, amountCents) {
  if (!key) throw new Error('idempotency key required');
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  ledger.set(key, amountCents);
  return { captured: true, amountCents };
}

export function totalCaptured(ledger) {
  let total = 0;
  for (const amount of ledger.values()) total += amount;
  return total;
}

=============== FILE: tests/idempotency.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, capture, totalCaptured } from '../src/idempotency.js';

test('captures a charge against a fresh idempotency key', () => {
  const ledger = createLedger();
  assert.deepEqual(capture(ledger, 'ik_1', 2500), { captured: true, amountCents: 2500 });
});

test('requires an idempotency key', () => {
  const ledger = createLedger();
  assert.throws(() => capture(ledger, '', 2500), /idempotency key required/);
});

test('rejects a non-positive amount', () => {
  const ledger = createLedger();
  assert.throws(() => capture(ledger, 'ik_2', 0), /positive integer/);
});

test('totals the captures in the ledger', () => {
  const ledger = createLedger();
  capture(ledger, 'ik_1', 2500);
  capture(ledger, 'ik_2', 1000);
  assert.equal(totalCaptured(ledger), 3500);
});

=============== FILE: src/split.js ===============
export function splitAmount(totalCents, sharePercents) {
  const sum = sharePercents.reduce((a, b) => a + b, 0);
  if (sum !== 100) throw new Error('shares must sum to 100');
  const parts = sharePercents.map((s) => Math.floor((totalCents * s) / 100));
  const allocated = parts.reduce((a, b) => a + b, 0);
  parts[0] += totalCents - allocated;
  return parts;
}

=============== FILE: tests/split.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount } from '../src/split.js';

test('splits evenly between two parties', () => {
  assert.deepEqual(splitAmount(1000, [50, 50]), [500, 500]);
});

test('rejects shares that do not sum to 100', () => {
  assert.throws(() => splitAmount(1000, [50, 40]), /sum to 100/);
});

=============== FILE: src/csv-export.js ===============
const COLUMNS = ['payout_id', 'seller_id', 'amount_cents', 'currency', 'settled_at'];

function escape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows) {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) lines.push(COLUMNS.map((c) => escape(row[c])).join(','));
  return lines.join('\n') + '\n';
}

=============== FILE: tests/csv-export.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/csv-export.js';

test('writes the column header in a fixed order', () => {
  assert.equal(toCsv([]), 'payout_id,seller_id,amount_cents,currency,settled_at\n');
});

test('writes one line per payout', () => {
  const csv = toCsv([
    { payout_id: 'po_1', seller_id: 's_1', amount_cents: 100, currency: 'USD', settled_at: '2026-09-01' },
    { payout_id: 'po_2', seller_id: 's_2', amount_cents: 250, currency: 'USD', settled_at: '2026-09-02' },
  ]);
  assert.equal(csv.trim().split('\n').length, 3);
});

test('quotes a value containing a comma', () => {
  const csv = toCsv([
    { payout_id: 'po_1', seller_id: 'Acme, Inc', amount_cents: 100, currency: 'USD', settled_at: '2026-09-01' },
  ]);
  assert.ok(csv.includes('"Acme, Inc"'));
});

test('renders a missing field as empty', () => {
  const csv = toCsv([{ payout_id: 'po_1' }]);
  assert.ok(csv.includes('po_1,,,,'));
});

=============== FILE: package.json ===============
{
  "name": "split-payments",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
