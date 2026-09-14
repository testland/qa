'use strict';

function lineTotal(item) {
  return Math.round(item.unitCents * item.qty * (1 - (item.discount ?? 0)));
}

function cartTotal(items, taxRate = 0) {
  const subtotal = items.reduce((sum, i) => sum + lineTotal(i), 0);
  return subtotal + Math.round(subtotal * taxRate);
}

module.exports = { lineTotal, cartTotal };
