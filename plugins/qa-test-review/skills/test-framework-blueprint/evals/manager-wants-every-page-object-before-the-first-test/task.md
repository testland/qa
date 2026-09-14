# Manager has scoped sprint one as "build the whole abstraction layer"

## Problem Description

Northwind Payments, merchant payouts. I am the QA lead, four weeks in. We
have a React console over a Node API and almost nothing in the way of tests:
four that Marcus wrote last month, which pass.

Tomas, the engineering manager, has already scoped my first sprint. He wants
the full abstraction layer standing before we write any real tests: one
object for each of the fourteen console screens, the four-level base class in
`proposals/base-test-hierarchy.md` that he took from a conference talk last
year, and a `helpers/` module holding everything shared. His argument is that
at his last company they rewrote the test layer twice in eighteen months
because they did not do this up front, and he does not intend to pay that
again. He has booked the whole sprint for it and told the team it is what I
am doing.

I do not think this is right, but I cannot yet say why in a way that will
survive the conversation with him, and I am four weeks in, so "instinct" is
not going to be enough. I need the reasoning to hold up and I need it to come
from what is actually in front of us rather than from general principle.

What I have: the screen list, the suite projection he asked me to produce
last week, his hierarchy, and the repo as it stands. `npm test` passes.

## Output Specification

1. Write `docs/test-conventions.md` - the directory layout; the interaction
   pattern the suite will use, named, with the alternatives that were
   considered and why each lost; the fixtures the suite needs, each with its
   scope, what it provides, and whether tests mutate it; and the test-data
   approach.
2. Write `docs/implementation-order.md` - an ordered list. Each entry states
   what it waits on and the condition that triggers starting it.
3. Write `docs/sprint-one-answer.md` - my answer to Tomas, going through what
   he asked for item by item.
4. Do not write harness code. Do not modify anything under `tests/` or
   `src/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "northwind-console",
  "version": "0.9.2",
  "private": true,
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\""
  },
  "engines": {
    "node": ">=20"
  }
}

=============== FILE: src/payouts.js ===============
'use strict';

const FEE_BPS = 29;
const FIXED_CENTS = 25;

function feeFor(amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  return Math.round((amountCents * FEE_BPS) / 10000) + FIXED_CENTS;
}

function netFor(amountCents) {
  return amountCents - feeFor(amountCents);
}

module.exports = { feeFor, netFor };

=============== FILE: src/merchants.js ===============
'use strict';

const STATES = ['pending', 'verified', 'restricted', 'closed'];

function canReceivePayouts(merchant) {
  return merchant.state === 'verified' && merchant.holds.length === 0;
}

function transition(merchant, next) {
  if (!STATES.includes(next)) throw new Error(`unknown state: ${next}`);
  if (merchant.state === 'closed') throw new Error('closed merchants cannot transition');
  return { ...merchant, state: next };
}

module.exports = { canReceivePayouts, transition, STATES };

=============== FILE: tests/payouts.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { feeFor, netFor } = require('../src/payouts');

test('fee on a 100.00 payout is the variable rate plus the fixed charge', () => {
  assert.equal(feeFor(10000), 54);
});

test('net settles to the payout minus its fee', () => {
  assert.equal(netFor(10000), 9946);
});

=============== FILE: tests/merchants.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canReceivePayouts, transition } = require('../src/merchants');

test('a verified merchant with no holds can receive payouts', () => {
  assert.equal(canReceivePayouts({ state: 'verified', holds: [] }), true);
});

test('a closed merchant cannot transition', () => {
  assert.throws(
    () => transition({ state: 'closed', holds: [] }, 'verified'),
    /closed merchants cannot transition/,
  );
});

=============== FILE: docs/screens.md ===============
# Console screens - inventory taken 2026-09-09

| #  | Screen                   | Built from                            |
|----|--------------------------|---------------------------------------|
| 1  | Payouts list             | DataTable + filter chips              |
| 2  | Payouts / pending        | DataTable, state filter pinned        |
| 3  | Payouts / paid           | DataTable, state filter pinned        |
| 4  | Payouts / failed         | DataTable, state filter pinned        |
| 5  | Payouts / returned       | DataTable, state filter pinned        |
| 6  | Merchants list           | DataTable, different column set       |
| 7  | Merchants / in review    | DataTable, state filter pinned        |
| 8  | Merchants / restricted   | DataTable, state filter pinned        |
| 9  | Disputes list            | DataTable, different column set       |
| 10 | Payout detail            | DetailDrawer                          |
| 11 | Merchant detail          | DetailDrawer                          |
| 12 | Dispute detail           | DetailDrawer                          |
| 13 | Settings / team          | Form                                  |
| 14 | Sign in                  | Form                                  |

Screens 1-9 are the same DataTable component with a different column set and,
in seven cases, a pinned filter - the design system treats them as one screen
with nine routes. Screens 10-12 are the same DetailDrawer. The global nav and
the confirm-modal appear on all fourteen.

Nobody has yet written a browser test against any of them, so we have no
evidence about which parts are actually awkward to drive.

=============== FILE: docs/suite-projection.md ===============
# Suite projection - requested by @tomas, produced 2026-09-06

- Today: 4 tests, all unit, run by `node --test`. Zero browser tests.
- Critical journeys agreed with product: 7 - sign in, approve a payout, retry
  a failed payout, restrict a merchant, resolve a dispute, invite a team
  member, export a statement.
- Estimated end state on the current roadmap, end of Q1 2027: 55-70 browser
  tests plus an API tier of similar size. Nobody is projecting beyond that.
- Actor types: one. Everything in this console is done by an internal
  operations user. Merchants never sign in here - they use the merchant
  portal, which is a separate product with its own team and its own tests.
- Engineers who will write tests: 3, all TypeScript.

=============== FILE: proposals/base-test-hierarchy.md ===============
# Base test hierarchy

From the "Scaling Test Suites Past 1000 Cases" talk, TestCon 2025. Proposed
by @tomas for sprint one.

    BaseTest
      - launches and closes the browser
      - screenshot on failure
      - captures console errors and fails the test if any are ERROR level

      AuthenticatedTest extends BaseTest
        - signs in as the seeded operations user during setUp()
        - exposes this.session

        MerchantTest extends AuthenticatedTest
          - seeds one merchant during setUp(), stores it as this.merchant
          - navigates to /merchants

          PayoutTest extends MerchantTest
            - seeds three payouts against this.merchant
            - navigates to /payouts

Every spec extends the deepest class that fits. New shared behaviour goes
into the level where it is first needed, and everything below inherits it.
