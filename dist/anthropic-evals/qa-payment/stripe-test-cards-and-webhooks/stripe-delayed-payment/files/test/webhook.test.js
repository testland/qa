const request = require('supertest');
jest.mock('../src/fulfill');
const { fulfillCheckout } = require('../src/fulfill');
const { app, stripe } = require('../src/app');

test('card checkout is fulfilled', async () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid' } } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  await request(app).post('/webhooks/stripe').set('stripe-signature', header)
    .set('content-type', 'application/json').send(payload).expect(200);
  expect(fulfillCheckout).toHaveBeenCalledWith('cs_test_1');
});
