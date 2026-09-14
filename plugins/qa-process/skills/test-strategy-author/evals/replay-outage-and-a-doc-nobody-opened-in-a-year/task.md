# Rafa wants the double-credit incident bolted onto the end and nothing else touched

## Problem Description

On 2026-08-27 our payment provider replayed a batch of settlement callbacks
after a gateway 502 on their side. We credited 412 wallets twice - 18,430 USD
out the door - and nobody noticed for three hours. The write-up is attached.

Rafa manages the wallet team and sent this yesterday:

> The compliance review is on the 24th and they will want to see that the
> incident went somewhere. Add a section at the end of the wallet document
> describing what happened and what we changed, so there is a record. Please
> don't rewrite the rest of it while you are in there - it was approved last
> year, and getting it re-approved is a three-week round trip through four
> calendars that I do not have before the 24th.

He is right that nobody has capacity to re-author the whole thing this month.
I am less sure about the rest of it. That document has not been opened since it
was written, as far as I can tell.

The current wallet risk register is attached, along with the credit handler and
its tests. `npm test` is green and was green all through August,
including the night of the incident.

## Output Specification

1. Update `docs/strategy/wallet-2025.md` in place.
2. Write `docs/strategy/wallet-review-2026-09.md` - the reply to Rafa: what you
   changed and why, anything you found that he did not ask about, and what
   sign-off the changes actually require before the 24th.
3. Do not change the source or the tests in this pass.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/strategy/wallet-2025.md ===============
# Test Strategy - Wallet

**Author:** Kadia Owusu   **Date:** 2025-06-30
**Status:** Approved
**Stakeholders:** Engineering, Product, QA, Finance

## 1. Scope

### In scope
- Wallet balance, credits, debits, holds, statement export.
- Settlement callbacks from the payment provider.

### Out of scope
- Card issuing (separate team).
- FX conversion, not yet built.

### Assumptions
- The provider delivers each settlement callback exactly once.

## 2. Risk basis

Per docs/risk-matrices/2026-Q3-wallet.md:

| Risk class  | Top risks                                      | Test investment           |
|-------------|------------------------------------------------|---------------------------|
| Business     | Balance drift on concurrent debits             | Unit + property-based     |
| Technical    | Provider callback delivery                      | Integration               |
| Regulatory   | Statement accuracy for the annual audit         | Finance UAT               |
| Performance  | Statement export on large wallets               | Load                      |

## 3. Test types per layer

| Layer        | Coverage target       | Tools            | Owner |
|--------------|-----------------------|------------------|-------|
| Unit          | 80% line              | node --test      | Devs  |
| Integration   | 60% of boundaries     | Testcontainers   | Devs  |
| E2E           | 6 critical flows      | Playwright       | QA    |
| Performance   | Statement export p95  | k6               | QA    |

## 4. Tooling

node --test, Testcontainers, Playwright, k6.

## 5. Environments

Local dev, shared staging, production. No canary on wallet.

## 6. Test data

Synthetic wallets seeded per test; no production data in lower environments.

## 7. Exit criteria

Release ships when:

- All acceptance criteria pass.
- Unit and integration suites green.
- The 6 E2E critical flows green.
- Statement export p95 under 2s for a 10k-line wallet.
- Finance is happy with the statement output.
- No known blocking issues.

## 8. Ownership

| Activity                | Owner          | Backup         |
|-------------------------|----------------|----------------|
| Unit test review         | Kadia Owusu    | Sam Prentice   |
| E2E suite maintenance    | Sam Prentice   | Kadia Owusu    |
| Perf budget approval     | SRE            | Kadia Owusu    |
| Risk register updates    | Kadia Owusu    | Product        |

## 9. Cadence

- Per-PR: lint, unit, integration.
- Per-merge to main: full E2E.
- Nightly: full regression.

## 10. Risk register snapshot

Top rows as of 2025-06-30.

## 11. Open questions

- None outstanding at approval.

## Approval

- [x] Engineering manager
- [x] QA lead
- [x] Product manager

=============== FILE: incidents/INC-2291.md ===============
# INC-2291 - duplicate wallet credits from replayed settlement callbacks

**Date:** 2026-08-27   **Severity:** SEV-2   **Detected:** 03:11 UTC by Finance,
not by monitoring. **Resolved:** 06:44 UTC.

## What happened

The provider's settlement service returned 502 to its own internal queue at
23:58 UTC on 2026-08-26 and re-delivered the 23:00-00:00 batch when it
recovered. Our callback endpoint accepted the replayed batch and applied every
credit a second time. 412 wallets were credited twice, totalling 18,430 USD.

