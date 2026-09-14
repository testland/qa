'use strict';

function emptySession() {
  return { screen: 'home', cart: [], filters: {}, banner: null };
}

function addToCart(session, sku, qty = 1) {
  const existing = session.cart.find((l) => l.sku === sku);
  const cart = existing
    ? session.cart.map((l) => (l.sku === sku ? { ...l, qty: l.qty + qty } : l))
    : [...session.cart, { sku, qty }];
  return { ...session, cart };
}

function navigate(session, screen) {
  return { ...session, screen };
}

function reset(session) {
  return { ...emptySession(), filters: session.filters };
}

function cartCount(session) {
  return session.cart.reduce((n, l) => n + l.qty, 0);
}

module.exports = { emptySession, addToCart, navigate, reset, cartCount };
