'use strict';

function buildInvoice(order) {
  return {
    kind: 'invoice',
    number: order.number,
    lines: order.lines.map((line) => ({ sku: line.sku, cents: line.cents })),
    totalCents: order.lines.reduce((sum, line) => sum + line.cents, 0),
  };
}

function buildReceipt(order) {
  return {
    kind: 'receipt',
    number: order.number,
    paidCents: order.paidCents,
    method: order.method,
  };
}

function buildStatement(account) {
  return {
    kind: 'statement',
    accountId: account.id,
    openingCents: account.openingCents,
    closingCents: account.openingCents + account.movements.reduce((sum, m) => sum + m, 0),
    movementCount: account.movements.length,
  };
}

module.exports = { buildInvoice, buildReceipt, buildStatement };
