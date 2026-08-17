'use strict';

const TAX_RATE = 0.2;

class CouponError extends Error {
  constructor(code) {
    super(`Unknown coupon: ${code}`);
    this.name = 'CouponError';
    this.code = code;
  }
}

function emptyCart() {
  return { items: [] };
}

function addToCart(cart, item) {
  return { items: [...cart.items, { sku: item.sku, priceCents: item.priceCents, qty: item.qty }] };
}

function priceCart(cart) {
  const subtotalCents = cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function applyCoupon(cart, code) {
  if (code !== 'WELCOME10') {
    throw new CouponError(code);
  }
  return { ...cart, discountCents: Math.round(priceCart(cart).subtotalCents * 0.1) };
}

module.exports = { emptyCart, addToCart, priceCart, applyCoupon, CouponError, TAX_RATE };
