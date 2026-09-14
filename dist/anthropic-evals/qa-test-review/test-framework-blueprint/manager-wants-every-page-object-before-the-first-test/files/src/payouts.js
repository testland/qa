'use strict';

const FEE_BPS = 29;
const FIXED_CENTS = 25;

function feeFor(amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  return Math.round((amountCents * FEE_BPS) / 10000) + FIXED_CENTS;
}

function netFor(amountCents) {
  return amountCents - feeFor(amountCents);
}

module.exports = { feeFor, netFor };
