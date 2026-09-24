# ARCH-742 has five items on it now and the vendor has answered the objection everyone was going to raise

## Problem Description

Marta filed ARCH-742 after the two Q3 incidents and it is on the sprint planning
agenda for Monday 2026-09-15. She wants both of our worst integrations covered the
same way this sprint. Three more items have been tacked on since it was opened and
one of them changes the argument, so I need all five answered.

Her position is that both integrations are HTTP, both return JSON, both broke us
in production, and there is no interesting difference between them. Vikram has
already drafted `test/shiplane.consumer.spec.js` against the vendor's sandbox and
it is attached; it looks finished to me, and if it is the right shape we should use
it.

The item I actually want a straight answer on is item 3. Everyone's objection to
putting Shiplane under the same regime is that they are a third party who will
never run anything for us. Their solutions engineer replied on Tuesday pointing at
a paid add-on that does exactly that — we upload our expectation file, they replay
it against their sandbox on demand and return a pass or fail report. Their product
page is attached. Marta's read is that this removes the only objection anyone has
raised and we should buy it and put it on the release checklist. It is $400 a
month, which nobody will argue about.

Where the answer is yes I want the first test actually written against the code in
`src/quote.js` that does the calling. Where the answer is anything else I need to
be able to defend it on Monday against someone who will point out that we have
been talking about this since July and have shipped nothing. "We would have found
out sooner" is not going to survive contact with Marta — whatever we propose for
Shiplane has to be something I can show would have caught INC-2264.

Attached: the ticket, the vendor's product page, the calling code with its tests,
the Q3 incident summaries, and what we know about the Pricing team's setup. We have
a broker at `https://broker.internal` and the platform team has issued us a token.

## Output Specification

1. Write `docs/arch-742-response.md` with a separate, explicit verdict on each of
   the five numbered items, the reason for each, and what we do instead wherever
   the verdict is no.
2. Write the consumer test for whichever item or items you said yes to, at
   `test/pricing.consumer.spec.js`, against `src/quote.js`.
3. State plainly what happens to `test/shiplane.consumer.spec.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/ARCH-742.md ===============
# ARCH-742 - get our two worst integrations covered before Q4

Reporter: Marta Oyelaran (Staff Eng, Platform). Opened 2026-09-04.

Two customer-visible incidents in Q3, both from a downstream response changing
shape under us. I want the same treatment applied to both this sprint.

## 1. pricing-service (internal)

Owned by the Pricing team, #team-pricing. Node 22, GitHub Actions, runs `npm test`
on every PR, has a deploy pipeline we can add steps to, and answers in Slack
within the hour. Their tech lead Dan Rzepka picked this up the day after it was
filed and has offered to add a verification step to their PR job and to take
broker credentials from platform.

INC-2211 (2026-07-22, 3h40m): they renamed `discount_cents` to
`discount_amount_cents` behind a flag and flipped the flag. Our quote page showed
every order at full price.

## 2. Shiplane (third-party logistics vendor)

We POST /v2/rates on every checkout. Commercial contract, support email only, no
shared repository, no shared CI, no named engineer. Two support tickets in August
went nine days without a reply. They publish an OpenAPI 3.1 document at
https://api.shiplane.com/openapi.json which their changelog says is regenerated on
every release, and they run a sandbox at https://sandbox.shiplane.com.

INC-2264 (2026-08-14, 52m): `eta_days` changed from an integer to a string ("3-5")
with no notice. Checkout threw on every rate quote.

Vikram has drafted an expectation file for them against the sandbox.

## 3. Shiplane Contract Assurance (added 2026-09-09)

Their solutions engineer, unprompted, pointed us at a paid add-on. We upload our
expectation file through their portal, they replay every interaction in it against
their sandbox account and hand back a pass/fail report. $400/month, live within
two working days, no engineering effort on our side.

This answers the objection I keep hearing - that a third party will never run
verification for us. They will, and they will do it on their own infrastructure.
My proposal is that we buy it, register Shiplane as a participant, and put the
report on the release checklist for checkout-web. Their product page is attached.

## 4. mobile-bff as a second consumer of pricing-service (added 2026-09-05)

The mobile team started calling pricing-service in August for the same quote data.
They have asked whether they should be wired in the same way under their own name,
or whether one set of expectations per downstream service is the limit and they
should go through us instead.

## 5. Dan's second suggestion (added 2026-09-10)

> While you are in there - you should run the deploy comparison in your own
> pipeline before checkout-web ships, not just in ours before pricing-service
> ships. We will be checking our candidate against your expectations; nothing is
> checking your candidate against what we are actually running. Same command, your
> pacticipant, your environment.

## What I want back

A decision on each of the five, and the first test actually written for whichever
of them we are doing.

=============== FILE: docs/shiplane-contract-assurance.md ===============
# Shiplane Contract Assurance - product page, saved 2026-09-09

> **Never be surprised by an API change again.**
>
> Upload your expectation file through the Shiplane developer portal. Our
> replay service executes every interaction in it against **your sandbox
> account** and returns a signed pass/fail report, per interaction, within
> minutes. Re-run it on demand from the portal or from our REST API.
>
> **$400 / month.** Included: unlimited replays, 90 days of report history,
> email alerting on a failed replay.

## Notes from the page's own FAQ

- **Which environment does the replay run against?**
  Your sandbox account on `sandbox.shiplane.com`. Production accounts are not
  reachable by the replay service.
- **How current is the sandbox?**
  The sandbox environment is refreshed from the production build on the first
  Tuesday of each month. Customers who need earlier access to an upcoming change
  should contact their account manager.
- **What is in the report?**
  Per-interaction pass or fail, the response body observed, and a timestamp. The
  report is delivered to you as JSON and PDF. Reports are not pushed to any
  third-party system.
- **Do you version the API?**
  The `/v2` prefix is stable. Release notes are published to the changelog after
  each production release.

=============== FILE: docs/incidents-q3.md ===============
# Q3 incident summaries (extract)

## INC-2211 - quote page shows full price for every order

2026-07-22, 14:05-17:45 UTC. Cause: pricing-service renamed the response field
`discount_cents` to `discount_amount_cents` and removed the old key in the same
release. Our reader returned undefined and the page rendered the undiscounted
total. Detected by a customer email. Pricing deployed on their own schedule;
nothing in either pipeline compared the two sides.

## INC-2264 - checkout throws on every rate quote

2026-08-14, 09:12-10:04 UTC. Cause: Shiplane changed `eta_days` from integer to
string ("3-5") in production. Detected by our own 5xx alert 40 minutes after their
release window. Their changelog entry appeared 2026-08-16, two days after the
incident. Support ticket acknowledged 2026-08-25.

Post-incident note from Vikram, 2026-09-02: "Worth recording that our sandbox
account was still returning `eta_days: 5` as an integer for two and a half weeks
after this. I re-checked it on 2026-08-28 and it was still the old shape. It
changed over sometime around 2026-09-01."

=============== FILE: docs/pricing-service-notes.md ===============
# What we know about pricing-service, from the Pricing team's README

- `POST /v1/quotes` takes `{ cart_id, currency, customer_id }`.
- Provider states are already declared in their verification harness for the
  fixtures they use in their own integration tests: `a cart with a discount
  applied`, `a cart with no discount`, `an expired cart`.
- They deploy from `main` two or three times a week and record each release.
- Their PR job runs `npm test` and a build, and takes about four minutes.

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

// DRAFT - Vikram, 2026-09-08. Not wired into the npm test script yet.
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
