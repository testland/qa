# Haruki wants a contract-testing line added and the integration job deleted

## Problem Description

We are breaking the billing monolith into four services this quarter. The
migration plan is attached - cutover runs from 2026-10-06 to 2026-12-11 and by
the end of it invoicing, dunning and ledger are each their own deployable with
their own datastore, and billing-api is what is left of the monolith.

Haruki runs platform. His note:

> Two things for the document. Add a line about contract testing under the
> layers table - we will obviously need it once these things talk over HTTP.
> And once contract tests are in we can drop the integration suite: it is 11 of
> the 14 minutes of the build, it is the thing everybody complains about in
> retro, and a contract test covers the same ground more cheaply. I would like
> that build under five minutes by the time we cut over.

The current document is attached, along with the repo. `npm test` is
green. The 11-minute figure is real - the CI timing note is in the workflow
file.

Do not change any test or any source file in this pass. I want the document
right first; we will act on it after.

## Output Specification

1. Update `docs/strategy/billing-2026.md` in place.
2. Write `docs/strategy/billing-split-note.md` - the reply to Haruki, answering
   each of his two points and saying what would actually get the build down.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/strategy/billing-2026.md ===============
# Test Strategy - Billing

**Author:** Haruki Sato   **Date:** 2026-02-11
**Status:** Approved
**Stakeholders:** Engineering, Product, QA, Finance

## 1. Scope

### In scope
- Invoicing, dunning, ledger posting, tax, statement export.

### Out of scope
- Payment capture (Payments team).
- Revenue recognition reporting (Finance's own tooling).

### Assumptions
- Billing is one deployable against one database.

## 2. Risk basis

Per docs/risk-matrices/2026-Q1-billing.md:

| Risk class | Top risks                                    | Test investment          |
|------------|----------------------------------------------|--------------------------|
| Business    | Tax rounding, proration on mid-cycle changes | Unit + property-based    |
| Technical   | Invoice posting partial writes               | Integration              |
| Regulatory  | Invoice immutability after posting           | Integration + Finance UAT|

## 3. Test types per layer

| Layer        | Coverage target              | Tools          | Owner |
|--------------|------------------------------|----------------|-------|
| Unit          | 80% line                     | node --test    | Devs  |
| Integration   | 60% of module boundaries     | node --test    | Devs  |
| Contract      | n/a - single deployable      | -              | -     |
| E2E           | 7 critical flows             | Playwright     | QA    |
| Performance   | Statement export p95 under 2s| k6             | QA    |

## 4. Tooling

node --test, Playwright, k6.

## 5. Environments

Local docker compose; shared staging; production. Deploys on merge to main.

## 6. Test data

All suites load `db/seed.sql` into the single billing database. `npm run
db:reset` truncates and reloads it before every integration run, and CI starts
one MariaDB container per job. Fixtures reference the seeded identifiers
directly - accounts `acct_1000` to `acct_1099`, invoices `inv_5000` upward - so
a test in any module can assume any other module's rows are present.

## 7. Exit criteria

Release ships when:

- All acceptance criteria pass.
- Unit and integration suites green.
- The 7 E2E critical flows green.
- Statement export p95 under 2s.
- No posting defect open at severity 2 or above.

## 8. Ownership

| Activity               | Owner       | Backup      |
|------------------------|-------------|-------------|
| Unit test review        | Devs        | Tech lead   |
| Integration suite       | Devs        | QA          |
| E2E suite maintenance   | QA          | Dev TPM     |
| Perf budget approval    | SRE         | QA          |

## 9. Cadence

- Per-PR: lint, unit, integration.
- Per-merge to main: full E2E, perf gate.
- Quarterly: re-review this document.

## 10. Risk register snapshot

Top rows as of 2026-02-11.

## 11. Open questions

- None outstanding at approval.

## Approval

- [x] Engineering manager
- [x] QA lead
- [x] Product manager

=============== FILE: docs/migration/billing-split.md ===============
# Billing monolith split - FY27 Q2 migration plan

Four deployables when this is done. Each owns its own datastore; no shared
database, no cross-service SQL, no shared seed.

| Service      | Owns                                   | Datastore          | Cutover     |
|--------------|----------------------------------------|--------------------|-------------|
| billing-api  | accounts, subscriptions, notifications | postgres (existing)| 2026-10-06  |
| invoicing    | invoices, invoice_lines, tax lines     | postgres (new)     | 2026-10-27  |
| ledger       | ledger entries, account balances       | postgres (new)     | 2026-11-17  |
| dunning      | dunning schedules, reminder state      | postgres (new)     | 2026-12-11  |

## Consumer-provider pairs after the split

| # | Consumer     | Provider    | Interface                                  |
|---|--------------|-------------|--------------------------------------------|
| 1 | billing-api  | invoicing   | POST /invoices                              |
| 2 | billing-api  | ledger      | GET /accounts/{id}/balance                  |
| 3 | invoicing    | ledger      | POST /ledger/entries                        |
| 4 | invoicing    | billing-api | GET /subscriptions/{id}                     |
| 5 | dunning      | invoicing   | GET /invoices?status=overdue                |
| 6 | dunning      | billing-api | POST /notifications                         |

There is no message bus in scope; every pair above is synchronous HTTP.

=============== FILE: db/seed.sql ===============
-- Shared billing seed. Loaded by npm run db:reset before every integration run.
INSERT INTO accounts (id, name) VALUES ('acct_1000', 'Northwind'), ('acct_1001', 'Contoso');
INSERT INTO subscriptions (id, account_id, plan) VALUES ('sub_2000', 'acct_1000', 'team');
INSERT INTO invoices (id, account_id, status) VALUES ('inv_5000', 'acct_1000', 'posted');
INSERT INTO invoice_lines (invoice_id, sku, amount_cents) VALUES ('inv_5000', 'seats', 12000);
INSERT INTO ledger_entries (id, account_id, amount_cents) VALUES ('le_9000', 'acct_1000', 12000);
INSERT INTO dunning_schedules (id, invoice_id, next_run) VALUES ('dn_100', 'inv_5000', '2026-03-01');

=============== FILE: src/store.js ===============
export function createStore() {
  return { invoices: new Map(), invoiceLines: new Map(), tx: null };
}

export function begin(store) {
  if (store.tx) throw new Error('transaction already open');
  store.tx = { invoices: new Map(store.invoices), invoiceLines: new Map(store.invoiceLines) };
}

export function commit(store) {
  if (!store.tx) throw new Error('no transaction');
  store.invoices = store.tx.invoices;
  store.invoiceLines = store.tx.invoiceLines;
  store.tx = null;
}

export function rollback(store) {
  if (!store.tx) throw new Error('no transaction');
  store.tx = null;
}

export function put(store, table, id, row) {
  (store.tx ? store.tx[table] : store[table]).set(id, row);
}

export function get(store, table, id) {
  return (store.tx ? store.tx[table] : store[table]).get(id);
}

=============== FILE: src/invoicing.js ===============
import { begin, commit, rollback, put, get } from './store.js';

const POSTING_LIMIT_CENTS = 1_000_000;

export function postInvoice(store, invoice) {
  begin(store);
  try {
    if (get(store, 'invoices', invoice.id)) throw new Error('invoice already posted');
    put(store, 'invoices', invoice.id, { id: invoice.id, accountId: invoice.accountId, status: 'posted' });
    let totalCents = 0;
    for (const line of invoice.lines) {
      if (!Number.isInteger(line.amountCents) || line.amountCents <= 0) {
        throw new Error('line amountCents must be a positive integer');
      }
      totalCents += line.amountCents;
      put(store, 'invoiceLines', `${invoice.id}:${line.sku}`, { invoiceId: invoice.id, ...line });
    }
    if (totalCents > POSTING_LIMIT_CENTS) throw new Error('above the posting limit');
    commit(store);
    return { posted: true, totalCents };
  } catch (err) {
    rollback(store);
    throw err;
  }
}

=============== FILE: src/tax.js ===============
export function taxCents(amountCents, ratePermille) {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error('bad amount');
  if (!Number.isInteger(ratePermille) || ratePermille < 0) throw new Error('bad rate');
  return Math.round((amountCents * ratePermille) / 1000);
}

=============== FILE: tests/unit/tax.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { taxCents } from '../../src/tax.js';

test('applies a per-mille rate', () => {
  assert.equal(taxCents(10_000, 200), 2_000);
});

test('rounds half away from zero', () => {
  assert.equal(taxCents(101, 50), 5);
});

test('rejects a negative amount', () => {
  assert.throws(() => taxCents(-1, 200), /bad amount/);
});

=============== FILE: tests/integration/invoice-posting.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, get } from '../../src/store.js';
import { postInvoice } from '../../src/invoicing.js';

