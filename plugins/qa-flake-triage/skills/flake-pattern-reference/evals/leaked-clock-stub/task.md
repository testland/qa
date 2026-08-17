# The elapsed-time test is red in the suite and green on its own

## Problem Description

`test/billing.test.js` has two failing tests at the bottom of the file:

```
a timer reports the elapsed time
  AssertionError: elapsed was 0

a receipt issued now is stamped with the current time
  AssertionError: stamped 2026-02-01T09:00:00.000Z
```

Both pass when selected on their own with `--test-name-pattern`. Both went
red in the same commit - the one that added the receipt issue-date test at
the top of the file. Nothing in `src/` changed in that commit.

We also noticed that if we move the two failing tests above the issue-date
test, they pass and nothing else breaks. That felt like a coincidence we did
not want to rely on, so the file is still in its original order.

The suggestion currently in the PR is to relax the elapsed assertion to
`>= 0` and to drop the second test since "it duplicates the issue-date test".
We do not want to lose the coverage.

## Output Specification

1. Fix `test/billing.test.js` so all four tests pass in a single
   `node --test` run, in the order they appear today, and each also passes on
   its own.
2. Keep all four tests and their assertions - in particular the elapsed
   assertion stays at `>= 10`. Do not modify anything under `src/`.
3. Write `leak-diagnosis.md`: what the first test does that reaches the last
   two, why moving the tests around changes the result, and the rule that
   makes this safe when the next test in this file needs the same setup.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-core",
  "version": "6.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/clock.js ===============
'use strict';

const clock = {
  now: () => Date.now(),
};

module.exports = clock;

=============== FILE: src/receipt.js ===============
'use strict';

const clock = require('./clock');

function issueReceipt(order) {
  return {
    id: `rcpt-${order.id}`,
    issuedAt: new Date(clock.now()).toISOString(),
  };
}

module.exports = { issueReceipt };

=============== FILE: src/timer.js ===============
'use strict';

const clock = require('./clock');

function startTimer() {
  const startedAt = clock.now();
  return {
    elapsedMs: () => clock.now() - startedAt,
  };
}

module.exports = { startTimer };

=============== FILE: test/billing.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const clock = require('../src/clock');
const { issueReceipt } = require('../src/receipt');
const { startTimer } = require('../src/timer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a receipt is stamped with the issue time', () => {
  clock.now = () => Date.parse('2026-02-01T09:00:00Z');

  const receipt = issueReceipt({ id: '77' });

  assert.equal(receipt.issuedAt, '2026-02-01T09:00:00.000Z');
});

test('a receipt id follows the order id', () => {
  const receipt = issueReceipt({ id: '78' });

  assert.equal(receipt.id, 'rcpt-78');
});

test('a timer reports the elapsed time', async () => {
  const timer = startTimer();

  await sleep(15);

  assert.ok(timer.elapsedMs() >= 10, `elapsed was ${timer.elapsedMs()}`);
});

test('a receipt issued now is stamped with the current time', () => {
  const before = Date.now();

  const receipt = issueReceipt({ id: '79' });

  const stamped = Date.parse(receipt.issuedAt);
  assert.ok(
    stamped >= before - 1000 && stamped <= Date.now() + 1000,
    `stamped ${receipt.issuedAt}`
  );
});
