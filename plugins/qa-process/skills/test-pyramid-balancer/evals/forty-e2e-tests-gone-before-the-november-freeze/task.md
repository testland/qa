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

The useful thing in the bundle is `data/dup-scan.json`. Our build team wrote a
scanner that pairs an end-to-end test with a lower-layer test asserting the
same thing; it flagged 22 of the 78 and it names the unit test it paired each
one with. That is 22 of his 40 already, and I would rather start from a
machine-generated list than from anybody's opinion about which tests matter.

Also in the bundle:

- `data/current-mix.json` — the case counts and per-stage timings out of CI.
- `data/e2e-index.md` — the 78 end-to-end specs grouped by what they touch.
- `data/change-shape-90d.json` — the change classification from our estimation
  tooling, generated Monday. Do not regenerate it, it takes 40 minutes.
- `docs/incidents-2026.md` — every production incident we have had this year.
- The unit suites the scanner paired against, plus the two modules either side
  of the ledger/settlement boundary. The rest of the 612 unit cases live in the
  repo and are not in the bundle.

I am the one who has to write this plan and then live with it through the
freeze. Give me something concrete enough that he can read a list of names and
I can tell him exactly what he gets and what it costs.

## Output Specification

1. `reports/freeze-plan.md` — the plan for the director: what comes out of the
   end-to-end suite, when, what has to be true before each group goes, the
   arithmetic behind the numbers, and what the pipeline saves.
2. `test/integration/ledger-settlement-contract.test.js` — a real, passing test
   across the ledger/settlement boundary, running under `npm test`. `npm test`
   must pass when you are done and the existing tests must still be green.
3. `reports/seam-backlog.md` — the remaining work at that middle layer, one
   entry per boundary, ordered, with what each one would let us stop doing.

Do not edit anything under `src/`, `test/unit/`, `data/` or `docs/`.

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

=============== FILE: src/fees.js ===============
export function feeSchedule(tier) {
  const bps = { standard: 290, volume: 175, partner: 90 }[tier];
  if (bps === undefined) throw new RangeError('unknown tier ' + tier);
  return bps;
}

export function feeCents(amountMinor, bps) {
  if (!Number.isInteger(amountMinor)) throw new TypeError('amountMinor must be an integer');
  return Math.round((amountMinor * bps) / 10000);
}

=============== FILE: src/iban.js ===============
export function ibanFormatOk(iban) {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban);
}

export function ibanChecksumOk(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = [...rearranged]
    .map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c))
    .join('');
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1;
}

=============== FILE: src/format.js ===============
export function money(minor, exponent) {
  return (minor / 10 ** exponent).toFixed(exponent);
}

