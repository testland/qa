'use strict';

// Spring promo eligibility, quoted verbatim from the promo brief:
//   "Applies to orders between 10 and 100 items with a subtotal of up to
//    500.00 EUR."
// The brief does not say whether those endpoints count. The comparisons below
// are the shipped behaviour.
const MIN_ITEMS = 10;
const MAX_ITEMS = 100;
const SUBTOTAL_LIMIT_CENTS = 50000; // 500.00 EUR

function isEligible(order) {
  if (!order || typeof order !== 'object') {
    return { eligible: false, code: 'MALFORMED' };
  }
  const { itemCount, subtotalCents } = order;
  if (!Number.isInteger(itemCount) || itemCount < 0) {
    return { eligible: false, code: 'BAD_ITEM_COUNT' };
  }
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    return { eligible: false, code: 'BAD_SUBTOTAL' };
  }
  if (itemCount < MIN_ITEMS) {
    return { eligible: false, code: 'TOO_FEW_ITEMS' };
  }
  if (itemCount > MAX_ITEMS) {
    return { eligible: false, code: 'TOO_MANY_ITEMS' };
  }
  if (subtotalCents >= SUBTOTAL_LIMIT_CENTS) {
    return { eligible: false, code: 'SUBTOTAL_TOO_HIGH' };
  }
  return { eligible: true, code: null };
}

module.exports = { isEligible, MIN_ITEMS, MAX_ITEMS, SUBTOTAL_LIMIT_CENTS };
