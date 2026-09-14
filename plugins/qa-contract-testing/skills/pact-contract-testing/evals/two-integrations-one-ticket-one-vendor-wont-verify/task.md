# ARCH-742 wants the same treatment on both integrations and I need an answer before sprint planning

## Problem Description

Marta filed ARCH-742 after the two Q3 incidents and it is on the sprint planning
agenda for Monday 2026-09-15. She wants both of our worst integrations covered
the same way this sprint. A question from the mobile team and a suggestion from
the Pricing team's lead have been tacked onto the bottom since.

I need a decision on each of the four items, not a plan to write a plan. Where the
answer is yes I want the first test actually written, against the code in
`src/quote.js` that does the calling.

Where the answer is anything else I need to be able to defend it on Monday.
Marta's position is that both integrations are HTTP, both return JSON, both broke
us in production, and the vendor runs a sandbox we can aim a test at, so from
where she sits there is no difference between them and she is going to say so.
Vikram has already drafted `test/shiplane.consumer.spec.js` against that sandbox
and it is attached; it looks finished to me. If it is the right shape, use it. If
it is not, I need to know what goes in its place and how that thing would have
caught INC-2264, because "we would have found out sooner" is not going to survive
contact with Marta.

The ticket, the calling code and the Q3 incident summaries are attached. We have a
broker running at `https://broker.internal` and the platform team has already
issued us a token.

## Output Specification

1. Write `docs/arch-742-response.md` with a separate, explicit verdict on each of
   the four numbered items in the ticket, the reason for each, and what we do
   instead wherever the verdict is no.
2. Write the consumer test for whichever item or items you said yes to, at
   `test/pricing.consumer.spec.js`, against `src/quote.js`.
