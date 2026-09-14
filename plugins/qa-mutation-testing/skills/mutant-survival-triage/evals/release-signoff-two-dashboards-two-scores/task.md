# Release sign-off stuck between two mutation dashboards

## Problem Description

We cut release 2026.9 on Monday and there is one line on the sign-off checklist
I cannot close. `billing-core` ran StrykerJS overnight (run 812). Our CI
dashboard prints 60%. The platform team's dashboard prints 91% for their repo,
and our VP has now decided 91% is "the bar the rest of the org clears". Our own
release policy says no sign-off below 80%.

Attached is the raw report from run 812, the three source files it mutated, the
suite that ran against them, the Stryker config, and a paste of the thread where
the platform lead explained where their 91% comes from.

What I need is a written review I can attach to the sign-off ticket (BILL-2291).
Tell me what the report actually says, which of the items in it are genuine holes
in our tests and which are not, what test each genuine hole needs, and whether
the 80% policy line is met. Be precise about the numbers - the VP will push back
on any figure I put in front of him, and he will ask why ours is a third lower
than the platform team's.

Do not change any source or test file. I want the written analysis first;
whoever owns each module writes the test afterwards.

## Output Specification

1. Write `docs/mutation-review-812.md`.
2. Open it with a breakdown of run 812 by the status the tool itself reported,
   with a count for each status.
3. State the figure - or figures - you are quoting against the 80% policy line,
   and answer the sign-off question directly.
4. Include one block per item that genuinely needs a test, naming the file and
   line, the concrete input that exposes it, and the exact assertion.
