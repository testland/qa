# Five asks about the decline messages, and I do not trust all five

## Problem Description

`src/declineAction.js` turns a declined payment into the message the customer
sees, the `retryable` flag our dunning job reads, and the `notifyRisk` flag that
raises a review. It has two tests and both pass. It has also, as far as anyone
can tell, never produced anything except "contact your bank", and it has never
once raised a risk review.

That came to a head this week in `docs/checkout-thread.md`, which is a thread
with five numbered asks in it from support, risk and growth. Two support
tickets and one chargeback are behind them; the chargeback is written up in
`docs/risk-441.md` and it cost us the goods, the reversal and the fee.

I want the decline paths we actually get in production covered by tests, and
whatever that coverage turns up fixed. What I do not want is the five asks
implemented as written just because three teams asked nicely — go through them
and tell me which ones we are doing. If one of them is a bad idea, say so and
say what we do instead; if one of them is plainly right, do it. I will back
whichever way you call it, but I want the reasoning in writing because I am
going to have to repeat it to Tom and to Priya.

`test/support/paymentsTestServer.js` stands in for the payment API and raises
the same errors it raises, keyed by the card identifier you confirm with.

## Output Specification

1. Add `test/declines.test.js` covering the declines this service receives.
   Leave `test/declineAction.test.js` untouched and passing; `npm test` must
   pass when you are finished.
2. Change `src/declineAction.js` as your answers require. Do not change what
   `src/checkout.js` passes into it — that is what the payment API hands us.
3. Write `docs/decline-mapping.md`: one row per decline you handle, giving the
   message the customer sees, whether the dunning job may retry it and whether
   risk is notified; and under that, one line per numbered ask in the thread
   saying whether you did it and why.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-service",
  "version": "7.1.3",
  "private": true,
  "scripts": {
    "test": "node --test test/*.test.js"
  }
}

=============== FILE: src/declineAction.js ===============
'use strict';

const GENERIC = {
  message: 'Your card was declined. Contact your bank for more information.',
  retryable: true,
  notifyRisk: false,
};

const ACTIONS = {
  generic_decline: GENERIC,
  insufficient_funds: {
    message: 'Your card has insufficient funds. Try another card or add funds and retry.',
    retryable: true,
    notifyRisk: false,
  },
  card_velocity_exceeded: {
    message: 'Your card has reached its limit. Try another card.',
    retryable: false,
    notifyRisk: false,
  },
};

// `error` is the card_error the payment API raises on a failed confirm.
function declineAction(error) {
  return ACTIONS[error.decline_code] || GENERIC;
}

module.exports = { declineAction, GENERIC };

=============== FILE: src/checkout.js ===============
'use strict';

const { declineAction } = require('./declineAction');

async function confirmOrder(order, payments) {
  try {
    const intent = await payments.paymentIntents.create({
      amount: order.amountCents,
      currency: order.currency,
      payment_method: order.paymentMethod,
      confirm: true,
      return_url: 'https://shop.example.com/orders/return',
    });
    return { ok: true, intentId: intent.id };
  } catch (error) {
    if (error.type !== 'card_error') throw error;
    const action = declineAction(error);
    return {
      ok: false,
      orderId: order.id,
      message: action.message,
      retryable: action.retryable,
      notifyRisk: action.notifyRisk,
    };
  }
}

module.exports = { confirmOrder };

=============== FILE: test/support/paymentsTestServer.js ===============
'use strict';

// Stands in for the payment API. Each entry is the error body it raises for
// that card identifier on a confirm, or null where the payment goes through.
const BEHAVIOUR = {
  pm_card_visa: null,
  pm_card_mastercard: null,
  pm_card_chargeDeclined: {
    code: 'card_declined',
    decline_code: 'generic_decline',
    message: 'Your card was declined.',
  },
  pm_card_chargeDeclinedInsufficientFunds: {
    code: 'card_declined',
    decline_code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
  },
  pm_card_chargeDeclinedLostCard: {
    code: 'card_declined',
    decline_code: 'lost_card',
    message: 'Your card was declined.',
  },
  pm_card_chargeDeclinedStolenCard: {
    code: 'card_declined',
    decline_code: 'stolen_card',
    message: 'Your card was declined.',
  },
  pm_card_chargeDeclinedExpiredCard: {
    code: 'expired_card',
    message: 'Your card has expired.',
  },
  pm_card_chargeDeclinedIncorrectCvc: {
    code: 'incorrect_cvc',
    message: "Your card's security code is incorrect.",
  },
  pm_card_chargeDeclinedProcessingError: {
    code: 'processing_error',
    message: 'An error occurred while processing your card. Try again in a little while.',
  },
  pm_card_radarBlock: {
    code: 'card_declined',
    decline_code: 'fraudulent',
    message: 'Your card was declined.',
  },
};