3. State plainly what happens to `test/shiplane.consumer.spec.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/ARCH-742.md ===============
# ARCH-742 — get our two worst integrations under contract before Q4

Reporter: Marta Oyelaran (Staff Eng, Platform).  Opened 2026-09-04.

Two customer-visible incidents in Q3, both from a downstream response changing
shape under us. I want the same treatment applied to both this sprint.

## 1. pricing-service (internal)

Owned by the Pricing team, #team-pricing. Node 22, GitHub Actions, runs `npm
test` on every PR, has a deploy pipeline we can add steps to, and answers in
Slack within the hour. Their tech lead Dan Rzepka picked this up the day after it
was filed.

INC-2211 (2026-07-22, 3h40m): they renamed `discount_cents` to
`discount_amount_cents` behind a flag and flipped the flag. Our quote page showed
every order at full price.

## 2. Shiplane (third-party logistics vendor)

We POST /v2/rates on every checkout. Commercial contract, support email only, no
shared repo, no shared CI, no named engineer. Two support tickets in August went
nine days without a reply. They publish an OpenAPI 3.1 document at
https://api.shiplane.com/openapi.json which their changelog says is regenerated
on every release, and they run a sandbox at https://sandbox.shiplane.com that
mirrors production a release behind.

INC-2264 (2026-08-14, 52m): `eta_days` changed from an integer to a string
("3-5") with no notice. Checkout threw on every rate quote.

## 3. mobile-bff as a second consumer of pricing-service

The mobile team started calling pricing-service in August for the same quote data.
They have asked whether they should be wired in the same way, or whether one
consumer per downstream service is the limit and they should go through us
instead.

## 4. Dan's simplification (added to this ticket 2026-09-05)

> Happy to add a verification step to our PR job this sprint. One thing though —
> rather than us taking broker credentials and a token we have to rotate, just
> commit the expectation file into your repo and give us a raw URL. Our job
> fetches it, replays it against a booted pricing-service and fails the PR on any
> mismatch. Same protection, no shared infrastructure, and you can see exactly
> what we are checking against because it is a file in your tree. We can have
> that running Tuesday; the credentials route needs a ticket with platform and
> that is a fortnight.

## What I want back

A decision on each of the four, and the first test actually written for whichever
of them we are doing. Vikram drafted something for Shiplane against their
sandbox — reuse it if it is the right shape.

=============== FILE: src/quote.js ===============
'use strict';

// pricing-service: POST /v1/quotes -> { currency, subtotal_cents,
//   discount_amount_cents, tax_cents, total_cents, breakdown[], quote_id,
//   expires_at, pricing_engine_version, experiment_bucket, cache_hit }
function toQuoteView(quote) {
  return {
    subtotal: quote.subtotal_cents,
    discount: quote.discount_amount_cents,
    total: quote.total_cents,
    currency: quote.currency,
  };
}

function discountApplies(quote) {
  return quote.discount_amount_cents > 0;
}

// Shiplane: POST /v2/rates -> { rates: [{ carrier, service, amount_cents,
//   eta_days, ... }] }
function cheapestRate(rates) {
  if (!rates.length) return null;
  return rates.reduce((best, r) => (r.amount_cents < best.amount_cents ? r : best));
}

function etaLabel(rate) {
  return `${rate.eta_days} business days`;
}

module.exports = { toQuoteView, discountApplies, cheapestRate, etaLabel };

=============== FILE: test/quote.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toQuoteView, discountApplies, cheapestRate, etaLabel } = require('../src/quote');

test('toQuoteView keeps only the four fields the page renders', () => {
  const view = toQuoteView({
    currency: 'USD',
    subtotal_cents: 12000,
    discount_amount_cents: 1500,
    tax_cents: 840,
    total_cents: 11340,
    quote_id: 'q_88',
    experiment_bucket: 'b',
    cache_hit: true,
  });
  assert.deepEqual(view, { subtotal: 12000, discount: 1500, total: 11340, currency: 'USD' });
});

test('discountApplies is false at zero', () => {
  assert.equal(discountApplies({ discount_amount_cents: 0 }), false);
  assert.equal(discountApplies({ discount_amount_cents: 1 }), true);
});

test('cheapestRate picks the lowest amount', () => {
  const rates = [
    { carrier: 'A', amount_cents: 900, eta_days: 5 },
    { carrier: 'B', amount_cents: 750, eta_days: 7 },
  ];
  assert.equal(cheapestRate(rates).carrier, 'B');
  assert.equal(cheapestRate([]), null);
});

test('etaLabel renders the eta', () => {
  assert.equal(etaLabel({ eta_days: 3 }), '3 business days');
});

=============== FILE: test/shiplane.consumer.spec.js ===============
'use strict';

// DRAFT — Vikram, 2026-09-08. Not wired into the npm test script yet.
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike } = MatchersV3;
const { cheapestRate } = require('../src/quote');

const provider = new PactV3({
  consumer: 'checkout-web',
  provider: 'Shiplane',
  dir: path.resolve(__dirname, '..', 'pacts'),
});

describe('Shiplane rates consumer', () => {
  it('returns rates for a shipment', async () => {
    provider
      .given('the account has rates configured')
      .uponReceiving('a rate request for a 2kg parcel to 94107')
      .withRequest({
        method: 'POST',
        path: '/v2/rates',
        body: { weight_g: 2000, to_postcode: '94107' },
      })
      .willRespondWith({
        status: 200,
        body: { rates: eachLike({ carrier: like('UPS'), amount_cents: like(900), eta_days: like(5) }) },
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/v2/rates`, {
        method: 'POST',
        body: JSON.stringify({ weight_g: 2000, to_postcode: '94107' }),
      });
      const body = await res.json();
      assert.ok(cheapestRate(body.rates));
    });
  });
});

=============== FILE: docs/incidents-q3.md ===============
# Q3 incident summaries (extract)

## INC-2211 — quote page shows full price for every order

2026-07-22, 14:05–17:45 UTC. Cause: pricing-service renamed the response field
`discount_cents` to `discount_amount_cents` and removed the old key in the same
release. Our reader returned undefined and the page rendered the undiscounted
total. Detected by a customer email. Pricing deployed on their own schedule;
nothing in either pipeline compared the two sides.

## INC-2264 — checkout throws on every rate quote

2026-08-14, 09:12–10:04 UTC. Cause: Shiplane changed `eta_days` from integer to
string ("3-5"). Detected by our own 5xx alert 40 minutes after their release
window. Their changelog entry appeared 2026-08-16, two days after the incident.
Support ticket acknowledged 2026-08-25.

=============== FILE: docs/pricing-service-notes.md ===============
# What we know about pricing-service, from the Pricing team's README

- `POST /v1/quotes` takes `{ cart_id, currency, customer_id }`.
- Provider states are already declared in their verification harness for the
  fixtures they use in their own integration tests: `a cart with a discount
  applied`, `a cart with no discount`, `an expired cart`.
- They deploy from `main` two or three times a week and record each release.
- Their PR job runs `npm test` and a build, and takes about four minutes.
