'use strict';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

function validateQuantity(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { ok: false, code: 'NOT_INTEGER' };
  }
  if (value < MIN_QUANTITY) {
    return { ok: false, code: 'BELOW_MIN' };
  }
  if (value > MAX_QUANTITY) {
    return { ok: false, code: 'ABOVE_MAX' };
  }
  return { ok: true, code: null };
}

module.exports = { validateQuantity, MIN_QUANTITY, MAX_QUANTITY };
