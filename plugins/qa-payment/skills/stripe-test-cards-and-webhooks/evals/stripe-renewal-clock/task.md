# Our subscription tests never really renew anything

## Problem Description

Our subscription tests in `test/billing.e2e.test.js` don't work (`docs/billing-tests.md`). Rewrite them against the Stripe sandbox so trial conversion, monthly renewals and a failed renewal payment are really exercised. Nothing can be installed or run here.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: package.json ===============
{
  "name": "billing",
  "scripts": {
    "test:e2e": "jest test/billing.e2e.test.js"
  },
  "dependencies": {
    "stripe": "^19.1.0"
  },
  "devDependencies": {
    "jest": "^30.0.0"
  }
}

=============== FILE: test/billing.e2e.test.js ===============
// Runs against our Stripe sandbox (STRIPE_SECRET_KEY = sk_test_...)
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const MONTHLY_PRICE = process.env.MONTHLY_PRICE_ID;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('trial converts to paid after 7 days', async () => {
  const customer = await stripe.customers.create({ payment_method: 'pm_card_visa',
    invoice_settings: { default_payment_method: 'pm_card_visa' } });
  const sub = await stripe.subscriptions.create({ customer: customer.id,
    items: [{ price: MONTHLY_PRICE }], trial_period_days: 7 });
  jest.setSystemTime(Date.now() + 8 * 24 * 3600 * 1000);
  const fresh = await stripe.subscriptions.retrieve(sub.id);
  expect(fresh.status).toBe('active');
});

test('a year of renewals produces 12 paid invoices', async () => {
  const customer = await stripe.customers.create({ payment_method: 'pm_card_visa',
    invoice_settings: { default_payment_method: 'pm_card_visa' } });
  await stripe.subscriptions.create({ customer: customer.id, items: [{ price: MONTHLY_PRICE }] });
  jest.setSystemTime(Date.now() + 365 * 24 * 3600 * 1000);
  const invoices = await stripe.invoices.list({ status: 'paid' });
  expect(invoices.data.length).toBeGreaterThanOrEqual(12);
});

test('failed renewal payment marks the account past_due', async () => {
  const customer = await stripe.customers.create({ payment_method: 'pm_card_visa_chargeDeclined',
    invoice_settings: { default_payment_method: 'pm_card_visa_chargeDeclined' } });
  const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: MONTHLY_PRICE }] });
  jest.setSystemTime(Date.now() + 31 * 24 * 3600 * 1000);
  expect((await stripe.subscriptions.retrieve(sub.id)).status).toBe('past_due');
});

=============== FILE: docs/billing-tests.md ===============
These tests are supposed to prove trial conversion, monthly renewals and dunning work
against the real Stripe sandbox. The first two always fail and the third errors when the
customer is created. Our webhook handler (not shown) listens for invoice.paid,
invoice.payment_failed and customer.subscription.updated.
