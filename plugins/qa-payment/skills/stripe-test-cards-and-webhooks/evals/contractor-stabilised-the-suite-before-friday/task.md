# Sign-off wanted today on a contractor's "stabilise the payments suite" PR

## Problem Description

Marek finishes with us on Friday and the 1.9 release goes out on Friday. PR #812
is his last piece of work: five changes to the payments suite, which had been
going red six runs in ten and is now red about one in ten. His write-up is in
`docs/pr-812.md` and the repository here is the code as he left it.

My instinct is to take all of it. The numbers are the numbers, he has been good
value, and I am not in a position to judge the payment-specific parts — I can
see that the suite is greener but not what it is still checking.

What I want from you today is a decision on each of the five, not an overall
verdict, and the repository left in the state your decisions imply. If some of
it should not go in, say so plainly and put those files back; if some of it is
an improvement, keep it exactly as it is rather than rewriting it on your way
past. Anything you put back has to work — do not leave the suite in a state
where a reverted test cannot run at all, and do not undo one of his changes as
a side effect of undoing another.

`npm test` is the offline unit suite and it passes right now. `npm run
test:payments` needs credentials and is not something you can run here.

## Output Specification

1. Write `docs/pr-812-review.md`: one verdict per numbered change from his
   write-up, keep or revert, each with the reason in a sentence or two, and a
   closing statement of what has to be true before 1.9 ships.
2. Apply those verdicts to the repository. Reverting means restoring the
   behaviour the change removed, not just deleting his lines.
3. `npm test` must still pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payments-suite",
  "version": "1.9.0-rc.2",
  "private": true,
  "scripts": {
    "test": "node --test test/unit/*.test.js",
    "test:payments": "node --test test/payments/*.test.js"
  }
}

=============== FILE: docs/pr-812.md ===============
PR #812 - stabilise the payments suite before 1.9
Marek Bielak, 2026-09-11, branched off 1.9.0-rc.1

Where it was: 6 red runs in the last 10 on this suite.
Where it is:  1 in 10, and that one is the order-import test, which is not
mine and which I have not touched.

1. test/payments/3ds.test.js - swapped the card

   This test sat for thirty seconds and then failed about six runs in ten. The
   card it was using never settles on its own inside a CI job, there is nothing
   in the job that can push it along, and a longer wait only made the thirty
   seconds longer. 4000 0000 0000 3055 is a 3DS card as well and it comes back
   clean every time. Assertion updated to match what it returns. The number now
   comes from the shared module in change 5.

2. test/payments/declines.test.js - stubbed the client

   Two full runs died on 19 August when the test-mode API started answering 429
   partway through. This test does not need the network to tell us the decline
   path works, so it now runs against a small stub in test/payments/support/
   that raises the same error. No network, no rate limit, finishes instantly.

3. test/payments/dispute.test.js - stopped waiting out the dispute

   It opened a dispute and then waited ten minutes for the state to move on. It
   now pushes the state it needs through the CLI and waits for the tracker to
   see it, capped, with a message naming what it was waiting for. Ten minutes
   to under twenty seconds.

4. test/payments/webhook.test.js - replaced the fixed wait

   There was an await sleep(5000) before the assertion that the event had been
   processed. Three of the last ten failures were that sleep being too short on
   a loaded runner. It polls every 250ms now and gives up after 30s with a
   message naming what it was waiting for.

5. test/support/cards.js - one place for the card numbers

   The same numbers were pasted across six test files. One module now, and
   everything imports from it.

Not done: the order-import test. Not mine, and I am out on Friday.

=============== FILE: .env.test.example ===============
# Copy to .env.test before running npm run test:payments
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_KEY_FROM_VAULT
STRIPE_WEBHOOK_SECRET=whsec_replace_with_the_endpoint_secret

=============== FILE: test/support/cards.js ===============
'use strict';

// Card numbers used across the payment suite. Test mode only.
module.exports = {
  VISA: '4242424242424242',
  MASTERCARD: '5555555555554444',
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  THREE_DS: '4000000000003055',
};

=============== FILE: test/payments/support/paymentsClient.js ===============
'use strict';

// Thin wrapper so the payment tests do not each read the environment.
function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set; copy .env.test.example to .env.test');
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  return new Stripe(key);
}

function card(number) {
  return {
    type: 'card',
    card: { number, exp_month: 12, exp_year: 2031, cvc: '123' },
  };
}

module.exports = { client, card };

=============== FILE: test/payments/support/stripeStub.js ===============
'use strict';

const CARDS = require('../../support/cards');

// Stands in for the client so the decline test does not touch the network.
function stubClient() {
  return {
    paymentIntents: {
      async create(params) {
        const number = params.payment_method_data.card.number;
        if (number === CARDS.DECLINED) {
          const err = new Error('Your card was declined.');
          err.type = 'card_error';
          throw err;
        }
        return { id: 'pi_stub_1', status: 'succeeded', amount: params.amount };
      },
    },
  };
}

module.exports = { stubClient };

=============== FILE: test/payments/3ds.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { client, card } = require('./support/paymentsClient');
const CARDS = require('../support/cards');

test('a 3DS card is authenticated and the payment completes', async () => {
  const payments = client();

  const intent = await payments.paymentIntents.create({
    amount: 2400,
    currency: 'eur',
    confirm: true,
    return_url: 'https://shop.example.com/orders/return',
    payment_method_data: card(CARDS.THREE_DS),
  });

  assert.equal(intent.status, 'succeeded');
});

