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
