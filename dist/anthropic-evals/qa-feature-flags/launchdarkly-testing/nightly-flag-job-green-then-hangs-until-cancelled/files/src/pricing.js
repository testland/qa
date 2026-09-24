'use strict';

function lineTotal(item) {
  return Math.round(item.unitCents * item.qty);
}

function cartTotal(cart) {
  return cart.items.reduce((sum, item) => sum + lineTotal(item), 0);
}

function applyPromo(totalCents, promo) {
  if (!promo) return totalCents;
  if (promo.kind === 'percent') return Math.round(totalCents * (1 - promo.value / 100));
  return Math.max(0, totalCents - promo.value);
}

module.exports = { lineTotal, cartTotal, applyPromo };
