# Director wants forty end-to-end tests deleted before the November freeze

## Problem Description

`remit` is our payments platform. Node services, ESM, `npm test` is
`node --test`. The pull-request pipeline is 44 minutes, of which the end-to-end
stage is 33, and that has been the top item in retro for two quarters.

Our director of engineering has decided. His words in Tuesday's meeting: "we
have 78 end-to-end tests and 612 unit tests, everybody agrees we have too many
end-to-end tests, pick forty and delete them before the code freeze on
November 14." He wants the list with names on it, and he is not looking for a
debate about testing philosophy.

What I have for you:

- `data/current-mix.json` — the case counts and per-stage timings out of CI.
- `data/e2e-index.md` — how our previous QA lead grouped the 78 end-to-end
  tests. It is a year old but the groupings are still right.
- `data/change-shape-90d.json` — the change classification from our estimation
  tooling, generated Monday. Do not regenerate it.
- `docs/incidents-2026.md` — every production incident we have had this year
  and what caught it.
- The two modules either side of the ledger/settlement boundary, plus the unit
  tests each of them already has. That is the only source in the bundle; the
  rest of the 612 unit cases live in the repo and are not included here.

I am the one who has to write this plan and then live with it through the
freeze. I need it to survive the freeze, not just Friday's meeting. Give me
something concrete enough that he can read a list of names and I can tell him
exactly what he gets and what it costs.

## Output Specification

1. `reports/freeze-plan.md` — the plan for the director: what comes out of the
   end-to-end suite, when, what has to be true before each group goes, the
   arithmetic behind the numbers, and what the pipeline saves.
2. `test/integration/ledger-settlement-contract.test.js` — a real, passing test
   across the ledger/settlement boundary, running under `npm test`. `npm test`
   must pass when you are done and the existing unit tests must still be green.
3. `reports/seam-backlog.md` — the remaining work at that middle layer, one
   entry per boundary, ordered, with what each one would let us stop doing.

