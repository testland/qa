'use strict';

const SHIPPING_METHODS = ['standard', 'express', 'pickup'];
const MIN_ITEMS = 1;
const MAX_ITEMS = 50;

function validateShipment(request) {
  if (!request || typeof request !== 'object') {
    return { ok: false, code: 'MALFORMED' };
  }
  if (!Array.isArray(request.items)) {
    return { ok: false, code: 'ITEMS_NOT_ARRAY' };
  }
  if (request.items.length < MIN_ITEMS) {
    return { ok: false, code: 'TOO_FEW_ITEMS' };
  }
  if (request.items.length > MAX_ITEMS) {
    return { ok: false, code: 'TOO_MANY_ITEMS' };
  }
  if (!SHIPPING_METHODS.includes(request.method)) {
    return { ok: false, code: 'UNKNOWN_METHOD' };
  }
  return { ok: true, code: null };
}

module.exports = { validateShipment, SHIPPING_METHODS, MIN_ITEMS, MAX_ITEMS };
