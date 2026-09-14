# Friday sign-off on marketplace payouts and nobody can say what is actually covered

## Problem Description

We ship the 2026-06 marketplace payouts release on Friday. Finance will not sign
until someone can show, per registered risk, what is backing it - a test, a case in
the TCM, or a monitor. Right now three people have three different answers.

`risks.yaml` is the register for the release. Ade tags automated tests with a
`risk:<ID>` marker in the test title, `manual-cases.md` is last night's TCM export,
and `risk-coverage.yaml` is the monitor map Tomas maintains by hand. The test suite
runs green today with `node --test`.

What I need from you is the per-risk picture and then a straight go or no-go. Helena
is nervous about the ledger engineer going on leave on the 22nd and wants that
tracked as tightly as everything else; Tomas thinks we are fine because every serious
row has something against it. Ade thinks the confirmation-email work is the
best-covered thing in the release and wants the pattern copied elsewhere.

Do not add or change tests in this pass and do not edit the register - I want the
picture as it stands today, plus what you would have us do about it.

## Output Specification

1. Write `docs/risk/coverage-2026-06.md`: header counts, then one row per risk
   showing what backs it and how deeply, ordered by score descending, with anything
   uncovered called out.
2. Write `docs/risk/signoff-2026-06.md`: go or no-go for Friday, the reason, and the
   action list with an owner against each item.

## Input Files

Extract the following files before beginning.

=============== FILE: risks.yaml ===============
release: "2026-06 marketplace payouts"
owner: Helena Vogt
reviewers: [Ade Balogun, Tomas Rye]
scale: "impact 1-5 x likelihood 1-5"
block_threshold: 15

active:
  - id: R-002
    title: Payout batch double-pays a seller when a run is retried
    category: business
    impact: 5
    likelihood: 4
    score: 20
    mitigation: Idempotency key per payout line
    owner: Ade Balogun
    last_review: 2026-06-08

  - id: R-005
    title: Seller 1099-K generated against the wrong reporting threshold
    category: regulatory
    impact: 4
    likelihood: 4
    score: 16
    mitigation: Finance UAT before filing season
    owner: Helena Vogt
    last_review: 2026-06-08

  - id: R-007
    title: Payout webhook accepted without signature verification
    category: security
    impact: 5
    likelihood: 3
    score: 15
    mitigation: HMAC verification on every inbound webhook
    owner: Ade Balogun
    last_review: 2026-06-08

  - id: R-011
    title: Ledger balance drifts when two payout runs overlap
    category: technical
    impact: 4
    likelihood: 3
    score: 12
    mitigation: Row-level lock on the ledger account
    owner: Tomas Rye
    last_review: 2026-06-08

  - id: R-014
    title: Payout confirmation email renders the wrong currency symbol
    category: ux
    impact: 2
    likelihood: 2
    score: 4
    mitigation: Locale-aware formatter
    owner: Ade Balogun
    last_review: 2026-06-08

  - id: R-016
    title: Bank file upload rejects seller names with non-ASCII characters
    category: integration
    impact: 3
    likelihood: 1
    score: 3
    mitigation: UTF-8 transliteration on export
    owner: Tomas Rye
    last_review: 2026-06-08

  - id: PJ-003
    title: Only engineer who knows the ledger is on parental leave from 2026-06-22
    category: people
    impact: 4
    likelihood: 5
    score: 20
    mitigation: Knowledge-transfer sessions, pair rotation
    owner: Helena Vogt
    last_review: 2026-06-08

retired:
  - id: R-009
    title: Legacy payout CSV export corrupts amounts over 1e6
    retired: 2026-04-02
    why: CSV export removed in v7.0; sellers use the bank file

=============== FILE: risk-coverage.yaml ===============
# Monitor map. Hand-maintained by Tomas. One entry per risk that has a production
# monitor behind it.
R-002:
  - datadog-monitor://payout-batch-duration-p99
R-011: []
R-014: []

=============== FILE: manual-cases.md ===============
# TCM export - marketplace payouts - 2026-06-11 02:10 UTC

| Case  | Title                                                | Suite            | Refs   | Last run   | Result |
|-------|------------------------------------------------------|------------------|--------|------------|--------|
| TC-118| Reject inbound payout webhook with a tampered body    | Payouts - manual | R-007  | 2026-06-10 | Pass   |
| TC-133| Confirmation email shows EUR for a German seller      | Payouts - manual | R-014  | 2026-06-09 | Pass   |
| TC-141| Seller onboarding happy path                          | Onboarding       |        | 2026-06-09 | Pass   |

=============== FILE: src/webhook.js ===============
import { createHmac, timingSafeEqual } from 'node:crypto';