=============== FILE: test/payments/declines.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { stubClient } = require('./support/stripeStub');
const { card } = require('./support/paymentsClient');
const CARDS = require('../support/cards');

test('a declined card comes back as a card error', async () => {
  const payments = stubClient();

  await assert.rejects(
    () =>
      payments.paymentIntents.create({
        amount: 1800,
        currency: 'eur',
        confirm: true,
        return_url: 'https://shop.example.com/orders/return',
        payment_method_data: card(CARDS.DECLINED),
      }),
    /card was declined/i,
  );
});

=============== FILE: test/payments/dispute.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { disputes, reset } = require('../../src/disputeTracker');

async function waitFor(predicate, { timeoutMs = 20000, intervalMs = 250, what = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const hit = predicate();
    if (hit) return hit;
    if (Date.now() >= deadline) throw new Error(`gave up after ${timeoutMs}ms waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test('a dispute reaches the tracker and is recorded', async () => {
  reset();
  execFileSync('stripe', ['trigger', 'charge.dispute.created'], { stdio: 'inherit' });

  const dispute = await waitFor(() => disputes().find((d) => d.status === 'needs_response'), {
    what: 'a dispute in needs_response',
  });

  assert.equal(dispute.object, 'dispute');
  assert.ok(dispute.amount > 0);
});

=============== FILE: test/payments/webhook.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { handleDelivery, processedEvents } = require('../../src/webhookHandler');

const SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_local';

function header(payload) {
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', SECRET).update(`${t}.${payload}`, 'utf8').digest('hex');
  return `t=${t},v1=${sig}`;
}

async function waitFor(predicate, { timeoutMs = 30000, intervalMs = 250, what = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const hit = predicate();
    if (hit) return hit;
    if (Date.now() >= deadline) throw new Error(`gave up after ${timeoutMs}ms waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test('a delivered payment_intent.succeeded is processed', async () => {
  const payload = JSON.stringify({
    id: 'evt_wh_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_wh_1', amount: 2400 } },
  });

  handleDelivery(payload, { 'stripe-signature': header(payload) }, SECRET);

  const event = await waitFor(() => processedEvents().find((e) => e.id === 'evt_wh_1'), {
    what: 'evt_wh_1 to be processed',
  });
  assert.equal(event.type, 'payment_intent.succeeded');
});

=============== FILE: src/webhookVerify.js ===============
'use strict';

const crypto = require('node:crypto');

const TOLERANCE_SECONDS = 300;

function verifyAndParse(rawBody, signatureHeader, secret) {
  const parts = { t: null, v1: [] };
  for (const piece of String(signatureHeader || '').split(',')) {
    const [scheme, value] = piece.trim().split('=');
    if (scheme === 't') parts.t = Number(value);
    if (scheme === 'v1') parts.v1.push(value);
  }
  if (!parts.t || parts.v1.length === 0) throw new Error('no signature header');
  if (Math.abs(Math.floor(Date.now() / 1000) - parts.t) > TOLERANCE_SECONDS) {
    throw new Error('timestamp outside the tolerance zone');
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`, 'utf8')
    .digest('hex');
  if (!parts.v1.some((sig) => sig === expected)) throw new Error('signature mismatch');
  return JSON.parse(rawBody);
}

module.exports = { verifyAndParse, TOLERANCE_SECONDS };

=============== FILE: src/webhookHandler.js ===============
'use strict';

const { verifyAndParse } = require('./webhookVerify');

const processed = [];

function handleDelivery(rawBody, headers, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  const event = verifyAndParse(rawBody, headers['stripe-signature'], secret);
  processed.push(event);
  return { status: 200 };
}

function processedEvents() {
  return processed.slice();
}

module.exports = { handleDelivery, processedEvents };

=============== FILE: src/disputeTracker.js ===============
'use strict';

const seen = [];

function record(dispute) {
  seen.push(dispute);
  return seen.length;
}

function disputes() {
  return seen.slice();
}

function reset() {
  seen.length = 0;
}

module.exports = { record, disputes, reset };

=============== FILE: test/unit/webhookVerify.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyAndParse } = require('../../src/webhookVerify');

const SECRET = 'whsec_unit_test_secret';

function header(payload, secret = SECRET) {
  const t = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex');
  return `t=${t},v1=${signature}`;
}

test('a correctly signed payload is parsed', () => {
  const payload = JSON.stringify({ id: 'evt_unit_1', type: 'charge.refunded' });
  const event = verifyAndParse(payload, header(payload), SECRET);
  assert.equal(event.id, 'evt_unit_1');
});

test('a payload signed with another secret is rejected', () => {
  const payload = JSON.stringify({ id: 'evt_unit_2', type: 'charge.refunded' });
  assert.throws(() => verifyAndParse(payload, header(payload, 'whsec_someone_else'), SECRET), /signature mismatch/);
});

=============== FILE: test/unit/disputeTracker.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { record, disputes, reset } = require('../../src/disputeTracker');

test('a recorded dispute is readable back', () => {
  reset();
  record({ object: 'dispute', id: 'dp_unit_1', status: 'needs_response', amount: 2400 });
  assert.equal(disputes().length, 1);
  assert.equal(disputes()[0].status, 'needs_response');
});

test('reset clears what was recorded', () => {
  reset();
  record({ object: 'dispute', id: 'dp_unit_2', status: 'won', amount: 100 });
  reset();
  assert.equal(disputes().length, 0);
});
