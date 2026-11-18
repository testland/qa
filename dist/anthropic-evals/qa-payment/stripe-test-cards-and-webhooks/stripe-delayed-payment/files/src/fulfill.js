const Stripe = require('stripe');
const db = require('./db');
const warehouse = require('./warehouse');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fulfillCheckout(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
  const order = await db.findOrderBySession(sessionId);
  if (order.status === 'shipped') return;
  await warehouse.ship(order.id, session.line_items.data);
  await db.setOrderStatus(order.id, 'shipped');
}

module.exports = { fulfillCheckout };