export function receiptLine(label, amount, width = 40) {
  const pad = Math.max(0, width - label.length - amount.length);
  return (label + ' '.repeat(pad) + amount).slice(0, width);
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

=============== FILE: test/unit/fees.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { feeSchedule, feeCents } from '../../src/fees.js';

test('standard tier is 290 bps', () => {
  assert.equal(feeSchedule('standard'), 290);
});

test('volume tier is cheaper than standard', () => {
  assert.ok(feeSchedule('volume') < feeSchedule('standard'));
});

test('unknown tier is rejected', () => {
  assert.throws(() => feeSchedule('gold'), RangeError);
});

test('fee on a whole-cent amount', () => {
  assert.equal(feeCents(10000, 290), 290);
});

// quarantined 2025-11 after the rounding change, never re-enabled
test.skip('fee rounds half up at the cent', () => {
  assert.equal(feeCents(1723, 290), 50);
});

test('a fractional minor amount is rejected', () => {
  assert.throws(() => feeCents(1.5, 290), TypeError);
});

=============== FILE: test/unit/iban.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { ibanFormatOk } from '../../src/iban.js';

test('a well formed iban passes the format check', () => {
  assert.equal(ibanFormatOk('GB29NWBK60161331926819'), true);
});

test('a lowercase country code fails the format check', () => {
  assert.equal(ibanFormatOk('gb29NWBK60161331926819'), false);
});

test('a short iban fails the format check', () => {
  assert.equal(ibanFormatOk('GB29NWBK'), false);
});

test('a non alphanumeric character fails the format check', () => {
  assert.equal(ibanFormatOk('GB29-NWBK-6016-1331-9268-19'), false);
});

=============== FILE: test/unit/format.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { money, receiptLine } from '../../src/format.js';

test('money renders two decimals', () => {
  assert.equal(money(1999, 2), '19.99');
});

test('money renders none for a zero exponent', () => {
  assert.equal(money(1999, 0), '1999');
});

test('money of zero is zero', () => {
  assert.equal(money(0, 2), '0.00');
});

test('receipt line pads the amount to the right', () => {
  assert.match(receiptLine('Total', '19.99'), /^Total {30}19\.99$/);
});

test('receipt line is exactly the requested width', () => {
  assert.equal(receiptLine('Total', '19.99').length, 40);
});

test.todo('receipt line wraps at forty characters');

=============== FILE: data/dup-scan.json ===============
{
  "repo": "remit",
  "generated": "2026-09-15",
  "tool": "tools/dup-scan.mjs",
  "method": "pairs an end-to-end spec with a lower-layer test when their titles share three or more tokens after stemming",
  "flagged": 22,
  "of_total_e2e": 78,
  "pairs": [
    { "e2e": "fee percentage maths for the standard tier", "unit_file": "test/unit/fees.test.js", "unit_test": "standard tier is 290 bps", "tokens": 4 },
    { "e2e": "volume tier fee is lower than standard", "unit_file": "test/unit/fees.test.js", "unit_test": "volume tier is cheaper than standard", "tokens": 4 },
    { "e2e": "unknown fee tier is rejected at checkout", "unit_file": "test/unit/fees.test.js", "unit_test": "unknown tier is rejected", "tokens": 4 },
    { "e2e": "fee on a whole-cent amount", "unit_file": "test/unit/fees.test.js", "unit_test": "fee on a whole-cent amount", "tokens": 5 },
    { "e2e": "fee percentage rounds half up at the cent", "unit_file": "test/unit/fees.test.js", "unit_test": "fee rounds half up at the cent", "tokens": 6 },
    { "e2e": "a fractional fee input is rejected", "unit_file": "test/unit/fees.test.js", "unit_test": "a fractional minor amount is rejected", "tokens": 4 },
    { "e2e": "IBAN format validation on the payee form", "unit_file": "test/unit/iban.test.js", "unit_test": "a well formed iban passes the format check", "tokens": 3 },
    { "e2e": "IBAN with a lowercase country code is refused", "unit_file": "test/unit/iban.test.js", "unit_test": "a lowercase country code fails the format check", "tokens": 5 },
    { "e2e": "short IBAN is refused", "unit_file": "test/unit/iban.test.js", "unit_test": "a short iban fails the format check", "tokens": 3 },
    { "e2e": "IBAN with punctuation is refused", "unit_file": "test/unit/iban.test.js", "unit_test": "a non alphanumeric character fails the format check", "tokens": 3 },
    { "e2e": "IBAN checksum rejects a transposed pair", "unit_file": "test/unit/iban.test.js", "unit_test": "iban checksum rejects a transposed pair", "tokens": 6 },
    { "e2e": "receipt line formatting pads the amount", "unit_file": "test/unit/format.test.js", "unit_test": "receipt line pads the amount to the right", "tokens": 6 },
    { "e2e": "receipt line is forty characters wide", "unit_file": "test/unit/format.test.js", "unit_test": "receipt line is exactly the requested width", "tokens": 4 },
    { "e2e": "receipt line wraps at forty characters", "unit_file": "test/unit/format.test.js", "unit_test": "receipt line wraps at forty characters", "tokens": 6 },
    { "e2e": "statement amount renders two decimals", "unit_file": "test/unit/format.test.js", "unit_test": "money renders two decimals", "tokens": 3 },
    { "e2e": "yen statement amount renders no decimals", "unit_file": "test/unit/format.test.js", "unit_test": "money renders none for a zero exponent", "tokens": 3 },
    { "e2e": "zero amount renders as zero", "unit_file": "test/unit/format.test.js", "unit_test": "money of zero is zero", "tokens": 3 },
    { "e2e": "currency symbol rendering for JPY", "unit_file": "test/unit/settlement.test.js", "unit_test": "zero-exponent currency renders with none", "tokens": 3 },
    { "e2e": "settlement amount for a two-decimal currency", "unit_file": "test/unit/settlement.test.js", "unit_test": "two-exponent currency renders with two decimals", "tokens": 4 },
    { "e2e": "idempotency key is reference plus date", "unit_file": "test/unit/settlement.test.js", "unit_test": "idempotency key joins reference and posting date", "tokens": 5 },
    { "e2e": "malformed currency code is refused", "unit_file": "test/unit/entry.test.js", "unit_test": "a malformed currency code is rejected", "tokens": 4 },
    { "e2e": "fractional minor amount is refused at entry", "unit_file": "test/unit/entry.test.js", "unit_test": "a fractional minor amount is rejected", "tokens": 5 }
  ]
}

=============== FILE: data/current-mix.json ===============
{
  "repo": "remit",
  "measured": "2026-09-15",
  "layers": {
    "unit": { "cases": 612, "files": 174, "stage_seconds": 361 },
    "integration": { "cases": 9, "files": 3, "stage_seconds": 71, "paths": ["test/integration/payouts/"] },
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
# remit - the 78 end-to-end specs

Exported from the runner on 2026-09-15, grouped by what each spec drives.

## Specs that drive two or more services (31)

| Specs | Services                                             |
|------:|------------------------------------------------------|
|     8 | ledger and settlement (amounts, currency exponent, idempotency key) |
|     6 | settlement and payout-rail (batch boundary, cut-off)  |
|     5 | webhook ingress and ledger (replay, ordering)         |
|     5 | fx-service and ledger (rate staleness, rounding)      |
|     4 | dispute service and ledger (reversal, partial)        |
|     3 | statement builder and ledger (period boundary)        |

## Specs that drive one customer journey end to end (25)

checkout, refund, partial refund, payout, payout failure, dispute open,
dispute resolve, statement download, card added, card removed, mandate signed,
mandate cancelled, invoice paid, invoice voided, payout schedule changed,
account closed, account reopened, limit raised, limit hit, fx quote accepted,
fx quote expired, statement emailed, receipt downloaded, refund reversed,
chargeback accepted.

## Specs that drive a single surface (22)

fee percentage maths for the standard tier, volume tier fee is lower than
standard, unknown fee tier is rejected at checkout, fee on a whole-cent
amount, fee percentage rounds half up at the cent, a fractional fee input is
rejected, IBAN format validation on the payee form, IBAN with a lowercase
country code is refused, short IBAN is refused, IBAN with punctuation is
refused, IBAN checksum rejects a transposed pair, receipt line formatting pads
the amount, receipt line is forty characters wide, receipt line wraps at forty
characters, statement amount renders two decimals, yen statement amount renders
no decimals, zero amount renders as zero, currency symbol rendering for JPY,
settlement amount for a two-decimal currency, idempotency key is reference plus
date, malformed currency code is refused, fractional minor amount is refused at
entry.

=============== FILE: docs/incidents-2026.md ===============
# remit - production incidents, 2026 to date

| # | Date  | What broke | Unit tests | Caught by |
|---|-------|------------|------------|-----------|
| 1 | 01-19 | ledger renamed `amount_minor` to `amountMinor` in a draft schema; settlement kept reading the old key and sent 0.00 | all green | end-to-end, in staging |
| 2 | 02-27 | JPY settled as if it had two decimal places; 1999 yen went out as 19.99 | all green | end-to-end, in staging |
| 3 | 03-11 | CSS regression on the statement page | n/a | visual review |
| 4 | 04-02 | idempotency key collided when two entries shared a reference and a posting date | all green | not caught before release; duplicate payout of 38k |
| 5 | 05-30 | webhook replay applied out of order, reversing a reversal | all green | end-to-end, in staging |
| 6 | 06-14 | fx rate 40 minutes stale at the ledger boundary | all green | not caught before release; 1,100 mispriced entries |
| 7 | 07-08 | null pointer in the fee calculator | caught by a unit test before merge | unit |
| 8 | 08-21 | settlement batch cut off mid-window, splitting one payout across two files | all green | end-to-end, in staging |
| 9 | 09-03 | dependency bump broke the PDF renderer | n/a | end-to-end, in staging |
