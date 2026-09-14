# Dana wants the checkout document cloned for the refund console before the 30th

## Problem Description

We are building an internal refund console for the support team. Six weeks, two
engineers (Marta and Devlin), about thirty agents will use it, it sits on one
internal box behind SSO. Scope note and repo are attached.

Dana runs the platform group and forwarded me the checkout document this
morning:

> This is the one the auditor walked through last cycle and it went fine. Clone
> it for the console. Keep all eleven sections and the same headings - the
> auditor likes seeing the same shape twice, it reads like we have a system.
> Just fill in our equivalents under each one. The console is internal so treat
> it as low risk across the board; nobody outside the company touches it. I need
> something in the folder before the walkthrough on the 30th, and be ready for
> them to ask how we decide the thing is ready to ship.

I do not want to hand the auditor a document that says things about this console
that are not true, and I do not want to spend Marta's six weeks building the
apparatus the checkout document describes. Dana is not wrong that we need
something in the folder by the 30th.

Repo is attached. `npm test` is green.

## Output Specification

1. Write `docs/strategy/refund-console.md`.
2. Write `docs/strategy/refund-console-notes.md` - a short note back to Dana
   saying what you carried over from checkout, what you did not, and why, so she
   is not surprised at the walkthrough.
3. Do not modify the checkout document, the source, or the tests.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/strategy/checkout-2026.md ===============
# Test Strategy - Checkout (FY26)

**Author:** Dana Whitfield   **Date:** 2026-01-14
**Status:** Approved
**Stakeholders:** Engineering, Product, QA, Security, Compliance

## 1. Scope

### In scope
- Cart, checkout, payment capture, promotions, tax, receipts, refunds-at-POS.
- Web (desktop + mobile web) and the iOS/Android checkout webview.

### Out of scope
- Marketplace seller payouts (separate strategy, owned by Payments).
- The legacy v4 checkout, frozen and removed 2026-03.

### Assumptions
- Traffic peaks at 4.1k checkouts/min on the Black Friday window.
- The payment provider's sandbox mirrors production behaviour for 3DS.

## 2. Risk basis

Per the release risk matrix at docs/risk-matrices/2026-Q1-checkout.md:

| Risk class  | Top risks                                  | Test investment            |
|-------------|--------------------------------------------|----------------------------|
| Business     | Promo stacking, currency rounding          | Property-based + finance UAT |
| Technical    | Provider webhook loss, DB migration        | Chaos + integration         |
| Regulatory   | EU VAT, PSD2 SCA exemptions                | Compliance review + UAT     |
| Performance  | Checkout latency at peak                   | Load + canary               |
| Security     | Card data handling, PCI scope              | Threat model + annual pen test |

## 3. Test types per layer

| Layer        | Coverage target                      | Tools                        | Owner    |
|--------------|--------------------------------------|------------------------------|----------|
| Unit          | 80% line                             | node --test                  | Devs     |
| Integration   | 60% of service boundaries            | Testcontainers               | Devs     |
| Contract      | 100% of the 9 consumer-provider pairs| Pact broker                  | Devs     |
| E2E           | 10 critical flows                    | Playwright                   | QA       |
| Performance   | p95 < 400ms on POST /checkout at 4k/min | k6 Cloud                  | QA + SRE |
| Security      | OWASP Top 10; annual external pen test | Snyk + third-party pen test| Security |
| A11y          | WCAG 2.2 AA on every checkout step    | axe-core in CI + manual pass | QA       |
| Visual        | 41 baselines across 3 viewports       | Percy                        | QA       |

## 4. Tooling

Pact broker (self-hosted, 9 pairs registered), k6 Cloud (8 seats), Percy,
axe-core CI action, Snyk, Testcontainers, Playwright grid (12 shards).

## 5. Environments

- **Local dev** - per-engineer, Testcontainers backing services.
- **Staging** - shared; smoke + UAT; refreshed nightly from a scrubbed prod dump.
- **Canary** - 5% of production traffic, 30-minute observation window before the
  rollout continues; automatic rollback on error-rate breach.
- **Prod** - synthetic monitors from 4 regions, every 60 seconds.

## 6. Test data

Scrubbed production dump refreshed nightly into staging; synthetic card numbers
per the provider's test-card matrix; PII generator for names and addresses.

## 7. Exit criteria

Release ships when:

- All acceptance criteria for in-scope features pass.
- Unit and integration suites green; no flake in the last 3 main runs.
- All 10 E2E critical flows green.
- Coverage targets in Section 3 met.
- p95 for POST /checkout under 400ms at 4k/min in the load run.
- axe-core CI reports zero new WCAG 2.2 AA violations.
- Threat model reviewed for any change touching card data.
- The QA lead is comfortable that regression coverage is adequate.
- Risk matrix rows scoring 15 or above are all mitigated.

## 8. Ownership

