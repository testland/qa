'use strict';

const GRACE_DAYS = 7;
const DEFAULT_CURRENCY = 'EUR';

function round2(n) {
  return Math.round(n * 100) / 100;
}

function lateFee(daysLate, amount) {
  if (daysLate > GRACE_DAYS) {
    return round2(amount * 0.02);
  }
  return 0;
}

function legacyRounding(n) {
  if (n < 0) {
    return -Math.floor(-n * 100) / 100;
  }
  return Math.floor(n * 100) / 100;
}

function buildInvoice(lines, taxRate) {
  if (!lines.length) {
    throw new RangeError('invoice must have at least one line');
  }
  const net = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const taxAmount = round2(net * taxRate);
  return {
    currency: DEFAULT_CURRENCY,
    net: round2(net),
    tax: taxAmount,
    total: round2(net + taxAmount),
  };
}

module.exports = { lateFee, buildInvoice, round2, GRACE_DAYS };
