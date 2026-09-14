'use strict';

const CENTS = (n) => Math.round(n * 100);

function lineTotal(unitPriceCents, quantity) {
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) throw new RangeError('unitPriceCents');
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError('quantity');
  return unitPriceCents * quantity;
}

function applyPromo(subtotalCents, promo) {
  if (!promo) return subtotalCents;
  if (promo.kind === 'percent') return subtotalCents - Math.round((subtotalCents * promo.value) / 100);
  if (promo.kind === 'flat') return Math.max(0, subtotalCents - promo.value);
  throw new RangeError(`unknown promo kind: ${promo.kind}`);
}

function orderTotal(lines, promo, taxRateBps) {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l.unitPriceCents, l.quantity), 0);
  const discounted = applyPromo(subtotal, promo);
  const tax = Math.round((discounted * taxRateBps) / 10000);
  return { subtotal, discounted, tax, total: discounted + tax };
}

module.exports = { CENTS, lineTotal, applyPromo, orderTotal };