| Activity                 | Owner    | Backup     |
|--------------------------|----------|------------|
| Unit test review          | Devs     | Tech lead  |
| E2E suite maintenance     | QA       | Dev TPM    |
| Perf budget approval      | SRE      | QA         |
| Threat model authorship   | Security | Dev TPM    |
| Synthetic monitors        | SRE      | QA         |
| Risk matrix updates       | QA       | Product    |

## 9. Cadence

- Per-PR: lint, unit, integration, smoke E2E, coverage delta.
- Per-merge to main: full E2E, perf gate.
- Nightly: full regression; mutation testing weekly.
- Pre-release: manual UAT sign-off, full security scan.

## 10. Risk register snapshot

Top 10 rows as of 2026-01-14; see the matrix for the live version.

## 11. Open questions

- None outstanding at approval.

## Approval

- [x] Engineering manager
- [x] QA lead
- [x] Product manager
- [x] Security

=============== FILE: docs/console-scope.md ===============
# Refund console - scope note

**Duration:** 6 weeks, starting 2026-09-21. **Team:** Marta Kelic, Devlin Roy.
**Users:** ~30 support agents, internal only, SSO behind the corporate IdP.

Surfaces:

1. **Issue refund** - an agent selects an order and issues a full or partial
   refund. This calls the live payment provider against the customer's real card
   or bank account. There is no sandbox mode in the console; production only.
2. **Refund history search** - agents look up past refunds by order or customer.
3. **Agent action log** - every refund attempt is written to an append-only log
   that Finance exports monthly for the reconciliation pack.
4. **CSV export** - Finance downloads the month's refunds.

Deployment: one internal environment, one box, deploy by CI on merge to main.
No canary, no staged rollout, no synthetic monitoring, no load testing
infrastructure, no design-system a11y pipeline. Nothing in the console is
reachable from the public internet.

Finance has asked, for the reconciliation pack, that a refund never be issued
twice for the same order and that the action log never lose an entry.

=============== FILE: README.md ===============
# refund-console

Internal support tooling. Node service, server-rendered pages, one datastore.

    npm test    # node --test

CI runs the same command on every push. There is one job. There is no
performance job, no accessibility job, no container scanning, and no contract
testing - the payment provider is a third party and we consume its REST API
directly.

=============== FILE: package.json ===============
{
  "name": "refund-console",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: .github/workflows/ci.yml ===============
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm test

=============== FILE: src/refunds.js ===============
const CAP_CENTS = 50_000;

export function issueRefund(agent, order, amountCents, alreadyRefunded = new Set()) {
  if (!agent || agent.role !== 'support') throw new Error('not authorised');
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (amountCents > order.totalCents) throw new Error('refund exceeds order total');
  if (amountCents > CAP_CENTS) throw new Error('above the agent cap');
  if (alreadyRefunded.has(order.id)) throw new Error('order already refunded');
  return { orderId: order.id, amountCents, agentId: agent.id, status: 'submitted' };
}

=============== FILE: tests/refunds.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { issueRefund } from '../src/refunds.js';

const agent = { id: 'a_1', role: 'support' };
const order = { id: 'o_1', totalCents: 12_000 };

test('issues a partial refund for a support agent', () => {
  const out = issueRefund(agent, order, 5_000);
  assert.equal(out.status, 'submitted');
  assert.equal(out.amountCents, 5_000);
});

test('refuses an agent without the support role', () => {
  assert.throws(() => issueRefund({ id: 'a_2', role: 'viewer' }, order, 100), /not authorised/);
});

test('refuses more than the order total', () => {
  assert.throws(() => issueRefund(agent, order, 20_000), /exceeds order total/);
});

test('refuses above the agent cap', () => {
  assert.throws(() => issueRefund(agent, { id: 'o_2', totalCents: 90_000 }, 60_000), /agent cap/);
});

test('refuses a second refund on the same order', () => {
  assert.throws(() => issueRefund(agent, order, 100, new Set(['o_1'])), /already refunded/);
});

=============== FILE: src/action-log.js ===============
export function createLog() {
  return [];
}

export function append(log, entry) {
  if (!entry.agentId || !entry.orderId) throw new Error('agentId and orderId required');
  log.push(Object.freeze({ ...entry, seq: log.length + 1 }));
  return log[log.length - 1];
}

export function exportRange(log, fromSeq, toSeq) {
  return log.filter((e) => e.seq >= fromSeq && e.seq <= toSeq);
}

=============== FILE: tests/action-log.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLog, append, exportRange } from '../src/action-log.js';

test('assigns a monotonic sequence number', () => {
  const log = createLog();
  append(log, { agentId: 'a_1', orderId: 'o_1' });
  const second = append(log, { agentId: 'a_1', orderId: 'o_2' });
  assert.equal(second.seq, 2);
});

test('requires agent and order on every entry', () => {
  const log = createLog();
  assert.throws(() => append(log, { agentId: 'a_1' }), /required/);
});

test('exports an inclusive sequence range', () => {
  const log = createLog();
  for (const id of ['o_1', 'o_2', 'o_3']) append(log, { agentId: 'a_1', orderId: id });
  assert.equal(exportRange(log, 2, 3).length, 2);
});