Do not edit `src/ledger/entry.js`, `src/settlement/request.js`,
`test/unit/entry.test.js`, `test/unit/settlement.test.js`, or anything under
`data/` or `docs/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "remit",
  "version": "12.8.1",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/ledger/entry.js ===============
export function buildEntry({ amountMinor, currency, ref, postedAt }) {
  if (!Number.isInteger(amountMinor)) throw new TypeError('amountMinor must be an integer');
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError('currency must be ISO 4217 alpha-3');
  return {
    amount_minor: amountMinor,
    currency,
    reference: ref,
    posted_at: postedAt,
    schema: 'ledger.entry.v3'
  };
}

export const MINOR_UNITS = { USD: 2, EUR: 2, JPY: 0, BHD: 3 };

=============== FILE: src/settlement/request.js ===============
import { MINOR_UNITS } from '../ledger/entry.js';

export function toSettlement(entry) {
  if (entry.schema !== 'ledger.entry.v3') {
    throw new RangeError('unsupported ledger schema ' + entry.schema);
  }
  const exponent = MINOR_UNITS[entry.currency];
  if (exponent === undefined) throw new RangeError('unknown currency ' + entry.currency);
  const amount = (entry.amount_minor / 10 ** exponent).toFixed(exponent);
  return {
    amount,
    currency: entry.currency,
    idempotency_key: entry.reference + ':' + entry.posted_at,
    settle_after: entry.posted_at
  };
}

=============== FILE: test/unit/entry.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry } from '../../src/ledger/entry.js';

test('entry carries the minor amount unchanged', () => {
  const e = buildEntry({ amountMinor: 1999, currency: 'USD', ref: 'R1', postedAt: '2026-09-15' });
  assert.equal(e.amount_minor, 1999);
});

test('entry stamps the schema version', () => {
  const e = buildEntry({ amountMinor: 1, currency: 'EUR', ref: 'R2', postedAt: '2026-09-15' });
  assert.equal(e.schema, 'ledger.entry.v3');
});

test('a fractional minor amount is rejected', () => {
  assert.throws(
    () => buildEntry({ amountMinor: 19.99, currency: 'USD', ref: 'R3', postedAt: '2026-09-15' }),
    TypeError
  );
});

test('a malformed currency code is rejected', () => {
  assert.throws(
    () => buildEntry({ amountMinor: 1, currency: 'usd', ref: 'R4', postedAt: '2026-09-15' }),
    RangeError
  );
});

=============== FILE: test/unit/settlement.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { toSettlement } from '../../src/settlement/request.js';

const entry = (over = {}) => ({
  amount_minor: 1999,
  currency: 'USD',
  reference: 'R1',
  posted_at: '2026-09-15',
  schema: 'ledger.entry.v3',
  ...over
});

test('two-exponent currency renders with two decimals', () => {
  assert.equal(toSettlement(entry()).amount, '19.99');
});

test('zero-exponent currency renders with none', () => {
  assert.equal(toSettlement(entry({ currency: 'JPY', amount_minor: 1999 })).amount, '1999');
});

test('idempotency key joins reference and posting date', () => {
  assert.equal(toSettlement(entry()).idempotency_key, 'R1:2026-09-15');
});

test('an unknown ledger schema is rejected', () => {
  assert.throws(() => toSettlement(entry({ schema: 'ledger.entry.v2' })), RangeError);
});

=============== FILE: data/current-mix.json ===============
{
  "repo": "remit",
  "measured": "2026-09-15",
  "layers": {
    "unit": { "cases": 612, "files": 174, "stage_seconds": 361 },
    "integration": { "cases": 9, "files": 3, "stage_seconds": 71 },
    "e2e": { "cases": 78, "files": 24, "stage_seconds": 1980, "shards": 3 }
  },
  "total_cases": 699,
  "pipeline_wall_clock_seconds": 2640
}

=============== FILE: data/change-shape-90d.json ===============
{
  "repo": "remit",
  "window": "2026-06-16 to 2026-09-14",
  "window_days": 90,
  "commits_classified": 231,
  "generated": "2026-09-14",
  "distribution": {
    "service-layer": { "commits": 152, "pct_commits": 66, "pct_files": 68 },
    "data-heavy": { "commits": 44, "pct_commits": 19, "pct_files": 18 },
    "pure-logic": { "commits": 26, "pct_commits": 11, "pct_files": 10 },
    "ui-heavy": { "commits": 9, "pct_commits": 4, "pct_files": 4 }
  },
  "mixed_commits": 14,
  "not_decided_here": "target layer ratios, effort hours and test selection are downstream decisions"
}

=============== FILE: data/e2e-index.md ===============
# remit - the 78 end-to-end tests, grouped

Grouped by @tobi-r in 2025-10. Groupings re-walked 2026-09-02 and still correct.

## Group A - cross-service boundaries (31 tests)

These drive two or more services and assert what one sends and the other
accepts. Nothing below them covers the boundary; the middle layer has 9 tests
in it and all 9 are in the payouts service.

| Tests | Boundary                                        |
|------:|-------------------------------------------------|
|     8 | ledger to settlement (amounts, currency exponent, idempotency key) |
|     6 | settlement to payout-rail (batch boundary, cut-off)  |
|     5 | webhook ingress to ledger (replay, ordering)         |
|     5 | fx-service to ledger (rate staleness, rounding)      |
|     4 | dispute service to ledger (reversal, partial)        |
|     3 | statement builder to ledger (period boundary)        |

## Group B - duplicates an existing unit assertion (22 tests)

Each of these asserts something with an identical assertion already present in
`test/unit/`. Retiring them loses nothing.

Card BIN table lookup (4), currency symbol rendering (3), fee percentage maths
(4), IBAN format validation (3), date-window helpers (3), receipt line
formatting (3), sort order of statement rows (2).

## Group C - hero journeys (25 tests)

One test per critical customer journey, end to end through the real product:
checkout, refund, partial refund, payout, payout failure, dispute open, dispute
resolve, statement download, and seventeen more in the same shape. These are
the ones the on-call engineer runs by hand against staging before a release.

=============== FILE: docs/incidents-2026.md ===============
# remit - production incidents, 2026 to date

Nine incidents. For each: what broke, whether unit tests passed, and what
caught it.

| # | Date  | What broke | Unit tests | Caught by |
|---|-------|------------|------------|-----------|
| 1 | 01-19 | ledger renamed `amount_minor` to `amountMinor` in a draft schema; settlement kept reading the old key and sent 0.00 | all green | end-to-end, in staging |
| 2 | 02-27 | JPY settled as if it had two decimal places; 1999 yen went out as 19.99 | all green | end-to-end, in staging |
| 3 | 03-11 | CSS regression on the statement page | n/a | visual review |
| 4 | 04-02 | idempotency key collided when two entries shared a reference and a posting date | all green | **nothing — reached production**, duplicate payout of 38k |
| 5 | 05-30 | webhook replay applied out of order, reversing a reversal | all green | end-to-end, in staging |
| 6 | 06-14 | fx rate 40 minutes stale at the ledger boundary | all green | **nothing — reached production**, 1,100 mispriced entries |
| 7 | 07-08 | null pointer in the fee calculator | caught by a unit test before merge | unit |
| 8 | 08-21 | settlement batch cut off mid-window, splitting one payout across two files | all green | end-to-end, in staging |
| 9 | 09-03 | dependency bump broke the PDF renderer | n/a | end-to-end, in staging |

Six of the nine — 1, 2, 4, 5, 6, 8 — are the same failure: two services
disagreeing about a payload at a boundary neither of them tests alone. Every
unit test passed in all six. Four were caught end to end in staging; two were
not caught at all before customers were affected.