export function sign(body, secret) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verify(body, secret, signature) {
  const expected = Buffer.from(sign(body, secret), 'utf8');
  const given = Buffer.from(String(signature ?? ''), 'utf8');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

=============== FILE: src/ledger.js ===============
export function applyPayout(account, amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (amountCents > account.balanceCents) throw new Error('insufficient funds');
  return { ...account, balanceCents: account.balanceCents - amountCents };
}

=============== FILE: src/email.js ===============
const SYMBOLS = { USD: '$', EUR: '20ac', GBP: '00a3', JPY: '00a5' };

export function renderAmount(amountCents, currency) {
  const symbol = SYMBOLS[currency];
  if (!symbol) throw new Error(`unsupported currency ${currency}`);
  const minor = currency === 'JPY' ? 0 : 2;
  const value = (amountCents / (minor === 0 ? 1 : 100)).toFixed(minor);
  return `${symbol}${value}`;
}

=============== FILE: src/legacy-csv.js ===============
export function toCsv(rows) {
  const header = 'seller_id,amount_cents';
  const body = rows.map((r) => `${r.sellerId},${r.amountCents}`).join('\n');
  return `${header}\n${body}\n`;
}

=============== FILE: src/payout-batch.js ===============
export function runBatch(lines, alreadyPaidIds = new Set()) {
  const paid = [];
  const skipped = [];
  for (const line of lines) {
    if (alreadyPaidIds.has(line.id)) {
      skipped.push(line.id);
      continue;
    }
    paid.push(line.id);
  }
  return { paid, skipped };
}

=============== FILE: tests/payout-webhook.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../src/webhook.js';

test('[risk:R-007] accepts a webhook carrying a valid signature', () => {
  const body = '{"event":"payout.settled","id":"po_1"}';
  assert.equal(verify(body, 'shh', sign(body, 'shh')), true);
});

test('[risk:R-007] rejects a webhook whose body was tampered with', () => {
  const body = '{"event":"payout.settled","id":"po_1"}';
  const signature = sign(body, 'shh');
  assert.equal(verify('{"event":"payout.settled","id":"po_2"}', 'shh', signature), false);
});

=============== FILE: tests/ledger.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPayout } from '../src/ledger.js';

test('[risk:R-11] ledger debits the payout amount exactly once', () => {
  const after = applyPayout({ id: 'acct_1', balanceCents: 10_000 }, 2_500);
  assert.equal(after.balanceCents, 7_500);
});

=============== FILE: tests/email-render.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAmount } from '../src/email.js';

test('[risk:R-014] renders USD with a dollar sign', () => {
  assert.equal(renderAmount(12_345, 'USD'), '$123.45');
});

test('[risk:R-014] renders EUR with a euro sign', () => {
  assert.equal(renderAmount(12_345, 'EUR'), '20ac123.45');
});

test('[risk:R-014] renders GBP with a pound sign', () => {
  assert.equal(renderAmount(9_900, 'GBP'), '00a399.00');
});

test('[risk:R-014] renders JPY without minor units', () => {
  assert.equal(renderAmount(1_200, 'JPY'), '00a51200');
});

test('[risk:R-014] rounds half up to two decimals', () => {
  assert.equal(renderAmount(1, 'USD'), '$0.01');
});

test('[risk:R-014] throws on an unsupported currency', () => {
  assert.throws(() => renderAmount(100, 'XYZ'), /unsupported currency/);
});

=============== FILE: tests/legacy-csv-export.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/legacy-csv.js';

test('[risk:R-009] writes a header row', () => {
  assert.match(toCsv([]), /^seller_id,amount_cents/);
});

test('[risk:R-009] writes one line per payout', () => {
  const csv = toCsv([
    { sellerId: 's_1', amountCents: 100 },
    { sellerId: 's_2', amountCents: 250 },
  ]);
  assert.equal(csv.trim().split('\n').length, 3);
});

=============== FILE: tests/payout-batch.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBatch } from '../src/payout-batch.js';

test('pays every line in a fresh batch', () => {
  const out = runBatch([{ id: 'pl_1' }, { id: 'pl_2' }]);
  assert.deepEqual(out.paid, ['pl_1', 'pl_2']);
  assert.deepEqual(out.skipped, []);
});

test('skips a line that a previous run already paid', () => {
  const out = runBatch([{ id: 'pl_1' }, { id: 'pl_2' }], new Set(['pl_1']));
  assert.deepEqual(out.paid, ['pl_2']);
  assert.deepEqual(out.skipped, ['pl_1']);
});

=============== FILE: package.json ===============
{
  "name": "marketplace-payouts",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