## Root cause

`applyCredit` in src/credit.js takes the provider's event and writes a credit.
It does not record or check the provider event id, so a re-delivered event is
indistinguishable from a new one. The provider's own documentation states that
callbacks are delivered at least once and that consumers must deduplicate on
`event_id`. The strategy document's Section 1 assumption says the opposite.

## Detection

Nothing alerted. Finance found it at 03:11 during the morning reconciliation.
Mean time to detect: 3h 13m.

## Remediation shipped 2026-08-29

- `applyCredit` now records `event_id` and rejects a repeat. (PR #8814)
- A reconciliation alert fires when credits in an hour exceed the settlement
  batch total by more than 1%.

## Not yet done

- No test asserts the deduplication. PR #8814 shipped without one; the author
  noted "covered by the reconciliation alert" in the review.
- No other provider-driven handler (debits, holds, reversals) has been checked
  for the same gap.

=============== FILE: docs/risk-matrices/2026-Q3-wallet.md ===============
# Risk matrix - Wallet (2026-Q3)

**Date:** 2026-07-02   **Owner:** Rafa Ibanez   **Block threshold:** 15

| ID  | Risk                                                    | Category   | Impact | Likelihood | Score | Owner       |
|-----|---------------------------------------------------------|------------|-------:|-----------:|------:|-------------|
| W-1 | Balance drifts when two debits land in the same tick      | Business   |   4    |     3      |  12   | Rafa Ibanez |
| W-2 | Statement export times out on wallets over 50k lines      | Performance|   3    |     3      |   9   | Rafa Ibanez |
| W-3 | Hold released before the merchant capture arrives         | Technical  |   4    |     2      |   8   | Nina Braga  |
| W-4 | Statement rounding disagrees with the provider's figures  | Regulatory |   4    |     2      |   8   | Rafa Ibanez |

No row covers replayed or duplicated provider callbacks.

=============== FILE: docs/team.md ===============
# Wallet team roster - current as of 2026-09-09

| Person       | Role              | Status                                   |
|--------------|-------------------|------------------------------------------|
| Rafa Ibanez  | Engineering manager | Active                                 |
| Nina Braga   | Senior engineer    | Active                                  |
| Ori Tal      | Engineer           | Active                                  |
| Jess Lindqvist | QA               | Active, joined 2026-02                  |
| Kadia Owusu  | Engineering manager | **Left the company 2025-11-14**        |
| Sam Prentice | QA                 | **Moved to the platform team 2026-04-01** |

=============== FILE: src/credit.js ===============
export function createWallet(id) {
  return { id, balanceCents: 0, appliedEvents: [] };
}

export function applyCredit(wallet, event) {
  if (!event || !event.event_id) throw new Error('event_id required');
  if (!Number.isInteger(event.amountCents) || event.amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  wallet.appliedEvents.push(event.event_id);
  wallet.balanceCents += event.amountCents;
  return wallet.balanceCents;
}

export function applyDebit(wallet, event) {
  if (!event || !event.event_id) throw new Error('event_id required');
  if (event.amountCents > wallet.balanceCents) throw new Error('insufficient funds');
  wallet.appliedEvents.push(event.event_id);
  wallet.balanceCents -= event.amountCents;
  return wallet.balanceCents;
}

=============== FILE: tests/credit.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWallet, applyCredit, applyDebit } from '../src/credit.js';

test('credits the wallet by the event amount', () => {
  const w = createWallet('w_1');
  assert.equal(applyCredit(w, { event_id: 'ev_1', amountCents: 2_500 }), 2_500);
});

test('rejects a credit with no event id', () => {
  const w = createWallet('w_1');
  assert.throws(() => applyCredit(w, { amountCents: 100 }), /event_id required/);
});

test('rejects a non-positive credit', () => {
  const w = createWallet('w_1');
  assert.throws(() => applyCredit(w, { event_id: 'ev_2', amountCents: 0 }), /positive integer/);
});

test('debits the wallet by the event amount', () => {
  const w = createWallet('w_1');
  applyCredit(w, { event_id: 'ev_1', amountCents: 2_500 });
  assert.equal(applyDebit(w, { event_id: 'ev_2', amountCents: 500 }), 2_000);
});

test('refuses a debit beyond the balance', () => {
  const w = createWallet('w_1');
  assert.throws(() => applyDebit(w, { event_id: 'ev_3', amountCents: 10 }), /insufficient funds/);
});

=============== FILE: package.json ===============
{
  "name": "wallet",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
