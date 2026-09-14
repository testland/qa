# Whatever the bank says, checkout tells the customer to ring their bank

## Problem Description

Three things landed on me this week and I think they are the same thing.

Two support tickets: a customer whose card expired in July was told at checkout
to contact her bank, which she did, and they told her there was nothing wrong
with the account. Another mistyped the security code on the back of the card,
got the same "contact your bank" line, assumed we were broken and paid another
way. Neither of them was told what was actually wrong, and both of those are
things the customer can fix in ten seconds if you tell them.

The third is worse and it came from risk. Order `ord_77120` was declined,
our dunning job retried it three nights running, the fourth attempt went
through, and the card turned out to have been reported lost. We are now paying
for the goods, the chargeback and the fee. The dunning job retries anything
checkout hands back as retryable, which as far as I can tell is everything.

`src/declineAction.js` is what turns a declined payment into the message the
customer sees and the retryable flag the dunning job reads. It has one test
file covering two cases and both pass.

I want the decline paths we actually get in production covered, and whatever
that coverage turns up fixed. Take the retry policy seriously — a card that
the bank has flagged must not be retried by us at all, and somebody in risk
needs to see it.

## Output Specification

1. Add `test/declines.test.js` covering the declines described above and the
   ones already in the code. Leave `test/declineAction.test.js` untouched and
   passing; `npm test` must pass when you are finished.
2. Fix `src/declineAction.js` so the new coverage passes. Do not change what
   `src/checkout.js` passes into it — that is what the payment API hands us.
3. Write `docs/decline-mapping.md`: one row per decline we handle, with the
   message the customer sees, whether the dunning job may retry it, and whether
   risk is notified.

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

=============== FILE: fixtures/test-mode-declines.json ===============
{
  "captured": "2026-05-14, test mode, API version 2025-04-30.basil",
  "how": "One confirm call per card against the test-mode API. Each entry is the error body verbatim, or null where the payment went through.",
  "cards": [
    {
      "number": "4242 4242 4242 4242",
      "payment_method": "pm_card_visa",
      "result": "succeeded",
      "error": null
    },
    {
      "number": "4000 0000 0000 0002",
      "payment_method": "pm_card_visa_chargeDeclined",
      "result": "declined",
      "error": {
        "type": "card_error",
        "code": "card_declined",
        "decline_code": "generic_decline",
        "message": "Your card was declined.",
        "charge": "ch_3RkA1s2eZvKYlo2C0Q8rJ1aP",
        "outcome": { "seller_message": "The bank did not return any further details with this decline." }
      }
    },
    {
      "number": "4000 0000 0000 9995",
      "payment_method": "pm_card_visa_chargeDeclinedInsufficientFunds",
      "result": "declined",
      "error": {
        "type": "card_error",
        "code": "card_declined",
        "decline_code": "insufficient_funds",
        "message": "Your card has insufficient funds.",
        "charge": "ch_3RkA2p2eZvKYlo2C1w4kL7dQ",
        "outcome": { "seller_message": "The bank returned the decline code insufficient_funds." }
      }
    },
    {
      "number": "4000 0000 0000 9987",
      "payment_method": "pm_card_visa_chargeDeclinedLostCard",
      "result": "declined",
      "error": {
        "type": "card_error",
        "code": "card_declined",
        "decline_code": "lost_card",
        "message": "Your card was declined.",
        "charge": "ch_3RkA3f2eZvKYlo2C7n2pB0xR",
        "outcome": { "seller_message": "The bank returned the decline code lost_card." }
      }
    },
    {
      "number": "4000 0000 0000 0069",
      "payment_method": "pm_card_chargeDeclinedExpiredCard",
      "result": "declined",
      "error": {
        "type": "card_error",
        "code": "expired_card",
        "message": "Your card has expired.",
        "charge": "ch_3RkA4b2eZvKYlo2CkE9tV3mS",
        "outcome": { "seller_message": "The bank returned the decline code expired_card." }
      }
    },
    {
      "number": "4000 0000 0000 0127",
      "payment_method": "pm_card_chargeDeclinedIncorrectCvc",
      "result": "declined",
      "error": {
        "type": "card_error",
        "code": "incorrect_cvc",
        "message": "Your card's security code is incorrect.",
        "charge": "ch_3RkA5x2eZvKYlo2CpU1dN8gT",
        "outcome": { "seller_message": "The bank returned the decline code incorrect_cvc." }
      }
    },
    {
      "number": "4100 0000 0000 0019",
      "payment_method": "pm_card_radarBlock",
      "result": "declined",
      "error": {
        "type": "card_error",
        "code": "card_declined",
        "decline_code": "fraudulent",
        "message": "Your card was declined.",
        "charge": "ch_3RkA6q2eZvKYlo2CsW5hJ2fK",
        "outcome": { "seller_message": "Payment was blocked as it was determined to be high risk." }
      }
    }
  ]
}

=============== FILE: docs/support-tickets.md ===============
Tickets referenced, week of 2026-09-07

SUP-9912  "Your website says call my bank"
  Customer's card expired 2026-07-31. At checkout she was told to contact her
  bank for more information. She rang them, they told her the account is fine
  and the card was simply replaced. She wants to know why we did not just say
  the card had expired. Second contact from the same customer; the first was
  closed as "bank issue".

SUP-9930  "Gave up, paid with something else"
  Customer entered the wrong three digits from the back of the card. Checkout
  told him to contact his bank. He tried twice, assumed our payment page was
  broken, and completed the order through another channel at a worse rate for
  us.

RISK-441  Chargeback on ord_77120
  Declined on 2026-08-29. The dunning job retried on the 30th, 31st and the
  1st. The fourth attempt was accepted. Card was reported lost on 2026-08-27.
  Chargeback received 2026-09-05: goods gone, amount reversed, 15.00 fee.
  Risk had no record of this order before the chargeback arrived.
  The dunning job retries any order checkout returns with retryable true, and
  raises a review for any order it returns with notifyRisk true. It has never
  raised one.
