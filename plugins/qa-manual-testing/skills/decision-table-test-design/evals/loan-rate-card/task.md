# Sanjay cut the pricing test list to nine and I sign it off tomorrow

## Problem Description

We are replacing the spreadsheet that prices consumer loans with the service
below, and the rate card is the whole of the specification. Sanjay in credit risk
scoped the test list. He argues that the only price worth testing is one a
customer can be quoted, and since the March policy change nothing under a 700
credit score gets a straight offer, the card's sub-700 adjustments are dead text.
That leaves nine applications and a list we can run in a day.

The last attempt at this was signed off on a list somebody built by writing one
case per line of the card, and it shipped a pricing bug that nobody found for
five months. I do not want to repeat that by agreeing to a shorter list for a
better-argued reason.

Work out whether his nine applications are the ones to run, and if the card and
the service disagree anywhere, I want that found before this goes live rather
than by underwriting afterwards.

The rate card, Sanjay's memo, the service, its tests and last quarter's
underwriting referrals are attached.

## Output Specification

1. Write `docs/scope-review.md`: whether the nine go ahead, and the set of
   applications you would price instead, each with the rate the card gives it.
2. Where `src/pricer.js` does not price what the card says, change it, and add
   tests to `test/pricer.test.js` that would have caught it. `npm test` must be
   clean.
3. Give QA the list to run, with a count and a statement of what the count
   covers.

Out of scope: affordability, fee income and arrears. Rates only, in APR points.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "loan-pricer",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: docs/rate-card.md ===============
# Consumer loan rate card, 2026 H2

Base rate: 9.9% APR.

An applicant with a credit score of 700 or above gets 1.5 points off the base
rate.

An applicant with a credit score of 780 or above gets 2.5 points off instead of
the 1.5.

A loan with a term longer than 60 months adds 0.8 points.

An applicant who already holds a current account with us gets 0.3 points off.

A loan of EUR 25,000 or more gets a further 0.4 points off, but only where the
credit score is 700 or above. Below 700 the large-loan discount is not applied.

Adjustments are cumulative and are applied to the base rate in any order.

Applications scoring below 700 on a term longer than 60 months are referred to
underwriting. The rate card still prints a price for them.

=============== FILE: docs/sanjay-scope-memo.md ===============
# Pricing test scope - rate-card service

The card turns on five facts: score at or above 700, score at or above 780, term
longer than 60 months, current account held, loan of EUR 25,000 or more.

The list is nine applications. A price is only worth testing if a customer can be
quoted it, and since the March credit policy change nothing scoring under 700
comes out of the funnel with a straight offer. The sub-700 lines on the card are
there for historical reasons and price nothing we sell.

| # | score | term | current account | loan | expected APR |
|---|---|---|---|---|---|
| 1 | 720 | 48 | no | EUR 10,000 | 8.4 |
| 2 | 720 | 48 | yes | EUR 10,000 | 8.1 |
| 3 | 720 | 72 | no | EUR 10,000 | 9.2 |
| 4 | 740 | 48 | yes | EUR 30,000 | 7.7 |
| 5 | 740 | 72 | no | EUR 30,000 | 8.8 |
| 6 | 800 | 48 | no | EUR 10,000 | 7.4 |
| 7 | 800 | 48 | yes | EUR 10,000 | 7.1 |
| 8 | 800 | 72 | yes | EUR 30,000 | 7.5 |
| 9 | 800 | 48 | yes | EUR 30,000 | 6.7 |

Nine applications, every adjustment on the card exercised at least once, one day
of QA. - Sanjay

=============== FILE: src/pricer.js ===============
'use strict';

const BASE_APR = 9.9;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function priceApr(application) {
  const { creditScore, termMonths, holdsCurrentAccount, amountEur } = application;
  let apr = BASE_APR;

  if (creditScore >= 780) apr -= 2.5;
  else if (creditScore >= 700) apr -= 1.5;

  if (termMonths > 60) apr += 0.8;
  if (holdsCurrentAccount) apr -= 0.3;
  if (amountEur >= 25000) apr -= 0.4;

  return {
    aprPoints: round1(apr),
    referredToUnderwriting: creditScore < 700 && termMonths > 60,
  };
}

module.exports = { priceApr, BASE_APR };

=============== FILE: test/pricer.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { priceApr } = require('../src/pricer');

test('a 700-band applicant with nothing else gets the base discount', () => {
  const r = priceApr({ creditScore: 720, termMonths: 48, holdsCurrentAccount: false, amountEur: 10000 });
  assert.strictEqual(r.aprPoints, 8.4);
});

test('the 780 band replaces the 700 discount rather than adding to it', () => {
  const r = priceApr({ creditScore: 800, termMonths: 48, holdsCurrentAccount: false, amountEur: 10000 });
  assert.strictEqual(r.aprPoints, 7.4);
});

test('every discount at once on a long term', () => {
  const r = priceApr({ creditScore: 800, termMonths: 72, holdsCurrentAccount: true, amountEur: 30000 });
  assert.strictEqual(r.aprPoints, 7.5);
});

=============== FILE: docs/underwriting-referrals.md ===============
# Underwriting referrals, Q3

Since the March credit policy change an application scoring below 700 is referred
to underwriting rather than declined at the funnel. The rate-card service prices
it, the price is printed on the referral sheet, and underwriting approves or
declines against that printed price. 214 referrals last quarter, 96 approved and
drawn on the printed rate.

| ref | score | term | current account | loan | rate printed | outcome |
|---|---|---|---|---|---|---|
| LA-3312 | 661 | 72 | no | EUR 31,000 | 10.3 | approved, drawn |
| LA-3340 | 688 | 72 | yes | EUR 9,000 | 10.4 | approved, drawn |
| LA-3355 | 654 | 66 | no | EUR 27,500 | 10.3 | declined |
| LA-3401 | 673 | 72 | yes | EUR 40,000 | 10.0 | approved, drawn |

An underwriter queried LA-3401 in August because the printed rate looked lower
than she expected for the score. Nobody followed it up. These applications have
never been on a pricing test list.