test('posts an invoice with all of its lines', () => {
  const store = createStore();
  const out = postInvoice(store, {
    id: 'inv_1',
    accountId: 'acct_1',
    lines: [{ sku: 'seats', amountCents: 12_000 }, { sku: 'support', amountCents: 3_000 }],
  });
  assert.equal(out.totalCents, 15_000);
  assert.equal(get(store, 'invoices', 'inv_1').status, 'posted');
  assert.equal(get(store, 'invoiceLines', 'inv_1:support').amountCents, 3_000);
});

test('leaves no header and no lines behind when a later line is invalid', () => {
  const store = createStore();
  assert.throws(
    () =>
      postInvoice(store, {
        id: 'inv_2',
        accountId: 'acct_1',
        lines: [
          { sku: 'seats', amountCents: 12_000 },
          { sku: 'support', amountCents: 3_000 },
          { sku: 'overage', amountCents: -1 },
        ],
      }),
    /positive integer/,
  );
  assert.equal(get(store, 'invoices', 'inv_2'), undefined);
  assert.equal(get(store, 'invoiceLines', 'inv_2:seats'), undefined);
  assert.equal(get(store, 'invoiceLines', 'inv_2:support'), undefined);
});

test('leaves nothing behind when the posting limit is breached', () => {
  const store = createStore();
  assert.throws(
    () => postInvoice(store, { id: 'inv_3', accountId: 'acct_1', lines: [{ sku: 'seats', amountCents: 2_000_000 }] }),
    /posting limit/,
  );
  assert.equal(get(store, 'invoices', 'inv_3'), undefined);
});

=============== FILE: .github/workflows/ci.yml ===============
# Timing from the 2026-09-25 run on main: unit 1m12s, integration 11m04s,
# lint 0m48s, total 14m03s. The integration job is the long pole and has been
# raised in the last three retros.
name: ci
on: [push]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo lint
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm run test:unit
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm run db:reset
      - run: npm run test:integration

=============== FILE: package.json ===============
{
  "name": "billing",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "test:unit": "node --test \"tests/unit/**/*.test.js\"",
    "test:integration": "node --test \"tests/integration/**/*.test.js\"",
    "db:reset": "echo 'loading db/seed.sql'"
  }
}
