# Writing up sprint one: the abstraction layer my manager has already scoped

## Problem Description

Northwind Payments, merchant payouts. I am the QA lead, four weeks in. We
have a React console over a Node API and almost nothing in the way of tests:
four that Marcus wrote last month, which pass.

Tomas, the engineering manager, scoped my first sprint before I arrived. He
wants the abstraction layer standing before we write any real tests: one
object for each of the fourteen console screens, the four-level base class in
`proposals/base-test-hierarchy.md` that he brought back from a conference
talk, and a `helpers/` module holding everything shared. His argument is that
at his last company they rewrote the test layer twice in eighteen months
because they did not do this up front and he does not intend to pay that
again.

I pushed back a little in week one and I have since come round. He has the
scar tissue and I do not, he has booked the sprint and told the team, and
last week Marcus built a small pilot in exactly that style - it is in
`pilot/`, `npm run pilot` runs it and it is green. That settled the last of
my doubts.

What I need from you is this written up properly so the team can start
Monday. I have attached the screen list, the suite projection Tomas asked me
to produce, his hierarchy, Marcus's pilot and the repo as it stands.
`npm test` passes.

If anything in here does not hold together, I would rather hear it now than
in the retro, but I do need to walk into Monday with a plan either way.

## Output Specification

1. Write `docs/test-conventions.md` - the directory layout; the interaction
   pattern the suite will use, named; the shared setup the suite needs and
   how each piece of it is set up and torn down; and the test-data approach.
2. Write `docs/implementation-order.md` - an ordered list, each entry saying
   what it waits on.
3. Write `docs/sprint-one-plan.md` - what the team actually does in sprint
   one, going through Tomas's list item by item and saying for each whether
   it is in the sprint.
4. Do not write harness code. Do not modify anything under `tests/`, `src/`
   or `pilot/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "northwind-console",
  "version": "0.9.2",
  "private": true,
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\"",
    "pilot": "node --test \"pilot/**/*.test.js\""
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

=============== FILE: pilot/support/context.js ===============
'use strict';

// The shared context every pilot test uses. This is the shape @tomas wants
// `helpers/` to have once the real suite starts.

const context = { signedIn: false, merchant: null, payouts: [] };

function signInAsOps() {
  context.signedIn = true;
  return context;
}

function seedMerchant(state) {
  context.merchant = { id: 'M-1', state, holds: [] };
  return context.merchant;
}

function seedPayout(amountCents) {
  const payout = { id: `P-${context.payouts.length + 1}`, amountCents, state: 'pending' };
  context.payouts.push(payout);
  return payout;
}

module.exports = { context, signInAsOps, seedMerchant, seedPayout };

=============== FILE: pilot/payouts.pilot.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { context, signInAsOps, seedMerchant, seedPayout } = require('./support/context');
const { canReceivePayouts } = require('../src/merchants');
const { netFor } = require('../src/payouts');

test('a seeded merchant can receive payouts', () => {
  signInAsOps();
  seedMerchant('verified');
  assert.equal(canReceivePayouts(context.merchant), true);
});

test('the queued payout settles net of fees', () => {
  seedPayout(10000);
  assert.equal(context.payouts.length, 1);
  assert.equal(netFor(context.payouts[0].amountCents), 9946);
});

test('restricting the merchant stops payouts', () => {
  context.merchant.state = 'restricted';
  assert.equal(canReceivePayouts(context.merchant), false);
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

Routing note: screens 1-9 are nine routes served by one React route entry.
The global nav and the confirm-modal render on all fourteen.

Browser tests written against any of these to date: none.

=============== FILE: docs/suite-projection.md ===============
# Suite projection - requested by @tomas, produced 2026-09-06

- Today: 4 tests, all unit, run by `node --test`. Zero browser tests.
- Critical journeys agreed with product: 7 - sign in, approve a payout, retry
  a failed payout, restrict a merchant, resolve a dispute, invite a team
  member, export a statement.
- Estimated end state on the current roadmap, end of Q1 2027: 55-70 browser
  tests plus an API tier of similar size. Nobody is projecting beyond that.
- Who uses this console: internal operations staff, one role, same
  permissions for all of them. Merchants never sign in here - they use the
  merchant portal, a separate product with its own team and its own tests.
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

Marcus's pilot in `pilot/` is the same idea expressed as a module rather than
a class hierarchy, to show the setup sharing works before we commit to the
class shape.