5. Do not edit anything under `src/` or `test/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-core",
  "version": "2026.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "devDependencies": {
    "@stryker-mutator/core": "8.7.1"
  }
}

=============== FILE: stryker.conf.json ===============
{
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress", "json"],
  "testRunner": "command",
  "commandRunner": { "command": "npm test" },
  "mutate": ["src/**/*.js"],
  "thresholds": { "high": 80, "low": 60, "break": 50 },
  "coverageAnalysis": "perTest"
}

=============== FILE: src/invoice.js ===============
'use strict';

const GRACE_DAYS = 7;
const DEFAULT_CURRENCY = 'EUR';

function round2(n) {
  return Math.round(n * 100) / 100;
}

function lateFee(daysLate, amount) {
  if (daysLate > GRACE_DAYS) {
    return round2(amount * 0.02);
  }
  return 0;
}

function legacyRounding(n) {
  if (n < 0) {
    return -Math.floor(-n * 100) / 100;
  }
  return Math.floor(n * 100) / 100;
}

function buildInvoice(lines, taxRate) {
  if (!lines.length) {
    throw new RangeError('invoice must have at least one line');
  }
  const net = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const taxAmount = round2(net * taxRate);
  return {
    currency: DEFAULT_CURRENCY,
    net: round2(net),
    tax: taxAmount,
    total: round2(net + taxAmount),
  };
}

module.exports = { lateFee, buildInvoice, round2, GRACE_DAYS };

=============== FILE: src/tax.js ===============
'use strict';

// Stryker disable next-line all: bracket table is fixed by the 2026 tariff schedule
const BRACKETS = [
  { upTo: 1000, rate: 0.1 },
  { upTo: 5000, rate: 0.2 },
];
const TOP_RATE = 0.35;

function rateFor(amount) {
  for (const b of BRACKETS) {
    if (amount < b.upTo) {
      return b.rate;
    }
  }
  return TOP_RATE;
}

module.exports = { rateFor, TOP_RATE };

=============== FILE: src/retry.js ===============
'use strict';

function withRetry(fn, attempts) {
  let left = attempts;
  let lastError;
  while (left > 0) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      left -= 1;
    }
  }
  throw lastError;
}

module.exports = { withRetry };

=============== FILE: test/invoice.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const { lateFee, buildInvoice } = require('../src/invoice');

test('no late fee inside the grace period', () => {
  assert.equal(lateFee(0, 500), 0);
});

test('late fee applied well past the grace period', () => {
  assert.equal(lateFee(30, 500), 10);
});

test('invoice totals net and tax', () => {
  const inv = buildInvoice([{ qty: 2, unitPrice: 10 }], 0.2);
  assert.equal(inv.net, 20);
  assert.equal(inv.tax, 4);
  assert.equal(inv.total, 24);
});

test('invoice carries a currency', () => {
  const inv = buildInvoice([{ qty: 1, unitPrice: 10 }], 0);
  assert.equal(typeof inv.currency, 'string');
});

=============== FILE: test/tax.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const { rateFor } = require('../src/tax');

test('low amounts use the first bracket', () => {
  assert.equal(rateFor(500), 0.1);
});

test('mid amounts use the second bracket', () => {
  assert.equal(rateFor(2500), 0.2);
});

test('amounts above every bracket use the top rate', () => {
  assert.equal(rateFor(9000), 0.35);
});

=============== FILE: test/retry.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const { withRetry } = require('../src/retry');

test('returns the first successful result', () => {
  assert.equal(withRetry(() => 42, 3), 42);
});

test('retries until the call succeeds', () => {
  let n = 0;
  const value = withRetry(() => {
    n += 1;
    if (n < 3) throw new Error('boom');
    return n;
  }, 5);
  assert.equal(value, 3);
});

test('rethrows after the last attempt', () => {
  assert.throws(() => withRetry(() => { throw new Error('always'); }, 2), /always/);
});

=============== FILE: reports/stryker-run-812.json ===============
{
  "schemaVersion": "1.0",
  "projectRoot": "/builds/billing-core",
  "thresholds": { "high": 80, "low": 60 },
  "testFiles": {
    "test/invoice.test.js": {
      "tests": [
        { "id": "t1", "name": "no late fee inside the grace period" },
        { "id": "t2", "name": "late fee applied well past the grace period" },
        { "id": "t3", "name": "invoice totals net and tax" },
        { "id": "t4", "name": "invoice carries a currency" }
      ]
    },
    "test/tax.test.js": {
      "tests": [
        { "id": "t5", "name": "low amounts use the first bracket" },
        { "id": "t6", "name": "mid amounts use the second bracket" },
        { "id": "t7", "name": "amounts above every bracket use the top rate" }
      ]
    },
    "test/retry.test.js": {
      "tests": [
        { "id": "t8", "name": "returns the first successful result" },
        { "id": "t9", "name": "retries until the call succeeds" },
        { "id": "t10", "name": "rethrows after the last attempt" }
      ]
    }
  },
  "files": {
    "src/invoice.js": {
      "language": "javascript",
      "mutants": [
        { "id": "1", "mutatorName": "ArithmeticOperator", "description": "* to /", "replacement": "n / 100", "location": { "start": { "line": 7, "column": 22 }, "end": { "line": 7, "column": 31 } }, "status": "Killed", "coveredBy": ["t2", "t3", "t4"], "killedBy": ["t2"] },
        { "id": "2", "mutatorName": "ArithmeticOperator", "description": "/ to *", "replacement": "Math.round(n * 100) * 100", "location": { "start": { "line": 7, "column": 10 }, "end": { "line": 7, "column": 37 } }, "status": "Killed", "coveredBy": ["t2", "t3", "t4"], "killedBy": ["t2"] },
        { "id": "3", "mutatorName": "EqualityOperator", "description": "> to >=", "replacement": "daysLate >= GRACE_DAYS", "location": { "start": { "line": 11, "column": 7 }, "end": { "line": 11, "column": 29 } }, "status": "Survived", "coveredBy": ["t1", "t2"], "testsCompleted": 2 },
        { "id": "4", "mutatorName": "EqualityOperator", "description": "> to <", "replacement": "daysLate < GRACE_DAYS", "location": { "start": { "line": 11, "column": 7 }, "end": { "line": 11, "column": 29 } }, "status": "Killed", "coveredBy": ["t1", "t2"], "killedBy": ["t2"] },
        { "id": "5", "mutatorName": "ConditionalExpression", "description": "condition to true", "replacement": "true", "location": { "start": { "line": 11, "column": 7 }, "end": { "line": 11, "column": 29 } }, "status": "Killed", "coveredBy": ["t1", "t2"], "killedBy": ["t1"] },
        { "id": "6", "mutatorName": "ArithmeticOperator", "description": "* to /", "replacement": "amount / 0.02", "location": { "start": { "line": 12, "column": 19 }, "end": { "line": 12, "column": 33 } }, "status": "Killed", "coveredBy": ["t2"], "killedBy": ["t2"] },
        { "id": "7", "mutatorName": "StringLiteral", "description": "string literal to empty string", "replacement": "\"\"", "location": { "start": { "line": 4, "column": 26 }, "end": { "line": 4, "column": 31 } }, "status": "Survived", "coveredBy": ["t3", "t4"], "testsCompleted": 2 },
        { "id": "8", "mutatorName": "ConditionalExpression", "description": "condition to false", "replacement": "false", "location": { "start": { "line": 18, "column": 7 }, "end": { "line": 18, "column": 12 } }, "status": "NoCoverage" },
        { "id": "9", "mutatorName": "EqualityOperator", "description": "< to <=", "replacement": "n <= 0", "location": { "start": { "line": 18, "column": 7 }, "end": { "line": 18, "column": 12 } }, "status": "NoCoverage" },
        { "id": "10", "mutatorName": "ArithmeticOperator", "description": "* to /", "replacement": "-n / 100", "location": { "start": { "line": 19, "column": 25 }, "end": { "line": 19, "column": 34 } }, "status": "NoCoverage" },
        { "id": "11", "mutatorName": "ArithmeticOperator", "description": "* to /", "replacement": "n / 100", "location": { "start": { "line": 21, "column": 22 }, "end": { "line": 21, "column": 31 } }, "status": "NoCoverage" },
        { "id": "12", "mutatorName": "StringLiteral", "description": "string literal to empty string", "replacement": "\"\"", "location": { "start": { "line": 26, "column": 27 }, "end": { "line": 26, "column": 64 } }, "status": "NoCoverage" },
        { "id": "13", "mutatorName": "ArithmeticOperator", "description": "+ to -", "replacement": "sum - l.qty * l.unitPrice", "location": { "start": { "line": 28, "column": 38 }, "end": { "line": 28, "column": 63 } }, "status": "Killed", "coveredBy": ["t3", "t4"], "killedBy": ["t3"] },
        { "id": "14", "mutatorName": "ArithmeticOperator", "description": "+ to -", "replacement": "net - taxAmount", "location": { "start": { "line": 34, "column": 19 }, "end": { "line": 34, "column": 34 } }, "status": "Killed", "coveredBy": ["t3", "t4"], "killedBy": ["t3"] }
      ]
    },
    "src/tax.js": {
      "language": "javascript",
      "mutants": [
        { "id": "15", "mutatorName": "ArrayDeclaration", "description": "array declaration to []", "replacement": "[]", "location": { "start": { "line": 4, "column": 18 }, "end": { "line": 7, "column": 2 } }, "status": "Ignored", "statusReason": "Ignored by \"Stryker disable next-line\" comment" },
        { "id": "16", "mutatorName": "EqualityOperator", "description": "< to <=", "replacement": "amount <= b.upTo", "location": { "start": { "line": 12, "column": 9 }, "end": { "line": 12, "column": 25 } }, "status": "Survived", "coveredBy": ["t5", "t6", "t7"], "testsCompleted": 3 },
        { "id": "17", "mutatorName": "EqualityOperator", "description": "< to >", "replacement": "amount > b.upTo", "location": { "start": { "line": 12, "column": 9 }, "end": { "line": 12, "column": 25 } }, "status": "Killed", "coveredBy": ["t5", "t6", "t7"], "killedBy": ["t5"] },
        { "id": "18", "mutatorName": "ConditionalExpression", "description": "condition to true", "replacement": "true", "location": { "start": { "line": 12, "column": 9 }, "end": { "line": 12, "column": 25 } }, "status": "Killed", "coveredBy": ["t5", "t6", "t7"], "killedBy": ["t6"] },
        { "id": "19", "mutatorName": "ConditionalExpression", "description": "condition to false", "replacement": "false", "location": { "start": { "line": 12, "column": 9 }, "end": { "line": 12, "column": 25 } }, "status": "Killed", "coveredBy": ["t5", "t6", "t7"], "killedBy": ["t5"] }
      ]
    },
    "src/retry.js": {
      "language": "javascript",
      "mutants": [
        { "id": "20", "mutatorName": "ConditionalExpression", "description": "condition to false", "replacement": "false", "location": { "start": { "line": 6, "column": 10 }, "end": { "line": 6, "column": 18 } }, "status": "Killed", "coveredBy": ["t8", "t9", "t10"], "killedBy": ["t8"] },
        { "id": "21", "mutatorName": "AssignmentOperator", "description": "-= to +=", "replacement": "left += 1", "location": { "start": { "line": 11, "column": 7 }, "end": { "line": 11, "column": 16 } }, "status": "Timeout", "statusReason": "Hit the configured timeout of 5000 ms", "coveredBy": ["t9", "t10"] }
      ]
    }
  }
}

=============== FILE: notes/platform-thread.md ===============
# #eng-quality, yesterday

**@vp-eng:** platform is at 91 and billing is at 60. Same company, same
language. Explain.

**@platform-lead (Ines):** 91 is the number our board reads off the Stryker HTML
report - the "mutation score based on covered code" row, not the headline one.
We also narrowed `mutate` to `src/domain/**` last quarter because the adapters
were dragging it down. Nothing dishonest, it is just the figure that tracks the
code we actually test.

**@vp-eng:** and billing's 60?

**@billing-lead (me):** 60 is whatever our CI prints from the json reporter. I
have not checked which row it is. Our `mutate` glob is still `src/**/*.js`.

**@platform-lead (Ines):** for what it is worth we also stopped counting the ones
we agreed no test can ever catch. There were about six of those in the payment
adapter. Never wrote down why, though - that was Rami and he is at Datadog now.

**@vp-eng:** 80 is the policy line either way. Someone give me a yes or a no by
Friday.