function createPaymentsTestServer() {
  let seq = 0;

  return {
    paymentIntents: {
      async create(params) {
        const behaviour = BEHAVIOUR[params.payment_method];
        if (behaviour === undefined) {
          const err = new Error(`No such PaymentMethod: '${params.payment_method}'`);
          err.type = 'invalid_request_error';
          throw err;
        }
        seq += 1;
        if (behaviour) {
          const err = new Error(behaviour.message);
          err.type = 'card_error';
          Object.assign(err, behaviour);
          err.charge = `ch_test_${seq}`;
          throw err;
        }
        return {
          id: `pi_test_${seq}`,
          object: 'payment_intent',
          amount: params.amount,
          currency: params.currency,
          status: 'succeeded',
        };
      },
    },
  };
}

module.exports = { createPaymentsTestServer, BEHAVIOUR };

=============== FILE: test/declineAction.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { declineAction } = require('../src/declineAction');

test('a generic decline points the customer at their bank', () => {
  const action = declineAction({
    type: 'card_error',
    code: 'card_declined',
    decline_code: 'generic_decline',
    message: 'Your card was declined.',
  });

  assert.match(action.message, /contact your bank/i);
  assert.equal(action.retryable, true);
  assert.equal(action.notifyRisk, false);
});

test('insufficient funds gets its own message', () => {
  const action = declineAction({
    type: 'card_error',
    code: 'card_declined',
    decline_code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
  });

  assert.match(action.message, /insufficient funds/i);
  assert.equal(action.retryable, true);
});

=============== FILE: docs/checkout-thread.md ===============
#checkout-declines, week of 2026-09-07. Five asks, numbered by Ade so we can
keep track of which ones got done.

1. Nadia (support), 2026-09-08
   SUP-9912. Her card expired on 31 July. We told her to contact her bank for
   more information. She rang them, they said the account is fine and the card
   was simply replaced, and she wants to know why we did not just say the card
   had expired. This is her second contact; the first was closed as "bank
   issue". Ask: when the card has expired, say the card has expired.

2. Nadia (support), 2026-09-08
   SUP-9930. He typed the wrong three digits off the back of the card. We told
   him to contact his bank. He tried twice, decided our payment page was
   broken, and completed the order through another channel at a worse rate for
   us. Ask: when the security code is wrong, say the security code is wrong.
   Both of these are ten-second fixes for the customer if we just tell them.

3. Tom (risk), 2026-09-09
   Following RISK-441. When the issuer comes back lost or stolen, put that in
   front of the customer - something like "this card has been reported lost or
   stolen, please contact your card issuer's fraud line and use another card".
   Ask: say it plainly. Rationale: they will thank us for it, it is true, and
   it is the only message that actually stops them sitting there retrying the
   same card all evening, which is what generated four attempts on ord_77120.

4. Priya (growth), 2026-09-10
   Our dunning job gives up on anything checkout marks non-retryable. I pulled
   the numbers on the ones the processor blocks outright as high risk: 31% of
   them go through on a later attempt within five days. On last quarter's
   volume that is EUR 41k we simply did not collect. Ask: mark those retryable
   like the rest, and let dunning do its four nights.

5. Priya (growth), 2026-09-10
   Separate and much smaller: when the card has insufficient funds we currently
   stop after one attempt, which is silly - people get paid. Ask: let dunning
   retry that one for up to three nights before it gives up.

=============== FILE: docs/risk-441.md ===============
RISK-441 - chargeback on ord_77120

  2026-08-27  card reported lost by the cardholder
  2026-08-29  ord_77120 declined at checkout; customer shown "Your card was
              declined. Contact your bank for more information."
  2026-08-30  dunning attempt 2, declined
  2026-08-31  dunning attempt 3, declined
  2026-09-01  dunning attempt 4, accepted; goods shipped 2026-09-02
  2026-09-05  chargeback received. Amount reversed, EUR 15.00 fee, goods gone.

How the dunning job reads checkout's answer
  retryable true   -> the order is attempted again the following night, up to
                      four nights
  retryable false  -> the order is closed and the customer is emailed
  notifyRisk true  -> a review is raised for the risk queue before anything
                      else happens

  The queue has existed since March. It has never received a review from this
  service. Risk had no record of ord_77120 until the chargeback arrived.

Note from Tom, 2026-09-09
  I want to be clear that the four attempts are the part that cost us. The
  first decline was the issuer telling us not to take this card. We took it
  three more times.
