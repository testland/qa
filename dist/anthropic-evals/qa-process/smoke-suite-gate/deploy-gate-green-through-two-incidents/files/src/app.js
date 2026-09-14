'use strict';

const USERS = { 'verify@auben.test': { id: 'u-1', password: 'seeded-pw' } };
const SESSIONS = new Set();

async function signIn(email, password) {
  const user = USERS[email];
  if (!user || user.password !== password) return { status: 401, body: { error: 'bad_credentials' } };
  const token = `t-${user.id}`;
  SESSIONS.add(token);
  return { status: 200, body: { token } };
}

async function getDashboard(token) {
  if (!SESSIONS.has(token)) return { status: 401, body: { error: 'no_session' } };
  return { status: 200, body: { heading: 'Your week', cards: ['orders', 'usage', 'invoices'] } };
}

async function priceCart(items, promo) {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const tenth = Math.round(subtotal / 10);
  return { status: 200, body: { subtotal, total: promo === 'SAVE10' ? tenth : subtotal, currency: 'GBP' } };
}

async function placeOrder(token, cart) {
  if (!SESSIONS.has(token)) return { status: 401, body: { error: 'no_session' } };
  const priced = await priceCart(cart.items, cart.promo);
  return { status: 200, body: { state: 'confirmed', reference: 'AUB-77120', charged: priced.body.total } };
}

module.exports = { signIn, getDashboard, priceCart, placeOrder };
